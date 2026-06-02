import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantguide/problems.json");
const rawPath = path.resolve(projectRoot, options.raw || "QuantGuide/data/quantguide_account_questions_full.json");
const classificationReviewPath = path.resolve(projectRoot, options.classificationReview || "artifacts/question-bank-quality-review/classification-difficulty-review.csv");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/quantguide-quality-review-report.json");

const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const rawRecords = readJson(rawPath, { records: [] }).records || [];
const rawBySlug = new Map(rawRecords.map((record) => [String(record.slug || ""), record]));
const flaggedIds = readClassificationReviewIds(classificationReviewPath);
const imageReviews = quantguideImageReviewNotes();

const report = {
  generatedAt: new Date().toISOString(),
  dryRun: !options.apply,
  source: relativePath(sourcePath),
  reviewedClassificationCount: 0,
  changedCategoryCount: 0,
  imageReviewCount: 0,
  cleanedUrlTagCount: 0,
  changes: [],
  imageReviews: []
};

for (const problem of problems) {
  if (!problem || problem.source !== "quantguide") continue;
  const previousTags = Array.isArray(problem.tags) ? problem.tags : [];
  const cleanedTags = sanitizeTags(previousTags);
  if (cleanedTags.length !== previousTags.length || cleanedTags.some((tag, index) => tag !== previousTags[index])) {
    problem.tags = cleanedTags;
    report.cleanedUrlTagCount += 1;
  }

  const raw = rawBySlug.get(String(problem.id || "").replace(/^quantguide-/, "")) || {};
  if (flaggedIds.has(problem.id)) {
    const previousCategory = problem.category;
    const category = reviewedCategory(problem, raw);
    problem.category = category;
    problem.classificationReviewed = true;
    problem.classificationReviewSource = "quantguide-topic-review-v1";
    problem.classificationReviewReason = category === previousCategory
      ? "Reviewed against QuantGuide topic, tags, title, prompt, and current heuristic warning; existing category retained."
      : `Reviewed against QuantGuide topic, tags, title, and prompt; category changed from ${previousCategory} to ${category}.`;
    updateCategoryTag(problem, category);
    report.reviewedClassificationCount += 1;
    if (category !== previousCategory) report.changedCategoryCount += 1;
    report.changes.push({
      id: problem.id,
      titleEn: problem.titleEn,
      previousCategory,
      category,
      topic: raw.topic || "",
      rawTags: rawTags(raw)
    });
  }

  const imageReview = imageReviews.get(problem.id);
  if (imageReview) {
    problem.figureReview = {
      ...(problem.figureReview || {}),
      ...imageReview.review
    };
    report.imageReviewCount += 1;
    report.imageReviews.push({
      id: problem.id,
      titleEn: problem.titleEn,
      note: imageReview.note
    });
  }
}

if (options.apply) {
  fs.writeFileSync(sourcePath, `${JSON.stringify(payload, null, 2)}\n`);
  if (options.rebuild) {
    const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-problem-catalog.mjs")], {
      cwd: projectRoot,
      stdio: "inherit"
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  dryRun: report.dryRun,
  reviewedClassificationCount: report.reviewedClassificationCount,
  changedCategoryCount: report.changedCategoryCount,
  imageReviewCount: report.imageReviewCount,
  cleanedUrlTagCount: report.cleanedUrlTagCount,
  report: relativePath(reportPath)
}, null, 2));

function reviewedCategory(problem, raw) {
  const id = String(problem.id || "");
  const current = String(problem.category || "probabilityExpectation");
  const title = String(problem.titleEn || "");
  const topic = String(raw.topic || "").toLowerCase();
  const tags = rawTags(raw).map((tag) => tag.toLowerCase());
  const signal = [title, topic, tags.join(" ")].join(" ").toLowerCase();
  const text = [
    title,
    problem.promptEn,
    problem.explanation,
    problem.hint,
    topic,
    tags.join(" ")
  ].join(" ").toLowerCase();

  if (/graph search|bubbly sort/.test(text)) return "leetcode";
  if (/mental arithmetic|mixing glasses|no arithmetic|sheep sharing|primitive preference|valid expressions|arithmetical cabby|leg count|exact bills|prime janitors|ordering at chipotle|card shuffling/.test(text)) {
    return "mentalMath";
  }
  if (/fish capture/.test(text)) return "statistics";
  if (/minimum variance portfolio|portfolio returns|allocating capital/.test(text)) return "market";
  if (/contracts and options|contracts and pricing|dice strike price|binomial contract pricing/.test(text)) return "option";

  if (topic === "finance") {
    if (/bull call spread|call spread|put spread|option|contract pricing|derivative|strike/.test(text) && !/bond|company purchase|arbitrage|make a market|bank account|bank arbitrage|horse|bet size|investment/.test(text)) {
      return "option";
    }
    return "market";
  }

  if (/stochastic calculus|stochastic processes|brownian|sde\b|gbm\b|martingale|vasicek|log-price|asset dynamics|integral variance|hitting mgf/.test(text)) {
    return "probabilityExpectation";
  }

  if (/covariance|correlation|equicorrelated|matrix|determinant|linear algebra|limit theorem|estimating pi|poisson process covariance|doubly stochastic|existent mgf/.test(signal)) {
    return "statistics";
  }

  if (topic === "brainteasers") return "mentalMath";
  return current;
}

function quantguideImageReviewNotes() {
  return new Map([
    ["quantguide-bull-call-spread-i", {
      note: "Solution says to look at the payoff diagram, but the raw QuantGuide export contains no embedded image; the payoff is fully described in text.",
      review: { solution: "source_checked_no_image textual_reference payoff diagram described in prose" }
    }],
    ["quantguide-butterfly-payoff", {
      note: "Solution mentions a payoff diagram, but the raw QuantGuide export contains no embedded image; the maximum payoff point is described in text.",
      review: { solution: "source_checked_no_image textual_reference payoff diagram described in prose" }
    }],
    ["quantguide-counting-nash-equillibria", {
      note: "Raw QuantGuide prompt/solution contains no embedded image; figure-language detection is a textual-reference false positive.",
      review: { solution: "source_checked_no_image false_positive textual_reference" }
    }],
    ["quantguide-ace-distribution", {
      note: "Prompt says 'at the table 13 cards'; the image heuristic misread this as a numbered table reference. No prompt image exists in the raw export.",
      review: { prompt: "false_positive source_checked_no_image card table text, not table figure" }
    }]
  ]);
}

function readClassificationReviewIds(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  return new Set(rows
    .filter((row) => row.source === "quantguide" && row.code === "category_needs_review")
    .map((row) => row.id)
    .filter(Boolean));
}

function updateCategoryTag(problem, category) {
  const categoryLabels = new Set([
    "Algorithms",
    "Pandas/NumPy",
    "Probability/Expectation",
    "Statistics",
    "Machine Learning",
    "Deep Learning",
    "Market",
    "Option",
    "Mental Math"
  ]);
  const existing = sanitizeTags(Array.isArray(problem.tags) ? problem.tags : []);
  const kept = existing.filter((tag) => tag && tag !== "QuantGuide" && tag !== problem.difficulty && !categoryLabels.has(tag));
  problem.tags = [...new Set(["QuantGuide", readableCategory(category), problem.difficulty, ...kept])].filter(Boolean).slice(0, 10);
}

function sanitizeTags(tags) {
  return [...new Set(tags
    .map((tag) => String(tag || "").trim())
    .filter((tag) => tag && !/^https?:\/\//i.test(tag)))];
}

function readableCategory(category) {
  return {
    leetcode: "Algorithms",
    pandasNumpy: "Pandas/NumPy",
    probabilityExpectation: "Probability/Expectation",
    statistics: "Statistics",
    machineLearning: "Machine Learning",
    deepLearning: "Deep Learning",
    market: "Market",
    option: "Option",
    mentalMath: "Mental Math"
  }[category] || category;
}

function rawTags(raw) {
  return (raw.tags || []).map((tag) => {
    if (typeof tag === "string") return tag;
    if (tag && typeof tag === "object") return tag.tag || tag.name || "";
    return "";
  }).filter(Boolean);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes && char === '"' && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((value) => value.length)) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows.shift();
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--apply") {
      parsed.apply = true;
    } else if (arg === "--rebuild") {
      parsed.rebuild = true;
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      parsed[key] = args[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath);
}
