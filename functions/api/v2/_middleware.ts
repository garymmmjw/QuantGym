export interface EdgePagesContext<Environment = Record<string, unknown>> {
  request: Request;
  env: Environment;
  next: () => Promise<Response>;
}

export type EdgePagesFunction<Environment = Record<string, unknown>> = (
  context: EdgePagesContext<Environment>,
) => Response | Promise<Response>;

export const EDGE_SECURITY_HEADERS = Object.freeze({
  "content-security-policy": [
    "default-src 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
  ].join("; "),
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
});

const ALWAYS_STRIPPED_RESPONSE_HEADERS = new Set([
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

const connectionTokens = (headers: Headers): Set<string> => {
  const tokens = new Set<string>();
  for (const token of (headers.get("connection") ?? "").split(",")) {
    const normalized = token.trim().toLowerCase();
    if (normalized) tokens.add(normalized);
  }
  return tokens;
};

export const getSetCookieValues = (headers: Headers): string[] => {
  const compatibleHeaders = headers as Headers & {
    getAll?: (name: string) => string[];
    getSetCookie?: () => string[];
  };
  if (typeof compatibleHeaders.getSetCookie === "function") {
    return compatibleHeaders.getSetCookie();
  }
  if (typeof compatibleHeaders.getAll === "function") {
    return compatibleHeaders.getAll("set-cookie");
  }

  const combined = headers.get("set-cookie");
  if (!combined) return [];

  // The lookahead deliberately does not split the comma inside an Expires value.
  return combined.split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/u).map((value) => value.trim());
};

const copyResponseHeaders = (source: Headers): Headers => {
  const blockedByConnection = connectionTokens(source);
  const result = new Headers();

  source.forEach((value, name) => {
    const normalized = name.toLowerCase();
    if (
      normalized === "set-cookie"
      || ALWAYS_STRIPPED_RESPONSE_HEADERS.has(normalized)
      || blockedByConnection.has(normalized)
      || normalized.startsWith("access-control-")
    ) {
      return;
    }
    result.append(name, value);
  });

  for (const value of getSetCookieValues(source)) {
    result.append("set-cookie", value);
  }
  return result;
};

export const applyEdgeResponsePolicy = (response: Response): Response => {
  const headers = copyResponseHeaders(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("expires", "0");
  headers.set("pragma", "no-cache");
  for (const [name, value] of Object.entries(EDGE_SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const FAILURE_MESSAGE = "The edge proxy could not complete this request.";

export const edgeFailure = (
  status: number,
  code: string,
  extraHeaders: HeadersInit = {},
): Response => {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  return applyEdgeResponsePolicy(new Response(JSON.stringify({
    error: {
      code,
      message: FAILURE_MESSAGE,
    },
  }), { status, headers }));
};

export const onRequest: EdgePagesFunction = async (context) => {
  try {
    return applyEdgeResponsePolicy(await context.next());
  } catch {
    return edgeFailure(500, "EDGE_INTERNAL_FAILURE");
  }
};
