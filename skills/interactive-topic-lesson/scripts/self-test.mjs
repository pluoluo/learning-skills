#!/usr/bin/env node
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { compileSource, compileFile } from './compile.mjs';
import { validateLesson, gradeAnswers, publicQuestions, safeJson } from './lib.mjs';
import { buildLesson } from './build.mjs';
import { reviewScaffold } from './review.mjs';
import { startLessonServer, controlService } from './serve.mjs';
import { validatePlan, checkBrowser } from './check-browser.mjs';
import { checkPlans } from './check-plans.mjs';
import { parseScreenCopy, extractScreenCopy, screenCopyDigest } from './screen-copy.mjs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const tmp = await mkdtemp(path.join(os.tmpdir(), 'topic-lesson-test-'));
after(async () => {
  const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(tmp));
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(tmp).startsWith('topic-lesson-test-')) await rm(tmp, { recursive:true, force:true });
});
const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>边界</title></head><body><main data-study-root data-learning-objective="o1"><button id="fence">围栏</button><p data-feedback>观察边界</p></main><script>document.getElementById("fence").onclick=function(){document.querySelector("[data-feedback]").textContent="沿边界";};</script></body></html>';
function lesson() {
  return { format:'interactive-topic-lesson.v1',skillVersion:'0.2.0',title:'边界与内部',subject:'math',need:'区分量边界和量内部',assumptions:[],objectives:[{id:'o1',goal:'指出边界',interaction:'点选围栏',misconception:'可能混淆内部',feedback:'标记边界',testIds:['fence']}],content:{schemaVersion:2,layout:'canvas',sourceNote:'原创补充材料',gradeNote:'四年级',introduction:'点围栏',sections:[],canvas:{html},test:{passScore:80,questions:[{id:'fence',prompt:'沿边界安装的是？',options:['围栏','草皮'],answer:0,explanation:'围栏沿边界。'}]}} };
}
function trainingLesson() {
  const input=lesson();input.skillVersion='0.3.0';
  input.content.test.questions[0].options.push('只量一条边');
  input.content.test.questions[0].optionFeedback=['围栏沿完整边界。','草皮覆盖的是内部大小；围栏沿边界，试着沿四条边走一圈。','这只量了一条边，漏了其余三条；先找全边界再合起来。'];
  input.content.test.questions.push({id:'inside',prompt:'覆盖内部的是？',options:['围栏','草皮'],answer:1,explanation:'草皮覆盖内部。',optionFeedback:['围栏沿边界，不能覆盖内部；看单位方格所在的位置。','草皮覆盖内部，应量内部大小。']});
  input.objectives[0].testIds.push('inside');
  input.learningDesign={mode:'training',strategy:'先找量的是边界还是内部，再选择测量方法。',coverage:[
    {id:'boundary',focus:'完整边界与内部',contrast:'围栏、草皮和一条边所量的范围不同',practice:'改变长宽，分别观察边界和内部，再指出是否找全四条边',testIds:['fence']},
    {id:'interior',focus:'内部覆盖',contrast:'覆盖单位方格与沿边走的任务不同',practice:'选择草皮观察内部覆盖，并换情境检验',testIds:['inside']},
  ],progression:'由标明位置的比较进入未标明所量范围的新例子。',evidencePolicy:'首次检查和看过解释后的重试分开；仅报告本页任务，不宣称整个专题掌握。'};
  return input;
}
const planFixtures = fileURLToPath(new URL('./fixtures/plans/', import.meta.url));
test('author plan fixtures pass structure only; missing review, cold read and weakest task name exact omissions', async () => {
  const valid = await checkPlans(path.join(planFixtures, 'valid'));
  assert.equal(valid.ok, true);assert.equal(valid.scope, 'structure-only');
  for (const [fixture, expected] of [['missing-review', '审核记录'], ['missing-cold-read', '冷读复述'], ['missing-weakest', '最薄弱任务']]) {
    const result = await checkPlans(path.join(planFixtures, fixture));
    assert.equal(result.ok, false);assert.ok(result.errors.some(error => error.includes(expected)), result.errors.join('\n'));
  }
  const absent = await checkPlans(path.join(tmp, 'no-plans'));
  assert.deepEqual(absent.errors, ['teaching-plan.md: 缺少文件', 'presentation-plan.md: 缺少文件']);
  const run = promisify(execFile), script = fileURLToPath(new URL('./check-plans.mjs', import.meta.url));
  assert.match((await run(process.execPath, [script, path.join(planFixtures, 'valid')])).stdout, /structure-only/);
  await assert.rejects(run(process.execPath, [script, path.join(planFixtures, 'missing-cold-read')]), error => error.code === 1 && error.stderr.includes('冷读复述'));
});
test('plan examples satisfy structure; empty or commented fields cannot substitute for records', async () => {
  const directory = path.join(tmp, 'plan-templates');await mkdir(directory);
  for (const name of ['teaching', 'presentation']) {
    await writeFile(path.join(directory, name+'-plan.md'), await readFile(new URL('../references/'+name+'-plan.example.md', import.meta.url), 'utf8'));
  }
  assert.equal((await checkPlans(directory)).ok, true);
  const filename = path.join(directory, 'presentation-plan.md');
  const original = await readFile(filename, 'utf8');
  await writeFile(filename, original.replace(/^冷读复述[：:].*$/m, '冷读复述：   \n<!-- 冷读复述：不能用隐藏注释假装有记录 -->'));
  const result = await checkPlans(directory);assert.equal(result.ok, false);assert.ok(result.errors.some(error => error.includes('冷读复述')));
});
async function copyPlanFixture(name) {
  const directory=path.join(tmp,name);await mkdir(directory);
  for (const file of ['teaching-plan.md','presentation-plan.md']) await writeFile(path.join(directory,file),await readFile(path.join(planFixtures,'valid',file),'utf8'));
  return directory;
}
test('multiline plan records accept paragraphs, lists, fences and CRLF without swallowing an empty next field', async () => {
  const directory=await copyPlanFixture('multiline-plans'),file=path.join(directory,'presentation-plan.md');
  const original=await readFile(file,'utf8');
  const changed=original.replace(/冷读复述：[\s\S]*?(?=逐条理解偏差与修改：)/,'冷读复述：\n\n我要做什么：摆一种分法。\n\n做完看到什么：看到数值核对，解释请人看。\n\n')
    .replace(/答案泄露自检：[\s\S]*?(?=复读范围与结果：)/,'答案泄露自检：\n- s1标题没有给出分法。\n- s2状态没有显示待求答案。\n\n');
  await writeFile(file,changed.replaceAll('\n','\r\n'));
  assert.equal((await checkPlans(directory,{requireApproved:true})).ok,true);
  await writeFile(file,changed.replace(/冷读复述：[\s\S]*?(?=逐条理解偏差与修改：)/,'冷读复述：\n```text\n我要摆出自己的分法。\n```\n\n'));
  assert.equal((await checkPlans(directory)).ok,true);
  for (const empty of ['冷读复述：\n\n','冷读复述：\n<!-- 只有隐藏注释 -->\n','冷读复述：\n```text\n```\n']) {
    await writeFile(file,changed.replace(/冷读复述：[\s\S]*?(?=逐条理解偏差与修改：)/,empty));
    const report=await checkPlans(directory);assert.equal(report.ok,false);assert.ok(report.errors.some(error=>error.includes('冷读复述')));
  }
});
test('screen copy extraction preserves literal wording, selects changed screens and rejects ambiguous sources', async () => {
  const source=await readFile(path.join(planFixtures,'valid','presentation-plan.md'),'utf8'),screens=parseScreenCopy(source);
  const extracted=extractScreenCopy(screens);
  assert.ok(extracted.includes(screens[0].text.h1));assert.ok(extracted.includes(screens[0].text.status));
  assert.ok(!extracted.includes('合成测试声明'));assert.ok(!extracted.includes('答案泄露自检'));
  const selected=extractScreenCopy(screens,['s2']);assert.ok(selected.includes(screens[1].text.prompt));assert.ok(!selected.includes(screens[0].text.prompt));
  assert.throws(()=>extractScreenCopy(screens,['missing']),/未知/);
  assert.throws(()=>parseScreenCopy(source+source),/只能有一个/);
  assert.throws(()=>parseScreenCopy('<!--\n'+source+'\n-->'),/只能有一个/);
  assert.throws(()=>parseScreenCopy(source.replace('"id": "s2"','"id": "s1"')),/唯一/);
  assert.throws(()=>parseScreenCopy(source.replace('"state": "初始"','"goals": "不该进入冷读输入"')),/state/);
  const literal=[{id:'literal',state:'初始',text:{h1:'字面 <!--可见文本--> $& `标题`',prompt:'第一行\n第二行'}}];
  assert.deepEqual(parseScreenCopy('```student-facing-copy\n'+JSON.stringify(literal)+'\n```'),literal);
  assert.ok(extractScreenCopy(literal).includes(literal[0].text.h1));
  const updated=structuredClone(screens);updated[0].text.h1+='变化';assert.notEqual(screenCopyDigest(screens),screenCopyDigest(updated));
  const run=promisify(execFile),script=fileURLToPath(new URL('./screen-copy.mjs',import.meta.url));
  assert.equal((await run(process.execPath,[script,path.join(planFixtures,'valid','presentation-plan.md'),'--screens','s2'])).stdout,selected);
  const output=path.join(tmp,'cold-read.txt');await run(process.execPath,[script,path.join(planFixtures,'valid','presentation-plan.md'),'--out',output]);
  assert.equal(await readFile(output,'utf8'),extracted);
  await assert.rejects(run(process.execPath,[script,path.join(planFixtures,'valid','presentation-plan.md'),'--out',output]));
});
test('required plans reject missing, pending and returned reviews before writing or overwriting builds', async () => {
  const directory=await copyPlanFixture('gate-plans'),file=path.join(directory,'presentation-plan.md');
  const original=await readFile(file,'utf8');
  const output=path.join(tmp,'gated-output');
  await assert.rejects(buildLesson(lesson(),output,{requirePlans:path.join(tmp,'absent-author')}),/缺少文件/);
  await assert.rejects(readFile(path.join(output,'index.html')), {code:'ENOENT'});
  const built=await buildLesson(lesson(),output,{requirePlans:directory});assert.ok(built.files.includes('plans-check.json'));
  const page=await readFile(path.join(output,'index.html'),'utf8');
  const receipt=JSON.parse(await readFile(path.join(output,'plans-check.json'),'utf8'));
  assert.equal(receipt.artifactSha256,validateLesson(lesson()).artifactSha256);
  assert.equal(receipt.planSha256['presentation-plan.md'],createHash('sha256').update(original).digest('hex'));
  assert.equal(receipt.screenCopySha256,screenCopyDigest(parseScreenCopy(original)));
  assert.equal(receipt.chronologyVerified,false);assert.equal(receipt.scope,'structure-and-author-declarations-only');
  assert.equal(JSON.parse(await readFile(path.join(output,'review.json'),'utf8')).checks.subject.status,'not_run');
  assert.ok(!page.includes(receipt.screenCopySha256));assert.ok(!page.includes(original));
  for (const [field,value] of [['冷读审核结论','待补'],['冷读审核结论','通过不了'],['呈现审核结论','退回']]) {
    await writeFile(file,original.replace(field+'：通过',field+'：'+value));
    assert.equal((await checkPlans(directory)).ok,true);
    await assert.rejects(buildLesson(lesson(),output,{force:true,requirePlans:directory}),/未明确通过/);
    assert.equal(await readFile(path.join(output,'index.html'),'utf8'),page);
    assert.deepEqual(JSON.parse(await readFile(path.join(output,'plans-check.json'),'utf8')),receipt);
  }
  await writeFile(file,original.replace(/^答案泄露自检：[\s\S]*?(?=复读范围与结果：)/m,''));
  await assert.rejects(buildLesson(lesson(),output,{force:true,requirePlans:directory}),/答案泄露自检/);
  await writeFile(file,original);
  const teachingFile=path.join(directory,'teaching-plan.md'),teaching=await readFile(teachingFile,'utf8');
  await writeFile(teachingFile,teaching.replace('内容审核结论：通过','内容审核结论：待补'));
  await assert.rejects(buildLesson(lesson(),output,{force:true,requirePlans:directory}),/内容审核结论未明确通过/);
  await buildLesson(lesson(),output,{force:true});
  await assert.rejects(readFile(path.join(output,'plans-check.json')), {code:'ENOENT'});
});
test('build CLI enforces its optional gate while unflagged legacy builds retain six artifacts', async () => {
  const run=promisify(execFile),script=fileURLToPath(new URL('./build.mjs',import.meta.url));
  const input=path.join(tmp,'gate-lesson.json');await writeFile(input,JSON.stringify(lesson()));
  const required=path.join(tmp,'cli-required');
  const result=JSON.parse((await run(process.execPath,[script,input,'--out',required,'--require-plans',path.join(planFixtures,'valid')])).stdout);
  assert.equal(result.files.length,7);
  await assert.rejects(run(process.execPath,[script,input,'--out',path.join(tmp,'cli-invalid'),'--require-plans',path.join(planFixtures,'missing-cold-read')]),error=>error.code===1&&error.stderr.includes('冷读复述'));
  await assert.rejects(run(process.execPath,[script,input,'--out',path.join(tmp,'cli-no-arg'),'--require-plans','--force']));
  const legacy=JSON.parse((await run(process.execPath,[script,input,'--out',path.join(tmp,'cli-legacy')])).stdout);assert.equal(legacy.files.length,6);
});
test('0.5.0, 0.5.1 and 0.6.0 artifacts still validate and build without author plans', async () => {
  for (const version of ['0.5.0', '0.5.1', '0.6.0']) {
    const input=trainingLesson();input.skillVersion=version;
    assert.equal(validateLesson(input).ok,true);
    const directory=path.join(tmp,'legacy-'+version);await buildLesson(input,directory);
    assert.equal(JSON.parse(await readFile(path.join(directory,'lesson.json'),'utf8')).skillVersion,version);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory,'special-study.json'),'utf8')),input.content);
  }
});
test('new lessons require a valid coverage design; training needs aligned feedback for every option',()=>{
  assert.equal(validateLesson(trainingLesson()).ok,true);
  const noDesign=trainingLesson();delete noDesign.learningDesign;assert.equal(validateLesson(noDesign).ok,false);
  const noFeedback=trainingLesson();delete noFeedback.content.test.questions[0].optionFeedback;assert.equal(validateLesson(noFeedback).ok,false);
  const misaligned=trainingLesson();misaligned.content.test.questions[0].optionFeedback.pop();assert.equal(validateLesson(misaligned).ok,false);
  const badRef=trainingLesson();badRef.learningDesign.coverage[0].testIds=['absent'];assert.equal(validateLesson(badRef).ok,false);
  const untested=trainingLesson();untested.learningDesign.coverage.pop();assert.equal(validateLesson(untested).ok,false);
  const exploration=trainingLesson();exploration.learningDesign.mode='exploration';delete exploration.content.test.questions[0].optionFeedback;assert.equal(validateLesson(exploration).ok,true);
  assert.equal(validateLesson(lesson()).ok,true); // legacy 0.2 artifacts remain valid
});
test('different wrong choices receive their own explanations; public context contains no feedback keys',()=>{
  const input=trainingLesson(),formal=input.content.test;
  const wrongInterior=gradeAnswers(formal,{fence:1,inside:1});
  const wrongSingleEdge=gradeAnswers(formal,{fence:2,inside:1});
  assert.equal(wrongInterior.details[0].selectedOption,1);assert.equal(wrongSingleEdge.details[0].selectedOption,2);
  assert.ok(wrongInterior.details[0].explanation.includes('内部大小'));
  assert.ok(wrongSingleEdge.details[0].explanation.includes('漏了其余三条'));
  assert.notEqual(wrongInterior.details[0].explanation,wrongSingleEdge.details[0].explanation);
  assert.ok(gradeAnswers(formal,{fence:0,inside:1}).details[0].explanation.includes('完整边界'));
  for(const item of publicQuestions(formal.questions)){assert.equal(Object.hasOwn(item,'optionFeedback'),false);assert.equal(Object.hasOwn(item,'explanation'),false);assert.equal(Object.hasOwn(item,'answer'),false);}
  assert.equal(gradeAnswers(lesson().content.test,{fence:1}).details[0].explanation,lesson().content.test.questions[0].explanation);
});
test('incidental formal-ID collision is allowed; explicit formal hooks and unsafe code are rejected', () => {
  assert.equal(validateLesson(lesson()).ok,true);
  const hooked=lesson(); hooked.content.canvas.html=html.replace('id="fence"','id="fence" data-question-id="fence"');
  assert.equal(validateLesson(hooked).ok,false);
  const unsafe=lesson();unsafe.content.canvas.html=html.replace('</script>','fetch("/private");</script>');
  assert.equal(validateLesson(unsafe).ok,false);
});
test('single source compiles non-ASCII paths; ambiguity and traversal are rejected',async () => {
  const author=path.join(tmp,'作者 空间');await mkdir(author);
  const input=lesson();input.content.canvas={file:'canvas.html'};
  const source=path.join(author,'lesson.source.json');
  await writeFile(source,JSON.stringify(input));await writeFile(path.join(author,'canvas.html'),html);
  const output=path.join(tmp,'compiled','lesson.json');
  await compileFile(source,output);
  assert.deepEqual(JSON.parse(await readFile(output,'utf8')),lesson());
  assert.deepEqual(JSON.parse(await readFile(source,'utf8')).content.canvas,{file:'canvas.html'});
  await assert.rejects(compileFile(source,source),/overwrite/);
  await assert.rejects(compileFile(source,path.join(author,'canvas.html')),/outside the author/);
  input.content.canvas={file:'canvas.html',html};await writeFile(source,JSON.stringify(input));
  await assert.rejects(compileSource(source),/OR html/);
  await writeFile(path.join(tmp,'outside.html'),html);
  input.content.canvas={file:'../outside.html'};await writeFile(source,JSON.stringify(input));
  await assert.rejects(compileSource(source),/inside the author/);
});
test('symlink cannot escape the author workspace',async context => {
  const author=path.join(tmp,'symlink-author');await mkdir(author);const outside=path.join(tmp,'symlink-outside.html');await writeFile(outside,html);
  try { await symlink(outside,path.join(author,'canvas.html'),'file'); } catch(error) { if(['EPERM','EACCES','ENOTSUP'].includes(error.code)){context.skip('Environment does not permit creating symlinks');return;}throw error; }
  const input=lesson();input.content.canvas={file:'canvas.html'};const source=path.join(author,'lesson.source.json');await writeFile(source,JSON.stringify(input));
  await assert.rejects(compileSource(source),/inside the author/);
});
test('build retains private review, embeds only labels and refuses stale reviews or accidental overwrite',async () => {
  const input=lesson();const v=validateLesson(input);const review=reviewScaffold(v);
  review.checks.subject={status:'passed',evidence:['PRIVATE REVIEW DETAIL']};
  const output=path.join(tmp,'build');await buildLesson(input,output,{review});
  const built=await readFile(path.join(output,'index.html'),'utf8');
  for (const script of built.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) new vm.Script(script[1]);
  assert.ok(!built.includes('PRIVATE REVIEW DETAIL'));assert.ok(built.includes(v.artifactSha256));
  assert.deepEqual(JSON.parse(await readFile(path.join(output,'review.json'),'utf8')),review);
  await assert.rejects(buildLesson(input,output),/exists/);
  const changed=lesson();changed.title='Different title';await assert.rejects(buildLesson(changed,path.join(tmp,'stale'),{review}),/digest/);
  const noEvidence=reviewScaffold(v);noEvidence.checks.browser.status='passed';await assert.rejects(buildLesson(input,path.join(tmp,'no-evidence'),{review:noEvidence}),/evidence/);
  const noReview=path.join(tmp,'unreviewed');await buildLesson(input,noReview);
  assert.equal(JSON.parse(await readFile(path.join(noReview,'review.json'),'utf8')).checks.browser.status,'not_run');
});
test('formal practice grades actual choices without exposing keys in public context',() => {
  const input=lesson();assert.equal(gradeAnswers(input.content.test,{fence:0}).score,100);
  assert.equal(gradeAnswers(input.content.test,{fence:1}).score,0);
  assert.equal(gradeAnswers(input.content.test,{fence:'0'}).ok,false);
  assert.equal(gradeAnswers(input.content.test,{fence:0,extra:1}).ok,false);
  assert.equal(Object.hasOwn(publicQuestions(input.content.test.questions)[0],'answer'),false);
});
test('template substitution preserves literal replacement characters in titles and canvas code',async () => {
  const input=lesson();input.title="字面 $& $` $' $$";
  // Use a callback here too: the test fixture must preserve the same literals.
  input.content.canvas.html=html.replace('</main>',()=>"<p>字面 $& $` $' $$</p></main>");
  const output=path.join(tmp,'literal-build');await buildLesson(input,output);
  const built=await readFile(path.join(output,'index.html'),'utf8');
  assert.ok(built.includes(safeJson(input.title)));
  assert.ok(built.includes(safeJson(input.content.canvas.html).slice(1,-1)));
  for(const script of built.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) new vm.Script(script[1]);
});
test('player has one direct check, no pre-result retry, and invalidates only an edited judgment',async () => {
  const input=trainingLesson();
  const output=path.join(tmp,'player-flow');await buildLesson(input,output);
  const built=await readFile(path.join(output,'index.html'),'utf8');
  // Execute the actual built host script against a minimal DOM double.
  // This verifies event/state behavior; it is not browser rendering or touch acceptance.
  const ids=new Map(),elements=[],messages={};
  class Element {
    constructor(tag){this.tagName=tag;this.children=[];this.events={};this.dataset={};this.style={};this.textContent='';this.className='';this.hidden=false;this.checked=false;this.clientWidth=1000;this.clientHeight=450;elements.push(this);}
    set id(value){this._id=value;ids.set(value,this);} get id(){return this._id;}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=[...children];}
    setAttribute(name,value){this[name]=value;}
    addEventListener(name,handler){this.events[name]=handler;}
    getBoundingClientRect(){return {height:50,width:1000};}
    focus(){this.focused=true;}
  }
  for(const match of built.matchAll(/<(\w+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){
    const element=new Element(match[1]);element.id=match[3];element.hidden=/\bhidden\b/.test(match[2]);
    const className=match[2].match(/\bclass="([^"]*)"/);if(className)element.className=className[1];
  }
  const body=new Element('body'),main=new Element('main'),header=new Element('header'),footer=new Element('footer');
  const frame=ids.get('lesson-frame');frame.contentWindow={postMessage:(...message)=>{frame.lastMessage=message;}};
  const document={body,title:'',getElementById:id=>ids.get(id),createElement:tag=>new Element(tag),
    querySelector:selector=>({'body>main':main,'body>header':header,'body>footer':footer})[selector],
    querySelectorAll:selector=>elements.filter(element=>selector==='.question-feedback'?element.className==='question-feedback':selector==='input[type=radio]'?element.tagName==='input'&&element.type==='radio':false),
    getElementsByName:name=>elements.filter(element=>element.name===name),
  };
  const window={innerHeight:600,addEventListener:(name,handler)=>{messages[name]=handler;}};
  const sandbox={document,window,ResizeObserver:class{observe(){}},console};
  for(const match of built.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi))new vm.Script(match[1]).runInNewContext(sandbox);
  assert.equal(sandbox.formatFeedback(true,'对。 这个表达符合情境。'),'答对了。\n这个表达符合情境。');
  assert.equal(sandbox.formatFeedback(false,'错。 这里漏掉了条件。'),'还没答对。\n这里漏掉了条件。');
  assert.equal(sandbox.formatFeedback(true,'对比两处条件可以找到依据。'),'答对了。\n对比两处条件可以找到依据。');
  const reset=ids.get('reset-test'),check=ids.get('check-test'),result=ids.get('result');
  // A canvas can also submit the formal check through the supported message API.
  // Seeing that feedback must count before a later check through the outer UI.
  messages.message({source:frame.contentWindow,data:{channel:'special-study',type:'submit',payload:{fence:1,inside:0}}});
  assert.equal(frame.lastMessage[0].type,'result');assert.equal(frame.lastMessage[0].payload.details[1].correct,false);
  assert.equal(reset.hidden,true);
  check.events.click();assert.ok(result.textContent.includes('第 1 题还没选'));assert.equal(reset.hidden,true);
  const pick=(name,value)=>{const options=document.getElementsByName(name);options.forEach(option=>option.checked=option.value===String(value));options.find(option=>option.checked).events.change();};
  pick('fence',1);assert.ok(result.textContent.includes('1/2'));assert.equal(reset.hidden,true);
  pick('fence',0);assert.equal(ids.get('feedback-fence').textContent,'');assert.equal(reset.hidden,true);
  pick('fence',1);pick('inside',1);assert.ok(result.textContent.includes('每题都已选择'));
  check.events.click();assert.ok(result.textContent.includes('1/2'));assert.equal(reset.hidden,false);
  assert.ok(ids.get('feedback-fence').textContent.startsWith('还没答对。\n'));
  assert.ok(ids.get('feedback-fence').textContent.includes('内部大小'));
  const summaryText=()=>ids.get('practice-summary').children.map(child=>child.textContent).join(' ');
  assert.ok(summaryText().includes('完整边界与内部：首次检查选对 0/1'));
  assert.ok(summaryText().includes('内部覆盖：首次检查选对 0/1 题，当前选对 1/1'));
  const otherExplanation=ids.get('feedback-inside').textContent;
  pick('fence',0);assert.equal(ids.get('feedback-fence').textContent,'');assert.equal(ids.get('feedback-inside').textContent,otherExplanation);
  assert.ok(result.textContent.includes('上次总分已清除'));assert.equal(reset.hidden,true);
  check.events.click();assert.ok(result.textContent.includes('2/2'));assert.equal(reset.hidden,false);
  assert.ok(summaryText().includes('首次检查选对 0/1 题，当前选对 1/1'));
  check.events.click();assert.ok(summaryText().includes('首次检查选对 0/1 题，当前选对 1/1'));
  reset.events.click();assert.equal(reset.hidden,true);assert.equal(document.querySelectorAll('input[type=radio]').some(option=>option.checked),false);
  assert.equal(ids.get('feedback-inside').textContent,'');assert.ok(result.textContent.includes('答案已清空'));
  pick('fence',0);pick('inside',1);check.events.click();
  assert.ok(summaryText().includes('首次检查选对 0/1 题，当前选对 1/1'));
  const privateDesign=await readFile(path.join(output,'special-study.json'),'utf8');assert.ok(!privateDesign.includes('learningDesign'));
  assert.ok(!built.includes(input.learningDesign.progression));
});
function browserPlan(){return {cases:['primary','wrong','support','transfer','keyboard','responsive'].map(id=>({id,steps:id==='responsive'?[{op:'resize',width:1920,height:1080},{op:'resize',width:1000,height:600},{op:'text',selector:'[data-feedback]',value:'观察'}]:id==='keyboard'?[{op:'press',selector:'#fence',value:'Enter'},{op:'text',selector:'[data-feedback]',value:'边界'}]:[{op:'click',selector:'#fence'},{op:'text',selector:'[data-feedback]',value:'边界'}]}))};}
test('browser runner requires observable coverage, and missing engine stays not_run',async () => {
  assert.equal(validatePlan(browserPlan()).length,2);
  const empty=browserPlan();empty.cases[0].steps=[{op:'click',selector:'#fence'}];assert.throws(()=>validatePlan(empty),/assertion/);
  const noKey=browserPlan();noKey.cases.find(c=>c.id==='keyboard').steps.shift();assert.throws(()=>validatePlan(noKey),/key action/);
  const filename=path.join(tmp,'browser-lesson.json');await writeFile(filename,JSON.stringify(lesson()));
  const plan=path.join(tmp,'browser-plan.json');await writeFile(plan,JSON.stringify(browserPlan()));
  const report=await checkBrowser({lesson:filename,url:'http://127.0.0.1:1/',plan,out:path.join(tmp,'browser-report'),module:path.join(tmp,'nonexistent-playwright.mjs')});
  assert.equal(report.status,'not_run');assert.equal(report.cases.length,0);assert.ok(report.error);
});
test('host serves only its lesson, keeps control private, and revises without changing URL',async () => {
  const output=path.join(tmp,'served-build');await buildLesson(lesson(),output,{requirePlans:path.join(planFixtures,'valid')});
  const state=path.join(tmp,'delivery.json');const service=await startLessonServer({lesson:path.join(output,'index.html'),state});
  try {
    const info=service.record();assert.equal(info.audience,'author-preview-only');
    const response=await fetch(info.url);const page=await response.text();assert.equal(response.status,200);assert.ok(page.includes('边界与内部'));assert.ok(page.includes(info.expiresAt));assert.ok(!page.includes(info.stopToken));
    const base=new URL(info.url).origin;
    for(const suffix of ['/','/lesson.json','/special-study.json','/delivery.json','/review.json','/plans-check.json','/LICENSE','/../lesson.json']) assert.equal((await fetch(base+suffix)).status,404);
    assert.equal((await fetch(base+'/__agent/control',{method:'POST',body:'{}'})).status,403);
    assert.equal((await fetch(info.url,{method:'HEAD'})).status,200);
    assert.equal((await fetch(info.url,{method:'POST'})).status,404);
    const revised=lesson();revised.title='新版本';const next=path.join(tmp,'next-build');await buildLesson(revised,next);
    await controlService(state,{type:'update',lesson:path.join(next,'index.html')});
    assert.ok((await (await fetch(info.url)).text()).includes('新版本'));assert.equal(service.record().url,info.url);
    await controlService(state,{type:'extend',hours:1});assert.equal(service.record().url,info.url);assert.notEqual(service.record().expiresAt,info.expiresAt);
    assert.equal(service.record().verification.learnerDevice,'not_run');
    await controlService(state,{type:'stop'});
    assert.equal(JSON.parse(await readFile(state,'utf8')).status,'stopped');
  } finally { await service.stop(); }
});
test('host refuses wildcard binds, source files and occupied manifests; expiry stops it',async () => {
  const output=path.join(tmp,'expiry-build');await buildLesson(lesson(),output);const page=path.join(output,'index.html');
  await assert.rejects(startLessonServer({lesson:page,state:path.join(tmp,'wildcard.json'),bind:'0.0.0.0'}),/interface/);
  const source=path.join(tmp,'not-page.json');await writeFile(source,'{}');await assert.rejects(startLessonServer({lesson:source,state:path.join(tmp,'source-state.json')}),/built by this/);
  const existing=path.join(tmp,'occupied.json');await writeFile(existing,'{}');await assert.rejects(startLessonServer({lesson:page,state:existing}),/already exists/);
  const state=path.join(tmp,'expiry.json');const service=await startLessonServer({lesson:page,state,hours:0.00003});
  await new Promise(resolve=>service.server.once('close',resolve));
  await service.stop();
  assert.equal(JSON.parse(await readFile(state,'utf8')).status,'stopped');
});
