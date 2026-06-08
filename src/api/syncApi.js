export { requestJson } from "./client.js";

export function createSyncApi(client = {}) {
  const request = client.request || client.cloudApi;
  return {
    pullState: () => request?.("/sync/state"),
    pushState: (body = {}) => request?.("/sync/state", { method: "PUT", body })
  };
}
