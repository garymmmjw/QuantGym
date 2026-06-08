export function createShellContext(appContext = {}) {
  return {
    documentRef: appContext.documentRef,
    windowRef: appContext.windowRef,
    elements: appContext.elements,
    appStore: appContext.stores?.appStore,
    preferencesStore: appContext.stores?.preferencesStore,
    services: {
      switchModule: appContext.services?.switchModule,
      renderAll: appContext.services?.renderAll,
      refreshIcons: appContext.services?.refreshIcons
    }
  };
}
