import {test,expect} from '@playwright/test';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {compileSource} from '../skills/interactive-topic-lesson/scripts/compile.mjs';
import {buildLesson} from '../skills/interactive-topic-lesson/scripts/build.mjs';

let output,lesson;
test.beforeAll(async()=>{
  output=await mkdtemp(path.join(os.tmpdir(),'learning-record-browser-'));
  lesson=await compileSource(fileURLToPath(new URL('../examples/mean-evidence/lesson.source.json',import.meta.url)));
  await buildLesson(lesson,path.join(output,'canvas'));
  const mixed=structuredClone(lesson);
  mixed.content.test={passScore:80,questions:Array.from({length:3},(_,index)=>({id:'recognition_'+index,prompt:'平均数是3，能否据此断定每个人实际都是3？',options:['能','不能'],answer:1,explanation:'平均数由总数和人数决定，具体分法可能不同。',optionFeedback:['这是把平均分后的数量当成每个人的实际数量。','还需要查看实际分法；平均数不足以确定每个人的数量。']}))};
  mixed.objectives[0].testIds=mixed.content.test.questions.map(q=>q.id);mixed.learningDesign.coverage[0].testIds=mixed.objectives[0].testIds;
  await buildLesson(mixed,path.join(output,'mixed'));
});
test.afterAll(async()=>{await rm(output,{recursive:true,force:true});});

for(const viewport of [{width:1000,height:600},{width:1920,height:1080}]){
  test(`construction, revision, pending review and private export at ${viewport.width}×${viewport.height}`,async({page},testInfo)=>{
    await page.setViewportSize(viewport);const errors=[],requests=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
    await page.goto(pathToFileURL(path.join(output,'canvas/index.html')).href);
    const canvas=page.frameLocator('#lesson-frame');await expect(canvas.locator('#show-records')).toBeVisible();
    await expect(page.locator('#test-tab')).toBeHidden();await expect(page.locator('#explore-tab')).toBeHidden();
    await page.screenshot({path:testInfo.outputPath('canvas-'+viewport.width+'.png'),fullPage:true});
    await canvas.locator('#check-average').click();await expect(canvas.locator('#average-feedback')).toHaveText(/^还不能判断。\n/);
    await canvas.locator('#prediction').fill('4');await canvas.locator('#check-average').click();await expect(canvas.locator('#average-feedback')).toHaveText(/^还没答对。\n/);
    await canvas.locator('#prediction').fill('3');await expect(canvas.locator('#average-feedback')).toBeEmpty();
    await canvas.locator('#check-average').click();await expect(canvas.locator('#average-feedback')).toHaveText(/^答对了。\n/);
    await canvas.locator('#save-work').click();await expect(canvas.locator('#record-feedback')).toHaveText(/^还没答对（分法还有条件尚未符合）。/);
    await page.screenshot({path:testInfo.outputPath('verdict-'+viewport.width+'.png'),fullPage:true});
    await canvas.locator('#hint summary').click();await expect(canvas.locator('#hint p')).toBeVisible();await canvas.locator('#hint summary').click();
    for(const target of [0,0,1,1]){await canvas.locator('#take-3').click();await expect(canvas.locator('#save-work')).toBeDisabled();await canvas.locator('#give-'+target).click();}
    await canvas.locator('#save-work').click();await expect(canvas.locator('#record-feedback')).toHaveText(/^答对了（分法符合所声明的数值条件）。\n/);
    const first=await page.evaluate(()=>evidenceRecords[0]);expect(first.response).toEqual({a:1,b:1,c:3,d:7});expect(first.result.outcome).toBe('not_met');
    await canvas.locator('#goal-counter').click();
    for(const source of [0,0,0,1,1,1]){await canvas.locator('#take-'+source).click();await canvas.locator('#give-3').click();}
    await canvas.locator('#save-work').click();await expect(canvas.locator('#record-feedback')).toContainText('符合所声明的数值条件');
    await canvas.locator('#explanation-box summary').click();
    const reason='总数12，人数4，平均3。丁实际有9块，所以平均数不能代表每个人。';
    await canvas.locator('#reason').fill(reason);await canvas.locator('#save-reason').click();await expect(canvas.locator('#record-feedback')).toContainText('待人工复核');
    await page.setViewportSize(viewport.width===1000?{width:1920,height:1080}:{width:1000,height:600});await page.setViewportSize(viewport);await expect(canvas.locator('#reason')).toHaveValue(reason);
    await canvas.locator('#reason').fill('');await canvas.locator('#save-reason').click();await expect(canvas.locator('#record-feedback')).toContainText('没有自动判对');
    await page.locator('#records-tab').click();await expect(page.locator('.evidence-entry')).toHaveCount(5);
    await expect(page.locator('.record-state').nth(0)).toHaveText('还没答对（数值条件未全符合）。');
    await expect(page.locator('.record-state').nth(1)).toHaveText('答对了（数值条件符合）。');
    const pending=page.locator('.evidence-entry').filter({hasText:'待人工复核'});await expect(pending).toHaveCount(2);await expect(pending.last()).toContainText('尚未填写');
    const snapshots=await page.evaluate(()=>evidenceRecords);expect(snapshots[0].response.a).toBe(1);expect(snapshots[1].response).toEqual({a:3,b:3,c:3,d:3});expect(snapshots[1].assistance.hintIds).toEqual(['move-blocks']);expect(snapshots[2].response).toEqual({a:0,b:0,c:3,d:9});expect(snapshots[3].response.我的解释).toBe(reason);expect(snapshots[4].result.status).toBe('pending_review');
    await page.screenshot({path:testInfo.outputPath('records-'+viewport.width+'.png'),fullPage:true});
    const downloadPromise=page.waitForEvent('download');await page.locator('#export-record').click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('本次学习记录.html');
    const recordHtml=await readFile(await download.path(),'utf8');const json=JSON.parse(recordHtml.match(/<script type="application\/json" id="learning-record">([\s\S]*?)<\/script>/)[1]);expect(json.records).toHaveLength(5);expect(json.artifactSha256).toBe(await page.locator('body').getAttribute('data-artifact-sha256'));expect(json.records[3].result.status).toBe('pending_review');
    await page.evaluate(()=>window.postMessage({channel:'special-study',type:'evidence',payload:{taskId:'explain-mean',response:{理由:'伪造外层消息'}}},'*'));expect(await page.evaluate(()=>evidenceRecords.length)).toBe(5);
    await page.locator('#explore-tab').click();await expect(canvas.locator('#reason')).toHaveValue('');await canvas.locator('#restore').click();expect(await page.evaluate(()=>evidenceRecords.length)).toBe(5);
    // A response that looks like markup must remain inert both on screen and in the saved record.
    const unsafe='</script><img src=x onerror="window.injected=true">';await canvas.locator('#reason').fill(unsafe);await canvas.locator('#save-reason').click();
    await page.locator('#records-tab').click();expect(await page.locator('#evidence-list img').count()).toBe(0);
    const safeDownload=page.waitForEvent('download');await page.locator('#export-record').click();const saved=await readFile(await(await safeDownload).path(),'utf8');expect(saved).toContain('\\u003c/script>');expect(saved).not.toContain('<img src=x');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);expect(requests).toEqual([]);
  });
}

test('optional recognition has scoped counts, no percentage and an odd final card without padding',async({page})=>{
  await page.setViewportSize({width:1000,height:600});await page.goto(pathToFileURL(path.join(output,'mixed/index.html')).href);
  await expect(page.locator('#test-tab')).toHaveText('辨析核对');await page.locator('#test-tab').click();await expect(page.locator('#quiz .muted')).toContainText('不评价你的构造和解释');
  await expect(page.locator('.question-card')).toHaveCount(3);
  const widths=await page.locator('.question-card').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().width));expect(widths[2]).toBeGreaterThan(widths[0]*1.8);
  for(const fieldset of await page.locator('fieldset').all())await fieldset.locator('input').last().check();await page.locator('#check-test').click();await expect(page.locator('#result')).toContainText('3/3');await expect(page.locator('#result')).not.toContainText('%');await expect(page.locator('#result')).not.toContainText('100');
  await expect(page.locator('.question-feedback').first()).toHaveText(/^答对了。\n/);
  expect(await page.locator('.question-feedback').first().evaluate(element=>({space:getComputedStyle(element).whiteSpace,weight:getComputedStyle(element,'::first-line').fontWeight}))).toEqual({space:'pre-line',weight:'750'});
  expect(await page.evaluate(()=>evidenceRecords.length)).toBe(0);await page.locator('#explore-tab').click();await expect(page.frameLocator('#lesson-frame').locator('#board')).toBeVisible();
});
