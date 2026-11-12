#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Private author input only; no additions to the portable lesson schema.
export function stripPlanComments(markdown) {
  const lines = [];let fence, comment = false;
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (fence) {
      lines.push(line);
      const end = line.match(/^\s*(`{3,}|~{3,})[ \t]*$/);
      if (end && end[1][0] === fence[0] && end[1].length >= fence.length) fence = undefined;
      continue;
    }
    let clean = '', offset = 0;
    while (offset < line.length) {
      const boundary = line.indexOf(comment ? '-->' : '<!--', offset);
      if (boundary === -1) { if (!comment) clean += line.slice(offset);break; }
      if (!comment) clean += line.slice(offset, boundary);
      offset = boundary + (comment ? 3 : 4);comment = !comment;
    }
    lines.push(clean);
    const start = clean.match(/^\s*(`{3,}|~{3,})/);
    if (start) fence = start[1];
  }
  return lines.join('\n');
}

export function parseScreenCopy(markdown) {
  const source = stripPlanComments(markdown);
  const blocks = [...source.matchAll(/^```student-facing-copy[ \t]*\n([\s\S]*?)^```[ \t]*$/gm)];
  if (blocks.length !== 1) throw new Error('需要且只能有一个 student-facing-copy JSON 独立块');
  let screens;
  try { screens = JSON.parse(blocks[0][1]); }
  catch { throw new Error('student-facing-copy 必须是有效 JSON'); }
  if (!Array.isArray(screens) || !screens.length) throw new Error('student-facing-copy 必须是非空屏幕状态数组');
  const ids = new Set();
  for (const screen of screens) {
    if (!screen || typeof screen !== 'object' || Array.isArray(screen) ||
        Object.keys(screen).some(key => !['id', 'state', 'text'].includes(key)) ||
        typeof screen.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(screen.id) || ids.has(screen.id) ||
        typeof screen.state !== 'string' || !screen.state.trim() ||
        !screen.text || typeof screen.text !== 'object' || Array.isArray(screen.text) ||
        !Object.keys(screen.text).length || Object.entries(screen.text).some(([key, value]) => !key.trim() || typeof value !== 'string' || !value.trim())) {
      throw new Error('student-facing-copy 每项需唯一 id、state 和非空 text 字符串映射；只允许这三个字段');
    }
    ids.add(screen.id);
  }
  return screens;
}

export function screenCopyDigest(screens) {
  return createHash('sha256').update(JSON.stringify(screens)).digest('hex');
}

export function extractScreenCopy(screens, selectedIds) {
  if (selectedIds && (!selectedIds.length || selectedIds.some(id => !screens.some(screen => screen.id === id)))) {
    throw new Error('重读范围包含未知或空的屏幕状态 id');
  }
  const selected = selectedIds ? screens.filter(screen => selectedIds.includes(screen.id)) : screens;
  return selected.map(screen => `屏幕 ${screen.id} / ${screen.state}\n` + Object.values(screen.text).join('\n')).join('\n\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [filename, ...args] = process.argv.slice(2);
    if (!filename) throw new Error('Usage: node screen-copy.mjs presentation-plan.md [--screens s1,s2] [--out cold-read.txt]');
    let selectedIds, output;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--screens' && args[i + 1] && !args[i + 1].startsWith('--') && !selectedIds) selectedIds = args[++i].split(',').map(id => id.trim());
      else if (args[i] === '--out' && args[i + 1] && !args[i + 1].startsWith('--') && !output) output = args[++i];
      else throw new Error(`Unknown or incomplete option: ${args[i]}`);
    }
    const content = extractScreenCopy(parseScreenCopy(await readFile(filename, 'utf8')), selectedIds);
    if (output) await writeFile(output, content, { flag: 'wx' });
    else process.stdout.write(content);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
