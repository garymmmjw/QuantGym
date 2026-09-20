import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pencil } from 'lucide-react';
import { localDateKey, nextStageLabel } from './stageStore.js';
import { formatStagePeriod, summarizeStagePractice } from './stagePractice.js';
import { stageFormChanges } from '../tracker/formChanges.js';
import { LeetCodeCounts } from './LeetCodeCounts.jsx';
import './stagePanel.css';

function periodNote(stage) {
  if (!stage.periodStart || !stage.periodEnd || stage.periodStart > stage.periodEnd) return '暂无法确定统计区间，请补充或修改阶段日期。';
  return `统计 ${stage.periodStart} 之后至 ${stage.periodEnd} 当日完成的题目，不含起始日、包含结束日。`;
}

function StageDialog({ stageStore, stage, practice, onClose }) {
  const ref = useRef(null);
  const today = localDateKey();
  const [label, setLabel] = useState(stage?.label || nextStageLabel(stageStore.getSnapshot().stages));
  const [description, setDescription] = useState(stage?.description || '');
  const [date, setDate] = useState(stage?.recordedDate || today);
  const [error, setError] = useState('');
  const original = useRef({ label, description, recordedDate: date });
  const savedStages = stageStore.getSnapshot().stages;
  const latestStage = savedStages.find(item => item.id === stage?.id || item.importedIds?.includes(stage?.id));
  const changes = stage ? stageFormChanges(original.current, { label, description, recordedDate: date }, latestStage || stage) : {};
  const draft = stage ? { ...(latestStage || stage), ...changes }
    : { id: 'new-stage-preview', label, description, recordedDate: date };
  const draftStages = stage ? savedStages.map(item => item.id === draft.id ? draft : item) : [...savedStages, draft];
  const preview = summarizeStagePractice(draftStages, practice).find(item => item.id === draft.id);

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

  function save(event) {
    event.preventDefault();
    try {
      const payload = { label, description, recordedDate: date };
      if (stage) {
        const latest = stageStore.getSnapshot().stages.find(item => item.id === stage.id || item.importedIds?.includes(stage.id));
        if (!latest) throw new Error('没有找到这个 Stage，请关闭表单后重试。');
        stageStore.updateStage(latest.id, stageFormChanges(original.current, payload, latest));
      }
      else stageStore.addStage(payload);
      onClose();
    } catch (failure) { setError(failure.message || '没有保存成功，请重试。'); }
  }

  return (
    <dialog className="career-stage-dialog" ref={ref} aria-labelledby="career-stage-dialog-title" onCancel={onClose} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
      <header className="career-dialog-heading">
        <div><span className="career-eyebrow">PREPARATION MILESTONE</span><h2 id="career-stage-dialog-title">{stage ? '修改 Stage' : '添加 Stage'}</h2></div>
        <button type="button" className="career-close" onClick={onClose} aria-label="关闭 Stage 表单">×</button>
      </header>
      <form onSubmit={save}>
        <div className="career-form-columns">
          <label>Stage 名称<input value={label} maxLength={40} required onChange={event => setLabel(event.target.value)} placeholder="例如 Stage 3" /></label>
          <label>记录日期<input type="date" required value={date} onInput={event => setDate(event.target.value)} onChange={event => setDate(event.target.value)} /></label>
        </div>
        <label>准备状态<input value={description} maxLength={200} onChange={event => setDescription(event.target.value)} placeholder="例如：简历完成，开始集中投递" /></label>
        <div className="career-stage-dialog-counts"><span>LeetCode · 本阶段</span><LeetCodeCounts newCount={preview.leetcodeNew} totalCount={preview.leetcode} newStatus={preview.leetcodeNewStatus} totalStatus={preview.leetcodeCountStatus} layout="inline" scope="stage" /></div>
        <div className="career-auto-count" aria-label="系统统计的阶段刷题合计"><span>全部刷题{preview.countStatus === 'partial' ? ' · 已记录' : ''}</span><output>{preview.questionCount ?? '—'}<small>题</small></output></div>
        <p className="career-form-hint">{preview.nextLabel ? `统计本 Stage 日期之后、到 ${preview.nextLabel} 当日的记录。` : '统计本 Stage 日期之后、截至今天的记录。'}不含起始日、包含结束日。新完成按全历史首次通过日期归属；总完成含间隔至少 3 小时的有效重做。其他题目同阶段计一次。{preview.countSourceNote}</p>
        {error && <p className="career-error" role="alert">{error}</p>}
        <footer><button type="button" className="career-button" onClick={onClose}>取消</button><button type="submit" className="career-button career-primary">保存 Stage</button></footer>
      </form>
    </dialog>
  );
}

export default function StagePanel({ stageStore, practice, variant = 'tracker', addRequest = 0, showAddButton = true, headerActions = null }) {
  const { stages, error } = useSyncExternalStore(stageStore.subscribe, stageStore.getSnapshot, stageStore.getSnapshot);
  const [editor, setEditor] = useState(null);
  const orderedStages = summarizeStagePractice(stages, practice);
  const current = orderedStages.at(-1);
  useEffect(() => { if (addRequest) setEditor({ stage: null }); }, [addRequest]);
  const displayStages = [...orderedStages].reverse();
  return (
    <section className={`career-stage-panel career-stage-${variant}`} aria-label="求职准备阶段">
      {(headerActions || showAddButton) && <div className="career-stage-heading-actions">{headerActions}{showAddButton && <button type="button" className="career-button career-add" onClick={() => setEditor({ stage: null })}>＋ 添加 Stage</button>}</div>}
      {current ? <ol className="career-stage-list" aria-label="准备阶段，按新到旧排列">{displayStages.map(stage => {
        const isCurrent = stage.id === current.id;
        const partial = stage.countStatus === 'partial' && Number.isSafeInteger(stage.questionCount);
        return <li className={`career-stage-row${isCurrent ? ' career-stage-row-current' : ''}`} key={stage.id} aria-current={isCurrent ? 'step' : undefined}>
          <div className="career-stage-row-identity">
            {isCurrent && <span className="career-current-label">当前阶段</span>}
            <h3><button type="button" className="career-stage-name" aria-label={`编辑 ${stage.label}`} title="点击修改阶段信息" onClick={() => setEditor({ stage })}>
              <span>{stage.label}</span><Pencil className="career-stage-edit-icon" size={14} strokeWidth={1.6} aria-hidden="true" />
            </button></h3>
          </div>
          <span className="career-stage-period" title={periodNote(stage)}>{formatStagePeriod(stage)}</span>
          <p className="career-stage-description">{stage.description || '—'}</p>
          <div className="career-stage-count">
            <span className="career-stage-count-title">LeetCode</span>
            <LeetCodeCounts newCount={stage.leetcodeNew} totalCount={stage.leetcode} newStatus={stage.leetcodeNewStatus} totalStatus={stage.leetcodeCountStatus} layout="inline" scope="stage" />
            <div className="career-stage-site-count" title={`${periodNote(stage)}站内题目和 LeetCode 有效完成的合计。其他题目同阶段计一次。${partial ? '已记录次数，补齐历史后可能重新归属。' : ''}`}><span>全部刷题</span><strong>{stage.questionCount ?? '—'}</strong><span>题</span></div>
            {(partial || stage.countSourceNote) && <small className="career-stage-source-note">{[partial ? '已记录' : '', stage.countSourceNote].filter(Boolean).join(' · ')}</small>}
          </div>
        </li>;
      })}</ol> : <div className="career-empty"><p>添加第一个 Stage，记录当前的求职准备状态。</p>{!showAddButton && <button className="career-button" type="button" onClick={() => setEditor({ stage: null })}>＋ 添加 Stage</button>}</div>}
      {error && <p className="career-error" role="alert">{error}</p>}
      {editor && <StageDialog key={editor.stage?.id || 'new'} stageStore={stageStore} stage={editor.stage} practice={practice} onClose={() => setEditor(null)} />}
    </section>
  );
}

export { StagePanel };
