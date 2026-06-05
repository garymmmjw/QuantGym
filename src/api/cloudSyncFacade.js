export function createCloudSyncFacade(deps = {}) {
  const getController = () => deps.getController?.() || null;

  return {
    queue(scope, delay) {
      return getController()?.queue(scope, delay);
    },
    async flush() {
      return getController()?.flush?.();
    }
  };
}
