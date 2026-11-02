import test from "node:test";
import assert from "node:assert/strict";
import { getUserCatalogProblems, isUserProblem, normalizeProblem } from "../src/modules/problems/data.js";
import { cloudStatePayload, localStatePayload } from "../src/state/data.js";

test("saving personal questions does not normalize catalog content or company aliases", () => {
  const inaccessibleContent = () => { throw new Error("Saving visibility must not process question content."); };
  const catalog = Array.from({ length: 3000 }, (_, index) => Object.freeze({
    id: `catalog-${index}`, source: "question-bank", visibility: index % 2 ? "public" : "private",
    get titleEn() { return inaccessibleContent(); },
    get promptEn() { return inaccessibleContent(); },
    get tags() { return inaccessibleContent(); }
  }));
  const personal = Object.freeze({ id: "personal", source: "manual", visibility: "user", bookSlug: "my-notes" });
  const disabled = { ...personal, id: "disabled" };
  const deps = { normalizeProblemCompanies: inaccessibleContent, isDisabledProblemSource: problem => problem.id === "disabled" };
  const state = Object.freeze({ problems: [...catalog, personal, disabled], problemStates: [{ problemId: "catalog-1", favorite: true }] });
  const payload = localStatePayload(state, { getUserCatalogProblems: problems => getUserCatalogProblems(problems, deps) });
  assert.deepEqual(payload.problems, [personal]);
  assert.equal(payload.problems[0], personal);
  assert.equal(payload.problemStates, state.problemStates);
  assert.equal(state.problems.length, 3002);
});

test("visibility classification retains defaults, explicit access boundaries, and inferred sources", () => {
  for (const [problem, expected] of [
    [{}, true],
    [{ source: "manual" }, true],
    [{ source: "seed" }, false],
    [{ source: "question-bank" }, false],
    [{ sourceType: "book" }, false],
    [{ collection: "book" }, false],
    [{ bookSlug: "personal-collection" }, false],
    [{ source: "question-bank", visibility: " USER " }, true],
    [{ visibility: "PUBLIC" }, false],
    [{ visibility: "Private" }, false],
    [{ visibility: "unexpected" }, false],
    [{ visibility: " " }, false],
    [{ url: "https://fixture.test/book" }, false],
    [{ visibility: "", url: "https://fixture.test/book" }, false],
  ]) {
    const deps = { inferSource: url => url ? "question-bank" : "manual", makeId: () => "fixture-id" };
    assert.equal(isUserProblem(problem, deps), expected, JSON.stringify(problem));
    assert.equal(normalizeProblem(problem, deps).visibility === "user", expected);
  }
});

test("legacy ownerless QuantGuide visibility is shared with normalization, including generated IDs", () => {
  const legacy = {
    id: "quantguide-perfect-hedge", visibility: "user", source: "quantguide",
    bookSlug: "quantguide", collection: "platform", ownerUserId: " ",
    quantguide: { id: "upstream", slug: " Perfect--Hedge! " }
  };
  for (const [patch, expected] of [
    [{}, false],
    [{ ownerUserId: "owner" }, true],
    [{ id: "personal-copy" }, true],
    [{ source: "manual" }, true],
    [{ sourceType: "book" }, true],
    [{ bookSlug: "mine" }, true],
    [{ quantguide: { id: "", slug: "perfect-hedge" } }, true],
    [{ quantguide: { id: "upstream", slug: "" } }, true],
    [{ id: "", title: " Perfect hedge " }, false],
  ]) {
    const problem = { ...legacy, ...patch };
    const deps = { stableId: title => `quantguide-${title.toLowerCase().replace(/\s+/g, "-")}` };
    assert.equal(isUserProblem(problem, deps), expected, JSON.stringify(patch));
    assert.equal(normalizeProblem(problem, deps).visibility === "user", expected);
  }
});

test("cloud state excludes separate catalog and progress routes without filtering their contents", () => {
  const state = Object.freeze({
    problems: Object.freeze([{ id: "private", visibility: "private" }]),
    problemStates: Object.freeze([{ problemId: "private", notes: "personal" }]),
    skills: Object.freeze({ probability: 40 }), checkIns: Object.freeze([{ date: "2026-11-01" }]),
    careerTrackerOperations: Object.freeze([{ id: "application-event" }]), updatedAt: "2026-11-01T10:00:00Z"
  });
  const payload = cloudStatePayload(state, {
    getUserCatalogProblems: () => { throw new Error("The cloud payload must not filter a catalog it omits."); }
  });
  const { problems, problemStates, ...expected } = state;
  assert.deepEqual(payload, expected);
  assert.equal(payload.skills, state.skills);
  assert.equal(payload.careerTrackerOperations, state.careerTrackerOperations);
  assert.equal(state.problems, problems);
  assert.equal(state.problemStates, problemStates);
  assert.deepEqual(cloudStatePayload(null), {});
});
