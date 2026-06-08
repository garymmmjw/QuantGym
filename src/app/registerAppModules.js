import { registerAppFeatureModules } from "./featureModules.js";

export function registerAppModules(context = {}) {
  const register = context.registerFeatureModules || context.bootstrap?.registerFeatureModules;
  if (typeof register === "function") {
    register();
    return;
  }
  if (typeof context.buildRegistrationDeps === "function") {
    registerAppFeatureModules(context.buildRegistrationDeps());
  }
}
