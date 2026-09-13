import { useLeetCode } from '../../leetcode/useLeetCode.js';
import { drawReviewProblem, leetcodeError, problemUrl, reviewPool } from '../../leetcode/leetcodeModel.js';
import { PracticeWorkspace } from './PracticeWorkspace.jsx';

export function CodingOaWorkspace(props) {
  const lc = useLeetCode();
  const en = props.language === 'en';
  const connection = lc.data.connection;
  const pool = reviewPool(lc.data.problems);
  const sessions = (props.state.practiceSessions || []).filter(s => s.kind === 'coding'
    && s.question.username === connection?.username && s.question.linkedAt === connection?.linkedAt);
  const draw = previous => {
    const problem = drawReviewProblem(pool, previous, Math.random, { now: Date.now(), submissions: lc.data.submissions,
      practiceSessions: props.state.practiceSessions, connection });
    return problem && { id: problem.slug, slug: problem.slug, source: 'leetcode',
      title: problem.title || problem.titleEn || problem.slug, titleEn: problem.titleEn || problem.title || problem.slug,
      url: problemUrl(problem.slug), username: connection.username, linkedAt: connection.linkedAt };
  };
  const message = lc.error ? leetcodeError(lc.error, en) : lc.busy ? (en ? 'Loading your solved problems…' : '正在读取你的已通过题目…')
    : !lc.enabled ? (en ? 'Sign in to your cloud account and connect LeetCode to start.' : '登录云端账户并关联 LeetCode 后，即可开始。')
    : !connection ? (en ? 'Connect your LeetCode account to draw from your solved problems.' : '先关联 LeetCode 账号，再从你做过的题目中抽取。')
    : !pool.length ? (en ? 'No solved problems have been synced yet. Sync or import your history first.' : '暂时没有已同步的通过题目，请先同步或导入刷题历史。') : '';
  return <PracticeWorkspace {...props} key={`${lc.ownerId}:${connection?.username}:${connection?.linkedAt}`} kind="coding" sessions={sessions}
    draw={draw} canDraw={Boolean(connection && pool.length && !lc.busy)} sourceCount={pool.length}
    sourceSummary={connection ? `${connection.displayName || connection.username} · ${pool.length} / ${lc.data.stats?.solved ?? pool.length} ${en ? 'solved problems synced' : '道已通过题目已同步'}` : ''}
    sourceMessage={message} sourceLink="/leetcode" sourceLinkLabel={en ? 'Manage LeetCode history ↗' : '管理 LeetCode 题库 ↗'}
    onRetry={lc.error ? lc.reload : null} />;
}
