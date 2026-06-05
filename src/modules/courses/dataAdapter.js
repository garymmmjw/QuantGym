import { normalizeContentSources as normalizeContentSourcesValue } from './data.js';

export function createCoursesDataAdapter(deps = {}) {
  return {
    normalizeContentSources(rawSources, fallback = {}) {
      return normalizeContentSourcesValue(rawSources, fallback, {
        stableId: deps.stableId,
        inferSource: deps.inferSource,
        safeExternalUrl: deps.safeExternalUrl
      });
    }
  };
}
