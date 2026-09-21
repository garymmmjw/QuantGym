import { useRef, useState } from 'react';
import { addBehavioralQuestion, deleteBehavioralQuestion, getBehavioralAnswer, getBehavioralQuestions, updateBehavioralQuestion } from './questions.js';
import { hasPersonalBehavioralAnswer, saveBehavioralAnswer } from '../completionActivities.js';
import './behavioral.css';

function QuestionForm({ question, onSave, onCancel, t }) {
  const [title, setTitle] = useState(question?.title || '');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const editing = Boolean(question);
  const submit = (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setError(t('请先填写问题。', 'Enter a question first.'));
      return;
    }
    try { onSave(title, answer); }
    catch { setError(t('暂时无法保存，请保留内容并重试。', 'Could not save. Keep your draft and try again.')); }
  };

  return <form className="bp-editor bp-question-form" onSubmit={submit} aria-labelledby="bp-form-title">
    <p className="bp-eyebrow">{t('个人题库', 'PRIVATE QUESTION LIBRARY')}</p>
    <h2 id="bp-form-title">{editing ? t('编辑问题', 'Edit question') : t('添加 Behavioral 问题', 'Add a Behavioral question')}</h2>
    <p className="bp-form-intro">{t('写下你想准备的问题，只有当前账户可以查看。', 'Add a question you want to prepare. It is private to your account.')}</p>
    <div className="bp-field">
      <div className="bp-answer-label"><label htmlFor="bp-question-input">{t('问题', 'Question')}</label><span>{title.length} / 4,000</span></div>
      <textarea id="bp-question-input" className="bp-question-input" value={title} onChange={event => { setTitle(event.target.value); setError(''); }}
        required maxLength={4000} rows={4} autoFocus placeholder={t('输入你想准备的面试问题…', 'Enter an interview question you want to prepare…')} />
    </div>
    {!editing && <div className="bp-field">
      <div className="bp-answer-label"><label htmlFor="bp-initial-answer">{t('我的回答（选填）', 'My answer (optional)')}</label><span>{t('也可以稍后再写', 'You can write this later')}</span></div>
      <textarea id="bp-initial-answer" className="bp-answer bp-initial-answer" value={answer} onChange={event => setAnswer(event.target.value)}
        maxLength={20000} rows={7} placeholder={t('写下自己的经历和想法…', 'Write about your own experiences and ideas…')} />
    </div>}
    {error && <p className="bp-error" role="alert">{error}</p>}
    <div className="bp-form-actions"><button type="submit" className="bp-button bp-primary" disabled={!title.trim()}>{editing ? t('保存修改', 'Save changes') : t('添加问题', 'Add question')}</button><button type="button" className="bp-button" onClick={onCancel}>{t('取消', 'Cancel')}</button></div>
  </form>;
}

export function BehavioralWorkspace({ state, update, language }) {
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(null);
  const [deleteId, setDeleteId] = useState('');
  const [notice, setNotice] = useState('');
  const editSession = useRef(null);
  const en = language === 'en';
  const t = (zh, english) => en ? english : zh;
  const questions = getBehavioralQuestions(state);
  const question = questions.find(item => item.id === selectedId) || questions[0];
  const editingQuestion = form?.kind === 'edit' ? questions.find(item => item.id === form.questionId) : null;
  const formOpen = form?.kind === 'create' || Boolean(editingQuestion);
  const answers = state.behavioralAnswers || [];
  const answer = question ? getBehavioralAnswer(question, answers) : '';
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const started = questions.filter(item => hasPersonalBehavioralAnswer(state, item)).length;

  const selectQuestion = (id) => {
    setSelectedId(id);
    setDeleteId('');
    setNotice('');
    editSession.current = null;
  };
  const startCreate = () => {
    setForm({ kind: 'create' });
    setDeleteId('');
    setNotice('');
  };
  const saveQuestion = (title, initialAnswer) => {
    const now = new Date();
    if (editingQuestion) {
      const result = update(current => updateBehavioralQuestion(current, editingQuestion.id, title, now));
      setNotice(result?.ok === false
        ? t('修改暂未保存，请按上方提示重试。', 'Changes are not saved yet. Follow the recovery message above.')
        : t('问题已更新。', 'Question updated.'));
    } else {
      const id = crypto.randomUUID();
      const editId = crypto.randomUUID();
      const result = update(current => {
        const next = addBehavioralQuestion(current, title, now, { id });
        return initialAnswer ? saveBehavioralAnswer(next, { id }, initialAnswer, now, { editId }) : next;
      });
      setSelectedId(id);
      setNotice(result?.ok === false
        ? t('问题已添加到本页，暂未保存，请按上方提示重试。', 'Question added on this page, but not saved yet. Follow the recovery message above.')
        : t('问题已添加。', 'Question added.'));
    }
    editSession.current = null;
    setForm(null);
  };
  const removeQuestion = () => {
    if (!question || deleteId !== question.id) return;
    try {
      const result = update(current => deleteBehavioralQuestion(current, question.id));
      setSelectedId(questions.find(item => item.id !== question.id)?.id || '');
      setDeleteId('');
      editSession.current = null;
      setNotice(result?.ok === false
        ? t('问题已从本页移除，删除操作暂未保存，请按上方提示重试。', 'Question removed from this page, but the deletion is not saved yet. Follow the recovery message above.')
        : t('问题已删除，练习历史已保留。', 'Question deleted. Practice history has been kept.'));
    } catch { setNotice(t('暂时无法删除，请重试。', 'Could not delete this question. Try again.')); }
  };
  const editAnswer = (text) => {
    if (!question) return;
    if (editSession.current?.questionId !== question.id) editSession.current = { questionId: question.id, editId: crypto.randomUUID() };
    const { editId } = editSession.current;
    try {
      const result = update(current => saveBehavioralAnswer(current, question, text, new Date(), { editId }));
      setNotice(result?.ok === false
        ? t('回答暂未保存，请按上方提示重试。', 'Your answer is not saved yet. Follow the recovery message above.') : '');
    } catch { setNotice(t('回答暂未保存，请保留内容并重试。', 'Your answer has not saved. Keep your draft and try again.')); }
  };
  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setNotice(t('回答已复制。', 'Answer copied.'));
    } catch { setNotice(t('无法自动复制，请选中回答文字后复制。', 'Could not copy automatically. Select the answer text and copy it.')); }
  };

  return <div className="behavioral-prep">
    <header className="bp-heading">
      <div><p className="bp-eyebrow">INTERVIEW PREPARATION</p><h1>Behavioral Interview</h1><p className="bp-subtitle">{t('属于你的问题与回答，记录自己的经历。', 'Your questions, your answers, your experiences.')}</p></div>
      <div className="bp-heading-actions"><p className="bp-progress"><strong>{started} <span>/ {questions.length}</span></strong>{t('题已写入回答', 'answers written')}</p><button type="button" className="bp-button bp-primary" onClick={startCreate} disabled={formOpen}><span aria-hidden="true">＋</span> {t('添加问题', 'Add question')}</button></div>
    </header>

    <div className={`bp-layout${questions.length ? '' : ' is-empty'}`}>
      {questions.length > 0 && <nav className="bp-question-list" aria-label={t('我的 Behavioral 问题', 'My Behavioral questions')}>
        <div className="bp-section-heading"><h2>{t('我的问题', 'My questions')}</h2><span>{questions.length}</span></div>
        <div className="bp-question-items">{questions.map((item, index) => <button
          className={`bp-question${question?.id === item.id ? ' is-active' : ''}`} type="button" key={item.id}
          aria-current={question?.id === item.id ? 'true' : undefined} disabled={formOpen} onClick={() => selectQuestion(item.id)}
        ><span className="bp-question-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="bp-question-text">{item.title}</span><span className={`bp-draft-dot${hasPersonalBehavioralAnswer(state, item) ? ' has-draft' : ''}`} aria-label={hasPersonalBehavioralAnswer(state, item) ? t('已写入回答', 'Answer written') : t('待准备', 'To prepare')} /></button>)}</div>
        <p className="bp-list-note">{t('问题与回答仅保存在你的账户中。', 'Questions and answers are private to your account.')}</p>
      </nav>}

      {formOpen ? <QuestionForm key={editingQuestion?.id || 'new'} question={editingQuestion} onSave={saveQuestion} onCancel={() => setForm(null)} t={t} />
        : question ? <article className="bp-editor" key={question.id} aria-labelledby="bp-question-title">
          <div className="bp-editor-toolbar"><span className="bp-editor-meta">{t('我的问题', 'MY QUESTION')}</span><div className="bp-editor-actions"><button type="button" className="bp-button bp-quiet" onClick={() => { setForm({ kind: 'edit', questionId: question.id }); setDeleteId(''); setNotice(''); }}>{t('编辑问题', 'Edit question')}</button><button type="button" className="bp-button bp-quiet" onClick={() => { setDeleteId(question.id); setNotice(''); }}>{t('删除', 'Delete')}</button></div></div>
          <h2 id="bp-question-title">{question.title}</h2>
          {deleteId === question.id && <div className="bp-delete-confirm" role="group" aria-labelledby="bp-delete-title">
            <strong id="bp-delete-title">{t('删除这个问题？', 'Delete this question?')}</strong><p>{t('问题和回答会从题库中移除，已记录的练习历史会保留。', 'The question and answer will leave your library. Recorded practice history will be kept.')}</p>
            <div className="bp-form-actions"><button type="button" className="bp-button bp-danger" onClick={removeQuestion}>{t('确认删除', 'Confirm delete')}</button><button type="button" className="bp-button" onClick={() => setDeleteId('')}>{t('取消', 'Cancel')}</button></div>
          </div>}
          <div className="bp-answer-label"><label htmlFor="bp-answer">{t('我的回答', 'My answer')}</label><span>{t('编辑后自动保存', 'Edits save automatically')}</span></div>
          <textarea id="bp-answer" className="bp-answer" value={answer} onChange={event => editAnswer(event.target.value)}
            onFocus={() => { editSession.current = { questionId: question.id, editId: crypto.randomUUID() }; }}
            onBlur={() => { editSession.current = null; }} spellCheck maxLength={20000}
            aria-describedby="bp-answer-stats" placeholder={t('写下自己的经历和想法…', 'Write about your own experiences and ideas…')} />
          <div className="bp-answer-actions"><span id="bp-answer-stats">{words} {t('词', 'words')}{words > 0 && ` · ≈ ${Math.round(words / 135 * 60)} sec`}</span><button type="button" className="bp-button" disabled={!answer.trim()} onClick={copyAnswer}>{t('复制回答', 'Copy answer')}</button></div>
        </article>
          : <section className="bp-empty" aria-labelledby="bp-empty-title"><p className="bp-eyebrow">{t('个人题库', 'PRIVATE QUESTION LIBRARY')}</p><h2 id="bp-empty-title">{t('从你的第一个问题开始', 'Start with your first question')}</h2><p>{t('添加想准备的 Behavioral 问题，逐步写下自己的回答。', 'Add a Behavioral question you want to prepare, then build your own answer.')}</p><button type="button" className="bp-button bp-primary" onClick={startCreate}>{t('添加第一个问题', 'Add your first question')}</button></section>}
    </div>
    <p className="bp-notice" role="status">{notice}</p>
  </div>;
}
