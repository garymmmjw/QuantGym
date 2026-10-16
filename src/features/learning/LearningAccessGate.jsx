import { Link } from 'react-router-dom';
import { useMembership } from '../membership/useMembership.js';
import { hasMemberPracticeAccess } from '../problems/practiceBanks.js';
import './learnPage.css';

export function LearningAccessGate({ children, title = '学习中心' }) {
  const membership = useMembership();
  if (hasMemberPracticeAccess(membership)) return children;
  return <section className="qg-learning-page qg-learning-gate">
    <p className="qg-learning-eyebrow">LEARNING · VIP</p>
    <h1>{title}</h1>
    <h2>{membership.loading ? '正在确认会员权限…' : '会员专享学习空间'}</h2>
    <p role={membership.error ? 'alert' : 'status'}>{membership.error || (membership.loading
      ? '课程与翁家宝典使用同一账户权限，请稍候。'
      : 'Learn 课程、翁家宝典和能力评分向 VIP 会员开放。')}</p>
    <div className="qg-learning-actions"><button type="button" disabled={membership.loading} onClick={membership.refresh}>重新检查权限</button><Link to="/problems">返回题库</Link></div>
  </section>;
}
