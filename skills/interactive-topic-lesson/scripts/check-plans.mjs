#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseScreenCopy, screenCopyDigest, stripPlanComments } from './screen-copy.mjs';

// Structure and explicit author declarations only. No semantic or chronology claim.
const teaching = ['这个任务允许答错吗', '最薄弱任务', '学后新能力与实际机会', '内容审核结论'];
const presentation = ['学生可见题面原文', '冷读者与上下文', '冷读复述', '逐条理解偏差与修改', '术语与数字情境检查', '答案泄露自检', '复读范围与结果', '冷读审核结论', '呈现审核结论'];
const labels = ['修订号', ...teaching, ...presentation];
const meaningful = value => Boolean(value?.replace(/^\s*(?:```|~~~).*$/gm, '').trim());

function planFields(source) {
  const fields = new Map(), duplicates = new Set();
  let current, fence;
  for (const line of source.split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (!fence && /^\s*#{1,6}\s/.test(line)) { current = undefined; continue; }
    const match = !fence && line.match(/^(?:\*\*)?([^：:\n]+?)(?:\*\*)?[？?]?[：:][ \t]*(.*)$/);
    const label = match && labels.find(item => item === match[1].replace(/[？?]$/, ''));
    if (label) {
      if (fields.has(label)) duplicates.add(label);
      current = label;fields.set(label, match[2]);
    } else if (current) fields.set(current, fields.get(current) + '\n' + line);
  }
  return { fields, duplicates };
}

function hasReviewSection(source) {
  const content = [];
  let depth, fence;
  for (const line of source.split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) { if (!fence) fence = marker[1]; else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined; }
    const heading = !fence && line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading && depth && heading[1].length <= depth) break;
    if (heading?.[2] === '审核记录') { depth = heading[1].length;continue; }
    if (depth && !heading) content.push(line);
  }
  return meaningful(content.join('\n'));
}

export async function checkPlans(directory, { requireApproved = false } = {}) {
  const errors = [], planSha256 = {}, approvals = {};
  let copySha256;
  for (const [name, required] of [['teaching-plan.md', teaching], ['presentation-plan.md', presentation]]) {
    let raw;
    try { raw = await readFile(path.join(directory, name), 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      errors.push(`${name}: 缺少文件`);continue;
    }
    planSha256[name] = createHash('sha256').update(raw).digest('hex');
    const source = stripPlanComments(raw).replace(/^\uFEFF/, '');
    const { fields, duplicates } = planFields(source);
    for (const label of ['修订号', ...required]) {
      if (!meaningful(fields.get(label))) errors.push(`${name}: 缺少${label}`);
      if (duplicates.has(label)) errors.push(`${name}: 重复${label}，请明确当前修订记录`);
    }
    if (!hasReviewSection(source)) errors.push(`${name}: 缺少审核记录小节（需含记录）`);
    if (name === 'presentation-plan.md') {
      try { copySha256 = screenCopyDigest(parseScreenCopy(source)); }
      catch (error) { errors.push(`${name}: ${error.message}`); }
    }
    for (const label of required.filter(item => item.endsWith('审核结论'))) {
      approvals[label] = /^通过(?:[；;。.!！\s]|$)/.test(fields.get(label)?.trim() ?? '');
      if (requireApproved && !approvals[label]) errors.push(`${name}: ${label}未明确通过（需以“通过”开头；退回/待补不能构建）`);
    }
  }
  return { ok: errors.length === 0, scope: requireApproved ? 'structure-and-author-declarations-only' : 'structure-only', errors, planSha256, screenCopySha256: copySha256, authorDeclaredApprovals: approvals, chronologyVerified: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [directory, ...args] = process.argv.slice(2);
    if (!directory || args.length > 1 || args.length === 1 && args[0] !== '--require-approved') throw new Error('Usage: node check-plans.mjs /path/to/private/author [--require-approved]');
    const report = await checkPlans(path.resolve(directory), { requireApproved: args.includes('--require-approved') });
    if (report.ok) console.log('计划检查通过（' + report.scope + '）；未判断教学语义、冷读真实性或历史先后顺序。');
    else { console.error(report.errors.join('\n')); process.exitCode = 1; }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
