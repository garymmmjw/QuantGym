export function createProblemStateCache(options = {}) {
  let sourceRef = null;
  let cache = null;
  const normalizeState = options.normalizeState || ((value) => value);

  function clear() {
    sourceRef = null;
    cache = null;
  }

  function getMap(source = []) {
    const safeSource = Array.isArray(source) ? source : [];
    if (cache && sourceRef === safeSource) return cache;
    sourceRef = safeSource;
    cache = new Map(safeSource.map((item) => [item.problemId, item]));
    return cache;
  }

  function get(problemId, source = []) {
    const map = getMap(source);
    return map.get(problemId) || normalizeState({ problemId });
  }

  return {
    clear,
    getMap,
    get
  };
}
