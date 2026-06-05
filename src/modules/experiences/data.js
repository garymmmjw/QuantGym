export function normalizeInterviewExperience(raw = {}, deps = {}) {
  const {
    makeId = () => `${Date.now()}-${Math.random()}`,
    parseTags = (value) => Array.isArray(value) ? value.map(String).filter(Boolean) : String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean)
  } = deps;
  return {
    id: raw.id || makeId(),
    firm: String(raw.firm || "").trim().slice(0, 120),
    role: String(raw.role || "Quant Trading").trim().slice(0, 80),
    stage: String(raw.stage || "OA / Assessment").trim().slice(0, 80),
    season: String(raw.season || "2027 Summer").trim().slice(0, 40),
    date: String(raw.date || "").slice(0, 10),
    outcome: String(raw.outcome || "Waiting").trim().slice(0, 40),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String).filter(Boolean).slice(0, 12) : parseTags(raw.tags || "").slice(0, 12),
    summary: String(raw.summary || "").trim().slice(0, 3000),
    topics: String(raw.topics || "").trim().slice(0, 4000),
    reflection: String(raw.reflection || "").trim().slice(0, 4000),
    sharedPostId: String(raw.sharedPostId || ""),
    sharedAt: String(raw.sharedAt || ""),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString()
  };
}

export function formatExperienceDate(date) {
  if (!date) return "日期未记录";
  return date.replace(/-/g, "/");
}

export function formatExperienceOutcome(outcome) {
  return {
    Waiting: "等待结果",
    Advanced: "进入下一轮",
    Offer: "Offer",
    Closed: "流程结束",
    Withdrawn: "已撤回"
  }[outcome] || outcome;
}

export function formatSharedExperienceText(record = {}) {
  const lines = [`${record.firm} · ${record.role} · ${record.stage}`, `${record.season}${record.date ? ` · ${formatExperienceDate(record.date)}` : ""}`];
  lines.push(`流程：${record.summary}`);
  if (record.topics) lines.push(`主题：${record.topics}`);
  if (record.reflection) lines.push(`复盘：${record.reflection}`);
  return lines.join("\n");
}
