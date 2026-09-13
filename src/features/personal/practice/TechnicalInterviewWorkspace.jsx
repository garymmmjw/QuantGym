import { PracticeWorkspace } from './PracticeWorkspace.jsx';
import { drawTechnicalQuestion } from './practiceModel.js';
import { useTechnicalQuestions } from './useTechnicalQuestions.js';

export function TechnicalInterviewWorkspace(props) {
  const source = useTechnicalQuestions();
  const en = props.language === 'en';
  const message = source.phase === 'loading' ? (en ? 'Loading Purple Book questions…' : '正在读取紫皮书题目…')
    : source.phase === 'local' ? (en ? 'Sign in to your cloud account to load the Purple Book.' : '登录云端账户后即可读取紫皮书题目。')
    : source.phase === 'error' ? (en ? 'The question library could not load. Your saved practice is still available.' : '题库暂时未能加载，已保存的练习仍可继续。')
    : !source.questions.length ? (en ? 'No Purple Book questions are available yet.' : '暂时没有可用的紫皮书题目。') : '';
  return <PracticeWorkspace {...props} kind="tech" sessions={(props.state.practiceSessions || []).filter(s => s.kind === 'tech')}
    draw={previous => drawTechnicalQuestion(source.questions, previous)} canDraw={source.phase === 'ready' && source.questions.length > 0}
    sourceCount={source.questions.length} sourceSummary={en ? 'Purple Book · one question at a time' : '紫皮书 · 每次一道题'}
    sourceMessage={message} onRetry={source.phase === 'error' ? source.reload : null} />;
}
