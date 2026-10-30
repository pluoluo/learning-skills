import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

export const FORMAT = 'interactive-topic-lesson.v1';
export const MAX_BYTES = 1_000_000;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const id = value => text(value, 40) && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value);
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function readLesson(filename) {
  const bytes = await readFile(filename);
  if (bytes.length > MAX_BYTES) throw new Error(`Lesson exceeds ${MAX_BYTES} UTF-8 bytes`);
  return JSON.parse(bytes.toString('utf8'));
}

/** These are structural/dependency checks; runtime isolation is the host's job. */
export function inspectCanvas(html, objectives, questions) {
  const errors = [];
  const source = html.replace(/<!--[\s\S]*?-->/g, '');
  if (!/<html\b/i.test(source) || !/<head\b/i.test(source) || !/<body\b/i.test(source) || !/<\/html\s*>/i.test(source)) errors.push('Canvas must be a complete HTML document with head and body');
  if (!/<main\b[^>]*\bdata-study-root\b/i.test(source)) errors.push('Canvas needs a naturally sized main[data-study-root]');
  if (!/\bdata-feedback\b/i.test(source)) errors.push('Canvas needs a data-feedback region');
  if (!/<(?:button|input|select|textarea)\b/i.test(source) || !/(?:addEventListener\s*\(|\bon(?:click|input|change)\s*=)/i.test(source)) errors.push('Canvas needs real controls and event handlers');
  if (/<(?:iframe|frame|object|embed|form|base)\b/i.test(source)) errors.push('Nested frames, objects, forms and base elements are unsupported');
  if (/<script\b[^>]*\bsrc\s*=/i.test(source) || /<script\b[^>]*\btype\s*=\s*["']?module/i.test(source)) errors.push('Use inline classic JavaScript, without modules or external scripts');
  if (/<link\b/i.test(source) || /@import\b/i.test(source) || /\b(?:src|href|action)\s*=\s*["']?\s*(?:https?:|\/\/|file:|javascript:)/i.test(source) || /url\(\s*["']?\s*(?:https?:|\/\/|file:)/i.test(source)) errors.push('Canvas must not depend on external or local-file resources');
  const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  for (const [index, match] of scripts.entries()) {
    if (/\btype\s*=\s*["'](?:application\/json|application\/ld\+json)["']/i.test(match[1])) continue;
    try { new vm.Script(match[2], { filename: `canvas-script-${index + 1}.js` }); }
    catch (error) { errors.push(`Canvas JavaScript syntax: ${error.message}`); }
    if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|importScripts|eval|Function)\s*\(|\bimport\s*\(|\bnavigator\s*\.\s*(?:sendBeacon|serviceWorker)|\b(?:localStorage|sessionStorage)\b|\bdocument\s*\.\s*cookie\b|\bwindow\s*\.\s*open\s*\(/.test(match[2])) errors.push('Canvas uses an unsupported network, storage, dynamic-code or popup API');
  }
  for (const objective of objectives) {
    if (id(objective?.id) && !new RegExp(`\\bdata-learning-objective\\s*=\\s*["']${objective.id}["']`).test(source)) errors.push(`Missing canvas objective: ${objective.id}`);
  }
  for (const question of questions) {
    // A shared word/DOM ID is not a copied formal test. Inspect explicit test hooks only.
    if (id(question?.id) && new RegExp(`\\bdata-(?:question|test)-id\\s*=\\s*["']${question.id}["']`).test(source)) errors.push(`Keep formal question hook ${question.id} outside the teaching canvas`);
  }
  return errors;
}

export function validateLesson(lesson) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  if (!plain(lesson)) return { ok: false, errors: ['Lesson must be an object'], warnings: [] };
  check(Buffer.byteLength(JSON.stringify(lesson)) <= MAX_BYTES, 'Lesson exceeds 1 MB UTF-8');
  check(lesson.format === FORMAT, `format must be ${FORMAT}`);
  check(typeof lesson.skillVersion === 'string' && /^\d+\.\d+\.\d+$/.test(lesson.skillVersion), 'skillVersion must be a semantic version');
  check(text(lesson.title, 100), 'title must contain 1–100 characters');
  check(['math', 'chinese', 'english'].includes(lesson.subject), 'subject must be math, chinese or english');
  check(text(lesson.need, 2000), 'need must contain the original learning need (1–2000 characters)');
  check(Array.isArray(lesson.assumptions) && lesson.assumptions.length <= 12 && lesson.assumptions.every(value => text(value, 300)), 'assumptions must be an array of up to 12 short strings');
  const design = lesson.learningDesign;
  const version = typeof lesson.skillVersion === 'string' ? lesson.skillVersion.split('.').map(Number) : [];
  if (version[0] > 0 || version[0] === 0 && version[1] >= 3) check(plain(design), '0.3+ lessons require learningDesign');
  const objectives = Array.isArray(lesson.objectives) ? lesson.objectives : [];
  check(objectives.length >= 1 && objectives.length <= 5, 'Provide 1–5 objectives');
  const content = plain(lesson.content) ? lesson.content : {};
  check(content.schemaVersion === 2 && content.layout === 'canvas', 'content requires schemaVersion:2 and layout:canvas');
  for (const [key, max] of [['introduction', 500], ['sourceNote', 300], ['gradeNote', 300]]) check(text(content[key], max), `${key} must contain 1–${max} characters`);
  check(Array.isArray(content.sections) && content.sections.length === 0, 'Portable canvas content uses sections:[]');
  const html = plain(content.canvas) ? content.canvas.html : undefined;
  check(text(html, 500_000) && Buffer.byteLength(html ?? '') <= 500_000, 'canvas.html requires 1–500000 characters and at most 500000 UTF-8 bytes');
  const test = plain(content.test) ? content.test : {};
  check(Number.isInteger(test.passScore) && test.passScore >= 60 && test.passScore <= 100, 'passScore must be an integer from 60 to 100');
  const questions = Array.isArray(test.questions) ? test.questions : [];
  check(questions.length >= 1 && questions.length <= 50, 'Provide 1–50 formal questions');
  const questionIds = new Set();
  for (const [index, question] of questions.entries()) {
    if (!plain(question)) { errors.push(`Question ${index + 1} must be an object`); continue; }
    check(id(question.id) && !questionIds.has(question.id), `Question ${index + 1} needs a valid unique ID`);
    questionIds.add(question.id);
    check(text(question.prompt, 300), `Question ${question.id}: invalid prompt`);
    const choices = question.options;
    check(Array.isArray(choices) && choices.length >= 2 && choices.length <= 8 && choices.every(value => text(value, 160)) && new Set(choices).size === choices.length, `Question ${question.id}: provide 2–8 distinct options`);
    check(Array.isArray(choices) && Number.isInteger(question.answer) && question.answer >= 0 && question.answer < choices.length, `Question ${question.id}: answer must be a valid zero-based integer`);
    check(text(question.explanation, 350), `Question ${question.id}: invalid explanation`);
    if (question.optionFeedback !== undefined || design?.mode === 'training') {
      check(Array.isArray(choices) && Array.isArray(question.optionFeedback) && question.optionFeedback.length === choices.length && question.optionFeedback.every(value => text(value, 350)), `Question ${question.id}: optionFeedback needs one 1–350 character explanation per option`);
    }
    check(question.diagram === undefined, `Question ${question.id}: portable v1 does not yet support host-specific diagram objects`);
  }
  const objectiveIds = new Set();
  const covered = new Set();
  for (const [index, objective] of objectives.entries()) {
    if (!plain(objective)) { errors.push(`Objective ${index + 1} must be an object`); continue; }
    check(id(objective.id) && !objectiveIds.has(objective.id), `Objective ${index + 1} needs a valid unique ID`);
    objectiveIds.add(objective.id);
    for (const key of ['goal', 'interaction', 'misconception', 'feedback']) check(text(objective[key], 500), `Objective ${objective.id}: missing ${key}`);
    const refs = objective.testIds;
    check(Array.isArray(refs) && refs.length > 0 && new Set(refs).size === refs.length && refs.every(value => questionIds.has(value)), `Objective ${objective.id}: testIds must reference existing questions without duplicates`);
    if (Array.isArray(refs)) refs.forEach(value => covered.add(value));
  }
  check(questions.every(question => covered.has(question?.id)), 'Every question must map to an objective');
  if (design !== undefined) {
    check(plain(design), 'learningDesign must be an object');
    check(['training', 'exploration'].includes(design?.mode), 'learningDesign.mode must be training or exploration');
    for (const [key, max] of [['strategy',500],['progression',1000],['evidencePolicy',1000]]) check(text(design?.[key], max), `learningDesign needs ${key} (1–${max} characters)`);
    const coverage = Array.isArray(design?.coverage) ? design.coverage : [];
    check(coverage.length >= 1 && coverage.length <= 20, 'learningDesign.coverage needs 1–20 scoped dimensions (a resource limit, not a quota)');
    const dimensionIds = new Set(), designedQuestions = new Set();
    for (const [index, dimension] of coverage.entries()) {
      if (!plain(dimension)) { errors.push(`Coverage ${index+1} must be an object`); continue; }
      check(id(dimension.id) && !dimensionIds.has(dimension.id), `Coverage ${index+1} needs a valid unique ID`);
      dimensionIds.add(dimension.id);
      for (const [key,max] of [['focus',300],['contrast',500],['practice',500]]) check(text(dimension[key],max), `Coverage ${dimension.id}: missing ${key}`);
      check(Array.isArray(dimension.testIds) && dimension.testIds.length > 0 && new Set(dimension.testIds).size === dimension.testIds.length && dimension.testIds.every(value => questionIds.has(value)), `Coverage ${dimension.id}: testIds must reference existing questions without duplicates`);
      if (Array.isArray(dimension.testIds)) dimension.testIds.forEach(value=>designedQuestions.add(value));
    }
    check(questions.every(question=>designedQuestions.has(question?.id)), 'Every question must map to a learningDesign coverage dimension');
  }
  if (typeof html === 'string') errors.push(...inspectCanvas(html, objectives, questions));
  return {
    ok: errors.length === 0,
    artifactSha256: digest(lesson),
    errors,
    warnings: ['Static checks do not establish browser behavior, subject-matter correctness or learning effectiveness.'],
    checks: { structure: errors.length === 0, classicScriptSyntaxInspected: typeof html === 'string', browser: 'not_run', subjectReview: 'not_run', learnerEffectiveness: 'not_evaluated' },
  };
}

export function publicQuestions(questions) {
  return questions.map(({ id: questionId, prompt, options }) => ({ id: questionId, prompt, options: [...options] }));
}

export function gradeAnswers(test, answers) {
  if (!plain(answers)) return { ok: false, error: '请完成每一道题后再核对。' };
  const ids = new Set(test.questions.map(question => question.id));
  if (Object.keys(answers).length !== ids.size || Object.keys(answers).some(key => !ids.has(key))) return { ok: false, error: '请完成每一道题后再核对。' };
  if (test.questions.some(question => !Object.hasOwn(answers, question.id) || !Number.isInteger(answers[question.id]) || answers[question.id] < 0 || answers[question.id] >= question.options.length)) return { ok: false, error: '选择不完整或无效，请重新核对。' };
  const details = test.questions.map(question => ({ id: question.id, selectedOption: answers[question.id], correct: answers[question.id] === question.answer, answer: question.answer, explanation: question.optionFeedback?.[answers[question.id]] ?? question.explanation }));
  const score = Math.round(100 * details.filter(detail => detail.correct).length / details.length);
  return { ok: true, localOnly: true, score, passed: score >= test.passScore, passScore: test.passScore, details };
}

export function isolatedCanvas(html) {
  const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data:; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  // Put the policy before authored markup, including comments containing fake head tags.
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}">${html}`;
}

export function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}
