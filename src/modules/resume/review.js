export function resolveResumeReviewConfig(options = {}) {
  const endpoint = String(options.endpoint || options.fallbackEndpoint || "").trim();
  const rawModel = options.model || options.fallbackModel || "";
  return {
    endpoint,
    model: options.normalizeModel?.(rawModel) || String(rawModel || "")
  };
}

export function createResumeReviewRequester(deps = {}) {
  const request = async (text = "") => {
    const config = resolveResumeReviewConfig({
      endpoint: deps.getEndpoint?.(),
      fallbackEndpoint: deps.getFallbackEndpoint?.(),
      model: deps.getModel?.(),
      fallbackModel: deps.getFallbackModel?.(),
      normalizeModel: deps.normalizeModel
    });
    if (!config.endpoint) throw new Error("Missing endpoint");
    deps.setLlmConfig?.(config);
    deps.saveLlmConfig?.();
    return deps.requestReview?.({
      endpoint: config.endpoint,
      headers: deps.getHeaders?.(),
      model: config.model,
      language: deps.getLanguage?.(),
      graduationTerm: deps.getGraduationTerm?.(),
      resume: text
    });
  };

  return { request };
}
