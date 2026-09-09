import { ownedStorageKey } from '../../state/localRecovery.js';
export const INTERVIEW_LEGACY_KEYS = { session: 'quantgym-interview-session-v2', durable: 'quantgym-interview-resume-v1', history: 'quantgym-interview-history-v1', archive: 'quantgym-interview-recovery-v1' };
const digest = text => { let hash = 2166136261; for (const char of String(text)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0; return hash.toString(36); };
const parseArray = raw => { const value = raw ? JSON.parse(raw) : []; if (!Array.isArray(value)) throw new Error('Invalid recovery data'); return value; };
const merge = (current, incoming) => [...new Map([...incoming, ...current].map(item => [item.id, item])).values()];
function writeVerified(storage, key, value) {
  const raw = JSON.stringify(value); storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error('Could not verify saved recovery data');
}
export function hasLegacyInterviewData({ local, session } = {}) {
  try { local ||= globalThis.localStorage; session ||= globalThis.sessionStorage; return Boolean(local.getItem(INTERVIEW_LEGACY_KEYS.history) || local.getItem(INTERVIEW_LEGACY_KEYS.durable) || session.getItem(INTERVIEW_LEGACY_KEYS.session)); } catch { return false; }
}
export function getRecoveredInterviews(ownerId, storage) {
  if (!ownerId) return [];
  try { storage ||= globalThis.localStorage; return parseArray(storage.getItem(ownedStorageKey(INTERVIEW_LEGACY_KEYS.archive, ownerId))).filter(item => item.ownerId === String(ownerId)); } catch { return []; }
}
export function archiveInterviewSnapshot(ownerId, snapshot, storage) {
  if (!ownerId || snapshot?.ownerId !== String(ownerId) || !snapshot.session) return false;
  try {
    storage ||= globalThis.localStorage;
    const key = ownedStorageKey(INTERVIEW_LEGACY_KEYS.archive, ownerId);
    const current = parseArray(storage.getItem(key));
    const item = { ...snapshot, id: `snapshot:${snapshot.session.id || digest(JSON.stringify(snapshot))}:${digest(JSON.stringify(snapshot))}` };
    writeVerified(storage, key, merge(current, [item]));
    return true;
  } catch { return false; }
}
export function adoptLegacyInterviews({ ownerId, confirmed = false, local, session } = {}) {
  if (!ownerId || !confirmed) return { ok: false, code: 'confirmation-required' };
  ownerId = String(ownerId);
  try {
    local ||= globalThis.localStorage; session ||= globalThis.sessionStorage;
    const historyRaw = local.getItem(INTERVIEW_LEGACY_KEYS.history);
    const legacyHistory = parseArray(historyRaw).filter(item => item && (!item.ownerId || item.ownerId === ownerId)).map(item => ({ ...item, ownerId, id: item.id || `legacy-history:${digest(JSON.stringify(item))}` }));
    const historyKey = ownedStorageKey(INTERVIEW_LEGACY_KEYS.history, ownerId);
    const currentHistory = parseArray(local.getItem(historyKey));
    const incomingDrafts = [local.getItem(INTERVIEW_LEGACY_KEYS.durable), session.getItem(INTERVIEW_LEGACY_KEYS.session)].filter(Boolean).map(raw => JSON.parse(raw)).filter(item => item?.session && (!item.ownerId || item.ownerId === ownerId)).map(item => ({ ...item, ownerId, id: `legacy-draft:${item.session.id || digest(JSON.stringify(item))}` }));
    const archiveKey = ownedStorageKey(INTERVIEW_LEGACY_KEYS.archive, ownerId);
    const currentDrafts = parseArray(local.getItem(archiveKey));
    const history = merge(currentHistory.map((item, index) => ({ ...item, id: item.id || `existing-history:${index}:${digest(JSON.stringify(item))}` })), legacyHistory);
    const drafts = merge(currentDrafts, incomingDrafts);
    // Global raw source keys and the current running draft are never changed.
    if (incomingDrafts.length) writeVerified(local, archiveKey, drafts);
    if (legacyHistory.length) writeVerified(local, historyKey, history);
    return { ok: true, historyCount: legacyHistory.length, draftCount: incomingDrafts.length };
  } catch { return { ok: false, code: 'storage-or-invalid', originalPreserved: true }; }
}
