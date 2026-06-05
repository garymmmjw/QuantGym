export function normalizeDifficultyFilter(value = "all") {
  const normalized = String(value || "all").trim().toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : "all";
}

export function difficultyClass(difficulty = "") {
  const normalized = String(difficulty).trim().toLowerCase();
  if (normalized === "easy") return "easy";
  if (normalized === "hard") return "hard";
  return "medium";
}

export function formatProblemExcerpt(text) {
  const value = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (value.length <= 560) return value;
  const slice = value.slice(0, 560);
  const stops = ["。", ".", "？", "?", "；", ";", "，", ",", " "]
    .map((mark) => slice.lastIndexOf(mark))
    .filter((index) => index > 220);
  const boundary = stops.length ? Math.max(...stops) : 560;
  return trimDanglingMath(slice.slice(0, boundary).trim()) + " ...";
}

export function formatProblemCardPreview(text) {
  return simplifyLatexPreview(formatProblemExcerpt(text))
    .replace(/\s+([,.;:!?，。；：！？])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function simplifyLatexPreview(text) {
  let value = String(text || "").replace(/\\\$/g, "__QG_DOLLAR__");
  value = value
    .replace(/\\\[(.*?)\\\]/gs, "$1")
    .replace(/\\\((.*?)\\\)/gs, "$1")
    .replace(/\$\$(.*?)\$\$/gs, "$1")
    .replace(/\$(.*?)\$/gs, "$1")
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\^\\circ/g, "°")
    .replace(/\\%/g, "%")
    .replace(/\\,/g, " ")
    .replace(/\\cdot|\\times/g, "×")
    .replace(/\\leq?|≤/g, "≤")
    .replace(/\\geq?|≥/g, "≥")
    .replace(/\\neq?/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\infty/g, "∞")
    .replace(/\\sum/g, "Σ")
    .replace(/\\prod/g, "Π")
    .replace(/\\int/g, "∫")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\delta/g, "δ")
    .replace(/\\sigma/g, "σ")
    .replace(/\\mu/g, "μ")
    .replace(/\\rho/g, "ρ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\theta/g, "θ")
    .replace(/\\pi/g, "π")
    .replace(/\\left|\\right/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/__QG_DOLLAR__/g, "$")
    .replace(/\${2,}(?=\d)/g, () => "$$")
    .replace(/[{}]/g, "")
    .replace(/_([A-Za-z0-9]+)/g, "_$1")
    .replace(/\s+/g, " ");
  return value;
}

export function trimDanglingMath(value) {
  let text = String(value || "");
  [
    ["\\[", "\\]"],
    ["\\(", "\\)"]
  ].forEach(([open, close]) => {
    const openIndex = text.lastIndexOf(open);
    const closeIndex = text.lastIndexOf(close);
    if (openIndex > closeIndex) text = text.slice(0, openIndex).trim();
  });

  const dollarPositions = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "$" && text[index - 1] !== "\\") dollarPositions.push(index);
  }
  if (dollarPositions.length % 2 === 1) {
    text = text.slice(0, dollarPositions[dollarPositions.length - 1]).trim();
  }
  return text;
}

export function getLocalizedProblemField(problem, field, isEn = false) {
  const primary = isEn ? `${field}En` : `${field}Zh`;
  const secondary = isEn ? `${field}Zh` : `${field}En`;
  return String(problem?.[primary] || problem?.[field] || problem?.[secondary] || "").trim();
}

export function getProblemDisplayTitle(problem, options = {}) {
  const isEnglish = Boolean(options.isEnglish);
  const t = options.t || ((key) => key);
  if (!isEnglish) return problem?.titleZh || problem?.titleEn || t("problemTitle");
  if (problem?.titleEn) return problem.titleEn;
  const match = String(problem?.id || "").match(/(\d+)$/);
  const number = match ? match[1].padStart(3, "0") : "";
  const categoryLabel = String(options.formatCategory?.(problem?.category) || problem?.category || "").replace(/[/&]/g, " ");
  return number ? `${categoryLabel} Challenge ${number}` : t("problemTitle");
}

export function getProblemExcerptText(problem, options = {}) {
  if (!options.isEnglish) return problem?.promptZh || problem?.promptEn || options.t?.("noPrompt") || "";
  return problem?.promptEn || options.t?.("untranslatedProblemFallback") || "";
}

export function formatProblemTag(tag, options = {}) {
  if (isHiddenProblemTag(tag)) return "";
  const label = options.tagLabels?.[String(tag)] || {};
  return options.isEnglish ? label.en || tag : label.zh || tag;
}

export function isHiddenProblemTag(tag) {
  const value = String(tag || "").trim();
  return value === "question-bank" || isLegacyCatalogMarker(value);
}

export function cleanProblemTagValue(value) {
  return String(value || "").trim().toLowerCase();
}

export function isLegacyCatalogMarker(value) {
  const legacy = [["pu", "rple"].join(""), "book"].join("-");
  return String(value || "").includes(legacy);
}

export function isDisabledProblemId(problemId) {
  const id = String(problemId || "");
  return id.startsWith("catalog-problem-") || id.startsWith("catalog-exercise-") || isLegacyCatalogMarker(id);
}

export function isDisabledProblemSource(problem, options = {}) {
  const source = String(problem?.source || "").trim();
  const sourceType = String(problem?.sourceType || problem?.collection || "").trim();
  const bookSlug = String(problem?.bookSlug || "").trim();
  const bookName = String(problem?.bookName || "").trim();
  const parseTags = options.parseTags || ((value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
  const tags = Array.isArray(problem?.tags) ? problem.tags.map(String) : parseTags(problem?.tags || "");
  const disabledSources = options.disabledSources || new Set();
  const disabledBookNames = options.disabledBookNames || new Set();
  return isDisabledProblemId(problem?.id)
    || disabledSources.has(source)
    || disabledSources.has(sourceType)
    || disabledSources.has(bookSlug)
    || disabledBookNames.has(bookName)
    || tags.some((tag) => disabledBookNames.has(String(tag).trim()) || disabledSources.has(String(tag).trim()));
}

export function getProblemMediaMarkdown(problem, options = {}) {
  const scope = options.scope || "all";
  const isSafeUrl = options.isSafeUrl || ((url) => /^https?:\/\//i.test(url));
  const values = [];
  const pushValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    if (typeof value === "object") {
      pushValue(value.url || value.src || value.href || value.dataUrl);
      return;
    }
    const url = String(value || "").trim();
    if (isSafeUrl(url)) values.push(url);
  };

  if (scope === "prompt" || scope === "all") {
    ["image", "imageUrl", "imageUrls", "images", "diagram", "diagramUrl", "promptImage", "promptImages"].forEach((key) => pushValue(problem?.[key]));
  }
  if (scope === "answer" || scope === "all") {
    ["answerImage", "answerImages", "explanationImage", "explanationImages", "solutionImage", "solutionImages"].forEach((key) => pushValue(problem?.[key]));
  }

  return [...new Set(values)]
    .map((url, index) => `![${scope === "answer" ? "answer" : "problem"} image ${index + 1}](${url})`)
    .join("\n");
}
