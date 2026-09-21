import test from "node:test";
import assert from "node:assert/strict";
import { versionProblemCatalogScript } from "../src/lib/problemCatalogScriptUrl.js";

const page = "https://beta.quantgym.app/problems?bank=purple";

test("same-origin default catalog gets a distinct URL for each release", () => {
  const source = "/data/problem-catalog.js?v=2";
  const previous = versionProblemCatalogScript(source, "a".repeat(40), page);
  const next = versionProblemCatalogScript(source, "b".repeat(40), page);
  assert.notEqual(previous, source);
  assert.notEqual(previous, next);
  assert.equal(new URL(next, page).searchParams.get("v"), "2");
  assert.equal(new URL(next, page).searchParams.get("build"), "b".repeat(40));
});

test("same-origin custom paths preserve other parameters and replace a stale build parameter", () => {
  const source = "https://beta.quantgym.app/data/custom.js?edition=reviewed&build=old#catalog";
  const next = new URL(versionProblemCatalogScript(source, "new-commit", page));
  assert.equal(next.pathname, "/data/custom.js");
  assert.equal(next.searchParams.get("edition"), "reviewed");
  assert.deepEqual(next.searchParams.getAll("build"), ["new-commit"]);
  assert.equal(next.hash, "#catalog");
});

test("external custom HTTPS catalog URLs remain byte-for-byte unchanged", () => {
  const source = "https://catalog.example.test/private.js?edition=2026%2F09&build=external#source";
  assert.equal(versionProblemCatalogScript(source, "new-commit", page), source);
  assert.equal(versionProblemCatalogScript("//catalog.example.test/public.js", "new-commit", page), "//catalog.example.test/public.js");
});

test("development without build metadata and invalid configuration keep their existing URL behavior", () => {
  assert.equal(versionProblemCatalogScript("/data/problem-catalog.js?v=2", "", page), "/data/problem-catalog.js?v=2");
  assert.equal(versionProblemCatalogScript("/data/problem-catalog.js", "commit", "invalid"), "/data/problem-catalog.js");
  assert.equal(versionProblemCatalogScript("https://[invalid", "commit", page), "https://[invalid");
});
