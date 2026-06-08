export function createProblemContext(appContext = {}) {
  return {
    userStateStore: appContext.stores?.userStateStore,
    elements: appContext.elements,
    services: {
      switchModule: appContext.services?.switchModule,
      refreshIcons: appContext.services?.refreshIcons
    }
  };
}
