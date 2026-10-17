import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppServicesContext, useAppStore, useAuthStore } from '../../stores/AppServicesContext.jsx';
import { membershipConnection } from '../membership/membershipApi.js';
import { createLearningStateApi } from './learningStateApi.mjs';
import { createLearningCloudSync } from './learningCloudSync.mjs';
import { buildTrainingReport } from './scoring/training-system.mjs';

export function useLearningState(sources) {
  const services = useAppServicesContext();
  const userId = useAuthStore(state => state.currentUser?.id || '');
  const config = useAppStore(state => state.cloudConfig || {});
  const { connected, token, baseUrl } = membershipConnection(config, userId);
  const key = JSON.stringify([userId, baseUrl, token, connected]);
  const currentKey = useRef(key); currentKey.current = key;
  const controllerRef = useRef(null);
  const [state, setState] = useState({ key: '', sources: null, profile: null, learnProgress: null, report: null, error: '', syncing: false, cloud: null });
  const publish = useCallback((snapshot, cloud) => {
    const { profile, learnProgress } = snapshot;
    const report = buildTrainingReport(profile, { ...sources, learnXp: learnProgress.xp, learnCompleted: learnProgress.completed.length });
    setState({ key, sources, profile, learnProgress, report, updatedAt: snapshot.updatedAt, error: '', syncing: false, cloud });
  }, [key, sources]);

  useEffect(() => {
    if (!sources || !connected) return;
    let active = true, syncing = null;
    const aborter = new AbortController();
    const isSessionCurrent = () => {
      const latestConfig = services.stores.appStore.getState().cloudConfig || {};
      return currentKey.current === key
        && services.stores.authStore.getState().currentUser?.id === userId
        && latestConfig.userId === userId && latestConfig.token === token
        && membershipConnection(latestConfig, userId).baseUrl === baseUrl;
    };
    const isActive = () => active && isSessionCurrent();
    const api = createLearningStateApi({ userId, token, baseUrl, signal: aborter.signal, isActive: isSessionCurrent });
    const cloud = createLearningCloudSync({ userId, sources, ...api, scope: baseUrl, isActive: isSessionCurrent,
      onChange: snapshot => { if (isActive()) publish(snapshot, cloud); } });
    controllerRef.current = cloud;
    setState({ key, sources, profile: null, learnProgress: null, report: null, error: '', syncing: true, cloud });
    const sync = () => {
      if (!isActive() || document.visibilityState === 'hidden') return Promise.resolve();
      if (syncing) return syncing;
      setState(old => ({ ...old, syncing: true }));
      syncing = cloud.refresh().then(snapshot => { if (isActive()) publish(snapshot, cloud); })
        .catch(error => { if (isActive()) setState(old => ({ ...old, syncing: false, error: `云端同步未完成，原记录已保留：${error.message}` })); })
        .finally(() => { syncing = null; });
      return syncing;
    };
    cloud.wake = sync;
    sync();
    window.addEventListener('focus', sync);
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      active = false;
      // Route changes may follow a completed lesson immediately. Finish work
      // already queued for this account; live session checks still stop logout
      // or account/token changes before any subsequent request or cache update.
      cloud.drain().finally(() => { aborter.abort(); cloud.close(); });
      if (controllerRef.current === cloud) controllerRef.current = null;
      window.removeEventListener('focus', sync); window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [connected, key, userId, token, baseUrl, sources, services, publish]);

  const current = connected && state.key === key && state.sources === sources;
  const run = async operation => {
    const cloud = current && state.cloud;
    if (!cloud || !state.profile || controllerRef.current !== cloud) throw new Error('请等待账号的云端档案载入后再保存。');
    setState(old => ({ ...old, syncing: true }));
    try {
      const result = await operation(cloud);
      if (controllerRef.current !== cloud || currentKey.current !== key) throw new Error('账号或页面已切换，请在当前账号查看保存状态。');
      publish(cloud.getSnapshot(), cloud);
      return result;
    } finally {
      if (controllerRef.current === cloud && currentKey.current === key) setState(old => ({ ...old, syncing: false }));
    }
  };
  return { userId, sessionKey: key, ...(current ? state : { profile: null, learnProgress: null, report: null, error: '', syncing: true, cloud: null }),
    refresh: () => controllerRef.current?.wake(),
    submitAttempt: (problem, answer) => run(cloud => cloud.submitAttempt(problem, answer)),
    updatePreferences: patch => run(cloud => cloud.updatePreferences(patch, state.profile.prefs)),
  };
}
