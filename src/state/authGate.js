export function getAuthenticatedRouteDecision(currentUser = null, moduleName = "", options = {}) {
  const fallbackModule = options.fallbackModule || "overview";
  const requestedModule = moduleName || fallbackModule;
  const authenticated = Boolean(currentUser);
  return {
    authenticated,
    requestedModule,
    targetModule: authenticated ? requestedModule : "",
    shouldSwitch: authenticated
  };
}

export function getSessionRouteRestoreDecision(currentUser = null, routeModule = "", options = {}) {
  const fallbackModule = options.fallbackModule || "overview";
  const targetModule = routeModule || fallbackModule;
  const authenticated = Boolean(currentUser);
  return {
    authenticated,
    targetModule,
    shouldRestore: authenticated
  };
}
