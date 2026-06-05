export function upsertJobItems(existingJobs = [], items = [], options = {}) {
  const normalizeItem = options.normalizeItem || ((item) => item);
  const isValidUrl = options.isValidUrl || (() => true);
  const byId = new Map((Array.isArray(existingJobs) ? existingJobs : []).map((item) => [item.id, item]));

  items.map(normalizeItem).forEach((item) => {
    if (!isValidUrl(item.url)) return;
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item });
  });

  return [...byId.values()];
}
