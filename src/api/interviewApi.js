export function createInterviewApi(client = {}) {
  const request = client.request || client.llmRequest;
  return {
    startSession: (body = {}) => request?.("/interview", { method: "POST", body }),
    classifyLog: (body = {}) => request?.("/classify", { method: "POST", body })
  };
}
