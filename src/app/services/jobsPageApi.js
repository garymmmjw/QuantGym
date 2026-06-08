export function createJobsPageApi(deps = {}, userStateApi = {}) {
  const { getUserState } = userStateApi;
  return {
    getJobs: () => deps.normalizeJobs?.(getUserState().jobs || []) || [],
    refresh: (showStatus) => deps.refreshJobs?.(showStatus),
    formatPrompt: deps.formatJobPrompt
  };
}
