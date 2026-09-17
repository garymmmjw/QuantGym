import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { localDateKey, nextStageLabel } from './stageStore.js';
import { summarizeStagePractice } from './stagePractice.js';
import './stagePanel.css';

function formatDate(value) {
  return value ? value.replaceAll('-', '.') : '';
}

function periodText(stage) {
  if (!stage.periodEnd) return '';
  if (stage.sameDay) return `${formatDate(stage.periodEnd)} · 与上一 Stage 同日`;
  if (stage.periodStart === stage.periodEnd) return formatDate(stage.periodEnd);
  if (stage.periodStart) return `${formatDate(stage.periodStart)} – ${formatDate(stage.periodEnd)}`;
  return `${stage.previousLabel ? '' : '截至 '}${formatDate(stage.periodEnd)}`;
}

function StageDialog({ stageStore, stage, practice, onClose }) {
  const ref = useRef(null);
  const today = localDateKey();
  const [label, setLabel] = useState(stage?.label || nextStageLabel(stageStore.getSnapshot().stages));
  const [description, setDescription] = useState(stage?.description || '');
  const [date, setDate] = useState(stage?.recordedDate || today);
  const [error, setError] = useState('');
  const draft = { ...stage, id: stage?.id || 'new-stage-preview', label, recordedDate: date };
  const draftStages = [...stageStore.getSnapshot().stages.filter(item => item.id !== stage?.id), draft];
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
      if (stage) stageStore.updateStage(stage.id, payload);
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
        <div className="career-auto-count" aria-label="系统统计的阶段刷题数"><span>本阶段刷题 · 系统统计</span><output>{preview.questionCount ?? '—'}<small>题</small></output></div>
        <p className="career-form-hint">{preview.previousLabel ? `统计 ${preview.previousLabel} 日期之后、到本 Stage 当日完成的题目。` : '统计截至本 Stage 当日完成的题目。'}仅计有完成日期的系统记录，同一阶段内同题计一次。</p>
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
  const previousStages = orderedStages.slice(0, -1);
  return (
    <section className={`career-stage-panel career-stage-${variant}`} aria-label="求职准备阶段">
      <div className="career-stage-heading">
        <div><span className="career-eyebrow">MY PREPARATION</span><h2>求职准备阶段</h2></div>
        <div className="career-stage-heading-actions">{headerActions}{showAddButton && <button type="button" className="career-button career-add" onClick={() => setEditor({ stage: null })}>＋ 添加 Stage</button>}</div>
      </div>
      {current ? <div className="career-current-stage">
        <div className="career-stage-identity"><span className="career-current-label">当前阶段</span><h3><button type="button" className="career-stage-name" aria-label={`编辑 ${current.label}`} title="点击修改阶段信息" onClick={() => setEditor({ stage: current })}>{current.label}</button></h3>{current.description && <p>{current.description}</p>}</div>
        <div className="career-stage-metric" title="按有完成日期的系统记录统计，同一阶段内同题计一次"><span>本阶段刷题</span><div><strong>{current.questionCount ?? '—'}</strong><span>题</span></div>{periodText(current) && <small>{periodText(current)}</small>}</div>
      </div> : <div className="career-empty"><p>添加第一个 Stage，记录当前的求职准备状态。</p>{!showAddButton && <button className="career-button" type="button" onClick={() => setEditor({ stage: null })}>＋ 添加 Stage</button>}</div>}
      {previousStages.length > 0 && <div className="career-history">
        <div className="career-history-heading">之前的 Stage <span>{previousStages.length} 个阶段</span></div>
        <ol aria-label="之前的 Stage">{previousStages.map(stage => <li key={stage.id}>
          <div className="career-history-head"><h3><button type="button" className="career-stage-name" aria-label={`编辑 ${stage.label}`} title="点击修改阶段信息" onClick={() => setEditor({ stage })}>{stage.label}</button></h3>{stage.recordedDate && <time dateTime={stage.recordedDate}>{formatDate(stage.recordedDate)}</time>}</div>
          {stage.description && <p>{stage.description}</p>}
          <div className="career-history-bottom"><span>阶段刷题 {stage.questionCount ?? '—'} 题</span></div>
        </li>)}</ol>
      </div>}
      {error && <p className="career-error" role="alert">{error}</p>}
      {editor && <StageDialog key={editor.stage?.id || 'new'} stageStore={stageStore} stage={editor.stage} practice={practice} onClose={() => setEditor(null)} />}
    </section>
  );
}

export { StagePanel };
