const DEFAULT_BOARD_URL = "http://127.0.0.1:5176/index.html";

let capturedProblem = null;

const els = {
  sourceHost: document.getElementById("sourceHost"),
  problemTitle: document.getElementById("problemTitle"),
  problemMeta: document.getElementById("problemMeta"),
  problemPrompt: document.getElementById("problemPrompt"),
  boardUrl: document.getElementById("boardUrl"),
  collectBtn: document.getElementById("collectBtn"),
  copyBtn: document.getElementById("copyBtn"),
  status: document.getElementById("status")
};

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await chrome.storage.local.get({ boardUrl: DEFAULT_BOARD_URL });
  els.boardUrl.value = settings.boardUrl;
  await captureCurrentTab();
});

els.boardUrl.addEventListener("change", async () => {
  await chrome.storage.local.set({ boardUrl: els.boardUrl.value.trim() || DEFAULT_BOARD_URL });
});

els.collectBtn.addEventListener("click", async () => {
  if (!capturedProblem) return;
  const boardUrl = els.boardUrl.value.trim() || DEFAULT_BOARD_URL;
  await chrome.storage.local.set({ boardUrl });
  const target = new URL(boardUrl);
  target.searchParams.set("capture", encodePayload(capturedProblem));

  if (target.toString().length > 7000) {
    await copyProblemJson();
    els.status.textContent = "题干较长，已复制 JSON。";
    return;
  }

  await chrome.tabs.create({ url: target.toString() });
  els.status.textContent = "已打开 Quant Board。";
});

els.copyBtn.addEventListener("click", copyProblemJson);

async function captureCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  els.sourceHost.textContent = new URL(tab.url).hostname.replace(/^www\./, "");
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractProblemFromPage
  });

  capturedProblem = result;
  renderProblem(result);
}

function renderProblem(problem) {
  els.problemTitle.textContent = problem.titleEn || problem.titleZh || "Untitled problem";
  els.problemPrompt.textContent = problem.promptEn || problem.promptZh || "No prompt found.";
  els.problemMeta.innerHTML = "";
  [problem.source, problem.difficulty, ...problem.tags.slice(0, 4)].filter(Boolean).forEach((label) => {
    const span = document.createElement("span");
    span.textContent = label;
    els.problemMeta.appendChild(span);
  });
}

async function copyProblemJson() {
  if (!capturedProblem) return;
  await navigator.clipboard.writeText(JSON.stringify(capturedProblem, null, 2));
  els.status.textContent = "已复制。";
}

function encodePayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function extractProblemFromPage() {
  const clean = (value) => String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const text = (selector) => clean(document.querySelector(selector)?.innerText || document.querySelector(selector)?.textContent || "");
  const meta = (name) => document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content || "";
  const host = location.hostname.replace(/^www\./, "");
  const isLeetCode = host.includes("leetcode");

  const titleFromMeta = clean(meta("og:title"));
  const titleFromPage = text("h1") || clean(document.title);
  const title = clean((titleFromMeta || titleFromPage).replace(/\s+-\s+LeetCode.*$/i, "").replace(/\s+\|\s+.*$/i, ""));

  const roots = [
    '[data-track-load="description_content"]',
    '[class*="question-content"]',
    '[class*="description"]',
    "article",
    "main"
  ];
  let prompt = "";
  for (const selector of roots) {
    prompt = text(selector);
    if (prompt.length > 120) break;
  }
  if (!prompt) prompt = clean(document.body.innerText).slice(0, 12000);

  const bodyText = clean(document.body.innerText);
  const difficulty = /\bHard\b/.test(bodyText) ? "Hard" : /\bMedium\b/.test(bodyText) ? "Medium" : /\bEasy\b/.test(bodyText) ? "Easy" : "Medium";
  const tagCandidates = [...document.querySelectorAll("a, button, span")]
    .map((node) => clean(node.innerText || node.textContent))
    .filter((value) => value.length >= 2 && value.length <= 32)
    .filter((value) => /array|hash|dynamic|tree|graph|probability|statistics|machine|learning|option|math|dp|binary|greedy|stack|queue|概率|期望|统计|机器学习|期权|贝叶斯|做市|风险/i.test(value));
  const tags = [...new Set(tagCandidates)].slice(0, 8);
  const category = isLeetCode ? "leetcode" : inferCategoryFromText(`${title} ${prompt} ${bodyText}`);

  return {
    titleEn: title || clean(document.title),
    titleZh: "",
    category,
    difficulty,
    tags,
    source: isLeetCode ? "leetcode" : host,
    sourceUrl: location.href,
    promptEn: prompt.slice(0, 12000),
    promptZh: "",
    answer: "",
    explanation: "",
    capturedAt: new Date().toISOString()
  };

  function inferCategoryFromText(value) {
    const lower = value.toLowerCase();
    if (lower.includes("pandas") || lower.includes("numpy") || lower.includes("dataframe")) return "pandasNumpy";
    if (lower.includes("option") || lower.includes("greeks") || lower.includes("volatility")) return "option";
    if (lower.includes("market") || lower.includes("trading")) return "market";
    if (lower.includes("statistics") || lower.includes("p-value") || lower.includes("hypothesis")) return "statistics";
    if (lower.includes("deep learning") || lower.includes("transformer") || lower.includes("neural")) return "deepLearning";
    if (lower.includes("machine learning") || lower.includes("xgboost") || lower.includes("feature")) return "machineLearning";
    if (lower.includes("mental") || lower.includes("percent") || lower.includes("速算")) return "mentalMath";
    return "probabilityExpectation";
  }
}
