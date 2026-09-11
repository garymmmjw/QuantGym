const DEFAULT_BOARD_URL = "https://beta.quantgym.app/";
const BRIDGE_MESSAGE_TYPE = "quantgym:viewport-capture";
const VIEWPORT_CAPTURE_TIMEOUT_MS = 8000;

let capturedProblem = null;
let leetcodeHistory = null;

const els = {
  sourceHost: document.getElementById("sourceHost"),
  problemTitle: document.getElementById("problemTitle"),
  problemMeta: document.getElementById("problemMeta"),
  problemPrompt: document.getElementById("problemPrompt"),
  boardUrl: document.getElementById("boardUrl"),
  recordBtn: document.getElementById("recordBtn"),
  copyBtn: document.getElementById("copyBtn"),
  leetcodeSync: document.getElementById("leetcodeSync"),
  syncLeetcodeBtn: document.getElementById("syncLeetcodeBtn"),
  downloadLeetcodeBtn: document.getElementById("downloadLeetcodeBtn"),
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
  els.leetcodeSync.hidden = !isLeetcodeCnUrl(tab.url);

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

els.syncLeetcodeBtn.addEventListener("click", syncLeetcodeHistory);
els.downloadLeetcodeBtn.addEventListener("click", downloadLeetcodeHistory);

function isLeetcodeCnUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "leetcode.cn" && !url.username && !url.password;
  } catch { return false; }
}

function leetcodeTargetUrl(value) {
  const url = new URL(String(value || "").trim() || DEFAULT_BOARD_URL);
  const production = ["https://beta.quantgym.app", "https://quantgym.app", "https://www.quantgym.app"];
  const local = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || (!production.includes(url.origin) && !local)) {
    throw new Error("力扣记录只能发送到 QuantGym，请将 Board URL 改为 QuantGym 地址。");
  }
  return `${url.origin}/leetcode`;
}

async function syncLeetcodeHistory() {
  els.syncLeetcodeBtn.disabled = true;
  els.recordBtn.disabled = true;
  els.downloadLeetcodeBtn.hidden = true;
  leetcodeHistory = null;
  els.status.textContent = "正在读取力扣历史，请保持弹窗打开…";
  try {
    const targetUrl = leetcodeTargetUrl(els.boardUrl.value);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isLeetcodeCnUrl(tab.url)) throw new Error("请在已登录的 leetcode.cn 页面打开扩展。");
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: readLeetcodeHistoryFromPage
    });
    const result = results?.[0]?.result;
    if (!result?.ok || !result.payload) throw new Error(result?.error || "无法读取记录，请确认已登录力扣后重试。");
    leetcodeHistory = result.payload;
    els.downloadLeetcodeBtn.hidden = false;
    const transferId = crypto.randomUUID();
    const targetTab = await chrome.tabs.create({ url: targetUrl, active: false });
    await waitForTabComplete(targetTab.id);
    const reply = await sendBridgeMessage(targetTab.id, {
      type: "quantgym:leetcode-history", transferId, payload: leetcodeHistory
    });
    if (!reply?.ok) throw new Error("QuantGym 未能接收记录，可下载 JSON 后在 LeetCode 模块导入。");
    let delivered = reply.status === "received";
    for (let attempt = 0; !delivered && attempt < 24; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const status = await chrome.tabs.sendMessage(targetTab.id, { type: "quantgym:leetcode-status", transferId });
      delivered = status?.status === "received";
    }
    if (!delivered) throw new Error("QuantGym 页面尚未接收记录。可下载 JSON 后在 LeetCode 模块导入。");
    els.status.textContent = leetcodeHistory.coverage.complete
      ? "已发送到 QuantGym，请确认导入到当前关联账号。"
      : "已发送部分历史到 QuantGym，请查看缺失提示后确认导入。";
    await chrome.tabs.update(targetTab.id, { active: true });
  } catch (error) {
    els.status.textContent = error?.message || "同步未完成，请重试。";
  } finally {
    els.syncLeetcodeBtn.disabled = false;
    els.recordBtn.disabled = !capturedProblem;
  }
}

function downloadLeetcodeHistory() {
  if (!leetcodeHistory) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(leetcodeHistory, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `quantgym-leetcode-${leetcodeHistory.username}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  els.status.textContent = "已下载。请在 QuantGym 的 LeetCode 模块选择此文件，再确认导入。";
}

// This function is serialized into the active LeetCode tab. Keep all dependencies inside it.
async function readLeetcodeHistoryFromPage() {
  const startedAt = Date.now();
  const maxRecords = 20000;
  const maxDurationMs = 180000;
  const deadline = startedAt + maxDurationMs;
  const problems = new Map();
  const submissions = new Map();
  const encoder = new TextEncoder();
  let recordBytes = 0;
  const reasons = [];
  let skippedRecords = 0;
  let problemsComplete = false;
  let submissionsComplete = false;
  const text = (value, max = 300) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const slug = (value) => /^[a-z0-9][a-z0-9-]{0,199}$/i.test(String(value || "")) ? String(value) : "";
  const frontend = (value) => /^[\w .-]{1,50}$/.test(String(value || "")) ? String(value) : "";
  const difficulty = (value) => ({ EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" })[String(value || "").toUpperCase()] || "";
  function addRecord(map, key, value) {
    if (map.has(key)) return;
    if (problems.size + submissions.size >= maxRecords) throw new Error("题目与提交总数达到单次 20,000 条上限");
    const bytes = encoder.encode(JSON.stringify(value)).byteLength + 1;
    if (recordBytes + bytes > 5 * 1024 * 1024 - 16384) throw new Error("记录达到单次文件大小上限");
    recordBytes += bytes;
    map.set(key, value);
  }
  const identityQuery = "query QuantGymIdentity { userStatus { isSignedIn username userSlug } }";
  const problemQuery = "query QuantGymSolved($filters: UserProgressQuestionListInput) { userProgressQuestionList(filters: $filters) { totalNum questions { translatedTitle frontendId title titleSlug difficulty } } }";
  const submissionQuery = "query QuantGymSubmissions($offset: Int!, $limit: Int!, $lastKey: String, $status: SubmissionStatusEnum) { submissionList(offset: $offset, limit: $limit, lastKey: $lastKey, status: $status) { lastKey hasNext submissions { id title status statusDisplay timestamp frontendId } } }";
  async function request(query, variables = {}, finalIdentity = false) {
    if (!finalIdentity && Date.now() >= deadline) throw new Error("已达到本次同步时限");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(12000, finalIdentity ? 12000 : Math.max(1, deadline - Date.now())));
    try {
      const response = await fetch("/graphql/", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }), signal: controller.signal
      });
      if (!response.ok) throw new Error(`力扣请求失败（${response.status}）`);
      const result = await response.json();
      if (result.errors?.length || !result.data) throw new Error("力扣暂未提供完整记录");
      return result.data;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("力扣请求超时");
      throw error;
    } finally { clearTimeout(timer); }
  }
  function identity(data) {
    const status = data?.userStatus;
    const username = text(status?.userSlug, 80);
    if (!status?.isSignedIn || !/^[a-z0-9_-]{1,80}$/i.test(username)) throw new Error("请先登录力扣账号，再同步记录。");
    return username;
  }
  const pause = () => new Promise((resolve) => setTimeout(resolve, 150));
  try {
    if (location.protocol !== "https:" || location.hostname !== "leetcode.cn") throw new Error("请在 leetcode.cn 页面同步。");
    const username = identity(await request(identityQuery));
    try {
      let skip = 0;
      for (let page = 0; page < 200; page += 1) {
        const data = await request(problemQuery, { filters: { skip, limit: 100, questionStatus: "SOLVED" } });
        const list = data.userProgressQuestionList;
        if (!list || !Array.isArray(list.questions) || !Number.isSafeInteger(list.totalNum) || list.totalNum < 0) throw new Error("已通过题目清单不可用");
        const previousCount = problems.size;
        for (const question of list.questions) {
          const key = slug(question?.titleSlug);
          const frontendId = frontend(question?.frontendId);
          if (!key || !frontendId) { skippedRecords += 1; continue; }
          addRecord(problems, key, { slug: key, title: text(question.translatedTitle) || text(question.title) || key,
            titleEn: text(question.title), frontendId, difficulty: difficulty(question.difficulty) });
        }
        skip += list.questions.length;
        if (skip >= list.totalNum) { problemsComplete = problems.size >= list.totalNum; break; }
        if (!list.questions.length || problems.size === previousCount) throw new Error("题目分页未继续，已保留读取到的部分");
        if (problems.size >= maxRecords) throw new Error("题目数量达到单次同步上限");
        await pause();
      }
      if (!problemsComplete) reasons.push("题目清单尚未完整");
    } catch (error) { reasons.push(text(error.message)); }

    const byFrontendId = new Map([...problems.values()].map((problem) => [problem.frontendId, problem]));
    try {
      let offset = 0;
      let lastKey = null;
      const cursors = new Set();
      const seenIds = new Set();
      for (let page = 0; page < 1000; page += 1) {
        const data = await request(submissionQuery, { offset, limit: 20, lastKey, status: "AC" });
        const list = data.submissionList;
        if (!list || !Array.isArray(list.submissions) || typeof list.hasNext !== "boolean") throw new Error("提交历史不可用");
        const previousCount = seenIds.size;
        for (const submission of list.submissions) {
          const id = String(submission?.id || "");
          if (!/^\d{1,24}$/.test(id)) { skippedRecords += 1; continue; }
          seenIds.add(id);
          if (submissions.has(id)) continue;
          const problem = byFrontendId.get(frontend(submission.frontendId));
          const timestamp = Number(submission.timestamp);
          const status = String(submission.status || submission.statusDisplay || "").toUpperCase();
          if (!problem || !["AC", "10", "ACCEPTED"].includes(status) || !Number.isFinite(timestamp)
            || timestamp < 946684800 || timestamp * 1000 > startedAt + 86400000) { skippedRecords += 1; continue; }
          addRecord(submissions, id, { id, problemSlug: problem.slug, title: problem.title, titleEn: problem.titleEn,
            frontendId: problem.frontendId, difficulty: problem.difficulty,
            submittedAt: new Date(timestamp * 1000).toISOString(), status: "AC" });
        }
        if (!list.hasNext) { submissionsComplete = skippedRecords === 0; break; }
        if (!list.submissions.length || seenIds.size === previousCount) throw new Error("提交分页重复，已保留读取到的部分");
        if (submissions.size >= maxRecords || seenIds.size >= maxRecords) throw new Error("提交数量达到单次同步上限");
        const nextKey = typeof list.lastKey === "string" && list.lastKey ? list.lastKey : null;
        if (nextKey && cursors.has(nextKey)) throw new Error("提交分页游标重复，已停止同步");
        if (nextKey) cursors.add(nextKey);
        lastKey = nextKey;
        offset += list.submissions.length;
        await pause();
      }
      if (!submissionsComplete) reasons.push("提交历史尚未完整");
    } catch (error) { reasons.push(text(error.message)); }
    const finalUsername = identity(await request(identityQuery, {}, true));
    if (username !== finalUsername) throw new Error("同步期间力扣账号已切换，请重新同步。");
    if (!problems.size && !submissions.size && reasons.length) throw new Error(reasons.join("；"));
    if (skippedRecords) reasons.push(`${skippedRecords} 条记录未能匹配或格式无效`);
    return { ok: true, payload: {
      version: 1, site: "cn", username, capturedAt: new Date().toISOString(),
      problems: [...problems.values()], submissions: [...submissions.values()],
      coverage: { problemsComplete, submissionsComplete, complete: problemsComplete && submissionsComplete,
        reason: [...new Set(reasons)].join("；"), skippedRecords }
    } };
  } catch (error) { return { ok: false, error: text(error?.message) || "同步失败，请重试。" }; }
}
