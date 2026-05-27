# LLM Proxy

Local proxy for the mock interview module. It keeps the API key out of the browser and exposes:

```text
POST http://127.0.0.1:8787/interview
POST http://127.0.0.1:8787/classify-log
GET  http://127.0.0.1:8787/news
POST http://127.0.0.1:8787/news
```

## Run

Option A (recommended): put env vars in project-root `.env`:

```bash
# /Users/miujiawei/Desktop/QuantGym/.env
OPENAI_API_KEY=sk-...
PORT=8787
LLM_PROXY_HOST=127.0.0.1
LLM_ALLOWED_ORIGINS=http://127.0.0.1:5176
LLM_AUTH_API_BASE=http://127.0.0.1:8790/api
LLM_MAX_BODY_BYTES=12582912
```

Then start directly:

```bash
node llm-proxy/server.mjs
```

Option B: export in shell:

```bash
# OPENAI_API_KEY is required for /interview and /classify-log.
# /news works without an OpenAI key because it uses RSS feeds by default.
export OPENAI_API_KEY="sk-..."
node llm-proxy/server.mjs
```

The app sends the selected model from the mock interview module or settings page.

Then keep the app endpoint as:

```text
http://127.0.0.1:8787/interview
```

The app derives the log-classification endpoint and news endpoint from the same base URL.

## News API

The app calls:

```text
POST http://127.0.0.1:8787/news
```

By default, the proxy fetches Google News RSS searches such as Jane Street, market making, options volatility, and AI quant trading. It normalizes items into the app's news schema:

```json
{
  "items": [
    {
      "titleZh": "Jane Street ...",
      "source": "Reuters",
      "sourceUrl": "https://...",
      "publishedAt": "2026-05-21T...",
      "skills": ["market", "option"],
      "tags": ["Jane Street", "market making"],
      "summary": "...",
      "insight": "..."
    }
  ]
}
```

Optional environment variables:

```bash
export NEWS_MAX_ITEMS=20
export NEWS_RSS_FEEDS="https://example.com/rss,https://example.org/feed.xml"
```

For a deployed beta, set `LLM_ALLOWED_ORIGINS` to the deployed web origin and set `LLM_AUTH_API_BASE` to the deployed QuantGym API base. With `LLM_AUTH_API_BASE` set, `/interview` and `/classify-log` require the frontend's current QuantGym bearer session before using the OpenAI key. `LLM_PROXY_HOST` defaults to `127.0.0.1`; use `0.0.0.0` only when your platform or reverse proxy needs it. `LLM_MAX_BODY_BYTES` controls interview/PDF request size and defaults to 12 MiB.

The proxy uses OpenAI's Responses API (`POST /v1/responses`) only for interview feedback and log classification.
