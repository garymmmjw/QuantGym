const status=document.getElementById('status'),rows=document.getElementById('results');
let worker;
function run(request,limit=30000){
 return new Promise(resolve=>{
  worker ||= new Worker('./runner/python-worker.mjs',{type:'module'});
  const timer=setTimeout(()=>{worker.terminate();worker=null;resolve({type:'error',error:'Timed out; worker terminated.'});},limit);
  worker.onerror=e=>{clearTimeout(timer);worker.terminate();worker=null;resolve({type:'error',error:e.message});};
  worker.onmessage=e=>{if(!['done','error'].includes(e.data.type))return;clearTimeout(timer);resolve(e.data);};
  worker.postMessage(request);
 });
}
function cell(row,value,tag='td'){const el=document.createElement(tag);el.textContent=value;row.appendChild(el);return el;}
function show(name,result){const tr=document.createElement('tr');cell(tr,name);cell(tr,result.overallPass?'PASS':'FAIL').className=result.overallPass?'pass':'fail';cell(tr,result.type==='error'?result.error:result.results.map(r=>`${r.pass?'PASS':'FAIL'} ${r.name}${r.error?' — '+r.error:''}${!r.error&&!r.pass?' — got '+JSON.stringify(r.got)+', expected '+JSON.stringify(r.expected):''}`).join('\n'));rows.appendChild(tr);}
function lock(on){document.querySelectorAll('button').forEach(b=>b.disabled=on);}
document.getElementById('run').onclick=async()=>{
 lock(true);rows.textContent='';status.textContent='Loading local source exercises…';
 try{
 const library=await fetch('./private/library.json').then(r=>r.json());
 const exercises=library.lessons.flatMap(l=>(l.data?.slides||[]).filter(s=>s.code?.solution).map(s=>({name:l.title+' · slide '+s.n,code:s.code})));
 let passed=0;
 for(let i=0;i<exercises.length;i++){const {name,code}=exercises[i];status.textContent=`Running ${i+1}/${exercises.length}: ${name}`;const result=await run({mode:'test',language:code.language||'python',code:code.solution,artifactJson:JSON.stringify(code.artifact)});if(result.overallPass)passed++;show(name,result);}
 status.textContent=`Completed: ${passed}/${exercises.length} reference solutions passed all source tests.`;
 }catch(e){status.textContent=e.message;}finally{lock(false);worker?.terminate();worker=null;}
};
document.getElementById('timeout').onclick=async()=>{
 lock(true);rows.textContent='';status.textContent='Testing 30-second timeout. This page should remain responsive.';
 const result=await run({mode:'test',language:'python',code:'def loop():\n    while True: pass',artifactJson:JSON.stringify({entry:'loop',judge:'exact',tests:[{name:'Intentional infinite loop',args:[],expected:1}]})});
 show('Timeout enforcement',{...result,overallPass:result.error?.startsWith('Timed out')});
 status.textContent='Checking recovery in a new worker…';
 const recovery=await run({mode:'test',language:'python',code:'def add(a,b):\n    return a+b',artifactJson:JSON.stringify({entry:'add',judge:'exact',tests:[{name:'Fresh worker after timeout',args:[2,3],expected:5}]})});
 show('Recovery',recovery);status.textContent=`Timeout and recovery ${result.error?.startsWith('Timed out')&&recovery.overallPass?'passed':'failed'}.`;lock(false);worker?.terminate();worker=null;
};
