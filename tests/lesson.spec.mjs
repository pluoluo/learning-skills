import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { readLesson } from '../skills/interactive-topic-lesson/scripts/lib.mjs';
import { buildLesson } from '../skills/interactive-topic-lesson/scripts/build.mjs';
import { startLessonServer } from '../skills/interactive-topic-lesson/scripts/serve.mjs';

let output, longOutput;
test.beforeAll(async () => {
  output = await mkdtemp(path.join(os.tmpdir(), 'lesson-browser-'));
  const sample = await readLesson(new URL('../examples/perimeter-area/lesson.json', import.meta.url));
  await buildLesson(sample, output);
  const fixture = structuredClone(sample);
  fixture.title = '英语检查：当人物与表达发生变化时，怎样检查句子是否仍然表达原来的意思？';
  fixture.subject = 'english';
  fixture.content.test.questions = Array.from({length:6},(_,index)=>({
    id:'long_'+index,
    prompt:`第${index+1}个新情境：My sister watches the birds near the playground every morning. 换一个人物后，哪个句子仍符合给定情境？请读完整句再判断。`,
    options:['She watches the birds near the playground every morning.','She watch the birds near the playground every morning.','They watches the birds near the playground every morning.'],
    answer:0,explanation:'根据人物与句意检查完整表达。',
    optionFeedback:['对。 She 指一个人，这里用 watches。请对照主语和整个句子。','错。 She 指一个人，这里应使用 watches；比较主语变化前后的动词形式。','They 指多个人，除了动词形式，还要确认是否改变了题目中的人物。'],
  }));
  fixture.objectives=[{...fixture.objectives[0],testIds:fixture.content.test.questions.map(q=>q.id)}];
  fixture.learningDesign={mode:'training',strategy:'根据实际情境比较表达',coverage:[{id:'meaning',focus:'人物与表达之间的关系，需要同时关注指代、动词形式与完整句意',contrast:'比较形式和意思',practice:'修改后重新检查',testIds:fixture.content.test.questions.map(q=>q.id)}],progression:'从比较进入新情境',evidencePolicy:'本页有限证据'};
  fixture.skillVersion='0.4.3';
  longOutput=path.join(output,'long-checks');await buildLesson(fixture,longOutput);
});
test.afterAll(async () => { await rm(output, { recursive: true, force: true }); });

test('HTTP delivery uses an inline icon and six supplied checks without requesting favicon.ico',async({page},testInfo)=>{
  const service=await startLessonServer({lesson:path.join(longOutput,'index.html'),state:path.join(output,'http-delivery.json')});
  try {
    const requests=[],errors=[];
    page.on('request',request=>requests.push(request.url()));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width:1000,height:600});
    await page.goto(service.record().url);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href','data:,');
    await page.locator('#test-tab').click();await expect(page.locator('.question-card')).toHaveCount(6);
    const cards=await page.locator('.question-card').evaluateAll(nodes=>nodes.map(node=>({x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y})));
    for(let row=0;row<3;row++){expect(Math.abs(cards[row*2].y-cards[row*2+1].y)).toBeLessThan(1);expect(cards[row*2+1].x).toBeGreaterThan(cards[row*2].x);}
    await page.screenshot({path:testInfo.outputPath('http-six-checks.png'),fullPage:true});
    expect(requests.filter(url=>new URL(url).pathname.endsWith('/favicon.ico'))).toEqual([]);expect(errors).toEqual([]);
  } finally { await service.stop(); }
});

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
    expect(context.viewport.height).toBe(await page.locator('body>main').evaluate(element=>element.clientHeight));
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

for (const viewport of [{width:1000,height:600},{width:1920,height:1080}]) {
  test(`long checks keep actions reachable and headings inside cards at ${viewport.width}×${viewport.height}`,async({page},testInfo)=>{
    await page.setViewportSize(viewport);const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.join(longOutput,'index.html')).href);
    await page.locator('#test-tab').click();
    const measure=()=>page.evaluate(()=>{
      const box=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
      return {height:innerHeight,documentHeight:document.documentElement.scrollHeight,main:box('body>main'),actions:box('.quiz-actions'),result:box('#result'),scroll:box('#quiz-scroll'),scrollHeight:document.querySelector('#quiz-scroll').scrollHeight,cards:[...document.querySelectorAll('.question-card')].map(card=>({card:card.getBoundingClientRect().toJSON(),legend:card.querySelector('legend').getBoundingClientRect().toJSON(),first:card.querySelector('.choice').getBoundingClientRect().toJSON()}))};
    });
    const initial=await measure();expect(initial.documentHeight).toBeLessThanOrEqual(viewport.height+1);
    expect(initial.actions.bottom).toBeLessThanOrEqual(initial.main.bottom+1);expect(initial.scrollHeight).toBeGreaterThan(initial.scroll.height);
    for(const entry of initial.cards){expect(entry.legend.top).toBeGreaterThan(entry.card.top);expect(entry.legend.bottom).toBeLessThanOrEqual(entry.first.top+1);}
    // Tab navigation/locator focus scrolls the question region, while the action stays in place.
    for(const question of await page.locator('fieldset').all())await question.locator('input').nth(1).check();
    await page.locator('#check-test').click();await expect(page.locator('#result')).toContainText('0/6');
    await expect(page.locator('#feedback-long_0')).toHaveText('这题还没选对。 She 指一个人，这里应使用 watches；比较主语变化前后的动词形式。');
    const checked=await measure();expect(checked.documentHeight).toBeLessThanOrEqual(viewport.height+1);expect(checked.actions.bottom).toBeLessThanOrEqual(checked.main.bottom+1);expect(checked.result.bottom).toBeLessThanOrEqual(checked.main.bottom+1);
    await page.locator('input[name="long_0"]').first().check();await expect(page.locator('#feedback-long_0')).toBeEmpty();await page.locator('#check-test').click();
    await expect(page.locator('#feedback-long_0')).toHaveText('这题选对了。 She 指一个人，这里用 watches。请对照主语和整个句子。');
    await expect(page.locator('#practice-summary')).toContainText('首次检查选对 0/6');
    await page.locator('#quiz-scroll').focus();await page.keyboard.press('End');
    await expect.poll(()=>page.locator('#quiz-scroll').evaluate(element=>element.scrollHeight-element.scrollTop-element.clientHeight)).toBeLessThanOrEqual(1);
    const summaryEnd=await page.locator('#practice-summary p').last().boundingBox();
    const scrollBounds=await page.locator('#quiz-scroll').boundingBox();
    expect(summaryEnd.y+summaryEnd.height).toBeLessThanOrEqual(scrollBounds.y+scrollBounds.height+1);
    await page.locator('#quiz-scroll').evaluate(element=>{element.scrollTop=0;});
    await page.screenshot({path:testInfo.outputPath(`long-result-${viewport.width}.png`),fullPage:true});
    await page.locator('footer summary').click();await expect(page.locator('#check-test')).toBeVisible();
    const footerOpen=await measure();expect(footerOpen.actions.bottom).toBeLessThanOrEqual(footerOpen.main.bottom+1);expect(footerOpen.documentHeight).toBeLessThanOrEqual(viewport.height+1);
    await page.locator('footer summary').click();
    await page.setViewportSize(viewport.width===1000?{width:1920,height:1080}:{width:1000,height:600});await page.setViewportSize(viewport);
    await expect(page.locator('input[name="long_0"]').first()).toBeChecked();
    await page.locator('#reset-test').click();await expect(page.locator('input:checked')).toHaveCount(0);
    await page.locator('#explore-tab').click();await page.locator('#test-tab').click();await expect(page.locator('#check-test')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
