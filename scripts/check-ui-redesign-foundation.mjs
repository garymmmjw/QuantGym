import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const assetRoot = path.join(root, "assets", "generated", "playful-precision");
const manifestPath = path.join(assetRoot, "manifest.json");
const tokenPath = path.join(root, "src", "styles", "playful-precision-tokens.css");
const mainPath = path.join(root, "src", "main.jsx");
const indexPath = path.join(root, "index.html");

const requiredAssets = [
  "avatar-focused-v2.png",
  "avatar-happy-v2.png",
  "avatar-wink-v2.png",
  "avatar-wow-v2.png",
  "badge-gold.webp",
  "badge-level-1.webp",
  "badge-streak-7.webp",
  "badge-top-rank.webp",
  "brand-q-mark.webp",
  "brand-quantgym-logo.webp",
  "feature-learn.webp",
  "feature-practice.webp",
  "feature-quest.webp",
  "mascot-calculator-v2.png",
  "mascot-fire-v2.png",
  "mascot-hero-v5-clean.png",
  "mascot-interview.png",
  "mascot-laptop-v2.png",
  "mascot-levelup.png",
  "mascot-oops.png",
  "mascot-poker.png",
  "mascot-search.png",
  "mascot-sleep.png",
  "mascot-teacher-v2.png",
  "mascot-trophy-v2.png",
  "reward-crown.webp",
  "reward-dumbbell.webp",
  "reward-fire.webp",
  "reward-gem-small.webp",
  "reward-growth.webp",
  "reward-lightning.webp",
  "reward-medal-gold.webp",
  "reward-stopwatch.webp",
  "reward-target.webp",
  "reward-trophy.webp",
  "reward-xp.webp"
];

const requiredTokens = [
  "--qg-bg-base",
  "--qg-bg-grad",
  "--qg-surface",
  "--qg-surface-2",
  "--qg-border",
  "--qg-text",
  "--qg-muted",
  "--qg-brand",
  "--qg-brand-ink",
  "--qg-radius-panel",
  "--qg-shadow-card",
  "--qg-font-ui",
  "--qg-font-number"
];

const requiredClasses = [
  ".qg-panel",
  ".qg-button-primary",
  ".qg-button-secondary",
  ".qg-chip",
  ".qg-stat-card",
  ".qg-page-kicker",
  ".qg-empty-state",
  ".qg-skeleton"
];

const failures = [];

function rel(filePath) {
  return path.relative(root, filePath);
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    failures.push(`missing file: ${rel(filePath)}`);
    return "";
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`invalid json: ${rel(filePath)} (${error.message})`);
    return null;
  }
}

expect(fs.existsSync(assetRoot), "missing Playful Precision asset directory");
const manifest = readJson(manifestPath);
if (manifest) {
  expect(manifest.sourceZip === "UI 设计提升.zip", "manifest sourceZip must be UI 设计提升.zip");
  expect(Array.isArray(manifest.assets), "manifest assets must be an array");
  expect((manifest.assets || []).length >= requiredAssets.length, "manifest must include required assets");
}

for (const asset of requiredAssets) {
  const target = path.join(assetRoot, asset);
  expect(fs.existsSync(target), `missing Playful Precision asset: ${asset}`);
  if (fs.existsSync(target)) {
    const size = fs.statSync(target).size;
    expect(size > 512, `asset is unexpectedly small: ${asset}`);
  }
}

const css = readText(tokenPath);
for (const token of requiredTokens) {
  expect(css.includes(token), `missing CSS token: ${token}`);
}
for (const className of requiredClasses) {
  expect(css.includes(className), `missing foundation class: ${className}`);
}
expect(css.includes('[data-qg-theme="dark"]'), "missing dark theme selector");
expect(css.includes("@media (prefers-reduced-motion: reduce)"), "missing reduced-motion styles");
const temporaryPathMarker = ["/", "tmp", "/"].join("");
expect(!css.includes(temporaryPathMarker), "CSS must not reference temporary paths");

const main = readText(mainPath);
expect(
  main.includes('import "./styles/playful-precision-tokens.css";'),
  "src/main.jsx must import playful-precision-tokens.css"
);

const index = readText(indexPath);
expect(index.includes("Plus+Jakarta+Sans"), "index.html must load Plus Jakarta Sans");
expect(index.includes("Space+Grotesk"), "index.html must load Space Grotesk");

if (failures.length) {
  console.error("ui redesign foundation check failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  assetCount: requiredAssets.length,
  tokenCount: requiredTokens.length,
  classCount: requiredClasses.length
}, null, 2));
