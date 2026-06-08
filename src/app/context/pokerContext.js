export function createPokerContext(appContext = {}) {
  return {
    elements: appContext.elements,
    windowRef: appContext.windowRef,
    services: {
      switchModule: appContext.services?.switchModule,
      refreshIcons: appContext.services?.refreshIcons
    }
  };
}
