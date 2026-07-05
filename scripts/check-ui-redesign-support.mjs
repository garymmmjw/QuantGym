import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const supportCssPath = path.join(root, "src", "styles", "playful-precision-support.css");
const mainPath = path.join(root, "src", "main.jsx");
const capturePath = path.join(root, "scripts", "capture-ui-redesign-support-review.mjs");
const sources = {
  experiences: [path.join(root, "src", "features", "experiences", "ExperiencesPageContent.jsx")],
  news: [
    path.join(root, "src", "features", "news", "NewsPageContent.jsx"),
    path.join(root, "src", "features", "news", "NewsFilters.jsx"),
    path.join(root, "src", "features", "news", "NewsList.jsx")
  ],
  community: [path.join(root, "src", "features", "community", "CommunityPageContent.jsx")],
  messages: [path.join(root, "src", "features", "messages", "MessagesPageContent.jsx")],
  network: [path.join(root, "src", "features", "network", "NetworkPageContent.jsx")],
  resume: [path.join(root, "src", "features", "resume", "ResumePageContent.jsx")],
  jobs: [path.join(root, "src", "features", "jobs", "JobsPageContent.jsx")],
  companies: [path.join(root, "src", "features", "companies", "CompaniesPageContent.jsx")],
  library: [path.join(root, "src", "features", "library", "LibraryPageContent.jsx")],
  courses: [path.join(root, "src", "features", "courses", "CoursesPageContent.jsx")],
  memory: [path.join(root, "src", "features", "memory", "MemoryPageContent.jsx")],
  settings: [path.join(root, "src", "features", "settings", "SettingsPageContent.jsx")],
  account: [path.join(root, "src", "features", "account", "AccountPageContent.jsx")]
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
const supportCss = readText(supportCssPath);
const captureScript = readText(capturePath);
const sourceText = Object.fromEntries(
  Object.entries(sources).map(([key, filePaths]) => [
    key,
    filePaths.map((filePath) => readText(filePath)).join("\n")
  ])
);
const temporaryPathMarker = ["/", "tmp", "/"].join("");

const trainingImport = 'import "./styles/playful-precision-training.css";';
const supportImport = 'import "./styles/playful-precision-support.css";';
expect(main.includes(supportImport), "src/main.jsx must import playful-precision-support.css");
expect(
  main.indexOf(trainingImport) !== -1
    && main.indexOf(supportImport) > main.indexOf(trainingImport),
  "playful-precision-support.css must import after playful-precision-training.css"
);

for (const [page, markers] of Object.entries({
  experiences: ["qg-support-page", "qg-experiences-page", "experienceForm", "experienceList"],
  news: ["qg-support-page", "qg-news-page", "newsTopicFilter", "newsList"],
  community: ["qg-support-page", "qg-community-page", "communityForm", "communityList"],
  messages: ["qg-support-page", "qg-messages-page", "messageThreadList", "messageComposerForm"],
  network: ["qg-support-page", "qg-network-page", "networkForm", "networkList"],
  resume: ["qg-support-page", "qg-resume-page", "resumeForm", "resumeReview"],
  jobs: ["qg-support-page", "qg-jobs-page", "jobsSummary", "jobsList"],
  companies: ["qg-support-page", "qg-companies-page", "companiesPageTitle", "companyOverviewList"],
  library: ["qg-support-page", "qg-library-page", "librarySearch", "libraryBookGrid"],
  courses: ["qg-support-page", "qg-courses-page", "learningPathTitle", "courseList"],
  memory: ["qg-support-page", "qg-memory-page", "resourceForm", "resourceList"],
  settings: ["qg-support-page", "qg-settings-page", "settingsForm", "settingsLanguageSelect"],
  account: ["qg-support-page", "qg-account-page", "accountForm", "accountNameInput"]
})) {
  for (const marker of markers) expect(sourceText[page].includes(marker), `${page} source missing ${marker}`);
}

for (const marker of [
  ".qg-support-page",
  ".qg-experiences-page",
  ".qg-news-page",
  ".qg-community-page",
  ".qg-messages-page",
  ".qg-network-page",
  ".qg-resume-page",
  ".qg-jobs-page",
  ".qg-companies-page",
  ".qg-library-page",
  ".qg-courses-page",
  ".qg-memory-page",
  ".qg-settings-page",
  ".qg-account-page",
  ":root[data-qg-theme=\"dark\"]",
  "@media (max-width: 760px)",
  "@media (prefers-reduced-motion: reduce)"
]) {
  expect(supportCss.includes(marker), `support CSS missing ${marker}`);
}

for (const marker of [
  "experiences-desktop",
  "experiences-mobile",
  "news-desktop",
  "news-mobile",
  "community-desktop",
  "community-mobile",
  "messages-desktop",
  "messages-mobile",
  "network-desktop",
  "network-mobile",
  "resume-desktop",
  "resume-mobile",
  "jobs-desktop",
  "jobs-mobile",
  "companies-desktop",
  "companies-mobile",
  "library-desktop",
  "library-mobile",
  "courses-desktop",
  "courses-mobile",
  "memory-desktop",
  "memory-mobile",
  "settings-desktop",
  "settings-mobile",
  "account-desktop",
  "account-mobile"
]) {
  expect(captureScript.includes(marker), `support capture script missing ${marker}`);
}

for (const [fileName, source] of [
  ["playful-precision-support.css", supportCss],
  ["capture-ui-redesign-support-review.mjs", captureScript],
  ...Object.entries(sourceText).map(([key, value]) => [`${key} source`, value])
]) {
  expect(!source.includes(temporaryPathMarker), `${fileName} must not reference temporary paths`);
}

if (failures.length) {
  console.error("ui redesign support check failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  pages: 13,
  cssMarkers: 17,
  captureViews: 26
}, null, 2));
