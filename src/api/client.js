export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status || 0;
    this.data = options.data || {};
  }
}

export async function requestJson(path, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const requestUrl = resolveRequestUrl(path, options.baseUrl || "");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  if (options.auth !== false && options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetchImpl(requestUrl, {
    method: options.method || "GET",
    headers,
    body: serializeBody(options.body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || data.message || `API ${response.status}`, {
      status: response.status,
      data
    });
  }
  return data;
}

export async function requestText(path, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const requestUrl = resolveRequestUrl(path, options.baseUrl || "");
  const response = await fetchImpl(requestUrl, {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body,
    cache: options.cache
  });
  const text = await response.text().catch(() => "");
  if (!response.ok) {
    throw new ApiError(text || `Request ${response.status}`, {
      status: response.status,
      data: { text }
    });
  }
  return text;
}

export function resolveRequestUrl(path, baseUrl = "") {
  const value = String(path || "").trim();
  if (/^https?:\/\//i.test(value)) return value;

  const base = String(baseUrl || "").trim().replace(/\/+$/, "");
  const requestPath = value.startsWith("/") ? value : `/${value}`;
  return `${base}${requestPath}`;
}

function serializeBody(body) {
  if (body === undefined) return undefined;
  if (typeof body === "string") return body;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  if (typeof Blob !== "undefined" && body instanceof Blob) return body;
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) return body;
  return JSON.stringify(body);
}
