export function createInterviewContext(appContext = {}) {
  return {
    userStateStore: appContext.stores?.userStateStore,
    elements: appContext.elements,
    services: {
      switchModule: appContext.services?.switchModule
    }
  };
}
