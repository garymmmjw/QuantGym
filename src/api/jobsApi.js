export function createJobsApi(client = {}) {
  const request = client.request || client.cloudApi;
  return {
    list: () => request?.("/jobs")
  };
}
