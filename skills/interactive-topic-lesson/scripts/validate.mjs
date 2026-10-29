#!/usr/bin/env node
import { readLesson, validateLesson } from './lib.mjs';

try {
  if (process.argv.length !== 3) throw new Error('Usage: node validate.mjs /path/to/lesson.json');
  const report = validateLesson(await readLesson(process.argv[2]));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, errors: [error.message] }));
  process.exitCode = 1;
}
