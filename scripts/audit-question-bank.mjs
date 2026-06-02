import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const outputDir = path.resolve(projectRoot, options.output || "artifacts/question-bank-audit");
const bookRoot = path.resolve(
  options.bookRoot || process.env.QUANTGYM_BOOK_ROOT || path.join(projectRoot, "量化书籍")
);
const catalogPath = path.join(projectRoot, "data", "problem-catalog.json");
const sourceRoot = path.join(projectRoot, "data", "question-banks");

const books = [
  { slug: "green-book", name: "绿皮书", path: "有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/quant_green_book.tex", translationPath: "有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/quant_green_book_zh.tex", sourceLanguage: "en" },
  { slug: "yellow-book", name: "黄皮书", path: "有题目的/黄皮书 150 Most Frequently Asked Questions on Quant Interviews/quant_yellow_book.tex", translationPath: "有题目的/黄皮书 150 Most Frequently Asked Questions on Quant Interviews/quant_yellow_book_zh.tex", sourceLanguage: "en" },
  { slug: "red-book", name: "红宝书", path: "有题目的/红宝书 Quant Job Interview Questions And Answers/quant_red_book.tex", translationPath: "有题目的/红宝书 Quant Job Interview Questions And Answers/quant_red_book_zh.tex", sourceLanguage: "en" },
  { slug: "hull-derivatives", name: "Hull", path: "纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/quant_hull_book.tex", translationPath: "纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/quant_hull_book_zh.tex", sourceLanguage: "en" },
  { slug: "stefanica-fe-math", name: "Stefanica", path: "纯textbook/Stefanica金融工程数学入门 A Primer for the Mathematics of Financial Engineering/quant_stefanica_book.tex", translationPath: "纯textbook/Stefanica金融工程数学入门 A Primer for the Mathematics of Financial Engineering/quant_stefanica_book_zh.tex", sourceLanguage: "en" },
  { slug: "quantitative-primer", name: "Quantitative Primer", path: "有题目的/Quantitative Primer/quant_qprimer_book.tex", translationPath: "有题目的/Quantitative Primer/quant_qprimer_book_zh.tex", sourceLanguage: "en" },
  { slug: "dudeney-puzzles", name: "Dudeney", path: "有题目的/Dudeney挑战谜题 Challenging Puzzles/quant_dudeney_book.tex", translationPath: "有题目的/Dudeney挑战谜题 Challenging Puzzles/quant_dudeney_book_zh.tex", sourceLanguage: "en" },
  { slug: "linalg-primer", name: "Linear Algebra Primer", path: "纯textbook/金融工程线性代数入门 A Linear Algebra Primer for Financial Engineering/quant_linalg_book.tex", translationPath: "纯textbook/金融工程线性代数入门 A Linear Algebra Primer for Financial Engineering/quant_linalg_book_zh.tex", sourceLanguage: "en" },
  { slug: "probability-stochastic-10", name: "Probability Stochastic 10", path: "有题目的/概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs/quant_prob10_book.tex", translationPath: "有题目的/概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs/quant_prob10_book_zh.tex", sourceLanguage: "en" }
];

const validCategories = new Set([
  "leetcode",
  "cppProgramming",
  "pandasNumpy",
  "probabilityExpectation",
  "statistics",
  "calculus",
  "algebra",
  "linearAlgebra",
  "optimization",
  "complexNumbers",
  "machineLearning",
  "deepLearning",
  "market",
  "option",
  "mentalMath"
]);
const validDifficulties = new Set(["Easy", "Medium", "Hard"]);
const imageKeys = [
  "image",
  "imageUrl",
  "imageUrls",
  "images",
  "diagram",
  "diagramUrl",
  "promptImage",
  "promptImages",
  "answerImage",
  "answerImages",
  "explanationImage",
  "explanationImages",
  "solutionImage",
  "solutionImages"
];

const payload = readJson(catalogPath, { problems: [] });
const catalogProblems = Array.isArray(payload) ? payload : payload.problems || [];
const sourceProblems = new Map();
for (const source of listSourceProblemFiles()) {
  const sourcePayload = readJson(source.file, {});
  const problems = Array.isArray(sourcePayload) ? sourcePayload : sourcePayload.problems || [];
  sourceProblems.set(source.slug, problems);
}

fs.mkdirSync(outputDir, { recursive: true });

const sourceAudits = books.map(auditBookSource);
sourceAudits.push(auditQuantGuideSource());

const rows = [];
const issueRows = [];
for (const problem of catalogProblems) {
  const audit = auditProblem(problem);
  rows.push(audit);
  for (const issue of audit.issues) {
    issueRows.push({
      source: audit.source,
      id: audit.id,
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
      titleEn: audit.titleEn,
      titleZh: audit.titleZh
    });
  }
}

const summary = buildSummary(sourceAudits, rows, issueRows);
writeJson(path.join(outputDir, "summary.json"), summary);
writeJson(path.join(outputDir, "source-audit.json"), sourceAudits);
writeCsv(path.join(outputDir, "per-problem.csv"), rows.map((row) => ({
  source: row.source,
  id: row.id,
  titleEn: row.titleEn,
  titleZh: row.titleZh,
  category: row.category,
  difficulty: row.difficulty,
  promptEnLength: row.promptEnLength,
  promptZhLength: row.promptZhLength,
  explanationEnLength: row.explanationEnLength,
  explanationZhLength: row.explanationZhLength,
  imageCount: row.imageCount,
  issueCount: row.issues.length,
  issueCodes: row.issues.map((issue) => issue.code).join("|")
})));
writeCsv(path.join(outputDir, "issues.csv"), issueRows);
writeJsonl(path.join(outputDir, "quantguide-zh-todo.jsonl"), rows
  .filter((row) => row.source === "quantguide" && row.issues.some((issue) => issue.code === "zh_prompt_same_as_en" || issue.code === "zh_title_same_as_en"))
  .map((row) => ({
    id: row.id,
    titleEn: row.titleEn,
    titleZh: row.titleZh,
    promptEnLength: row.promptEnLength,
    issueCodes: row.issues.map((issue) => issue.code)
  })));
writeMarkdown(path.join(outputDir, "README.md"), summary, sourceAudits, issueRows);

console.log(`Audited ${catalogProblems.length} catalog problems.`);
console.log(`Found ${issueRows.length} issue flags.`);
console.log(`Wrote ${outputDir}`);

function auditBookSource(book) {
  const sourcePath = path.join(bookRoot, book.path);
  const translationPath = path.join(bookRoot, book.translationPath);
  const normalized = sourceProblems.get(book.slug) || [];
  const sourceEntries = fs.existsSync(sourcePath) ? extractTexEntries(sourcePath) : [];
  const translationEntries = fs.existsSync(translationPath) ? extractTexEntries(translationPath) : [];
  const countIssues = [];
  if (!fs.existsSync(sourcePath)) countIssues.push(`missing_source_tex:${book.path}`);
  if (!fs.existsSync(translationPath)) countIssues.push(`missing_translation_tex:${book.translationPath}`);
  if (sourceEntries.length && normalized.length !== sourceEntries.length) {
    countIssues.push(`source_count_mismatch:${sourceEntries.length}->${normalized.length}`);
  }
  if (translationEntries.length && normalized.length !== translationEntries.length) {
    countIssues.push(`translation_count_mismatch:${translationEntries.length}->${normalized.length}`);
  }
  return {
    slug: book.slug,
    name: book.name,
    type: "latex",
    sourceLanguage: book.sourceLanguage,
    sourceTexPath: relativePath(sourcePath),
    translationTexPath: relativePath(translationPath),
    sourceTexCount: sourceEntries.length,
    translationTexCount: translationEntries.length,
    normalizedCount: normalized.length,
    countIssues
  };
}

function auditQuantGuideSource() {
  const normalized = sourceProblems.get("quantguide") || [];
  const rawExport = path.join(projectRoot, "QuantGuide", "data", "quantguide_account_questions_full.json");
  const raw = fs.existsSync(rawExport) ? readJson(rawExport, {}) : {};
  const rawCount = Array.isArray(raw.records) ? raw.records.length : 0;
  const countIssues = [];
  if (rawCount && rawCount !== normalized.length) countIssues.push(`raw_count_mismatch:${rawCount}->${normalized.length}`);
  if (!rawCount) countIssues.push("raw_export_not_found_or_empty");
  return {
    slug: "quantguide",
    name: "QuantGuide",
    type: "platform",
    sourceLanguage: "en",
    sourceTexPath: "",
    translationTexPath: "",
    sourceTexCount: rawCount,
    translationTexCount: 0,
    normalizedCount: normalized.length,
    countIssues
  };
}

function auditProblem(problem) {
  const titleEn = stringValue(problem.titleEn);
  const titleZh = stringValue(problem.titleZh);
  const promptEn = stringValue(problem.promptEn);
  const promptZh = stringValue(problem.promptZh);
  const answer = stringValue(problem.answer);
  const answerEn = stringValue(problem.answerEn);
  const answerZh = stringValue(problem.answerZh);
  const explanation = stringValue(problem.explanation);
  const explanationEn = stringValue(problem.explanationEn);
  const explanationZh = stringValue(problem.explanationZh);
  const promptCombined = [promptEn, promptZh].join("\n");
  const answerCombined = [answer, answerEn, answerZh, explanation, explanationEn, explanationZh].join("\n");
  const combined = [titleEn, titleZh, promptEn, promptZh, answer, answerEn, answerZh, explanation, explanationEn, explanationZh].join("\n");
  const imageCount = collectImages(problem).length;
  const issues = [];
  const manualContentReviewed = Boolean(problem.manualContentReviewed);

  addIf(issues, !titleEn, "error", "missing_title_en", "English title is empty.");
  addIf(issues, !titleZh, "error", "missing_title_zh", "Chinese title is empty.");
  addIf(issues, !promptEn, "error", "missing_prompt_en", "English prompt is empty.");
  addIf(issues, !promptZh, "error", "missing_prompt_zh", "Chinese prompt is empty.");
  addIf(issues, !validCategories.has(problem.category), "warning", "invalid_category", `Unexpected category: ${problem.category || ""}`);
  addIf(issues, !validDifficulties.has(problem.difficulty), "warning", "invalid_difficulty", `Unexpected difficulty: ${problem.difficulty || ""}`);
  addIf(issues, Boolean(promptEn && promptZh && compactText(promptEn) === compactText(promptZh)), "warning", "zh_prompt_same_as_en", "Chinese prompt is identical to English prompt.");
  addIf(issues, Boolean(titleEn && titleZh && compactText(titleEn) === compactText(titleZh)), "info", "zh_title_same_as_en", "Chinese title is identical to English title.");
  addIf(issues, Boolean(promptZh && !containsCjk(promptZh) && likelyEnglish(promptZh)), "warning", "zh_prompt_likely_english", "Chinese prompt appears to still be English.");
  addIf(issues, Boolean(explanationZh && !containsCjk(explanationZh) && likelyEnglish(explanationZh)), "warning", "zh_explanation_likely_english", "Chinese explanation appears to still be English.");
  addIf(issues, Boolean(promptEn && containsCjk(promptEn) && !isMostlyMath(promptEn)), "warning", "en_prompt_contains_chinese", "English prompt contains Chinese text.");
  addIf(issues, Boolean(explanationEn && containsCjk(explanationEn) && !isMostlyMath(explanationEn)), "warning", "en_explanation_contains_chinese", "English explanation contains Chinese text.");
  addIf(issues, Boolean(!manualContentReviewed && promptEn.length > 120 && promptZh.length > 0 && promptZh.length < promptEn.length * cjkLengthRatioFloor(promptZh, 0.2, 0.12)), "warning", "zh_prompt_maybe_truncated", "Chinese prompt is much shorter than English prompt.");
  addIf(issues, Boolean(!manualContentReviewed && explanationEn.length > 240 && explanationZh.length > 0 && explanationZh.length < explanationEn.length * cjkLengthRatioFloor(explanationZh, 0.12, 0.1)), "warning", "zh_explanation_maybe_truncated", "Chinese explanation is much shorter than English explanation.");
  addIf(issues, Boolean(!manualContentReviewed && explanationZh.length > 240 && explanationEn.length > 0 && explanationEn.length < explanationZh.length * 0.12), "warning", "en_explanation_maybe_truncated", "English explanation is much shorter than Chinese explanation.");
  addIf(issues, Boolean(/\\[一-龥]+|\\大|\\小|\\问题|\\章节|\\解答/.test(combined)), "error", "translated_latex_command", "Translated LaTeX command detected.");
  addIf(issues, Boolean(/textbackslash|textascii|�|□|€|™|fori=|lim,|1\.e,|lmin\b|tum to/i.test(combined)), "warning", "ocr_or_latex_noise", "OCR or LaTeX artifact detected.");
  addIf(issues, hasUnescapedDollarBeforeNumber(combined), "warning", "unescaped_dollar_before_number", "Unescaped dollar sign before a number.");
  addIf(issues, Boolean(/(?:暂无自动提取的解答|未在 PDF 答案区找到|no automatic|请对照原版|Instructor'?s Manual|later worked solution)/i.test(combined)), "info", "placeholder_or_missing_solution", "Solution appears to be a placeholder or intentionally missing.");
  const unreviewedFigureMention = (
    (mentionsReferencedFigure(promptCombined) && !imageMentionReviewed(problem, "prompt")) ||
    (mentionsFigure(answerCombined) && !imageMentionReviewed(problem, "solution"))
  );
  addIf(issues, Boolean(unreviewedFigureMention && imageCount === 0), "warning", "mentions_figure_without_image", "Text mentions a figure/diagram/picture but no image field is attached.");
  addIf(issues, Boolean(String(problem.source || "") === "quantguide" && !explanationZh), "warning", "quantguide_missing_explanation_zh", "QuantGuide has no Chinese explanation field.");
  addIf(issues, Boolean(String(problem.source || "") === "quantguide" && promptZh && compactText(promptZh) === compactText(promptEn)), "error", "quantguide_missing_prompt_zh", "QuantGuide Chinese prompt is not translated.");

  return {
    id: stringValue(problem.id),
    source: stringValue(problem.source),
    titleEn,
    titleZh,
    category: stringValue(problem.category),
    difficulty: stringValue(problem.difficulty),
    promptEnLength: promptEn.length,
    promptZhLength: promptZh.length,
    explanationEnLength: explanationEn.length,
    explanationZhLength: explanationZh.length,
    imageCount,
    issues
  };
}

function extractTexEntries(filePath) {
  const tex = fs.readFileSync(filePath, "utf8").replace(/\0/g, "");
  const bodyStart = tex.indexOf("\\begin{document}");
  const lines = tex.slice(bodyStart >= 0 ? bodyStart : 0).split(/\r?\n/);
  const entries = [];
  let subsection = "";
  for (let index = 0; index < lines.length; index += 1) {
    subsection = readHeading(lines[index], "subsection") || subsection;
    if (!/\\begin\{problembox\}/.test(lines[index])) continue;
    const prompt = collectEnvironment(lines, index, "problembox");
    entries.push({
      title: cleanInlineText(subsection),
      prompt: cleanTexBlock(prompt.content)
    });
    index = prompt.end;
  }
  return entries;
}

function collectEnvironment(lines, start, env) {
  const content = [];
  const startLine = lines[start].replace(new RegExp(`^.*?\\\\begin\\{${env}\\}`), "");
  if (startLine.trim()) content.push(startLine);
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].includes(`\\end{${env}}`)) {
      const beforeEnd = lines[index].split(`\\end{${env}}`)[0];
      if (beforeEnd.trim()) content.push(beforeEnd);
      return { content: content.join("\n"), end: index };
    }
    content.push(lines[index]);
  }
  return { content: content.join("\n"), end: lines.length - 1 };
}

function readHeading(line, name) {
  const match = String(line || "").match(new RegExp(`^\\\\${name}\\*?\\{([^}]*)\\}`));
  return match ? cleanInlineText(match[1]) : "";
}

function cleanInlineText(text) {
  return String(text || "")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\text(?:bf|sf|it|tt)\{([^{}]*)\}/g, "$1")
    .replace(/\\emph\{([^{}]*)\}/g, "$1")
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\_/g, "_")
    .replace(/[{}]/g, "")
    .replace(/~/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTexBlock(text) {
  return String(text || "")
    .replace(/^\s*%.*$/gm, "")
    .replace(/\\includegraphics(?:\[[^\]]*\])?\{[^{}]+\}/g, "")
    .replace(/\\begin\{(?:itemize|enumerate|center|figure|figure\*)\}(?:\[[^\]]*\])?/g, "")
    .replace(/\\end\{(?:itemize|enumerate|center|figure|figure\*)\}/g, "")
    .replace(/^\s*\\item\s*/gm, "- ")
    .replace(/\\text(?:bf|sf|it|tt)\{([^{}]*)\}/g, "**$1**")
    .replace(/\\emph\{([^{}]*)\}/g, "$1")
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\_/g, "_")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectImages(problem) {
  const urls = [];
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
    urls.push(String(value));
  };
  imageKeys.forEach((key) => pushValue(problem[key]));
  return [...new Set(urls)];
}

function buildSummary(sourceAudits, rows, issueRows) {
  const bySource = {};
  const byCode = {};
  const bySeverity = {};
  for (const row of rows) {
    bySource[row.source] ||= {
      problemCount: 0,
      issueCount: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      missingChinesePrompt: 0,
      mentionsFigureWithoutImage: 0,
      placeholderSolutions: 0
    };
    bySource[row.source].problemCount += 1;
    bySource[row.source].issueCount += row.issues.length;
    for (const issue of row.issues) {
      if (issue.severity === "error") bySource[row.source].errorCount += 1;
      if (issue.severity === "warning") bySource[row.source].warningCount += 1;
      if (issue.severity === "info") bySource[row.source].infoCount += 1;
      if (issue.code === "quantguide_missing_prompt_zh" || issue.code === "zh_prompt_same_as_en") bySource[row.source].missingChinesePrompt += 1;
      if (issue.code === "mentions_figure_without_image") bySource[row.source].mentionsFigureWithoutImage += 1;
      if (issue.code === "placeholder_or_missing_solution") bySource[row.source].placeholderSolutions += 1;
    }
  }
  for (const issue of issueRows) {
    byCode[issue.code] = (byCode[issue.code] || 0) + 1;
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    problemCount: rows.length,
    issueCount: issueRows.length,
    bySeverity,
    byCode,
    bySource,
    sourceAudits
  };
}

function writeMarkdown(filePath, summary, sourceAudits, issueRows) {
  const topCodes = Object.entries(summary.byCode)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const lines = [
    "# Question Bank Audit",
    "",
    `Generated at: ${summary.generatedAt}`,
    "",
    `Problems audited: ${summary.problemCount}`,
    `Issue flags: ${summary.issueCount}`,
    "",
    "## Source Counts",
    "",
    "| Source | Normalized | Source entries | Translation entries | Count issues |",
    "|---|---:|---:|---:|---|",
    ...sourceAudits.map((item) => `| ${item.slug} | ${item.normalizedCount} | ${item.sourceTexCount} | ${item.translationTexCount} | ${item.countIssues.join("; ")} |`),
    "",
    "## Issues By Source",
    "",
    "| Source | Problems | Errors | Warnings | Missing Chinese Prompt | Figure Text Without Image | Placeholder Solutions |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...Object.entries(summary.bySource).map(([source, item]) => `| ${source} | ${item.problemCount} | ${item.errorCount} | ${item.warningCount} | ${item.missingChinesePrompt} | ${item.mentionsFigureWithoutImage} | ${item.placeholderSolutions} |`),
    "",
    "## Top Issue Codes",
    "",
    "| Code | Count |",
    "|---|---:|",
    ...topCodes.map(([code, count]) => `| ${code} | ${count} |`),
    "",
    "## First 50 Issues",
    "",
    "| Severity | Code | Source | ID | Message |",
    "|---|---|---|---|---|",
    ...issueRows.slice(0, 50).map((issue) => `| ${issue.severity} | ${issue.code} | ${issue.source} | ${issue.id} | ${escapeMarkdownTable(issue.message)} |`)
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function listSourceProblemFiles() {
  if (!fs.existsSync(sourceRoot)) return [];
  return fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      slug: entry.name,
      file: path.join(sourceRoot, entry.name, "problems.json")
    }))
    .filter((item) => fs.existsSync(item.file));
}

function addIf(issues, condition, severity, code, message) {
  if (condition) issues.push({ severity, code, message });
}

function stringValue(value) {
  return String(value || "").trim();
}

function containsCjk(text) {
  return /[\u3400-\u9fff]/.test(String(text || ""));
}

function compactText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function likelyEnglish(text) {
  const value = String(text || "");
  const latin = (value.match(/[A-Za-z]{3,}/g) || []).join("").length;
  const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
  return latin > 30 && latin > cjk * 2;
}

function isMostlyMath(text) {
  const value = String(text || "");
  const special = (value.match(/[\\{}$^_=+\-*/()[\]\d\s.,;:]/g) || []).length;
  return value.length > 0 && special / value.length > 0.65;
}

function mentionsFigure(text) {
  return /\bfig(?:ure)?\.?\s*\d|\bdiagram\b|payoff diagram|shown in (?:the )?(?:figure|diagram|table)|as shown in (?:fig|figure|diagram|table)|see (?:fig|figure|diagram)|following diagram|above diagram|shown below|shown above|draw (?:a|the) (?:diagram|payoff)|下图|图中|如图|见图|图片|示意图/i.test(String(text || ""));
}

function mentionsReferencedFigure(text) {
  return /\bfig(?:ure)?\.?\s*\d|\btable\s*\d|shown in (?:the )?(?:figure|diagram|table)|as shown in (?:fig|figure|diagram|table)|see (?:fig|figure|diagram)|following diagram|above diagram|shown below|shown above|下图|图\s*\d|表\s*\d|图中|如图|见图|图片|示意图/i.test(String(text || ""));
}

function imageMentionReviewed(problem, role) {
  const review = problem?.figureReview || problem?.imageReview || {};
  const values = [
    role === "prompt" ? review.prompt : review.solution,
    role === "solution" ? review.answer : "",
    role === "prompt" ? review.promptImages : review.solutionImages,
    review[role],
    review.all,
    review.status
  ].flat().filter(Boolean).join(" ");
  return /source_checked_no_image|no_image_needed|false_positive|covered_by_prompt_image|textual_reference|text_only/i.test(values);
}

function hasUnescapedDollarBeforeNumber(text) {
  const withoutMath = String(text || "")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/(^|[^\\])\$[^$\n]*?\$/g, "$1 ");
  return /(^|[^\\])\$(?=\d)/.test(withoutMath);
}

function cjkLengthRatioFloor(text, latinFloor, cjkFloor) {
  const value = String(text || "");
  const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
  return value.length > 0 && cjk / value.length >= 0.35 ? cjkFloor : latinFloor;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(filePath, values) {
  fs.writeFileSync(filePath, `${values.map((value) => JSON.stringify(value)).join("\n")}${values.length ? "\n" : ""}`);
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvValue(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvValue(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeMarkdownTable(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function relativePath(filePath) {
  const rel = path.relative(projectRoot, filePath);
  return rel && !rel.startsWith("..") ? rel : filePath;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = args[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
