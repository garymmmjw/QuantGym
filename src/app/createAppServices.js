import { createAppContext } from "./createAppContext.js";

export function createAppServices(options = {}) {
  const context = createAppContext(options);
  return {
    ...context,
    getModuleLifecycle: context.getModuleLifecycle,
    runModuleLifecycle: context.runModuleLifecycle,
    renderModules: context.renderModules
  };
}
