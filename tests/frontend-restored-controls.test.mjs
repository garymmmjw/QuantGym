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
