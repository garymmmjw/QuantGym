import { requestJson } from "../../api/client.js";

export function normalizeResumeState(raw = {}) {
  return {
    text: String(raw?.text || "").slice(0, 120_000),
    review: Array.isArray(raw?.review) ? raw.review.map(String).filter(Boolean).slice(0, 8) : [],
    fileName: String(raw?.fileName || ""),
    fileType: String(raw?.fileType || ""),
    fileSize: Math.max(0, Number(raw?.fileSize || 0)),
    uploadedAt: raw?.uploadedAt || "",
    updatedAt: raw?.updatedAt || ""
  };
}

export function mergeResumeState(remoteResume, localResume, deps = {}) {
  const latestIso = deps.latestIso || ((left, right) => left || right || "");
  const remote = normalizeResumeState(remoteResume);
  const local = normalizeResumeState(localResume);
  const latest = latestIso(remote.updatedAt, local.updatedAt);
  const winner = latest
    ? (latest === remote.updatedAt ? remote : local)
    : ((local.text || local.fileName || local.review.length) ? local : remote);
  return normalizeResumeState({
    ...remote,
    ...local,
    ...winner,
    review: winner.review?.length ? winner.review : local.review.length ? local.review : remote.review
  });
}

export function localResumeReview(text, options = {}) {
  const isEn = options.language === "en";
  const graduationTerm = options.graduationTerm || "2027-09";
  const lower = String(text || "").toLowerCase();
  const bullets = [];
  if (!/\b\d+%|\$\d+|\b\d+x|\b\d+\s*(ms|sec|bps|users|trades|rows)\b/i.test(text)) {
    bullets.push(isEn
      ? "Add measurable outcomes to at least 3 bullets: latency, accuracy, PnL proxy, data size, or speed-up."
      : "至少给 3 条经历补上量化结果：延迟、准确率、PnL proxy、数据规模或速度提升。");
  }
  if (!/python|pandas|numpy|sql|c\+\+|java/i.test(lower)) {
    bullets.push(isEn
      ? "Make the technical stack obvious: Python, pandas/NumPy, SQL, C++/Java, or the stack you actually used."
      : "技术栈要一眼可见：Python、pandas/NumPy、SQL、C++/Java，或你实际用过的工具。");
  }
  if (!/market|option|trading|probability|statistics|alpha|risk/i.test(lower)) {
    bullets.push(isEn
      ? "Add one quant-facing line that connects a project to markets, probability, statistics, risk, or options."
      : "补一条 quant 相关表达，把项目和市场、概率、统计、risk 或 options 联系起来。");
  }
  if (!/lead|built|designed|implemented|optimized|analyzed/i.test(lower)) {
    bullets.push(isEn
      ? "Start bullets with stronger verbs: built, optimized, analyzed, implemented, designed."
      : "bullet 开头用更强动词：built、optimized、analyzed、implemented、designed。");
  }
  bullets.push(isEn
    ? `Tune the education line for graduation term ${graduationTerm} and put recruiting status near the top.`
    : `教育经历里明确毕业时间 ${graduationTerm}，并把求职状态放到更靠前的位置。`);
  return bullets.slice(0, 6);
}

export function parseResumeReviewResponse(data = {}) {
  const items = data.items || data.suggestions || data.review || data.reply || data.text;
  if (Array.isArray(items)) return items.map(String).filter(Boolean).slice(0, 8);
  return String(items || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function requestResumeReview(options = {}) {
  const {
    endpoint,
    fetchImpl = globalThis.fetch,
    graduationTerm = "2027-09",
    headers = { "Content-Type": "application/json" },
    language = "zh",
    model = "",
    resume = "",
    target = "quant internship / full-time"
  } = options;
  if (!endpoint) throw new Error("Missing endpoint");
  try {
    const data = await requestJson(endpoint, {
      method: "POST",
      headers,
      body: {
        task: "resume_review",
        model,
        language,
        graduationTerm,
        target,
        resume
      },
      auth: false,
      fetchImpl
    });
    return parseResumeReviewResponse(data);
  } catch (error) {
    if (error?.status) throw new Error(`LLM endpoint ${error.status}`);
    throw error;
  }
}
