import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const outputDir = path.resolve(projectRoot, options.output || "artifacts/question-bank-quality-review");
const bookRoot = path.resolve(options.bookRoot || process.env.QUANTGYM_BOOK_ROOT || path.join(projectRoot, "量化书籍"));
const catalogPath = path.resolve(projectRoot, options.catalog || "data/problem-catalog.json");
const quantguideRawPath = path.resolve(projectRoot, options.quantguideRaw || "QuantGuide/data/quantguide_account_questions_full.json");

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
const placeholderPattern = /(?:暂无自动提取的解答|未在 PDF 答案区找到|no automatic|请对照原版|Instructor'?s Manual|later worked solution)/i;

const books = [
  { slug: "green-book", name: "绿皮书", path: "有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/quant_green_book.tex", translationPath: "有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/quant_green_book_zh.tex", sourceLanguage: "en", defaultCategory: "probabilityExpectation" },
  { slug: "yellow-book", name: "黄皮书", path: "有题目的/黄皮书 150 Most Frequently Asked Questions on Quant Interviews/quant_yellow_book.tex", translationPath: "有题目的/黄皮书 150 Most Frequently Asked Questions on Quant Interviews/quant_yellow_book_zh.tex", sourceLanguage: "en", defaultCategory: "probabilityExpectation" },
  { slug: "red-book", name: "红宝书", path: "有题目的/红宝书 Quant Job Interview Questions And Answers/quant_red_book.tex", translationPath: "有题目的/红宝书 Quant Job Interview Questions And Answers/quant_red_book_zh.tex", sourceLanguage: "en", defaultCategory: "option" },
  { slug: "hull-derivatives", name: "Hull", path: "纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/quant_hull_book.tex", translationPath: "纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/quant_hull_book_zh.tex", sourceLanguage: "en", defaultCategory: "option", pdfHydrated: true, externalSolutionHydrated: true },
  { slug: "stefanica-fe-math", name: "Stefanica", path: "纯textbook/Stefanica金融工程数学入门 A Primer for the Mathematics of Financial Engineering/quant_stefanica_book.tex", translationPath: "纯textbook/Stefanica金融工程数学入门 A Primer for the Mathematics of Financial Engineering/quant_stefanica_book_zh.tex", sourceLanguage: "en", defaultCategory: "option" },
  { slug: "quantitative-primer", name: "Quantitative Primer", path: "有题目的/Quantitative Primer/quant_qprimer_book.tex", translationPath: "有题目的/Quantitative Primer/quant_qprimer_book_zh.tex", sourceLanguage: "en", defaultCategory: "probabilityExpectation" },
  { slug: "dudeney-puzzles", name: "Dudeney", path: "有题目的/Dudeney挑战谜题 Challenging Puzzles/quant_dudeney_book.tex", translationPath: "有题目的/Dudeney挑战谜题 Challenging Puzzles/quant_dudeney_book_zh.tex", sourceLanguage: "en", defaultCategory: "probabilityExpectation" },
  { slug: "linalg-primer", name: "Linear Algebra Primer", path: "纯textbook/金融工程线性代数入门 A Linear Algebra Primer for Financial Engineering/quant_linalg_book.tex", translationPath: "纯textbook/金融工程线性代数入门 A Linear Algebra Primer for Financial Engineering/quant_linalg_book_zh.tex", sourceLanguage: "en", defaultCategory: "statistics", solutionPlaceholdersExpected: true },
  { slug: "probability-stochastic-10", name: "Probability Stochastic 10", path: "有题目的/概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs/quant_prob10_book.tex", translationPath: "有题目的/概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs/quant_prob10_book_zh.tex", sourceLanguage: "en", defaultCategory: "probabilityExpectation" }
];

const bookBySlug = new Map(books.map((book) => [book.slug, book]));
const catalogPayload = readJson(catalogPath, { problems: [] });
const problems = Array.isArray(catalogPayload) ? catalogPayload : catalogPayload.problems || [];
const quantguideRaw = loadQuantGuideRaw(quantguideRawPath);

const parsedBookSources = new Map();
for (const book of books) {
  parsedBookSources.set(book.slug, {
    sourcePath: path.join(bookRoot, book.path),
    translationPath: path.join(bookRoot, book.translationPath),
    sourceEntries: readTexEntries(path.join(bookRoot, book.path)),
    translationEntries: readTexEntries(path.join(bookRoot, book.translationPath))
  });
}

const latexTranslationRows = [];
const missingAnswerImageRows = [];
const classificationRows = [];
const manualQueueRows = [];
const perProblemRows = [];

for (const problem of problems) {
  const review = reviewProblem(problem);
  perProblemRows.push({
    source: review.source,
    id: review.id,
    titleEn: review.titleEn,
    titleZh: review.titleZh,
    category: review.category,
    difficulty: review.difficulty,
    latexTranslationIssueCount: review.latexTranslationIssues.length,
    missingAnswerImageIssueCount: review.missingAnswerImageIssues.length,
    classificationDifficultyIssueCount: review.classificationDifficultyIssues.length,
    priority: review.priority,
    issueCodes: review.issueCodes.join("|")
  });
  pushRows(latexTranslationRows, review.latexTranslationIssues);
  pushRows(missingAnswerImageRows, review.missingAnswerImageIssues);
  pushRows(classificationRows, review.classificationDifficultyIssues);
  for (const issue of [
    ...review.latexTranslationIssues,
    ...review.missingAnswerImageIssues,
    ...review.classificationDifficultyIssues
  ]) {
    manualQueueRows.push({
      priority: priorityScore(issue.severity, issue.dimension, issue.code),
      dimension: issue.dimension,
      severity: issue.severity,
      code: issue.code,
      source: issue.source,
      id: issue.id,
      titleZh: issue.titleZh,
      titleEn: issue.titleEn,
      message: issue.message,
      suggestedCategory: issue.suggestedCategory || "",
      suggestedDifficulty: issue.suggestedDifficulty || "",
      snippet: issue.snippet || ""
    });
  }
}

manualQueueRows.sort((a, b) => b.priority - a.priority || a.source.localeCompare(b.source) || a.id.localeCompare(b.id));

const summary = buildSummary();
fs.mkdirSync(outputDir, { recursive: true });
writeJson(path.join(outputDir, "summary.json"), summary);
writeCsv(path.join(outputDir, "per-problem-review.csv"), perProblemRows);
writeCsv(path.join(outputDir, "latex-translation-review.csv"), latexTranslationRows);
writeCsv(path.join(outputDir, "missing-answer-images.csv"), missingAnswerImageRows);
writeCsv(path.join(outputDir, "classification-difficulty-review.csv"), classificationRows);
writeCsv(path.join(outputDir, "manual-review-queue.csv"), manualQueueRows);
writeMarkdown(path.join(outputDir, "README.md"), summary);

console.log(JSON.stringify({
  problems: problems.length,
  latexTranslationIssues: latexTranslationRows.length,
  missingAnswerImageIssues: missingAnswerImageRows.length,
  classificationDifficultyIssues: classificationRows.length,
  manualReviewItems: manualQueueRows.length,
  output: relativePath(outputDir)
}, null, 2));

function reviewProblem(problem) {
  const source = stringValue(problem.source);
  const id = stringValue(problem.id);
  const titleEn = stringValue(problem.titleEn);
  const titleZh = stringValue(problem.titleZh);
  const category = stringValue(problem.category);
  const difficulty = stringValue(problem.difficulty);
  const promptEn = stringValue(problem.promptEn);
  const promptZh = stringValue(problem.promptZh);
  const explanationEn = stringValue(problem.explanationEn || problem.explanation);
  const explanationZh = stringValue(problem.explanationZh);
  const answerText = [
    problem.answer,
    problem.answerEn,
    problem.answerZh,
    problem.explanation,
    problem.explanationEn,
    problem.explanationZh
  ].map(stringValue).filter(Boolean).join("\n\n");
  const promptText = [promptEn, promptZh].filter(Boolean).join("\n\n");
  const allText = [titleEn, titleZh, promptText, answerText].filter(Boolean).join("\n\n");
  const book = bookBySlug.get(source);
  const bookSource = parsedBookSources.get(source);
  const bookIndex = book ? problemIndexFromId(id) : -1;
  const sourceEntry = bookSource && bookIndex >= 0 ? bookSource.sourceEntries[bookIndex] : null;
  const translationEntry = bookSource && bookIndex >= 0 ? bookSource.translationEntries[bookIndex] : null;
  const rawQuantGuide = source === "quantguide" ? quantguideRaw.get(id.replace(/^quantguide-/, "")) : null;
  const manualContentReviewed = Boolean(problem.manualContentReviewed);

  const context = {
    problem,
    source,
    id,
    titleEn,
    titleZh,
    category,
    difficulty,
    promptEn,
    promptZh,
    explanationEn,
    explanationZh,
    answerText,
    promptText,
    allText,
    book,
    bookSource,
    bookIndex,
    sourceEntry,
    translationEntry,
    rawQuantGuide,
    manualContentReviewed
  };

  const latexTranslationIssues = reviewLatexAndTranslation(context);
  const missingAnswerImageIssues = reviewImages(context);
  const classificationDifficultyIssues = reviewClassificationAndDifficulty(context);
  const issueCodes = [
    ...latexTranslationIssues,
    ...missingAnswerImageIssues,
    ...classificationDifficultyIssues
  ].map((issue) => issue.code);

  return {
    source,
    id,
    titleEn,
    titleZh,
    category,
    difficulty,
    latexTranslationIssues,
    missingAnswerImageIssues,
    classificationDifficultyIssues,
    issueCodes,
    priority: Math.max(0, ...[
      ...latexTranslationIssues,
      ...missingAnswerImageIssues,
      ...classificationDifficultyIssues
    ].map((issue) => priorityScore(issue.severity, issue.dimension, issue.code)))
  };
}

function reviewLatexAndTranslation(context) {
  const issues = [];
  const add = makeIssuePusher(issues, context, "latex_translation");

  if (context.book) {
    if (!context.bookSource || !fs.existsSync(context.bookSource.sourcePath)) {
      add("error", "missing_source_tex", "Original LaTeX source file is missing.");
    }
    if (!context.bookSource || !fs.existsSync(context.bookSource.translationPath)) {
      add("error", "missing_translation_tex", "Translated LaTeX source file is missing.");
    }
    if (!context.sourceEntry) {
      add("error", "missing_source_entry", "No source LaTeX problem entry matched this catalog problem index.");
    }
    if (!context.translationEntry) {
      add("error", "missing_translation_entry", "No translated LaTeX problem entry matched this catalog problem index.");
    }
    if (context.sourceEntry && !context.manualContentReviewed) {
      compareField(add, "source_prompt_alignment_low", "Source prompt in catalog does not closely match cleaned source LaTeX.", context.promptEn, context.sourceEntry.prompt, {
        severity: context.book.pdfHydrated ? "info" : "warning",
        minSimilarity: context.book.pdfHydrated ? 0.55 : 0.9,
        snippetField: "prompt"
      });
      if (context.sourceEntry.solution && !placeholderPattern.test(context.answerText) && !context.book.externalSolutionHydrated) {
        compareField(add, "source_solution_alignment_low", "Source solution in catalog does not closely match cleaned source LaTeX solution.", context.explanationEn, context.sourceEntry.solution, {
          severity: "warning",
          minSimilarity: 0.88,
          snippetField: "solution"
        });
      }
    }
    if (context.translationEntry && !context.manualContentReviewed) {
      compareField(add, "translation_prompt_alignment_low", "Chinese prompt in catalog does not closely match cleaned translated LaTeX.", context.promptZh, context.translationEntry.prompt, {
        severity: "warning",
        minSimilarity: 0.9,
        snippetField: "prompt"
      });
      if (context.translationEntry.solution && !placeholderPattern.test(context.answerText) && !context.book.externalSolutionHydrated) {
        compareField(add, "translation_solution_alignment_low", "Chinese solution in catalog does not closely match cleaned translated LaTeX solution.", context.explanationZh, context.translationEntry.solution, {
          severity: "warning",
          minSimilarity: 0.88,
          snippetField: "solution"
        });
      }
    }
  }

  addIf(add, !context.promptEn, "error", "missing_prompt_en", "English prompt is empty.");
  addIf(add, !context.promptZh, "error", "missing_prompt_zh", "Chinese prompt is empty.");
  addIf(add, Boolean(context.promptEn && context.promptZh && compactText(context.promptEn) === compactText(context.promptZh)), "warning", "zh_prompt_same_as_en", "Chinese prompt is identical to English prompt.", snippet(context.promptZh));
  addIf(add, Boolean(context.titleEn && context.titleZh && compactText(context.titleEn) === compactText(context.titleZh) && !properNounTitle(context.titleZh)), "info", "zh_title_same_as_en", "Chinese title is identical to English title.", context.titleZh);
  addIf(add, Boolean(context.promptZh && !containsCjk(context.promptZh) && likelyEnglish(context.promptZh)), "warning", "zh_prompt_likely_english", "Chinese prompt appears to still be English.", snippet(context.promptZh));
  addIf(add, Boolean(context.explanationZh && !containsCjk(context.explanationZh) && likelyEnglish(context.explanationZh)), "warning", "zh_explanation_likely_english", "Chinese explanation appears to still be English.", snippet(context.explanationZh));
  addIf(add, Boolean(context.promptEn && containsCjk(context.promptEn) && !isMostlyMath(context.promptEn)), "warning", "en_prompt_contains_chinese", "English prompt contains Chinese text.", snippet(context.promptEn));
  addIf(add, Boolean(context.explanationEn && containsCjk(context.explanationEn) && !isMostlyMath(context.explanationEn)), "warning", "en_explanation_contains_chinese", "English explanation contains Chinese text.", snippet(context.explanationEn));
  addIf(add, Boolean(!context.manualContentReviewed && context.promptEn.length > 120 && context.promptZh.length > 0 && context.promptZh.length < context.promptEn.length * cjkLengthRatioFloor(context.promptZh, 0.22, 0.12)), "warning", "zh_prompt_maybe_truncated", "Chinese prompt is much shorter than English prompt.", lengthSnippet(context.promptEn, context.promptZh));
  addIf(add, Boolean(!context.manualContentReviewed && context.explanationEn.length > 240 && context.explanationZh.length > 0 && context.explanationZh.length < context.explanationEn.length * cjkLengthRatioFloor(context.explanationZh, 0.16, 0.1)), "warning", "zh_explanation_maybe_truncated", "Chinese explanation is much shorter than English explanation.", lengthSnippet(context.explanationEn, context.explanationZh));
  addIf(add, Boolean(/\\[一-龥]+|\\大|\\小|\\问题|\\章节|\\解答/.test(context.allText)), "error", "translated_latex_command", "A LaTeX command appears to have been translated.", snippet(context.allText));
  addIf(add, Boolean(/textbackslash|textascii|�|□|€|™|fori=|lim,|1\.e,|lmin\b|tum to/i.test(context.allText)), "warning", "ocr_or_latex_noise", "OCR or LaTeX artifact detected.", snippet(context.allText));
  addIf(add, hasUnescapedDollarBeforeNumber(context.allText), "warning", "unescaped_dollar_before_number", "Unescaped dollar sign before a number may break math rendering.", snippet(context.allText));
  if (context.source === "quantguide" && !context.explanationZh) {
    add("warning", "quantguide_missing_explanation_zh", "QuantGuide has no Chinese explanation field.");
  }
  return issues;
}

function reviewImages(context) {
  const issues = [];
  const add = makeIssuePusher(issues, context, "answer_images");
  const promptImages = collectImagesByRole(context.problem, "prompt");
  const solutionImages = collectImagesByRole(context.problem, "solution");
  const promptImageMentionReviewed = imageMentionReviewed(context.problem, "prompt");
  const solutionImageMentionReviewed = imageMentionReviewed(context.problem, "solution");
  const sourcePromptGraphics = [
    ...(context.sourceEntry?.promptGraphics || []),
    ...(context.translationEntry?.promptGraphics || [])
  ];
  const sourceSolutionGraphics = [
    ...(context.sourceEntry?.solutionGraphics || []),
    ...(context.translationEntry?.solutionGraphics || [])
  ];
  const rawQuantGuideText = context.rawQuantGuide
    ? [context.rawQuantGuide.prompt, context.rawQuantGuide.solution, context.rawQuantGuide.hint, JSON.stringify(context.rawQuantGuide.raw_detail || {})].join("\n")
    : "";
  const rawPromptHasImage = Boolean(context.rawQuantGuide && hasEmbeddedImage(context.rawQuantGuide.prompt));
  const rawSolutionHasImage = Boolean(context.rawQuantGuide && hasEmbeddedImage([context.rawQuantGuide.solution, context.rawQuantGuide.hint, JSON.stringify(context.rawQuantGuide.raw_detail || {})].join("\n")));

  if (sourceSolutionGraphics.length && !solutionImages.length) {
    add("error", "solution_includegraphics_not_attached", "The solution LaTeX includes graphics, but no solution image is attached to the problem.", sourceSolutionGraphics.join("|"));
  }
  if (sourcePromptGraphics.length && !promptImages.length) {
    add("warning", "prompt_includegraphics_not_attached", "The prompt LaTeX includes graphics, but no prompt image is attached to the problem.", sourcePromptGraphics.join("|"));
  }
  if (rawSolutionHasImage && !solutionImages.length) {
    add("error", "quantguide_solution_image_not_attached", "QuantGuide solution/raw detail appears to contain an image, but no solution image is attached.", snippet(rawQuantGuideText));
  }
  if (rawPromptHasImage && !promptImages.length) {
    add("warning", "quantguide_prompt_image_not_attached", "QuantGuide prompt appears to contain an image, but no prompt image is attached.", snippet(context.rawQuantGuide.prompt));
  }
  if (mentionsFigure(context.answerText) && !solutionImages.length && !solutionImageMentionReviewed) {
    add("warning", "answer_mentions_figure_without_image", "Answer/explanation mentions a figure, diagram, or picture, but no answer/solution image is attached.", snippet(context.answerText));
  }
  if (mentionsReferencedFigure(context.promptText) && !promptImages.length && !promptImageMentionReviewed) {
    add("warning", "prompt_mentions_figure_without_image", "Prompt mentions a figure, diagram, or picture, but no prompt image is attached.", snippet(context.promptText));
  }
  return issues;
}

function reviewClassificationAndDifficulty(context) {
  const issues = [];
  const add = makeIssuePusher(issues, context, "classification_difficulty");
  const classificationReviewed = Boolean(context.problem.classificationReviewed);
  const categorySuggestion = suggestCategory(context);
  const difficultySuggestion = suggestDifficulty(context);

  addIf(add, !validCategories.has(context.category), "error", "missing_or_invalid_category", `Category is missing or invalid: ${context.category}`);
  addIf(add, !validDifficulties.has(context.difficulty), "error", "missing_or_invalid_difficulty", `Difficulty is missing or invalid: ${context.difficulty}`);

  if (!classificationReviewed && validCategories.has(context.category) && categorySuggestion.category && categorySuggestion.category !== context.category && categorySuggestion.confidence >= 3) {
    add("warning", "category_needs_review", `Current category is ${context.category}; heuristic suggestion is ${categorySuggestion.category}. Reason: ${categorySuggestion.reason}`, "", {
      suggestedCategory: categorySuggestion.category,
      confidence: categorySuggestion.confidence
    });
  }
  if (!classificationReviewed && validDifficulties.has(context.difficulty) && difficultySuggestion.difficulty && difficultySuggestion.difficulty !== context.difficulty && difficultySuggestion.confidence >= 3) {
    add("info", "difficulty_needs_review", `Current difficulty is ${context.difficulty}; heuristic suggestion is ${difficultySuggestion.difficulty}. Reason: ${difficultySuggestion.reason}`, "", {
      suggestedDifficulty: difficultySuggestion.difficulty,
      confidence: difficultySuggestion.confidence
    });
  }
  if (!classificationReviewed && context.book && context.category === context.book.defaultCategory && categorySuggestion.confidence < 2) {
    add("info", "category_may_be_source_default", "Category appears to come only from the book default; manual topic review is recommended.");
  }
  if (!classificationReviewed && context.book && context.difficulty === "Medium" && difficultySuggestion.confidence < 2) {
    add("info", "difficulty_may_be_default_medium", "Difficulty appears to be default Medium with weak evidence; manual difficulty review is recommended.");
  }
  return issues;
}

function compareField(add, code, message, current, expected, optionsForCompare = {}) {
  const currentValue = stringValue(current);
  const expectedValue = stringValue(expected);
  if (!expectedValue) return;
  if (!currentValue) {
    add("error", code.replace(/_alignment_low$/, "_missing"), `${message} Catalog field is empty while source field exists.`, snippet(expectedValue));
    return;
  }
  const similarity = textSimilarity(currentValue, expectedValue);
  const ratio = lengthRatio(currentValue, expectedValue);
  const minSimilarity = optionsForCompare.minSimilarity ?? 0.9;
  const extremeRatio = ratio < 0.45 || ratio > 2.25;
  if (similarity < minSimilarity || extremeRatio) {
    const severity = similarity < 0.65 || extremeRatio ? "error" : (optionsForCompare.severity || "warning");
    add(severity, code, `${message} similarity=${similarity.toFixed(3)}, lengthRatio=${ratio.toFixed(3)}.`, snippetPair(currentValue, expectedValue));
  }
}

function suggestCategory(context) {
  if (context.rawQuantGuide?.topic) {
    const rawTopic = String(context.rawQuantGuide.topic || "").toLowerCase();
    if (rawTopic === "statistics") return { category: "statistics", confidence: 5, reason: "QuantGuide raw topic is statistics" };
    if (rawTopic === "finance") {
      const finance = scoreCategory(context.allText);
      if (finance.category === "market" || finance.category === "option") return { ...finance, confidence: Math.max(finance.confidence, 4), reason: `QuantGuide raw topic is finance; ${finance.reason}` };
      if (context.category === "market" || context.category === "option") {
        return { category: context.category, confidence: 2, reason: "QuantGuide raw topic is finance; existing finance category retained" };
      }
      return { category: "option", confidence: 3, reason: "QuantGuide raw topic is finance" };
    }
  }
  const promptCategory = scoreCategory([context.titleEn, context.titleZh, context.promptText].filter(Boolean).join("\n\n"));
  const answerCategory = scoreCategory(context.allText);
  const mathOnlyCategories = new Set(["calculus", "algebra", "linearAlgebra", "optimization", "complexNumbers"]);
  const broadQuantGuideCategory = context.source === "quantguide" && ["probabilityExpectation", "statistics"].includes(context.category);

  if (broadQuantGuideCategory && mathOnlyCategories.has(promptCategory.category)) {
    return { category: context.category, confidence: 1, reason: "QuantGuide broad category retained; math signal may describe the solution method" };
  }
  if (promptCategory.confidence >= 3) return promptCategory;
  if (answerCategory.category === context.category) return answerCategory;
  if (mathOnlyCategories.has(answerCategory.category)) {
    return { category: context.category || answerCategory.category, confidence: 1, reason: "answer-only math signal is too weak for recategorization" };
  }
  return answerCategory;
}

function scoreCategory(text) {
  const value = String(text || "");
  const rules = [
    ["deepLearning", 5, /\bneural\b|deep learning|\btransformer\b|\bcnn\b|\brnn\b|backprop|神经网络|深度学习/i, "deep learning terms"],
    ["machineLearning", 5, /machine learning|xgboost|random forest|feature engineering|classification|cross.?validation|机器学习|特征工程/i, "machine learning terms"],
    ["pandasNumpy", 5, /pandas|numpy|dataframe|sql|database|数据清洗/i, "data tooling terms"],
    ["cppProgramming", 5, /c\+\+|\bcpp\b|virtual function|abstract class|polymorphism|strcmp|destructor|\bconst\s+(?:keyword|member|method|pointer|reference)\b|\bstatic\s+(?:keyword|member|function|variable)\b|虚函数|抽象类|多态|C\+\+|C\+\+.*(?:指针|引用|静态|常量)/i, "C++ programming terms"],
    ["leetcode", 4, /algorithm|data structure|linked list|binary tree|graph search|merge sort|leetcode|c\+\+|python list|runtime|算法|数据结构|复杂度/i, "coding/algorithm terms"],
    ["option", 5, /black.?scholes|call option|put option|binary option|straddle|strangle|butterfly|delta|gamma|vega|theta|implied volatility|strike|payoff|option pricing|期权|波动率|行权|对冲/i, "option/derivatives terms"],
    ["market", 4, /market making|order book|bid.?ask|trading|arbitrage|portfolio|hedg(?:e|ing)|risk.?free portfolio|sharpe|asset allocation|做市|交易|套利|投资组合|风险/i, "market/trading terms"],
    ["complexNumbers", 5, /complex numbers?|complex analysis|imaginary|euler'?s formula|principal logarithm|\bi\^i\b|复数|虚数|欧拉公式|主值对数/i, "complex-number terms"],
    ["linearAlgebra", 5, /linear algebra|matrix|matrices|determinant|eigen(?:value|vector)?|cholesky|positive semi.?definite|positive definite|vector space|线性代数|矩阵|行列式|特征值|特征向量|正半定|正定/i, "linear algebra terms"],
    ["optimization", 5, /optimization|linear programming|linear program|quadratic programming|quadratic program|min.?cost flow|max flow|network flow|dual variable|convex optimization|最优化|优化|线性规划|二次规划|网络流|最小费用流|最大流|对偶变量|凸优化/i, "optimization terms"],
    ["calculus", 5, /calculus|analysis|integral|integration|derivative|limits?|\bl'?hospital\b|ordinary differential equation|differential equation|\bode\b|steinmetz|微积分|分析|积分|导数|极限|洛必达|微分方程|常微分/i, "calculus/analysis terms"],
    ["algebra", 4, /algebra|inequalit(?:y|ies)|bernoulli inequality|polynomial|binomial|induction|代数|不等式|伯努利不等式|多项式|二项式|归纳法/i, "algebra/inequality terms"],
    ["statistics", 4, /regression|ols|p-value|hypothesis|estimator|confidence interval|correlation|covariance|统计|回归|估计|协方差|相关/i, "statistics terms"],
    ["mentalMath", 4, /mental math|arithmetic|percent|速算|口算/i, "mental math terms"],
    ["probabilityExpectation", 3, /dice|coin|urn|card|probability|expectation|normal distribution|uniform|brownian|martingale|poisson|markov|random walk|概率|期望|硬币|骰子|正态|均匀|布朗|鞅|泊松|随机/i, "probability/stochastic terms"]
  ];
  const hits = [];
  for (const [category, weight, regex, reason] of rules) {
    if (regex.test(value)) hits.push({ category, weight, reason });
  }
  hits.sort((a, b) => b.weight - a.weight);
  if (!hits.length) return { category: "probabilityExpectation", confidence: 1, reason: "fallback" };
  return { category: hits[0].category, confidence: hits[0].weight, reason: hits[0].reason };
}

function suggestDifficulty(context) {
  if (context.rawQuantGuide?.difficulty) {
    const raw = String(context.rawQuantGuide.difficulty || "").toLowerCase();
    const mapped = raw === "easy" ? "Easy" : raw === "hard" ? "Hard" : raw === "medium" ? "Medium" : "";
    if (mapped) return { difficulty: mapped, confidence: 5, reason: "QuantGuide raw difficulty" };
  }
  const text = context.allText.toLowerCase();
  let score = 0;
  const reasons = [];
  if (/prove|derive|show that|stochastic differential|sde|black.?scholes|martingale|brownian|eigen|cholesky|optimization|证明|推导|鞅|布朗|随机微分|特征值|最优化/.test(text)) {
    score += 3;
    reasons.push("proof/derivation/stochastic/linear-algebra terms");
  }
  if (/basic|easy|warm.?up|intro|入门|基础|简单/.test(text)) {
    score -= 2;
    reasons.push("basic/easy wording");
  }
  if (context.answerText.length > 1600 || context.promptText.length > 1400) {
    score += 2;
    reasons.push("long prompt or solution");
  }
  if (context.answerText.length < 220 && context.promptText.length < 420 && /\bfind\b|求|多少/.test(text)) {
    score -= 1;
    reasons.push("short direct computation");
  }
  if (score >= 3) return { difficulty: "Hard", confidence: Math.min(5, score), reason: reasons.join("; ") || "high complexity" };
  if (score <= -2) return { difficulty: "Easy", confidence: Math.min(5, Math.abs(score)), reason: reasons.join("; ") || "low complexity" };
  return { difficulty: "Medium", confidence: Math.max(1, Math.abs(score)), reason: reasons.join("; ") || "default medium" };
}

function readTexEntries(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const tex = fs.readFileSync(filePath, "utf8").replace(/\0/g, "");
  const bodyStart = tex.indexOf("\\begin{document}");
  const lines = tex.slice(bodyStart >= 0 ? bodyStart : 0).split(/\r?\n/);
  const entries = [];
  let chapter = "";
  let section = "";
  let subsection = "";

  for (let index = 0; index < lines.length; index += 1) {
    chapter = readHeading(lines[index], "chapter") || chapter;
    section = readHeading(lines[index], "section") || section;
    subsection = readHeading(lines[index], "subsection") || subsection;
    if (!/\\begin\{problembox\}/.test(lines[index])) continue;
    const prompt = collectEnvironment(lines, index, "problembox");
    const solutionStart = findLine(lines, prompt.end + 1, (line) => /\\solution\b/.test(line));
    const solutionEnd = findLine(lines, Math.max(prompt.end + 1, solutionStart + 1), (line) => (
      /\\(?:chapter|section|subsection)\*?\{/.test(line) || /\\begin\{problembox\}/.test(line) || /^\s*CHAPTER\s+\d+\b/.test(line) || /^\s*第\s*\d+\s*章\b/.test(line)
    ));
    const rawSolution = solutionStart >= 0
      ? lines.slice(solutionStart + 1, solutionEnd >= 0 ? solutionEnd : lines.length).join("\n")
      : "";
    entries.push({
      chapter: cleanInlineText(chapter),
      section: cleanInlineText(section),
      title: cleanInlineText(subsection),
      rawPrompt: prompt.content,
      rawSolution,
      prompt: cleanPromptBlock(cleanTexBlock(prompt.content)),
      solution: cleanTexBlock(rawSolution),
      promptGraphics: collectTexGraphics(prompt.content),
      solutionGraphics: collectTexGraphics(rawSolution)
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

function collectTexGraphics(text) {
  const graphics = [];
  const regex = /\\includegraphics(?:\[[^\]]*\])?\{([^{}]+)\}/g;
  for (const match of String(text || "").matchAll(regex)) graphics.push(match[1]);
  return graphics;
}

function cleanTexBlock(text) {
  return String(text || "")
    .replace(/^\s*%.*$/gm, "")
    .replace(/\\solution\b/g, "")
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
    .replace(/\bCHAPTER\s+\d+\.\s+(?:QUESTIONS|SOLUTIONS)\b/gi, " ")
    .replace(/\b[23]\.\d+\.\s+[A-Z][A-Z.,\s-]+(?=\s|$)/g, " ")
    .replace(/([A-Za-z])-\s+([a-z])/g, "$1$2")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanPromptBlock(text) {
  return String(text || "")
    .replace(/\s+\d\.\d\.\s+(?:QUESTIONS|问题)\b[\s\S]*$/i, "")
    .replace(/\s+\d\.\d\.\d\.\s+(?:[A-Z][A-Za-z /+-]+|[\u3400-\u9fff]+)[。.]?[\s\S]*$/g, "")
    .replace(/\s+\d\.\d\.\s*(?:SOLUTIONS|解决方案|解答|解)\b[\s\S]*$/i, "")
    .replace(/\s+(?:QUESTION|Question|QuEsTION|QuESTION|QuesTION|QuEsTIOoN|QugEstTIon|问题)\s+\d+\.\d+[\s\S]*$/g, "")
    .replace(/\s+第\s*\d+\s*章[\s\S]*$/g, "")
    .trim();
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

function loadQuantGuideRaw(filePath) {
  const bySlug = new Map();
  if (!fs.existsSync(filePath)) return bySlug;
  const payload = readJson(filePath, {});
  const records = Array.isArray(payload) ? payload : payload.records || [];
  for (const record of records) {
    const slug = String(record.slug || "").trim();
    if (slug) bySlug.set(slug, record);
  }
  return bySlug;
}

function makeIssuePusher(rows, context, dimension) {
  return (severity, code, message, rowSnippet = "", extra = {}) => {
    rows.push({
      dimension,
      severity,
      code,
      source: context.source,
      id: context.id,
      bookIndex: context.bookIndex >= 0 ? context.bookIndex + 1 : "",
      titleEn: context.titleEn,
      titleZh: context.titleZh,
      category: context.category,
      difficulty: context.difficulty,
      suggestedCategory: extra.suggestedCategory || "",
      suggestedDifficulty: extra.suggestedDifficulty || "",
      confidence: extra.confidence || "",
      message,
      snippet: rowSnippet || "",
      sourceTexPath: context.bookSource ? relativePath(context.bookSource.sourcePath) : "",
      translationTexPath: context.bookSource ? relativePath(context.bookSource.translationPath) : "",
      sourceUrl: context.problem.sourceUrl || ""
    });
  };
}

function addIf(add, condition, severity, code, message, rowSnippet = "", extra = {}) {
  if (condition) add(severity, code, message, rowSnippet, extra);
}

function collectImagesByRole(problem, role) {
  const keys = role === "prompt"
    ? ["image", "imageUrl", "imageUrls", "images", "diagram", "diagramUrl", "promptImage", "promptImages"]
    : ["answerImage", "answerImages", "explanationImage", "explanationImages", "solutionImage", "solutionImages"];
  const urls = [];
  const pushValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    if (typeof value === "object") {
      pushValue(value.url || value.src || value.href || value.dataUrl || value.path);
      return;
    }
    urls.push(String(value));
  };
  keys.forEach((key) => pushValue(problem[key]));
  return [...new Set(urls)];
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

function hasEmbeddedImage(text) {
  return /<img\b|!\[[^\]]*\]\([^)]*\)|\.(?:png|jpe?g|gif|webp|svg)\b|image_url|imageUrl/i.test(String(text || ""));
}

function mentionsFigure(text) {
  return /\bfig(?:ure)?\.?\s*\d|\bdiagram\b|payoff diagram|shown in (?:the )?(?:figure|diagram|table)|as shown in (?:fig|figure|diagram|table)|see (?:fig|figure|diagram)|following diagram|above diagram|shown below|shown above|draw (?:a|the) (?:diagram|payoff)|下图|图中|如图|见图|图片|示意图/i.test(String(text || ""));
}

function mentionsReferencedFigure(text) {
  return /\bfig(?:ure)?\.?\s*\d|\btable\s*\d|shown in (?:the )?(?:figure|diagram|table)|as shown in (?:fig|figure|diagram|table)|see (?:fig|figure|diagram)|following diagram|above diagram|shown below|shown above|下图|图\s*\d|表\s*\d|图中|如图|见图|图片|示意图/i.test(String(text || ""));
}

function textSimilarity(a, b) {
  const left = normalizeCompareText(a);
  const right = normalizeCompareText(b);
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1;
  return (2 * intersection) / (leftTokens.size + rightTokens.size);
}

function tokenSet(text) {
  const words = text.match(/[a-z0-9]+|[\u3400-\u9fff]/g) || [];
  if (words.length >= 12) return new Set(words);
  const compact = text.replace(/\s+/g, "");
  const grams = [];
  for (let index = 0; index < compact.length - 1; index += 1) grams.push(compact.slice(index, index + 2));
  return new Set(grams.length ? grams : [compact]);
}

function normalizeCompareText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/^(?:practice|question|问题)\s*\d+(?:\.\d+)?\.?\s*/i, "")
    .replace(/\bchapter\s+\d+\.\s+(?:questions|solutions)\b/gi, " ")
    .replace(/\b[23]\.\d+\.\s+[a-z][a-z.,\s-]+(?=\s|$)/gi, " ")
    .replace(/([a-z])-\s+([a-z])/g, "$1$2")
    .replace(/€/g, " in ")
    .replace(/™/g, " ")
    .replace(/«\*/g, "x x")
    .replace(/\\[a-z]+/g, " ")
    .replace(/[{}$\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lengthRatio(a, b) {
  const left = normalizeCompareText(a).length;
  const right = normalizeCompareText(b).length;
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  return left / right;
}

function buildSummary() {
  const bySource = {};
  const byDimension = {
    latex_translation: { issueCount: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
    answer_images: { issueCount: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
    classification_difficulty: { issueCount: 0, errorCount: 0, warningCount: 0, infoCount: 0 }
  };
  const byCode = {};
  const bySeverity = {};
  const allIssues = [...latexTranslationRows, ...missingAnswerImageRows, ...classificationRows];
  for (const problem of problems) {
    const source = stringValue(problem.source);
    bySource[source] ||= {
      problemCount: 0,
      latexTranslationIssueCount: 0,
      missingAnswerImageIssueCount: 0,
      classificationDifficultyIssueCount: 0
    };
    bySource[source].problemCount += 1;
  }
  for (const issue of allIssues) {
    bySource[issue.source] ||= {
      problemCount: 0,
      latexTranslationIssueCount: 0,
      missingAnswerImageIssueCount: 0,
      classificationDifficultyIssueCount: 0
    };
    if (issue.dimension === "latex_translation") bySource[issue.source].latexTranslationIssueCount += 1;
    if (issue.dimension === "answer_images") bySource[issue.source].missingAnswerImageIssueCount += 1;
    if (issue.dimension === "classification_difficulty") bySource[issue.source].classificationDifficultyIssueCount += 1;
    byDimension[issue.dimension].issueCount += 1;
    if (issue.severity === "error") byDimension[issue.dimension].errorCount += 1;
    if (issue.severity === "warning") byDimension[issue.dimension].warningCount += 1;
    if (issue.severity === "info") byDimension[issue.dimension].infoCount += 1;
    byCode[issue.code] = (byCode[issue.code] || 0) + 1;
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
  }
  const sourceCounts = books.map((book) => {
    const parsed = parsedBookSources.get(book.slug);
    return {
      source: book.slug,
      sourceTexPath: parsed ? relativePath(parsed.sourcePath) : "",
      translationTexPath: parsed ? relativePath(parsed.translationPath) : "",
      catalogCount: problems.filter((problem) => problem.source === book.slug).length,
      sourceTexEntries: parsed?.sourceEntries.length || 0,
      translationTexEntries: parsed?.translationEntries.length || 0
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    problemCount: problems.length,
    issueCount: allIssues.length,
    bySeverity,
    byDimension,
    byCode,
    bySource,
    sourceCounts,
    files: {
      perProblem: "per-problem-review.csv",
      latexTranslation: "latex-translation-review.csv",
      missingAnswerImages: "missing-answer-images.csv",
      classificationDifficulty: "classification-difficulty-review.csv",
      manualQueue: "manual-review-queue.csv"
    }
  };
}

function writeMarkdown(filePath, summary) {
  const topCodes = Object.entries(summary.byCode).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const lines = [
    "# Question Bank Quality Review",
    "",
    `Generated at: ${summary.generatedAt}`,
    "",
    `Problems reviewed: ${summary.problemCount}`,
    `Issue flags: ${summary.issueCount}`,
    "",
    "## Dimensions",
    "",
    "| Dimension | Issues | Errors | Warnings | Info | Output |",
    "|---|---:|---:|---:|---:|---|",
    `| LaTeX / translation accuracy | ${summary.byDimension.latex_translation.issueCount} | ${summary.byDimension.latex_translation.errorCount} | ${summary.byDimension.latex_translation.warningCount} | ${summary.byDimension.latex_translation.infoCount} | latex-translation-review.csv |`,
    `| Missing answer images | ${summary.byDimension.answer_images.issueCount} | ${summary.byDimension.answer_images.errorCount} | ${summary.byDimension.answer_images.warningCount} | ${summary.byDimension.answer_images.infoCount} | missing-answer-images.csv |`,
    `| Category / difficulty | ${summary.byDimension.classification_difficulty.issueCount} | ${summary.byDimension.classification_difficulty.errorCount} | ${summary.byDimension.classification_difficulty.warningCount} | ${summary.byDimension.classification_difficulty.infoCount} | classification-difficulty-review.csv |`,
    "",
    "## Source Counts",
    "",
    "| Source | Catalog | Source LaTeX | Translation LaTeX |",
    "|---|---:|---:|---:|",
    ...summary.sourceCounts.map((item) => `| ${item.source} | ${item.catalogCount} | ${item.sourceTexEntries} | ${item.translationTexEntries} |`),
    "",
    "## Issues By Source",
    "",
    "| Source | Problems | LaTeX / Translation | Missing Answer Images | Category / Difficulty |",
    "|---|---:|---:|---:|---:|",
    ...Object.entries(summary.bySource).map(([source, item]) => `| ${source} | ${item.problemCount} | ${item.latexTranslationIssueCount} | ${item.missingAnswerImageIssueCount} | ${item.classificationDifficultyIssueCount} |`),
    "",
    "## Top Issue Codes",
    "",
    "| Code | Count |",
    "|---|---:|",
    ...topCodes.map(([code, count]) => `| ${code} | ${count} |`),
    "",
    "## How To Use",
    "",
    "Start with `manual-review-queue.csv`, sorted by priority. The three dimension-specific CSV files keep the evidence separated so fixes can be batched by workflow."
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function pushRows(target, rows) {
  rows.forEach((row) => target.push(row));
}

function priorityScore(severity, dimension, code) {
  let score = severity === "error" ? 100 : severity === "warning" ? 60 : 20;
  if (dimension === "answer_images") score += 25;
  if (dimension === "latex_translation") score += 15;
  if (/missing_source_entry|missing_translation_entry|solution_includegraphics|quantguide_solution_image/.test(code)) score += 30;
  if (/category_needs_review|difficulty_needs_review/.test(code)) score += 5;
  return score;
}

function problemIndexFromId(id) {
  const match = String(id || "").match(/problem-(\d+)$/);
  return match ? Number(match[1]) - 1 : -1;
}

function compactText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function containsCjk(text) {
  return /[\u3400-\u9fff]/.test(String(text || ""));
}

function cjkLengthRatioFloor(text, latinFloor, cjkFloor) {
  return containsCjk(text) ? cjkFloor : latinFloor;
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

function properNounTitle(text) {
  return /^[A-Z0-9 .+\-]+$/.test(String(text || "").trim()) && String(text || "").trim().length <= 24;
}

function snippet(text, max = 220) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function snippetPair(current, expected) {
  return `catalog=${snippet(current, 120)} || source=${snippet(expected, 120)}`;
}

function lengthSnippet(en, zh) {
  return `leftLength=${String(en || "").length}; rightLength=${String(zh || "").length}`;
}

function stringValue(value) {
  return String(value || "").trim();
}

function findLine(lines, start, predicate) {
  for (let index = Math.max(0, start); index < lines.length; index += 1) {
    if (predicate(lines[index])) return index;
  }
  return -1;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvValue(row[header])).join(","));
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvValue(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
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
