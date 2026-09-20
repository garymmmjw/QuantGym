import { personalDataRegistry } from '../personal/personalDataRegistry.js';
import { getTrackerWorkspace } from '../tracker/trackerSyncBridge.js';

export async function syncAccountData({ getSession, syncProfile, registry = personalDataRegistry,
  getWorkspace = getTrackerWorkspace, storage = globalThis.localStorage, eventTarget = globalThis.window, en = false }) {
  const text = (zh, english) => en ? english : zh;
  const { user, config = {} } = getSession();
  if (!user?.id || !config.endpoint || !config.token || config.userId !== user.id) {
    return { ok: false, code: 'reauthRequired', message: text('请先登录，再同步记录。', 'Sign in before syncing your records.') };
  }
  const ownerId = user.id;
  const credentials = { endpoint: config.endpoint, token: config.token, userId: config.userId };
  const sameSession = () => {
    const latest = getSession();
    return latest.user?.id === ownerId && Object.entries(credentials).every(([key, value]) => latest.config?.[key] === value);
  };
  let release;
  try {
    const store = registry.getStore(ownerId);
    const workspace = getWorkspace({ ownerId, personalStore: store, storage, eventTarget });
    release = workspace.retain();
    if (workspace.getSnapshot().error) throw new Error('Tracker migration needs recovery.');
    const [profile, personal] = await Promise.allSettled([
      syncProfile(), registry.syncOwner(ownerId, credentials).then(status => ({ status, data: store.getSnapshot().data }))
    ]);
    if (!sameSession()) return { ok: false, code: 'sessionChanged', message: text('账号已切换，请在当前账号重新同步。', 'The account changed. Sync again in the current account.') };
    if (profile.status !== 'fulfilled' || profile.value?.ok !== true
      || personal.status !== 'fulfilled' || personal.value?.status?.phase !== 'synced'
      || personal.value?.data !== store.getSnapshot().data
      || workspace.getSnapshot().error || store.getSnapshot().error || store.getSnapshot().conflict || store.getSnapshot().dirty) {
      return { ok: false, code: 'incomplete', message: text('部分记录尚未同步，当前设备上的记录已保留，请检查网络或重新登录后重试。', 'Some records are still unsynced. Records on this device are retained; check your connection or sign in again, then retry.') };
    }
    return { ok: true, message: text('投递记录、求职阶段和训练数据已同步。', 'Applications, career stages, and training records are synced.') };
  } catch {
    return { ok: false, code: 'syncFailed', message: text('同步未完成，原有记录已保留，请重试。', 'Sync did not complete. Existing records are retained; please retry.') };
  } finally { release?.(); }
}
