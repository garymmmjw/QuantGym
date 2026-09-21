import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProblem, getUserCatalogProblems, mergeProblems } from "../src/modules/problems/data.js";
import { createProblemCatalogSyncController } from "../src/modules/problems/catalogSync.js";
import { localStatePayload } from "../src/state/data.js";

function cachedQuestion(slug, overrides = {}) {
  return {
    id: `quantguide-${slug.replace(/-+/g, "-").replace(/^-|-$/g, "")}`,
    source: "quantguide", bookSlug: "quantguide", sourceType: "platform", visibility: "user", ownerUserId: "",
    titleEn: "Cached source fixture", promptEn: "Fixture question.", explanation: "Fixture explanation.",
    quantguide: { id: `fixture-upstream-${slug}`, slug, topic: "probability", orderId: 1 },
    ...overrides
  };
}

test("legacy ownerless platform rows regain private visibility, including original noncanonical slug punctuation", () => {
  for (const slug of ["relatively-prime-coins", "always-profit-i", "points-on-a-circle-i", "the-perfect-hedge-i-", "exponential--uniform"]) {
    const raw = cachedQuestion(slug);
    const migrated = normalizeProblem(raw);
    assert.equal(migrated.visibility, "private");
    assert.equal(migrated.id, raw.id);
    assert.equal(migrated.promptEn, raw.promptEn);
    assert.equal(migrated.explanation, raw.explanation);
    assert.deepEqual(migrated.quantguide, raw.quantguide);
    assert.equal(getUserCatalogProblems([raw]).length, 0);
    assert.equal(raw.visibility, "user", "normalization leaves its input untouched");
  }
});

test("explicitly owned and noncanonical personal imports remain user questions", () => {
  for (const overrides of [
    { ownerUserId: "real-owner" }, { id: "my-import" }, { source: "manual" },
    { bookSlug: "personal-collection" }, { sourceType: "book" },
    { quantguide: { slug: "personal" } }, { quantguide: { id: "fixture-upstream", slug: "different-slug" } }
  ]) {
    const raw = cachedQuestion("personal", overrides);
    assert.equal(normalizeProblem(raw).visibility, "user");
    assert.deepEqual(getUserCatalogProblems([raw]), [raw]);
  }
});

test("authoritative refresh removes exactly three retired cache rows and preserves personal records and real user questions", async () => {
  const retired = ["relatively-prime-coins", "always-profit-i", "points-on-a-circle-i"].map(slug => cachedQuestion(slug));
  const owned = cachedQuestion("owned", { ownerUserId: "real-owner" });
  const manual = cachedQuestion("manual", { id: "personal-import", source: "manual" });
  const state = {
    problems: [cachedQuestion("active"), ...retired, owned, manual],
    problemStates: retired.map(row => ({ problemId: row.id, favorite: true, notes: "Personal note", freePracticeAttempts: [{ id: `attempt-${row.id}`, outcome: "correct" }] }))
  };
  const originalHistory = structuredClone(state.problemStates);
  const fresh = [cachedQuestion("active", { visibility: "private" })];
  let persisted;
  const sync = createProblemCatalogSyncController({
    getState: () => state, requestCatalog: async () => fresh, getUserCatalogProblems, mergeProblems,
    saveState: () => { persisted = localStatePayload(state, { getUserCatalogProblems }); }
  });
  assert.equal((await sync.refresh()).changed, true);
  assert.deepEqual(state.problems.map(row => row.id).sort(), [fresh[0].id, owned.id, manual.id].sort());
  assert.deepEqual(state.problemStates, originalHistory);
  assert.deepEqual(persisted.problems.map(row => row.id), [owned.id, manual.id]);
  assert.deepEqual(persisted.problemStates, originalHistory);
  assert.equal((await sync.refresh()).changed, true);
  assert.deepEqual(state.problems.map(row => row.id).sort(), [fresh[0].id, owned.id, manual.id].sort());
});
