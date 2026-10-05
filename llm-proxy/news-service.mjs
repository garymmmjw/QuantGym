import crypto from "node:crypto";

export const NEWS_QUERY_PACKS = Object.freeze({
  all: ['"Jane Street" quant trading', '"Jane Street" market making', '"Citadel Securities" market making', '"quant trading" volatility options', '"Jane Street" CoreWeave AI', '"hedge fund" "electronic trading" market making'],
  quantFirms: ['"Jane Street" trading revenue', '"Citadel Securities" market maker', '"Optiver" quant trading', '"IMC Trading" market making', '"Jump Trading" quant', '"Hudson River Trading" quant', '"Two Sigma" quant trading', '"DE Shaw" systematic trading'],
  marketStructure: ['"market making" "exchange"', '"electronic trading" "liquidity"', '"order book" "market structure"', '"options volatility" "market makers"', '"SEC" "market structure" trading', '"CME" "market making"'],
  aiInfra: ['"quant trading" "AI infrastructure"', '"Jane Street" CoreWeave AI', '"hedge fund" GPU AI', '"machine learning" "market making"', '"low latency" "machine learning" trading'],
  recruiting: ['"quant trading" internship', '"Jane Street" campus recruiting', '"Optiver" graduate trader', '"Citadel Securities" internship', '"IMC Trading" graduate', '"quant researcher" "new grad"']
});

const DEFAULT_LIMITS = Object.freeze({
  maxBodyBytes: 4096, bodyTimeoutMs: 3000, requestConcurrency: 16, authConcurrency: 8,
  globalPerMinute: 120, sessionPerMinute: 20, maxSessionBuckets: 512,
  sourceConcurrency: 3, fetchConcurrency: 6, deadlineMs: 12000, sourceTimeoutMs: 6000,
  sourceMaxBytes: 512 * 1024, cacheMs: 300000, negativeCacheMs: 15000
});

function failure(status, message, retryAfter) {
  return Object.assign(new Error(message), { status, retryAfter });
}

export function parseNewsRequest(payload, searchParams, defaultMax = 12) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw failure(400, "Expected a JSON object");
  const allowed = new Set(["topic", "max"]);
  for (const key of [...Object.keys(payload), ...searchParams.keys()]) {
    if (!allowed.has(key)) throw failure(400, "Only topic and max are accepted");
    if (searchParams.getAll(key).length > 1 || (Object.hasOwn(payload, key) && searchParams.has(key))) {
      throw failure(400, "Duplicate news parameter");
    }
  }
  const topic = Object.hasOwn(payload, "topic") ? payload.topic : searchParams.get("topic") ?? "all";
  if (typeof topic !== "string" || !Object.hasOwn(NEWS_QUERY_PACKS, topic)) throw failure(400, "Unsupported news topic");
  const rawMax = Object.hasOwn(payload, "max") ? payload.max : searchParams.get("max") ?? defaultMax;
  const max = typeof rawMax === "string" && /^[1-9]\d?$/.test(rawMax) ? Number(rawMax) : rawMax;
  if (!Number.isInteger(max) || max < 1 || max > 30) throw failure(400, "max must be an integer from 1 to 30");
  return { topic, max };
}

function configuredFeeds(value) {
  const entries = [...new Set(String(value || "").split(",").map((entry) => entry.trim()).filter(Boolean))];
  if (entries.length > 8) throw failure(503, "News sources are unavailable", 15);
  return entries.map((entry) => {
    let url;
    try { url = new URL(entry); } catch { throw failure(503, "News sources are unavailable", 15); }
    if (entry.length > 2048 || url.protocol !== "https:" || url.username || url.password || url.port || url.hash) {
      throw failure(503, "News sources are unavailable", 15);
    }
    return url;
  });
}

function googleNewsUrl(query) {
  const url = new URL("https://news.google.com/rss/search");
  for (const [key, value] of Object.entries({ q: query, hl: "en-US", gl: "US", ceid: "US:en" })) url.searchParams.set(key, value);
  return url.toString();
}

// Waiting callers are bounded by the five fixed topics and their source workers.
function createFetchGate(limit) {
  let active = 0;
  const waiting = [];
  return async (signal, operation) => {
    if (signal.aborted) throw signal.reason;
    if (active >= limit) {
      await new Promise((resolve, reject) => {
        const entry = { resolve, reject, signal, onAbort: null };
        entry.onAbort = () => {
          const index = waiting.indexOf(entry);
          if (index >= 0) waiting.splice(index, 1);
          reject(signal.reason);
        };
        signal.addEventListener("abort", entry.onAbort, { once: true });
        waiting.push(entry);
      });
    } else active += 1;
    try {
      if (signal.aborted) throw signal.reason;
      return await operation();
    } finally {
      const next = waiting.shift();
      if (next) {
        next.signal.removeEventListener("abort", next.onAbort);
        next.resolve();
      } else active -= 1;
    }
  };
}

function consume(bucket, capacity, now) {
  bucket.tokens = Math.min(capacity, bucket.tokens + Math.max(0, now - bucket.updated) * capacity / 60000);
  bucket.updated = now;
  if (bucket.tokens < 1) throw failure(429, "Too many news requests", Math.max(1, Math.ceil((1 - bucket.tokens) * 60 / capacity)));
  bucket.tokens -= 1;
}

function readNewsBody(req, limits, signal) {
  return new Promise((resolve, reject) => {
    const declared = req.headers["content-length"];
    if (declared != null && (!/^\d+$/.test(String(declared)) || Number(declared) > limits.maxBodyBytes)) {
      req.pause();
      reject(failure(413, "News request body is too large"));
      return;
    }
    if (signal.aborted) { reject(signal.reason); return; }
    const chunks = [];
    let size = 0;
    const cleanup = () => {
      clearTimeout(timer);
      req.off("data", onData); req.off("end", onEnd); req.off("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const fail = (error) => { cleanup(); req.pause(); reject(error); };
    const onData = (chunk) => {
      size += chunk.length;
      if (size > limits.maxBodyBytes) return fail(failure(413, "News request body is too large"));
      chunks.push(chunk);
    };
    const onError = () => fail(failure(400, "Incomplete news request"));
    const onAbort = () => fail(signal.reason);
    const onEnd = () => {
      cleanup();
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(failure(400, "Invalid JSON body")); }
    };
    const timer = setTimeout(() => fail(failure(408, "News request body timed out")), limits.bodyTimeoutMs);
    req.on("data", onData); req.once("end", onEnd); req.once("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function createNewsSessionAuthenticator(authApiBase, fetchImpl = fetch) {
  return async (req, { signal }) => {
    const authorization = String(req.headers.authorization || "");
    if (!/^Bearer \S+$/.test(authorization) || authorization.length > 4096) throw failure(401, "QuantGym cloud login is required");
    const timeout = AbortSignal.timeout(5000);
    try {
      const response = await fetchImpl(`${authApiBase.replace(/\/+$/, "")}/account`, {
        headers: { Authorization: authorization }, redirect: "manual", signal: AbortSignal.any([signal, timeout])
      });
      // Authentication uses only status; never buffer or retain account data.
      await response.body?.cancel();
      if (response.ok) return;
      if (response.status === 401) throw failure(401, "Invalid or expired QuantGym session");
      if (response.status === 403) throw failure(403, "QuantGym account is not on the beta allowlist");
      throw failure(503, "QuantGym session validation failed", 5);
    } catch (error) {
      if (error.status) throw error;
      throw failure(503, "QuantGym session validation is unavailable", 5);
    }
  };
}

function boundItem(item) {
  const result = {};
  for (const key of ["id", "title", "titleZh", "source", "sourceType", "sourceUrl", "publishedAt", "summary", "insight", "createdAt"]) {
    result[key] = String(item?.[key] || "").slice(0, key === "sourceUrl" ? 2048 : key === "summary" ? 600 : 320);
  }
  let link;
  try { link = new URL(result.sourceUrl); } catch { return null; }
  if (!["https:", "http:"].includes(link.protocol) || link.username || link.password || !result.title) return null;
  for (const key of ["tags", "skills"]) result[key] = (Array.isArray(item?.[key]) ? item[key] : []).slice(0, 5).map((value) => String(value).slice(0, 120));
  return result;
}

export function createNewsHandler({ fetchRss, parseRssItems, dedupeNews = (items) => items, authenticate = null, feeds = "", defaultMax = 12, limits: overrides = {}, now = Date.now }) {
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  const cache = new Map();
  const pending = new Map();
  const failedSources = new Map();
  const sessions = new Map();
  const globalBucket = { tokens: limits.globalPerMinute, updated: now() };
  const gate = createFetchGate(limits.fetchConcurrency);
  let activeRequests = 0;
  let activeAuth = 0;
  let trustedFeeds = [];
  let sourceConfigError;
  try { trustedFeeds = configuredFeeds(feeds); } catch (error) { sourceConfigError = error; }
  const allowedHosts = new Set(["news.google.com", ...trustedFeeds.map((url) => url.hostname.toLowerCase())]);
  const safeDefaultMax = Math.min(30, Math.max(1, Number.parseInt(defaultMax, 10) || 12));

  async function loadTopic(topic, signal) {
    if (sourceConfigError) throw sourceConfigError;
    const sources = trustedFeeds.length
      ? trustedFeeds.map((url, index) => ({ url: url.href, label: `Configured source ${index + 1}` }))
      : NEWS_QUERY_PACKS[topic].map((query) => ({ url: googleNewsUrl(query), label: query }));
    const results = new Array(sources.length);
    let nextIndex = 0;
    await Promise.all(Array.from({ length: Math.min(limits.sourceConcurrency, sources.length) }, async () => {
      while (nextIndex < sources.length && !signal.aborted) {
        const index = nextIndex++;
        const source = sources[index];
        try {
          if ((failedSources.get(source.url) || 0) > now()) throw new Error("Source cooling down");
          const xml = await gate(signal, () => fetchRss(source.url, {
            allowedHosts, signal, timeoutMs: limits.sourceTimeoutMs, maxBytes: limits.sourceMaxBytes, maxRedirects: 2
          }));
          results[index] = { items: parseRssItems(xml, source.label).slice(0, 100).map(boundItem).filter(Boolean) };
          failedSources.delete(source.url);
        } catch {
          if (!signal.aborted || signal.reason?.code === "NEWS_DEADLINE") failedSources.set(source.url, now() + limits.negativeCacheMs);
          results[index] = { error: { source: source.label, message: "News source is temporarily unavailable" } };
        }
      }
    }));
    if (signal.aborted && signal.reason?.code !== "NEWS_DEADLINE") throw failure(503, "News request cancelled", 5);
    // Deadline cancellation must preserve healthy sources that already completed.
    // Sources still queued when the deadline expires also get a bounded error.
    for (let index = 0; index < sources.length; index += 1) {
      if (!results[index]) {
        results[index] = { error: { source: sources[index].label, message: "News source is temporarily unavailable" } };
        failedSources.set(sources[index].url, now() + limits.negativeCacheMs);
      }
    }
    const items = dedupeNews(results.flatMap((result) => result?.items || [])).slice(0, 30);
    const errors = results.flatMap((result) => result?.error ? [result.error] : []);
    const failed = results.every((result) => result?.error);
    return { failed, value: { fetchedAt: new Date(now()).toISOString(), count: items.length, items, sources: sources.map((source) => source.label), errors } };
  }

  function subscribe(topic, signal) {
    const stored = cache.get(topic);
    if (stored && stored.expires > now()) {
      if (stored.failed) return Promise.reject(failure(503, "News sources are temporarily unavailable", Math.max(1, Math.ceil((stored.expires - now()) / 1000))));
      return Promise.resolve(stored.value);
    }
    if (stored) cache.delete(topic);
    let entry = pending.get(topic);
    if (!entry) {
      const controller = new AbortController();
      entry = { controller, subscribers: 0, settled: false, promise: null };
      const current = entry;
      const timeout = setTimeout(() => controller.abort(Object.assign(failure(503, "News request timed out", 5), { code: "NEWS_DEADLINE" })), limits.deadlineMs);
      entry.promise = loadTopic(topic, controller.signal).then((result) => {
        if (current.subscribers > 0 && (!controller.signal.aborted || controller.signal.reason?.code === "NEWS_DEADLINE")) cache.set(topic, { ...result, expires: now() + (result.failed ? limits.negativeCacheMs : limits.cacheMs) });
        if (result.failed) throw failure(503, "News sources are temporarily unavailable", Math.ceil(limits.negativeCacheMs / 1000));
        return result.value;
      }).catch((error) => {
        // Deadline failures also cool down; disconnect-only cancellation does not poison the cache.
        if (current.subscribers > 0 && !cache.has(topic)) cache.set(topic, { failed: true, expires: now() + limits.negativeCacheMs });
        throw error;
      }).finally(() => {
        current.settled = true;
        clearTimeout(timeout);
        if (pending.get(topic) === current) pending.delete(topic);
      });
      pending.set(topic, entry);
    }
    const current = entry;
    current.subscribers += 1;
    return new Promise((resolve, reject) => {
      let finished = false;
      const finish = (callback, value) => {
        if (finished) return;
        finished = true;
        signal.removeEventListener("abort", aborted);
        current.subscribers -= 1;
        if (!current.subscribers && !current.settled) {
          if (pending.get(topic) === current) pending.delete(topic);
          current.controller.abort();
        }
        callback(value);
      };
      const aborted = () => finish(reject, signal.reason || failure(503, "News request cancelled"));
      signal.addEventListener("abort", aborted, { once: true });
      current.promise.then((value) => finish(resolve, value), (error) => finish(reject, error));
      if (signal.aborted) aborted();
    });
  }

  return async (req, res, requestUrl) => {
    const controller = new AbortController();
    const disconnected = () => { if (!res.writableEnded) controller.abort(); };
    req.once("aborted", disconnected);
    res.once("close", disconnected);
    let admitted = false;
    const respond = (status, value, retryAfter) => {
      if (controller.signal.aborted || res.destroyed || res.writableEnded) return;
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}), ...([408, 413].includes(status) || (status >= 400 && !req.complete) ? { Connection: "close" } : {}) });
      res.end(JSON.stringify(value));
    };
    try {
      if (!["GET", "POST"].includes(req.method)) { respond(405, { error: "Method not allowed" }); return; }
      if (req.method === "GET" && (req.headers["transfer-encoding"] || Number(req.headers["content-length"] || 0) > 0)) throw failure(400, "GET news requests do not accept a body");
      if (req.url.length > 2048) throw failure(400, "News request URL is too long");
      consume(globalBucket, limits.globalPerMinute, now());
      if (activeRequests >= limits.requestConcurrency) throw failure(503, "News service is busy", 2);
      activeRequests += 1; admitted = true;
      const payload = req.method === "POST" ? await readNewsBody(req, limits, controller.signal) : {};
      const { topic, max } = parseNewsRequest(payload, requestUrl.searchParams, safeDefaultMax);
      if (authenticate) {
        if (activeAuth >= limits.authConcurrency) throw failure(503, "News session validation is busy", 2);
        activeAuth += 1;
        try { await authenticate(req, { signal: controller.signal }); }
        finally { activeAuth -= 1; }
      }
      if (controller.signal.aborted) return;
      const identity = authenticate ? String(req.headers.authorization || "") : String(req.socket.remoteAddress || "local");
      const key = crypto.createHash("sha256").update(identity).digest("hex");
      const timestamp = now();
      let bucket = sessions.get(key);
      if (!bucket) {
        for (const [oldKey, oldBucket] of sessions) if (timestamp - oldBucket.updated >= 60000) sessions.delete(oldKey);
        if (sessions.size >= limits.maxSessionBuckets) throw failure(429, "News service is handling too many sessions", 60);
        bucket = { tokens: limits.sessionPerMinute, updated: timestamp };
        sessions.set(key, bucket);
      }
      consume(bucket, limits.sessionPerMinute, timestamp);
      const result = await subscribe(topic, controller.signal);
      const items = result.items.slice(0, max);
      respond(200, { ...result, count: items.length, items });
    } catch (error) {
      const status = [400, 401, 403, 408, 413, 429, 503].includes(error?.status) ? error.status : 503;
      respond(status, { error: error?.status ? error.message : "News service is temporarily unavailable" }, error?.retryAfter || (status === 503 ? 5 : undefined));
    } finally {
      if (admitted) activeRequests -= 1;
      req.off("aborted", disconnected); res.off("close", disconnected);
    }
  };
}
