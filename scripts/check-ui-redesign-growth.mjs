import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const growthCssPath = path.join(root, "src", "styles", "playful-precision-growth.css");
const skillsPath = path.join(root, "src", "features", "skills", "SkillsPageContent.jsx");
const capturePath = path.join(root, "scripts", "capture-ui-redesign-growth-review.mjs");
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

const skills = readText(skillsPath);
const growthCss = readText(growthCssPath);
const captureScript = readText(capturePath);
const temporaryPathMarker = ["/", "tmp", "/"].join("");

for (const marker of [
  "qg-growth-page",
  "qg-skills-page",
  "qg-skills-headline-stats",
  "qg-skills-radar",
  "qg-skill-grid",
  'asset="focused"'
]) {
  expect(skills.includes(marker), `SkillsPageContent.jsx missing ${marker}`);
}

for (const id of ["skillsPageTitle", "skillRadar", "skillRadarTooltip", "skillsGrid"]) {
  expect(skills.includes(id), `SkillsPageContent.jsx lost #${id}`);
}

for (const marker of [
  ".qg-growth-page",
  ".qg-skills-page",
  ".qg-skills-radar",
  ".qg-skill-grid",
  "@media (max-width: 760px)",
  "@media (prefers-reduced-motion: reduce)"
]) {
  expect(growthCss.includes(marker), `growth CSS missing ${marker}`);
}

for (const marker of ["skills-desktop", "skills-mobile", "skills-dark"]) {
  expect(captureScript.includes(marker), `growth capture script missing ${marker}`);
}

for (const [fileName, source] of [
  ["playful-precision-growth.css", growthCss],
  ["SkillsPageContent.jsx", skills],
  ["capture-ui-redesign-growth-review.mjs", captureScript]
]) {
  expect(!source.includes(temporaryPathMarker), `${fileName} must not reference temporary paths`);
}

if (failures.length) {
  console.error("ui redesign growth check failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  pages: 1,
  cssMarkers: 6,
  captureViews: 3
}, null, 2));
