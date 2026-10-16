import React, {useEffect, useState} from 'react';
import {TOPICS} from './scoring/scoring-model.mjs';
import {trainingTopicName} from './training-labels.mjs';
import './training-explanations.css';

const difficulties = {easy:'基础 · b = −0.5',medium:'进阶 · b = −0.1',hard:'挑战 · b = 0.5'};
const draftOf = entries => entries.map(entry => ({...entry,x:String(entry.x)}));

export function TrainingCalibration({profile,onUpdatePreferences,disabled=false,mode='personal'}) {
  const saved = JSON.stringify(profile.prefs.calibration);
  const [rows,setRows] = useState(()=>draftOf(profile.prefs.calibration));
  const [open,setOpen] = useState(false),[busy,setBusy] = useState(false),[error,setError] = useState(''),[notice,setNotice] = useState('');
  useEffect(()=>{setRows(draftOf(JSON.parse(saved)));setError('');},[saved,profile.id,mode]);
  const blocked = disabled || busy;
  function edit(index,patch) {setRows(current=>current.map((entry,i)=>i===index?{...entry,...patch}:entry));setNotice('');}
  async function save(event) {
    event.preventDefault();if(blocked)return;
    setError('');setNotice('');
    try {
      const calibration=rows.map((entry,index)=>{
        const x=Number(entry.x);
        if(entry.x.trim()===''||!Number.isFinite(x)||x<0||x>1)throw Error(`第 ${index+1} 条结果须填写 0 到 1 的实际得分。`);
        return {...entry,x};
      });
      setBusy(true);
      await onUpdatePreferences({calibration});
      setNotice(calibration.length?`已保存 ${calibration.length} 条独立初测结果，主题能力与准备度已重算；未增加练习次数或 XP。`:'已清除初测结果并重新计算，普通练习与 XP 保留。');
    } catch(reason) {setError(reason.message||'初测结果未保存，请重试。');}
    finally {setBusy(false);}
  }
  return <section className="training-calibration training-section" id="training-calibration">
    <div className="training-section-title"><div><span className="training-eyebrow">INITIAL ASSESSMENT</span><h2>独立初测结果</h2></div><button className="training-button" onClick={()=>setOpen(!open)} aria-expanded={open}>{open?'收起初测':profile.prefs.calibration.length?'管理初测':'录入初测结果'}</button></div>
    <p className="training-section-intro"><span className="training-source-tag">原站计算</span> 已保存 {profile.prefs.calibration.length} 条初测，每条作为能力证据，并参与准备度的初测基线。<span className="training-source-tag training-source-tag--local">本地入口</span> 在这里人工录入独立测评的真实结果；原站初测题目与自动判分尚未取得。</p>
    {open&&<form onSubmit={save}>
      <p className="training-calibration-note">只录入另一次无提示初测的结果，不要把下方已经记录的普通练习再录一遍。答错填 0，完整答对填 1，部分正确填实际比例。系统不会核验答案，也不会自动生成初测结果。</p>
      <div className="training-calibration-rows">{rows.map((entry,index)=><fieldset className="training-calibration-row" key={index} disabled={blocked}>
        <legend>初测 {index+1}</legend>
        <label>主题<select aria-label={`初测 ${index+1} 主题`} value={entry.topic} onChange={event=>edit(index,{topic:event.target.value})}>{TOPICS.map(topic=><option key={topic} value={topic}>{trainingTopicName(topic)}</option>)}</select></label>
        <label>题目难度<select aria-label={`初测 ${index+1} 难度`} value={entry.diff||''} disabled={Object.hasOwn(entry,'b')} onChange={event=>edit(index,{diff:event.target.value})}>{!entry.diff&&<option value="">{Object.hasOwn(entry,'b')?'使用导入参数':'未指定 · b = 0'}</option>}{Object.entries(difficulties).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label>实际得分 · 0–1<input aria-label={`初测 ${index+1} 得分`} required type="number" min="0" max="1" step="any" value={entry.x} placeholder="待填写" onChange={event=>edit(index,{x:event.target.value})}/></label>
        <button className="training-text-button" type="button" aria-label={`删除初测 ${index+1}`} onClick={()=>{setRows(current=>current.filter((_,i)=>i!==index));setNotice('');}}>删除</button>
        {(Object.hasOwn(entry,'b')||Object.hasOwn(entry,'c'))&&<p className="training-calibration-parameters">保留导入参数：{Object.hasOwn(entry,'b')?`b = ${entry.b}`:entry.diff?'b 按难度标签':'b = 0（未指定）'}，c = {entry.c||0}。{Object.hasOwn(entry,'b')&&<button type="button" className="training-text-button" onClick={()=>setRows(current=>current.map((item,i)=>{if(i!==index)return item;const next={...item,diff:item.diff||'medium'};delete next.b;return next;}))}>改用难度标签</button>}</p>}
      </fieldset>)}</div>
      {!rows.length&&<p className="training-empty">暂无待保存的初测结果。普通练习仍可正常建立能力评估。</p>}
      <button type="button" className="training-text-button" disabled={blocked||rows.length>=1000} onClick={()=>{setRows(current=>[...current,{topic:'probability',diff:'medium',x:''}]);setNotice('');}}>＋ 添加初测结果</button>
      <div className="training-form-footer"><p>保存会替换整批初测，再按“起点自评 → 初测 → 题库记录”重建能力。重复保存不会叠加证据；不发 XP、不改变题目完成率。删除所有行并保存可清除初测。</p><button type="submit" className="training-button training-button--primary" disabled={blocked}>{busy?'保存中…':rows.length?'保存这批初测':'保存空初测'}</button></div>
    </form>}
    {error&&<p role="alert" className="training-notice training-notice--error">{error}</p>}
    {notice&&<p role="status" className="training-notice">{notice}</p>}
  </section>;
}
