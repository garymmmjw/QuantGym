import React,{useEffect,useMemo,useRef,useState} from 'react';
import {TrainingDashboard} from './training-dashboard.jsx';
import {localProblems} from './local-runtime.js';
import {readLocalJSON} from './local-json.js';
import {createTrainingProfile,updateTrainingPreferences,submitTrainingAttempt,buildTrainingReport} from './scoring/training-system.mjs';
import {trainingKey,recoveryKey,rawRecoveryKey,LEARN_KEY,readTrainingProfile,saveTrainingProfile,readLearnProgress,createBackup,validateBackup,applyBackup} from './training-store.mjs';
import './training-workspace.css';

const mode = new URLSearchParams(location.search).get('profile') === 'demo' ? 'demo' : 'personal';
const suffix = mode === 'demo' ? '&profile=demo' : '';
const dashboardUrl = '?view=training'+suffix;
const difficulty = {easy:'基础',medium:'进阶',hard:'挑战'};
function downloadJson(value, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function demoProfile(sources) {
  const start = Date.now()-4*86400000;
  let p=createTrainingProfile({now:start,id:'demo-'+crypto.randomUUID()});
  p=updateTrainingPreferences(p,{role:'qr',targets:['probability','statistics']},{now:start});
  let n=0;
  for(const topic of ['probability','expectation','statistics','coding']) {
    const questions=sources.problemsIndex.filter(p=>p.c===topic&&sources.downloadedProblemIds.includes(p.id)).slice(0,4);
    for(const q of questions) {
      n++;
      p=submitTrainingAttempt(p,{problemId:q.id,x:n%4===0?0:1,h:n%5===0,eventId:'demo-event-'+n,now:start+n*10000},sources).profile;
    }
  }
  return p;
}

export function TrainingWorkspace({library,problemDisplayId=null,fromPractice=null}) {
  const [sources,setSources]=useState(null),[profile,setProfile]=useState(null),[learn,setLearn]=useState({xp:0,completed:[]}),[error,setError]=useState(''),[message,setMessage]=useState(''),[hasRecovery,setHasRecovery]=useState(false),[recoveryText,setRecoveryText]=useState(''),[recoveryConfirmed,setRecoveryConfirmed]=useState(false),[recovering,setRecovering]=useState(false);
  const profileRef=useRef(null),busy=useRef(false);
  const lessonIds=useMemo(()=>library?.lessons.map(l=>l.id)||[],[library]);
  function accept(p) { profileRef.current=p;setProfile(p); }
  function refreshLearn() { setLearn(mode==='demo'?{xp:0,completed:[]}:readLearnProgress(localStorage,lessonIds)); }
  useEffect(()=>{
    if(!library)return;
    let live=true;
    Promise.all([readLocalJSON('./private/scoring/modules.json'),readLocalJSON('./private/scoring/problems-index.json'),readLocalJSON('./private/scoring/item-difficulty.json',{fallback:null}),readLocalJSON('./private/scoring/item-difficulty-v2.json',{fallback:null}),localProblems()]).then(([modules,problemsIndex,difficultyV1,difficultyV2,records])=>{
      if(!live)return;
      const source={modules,problemsIndex,difficultyV1,difficultyV2,records,downloadedProblemIds:records.map(p=>p.raw_id)};
      setSources(source);
      let stored=localStorage.getItem(trainingKey(mode));
      const initial=stored===null?(mode==='demo'?demoProfile(source):createTrainingProfile({id:mode+'-'+crypto.randomUUID()})):null;
      const p=readTrainingProfile(localStorage,mode,source,initial);
      refreshLearn();
      if(stored===null)saveTrainingProfile(localStorage,mode,p,source);
      accept(p);setHasRecovery(localStorage.getItem(recoveryKey(mode))!==null);
    }).catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[library]);
  useEffect(()=>{
    if(!sources)return;
    const sync=()=>{try {accept(readTrainingProfile(localStorage,mode,sources,profileRef.current));refreshLearn();setHasRecovery(localStorage.getItem(recoveryKey(mode))!==null);}catch(e){setError('读取已保存记录失败：'+e.message);}};
    window.addEventListener('storage',sync);window.addEventListener('user-data-changed',sync);
    return()=>{window.removeEventListener('storage',sync);window.removeEventListener('user-data-changed',sync);};
  },[sources,lessonIds]);
  const computed=useMemo(()=>{
    if(!sources||!profile)return{};
    try{return{report:buildTrainingReport(profile,{...sources,learnXp:learn.xp,learnCompleted:learn.completed.length})};}
    catch(e){return{reportError:e.message};}
  },[sources,profile,learn]);
  async function mutate(operation) {
    if(busy.current)throw Error('上一条记录正在保存，请稍候。');
    busy.current=true;setError('');setMessage('');
    const execute=()=>{
      const current=readTrainingProfile(localStorage,mode,sources,profileRef.current);
      // Reject broken dependent data before making any changes.
      if(mode!=='demo')readLearnProgress(localStorage,lessonIds);
      const result=operation(current);
      const next=result.profile||result;
      // Operations that replace both stores have already persisted atomically.
      if(!result.persisted)saveTrainingProfile(localStorage,mode,next,sources);
      accept(next);
      try {refreshLearn();setHasRecovery(localStorage.getItem(recoveryKey(mode))!==null);}
      catch(e) {setError('训练记录已保存，但课程或恢复记录读取失败：'+e.message);}
      window.dispatchEvent(new Event('user-data-changed'));
      return result.result||result;
    };
    try {return navigator.locks?await navigator.locks.request('qvl-training-'+mode,execute):execute();}
    catch(e){setError('操作未完成：'+e.message);throw e;}
    finally{busy.current=false;}
  }
  const submit=input=>mutate(current=>submitTrainingAttempt(current,{...input,now:Math.max(input.now||Date.now(),current.updatedAt)},sources));
  const preferences=patch=>mutate(current=>updateTrainingPreferences(current,patch,{now:Math.max(Date.now(),current.updatedAt)}));
  const exportBackup=()=>{
    const current=readTrainingProfile(localStorage,mode,sources,profileRef.current);
    const data=createBackup(current,mode==='demo'?null:readLearnProgress(localStorage,lessonIds));
    downloadJson(data,`training-${mode}-${new Date().toISOString().slice(0,10)}.json`);
  };
  const importBackup=text=>mutate(current=>({profile:applyBackup(localStorage,mode,validateBackup(text,sources,lessonIds),sources,lessonIds,current),persisted:true}));
  const reset=async()=>{const result=await mutate(current=>({profile:applyBackup(localStorage,mode,createBackup(createTrainingProfile({id:mode+'-'+crypto.randomUUID()})),sources,lessonIds,current),persisted:true}));setMessage('训练档案已重置，课程进度保留；可恢复上一个状态。');return result;};
  async function restore() {
    try {
      await importBackup(localStorage.getItem(recoveryKey(mode))||'');
      setMessage('已恢复上一个状态。恢复前的状态也保留在恢复备份中。');
    }catch {/* Error is displayed by mutate. */}
  }
  async function repairStore() {
    if(!sources||recovering)return;setRecovering(true);
    try {
      const backup=validateBackup(recoveryText,sources,lessonIds);
      const replace=()=>applyBackup(localStorage,mode,backup,sources,lessonIds);
      const restored=navigator.locks?await navigator.locks.request('qvl-training-'+mode,replace):replace();
      refreshLearn();accept(restored);setError('');setMessage('备份已恢复，替换前的原始数据已另行保存。');
      setHasRecovery(localStorage.getItem(recoveryKey(mode))!==null);
    }catch(e){setError(e.message);}finally{setRecovering(false);}
  }
  if(!computed.report)return <section className="local-empty training-dashboard"><h1>本地训练系统</h1><p role={error||computed.reportError?'alert':'status'}>{error||computed.reportError||'正在加载题库与训练档案…'}</p>{(error||computed.reportError)&&<><p>保存失败或格式不兼容时，系统会保留原始记录。</p><button className="training-button" onClick={()=>downloadJson({training:localStorage.getItem(trainingKey(mode)),learn:mode==='demo'?null:localStorage.getItem(LEARN_KEY),recovery:localStorage.getItem(recoveryKey(mode)),rawRecovery:localStorage.getItem(rawRecoveryKey(mode))},'training-original-records.json')}>导出原始记录</button><a href="?">返回 Learn</a>{sources&&<section className="training-backup"><h2>从完整备份恢复</h2><p>恢复前会额外保存当前原始数据。课程记录损坏时，请使用包含课程进度的完整备份。</p><label>备份 JSON<textarea rows="6" value={recoveryText} onChange={e=>{setRecoveryText(e.target.value);setRecoveryConfirmed(false);}}/></label><label className="training-checkbox"><input type="checkbox" checked={recoveryConfirmed} onChange={e=>setRecoveryConfirmed(e.target.checked)}/>确认以备份中的记录恢复当前档案</label><button className="training-button" disabled={!recoveryConfirmed||recovering||!recoveryText.trim()} onClick={repairStore}>{recovering?'验证并恢复中…':'验证并恢复档案'}</button></section>}</>}</section>;
  return <>
    {hasRecovery&&<aside className="training-recovery"><span>上一次导入或重置前的状态可恢复。</span><button className="training-text-button" onClick={restore}>恢复上一个状态</button></aside>}
    {localStorage.getItem(rawRecoveryKey(mode))&&<aside className="training-recovery"><span>已保留修复前的原始记录。</span><button className="training-text-button" onClick={()=>downloadJson(JSON.parse(localStorage.getItem(rawRecoveryKey(mode))),'training-raw-recovery.json')}>导出原始恢复包</button></aside>}
    {message&&<p className="training-notice" role="status">{message}</p>}
    {problemDisplayId!==null?<TrainingProblem key={problemDisplayId} displayId={problemDisplayId} fromPractice={fromPractice} sources={sources} profile={profile} report={computed.report} onSubmit={submit} error={error}/>:<TrainingDashboard key={profile.id} profile={profile} report={computed.report} sources={sources} storageError={error} mode={mode} onUpdatePreferences={preferences} onSubmitAttempt={submit} onExport={exportBackup} onImport={importBackup} onReset={reset} onLoadDemo={()=>location.assign('?view=training&profile=demo')} onReturnPersonal={()=>location.assign('?view=training')}/>}
  </>;
}

function Markdown({text}) {
  const ref=useRef(null);
  const html=useMemo(()=>window.MarkdownRender.render(text||''),[text]);
  // React may replace an HTML subtree on a parent update; re-typeset after each
  // commit so recording an answer never turns equations back into raw TeX.
  useEffect(()=>{if(ref.current)window.KatexRender.render(ref.current);});
  return <div className="sv__md" ref={ref} dangerouslySetInnerHTML={{__html:html}}/>;
}
function TrainingProblem({displayId,fromPractice,sources,profile,report,onSubmit,error}) {
  const problem=sources.records.find(p=>String(p.id)===String(displayId));
  const meta=problem&&sources.problemsIndex.find(p=>String(p.id)===String(problem.raw_id));
  const [hintSeen,setHintSeen]=useState(false),[hint,setHint]=useState(false),[partial,setPartial]=useState(false),[pc,setPc]=useState('0.5'),[saving,setSaving]=useState(false),[result,setResult]=useState(null),[localError,setLocalError]=useState('');
  if(!problem)return <section className="local-empty"><h1>这道题还没有下载到本地</h1><p>目前可直接练习 {sources.records.length} 道题。</p><a href={dashboardUrl}>返回训练中心并选择题目 →</a></section>;
  const status=profile.progress[String(meta?.id)],current=report.bar.topics.find(t=>t.topic===meta?.c),usesV2=report.modelInfo.effectiveModel==='v2';
  const hintCredit=typeof sources.difficultyV2?._meta?.hintCredit==='number'?sources.difficultyV2._meta.hintCredit:0.6;
  async function record(x,reveal=false) {
    if(!meta||saving)return;
    setSaving(true);setLocalError('');setResult(null);
    try {
      const partialValue=Number(pc);
      if(partial&&!reveal&&(pc.trim()===''||!Number.isFinite(partialValue)||partialValue<0||partialValue>1))throw Error('部分得分须为 0 到 1 之间的数字。');
      const r=await onSubmit({problemId:meta.id,x:reveal?0:partial?(partialValue===1?1:0):x,h:hint||hintSeen,reveal,...(partial&&!reveal?{pc:partialValue}:{}),eventId:crypto.randomUUID(),now:Date.now()});
      setResult(r);
    }catch(e){setLocalError(e.message);}finally{setSaving(false);}
  }
  return <article className="local-problem training-problem" lang="zh-CN">
    <div className="training-problem-nav"><a href={fromPractice?'?practice='+encodeURIComponent(fromPractice):dashboardUrl}>← {fromPractice?'课程练习列表':'训练中心'}</a><a href={dashboardUrl}>查看掌握度与准备度 →</a></div>
    {mode==='demo'&&<p className="training-demo-banner">独立示例档案 · 本页作答只影响示例分数。</p>}
    {!usesV2&&<p className="training-notice">当前缺少 v2 参数，能力计算回退到 v1；提示与部分分不参与能力更新。完整答对仍按一次性 XP 规则记录。</p>}
    <p className="local-kicker">#{problem.id} · {problem.topic} · {difficulty[meta?.d]||'难度未知'} · {(problem.companies||[]).join(' / ')}</p>
    <h1>{problem.title}</h1>
    <div className="training-question-meta"><span>{status==='solved'?'✓ 已完成':status==='attempted'?'已尝试':'尚未练习'}</span><span>首次完整答对：{({easy:10,medium:25,hard:50})[meta?.d]||0} XP</span><span>当前主题：{current?.assessed?`${Math.round(current.mastery*100)}% 掌握度`:'未评估'}</span></div>
    <Markdown text={problem.prompt}/>
    {(problem.hints||[]).map((h,i)=><details key={i} onToggle={e=>{if(e.currentTarget.open){setHintSeen(true);setHint(true);}}}><summary>提示 {i+1}</summary><Markdown text={typeof h==='string'?h:h.text||JSON.stringify(h)}/></details>)}
    <details><summary>查看完整解答 · 阅读本身不计分</summary><Markdown text={problem.solution}/></details>
    <section className="training-question-record training-dashboard">
      <span className="training-eyebrow">SELF ASSESSMENT</span><h2>记录这次作答</h2><p>先独立作答，再对照解答自评。开放题与代码题在这里都采用人工记录。</p>
      <label className="training-checkbox"><input type="checkbox" checked={hint||hintSeen} disabled={hintSeen} onChange={e=>setHint(e.target.checked)}/>{hintSeen?`已打开提示${usesV2?'，本次记录会计入提示折扣':'，已标记提示使用'}`:'我使用了提示'}</label>
      <div className="training-partial"><label className="training-checkbox"><input type="checkbox" checked={partial} onChange={e=>setPartial(e.target.checked)}/>按得分点记录部分分</label><input type="number" aria-label="本题部分得分" min="0" max="1" step="0.01" value={pc} disabled={!partial} onChange={e=>setPc(e.target.value)}/></div>
      <div className="training-question-buttons">{partial?<button className="training-button training-button--primary" disabled={saving||!meta} onClick={()=>record(0)}>保存部分得分</button>:<><button className="training-button training-button--primary" disabled={saving||!meta} onClick={()=>record(1)}>完整答对</button><button className="training-button" disabled={saving||!meta} onClick={()=>record(0)}>答错了</button></>}<button className="training-text-button" disabled={saving||!meta} onClick={()=>record(0,true)}>未解出，记录本次复盘</button></div>
      <p className="training-footnote">{usesV2?`使用提示会把正向作答分乘以 ${hintCredit}；`:''}难题答对通常带来更大的能力提升。XP 按难度一次性发放，提示不扣 XP。每题能力记录冷却 30 天，冷却期间仍可补记完成，但不能重复增加能力证据。</p>
      {saving&&<p role="status">正在保存…</p>}{(error||localError)&&<p className="training-notice training-notice--error" role="alert">{localError||error}</p>}
      {result&&<div className="training-notice" role="status"><b>已保存 · 本次 +{result.deltaXp} XP</b><p>{result.abilityFrozen?'本题仍在 30 天冷却期，能力记录保持原样。':'本次结果已计入主题能力。'} {result.progressAfter==='solved'?'题目已完成。':'题目已记为尝试。'}</p><p>练习总 XP {report.problemXp} · 总等级 Lv.{report.level.level} · <a href={dashboardUrl}>查看完整训练档案 →</a></p></div>}
    </section>
  </article>;
}
