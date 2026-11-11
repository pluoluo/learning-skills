// Bounded, declarative numeric checks. Open language/strategy judgments stay human-reviewed.
export function validateEvidenceTasks(tasks) {
  const errors=[];
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const short=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
  const key=value=>short(value,40)&&/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)&&!['constructor','prototype','__proto__'].includes(value);
  const check=(condition,message)=>{if(!condition)errors.push(message);};
  if(!Array.isArray(tasks)||tasks.length>20)return ['evidenceTasks must be an array of at most 20 tasks'];
  const ids=new Set();
  for(const task of tasks){
    if(!object(task)){errors.push('Evidence task must be an object');continue;}
    check(Object.keys(task).every(key=>['id','title','kind','evaluation'].includes(key)),'Evidence task contains unsupported fields');
    check(key(task.id)&&!ids.has(task.id),'Evidence task needs a unique valid id');ids.add(task.id);
    check(short(task.title,100),`Evidence ${task.id}: title needs 1–100 characters`);
    check(['construction','revision','explanation'].includes(task.kind),`Evidence ${task.id}: unsupported kind`);
    const evaluation=task.evaluation;
    if(!object(evaluation)){errors.push(`Evidence ${task.id}: evaluation is required`);continue;}
    if(evaluation.type==='human-review'){
      check(Object.keys(evaluation).every(key=>['type','criteria'].includes(key)),'Human review only declares criteria');
      check(Array.isArray(evaluation.criteria)&&evaluation.criteria.length>=1&&evaluation.criteria.length<=8&&evaluation.criteria.every(item=>short(item,300)),`Evidence ${task.id}: provide 1–8 human review criteria`);
      continue;
    }
    if(evaluation.type!=='numeric-constraints'){errors.push(`Evidence ${task.id}: unsupported evaluator`);continue;}
    check(Object.keys(evaluation).every(key=>['type','fields','rules'].includes(key)),'Numeric evaluation contains unsupported fields');
    const fields=Array.isArray(evaluation.fields)?evaluation.fields:[];
    check(fields.length>=1&&fields.length<=8,`Evidence ${task.id}: provide 1–8 numeric fields`);
    const names=new Set();
    for(const field of fields){
      if(!object(field)){errors.push('Numeric field must be an object');continue;}
      check(Object.keys(field).every(key=>['key','label','integer','min','max'].includes(key)),'Numeric field contains unsupported fields');
      check(key(field.key)&&!names.has(field.key),'Numeric field needs a unique valid key');names.add(field.key);
      check(short(field.label,100),'Numeric field needs a label');
      check(field.integer===undefined||typeof field.integer==='boolean','integer must be boolean');
      for(const bound of ['min','max'])check(field[bound]===undefined||Number.isFinite(field[bound]),'Numeric bounds must be finite');
      check(field.min===undefined||field.max===undefined||field.min<=field.max,'Numeric min exceeds max');
    }
    let nodes=0;
    function expression(value,depth=0){
      if(++nodes>64||depth>6)return false;
      if(typeof value==='number')return Number.isFinite(value);
      if(!object(value))return false;
      if(Object.keys(value).length===1&&Object.hasOwn(value,'field'))return names.has(value.field);
      return Object.keys(value).length===2&&['add','subtract','multiply','divide'].includes(value.op)&&Array.isArray(value.args)&&value.args.length===2&&value.args.every(item=>expression(item,depth+1));
    }
    const rules=Array.isArray(evaluation.rules)?evaluation.rules:[];
    check(rules.length>=1&&rules.length<=8,`Evidence ${task.id}: provide 1–8 numeric rules`);
    const ruleIds=new Set();
    for(const rule of rules){
      if(!object(rule)){errors.push('Numeric rule must be an object');continue;}
      check(Object.keys(rule).every(key=>['id','label','left','relation','right','tolerance'].includes(key)),'Numeric rule contains unsupported fields');
      check(key(rule.id)&&!ruleIds.has(rule.id),'Numeric rule needs a unique valid id');ruleIds.add(rule.id);
      check(short(rule.label,200),'Numeric rule needs a label');
      check(['eq','lt','lte','gt','gte'].includes(rule.relation),'Unsupported numeric relation');
      nodes=0;check(expression(rule.left)&&expression(rule.right),'Invalid or excessive numeric expression');
      check(rule.tolerance===undefined||rule.relation==='eq'&&Number.isFinite(rule.tolerance)&&rule.tolerance>=0,'Only equality may declare a finite nonnegative tolerance');
    }
  }
  return errors;
}

export function evaluateEvidence(task,response) {
  const evaluation=task.evaluation;
  if(evaluation.type==='human-review')return {status:'pending_review',criteria:[...evaluation.criteria]};
  for(const field of evaluation.fields){
    const value=response[field.key];
    if(!Object.hasOwn(response,field.key)||!Number.isFinite(value)||field.integer&&!Number.isSafeInteger(value)||field.min!==undefined&&value<field.min||field.max!==undefined&&value>field.max){
      return {status:'invalid',message:`${field.label}尚不符合数值输入范围，未核对条件。`};
    }
  }
  function calculate(expression){
    if(typeof expression==='number')return expression;
    if(Object.hasOwn(expression,'field'))return response[expression.field];
    const [a,b]=expression.args.map(calculate);
    if(expression.op==='add')return a+b;
    if(expression.op==='subtract')return a-b;
    if(expression.op==='multiply')return a*b;
    return b===0?NaN:a/b;
  }
  const criteria=[];
  for(const rule of evaluation.rules){
    const left=calculate(rule.left),right=calculate(rule.right);
    if(!Number.isFinite(left)||!Number.isFinite(right))return {status:'invalid',message:'条件计算未得到有限数值，未完成核对。'};
    const met=rule.relation==='eq'?Math.abs(left-right)<=(rule.tolerance??0):rule.relation==='lt'?left<right:rule.relation==='lte'?left<=right:rule.relation==='gt'?left>right:left>=right;
    criteria.push({id:rule.id,label:rule.label,met,left,right});
  }
  return {status:'checked',outcome:criteria.every(item=>item.met)?'met':'not_met',criteria};
}

export function appendEvidence(tasks,records,payload,timestamp=new Date().toISOString()) {
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  if(!object(payload)||Object.keys(payload).some(key=>!['taskId','response','assistance'].includes(key)))return {ok:false,error:'记录请求包含未支持的字段。'};
  const task=tasks.find(item=>item.id===payload.taskId);
  if(!task)return {ok:false,error:'没有对应的学习记录任务。'};
  if(records.length>=100)return {ok:false,error:'本页已保存100条记录；请先保存本次记录。已有记录未删除。'};
  let nodes=0;
  function data(value,depth=0){
    if(++nodes>500||depth>6)return false;
    if(value===null||typeof value==='boolean')return true;
    if(typeof value==='number')return Number.isFinite(value);
    if(typeof value==='string')return value.length<=8000;
    if(Array.isArray(value))return value.length<=100&&value.every(item=>data(item,depth+1));
    return object(value)&&Object.keys(value).length<=50&&Object.entries(value).every(([key,item])=>key.length<=100&&!['__proto__','constructor','prototype'].includes(key)&&data(item,depth+1));
  }
  if(!object(payload.response)||!Object.keys(payload.response).length||!data(payload.response)||JSON.stringify(payload.response).length>16000)return {ok:false,error:'作品或理由须为大小有限的结构化记录，未保存此次请求。'};
  const assistance=payload.assistance;
  if(assistance!==undefined&&(!object(assistance)||Object.keys(assistance).some(key=>!['hintIds','explanationViewed'].includes(key))||!Array.isArray(assistance.hintIds)||assistance.hintIds.length>20||!assistance.hintIds.every(value=>typeof value==='string'&&value.trim()&&value.length<=100)||typeof assistance.explanationViewed!=='boolean'))return {ok:false,error:'帮助记录格式无效。'};
  const record={sequence:records.length+1,taskId:task.id,title:task.title,kind:task.kind,attempt:records.filter(item=>item.taskId===task.id).length+1,timestamp,response:JSON.parse(JSON.stringify(payload.response)),assistance:assistance===undefined?null:JSON.parse(JSON.stringify(assistance)),result:evaluateEvidence(task,payload.response)};
  records.push(record);
  return {ok:true,localOnly:true,record};
}
