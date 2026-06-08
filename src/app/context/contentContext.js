export function createContentContext(appContext = {}) {
  return {
    elements: appContext.elements,
    services: {
      switchModule: appContext.services?.switchModule,
      refreshIcons: appContext.services?.refreshIcons
    }
  };
}
