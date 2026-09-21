import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { getSummary, localToday } from './dataModel.js';
import DetailDrawer from './DetailDrawer.jsx';
import ProgressDialog from './ProgressDialog.jsx';
import DeadlineDialog from './DeadlineDialog.jsx';
import EventEditDialog from './EventEditDialog.jsx';
import ApplicationList from './ApplicationList.jsx';
import StagePanel from '../careerStages/StagePanel.jsx';
import { useCareerStages } from '../careerStages/useCareerStages.js';
import { getCurrentStage } from '../careerStages/stageStore.js';
import { summarizeStagePractice } from '../careerStages/stagePractice.js';
import { useStagePractice } from '../careerStages/useStagePractice.js';
import { useOverviewActivity } from '../overview/useOverviewActivity.js';
import { useAuthStore, useUserStateStore } from '../../stores/AppServicesContext.jsx';
import Icon from './TrackerIcon.jsx';
import './style.css';
import './reviewed-ui.css';

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
  const { store: stageStore, snapshot: stageSnapshot, trackerStore, cloud, sync, syncError } = useCareerStages({ownerId, namespace});
  const { applications, error: saveError } = useSyncExternalStore(trackerStore.subscribe, trackerStore.getSnapshot, trackerStore.getSnapshot);
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [progressId, setProgressId] = useState(null);
  const [deadlineTarget, setDeadlineTarget] = useState(null);
  const [eventTarget, setEventTarget] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addStageRequest, setAddStageRequest] = useState(0);
  const practice = useStagePractice({ownerId, namespace, legacyState});
  const activity = useOverviewActivity();
  const stageDefinitions = useMemo(() => summarizeStagePractice(stageSnapshot.stages, practice), [stageSnapshot.stages, practice]);
  const resolvedApplications = useMemo(() => applications.map(application => {
    const stage = stageDefinitions.find(item => item.id === application.prepPhase || item.importedIds?.includes(application.prepPhase));
    return stage && stage.id !== application.prepPhase ? {...application,prepPhase:stage.id} : application;
  }), [applications, stageDefinitions]);
  const currentStage = getCurrentStage(stageDefinitions);
  const [toast, setToast] = useState('');
  const [deletedRecord, setDeletedRecord] = useState(null);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => {
    if (!deletedRecord) return;
    const timer = setTimeout(() => setDeletedRecord(null), 10000);
    return () => clearTimeout(timer);
  }, [deletedRecord]);
  const summary = getSummary(applications);
  const activeApplication = resolvedApplications.find(a => a.id === selectedId) || null;
  const progressApplication = resolvedApplications.find(a => a.id === progressId) || null;
  const deadlineApplication = resolvedApplications.find(a => a.id === deadlineTarget?.applicationId) || null;
  const deadlineEvent = deadlineApplication?.events.find(event => event.id === deadlineTarget?.eventId) || null;
  const editingApplication = resolvedApplications.find(a => a.id === eventTarget?.applicationId) || null;
  const editingEvent = editingApplication?.events.find(event => event.id === eventTarget?.eventId) || null;
  const editEvent = (application, event) => setEventTarget({applicationId:application.id, eventId:event.id});
  const saveEvent = changes => {
    if (!eventTarget) return false;
    try {
      trackerStore.updateEvent(eventTarget.applicationId, eventTarget.eventId, changes);
      setToast('记录已修改');
      return true;
    } catch { return false; }
  };
  const deleteEvent = () => {
    if (!eventTarget) return false;
    const token = trackerStore.deleteEvent(eventTarget.applicationId, eventTarget.eventId);
    setToast('');
    setDeletedRecord({ token, error: '' });
    return true;
  };
  const undoDelete = () => {
    if (!deletedRecord) return;
    try {
      trackerStore.restoreEvent(deletedRecord.token);
      setDeletedRecord(null);
      setToast('记录已恢复');
      (document.querySelector('.quantgym-tracker .qt-td-drawer')
        || document.querySelector('.quantgym-tracker .qt-filter-tabs button.qt-active')
        || document.querySelector('.quantgym-tracker .qt-metric.qt-selected'))?.focus();
    } catch (error) {
      setDeletedRecord(current => ({ ...current, error: error.message || '恢复失败，请重试。' }));
    }
  };
  const editDeadline = (application, event) => setDeadlineTarget({applicationId:application.id, eventId:event.id});
  const saveDeadline = values => {
    if (!deadlineTarget) return false;
    try {
      trackerStore.updateEventDeadline(deadlineTarget.applicationId, deadlineTarget.eventId, values);
      setToast('截止时间已保存');
      return true;
    } catch { return false; }
  };
  const update = next => {
    try { trackerStore.updateApplication(next); setToast('已保存这份申请'); return true; }
    catch { return false; }
  };
  const deletionNotice = deletedRecord && <div className={`${activeApplication ? 'qt-td-deletion-notice' : 'qt-toast'} qt-delete-notice`} role="status"><span>{deletedRecord.error || '记录已删除'}</span><button type="button" className="qt-btn" onClick={undoDelete}>撤销</button></div>;
  return <div className="quantgym-tracker">
        <div className="qt-page-heading"><div><h1>我的投递<span className="qt-heading-dot">.</span></h1></div><div className="qt-heading-actions"><button className="qt-btn" onClick={() => setAddStageRequest(value => value+1)}><Icon name="Flag" size={16}/>添加 Stage</button><button className="qt-btn qt-primary" onClick={() => setAdding(true)}><Icon name="Plus" size={17}/>添加申请</button></div></div>
        {!namespace && <div className="qt-cloud-status" role="status">
          <span>{syncError || (cloud.phase === 'synced' ? '已同步至账号' : cloud.phase === 'syncing' || cloud.phase === 'pending' ? '正在同步…' : cloud.phase === 'auth' ? '登录已过期，请重新登录以同步记录' : cloud.phase === 'error' ? '暂未同步，记录保存在此设备' : '记录保存在此设备，登录云账号后同步')}</span>
          {cloud.phase === 'error' && <button type="button" onClick={sync}>重试同步</button>}
        </div>}
        <section className="qt-summary-strip" aria-label="申请统计">
          {[
            ['all', '申请总数', summary.total, 'all', '总申请'],
            ['received-oa', '收到 OA', summary.receivedOa, 'oa', 'OA'],
            ['received-interview', '收到 Interview', summary.receivedInterview, 'interview', '面试'],
            ['rejected', '已拒绝', summary.rejected, 'closed', '已拒绝'],
            ['offer', 'Offer', summary.offer, 'offer', 'Offer'],
          ].map(([id, label, count, tone, compactLabel]) => <button key={id} className={`qt-metric qt-metric-${tone}${status === id ? ' qt-selected' : ''}`} onClick={() => setStatus(status === id ? 'all' : id)} aria-pressed={status === id} aria-label={`${label}${label.includes(compactLabel) ? '' : `（${compactLabel}）`} ${count}，查看申请`} title={id.startsWith('received-') ? '累计收到过的申请数，同一申请只计一次' : undefined}><span className="qt-metric-label"><span className="qt-metric-dot" aria-hidden="true"/><span className="qt-metric-label-full">{label}</span><span className="qt-metric-label-compact" aria-hidden="true">{compactLabel}</span></span><strong>{String(count).padStart(2, '0')}</strong></button>)}
        </section>
        <StagePanel key={ownerId+namespace} stageStore={stageStore} practice={practice} summaryRows={activity.stageRows} summaryNote={activity.leetcodeStageNote} addRequest={addStageRequest} showAddButton={false}/>
        <ApplicationList
          applications={resolvedApplications}
          stages={stageDefinitions}
          status={status}
          onStatusChange={setStatus}
          saveError={saveError}
          onOpenDetails={application => setSelectedId(application.id)}
          onUpdateProgress={application => setProgressId(application.id)}
          onEditEvent={editEvent}
          onEditDeadline={editDeadline}
          onAddApplication={() => setAdding(true)}
        />
    <DetailDrawer application={activeApplication} phases={stageDefinitions} onClose={()=>setSelectedId(null)} onUpdate={update} onEditEvent={editEvent} deletionNotice={deletionNotice}/>
    {editingApplication && editingEvent && <EventEditDialog key={`${editingApplication.id}:${editingEvent.id}`} application={editingApplication} event={editingEvent} onClose={()=>setEventTarget(null)} onSave={saveEvent} onDelete={deleteEvent}/>}
    {deadlineApplication && deadlineEvent && <DeadlineDialog key={`${deadlineApplication.id}:${deadlineEvent.id}`} application={deadlineApplication} event={deadlineEvent} onClose={()=>setDeadlineTarget(null)} onSave={saveDeadline}/>}
    {progressApplication&&<ProgressDialog key={progressApplication.id} application={progressApplication} onClose={()=>setProgressId(null)} onUpdate={update}/>}
    {adding&&<NewApplication phases={stageDefinitions} currentPhaseId={currentStage?.id} onClose={()=>setAdding(false)} onCreate={a=>{try {trackerStore.addApplication(a);setAdding(false);setStatus('all');setToast('新申请已添加');return true;} catch {return false;}}}/>}
    {deletedRecord ? !activeApplication && deletionNotice : toast && <div className="qt-toast" role="status"><Icon name="CircleCheck" size={18}/>{toast}</div>}
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
