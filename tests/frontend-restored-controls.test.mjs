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

function cssCustomProperty(css, selector, property) {
  const body = ruleBodies(css, selector)[0] || "";
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`${escapedProperty}\\s*:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `missing ${property} in ${selector}`);
  return match[1];
}

function contrastRatio(first, second) {
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = channels.map((value) => (
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

test("restores Companies tier filtering with button-group semantics", () => {
  const source = read("src/features/companies/CompaniesPageContent.jsx");
  const css = read("src/styles/playful-precision-replica-support-b.css");
  assert.match(source, /id="companyTierFilter" className="segmented" role="group"/);
  assert.match(source, /model\.isEnglish\s*\?\s*"Companies"\s*:\s*\(\s*<>\s*\{model\.t\("companies"\)\}/);
  assert.match(source, /data-company-tier=\{tier\}/);
  assert.match(source, /aria-pressed=\{model\.tierFilter === tier\}/);
  assert.match(source, /className="qg-active-check" aria-hidden="true">\s*<i data-lucide="check" \/>/);
  assert.doesNotMatch(source, /aria-selected=\{model\.tierFilter === tier\}/);
  const filterRules = ruleBodies(css, ".qg-companies-page #companyTierFilter");
  assert.ok(filterRules.length > 0, "missing CSS selector: .qg-companies-page #companyTierFilter");
  assert.ok(filterRules.every((body) => !/display\s*:\s*none/.test(body)));
  assert.ok(filterRules.some((body) => /display\s*:\s*grid/.test(body)));
  assert.match(css, /#companyTierFilter \.segment[\s\S]*?min-height\s*:\s*44px/);
  assert.match(css, /#companyTierFilter \.segment:focus-visible/);
  assertRuleWith(css, ".qg-companies-page #companyTierFilter .segment .qg-active-check", [
    /position\s*:\s*absolute/,
    /opacity\s*:\s*0/
  ]);
  assertRuleWith(css, '.qg-companies-page #companyTierFilter .segment[aria-pressed="true"] .qg-active-check', [
    /opacity\s*:\s*1/
  ]);
  assertRuleWith(css, ".qg-companies-page #companyTierFilter .segment:focus-visible", [
    /outline\s*:\s*3px solid var\(--qg-brand\)/,
    /outline-offset\s*:\s*2px/
  ]);
  assert.match(
    css,
    /:root\[data-qg-theme="dark"\][^{]+\.qg-companies-page \.section-heading\.companies-header,\s*\[data-qg-theme="dark"\][^{]+\.qg-companies-page \.section-heading\.companies-header\s*\{[^}]*background\s*:\s*none[^}]*box-shadow\s*:\s*none/
  );
  for (const selector of [
    ".qg-companies-page .company-save-btn",
    ".qg-companies-page .company-site-btn",
    ".qg-companies-page .company-jobs-cta",
    ".qg-companies-page .company-practice-link"
  ]) {
    assertRuleWith(css, selector, [/min-height\s*:\s*44px/]);
  }
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?#companyTierFilter[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
  const mobileCss = atRuleBodies(css, "@media (max-width: 560px)").join("\n");
  assertRuleWith(mobileCss, ".qg-companies-page #companyTierFilter .segment", [
    /font-size\s*:\s*11px/,
    /padding-inline\s*:\s*4px/
  ]);
});
