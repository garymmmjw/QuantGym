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

  async function requestFromCloudApi() {
    if (!deps.cloudApi) return [];
    const data = await deps.cloudApi("/jobs", { auth: false });
    const items = Array.isArray(data) ? data : data.items || data.jobs || [];
    return items.map(normalizeItem);
  }

  async function requestFromApi() {
    let cloudError = null;
    try {
      const items = await requestFromCloudApi();
      if (items.length) return items;
    } catch (error) {
      cloudError = error;
    }
    try {
      return await requestJobsFromApi({
        endpoint: getEndpoint(),
        normalizeItem
      });
    } catch (error) {
      throw cloudError || error;
    }
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
    requestFromCloudApi,
    requestFromApi,
    upsert
  };
}
