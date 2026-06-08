export function createMemoryPageApi(deps = {}, userStateApi = {}) {
  const { getUserState, setUserPatch } = userStateApi;
  const undoLatestEntry = () => {
    const state = getUserState();
    const entries = Array.isArray(state.entries) ? state.entries : [];
    if (!entries.length) return { changed: false, entry: null };

    const entry = entries[entries.length - 1];
    const skills = { ...(state.skills || {}) };
    const skillDefs = deps.skillDefs || {};
    Object.entries(entry.gains || {}).forEach(([key, value]) => {
      if (!skillDefs[key]) return;
      skills[key] = Math.max(0, Number(skills[key] || 0) - Number(value || 0));
    });
    setUserPatch({
      entries: entries.slice(0, -1),
      skills
    });
    return { changed: true, entry };
  };

  return {
    getEntries: () => getUserState().entries || [],
    getResources: () => deps.normalizeResources?.(getUserState().resources || []) || [],
    setResources(resources) {
      setUserPatch({ resources });
    },
    normalizeResources: deps.normalizeResources,
    normalizeContentSources: deps.normalizeContentSources,
    undoLatestEntry
  };
}
