import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const growthCssPath = path.join(root, "src", "styles", "playful-precision-growth.css");
const mainPath = path.join(root, "src", "main.jsx");
const overviewPath = path.join(root, "src", "features", "overview", "OverviewPageContent.jsx");
const planPath = path.join(root, "src", "features", "plan", "PlanPageContent.jsx");
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

const main = readText(mainPath);
const overview = readText(overviewPath);
const plan = readText(planPath);
const skills = readText(skillsPath);
const growthCss = readText(growthCssPath);
const captureScript = readText(capturePath);
const temporaryPathMarker = ["/", "tmp", "/"].join("");

const shellImport = 'import "./styles/playful-precision-shell.css";';
const growthImport = 'import "./styles/playful-precision-growth.css";';
expect(main.includes(growthImport), "src/main.jsx must import playful-precision-growth.css");
expect(
  main.indexOf(shellImport) !== -1
    && main.indexOf(growthImport) > main.indexOf(shellImport),
  "playful-precision-growth.css must import after playful-precision-shell.css"
);

for (const marker of [
  "qg-growth-page",
  "qg-overview-page",
  "qg-overview-hero",
  "qg-overview-heatmap",
  "qg-overview-leaderboard",
  'asset="hero"'
]) {
  expect(overview.includes(marker), `OverviewPageContent.jsx missing ${marker}`);
}

for (const marker of [
  "qg-growth-page",
  "qg-plan-page",
  "qg-plan-setup",
  "qg-plan-dashboard",
  "qg-plan-board"
]) {
  expect(plan.includes(marker), `PlanPageContent.jsx missing ${marker}`);
}

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

for (const [fileName, source, ids] of [
  ["OverviewPageContent.jsx", overview, ["heroTypewriter", "overviewProblemProgress", "leaderboardMetricSelect", "leaderboardScopeSelect"]],
  ["PlanPageContent.jsx", plan, ["prepPlanSetupForm", "prepPlanDashboard", "editPrepPlanBtn"]],
  ["SkillsPageContent.jsx", skills, ["skillsPageTitle", "skillRadar", "skillRadarTooltip", "skillsGrid"]]
]) {
  for (const id of ids) expect(source.includes(id), `${fileName} lost #${id}`);
}

for (const marker of [
  ".qg-growth-page",
  ".qg-overview-page",
  ".qg-overview-hero",
  ".qg-overview-heatmap",
  ".qg-overview-leaderboard",
  ".qg-plan-page",
  ".qg-plan-board",
  ".qg-plan-week",
  ".qg-skills-page",
  ".qg-skills-radar",
  ".qg-skill-grid",
  "@media (max-width: 760px)",
  "@media (prefers-reduced-motion: reduce)"
]) {
  expect(growthCss.includes(marker), `growth CSS missing ${marker}`);
}

for (const marker of [
  "overview-desktop",
  "overview-mobile",
  "plan-setup-desktop",
  "plan-dashboard-desktop",
  "plan-mobile",
  "skills-desktop",
  "skills-mobile",
  "skills-dark"
]) {
  expect(captureScript.includes(marker), `growth capture script missing ${marker}`);
}

for (const [fileName, source] of [
  ["playful-precision-growth.css", growthCss],
  ["OverviewPageContent.jsx", overview],
  ["PlanPageContent.jsx", plan],
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
  pages: 3,
  cssMarkers: 13,
  captureViews: 8
}, null, 2));
