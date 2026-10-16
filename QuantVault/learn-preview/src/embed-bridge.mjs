import { measureLearnDocument } from './embed-layout.mjs';

// The embedded reader receives data only from its authenticated, same-origin host.
// It never sees the site's access token and never fetches a static private export.
export function createLearnBridge(win, { timeoutMs = 15000, onSaveError = () => {} } = {}) {
  const pending = new Map();
  let sequence = 0, initialized = false, progress = {}, userId = null;
  let resolveReady, rejectReady, readyTimer, retryTimer;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const post = message => win.parent.postMessage(message, win.location.origin);
  const failPending = error => {
    for (const entry of pending.values()) { win.clearTimeout(entry.timer); entry.reject(error); }
    pending.clear();
  };
  const onMessage = event => {
    if (event.origin !== win.location.origin || event.source !== win.parent || !event.data || typeof event.data !== 'object') return;
    const data = event.data;
    if (data.type === 'qg-learn-init' && !initialized && typeof data.userId === 'string' && data.userId) {
      initialized = true; userId = data.userId;
      progress = data.progress && typeof data.progress === 'object' && !Array.isArray(data.progress) ? structuredClone(data.progress) : {};
      win.clearTimeout(readyTimer); win.clearInterval(retryTimer);
      resolveReady({ userId });
    } else if (data.type === 'qg-learn-save-error' && initialized) {
      onSaveError(String(data.error || '浏览器存储暂时不可用。'));
    } else if (data.type === 'qg-learn-response' && pending.has(data.requestId)) {
      const entry = pending.get(data.requestId); pending.delete(data.requestId); win.clearTimeout(entry.timer);
      if (data.error) entry.reject(new Error(String(data.error))); else entry.resolve(data.payload);
    }
  };
  win.addEventListener('message', onMessage);
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
      if (!initialized) throw new Error('Learn host is not ready');
      progress = structuredClone(value);
      post({ type: 'qg-learn-progress', progress: structuredClone(progress) });
    },
    route(query) { if (initialized) post({ type: 'qg-learn-route', query }); },
    navigate(details) { if (initialized) post({ type: 'qg-learn-navigate', ...details }); },
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
      win.removeEventListener('message', onMessage);
      win.clearInterval(retryTimer); win.clearTimeout(readyTimer);
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
  const cleanQuery = () => {
    const query = new URLSearchParams(win.location.search);
    for (const key of [...query.keys()]) if (!['track', 'topic', 'lecture', 'practice'].includes(key)) query.delete(key);
    return query.toString();
  };
  const redirect = url => {
    if (url.searchParams.has('problem')) {
      bridge.navigate({ displayId: url.searchParams.get('problem'), lessonId: url.searchParams.get('fromPractice') || new URLSearchParams(win.location.search).get('lecture') || undefined });
      return true;
    }
    if (['assessment', 'training'].includes(url.searchParams.get('view'))) {
      bridge.navigate({ view: 'readiness' }); return true;
    }
    return false;
  };
  bridge.route(cleanQuery());
  redirect(new URL(win.location.href));
  const onClick = event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    const url = new URL(anchor.getAttribute('href'), win.location.href);
    if (url.origin !== win.location.origin) return;
    if (redirect(url)) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  win.document.addEventListener('click', onClick, true);
  return () => win.document.removeEventListener('click', onClick, true);
}
