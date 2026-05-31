import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadEnvFromProjectRoot();

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.LLM_PROXY_HOST || process.env.HOST || "127.0.0.1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";
const NEWS_MAX_ITEMS = Number(process.env.NEWS_MAX_ITEMS || 12);
const MAX_BODY_BYTES = Number(process.env.LLM_MAX_BODY_BYTES || 12 * 1024 * 1024);
const ALLOWED_ORIGINS = csvValues(process.env.LLM_ALLOWED_ORIGINS || "*");
const AUTH_API_BASE = String(process.env.LLM_AUTH_API_BASE || "").trim().replace(/\/+$/, "");
const DEFAULT_NEWS_QUERIES = [
  '"Jane Street" quant trading',
  '"Jane Street" market making',
  '"Citadel Securities" market making',
  '"quant trading" volatility options',
  '"Jane Street" CoreWeave AI',
  '"hedge fund" "electronic trading" market making'
];
const NEWS_QUERY_PACKS = {
  all: DEFAULT_NEWS_QUERIES,
  quantFirms: [
    '"Jane Street" trading revenue',
    '"Citadel Securities" market maker',
    '"Optiver" quant trading',
    '"IMC Trading" market making',
    '"Jump Trading" quant',
    '"Hudson River Trading" quant',
    '"Two Sigma" quant trading',
    '"DE Shaw" systematic trading'
  ],
  marketStructure: [
    '"market making" "exchange"',
    '"electronic trading" "liquidity"',
    '"order book" "market structure"',
    '"options volatility" "market makers"',
    '"SEC" "market structure" trading',
    '"CME" "market making"'
  ],
  aiInfra: [
    '"quant trading" "AI infrastructure"',
    '"Jane Street" CoreWeave AI',
    '"hedge fund" GPU AI',
    '"machine learning" "market making"',
    '"low latency" "machine learning" trading'
  ],
  recruiting: [
    '"quant trading" internship',
    '"Jane Street" campus recruiting',
    '"Optiver" graduate trader',
    '"Citadel Securities" internship',
    '"IMC Trading" graduate',
    '"quant researcher" "new grad"'
  ]
};
const DEFAULT_JOB_BOARDS = [
  { token: "janestreet", company: "Jane Street" },
  { token: "optiverus", company: "Optiver" },
  { token: "imc", company: "IMC" },
  { token: "jumptrading", company: "Jump Trading" }
];

function loadEnvFromProjectRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(currentFile), "..");
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) continue;

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();
    if (!key) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (requestUrl.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname === "/news") {
    if (!["GET", "POST"].includes(req.method)) {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      const payload = req.method === "POST" ? JSON.parse(await readBody(req)) : {};
      const result = await fetchQuantNews(payload, requestUrl.searchParams);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { error: error.message || "News request failed" });
    }
    return;
  }

  if (requestUrl.pathname === "/jobs") {
    if (!["GET", "POST"].includes(req.method)) {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      const payload = req.method === "POST" ? JSON.parse(await readBody(req)) : {};
      const result = await fetchQuantJobs(payload, requestUrl.searchParams);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { error: error.message || "Jobs request failed" });
    }
    return;
  }

  if (req.method !== "POST" || !["/interview", "/classify-log"].includes(requestUrl.pathname)) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  try {
    if (AUTH_API_BASE) await requireQuantGymSession(req);
    if (!OPENAI_API_KEY) {
      sendJson(res, 500, { error: "OPENAI_API_KEY is not set" });
      return;
    }
    const payload = JSON.parse(await readBody(req));
    if (requestUrl.pathname === "/classify-log") {
      const result = await classifyLog(payload);
      sendJson(res, 200, result);
    } else {
      const reply = await createInterviewReply(payload);
      sendJson(res, 200, typeof reply === "string" ? { reply } : reply);
    }
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "LLM request failed" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`LLM proxy listening on http://${HOST}:${PORT}`);
});

async function fetchQuantNews(payload = {}, searchParams = new URLSearchParams()) {
  const maxItems = clampInt(payload.max || searchParams.get("max") || NEWS_MAX_ITEMS, 1, 30);
  const queries = normalizeNewsQueries(payload, searchParams);
  const feeds = normalizeNewsFeeds(payload);
  const requests = feeds.length
    ? feeds.map((url) => ({ url, query: "custom feed" }))
    : queries.map((query) => ({ url: googleNewsRssUrl(query), query }));

  const settled = await Promise.allSettled(requests.map((item) => fetchRssNews(item)));
  const items = [];
  const errors = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      errors.push({
        source: requests[index].query,
        message: result.reason?.message || "RSS fetch failed"
      });
    }
  });

  return {
    fetchedAt: new Date().toISOString(),
    count: items.length,
    items: dedupeNews(items).slice(0, maxItems),
    sources: requests.map((item) => item.query),
    errors
  };
}

async function fetchQuantJobs(payload = {}, searchParams = new URLSearchParams()) {
  const maxItems = clampInt(payload.max || searchParams.get("max") || 18, 1, 40);
  const requestedBoards = [
    ...searchParams.getAll("board"),
    ...(Array.isArray(payload.boards) ? payload.boards : [])
  ].map((item) => String(item || "").trim()).filter(Boolean);
  const boards = DEFAULT_JOB_BOARDS
    .filter((board) => !requestedBoards.length || requestedBoards.includes(board.token));
  const settled = await Promise.allSettled(boards.map(fetchGreenhouseJobs));
  const items = [];
  const errors = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      errors.push({
        source: boards[index].company,
        message: result.reason?.message || "Job fetch failed"
      });
    }
  });

  return {
    fetchedAt: new Date().toISOString(),
    count: items.length,
    items: dedupeJobs(items).slice(0, maxItems),
    sources: boards.map((item) => item.company),
    errors
  };
}

async function fetchGreenhouseJobs(board) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.token)}/jobs?content=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "QuantGym/1.0"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`${board.company} jobs returned ${response.status}`);
    const data = await response.json();
    return (Array.isArray(data.jobs) ? data.jobs : [])
      .map((job) => normalizeGreenhouseJob(job, board))
      .filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeGreenhouseJob(job, board) {
  const title = String(job?.title || "").trim();
  const location = String(job?.location?.name || "").trim() || "Global";
  const url = String(job?.absolute_url || "").trim();
  if (!title || !url) return null;
  const text = `${title} ${location} ${stripHtml(job?.content || "")}`;
  if (!isRelevantQuantJob(title, text)) return null;
  const type = /intern|summer|co-?op|placement/i.test(title) ? "internship" : "fulltime";
  return {
    id: `api-job-${board.token}-${job.id}`,
    company: board.company,
    title,
    type,
    location,
    url,
    postedAt: normalizeDate(job.updated_at) || new Date().toISOString(),
    tags: inferJobTags(text, type),
    createdAt: new Date().toISOString()
  };
}

function isRelevantQuantJob(title, text) {
  const titleLower = String(title || "").toLowerCase();
  if (/recruiter|recruiting|coordinator|auditor|legal|office manager|people operations|leadership|professional development|operations specialist|systems specialist|presentation|networking event|info session|open day/.test(titleLower)) return false;
  return /quant|trader|trading|research|machine learning|ai\/ml|software engineer|software developer|developer|intern|graduate|campus crypto|campus quantitative|low latency|c\+\+/.test(titleLower);
}

function inferJobTags(text, type) {
  const lower = String(text || "").toLowerCase();
  const tags = [type === "internship" ? "internship" : "full-time"];
  if (/quant|research/.test(lower)) tags.push("quant research");
  if (/trader|trading|market making/.test(lower)) tags.push("trading");
  if (/software|developer|engineer|c\+\+|python/.test(lower)) tags.push("engineering");
  if (/machine learning| ai | ml /.test(lower)) tags.push("machine learning");
  if (/shanghai|hong kong|singapore|sydney|amsterdam|london|chicago|new york/.test(lower)) tags.push("global");
  return [...new Set(tags)].slice(0, 5);
}

function dedupeJobs(items) {
  const seen = new Set();
  return items
    .filter((item) => {
      const key = `${item.company}|${item.title}|${item.location}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
}

function normalizeNewsQueries(payload, searchParams) {
  const topic = normalizeNewsTopic(payload.topic || searchParams.get("topic"));
  const queryParam = searchParams.getAll("q").filter(Boolean);
  const payloadQueries = Array.isArray(payload.queries) ? payload.queries : [];
  const singleQuery = payload.query || searchParams.get("query") || "";
  const queries = [...queryParam, ...payloadQueries, singleQuery]
    .flatMap((item) => String(item || "").split("|"))
    .map((item) => item.trim())
    .filter(Boolean);
  return queries.length ? [...new Set(queries)] : NEWS_QUERY_PACKS[topic];
}

function normalizeNewsTopic(value) {
  const topic = String(value || "all").trim();
  return NEWS_QUERY_PACKS[topic] ? topic : "all";
}

function normalizeNewsFeeds(payload) {
  const fromEnv = String(process.env.NEWS_RSS_FEEDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const fromPayload = Array.isArray(payload.feeds) ? payload.feeds.map(String).map((item) => item.trim()).filter(Boolean) : [];
  return [...new Set([...fromPayload, ...fromEnv])];
}

function googleNewsRssUrl(query) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  return url.toString();
}

async function fetchRssNews({ url, query }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/rss+xml, application/xml, text/xml",
        "User-Agent": "QuantMemoryBoard/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`RSS returned ${response.status}`);
    const xml = await response.text();
    return parseRssItems(xml, query);
  } finally {
    clearTimeout(timeout);
  }
}

function parseRssItems(xml, query) {
  const items = [];
  for (const match of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const itemXml = match[0];
    const rawSource = readXmlTag(itemXml, "source");
    const link = readXmlTag(itemXml, "link");
    const rawTitle = readXmlTag(itemXml, "title");
    const title = stripSourceSuffix(rawTitle, rawSource);
    if (!title || !link) continue;

    const description = stripHtml(readXmlTag(itemXml, "description"));
    const source = rawSource || inferSourceFromUrl(link) || "News";
    const publishedAt = normalizeDate(readXmlTag(itemXml, "pubDate"));
    const text = [title, description, source, query].join(" ");
    const skills = inferNewsSkills(text);
    const tags = inferNewsTags(text, source);

    const item = {
      id: stableNewsId(title, link),
      title,
      titleZh: title,
      source,
      sourceType: inferNewsSourceType(link, source),
      sourceUrl: link,
      publishedAt,
      tags,
      skills,
      summary: buildNewsSummary(title, source, description),
      insight: buildNewsInsight(skills, text),
      createdAt: new Date().toISOString()
    };
    if (!isLowQualityNews(item)) items.push(item);
  }
  return items;
}

function readXmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return decodeXmlEntities(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim());
}

function stripHtml(value) {
  return decodeXmlEntities(String(value || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function stripSourceSuffix(title, source) {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  if (!source) return clean;
  const suffix = ` - ${source}`;
  return clean.endsWith(suffix) ? clean.slice(0, -suffix.length).trim() : clean;
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function normalizeDate(value) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
}

function dedupeNews(items) {
  const byKey = new Map();
  items.forEach((item) => {
    if (isLowQualityNews(item)) return;
    const key = `${item.title}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ").trim();
    const existing = byKey.get(key);
    if (!existing || Date.parse(item.publishedAt) > Date.parse(existing.publishedAt)) byKey.set(key, item);
  });
  return [...byKey.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

function isLowQualityNews(item) {
  const text = `${item.title || ""} ${item.summary || ""} ${item.source || ""}`.toLowerCase();
  if (/trading bot|stock trading bot|crypto trading bot|best ai trading|forex signals?|for beginners|platforms? in 2026|mexc|coupon|promo code/.test(text)) return true;
  if (/jane street|citadel|two sigma|squarepoint|optiver|imc|hudson river|hrt|jump trading|tower research|virtu|drw|d\.e\. shaw|de shaw|flow traders|five rings/.test(text)) return false;
  return !/market making|electronic trading|options?|volatility|derivatives?|exchange|hedge fund|coreweave|gpu|liquidity|order book|low latency|campus|internship|graduate trader|quant researcher/.test(text);
}

function stableNewsId(title, link) {
  return `api-news-${crypto.createHash("sha1").update(`${title}|${link}`).digest("hex").slice(0, 16)}`;
}

function inferNewsSkills(text) {
  const lower = String(text || "").toLowerCase();
  const skills = new Set(["market"]);
  if (/option|options|volatility|vol\b|vix|delta|gamma|vega|hedg/.test(lower)) skills.add("option");
  if (/ai|artificial intelligence|gpu|model|machine learning|coreweave|cloud|deep learning|llm/.test(lower)) {
    skills.add("machineLearning");
    skills.add("deepLearning");
  }
  if (/revenue|earnings|record|data|estimate|survey|statistic|research/.test(lower)) skills.add("statistics");
  if (/latency|system|electronic trading|infrastructure|algorithm|execution/.test(lower)) skills.add("leetcode");
  if (/risk|probability|odds|expected|expectation/.test(lower)) skills.add("probabilityExpectation");
  return [...skills].slice(0, 4);
}

function inferNewsTags(text, source) {
  const lower = String(text || "").toLowerCase();
  const tags = [];
  [
    ["Jane Street", /jane street/],
    ["Citadel", /citadel/],
    ["Two Sigma", /two sigma/],
    ["Optiver", /optiver/],
    ["IMC", /\bimc\b|imc trading/],
    ["Jump Trading", /jump trading/],
    ["Hudson River Trading", /hudson river|hrt/],
    ["D.E. Shaw", /d\.e\. shaw|de shaw/],
    ["Virtu", /virtu/],
    ["DRW", /\bdrw\b/],
    ["Squarepoint", /squarepoint/],
    ["CoreWeave", /coreweave/],
    ["market making", /market making|market-maker/],
    ["volatility", /volatility|vix/],
    ["AI", /\bai\b|artificial intelligence|gpu/],
    ["options", /option/],
    ["electronic trading", /electronic trading|execution|latency/],
    ["recruiting", /internship|campus|graduate|new grad|career/]
  ].forEach(([label, pattern]) => {
    if (pattern.test(lower)) tags.push(label);
  });
  if (source && !tags.includes(source)) tags.push(source);
  return [...new Set(tags)].slice(0, 5);
}

function buildNewsSummary(title, source, description) {
  const snippet = String(description || "").replace(/\s+/g, " ").trim();
  const shortSnippet = snippet && !snippet.toLowerCase().includes(String(title).toLowerCase())
    ? ` 相关摘要：${snippet.slice(0, 150)}${snippet.length > 150 ? "..." : ""}`
    : "";
  return `${source || "News"} 报道：${title}。${shortSnippet}`.trim();
}

function buildNewsInsight(skills, text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("jane street") || lower.includes("market making")) {
    return "面试启发：把新闻拆成 spread、inventory risk、波动率 regime 和自动化交易系统四个角度来讲。";
  }
  if (skills.includes("deepLearning")) {
    return "面试启发：把 AI 新闻转成数据、特征、训练成本、延迟和模型风险的系统设计追问。";
  }
  if (skills.includes("option")) {
    return "面试启发：练习解释波动率、Greeks、对冲频率和尾部风险如何影响交易收益。";
  }
  if (/internship|campus|graduate|new grad|career|recruiting/.test(lower)) {
    return "面试启发：把招聘线索拆成目标岗位、能力要求、时间线和可反向练习的题型。";
  }
  return "面试启发：试着用市场结构、风险约束和数据证据解释这条新闻为什么重要。";
}

function inferSourceFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function inferNewsSourceType(sourceUrl = "", source = "") {
  let host = "";
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    host = "";
  }
  const text = `${host} ${String(source || "").toLowerCase()}`;
  if (/linkedin\.com/.test(text)) return "linkedin";
  if (/xiaohongshu\.com|xhslink\.com|rednote/.test(text)) return "xiaohongshu";
  if (/janestreet\.com|citadel(?:securities)?\.com|optiver\.com|imc\.com|jumptrading\.com|hudsonrivertrading\.com|twosigma\.com|deshaw\.com|virtu\.com|drw\.com|flowtraders\.com|nasdaq\.com|nyse\.com|cmegroup\.com|sec\.gov/.test(text)) {
    return "official";
  }
  if (/rss|feed|news\.google\.com|google news/.test(text)) return "rss";
  return "news";
}

async function classifyLog(payload) {
  const model = payload.model || DEFAULT_MODEL;
  const skillKeys = Object.keys(payload.skills || {});
  const instructions = [
    "You classify quant interview study logs into skill XP gains.",
    "Return only compact JSON with keys gains and summary.",
    "gains must include only these skill keys:",
    skillKeys.join(", "),
    "Use integer XP values from 0 to 120. Allocate more XP to skills clearly practiced.",
    "Do not invent skills."
  ].join(" ");

  const input = [
    `Study log:\n${payload.text || ""}`,
    `Duration minutes: ${payload.duration || 0}`,
    `Difficulty multiplier: ${payload.difficulty || 1}`,
    `Local heuristic gains:\n${JSON.stringify(payload.localGains || {})}`
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      ...modelOptions(model, 700)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API returned ${response.status}`);
  }
  const text = extractOutputText(data);
  return parseJsonObject(text);
}

async function createInterviewReply(payload) {
  if (payload.task === "hint") return createInterviewHint(payload);
  if (payload.task === "converse") return createInterviewConverse(payload);
  if (payload.task === "generate_pdf_questions") return createPdfInterviewQuestions(payload);
  if (payload.task === "evaluate" || !payload.task) return createInterviewEvaluation(payload);
  throw new Error(`Unsupported interview task: ${payload.task}`);
}

async function createInterviewEvaluation(payload) {
  const problem = payload.problem || {};
  const language = payload.language === "en" ? "English" : "Chinese";
  const transcript = Array.isArray(payload.transcript) ? payload.transcript : [];
  const model = payload.model || DEFAULT_MODEL;
  const answerAttachment = payload.answerAttachment || null;
  const feedbackFormat = [
    "Return only compact JSON.",
    "Schema: {\"overall\":0-100,\"summary\":\"one sentence\",\"dimensions\":{\"correctness\":{\"score\":0-5,\"comment\":\"short\"},\"reasoning\":{\"score\":0-5,\"comment\":\"short\"},\"communication\":{\"score\":0-5,\"comment\":\"short\"},\"speed\":{\"score\":0-5,\"comment\":\"short\"},\"readiness\":{\"score\":0-5,\"comment\":\"short\"}},\"missing\":[\"short bullets\"],\"interviewerConcern\":\"short\",\"referenceDelta\":\"short, do not restate full answer\",\"nextStep\":[\"actionable next steps\"]}."
  ].join(" ");
  const problemImages = collectProblemImageRefs(problem);

  const instructions = [
    "You are a rigorous quant interview coach.",
    "Use the provided problem bank item as ground truth.",
    "Evaluate the candidate's answer for relevance to the question, correctness, reasoning quality, and interview clarity.",
    "Use one overall score plus the requested 0-5 diagnostic dimensions.",
    "Be high-signal and practical. Do not repeat the full problem, do not add encouragement filler, and do not invent missing facts.",
    "Give enough detail for the candidate to know what to fix; include the key reference approach when the answer is incomplete.",
    "If the problem or candidate answer includes images, use them in the evaluation and mention what the image contributes.",
    feedbackFormat,
    "Keep the whole response compact: about 120-220 Chinese characters or 90-160 English words.",
    `Respond in ${language}.`
  ].join(" ");

  const inputText = [
    `Problem title EN: ${problem.titleEn || ""}`,
    `Problem title ZH: ${problem.titleZh || ""}`,
    `Category: ${problem.category || ""}`,
    `Difficulty: ${problem.difficulty || ""}`,
    `Prompt EN:\n${problem.promptEn || ""}`,
    `Prompt ZH:\n${problem.promptZh || ""}`,
    `Reference answer:\n${problem.answer || ""}`,
    `Reference explanation:\n${problem.explanation || ""}`,
    problemImages.length ? `Problem image references:\n${problemImages.join("\n")}` : "",
    "Transcript:",
    transcript.map((item) => `${item.role}: ${item.text}${Array.isArray(item.attachments) && item.attachments.length ? ` [attachments: ${item.attachments.map((file) => file.name || file.type || "file").join(", ")}]` : ""}`).join("\n"),
    `Candidate latest answer:\n${payload.answer || ""}`,
    answerAttachment?.text ? `Candidate uploaded answer text (${answerAttachment.name || "file"}):\n${answerAttachment.text}` : "",
    answerAttachment?.dataUrl ? `Candidate uploaded a file named ${answerAttachment.name || "answer file"}. Evaluate it together with the typed answer.` : ""
  ].join("\n\n");

  const content = [{ type: "input_text", text: inputText }];
  problemImages
    .filter((url) => /^https?:\/\//i.test(url) || /^data:image\//i.test(url))
    .slice(0, 4)
    .forEach((url) => content.push({ type: "input_image", image_url: url }));
  if (answerAttachment?.dataUrl) {
    content.push(createAttachmentInputPart(answerAttachment));
  }

  const input = content.length > 1
    ? [{
      role: "user",
      content
    }]
    : inputText;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      ...modelOptions(model, 900)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API returned ${response.status}`);
  }
  const text = requireOutputText(data, "OpenAI returned no feedback text");
  try {
    const feedback = normalizeStructuredInterviewEvaluation(parseJsonObject(text));
    return {
      feedback,
      reply: formatStructuredInterviewEvaluation(feedback, language)
    };
  } catch {
    return normalizeFeedbackText(text);
  }
}

async function createInterviewConverse(payload) {
  const problem = payload.problem || {};
  const language = payload.language === "en" ? "English" : "Chinese";
  const model = payload.model || DEFAULT_MODEL;
  const turns = Array.isArray(payload.turns) ? payload.turns : [];
  const sessionConfig = payload.sessionConfig || {};
  const maxFollowups = clampInt(payload.maxFollowups || 3, 1, 5);
  const followupCount = clampInt(payload.followupCount || 0, 0, maxFollowups);
  const persona = String(payload.persona || "").trim();
  const instructions = [
    "You are a quant interviewer running a realistic live mock interview.",
    "Return only compact JSON with keys action, message, coverage, missing, runningAssessment.",
    "action must be either followup or wrap.",
    "message must be one interviewer utterance only.",
    "Do not reveal the reference answer, final solution, rubric, or direct correction during the live interview.",
    "If the candidate asks for the answer, politely refuse and continue the interview.",
    "If the candidate says they do not know, give a small foothold and ask one focused follow-up.",
    "Probe the candidate's reasoning: ask about assumptions, edge cases, complexity, or why they chose an approach. Do not just say 'go on'.",
    "Briefly acknowledge what the candidate said in a few words, then ask exactly one question.",
    "Do not repeat a question already asked in the turns; each follow-up should open a new angle.",
    "Adapt: if the candidate is clearly strong, push with a harder extension; if they are struggling, narrow the scope.",
    "If the answer has enough signal, or max follow-ups is reached, set action to wrap and give a short transition.",
    "Keep message under 55 Chinese characters or 45 English words.",
    persona ? `Match this interviewer style closely in tone and pressure: ${persona}` : "",
    `Respond in ${language}.`
  ].filter(Boolean).join(" ");

  const input = [
    `Session config:\n${JSON.stringify(sessionConfig)}`,
    `Question index: ${payload.questionIndex || 0} / ${payload.questionCount || 1}`,
    `Followups used: ${followupCount} / ${maxFollowups}`,
    `Time remaining seconds: ${payload.timeRemaining || 0}`,
    `Problem title EN: ${problem.titleEn || ""}`,
    `Problem title ZH: ${problem.titleZh || ""}`,
    `Category: ${problem.category || ""}`,
    `Difficulty: ${problem.difficulty || ""}`,
    `Prompt EN:\n${problem.promptEn || ""}`,
    `Prompt ZH:\n${problem.promptZh || ""}`,
    `Ground truth answer:\n${payload.groundTruth?.answer || problem.answer || ""}`,
    `Ground truth explanation:\n${payload.groundTruth?.explanation || problem.explanation || ""}`,
    "Current question turns:",
    turns.map((turn) => `${turn.role}: ${turn.text || ""}`).join("\n"),
    `Candidate latest answer:\n${payload.latestAnswer || ""}`,
    payload.answerAttachment?.text ? `Candidate uploaded answer text (${payload.answerAttachment.name || "file"}):\n${payload.answerAttachment.text}` : ""
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      ...modelOptions(model, 700)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API returned ${response.status}`);
  }
  const text = requireOutputText(data, "OpenAI returned no conversation text");
  try {
    return { reply: normalizeInterviewConverseJson(parseJsonObject(text)) };
  } catch {
    return {
      reply: {
        action: /wrap|move on|下一题|收尾/i.test(text) || followupCount + 1 >= maxFollowups ? "wrap" : "followup",
        message: text.slice(0, language === "Chinese" ? 140 : 220),
        coverage: [],
        missing: [],
        runningAssessment: ""
      }
    };
  }
}

function createAttachmentInputPart(attachment) {
  if (isImageAttachmentPayload(attachment)) {
    return { type: "input_image", image_url: attachment.dataUrl };
  }
  return {
    type: "input_file",
    filename: attachment.name || "answer.pdf",
    file_data: attachment.dataUrl
  };
}

function isImageAttachmentPayload(attachment = {}) {
  return String(attachment.type || "").startsWith("image/")
    || /^data:image\//i.test(String(attachment.dataUrl || ""))
    || /\.(png|jpe?g|gif|webp|svg)$/i.test(String(attachment.name || ""));
}

function collectProblemImageRefs(problem = {}) {
  const keys = [
    "image", "imageUrl", "imageUrls", "images", "diagram", "diagramUrl",
    "promptImage", "promptImages", "answerImage", "answerImages",
    "explanationImage", "explanationImages", "solutionImage", "solutionImages"
  ];
  const refs = [];
  const push = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    if (typeof value === "object") {
      push(value.url || value.src || value.href || value.dataUrl);
      return;
    }
    const ref = String(value || "").trim();
    if (ref && (/^https?:\/\//i.test(ref) || /^data:image\//i.test(ref) || /\.(png|jpe?g|gif|webp|svg)(?:\?.*)?$/i.test(ref))) {
      refs.push(ref);
    }
  };
  keys.forEach((key) => push(problem[key]));
  return [...new Set(refs)];
}

async function createInterviewHint(payload) {
  const problem = payload.problem || {};
  const language = payload.language === "en" ? "English" : "Chinese";
  const transcript = Array.isArray(payload.transcript) ? payload.transcript : [];
  const model = payload.model || DEFAULT_MODEL;

  const instructions = [
    "You are a quant interview coach.",
    "Give one helpful hint only. Do not reveal the final answer.",
    "The hint should point to the next reasoning step or the right structure.",
    `Respond in ${language}.`
  ].join(" ");

  const input = [
    `Interview type: ${payload.interviewType || ""}`,
    `Problem title EN: ${problem.titleEn || ""}`,
    `Problem title ZH: ${problem.titleZh || ""}`,
    `Category: ${problem.category || ""}`,
    `Prompt EN:\n${problem.promptEn || ""}`,
    `Prompt ZH:\n${problem.promptZh || ""}`,
    `Candidate partial answer:\n${payload.partialAnswer || ""}`,
    "Transcript:",
    transcript.map((item) => `${item.role}: ${item.text}`).join("\n")
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      ...modelOptions(model, 500)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API returned ${response.status}`);
  }
  return requireOutputText(data, "OpenAI returned no hint text");
}

async function createPdfInterviewQuestions(payload) {
  const model = payload.model || DEFAULT_MODEL;
  const language = payload.language === "en" ? "English" : "Chinese";
  const file = payload.file || {};
  const count = Math.max(1, Math.min(12, Number(payload.count || 3)));
  if (!file.dataUrl) throw new Error("PDF file_data is missing");

  const instructions = [
    "You create quant interview questions from a PDF.",
    "First identify the most important knowledge points in the PDF.",
    `Create exactly ${count} interview questions for ${payload.interviewType || "technical"} practice.`,
    "Return only compact JSON with keys summary and questions.",
    "questions must be an array. Each item must include titleEn, titleZh, category, difficulty, tags, promptEn, promptZh, answer, explanation.",
    "category must be one of: leetcode, pandasNumpy, probabilityExpectation, statistics, machineLearning, deepLearning, market, option, mentalMath.",
    "difficulty must be Easy, Medium, or Hard.",
    `Use ${language} where appropriate, but keep English technical terms when useful.`
  ].join(" ");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions,
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Interview type: ${payload.interviewType || "technical"}`,
              `Question count: ${count}`,
              "Summarize the PDF's highest-yield concepts, then write interview questions from them."
            ].join("\n")
          },
          {
            type: "input_file",
            filename: file.name || "source.pdf",
            file_data: file.dataUrl
          }
        ]
      }],
      ...modelOptions(model, 3000)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API returned ${response.status}`);
  }
  const text = extractOutputText(data);
  const parsed = parseJsonObject(text);
  return {
    summary: parsed.summary || "",
    questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, count) : []
  };
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    if (item.type === "message" && typeof item.text === "string") chunks.push(item.text);
    for (const part of item.content || []) {
      if (part.text) chunks.push(part.text);
      if (typeof part === "string") chunks.push(part);
    }
  }
  return chunks.join("\n").trim();
}

function requireOutputText(data, message) {
  const text = extractOutputText(data);
  if (text) return text;
  const details = data.incomplete_details?.reason
    ? ` (${data.incomplete_details.reason})`
    : data.status
      ? ` (${data.status})`
      : "";
  throw new Error(`${message}${details}`);
}

function normalizeFeedbackText(text) {
  return String(text || "")
    .replace(/(得分[:：])/g, "\n$1")
    .replace(/(评价[:：])/g, "\n$1")
    .replace(/(遗漏[:：])/g, "\n$1")
    .replace(/(参考方向[:：])/g, "\n$1")
    .replace(/(下一步[:：])/g, "\n$1")
    .replace(/(Score:)/gi, "\n$1")
    .replace(/(Evaluation:)/gi, "\n$1")
    .replace(/(Missing pieces:)/gi, "\n$1")
    .replace(/(Reference direction:)/gi, "\n$1")
    .replace(/(Next step:)/gi, "\n$1")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeStructuredInterviewEvaluation(raw = {}) {
  const dimensions = raw.dimensions && typeof raw.dimensions === "object" ? raw.dimensions : {};
  const normalizeDimension = (key) => {
    const item = dimensions[key] || {};
    return {
      score: clampInt(item.score ?? item.value ?? 3, 0, 5),
      comment: String(item.comment || item.note || "").trim().slice(0, 180)
    };
  };
  return {
    overall: clampInt(raw.overall ?? raw.score ?? 0, 0, 100),
    summary: String(raw.summary || raw.evaluation || "").trim().slice(0, 260),
    dimensions: {
      correctness: normalizeDimension("correctness"),
      reasoning: normalizeDimension("reasoning"),
      communication: normalizeDimension("communication"),
      speed: normalizeDimension("speed"),
      readiness: normalizeDimension("readiness")
    },
    missing: Array.isArray(raw.missing) ? raw.missing.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 6) : [],
    interviewerConcern: String(raw.interviewerConcern || raw.concern || "").trim().slice(0, 260),
    referenceDelta: String(raw.referenceDelta || raw.reference || "").trim().slice(0, 320),
    nextStep: Array.isArray(raw.nextStep) ? raw.nextStep.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 4) : []
  };
}

function formatStructuredInterviewEvaluation(feedback, language = "English") {
  const zh = language === "Chinese";
  const labels = {
    correctness: zh ? "正确性" : "Correctness",
    reasoning: zh ? "推理" : "Reasoning",
    communication: zh ? "表达" : "Communication",
    speed: zh ? "速度" : "Speed",
    readiness: zh ? "面试可用度" : "Readiness"
  };
  const dimensionLines = Object.entries(feedback.dimensions || {})
    .map(([key, item]) => `- ${labels[key] || key}: ${item.score}/5${item.comment ? ` - ${item.comment}` : ""}`);
  const missing = feedback.missing?.length ? feedback.missing.map((item) => `- ${item}`).join("\n") : (zh ? "- 暂无明显缺失。" : "- No major missing piece.");
  const nextStep = feedback.nextStep?.length ? feedback.nextStep.map((item) => `- ${item}`).join("\n") : (zh ? "- 用 60 秒重新组织答案。" : "- Reframe the answer in 60 seconds.");
  return zh
    ? [
      `得分：${feedback.overall}/100`,
      "",
      `评价：${feedback.summary}`,
      "",
      "维度分：",
      ...dimensionLines,
      "",
      "缺失要点：",
      missing,
      "",
      `真实面试风险：${feedback.interviewerConcern}`,
      "",
      `参考差距：${feedback.referenceDelta}`,
      "",
      "下一步：",
      nextStep
    ].join("\n")
    : [
      `Score: ${feedback.overall}/100`,
      "",
      `Evaluation: ${feedback.summary}`,
      "",
      "Dimensions:",
      ...dimensionLines,
      "",
      "Missing pieces:",
      missing,
      "",
      `Interview risk: ${feedback.interviewerConcern}`,
      "",
      `Reference delta: ${feedback.referenceDelta}`,
      "",
      "Next step:",
      nextStep
    ].join("\n");
}

function normalizeInterviewConverseJson(raw = {}) {
  const action = raw.action === "wrap" ? "wrap" : "followup";
  return {
    action,
    message: String(raw.message || raw.reply || raw.text || "").trim(),
    coverage: Array.isArray(raw.coverage) ? raw.coverage.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 6) : [],
    missing: Array.isArray(raw.missing) ? raw.missing.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 6) : [],
    runningAssessment: String(raw.runningAssessment || raw.assessment || "").trim().slice(0, 260)
  };
}

function modelOptions(model, maxOutputTokens) {
  const options = { max_output_tokens: maxOutputTokens };
  if (/^gpt-5/i.test(String(model || ""))) {
    options.reasoning = { effort: "minimal" };
    options.text = { verbosity: "low" };
  }
  return options;
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model did not return JSON");
    return JSON.parse(match[0]);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      body += chunk;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body || "{}"));
    req.on("error", reject);
  });
}

async function requireQuantGymSession(req) {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.startsWith("Bearer ")) throw httpError(401, "QuantGym cloud login is required");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${AUTH_API_BASE}/account`, {
      headers: { Authorization: authorization },
      signal: controller.signal
    });
    if (response.ok) return;
    if (response.status === 401) throw httpError(401, "Invalid or expired QuantGym session");
    if (response.status === 403) throw httpError(403, "QuantGym account is not on the beta allowlist");
    throw httpError(503, "QuantGym session validation failed");
  } catch (error) {
    if (error.status) throw error;
    throw httpError(503, "QuantGym session validation is unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function clampInt(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function csvValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
