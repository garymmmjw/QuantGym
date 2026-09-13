import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DailyQuestionText } from '../daily/DailyQuestionText.jsx';
import { completePracticeSession, createPracticeSession, editPracticeSession, practiceElapsed, setPracticeTimer } from './practiceModel.js';
import { TechnicalQuestionProvenance, TechnicalQuestionReference } from './TechnicalQuestionReference.jsx';
import './practice.css';

const labels = { independent: ['独立完成', 'Independent'], 'with-help': ['借助提示完成', 'With help'], review: ['需要复习', 'Needs review'] };
const duration = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function PracticeWorkspace({ state, update, language = 'zh', kind, sessions, draw, canDraw, sourceCount,
  sourceSummary, sourceMessage, sourceLink, sourceLinkLabel, onRetry, renderLibrary, drawLabel }) {
  const en = language === 'en', coding = kind === 'coding';
  const t = (zh, english) => en ? english : zh;
  const title = coding ? 'Coding OA' : 'Technical Interview';
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const questionTitle = useRef(null);
  const ordered = [...sessions].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const session = ordered.find(s => s.id === selectedId) || ordered.find(s => s.status === 'active') || ordered[0];
  const question = session?.question;
  const completed = session?.status === 'completed';
  const elapsed = session ? practiceElapsed(session, now) : 0;
  useEffect(() => {
    setNow(Date.now());
    if (!session?.timerStartedAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session?.id, session?.timerStartedAt]);

  function save(change) {
    let data;
    try {
      const result = update(latest => { data = change(latest); return data; });
      if (result?.ok === false) {
        setNotice(t('当前作答暂存在本页，请按上方提示重试保存或导出备份。', 'Your work is kept on this page. Retry saving or export a backup using the notice above.'));
        return { data, ok: false };
      }
      return { data, ok: true };
    } catch {
      setNotice(t('这次操作未能保存，请重试；已有记录仍然保留。', 'This change could not be saved. Please retry; existing records are kept.'));
      return { data: null, ok: false };
    }
  }

  function start(chosenQuestion = null, focusQuestion = false) {
    if (!canDraw) return false;
    const next = chosenQuestion || draw(question?.id || '');
    if (!next) return false;
    let created;
    try { created = createPracticeSession(kind, next); }
    catch { setNotice(t('这道题暂时无法载入，请重新抽取。', 'This question could not load. Please draw another.')); return false; }
    const saved = save(latest => {
      const paused = session ? setPracticeTimer(latest, session.id, false) : latest;
      return { ...paused, practiceSessions: [...(paused.practiceSessions || []), created] };
    });
    const selected = saved.data?.practiceSessions?.some(item => item.id === created.id);
    if (selected) {
      setSelectedId(created.id);
      if (chosenQuestion || focusQuestion) requestAnimationFrame(() => { questionTitle.current?.focus({ preventScroll: true }); questionTitle.current?.scrollIntoView({ block: 'start' }); });
    }
    if (saved.ok) setNotice('');
    return Boolean(selected);
  }
  const patch = value => save(latest => editPracticeSession(latest, session.id, value));
  const finish = () => {
    if (!session.text.trim() || !session.selfAssessment) return;
    const saved = save(latest => completePracticeSession(latest, session.id));
    if (saved.ok) setNotice(saved.data?.practiceSessions?.some(item => item.id === session.id && item.status === 'completed')
      ? t('已记录本题自评，训练日历已更新。', 'Self-review recorded and training calendar updated.')
      : t('练习状态已变化，请确认回答和自评后重试。', 'The practice state changed. Check your answer and assessment, then retry.'));
  };

  return <div className="practice-page">
    <header className="practice-header"><p className="practice-eyebrow">{coding ? 'SOLVE & REVISIT' : 'THINK & EXPLAIN'}</p><h1>{title}</h1>
      <p>{coding ? t('从做过的题里，再练一道。', 'Revisit one of the problems you have solved.') : t('从紫皮书抽一道题，把思路讲清楚。', 'Draw a Purple Book question and explain your reasoning.')}</p>
    </header>
    <div className="practice-source"><span>{sourceSummary}</span>{sourceLink && <Link to={sourceLink}>{sourceLinkLabel}</Link>}</div>
    {sourceMessage && <div className="practice-notice" role={onRetry ? 'alert' : 'status'}>{sourceMessage}{onRetry && <button type="button" onClick={onRetry}>{t('重试', 'Retry')}</button>}</div>}
    {renderLibrary?.({ onChoose: start, onDraw: () => start(null, true) })}
    {!session && notice && <p role="status" className="practice-notice">{notice}</p>}
    <div className="practice-grid">
      <section className="practice-main" aria-label={title}>
        {!session ? <div className="practice-start"><span className="practice-mark" aria-hidden="true">{coding ? '</>' : '∑'}</span>
          <h2>{t('专注这一道。', 'One question. Full focus.')}</h2>
          <p>{coding ? t('越久没做、已知练习次数越少的题，抽中的机会越大。', 'Problems practiced less often and less recently are more likely to be drawn.') : t('读题、推导、对照参考思路，再记录本次表现。', 'Read, reason, compare with the reference, and record your assessment.')}</p>
          <button type="button" className="practice-primary" disabled={!canDraw} onClick={() => start()}>{drawLabel || t('抽取一道题', 'Draw a question')} <span aria-hidden="true">↗</span></button>
          <small>{t(`当前可抽取 ${sourceCount} 道题`, `${sourceCount} questions available`)}</small>
        </div> : <>
          <div className="practice-question-top"><span>{coding ? 'LEETCODE' : t('紫皮书', 'PURPLE BOOK')}</span><div className="practice-timer"><time>{duration(elapsed)}</time>
            {!completed && <button type="button" onClick={() => { setNow(Date.now()); save(latest => setPracticeTimer(latest, session.id, !session.timerStartedAt)); }}>{session.timerStartedAt ? t('暂停计时', 'Pause timer') : t('开始计时', 'Start timer')}</button>}</div></div>
          <h2 ref={questionTitle} tabIndex={-1} className="practice-question-title">{en ? question.titleEn || question.title : question.title}</h2>
          {!coding && <TechnicalQuestionProvenance question={question} language={language} />}
          {coding ? <div className="practice-coding-link"><p>{t('前往力扣作答，回来记录你的解法与复盘。', 'Solve the problem on LeetCode, then return to record your solution and reflections.')}</p>
            <a className="practice-primary" href={question.url} target="_blank" rel="noreferrer">{t('去力扣挑战', 'Solve on LeetCode')} ↗</a></div>
            : <DailyQuestionText content={en ? question.promptEn || question.prompt : question.prompt} language={language} className="practice-question-text" />}
          <div className="practice-answer-heading"><label htmlFor={`practice-answer-${kind}`}>{coding ? t('你的代码与复盘', 'Your code and reflections') : t('你的思路与回答', 'Your reasoning and answer')}</label>
            {coding && <select aria-label={t('编程语言', 'Code language')} value={session.codeLanguage} disabled={completed} onChange={event => patch({ codeLanguage: event.target.value })}><option value="python">Python</option><option value="javascript">JavaScript</option><option value="cpp">C++</option></select>}</div>
          <textarea id={`practice-answer-${kind}`} className={coding ? 'practice-answer is-code' : 'practice-answer'} value={session.text} readOnly={completed} maxLength={80000}
            onChange={event => patch({ text: event.target.value })} spellCheck={!coding} placeholder={coding ? t('记录解法、复杂度和需要注意的边界…', 'Record your solution, complexity, and edge cases…') : t('写出假设、推导过程和结论…', 'Write your assumptions, reasoning, and conclusion…')} />
          <p className="practice-draft-note">{completed ? t('本次作答已完成。', 'This attempt is complete.') : t('作答草稿自动保存，可稍后继续。', 'Your draft is saved automatically so you can return later.')}</p>
          {!coding && <details key={session.id} className="practice-reference" open={session.reviewed} onToggle={event => { if (!completed && event.currentTarget.open !== session.reviewed) patch({ reviewed: event.currentTarget.open }); }}>
            <summary>{question.provenance?.answerStatus === 'missing' && !question.reference ? t('查看答案说明', 'View answer note') : t('查看参考思路', 'View reference reasoning')}</summary><TechnicalQuestionReference question={question} language={language} /></details>}
          <fieldset className="practice-assessments" disabled={completed}><legend>{t('本次自评', 'Self-assessment')}</legend><div>{Object.entries(labels).map(([value, label]) => <label key={value} className={session.selfAssessment === value ? 'is-selected' : ''}>
            <input type="radio" name={`practice-assessment-${session.id}`} checked={session.selfAssessment === value} onChange={() => patch({ selfAssessment: value })} />{label[en ? 1 : 0]}</label>)}</div></fieldset>
          <div className="practice-actions">{!completed && <button type="button" className="practice-primary" disabled={!session.text.trim() || !session.selfAssessment} onClick={finish}>{t('完成本题', 'Complete question')}</button>}
            <button type="button" className="practice-secondary" disabled={!canDraw} onClick={() => start()}>{drawLabel || t('再抽一道', 'Draw another')}</button></div>
          <p className="practice-notice" role="status">{notice || (completed ? t('✓ 本题已记录到训练日历。', '✓ Recorded in your training calendar.') : t('填写回答并选择自评后，才会记录为完成。', 'Write an answer and choose a self-assessment to record completion.'))}</p>
        </>}
      </section>
      <aside className="practice-history" aria-label={t('历史记录', 'Practice history')}><p className="practice-eyebrow">YOUR PRACTICE</p><h2>{t('历史记录', 'Practice history')}</h2>
        <p>{t(`${ordered.filter(s => s.status === 'completed').length} 次已完成`, `${ordered.filter(s => s.status === 'completed').length} completed attempts`)}</p>
        {!ordered.length ? <p className="practice-empty-history">{t('完成第一道题，开始积累你的练习记录。', 'Complete your first question to begin your practice history.')}</p>
          : <ol>{ordered.map(item => <li key={item.id}><button type="button" className={item.id === session?.id ? 'is-selected' : ''} aria-current={item.id === session?.id ? 'true' : undefined}
            onClick={() => { const saved = session && session.id !== item.id ? save(latest => setPracticeTimer(latest, session.id, false)) : { ok: true }; setSelectedId(item.id); if (saved.ok) setNotice(''); }}>
            <strong>{item.question.provenance?.originalNumber && `${item.question.provenance.originalNumber} · `}{en ? item.question.titleEn || item.question.title : item.question.title}</strong><span>{new Date(item.startedAt).toLocaleDateString(en ? 'en-US' : 'zh-CN')} · {item.status === 'completed' ? labels[item.selfAssessment][en ? 1 : 0] : t('继续练习', 'Resume')}</span></button></li>)}</ol>}
        <Link to="/calendar">{t('查看训练日历', 'View training calendar')} ↗</Link>
      </aside>
    </div>
  </div>;
}
