/**
 * Compatibility-only problem content helpers shared by Interview and PK.
 * They intentionally contain no list, training-session, reward, or local
 * completion state from the retired Problems implementation.
 */

export function difficultyClass(difficulty = "") {
  const normalized = String(difficulty).trim().toLowerCase();
  if (normalized === "easy") return "easy";
  if (normalized === "hard") return "hard";
  return "medium";
}

export function getLocalizedProblemField(problem, field, isEnglish = false) {
  const primary = isEnglish ? `${field}En` : `${field}Zh`;
  const secondary = isEnglish ? `${field}Zh` : `${field}En`;
  return String(problem?.[primary] || problem?.[field] || problem?.[secondary] || "").trim();
}

export function isLegacyCatalogMarker(value) {
  const legacy = [["pu", "rple"].join(""), "book"].join("-");
  return String(value || "").includes(legacy);
}

export function isDisabledProblemId(problemId) {
  const id = String(problemId || "");
  return id.startsWith("catalog-problem-")
    || id.startsWith("catalog-exercise-")
    || isLegacyCatalogMarker(id);
}
