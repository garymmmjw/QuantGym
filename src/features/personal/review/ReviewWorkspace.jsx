import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DailyQuestionText } from '../daily/DailyQuestionText.jsx';
import { appendReviewEvent, createReviewEvent, getReviewQueue, nextReviewDate } from './reviewEngine.js';
import './review.css';

const LABELS = { tech: 'Tech interview', coding: 'Coding OA', behavioral: 'Behavioral' };

export function ReviewWorkspace({ state = {}, update, language = 'zh' }) {
  const en = language === 'en';
  const t = (zh, english) => en ? english : zh;
  const [now, setNow] = useState(Date.now);
  const [filter, setFilter] = useState('due');
  const [selectedKey, setSelectedKey] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [revealed, setRevealed] = useState({});
  const [notice, setNotice] = useState(null);
  const [savingFailed, setSavingFailed] = useState(false);
  const pendingEvent = useRef(null);
  const [params] = useSearchParams();
  const requestedQuestion = params.get('question') || '';
  const handledLink = useRef({ question: null, selected: false });
  const queue = useMemo(() => getReviewQueue(state, now), [state, now]);
  const dueCount = queue.filter(item => item.due).length;
  const items = filter === 'due' ? queue.filter(item => item.due) : queue;
  const selected = items.find(item => item.questionKey === selectedKey) || items[0] || null;
  const key = selected ? `${selected.session.id}:${selected.questionKey}` : '';
  const draft = drafts[key] || '';
  const answerRevealed = Boolean(revealed[key]);
  const date = value => new Date(value).toLocaleDateString(en ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    if (handledLink.current.question !== requestedQuestion) {
      handledLink.current = { question: requestedQuestion, selected: false };
      setSelectedKey(null);
      setFilter('due');
    }
    if (!requestedQuestion || handledLink.current.selected) return;
    const target = queue.find(item => item.questionKey === requestedQuestion);
    if (!target) return; // Cloud records can arrive after the route has opened.
    setSelectedKey(target.questionKey);
    setFilter(target.due ? 'due' : 'all');
    handledLink.current.selected = true;
  }, [requestedQuestion, queue]);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  const savePending = () => {
    const pending = pendingEvent.current;
    if (!pending) return;
    try {
      const result = update(latest => {
        const next = appendReviewEvent(latest, pending.event);
        // A failed disk write may already have kept this event in memory.
        return next === latest ? { ...latest } : next;
      });
      if (result?.ok === false) throw new Error('storage');
      setNotice({ text: t(`已记录复习，下次安排在 ${date(nextReviewDate(pending.event.reviewedAt, pending.event.rating))}。`, `Review recorded. Next review: ${date(nextReviewDate(pending.event.reviewedAt, pending.event.rating))}.`) });
      setDrafts(previous => ({ ...previous, [pending.key]: '' }));
      setRevealed(previous => ({ ...previous, [pending.key]: false }));
      setSelectedKey(null);
      setSavingFailed(false);
      pendingEvent.current = null;
      setNow(Date.now());
    } catch {
      setSavingFailed(true);
      setNotice({ error: true, text: t('这次复习尚未保存到浏览器。请保留此页并重试，或导出备份。', 'This review is not saved to the browser. Keep this tab open and retry, or export a backup.') });
    }
  };

  const rate = rating => {
    if (!selected || !answerRevealed || pendingEvent.current) return;
    pendingEvent.current = { key, event: createReviewEvent(selected.questionKey, rating, draft) };
    savePending();
  };

  return <section className="personal-review" aria-labelledby="pr-title">
    <header className="pr-header"><div><p className="pr-eyebrow">RECALL & REVIEW</p><h1 id="pr-title">{t('复习清单', 'Review queue')}</h1><p>{t('先回忆，再对照。把没掌握的题，练到能独立讲清。', 'Recall first, then compare. Revisit questions until you can explain them independently.')}</p></div><Link className="pr-link" to="/daily-mock">Daily Mock <span aria-hidden="true">↗</span></Link></header>

    <div className="pr-toolbar"><div className="pr-filters" role="group" aria-label={t('复习范围', 'Review filter')}><button type="button" aria-pressed={filter === 'due'} onClick={() => { setFilter('due'); setSelectedKey(null); }}>{t('待复习', 'Due')} <span>{dueCount}</span></button><button type="button" aria-pressed={filter === 'all'} onClick={() => { setFilter('all'); setSelectedKey(null); }}>{t('全部', 'All')} <span>{queue.length}</span></button></div><span className="pr-schedule-hint">{t('明天 · 3 天后 · 7 天后', 'Tomorrow · In 3 days · In 7 days')}</span></div>
    {notice && <div className={`pr-notice${notice.error ? ' is-error' : ''}`} role={notice.error ? 'alert' : 'status'}><span>{notice.text}</span>{savingFailed && <button type="button" onClick={savePending}>{t('重试保存这次复习', 'Retry saving this review')}</button>}</div>}

    {!items.length ? <div className="pr-empty"><span aria-hidden="true">✓</span><h2>{queue.length ? t('今天的复习已完成', 'You are up to date') : t('从一次真实练习开始', 'Start with a real practice session')}</h2><p>{queue.length ? t(`接下来的一题安排在 ${date(queue[0].dueAt)}。也可以切换「全部」提前复习。`, `Your next question is due on ${date(queue[0].dueAt)}. Choose All to review early.`) : t('在 Daily Mock 中完成题目并标记「借助提示完成」或「需要复习」，它会自动进入这里。', 'Complete a Daily Mock question and mark it With help or Needs review. It will appear here automatically.')}</p><Link className="pr-link" to="/daily-mock">{t('去 Daily Mock 练习', 'Practice in Daily Mock')} →</Link></div> : <div className="pr-workspace">
      <nav className="pr-queue" aria-label={t('复习题目', 'Review questions')}>
        {items.map(item => <button type="button" key={item.questionKey} className={item.questionKey === selected.questionKey ? 'is-selected' : ''} aria-current={item.questionKey === selected.questionKey ? 'true' : undefined} onClick={() => setSelectedKey(item.questionKey)}><span>{LABELS[item.question.kind] || item.question.kind}</span><strong>{en ? item.question.titleEn || item.question.title : item.question.title}</strong><small>{item.due ? t('现在可复习', 'Due now') : date(item.dueAt)} · {item.lastReview ? t(`已复习 ${item.reviewCount} 次`, `${item.reviewCount} reviews`) : t('首次复习', 'First review')}</small></button>)}
      </nav>
      <article className="pr-question" aria-labelledby="pr-question-title" key={key}>
        <div className="pr-question-meta"><span>{LABELS[selected.question.kind]}</span><Link to={selected.href}>{t('查看原练习', 'View original session')} ↗</Link></div>
        <h2 id="pr-question-title">{en ? selected.question.titleEn || selected.question.title : selected.question.title}</h2>
        <DailyQuestionText className="pr-prompt" content={en ? selected.question.promptEn || selected.question.prompt : selected.question.prompt} language={language} />
        {selected.question.examples?.length > 0 && <div className="pr-examples">{selected.question.examples.map((example, index) => <pre key={index}><code>{example.input}{'\n'}→ {example.output}</code></pre>)}</div>}
        {selected.question.constraints?.length > 0 && <p className="pr-constraints">{selected.question.constraints.join(' · ')}</p>}
        <div className="pr-recall"><label htmlFor="pr-recall-answer">{t('这一次，我会怎么回答？', 'How would you answer this time?')}</label><p>{t('可以写下新思路，也可以先口头作答。选择复习结果时，会保存这里的内容。', 'Write a fresh answer or practice aloud. Your text is saved when you choose a review result.')}</p><textarea id="pr-recall-answer" value={draft} maxLength={20000} onChange={event => setDrafts(previous => ({ ...previous, [key]: event.target.value }))} spellCheck={selected.question.kind !== 'coding'} placeholder={selected.question.kind === 'coding' ? t('先独立写出解法和边界条件…', 'Recall the solution and edge cases…') : t('先写出结论、关键假设和推导…', 'Recall the conclusion, assumptions, and reasoning…')} /></div>
        {!answerRevealed ? <button type="button" className="pr-primary" onClick={() => setRevealed(previous => ({ ...previous, [key]: true }))}>{t('回忆好了，对照答案', 'Reveal answer and compare')}</button> : <div className="pr-revealed">
          <section className="pr-reference" aria-labelledby="pr-reference-title"><h3 id="pr-reference-title">{selected.question.kind === 'behavioral' ? t('自评要点', 'Review criteria') : t('参考答案', 'Reference answer')}</h3>{selected.question.kind === 'coding' ? <><p className="pr-code-language">{selected.answer.codeLanguage || 'python'}</p><pre><code>{selected.question.solutions?.[selected.answer.codeLanguage || 'python'] || t('这道题的原记录没有该语言的参考解法。', 'No reference solution in this language was saved with the question.')}</code></pre>{selected.question.complexity && <p>{selected.question.complexity}</p>}</> : <DailyQuestionText content={en ? selected.question.referenceEn || selected.question.reference : selected.question.reference} language={language} />}</section>
          <details className="pr-original"><summary>{t('查看上一次的回答', 'View your original answer')} · {date(selected.answer.completedAt)}</summary><p className="pr-original-label">{selected.answer.selfAssessment === 'review' ? t('当时自评：需要复习', 'Original assessment: Needs review') : t('当时自评：借助提示完成', 'Original assessment: With help')}</p><pre>{selected.answer.text}</pre></details>
          {selected.lastReview && <details className="pr-original"><summary>{t('上一次复习笔记', 'Last review note')} · {date(selected.lastReview.reviewedAt)}</summary><pre>{selected.lastReview.note || t('这次复习没有文字笔记。', 'No written note for this review.')}</pre></details>}
          <fieldset className="pr-ratings" disabled={savingFailed}><legend>{t('这次掌握得怎么样？', 'How well did you recall it?')}</legend><p>{t('这是你的自评，不是自动判分。原练习中的回答会保留。', 'This is your self-assessment. Your original answer remains unchanged.')}</p><div><button type="button" onClick={() => rate('again')}><strong>{t('还需再练', 'Again')}</strong><span>{t('明天再来', 'Tomorrow')}</span></button><button type="button" onClick={() => rate('good')}><strong>{t('基本掌握', 'Good')}</strong><span>{t('3 天后', 'In 3 days')}</span></button><button type="button" onClick={() => rate('easy')}><strong>{t('独立讲清', 'Easy')}</strong><span>{t('7 天后', 'In 7 days')}</span></button></div></fieldset>
        </div>}
      </article>
    </div>}
    <footer className="pr-footer">{t('同一道题只保留一个复习安排。新的薄弱作答会重新进入待复习；复习笔记单独保存。日期按设备本地时区计算。', 'Each question has one review schedule. A new difficult attempt makes it due again. Review notes are saved separately; dates use your device’s local time.')}</footer>
  </section>;
}
