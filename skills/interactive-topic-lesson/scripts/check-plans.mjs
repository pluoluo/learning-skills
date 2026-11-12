#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Author-only structure checks. Never infer teaching quality or gate legacy builds.
const common = [
  ['修订号', /^修订号[：:][ \t]*\S[^\n]*$/m],
  ['审核记录小节（需含记录）', /^#{1,6}\s+审核记录\s*\n\s*[^\s#]/m],
];
const teaching = [
  ['任务真实性：这个任务允许答错吗', /^这个任务允许答错吗[？?]?[：:][ \t]*\S[^\n]*$/m],
  ['任务真实性：最薄弱任务', /^最薄弱任务[：:][ \t]*\S[^\n]*$/m],
  ['任务真实性：学后新能力与实际机会', /^学后新能力与实际机会[：:][ \t]*\S[^\n]*$/m],
];
const presentation = [
  ['学生可见题面原文', /^学生可见题面原文[：:][ \t]*\S[^\n]*$/m],
  ['冷读者与上下文', /^冷读者与上下文[：:][ \t]*\S[^\n]*$/m],
  ['冷读复述（我要做什么、做完看到什么）', /^冷读复述[：:][ \t]*\S[^\n]*$/m],
  ['逐条理解偏差与修改', /^逐条理解偏差与修改[：:][ \t]*\S[^\n]*$/m],
  ['术语与数字情境检查', /^术语与数字情境检查[：:][ \t]*\S[^\n]*$/m],
  ['呈现审核结论', /^呈现审核结论[：:][ \t]*\S[^\n]*$/m],
];

export async function checkPlans(directory) {
  const errors = [];
  for (const [name, checks] of [['teaching-plan.md', teaching], ['presentation-plan.md', presentation]]) {
    let source;
    try { source = await readFile(path.join(directory, name), 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      errors.push(`${name}: 缺少文件`);
      continue;
    }
    // Comments cannot stand in for visible author records.
    source = source.replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n/g, '\n');
    for (const [label, pattern] of [...common, ...checks]) {
      if (!pattern.test(source)) errors.push(`${name}: 缺少${label}`);
    }
  }
  return { ok: errors.length === 0, scope: 'structure-only', errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node check-plans.mjs /path/to/private/author');
    const report = await checkPlans(path.resolve(process.argv[2]));
    if (report.ok) console.log('计划结构检查通过；未判断教学内容、冷读质量或真实学习效果。');
    else { console.error(report.errors.join('\n')); process.exitCode = 1; }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
