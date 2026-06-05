const NETWORK_STATUS_LABELS = {
  zh: {
    "To reach out": "待联系",
    Contacted: "已联系",
    "Follow-up": "待跟进",
    Warm: "关系较热",
    Archived: "已归档"
  },
  en: {
    "To reach out": "To reach out",
    Contacted: "Contacted",
    "Follow-up": "Follow-up",
    Warm: "Warm",
    Archived: "Archived"
  }
};

export function getNetworkStatusLabel(status, language = "zh") {
  return NETWORK_STATUS_LABELS[language]?.[status] || status || "-";
}

export function normalizeNetworkContact(raw = {}, deps = {}) {
  const makeId = deps.makeId || (() => `${Date.now()}-${Math.random()}`);
  return {
    id: raw?.id || makeId(),
    name: String(raw?.name || "").trim(),
    company: String(raw?.company || "").trim(),
    role: String(raw?.role || "").trim(),
    status: String(raw?.status || "To reach out").trim(),
    channel: String(raw?.channel || "").trim(),
    nextStep: String(raw?.nextStep || "").trim(),
    notes: String(raw?.notes || "").trim(),
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || ""
  };
}
