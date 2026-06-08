import { getDefaultModuleId, isProtectedModule } from "../modules/manifest.js";

export function getAuthenticatedRouteDecision(currentUser = null, moduleName = "", options = {}) {
  const fallbackModule = options.fallbackModule || getDefaultModuleId();
  const requestedModule = moduleName || fallbackModule;
  const authenticated = Boolean(currentUser);
  const protectedRoute = isProtectedModule(requestedModule);

  return {
    authenticated,
    protectedRoute,
    requestedModule,
    targetModule: authenticated ? requestedModule : "",
    shouldSwitch: authenticated && (protectedRoute ? authenticated : true)
  };
}

export function getSessionRouteRestoreDecision(currentUser = null, routeModule = "", options = {}) {
  const fallbackModule = options.fallbackModule || getDefaultModuleId();
  const targetModule = routeModule || fallbackModule;
  const authenticated = Boolean(currentUser);
  const protectedRoute = isProtectedModule(targetModule);

  return {
    authenticated,
    protectedRoute,
    targetModule,
    shouldRestore: authenticated && (!protectedRoute || authenticated)
  };
}
