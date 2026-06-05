import {
  mergeCloudCommunity,
  normalizeCommunityStore
} from './data.js';
import {
  readJsonStorage,
  writeJsonStorage
} from '../../state/persistence.js';

export function createCommunityRuntime(deps = {}) {
  const storageKey = deps.storageKey || "";

  function getDataDeps() {
    return {
      makeId: deps.makeId,
      normalizeExperience: deps.normalizeExperience,
      normalizeCountry: deps.normalizeCountry,
      normalizeRegionForCountry: deps.normalizeRegionForCountry
    };
  }

  function normalizeStore(raw = {}) {
    return normalizeCommunityStore(raw, getDataDeps());
  }

  function load() {
    return normalizeStore(readJsonStorage(storageKey, {}));
  }

  function save(options = {}) {
    writeJsonStorage(storageKey, deps.getStore?.() || {});
    if (options.sync !== false) deps.queueCloudSync?.("community");
    if (options.checkIn !== false) deps.persistActivity?.();
  }

  function mergeCloud(remoteCommunity, localCommunity) {
    return mergeCloudCommunity(remoteCommunity, localCommunity, {
      ...getDataDeps(),
      mergeRecordsById: deps.mergeRecordsById,
      latestIso: deps.latestIso
    });
  }

  return {
    load,
    mergeCloud,
    normalizeStore,
    save
  };
}
