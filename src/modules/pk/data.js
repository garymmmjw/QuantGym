export function formatPkProblem(problem = {}) {
  return [
    `${problem.titleZh || problem.titleEn}`,
    "",
    problem.promptZh || problem.promptEn || "无题干"
  ].join("\n");
}

export function extractKeywords(text) {
  const words = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .filter((word) => !["the", "and", "for", "with", "that", "this", "from", "return", "given", "what", "your"].includes(word));
  return [...new Set(words)].slice(0, 18);
}

export function scorePkAnswer(problem, answer, elapsed, deps = {}) {
  const getLocalizedProblemField = deps.getLocalizedProblemField || ((item, field) => item?.[field] || "");
  const source = [
    getLocalizedProblemField(problem, "answer", false),
    getLocalizedProblemField(problem, "answer", true),
    getLocalizedProblemField(problem, "explanation", false),
    getLocalizedProblemField(problem, "explanation", true),
    problem.promptEn || "",
    problem.promptZh || ""
  ].join(" ");
  const keywords = extractKeywords(source);
  const lower = String(answer || "").toLowerCase();
  const hits = keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
  const coverage = keywords.length ? hits / keywords.length : 0.35;
  const lengthScore = Math.min(1, String(answer || "").length / 280);
  const timeBonus = elapsed <= 180 ? 8 : elapsed <= 300 ? 4 : 0;
  return Math.round(Math.min(100, 35 + coverage * 42 + lengthScore * 15 + timeBonus));
}
