export function normalizeResources(rawResources = [], deps = {}) {
  const {
    normalizeContentSources = () => [],
    inferSource = () => "",
    makeId = () => `${Date.now()}-${Math.random()}`
  } = deps;
  return (Array.isArray(rawResources) ? rawResources : []).map((resource) => {
    const content = String(resource?.content || "").trim();
    const urlSources = normalizeContentSources(resource?.sources, {
      title: resource?.type === "link" ? "Original" : "",
      provider: resource?.type === "link" ? inferSource(content) || "Original" : "",
      url: /^https?:\/\//i.test(content) ? content : ""
    });
    return {
      id: String(resource?.id || makeId()),
      title: String(resource?.title || "").trim(),
      type: String(resource?.type || "note").trim(),
      content,
      sources: urlSources,
      dataUrl: String(resource?.dataUrl || ""),
      date: resource?.date || resource?.createdAt || new Date().toISOString()
    };
  }).filter((resource) => resource.title || resource.content || resource.dataUrl);
}
