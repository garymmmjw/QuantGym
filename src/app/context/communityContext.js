export function createCommunityContext(appContext = {}) {
  return {
    communityStore: appContext.stores?.communityStore,
    elements: appContext.elements,
    services: {
      switchModule: appContext.services?.switchModule
    }
  };
}
