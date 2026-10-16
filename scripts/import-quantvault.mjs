import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_INPUT = "QuantVault/data/download-2026-10-15-860-of-3469/quantvault_questions_full.json";
export const DEFAULT_INDEX = "QuantVault/learn-preview/public/private/scoring/problems-index.json";
export const DEFAULT_OUTPUT = "data/question-banks/quantvault";
export const CATEGORY_MAP = Object.freeze({
  "brain-teaser": "probabilityExpectation",
  "game-theory": "probabilityExpectation",
  combinatorics: "probabilityExpectation",
  probability: "probabilityExpectation",
  expectation: "probabilityExpectation",
  "stochastic-process": "probabilityExpectation",
  "random-variables": "probabilityExpectation",
  coding: "leetcode",
  statistics: "statistics",
  regression: "statistics",
  "time-series": "statistics",
  finance: "market",
  "market-microstructure": "market",
  "options-pricing": "option",
  "linear-algebra": "linearAlgebra",
  optimization: "optimization",
  "machine-learning": "machineLearning"
});

const digest = (text) => crypto.createHash("sha256").update(text, "utf8").digest("hex");
const countBy = (rows, key) => Object.fromEntries([...rows.reduce((counts, row) => {
  const values = Array.isArray(key(row)) ? key(row) : [key(row)];
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is missing.`);
  return value;
}

function sourceAnswer(record) {
  const displayed = record.practice?.answer_display;
  if (typeof displayed === "string" && displayed.trim()) return displayed;
  // A missing short answer must never be replaced by an invented summary.
  return record.solution;
}

export function normalizeQuantVaultRecord(record, indexRow) {
  const displayId = Number(record?.id);
  const rawId = record?.source_metadata?.raw_id;
  if (!Number.isSafeInteger(displayId) || displayId <= 0 || String(displayId) !== String(record.id)
      || !Number.isSafeInteger(rawId) || rawId <= 0) throw new Error("Invalid source problem identity.");
  if (record.source !== "quantvault" || indexRow?.id !== rawId || Number(indexRow.di) !== displayId) {
    throw new Error(`Problem ${displayId} is not an exact source/index identity match.`);
  }
  const categorySlug = record.source_metadata.category;
  if (!CATEGORY_MAP[categorySlug] || indexRow.c !== categorySlug) throw new Error(`Unknown or conflicting source topic: ${categorySlug}`);
  if (!["Easy", "Medium", "Hard"].includes(record.difficulty) || indexRow.d !== record.difficulty.toLowerCase()) {
    throw new Error(`Problem ${displayId} has conflicting difficulty.`);
  }
  for (const key of ["title", "prompt", "solution", "topic", "captured_at"]) requireText(record[key], `Problem ${displayId} ${key}`);
  if (!Number.isFinite(Date.parse(record.captured_at))) throw new Error(`Problem ${displayId} capture time is invalid.`);
  if (!Array.isArray(record.hints) || record.hints.length === 0 || record.hints.some((hint) => typeof hint !== "string" || !hint.trim())) {
    throw new Error(`Problem ${displayId} hints are incomplete.`);
  }
  for (const key of ["tags", "companies", "company_slugs"]) {
    if (!Array.isArray(record[key]) || record[key].some((item) => typeof item !== "string")) throw new Error(`Problem ${displayId} ${key} is invalid.`);
  }
  const sourceUrl = requireText(record.url, `Problem ${displayId} source URL`);
  if (sourceUrl !== `https://quantvault.org/problems.html?id=${displayId}`) throw new Error(`Problem ${displayId} source URL does not match.`);
  const reviewBase = {
    status: "approved_source",
    basis: "Imported from the recorded source without rewriting. This verifies source fidelity, not independent mathematical correctness or redistribution rights."
  };
  const answer = sourceAnswer(record);
  return {
    id: `quantvault-${displayId}`,
    titleEn: record.title,
    category: CATEGORY_MAP[categorySlug],
    difficulty: record.difficulty,
    tags: [...new Set(["QuantVault", record.topic, record.difficulty, ...record.tags, ...record.companies])],
    source: "quantvault",
    sourceUrl,
    sourceType: "platform",
    bookSlug: "quantvault",
    bookName: "翁家宝典",
    visibility: "private",
    localOnly: true,
    accessTier: "vip",
    promptEn: record.prompt,
    answer,
    explanation: record.solution,
    hint: record.hints.map((hint, index) => `**Hint ${index + 1}:** ${hint}`).join("\n\n"),
    hints: [...record.hints],
    intuition: record.intuition || "",
    companies: [...record.companies],
    quantvault: {
      id: rawId,
      displayId,
      orderId: displayId,
      topic: record.topic,
      categorySlug,
      difficulty: record.difficulty,
      type: record.question_type,
      tags: [...record.tags],
      companySlugs: [...record.company_slugs],
      companyReports: record.company_reports || [],
      firmReports: record.firm_reports || {},
      roles: record.source_metadata.roles || [],
      contextTags: record.source_metadata.context_tags || [],
      sourceMetadata: record.source_metadata,
      accessAtCapture: record.access,
      capturedAt: record.captured_at,
      practice: record.practice || null,
      contentVariants: record.content_variants || null,
      answerOrigin: record.practice?.answer_display ? "source-practice-answer-display" : "full-source-solution"
    },
    provenance: { ...record.provenance, importVersion: 1, originalSourceName: "QuantVault", originalSourceUrl: sourceUrl },
    review: {
      prompt: { ...reviewBase },
      classification: { ...reviewBase, mapping: "QuantGym category mapping v1; original 17-topic taxonomy remains in quantvault.categorySlug and quantvault.topic." },
      answer: { ...reviewBase }
    },
    rights: {
      usageScope: "local-only",
      publicRedistribution: "not-approved",
      commercialRedistribution: "not-approved",
      basis: "Existing account-visible capture supplied for this local internal test; access does not establish redistribution permission."
    },
    createdAt: record.captured_at,
    updatedAt: record.captured_at
  };
}

export function buildQuantVaultBank(payload, index, { expectedCount = 860, conflictingIds = new Set(), inputSha256 = null } = {}) {
  const records = payload?.records;
  if (!Array.isArray(records) || records.length !== expectedCount || payload.count !== records.length) {
    throw new Error(`Expected ${expectedCount} complete captured records; a directory-only index is not a question bank.`);
  }
  if (!Array.isArray(index)) throw new Error("Source problem index must be an array.");
  const indexMap = new Map(index.map((row) => [String(row.di), row]));
  if (indexMap.size !== index.length) throw new Error("Duplicate display IDs in the source index.");
  const seenDisplay = new Set();
  const seenInternal = new Set();
  const problems = records.map((record) => {
    const problem = normalizeQuantVaultRecord(record, indexMap.get(String(record.id)));
    if (seenDisplay.has(problem.id) || seenInternal.has(problem.quantvault.id)) throw new Error(`Duplicate source identity: ${problem.id}`);
    if (conflictingIds.has(problem.id)) throw new Error(`Problem ID conflicts with an existing source: ${problem.id}`);
    seenDisplay.add(problem.id);
    seenInternal.add(problem.quantvault.id);
    return problem;
  }).sort((a, b) => a.quantvault.displayId - b.quantvault.displayId);
  const metadata = {
    slug: "quantvault", name: "翁家宝典", originalSourceName: "QuantVault", type: "platform",
    sourceUrl: "https://quantvault.org/explore.html", problemFile: "quantvault/problems.json",
    problemCount: problems.length, indexCount: index.length, importVersion: 1,
    latestCaptureAt: records.map((row) => row.captured_at).sort().at(-1),
    inputSha256, visibility: "private", localOnly: true, accessTier: "vip",
    topicCounts: countBy(problems, (row) => row.quantvault.topic),
    difficultyCounts: countBy(problems, (row) => row.difficulty),
    categoryCounts: countBy(problems, (row) => row.category),
    companyCounts: countBy(problems, (row) => row.companies),
    hintCount: problems.reduce((sum, row) => sum + row.hints.length, 0),
    fullSolutionCount: problems.length,
    sourcePracticeCount: problems.filter((row) => row.quantvault.practice).length,
    privacyNote: "Local internal test only. Existing authenticated captures are preserved; no new requests are made to QuantVault. This file is not public or commercial redistribution authorization.",
    rightsStatus: "needs-review",
    categoryMappingNote: "Local broad-category mapping for QuantGym navigation. Original 17 source topics, source tags and company reports are preserved.",
    languageNote: "Native English text is retained. No Chinese translation or answer summary has been fabricated."
  };
  return { problems, metadata };
}

export function runImport(argv = process.argv.slice(2)) {
  const options = { input: DEFAULT_INPUT, index: DEFAULT_INDEX, output: DEFAULT_OUTPUT, expectedCount: 860, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--check") { options.check = true; continue; }
    const key = ({ "--input": "input", "--index": "index", "--output": "output", "--expected-count": "expectedCount" })[argv[i]];
    if (!key || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
    options[key] = key === "expectedCount" ? Number(argv[++i]) : argv[++i];
  }
  if (!Number.isSafeInteger(options.expectedCount) || options.expectedCount < 1) throw new Error("Expected count must be a positive integer.");
  const inputPath = path.resolve(ROOT, options.input);
  const inputText = fs.readFileSync(inputPath, "utf8");
  const index = JSON.parse(fs.readFileSync(path.resolve(ROOT, options.index), "utf8"));
  const catalogPath = path.join(ROOT, "data/problem-catalog.json");
  const catalog = fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, "utf8")) : {};
  const conflictingIds = new Set((catalog.problems || []).filter((row) => row.source !== "quantvault").map((row) => row.id));
  const result = buildQuantVaultBank(JSON.parse(inputText), index, { expectedCount: options.expectedCount, conflictingIds, inputSha256: digest(inputText) });
  const output = path.resolve(ROOT, options.output);
  const files = [["problems.json", { problems: result.problems }], ["metadata.json", result.metadata]];
  if (!options.check) fs.mkdirSync(output, { recursive: true });
  for (const [name, content] of files) {
    const destination = path.join(output, name);
    const serialized = `${JSON.stringify(content, null, 2)}\n`;
    if (options.check) {
      if (fs.readFileSync(destination, "utf8") !== serialized) throw new Error(`Generated file is stale: ${destination}`);
    } else fs.writeFileSync(destination, serialized);
  }
  console.log(JSON.stringify({ status: options.check ? "verified" : "imported", count: result.problems.length, topics: Object.keys(result.metadata.topicCounts).length, hints: result.metadata.hintCount, localOnly: true, output }, null, 2));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runImport(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
