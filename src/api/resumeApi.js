export function createResumeApi(client = {}) {
  const request = client.request || client.llmRequest;
  return {
    review: (body = {}) => request?.("/resume-review", { method: "POST", body })
  };
}
