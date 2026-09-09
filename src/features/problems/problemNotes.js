import { clearLocalRecovery, ownedStorageKey, rememberLocalRecovery } from '../../state/localRecovery.js';
export const LEGACY_NOTE_PREFIX = 'quantgym.problemNote.';
const drafts = new Map();
export function createProblemNoteStore({ ownerId, problemId, storage: providedStorage }) {
  const getStorage = () => providedStorage || globalThis.localStorage;
  const key = ownedStorageKey(`${LEGACY_NOTE_PREFIX}${encodeURIComponent(String(problemId))}`, ownerId);
  let entry = drafts.get(key);
  if (!entry) {
    entry = { value: '', error: false, legacyAvailable: false };
    let raw = '';
    try {
      const storage = getStorage();
      entry.legacyAvailable = Boolean(storage?.getItem(`${LEGACY_NOTE_PREFIX}${problemId}`));
      if (key) {
        raw = storage?.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.ownerId !== String(ownerId) || typeof parsed.text !== 'string') throw new Error('Invalid note owner');
          entry.value = parsed.text;
          entry.legacyImported = Boolean(parsed.legacyImported);
        }
      }
    } catch { entry.error = true; entry.blocked = Boolean(raw); entry.needsRead = !raw; }
    if (key) drafts.set(key, entry);
  }
  function save(text = entry.value) {
    entry.value = String(text);
    try {
      const storage = getStorage();
      if (!key || !storage || entry.blocked) throw new Error('Note storage unavailable');
      if (entry.needsRead) {
        // An unread earlier note must not be replaced after temporary storage
        // access comes back. Keep this edit available for export/recovery.
        if (storage.getItem(key)) throw new Error('Existing note needs recovery');
        entry.needsRead = false;
      }
      const raw = JSON.stringify({ version: 1, ownerId: String(ownerId), problemId: String(problemId), text: entry.value, legacyImported: Boolean(entry.legacyImported) });
      storage.setItem(key, raw);
      if (storage.getItem(key) !== raw) throw new Error('Note write could not be verified');
      entry.error = false;
      clearLocalRecovery(ownerId, key);
      return true;
    } catch {
      entry.error = true;
      rememberLocalRecovery(ownerId, key, { backup: { ownerId: String(ownerId), problemId, text: entry.value, legacyImported: Boolean(entry.legacyImported) }, retry: () => save() });
      return false;
    }
  }
  function adoptLegacy(confirmed = false) {
    if (!confirmed || !ownerId || entry.legacyImported) return false;
    try {
      const raw = getStorage()?.getItem(`${LEGACY_NOTE_PREFIX}${problemId}`);
      if (!raw) return false;
      entry.legacyImported = true;
      return save(entry.value ? `${entry.value}\n\n—— 旧版笔记（本人确认归属）——\n${raw}` : raw);
    } catch { return false; }
  }
  return { key, get: () => ({ ...entry }), save, adoptLegacy };
}
