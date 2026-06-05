const registeredModules = new Map();
let mountedModuleName = "";

export function registerModule(name, lifecycle = {}) {
  if (!name) return;
  registeredModules.set(name, {
    mount: typeof lifecycle.mount === "function" ? lifecycle.mount : null,
    render: typeof lifecycle.render === "function" ? lifecycle.render : null,
    unmount: typeof lifecycle.unmount === "function" ? lifecycle.unmount : null
  });
}

export function getModuleLifecycle(name) {
  return registeredModules.get(name) || null;
}

export function runModuleLifecycle(name) {
  if (mountedModuleName && mountedModuleName !== name) {
    getModuleLifecycle(mountedModuleName)?.unmount?.();
  }
  const lifecycle = getModuleLifecycle(name);
  if (mountedModuleName !== name) {
    lifecycle?.mount?.();
    mountedModuleName = name;
  }
  lifecycle?.render?.();
  return lifecycle;
}

export function renderModules(names = []) {
  names.forEach((name) => {
    getModuleLifecycle(name)?.render?.();
  });
}
