import { clampNumber } from "../../lib/number.js";
import { makeId } from "../../lib/id.js";
import { interviewTypeDefs } from "./defs.js";

function defaultRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getInterviewQuestionCountForConfig(config = {}, options = {}) {
  if (config.durationMinutes) return Math.round(clampNumber(Math.ceil(config.durationMinutes / 6), 3, 10));
  return Math.round(clampNumber(config.questionCount || options.defaultQuestionCount || 1, 1, 12));
}

export function getInterviewQuestionSecondsForConfig(config = {}, count = 1, options = {}) {
  if (config.durationMinutes) return Math.max(120, Math.round((config.durationMinutes * 60) / Math.max(1, count)));
  return Math.round(clampNumber(options.defaultQuestionSeconds || 60, 60, 3600));
}

export function filterInterviewPoolByDifficulty(pool = [], difficulty = "", options = {}) {
  const values = options.difficultyDefs?.[difficulty]?.values || [];
  if (!values.length) return pool;
  const filtered = pool.filter((problem) => values.includes(String(problem.difficulty || "").trim()));
  return filtered.length >= 2 ? filtered : pool;
}

export function sampleInterviewQuestions(pool = [], count = 0, options = {}) {
  const randomInt = options.randomInt || defaultRandomInt;
  const source = [...pool];
  for (let index = source.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [source[index], source[swapIndex]] = [source[swapIndex], source[index]];
  }
  return source.slice(0, count);
}

export function buildInterviewQuestionSet(options = {}) {
  const {
    pool = [],
    count = 0,
    difficulty = "",
    difficultyDefs = {},
    selectedProblemId = "",
    normalizeProblem = (problem) => problem,
    randomInt
  } = options;

  const difficultyPool = filterInterviewPoolByDifficulty(pool, difficulty, { difficultyDefs });
  const selectedProblem = pool.find((problem) => problem.id === selectedProblemId);
  const sampled = sampleInterviewQuestions(
    selectedProblem ? difficultyPool.filter((problem) => problem.id !== selectedProblem.id) : difficultyPool,
    selectedProblem ? Math.max(0, count - 1) : count,
    { randomInt }
  );
  return (selectedProblem ? [selectedProblem, ...sampled] : sampled).map((problem) => normalizeProblem(problem));
}

export function normalizeGeneratedInterviewProblem(raw = {}, index = 0, sourceName = "", type = "technical", options = {}) {
  const normalizeProblem = options.normalizeProblem || ((problem) => problem);
  const normalizeCategory = options.normalizeCategory || ((category) => category || "probabilityExpectation");
  const parseTags = options.parseTags || ((value) => String(value || "").split(/[,，#\s]+/).map((item) => item.trim()).filter(Boolean));
  const stableId = options.stableId || ((title, sourceUrl) => `${title}|${sourceUrl}`);
  const createId = options.makeId || makeId;
  const now = options.now || new Date().toISOString();
  const fallbackCategory = type === "behavioral" ? "market" : "probabilityExpectation";
  const titleSeed = `${sourceName}-${index}-${raw?.titleEn || raw?.titleZh || raw?.promptEn || raw?.promptZh || createId()}`;

  return normalizeProblem({
    ...raw,
    id: raw?.id || stableId(titleSeed, sourceName),
    source: "pdf-interview",
    sourceUrl: "",
    category: normalizeCategory(raw?.category || fallbackCategory),
    difficulty: raw?.difficulty || "Medium",
    tags: [...new Set([...parseTags(raw?.tags || ""), "pdf", interviewTypeDefs[type]?.label || "interview"])],
    createdAt: now,
    updatedAt: now
  });
}
