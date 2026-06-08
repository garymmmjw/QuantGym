import { onDomReady, runAppBootstrap } from "../ui/bootstrap.js";
import { createAppContext } from "./createAppContext.js";

export function startVanillaApp(options = {}) {
  const context = createAppContext(options);
  const { bootstrap, documentRef, windowRef } = context;

  onDomReady(documentRef, () => runAppBootstrap({
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
  }));

  return context;
}
