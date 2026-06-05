import { clampNumber } from '../../lib/number.js';

export function getInterviewMessageAvatar(role) {
  if (role === "user") return "你";
  if (role === "system") return "i";
  return "Q";
}

export function getInterviewMessageLabel(role, language = "zh") {
  if (role === "user") return language === "zh" ? "你" : "You";
  if (role === "system") return language === "zh" ? "面试题" : "Prompt";
  return language === "zh" ? "AI 面试官" : "AI interviewer";
}

export function isCompactInterviewReply(text) {
  const raw = String(text || "").trim();
  if (!raw || raw.includes("\n")) return false;
  const compact = raw.replace(/[*_`#[\]()]/g, "").replace(/\s+/g, "");
  return compact.length > 0 && compact.length <= 8;
}

export function prettyInterviewTitle(problem = {}, options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const raw = String(language === "zh"
    ? problem.titleZh || problem.titleEn
    : problem.titleEn || problem.titleZh || "").trim();
  let cleaned = raw.replace(/^\s*(question|problem|题目|第)\s*[\d.]+\s*[-–—:：.]*\s*/i, "").trim();
  if (!cleaned || /^[\d.\s]+$/.test(cleaned)) {
    cleaned = options.formatCategory?.(problem.category) || (language === "zh" ? "面试题" : "Question");
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function formatInterviewQuestion(problem = {}, index = 0, options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const session = options.session || {};
  const title = prettyInterviewTitle(problem, {
    language,
    formatCategory: options.formatCategory
  });
  const prompt = language === "zh" ? problem.promptZh || problem.promptEn : problem.promptEn || problem.promptZh;
  const typeLabel = options.typeDefs?.[session.type]?.label || "Interview";
  const questionCount = session.questions?.length || 1;
  return [
    `# Q${index + 1}/${questionCount} · ${typeLabel} · ${options.formatCategory?.(problem.category) || problem.category || ""} · ${problem.difficulty || ""}`,
    "",
    `**${title}**`,
    "",
    prompt || "No prompt.",
    options.getProblemMediaMarkdown?.(problem, "prompt") || ""
  ].filter(Boolean).join("\n");
}

export function formatStructuredInterviewFeedback(feedback = {}, options = {}) {
  const useZh = options.language !== "en";
  const labels = {
    correctness: useZh ? "正确性" : "Correctness",
    reasoning: useZh ? "推理" : "Reasoning",
    communication: useZh ? "表达" : "Communication"
  };
  const dimensionLines = ["correctness", "reasoning", "communication"]
    .map((key) => {
      const item = feedback.dimensions?.[key] || {};
      return `- ${labels[key]}: ${Math.round(clampNumber(item.score, 0, 5))}/5`;
    });
  const missing = Array.isArray(feedback.missing) && feedback.missing.length
    ? feedback.missing.map((item) => `- ${item}`).join("\n")
    : (useZh ? "- 暂无明显缺失。" : "- No major missing piece.");
  return useZh
    ? [
      `得分：${Math.round(clampNumber(feedback.overall, 0, 100))}/100`,
      "",
      "维度分：",
      ...dimensionLines,
      "",
      `主要反馈：${feedback.summary || "回答已记录。"}`,
      "",
      "缺失要点：",
      missing
    ].join("\n")
    : [
      `Score: ${Math.round(clampNumber(feedback.overall, 0, 100))}/100`,
      "",
      "Dimensions:",
      ...dimensionLines,
      "",
      `Key feedback: ${feedback.summary || "Answer recorded."}`,
      "",
      "Missing pieces:",
      missing
    ].join("\n");
}

export function parseInterviewFeedbackScore(text) {
  const source = String(text || "");
  const labeled = source.match(/(?:得分|评分|score)\s*[:：]?\s*(\d{1,3})(?:\s*\/\s*100)?/i);
  const fallback = source.match(/\b(\d{1,3})\s*\/\s*100\b/);
  const value = Number((labeled || fallback)?.[1]);
  if (!Number.isFinite(value)) return null;
  return Math.round(clampNumber(value, 0, 100));
}

export function parseInterviewFeedbackEvaluation(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const labeled = lines.find((line) => /^(评价|evaluation)\s*[:：]/i.test(line));
  const olderLine = lines.find((line) => /^(改进|fix|亮点|good)\s*[:：]/i.test(line));
  const fallback = lines.find((line) => !/^(得分|评分|score)\s*[:：]/i.test(line));
  return stripInterviewFeedbackLabel(labeled || olderLine || fallback || "").slice(0, 900);
}

export function stripInterviewFeedbackLabel(text) {
  return String(text || "").replace(/^(评价|evaluation|改进|fix|亮点|good)\s*[:：]\s*/i, "").trim();
}

export function buildInterviewReportHtml(text, options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const esc = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      body.push("</ul>");
      inList = false;
    }
  };
  String(text).split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      return;
    }
    if (trimmed.startsWith("### ")) {
      closeList();
      body.push(`<h2>${esc(trimmed.slice(4))}</h2>`);
      return;
    }
    if (trimmed.startsWith("- ")) {
      if (!inList) {
        body.push("<ul>");
        inList = true;
      }
      body.push(`<li>${esc(trimmed.slice(2))}</li>`);
      return;
    }
    closeList();
    body.push(`<p>${esc(trimmed)}</p>`);
  });
  closeList();
  const title = language === "zh" ? "QuantGym 模拟面试报告" : "QuantGym Mock Interview Report";
  const timestamp = options.timestamp || new Date().toLocaleString();
  return `<!doctype html><html lang="${language === "zh" ? "zh" : "en"}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;max-width:720px;margin:48px auto;padding:0 24px;color:#18181b;line-height:1.7}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:22px 0 8px;color:#2c3138}p{margin:4px 0}ul{margin:6px 0 6px 20px;padding:0}li{margin:3px 0}.meta{color:#6b7280;font-size:13px;margin-bottom:18px}</style></head><body><h1>${esc(title)}</h1><div class="meta">${esc(timestamp)}</div>${body.join("\n")}</body></html>`;
}

export function interviewSparkline(values) {
  const blocks = "▁▂▃▄▅▆▇█";
  const nums = values.filter((value) => Number.isFinite(value));
  if (!nums.length) return "";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  return nums.map((value) => blocks[Math.min(blocks.length - 1, Math.round(((value - min) / span) * (blocks.length - 1)))]).join("");
}
