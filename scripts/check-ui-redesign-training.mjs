import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const trainingCssPath = path.join(root, "src", "styles", "playful-precision-training.css");
const mainPath = path.join(root, "src", "main.jsx");
const capturePath = path.join(root, "scripts", "capture-ui-redesign-training-review.mjs");
const sources = {
  interview: [
    path.join(root, "src", "features", "interview", "InterviewPageContent.jsx"),
    path.join(root, "src", "features", "interview", "InterviewConsole.jsx")
  ],
  problems: [path.join(root, "src", "features", "problems", "ProblemsPageContent.jsx")],
  tools: [path.join(root, "src", "features", "tools", "ToolsPageContent.jsx")],
  poker: [
    path.join(root, "src", "features", "poker", "PokerPageContent.jsx"),
    path.join(root, "src", "features", "poker", "PokerActionBar.jsx"),
    path.join(root, "src", "features", "poker", "PokerLobbyPanel.jsx"),
    path.join(root, "src", "features", "poker", "PokerPreflopMatrix.jsx"),
    path.join(root, "src", "features", "poker", "PokerSeatGrid.jsx"),
    path.join(root, "src", "features", "poker", "PokerTable.jsx")
  ],
  pk: [path.join(root, "src", "features", "pk", "PkPageContent.jsx")]
};

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
const trainingCss = readText(trainingCssPath);
const captureScript = readText(capturePath);
const sourceText = Object.fromEntries(
  Object.entries(sources).map(([key, filePaths]) => [
    key,
    filePaths.map((filePath) => readText(filePath)).join("\n")
  ])
);
const temporaryPathMarker = ["/", "tmp", "/"].join("");

const growthImport = 'import "./styles/playful-precision-growth.css";';
const trainingImport = 'import "./styles/playful-precision-training.css";';
expect(main.includes(trainingImport), "src/main.jsx must import playful-precision-training.css");
expect(
  main.indexOf(growthImport) !== -1
    && main.indexOf(trainingImport) > main.indexOf(growthImport),
  "playful-precision-training.css must import after playful-precision-growth.css"
);

for (const [page, markers] of Object.entries({
  interview: ["qg-training-page", "qg-interview-page", "qg-interview-setup", 'asset="interview"'],
  problems: ["qg-training-page", "qg-problems-page", "qg-problem-browser", 'asset="oops"'],
  tools: ["qg-training-page", "qg-tools-page", "qg-mental-arena"],
  poker: ["qg-training-page", "qg-poker-page", "qg-poker-table-world"],
  pk: ["qg-training-page", "qg-pk-page", "qg-pk-arena"]
})) {
  for (const marker of markers) expect(sourceText[page].includes(marker), `${page} source missing ${marker}`);
}

for (const [fileName, source, ids] of [
  ["InterviewPageContent.jsx", sourceText.interview, ["interviewSetup", "startInterviewBtn", "interviewConsole", "interviewForm", "interviewAnswer", "nextInterviewQuestionBtn"]],
  ["ProblemsPageContent.jsx", sourceText.problems, ["problemSearch", "problemList", "problemDetail", "problemRanking", "problemPagination", "problemCompletionProgress"]],
  ["ToolsPageContent.jsx", sourceText.tools, ["startDrillSessionBtn", "drillQuestion", "drillOptions", "drillFeedback", "marketBidInput", "marketAskInput", "submitMarketQuoteBtn"]],
  ["PokerPageContent.jsx", sourceText.poker, ["pokerLobbySummary", "pokerTable", "pokerSeatGrid", "pokerActionBar", "pokerPreflopMatrix", "pokerLeaveTableBtn"]],
  ["PkPageContent.jsx", sourceText.pk, ["startPkBtn", "pkProblem", "pkForm", "pkAnswer", "pkRevealBtn", "pkFeed"]]
]) {
  for (const id of ids) expect(source.includes(id), `${fileName} lost #${id}`);
}

for (const marker of [
  ".qg-training-page",
  ".qg-interview-page",
  ".qg-problems-page",
  ".qg-tools-page",
  ".qg-poker-page",
  ".qg-pk-page",
  ".qg-poker-table-world",
  ":root[data-qg-theme=\"dark\"]",
  "@media (max-width: 760px)",
  "@media (prefers-reduced-motion: reduce)"
]) {
  expect(trainingCss.includes(marker), `training CSS missing ${marker}`);
}

for (const marker of [
  "interview-desktop",
  "interview-mobile",
  "problems-desktop",
  "problems-mobile",
  "tools-desktop",
  "tools-mobile",
  "poker-desktop",
  "poker-mobile",
  "pk-desktop",
  "pk-mobile"
]) {
  expect(captureScript.includes(marker), `training capture script missing ${marker}`);
}

for (const [fileName, source] of [
  ["playful-precision-training.css", trainingCss],
  ["capture-ui-redesign-training-review.mjs", captureScript],
  ...Object.entries(sourceText).map(([key, value]) => [`${key} source`, value])
]) {
  expect(!source.includes(temporaryPathMarker), `${fileName} must not reference temporary paths`);
}

if (failures.length) {
  console.error("ui redesign training check failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  pages: 5,
  cssMarkers: 10,
  captureViews: 10
}, null, 2));
