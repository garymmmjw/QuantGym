import { useId } from 'react';
import { describePatternCell } from './patternQuestions.js';
import './patternPuzzle.css';

function PatternCell({ cell, language, label }) {
  const patternId = `ppuzzle-stripe-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (!cell) return <div className="ppuzzle-missing" role="img" aria-label={language === 'en' ? 'Missing cell, bottom right' : '右下角缺失图形'}>?</div>;
  const fill = cell.fill === 'outline' ? 'none' : cell.fill === 'striped' ? `url(#${patternId})` : 'currentColor';
  const description = `${label}：${describePatternCell(cell, language)}`;
  return <svg className="ppuzzle-svg" viewBox="0 0 100 100" role="img" aria-label={description} focusable="false">
    <title>{description}</title>
    {cell.fill === 'striped' && <defs><pattern id={patternId} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 0 0 V 5" stroke="currentColor" strokeWidth="2" /></pattern></defs>}
    {cell.positions.map(position => <g key={position} transform={`translate(${20 + (position % 3) * 30} ${20 + Math.floor(position / 3) * 30}) rotate(${cell.rotation})`}>
      <g transform={cell.positions.length === 1 ? 'scale(1.45)' : undefined} fill={fill} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        {cell.shape === 'circle' && <circle r="8" />}
        {cell.shape === 'square' && <rect x="-8" y="-8" width="16" height="16" />}
        {cell.shape === 'triangle' && <path d="M 0 -10 L 9 7 L -9 7 Z" />}
        {cell.shape === 'arrow' && <path d="M 0 -11 L 9 -2 H 4 V 10 H -4 V -2 H -9 Z" />}
      </g>
    </g>)}
  </svg>;
}

export function PatternPuzzle({ question, language = 'zh', selectedAnswer = '', onSelect, disabled = false, showAnswer = false, showExplanation = true }) {
  const id = useId();
  const en = language === 'en';
  if (!question) return null;
  const recordedAnswer = question.submittedAnswer || selectedAnswer;
  const userAnswer = showAnswer ? recordedAnswer : selectedAnswer;
  const choiceLabel = letter => en ? `Option ${letter}` : `选项 ${letter}`;
  return <section className="ppuzzle-panel" aria-labelledby={`${id}-title`}>
    <div className="ppuzzle-heading"><h3 id={`${id}-title`}>{en ? 'Find the missing pattern' : '找出缺失的图形'}</h3><p id={`${id}-help`}>{en ? 'Look across rows and down columns. Choose one option, then submit your answer.' : '观察每行和每列的变化。先选择一个选项，再提交答案。'}</p></div>
    <div className="ppuzzle-body">
    <div className="ppuzzle-grid" role="group" aria-label={en ? 'Three by three pattern matrix' : '三行三列图形矩阵'}>
      {question.grid.map((cell, index) => <div className={`ppuzzle-cell${cell ? '' : ' ppuzzle-cell-missing'}`} key={index}>
        <PatternCell cell={cell} language={language} label={en ? `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}` : `第 ${Math.floor(index / 3) + 1} 行，第 ${index % 3 + 1} 列`} />
      </div>)}
    </div>
    <div className="ppuzzle-options" role="group" aria-label={en ? 'Answer options' : '答案选项'} aria-describedby={`${id}-help`}>
      {question.options.map(option => {
        const selected = userAnswer === option.id;
        const correct = showAnswer && question.answer === option.id;
        const wrong = showAnswer && selected && !correct;
        return <button type="button" key={option.id} className={`ppuzzle-option${selected ? ' ppuzzle-selected' : ''}${correct ? ' ppuzzle-correct' : ''}${wrong ? ' ppuzzle-wrong' : ''}`}
          aria-pressed={selected} aria-label={`${choiceLabel(option.id)}：${describePatternCell(option.cell, language)}${correct ? (en ? '. Correct answer' : '。正确答案') : ''}${selected ? (en ? '. Your choice' : '。你的选择') : ''}`}
          disabled={disabled || showAnswer} onClick={() => onSelect?.(option.id)}>
          <span className="ppuzzle-option-label">{option.id}<span aria-hidden="true">{correct ? '✓' : wrong ? '×' : selected ? '●' : ''}</span></span>
          <PatternCell cell={option.cell} language={language} label={choiceLabel(option.id)} />
          {showAnswer && <span className="ppuzzle-option-feedback">{correct ? (en ? 'Correct' : '正确答案') : selected ? (en ? 'Your choice' : '你的选择') : '\u00a0'}</span>}
        </button>;
      })}
    </div>
    </div>
    {showAnswer && showExplanation && <div className="ppuzzle-explanation" role="status">
      <strong>{en ? `Correct answer: ${question.answer}` : `正确答案：${question.answer}`}{recordedAnswer ? (en ? ` · Your choice: ${recordedAnswer}` : ` · 你的选择：${recordedAnswer}`) : (en ? ' · No answer submitted' : ' · 未提交答案')}</strong>
      <p>{en ? question.explanationEn : question.explanation}</p>
    </div>}
  </section>;
}
