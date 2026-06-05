import {
  getJobsEndpoint,
  normalizeJobItem,
  requestJobsFromApi
} from './data.js';
import { upsertJobItems } from './mutations.js';

export function createJobsProvider(deps = {}) {
  function getEndpoint() {
    return getJobsEndpoint(deps.getEndpointBase?.() || deps.defaultEndpoint);
  }

  function normalizeItem(raw = {}) {
    return normalizeJobItem(raw, {
      seedJobs: deps.seedJobs,
      parseTags: deps.parseTags,
      stableId: deps.stableId,
      makeId: deps.makeId
    });
  }

  async function requestFromApi() {
    return requestJobsFromApi({
      endpoint: getEndpoint(),
      normalizeItem
    });
  }

  function upsert(items, options = {}) {
    const state = deps.getState?.() || {};
    const normalizeJobs = deps.normalizeJobs || ((jobs) => Array.isArray(jobs) ? jobs : []);
    state.jobs = upsertJobItems(normalizeJobs(state.jobs), items, {
      normalizeItem,
      isValidUrl: deps.isValidUrl || (() => true)
    });
    deps.saveState?.({ checkIn: options.checkIn !== false });
    return state.jobs;
  }

  return {
    getEndpoint,
    normalizeItem,
    requestFromApi,
    upsert
  };
}
