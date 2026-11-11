import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {validateEvidenceTasks,evaluateEvidence,appendEvidence} from '../skills/interactive-topic-lesson/scripts/evidence.mjs';
import {validateLesson,gradeAnswers} from '../skills/interactive-topic-lesson/scripts/lib.mjs';
import {buildLesson} from '../skills/interactive-topic-lesson/scripts/build.mjs';

const numeric={id:'garden',title:'构造一个整米花园',kind:'construction',evaluation:{type:'numeric-constraints',fields:[{key:'w',label:'横边',integer:true,min:1,max:13},{key:'h',label:'竖边',integer:true,min:1,max:13}],rules:[{id:'fence',label:'长宽和14米',left:{op:'add',args:[{field:'w'},{field:'h'}]},relation:'eq',right:14},{id:'area',label:'面积49平方米',left:{op:'multiply',args:[{field:'w'},{field:'h'}]},relation:'eq',right:49}]}};
const human={id:'reason',title:'说明怎样比较其他方案',kind:'explanation',evaluation:{type:'human-review',criteria:['理由是否引用实际构造','是否说明枚举范围和未覆盖情形']}};
function lesson(){return {format:'interactive-topic-lesson.v1',skillVersion:'0.5.0',title:'构造和解释',subject:'math',need:'构造并用证据解释，不要求选择题',assumptions:[],objectives:[{id:'o1',goal:'构造并解释',interaction:'改变对象',misconception:'待检验假设',feedback:'按条件核对，理由待复核',evidenceIds:['garden','reason']}],learningDesign:{mode:'training',strategy:'构造后解释',coverage:[{id:'c1',focus:'构造与理由',contrast:'满足条件与解释充分不同',practice:'修改对象并保留理由',evidenceIds:['garden','reason']}],progression:'改变条件再比较',evidencePolicy:'记录帮助，保留初稿，理由不自动评分'},evidenceTasks:structuredClone([numeric,human]),content:{schemaVersion:2,layout:'canvas',sourceNote:'原创工具验收样例',gradeNote:'假设具备整数运算基础',introduction:'自己构造',sections:[],canvas:{html:'<!doctype html><html><head></head><body><main data-study-root data-learning-objective="o1"><button>改变</button><p data-feedback>观察</p></main><script>document.querySelector("button").addEventListener("click",()=>{});</script></body></html>'}}};}

test('canvas lessons can map objectives and coverage to evidence without single-choice questions',async()=>{
  const input=lesson();assert.equal(validateLesson(input).ok,true);
  const invalid=lesson();invalid.objectives[0].evidenceIds=['absent'];assert.equal(validateLesson(invalid).ok,false);
  const orphan=lesson();orphan.learningDesign.coverage[0].evidenceIds=['garden'];assert.equal(validateLesson(orphan).ok,false);
  const noEvidence=lesson();noEvidence.evidenceTasks=[];assert.equal(validateLesson(noEvidence).ok,false);
  const dir=await mkdtemp(path.join(os.tmpdir(),'lesson-evidence-'));
  try{await buildLesson(input,dir);const html=await readFile(path.join(dir,'index.html'),'utf8');assert(html.includes('"mode":"canvas"'));assert(!html.includes('score /'));for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi))new vm.Script(script[1]);const content=JSON.parse(await readFile(path.join(dir,'special-study.json'),'utf8'));assert.equal(content.test,undefined);assert.equal(content.evidenceTasks,undefined);}finally{await rm(dir,{recursive:true,force:true});}
  assert.equal(gradeAnswers({questions:[]},{}).ok,false);
});

test('numeric checks assess declared fields/conditions, not an explanation or mastery',()=>{
  assert.deepEqual(validateEvidenceTasks([numeric,human]),[]);
  const first=evaluateEvidence(numeric,{w:9,h:5,理由:'我觉得很大'});assert.equal(first.status,'checked');assert.equal(first.outcome,'not_met');assert.equal(first.criteria[0].met,true);assert.equal(first.criteria[1].met,false);
  const next=evaluateEvidence(numeric,{w:7,h:7,理由:'尚未解释'});assert.equal(next.outcome,'met');assert.equal(Object.hasOwn(next,'score'),false);assert.equal(Object.hasOwn(next,'mastered'),false);
  for(const response of [{w:'7',h:7},{w:7.5,h:6.5},{w:Infinity,h:7},{w:0,h:14}])assert.equal(evaluateEvidence(numeric,response).status,'invalid');
  const divided=structuredClone(numeric);divided.evaluation.rules[0].left={op:'divide',args:[1,0]};assert.equal(evaluateEvidence(divided,{w:7,h:7}).status,'invalid');
});

test('open expression stays pending review, including nonempty or empty text',()=>{
  for(const response of [{理由:'正确答案'},{理由:''},{初稿:'平均数等于每个人',改稿:'平均数不一定等于每个人',理由:'我改了'}]){
    const result=evaluateEvidence(human,response);assert.equal(result.status,'pending_review');assert.deepEqual(result.criteria,human.evaluation.criteria);assert.equal(Object.hasOwn(result,'score'),false);
  }
});

test('recording preserves first snapshots, revisions, assistance and invalid attempts without overwriting',()=>{
  const records=[],response={w:9,h:5};
  const first=appendEvidence([numeric,human],records,{taskId:'garden',response});assert(first.ok);response.w=7;assert.equal(records[0].response.w,9);assert.equal(records[0].assistance,null);
  const assistance={hintIds:['balance'],explanationViewed:true};
  const next=appendEvidence([numeric,human],records,{taskId:'garden',response:{w:7,h:7},assistance});assistance.hintIds.push('later');assert.equal(next.record.attempt,2);assert.deepEqual(records[1].assistance.hintIds,['balance']);assert.equal(records[0].result.outcome,'not_met');
  appendEvidence([numeric,human],records,{taskId:'garden',response:{w:'seven',h:7}});assert.equal(records[2].result.status,'invalid');
  assert(appendEvidence([numeric,human],records,{taskId:'reason',response:{理由:'需要家长看'}}).ok);assert.equal(records[3].result.status,'pending_review');
  assert.deepEqual(records.map(record=>record.sequence),[1,2,3,4]);
  while(records.length<100)appendEvidence([numeric,human],records,{taskId:'reason',response:{理由:'再次记录'}});
  assert.equal(appendEvidence([numeric,human],records,{taskId:'reason',response:{理由:'不能覆盖旧记录'}}).ok,false);assert.equal(records.length,100);assert.equal(records[0].response.w,9);
});

test('undeclared tasks, injected results, excessive data and unsafe evaluator expressions are rejected',()=>{
  const records=[];
  for(const payload of [{taskId:'absent',response:{w:7}},{taskId:'reason',response:{理由:'内容'},score:100},{taskId:'reason',response:{理由:'x'.repeat(16001)}},{taskId:'reason',response:{理由:'内容'},assistance:{hintIds:[],explanationViewed:'false'}}])assert.equal(appendEvidence([numeric,human],records,payload).ok,false);
  const cyclic={};cyclic.self=cyclic;assert.equal(appendEvidence([numeric,human],records,{taskId:'reason',response:cyclic}).ok,false);assert.equal(records.length,0);
  for(const mutate of [task=>task.evaluation.rules[0].left='eval(code)',task=>task.evaluation.rules[0].left={field:'missing'},task=>task.evaluation.rules[0].tolerance=-1,task=>task.evaluation.fields[0].max=NaN,task=>task.evaluation.type='model-says-correct']){const task=structuredClone(numeric);mutate(task);assert(validateEvidenceTasks([task]).length>0);}
});
