export function createNewsApi(client = {}) {
  const baseUrl = client.baseUrl || "";
  const requestText = client.requestText;
  return {
    fetchFeed: (path = "/news") => requestText?.(`${baseUrl}${path}`, client.options || {})
  };
}
