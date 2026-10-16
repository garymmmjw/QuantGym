import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildQuantVaultBank, normalizeQuantVaultRecord, CATEGORY_MAP, DEFAULT_INPUT, DEFAULT_INDEX, DEFAULT_OUTPUT } from "./import-quantvault.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const record = () => ({
  id: "14", source: "quantvault", title: "Synthetic dice fixture", url: "https://quantvault.org/problems.html?id=14",
  prompt: "Find $E[X]$ for this synthetic fixture.\n\nKeep every line.",
  solution: "**Solution:**\n\n$$E[X] = \\frac{14}{3}$$\n\nAll steps remain here.",
  hints: ["Define $X$.", "Use $E[X]$.", "Work backwards."], intuition: "Synthetic intuition.",
  topic: "Probability", difficulty: "Medium", question_type: "Calculation", tags: ["expectation"],
  companies: ["Synthetic Firm"], company_slugs: ["synthetic-firm"], company_reports: [{ name: "Synthetic Firm", reported_at: "2026-06" }],
  firm_reports: { "synthetic-firm": ["2026-06"] },
  source_metadata: { raw_id: 70, raw_display_id: 14, category: "probability", roles: ["QT"], context_tags: ["fixture"] },
  captured_at: "2026-10-15T22:55:00.000Z", access: "account_visible",
  provenance: { synthetic: true, source_kind: "test-only", section_sha256: { statement: "fixture-hash" } },
  practice: { id: 70, answer_display: "14/3", solve_format: "closed_form" }
});
const indexRow = () => ({ id: 70, di: 14, c: "probability", d: "medium" });
const bundle = (rows = [record()]) => ({ count: rows.length, records: rows });

// This suite uses synthetic content for failure modes; the optional local test
// verifies actual capture fidelity without checking source content into the test.
test("preserves prompt, all hints, complete solution, source metadata and stable identities", () => {
  const source = record();
  const before = structuredClone(source);
  const row = normalizeQuantVaultRecord(source, indexRow());
  assert.equal(row.id, "quantvault-14");
  assert.equal(row.quantvault.id, 70);
  assert.equal(row.quantvault.displayId, 14);
  assert.equal(row.quantvault.orderId, 14);
  assert.equal(row.promptEn, source.prompt);
  assert.equal(row.explanation, source.solution);
  assert.equal(row.answer, "14/3");
  assert.deepEqual(row.hints, source.hints);
  for (const hint of source.hints) assert.ok(row.hint.includes(hint));
  assert.deepEqual(row.companies, source.companies);
  assert.deepEqual(row.quantvault.companyReports, source.company_reports);
  assert.deepEqual(row.quantvault.sourceMetadata, source.source_metadata);
  assert.equal(row.provenance.section_sha256.statement, "fixture-hash");
  assert.deepEqual(source, before);
});

test("a missing source short answer uses the full solution and never fabricates text or translation", () => {
  const source = record(); delete source.practice;
  const row = normalizeQuantVaultRecord(source, indexRow());
  assert.equal(row.answer, source.solution);
  assert.equal(row.quantvault.answerOrigin, "full-source-solution");
  assert.equal(row.promptZh, undefined);
  assert.equal(row.titleZh, undefined);
  assert.equal(row.explanationZh, undefined);
});

test("local VIP policy and source fidelity do not claim publication rights or manual correctness", () => {
  const row = normalizeQuantVaultRecord(record(), indexRow());
  assert.equal(row.source, "quantvault");
  assert.equal(row.bookName, "翁家宝典");
  assert.equal(row.visibility, "private");
  assert.equal(row.localOnly, true);
  assert.equal(row.accessTier, "vip");
  assert.equal(row.rights.usageScope, "local-only");
  assert.equal(row.rights.publicRedistribution, "not-approved");
  assert.equal(row.rights.commercialRedistribution, "not-approved");
  for (const key of ["prompt", "classification", "answer"]) {
    assert.equal(row.review[key].status, "approved_source");
    assert.match(row.review[key].basis, /not independent mathematical correctness/);
  }
});

test("rejects incomplete body, index-only payloads, mismatched counts, identity conflicts and duplicated IDs", () => {
  assert.throws(() => buildQuantVaultBank([indexRow()], [indexRow()], { expectedCount: 1 }), /complete captured records/);
  assert.throws(() => buildQuantVaultBank(bundle(), [indexRow()], { expectedCount: 860 }), /Expected 860/);
  for (const key of ["title", "prompt", "solution"]) {
    assert.throws(() => normalizeQuantVaultRecord({ ...record(), [key]: "" }, indexRow()), /missing/);
  }
  assert.throws(() => normalizeQuantVaultRecord({ ...record(), hints: [] }, indexRow()), /incomplete/);
  assert.throws(() => normalizeQuantVaultRecord(record(), { ...indexRow(), id: 71 }), /identity match/);
  assert.throws(() => normalizeQuantVaultRecord(record(), { ...indexRow(), c: "coding" }), /conflicting source topic/);
  assert.throws(() => normalizeQuantVaultRecord(record(), { ...indexRow(), d: "hard" }), /conflicting difficulty/);
  assert.throws(() => buildQuantVaultBank(bundle([record(), record()]), [indexRow()], { expectedCount: 2 }), /Duplicate source identity/);
  assert.throws(() => buildQuantVaultBank(bundle(), [indexRow(), indexRow()], { expectedCount: 1 }), /Duplicate display IDs/);
  assert.throws(() => buildQuantVaultBank(bundle(), [indexRow()], { expectedCount: 1, conflictingIds: new Set(["quantvault-14"]) }), /conflicts with an existing source/);
});

test("all 17 native topics map to existing broad categories without losing native taxonomy", () => {
  assert.equal(Object.keys(CATEGORY_MAP).length, 17);
  for (const [topic, mapped] of Object.entries(CATEGORY_MAP)) {
    const source = record(); source.source_metadata.category = topic; source.topic = `Native ${topic}`;
    const row = normalizeQuantVaultRecord(source, { ...indexRow(), c: topic });
    assert.equal(row.category, mapped);
    assert.equal(row.quantvault.categorySlug, topic);
    assert.equal(row.quantvault.topic, source.topic);
  }
});

test("build is deterministic and uses capture dates rather than the current clock", () => {
  const first = buildQuantVaultBank(bundle(), [indexRow()], { expectedCount: 1 });
  const second = buildQuantVaultBank(bundle(), [indexRow()], { expectedCount: 1 });
  assert.deepEqual(first, second);
  assert.equal(first.metadata.latestCaptureAt, record().captured_at);
  assert.equal(first.metadata.hintCount, 3);
  assert.equal(first.metadata.rightsStatus, "needs-review");
});

test("local 860-record export exactly preserves every downloaded body and hint", { skip: !fs.existsSync(path.join(ROOT, DEFAULT_INPUT)) }, () => {
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, DEFAULT_INPUT), "utf8"));
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, DEFAULT_INDEX), "utf8"));
  const bank = buildQuantVaultBank(source, index);
  const output = JSON.parse(fs.readFileSync(path.join(ROOT, DEFAULT_OUTPUT, "problems.json"), "utf8"));
  assert.equal(bank.problems.length, 860);
  assert.equal(new Set(bank.problems.map((row) => row.id)).size, 860);
  assert.equal(Object.keys(bank.metadata.topicCounts).length, 17);
  assert.equal(bank.metadata.hintCount, 2579);
  assert.deepEqual(output.problems, bank.problems);
  const originals = new Map(source.records.map((row) => [row.id, row]));
  for (const row of output.problems) {
    const original = originals.get(String(row.quantvault.displayId));
    assert.equal(row.promptEn, original.prompt, row.id);
    assert.equal(row.explanation, original.solution, row.id);
    assert.deepEqual(row.hints, original.hints, row.id);
    assert.equal(row.intuition, original.intuition, row.id);
    assert.deepEqual(row.companies, original.companies, row.id);
  }
});
