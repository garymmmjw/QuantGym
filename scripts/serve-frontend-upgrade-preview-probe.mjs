import { createServer } from "node:http";

const clean = (value) => typeof value === "string" ? value.trim() : "";
const required = (value, label) => {
  const normalized = clean(value);
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
};

const parsePort = (value) => {
  const source = clean(value);
  if (!/^\d+$/.test(source)) throw new Error("PORT must be an integer between 0 and 65535");
  const port = Number(source);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("PORT must be an integer between 0 and 65535");
  }
  return port;
};

const hasHostnameSuffix = (hostname, suffix) => (
  hostname === suffix || hostname.endsWith(`.${suffix}`)
);

const isPreviewPagesHostname = (hostname) => (
  hasHostnameSuffix(hostname.toLowerCase(), "quantgym-v2-preview.pages.dev")
);

const isPreviewLlmHostname = (hostname) => {
  const normalized = hostname.toLowerCase();
  return normalized === "quantgym-v2-preview-llm";
};

const previewOrigin = (value) => {
  const source = required(value, "CORS origin");
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error("CORS origin must be the Preview web origin");
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.search
    || url.hash
    || url.pathname !== "/"
    || url.port
    || !isPreviewPagesHostname(url.hostname)
    || /(?:^|\.)beta\.quantgym\.app$/i.test(url.hostname)
  ) {
    throw new Error("CORS origin must be the Preview web origin");
  }
  return url.origin;
};

const internalOrigin = (value, { allowLoopback = false } = {}) => {
  const source = required(value, "LLM internal URL");
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error("LLM internal URL must be an HTTPS private origin");
  }
  const cleartextLoopback = allowLoopback && url.protocol === "http:"
    && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  const renderPrivateService = isPreviewLlmHostname(url.hostname) && Boolean(url.port);
  const cleartextRenderPrivateService = url.protocol === "http:" && renderPrivateService;
  if (
    (!cleartextLoopback && !cleartextRenderPrivateService && url.protocol !== "https:")
    || url.username
    || url.password
    || url.search
    || url.hash
    || url.pathname !== "/"
    || (!cleartextLoopback && !renderPrivateService)
  ) {
    throw new Error("LLM internal URL must use the Preview private service");
  }
  return url.origin;
};

const loadConfiguration = (env) => {
  const port = parsePort(env.PORT);
  const environment = required(env.QUANTGYM_PREVIEW_ENVIRONMENT, "environment");
  if (environment !== "preview-v2") throw new Error("environment must equal preview-v2");
  const service = required(env.QUANTGYM_PREVIEW_SERVICE, "service");
  if (!new Set(["api", "llm"]).has(service)) {
    throw new Error("service must equal api or llm");
  }
  const commit = required(env.QUANTGYM_PREVIEW_COMMIT, "commit");
  const renderCommit = required(env.RENDER_GIT_COMMIT, "RENDER_GIT_COMMIT");
  if (commit !== renderCommit) throw new Error("commit must match RENDER_GIT_COMMIT");

  if (service === "llm") return { port, environment, service, commit };
  return {
    port,
    environment,
    service,
    commit,
    llmOrigin: internalOrigin(env.QUANTGYM_PREVIEW_LLM_INTERNAL_URL, {
      allowLoopback: env.NODE_ENV === "test" && env.RENDER !== "true",
    }),
    corsOrigin: previewOrigin(env.QUANTGYM_PREVIEW_CORS_ORIGIN),
  };
};

const sendJson = (response, statusCode, value, headers = {}) => {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(`${JSON.stringify(value)}\n`);
};

const envelope = (configuration) => ({
  status: "ok",
  environment: "preview-v2",
  service: configuration.service,
  commit: configuration.commit,
  legacySchemaLoaded: false,
});

const verifyLlm = async (configuration) => {
  try {
    const response = await fetch(`${configuration.llmOrigin}/health`, {
      method: "GET",
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return false;
    const value = await response.json();
    return value !== null
      && typeof value === "object"
      && value.status === "ok"
      && value.environment === "preview-v2"
      && value.service === "llm"
      && value.commit === configuration.commit
      && value.legacySchemaLoaded === false;
  } catch {
    return false;
  }
};

const corsHeaders = (configuration, request) => {
  const origin = clean(request.headers.origin);
  if (!origin) return {};
  if (origin !== configuration.corsOrigin) return null;
  return {
    "access-control-allow-origin": configuration.corsOrigin,
    vary: "Origin",
  };
};

const createHandler = (configuration) => async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://preview-probe.invalid").pathname;
  const expectedPath = configuration.service === "api" ? "/api/v2/health" : "/health";
  if (pathname !== expectedPath) {
    sendJson(response, 404, { status: "not-found" });
    return;
  }

  if (configuration.service === "api") {
    const headers = corsHeaders(configuration, request);
    if (headers === null) {
      sendJson(response, 403, { status: "forbidden" });
      return;
    }
    if (request.method === "OPTIONS") {
      if (!request.headers.origin) {
        sendJson(response, 403, { status: "forbidden" });
        return;
      }
      response.writeHead(204, {
        ...headers,
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type",
        "cache-control": "no-store",
      });
      response.end();
      return;
    }
    if (request.method !== "GET") {
      sendJson(response, 405, { status: "method-not-allowed" }, headers);
      return;
    }
    if (!await verifyLlm(configuration)) {
      sendJson(response, 502, {
        ...envelope(configuration),
        status: "error",
        llmVerified: false,
      }, headers);
      return;
    }
    sendJson(response, 200, {
      ...envelope(configuration),
      llmVerified: true,
      llmCommit: configuration.commit,
    }, headers);
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { status: "method-not-allowed" });
    return;
  }
  sendJson(response, 200, envelope(configuration));
};

try {
  const configuration = loadConfiguration(process.env);
  const server = createServer((request, response) => {
    createHandler(configuration)(request, response).catch(() => {
      if (!response.headersSent) sendJson(response, 500, { status: "error" });
      else response.destroy();
    });
  });
  server.on("clientError", (_error, socket) => socket.destroy());
  server.on("error", () => {
    console.error("FAIL: Preview probe server failed");
    process.exitCode = 1;
  });
  server.listen(configuration.port, "0.0.0.0", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : configuration.port;
    console.log(
      `Preview ${configuration.service} probe listening on 0.0.0.0:${port}`,
    );
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
