#!/usr/bin/env node
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readLesson, validateLesson, isolatedCanvas, safeJson, gradeAnswers, publicQuestions } from './lib.mjs';

export async function buildLesson(lesson, output, { force = false } = {}) {
  const validation = validateLesson(lesson);
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  const files = ['index.html', 'lesson.json', 'special-study.json', 'validation.json', 'LICENSE'];
  if (!force) for (const file of files) {
    const exists = await access(path.join(output, file)).then(() => true, () => false);
    if (exists) throw new Error(`${file} exists; choose another output directory or use --force for an intended rebuild`);
  }
  const template = await readFile(new URL('../assets/player.html', import.meta.url), 'utf8');
  const license = await readFile(new URL('../LICENSE', import.meta.url), 'utf8');
  const payload = { title: lesson.title, introduction: lesson.content.introduction, sourceNote: lesson.content.sourceNote, gradeNote: lesson.content.gradeNote, html: isolatedCanvas(lesson.content.canvas.html), test: lesson.content.test };
  const notice = `<!--\nStandalone player runtime: MIT License. Lesson content retains its respective rights.\n\n${license}-->\n`;
  const html = notice + template.replace('/*__GRADING__*/', `const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);\n${gradeAnswers.toString()}\n${publicQuestions.toString()}`).replace('/*__LESSON__*/null', safeJson(payload));
  await mkdir(output, { recursive: true });
  const contents = [html, JSON.stringify(lesson, null, 2) + '\n', JSON.stringify(lesson.content, null, 2) + '\n', JSON.stringify(validation, null, 2) + '\n', license];
  for (const [index, file] of files.entries()) await writeFile(path.join(output, file), contents[index], { flag: force ? 'w' : 'wx' });
  return { ok: true, output: path.resolve(output), files, artifactSha256: validation.artifactSha256 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length < 3 || args[1] !== '--out' || (args.length > 3 && (args.length !== 4 || args[3] !== '--force'))) throw new Error('Usage: node build.mjs lesson.json --out /path/to/output [--force]');
    console.log(JSON.stringify(await buildLesson(await readLesson(args[0]), args[2], { force: args.includes('--force') }), null, 2));
  } catch (error) { console.error(JSON.stringify({ ok: false, errors: [error.message] })); process.exitCode = 1; }
}
