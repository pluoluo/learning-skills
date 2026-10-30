#!/usr/bin/env node
import { readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readLesson, validateLesson, MAX_BYTES } from './lib.mjs';

export async function compileSource(filename) {
  const lesson = await readLesson(filename);
  const canvas = lesson?.content?.canvas;
  if (canvas && Object.hasOwn(canvas, 'file')) {
    if (Object.hasOwn(canvas, 'html')) throw new Error('Author canvas must have file OR html, not both');
    if (typeof canvas.file !== 'string' || !canvas.file.trim() || path.isAbsolute(canvas.file)) throw new Error('canvas.file must be an author-relative path');
    const author = await realpath(path.dirname(path.resolve(filename)));
    const target = await realpath(path.resolve(author, canvas.file));
    const relative = path.relative(author, target);
    if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('canvas.file must stay inside the author directory');
    const html = await readFile(target);
    if (html.length > 500_000) throw new Error('Canvas exceeds 500000 UTF-8 bytes');
    lesson.content.canvas = { html: html.toString('utf8') };
  }
  const validation = validateLesson(lesson);
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  return lesson;
}

export async function compileFile(source, output) {
  const sourcePath = await realpath(source);
  const outputPath = await realpath(output).catch(() => path.resolve(output));
  if (sourcePath === outputPath) throw new Error('Compile output must not overwrite the author source');
  const draft = await readLesson(sourcePath);
  if (draft?.content?.canvas && Object.hasOwn(draft.content.canvas, 'file')) {
    const relative = path.relative(path.dirname(sourcePath), outputPath);
    if (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) throw new Error('Compile output must be outside the author directory');
  }
  const lesson = await compileSource(source);
  // Keep pretty-printed output within the same limit enforced on read.
  const pretty = JSON.stringify(lesson, null, 2) + '\n';
  const bytes = Buffer.byteLength(pretty) <= MAX_BYTES ? pretty : JSON.stringify(lesson);
  await mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await writeFile(output, bytes);
  return { ok: true, output: path.resolve(output) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 3 || args[1] !== '--out') throw new Error('Usage: node compile.mjs author/lesson.source.json --out private/lesson.json');
    console.log(JSON.stringify(await compileFile(args[0], args[2]), null, 2));
  } catch (error) { console.error(JSON.stringify({ ok: false, errors: [error.message] })); process.exitCode = 1; }
}
