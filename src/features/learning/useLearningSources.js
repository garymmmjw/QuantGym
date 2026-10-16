import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppServicesContext, useAppStore, useAuthStore } from '../../stores/AppServicesContext.jsx';
import { membershipConnection } from '../membership/membershipApi.js';
import { loadLearningSources } from './learningSourcesLoader.mjs';

// Only the latest authenticated session is retained, briefly, in memory. The
// surrounding membership gate still rechecks authorization on each route.
let cachedSources = null;
const CACHE_TTL_MS = 30000;

/** Mount after the membership gate. Content never persists in browser storage. */
export function useLearningSources({ enabled = true } = {}) {
  const services = useAppServicesContext();
  const userId = useAuthStore(state => state.currentUser?.id || '');
  const config = useAppStore(state => state.cloudConfig || {});
  const { connected, token, baseUrl } = membershipConnection(config, userId);
  const key = `${userId}\n${baseUrl}\n${token}`;
  const currentKey = useRef(key); currentKey.current = key;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key: '', sources: null, loading: false, error: '' });
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (cachedSources?.key !== key) cachedSources = null;
    if (!enabled || !connected) { cachedSources = null; setState({ key, sources: null, loading: false, error: connected ? '' : '请先登录。' }); return; }
    if (revision === 0 && cachedSources?.key === key && Date.now() - cachedSources.at < CACHE_TTL_MS) {
      setState({ key, sources: cachedSources.sources, loading: false, error: '' }); return;
    }
    const controller = new AbortController();
    setState({ key, sources: null, loading: true, error: '' });
    loadLearningSources({ token, baseUrl, signal: controller.signal,
      isCurrent: () => key === currentKey.current,
      getCatalogProblems: () => services.getCatalogProblems(),
    }).then(sources => {
      if (controller.signal.aborted || key !== currentKey.current) return;
      cachedSources = { key, sources, at: Date.now() };
      setState({ key, loading: false, error: '', sources });
    }).catch(error => { if (!controller.signal.aborted && key === currentKey.current) { cachedSources = null; setState({ key, sources: null, loading: false, error: error.message }); } });
    return () => controller.abort();
  }, [enabled, connected, key, token, baseUrl, revision, services]);
  const current = state.key === key;
  return { sources: current && enabled ? state.sources : null, loading: enabled && connected && (!current || state.loading), error: current ? state.error : '', refresh };
}
