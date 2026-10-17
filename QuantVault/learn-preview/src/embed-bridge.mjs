import { measureLearnDocument } from './embed-layout.mjs';

// The embedded reader receives data only from its authenticated, same-origin host.
// It never sees the site's access token and never fetches a static private export.
export function createLearnBridge(win, { timeoutMs = 15000, saveTimeoutMs = 45000, onSaveError = () => {}, onSaveState = () => {} } = {}) {
  const pending = new Map();
  const saveWaiters = new Set();
  let sequence = 0, initialized = false, progress = {}, userId = null, disposed = false, navigationVersion = 0;
  let editRevision = 0, confirmedRevision = 0, saving = null, saveError = null;
  let resolveReady, rejectReady, readyTimer, retryTimer;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const post = message => win.parent.postMessage(message, win.location.origin);
  const saveState = state => {
    onSaveState(state);
    post({ type: 'qg-learn-save-status', pending: state.phase !== 'saved', ...(state.error ? { error: state.error } : {}) });
  };
  const failPending = error => {
    for (const entry of pending.values()) { win.clearTimeout(entry.timer); entry.reject(error); }
    pending.clear();
  };
  const settleSaves = error => {
    for (const waiter of saveWaiters) error ? waiter.reject(error) : waiter.resolve();
    saveWaiters.clear();
  };
  const failSave = message => {
    if (saving) win.clearTimeout(saving.timer);
    saving = null; saveError = new Error(message);
    saveState({ phase: 'error', error: message });
    onSaveError(message); settleSaves(saveError);
  };
  // Keep one in-flight input snapshot. Further renderer edits are coalesced,
  // but remain in memory until the parent confirms a durable save. The parent
  // may merge independent cloud edits; its returned data must not replace newer
  // optimistic input here or become this reader's next delta baseline.
  const sendSave = () => {
    if (disposed || saving || saveError || confirmedRevision === editRevision) return;
    const requestId = `learn-save-${++sequence}`, revision = editRevision;
    const timer = win.setTimeout(() => {
      if (saving?.requestId === requestId) failSave('保存确认超时。当前输入仍保留，请检查网络后重试。');
    }, saveTimeoutMs);
    saving = { requestId, revision, timer };
    saveState({ phase: 'pending' });
    post({ type: 'qg-learn-progress', requestId, progress: structuredClone(progress) });
  };
  const flushProgress = ({ retry = false } = {}) => {
    if (disposed) return Promise.reject(new Error('Learn reader closed'));
    if (!initialized) return Promise.reject(new Error('Learn host is not ready'));
    if (retry && saveError) saveError = null;
    if (saveError) return Promise.reject(saveError);
    if (confirmedRevision === editRevision) return Promise.resolve();
    const promise = new Promise((resolve, reject) => saveWaiters.add({ resolve, reject }));
    sendSave();
    return promise;
  };
  const onMessage = event => {
    if (event.origin !== win.location.origin || event.source !== win.parent || !event.data || typeof event.data !== 'object') return;
    const data = event.data;
    if (data.type === 'qg-learn-init' && !initialized && typeof data.userId === 'string' && data.userId) {
      initialized = true; userId = data.userId;
      progress = data.progress && typeof data.progress === 'object' && !Array.isArray(data.progress) ? structuredClone(data.progress) : {};
      win.clearTimeout(readyTimer); win.clearInterval(retryTimer);
      resolveReady({ userId });
    } else if (data.type === 'qg-learn-saved' && initialized && saving && saving.requestId === data.requestId) {
      win.clearTimeout(saving.timer); confirmedRevision = saving.revision; saving = null; saveError = null;
      if (confirmedRevision === editRevision) { saveState({ phase: 'saved' }); settleSaves(); }
      else sendSave();
    } else if (data.type === 'qg-learn-save-error' && initialized && saving && saving.requestId === data.requestId) {
      failSave(String(data.error || '学习记录尚未同步，请检查连接后重试。'));
    } else if (data.type === 'qg-learn-flush' && initialized && typeof data.requestId === 'string') {
      flushProgress({ retry: true }).then(() => {
        if (!disposed) post({ type: 'qg-learn-flushed', requestId: data.requestId });
      }).catch(error => {
        if (!disposed) post({ type: 'qg-learn-flush-error', requestId: data.requestId, error: error.message });
      });
    } else if (data.type === 'qg-learn-response' && pending.has(data.requestId)) {
      const entry = pending.get(data.requestId); pending.delete(data.requestId); win.clearTimeout(entry.timer);
      if (data.error) entry.reject(new Error(String(data.error))); else entry.resolve(data.payload);
    }
  };
  const beforeUnload = event => {
    if (editRevision === confirmedRevision) return;
    event.preventDefault(); event.returnValue = '';
  };
  win.addEventListener('message', onMessage);
  win.addEventListener('beforeunload', beforeUnload);
  if (win.parent === win) {
    rejectReady(new Error('请从 QuantGym 的 Learn 页面打开课程。'));
  } else {
    readyTimer = win.setTimeout(() => {
      win.clearInterval(retryTimer);
      rejectReady(new Error('课程连接已超时，请返回 QuantGym 刷新页面。'));
    }, timeoutMs);
    retryTimer = win.setInterval(() => { if (!initialized) post({ type: 'qg-learn-ready' }); }, 500);
    post({ type: 'qg-learn-ready' });
  }
  return {
    ready,
    get userId() { return userId; },
    async request(resource, details = {}) {
      await ready;
      if (!['library', 'practice', 'problem'].includes(resource)) throw new Error('Unsupported embedded Learn resource');
      const requestId = `learn-${++sequence}`;
      return new Promise((resolve, reject) => {
        const timer = win.setTimeout(() => { pending.delete(requestId); reject(new Error('课程数据暂时无法加载，请刷新页面重试。')); }, timeoutMs);
        pending.set(requestId, { resolve, reject, timer });
        post({ type: 'qg-learn-request', ...details, requestId, resource });
      });
    },
    readProgress() { return structuredClone(progress); },
    writeProgress(value) {
      if (!initialized || disposed) throw new Error('Learn host is not ready');
      progress = structuredClone(value);
      editRevision += 1; sendSave();
    },
    flushProgress,
    retrySave: () => flushProgress({ retry: true }),
    get hasPendingProgress() { return editRevision !== confirmedRevision; },
    route(query) { if (initialized) post({ type: 'qg-learn-route', query }); },
    async navigate(details) {
      const requestedNavigation = ++navigationVersion;
      await flushProgress({ retry: true });
      if (!disposed && requestedNavigation === navigationVersion) post({ type: 'qg-learn-navigate', ...details });
    },
    reportLayout(height) { if (initialized) post({ type: 'qg-learn-layout', height }); },
    scrollToElement(element, options = {}) {
      if (!initialized || !element) return;
      // Let the new slide/modal finish its layout before moving the host page.
      win.requestAnimationFrame(() => {
        if (!element.isConnected) return;
        const rect = element.getBoundingClientRect();
        post({ type: 'qg-learn-layout', height: measureLearnDocument(win.document) });
        post({ type: 'qg-learn-scroll', top: rect.top + win.scrollY,
          bottom: rect.bottom + win.scrollY, block: options.block,
          behavior: options.behavior, onlyIfAbove: options.onlyIfAbove === true });
      });
    },
    destroy() {
      disposed = true;
      win.removeEventListener('message', onMessage);
      win.removeEventListener('beforeunload', beforeUnload);
      win.clearInterval(retryTimer); win.clearTimeout(readyTimer);
      if (saving) win.clearTimeout(saving.timer);
      settleSaves(new Error('Learn reader closed'));
      failPending(new Error('Learn reader closed'));
    },
  };
}

export function createRendererStorage(bridge) {
  return {
    getItem(key) { return bridge.readProgress().renderer?.[String(key)] ?? null; },
    setItem(key, value) {
      const p = bridge.readProgress();
      p.renderer = { ...p.renderer, [String(key)]: String(value) };
      bridge.writeProgress(p);
    },
    removeItem(key) {
      const p = bridge.readProgress();
      p.renderer = { ...p.renderer }; delete p.renderer[String(key)];
      bridge.writeProgress(p);
    },
  };
}

export function installEmbeddedNavigation(win, bridge) {
  const navigation = url => {
    if (url.searchParams.has('problem')) return { displayId: url.searchParams.get('problem'), lessonId: url.searchParams.get('fromPractice') || new URLSearchParams(win.location.search).get('lecture') || undefined };
    if (['assessment', 'training'].includes(url.searchParams.get('view'))) return { view: 'readiness' };
    if (url.pathname !== win.location.pathname || [...url.searchParams.keys()].some(key => !['track', 'topic', 'lecture', 'practice'].includes(key))) return null;
    return { query: url.searchParams.toString() };
  };
  const go = details => { bridge.navigate(details).catch(() => { /* Save status offers retry without leaving this input. */ }); };
  const cleanQuery = () => {
    const query = new URLSearchParams(win.location.search);
    for (const key of [...query.keys()]) if (!['track', 'topic', 'lecture', 'practice'].includes(key)) query.delete(key);
    return query.toString();
  };
  bridge.route(cleanQuery());
  const initial = navigation(new URL(win.location.href));
  if (initial && !Object.hasOwn(initial, 'query')) go(initial);
  const onClick = event => {
    const track = event.target.closest?.('button.lp__track-btn[data-track]');
    if (track) {
      event.preventDefault(); event.stopImmediatePropagation();
      go({ query: `track=${encodeURIComponent(track.dataset.track)}` }); return;
    }
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.getAttribute('href').startsWith('#') || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.getAttribute('href'), win.location.href);
    if (url.origin !== win.location.origin) return;
    const details = navigation(url);
    if (!details) return;
    event.preventDefault();
    // Captured inline click handlers may award completion first (Practice).
    // Let them run, then wait for those writes before replacing the frame.
    queueMicrotask(() => go(details));
  };
  win.document.addEventListener('click', onClick, true);
  return () => win.document.removeEventListener('click', onClick, true);
}

/** Adapt only the embedded entry: captured completion buttons otherwise assign
 * location immediately after banking XP, before a cloud save can finish. */
export function installEmbeddedRendererNavigation(win, bridge) {
  const viewer = win.SlideViewer;
  if (!viewer?.render || !viewer?.handleComplete) return () => {};
  const render = viewer.render, handleComplete = viewer.handleComplete;
  let metadata = null;
  viewer.render = function (data, element, options) {
    metadata = options;
    return render.call(this, data, element, options);
  };
  viewer.handleComplete = async action => {
    try {
      await viewer.bankXp?.();
      const href = action === 'next' && metadata?.nextUrl ? metadata.nextUrl : metadata?.mapUrl || '?';
      const url = new URL(href, win.location.href);
      if (url.origin !== win.location.origin) return;
      await bridge.navigate({ query: url.searchParams.toString() });
    } catch { /* Keep the lesson open; the save banner provides retry. */ }
  };
  return () => { viewer.render = render; viewer.handleComplete = handleComplete; };
}
