import { requestJson } from "../../api/client.js";
import { clampNumber as defaultClampNumber } from "../../lib/number.js";
import { skillDefs as defaultSkillDefs } from "../../skills.js";

export function getClassifyEndpoint(endpoint) {
  const value = String(endpoint || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/\/interview\/?$/, "/classify-log");
    if (!url.pathname.endsWith("/classify-log")) url.pathname = "/classify-log";
    return url.toString();
  } catch {
    return "";
  }
}

export async function requestLogClassification(options = {}) {
  const {
    endpoint,
    difficulty = 1,
    duration = 0,
    fetchImpl = globalThis.fetch,
    headers = { "Content-Type": "application/json" },
    localGains = {},
    model = "",
    skills = {},
    text = ""
  } = options;
  if (!endpoint) throw new Error("Missing classify endpoint");
  try {
    return await requestJson(endpoint, {
      method: "POST",
      headers,
      body: {
        model,
        text,
        duration,
        difficulty,
        skills,
        localGains
      },
      auth: false,
      fetchImpl
    });
  } catch (error) {
    if (error?.status) throw new Error(`Classify endpoint ${error.status}`);
    throw error;
  }
}

export function createLogClassificationRequester(deps = {}) {
  return {
    request(text = "", localResult = {}) {
      return requestLogClassification({
        endpoint: getClassifyEndpoint(deps.getEndpoint?.() || ""),
        fetchImpl: deps.fetchImpl,
        headers: deps.getHeaders?.(),
        model: deps.getModel?.(),
        text,
        duration: Number(deps.getDuration?.() || 0),
        difficulty: Number(deps.getDifficulty?.() || 1),
        skills: deps.getSkillLabels?.() || {},
        localGains: localResult.gains
      });
    }
  };
}

export function normalizeClassification(remote, fallback, options = {}) {
  const defs = options.skillDefs || defaultSkillDefs;
  const clampNumber = options.clampNumber || defaultClampNumber;
  const normalizeCategory = options.normalizeCategory || ((value) => value);
  const gains = Object.fromEntries(Object.keys(defs).map((key) => [key, 0]));
  const source = remote?.gains || remote?.classification || {};
  Object.entries(source).forEach(([key, value]) => {
    const normalized = normalizeCategory(key);
    if (!defs[normalized]) return;
    gains[normalized] += clampNumber(value, 0, 120);
  });
  if (Object.values(gains).every((value) => value === 0)) return fallback;
  return { gains, hits: {}, summary: remote?.summary || "LLM" };
}

export function analyzeEntry(text, options = {}) {
  const defs = options.skillDefs || defaultSkillDefs;
  const lower = String(text || "").toLowerCase();
  const gains = Object.fromEntries(Object.keys(defs).map((key) => [key, 0]));
  const hits = {};

  Object.entries(defs).forEach(([key, def]) => {
    const matched = (def.keywords || []).filter((word) => lower.includes(String(word || "").toLowerCase()));
    hits[key] = matched;
    if (matched.length) gains[key] += 12 + matched.length * 5;
  });

  const duration = Number(options.duration || 0);
  if (duration > 0) {
    const active = Object.keys(gains).filter((key) => gains[key] > 0);
    const targets = active.length ? active : [options.lowestSkillKey || getLowestSkillKey(options.skills, defs)];
    const durationXp = Math.min(60, Math.round(duration * 0.9));
    targets.forEach((key) => {
      if (gains[key] == null) gains[key] = 0;
      gains[key] += Math.ceil(durationXp / targets.length);
    });
  }

  const problemCount = extractProblemCount(lower);
  if (problemCount > 0) {
    addProblemCountGain(gains, hits, "leetcode", problemCount * 12);
    addProblemCountGain(gains, hits, "probabilityExpectation", problemCount * 12);
    addProblemCountGain(gains, hits, "statistics", problemCount * 10);
    addProblemCountGain(gains, hits, "calculus", problemCount * 10);
    addProblemCountGain(gains, hits, "algebra", problemCount * 10);
    addProblemCountGain(gains, hits, "linearAlgebra", problemCount * 10);
    addProblemCountGain(gains, hits, "complexNumbers", problemCount * 10);
    addProblemCountGain(gains, hits, "machineLearning", problemCount * 10);
    addProblemCountGain(gains, hits, "deepLearning", problemCount * 10);
    addProblemCountGain(gains, hits, "option", problemCount * 10);
  }

  if (Object.values(gains).every((value) => value === 0)) {
    gains[options.lowestSkillKey || getLowestSkillKey(options.skills, defs)] = 12;
  }

  return { gains, hits };
}

export function getLowestSkillKey(skills = {}, defs = defaultSkillDefs) {
  return Object.keys(defs).sort((a, b) => (skills?.[a] || 0) - (skills?.[b] || 0))[0] || "leetcode";
}

export function extractProblemCount(text) {
  const matches = [...String(text || "").matchAll(/(\d+)\s*(道|题|problems?|questions?)/gi)];
  if (!matches.length) return 0;
  return matches.reduce((sum, match) => sum + Number(match[1]), 0);
}

function addProblemCountGain(gains, hits, key, value) {
  if (!(hits[key] || []).length) return;
  if (gains[key] == null) gains[key] = 0;
  gains[key] += value;
}
