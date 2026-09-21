import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createLibraryPageApi } from "../src/app/services/libraryPageApi.js";
import { PRACTICE_BANKS, getPracticeBank } from "../src/features/problems/practiceBanks.js";
import { useFreePractice } from "../src/features/problems/useFreePractice.js";
import { getModulePath, getRouteModuleId } from "../src/routes/routeConfig.js";

function browserFixture(url = "https://quantgym.test/library?lang=en&q=old") {
  const listeners = new Map();
  const navigations = [];
  const replacements = [];
  const windowRef = {
    location: new URL(url),
    CustomEvent: class {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
        this.cancelable = Boolean(options.cancelable);
        this.defaultPrevented = false;
      }
      preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
    },
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    dispatchEvent(event) {
      for (const callback of listeners.get(event.type) || []) callback(event);
      return !event.defaultPrevented;
    },
    history: { replaceState(_state, _title, target) {
      replacements.push(target);
      windowRef.location = new URL(target, windowRef.location);
    } }
  };
  const navigate = (target, options) => {
    navigations.push({ target, ...options });
    windowRef.location = new URL(target, windowRef.location);
  };
  return { windowRef, navigations, replacements, navigate };
}

// This bridge renders no JSX. Execute its real effects with router/browser
// adapters, so tests cover event consumption and same-route query changes.
function mountBridge(fixture) {
  const effects = [];
  const source = fs.readFileSync(new URL("../src/routes/HashCompatRedirect.jsx", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "")
    .replace("export function HashCompatRedirect", "function HashCompatRedirect");
  vm.runInNewContext(`${source}\nHashCompatRedirect();`, {
    window: fixture.windowRef,
    useEffect: effect => effects.push(effect),
    useLocation: () => fixture.windowRef.location,
    useNavigate: () => fixture.navigate,
    useAppServicesContext: () => ({}),
    getModulePath,
    getRouteModuleId
  });
  const cleanups = effects.map(effect => effect());
  return () => cleanups.forEach(cleanup => cleanup?.());
}

function libraryFixture(browser, { catalog = true } = {}) {
  const switches = [];
  const filters = [];
  const entries = PRACTICE_BANKS.map(bank => ({ id: bank.id, sourceSlug: bank.source, problemCount: 1 }));
  const api = createLibraryPageApi({
    windowRef: browser.windowRef,
    getLibraryEntries: () => entries,
    getCatalogProblems: () => catalog ? entries.map(entry => ({ id: entry.id, source: entry.sourceSlug })) : [],
    isCatalogProblem: () => true,
    setProblemFilterState: state => filters.push(state),
    switchModule(moduleId, options) {
      switches.push({ moduleId, ...options });
      if (options?.updateRoute !== false) {
        browser.windowRef.dispatchEvent(new browser.windowRef.CustomEvent("quantgym:navigate-module", { detail: { moduleId } }));
      }
    }
  });
  return { api, filters, switches };
}

test("Library practice opens all five supported banks with a single query-bearing navigation", async () => {
  for (const bank of PRACTICE_BANKS) {
    const browser = browserFixture();
    const unmount = mountBridge(browser);
    const library = libraryFixture(browser);
    const result = await library.api.handleCardAction(bank.id, "practice");
    assert.equal(result.ok, true);
    assert.equal(browser.navigations.length, 1);
    assert.equal(browser.navigations[0].target, `/problems?bank=${bank.id}`);
    assert.equal(browser.navigations[0].replace, false);
    assert.equal(library.switches[0].updateRoute, false);
    assert.equal(library.filters[0].source, bank.source);
    unmount();
  }
});

test("bank selection works before the authenticated catalog finishes loading", () => {
  const browser = browserFixture();
  mountBridge(browser);
  const library = libraryFixture(browser, { catalog: false });
  assert.equal(library.api.openPractice("quantguide"), true);
  assert.equal(browser.windowRef.location.pathname, "/problems");
  assert.equal(browser.windowRef.location.search, "?bank=quantguide");
});

test("an explicit bank query changes an already-open Problems route", () => {
  const browser = browserFixture("https://quantgym.test/problems?bank=purple&question=old");
  mountBridge(browser);
  libraryFixture(browser).api.openPractice("quantguide");
  assert.equal(browser.navigations.length, 1);
  assert.equal(browser.windowRef.location.search, "?bank=quantguide");
});

test("legacy shell navigation still runs if no React route listener consumes the event", () => {
  const browser = browserFixture();
  const library = libraryFixture(browser);
  assert.equal(library.api.openPractice("quantguide"), true);
  assert.equal(library.switches[0].updateRoute, true);
});

test("Library legacy sources clear stale bank selections and reach a scoped question list", () => {
  const browser = browserFixture("https://quantgym.test/library?bank=purple&question=old&q=old&status=completed");
  mountBridge(browser);
  const library = libraryFixture(browser);
  assert.equal(library.api.openPractice("green-book"), true);
  assert.equal(library.filters[0].source, "green-book");
  assert.equal(browser.navigations[0].target, "/problems?source=green-book");
  const { practice, html } = renderPracticeRoute(browser.navigations[0].target);
  assert.equal(practice.bank.kind, "source");
  assert.equal(practice.bank.nameZh, "Green Book fixture");
  assert.deepEqual(practice.pageItems.map(problem => problem.id), ["green-one", "green-two"]);
  assert.deepEqual(practice.summary, { total: 2, completed: 1 });
  assert.match(html, /Green question one/);
  assert.doesNotMatch(html, /Red question|Purple question/);
  assert.equal(practice.summaries.length, 5);
  assert.equal(getPracticeBank(practice.pageItems[0]), null, "legacy source keeps existing completion instead of the five-bank timer");
});

const sourceCatalog = [
  { id: "green-one", source: "green-book", bookName: "Green Book fixture", titleEn: "Green question one", difficulty: "Easy" },
  { id: "green-two", source: "green-book", bookName: "Green Book fixture", titleEn: "Green question two", difficulty: "Hard" },
  { id: "red-one", source: "red-book", titleEn: "Red question", difficulty: "Hard" },
  { id: "purple-one", source: "question-bank", titleEn: "Purple question", difficulty: "Hard" }
];

// Render the actual hook used by FreePracticeWorkspace inside React Router.
// URL-only navigation assertions would miss a page that ignored the source.
function renderPracticeRoute(url, catalog = sourceCatalog) {
  let practice;
  function Probe() {
    practice = useFreePractice({
      catalogProblems: catalog,
      problemStates: [{ problemId: "green-one", completed: true }],
      accountId: "fixture",
      view: { isEnglish: true },
      openProblem() {}, returnToList() {}
    });
    return createElement("ul", null, practice.pageItems.map(problem => createElement("li", { key: problem.id }, problem.titleEn)));
  }
  const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] }, createElement(Probe)));
  return { practice, html };
}

test("legacy source filters, direct details and previous/next stay within that source after reload", () => {
  const filtered = renderPracticeRoute("/problems?source=green-book&difficulty=Hard&status=unfinished").practice;
  assert.deepEqual(filtered.pageItems.map(problem => problem.id), ["green-two"]);
  const detail = renderPracticeRoute("/problems?source=green-book&question=green-two").practice;
  assert.equal(detail.selectedProblem.id, "green-two");
  assert.equal(detail.navigation.previousId, "green-one");
  assert.equal(detail.navigation.nextId, "");
  assert.equal(detail.navigation.total, 2);
});

test("source loading never falls through to another bank and the home still has exactly five banks", () => {
  const loading = renderPracticeRoute("/problems?source=green-book", []).practice;
  assert.equal(loading.bank.source, "green-book");
  assert.equal(loading.pageItems.length, 0);
  const unknown = renderPracticeRoute("/problems?source=missing-source").practice;
  assert.equal(unknown.pageItems.length, 0);
  const home = renderPracticeRoute("/problems").practice;
  assert.equal(home.bank, null);
  assert.deepEqual(home.summaries.map(bank => bank.id), PRACTICE_BANKS.map(bank => bank.id));
  const purple = renderPracticeRoute("/problems?bank=purple").practice;
  assert.deepEqual(purple.pageItems.map(problem => problem.id), ["purple-one"]);
  assert.equal(getPracticeBank(purple.pageItems[0]).id, "purple");
});

test("ordinary module events and hash aliases preserve the current query", () => {
  const browser = browserFixture("https://quantgym.test/library?lang=en#poker");
  mountBridge(browser);
  assert.equal(browser.navigations[0].target, "/calendar?lang=en");
  assert.equal(browser.navigations[0].replace, true);
  browser.windowRef.dispatchEvent(new browser.windowRef.CustomEvent("quantgym:navigate-module", {
    detail: { moduleId: "library" }
  }));
  assert.equal(browser.navigations[1].target, "/library?lang=en");
});

test("an explicit empty query clears stale selection, while same-path hashes still clean up", () => {
  const browser = browserFixture("https://quantgym.test/problems?bank=purple");
  mountBridge(browser);
  browser.windowRef.dispatchEvent(new browser.windowRef.CustomEvent("quantgym:navigate-module", {
    detail: { moduleId: "problems", search: "" }
  }));
  assert.equal(browser.navigations[0].target, "/problems");
  browser.windowRef.location = new URL("https://quantgym.test/problems?lang=en#problems");
  browser.windowRef.dispatchEvent(new browser.windowRef.CustomEvent("hashchange"));
  assert.equal(browser.replacements[0], "/problems?lang=en");
  assert.equal(browser.navigations.length, 1);
});
