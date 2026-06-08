export function onDomReady(documentRef = globalThis.document, callback = () => {}) {
  if (documentRef?.readyState === "loading") {
    documentRef.addEventListener("DOMContentLoaded", callback, { once: true });
    return;
  }
  const enqueue = globalThis.queueMicrotask || ((fn) => setTimeout(fn, 0));
  enqueue(callback);
}

export async function runAppBootstrap(options = {}) {
  const {
    windowRef = globalThis.window,
    loadPagePartials = async () => {},
    bindElements = () => {},
    registerFeatureModules = () => {},
    bindEvents = () => {},
    setupButtonRipples = () => {},
    initRouter = () => {},
    renderSession = () => {},
    initGoogleLogin = () => {},
    renderTools = () => {},
    shouldRenderTools = false,
    refreshNews = () => {},
    refreshJobs = () => {},
    newsRefreshMs = 0,
    jobsRefreshMs = 0,
    updateGlobalSearchPlaceholder = () => {},
    refreshIcons = () => {},
    initHeroInteractions = () => {}
  } = options;

  windowRef?.scrollTo?.(0, 0);
  await loadPagePartials();
  bindElements();
  registerFeatureModules();
  const disposeEvents = bindEvents();
  setupButtonRipples();
  initRouter();
  renderSession();
  initGoogleLogin();
  if (shouldRenderTools) renderTools();
  const newsTimer = newsRefreshMs > 0 ? windowRef?.setInterval?.(refreshNews, newsRefreshMs) : 0;
  const jobsTimer = jobsRefreshMs > 0 ? windowRef?.setInterval?.(refreshJobs, jobsRefreshMs) : 0;
  windowRef?.addEventListener?.("resize", updateGlobalSearchPlaceholder);
  refreshIcons();
  initHeroInteractions();

  return () => {
    if (typeof disposeEvents === "function") disposeEvents();
    if (newsTimer) windowRef?.clearInterval?.(newsTimer);
    if (jobsTimer) windowRef?.clearInterval?.(jobsTimer);
    windowRef?.removeEventListener?.("resize", updateGlobalSearchPlaceholder);
  };
}
