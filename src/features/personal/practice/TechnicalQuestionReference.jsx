import { DailyQuestionText } from '../daily/DailyQuestionText.jsx';

const answerLabels = {
  source: ['原书答案', 'Source answer'], reviewed: ['已整理', 'Reviewed notes'], corrected: ['含勘误', 'With corrections'],
  supplemented: ['补充解答', 'Supplemented answer'], missing: ['原书未附答案', 'No source answer'],
};

export function technicalAnswerLabel(status, language = 'zh') {
  return answerLabels[status]?.[language === 'en' ? 1 : 0] || '';
}

export function TechnicalQuestionProvenance({ question, language = 'zh' }) {
  const provenance = question.provenance;
  if (!provenance) return null;
  const en = language === 'en';
  const location = [provenance.chapter, provenance.section].filter(Boolean).join(' · ');
  const pages = [provenance.sourcePage && `${en ? 'Book p.' : '书页'} ${provenance.sourcePage}`, provenance.pdfPage && `PDF ${en ? 'p.' : '第'} ${provenance.pdfPage}${en ? '' : ' 页'}`].filter(Boolean).join(' · ');
  return <div className="practice-provenance">
    <div className="practice-provenance-tags">{provenance.originalNumber && <span>{en ? 'Question' : '原书题号'} {provenance.originalNumber}</span>}
      {technicalAnswerLabel(provenance.answerStatus, language) && <span className={`practice-answer-status is-${provenance.answerStatus}`}>{technicalAnswerLabel(provenance.answerStatus, language)}</span>}</div>
    {location && <p>{location}</p>}
    {(pages || provenance.sourceUrl) && <p className="practice-source-location"><span>{pages}</span>{provenance.sourceUrl && <a href={provenance.sourceUrl} target="_blank" rel="noreferrer">{en ? 'Open source' : '查看原书'} ↗</a>}</p>}
    {provenance.edition && <small>{provenance.edition}</small>}
  </div>;
}

export function TechnicalQuestionReference({ question, language = 'zh' }) {
  const en = language === 'en';
  const provenance = question.provenance;
  const reference = en ? question.referenceEn || question.reference : question.reference;
  if (!provenance) return <DailyQuestionText language={language} content={reference} className="practice-question-text" />;
  const sourceReference = en ? provenance.sourceReferenceEn || provenance.sourceReference : provenance.sourceReference || provenance.sourceReferenceEn;
  const notes = en ? provenance.reviewNotesEn || provenance.reviewNotes : provenance.reviewNotes || provenance.reviewNotesEn;
  const referenceLabel = provenance.answerStatus === 'source' ? (en ? 'Source answer' : '原书答案')
    : provenance.answerStatus === 'supplemented' ? (en ? 'Supplemented reference answer' : '补充参考解答')
      : (en ? 'Reviewed reference reasoning' : '整理后的参考解答');
  return <div className="practice-reference-sections">
    {provenance.answerStatus === 'missing' && <p className="practice-reference-note">{en ? 'The source does not include an answer for this question. You can still record your reasoning.' : '原书未附本题答案。你可以先记录自己的推导。'}</p>}
    {reference && <section><h3>{referenceLabel}</h3><DailyQuestionText language={language} content={reference} className="practice-question-text" /></section>}
    {notes && <section><h3>{en ? 'Editorial notes and corrections' : '整理与勘误说明'}</h3><DailyQuestionText language={language} content={notes} className="practice-question-text" /></section>}
    {sourceReference && sourceReference.trim() !== reference?.trim() && <details className="practice-source-answer"><summary>{en ? 'Compare with the source answer' : '对照原书答案'}</summary>
      <DailyQuestionText language={language} content={sourceReference} className="practice-question-text" /></details>}
  </div>;
}
