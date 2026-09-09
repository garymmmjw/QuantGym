import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MentalMathTrainer } from '../mental/MentalMathTrainer.jsx';
import { DailyQuestionText } from './DailyQuestionText.jsx';
import {
  normalizeDailySettings, hasDailySections, dailyBudgetSeconds, createDailySession,
  getDailyProgress, getQuestionElapsed, updateDailyAnswer, completeDailyQuestion,
  setDailyQuestionTimer, completeDailyMental, preferredDailySession, getLibraryTechQuestions,
} from './dailyEngine.js';
import './daily.css';

const KINDS = ['tech', 'coding', 'behavioral'];
const LABELS = { mental: 'Mental math', tech: 'Tech interview', coding: 'Coding OA', behavioral: 'Behavioral' };
const ASSESSMENTS = {
  independent: ['独立完成', 'Independent'],
  'with-help': ['借助提示完成', 'With help'],
  review: ['需要复习', 'Needs review'],
};
const duration = seconds => {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

function NumberInput({ value, onCommit, min, max, ...props }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <input {...props} type="number" min={min} max={max} value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => {
    const entered = draft.trim() === '' ? value : Number(draft);
    const next = Math.max(Number(min), Math.min(Number(max), Math.round(Number.isFinite(entered) ? entered : value)));
    setDraft(String(next));
    onCommit(next);
  }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />;
}

export function DailyMockWorkspace({ state, update, language = 'zh', legacyState }) {
  const en = language === 'en';
  const t = (zh, english) => en ? english : zh;
  const settings = normalizeDailySettings(state.dailySettings);
  const sessions = state.dailySessions || [];
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState('');
  const preferred = preferredDailySession(sessions);
  const session = sessions.find(item => item.id === selectedSessionId) || preferred;
  const progress = getDailyProgress(session);
  const libraryCount = useMemo(() => getLibraryTechQuestions(legacyState?.problems).length, [legacyState?.problems]);
  const defaultQuestion = session?.settings.mentalEnabled && !session?.mentalCompletedAt ? 'mental' : session?.questions.find(question => !session.answers?.[question.id]?.completedAt)?.id || (session?.settings.mentalEnabled ? 'mental' : session?.questions[0]?.id);
  const selected = selectedQuestionId === 'mental' && session?.settings.mentalEnabled || session?.questions.some(question => question.id === selectedQuestionId) ? selectedQuestionId : defaultQuestion;
  const question = session?.questions.find(item => item.id === selected);
  const answer = question ? session.answers?.[question.id] || {} : {};
  const elapsed = getQuestionElapsed(answer, now);

  useEffect(() => { setNotice(''); }, [session?.id, selected]);

  useEffect(() => {
    if (!answer.timerStartedAt) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [answer.timerStartedAt]);

  useEffect(() => {
    // A completed trial can precede a navigation/reload before its callback ran.
    // Recover from the persisted trial, without counting a partial/aborted run.
    for (const active of sessions) {
      if (active.status !== 'active' || !active.settings.mentalEnabled || active.mentalCompletedAt) continue;
      const trial = (state.trials || []).find(item => item.dailySessionId === active.id && item.status === 'completed');
      if (trial) update(latest => completeDailyMental(latest, active.id, trial));
    }
  }, [sessions, state.trials, update]);

  const onMentalComplete = useCallback(trial => {
    if (trial?.status === 'completed' && trial.dailySessionId) update(latest => completeDailyMental(latest, trial.dailySessionId, trial));
  }, [update]);

  const patchSettings = patch => update(latest => ({ ...latest, dailySettings: normalizeDailySettings({ ...latest.dailySettings, ...patch }) }));
  const startSession = () => {
    if (!hasDailySections(settings)) return;
    const created = createDailySession(settings, { problems: legacyState?.problems });
    update(latest => ({ ...latest, dailySettings: settings, dailySessions: [...(latest.dailySessions || []), created] }));
    setSelectedSessionId(created.id);
    setSelectedQuestionId(created.settings.mentalEnabled ? 'mental' : created.questions[0]?.id);
    setShowSetup(false);
    setNotice('');
  };
  const patchAnswer = patch => update(latest => updateDailyAnswer(latest, session.id, question.id, patch));
  const finishQuestion = () => {
    if (!answer.text?.trim() || !answer.selfAssessment) return;
    update(latest => completeDailyQuestion(latest, session.id, question.id));
    setNotice(t('已记录自评，训练日历已更新。', 'Self-review recorded and training calendar updated.'));
  };
  const nextIncomplete = () => {
    const next = session.questions.find(item => item.id !== selected && !session.answers?.[item.id]?.completedAt);
    setSelectedQuestionId(next?.id || (session.settings.mentalEnabled && !session.mentalCompletedAt ? 'mental' : selected));
    setNotice('');
  };

  return <div className="personal-daily">
    <header className="pd-page-header">
      <div><p className="pd-eyebrow">YOUR APPLICATION ROUTINE</p><h1>Daily mock</h1><p className="pd-subtitle">{t('每天一套，练习完整的申请面试流程。', 'One routine to practice the full interview process.')}</p></div>
      {session && <button className="pd-secondary" type="button" onClick={() => setShowSetup(value => !value)}>{showSetup ? t('返回训练', 'Back to practice') : t('配置新一轮', 'Set up a new round')}</button>}
    </header>

    {(!session || showSetup) && <section className="pd-setup" aria-labelledby="pd-setup-title">
      <div className="pd-section-heading"><div><h2 id="pd-setup-title">{t('定制今日练习', 'Build your daily session')}</h2><p>{t('调整题量与时间预算。开始后题目固定，作答自动保留。', 'Adjust counts and time budgets. Questions stay fixed after you start; answers are saved as you type.')}</p></div><span className="pd-budget">{t('预计', 'Budget')} {Math.round(dailyBudgetSeconds(settings) / 60)} {t('分钟', 'min')}</span></div>
      <div className="pd-settings-grid">
        <div className="pd-setting-row"><label className="pd-mental-toggle"><input type="checkbox" checked={settings.mentalEnabled} onChange={event => patchSettings({ mentalEnabled: event.target.checked })} /><span><strong>Mental math</strong><small>{t('一轮限时心算', 'One timed arithmetic round')}</small></span></label><label className="pd-number-field"><span>{t('时长 / 秒', 'Duration / sec')}</span><NumberInput min="30" max="600" step="30" value={settings.mentalSeconds} disabled={!settings.mentalEnabled} onCommit={value => patchSettings({ mentalSeconds: value })} /></label></div>
        {KINDS.map(kind => <div className="pd-setting-row" key={kind}><div className="pd-setting-label"><strong>{LABELS[kind]}</strong><small>{kind === 'tech' ? t('讲清思路与推导', 'Explain your reasoning') : kind === 'coding' ? t('编写代码并自评', 'Write code and self-review') : t('使用你的真实经历', 'Use your own experience')}</small></div><div className="pd-setting-controls"><label className="pd-number-field"><span>{t('题数', 'Questions')}</span><NumberInput min="0" max="8" value={settings[`${kind}Count`]} onCommit={value => patchSettings({ [`${kind}Count`]: value })} /></label><label className="pd-number-field"><span>{t('每题 / 分钟', 'Minutes / question')}</span><NumberInput min="1" max="120" value={settings[`${kind}Minutes`]} disabled={settings[`${kind}Count`] === 0} onCommit={value => patchSettings({ [`${kind}Minutes`]: value })} /></label></div></div>)}
      </div>
      <div className="pd-source-row"><label><span>{t('Tech 题目来源', 'Tech question source')}</span><select value={settings.techSource} onChange={event => patchSettings({ techSource: event.target.value })}><option value="library">{t('优先使用我的题库', 'My question library first')}</option><option value="practice">{t('内置基础练习', 'Built-in fundamentals')}</option></select></label><p>{settings.techSource === 'library' ? t(`已找到 ${libraryCount} 道带解答的可用技术题，不足时以基础练习补齐。`, `${libraryCount} eligible technical questions with answers; fundamentals fill any shortfall.`) : t('从概率、统计、研究方法等基础题中抽取。', 'Draw from probability, statistics, and research fundamentals.')}</p></div>
      <div className="pd-setup-footer"><p>{!hasDailySections(settings) ? t('请至少启用一个板块。', 'Enable at least one section.') : session?.status === 'active' ? t('当前未完成的练习会保留，可在历史记录中继续。', 'Your unfinished round is kept and can be resumed from history.') : t('可自由切换板块；完成一题就记录一次。', 'Move between sections freely. Each finished question is recorded.')}</p><button className="pd-primary" type="button" disabled={!hasDailySections(settings)} onClick={startSession}>{t('开始这一轮', 'Start this round')} <span aria-hidden="true">→</span></button></div>
    </section>}

    {session && !showSetup && <>
      <section className={`pd-session-summary ${progress.complete ? 'pd-session-completed' : ''}`} aria-label={t('本轮进度', 'Session progress')}>
        <div><span className="pd-session-date">{session.dateKey}</span><h2>{progress.complete ? t('今日练习，完成。', 'Daily practice, complete.') : t('专注下一道题。', 'Focus on the next question.')}</h2><p>{progress.complete ? t('各题自评和训练记录已保存，可在日历查看。', 'Your self-reviews and training records are saved in the calendar.') : t('不必一次做完，刷新或离开后可以继续。', 'You can return after a refresh or pick up where you left off.')}</p></div>
        <div className="pd-progress"><strong>{progress.completed}<span> / {progress.total}</span></strong><span>{t('项已完成', 'items complete')}</span><progress max={progress.total || 1} value={progress.completed} aria-label={t('完成进度', 'Completion progress')} /></div>
      </section>
      <div className="pd-workspace-grid">
        <nav className="pd-question-nav" aria-label={t('本轮训练项目', 'Session sections')}>
          {session.settings.mentalEnabled && <button type="button" aria-current={selected === 'mental' ? 'step' : undefined} className={selected === 'mental' ? 'pd-nav-item pd-nav-active' : 'pd-nav-item'} onClick={() => { setSelectedQuestionId('mental'); setNotice(''); }}><span className={`pd-step-dot ${session.mentalCompletedAt ? 'pd-step-done' : ''}`}>{session.mentalCompletedAt ? '✓' : 'M'}</span><span><strong>Mental math</strong><small>{duration(session.settings.mentalSeconds)} · {session.mentalCompletedAt ? t('已完成', 'Complete') : t('待完成', 'Pending')}</small></span></button>}
          {KINDS.map(kind => {
            const questions = session.questions.filter(item => item.kind === kind);
            if (!questions.length) return null;
            return <div className="pd-nav-group" key={kind}><p>{LABELS[kind]} <span>{questions.filter(item => session.answers?.[item.id]?.completedAt).length}/{questions.length}</span></p>{questions.map((item, index) => {
              const done = Boolean(session.answers?.[item.id]?.completedAt);
              return <button type="button" className={`pd-nav-item ${selected === item.id ? 'pd-nav-active' : ''}`} aria-current={selected === item.id ? 'step' : undefined} key={item.id} onClick={() => { setSelectedQuestionId(item.id); setNotice(''); }}><span className={`pd-step-dot ${done ? 'pd-step-done' : ''}`}>{done ? '✓' : String(index + 1).padStart(2, '0')}</span><span><strong>{en ? item.titleEn || item.title : item.title}</strong><small>{done ? t('已完成', 'Complete') : session.answers?.[item.id]?.text ? t('草稿已保留', 'Draft saved') : `${item.budgetSeconds / 60} ${t('分钟', 'min')}`}</small></span></button>;
            })}</div>;
          })}
        </nav>
        <div className="pd-content">
          {selected === 'mental' && <section className="pd-mental-panel"><div className="pd-section-heading"><div><span className="pd-eyebrow">MENTAL MATH</span><h2>{t('先找到你的节奏', 'Find your rhythm')}</h2><p>{t(`本轮 ${session.settings.mentalSeconds} 秒。计时结束后，本板块自动完成。`, `This round lasts ${session.settings.mentalSeconds} seconds. The section completes when its timer ends.`)}</p></div>{session.mentalCompletedAt && <span className="pd-complete-label">✓ {t('已完成', 'Complete')}</span>}</div>{session.mentalCompletedAt ? <div className="pd-mental-finished"><strong>{t('这一轮心算已记录。', 'This mental math round is recorded.')}</strong><p>{t('Attempt 成绩趋势和完整逐题用时可以在 Mental math 页面查看。', 'See attempt progress and per-question timing on the Mental math page.')}</p>{!progress.complete && <button type="button" className="pd-primary" onClick={nextIncomplete}>{t('继续下一项', 'Continue to the next item')} →</button>}</div> : <MentalMathTrainer key={session.id} state={state} update={update} language={language} dailySessionId={session.id} durationSeconds={session.settings.mentalSeconds} onComplete={onMentalComplete} />}</section>}
          {question && <section className="pd-question-panel" aria-labelledby="pd-question-title">
            <div className="pd-question-top"><span className="pd-eyebrow">{LABELS[question.kind].toUpperCase()}</span><div className={`pd-timer ${elapsed > question.budgetSeconds && !answer.completedAt ? 'pd-timer-over' : ''}`}><span>{duration(elapsed)} <small>/ {duration(question.budgetSeconds)}</small></span>{!answer.completedAt && <button type="button" aria-label={answer.timerStartedAt ? t('暂停本题计时', 'Pause question timer') : t('开始本题计时', 'Start question timer')} onClick={() => { setNow(Date.now()); update(latest => setDailyQuestionTimer(latest, session.id, question.id, !answer.timerStartedAt)); }}>{answer.timerStartedAt ? t('暂停', 'Pause') : elapsed > 0 ? t('继续计时', 'Resume') : t('开始计时', 'Start timer')}</button>}</div></div>
            <h2 id="pd-question-title">{en ? question.titleEn || question.title : question.title}</h2>
            <DailyQuestionText className="pd-prompt" content={en ? question.promptEn || question.prompt : question.prompt} language={language} />
            {question.source === 'library' && <p className="pd-source-note">{t('来自我的题库', 'From my question library')}{question.sourceLabel ? ` · ${question.sourceLabel}` : ''}{question.sourceUrl && <> · <a href={question.sourceUrl} target="_blank" rel="noreferrer">{t('原题出处 ↗', 'Source ↗')}</a></>}</p>}
            {question.examples && <div className="pd-examples">{question.examples.map((example, index) => <div key={index}><strong>{t('示例', 'Example')} {index + 1}</strong><code>{example.input}</code><code>→ {example.output}</code></div>)}</div>}
            {question.constraints && <p className="pd-constraints"><strong>{t('约束', 'Constraints')}: </strong>{question.constraints.join(' · ')}</p>}
            <div className="pd-answer-heading"><label htmlFor="pd-answer">{question.kind === 'coding' ? t('你的代码', 'Your code') : t('你的思路与回答', 'Your reasoning and answer')}</label>{question.kind === 'coding' && <select aria-label={t('编程语言', 'Code language')} value={answer.codeLanguage || 'python'} disabled={Boolean(answer.completedAt)} onChange={event => patchAnswer({ codeLanguage: event.target.value })}><option value="python">Python</option><option value="javascript">JavaScript</option><option value="cpp">C++</option></select>}{answer.text && <span className="pd-draft-label">{answer.completedAt ? t('已完成', 'Completed') : t('自动保留草稿', 'Draft retained automatically')}</span>}</div>
            {question.kind === 'coding' && <p className="pd-code-note">{t('写出函数与边界处理，再对照示例自查。本页不运行代码，也不提供在线判题。', 'Write a function and handle edge cases, then check the examples. This page does not execute or judge code.')}</p>}
            <textarea id="pd-answer" className={question.kind === 'coding' ? 'pd-answer pd-code-answer' : 'pd-answer'} spellCheck={question.kind !== 'coding'} value={answer.text || ''} readOnly={Boolean(answer.completedAt)} onChange={event => { patchAnswer({ text: event.target.value }); setNotice(''); }} placeholder={question.kind === 'coding' ? t('在这里输入你的解法…', 'Write your solution here…') : question.kind === 'behavioral' ? t('背景与目标 → 我的行动 → 结果 → 反思…', 'Context and goal → my actions → result → reflection…') : t('写出假设、推导过程和结论…', 'State your assumptions, reasoning, and conclusion…')} />
            <details className="pd-reference" open={Boolean(answer.reviewed)} onToggle={event => { if (!answer.completedAt && event.currentTarget.open !== Boolean(answer.reviewed)) patchAnswer({ reviewed: event.currentTarget.open }); }}><summary>{question.kind === 'behavioral' ? t('查看自评要点', 'View review criteria') : t('查看参考答案', 'View reference answer')}</summary><div>{question.kind === 'coding' ? <><pre><code>{question.solutions?.[answer.codeLanguage || 'python']}</code></pre><p className="pd-complexity">{question.complexity}</p></> : <DailyQuestionText className="pd-reference-text" content={en ? question.referenceEn || question.reference : question.reference} language={language} />}</div></details>
            <fieldset className="pd-self-review" disabled={Boolean(answer.completedAt)}><legend>{t('自评', 'Self-review')} <span>{t('记录本次表现，不是自动评分', 'Your assessment, not an automatic grade')}</span></legend><div>{Object.entries(ASSESSMENTS).map(([value, labels]) => <label key={value} className={answer.selfAssessment === value ? 'pd-assessment pd-assessment-selected' : 'pd-assessment'}><input type="radio" name={`pd-review-${session.id}-${question.id}`} value={value} checked={answer.selfAssessment === value} onChange={() => patchAnswer({ selfAssessment: value })} />{labels[en ? 1 : 0]}</label>)}</div></fieldset>
            <div className="pd-answer-footer"><p role="status">{notice || (answer.completedAt ? t('✓ 本题已完成并计入日历。', '✓ Completed and recorded in your calendar.') : !answer.text?.trim() ? t('填写回答并选择自评后，可标记完成。', 'Write an answer and select a self-review to complete this question.') : !answer.selfAssessment ? t('请选择本次自评。', 'Choose your self-review.') : elapsed > question.budgetSeconds ? t('已超出预算，仍可继续作答。', 'You are over the time budget; you can keep working.') : '')}</p>{answer.completedAt ? !progress.complete && <button type="button" className="pd-primary" onClick={nextIncomplete}>{t('下一项', 'Next item')} →</button> : <button type="button" className="pd-primary" disabled={!answer.text?.trim() || !answer.selfAssessment} onClick={finishQuestion}>{t('标记已完成', 'Mark complete')} ✓</button>}</div>
          </section>}
        </div>
      </div>
    </>}

    {sessions.length > 0 && <details className="pd-history"><summary>{t('训练记录', 'Session history')} <span>{sessions.length}</span></summary><div className="pd-history-list">{[...sessions].reverse().map(item => {
      const itemProgress = getDailyProgress(item);
      return <button type="button" key={item.id} className={`pd-history-row ${item.id === session?.id ? 'pd-history-selected' : ''}`} onClick={() => { setSelectedSessionId(item.id); setSelectedQuestionId(null); setShowSetup(false); setNotice(''); }}><span><strong>{item.dateKey}</strong><small>{new Date(item.startedAt).toLocaleTimeString(en ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' })}</small></span><span>{itemProgress.completed}/{itemProgress.total} {t('项', 'items')}</span><span>{itemProgress.complete ? t('查看记录', 'View record') : t('继续练习', 'Resume')} →</span></button>;
    })}</div></details>}
  </div>;
}
