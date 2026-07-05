const DEFAULT_BOARD_URL = "https://beta.quantgym.app/";
const BRIDGE_MESSAGE_TYPE = "quantgym:viewport-capture";
const VIEWPORT_CAPTURE_TIMEOUT_MS = 8000;

let capturedProblem = null;

const els = {
  sourceHost: document.getElementById("sourceHost"),
  problemTitle: document.getElementById("problemTitle"),
  problemMeta: document.getElementById("problemMeta"),
  problemPrompt: document.getElementById("problemPrompt"),
  boardUrl: document.getElementById("boardUrl"),
  recordBtn: document.getElementById("recordBtn"),
  copyBtn: document.getElementById("copyBtn"),
  status: document.getElementById("status")
};

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await chrome.storage.local.get({ boardUrl: DEFAULT_BOARD_URL });
  els.boardUrl.value = settings.boardUrl;
  await captureCurrentTab();
});

els.boardUrl.addEventListener("change", async () => {
  const boardUrl = normalizeBoardUrl(els.boardUrl.value);
  els.boardUrl.value = boardUrl;
  await chrome.storage.local.set({ boardUrl });
});

els.recordBtn.addEventListener("click", async () => {
  if (!capturedProblem) return;
  await recordViewportProblem();
});

async function recordViewportProblem() {
  els.recordBtn.disabled = true;
  els.status.textContent = "正在读取当前屏幕...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "jpeg",
      quality: 88
    });
    const boardUrl = normalizeBoardUrl(els.boardUrl.value);
    els.boardUrl.value = boardUrl;
    await chrome.storage.local.set({ boardUrl });

    const targetTab = await chrome.tabs.create({ url: boardUrl, active: false });
    await waitForTabComplete(targetTab.id);
    await sendBridgeMessage(targetTab.id, {
      type: BRIDGE_MESSAGE_TYPE,
      payload: buildViewportCapturePayload(tab, screenshotDataUrl)
    });
    await chrome.tabs.update(targetTab.id, { active: true });
    els.status.textContent = "已发送到 QuantGym，正在识别。";
  } catch {
    els.status.textContent = "记录失败。请确认当前页面可见，并已打开 QuantGym。";
  } finally {
    els.recordBtn.disabled = false;
  }
}

els.copyBtn.addEventListener("click", copyProblemJson);

async function captureCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    els.sourceHost.textContent = new URL(tab.url || "").hostname.replace(/^www\./, "");
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractProblemFromPage
    });

    capturedProblem = result;
    renderProblem(result);
  } catch {
    capturedProblem = null;
    els.problemTitle.textContent = "无法读取当前页面";
    els.problemPrompt.textContent = "请在 LeetCode、题库或普通网页题目页面打开扩展。";
    els.status.textContent = "Chrome 内部页面和部分受限页面不可捕获。";
    els.recordBtn.disabled = true;
    els.copyBtn.disabled = true;
  }
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

function buildViewportCapturePayload(tab, screenshotDataUrl) {
  const problem = capturedProblem || {};
  const pageTitle = tab.title || problem.titleEn || problem.titleZh || "";
  const sourceUrl = tab.url || problem.sourceUrl || "";
  const pageText = [
    problem.titleEn || problem.titleZh || pageTitle,
    problem.promptEn || problem.promptZh || ""
  ].filter(Boolean).join("\n\n").slice(0, 12000);

  return {
    version: 1,
    source: "quantgym-collector",
    sourceUrl,
    pageTitle,
    capturedAt: new Date().toISOString(),
    screenshot: {
      dataUrl: screenshotDataUrl,
      type: "image/jpeg"
    },
    pageContext: problem,
    pageText
  };
}

async function sendBridgeMessage(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["quantgym-bridge.js"]
    });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

function waitForTabComplete(tabId, timeoutMs = VIEWPORT_CAPTURE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated?.removeListener?.(listener);
      resolve();
    };
    const listener = (updatedTabId, changeInfo = {}) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    chrome.tabs.onUpdated?.addListener?.(listener);
  });
}

function normalizeBoardUrl(value) {
  try {
    const url = new URL(String(value || "").trim() || DEFAULT_BOARD_URL);
    if (!isAllowedBoardUrl(url)) return DEFAULT_BOARD_URL;
    return url.toString();
  } catch {
    return DEFAULT_BOARD_URL;
  }
}

function isAllowedBoardUrl(url) {
  if (url.protocol === "https:") return true;
  if (url.protocol !== "http:") return false;
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
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
