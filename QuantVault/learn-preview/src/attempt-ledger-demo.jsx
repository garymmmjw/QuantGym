import React,{useMemo,useState} from 'react';
import {CAPTURED_AT,ELO_COOLDOWN_MS} from './scoring/scoring-model.mjs';
import {simulateRecordedAnswer} from './scoring/answer-engine.mjs';
import './attempt-ledger-demo.css';

// Controlled fixture only. No captured account state or source-site writes.
function timeline(){
 const problemsIndex=Array.from({length:5},(_,i)=>({id:9001+i,di:9001+i,c:'probability',d:'medium',tg:[],co:[],t:`合成例题 ${i+1}`}));
 const difficultyV1={b:Object.fromEntries(problemsIndex.map(p=>[p.di,-.1]))};
 const difficultyV2={b:{...difficultyV1.b},c:{},_meta:{hintCredit:.6}};
 let input={prefs:{role:'qt',calibration:[]},problemsIndex,progress:{},attempts:{},solvedHistory:{}};
 for(const p of problemsIndex.slice(0,4)){
  input.progress[p.id]='solved';
  input.attempts[p.id]={x:1,at:CAPTURED_AT-86400000};
 }
 return [{label:'第 0 天：首次答错',day:0,x:0},{label:'第 1 天：重试答对',day:1,x:1},{label:'第 30 天：再次答对',day:30,x:1}].map(action=>{
  const result=simulateRecordedAnswer({input,problemId:9005,x:action.x,now:CAPTURED_AT+action.day*86400000,difficultyV1,difficultyV2});
  input=result.updatedInput;
  return{...action,result,topic:result.after.v2.topics.find(t=>t.topic==='probability')};
 });
}
const outcome={recorded:'首次记录',frozen:'记录冻结','re-evaluated':'替换旧记录'};
export function AttemptLedgerDemo(){
 const steps=useMemo(timeline,[]),[selected,setSelected]=useState(0),current=steps[selected];
 const {result,topic}=current;
 const prior=result.before.v2.topics.find(t=>t.topic==='probability');
 return <section className="answer-lab-section attempt-ledger" aria-labelledby="ledger-title">
  <h3 id="ledger-title">同一题重试：显示已完成，为什么能力分还没变？</h3>
  <p>这个独立示例从 4 道已答对的合成概率题开始，再对第 5 题依次答错、重试和到期重答。全部使用 v2、b = −0.1、c = 0，不使用提示。点击三个时点查看记录。</p>
  <div className="attempt-ledger-steps" role="group" aria-label="30天记录示例">
   {steps.map((step,i)=><button key={step.day} aria-pressed={selected===i} onClick={()=>setSelected(i)}>{step.label}<small>{outcome[step.result.outcome]}</small></button>)}
  </div>
  <div className="attempt-ledger-summary" aria-live="polite" data-testid="ledger-current">
   <div><span>本次记录处理</span><strong>{outcome[result.outcome]}</strong></div>
   <div><span>正式记录 attempts.x</span><strong>{result.attemptAfter.x} · {result.attemptAfter.x?'答对':'答错'}</strong></div>
   <div><span>页面完成状态 progress</span><strong>{result.progressAfter==='solved'?'已完成 solved':'已尝试 attempted'}</strong></div>
   <div><span>概率主题评级</span><strong>{prior.rating} → {topic.rating}</strong><small>θ：{prior.theta.toFixed(4)} → {topic.theta.toFixed(4)}</small></div>
   <div><span>有效证据 nObs</span><strong>{prior.evidence} → {topic.evidence}</strong></div>
   <div><span>主题掌握度</span><strong>{(topic.mastery*100).toFixed(2)}%</strong></div>
  </div>
  <p className="attempt-ledger-reading" data-testid="ledger-explanation">{selected===0?'首次答错保存 x=0，降低主题能力，并增加一份有效证据。':selected===1?'次日答对会把显示状态升级为 solved，但30天冻结期内仍保留首次的 x=0。能力与证据量不变，不能用重复重试累计能力分。':'满30天后把该题旧记录 x=0 替换成 x=1，再从全部记录重算能力。该题仍只有一份证据，所以 nObs 不再增加。'}</p>
  <p className="answer-lab-small">此处模拟 {ELO_COOLDOWN_MS/86400000} 天的能力记录门槛，假定显示状态保存成功；账户保存还有独立的 3 秒频率限制。XP 与 Learn 进度不在本例中结算。冻结只限制该题正式记录，其他进度或偏好变化仍可能改变准备度。</p>
 </section>;
}
