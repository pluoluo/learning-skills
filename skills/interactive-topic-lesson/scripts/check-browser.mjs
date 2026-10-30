#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readLesson, validateLesson } from './lib.mjs';

export const requiredCases = ['primary', 'wrong', 'support', 'transfer', 'keyboard', 'responsive'];
export function validatePlan(plan) {
  if (!Array.isArray(plan?.cases) || requiredCases.some(id => !plan.cases.some(item => item.id === id)) || new Set(plan.cases.map(item=>item.id)).size !== plan.cases.length) throw new Error('Plan requires unique primary, wrong, support, transfer, keyboard and responsive cases');
  for (const test of plan.cases) {
    if (!/^[a-z][a-z0-9_-]{0,39}$/.test(test.id) || !Array.isArray(test.steps) || !test.steps.length || test.steps.length > 100) throw new Error('Invalid browser case');
    if (!test.steps.some(step => ['text', 'visible'].includes(step.op))) throw new Error(`Case ${test.id} needs an observable assertion`);
    for (const step of test.steps) {
      if (!['click', 'press', 'fill', 'text', 'visible', 'resize'].includes(step.op) || !['canvas', 'player'].includes(step.scope ?? 'canvas')) throw new Error('Unsupported browser step');
      if (step.op === 'resize') {
        if (![step.width,step.height].every(value => Number.isInteger(value) && value >= 320 && value <= 4000)) throw new Error('Invalid CSS viewport');
      } else {
        if (typeof step.selector !== 'string' || !step.selector.trim()) throw new Error('Browser steps require a selector');
        if (['text','fill','press'].includes(step.op) && typeof step.value !== 'string') throw new Error('Browser step requires a text value');
        if (step.op === 'text' && !step.value.trim()) throw new Error('Text assertion must not be empty');
      }
    }
  }
  if (!plan.cases.find(test => test.id === 'keyboard').steps.some(step=>step.op==='press')) throw new Error('Keyboard case requires a real key action');
  if (plan.cases.find(test => test.id === 'responsive').steps.filter(step=>step.op==='resize').length < 2) throw new Error('Responsive case requires resizing in both directions and an assertion of retained learner input');
  const viewports = plan.viewports ?? [{ width:1000, height:600 }, { width:1920, height:1080 }];
  if (!Array.isArray(viewports) || !viewports.length || viewports.length > 8 || viewports.some(v=>![v.width,v.height].every(n=>Number.isInteger(n)&&n>=320&&n<=4000))) throw new Error('Invalid viewports');
  return viewports;
}

async function layout(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const outer = await page.evaluate(() => ({ width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth, frameHeight:document.getElementById('lesson-frame').getBoundingClientRect().height, frameVisible:!document.getElementById('lesson-frame').hidden }));
  const frame = page.frames().find(item => item.parentFrame() === page.mainFrame());
  if (!frame) throw new Error('Lesson iframe is missing');
  const inner = await frame.evaluate(() => {
    const root = document.querySelector('main[data-study-root]');
    const svg = [...document.querySelectorAll('svg')].filter(el=>el.getBoundingClientRect().width>0).map(el=>({width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)}));
    const clipped = [...document.querySelectorAll('button,input,select,textarea,summary')].filter(el => {
      const b=el.getBoundingClientRect(); return b.width>0&&b.height>0&&(b.left< -1||b.right>innerWidth+1);
    }).length;
    return { width:innerWidth, scrollWidth:document.documentElement.scrollWidth, rootHeight:root?.getBoundingClientRect().height, clippedControls:clipped, diagrams:svg };
  });
  if (outer.scrollWidth > outer.width + 1 || outer.frameVisible && (inner.scrollWidth > inner.width + 1 || inner.clippedControls)) throw new Error('Horizontal overflow or clipped controls');
  if (outer.frameVisible && (!Number.isFinite(inner.rootHeight) || inner.rootHeight > outer.frameHeight + 3)) throw new Error('Learning root is clipped by its iframe');
  return { outer, inner };
}

export async function checkBrowser({ lesson: filename, url, plan: planFile, out, module: moduleEntry }) {
  const lesson = await readLesson(filename);
  const validation = validateLesson(lesson);
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('Use the authorized HTTP(S) preview URL');
  const plan = JSON.parse(await readFile(planFile,'utf8'));
  const viewports = validatePlan(plan);
  await mkdir(out, { recursive:true });
  const report = { format:'interactive-topic-lesson.browser.v1', artifactSha256:validation.artifactSha256, status:'not_run', evidence:[], cases:[], limitations:['CSS pixels in a desktop browser, not physical tablet or touch-device verification', 'Automated bounds checks do not establish visual composition quality or learning effectiveness; agent must inspect screenshots'] };
  const save = () => writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
  let browser;
  try {
    const mod = moduleEntry ? await import(pathToFileURL(path.resolve(moduleEntry)).href) : await import('playwright');
    const chromium = mod.chromium ?? mod.default?.chromium;
    if (!chromium) throw new Error('Playwright Chromium entry not available');
    browser = await chromium.launch({ headless:true });
    report.status = 'passed';
    for (const viewport of viewports) {
      for (const test of plan.cases) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
        const result = { id:test.id, viewport, status:'passed', measurements:[], screenshot:`${viewport.width}x${viewport.height}-${test.id}.png` };
        try {
          await page.goto(url,{ waitUntil:'load', timeout:15_000 });
          await page.locator('body[data-artifact-sha256]').waitFor({timeout:5000});
          if (await page.locator('body').getAttribute('data-artifact-sha256') !== validation.artifactSha256) throw new Error('Served lesson digest does not match this build');
          await page.frameLocator('#lesson-frame').locator('main[data-study-root]').waitFor({timeout:5000});
          for (const step of test.steps) {
            if (step.op === 'resize') await page.setViewportSize({ width:step.width,height:step.height });
            else {
              const scope = step.scope === 'player' ? page : page.frameLocator('#lesson-frame');
              const control = scope.locator(step.selector);
              if (step.op === 'click') await control.click({timeout:5000});
              if (step.op === 'press') await control.press(step.value,{timeout:5000});
              if (step.op === 'fill') await control.fill(step.value,{timeout:5000});
              if (step.op === 'visible') await control.waitFor({state:(step.value ?? true)?'visible':'hidden',timeout:5000});
              if (step.op === 'text') {
                await control.filter({hasText:step.value}).waitFor({state:'visible',timeout:5000});
              }
            }
            result.measurements.push(await layout(page));
          }
          if (errors.length) throw new Error(errors.join('; '));
        } catch (error) { result.status='failed';result.error=error.message;report.status='failed'; }
        try { await page.screenshot({ path:path.join(out,result.screenshot),fullPage:true }); }
        catch(error) { result.status='failed';result.screenshotError=error.message;report.status='failed'; }
        report.cases.push(result);
        await page.close();
      }
    }
    report.evidence.push(`Executed ${report.cases.length} browser cases; inspect the recorded measurements and screenshots separately`);
  } catch(error) {
    if (browser) report.status='failed';
    report.error=error.message;
  } finally { if(browser) await browser.close(); await save(); }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args=process.argv.slice(2);
    const usage='node check-browser.mjs lesson.json --url http(s)://lesson --plan browser-plan.json --out private/browser [--module /path/to/playwright/index.mjs]';
    if (args.length === 1 && args[0] === '--help') console.log(usage);
    else {
      const options={lesson:args[0]};
      for(let i=1;i<args.length;i+=2){const key=args[i]?.replace(/^--/,'');if(!['url','plan','out','module'].includes(key)||!args[i+1]||Object.hasOwn(options,key))throw new Error(usage);options[key]=args[i+1];}
      if(!options.lesson||!options.url||!options.plan||!options.out)throw new Error(usage);
      const report=await checkBrowser(options);
      console.log(JSON.stringify({status:report.status,report:path.resolve(options.out,'browser-report.json'),error:report.error},null,2));
      process.exitCode=report.status==='passed'?0:1;
    }
  }catch(error){console.error(JSON.stringify({ok:false,errors:[error.message]}));process.exitCode=1;}
}
