import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function ruleBodies(css, selector) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectorList]) => selectorList
      .split(",")
      .some((candidate) => {
        const normalized = candidate.trim();
        return normalized === selector || normalized.endsWith(` ${selector}`);
      }))
    .map(([, , declarations]) => declarations);
}

function atRuleBodies(css, header) {
  const bodies = [];
  let cursor = 0;

  while (cursor < css.length) {
    const headerIndex = css.indexOf(header, cursor);
    if (headerIndex === -1) break;
    const openIndex = css.indexOf("{", headerIndex + header.length);
    if (openIndex === -1) break;

    let depth = 1;
    let closeIndex = openIndex + 1;
    while (closeIndex < css.length && depth > 0) {
      if (css[closeIndex] === "{") depth += 1;
      if (css[closeIndex] === "}") depth -= 1;
      closeIndex += 1;
    }

    assert.equal(depth, 0, `unclosed at-rule: ${header}`);
    bodies.push(css.slice(openIndex + 1, closeIndex - 1));
    cursor = closeIndex;
  }

  return bodies;
}

function assertRuleWith(css, selector, patterns) {
  const bodies = ruleBodies(css, selector);
  assert.ok(bodies.length > 0, `missing CSS selector: ${selector}`);
  assert.ok(
    bodies.some((body) => patterns.every((pattern) => pattern.test(body))),
    `missing required declarations for: ${selector}`
  );
}

test("restores Companies tier filtering with button-group semantics", () => {
  const source = read("src/features/companies/CompaniesPageContent.jsx");
  const css = read("src/styles/playful-precision-replica-support-b.css");
  assert.match(source, /id="companyTierFilter" className="segmented" role="group"/);
  assert.match(source, /data-company-tier=\{tier\}/);
  assert.match(source, /aria-pressed=\{model\.tierFilter === tier\}/);
  assert.doesNotMatch(source, /aria-selected=\{model\.tierFilter === tier\}/);
  const filterRules = ruleBodies(css, ".qg-companies-page #companyTierFilter");
  assert.ok(filterRules.length > 0, "missing CSS selector: .qg-companies-page #companyTierFilter");
  assert.ok(filterRules.every((body) => !/display\s*:\s*none/.test(body)));
  assert.ok(filterRules.some((body) => /display\s*:\s*grid/.test(body)));
  assert.match(css, /#companyTierFilter \.segment[\s\S]*?min-height\s*:\s*44px/);
  assert.match(css, /#companyTierFilter \.segment:focus-visible/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?#companyTierFilter[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
});

test("restores Problems discovery, ranking, and Hot 100 semantics", () => {
  const page = read("src/features/problems/ProblemsPageContent.jsx");
  const chrome = read("src/features/problems/ProblemChromePanels.jsx");
  const css = read("src/styles/playful-precision-replica-training.css");
  assert.doesNotMatch(page, /aria-labelledby="problemCollectionsTitle"\s+hidden/);
  assert.doesNotMatch(page, /className="problem-browser-toolbar"\s+hidden/);
  assert.match(page, /className="problem-browser-toolbar"[\s\S]*?role="group"/);
  assert.match(page, /data-problem-view="all"\s+aria-pressed=\{viewMode === "all"\}/);
  assert.match(page, /data-problem-view="saved"\s+aria-pressed=\{viewMode === "saved"\}/);
  assert.match(page, /data-problem-view="ranking"\s+aria-pressed=\{viewMode === "ranking"\}/);
  assert.match(chrome, /data-problem-collection=\{entry\.id\}[\s\S]*?aria-pressed=\{active\}/);
  assert.match(chrome, /aria-expanded=\{entry\.mode === "leetcode" \? Boolean\(leetcodeExpanded\) : undefined\}/);
  assert.match(chrome, /aria-controls=\{entry\.mode === "leetcode" \? "leetcodeHotList" : undefined\}/);
  assert.match(chrome, /data-leetcode-hot-toggle=\{item\.id\}[\s\S]*?aria-pressed=\{isDone\}/);

  const collectionRules = ruleBodies(css, ".qg-problems-page .problem-collections-panel");
  assert.ok(collectionRules.length > 0, "missing CSS selector: .qg-problems-page .problem-collections-panel");
  assert.ok(collectionRules.every((body) => !/display\s*:\s*none/.test(body)));

  const toolbarRules = ruleBodies(css, ".qg-problems-page .problem-browser-toolbar");
  assert.ok(toolbarRules.length > 0, "missing CSS selector: .qg-problems-page .problem-browser-toolbar");
  assert.ok(toolbarRules.every((body) => !/display\s*:\s*none/.test(body)));

  assertRuleWith(css, ".qg-problems-page .problem-collection-grid", [
    /grid-template-columns\s*:\s*none/,
    /grid-auto-flow\s*:\s*column/,
    /grid-auto-columns\s*:\s*minmax\(210px, 1fr\)/,
    /scroll-snap-type\s*:\s*x/
  ]);
  assertRuleWith(css, ".qg-problems-page .problem-collection-card", [
    /aspect-ratio\s*:\s*auto/,
    /border\s*:\s*1px solid var\(--qg-border\)/,
    /background\s*:\s*var\(--qg-surface-2\)/,
    /color\s*:\s*var\(--qg-text\)/
  ]);
  assertRuleWith(css, ".qg-problems-page .leetcode-hot-item", [
    /border\s*:\s*1px solid var\(--qg-border\)/,
    /background\s*:\s*var\(--qg-surface-2\)/,
    /color\s*:\s*var\(--qg-text\)/
  ]);
  assertRuleWith(css, ".qg-problems-page .leetcode-hot-done", [
    /border\s*:\s*1px solid var\(--qg-border\)/,
    /background\s*:\s*var\(--qg-surface\)/,
    /color\s*:\s*var\(--qg-brand-ink\)/
  ]);
  assertRuleWith(css, ".qg-problems-page .leetcode-hot-link", [
    /border\s*:\s*1px solid var\(--qg-border\)/,
    /background\s*:\s*var\(--qg-surface\)/,
    /color\s*:\s*var\(--qg-brand-ink\)/
  ]);
  assertRuleWith(css, ".qg-problems-page .problem-collection-card.active", [
    /border-color\s*:\s*var\(--qg-brand\)/,
    /background\s*:\s*var\(--qg-brand-soft\)/,
    /color\s*:\s*var\(--qg-brand-ink\)/
  ]);
  assertRuleWith(css, ".qg-problems-page .leetcode-hot-item.is-done", [
    /border-color\s*:\s*var\(--qg-brand\)/,
    /background\s*:\s*var\(--qg-brand-soft\)/
  ]);
  assertRuleWith(css, ".qg-problems-page .leetcode-hot-item.is-done .leetcode-hot-done", [
    /border-color\s*:\s*var\(--qg-brand\)/,
    /background\s*:\s*var\(--qg-brand\)/
  ]);
  assert.match(css, /\.qg-problems-page \.leetcode-hot-done,[\s\S]*?\.qg-problems-page \.leetcode-hot-link[\s\S]*?min-width\s*:\s*44px[\s\S]*?min-height\s*:\s*44px/);
  assert.match(css, /\.qg-problems-page \.problem-browser-toolbar \.secondary-button[\s\S]*?min-height\s*:\s*44px/);

  const problemsMobile = atRuleBodies(css, "@media (max-width: 640px)")
    .find((body) => body.includes(".qg-problems-page .problem-collection-grid"));
  assert.ok(problemsMobile, "missing Problems mobile media block");
  assertRuleWith(problemsMobile, ".qg-problems-page .problem-collection-grid", [
    /grid-auto-columns\s*:\s*minmax\(82%, 1fr\)/
  ]);
  assertRuleWith(problemsMobile, ".qg-problems-page .leetcode-hot-list:not(.hidden)", [
    /grid-template-columns\s*:\s*1fr/
  ]);
});
