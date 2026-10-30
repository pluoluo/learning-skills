import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { readLesson } from '../skills/interactive-topic-lesson/scripts/lib.mjs';
import { buildLesson } from '../skills/interactive-topic-lesson/scripts/build.mjs';

let output;
test.beforeAll(async () => {
  output = await mkdtemp(path.join(os.tmpdir(), 'lesson-browser-'));
  await buildLesson(await readLesson(new URL('../examples/perimeter-area/lesson.json', import.meta.url)), output);
});
test.afterAll(async () => { await rm(output, { recursive: true, force: true }); });

for (const viewport of [{ width: 1000, height: 600 }, { width: 1920, height: 1080 }]) {
  test(`standalone file, real operations and local checks at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    await page.goto(pathToFileURL(path.join(output, 'index.html')).href);
    const canvas = page.frameLocator('#lesson-frame');
    const frame = page.frames().find(value => value !== page.mainFrame());
    await expect(canvas.locator('#garden-feedback')).toContainText('18 米');
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: testInfo.outputPath(`explore-${viewport.width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await canvas.locator('#reset-garden').boundingBox();
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    for (const control of await canvas.getByRole('button').all()) {
      if (!await control.isVisible()) continue;
      const rect = await control.boundingBox();expect(rect.height).toBeGreaterThanOrEqual(44);expect(rect.width).toBeGreaterThanOrEqual(44);
    }
    // Exercise keyboard operation and a visible reset, retaining values when changing views.
    await canvas.getByRole('slider', { name: '长', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(canvas.locator('#width-value')).toHaveText('7 米');
    await canvas.getByRole('button', { name: '看草地：铺满' }).click();
    await expect(canvas.locator('#garden-feedback')).toContainText('21 平方米');
    // Recompute the represented area from actual equal square geometry.
    const geometry = await canvas.locator('#garden').evaluate(svg => {
      const cells = [...svg.querySelectorAll('rect:not([data-outline])')];
      const shape = svg.querySelector('[data-outline]');
      return { count: cells.length, square: cells.every(cell => cell.width.baseVal.value === cell.height.baseVal.value), width: shape.width.baseVal.value, height: shape.height.baseVal.value, cell: cells[0].width.baseVal.value };
    });
    expect(geometry.count).toBe(21);expect(geometry.square).toBe(true);
    expect(geometry.width / geometry.cell).toBe(7);expect(geometry.height / geometry.cell).toBe(3);
    await canvas.getByRole('button', { name: '周长一样，会怎样？' }).click();
    await canvas.getByRole('button', { name: '眼前面积一样', exact: true }).click();
    await expect(canvas.locator('#compare-feedback')).toContainText('再数一数');
    await canvas.getByRole('button', { name: '眼前面积不同', exact: true }).click();
    await expect(canvas.locator('#compare-feedback')).toContainText('本次判断符合');
    await canvas.locator('#compare-width').focus();await page.keyboard.press('Home');
    for (let width = 1; width <= 7; width++) {
      if (width > 1) await page.keyboard.press('ArrowRight');
      await expect(canvas.locator('#compare-feedback')).toContainText(`A 是 ${width * (8 - width)} 平方米`);
      expect(await canvas.locator('#garden-a').getAttribute('data-cell')).toBe(await canvas.locator('#garden-b').getAttribute('data-cell'));
    }
    await page.screenshot({ path: testInfo.outputPath(`compare-${viewport.width}.png`), fullPage: true });
    await canvas.getByRole('button', { name: '围一圈 · 铺满' }).click();
    await expect(canvas.locator('#width-value')).toHaveText('7 米');
    // The iframe's real sandbox blocks parent DOM and persistent storage access.
    const isolation = await frame.evaluate(() => {
      let parentBlocked = false, storageBlocked = false;
      try { void parent.document.body; } catch { parentBlocked = true; }
      try { localStorage.setItem('test', 'x'); } catch { storageBlocked = true; }
      return { parentBlocked, storageBlocked };
    });
    expect(isolation).toEqual({ parentBlocked: true, storageBlocked: true });
    const context = await frame.evaluate(() => new Promise(resolve => {
      function receive(event) { if (event.source === parent && event.data?.type === 'context') { window.removeEventListener('message', receive); resolve(event.data.payload); } }
      window.addEventListener('message', receive);parent.postMessage({channel:'special-study',type:'ready'},'*');
    }));
    expect(context.standalone).toBe(true);
    expect(context.test.questions.every(question => !('answer' in question) && !('explanation' in question))).toBe(true);
    const heightBefore = await page.locator('#lesson-frame').getAttribute('style');
    await page.evaluate(() => window.postMessage({channel:'special-study',type:'resize',payload:3999},'*'));
    await expect(page.locator('#lesson-frame')).toHaveAttribute('style', heightBefore);
    await page.getByRole('button', { name: '换个例子', exact: true }).click();
    await expect(page.getByRole('button', { name: '清空答案重做', exact: true })).toBeHidden();
    await page.getByRole('button', { name: '检查答案' }).click();
    await expect(page.locator('#result')).toContainText('第 1 题还没选');
    for (const [name, choice] of [['q1',1],['q2',2],['q3',0],['q4',1]]) await page.locator(`input[name="${name}"]`).nth(choice).check();
    await page.getByRole('button', { name: '检查答案' }).click();
    await expect(page.locator('#result')).toContainText('4/4');
    await page.screenshot({ path: testInfo.outputPath(`test-${viewport.width}.png`), fullPage: true });
    await page.locator('input[name="q1"]').first().check();
    await expect(page.locator('#result')).toContainText('答案已更改');
    await expect(page.locator('#feedback-q1')).toBeEmpty();
    await page.getByRole('button', { name: '检查答案' }).click();
    await expect(page.locator('#result')).toContainText('3/4');
    await page.getByRole('button', { name: '清空答案重做', exact: true }).click();
    await expect(page.locator('input:checked')).toHaveCount(0);
    await page.getByRole('button', { name: '动手探索', exact: true }).click();
    await canvas.getByRole('button', { name: '恢复这块花园' }).click();
    await expect(canvas.locator('#width-value')).toHaveText('6 米');
    expect(errors).toEqual([]);expect(external).toEqual([]);
  });
}
