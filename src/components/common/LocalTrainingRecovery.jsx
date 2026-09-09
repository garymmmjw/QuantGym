import { useState, useSyncExternalStore } from 'react';
import { useAuthStore } from '../../stores/AppServicesContext.jsx';
import { exportRecoveryFile, getLocalRecovery, subscribeLocalRecovery, restoreLocalRecoveryBackup } from '../../state/localRecovery.js';

export function LocalTrainingRecovery() {
  const ownerId = useAuthStore(state => state.currentUser?.id || '');
  const all = useSyncExternalStore(subscribeLocalRecovery, getLocalRecovery, getLocalRecovery);
  const records = all.filter(record => record.ownerId === String(ownerId));
  const [notice, setNotice] = useState('');
  if (!ownerId) return null;
  return <div>{records.length > 0 && <aside role="alert" style={{ padding: '12px 16px', margin: '12px 0', border: '1px solid #c98a30', borderRadius: 8, background: '#fff8ea', color: '#664210' }}>
    <p style={{ margin: '0 0 8px' }}>部分训练记录尚未保存到本机。当前内容仍保留，请重试或先导出备份。</p>
    <button type="button" onClick={() => records.forEach(record => record.retry?.())}>重试保存</button>{' '}
    <button type="button" onClick={() => exportRecoveryFile(ownerId, records)}>导出未保存记录</button>
  </aside>}
    <details style={{ margin: '8px 0', fontSize: 12 }}><summary>恢复本机训练备份</summary><p>仅接受当前账户导出的未保存记录。题目笔记会合并；面试草稿会加入恢复列表；不同版本的整份训练状态不会互相覆盖。</p><input type="file" accept="application/json,.json" aria-label="选择本机训练恢复备份" onChange={async event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { setNotice('备份文件超过 20 MB。'); return; }
      const result = restoreLocalRecoveryBackup(ownerId, await file.text());
      setNotice(result.ok ? `已恢复 ${result.restored} 条。${result.conflicts ? `${result.conflicts} 份整份状态与当前记录冲突，已保留当前版本，请继续保留备份文件。` : '刷新页面后可查看。'}${result.archived ? '面试草稿可在「恢复旧版面试记录」中打开。' : ''}` : '恢复未完成，请检查账户、文件和本机存储。原有记录与备份文件均保留。');
    }} />{notice && <p role="status">{notice}</p>}</details>
  </div>;
}
