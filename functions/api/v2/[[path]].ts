import {
  applyEdgeResponsePolicy,
  edgeFailure,
  getSetCookieValues,
  isGoogleCallbackRequest,
  type EdgePagesContext,
} from "./_middleware";

export interface EdgeProxyEnvironment {
  QUANTGYM_EDGE_SHARED_SECRET?: string;
}

interface EdgeRequestInit extends RequestInit {
  duplex?: "half";
}

export type EdgeFetch = (
  input: RequestInfo | URL,
  init?: EdgeRequestInit,
) => Promise<Response>;

interface EdgeProxyContext extends Omit<EdgePagesContext<EdgeProxyEnvironment>, "next"> {
  fetch?: EdgeFetch;
}

const ALLOWED_METHODS = Object.freeze([
  "GET",
  "HEAD",
  "OPTIONS",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const);
const ALLOWED_METHOD_SET = new Set<string>(ALLOWED_METHODS);
const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const APPROVED_COOKIE_NAMES = new Set(["__Host-qg_session", "__Host-qg_csrf"]);
const GOOGLE_AUTHORIZATION_ORIGIN = "https://accounts.google.com";
const GOOGLE_AUTHORIZATION_PATH = "/o/oauth2/v2/auth";
const EDGE_PROOF_HEADER = "x-quantgym-edge-token";
const PREVIEW_HOST = "quantgym-v2-preview.pages.dev";
const PREVIEW_ORIGIN = `https://${PREVIEW_HOST}`;
const UPSTREAM_ORIGIN = "https://quantgym-v2-preview-api.onrender.com";
const MAX_REQUEST_BODY_BYTES = 1_048_576;

export const EDGE_PROXY_CONFIG = Object.freeze({
  allowedMethods: ALLOWED_METHODS,
  edgeProofHeader: "X-QuantGym-Edge-Token",
  maxRequestBodyBytes: MAX_REQUEST_BODY_BYTES,
  previewHost: PREVIEW_HOST,
  previewOrigin: PREVIEW_ORIGIN,
  upstreamOrigin: UPSTREAM_ORIGIN,
});

const REQUEST_HEADERS_ALWAYS_REMOVED = new Set([
  "authorization",
  "cf-connecting-ip",
  "connection",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
  EDGE_PROOF_HEADER,
]);

const RESPONSE_HEADERS_ALWAYS_REMOVED = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "server",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
  "x-powered-by",
]);

const hasUnsafeControl = (value: string): boolean => [...value].some((character) => {
  const codePoint = character.codePointAt(0);
  return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
});

const validEdgeSecret = (value: unknown): value is string => (
  typeof value === "string"
  && value.length >= 32
  && value.length <= 512
  && !hasUnsafeControl(value)
  && !/\s/u.test(value)
);

const invalidPathEncoding = (pathname: string): boolean => (
  /%(?:2e|2f|5c|25)/iu.test(pathname)
  || /%(?![0-9a-f]{2})/iu.test(pathname)
);

const normalizedSafePath = (pathname: string): boolean => {
  if (!pathname.startsWith("/") || pathname.includes("\\") || /\/{2,}/u.test(pathname)) {
    return false;
  }
  if (invalidPathEncoding(pathname)) return false;

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (hasUnsafeControl(decoded) || decoded.includes("\\") || /\/{2,}/u.test(decoded)) return false;
  return decoded.split("/").every((segment) => segment !== "." && segment !== "..");
};

const isV2Route = (pathname: string): boolean => (
  pathname === "/api/v2" || pathname.startsWith("/api/v2/")
);

const connectionHeaderTokens = (headers: Headers): Set<string> => {
  const result = new Set<string>();
  for (const token of (headers.get("connection") ?? "").split(",")) {
    const normalized = token.trim().toLowerCase();
    if (normalized) result.add(normalized);
  }
  return result;
};

type CookieFilterResult = { ok: true; value: string | null } | { ok: false };

const approvedRequestCookies = (rawCookie: string | null): CookieFilterResult => {
  if (!rawCookie) return { ok: true, value: null };
  const approved: string[] = [];
  const seen = new Set<string>();

  for (const rawPart of rawCookie.split(";")) {
    const part = rawPart.trim();
    if (!part) continue;
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    if (!APPROVED_COOKIE_NAMES.has(name)) continue;
    const value = part.slice(separator + 1).trim();
    if (seen.has(name) || value.length > 4096 || hasUnsafeControl(value)) return { ok: false };
    seen.add(name);
    approved.push(`${name}=${value}`);
  }
  return { ok: true, value: approved.length > 0 ? approved.join("; ") : null };
};

const trustedClientIp = (headers: Headers): string | null => {
  const value = (headers.get("cf-connecting-ip") ?? "").trim();
  if (
    value.length === 0
    || value.length > 64
    || !/^[0-9a-f:.]+$/iu.test(value)
    || (!value.includes(".") && !value.includes(":"))
  ) {
    return null;
  }
  return value;
};

const proxyRequestHeaders = (
  source: Headers,
  edgeSecret: string,
): Headers | null => {
  const cookies = approvedRequestCookies(source.get("cookie"));
  if (!cookies.ok) return null;

  const removedByConnection = connectionHeaderTokens(source);
  const clientIp = trustedClientIp(source);
  const headers = new Headers(source);

  for (const name of [...headers.keys()]) {
    const normalized = name.toLowerCase();
    if (
      REQUEST_HEADERS_ALWAYS_REMOVED.has(normalized)
      || removedByConnection.has(normalized)
      || normalized.startsWith("cf-")
      || normalized.startsWith("sec-websocket-")
    ) {
      headers.delete(name);
    }
  }

  headers.delete("cookie");
  if (cookies.value) headers.set("cookie", cookies.value);
  headers.set(EDGE_PROOF_HEADER, edgeSecret);
  headers.set("x-forwarded-host", PREVIEW_HOST);
  headers.set("x-forwarded-proto", "https");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("cache-control", "no-store");
  headers.set("pragma", "no-cache");
  return headers;
};

const validateMethodAndBody = (request: Request): Response | null => {
  const method = request.method.toUpperCase();
  if (!ALLOWED_METHOD_SET.has(method)) {
    return edgeFailure(405, "EDGE_METHOD_NOT_ALLOWED", {
      allow: ALLOWED_METHODS.join(", "),
    });
  }

  const rawLength = request.headers.get("content-length");
  if (request.body === null) {
    if (rawLength !== null && rawLength !== "0") {
      return edgeFailure(400, "EDGE_CONTENT_LENGTH_INVALID");
    }
    return null;
  }

  if (!BODY_METHODS.has(method)) return edgeFailure(400, "EDGE_BODY_NOT_ALLOWED");
  const contentEncoding = (request.headers.get("content-encoding") ?? "identity").trim().toLowerCase();
  if (contentEncoding !== "identity") {
    return edgeFailure(415, "EDGE_CONTENT_ENCODING_UNSUPPORTED");
  }
  if (rawLength === null) return edgeFailure(411, "EDGE_LENGTH_REQUIRED");
  if (!/^(?:0|[1-9][0-9]*)$/u.test(rawLength)) {
    return edgeFailure(400, "EDGE_CONTENT_LENGTH_INVALID");
  }
  const length = Number(rawLength);
  if (!Number.isSafeInteger(length) || length <= 0) {
    return edgeFailure(400, "EDGE_CONTENT_LENGTH_INVALID");
  }
  if (length > MAX_REQUEST_BODY_BYTES) return edgeFailure(413, "EDGE_BODY_TOO_LARGE");
  return null;
};

interface ParsedCookie {
  name: string;
  attributes: Map<string, string | true>;
}

const parseSetCookie = (value: string): ParsedCookie | null => {
  if (!value || hasUnsafeControl(value)) return null;
  const parts = value.split(";").map((part) => part.trim());
  const first = parts.shift();
  if (!first) return null;
  const separator = first.indexOf("=");
  if (separator <= 0) return null;
  const name = first.slice(0, separator);
  if (!APPROVED_COOKIE_NAMES.has(name)) return null;

  const attributes = new Map<string, string | true>();
  for (const part of parts) {
    if (!part) continue;
    const attributeSeparator = part.indexOf("=");
    const attributeName = (
      attributeSeparator < 0 ? part : part.slice(0, attributeSeparator)
    ).trim().toLowerCase();
    const attributeValue = (
      attributeSeparator < 0 ? true : part.slice(attributeSeparator + 1).trim()
    );
    if (!attributeName || attributes.has(attributeName)) return null;
    attributes.set(attributeName, attributeValue);
  }
  return { name, attributes };
};

const validApprovedSetCookies = (headers: Headers): string[] | null => {
  const values = getSetCookieValues(headers);
  if (values.length > APPROVED_COOKIE_NAMES.size) return null;
  const seen = new Set<string>();

  for (const value of values) {
    const parsed = parseSetCookie(value);
    if (!parsed || seen.has(parsed.name)) return null;
    seen.add(parsed.name);
    const { attributes } = parsed;
    if (
      attributes.has("domain")
      || attributes.get("path") !== "/"
      || attributes.get("secure") !== true
      || String(attributes.get("samesite") ?? "").toLowerCase() !== "lax"
    ) {
      return null;
    }
    const hasHttpOnly = attributes.has("httponly");
    const hasCanonicalHttpOnly = attributes.get("httponly") === true;
    if (parsed.name === "__Host-qg_session" && !hasCanonicalHttpOnly) return null;
    if (parsed.name === "__Host-qg_csrf" && hasHttpOnly) return null;
  }
  return values;
};

const approvedRedirect = (location: string): boolean => {
  if (!location || hasUnsafeControl(location) || location.includes("\\")) return false;

  if (location.startsWith("/") && !location.startsWith("//")) {
    let parsed: URL;
    try {
      parsed = new URL(location, `https://${PREVIEW_HOST}`);
    } catch {
      return false;
    }
    return parsed.origin === `https://${PREVIEW_HOST}` && normalizedSafePath(parsed.pathname);
  }

  let parsed: URL;
  try {
    parsed = new URL(location);
  } catch {
    return false;
  }
  return (
    parsed.origin === GOOGLE_AUTHORIZATION_ORIGIN
    && parsed.pathname === GOOGLE_AUTHORIZATION_PATH
    && parsed.username === ""
    && parsed.password === ""
    && parsed.port === ""
    && parsed.hash === ""
  );
};

const proxyResponseHeaders = (
  upstream: Response,
  approvedSetCookies: string[],
): Headers => {
  const removedByConnection = connectionHeaderTokens(upstream.headers);
  const headers = new Headers();

  upstream.headers.forEach((value, name) => {
    const normalized = name.toLowerCase();
    if (
      normalized === "set-cookie"
      || RESPONSE_HEADERS_ALWAYS_REMOVED.has(normalized)
      || removedByConnection.has(normalized)
      || normalized.startsWith("access-control-")
    ) {
      return;
    }
    headers.append(name, value);
  });
  for (const value of approvedSetCookies) headers.append("set-cookie", value);
  return headers;
};

const proxyV2RequestWithoutCallbackPolicy = async (
  request: Request,
  env: EdgeProxyEnvironment,
  fetchImpl: EdgeFetch = globalThis.fetch,
): Promise<Response> => {
  const edgeSecret = env.QUANTGYM_EDGE_SHARED_SECRET;
  if (!validEdgeSecret(edgeSecret)) return edgeFailure(503, "EDGE_CONFIG_INVALID");

  if (request.url.includes("\\")) return edgeFailure(400, "EDGE_PATH_INVALID");
  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return edgeFailure(400, "EDGE_PATH_INVALID");
  }
  if (
    requestUrl.origin !== PREVIEW_ORIGIN
    || requestUrl.username !== ""
    || requestUrl.password !== ""
    || requestUrl.port !== ""
  ) {
    return edgeFailure(400, "EDGE_ORIGIN_INVALID");
  }
  if (!isV2Route(requestUrl.pathname)) return edgeFailure(404, "EDGE_ROUTE_NOT_ALLOWED");
  if (!normalizedSafePath(requestUrl.pathname)) return edgeFailure(400, "EDGE_PATH_INVALID");

  const methodOrBodyFailure = validateMethodAndBody(request);
  if (methodOrBodyFailure) return methodOrBodyFailure;
  const headers = proxyRequestHeaders(request.headers, edgeSecret);
  if (!headers) return edgeFailure(400, "EDGE_COOKIE_INVALID");

  const init: EdgeRequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.body !== null) {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetchImpl(
      `${UPSTREAM_ORIGIN}${requestUrl.pathname}${requestUrl.search}`,
      init,
    );
  } catch {
    return edgeFailure(502, "EDGE_UPSTREAM_UNAVAILABLE");
  }

  if (REDIRECT_STATUSES.has(upstream.status)) {
    const location = upstream.headers.get("location");
    if (!location || !approvedRedirect(location)) {
      return edgeFailure(502, "EDGE_UPSTREAM_REDIRECT_REJECTED");
    }
  }

  const approvedSetCookies = validApprovedSetCookies(upstream.headers);
  if (!approvedSetCookies) return edgeFailure(502, "EDGE_UPSTREAM_COOKIE_INVALID");

  return applyEdgeResponsePolicy(new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: proxyResponseHeaders(upstream, approvedSetCookies),
  }));
};

export const proxyV2Request = async (
  request: Request,
  env: EdgeProxyEnvironment,
  fetchImpl: EdgeFetch = globalThis.fetch,
): Promise<Response> => {
  const response = await proxyV2RequestWithoutCallbackPolicy(request, env, fetchImpl);
  return isGoogleCallbackRequest(request)
    ? applyEdgeResponsePolicy(response, { forceNoReferrer: true })
    : response;
};

export const onRequest = (context: EdgeProxyContext): Promise<Response> => (
  proxyV2Request(context.request, context.env, context.fetch ?? globalThis.fetch)
);
