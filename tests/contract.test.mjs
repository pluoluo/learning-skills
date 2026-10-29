import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readLesson, validateLesson, gradeAnswers, publicQuestions, safeJson, isolatedCanvas } from '../skills/interactive-topic-lesson/scripts/lib.mjs';
import { buildLesson } from '../skills/interactive-topic-lesson/scripts/build.mjs';

const example = await readLesson(new URL('../examples/perimeter-area/lesson.json', import.meta.url));
const changed = transform => { const value = structuredClone(example); transform(value); return value; };

test('original example has complete objective coverage and no structure errors', () => {
  assert.equal(validateLesson(example).ok, true);
  assert.deepEqual(validateLesson(example).checks.browser, 'not_run');
});

test('malformed inputs, invalid keys and broken references are rejected', () => {
  for (const value of [null, [], true, changed(v => v.content = null), changed(v => v.objectives = [null]), changed(v => v.content.test.questions = [null])]) assert.equal(validateLesson(value).ok, false);
  const mutations = [
    v => v.content.test.questions[0].answer = 9,
    v => v.content.test.questions[0].answer = 1.5,
    v => v.content.test.questions[0].options = ['same', 'same'],
    v => v.content.test.questions[0].id = '__proto__',
    v => v.content.test.questions[1].id = 'q1',
    v => v.objectives[0].testIds = ['missing'],
    v => v.objectives[0].testIds = ['q1'],
    v => v.objectives[1].id = 'o1',
    v => v.content.test.passScore = 80.5,
    v => v.content.canvas.html = '<html><head></head><body>static</body></html>',
  ];
  for (const mutate of mutations) assert.equal(validateLesson(changed(mutate)).ok, false);
});

test('script syntax and common nonportable dependencies are rejected without execution', () => {
  for (const suffix of ['<script>function broken( {</script>', '<script>fetch("https://example.test")</script>', '<script src="https://example.test/app.js"></script>', '<script>localStorage.setItem("x","y")</script>', '<form><input></form>', '<iframe srcdoc="hello"></iframe>']) {
    assert.equal(validateLesson(changed(v => v.content.canvas.html = v.content.canvas.html.replace('</body>', suffix + '</body>'))).ok, false);
  }
  globalThis.validationExecuted = false;
  const value = changed(v => v.content.canvas.html = v.content.canvas.html.replace('</body>', '<script>globalThis.validationExecuted=true</script></body>'));
  assert.equal(validateLesson(value).ok, true);
  assert.equal(globalThis.validationExecuted, false);
  delete globalThis.validationExecuted;
});

test('formal answer maps never appear in public questions', () => {
  const result = publicQuestions(example.content.test.questions);
  assert(result.every(question => !Object.hasOwn(question, 'answer') && !Object.hasOwn(question, 'explanation')));
  result[0].options[0] = 'changed';
  assert.notEqual(result[0].options[0], example.content.test.questions[0].options[0]);
});

test('local scoring requires every real question and valid integer choices', () => {
  const quiz = example.content.test;
  for (const answers of [null, [], {}, { q1: 1, q2: 2, q3: 0 }, { q1: 1, q2: 2, q3: 0, q4: '1' }, { q1: 1, q2: 2, q3: 0, q4: 7 }, { q1: 1, q2: 2, q3: 0, q4: 1, extra: 0 }]) assert.equal(gradeAnswers(quiz, answers).ok, false);
  const full = gradeAnswers(quiz, { q1: 1, q2: 2, q3: 0, q4: 1 });
  assert.equal(full.score, 100);assert.equal(full.localOnly, true);
  assert.equal(gradeAnswers(quiz, { q1: 0, q2: 0, q3: 0, q4: 0 }).score, 25);
  assert.equal(gradeAnswers(quiz, { q1: 0, q2: 2, q3: 0, q4: 1 }).score, 75);
});

test('artifact packaging is reproducible, isolates the canvas, and refuses accidental overwrites', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'lesson-contract-'));
  try {
    const a = path.join(temporary, 'a'), b = path.join(temporary, 'b');
    await buildLesson(example, a); await buildLesson(example, b);
    for (const file of ['index.html', 'lesson.json', 'special-study.json', 'validation.json']) assert.equal(await readFile(path.join(a, file), 'utf8'), await readFile(path.join(b, file), 'utf8'));
    assert.deepEqual(JSON.parse(await readFile(path.join(a, 'special-study.json'), 'utf8')), example.content);
    const html = await readFile(path.join(a, 'index.html'), 'utf8');
    assert(html.includes('sandbox="allow-scripts"'));
    assert(!html.includes('sandbox="allow-scripts allow-same-origin"'));
    assert(html.includes("connect-src 'none'"));
    await assert.rejects(buildLesson(example, a), /exists/);
    await buildLesson(example, a, { force: true });
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('metadata cannot terminate the player script', () => {
  const payload = { title: '</script><script>globalThis.injected=true</script>\u2028' };
  const serialized = safeJson(payload);
  assert(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), payload);
});

test('canvas policy is emitted before authored comments and markup', () => {
  const html = '<!-- <head> decoy </head> -->' + example.content.canvas.html;
  const document = isolatedCanvas(html);
  assert(document.indexOf('Content-Security-Policy') < document.indexOf('<!--'));
  assert(document.includes("default-src 'none'"));
});
