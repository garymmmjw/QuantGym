import { useState } from 'react';
import { useAuthStore } from '../../stores/AppServicesContext.jsx';
import { adoptLegacyInterviews, getRecoveredInterviews, hasLegacyInterviewData } from '../../modules/interview/legacyRecovery.js';
export function LegacyInterviewRecovery({ onOpen }) {
  const ownerId = useAuthStore(state => state.currentUser?.id || '');
  return <OwnedRecovery key={String(ownerId)} ownerId={String(ownerId)} onOpen={onOpen} />;
}
function OwnedRecovery({ ownerId, onOpen }) {
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  void revision;
  const snapshots = getRecoveredInterviews(ownerId);
  const legacyAvailable = hasLegacyInterviewData();
  if (!ownerId || (!legacyAvailable && !snapshots.length)) return null;
  return <details style={{ margin: '12px 0' }}><summary>恢复旧版面试记录</summary>
    {legacyAvailable && <><p>此浏览器有未标注账户的旧记录。请仅在确认属于自己时导入；当前面试和原始备份会保留。</p><button type="button" onClick={() => {
      const result = adoptLegacyInterviews({ ownerId, confirmed: true });
      setNotice(result.ok ? '旧记录已合并到此账户，原始备份仍保留。可在下方打开旧进程。' : '未能完成恢复，原始数据仍保留。请检查本机存储后重试。');
      setRevision(value => value + 1);
    }}>这是我的记录，合并到当前账户</button></>}
    {snapshots.map(snapshot => <div key={snapshot.id} style={{ marginTop: 10 }}><span>{snapshot.session?.startedAt ? new Date(snapshot.session.startedAt).toLocaleString() : '旧面试进程'} · {snapshot.session?.questions?.length || 0} 题 </span><button type="button" onClick={() => {
      const opened = onOpen?.(snapshot);
      setNotice(opened ? '已打开恢复的面试。' : '暂时无法打开，当前进程和旧记录均保留。');
      setRevision(value => value + 1);
    }}>备份当前进程并打开</button></div>)}
    {notice && <p role="status">{notice}</p>}
  </details>;
}
