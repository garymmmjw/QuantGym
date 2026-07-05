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

/** Parse a numeric ground-truth answer: plain numbers ("42", "-0.5") and simple fractions ("3/8"). */
export function parsePkNumericAnswer(text) {
  const raw = String(text || "").trim();
  const plain = raw.match(/^[-+]?\d+(?:\.\d+)?$/);
  if (plain) return Number(raw);
  const fraction = raw.match(/^([-+]?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
  return null;
}

export function scorePkAnswer(problem, answer, elapsed, deps = {}) {
  const getLocalizedProblemField = deps.getLocalizedProblemField || ((item, field) => item?.[field] || "");
  // Numeric ground truth → exact equivalence beats keyword heuristics: a
  // correct numeric answer wins outright, a wrong one loses outright.
  const truth = parsePkNumericAnswer(getLocalizedProblemField(problem, "answer", false))
    ?? parsePkNumericAnswer(getLocalizedProblemField(problem, "answer", true));
  const given = parsePkNumericAnswer(answer);
  if (truth !== null && given !== null) {
    const tolerance = Math.max(Math.abs(truth) * 1e-6, 1e-9);
    const correct = Math.abs(given - truth) <= tolerance;
    const timeBonusNumeric = elapsed <= 60 ? 10 : elapsed <= 180 ? 6 : elapsed <= 300 ? 3 : 0;
    return correct ? Math.min(100, 88 + timeBonusNumeric) : Math.round(Math.max(5, 22 - Math.min(10, elapsed / 60)));
  }
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
