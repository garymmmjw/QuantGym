import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  MENTAL_OPERATORS, normalizeMentalSettings, mentalSettingsKey, createTrial,
  remainingTrialMs, transitionTrial, summarizeTrial, getPersonalBests, persistTrialTransition,
} from './mentalEngine.js';
import { AttemptTrend, TrialHistory } from './AttemptTrend.jsx';
import { formatAttemptSettings } from './attemptHistory.js';
import { PreparationCountdown } from './PreparationCountdown.jsx';
import { trainerKind, TRAINER_LABELS } from './trainingSettings.js';
import { cancelTrialPreparation } from './reasoningEngine.js';
import './mental.css';

const SYMBOLS = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
const seconds = (value) => value == null ? '—' : `${(value / 1000).toFixed(2)}s`;
function clockLabel(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}
function dateLabel(date, language) {
  return new Date(date).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function outcomeLabel(outcome, en) {
  return ({ correct: en ? 'Correct' : '正确', skipped: en ? 'Skipped' : '跳过',
    timeout: en ? 'Timed out' : '到期未完成', aborted: en ? 'Stopped' : '中止未完成' })[outcome] || '—';
}

export function MentalMathTrainer({ state, update, language = 'zh', dailySessionId = null, onComplete, durationSeconds, embedded = false }) {
  const en = language === 'en';
  const configId = useId();
  const settingsSignature = mentalSettingsKey(state.mentalSettings);
  const [draft, setDraft] = useState(() => normalizeMentalSettings({ ...state.mentalSettings, ...(durationSeconds != null ? { durationSeconds } : {}) }));
  const [now, setNow] = useState(Date.now);
  const [selectedId, setSelectedId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsRef = useRef(null);
  const setupRef = useRef(null);
  const inputRef = useRef(null);
  const callbacks = useRef({ update, onComplete, dailySessionId });
  callbacks.current = { update, onComplete, dailySessionId };
  const reported = useRef(new Set());
  const active = state.activeTrial?.status === 'active' && trainerKind(state.activeTrial) === 'math' ? state.activeTrial : null;
  const foreignActive = state.activeTrial?.status === 'active' && !active ? state.activeTrial : null;
  const preparing = Boolean(active && now < Date.parse(active.startedAt));
  const trials = useMemo(() => Array.isArray(state.trials) ? state.trials.filter(trial => trainerKind(trial) === 'math').sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)) : [], [state.trials]);
  const selected = active || trials.find((entry) => entry.id === selectedId) || trials[0] || null;
  const effectiveDraft = useMemo(() => normalizeMentalSettings({ ...draft, ...(durationSeconds != null ? { durationSeconds } : {}) }), [draft, durationSeconds]);
  const bestSettings = active?.settings || effectiveDraft;
  const bests = useMemo(() => getPersonalBests(trials, bestSettings), [trials, bestSettings]);
  const summary = useMemo(() => summarizeTrial(selected), [selected]);
  const remaining = remainingTrialMs(active, now);
  const selectTrial = useCallback((id) => {
    setSelectedId(id);
    setDetailsOpen(true);
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ block: 'start' });
      detailsRef.current?.focus({ preventScroll: true });
    });
  }, []);

  function reuseSettings() {
    if (!selected || active) return;
    setDraft(normalizeMentalSettings({ ...selected.settings, ...(durationSeconds != null ? { durationSeconds } : {}) }));
    setupRef.current?.scrollIntoView({ block: 'start' });
    setupRef.current?.querySelector('button[type="submit"]')?.focus({ preventScroll: true });
  }

  useEffect(() => {
    setDraft(normalizeMentalSettings({ ...state.mentalSettings, ...(durationSeconds != null ? { durationSeconds } : {}) }));
  }, [settingsSignature, durationSeconds]);

  function applyAction(action, at = Date.now()) {
    let finished = null;
    callbacks.current.update((latest) => {
      if (latest.activeTrial?.id !== active?.id || trainerKind(latest.activeTrial) !== 'math') return latest;
      const next = transitionTrial(latest.activeTrial, action, at);
      if (!next || next === latest.activeTrial) return latest;
      if (next.status !== 'active') finished = next;
      return persistTrialTransition(latest, next);
    });
    if (finished) {
      setSelectedId(finished.id);
      if (!reported.current.has(finished.id)) {
        reported.current.add(finished.id);
        if ((finished.dailySessionId || null) === (callbacks.current.dailySessionId || null)) callbacks.current.onComplete?.(finished);
      }
    }
    setNow(at);
  }

  // History date filters also advance while this page is idle or the device was asleep.
  useEffect(() => {
    let midnightTimer;
    const refreshDate = () => {
      const at = Date.now();
      setNow(at);
      const midnight = new Date(at);
      midnight.setHours(24, 0, 0, 25);
      window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(refreshDate, midnight.getTime() - at);
    };
    refreshDate();
    window.addEventListener('focus', refreshDate);
    document.addEventListener('visibilitychange', refreshDate);
    return () => {
      window.clearTimeout(midnightTimer);
      window.removeEventListener('focus', refreshDate);
      document.removeEventListener('visibilitychange', refreshDate);
    };
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (at >= Date.parse(active.deadlineAt)) applyAction({ type: 'tick' }, at);
    };
    tick();
    const timer = window.setInterval(tick, 100);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [active?.id, active?.deadlineAt]);

  useEffect(() => { if (active && !preparing) inputRef.current?.focus(); }, [active?.id, active?.currentQuestion?.id, preparing]);

  function start(event) {
    event.preventDefault();
    const at = Date.now();
    callbacks.current.update((latest) => {
      if (latest.activeTrial?.status === 'active') return latest;
      const settings = normalizeMentalSettings({ ...draft, ...(durationSeconds != null ? { durationSeconds } : {}) });
      return { ...latest, mentalSettings: settings, activeTrial: createTrial(settings, { now: at, dailySessionId, preparationSeconds: 5 }) };
    });
    setSelectedId(null);
    setNow(at);
  }

  function setRange(operator, field, value) {
    setDraft((previous) => ({ ...previous, ranges: { ...previous.ranges,
      [operator]: { ...previous.ranges[operator], [field]: value },
    } }));
  }

  return <section className="personal-mental" aria-label="Math Trainer">
    {!embedded && <header className="pm-heading">
      <div><p className="pm-eyebrow">{en ? 'FOCUS / SPEED / PRECISION' : '专注 · 速度 · 准确'}</p><h2>Math Trainer</h2></div>
      <span className="pm-mode-label">{dailySessionId ? 'Daily Mock' : en ? 'Personal practice' : '个人练习'}</span>
    </header>}

    {foreignActive && <p className="pm-context-note">{en ? `A ${TRAINER_LABELS[trainerKind(foreignActive)]} trial is still running.` : `${TRAINER_LABELS[trainerKind(foreignActive)]} 仍在计时，请先完成当前试次。`} <a href="/tools">{en ? 'Continue trial' : '继续当前训练'}</a></p>}
    {!active && <form ref={setupRef} className="pm-setup" onSubmit={start}>
      <div className="pm-setup-toolbar">
        <label className="pm-duration" htmlFor={`${configId}-duration`}>{en ? 'Duration' : '时长'}
          <input id={`${configId}-duration`} type="number" min="10" max="3600" step="1" required disabled={durationSeconds != null}
            value={durationSeconds ?? draft.durationSeconds} onChange={(event) => { const value = event.target.value; setDraft((prev) => ({ ...prev, durationSeconds: value })); }} />
          <span>{en ? 'seconds' : '秒'}</span>
        </label>
        <div className="pm-operation-options" role="group" aria-label={en ? 'Operations' : '运算类型'}>
          {MENTAL_OPERATORS.map((op) => <label key={op} className={draft.operations.includes(op) ? 'pm-op pm-op-selected' : 'pm-op'}>
            <input type="checkbox" checked={draft.operations.includes(op)} disabled={draft.operations.length === 1 && draft.operations.includes(op)}
              onChange={() => setDraft((prev) => ({ ...prev, operations: prev.operations.includes(op) ? prev.operations.filter((entry) => entry !== op) : [...prev.operations, op] }))} />
            <span>{SYMBOLS[op]}</span><span className="pm-visually-hidden">{({ add: en ? 'Addition' : '加法', subtract: en ? 'Subtraction' : '减法', multiply: en ? 'Multiplication' : '乘法', divide: en ? 'Division' : '除法' })[op]}</span>
          </label>)}
        </div>
      </div>
      <details className="pm-range-settings">
        <summary>{en ? 'Adjust number ranges' : '调整数字范围'}<span>{en ? 'Integer answers only' : '均为整数答案'}</span></summary>
        <div className="pm-range-grid">
          {MENTAL_OPERATORS.filter((op) => draft.operations.includes(op)).map((op) => <fieldset key={op} className="pm-range-row">
            <legend>{({ add: en ? 'Addition' : '加法', subtract: en ? 'Subtraction' : '减法', multiply: en ? 'Multiplication' : '乘法', divide: en ? 'Division' : '除法' })[op]} <span>{SYMBOLS[op]}</span></legend>
            {['A', 'B'].map((part) => <div key={part} className="pm-range-pair"><span>{op === 'divide' ? (part === 'A' ? en ? 'Divisor' : '除数' : en ? 'Quotient' : '整数商') : `${en ? 'Number' : '数字'} ${part}`}</span>
              <input aria-label={`${op} ${part} ${en ? 'minimum' : '最小值'}`} type="number" min={op === 'divide' && part === 'A' ? 1 : 0} max="9999" step="1" required value={draft.ranges[op][`min${part}`]} onChange={(e) => setRange(op, `min${part}`, e.target.value)} />
              <span>—</span>
              <input aria-label={`${op} ${part} ${en ? 'maximum' : '最大值'}`} type="number" min={op === 'divide' && part === 'A' ? 1 : 0} max="9999" step="1" required value={draft.ranges[op][`max${part}`]} onChange={(e) => setRange(op, `max${part}`, e.target.value)} />
            </div>)}
          </fieldset>)}
        </div>
        <p className="pm-note">{en ? 'Subtraction can be negative. Division is generated from divisor × integer quotient. Reversed ranges are automatically ordered.' : '减法可能出现负数；除法按「除数 × 整数商」生成。范围上下限填反时会自动排序。'}</p>
      </details>
      <div className="pm-ready">
        <p className="pm-ready-clock">{clockLabel(effectiveDraft.durationSeconds * 1000)}</p>
        <p>{en ? 'A clear mind. One answer at a time.' : '只看眼前这一题。'}</p>
        <button type="submit" className="pm-primary" disabled={Boolean(foreignActive)}>{en ? 'Start trial' : '开始试次'} <span aria-hidden="true">↗</span></button>
        <p className="pm-note">{en ? 'Starts after a 5-second countdown. Correct answers advance automatically. The clock keeps running if you leave or refresh.' : '开始前准备 5 秒，答对自动进入下一题。切换页面或刷新后继续计时。'}</p>
      </div>
    </form>}

    {preparing && <PreparationCountdown trial={active} now={now} language={language} onCancel={() => update(latest => cancelTrialPreparation(latest, active.id))} />}
    {active && !preparing && <div className="pm-arena">
      {(active.dailySessionId || null) !== (dailySessionId || null) && <p className="pm-context-note">{en ? 'An earlier trial is still running. Finish it before starting this session.' : '另一个试次仍在计时，请先继续完成或提前结束，再开始本次训练。'}</p>}
      <div className="pm-arena-stats"><div><span>{en ? 'Remaining' : '剩余时间'}</span><strong className={remaining <= 10000 ? 'pm-time-low' : ''}>{clockLabel(remaining)}</strong></div><div><span>{en ? 'Correct' : '已答对'}</span><strong>{active.correct}</strong></div></div>
      <form className="pm-question-form" onSubmit={(event) => { event.preventDefault(); applyAction({ type: 'submit' }); inputRef.current?.select(); }}>
        <label className={`pm-equation${`${active.currentQuestion?.a}${active.currentQuestion?.b}`.length > 9 ? ' pm-equation-long' : ''}`} htmlFor={`${configId}-answer`}><span>{active.currentQuestion?.a}</span><span>{SYMBOLS[active.currentQuestion?.operator]}</span><span>{active.currentQuestion?.b}</span><span className="pm-equals">=</span>
          <input ref={inputRef} id={`${configId}-answer`} className={`pm-answer${active.currentAnswer?.length > 4 ? ' pm-answer-long' : ''}`} type="text" inputMode="numeric" enterKeyHint="done" pattern="-?[0-9]*" autoComplete="off" autoCorrect="off" spellCheck="false" aria-label={en ? 'Your answer' : '输入答案'} value={active.currentAnswer || ''} onChange={(event) => applyAction({ type: 'input', value: event.target.value })} />
        </label>
        <p className="pm-visually-hidden" role="status" aria-atomic="true">{en ? 'Question' : '第'} {active.currentQuestion?.index} {en ? '' : '题'}: {active.currentQuestion?.a} {({ add: en ? 'plus' : '加', subtract: en ? 'minus' : '减', multiply: en ? 'times' : '乘', divide: en ? 'divided by' : '除以' })[active.currentQuestion?.operator]} {active.currentQuestion?.b}</p>
        {active.settings.operations.includes('subtract') && <button type="button" className="pm-text-button pm-sign-toggle" aria-label={en ? 'Toggle answer sign' : '切换答案正负号'} onMouseDown={event => event.preventDefault()} onClick={() => { const value = active.currentAnswer || ''; applyAction({ type: 'input', value: value.startsWith('-') ? value.slice(1) : `-${value}` }); inputRef.current?.focus(); }}>± {en ? 'Change sign' : '正负号'}</button>}
        <p className="pm-question-meta">{en ? 'Question' : '第'} {active.currentQuestion?.index} {en ? '' : '题'} · {en ? 'Time on this question' : '本题用时'} <span>{seconds(Math.max(0, Math.min(now, Date.parse(active.deadlineAt)) - Date.parse(active.currentQuestion?.startedAt)))}</span></p>
        {active.currentQuestion?.mistakes?.length > 0 && <p className="pm-wrong-note" role="status">{en ? 'Not yet — try again. Wrong submissions:' : '答案还不对，继续试试。已记录错误提交：'} {active.currentQuestion.mistakes.length}</p>}
        <div className="pm-answer-controls"><button type="button" className="pm-text-button" onClick={() => applyAction({ type: 'skip' })}>{en ? 'Skip question' : '跳过本题'}</button><span>{en ? 'Correct = next · Enter = submit' : '答对自动下一题 · Enter 提交'}</span><button type="button" className="pm-text-button" onClick={() => applyAction({ type: 'abort' })}>{en ? 'End early (saved, no best score)' : '提前结束（保存，但不计纪录）'}</button></div>
      </form>
    </div>}

    <div className="pm-records" aria-label={en ? 'Personal records' : '个人纪录'}>
      <div className="pm-record"><span>{en ? 'Highest score' : '最高正确数'}</span><strong>{bests.bestCorrect ?? '—'}<small>{en ? 'correct' : '题'}</small></strong></div>
      <div className="pm-record"><span>{en ? 'Fastest question' : '最快单题'}</span><strong>{seconds(bests.fastestMs)}</strong></div>
      <div className="pm-record"><span>{en ? 'Best average / correct' : '最佳正确题均时'}</span><strong>{seconds(bests.bestMeanMs)}</strong></div>
      <p className="pm-record-note">{en ? `Current settings records · ${bests.trialCount} completed trials. Early endings excluded.` : `当前设置纪录 · ${bests.trialCount} 次完整试次，提前结束不计入。`}<br />{formatAttemptSettings(bestSettings, language)}</p>
    </div>

    <AttemptTrend trials={trials} currentSettings={bestSettings} language={language} selectedId={selected?.id} disabled={Boolean(active)} onSelect={selectTrial} dayKey={new Date(now).toDateString()} />

    <section className="pm-analysis pm-trial-details" ref={detailsRef} tabIndex={-1} aria-label={en ? 'Selected trial details' : '所选试次详情'}>
      <div className="pm-section-heading"><div><h3>{en ? 'Trial details' : '试次详情'}</h3><p>{selected ? `${dateLabel(selected.startedAt, language)} · ${selected.status === 'active' ? preparing ? en ? 'Preparing' : '准备中' : en ? 'In progress' : '进行中' : selected.status === 'completed' ? en ? 'Completed' : '已完成' : en ? 'Ended early' : '已提前结束'}` : en ? 'Your question timings will appear after a trial.' : '完成试次后，可在这里查看每一道题的用时。'}</p></div>
        {selected && !active && <button type="button" className="pm-text-button" onClick={reuseSettings}>{en ? 'Use these settings' : '使用该次设置'} ↗</button>}
      </div>
      {selected && <p className="pm-note pm-filter-description">{formatAttemptSettings(selected.settings, language)}{durationSeconds != null && !active && (en ? ` · Daily Mock duration stays at ${durationSeconds}s when reusing settings.` : ` · 使用该次设置时，Daily Mock 时长保持 ${durationSeconds} 秒。`)}</p>}
      {selected && <>
        <div className="pm-trial-summary"><span>{en ? 'Correct' : '正确'} <strong>{summary.correct}</strong></span><span>{en ? 'Average / correct' : '正确题均时'} <strong>{seconds(summary.meanMs)}</strong></span><span>{en ? 'Wrong submissions' : '错误提交'} <strong>{summary.mistakes}</strong></span><span>{en ? 'Skipped' : '跳过'} <strong>{summary.skipped}</strong></span><span>{en ? 'Unfinished' : '未完成'} <strong>{summary.unfinished}</strong></span></div>
        <details className="pm-question-details" open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)}><summary>{en ? 'Question details' : '查看逐题明细'} <span>{selected.questions.length} {en ? 'questions' : '题'}</span></summary>
          <div className="pm-table-scroll"><table className="pm-table"><thead><tr><th>#</th><th>{en ? 'Question' : '题目'}</th><th>{en ? 'Answer' : '正确答案'}</th><th>{en ? 'Outcome' : '结果'}</th><th>{en ? 'Time' : '累计用时'}</th><th>{en ? 'Wrong submissions (elapsed)' : '错误提交（累计用时）'}</th></tr></thead><tbody>
            {selected.questions.map((q) => <tr key={q.id}><td>{q.index}</td><td className="pm-equation-cell">{q.a} {SYMBOLS[q.operator]} {q.b}</td><td>{q.answer}</td><td><span className={`pm-outcome pm-outcome-${q.outcome}`}>{outcomeLabel(q.outcome, en)}</span></td><td>{seconds(q.elapsedMs)}</td><td>{q.mistakes?.length ? q.mistakes.map((mistake) => `${mistake.value} (${seconds(mistake.elapsedMs)})`).join(', ') : '—'}</td></tr>)}
            {!selected.questions.length && <tr><td colSpan="6">{en ? 'No finished questions yet.' : '暂时没有完成的题目。'}</td></tr>}
          </tbody></table></div>
        </details>
      </>}
    </section>

    <TrialHistory trials={trials} selectedId={selected?.id} disabled={Boolean(active)} language={language} onSelect={selectTrial} />
  </section>;
}
