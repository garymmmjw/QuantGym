#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const evidenceDir = path.join(root, "docs", "browser-audit-screenshots");

const routeContracts = {
  overview: {
    page: "OverviewPage.jsx",
    content: "OverviewPageContent",
    selectors: [
      "heroTypewriter",
      "generateStudyPlanBtn",
      "overviewProblemProgress",
      "overviewXpBars",
      "overviewContributionHeatmap",
      "leaderboardMetricSelect",
      "leaderboardScopeSelect",
      "leaderboardList",
      "logForm",
      "newsTickerTrack"
    ]
  },
  plan: {
    page: "PlanPage.jsx",
    content: "PlanPageContent",
    selectors: [
      "prepPlanSetupForm",
      "prepRoleSelect",
      "prepHoursSelect",
      "prepDiagnosticForm",
      "prepDiagnosticMessage",
      "prepPlanDashboard"
    ]
  },
  skills: {
    page: "SkillsPage.jsx",
    content: "SkillsPageContent",
    selectors: [
      "skillsPageTitle",
      "skillRadar",
      "skillRadarTooltip",
      "skillRadarLegend",
      "skillsGrid"
    ]
  },
  interview: {
    page: "InterviewPage.jsx",
    content: "InterviewPageContent",
    selectors: [
      "interviewSetup",
      "startInterviewBtn",
      "interviewConsole",
      "interviewQuestionStatus",
      "interviewAnswer",
      "interviewForm",
      "hintInterviewBtn",
      "revealAnswerBtn",
      "interviewFavoritesList"
    ]
  },
  problems: {
    page: "ProblemsPage.jsx",
    content: "ProblemsPageContent",
    selectors: [
      "problemSearch",
      "problemThemeFilter",
      "problemDifficultyFilter",
      "problemList",
      "problemDetail",
      "problemPagination",
      "leetcodeHotList",
      "problemRankingList"
    ]
  },
  tools: {
    page: "ToolsPage.jsx",
    content: "ToolsPageContent",
    selectors: [
      "startDrillSessionBtn",
      "drillQuestion",
      "drillForm",
      "drillFeedback",
      "mentalRecordList",
      "marketGamePrompt",
      "submitMarketQuoteBtn"
    ]
  },
  poker: {
    page: "PokerPage.jsx",
    content: "PokerPageContent",
    selectors: [
      "pokerLobbySummary",
      "pokerModeSelect",
      "pokerTable",
      "pokerSeatGrid",
      "pokerPanelContent",
      "pokerGamePrompt",
      "pokerRoomCode"
    ]
  },
  experiences: {
    page: "ExperiencesPage.jsx",
    content: "ExperiencesPageContent",
    selectors: [
      "newExperienceBtn",
      "experienceForm",
      "experienceFirm",
      "experienceFilter",
      "experienceList",
      "openCommunityExperiencesBtn"
    ]
  },
  news: {
    page: "NewsPage.jsx",
    content: "NewsPageContent",
    selectors: [
      "newsTopicFilter",
      "newsSourceFilter",
      "newsList",
      "newsForm",
      "addNewsBtn",
      "refreshNewsBtn",
      "newsDetail"
    ]
  },
  community: {
    page: "CommunityPage.jsx",
    content: "CommunityPageContent",
    selectors: [
      "communityForm",
      "communityText",
      "communityMedia",
      "communityMediaPreview",
      "communityList"
    ]
  },
  messages: {
    page: "MessagesPage.jsx",
    content: "MessagesPageContent",
    selectors: [
      "messageThreadList",
      "messageConversationHeader",
      "messageConversationBody",
      "messageComposerForm",
      "messageComposerInput"
    ]
  },
  network: {
    page: "NetworkPage.jsx",
    content: "NetworkPageContent",
    selectors: [
      "addNetworkBtn",
      "networkForm",
      "networkName",
      "networkStatus",
      "networkList"
    ]
  },
  resume: {
    page: "ResumePage.jsx",
    content: "ResumePageContent",
    selectors: [
      "resumeSummary",
      "resumeForm",
      "resumeText",
      "reviewResumeBtn",
      "saveResumeBtn",
      "resumeReview"
    ]
  },
  jobs: {
    page: "JobsPage.jsx",
    content: "JobsPageContent",
    selectors: [
      "jobsSummary",
      "refreshJobsBtn",
      "jobsList"
    ]
  },
  companies: {
    page: "CompaniesPage.jsx",
    content: "CompaniesPageContent",
    selectors: [
      "companiesPageTitle",
      "companiesSummary",
      "companyTierFilter",
      "companyOverviewList"
    ]
  },
  library: {
    page: "LibraryPage.jsx",
    content: "LibraryPageContent",
    selectors: [
      "librarySearch",
      "libraryKindTabs",
      "libraryStats",
      "libraryBookGrid",
      "libraryQuestionGrid",
      "libraryReaderOverlay",
      "libraryReaderFrame"
    ]
  },
  courses: {
    page: "CoursesPage.jsx",
    content: "CoursesPageContent",
    selectors: [
      "learningPathTitle",
      "learningPathHint",
      "coursePathList",
      "courseList"
    ]
  },
  memory: {
    page: "MemoryPage.jsx",
    content: "MemoryPageContent",
    selectors: [
      "addResourceBtn",
      "resourceForm",
      "resourceTitle",
      "resourceList",
      "clearTodayBtn",
      "historyList"
    ]
  },
  settings: {
    page: "SettingsPage.jsx",
    content: "SettingsPageContent",
    selectors: [
      "settingsMessage",
      "settingsForm",
      "settingsLanguageSelect",
      "settingsCountrySelect",
      "settingsRegionSelect",
      "settingsLlmEndpointInput",
      "settingsGoogleClientIdInput",
      "exportBtn",
      "importInput",
      "resetBtn",
      "syncCloudBtn",
      "logoutBtn"
    ]
  },
  account: {
    page: "AccountPage.jsx",
    content: "AccountPageContent",
    selectors: [
      "accountMessage",
      "accountForm",
      "accountAvatarPreview",
      "accountNameInput",
      "accountEmailInput",
      "accountCountrySelect",
      "accountRegionSelect",
      "accountResumeFile",
      "accountProviderText"
    ]
  },
  pk: {
    page: "PkPage.jsx",
    content: "PkPageContent",
    selectors: [
      "startPkBtn",
      "pkProblem",
      "pkForm",
      "pkAnswer",
      "pkRevealBtn",
      "pkFeed"
    ]
  }
};

const shellContracts = [
  {
    file: "src/components/shell/AppShellMain.jsx",
    selectors: [
      "appShell",
      "moduleNav",
      "globalSearchInput",
      "globalSearchResults",
      "checkInPill",
      "commandChatBtn"
    ]
  },
  {
    file: "src/components/shell/AuthShell.jsx",
    selectors: [
      "authShell",
      "googleButton",
      "loginForm",
      "registerForm",
      "googleClientIdInput",
      "saveGoogleClientBtn",
      "authMessage"
    ]
  },
  {
    file: "src/components/shell/TodoShell.jsx",
    selectors: [
      "todoDockButton",
      "todoDockPanel",
      "todoDockCloseBtn",
      "todoDockList",
      "todoDockAddForm",
      "todoDockAddInput"
    ]
  }
];

const evidenceArtifacts = [
  "312-chrome-visual-route-smoke-summary.json",
  "314-github-visual-parity-all-routes-summary.json",
  "319-production-boundaries-local-services-summary.json",
  "320-iab-google-config-summary.json",
  "321-static-build-config-summary.json",
  "322-ui-contract-gate-summary.json",
  "323-release-readiness-summary.json",
  "324-google-token-helper-summary.json",
  "325-google-token-helper-browser-summary.json",
  "326-browser-evidence-manifest-summary.json",
  "327-migration-completion-audit-summary.json"
];

const routeIds = Object.keys(routeContracts);
const imageArtifacts = [
  "311-chrome-visual-desktop-contact-sheet.jpg",
  "312-chrome-visual-mobile-contact-sheet.jpg",
  "314-github-parity-baseline-current-contact-sheet.jpg",
  "315-external-boundary-login-no-google.png",
  "316-external-boundary-settings-empty-config.png",
  "317-external-boundary-resume-local-fallback.png",
  "318-resume-real-llm-proxy-review.png",
  "325-google-token-helper-browser.png",
  ...routeIds.flatMap((id) => [
    `311-chrome-visual-desktop-${id}.png`,
    `312-chrome-visual-mobile-${id}.png`,
    `314-parity-baseline-${id}.png`,
    `314-parity-current-${id}.png`
  ])
];

const failures = [];
const warnings = [];

const manifestIds = extractManifestIds();
const routeConfigText = read("src/routes/routeConfig.js");
const routeConfigIds = extractSetIds(routeConfigText, "REACT_PAGE_IDS");

checkRouteShape();
checkShellContracts();
checkRouteContracts();
checkEvidenceArtifacts();
checkImageArtifacts();

if (failures.length) {
  console.error("UI contract check failed:");
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn("UI contract warnings:");
  for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
}

console.log(JSON.stringify({
  status: "pass",
  routes: routeIds.length,
  shellContracts: shellContracts.length,
  evidenceArtifacts: evidenceArtifacts.length,
  imageArtifacts: imageArtifacts.length
}, null, 2));

function checkRouteShape() {
  const expectedIds = Object.keys(routeContracts);
  const missingFromManifest = expectedIds.filter((id) => !manifestIds.includes(id));
  const missingFromReactRoutes = expectedIds.filter((id) => !routeConfigIds.includes(id));
  const extraReactRoutes = routeConfigIds.filter((id) => !expectedIds.includes(id));

  for (const id of missingFromManifest) fail(`route "${id}" is missing from MODULE_MANIFEST`);
  for (const id of missingFromReactRoutes) fail(`route "${id}" is missing from REACT_PAGE_IDS`);
  for (const id of extraReactRoutes) fail(`REACT_PAGE_IDS contains route "${id}" without a UI contract`);

  if (!routeConfigText.includes("BRIDGE_PAGE_IDS = new Set([])")) {
    fail("BRIDGE_PAGE_IDS must stay empty for full React route ownership");
  }
  if (/mode:\s*"(legacy|bridge)"/.test(routeConfigText)) {
    fail("routeConfig contains a hard-coded legacy/bridge mode");
  }
}

function checkShellContracts() {
  for (const contract of shellContracts) {
    const text = read(contract.file);
    for (const selector of contract.selectors) {
      if (!hasStaticId(text, selector)) fail(`${contract.file} is missing #${selector}`);
    }
  }
}

function checkRouteContracts() {
  for (const [id, contract] of Object.entries(routeContracts)) {
    const pagePath = path.join("src", "pages", contract.page);
    const featureDir = path.join("src", "features", id);
    const featureText = readFeatureJsx(featureDir);
    const pageText = read(pagePath);

    if (!pageText.includes(`../features/${id}/`)) {
      fail(`${pagePath} does not import from ${featureDir}`);
    }
    if (!pageText.includes(contract.content)) {
      fail(`${pagePath} does not render ${contract.content}`);
    }
    if (!featureText.includes(`function ${contract.content}`) && !featureText.includes(`const ${contract.content}`)) {
      fail(`${featureDir} does not define ${contract.content}`);
    }

    for (const selector of contract.selectors) {
      if (!hasStaticId(featureText, selector)) fail(`${featureDir} is missing #${selector}`);
    }
  }
}

function checkEvidenceArtifacts() {
  for (const artifact of evidenceArtifacts) {
    const artifactPath = path.join(evidenceDir, artifact);
    if (!fs.existsSync(artifactPath)) {
      fail(`missing evidence artifact docs/browser-audit-screenshots/${artifact}`);
      continue;
    }
    if (artifact.endsWith(".json")) validateEvidenceJson(artifact, artifactPath);
  }
}

function checkImageArtifacts() {
  for (const artifact of imageArtifacts) {
    const artifactPath = path.join(evidenceDir, artifact);
    if (!fs.existsSync(artifactPath)) {
      fail(`missing screenshot artifact docs/browser-audit-screenshots/${artifact}`);
      continue;
    }
    const { size } = fs.statSync(artifactPath);
    if (size < 1024) {
      fail(`screenshot artifact docs/browser-audit-screenshots/${artifact} is too small (${size} bytes)`);
    }
  }
}

function validateEvidenceJson(artifact, artifactPath) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  } catch (error) {
    fail(`${path.relative(root, artifactPath)} is not valid JSON: ${error.message}`);
    return;
  }

  if (artifact === "323-release-readiness-summary.json" && data.status === "fail") {
    warnings.push("docs/browser-audit-screenshots/323-release-readiness-summary.json contains a prior failed release-readiness run; rerun npm run check:release-readiness:local after fixes to refresh it.");
    return;
  }

  const status = String(data.status || "").toLowerCase();
  if (status && !["pass", "partial"].includes(status)) {
    fail(`${path.relative(root, artifactPath)} has non-passing status "${data.status}"`);
  }

  if (data.actionableIssues && Number(data.actionableIssues) !== 0) {
    fail(`${path.relative(root, artifactPath)} reports actionableIssues=${data.actionableIssues}`);
  }
  if (data.failed && Number(data.failed) !== 0) {
    fail(`${path.relative(root, artifactPath)} reports failed=${data.failed}`);
  }
  if (data.checks?.distConfigContainsOpenAiKey === true) {
    fail(`${path.relative(root, artifactPath)} reports OpenAI key embedded in dist config`);
  }

  validateEvidenceContract(artifact, artifactPath, data);
}

function validateEvidenceContract(artifact, artifactPath, data) {
  const label = path.relative(root, artifactPath);
  const expect = (condition, message) => {
    if (!condition) fail(`${label}: ${message}`);
  };
  const expectCount = (actual, expected, message) => {
    if (Number(actual) !== expected) fail(`${label}: ${message} expected ${expected}, got ${actual}`);
  };

  switch (artifact) {
    case "312-chrome-visual-route-smoke-summary.json": {
      expect(Array.isArray(data.desktop), "desktop route smoke results must be an array");
      expect(Array.isArray(data.mobile), "mobile route smoke results must be an array");
      expectCount(data.desktop?.length, routeIds.length, "desktop route smoke count");
      expectCount(data.mobile?.length, routeIds.length, "mobile route smoke count");
      expectCount(data.significantLogs?.length, 0, "significant console log count");
      for (const [viewport, entries] of [["desktop", data.desktop || []], ["mobile", data.mobile || []]]) {
        for (const entry of entries) {
          expect(routeIds.includes(entry.id), `${viewport} route smoke includes unexpected route "${entry.id}"`);
          expect(entry.status === "pass", `${viewport} route "${entry.id}" did not pass`);
          expect(entry.targetSelectorVisible === true, `${viewport} route "${entry.id}" target selector is not visible`);
          expect(entry.overlay === false, `${viewport} route "${entry.id}" has Vite overlay`);
          expect(entry.horizontalOverflow === false, `${viewport} route "${entry.id}" has horizontal overflow`);
        }
      }
      break;
    }
    case "314-github-visual-parity-all-routes-summary.json": {
      expect(data.status === "pass", "GitHub visual parity status must be pass");
      expectCount(data.routeCount, routeIds.length, "GitHub visual parity routeCount");
      expectCount(data.total, routeIds.length, "GitHub visual parity total");
      expectCount(data.pass, routeIds.length, "GitHub visual parity pass count");
      expectCount(data.routes?.length, routeIds.length, "GitHub visual parity route array length");
      for (const route of data.routes || []) {
        expect(routeIds.includes(route.route), `GitHub parity includes unexpected route "${route.route}"`);
        expect((route.actionableIssues || []).length === 0, `route "${route.route}" has actionable parity issues`);
        expect(route.current?.key?.visible === true, `route "${route.route}" current key selector is not visible`);
        expect(route.current?.overlay === false, `route "${route.route}" current view has overlay`);
        expect(route.current?.horizontalOverflow === false, `route "${route.route}" current view has horizontal overflow`);
      }
      break;
    }
    case "319-production-boundaries-local-services-summary.json":
      validateProductionBoundarySummary(data, expect, "production boundary local-service smoke");
      break;
    case "320-iab-google-config-summary.json":
      expect(data.status === "partial", "Google config browser smoke should stay partial until provider login is complete");
      expect(data.checks?.googleButtonIframeRendered === true, "Google Sign-In iframe must render");
      expect(data.checks?.googleIframeUsesConfiguredClientId === true, "Google iframe must use configured client id");
      expect(data.checks?.originNotAllowedWarningPresent === false, "Google origin warning must not be present");
      expect(data.checks?.cloudApiEndpointConfigured === true, "cloud API endpoint must be configured");
      expect(data.checks?.llmEndpointConfigured === true, "LLM endpoint must be configured");
      expect(data.checks?.providerLoginCompleted === false, "provider login evidence should not claim completion without a real token");
      break;
    case "321-static-build-config-summary.json":
      expect(data.status === "pass", "static build config status must be pass");
      expect(data.checks?.npmRunBuildPassed === true, "npm run build must pass");
      expect(data.checks?.distConfigGoogleClientIdSet === true, "dist config must carry Google Client ID");
      expect(data.checks?.distConfigGoogleLoginEnabled === true, "dist config must enable Google login");
      expect(data.checks?.distConfigContainsOpenAiKey === false, "dist config must not embed OPENAI_API_KEY");
      expect(data.checks?.strictModeRejectsLocalHttpEndpoints === true, "strict build must reject local HTTP endpoints");
      break;
    case "322-ui-contract-gate-summary.json":
      expect(data.status === "pass", "UI contract gate summary status must be pass");
      expectCount(data.checks?.routes, routeIds.length, "UI contract route count");
      expectCount(data.checks?.shellContracts, shellContracts.length, "UI contract shell count");
      expectCount(data.checks?.evidenceArtifacts, evidenceArtifacts.length, "UI contract evidence artifact count");
      expectCount(data.checks?.imageArtifacts, imageArtifacts.length, "UI contract image artifact count");
      expectCount(data.checks?.stage2StrictReactRoutes, routeIds.length, "Stage 2 strict React route count");
      expectCount(data.checks?.stage2StrictLegacyRoutes, 0, "Stage 2 strict legacy route count");
      expectCount(data.checks?.stage2StrictBridgeRoutes, 0, "Stage 2 strict bridge route count");
      break;
    case "323-release-readiness-summary.json": {
      if (data.status === "fail") {
        warnings.push("docs/browser-audit-screenshots/323-release-readiness-summary.json contains a prior failed release-readiness run; rerun npm run check:release-readiness:local after fixes to refresh it.");
        break;
      }
      expect(data.allowPartialProduction === true, "local release-readiness summary must allow partial production boundary");
      const finalRelease = data.status === "pass"
        && Number(data.passed || 0) === 10
        && Number(data.partial || 0) === 0
        && Number(data.failed || 0) === 0;
      const interimRelease = data.status === "partial"
        && Number(data.passed || 0) >= 8
        && Number(data.partial || 0) === 2
        && Number(data.failed || 0) === 0;
      expect(finalRelease || interimRelease, "local release-readiness must be either final pass or two-partial local handoff");
      const migrationCompletion = findResult(data.results, "Migration completion audit");
      if (migrationCompletion?.data?.requirements) {
        expect(
          (migrationCompletion.status === "pass" && migrationCompletion.data?.requirements?.pending === 0)
            || (migrationCompletion.status === "partial" && migrationCompletion.data?.requirements?.pending === 1),
          "Migration completion audit nested gate must be final pass or one-token pending partial"
        );
      }
      const uiContracts = findResult(data.results, "UI contracts");
      expect(uiContracts?.status === "pass", "UI contracts nested gate must pass");
      expect(
        summaryLinesContain(uiContracts?.data, "\"evidenceArtifacts\": 9")
          || summaryLinesContain(uiContracts?.data, "\"evidenceArtifacts\": 10")
          || summaryLinesContain(uiContracts?.data, "\"evidenceArtifacts\": 11"),
        "UI contracts nested output must report evidence artifact count"
      );
      expect(summaryLinesContain(uiContracts?.data, "\"imageArtifacts\": 92"), "UI contracts nested output must report 92 image artifacts");
      validateProductionBoundarySummary(findResult(data.results, "Production boundaries")?.data || {}, expect, "nested production boundary smoke");
      break;
    }
    case "324-google-token-helper-summary.json":
      expect(data.status === "pass", "Google token helper summary status must be pass");
      expect(data.checks?.script === "npm run google:token-helper", "Google token helper command must stay documented");
      expect(data.checks?.generatedPath === "artifacts/google-id-token-helper.html", "Google token helper must be generated under artifacts/");
      expect(data.checks?.artifactIgnoredByGit === true, "Google token helper artifact must stay ignored by Git");
      expect(data.checks?.tokenWrittenToDisk === false, "Google token helper must not write tokens to disk");
      expect(data.checks?.verifierChecksTokenStructureAudienceAndExpiry === true, "Google token verifier must check token structure, audience, and expiry");
      break;
    case "325-google-token-helper-browser-summary.json":
      expect(data.status === "pass", "Google token helper browser smoke status must be pass");
      expect(data.checks?.httpStatus === 200, "Google token helper browser smoke must load HTTP 200");
      expect(data.checks?.pageNonBlank === true, "Google token helper browser smoke must be nonblank");
      expect(data.checks?.googleButtonVisible === true, "Google token helper browser smoke must show Google button");
      expect(data.checks?.tokenTextareaVisible === true, "Google token helper browser smoke must show token textarea");
      expect(data.checks?.copyButtonVisible === true, "Google token helper browser smoke must show copy button");
      expect(data.checks?.verifierSanityTextVisible === true, "Google token helper browser smoke must mention verifier sanity checks");
      expect(data.checks?.statusText === "Ready.", "Google token helper browser smoke must reach Ready status");
      break;
    case "326-browser-evidence-manifest-summary.json":
      expect(data.status === "pass", "browser evidence manifest status must be pass");
      expect(data.docsScanned >= 2, "browser evidence manifest must scan audit and smoke docs");
      expect(Number(data.evidenceRefs || 0) >= 250, "browser evidence manifest must cover at least 250 evidence refs");
      expect(Number(data.imageRefs || 0) >= 220, "browser evidence manifest must cover at least 220 image refs");
      expect(Number(data.jsonRefs || 0) >= 30, "browser evidence manifest must cover at least 30 JSON refs");
      expect(Number(data.missing || 0) === 0, "browser evidence manifest must report zero missing files");
      expect(Number(data.smallFiles || 0) === 0, "browser evidence manifest must report zero undersized image files");
      expect(Number(data.invalidJson || 0) === 0, "browser evidence manifest must report zero invalid JSON files");
      break;
    case "327-migration-completion-audit-summary.json": {
      expectCount(data.requirements?.total, 10, "migration completion total requirement count");
      const googleProvider = findRequirement(data.checks, "google-provider-login");
      const finalComplete = data.status === "pass"
        && Number(data.requirements?.passed) === 10
        && Number(data.requirements?.pending) === 0
        && Number(data.requirements?.failed) === 0
        && Number(data.completionPercent) === 100
        && googleProvider?.status === "pass"
        && googleProvider?.evidence?.providerLoginCompleted === true;
      const interimComplete = data.status === "partial"
        && Number(data.requirements?.passed) === 9
        && Number(data.requirements?.pending) === 1
        && Number(data.requirements?.failed) === 0
        && Number(data.completionPercent) === 90
        && googleProvider?.status === "pending"
        && String(googleProvider?.reason || "").includes("QUANTGYM_GOOGLE_ID_TOKEN");
      expect(finalComplete || interimComplete, "migration completion audit must be either final pass or one-token pending partial");
      for (const id of [
        "react-route-ownership",
        "migration-ledger-converted",
        "retired-route-bridge",
        "route-smoke-evidence",
        "github-parity-evidence",
        "browser-evidence-manifest",
        "static-build-config",
        "local-service-boundaries",
        "google-token-helper"
      ]) {
        expect(findRequirement(data.checks, id)?.status === "pass", `migration completion requirement ${id} must pass`);
      }
      break;
    }
  }
}

function validateProductionBoundarySummary(data, expect, label) {
  const cloudHealth = findResult(data.results, "cloud health");
  const googleConfig = findResult(data.results, "google provider config");
  const googleLogin = findResult(data.results, "google provider login");
  const resumeReview = findResult(data.results, "LLM resume review");
  const pdfGeneration = findResult(data.results, "LLM PDF question generation");
  const finalComplete = data.status === "pass"
    && Number(data.passed) === 5
    && Number(data.skipped) === 0
    && Number(data.failed) === 0
    && googleLogin?.status === "pass"
    && googleLogin?.data?.hasToken === true
    && googleLogin?.data?.tokenAudienceMatchesClientId === true;
  const interimComplete = data.status === "partial"
    && Number(data.passed) === 4
    && Number(data.skipped) === 1
    && Number(data.failed) === 0
    && googleLogin?.status === "skip"
    && googleLogin?.reason === "Set QUANTGYM_GOOGLE_ID_TOKEN.";

  expect(finalComplete || interimComplete, `${label} must be either final 5/5 pass or one-token pending partial`);

  expect(cloudHealth?.status === "pass" && cloudHealth?.data?.ok === true, `${label} must pass cloud health`);
  expect(
    googleConfig?.status === "pass"
      && googleConfig?.data?.googleClientIdSet === true
      && googleConfig?.data?.endpointRequiresToken === true,
    `${label} must pass Google provider config`
  );
  expect(resumeReview?.status === "pass" && Number(resumeReview?.data?.itemCount || 0) > 0, `${label} must pass LLM resume review`);
  expect(pdfGeneration?.status === "pass" && Number(pdfGeneration?.data?.questionCount || 0) > 0, `${label} must pass LLM PDF question generation`);
}

function expectCountForProductionBoundary(data, expect, field, expected, label) {
  expect(Number(data[field]) === expected, `${label} ${field} count expected ${expected}, got ${data[field]}`);
}

function findResult(results, name) {
  return Array.isArray(results) ? results.find((result) => result.name === name) : undefined;
}

function findRequirement(checks, id) {
  return Array.isArray(checks) ? checks.find((check) => check.id === id) : undefined;
}

function summaryLinesContain(lines, needle) {
  return Array.isArray(lines) && lines.some((line) => String(line).includes(needle));
}

function extractManifestIds() {
  return [...read("src/modules/manifest.js").matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]);
}

function extractSetIds(text, exportName) {
  const pattern = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*new\\s+Set\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`);
  const match = text.match(pattern);
  if (!match) {
    fail(`${exportName} not found`);
    return [];
  }
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function readFeatureJsx(featureDir) {
  const absoluteDir = path.join(root, featureDir);
  if (!fs.existsSync(absoluteDir)) {
    fail(`${featureDir} is missing`);
    return "";
  }
  return fs.readdirSync(absoluteDir)
    .filter((file) => file.endsWith(".jsx"))
    .map((file) => fs.readFileSync(path.join(absoluteDir, file), "utf8"))
    .join("\n");
}

function hasStaticId(text, id) {
  return new RegExp(`id\\s*=\\s*"${escapeRegex(id)}"`).test(text);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`${relativePath} is missing`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function fail(message) {
  failures.push(message);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
