import { USER_STATE_PREFIX } from '../constants.js';
import { trackerStorageKey } from '../features/tracker/trackerStore.js';
import { stageStorageKey } from '../features/careerStages/stageStore.js';
import { personalStorageKey } from '../features/personal/personalStore.js';

const emailKey = value => String(value || '').trim().toLowerCase();

export function deviceRecordStorage(explicit) {
  try { return explicit || globalThis.localStorage || null; } catch { return null; }
}

export function deviceRecordStamp(ownerId, storage) {
  if (!storage?.getItem) return null;
  const values = [trackerStorageKey(ownerId), stageStorageKey(ownerId), personalStorageKey(ownerId), `${USER_STATE_PREFIX}.${ownerId}`]
    .map(key => storage.getItem(key));
  if (values.every(value => value === null)) return null;
  // A change detector, not authentication: ownership always requires both a
  // server-verified session and the original profile's password proof.
  const serialized = JSON.stringify(values);
  let first = 2166136261, second = 2246822519;
  for (let index = 0; index < serialized.length; index += 1) {
    const unit = serialized.charCodeAt(index);
    first = Math.imul(first ^ unit, 16777619);
    second = Math.imul(second ^ unit, 3266489917);
  }
  return `${serialized.length}:${first >>> 0}:${second >>> 0}`;
}

export function deviceRecordCandidates(auth, user, storage) {
  if (!user?.id || !emailKey(user.email)) return [];
  const profiles = [...new Map([...(auth?.legacyAccounts || []), ...(auth?.accounts || [])]
    .filter(profile => profile?.id).map(profile => [profile.id, profile])).values()];
  return profiles.flatMap(profile => {
    if (profile.id === user.id || profile.provider !== 'local' || emailKey(profile.email) !== emailKey(user.email)
      || typeof profile.passwordHash !== 'string' || !profile.passwordHash) return [];
    const stamp = deviceRecordStamp(profile.id, storage);
    if (!stamp || (profile.recordRecovery?.targetOwnerId === user.id && profile.recordRecovery.sourceStamp === stamp)) return [];
    return [{ ...profile, sourceStamp: stamp }];
  });
}

export function markDeviceRecordsRecovered(auth, sources, targetOwnerId) {
  const stamps = new Map(sources.filter(source => source.sourceStamp).map(source => [source.id, source.sourceStamp]));
  for (const field of ['accounts', 'legacyAccounts']) {
    if (!Array.isArray(auth[field])) continue;
    auth[field] = auth[field].map(profile => stamps.has(profile.id) ? {
      ...profile, recordRecovery: { targetOwnerId, sourceStamp: stamps.get(profile.id) },
    } : profile);
  }
}
