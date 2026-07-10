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
  assert.match(page, /data-problem-view="ranking"[\s\S]*?aria-pressed=/);
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

  assert.match(css, /\.qg-problems-page \.problem-collection-grid[\s\S]*?scroll-snap-type\s*:\s*x/);
  assert.match(css, /\.qg-problems-page \.leetcode-hot-done,[\s\S]*?\.qg-problems-page \.leetcode-hot-link[\s\S]*?min-width\s*:\s*44px[\s\S]*?min-height\s*:\s*44px/);
  assert.match(css, /\.qg-problems-page \.problem-browser-toolbar \.secondary-button[\s\S]*?min-height\s*:\s*44px/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.leetcode-hot-list[\s\S]*?grid-template-columns\s*:\s*1fr/);
});
