import test from "node:test";
import assert from "node:assert/strict";
import { createProblemBrowserController } from "../src/modules/problems/browserController.js";
import { createProblemDetailController } from "../src/modules/problems/detailController.js";
import { createProblemDetailState } from "../src/modules/problems/viewState.js";
import { normalizeProblem, mergeProblems } from "../src/modules/problems/data.js";
import { normalizeProblemCompanies } from "../src/modules/companies/data.js";
import { isDisabledProblemSource } from "../src/modules/problems/format.js";

const problem = {
  id: "free-practice-fixture", titleEn: "A source question", promptEn: "State your assumptions.",
  source: "quantguide", bookSlug: "quantguide", visibility: "private", category: "statistics"
};

test("enabled private Purple Book questions and exercises survive the catalog gate", () => {
  for (const id of ["catalog-problem-001", "catalog-exercise-001"]) {
    const item = { id, source: "question-bank", bookSlug: "question-bank", bookName: "紫皮书", visibility: "private" };
    assert.equal(isDisabledProblemSource(item), false);
    assert.equal(isDisabledProblemSource(item, { disabledSources: new Set(["question-bank"]) }), true);
  }
});

function makeFixture({ react = false, elements = {} } = {}) {
  const detailState = createProblemDetailState();
  const events = [];
  const timers = [];
  const refreshed = [];
  const scrolls = [];
  const boundary = { mounted: react };
  const documentRef = {
    querySelector: selector => selector === "[data-free-practice-root]" && boundary.mounted ? {} : null
  };
  const windowRef = {
    CustomEvent: class {
      constructor(type, options) { this.type = type; this.detail = options.detail; }
    },
    dispatchEvent: event => events.push(event),
    setTimeout: callback => timers.push(callback),
    scrollY: 0,
    scrollTo: options => scrolls.push(options)
  };
  const deps = {
    elements, documentRef, windowRef, detailState,
    getProblems: () => [problem],
    getFilteredProblems: () => [problem],
    getViewMode: () => "all",
    isCatalogProblem: () => true,
    getLanguage: () => "en",
    socialState: { setNotice() {}, getNotice: () => "" },
    refreshSocial: id => refreshed.push(id),
    getState: () => ({ problems: [problem] }),
    getSelectedDetailId: detailState.getDetailId,
    setSelectedDetailId: detailState.setDetailId
  };
  return { deps, detailState, events, timers, refreshed, scrolls, boundary };
}

function reactOwnedNode() {
  const fail = () => assert.fail("Legacy code must not mutate React-owned DOM");
  return Object.defineProperties({
    classList: { add: fail, remove: fail },
    append: fail,
    getBoundingClientRect: fail
  }, {
    innerHTML: { get: () => "React detail and draft", set: fail },
    value: { get: () => "React search", set: fail }
  });
}

test("external search selects the React detail and emits navigation without touching its DOM", () => {
  const fixture = makeFixture({ react: true, elements: {
    problemDetail: reactOwnedNode(), problemSearch: reactOwnedNode()
  } });
  const browser = createProblemBrowserController({
    ...fixture.deps,
    openProblemDetail: () => assert.fail("Delayed legacy open must not run inside React")
  });
  assert.equal(browser.openFromSearch(problem.id).ok, true);
  assert.equal(fixture.detailState.getDetailId(), problem.id);
  assert.deepEqual(fixture.events.map(event => [event.type, event.detail]), [
    ["quantgym:problem-open", { problemId: problem.id, source: "search" }]
  ]);
  fixture.timers.forEach(callback => callback());
  browser.render({ reactDetail: false, reactChrome: false });
  browser.renderCompanyPanel();
  browser.renderRanking();
  browser.renderViewTabs();
  assert.equal(fixture.deps.elements.problemDetail.innerHTML, "React detail and draft");
});

test("a React page mounted during route navigation blocks the pending legacy open", () => {
  const fixture = makeFixture();
  const browser = createProblemBrowserController({
    ...fixture.deps,
    openProblemDetail: () => assert.fail("Newly mounted React page must own the detail")
  });
  browser.openFromSearch(problem.id);
  fixture.boundary.mounted = true;
  fixture.timers.forEach(callback => callback());
  assert.equal(fixture.detailState.getDetailId(), problem.id);
  assert.equal(fixture.events.length, 1);
});

test("direct detail navigation updates React through the event bridge and preserves its markup", () => {
  const fixture = makeFixture({ react: true, elements: { problemDetail: reactOwnedNode() } });
  const detail = createProblemDetailController(fixture.deps);
  detail.revealBlock("old-question", "answer");
  detail.open(problem.id);
  assert.equal(fixture.detailState.getDetailId(), problem.id);
  assert.equal(detail.isBlockRevealed("old-question", "answer"), false);
  assert.deepEqual(fixture.events.map(event => event.detail), [{ problemId: problem.id, source: "detail" }]);
  assert.deepEqual(fixture.refreshed, [problem.id]);
  detail.render(problem); // A social refresh may still call the legacy renderer.
  detail.returnToList();
  assert.equal(fixture.detailState.getDetailId(), "");
  assert.equal(fixture.scrolls.length, 0);
  assert.equal(fixture.deps.elements.problemDetail.innerHTML, "React detail and draft");
});

test("detail navigation tolerates absent list, ranking, and detail nodes", () => {
  const fixture = makeFixture();
  const detail = createProblemDetailController(fixture.deps);
  assert.doesNotThrow(() => detail.open(problem.id));
  assert.equal(fixture.detailState.getDetailId(), problem.id);
  assert.deepEqual(fixture.refreshed, [problem.id]);
  assert.doesNotThrow(() => detail.render(problem));
  assert.doesNotThrow(() => detail.returnToList());
  assert.equal(fixture.detailState.getDetailId(), "");
  assert.equal(fixture.scrolls.length, 0);
});

test("search keeps the delayed legacy navigation outside the React boundary", () => {
  const fixture = makeFixture();
  const opened = [];
  const browser = createProblemBrowserController({ ...fixture.deps, openProblemDetail: id => opened.push(id) });
  browser.openFromSearch(problem.id);
  assert.deepEqual(opened, []);
  fixture.timers.forEach(callback => callback());
  assert.deepEqual(opened, [problem.id]);
});

test("legacy detail still renders and scrolls when only list and ranking nodes are absent", () => {
  function makeElement() {
    return {
      children: [], dataset: {}, classList: { add() {}, remove() {} },
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      addEventListener() {}, setAttribute() {}, querySelector: () => null,
      getBoundingClientRect: () => ({ top: 80 })
    };
  }
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: makeElement, createTextNode: text => ({ textContent: text }) };
  try {
    const container = makeElement();
    const fixture = makeFixture({ elements: { problemDetail: container } });
    createProblemDetailController(fixture.deps).open(problem.id);
    assert.ok(container.children.length > 0);
    assert.deepEqual(fixture.scrolls, [{ top: 66, behavior: "smooth" }]);
    assert.equal(fixture.events.length, 0);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("catalog normalization and merging retain taxonomy, QuantGuide metadata, and explicit unknown firms", () => {
  const companyDefs = [{ name: "Jane Street", slug: "jane-street", aliases: ["JS"] }];
  const deps = {
    normalizeProblemCompanies: (raw, tags, source) => normalizeProblemCompanies(raw, tags, source, { companyDefs })
  };
  const raw = {
    ...problem,
    companies: ["JS", "New Research Firm", "中金公司"],
    tags: ["source-record", "Not a company"],
    practiceTaxonomy: { topic: "statistics", subtopic: "regression" },
    quantguide: { topic: "Statistics", difficulty: "Easy" }
  };
  const normalized = normalizeProblem(raw, deps);
  const merged = mergeProblems([raw], [JSON.parse(JSON.stringify(normalized))], deps)[0];
  assert.deepEqual(merged.practiceTaxonomy, raw.practiceTaxonomy);
  assert.deepEqual(merged.quantguide, raw.quantguide);
  assert.deepEqual(merged.companies, ["Jane Street", "New Research Firm", "中金公司"]);
  assert.equal(merged.visibility, "private");
  assert.equal(merged.id, problem.id);
});

test("reviewed book provenance survives normalization without a stale exercise translation", () => {
  const raw = { ...problem, id: "catalog-exercise-008", source: "question-bank", titleZh: "抛硬币直到 HT", titleEn: "", provenance: { originalNumber: "A.8", pdfPage: 158, answerStatus: "supplemented", reviewNotes: "原书未附答案" } };
  const normalized = normalizeProblem(raw, { exerciseTitleOverrides: { "008": { en: "Wait for HTT" } } });
  assert.equal(normalized.titleEn, "");
  assert.deepEqual(normalized.provenance, raw.provenance);
});

test("old saved book content cannot undo the reviewed edition in either merge order", () => {
  const old = { ...problem, id: "catalog-exercise-008", source: "question-bank", promptEn: "Wait for HTT", explanationEn: "Old answer", explanation: "Old answer", updatedAt: "2026-05-24T00:00:00Z" };
  const reviewed = { ...old, promptEn: "", explanationEn: undefined, promptZh: "抛硬币直到 HT", explanation: "新版补充解答", updatedAt: "2026-09-13T15:39:05Z", provenance: { originalNumber: "A.8" } };
  for (const rows of [mergeProblems([reviewed], [old]), mergeProblems([old], [reviewed])]) {
    assert.equal(rows[0].promptEn, "");
    assert.equal(rows[0].explanationEn, undefined);
    assert.equal(rows[0].explanation, "新版补充解答");
    assert.equal(rows[0].id, old.id);
  }
  const later = { ...reviewed, explanation: "Later correction", updatedAt: "2026-09-14T00:00:00Z" };
  assert.equal(mergeProblems([later], [reviewed])[0].explanation, "Later correction");
});
