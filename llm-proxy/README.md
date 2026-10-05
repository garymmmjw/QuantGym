# LLM Proxy

Local proxy for mock interviews, study-log classification, resume feedback, and news. It keeps the OpenAI API key out of the browser.

```text
POST http://127.0.0.1:8787/interview
POST http://127.0.0.1:8787/classify-log
GET  http://127.0.0.1:8787/news
POST http://127.0.0.1:8787/news
```

## Run

Option A: put env vars in the project-root `.env`:

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT_MS=30000
PORT=8787
LLM_PROXY_HOST=127.0.0.1
LLM_ALLOWED_ORIGINS=http://127.0.0.1:5176
LLM_AUTH_API_BASE=http://127.0.0.1:8790/api
LLM_MAX_BODY_BYTES=12582912
```

Then start:

```bash
npm --prefix llm-proxy install
npm --prefix llm-proxy start
```

Option B: export values in your shell:

```bash
export OPENAI_API_KEY="your-api-key"
npm --prefix llm-proxy start
```

`OPENAI_BASE_URL` defaults to `https://api.openai.com/v1`; set it only when the host environment must reach OpenAI through an approved OpenAI-compatible gateway. It may point either at a `/v1` base URL or directly at a `/v1/responses` endpoint. `OPENAI_TIMEOUT_MS` defaults to `30000` and is clamped between 1000 and 120000 ms.

The app endpoint should be:

```text
http://127.0.0.1:8787/interview
```

The app derives classification and news endpoints from that same base URL.

## News

The news route works from RSS feeds by default. OpenAI is used only when routes such as `/interview` and `/classify-log` need model output.

`POST /news` accepts a `topic` such as `all`, `quantFirms`, `marketStructure`, `aiInfra`, or `recruiting`. Only `topic` and `max` are accepted, through the JSON body or query string. `max` must be an integer from 1 to 30; duplicate parameters and unsupported topics are rejected. The proxy expands the topic into server-owned Google News RSS queries. Client-provided `feeds`, `q`, `query`, and `queries` are rejected, including legacy callers.

Deploy the web app and proxy together: the web app sends only the selected topic and item limit, with the existing QuantGym bearer session. An older web bundle that sends custom queries must be refreshed after rollout.

Example:

```bash
curl -X POST http://127.0.0.1:8787/news \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_QUANTGYM_SESSION' \
  -d '{"topic":"marketStructure","max":12}'
```

LinkedIn, Xiaohongshu, and similar social sources should be stored in the app as manually added signal links. The proxy intentionally does not scrape social platforms.

Optional environment variables:

```bash
NEWS_MAX_ITEMS=20
NEWS_RSS_FEEDS="https://example.com/rss,https://example.org/feed.xml"
```

For beta deployment, set `LLM_ALLOWED_ORIGINS` to the deployed web origin and `LLM_AUTH_API_BASE` to the deployed QuantGym API base. With `LLM_AUTH_API_BASE` set, `/news`, `/interview`, and `/classify-log` require a valid QuantGym bearer session. A valid session is checked even when news is cached. Keep this setting enabled in production. Without it, news remains available for local development and uses the direct socket address for its anonymous rate limit.

`NEWS_RSS_FEEDS` is an operator-only override, limited to eight unique HTTPS URLs without credentials or custom ports. Their exact hostnames and `news.google.com` form the outbound allowlist. The transport rejects private, loopback, reserved, and metadata addresses after DNS resolution, pins the checked address for the connection, and validates each redirect against the same rules. A feed that redirects to another hostname needs that host represented in the configured trusted sources. No browser headers, cookies, authorization, proxy configuration, or OpenAI credentials are forwarded to RSS providers.

News resource limits are fixed independently of the larger interview upload limit:

- JSON request bodies: 4 KiB and 3 seconds; malformed JSON is rejected with 400, oversized bodies with 413, and incomplete slow bodies with 408.
- Concurrent requests: 16; concurrent session validations: 8; session validation deadline: 5 seconds.
- Global admission: token bucket of 120 requests, refilling at 120/minute. Per validated session: bucket of 20, refilling at 20/minute; at most 512 active session buckets. Forwarded IP headers are ignored. Limits return 429 with `Retry-After`; concurrency saturation returns 503.
- RSS: at most three source workers per topic, six total fetches, 512 KiB per response, two redirects, six seconds per source, and twelve seconds for a complete topic fetch.
- Five fixed topic cache entries: five minutes for successful/partial results and fifteen seconds for failures. Concurrent requests for one topic share a fetch. A disconnect cancels only that caller; upstream work is cancelled when all subscribers disconnect. Failed sources cool down across topics for fifteen seconds.
- Responses: at most 30 sanitized items, bounded text fields, eight source/error entries. Partial success returns available news plus generic source errors; complete source failure returns 503 with `Retry-After`, without internal network details.

Authentication and news failure do not invoke OpenAI. The existing interview and jobs behavior is unchanged.
