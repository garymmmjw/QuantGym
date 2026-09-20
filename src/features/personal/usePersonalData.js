import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuthStore, useAppStore, useAppServicesContext, useUserStateStore } from '../../stores/AppServicesContext.jsx';
import { createPersonalState } from './personalStore.js';
import { createPersonalDataRegistry } from './personalDataRegistry.js';

const registry = createPersonalDataRegistry();
const emptyLegacyState = {};
const disabledSnapshot = { data: createPersonalState(), error: '', dirty: false, conflict: false };
const disabledCloud = { phase: 'local' };
const subscribeDisabled = () => () => {};
const getDisabledSnapshot = () => disabledSnapshot;
const getDisabledCloud = () => disabledCloud;
const syncDisabled = () => Promise.resolve();

export function usePersonalData({ enabled = true } = {}) {
  const services = useAppServicesContext();
  const user = useAuthStore(state => state.currentUser);
  const legacyState = useUserStateStore(state => state.value || emptyLegacyState);
  const cloudConfig = useAppStore(state => state.cloudConfig);
  const ownerId = enabled && typeof user?.id === 'string' && user.id ? user.id : '';
  const language = services.getLanguage?.() || 'zh';
  const store = useMemo(() => registry.getStore(ownerId), [ownerId]);
  const connection = useMemo(() => registry.getConnection(ownerId, cloudConfig || {}),
    [ownerId, cloudConfig?.endpoint, cloudConfig?.token, cloudConfig?.userId]);
  const snapshot = useSyncExternalStore(store?.subscribe || subscribeDisabled, store?.getSnapshot || getDisabledSnapshot, getDisabledSnapshot);
  const cloud = useSyncExternalStore(connection?.subscribe || subscribeDisabled, connection?.getSnapshot || getDisabledCloud, getDisabledCloud);

  useEffect(() => connection?.retain(), [connection]);

  return { store, snapshot, cloud, sync: connection?.sync || syncDisabled, ownerId, language, legacyState: ownerId ? legacyState : emptyLegacyState };
}
