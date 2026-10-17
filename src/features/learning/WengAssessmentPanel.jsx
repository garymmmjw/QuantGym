import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLearningSources } from './useLearningSources.js';
import { useLearningState } from './useLearningState.js';
import './readiness.css';

/** One explicit human assessment drives both the existing practice and ability ledgers. */
export function WengAssessmentPanel({ problem, practice, hintRevealed, answerRevealed }) {
  const { sources, loading, error, refresh } = useLearningSources();
  const state = useLearningState(sources);
  const location = useLocation();
  const [outcome, setOutcome] = useState('');
  const [partial, setPartial] = useState(50);
  const [manualHint, setManualHint] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const busy = useRef(false);
  const usedHint = Boolean(practice?.hintViewed || hintRevealed || manualHint);
  const seenAnswer = Boolean(practice?.answerViewed || answerRevealed);
  const session = practice?.sessionId || practice?.latestAttempt?.id;
  const eventId = session ? `weng-${session}` : '';
  const saved = state.profile?.events.find(event => event.id === eventId);
  const params = new URLSearchParams(location.search);
  const lessonId = params.get('lesson') || params.get('lecture') || '';
  const fromLearn = params.get('from') === 'learn' || Boolean(lessonId);
  const currentSubmission = useRef(null);
  currentSubmission.current = `${state.sessionKey}:${eventId}`;
  useEffect(() => () => { currentSubmission.current = null; }, []);
  const ready = !state.syncing && !loading && !error && !state.error && sources && state.profile && eventId;
  const effectiveOutcome = seenAnswer ? 'unsolved' : outcome;
  const submit = async () => {
    if (!ready || busy.current || saved || !effectiveOutcome) return;
    if (effectiveOutcome === 'partial' && (!Number.isFinite(Number(partial)) || Number(partial) <= 0 || Number(partial) >= 100)) { setMessage('部分正确请输入 1–99 的百分比。'); return; }
    busy.current = true;
    const submitting = currentSubmission.current;
    try {
      const answer = { eventId, x: effectiveOutcome === 'correct' ? 1 : 0, h: usedHint, reveal: seenAnswer,
        ...(effectiveOutcome === 'partial' ? { pc: Number(partial) / 100 } : {}) };
      const next = await state.submitAttempt(problem, answer);
      if (currentSubmission.current !== submitting) return;
      // The original practice recorder is idempotent within its 24h window.
      // This replaces its old buttons for this bank, so one click is one result.
      practice.recordOutcome(effectiveOutcome === 'correct' ? 'correct' : effectiveOutcome === 'partial' ? 'idea_wrong' : 'wrong');
      setResult(next); setMessage('本次自评已保存到账号云端，练习记录与能力页面已同步。');
    } catch (cause) { if (currentSubmission.current === submitting) setMessage(`未能完成保存：${cause.message}`); }
    finally { busy.current = false; }
  };
  return <section className="qg-weng-assessment" aria-label="翁家宝典人工自评">
    <div className="qg-weng-return">{fromLearn && <Link to={lessonId ? `/learn?lecture=${encodeURIComponent(lessonId)}` : '/learn'}>← 返回 Learn 课程</Link>}<Link to="/readiness">查看能力与 Offer Bar →</Link></div>
    <h3>记录这次练习</h3><p>按你实际完成的情况自评。开放题由你核对，本地系统不会自动判断答案。</p>
    {(loading || state.syncing) && <p role="status">正在连接你的学习档案…</p>}
    {(error || state.error) && <p role="alert">{error || state.error} <button type="button" onClick={() => error ? refresh() : state.refresh()}>重试</button></p>}
    {saved ? <div className="qg-weng-assessment-result"><strong>本次已记录 · +{saved.deltaXp} XP</strong><p>{saved.reveal ? '未解出，记录了已看解答。' : saved.x === 1 ? '已记录答对。' : saved.pc > 0 ? `部分正确 ${Math.round(saved.pc * 100)}%。` : '已记录未完成 / 答错。'}{saved.h ? '使用了提示。' : ''}{saved.abilityFrozen ? '30 天内的首次能力记录保持不变。' : '本题已计入能力证据。'}同一次练习不重复提交。</p></div> : <>
      <div className="qg-weng-assessment-options" role="group" aria-label="本次自评结果">{[['correct', '答对'], ['wrong', '答错'], ['partial', '部分正确'], ['unsolved', '未解出']].map(([value, label]) => <button key={value} type="button" aria-pressed={effectiveOutcome === value} disabled={!ready || (seenAnswer && value !== 'unsolved')} onClick={() => setOutcome(value)}>{label}</button>)}</div>
      {effectiveOutcome === 'partial' && <label className="qg-weng-assessment-check">正确部分<input aria-label="部分正确百分比" type="number" min={1} max={99} step={1} value={partial} onChange={event => setPartial(event.target.value)} />%</label>}
      <label className="qg-weng-assessment-check"><input type="checkbox" checked={usedHint} disabled={Boolean(practice?.hintViewed || hintRevealed) || !ready} onChange={event => setManualHint(event.target.checked)} />使用过提示{practice?.hintViewed || hintRevealed ? '（已自动记录）' : ''}</label>
      {seenAnswer && <p>已查看解答。本次按「未解出」记录，不领取做题 XP；阅读本身不会提交成绩。</p>}
      <button type="button" className="qg-weng-assessment-submit" disabled={!ready || !effectiveOutcome} onClick={submit}>{state.syncing ? '正在同步…' : '提交本次自评'}</button>
      <p>首次全对才完成题目并领取 XP。提示会影响能力得分；30 天内重答保留首次能力证据，XP 不重复领取。</p>
    </>}
    {message && <p role="status">{message}{result?.abilityFrozen ? ' 本题处于 30 天能力冻结期。' : ''}</p>}
  </section>;
}
