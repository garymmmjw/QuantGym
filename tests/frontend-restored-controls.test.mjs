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
  assert.match(chrome, /className="problem-collection-go-default"[\s\S]*?data-lucide="arrow-up-right"/);
  assert.match(chrome, /className="problem-collection-go-selected"[\s\S]*?data-lucide="check"/);
  assert.match(chrome, /if \(entry\.mode === "leetcode"\) return isEnglish \? "Featured list" : "精选题单"/);
  assert.match(chrome, /if \(entry\.mode === "source"\) return isEnglish \? "Source set" : "题源集合"/);
  assert.match(chrome, /return isEnglish \? "Topic set" : "主题集合"/);
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
    /scroll-snap-type\s*:\s*x/,
    /padding\s*:\s*5px/,
    /scroll-padding-inline\s*:\s*5px/
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
  assertRuleWith(css, ".qg-problems-page .leetcode-hot-link:focus-visible", [
    /outline\s*:\s*3px solid var\(--qg-brand\)/,
    /outline-offset\s*:\s*2px/
  ]);
  assertRuleWith(css, ".qg-problems-page .problem-collection-card.active", [
    /border-color\s*:\s*var\(--qg-brand\)/,
    /background\s*:\s*var\(--qg-brand-soft\)/,
    /color\s*:\s*var\(--qg-brand-ink\)/
  ]);
  assertRuleWith(css, ".qg-problems-page .problem-collections-panel", [
    /box-shadow\s*:\s*none/
  ]);
  assertRuleWith(css, ".qg-problems-page .problem-view-tabs", [
    /padding\s*:\s*5px/,
    /scroll-padding-inline\s*:\s*5px/
  ]);
  assert.equal((page.match(/className="qg-active-check" aria-hidden="true">\s*<i data-lucide="check" \/>/g) || []).length, 3);
  assertRuleWith(css, ".qg-problems-page .problem-view-tabs .qg-active-check", [
    /opacity\s*:\s*0/
  ]);
  assertRuleWith(css, ".qg-problems-page .problem-view-tabs .qg-active-check svg", [
    /width\s*:\s*14px/,
    /height\s*:\s*14px/
  ]);
  assertRuleWith(css, '.qg-problems-page .problem-view-tabs [aria-pressed="true"] .qg-active-check', [
    /opacity\s*:\s*1/
  ]);
  assertRuleWith(css, ".qg-problems-page .problem-collection-go-selected", [
    /display\s*:\s*none/
  ]);
  assertRuleWith(css, ".qg-problems-page .problem-collection-go", [
    /display\s*:\s*grid/
  ]);
  assertRuleWith(css, ".qg-problems-page .problem-collection-card.active .problem-collection-go-selected", [
    /display\s*:\s*inline-grid/
  ]);
  assert.match(page, /model\.t\("problemCollectionsTitle"\)/);
  assert.match(page, /model\.t\("problemCollectionsHint"\)/);
  assert.match(page, /model\.t\("allProblems"\)/);
  assert.match(page, /model\.t\("savedProblems"\)/);
  assert.match(page, /model\.t\("popularProblems"\)/);
  assert.match(page, /model\.t\("problemRankingTitle"\)/);
  assert.match(page, /model\.t\("problemRankingHint"\)/);
  assert.match(page, /isEnglish \? "All sources" : "全部题源"/);
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

test("exposes one Problems utility row and one complete action dock", () => {
  const source = read("src/features/problems/ProblemDetail.jsx");
  const pageSource = read("src/features/problems/ProblemsPageContent.jsx");
  const css = read("src/styles/playful-precision-replica-training.css");
  const tokens = read("src/styles/playful-precision-tokens.css");

  assert.equal((source.match(/className="problem-detail-top qg-detail-utility-row"/g) || []).length, 1);
  assert.equal((source.match(/className="problem-detail-actions qg-detail-cta-row"/g) || []).length, 1);
  assert.equal((source.match(/data-problem-action="mock-interview"/g) || []).length, 1);
  assert.equal((source.match(/onClick=\{\(\) => onToggleCompleted\(detail\.id\)\}/g) || []).length, 1);
  assert.equal((source.match(/onClick=\{\(\) => onToggleSaved\(detail\.id\)\}/g) || []).length, 1);
  assert.equal((source.match(/onClick=\{\(\) => onSelectInterview\(detail\.id\)\}/g) || []).length, 1);
  assert.match(source, /className=\{`secondary-button problem-detail-complete/);
  assert.match(source, /className=\{`secondary-button problem-detail-save/);
  assert.match(source, /problem-detail-complete[\s\S]*?aria-pressed=\{detail\.completed\}/);
  assert.match(source, /problem-detail-save[\s\S]*?aria-pressed=\{detail\.favorite\}/);
  assert.doesNotMatch(source, /visually hidden/);
  assert.match(
    pageSource,
    /const returnToListFromDetail = \(\) => \{[\s\S]*?autoOpenRef\.current = listData\?\.items\?\.\[0\]\?\.id \|\| "";[\s\S]*?model\.returnToList\(\);[\s\S]*?\};/
  );
  assert.match(pageSource, /onBack=\{returnToListFromDetail\}/);
  assert.doesNotMatch(pageSource, /onBack=\{model\.returnToList\}/);

  const utilityRules = ruleBodies(css, ".qg-problems-page .problem-detail .problem-detail-top");
  assert.ok(utilityRules.length > 0, "missing CSS selector: .qg-problems-page .problem-detail .problem-detail-top");
  assert.ok(utilityRules.every((body) => !/display\s*:\s*none/.test(body)));
  assert.ok(utilityRules.some((body) => /display\s*:\s*flex/.test(body)));
  assert.ok(utilityRules.some((body) => /flex-wrap\s*:\s*nowrap/.test(body)));
  assertRuleWith(css, ".qg-problems-page .qg-detail-utility-row .problem-detail-navigation", [
    /width\s*:\s*auto/,
    /min-width\s*:\s*0/,
    /margin-left\s*:\s*auto/
  ]);

  const dockRules = ruleBodies(css, ".qg-problems-page .qg-detail-cta-row");
  assert.ok(dockRules.length > 0, "missing CSS selector: .qg-problems-page .qg-detail-cta-row");
  assert.ok(dockRules.every((body) => !/display\s*:\s*none/.test(body)));
  assert.ok(dockRules.some((body) => (
    /display\s*:\s*flex/.test(body)
    && /flex-wrap\s*:\s*wrap/.test(body)
  )));

  assertRuleWith(css, ".qg-problems-page .qg-detail-cta-row > button", [
    /flex\s*:\s*1 1 auto/,
    /min-width\s*:\s*max-content/,
    /min-height\s*:\s*44px/,
    /padding-inline\s*:\s*8px/,
    /white-space\s*:\s*nowrap/
  ]);
  assertRuleWith(css, '.qg-problems-page [data-problem-action="mock-interview"]', [
    /min-height\s*:\s*44px/,
    /border\s*:\s*1px solid var\(--qg-brand\)\s*!important/,
    /background\s*:\s*var\(--qg-brand\)\s*!important/,
    /color\s*:\s*var\(--qg-on-brand\)\s*!important/,
    /transition\s*:\s*transform 140ms ease,\s*border-color 140ms ease,\s*box-shadow 140ms ease/,
    /box-shadow\s*:\s*none\s*!important/
  ]);
  for (const selector of [":root", '[data-qg-theme="dark"]']) {
    const ratio = contrastRatio(
      cssCustomProperty(tokens, selector, "--qg-on-brand"),
      cssCustomProperty(tokens, selector, "--qg-brand")
    );
    assert.ok(ratio >= 4.5, `${selector} mock-interview contrast is ${ratio.toFixed(2)}:1`);
  }
  assertRuleWith(css, ".qg-problems-page .qg-detail-utility-row .secondary-button", [
    /border\s*:\s*1px solid var\(--qg-border\)\s*!important/,
    /background\s*:\s*var\(--qg-surface-2\)\s*!important/,
    /color\s*:\s*var\(--qg-text\)\s*!important/
  ]);
  assertRuleWith(css, ".qg-problems-page .qg-detail-cta-row .secondary-button", [
    /border\s*:\s*1px solid var\(--qg-border\)\s*!important/,
    /background\s*:\s*var\(--qg-surface-2\)\s*!important/,
    /color\s*:\s*var\(--qg-text\)\s*!important/
  ]);
  assertRuleWith(css, ".qg-problems-page .qg-detail-cta-row .problem-detail-complete.active", [
    /border-color\s*:\s*var\(--qg-brand\)\s*!important/,
    /background\s*:\s*var\(--qg-brand-soft\)\s*!important/,
    /color\s*:\s*var\(--qg-brand-ink\)\s*!important/
  ]);
  assertRuleWith(css, ".qg-problems-page .qg-detail-cta-row .problem-detail-save.active", [
    /border-color\s*:\s*var\(--qg-brand\)\s*!important/,
    /background\s*:\s*var\(--qg-brand-soft\)\s*!important/,
    /color\s*:\s*var\(--qg-brand-ink\)\s*!important/
  ]);
  assert.match(css, /\.qg-detail-utility-row button:focus-visible,[\s\S]*?\.qg-detail-cta-row button:focus-visible/);

  const problemsMobile = atRuleBodies(css, "@media (max-width: 640px)")
    .find((body) => body.includes(".qg-detail-utility-row"));
  assert.ok(problemsMobile, "missing Problems detail mobile media block");
  assertRuleWith(problemsMobile, ".qg-problems-page .problem-detail .problem-detail-top.qg-detail-utility-row", [
    /align-items\s*:\s*stretch/,
    /flex-direction\s*:\s*column/
  ]);
  assertRuleWith(problemsMobile, ".qg-problems-page .qg-detail-utility-row .problem-detail-navigation", [
    /width\s*:\s*100%/,
    /min-width\s*:\s*0/,
    /margin-left\s*:\s*0/
  ]);
  assertRuleWith(problemsMobile, ".qg-problems-page .qg-detail-cta-row", [
    /display\s*:\s*flex/,
    /flex-wrap\s*:\s*wrap/
  ]);
  assertRuleWith(problemsMobile, '.qg-problems-page .qg-detail-cta-row [data-problem-action="mock-interview"]', [
    /flex-basis\s*:\s*100%/
  ]);
  for (const selector of [
    ".qg-problems-page .qg-detail-cta-row > .problem-detail-complete",
    ".qg-problems-page .qg-detail-cta-row > .problem-detail-save"
  ]) {
    assertRuleWith(problemsMobile, selector, [
      /min-width\s*:\s*0/,
      /padding-inline\s*:\s*6px/,
      /gap\s*:\s*4px/,
      /font-size\s*:\s*12px/,
      /line-height\s*:\s*1\.2/,
      /white-space\s*:\s*normal/
    ]);
  }
  for (const selector of [
    ".qg-problems-page .qg-detail-cta-row > .problem-detail-complete svg",
    ".qg-problems-page .qg-detail-cta-row > .problem-detail-save svg"
  ]) {
    assertRuleWith(problemsMobile, selector, [
      /width\s*:\s*14px/,
      /height\s*:\s*14px/,
      /flex\s*:\s*0 0 auto/
    ]);
  }

  assert.doesNotMatch(source, /qg-detail-(?:solve|bookmark)/);
  assert.doesNotMatch(css, /qg-detail-(?:solve|bookmark)/);

  const reducedMotion = atRuleBodies(css, "@media (prefers-reduced-motion: reduce)")
    .find((body) => body.includes(".qg-detail-utility-row button"));
  assert.ok(reducedMotion, "missing Problems detail reduced-motion rule");
  assertRuleWith(reducedMotion, ".qg-problems-page .qg-detail-utility-row button", [
    /transition-duration\s*:\s*1ms/
  ]);
  assertRuleWith(reducedMotion, ".qg-problems-page .qg-detail-cta-row button", [
    /transition-duration\s*:\s*1ms/
  ]);
});
