// Volatile recovery copies stay keyed by their known owner. Never attach an old
// unowned browser record to whoever happens to sign in next.
const records = new Map();
const listeners = new Set();
let snapshot = [];
const publish = () => { snapshot = [...records.values()]; listeners.forEach(listener => listener()); };
export const subscribeLocalRecovery = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const getLocalRecovery = () => snapshot;
export function rememberLocalRecovery(ownerId, key, record) {
  if (!ownerId) return;
  records.set(`${ownerId}\n${key}`, { ...record, ownerId: String(ownerId), key });
  publish();
}
export function clearLocalRecovery(ownerId, key) {
  if (records.delete(`${ownerId}\n${key}`)) publish();
}
export function ownedStorageKey(base, ownerId) {
  return ownerId ? `${base}:owner:${encodeURIComponent(String(ownerId))}` : '';
}
export function exportRecoveryFile(ownerId, entries, windowRef = window) {
  const owned = entries.filter(entry => entry.ownerId === String(ownerId));
  const content = JSON.stringify({ type: 'quantgym-local-recovery', version: 1, ownerId: String(ownerId), exportedAt: new Date().toISOString(), records: owned.map(({ key, backup }) => ({ key, backup })) }, null, 2);
  const url = windowRef.URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = windowRef.document.createElement('a');
  link.href = url;
  link.download = 'quantgym-training-recovery.json';
  link.click();
  windowRef.setTimeout(() => windowRef.URL.revokeObjectURL(url), 1000);
}
export function restoreLocalRecoveryBackup(ownerId, content, storage) {
  let restored = 0, archived = 0, conflicts = 0;
  try {
    storage ||= globalThis.localStorage;
    const file = typeof content === 'string' ? JSON.parse(content) : content;
    if (!ownerId || file?.type !== 'quantgym-local-recovery' || file.version !== 1 || file.ownerId !== String(ownerId) || !Array.isArray(file.records) || file.records.length > 1000) throw new Error('Invalid backup owner or format');
    const plans = [];
    for (const { key, backup } of file.records) {
      if (!backup || typeof backup !== 'object' || Array.isArray(backup)) throw new Error('Invalid backup record');
      let target, value = backup;
      if (key === 'user-state') {
        target = `quantMemoryBoard.userState.v1.${ownerId}`;
        const current = storage.getItem(target);
        if (current && current !== JSON.stringify(backup)) { conflicts += 1; continue; }
      } else if (key === 'interview-history') {
        if (backup.ownerId !== String(ownerId) || !backup.id) throw new Error('Invalid history owner');
        target = ownedStorageKey('quantgym-interview-history-v1', ownerId);
        const current = JSON.parse(storage.getItem(target) || '[]');
        if (!Array.isArray(current)) throw new Error('Invalid current history');
        value = [...new Map([[backup.id, backup], ...current.map(item => [item.id || JSON.stringify(item), item])]).values()];
      } else if (key === 'interview-draft') {
        if (backup.ownerId !== String(ownerId) || !backup.session) throw new Error('Invalid draft owner');
        target = ownedStorageKey('quantgym-interview-recovery-v1', ownerId);
        const current = JSON.parse(storage.getItem(target) || '[]');
        if (!Array.isArray(current)) throw new Error('Invalid current draft archive');
        const existing = current.some(item => JSON.stringify(item.session) === JSON.stringify(backup.session) && JSON.stringify(item.messages) === JSON.stringify(backup.messages) && item.answerDraft === backup.answerDraft);
        value = existing ? current : [...current, { ...backup, id: `backup:${backup.session.id || 'draft'}:${Date.now()}:${plans.length}` }];
        archived += 1;
      } else if (typeof key === 'string' && key.startsWith('quantgym.problemNote.')) {
        if (backup.ownerId !== String(ownerId) || typeof backup.text !== 'string' || !backup.problemId) throw new Error('Invalid note owner');
        target = ownedStorageKey(`quantgym.problemNote.${encodeURIComponent(String(backup.problemId))}`, ownerId);
        if (target !== key) throw new Error('Invalid note key');
        const current = JSON.parse(storage.getItem(target) || 'null');
        if (current && (current.ownerId !== String(ownerId) || typeof current.text !== 'string')) throw new Error('Invalid current note');
        value = { ...backup, version: 1, text: current?.text && current.text !== backup.text && !current.text.includes(`—— 恢复的笔记 ——\n${backup.text}`) ? `${current.text}\n\n—— 恢复的笔记 ——\n${backup.text}` : current?.text || backup.text };
      } else throw new Error('Unsupported backup record');
      plans.push({ target, raw: JSON.stringify(value) });
    }
    for (const { target, raw } of plans) {
      storage.setItem(target, raw);
      if (storage.getItem(target) !== raw) throw new Error('Backup write could not be verified');
      restored += 1;
    }
    return { ok: true, restored, archived, conflicts };
  } catch { return { ok: false, restored, archived, conflicts }; }
}
if (typeof window !== 'undefined') window.addEventListener('beforeunload', event => {
  if (records.size) { event.preventDefault(); event.returnValue = ''; }
});
