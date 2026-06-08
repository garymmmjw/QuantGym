export function createAuthContext(appContext = {}) {
  return {
    authStore: appContext.stores?.authStore,
    userStateStore: appContext.stores?.userStateStore,
    elements: appContext.elements,
    services: {
      switchModule: appContext.services?.switchModule
    }
  };
}
