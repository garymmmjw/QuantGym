import { useState } from 'react';
import { PracticeWorkspace } from './PracticeWorkspace.jsx';
import { drawTechnicalQuestion } from './practiceModel.js';
import { useTechnicalQuestions } from './useTechnicalQuestions.js';
import { TechnicalQuestionCatalog } from './TechnicalQuestionCatalog.jsx';
import { filterTechnicalQuestions, technicalCatalogChapters } from './technicalQuestionModel.js';
import { TechnicalReadingList, TechnicalSourceCredit } from './TechnicalReadingList.jsx';

export function TechnicalInterviewWorkspace(props) {
  const source = useTechnicalQuestions();
  const en = props.language === 'en';
  const [chapter, setChapter] = useState('');
  const [section, setSection] = useState('');
  const [search, setSearch] = useState('');
  const questions = filterTechnicalQuestions(source.questions, { chapter, section, search });
  const chapterCount = technicalCatalogChapters(source.questions).length;
  const message = source.phase === 'loading' ? (en ? 'Loading Purple Book questions…' : '正在读取紫皮书题目…')
    : source.phase === 'local' ? (en ? 'Sign in to your cloud account to load the Purple Book.' : '登录云端账户后即可读取紫皮书题目。')
    : source.phase === 'error' ? (en ? 'The question library could not load. Your saved practice is still available.' : '题库暂时未能加载，已保存的练习仍可继续。')
    : !source.questions.length ? (en ? 'No Purple Book questions are available yet.' : '暂时没有可用的紫皮书题目。') : '';
  return <PracticeWorkspace {...props} kind="tech" sessions={(props.state.practiceSessions || []).filter(s => s.kind === 'tech')}
    draw={previous => drawTechnicalQuestion(questions, previous)} canDraw={source.phase === 'ready' && questions.length > 0}
    sourceCount={questions.length} sourceSummary={en ? `Purple Book · ${source.questions.length} questions${chapterCount ? ` · ${chapterCount} chapters` : ''}` : `紫皮书 · ${source.questions.length} 道题${chapterCount ? ` · ${chapterCount} 个章节` : ''}`}
    sourceMessage={message} onRetry={source.phase === 'error' ? source.reload : null}
    drawLabel={chapter || section || search ? (en ? 'Draw from this selection' : '从筛选范围抽题') : ''}
    renderLibrary={({ onChoose, onDraw }) => source.phase === 'ready' ? <><TechnicalSourceCredit metadata={source.sourceMetadata} />
      <TechnicalQuestionCatalog language={props.language} questions={source.questions} filteredQuestions={questions}
      chapter={chapter} section={section} search={search} onChapter={value => { setChapter(value); setSection(''); }} onSection={setSection} onSearch={setSearch}
      onReset={() => { setChapter(''); setSection(''); setSearch(''); }} onChoose={onChoose} onDraw={onDraw} />
      <TechnicalReadingList groups={source.readingList} language={props.language} /></> : null} />;
}
