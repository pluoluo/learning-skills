import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { buildLesson } from '../skills/interactive-topic-lesson/scripts/build.mjs';

if (!process.env.CDP_ENDPOINT) throw new Error('Set CDP_ENDPOINT to an existing Chrome debugging endpoint; this check never downloads or launches a browser.');
const output = await mkdtemp(path.join(os.tmpdir(), 'lesson-responsive-'));
const lesson = JSON.parse(await readFile(new URL('../examples/perimeter-area/lesson.json', import.meta.url), 'utf8'));
await buildLesson(lesson, path.join(output, 'delivery'));
const html = await readFile(path.join(output, 'delivery/index.html'), 'utf8');
const browser = await chromium.connectOverCDP(process.env.CDP_ENDPOINT);
const reports = [];
async function settle(page, frame) {
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function measure(page, frame) {
  return {
    outer: await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect();return { top:r.top, bottom:r.bottom, height:r.height }; };
      return { height:innerHeight, width:innerWidth, overflow:document.documentElement.scrollWidth > innerWidth, frame:rect('#lesson-frame'), footer:rect('footer') };
    }),
    canvas: await frame.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect();return { top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
      return { root:rect('main'), svg:rect('#garden'), plot:rect('#garden [data-outline]') };
    }),
  };
}
try {
  for (const entry of [{ width:1000, height:600, dpr:1 }, { width:1920, height:1080, dpr:1 }, { width:1920, height:1080, dpr:2 }]) {
    const context = await browser.newContext({ viewport:{width:entry.width,height:entry.height}, deviceScaleFactor:entry.dpr });
    try {
      const page = await context.newPage();const errors=[];page.on('pageerror', error=>errors.push(error.message));
      await context.route('http://lesson.invalid/**',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
      await page.goto('http://lesson.invalid/', {waitUntil:'load'});
      const frame=page.frames().find(candidate=>candidate!==page.mainFrame());
      await frame.waitForSelector('#garden [data-outline]');
      await expect.poll(()=>frame.locator('main').evaluate(element=>Number.parseFloat(element.style.getPropertyValue('--lesson-viewport-height')))).toBeGreaterThan(300);
      await settle(page,frame);
      const initial=await measure(page,frame);assert.equal(initial.outer.overflow,false);
      assert(initial.outer.frame.bottom>=entry.height-initial.outer.footer.height-2,'learning region uses available screen height');
      if(entry.height>600){
        assert(initial.canvas.svg.height>entry.height*.55,'diagram grows into the available workspace');
        assert(initial.canvas.plot.height>230,'actual mathematical drawing grows, not only its background');
        assert(Math.abs(initial.outer.footer.bottom-entry.height)<.1,'the frame fits the screen without rounding-induced overflow');
      }
      if(entry.dpr===1)await page.screenshot({path:path.join(output,`explore-${entry.width}.png`),fullPage:true});
      await frame.getByRole('button',{name:'看草地：铺满'}).click();
      await expect(frame.locator('#garden-feedback')).toContainText('18 平方米');
      if(entry.height>600){
        await page.setViewportSize({width:1000,height:600});
        await expect.poll(()=>frame.locator('main').evaluate(element=>element.getBoundingClientRect().height)).toBeLessThan(initial.canvas.root.height*.8);
      }
      await settle(page,frame);const compact=await measure(page,frame);
      await frame.locator('details').first().locator('summary').click();await settle(page,frame);
      await frame.locator('details').first().locator('summary').click();await settle(page,frame);
      const restored=await measure(page,frame);
      assert(Math.abs(restored.canvas.root.height-compact.canvas.root.height)<3,'closing support restores compact height instead of retaining an oversized frame');
      await frame.getByRole('button',{name:'周长一样，会怎样？'}).click();
      await frame.getByRole('button',{name:'眼前面积不同',exact:true}).click();
      await expect(frame.locator('#compare-feedback')).toContainText('本次判断符合');
      await frame.getByRole('button',{name:'围一圈 · 铺满'}).click();
      await page.setViewportSize({width:entry.width,height:entry.height});await settle(page,frame);
      await expect(frame.locator('#garden-feedback')).toContainText('18 平方米');
      await expect.poll(async()=>Math.abs((await measure(page,frame)).canvas.root.height-initial.canvas.root.height)).toBeLessThan(3);
      const beforeStable=await measure(page,frame);await page.waitForTimeout(150);const afterStable=await measure(page,frame);
      assert(Math.abs(beforeStable.canvas.root.height-afterStable.canvas.root.height)<1,'no accumulating iframe sizing loop');
      await page.locator('footer summary').click();await settle(page,frame);
      await page.locator('footer summary').click();await settle(page,frame);
      await expect.poll(async()=>Math.abs((await measure(page,frame)).canvas.root.height-initial.canvas.root.height)).toBeLessThan(3);
      await page.getByRole('button',{name:'换个例子',exact:true}).click();
      await page.getByRole('button',{name:'核对本次选择'}).click();await expect(page.locator('#result')).toContainText('请完成每一道题');
      for(const[name,index]of[['q1',1],['q2',2],['q3',0],['q4',1]])await page.locator(`input[name="${name}"]`).nth(index).check();
      await page.getByRole('button',{name:'核对本次选择'}).click();await expect(page.locator('#result')).toContainText('4/4');
      assert.deepEqual(errors,[]);reports.push({entry,initial,compact,restored,errors});
    } finally { await context.close(); }
  }
  const standard=reports.find(report=>report.entry.width===1920&&report.entry.dpr===1);
  const retina=reports.find(report=>report.entry.width===1920&&report.entry.dpr===2);
  assert(Math.abs(standard.initial.canvas.plot.height-retina.initial.canvas.plot.height)<2,'physical pixel density does not change CSS layout');
  await writeFile(path.join(output,'report.json'),JSON.stringify({browser:browser.version(),reports},null,2));
  console.log(JSON.stringify({ok:true,output,reports}));
} catch(error) { console.error(error);process.exitCode=1; }
finally { process.exit(process.exitCode||0); }
