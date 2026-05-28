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
PORT=8787
LLM_PROXY_HOST=127.0.0.1
LLM_ALLOWED_ORIGINS=http://127.0.0.1:5176
LLM_AUTH_API_BASE=http://127.0.0.1:8790/api
LLM_MAX_BODY_BYTES=12582912
```

Then start:

```bash
node llm-proxy/server.mjs
```

Option B: export values in your shell:

```bash
export OPENAI_API_KEY="your-api-key"
node llm-proxy/server.mjs
```

The app endpoint should be:

```text
http://127.0.0.1:8787/interview
```

The app derives classification and news endpoints from that same base URL.

## News

The news route works from RSS feeds by default. OpenAI is used only when routes such as `/interview` and `/classify-log` need model output.

`POST /news` accepts a `topic` such as `all`, `quantFirms`, `marketStructure`, `aiInfra`, or `recruiting`. The proxy expands that topic into focused Google News RSS queries unless you pass explicit `queries` or configured `NEWS_RSS_FEEDS`.

Example:

```bash
curl -X POST http://127.0.0.1:8787/news \
  -H 'Content-Type: application/json' \
  -d '{"topic":"marketStructure","max":12}'
```

LinkedIn, Xiaohongshu, and similar social sources should be stored in the app as manually added signal links. The proxy intentionally does not scrape social platforms.

Optional environment variables:

```bash
NEWS_MAX_ITEMS=20
NEWS_RSS_FEEDS="https://example.com/rss,https://example.org/feed.xml"
```

For beta deployment, set `LLM_ALLOWED_ORIGINS` to the deployed web origin and `LLM_AUTH_API_BASE` to the deployed QuantGym API base. With `LLM_AUTH_API_BASE` set, `/interview` and `/classify-log` require a valid QuantGym bearer session before using the OpenAI key.
