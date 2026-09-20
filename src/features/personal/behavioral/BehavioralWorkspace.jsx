import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BEHAVIORAL_PREP_QUESTIONS, getBehavioralAnswer } from './questions.js';
import { completeBehavioralPractice, hasExplicitCompletion, hasPersonalBehavioralAnswer } from '../completionActivities.js';
import { localDayKey } from '../calendar/calendarModel.js';
import './behavioral.css';

export function BehavioralWorkspace({ state, update, language }) {
  const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState('');
  const [today, setToday] = useState(() => localDayKey());
  useEffect(() => {
    const refreshDay = () => setToday(localDayKey());
    const timer = window.setInterval(refreshDay, 60000);
    window.addEventListener('focus', refreshDay);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshDay); };
  }, []);
  const en = language === 'en';
  const t = (zh, english) => en ? english : zh;
  const question = BEHAVIORAL_PREP_QUESTIONS.find(item => item.id === params.get('question')) || BEHAVIORAL_PREP_QUESTIONS.at(-1);
  const answers = state.behavioralAnswers || [];
  const answer = getBehavioralAnswer(question, answers);
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const started = BEHAVIORAL_PREP_QUESTIONS.filter(item => hasPersonalBehavioralAnswer(state, item)).length;
  const canComplete = hasPersonalBehavioralAnswer(state, question);
  const completedToday = hasExplicitCompletion(state, 'behavioral', question.id, today);

  const editAnswer = (text) => {
    update(current => ({ ...current, behavioralAnswers: [
      ...(current.behavioralAnswers || []).filter(item => item.id !== question.id),
      { id: question.id, text, updatedAt: new Date().toISOString() },
    ] }));
    setNotice('');
  };

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setNotice(t('回答已复制。', 'Answer copied.'));
    } catch {
      setNotice(t('无法自动复制，请选中回答文字后复制。', 'Could not copy automatically. Select the answer text and copy it.'));
    }
  };

  const complete = () => {
    try {
      const result = update(current => completeBehavioralPractice(current, question));
      setNotice(result?.ok === false
        ? t('本次完成记录暂存在本页，请按上方提示重试保存。', 'This completion is kept on this page. Retry saving using the notice above.')
        : t('本次练习已完成，同一天同一道题只计一次。', 'Practice completed. The same question counts once per day.'));
    } catch {
      setNotice(t('请先写下并保存你自己的回答，再确认完成。', 'Write and save your own answer before confirming completion.'));
    }
  };

  return <div className="behavioral-prep">
    <header className="bp-heading">
      <div><p className="bp-eyebrow">INTERVIEW PREPARATION</p><h1>Behavioral Interview</h1><p className="bp-subtitle">{t('整理你的经历，练出自然、有重点的回答。', 'Turn your experiences into clear, natural answers.')}</p></div>
      <p className="bp-progress"><strong>{started} <span>/ {BEHAVIORAL_PREP_QUESTIONS.length}</span></strong>{t('题已有草稿', 'answers started')}</p>
    </header>

    <div className="bp-layout">
      <nav className="bp-question-list" aria-label={t('Behavioral 问题列表', 'Behavioral questions')}>
        {[
          { id: 'general', number: '01', title: 'General questions', subtitle: t('通用问题 · 5 道', 'Every interview · 5 questions') },
          { id: 'company', number: '02', title: 'Company-specific questions', subtitle: 'Bank of America · BofA' },
        ].map(section => <section className="bp-section" key={section.id} aria-labelledby={`bp-section-${section.id}`}>
          <div className="bp-section-heading"><span>{section.number}</span><div><h2 id={`bp-section-${section.id}`}>{section.title}</h2><p>{section.subtitle}</p></div></div>
          {BEHAVIORAL_PREP_QUESTIONS.filter(item => item.section === section.id).map((item, index) => <button
            className={`bp-question${question.id === item.id ? ' is-active' : ''}`} type="button" key={item.id}
            aria-current={question.id === item.id ? 'true' : undefined}
            onClick={() => { setParams(previous => { const next = new URLSearchParams(previous); next.set('question', item.id); return next; }); setNotice(''); }}
          ><span className="bp-question-number">{String(index + 1).padStart(2, '0')}</span><span>{item.label}</span><span className={`bp-draft-dot${hasPersonalBehavioralAnswer(state, item) ? ' has-draft' : ''}`} aria-label={hasPersonalBehavioralAnswer(state, item) ? t('已有草稿', 'Draft started') : t('待准备', 'To prepare')} /></button>)}
        </section>)}
        <p className="bp-list-note">{t('通用题用真实经历；公司题把你的动机与具体业务连接起来。', 'Use real experiences for general questions. Connect your motivation to the business for company questions.')}</p>
      </nav>

      <article className="bp-editor" key={question.id} aria-labelledby="bp-question-title">
        <div className="bp-editor-meta"><span>{question.company || 'GENERAL QUESTIONS'}</span><span>{question.duration}</span></div>
        <h2 id="bp-question-title">{question.title}</h2>
        {!en && <p className="bp-question-translation">{question.titleZh}</p>}
        <p className="bp-cue">{question.cue}</p>
        <div className="bp-answer-label"><label htmlFor="bp-answer">{t('我的英文回答', 'My answer in English')}</label><span>{question.answer && !answers.some(item => item.id === question.id) ? t('Quant 方向 · 可编辑初稿', 'Quant role · editable draft') : t('编辑后自动保存', 'Edits save automatically')}</span></div>
        <textarea id="bp-answer" className="bp-answer" value={answer} onChange={event => editAnswer(event.target.value)} spellCheck lang="en" maxLength={20000}
          aria-describedby="bp-answer-stats" placeholder={t('从一段真实经历开始，按上方结构写下你的回答…', 'Start with a real experience and use the structure above to draft your answer…')} />
        <div className="bp-answer-actions"><span id="bp-answer-stats">{words} {t('词', 'words')}{words > 0 && ` · ≈ ${Math.round(words / 135 * 60)} sec`}</span><div className="bp-answer-buttons"><button type="button" disabled={!answer.trim()} onClick={copyAnswer}>{t('复制回答', 'Copy answer')}</button><button type="button" disabled={!canComplete || completedToday} onClick={complete}>{completedToday ? t('今日已完成', 'Completed today') : t('完成本次练习', 'Complete practice')}</button></div></div>
        {!canComplete && <p className="bp-completion-hint">{t('写下你自己的回答后，再确认完成；示例与草稿不会自动计入。', 'Write your own answer, then confirm completion. Examples and drafts do not count automatically.')}</p>}
        <p className="bp-notice" role="status">{notice}</p>
        <details className="bp-guide" open>
          <summary>{t('回答思路与个性化提示', 'Structure & personal touches')}</summary>
          <ol>{(en ? question.guideEn : question.guide).map(line => <li key={line}>{line}</li>)}</ol>
          {question.sources && <div className="bp-sources"><span>{t('公司信息来源', 'Company sources')}</span>{question.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div>}
        </details>
      </article>
    </div>
  </div>;
}
