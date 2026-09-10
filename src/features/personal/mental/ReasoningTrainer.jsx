import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AttemptTrend, TrialHistory } from './AttemptTrend.jsx';
import { formatAttemptSettings } from './attemptHistory.js';
import { PreparationCountdown } from './PreparationCountdown.jsx';
import { PatternPuzzle } from './PatternPuzzle.jsx';
import { createReasoningTrial, transitionReasoningTrial, persistReasoningTransition, cancelTrialPreparation } from './reasoningEngine.js';
import { TRAINER_LABELS, trainerKind, normalizeTrainingSettings, getTrainingBests, difficultyLabel, sequenceTypeLabel } from './trainingSettings.js';
import { summarizeTrial } from './mentalEngine.js';

const seconds = value => value == null ? '—' : `${(value / 1000).toFixed(2)}s`;
const clock = milliseconds => {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
const dateLabel = (date, en) => new Date(date).toLocaleString(en ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const outcomeLabel = (outcome, en) => ({ correct: en ? 'Correct' : '正确', wrong: en ? 'Incorrect' : '错误', skipped: en ? 'Skipped' : '跳过', timeout: en ? 'Timed out' : '到期未完成', aborted: en ? 'Ended early' : '提前结束' })[outcome];

function SequencePrompt({ question, language }) {
  const en = language === 'en';
  const letters = question.tokens.some(token => /[A-Z]/i.test(token));
  return <div className="pm-sequence-prompt"><p className="pm-note">{en ? 'What comes next?' : '下一个是什么？'}{letters && (en ? ' Letters cycle A–Z; Z is followed by A.' : ' 字母按 A–Z 循环，Z 后回到 A。')}</p><div className="pm-sequence-tokens" aria-label={`${en ? 'Sequence' : '序列'}: ${question.tokens.join(', ')}, ?`}>{question.tokens.map((token, index) => <span key={index}>{token}<small aria-hidden="true">,</small></span>)}<span className="pm-sequence-missing">?</span></div></div>;
}
function QuestionReview({ question, language }) {
  const en = language === 'en';
  const [open, setOpen] = useState(false);
  return <details className="pm-reasoning-review" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>#{question.index} · {question.kind === 'sequence' ? `${question.tokens.join(', ')} → ?` : en ? 'Visual matrix' : '图形矩阵'} <span>{outcomeLabel(question.outcome, en)} · {seconds(question.elapsedMs)}</span></summary>
    {open && <div className="pm-review-content">{question.kind === 'pattern' && <PatternPuzzle question={question} language={language} selectedAnswer={question.submittedAnswer || ''} disabled showAnswer showExplanation={false} />}
      <p>{en ? 'Your answer' : '你的答案'}: <strong>{question.submittedAnswer || '—'}</strong> · {en ? 'Answer' : '参考答案'}: <strong>{question.answer}</strong></p>
      <p>{en ? question.explanationEn : question.explanation}</p>
    </div>}
  </details>;
}

export function ReasoningTrainer({ state, update, language = 'zh', trainer }) {
  const en = language === 'en';
  const id = useId();
  const active = state.activeTrial?.status === 'active' && trainerKind(state.activeTrial) === trainer ? state.activeTrial : null;
  const trials = useMemo(() => (state.trials || []).filter(trial => trainerKind(trial) === trainer).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)), [state.trials, trainer]);
  const [draft, setDraft] = useState(() => normalizeTrainingSettings(active?.settings || trials[0]?.settings || { trainer }));
  const [now, setNow] = useState(Date.now);
  const [selectedId, setSelectedId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const inputRef = useRef(null);
  const patternRef = useRef(null);
  const arenaRef = useRef(null);
  const nextRef = useRef(null);
  const detailsRef = useRef(null);
  const setupRef = useRef(null);
  const effectiveSettings = useMemo(() => normalizeTrainingSettings({ ...draft, trainer }), [draft, trainer]);
  const bestSettings = active?.settings || effectiveSettings;
  const bests = useMemo(() => getTrainingBests(trials, bestSettings), [trials, bestSettings]);
  const selected = active || trials.find(trial => trial.id === selectedId) || trials[0] || null;
  const summary = useMemo(() => ({ ...summarizeTrial(selected), wrong: selected?.questions.filter(question => question.outcome === 'wrong').length || 0 }), [selected]);
  const preparing = Boolean(active && now < Date.parse(active.startedAt));
  const remaining = active ? Math.max(0, Date.parse(active.deadlineAt) - Math.max(now, Date.parse(active.startedAt))) : 0;
  const question = active?.currentQuestion;
  const feedback = active?.feedbackQuestionId ? active.questions.find(entry => entry.id === active.feedbackQuestionId) : null;
  const actionsRef = useRef(null);
  const selectTrial = useCallback(trialId => {
    setSelectedId(trialId);
    setDetailsOpen(true);
    window.requestAnimationFrame(() => { detailsRef.current?.scrollIntoView({ block: 'start' }); detailsRef.current?.focus({ preventScroll: true }); });
  }, []);

  function act(action, at = Date.now()) {
    let finished;
    update(latest => {
      if (!active || latest.activeTrial?.id !== active.id || trainerKind(latest.activeTrial) !== trainer) return latest;
      const next = transitionReasoningTrial(latest.activeTrial, action, at);
      if (next === latest.activeTrial) return latest;
      if (next.status !== 'active') finished = next;
      return persistReasoningTransition(latest, next);
    });
    if (finished) { setSelectedId(finished.id); setDetailsOpen(true); }
    setNow(at);
  }
  actionsRef.current = act;
  useEffect(() => {
    let midnightTimer;
    const refresh = () => {
      const at = Date.now();
      setNow(at);
      if (active && at >= Date.parse(active.deadlineAt)) actionsRef.current({ type: 'tick' }, at);
      const next = new Date(at);
      next.setHours(24, 0, 0, 25);
      clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(refresh, next.getTime() - at);
    };
    refresh();
    const interval = active ? window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at >= Date.parse(active.deadlineAt)) actionsRef.current({ type: 'tick' }, at);
    }, 100) : null;
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(midnightTimer); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [active?.id, active?.deadlineAt]);
  useEffect(() => {
    if (!active || preparing) return;
    if (feedback) nextRef.current?.focus({ preventScroll: true });
    else if (trainer === 'pattern') patternRef.current?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
    arenaRef.current?.scrollIntoView({ block: 'start' });
  }, [active?.id, question?.id, feedback?.id, preparing]);

  function start(event) {
    event.preventDefault();
    const at = Date.now();
    update(latest => latest.activeTrial?.status === 'active' ? latest : { ...latest, activeTrial: createReasoningTrial(effectiveSettings, { now: at }) });
    setSelectedId(null); setDetailsOpen(false); setNow(at);
  }
  function reuseSettings() {
    if (!selected || active) return;
    setDraft(normalizeTrainingSettings(selected.settings));
    setupRef.current?.scrollIntoView({ block: 'start' });
    setupRef.current?.querySelector('button[type="submit"]')?.focus({ preventScroll: true });
  }
  return <section className="personal-mental pm-reasoning" aria-label={TRAINER_LABELS[trainer]}>
    {!active && <form ref={setupRef} className="pm-setup" onSubmit={start}>
      <div className="pm-setup-toolbar pm-reasoning-settings">
        <label className="pm-duration" htmlFor={`${id}-duration`}>{en ? 'Duration' : '时长'}<input id={`${id}-duration`} type="number" min="10" max="3600" step="1" required value={draft.durationSeconds} onChange={event => { const value = event.target.value; setDraft(previous => ({ ...previous, durationSeconds: value })); }} /><span>{en ? 'seconds' : '秒'}</span></label>
        <label>{en ? 'Difficulty' : '难度'}<select value={draft.difficulty} onChange={event => { const value = event.target.value; setDraft(previous => ({ ...previous, difficulty: value })); }}>{['easy', 'medium', 'hard'].map(level => <option key={level} value={level}>{difficultyLabel(level, language)}</option>)}</select></label>
        {trainer === 'sequence' && <label>{en ? 'Sequence type' : '序列类型'}<select value={draft.sequenceType} onChange={event => { const value = event.target.value; setDraft(previous => ({ ...previous, sequenceType: value })); }}>{['numbers', 'letters', 'mixed'].map(type => <option key={type} value={type}>{sequenceTypeLabel(type, language)}</option>)}</select></label>}
      </div>
      <div className="pm-ready"><p className="pm-ready-clock">{clock(effectiveSettings.durationSeconds * 1000)}</p>
        <p>{trainer === 'sequence' ? en ? 'Find the rule. Fill in the next number or letter.' : '找出规律，填写下一个数字或字母。' : en ? 'Find the missing tile in a visual matrix.' : '观察行列规律，补全缺失的图形。'}</p>
        <button type="submit" className="pm-primary" disabled={Boolean(state.activeTrial)}>{en ? 'Start trial' : '开始试次'} ↗</button>
        <p className="pm-note">{en ? 'Starts after 5 seconds. Submit once per question; correct answers score 1. Review the rule, then continue. The timer keeps running.' : '开始前准备 5 秒。每题提交一次，答对计 1 题；看解析后继续下一题，期间仍计时。'}</p>
      </div>
    </form>}
    {preparing && <PreparationCountdown trial={active} now={now} language={language} onCancel={() => update(latest => cancelTrialPreparation(latest, active.id))} />}
    {active && !preparing && <div ref={arenaRef} className="pm-arena">
      <div className="pm-arena-stats"><div><span>{en ? 'Remaining' : '剩余时间'}</span><strong className={remaining <= 10000 ? 'pm-time-low' : ''}>{clock(remaining)}</strong></div><div><span>{en ? 'Correct' : '已答对'}</span><strong>{active.correct}</strong></div></div>
      {question && <form className="pm-reasoning-question" onSubmit={event => { event.preventDefault(); act({ type: 'submit' }); }}>
        <p className="pm-note" role="status">{en ? 'Question' : '第'} {question.index} {en ? '' : '题'}</p>
        {trainer === 'sequence' ? <><SequencePrompt question={question} language={language} /><label className="pm-reasoning-answer" htmlFor={`${id}-answer`}>{en ? 'Next term' : '下一个数 / 字母'}<input ref={inputRef} id={`${id}-answer`} type="text" autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck="false" inputMode={question.tokens.some(token => /[A-Z]/i.test(token)) ? 'text' : 'numeric'} enterKeyHint="done" value={active.currentAnswer} onChange={event => act({ type: 'input', value: event.target.value })} /></label>
          {!question.tokens.some(token => /[A-Z]/i.test(token)) && <button type="button" className="pm-text-button pm-sign-toggle" aria-label={en ? 'Toggle answer sign' : '切换答案正负号'} onMouseDown={event => event.preventDefault()} onClick={() => { const value = active.currentAnswer; act({ type: 'input', value: value.startsWith('-') ? value.slice(1) : `-${value}` }); inputRef.current?.focus(); }}>± {en ? 'Change sign' : '正负号'}</button>}</>
          : <div ref={patternRef} className="pm-pattern-question"><PatternPuzzle question={question} language={language} selectedAnswer={active.currentAnswer} onSelect={value => act({ type: 'input', value })} /></div>}
        <p className="pm-question-meta">{en ? 'Time on this question' : '本题用时'} <span>{seconds(Math.max(0, Math.min(now, Date.parse(active.deadlineAt)) - Date.parse(question.startedAt)))}</span></p>
        <button type="submit" className="pm-primary" disabled={!active.currentAnswer.trim() || /^[+-]$/.test(active.currentAnswer.trim())}>{en ? 'Submit answer' : '提交答案'} ↗</button>
        <div className="pm-answer-controls"><button type="button" className="pm-text-button" onClick={() => act({ type: 'skip' })}>{en ? 'Skip question' : '跳过本题'}</button><span>{en ? 'One submission per question' : '每题一次提交'}</span><button type="button" className="pm-text-button" onClick={() => act({ type: 'abort' })}>{en ? 'End early (saved, no best score)' : '提前结束（保存，但不计纪录）'}</button></div>
      </form>}
      {feedback && <div className="pm-reasoning-feedback">
        <p className={`pm-feedback-result pm-outcome-${feedback.outcome}`} role="status">{outcomeLabel(feedback.outcome, en)} · {en ? 'Answer' : '参考答案'} {feedback.answer}</p>
        {trainer === 'sequence' ? <SequencePrompt question={feedback} language={language} /> : <PatternPuzzle question={feedback} language={language} selectedAnswer={feedback.submittedAnswer || ''} disabled showAnswer showExplanation={false} />}
        <p>{en ? 'Your answer' : '你的答案'}: {feedback.submittedAnswer || '—'} · {seconds(feedback.elapsedMs)}</p>
        <p className="pm-rule-explanation">{en ? feedback.explanationEn : feedback.explanation}</p>
        <p className="pm-note">{en ? 'The trial timer keeps running while you review.' : '查看解析时，训练倒计时仍在继续。'}</p>
        <div className="pm-answer-controls"><button ref={nextRef} type="button" className="pm-primary" onClick={() => act({ type: 'next' })}>{en ? 'Next question' : '下一题'} →</button><button type="button" className="pm-text-button" onClick={() => act({ type: 'abort' })}>{en ? 'End early (saved, no best score)' : '提前结束（保存，但不计纪录）'}</button></div>
      </div>}
    </div>}
    <div className="pm-records" aria-label={en ? 'Personal records' : '个人纪录'}>
      <div className="pm-record"><span>{en ? 'Highest score' : '最高正确数'}</span><strong>{bests.bestCorrect ?? '—'}<small>{en ? 'correct' : '题'}</small></strong></div>
      <div className="pm-record"><span>{en ? 'Fastest question' : '最快单题'}</span><strong>{seconds(bests.fastestMs)}</strong></div>
      <div className="pm-record"><span>{en ? 'Best average / correct' : '最佳正确题均时'}</span><strong>{seconds(bests.bestMeanMs)}</strong></div>
      <p className="pm-record-note">{TRAINER_LABELS[trainer]} · {formatAttemptSettings(bestSettings, language)}<br />{en ? `${bests.trialCount} completed trials with matching settings; scores from other modules are separate.` : `同设置 ${bests.trialCount} 次完整试次；不同模块分开记录，提前结束不计纪录。`}</p>
    </div>
    <AttemptTrend trials={trials} currentSettings={bestSettings} language={language} selectedId={selected?.id} disabled={Boolean(active)} onSelect={selectTrial} dayKey={new Date(now).toDateString()} />
    <section ref={detailsRef} className="pm-analysis pm-trial-details" tabIndex={-1} aria-label={en ? 'Selected trial details' : '所选试次详情'}>
      <div className="pm-section-heading"><div><h3>{en ? 'Trial details' : '试次详情'}</h3><p>{selected ? `${dateLabel(selected.startedAt, en)} · ${selected.status === 'active' ? preparing ? en ? 'Preparing' : '准备中' : en ? 'In progress' : '进行中' : selected.status === 'completed' ? en ? 'Completed' : '已完成' : en ? 'Ended early' : '已提前结束'}` : en ? 'Completed questions and their rules will appear here.' : '完成试次后，可在这里复盘题目、用时和规律解析。'}</p></div>{selected && !active && <button type="button" className="pm-text-button" onClick={reuseSettings}>{en ? 'Use these settings' : '使用该次设置'} ↗</button>}</div>
      {selected && <><p className="pm-note pm-filter-description">{formatAttemptSettings(selected.settings, language)}</p><div className="pm-trial-summary"><span>{en ? 'Correct' : '正确'} <strong>{summary.correct}</strong></span><span>{en ? 'Incorrect' : '错误'} <strong>{summary.wrong}</strong></span><span>{en ? 'Skipped' : '跳过'} <strong>{summary.skipped}</strong></span><span>{en ? 'Unfinished' : '未完成'} <strong>{summary.unfinished}</strong></span><span>{en ? 'Average / correct' : '正确题均时'} <strong>{seconds(summary.meanMs)}</strong></span></div>
        <details className="pm-question-details" open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)}><summary>{en ? 'Question details' : '查看逐题明细'} <span>{selected.questions.length} {en ? 'questions' : '题'}</span></summary>{selected.questions.map(entry => <QuestionReview key={`${selected.id}:${entry.id}`} question={entry} language={language} />)}{!selected.questions.length && <p className="pm-note">{en ? 'No finished questions yet.' : '暂时没有完成的题目。'}</p>}</details></>}
    </section>
    <TrialHistory trials={trials} selectedId={selected?.id} disabled={Boolean(active)} language={language} onSelect={selectTrial} />
    <details className="pm-training-resources"><summary>{en ? 'About these practice questions' : '练习题型与参考资料'}</summary><p>{en ? 'These are original generated practice questions with explanations.' : '这里使用原创生成的练习题，每题附有规律解析。'}</p><a href={trainer === 'sequence' ? 'https://neet-quant.com/simulators/sequences' : 'https://www.mensa.org/mensa-iq-challenge/'} target="_blank" rel="noreferrer">{trainer === 'sequence' ? en ? 'Sequence practice formats · NeetQuant' : '数列训练题型 · NeetQuant' : en ? 'Matrix practice reference · Mensa IQ Challenge' : '矩阵练习参考 · Mensa IQ Challenge'} ↗</a></details>
  </section>;
}
