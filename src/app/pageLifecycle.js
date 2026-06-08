export function createPageLifecycle(controllers = {}) {
  let mountedModuleName = "";

  function getLifecycle(name) {
    return controllers[name] || null;
  }

  function runModuleLifecycle(name) {
    if (mountedModuleName && mountedModuleName !== name) {
      getLifecycle(mountedModuleName)?.unmount?.();
    }
    const lifecycle = getLifecycle(name);
    if (mountedModuleName !== name) {
      lifecycle?.mount?.();
      mountedModuleName = name;
    }
    lifecycle?.render?.();
    return lifecycle;
  }

  function renderModules(names = []) {
    names.forEach((name) => {
      getLifecycle(name)?.render?.();
    });
  }

  return {
    getModuleLifecycle: getLifecycle,
    runModuleLifecycle,
    renderModules
  };
}
