import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { STATUS_META, getCurrentStatus, getSummary, filterApplications, sortApplications, localToday } from './dataModel.js';
import DetailDrawer from './DetailDrawer.jsx';
import ProgressDialog from './ProgressDialog.jsx';
import StagePanel from '../careerStages/StagePanel.jsx';
import { useCareerStages } from '../careerStages/useCareerStages.js';
import { getCurrentStage } from '../careerStages/stageStore.js';
import { summarizeStagePractice } from '../careerStages/stagePractice.js';
import { useStagePractice } from '../careerStages/useStagePractice.js';
import { useAuthStore, useUserStateStore } from '../../stores/AppServicesContext.jsx';
import { createTrackerStore, importTrackerPayload } from './trackerStore.js';
import Icon from './TrackerIcon.jsx';
import './style.css';

function EventPill({ event }) {
  if (!event) return <span className="qt-empty-step" aria-label="暂无进展">—</span>;
  const meta = STATUS_META[event.type] || { label: event.type, tone: 'neutral' };
  const shortDate = /^\d{4}-\d{2}-\d{2}$/.test(event.date || '') ? event.date.slice(5).replace('-', '/') : event.date;
  return <span className="qt-event-with-deadline"><span className={`qt-event-pill qt-${meta.tone}`} title={event.date}><span className="qt-event-label">{meta.label}</span><span className="qt-event-date">{shortDate || '日期未填'}</span></span>{event.dueDate && <span className="qt-event-deadline" title={`截止日期 ${event.dueDate}`}>截止 {event.dueDate.slice(5).replace('-', '/')}</span>}</span>;
}
function NewApplication({ phases, currentPhaseId, onClose, onCreate }) {
  const ref = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const previousFocus = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current.showModal();
    return () => {
      document.body.style.overflow = oldOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  return <dialog className="qt-new-dialog" aria-labelledby="new-title" ref={ref} onCancel={onClose} onClick={e => { if (e.target !== e.currentTarget) return; const bounds=e.currentTarget.getBoundingClientRect(); if(e.clientX<bounds.left || e.clientX>bounds.right || e.clientY<bounds.top || e.clientY>bounds.bottom) onClose(); }}>
    <div className="qt-new-head"><div><span className="qt-eyebrow">NEW APPLICATION</span><h2 id="new-title">添加一份申请</h2></div><button className="qt-icon-btn" onClick={onClose} aria-label="关闭添加申请"><Icon name="X" /></button></div>
    <form onSubmit={e => {
      e.preventDefault(); const d = new FormData(e.currentTarget);
      const company = d.get('company').trim(); const role = d.get('role').trim();
      if (!company || !role) return;
      const saved = onCreate({id:crypto.randomUUID(),company,role,prepPhase:d.get('prepPhase'),season:'',events:[{id:crypto.randomUUID(),type:'submitted',date:d.get('date'),year:Number(String(d.get('date')).slice(0,4)),dueDate:''}]});
      if (!saved) setError('保存失败，请检查浏览器存储空间后重试。');
    }}>
      <label>公司<input name="company" required autoFocus placeholder="例如 Citadel" maxLength={120} /></label>
      <label>岗位<input name="role" required placeholder="例如 Quantitative Research Intern" maxLength={400} /></label>
      <div className="qt-form-columns"><label>投递日期<input name="date" required type="date" defaultValue={localToday()} /></label><label>投递时的准备阶段<select name="prepPhase" defaultValue={currentPhaseId || ''}><option value="">未分组</option>{phases.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label></div>
      {error && <p className="qt-tracker-error" role="alert">{error}</p>}
      <div className="qt-dialog-actions"><button type="button" className="qt-btn" onClick={onClose}>取消</button><button type="submit" className="qt-btn qt-primary">添加申请</button></div>
    </form>
  </dialog>;
}
function AccountTracker({ ownerId, namespace, legacyState }) {
  const trackerStore = useMemo(() => {
    let storage;
    try { storage = window.localStorage; } catch { storage = null; }
    return createTrackerStore({ownerId, namespace, storage, eventTarget: window});
  }, [ownerId, namespace]);
  const { applications, error: saveError } = useSyncExternalStore(trackerStore.subscribe, trackerStore.getSnapshot, trackerStore.getSnapshot);
  useEffect(() => () => trackerStore.dispose(), [trackerStore]);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [order, setOrder] = useState('recent');
  const [collapsed, setCollapsed] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [progressId, setProgressId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addStageRequest, setAddStageRequest] = useState(0);
  const { store: stageStore, snapshot: stageSnapshot } = useCareerStages({ownerId, namespace});
  const practice = useStagePractice({ownerId, namespace, legacyState});
  const stageDefinitions = useMemo(() => summarizeStagePractice(stageSnapshot.stages, practice), [stageSnapshot.stages, practice]);
  const resolvedApplications = useMemo(() => applications.map(application => {
    const stage = stageDefinitions.find(item => item.id === application.prepPhase || item.importedIds?.includes(application.prepPhase));
    return stage && stage.id !== application.prepPhase ? {...application,prepPhase:stage.id} : application;
  }), [applications, stageDefinitions]);
  const currentStage = getCurrentStage(stageDefinitions);
  const [toast, setToast] = useState('');
  const [view, setView] = useState('table');
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); } }, [toast]);
  const summary = getSummary(applications);
  const filtered = useMemo(() => {
    const rows = filterApplications(resolvedApplications, { query, status, phase:'all' });
    return sortApplications(rows, order);
  }, [resolvedApplications, query, status, order]);
  const activeApplication = resolvedApplications.find(a => a.id === selectedId) || null;
  const progressApplication = resolvedApplications.find(a => a.id === progressId) || null;
  const ungrouped = resolvedApplications.some(application => !stageDefinitions.some(stage => stage.id === application.prepPhase));
  const phases = ungrouped ? [...stageDefinitions, {id:'unassigned',label:'未分组',description:''}] : stageDefinitions;
  const update = next => {
    try { trackerStore.updateApplication(next); setToast('已保存这份申请'); return true; }
    catch { return false; }
  };
  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportError(''); setImporting(true);
    try {
      if (file.size > 10000000) throw new Error('请选择小于 10 MB 的记录文件。');
      const payload = JSON.parse(await file.text());
      const count = importTrackerPayload({payload, trackerStore, stageStore});
      setToast(`已导入 ${count} 份申请，已有记录已保留`);
    } catch (error) { setImportError(error.message || '文件无法导入，请检查文件内容。'); }
    finally { setImporting(false); }
  }
  const statusFilters = [['all','全部',summary.total],['awaiting','等待回复',summary.awaiting],['oa','OA',summary.oa],['interview','面试',summary.interview],['offer','Offer',summary.offer],['closed','已结束',summary.closed]];
  return <div className="quantgym-tracker">
        <div className="qt-page-heading"><div><div className="qt-eyebrow">APPLICATION TRACKER </div><h1>我的投递<span className="qt-heading-dot">.</span></h1><p>从第一次投递，到下一次好消息。</p></div><div className="qt-heading-actions"><button className="qt-btn" onClick={() => setAddStageRequest(value => value+1)}><Icon name="Flag" size={16}/>添加 Stage</button><button className="qt-btn qt-primary" onClick={() => setAdding(true)}><Icon name="Plus" size={17}/>添加申请</button></div></div>
        <section className="qt-summary-strip" aria-label="申请统计">
          {[['all','申请总数',summary.total,'all'],['awaiting','等待回复',summary.awaiting,'waiting'],['oa','OA 阶段',summary.oa,'oa'],['interview-offer','面试 / Offer',summary.interview+summary.offer,'interview'],['closed','已结束',summary.closed,'closed']].map(([id,label,count,tone]) => <button key={id} className={`qt-metric qt-metric-${tone}${status===id?' qt-selected':''}`} onClick={() => setStatus(status === id ? 'all' : id)} aria-label={`${label} ${count}，筛选`}><span className="qt-metric-label"><span className="qt-metric-dot"/>{label}</span><strong>{String(count).padStart(2,'0')}</strong>{id==='all'&&<small>份申请 · 持续积累</small>}</button>)}
        </section>
        <StagePanel key={ownerId+namespace} stageStore={stageStore} practice={practice} addRequest={addStageRequest} showAddButton={false}/>
        <section className="qt-tracker-panel" aria-label="投递记录">
          <div className="qt-panel-header"><div className="qt-panel-title"><Icon name="Table2" size={19}/><h2>投递记录</h2><span>{applications.length}</span></div><div className="qt-panel-header-right"><button className="qt-import-button" disabled={importing} onClick={()=>fileRef.current?.click()}>{importing ? '正在导入…' : '导入已有记录'}</button><span className={`qt-save-state${saveError?' qt-error':''}`}><Icon name={saveError?'CircleAlert':'CheckCheck'} size={15}/>{saveError || '已保存到此浏览器'}</span><div className="qt-view-switch" aria-label="显示方式"><button aria-label="表格视图" title="表格视图" aria-pressed={view==='table'} className={view==='table'?'qt-active':''} onClick={()=>setView('table')}><Icon name="Table2" size={16}/></button><button aria-label="紧凑视图" title="紧凑视图" aria-pressed={view==='compact'} className={view==='compact'?'qt-active':''} onClick={()=>setView('compact')}><Icon name="List" size={16}/></button></div></div></div>
          {importError && <p className="qt-tracker-error" role="alert">{importError}</p>}
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={importFile} hidden aria-label="导入投递记录文件"/>
          <div className="qt-table-toolbar"><div className="qt-filter-tabs" aria-label="申请状态筛选">{statusFilters.map(([id,label,count]) => <button key={id} className={status===id?'qt-active':''} onClick={()=>setStatus(id)} aria-pressed={status===id}>{label}<span>{count}</span></button>)}</div><div className="qt-search-sort"><label className="qt-search"><Icon name="Search" size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索公司、岗位…" aria-label="搜索公司或岗位"/>{query&&<button aria-label="清除搜索" onClick={()=>setQuery('')}><Icon name="X" size={14}/></button>}</label><label className="qt-sort"><Icon name="ArrowDownWideNarrow" size={15}/><select aria-label="排序方式" value={order} onChange={e=>setOrder(e.target.value)}><option value="recent">最近投递</option><option value="original">添加顺序</option><option value="company">公司名称</option></select></label></div></div>
          <div className={`qt-table-scroll qt-${view}`} tabIndex={0} aria-label="横向滚动查看申请进展"><table><colgroup><col className="qt-col-company"/><col className="qt-col-role"/><col className="qt-col-event"/><col className="qt-col-event"/><col className="qt-col-latest"/><col className="qt-col-open"/></colgroup><thead><tr><th scope="col">公司</th><th scope="col">岗位</th><th scope="col"><span className="qt-step-number">01</span>投递</th><th scope="col"><span className="qt-step-number">02</span>后续进展</th><th scope="col"><span className="qt-step-number">03</span>最新进展</th><th scope="col"><span className="qt-sr-only">详情</span></th></tr></thead>
            {phases.map(phase => {const group=filtered.filter(a=>phase.id === 'unassigned' ? !stageDefinitions.some(stage=>stage.id === a.prepPhase) : a.prepPhase===phase.id); if(!group.length && (query || status !== 'all'))return null; return <tbody key={phase.id}><tr className="qt-phase-row"><th colSpan={6} scope="rowgroup"><button aria-expanded={!collapsed[phase.id]} onClick={()=>setCollapsed({...collapsed,[phase.id]:!collapsed[phase.id]})}><Icon name={collapsed[phase.id]?'ChevronRight':'ChevronDown'} size={16}/><span className="qt-phase-badge">{phase.label}</span><span className="qt-phase-description">{phase.description}</span><span className="qt-phase-count">{group.length} 份申请</span><span className="qt-phase-caption">{phase.recordedDate ? `${phase.recordedDate.replaceAll('-', '.')} · 阶段刷题 ${phase.questionCount ?? '—'} 题` : '投递时的准备阶段'}</span></button></th></tr>{!collapsed[phase.id] && !group.length && <tr className="qt-empty-phase-row"><td colSpan={6}>这个阶段还没有投递，添加申请时可选择此 Stage。</td></tr>}{!collapsed[phase.id]&&group.map(a => <tr className={`qt-application-row ${['rejected','withdrawn'].includes(getCurrentStatus(a))?'archived':''}`} key={a.id}><td className="qt-company-cell"><strong className="qt-company-name">{a.company.trim()}</strong></td><td className="qt-role-cell"><button className="qt-role-link" title={a.role} onClick={()=>setSelectedId(a.id)} aria-label={`查看 ${a.company.trim()} 的 ${a.role}`}><span>{a.role}</span></button></td><td><EventPill event={a.events[0]}/></td><td><EventPill event={a.events[1]}/></td><td className="qt-latest-cell"><div className="qt-latest-content">{a.events.length > 2 && <button className="qt-event-link" onClick={()=>setSelectedId(a.id)} aria-label={`查看 ${a.company.trim()} ${a.role} 的进展历史`}><EventPill event={a.events[a.events.length-1]}/>{a.events.length>3&&<small>+{a.events.length-3} 条历史</small>}</button>}<button className="qt-add-progress" onClick={()=>setProgressId(a.id)} aria-label={`更新 ${a.company.trim()} ${a.role} 的进展`}><Icon name="Plus" size={13}/><span>更新进展</span></button></div></td><td className="qt-details-cell"><button className="qt-row-open" onClick={()=>setSelectedId(a.id)} title="查看申请详情" aria-label={`查看 ${a.company.trim()} ${a.role} 的申请详情`}><Icon name="ChevronRight" size={17}/></button></td></tr>)}</tbody>;})}
          </table>{!filtered.length&&<div className="qt-empty-state"><Icon name={applications.length ? 'SearchX' : 'BriefcaseBusiness'} size={30}/><h3>{applications.length ? '这里还没有匹配的申请' : '从第一份申请开始'}</h3><p>{applications.length ? '试试其他关键词，或者切回全部状态。' : '记录公司、岗位和每一次进展，也可以导入自己的已有记录。'}</p><button className="qt-btn" onClick={()=>applications.length ? (setQuery(''),setStatus('all')) : setAdding(true)}>{applications.length ? '查看全部申请' : '添加申请'}</button></div>}</div>
          <div className="qt-table-footer"><span>显示 {filtered.length} / {applications.length} 份申请</span><span><Icon name="MousePointer2" size={13}/>点击岗位查看完整进展</span></div>
        </section>
    <DetailDrawer application={activeApplication} phases={stageDefinitions} onClose={()=>setSelectedId(null)} onUpdate={update}/>
    {progressApplication&&<ProgressDialog key={progressApplication.id} application={progressApplication} onClose={()=>setProgressId(null)} onUpdate={update}/>}
    {adding&&<NewApplication phases={stageDefinitions} currentPhaseId={currentStage?.id} onClose={()=>setAdding(false)} onCreate={a=>{try {trackerStore.addApplication(a);setAdding(false);setStatus('all');setQuery('');setToast('新申请已添加');return true;} catch {return false;}}}/>}
    {toast&&<div className="qt-toast" role="status"><Icon name="CircleCheck" size={18}/>{toast}</div>}
  </div>;
}
export function TrackerPageContent() {
  const ownerId = useAuthStore(state => state.currentUser?.id);
  const legacyState = useUserStateStore(state => state.value);
  const namespace = new URLSearchParams(globalThis.location?.search || '').has('qa') ? 'qa' : '';
  if (!ownerId) return <div className="quantgym-tracker"><div className="qt-empty-state"><h2>我的投递</h2><p>登录后即可记录你的申请和求职准备阶段。</p></div></div>;
  return <AccountTracker key={`${ownerId}:${namespace}`} ownerId={ownerId} namespace={namespace} legacyState={legacyState}/>;
}
export default TrackerPageContent;
