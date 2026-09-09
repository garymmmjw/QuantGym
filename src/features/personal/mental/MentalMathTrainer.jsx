import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  MENTAL_OPERATORS, normalizeMentalSettings, mentalSettingsKey, createTrial,
  remainingTrialMs, transitionTrial, summarizeTrial, getPersonalBests, persistTrialTransition,
} from './mentalEngine.js';
import './mental.css';

const SYMBOLS = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
const SERIES_COLORS = ['#5265dc', '#8ba1ab', '#af8a76', '#8188ad', '#8c9c75', '#ad8fba'];
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

function TrialScatter({ trial, previous, compare, language }) {
  const en = language === 'en';
  const chartId = useId();
  const series = trial ? [trial, ...(compare ? previous : [])] : [];
  const points = series.flatMap((entry, seriesIndex) => (entry.questions || []).map((q) => ({ ...q, trial: entry, seriesIndex })));
  const maxIndex = Math.max(5, ...points.map((q) => q.index));
  const largest = Math.max(1, ...points.map((q) => q.elapsedMs / 1000));
  const tickStep = largest <= 5 ? 1 : largest <= 15 ? 5 : largest <= 60 ? 10 : Math.ceil(largest / 5 / 10) * 10;
  const maxSeconds = Math.ceil(largest / tickStep) * tickStep;
  const width = 840, height = 280, left = 55, right = 24, top = 20, bottom = 47;
  const x = (index) => left + (index - 1) / Math.max(1, maxIndex - 1) * (width - left - right);
  const y = (elapsed) => top + (1 - elapsed / 1000 / maxSeconds) * (height - top - bottom);
  const yTicks = Array.from({ length: Math.round(maxSeconds / tickStep) + 1 }, (_, i) => i * tickStep);
  const xTicks = [...new Set([1, ...[.25, .5, .75, 1].map((ratio) => Math.max(1, Math.round(maxIndex * ratio)))])];
  return <figure className="pm-scatter">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${chartId}-title ${chartId}-desc`}>
      <title id={`${chartId}-title`}>{en ? 'Time spent on each question' : '每一道题的用时散点图'}</title>
      <desc id={`${chartId}-desc`}>{en ? 'Horizontal axis: question number. Vertical axis: seconds. Filled dots are correct answers, empty dots are skipped, and crosses are unfinished. Full values follow in the question table.' : '横轴为题号，纵轴为秒数。实心点表示答对，空心点表示跳过，叉号表示未完成。完整数据见下方逐题明细。'}</desc>
      {yTicks.map((tick) => <g key={tick}>
        <line x1={left} x2={width - right} y1={y(tick * 1000)} y2={y(tick * 1000)} className="pm-chart-grid" />
        <text x={left - 12} y={y(tick * 1000) + 4} textAnchor="end" className="pm-chart-label">{tick}s</text>
      </g>)}
      {xTicks.map((tick) => <text key={tick} x={x(tick)} y={height - bottom + 23} textAnchor="middle" className="pm-chart-label">{tick}</text>)}
      <text x={width - right} y={height - 4} textAnchor="end" className="pm-chart-label">{en ? 'Question' : '题号'}</text>
      {[...points].sort((a, b) => b.seriesIndex - a.seriesIndex).map((q) => {
        const cx = x(q.index), cy = y(q.elapsedMs), color = SERIES_COLORS[q.seriesIndex % SERIES_COLORS.length];
        const isIncomplete = q.outcome === 'timeout' || q.outcome === 'aborted';
        const label = `${dateLabel(q.trial.startedAt, language)} · #${q.index} · ${q.a} ${SYMBOLS[q.operator]} ${q.b} = ${q.answer} · ${seconds(q.elapsedMs)} · ${outcomeLabel(q.outcome, en)}`;
        return <g key={`${q.trial.id}-${q.id}`} tabIndex={0} role="img" aria-label={label} opacity={q.seriesIndex ? .5 : 1}>
          <title>{label}</title>
          {isIncomplete
            ? <path d={`M ${cx - 4} ${cy - 4} l 8 8 M ${cx - 4} ${cy + 4} l 8 -8`} stroke={color} strokeWidth="2" />
            : <circle cx={cx} cy={cy} r={q.seriesIndex ? 3.5 : 5} stroke={color} strokeWidth="1.5" fill={q.outcome === 'skipped' ? '#fff' : color} />}
          {q.mistakes?.length > 0 && !q.seriesIndex && <circle cx={cx} cy={cy} r="8" fill="none" stroke="#b97b2b" strokeWidth="1" />}
        </g>;
      })}
      {!points.length && <text x={width / 2} y={height / 2} textAnchor="middle" className="pm-chart-empty">{en ? 'Your first question will appear here.' : '完成第一道题后，用时会出现在这里。'}</text>}
    </svg>
    <figcaption className="pm-chart-legend">
      {series.map((entry, i) => <span key={entry.id}><i style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{i === 0 ? (en ? 'Selected trial' : '当前试次') : dateLabel(entry.startedAt, language)}</span>)}
      <span className="pm-chart-key">{en ? '● Correct · ○ Skipped · × Unfinished · Ring: wrong submission' : '● 正确 · ○ 跳过 · × 未完成 · 外圈：有错误提交'}</span>
    </figcaption>
  </figure>;
}

export function MentalMathTrainer({ state, update, language = 'zh', dailySessionId = null, onComplete, durationSeconds }) {
  const en = language === 'en';
  const configId = useId();
  const settingsSignature = mentalSettingsKey(state.mentalSettings);
  const [draft, setDraft] = useState(() => normalizeMentalSettings({ ...state.mentalSettings, ...(durationSeconds != null ? { durationSeconds } : {}) }));
  const [now, setNow] = useState(Date.now);
  const [selectedId, setSelectedId] = useState(null);
  const [compare, setCompare] = useState(false);
  const inputRef = useRef(null);
  const callbacks = useRef({ update, onComplete, dailySessionId });
  callbacks.current = { update, onComplete, dailySessionId };
  const reported = useRef(new Set());
  const active = state.activeTrial?.status === 'active' ? state.activeTrial : null;
  const trials = useMemo(() => Array.isArray(state.trials) ? [...state.trials].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)) : [], [state.trials]);
  const selected = active || trials.find((entry) => entry.id === selectedId) || trials[0] || null;
  const effectiveDraft = normalizeMentalSettings({ ...draft, ...(durationSeconds != null ? { durationSeconds } : {}) });
  const bestSettings = active?.settings || effectiveDraft;
  const bests = getPersonalBests(trials, bestSettings);
  const summary = summarizeTrial(selected);
  const remaining = remainingTrialMs(active, now);
  const comparedTrials = useMemo(() => selected ? trials.filter((entry) => entry.id !== selected.id &&
    mentalSettingsKey(entry.settings) === mentalSettingsKey(selected.settings) && Date.parse(entry.startedAt) <= Date.parse(selected.startedAt)).slice(0, 5) : [], [trials, selected]);

  useEffect(() => {
    setDraft(normalizeMentalSettings({ ...state.mentalSettings, ...(durationSeconds != null ? { durationSeconds } : {}) }));
  }, [settingsSignature, durationSeconds]);

  function applyAction(action, at = Date.now()) {
    let finished = null;
    callbacks.current.update((latest) => {
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

  useEffect(() => { if (active) inputRef.current?.focus(); }, [active?.id, active?.currentQuestion?.id]);

  function start(event) {
    event.preventDefault();
    const at = Date.now();
    callbacks.current.update((latest) => {
      if (latest.activeTrial?.status === 'active') return latest;
      const settings = normalizeMentalSettings({ ...draft, ...(durationSeconds != null ? { durationSeconds } : {}) });
      return { ...latest, mentalSettings: settings, activeTrial: createTrial(settings, { now: at, dailySessionId }) };
    });
    setSelectedId(null);
    setNow(at);
  }

  function setRange(operator, field, value) {
    setDraft((previous) => ({ ...previous, ranges: { ...previous.ranges,
      [operator]: { ...previous.ranges[operator], [field]: value },
    } }));
  }

  return <section className="personal-mental" aria-label="Mental Math">
    <header className="pm-heading">
      <div><p className="pm-eyebrow">{en ? 'FOCUS / SPEED / PRECISION' : '专注 · 速度 · 准确'}</p><h2>Mental Math</h2></div>
      <span className="pm-mode-label">{dailySessionId ? 'Daily Mock' : en ? 'Personal practice' : '个人练习'}</span>
    </header>

    {!active && <form className="pm-setup" onSubmit={start}>
      <div className="pm-setup-toolbar">
        <label className="pm-duration" htmlFor={`${configId}-duration`}>{en ? 'Duration' : '时长'}
          <input id={`${configId}-duration`} type="number" min="10" max="3600" step="1" required disabled={durationSeconds != null}
            value={durationSeconds ?? draft.durationSeconds} onChange={(event) => setDraft((prev) => ({ ...prev, durationSeconds: event.target.value }))} />
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
        <button type="submit" className="pm-primary">{en ? 'Start trial' : '开始试次'} <span aria-hidden="true">↗</span></button>
        <p className="pm-note">{en ? 'Correct answers advance automatically. The clock keeps running if you leave or refresh.' : '答对自动进入下一题。切换页面或刷新后继续计时。'}</p>
      </div>
    </form>}

    {active && <div className="pm-arena">
      {(active.dailySessionId || null) !== (dailySessionId || null) && <p className="pm-context-note">{en ? 'An earlier trial is still running. Finish it before starting this session.' : '另一个试次仍在计时，请先继续完成或提前结束，再开始本次训练。'}</p>}
      <div className="pm-arena-stats"><div><span>{en ? 'Remaining' : '剩余时间'}</span><strong className={remaining <= 10000 ? 'pm-time-low' : ''}>{clockLabel(remaining)}</strong></div><div><span>{en ? 'Correct' : '已答对'}</span><strong>{active.correct}</strong></div></div>
      <form className="pm-question-form" onSubmit={(event) => { event.preventDefault(); applyAction({ type: 'submit' }); inputRef.current?.select(); }}>
        <label className={`pm-equation${`${active.currentQuestion?.a}${active.currentQuestion?.b}`.length > 9 ? ' pm-equation-long' : ''}`} htmlFor={`${configId}-answer`}><span>{active.currentQuestion?.a}</span><span>{SYMBOLS[active.currentQuestion?.operator]}</span><span>{active.currentQuestion?.b}</span><span className="pm-equals">=</span>
          <input ref={inputRef} id={`${configId}-answer`} className={`pm-answer${active.currentAnswer?.length > 4 ? ' pm-answer-long' : ''}`} type="text" inputMode="text" pattern="-?[0-9]*" autoComplete="off" autoCorrect="off" spellCheck="false" aria-label={en ? 'Your answer' : '输入答案'} value={active.currentAnswer || ''} onChange={(event) => applyAction({ type: 'input', value: event.target.value })} />
        </label>
        <p className="pm-question-meta" aria-live="polite">{en ? 'Question' : '第'} {active.currentQuestion?.index} {en ? '' : '题'} · {en ? 'Time on this question' : '本题用时'} <span>{seconds(Math.max(0, Math.min(now, Date.parse(active.deadlineAt)) - Date.parse(active.currentQuestion?.startedAt)))}</span></p>
        {active.currentQuestion?.mistakes?.length > 0 && <p className="pm-wrong-note" role="status">{en ? 'Not yet — try again. Wrong submissions:' : '答案还不对，继续试试。已记录错误提交：'} {active.currentQuestion.mistakes.length}</p>}
        <div className="pm-answer-controls"><button type="button" className="pm-text-button" onClick={() => applyAction({ type: 'skip' })}>{en ? 'Skip question' : '跳过本题'}</button><span>{en ? 'Correct = next · Enter = submit' : '答对自动下一题 · Enter 提交'}</span><button type="button" className="pm-text-button" onClick={() => applyAction({ type: 'abort' })}>{en ? 'End early (no record)' : '提前结束（不计纪录）'}</button></div>
      </form>
    </div>}

    <div className="pm-records" aria-label={en ? 'Personal records' : '个人纪录'}>
      <div className="pm-record"><span>{en ? 'Highest score' : '最高正确数'}</span><strong>{bests.bestCorrect ?? '—'}<small>{en ? 'correct' : '题'}</small></strong></div>
      <div className="pm-record"><span>{en ? 'Fastest question' : '最快单题'}</span><strong>{seconds(bests.fastestMs)}</strong></div>
      <div className="pm-record"><span>{en ? 'Best average / correct' : '最佳正确题均时'}</span><strong>{seconds(bests.bestMeanMs)}</strong></div>
      <p className="pm-record-note">{en ? `${bests.trialCount} completed trials with the same duration, operations and ranges. Early endings excluded.` : `相同时长、运算与范围的 ${bests.trialCount} 次完整试次。中止试次不计入纪录。`}</p>
    </div>

    <section className="pm-analysis">
      <div className="pm-section-heading"><div><h3>{en ? 'Question timing' : '逐题用时'}</h3><p>{selected ? `${dateLabel(selected.startedAt, language)} · ${selected.status === 'active' ? en ? 'In progress' : '进行中' : selected.status === 'completed' ? en ? 'Completed' : '已完成' : en ? 'Ended early' : '已提前结束'}` : en ? 'See your pace after the first trial.' : '从第一轮开始，找到自己的节奏。'}</p></div>
        <label className="pm-compare"><input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} />{en ? 'Overlay last 5 matching trials' : '叠加过去 5 次同设置试次'}</label>
      </div>
      <TrialScatter trial={selected} previous={comparedTrials} compare={compare} language={language} />
      {selected && <>
        <div className="pm-trial-summary"><span>{en ? 'Correct' : '正确'} <strong>{summary.correct}</strong></span><span>{en ? 'Average / correct' : '正确题均时'} <strong>{seconds(summary.meanMs)}</strong></span><span>{en ? 'Wrong submissions' : '错误提交'} <strong>{summary.mistakes}</strong></span><span>{en ? 'Skipped' : '跳过'} <strong>{summary.skipped}</strong></span><span>{en ? 'Unfinished' : '未完成'} <strong>{summary.unfinished}</strong></span></div>
        <details className="pm-question-details"><summary>{en ? 'Question details' : '查看逐题明细'} <span>{selected.questions.length} {en ? 'questions' : '题'}</span></summary>
          <div className="pm-table-scroll"><table className="pm-table"><thead><tr><th>#</th><th>{en ? 'Question' : '题目'}</th><th>{en ? 'Answer' : '正确答案'}</th><th>{en ? 'Outcome' : '结果'}</th><th>{en ? 'Time' : '累计用时'}</th><th>{en ? 'Wrong submissions (elapsed)' : '错误提交（累计用时）'}</th></tr></thead><tbody>
            {selected.questions.map((q) => <tr key={q.id}><td>{q.index}</td><td className="pm-equation-cell">{q.a} {SYMBOLS[q.operator]} {q.b}</td><td>{q.answer}</td><td><span className={`pm-outcome pm-outcome-${q.outcome}`}>{outcomeLabel(q.outcome, en)}</span></td><td>{seconds(q.elapsedMs)}</td><td>{q.mistakes?.length ? q.mistakes.map((mistake) => `${mistake.value} (${seconds(mistake.elapsedMs)})`).join(', ') : '—'}</td></tr>)}
            {!selected.questions.length && <tr><td colSpan="6">{en ? 'No finished questions yet.' : '暂时没有完成的题目。'}</td></tr>}
          </tbody></table></div>
        </details>
      </>}
    </section>

    <section className="pm-history"><div className="pm-section-heading"><div><h3>{en ? 'Trial history' : '试次历史'}</h3><p>{en ? 'Select a trial to inspect its pace and every answer.' : '选择任意试次，回看每一道题。'}</p></div><span className="pm-history-count">{trials.length} {en ? 'trials' : '次'}</span></div>
      {trials.length ? <div className="pm-table-scroll pm-history-scroll"><table className="pm-table"><thead><tr><th>{en ? 'Started' : '开始时间'}</th><th>{en ? 'Settings' : '设置'}</th><th>{en ? 'Correct' : '正确数'}</th><th>{en ? 'Average / correct' : '正确题均时'}</th><th>{en ? 'Status' : '状态'}</th><th><span className="pm-visually-hidden">{en ? 'View details' : '查看详情'}</span></th></tr></thead><tbody>{trials.map((trial) => <tr key={trial.id} className={selected?.id === trial.id ? 'pm-history-selected' : ''}><td>{dateLabel(trial.startedAt, language)}</td><td>{trial.settings?.durationSeconds}s · {trial.settings?.operations?.map((op) => SYMBOLS[op]).join(' ')}</td><td><strong>{trial.correct}</strong></td><td>{seconds(summarizeTrial(trial).meanMs)}</td><td>{trial.status === 'completed' ? en ? 'Completed' : '完整完成' : en ? 'Ended early' : '提前结束'}</td><td><button type="button" className="pm-text-button" disabled={Boolean(active)} aria-label={`${en ? 'View trial' : '查看试次'} ${dateLabel(trial.startedAt, language)}`} onClick={() => setSelectedId(trial.id)}>{selected?.id === trial.id ? en ? 'Selected' : '已选' : en ? 'View' : '查看'} <span aria-hidden="true">↗</span></button></td></tr>)}</tbody></table></div> : <div className="pm-history-empty">{en ? 'Your trial history starts here.' : '你的训练记录，会从这里开始。'}</div>}
    </section>
  </section>;
}
