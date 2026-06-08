import { onDomReady, runAppBootstrap } from "../ui/bootstrap.js";

export function bootstrapApp(appServices = {}) {
  const { bootstrap = {}, documentRef = document, windowRef = window } = appServices;
  let dispose = () => {};
  let disposed = false;

  onDomReady(documentRef, async () => {
    const nextDispose = await runAppBootstrap({
      windowRef,
      loadPagePartials: bootstrap.loadPagePartials,
      bindElements: bootstrap.bindElements,
      registerFeatureModules: bootstrap.registerFeatureModules,
      bindEvents: bootstrap.bindEvents,
      setupButtonRipples: bootstrap.setupButtonRipples,
      initRouter: bootstrap.initRouter,
      renderSession: bootstrap.renderSession,
      initGoogleLogin: bootstrap.initGoogleLogin,
      renderTools: bootstrap.renderTools,
      shouldRenderTools: bootstrap.shouldRenderTools,
      refreshNews: bootstrap.refreshNews,
      refreshJobs: bootstrap.refreshJobs,
      newsRefreshMs: bootstrap.newsRefreshMs,
      jobsRefreshMs: bootstrap.jobsRefreshMs,
      updateGlobalSearchPlaceholder: bootstrap.updateGlobalSearchPlaceholder,
      refreshIcons: bootstrap.refreshIcons,
      initHeroInteractions: bootstrap.initHeroInteractions
    });
    if (disposed) {
      nextDispose?.();
      return;
    }
    dispose = nextDispose;
  });

  return () => {
    disposed = true;
    dispose?.();
  };
}
