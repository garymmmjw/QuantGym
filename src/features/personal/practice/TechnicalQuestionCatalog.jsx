import { useEffect, useState } from 'react';
import { technicalCatalogChapters, technicalCatalogSections } from './technicalQuestionModel.js';
import { technicalAnswerLabel } from './TechnicalQuestionReference.jsx';

const PAGE_SIZE = 12;

export function TechnicalQuestionCatalog({ language = 'zh', questions, filteredQuestions, chapter, section, search, onChapter, onSection, onSearch, onReset, onChoose, onDraw }) {
  const en = language === 'en';
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const chapters = technicalCatalogChapters(questions);
  const sections = technicalCatalogSections(questions, chapter);
  const filtered = Boolean(chapter || section || search.trim());
  const pageCount = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filteredQuestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [chapter, section, search]);
  return <details className="practice-catalog" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span>{en ? 'Question library' : '题库目录'}<small>{filtered ? (en ? `${filteredQuestions.length} / ${questions.length} selected` : `已筛选 ${filteredQuestions.length} / ${questions.length} 道`) : (en ? `${questions.length} questions · browse by chapter or number` : `${questions.length} 道题 · 按章节或题号查找`)}</small></span><span aria-hidden="true">{open ? '−' : '+'}</span></summary>
    <div className="practice-catalog-content">
      <div className="practice-catalog-filters">
        <label>{en ? 'Chapter' : '章节'}<select aria-label={en ? 'Chapter' : '章节'} value={chapter} onChange={event => onChapter(event.target.value)}><option value="">{en ? 'All chapters' : '全部章节'}</option>{chapters.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>{en ? 'Section' : '小节'}<select aria-label={en ? 'Section' : '小节'} value={section} onChange={event => onSection(event.target.value)}><option value="">{en ? 'All sections' : '全部小节'}</option>{sections.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="practice-catalog-search">{en ? 'Find a question' : '查找题目'}<input type="search" value={search} maxLength={200} placeholder={en ? 'Question number or title' : '输入原书题号或题名'} onChange={event => onSearch(event.target.value)} /></label>
      </div>
      <div className="practice-catalog-count"><span role="status">{en ? `${filteredQuestions.length} questions available in this selection` : `当前范围可抽取 ${filteredQuestions.length} 道题`}</span><div className="practice-catalog-controls">{filtered && <button type="button" onClick={onReset}>{en ? 'Clear filters' : '清除筛选'}</button>}
        <button type="button" className="practice-secondary" disabled={!filteredQuestions.length} onClick={() => { if (onDraw()) setOpen(false); }}>{en ? 'Draw from this selection' : '随机练习当前范围'} ↗</button></div></div>
      {!visible.length ? <p className="practice-catalog-empty">{en ? 'No questions match. Try another chapter or a shorter search.' : '没有匹配的题目，试试其他章节或更短的关键词。'}</p> : <ol className="practice-catalog-list">{visible.map(question => {
        const provenance = question.provenance;
        const context = [provenance?.chapter, provenance?.section].filter(Boolean).join(' · ');
        return <li key={question.id}><div><span className="practice-catalog-number">{provenance?.originalNumber || (en ? 'Archived' : '旧版题目')}</span>
          <h3>{en ? question.titleEn || question.title : question.title}</h3>{context && <p>{context}</p>}
          {provenance?.answerStatus && <span className={`practice-answer-status is-${provenance.answerStatus}`}>{technicalAnswerLabel(provenance.answerStatus, language)}</span>}</div>
          <button type="button" className="practice-secondary" aria-label={`${en ? 'Practice' : '练习'} ${provenance?.originalNumber || ''} ${en ? question.titleEn || question.title : question.title}`.replace(/\s+/g, ' ').trim()}
            onClick={() => { if (onChoose(question)) setOpen(false); }}>{en ? 'Practice' : '练习此题'} <span aria-hidden="true">↗</span></button></li>;
      })}</ol>}
      {pageCount > 1 && <nav className="practice-catalog-pagination" aria-label={en ? 'Question library pages' : '题库分页'}><button type="button" disabled={currentPage === 1} onClick={() => setPage(value => value - 1)}>{en ? 'Previous' : '上一页'}</button><span>{currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(value => value + 1)}>{en ? 'Next' : '下一页'}</button></nav>}
    </div>
  </details>;
}
