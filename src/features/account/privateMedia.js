export function privateMediaRequest(source, config = {}, ownerId = '') {
  let url, endpoint;
  try { endpoint = new URL(config.endpoint); } catch { /* Session configuration may be loading. */ }
  try {
    url = new URL(source, endpoint ? `${endpoint.origin}/` : 'https://unconfigured.invalid/');
  } catch { return null; }
  const privatePath = /^\/api\/media\/[^/]+\/?$/.test(url.pathname);
  // Missing or changed account configuration must not expose a private URL as an anonymous image.
  if (!endpoint) return privatePath ? { blocked: true } : null;
  const prefix = `${endpoint.pathname.replace(/\/+$/, '')}/media/`;
  if (url.origin !== endpoint.origin || !url.pathname.startsWith(prefix) || !url.pathname.slice(prefix.length)
      || url.pathname.slice(prefix.length).includes('/')) return privatePath ? { blocked: true } : null;
  // A matching API URL must never fall back to an anonymous image request.
  if (!ownerId || config.userId !== ownerId || !config.token) return { blocked: true };
  return { url: url.href, token: config.token };
}

export async function fetchPrivateImage(source, config, ownerId, { fetchImpl = globalThis.fetch, signal } = {}) {
  const request = privateMediaRequest(source, config, ownerId);
  if (!request) return { source };
  if (request.blocked) return { source: '' };
  const response = await fetchImpl(request.url, { headers: { Authorization: `Bearer ${request.token}` }, cache: 'no-store', signal, redirect: 'error' });
  if (!response.ok) throw new Error('Private image unavailable');
  const blob = await response.blob();
  if (!/^image\/(png|jpeg|webp|gif)$/.test(blob.type)) throw new Error('Unsupported image');
  return { blob };
}
