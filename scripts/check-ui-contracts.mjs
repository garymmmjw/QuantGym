#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const skipReleaseSummaryContent = args.includes("--skip-release-summary-content")
  || process.env.QUANTGYM_UI_CONTRACT_SKIP_RELEASE_SUMMARY_CONTENT === "1";
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
  "327-migration-completion-audit-summary.json",
  "328-browser-route-smoke-summary.json",
  "329-media-storage-runtime-smoke-summary.json",
  "330-jobs-source-runtime-smoke-summary.json",
  "353-jobs-public-ats-static-feed-summary.json",
  "354-deployed-jobs-api-source-summary.json",
  "331-postgres-cutover-export-smoke-summary.json",
  "332-browser-extension-runtime-smoke-summary.json",
  "333-production-boundaries-deployed-services-summary.json",
  "351-deployed-beta-smoke-summary.json",
  "352-deployed-beta-mobile-content-smoke-summary.json",
  "334-ops-alert-runtime-smoke-summary.json",
  "335-question-bank-rights-public-smoke-summary.json",
  "336-ops-alert-production-fixture-summary.json",
  "337-media-storage-production-fixture-summary.json",
  "338-jobs-source-production-fixture-summary.json",
  "339-chrome-store-publication-fixture-summary.json",
  "340-question-bank-rights-release-blockers-summary.json",
  "345-question-bank-rights-packet-summary.json",
  "346-ops-alert-edge-packet-summary.json",
  "347-media-storage-packet-summary.json",
  "348-chrome-store-publication-packet-summary.json",
  "349-jobs-feed-publication-packet-summary.json",
  "350-postgres-cutover-packet-summary.json",
  "355-apex-www-domain-summary.json",
  "341-external-launch-blockers-summary.json"
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
checkGoogleTokenGateScripts();

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

function checkGoogleTokenGateScripts() {
  const packageJson = JSON.parse(read("package.json"));
  const scripts = packageJson.scripts || {};
  const expectedScripts = {
    "verify:production-boundaries:paste-token": "node scripts/run-google-token-gate.mjs --verify",
    "check:release-readiness:local:paste-token": "node scripts/run-google-token-gate.mjs --release-readiness-local"
  };
  for (const [name, command] of Object.entries(expectedScripts)) {
    if (scripts[name] !== command) fail(`package.json script "${name}" must be "${command}"`);
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
    if (!skipReleaseSummaryContent) return;
  }

  if (artifact === "323-release-readiness-summary.json" && skipReleaseSummaryContent) {
    warnings.push("Skipping release-readiness summary content validation because check:ui-contracts is running inside the release-readiness gate.");
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
      const releaseResults = Array.isArray(data.results) ? data.results : [];
      const finalRelease = data.status === "pass"
        && Number(data.partial || 0) === 0
        && Number(data.failed || 0) === 0
        && Number(data.passed || 0) >= 10
        && releaseResults.every((result) => result.status === "pass");
      const productionBoundaries = findResult(releaseResults, "Production boundaries");
      const productionOnlyHandoff = data.status === "partial"
        && Number(data.passed || 0) >= 9
        && Number(data.partial || 0) === 1
        && Number(data.failed || 0) === 0
        && productionBoundaries?.status === "partial"
        && releaseResults.every((result) => (
          result.name === "Production boundaries"
            ? result.status === "partial"
            : result.status === "pass"
        ));
      const interimRelease = data.status === "partial"
        && Number(data.passed || 0) >= 8
        && Number(data.partial || 0) === 2
        && Number(data.failed || 0) === 0;
      expect(
        finalRelease || productionOnlyHandoff || interimRelease,
        "local release-readiness must be final pass, production-token-only partial, or two-partial local handoff"
      );
      const migrationCompletion = findResult(releaseResults, "Migration completion audit");
      if (migrationCompletion?.data?.requirements) {
        expect(
          (migrationCompletion.status === "pass" && migrationCompletion.data?.requirements?.pending === 0)
            || (migrationCompletion.status === "partial" && migrationCompletion.data?.requirements?.pending === 1),
          "Migration completion audit nested gate must be final pass or one-token pending partial"
        );
      }
      const uiContracts = findResult(releaseResults, "UI contracts");
      expect(uiContracts?.status === "pass", "UI contracts nested gate must pass");
      const uiContractOutputHasCurrentArtifactCount = summaryLinesContain(uiContracts?.data, `"evidenceArtifacts": ${evidenceArtifacts.length}`);
      const uiContractOutputHasPrePacketArtifactCount = summaryLinesContain(uiContracts?.data, "\"evidenceArtifacts\": 30");
      expect(
        uiContractOutputHasCurrentArtifactCount || uiContractOutputHasPrePacketArtifactCount,
        "UI contracts nested output must report evidence artifact count"
      );
      if (uiContractOutputHasPrePacketArtifactCount && !uiContractOutputHasCurrentArtifactCount) {
        warnings.push("Release-readiness summary contains the pre-packet UI-contract evidence count; rerun npm run check:release-readiness:local after production-boundary dependencies are available.");
      }
      expect(summaryLinesContain(uiContracts?.data, "\"imageArtifacts\": 92"), "UI contracts nested output must report 92 image artifacts");
      const postgresCutover = findResult(releaseResults, "Postgres cutover");
      if (postgresCutover) {
        expect(postgresCutover.status === "pass", "Postgres cutover nested gate must pass when present");
        expect(postgresCutover.data?.status === "pass", "Postgres cutover nested data status must pass when present");
      }
      const routeInteractions = findResult(releaseResults, "Route interactions");
      if (routeInteractions) {
        expect(routeInteractions.status === "pass", "Route interactions nested gate must pass when present");
        expect(routeInteractions.data?.status === "pass", "Route interactions nested data status must pass when present");
        expect(Number(routeInteractions.data?.routes || 0) === routeIds.length, "Route interactions nested gate must cover all routes when present");
      }
      const browserRouteSmoke = findResult(releaseResults, "Browser route smoke");
      if (browserRouteSmoke) {
        validateBrowserRouteSmokeSummary(browserRouteSmoke.data || {}, expect, "nested browser route smoke");
      }
      const moduleOwnership = findResult(releaseResults, "Module ownership");
      if (moduleOwnership) {
        expect(moduleOwnership.status === "pass", "Module ownership nested gate must pass when present");
        validateModuleOwnershipSummary(moduleOwnership.data || {}, expect, "nested module ownership");
      }
      const chromeStoreReadiness = findResult(releaseResults, "Chrome store readiness");
      if (chromeStoreReadiness) {
        validateChromeStoreReadinessSummary(chromeStoreReadiness.data || {}, expect, "nested Chrome store readiness");
      }
      const chromeStorePublicationFixture = findResult(releaseResults, "Chrome store publication fixture");
      if (chromeStorePublicationFixture) {
        validateChromeStorePublicationFixtureSummary(chromeStorePublicationFixture.data || {}, expect, "nested Chrome store publication fixture");
      }
      const browserExtensionRuntimeSmoke = findResult(releaseResults, "Browser extension runtime smoke");
      if (browserExtensionRuntimeSmoke) {
        validateBrowserExtensionRuntimeSmokeSummary(browserExtensionRuntimeSmoke.data || {}, expect, "nested browser extension runtime smoke");
      }
      const mediaStorageRuntimeSmoke = findResult(releaseResults, "Media storage runtime smoke");
      if (mediaStorageRuntimeSmoke) {
        validateMediaStorageRuntimeSmokeSummary(mediaStorageRuntimeSmoke.data || {}, expect, "nested media storage runtime smoke");
      }
      const mediaStorageProductionFixture = findResult(releaseResults, "Media storage production fixture");
      if (mediaStorageProductionFixture) {
        validateMediaStorageProductionFixtureSummary(mediaStorageProductionFixture.data || {}, expect, "nested media storage production fixture");
      }
      const opsAlertRuntimeSmoke = findResult(releaseResults, "Ops alert runtime smoke");
      if (opsAlertRuntimeSmoke) {
        validateOpsAlertRuntimeSmokeSummary(opsAlertRuntimeSmoke.data || {}, expect, "nested ops alert runtime smoke");
      }
      const opsAlertProductionFixture = findResult(releaseResults, "Ops alert production fixture");
      if (opsAlertProductionFixture) {
        validateOpsAlertProductionFixtureSummary(opsAlertProductionFixture.data || {}, expect, "nested ops alert production fixture");
      }
      const jobsSourceRuntimeSmoke = findResult(releaseResults, "Jobs source runtime smoke");
      if (jobsSourceRuntimeSmoke) {
        validateJobsSourceRuntimeSmokeSummary(jobsSourceRuntimeSmoke.data || {}, expect, "nested jobs source runtime smoke");
      }
      const jobsSourceProductionFixture = findResult(releaseResults, "Jobs source production fixture");
      if (jobsSourceProductionFixture) {
        validateJobsSourceProductionFixtureSummary(jobsSourceProductionFixture.data || {}, expect, "nested jobs source production fixture");
      }
      const questionBankRights = findResult(releaseResults, "Question-bank rights");
      if (questionBankRights) {
        validateQuestionBankRightsSummary(questionBankRights.data || {}, expect, "nested question-bank rights");
      }
      const questionBankRightsPublicSmoke = findResult(releaseResults, "Question-bank rights public smoke");
      if (questionBankRightsPublicSmoke) {
        validateQuestionBankRightsPublicSmokeSummary(questionBankRightsPublicSmoke.data || {}, expect, "nested question-bank rights public smoke");
      }
      const questionBankRightsReleaseBlockers = findResult(releaseResults, "Question-bank rights release blockers");
      if (questionBankRightsReleaseBlockers) {
        validateQuestionBankRightsReleaseBlockersSummary(questionBankRightsReleaseBlockers.data || {}, expect, "nested question-bank rights release blockers");
      }
      const externalLaunchBlockers = findResult(releaseResults, "External launch blockers");
      expect(externalLaunchBlockers?.status === "pass", "External launch blockers nested gate must pass");
      expect(externalLaunchBlockers?.data?.status === "pass", "External launch blockers nested data status must pass");
      expect(
        Array.isArray(externalLaunchBlockers?.data?.blockers)
          && externalLaunchBlockers.data.blockers.some((blocker) => blocker?.id === "postgres-managed-cutover"),
        "External launch blockers nested gate must include the Postgres cutover blocker"
      );
      const postgresCutoverExportSmoke = findResult(releaseResults, "Postgres cutover export smoke");
      if (postgresCutoverExportSmoke) {
        expect(postgresCutoverExportSmoke.status === "pass", "Postgres cutover export smoke nested gate must pass when present");
        expect(postgresCutoverExportSmoke.data?.status === "pass", "Postgres cutover export smoke nested data status must pass when present");
        expect(
          postgresCutoverExportSmoke.data?.cutoverChecks?.completeSignoffNegativeFixturesRejected === true,
          "Postgres cutover export smoke nested gate must retain negative signoff fixture coverage"
        );
      }
      validateProductionBoundarySummary(productionBoundaries?.data || {}, expect, "nested production boundary smoke");
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
    case "328-browser-route-smoke-summary.json":
      validateBrowserRouteSmokeSummary(data, expect, "browser route smoke");
      break;
    case "329-media-storage-runtime-smoke-summary.json":
      validateMediaStorageRuntimeSmokeSummary(data, expect, "media storage runtime smoke");
      break;
    case "330-jobs-source-runtime-smoke-summary.json":
      validateJobsSourceRuntimeSmokeSummary(data, expect, "jobs source runtime smoke");
      break;
    case "353-jobs-public-ats-static-feed-summary.json":
      validateJobsPublicAtsStaticFeedSummary(data, expect, "jobs public ATS static feed");
      break;
    case "354-deployed-jobs-api-source-summary.json":
      validateDeployedJobsApiSourceSummary(data, expect, "deployed jobs API source smoke");
      break;
    case "331-postgres-cutover-export-smoke-summary.json":
      validatePostgresCutoverExportSmokeSummary(data, expect, "Postgres cutover export smoke");
      break;
    case "332-browser-extension-runtime-smoke-summary.json":
      validateBrowserExtensionRuntimeSmokeSummary(data, expect, "browser extension runtime smoke");
      break;
    case "333-production-boundaries-deployed-services-summary.json":
      validateDeployedProductionBoundarySummary(data, expect, "deployed production service boundary smoke");
      break;
    case "351-deployed-beta-smoke-summary.json":
      validateDeployedBetaSmokeSummary(data, expect, "deployed beta smoke");
      break;
    case "352-deployed-beta-mobile-content-smoke-summary.json":
      validateDeployedBetaMobileContentSmokeSummary(data, expect, "deployed beta mobile content smoke");
      break;
    case "334-ops-alert-runtime-smoke-summary.json":
      validateOpsAlertRuntimeSmokeSummary(data, expect, "ops alert runtime smoke");
      break;
    case "335-question-bank-rights-public-smoke-summary.json":
      validateQuestionBankRightsPublicSmokeSummary(data, expect, "question-bank rights public smoke");
      break;
    case "336-ops-alert-production-fixture-summary.json":
      validateOpsAlertProductionFixtureSummary(data, expect, "ops alert production fixture");
      break;
    case "337-media-storage-production-fixture-summary.json":
      validateMediaStorageProductionFixtureSummary(data, expect, "media storage production fixture");
      break;
    case "338-jobs-source-production-fixture-summary.json":
      validateJobsSourceProductionFixtureSummary(data, expect, "jobs source production fixture");
      break;
    case "339-chrome-store-publication-fixture-summary.json":
      validateChromeStorePublicationFixtureSummary(data, expect, "Chrome store publication fixture");
      break;
    case "340-question-bank-rights-release-blockers-summary.json":
      validateQuestionBankRightsReleaseBlockersSummary(data, expect, "question-bank rights release blockers");
      break;
    case "345-question-bank-rights-packet-summary.json":
      validateQuestionBankRightsPacketSummary(data, expect, "question-bank rights approval packet");
      break;
    case "346-ops-alert-edge-packet-summary.json":
      validateOpsAlertEdgePacketSummary(data, expect, "ops alert edge packet");
      break;
    case "347-media-storage-packet-summary.json":
      validateMediaStoragePacketSummary(data, expect, "media storage readiness packet");
      break;
    case "348-chrome-store-publication-packet-summary.json":
      validateChromeStorePublicationPacketSummary(data, expect, "Chrome store publication packet");
      break;
    case "349-jobs-feed-publication-packet-summary.json":
      validateJobsFeedPublicationPacketSummary(data, expect, "jobs feed publication packet");
      break;
    case "350-postgres-cutover-packet-summary.json":
      validatePostgresCutoverPacketSummary(data, expect, "Postgres cutover readiness packet");
      break;
    case "355-apex-www-domain-summary.json":
      validateApexWwwDomainSummary(data, expect, "apex/WWW domain smoke");
      break;
    case "341-external-launch-blockers-summary.json":
      validateExternalLaunchBlockersSummary(data, expect, "external launch blockers", {
        allowSkippedReleaseSummaryContent: skipReleaseSummaryContent
      });
      break;
  }
}

function validateBrowserRouteSmokeSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(Number(data.routes?.checked || 0) === routeIds.length, `${label} must check all routes`);
  expect(Number(data.routes?.passed || 0) === routeIds.length, `${label} route pass count must match all routes`);
  expect(Number(data.routes?.failed || 0) === 0, `${label} must have zero route failures`);
  expect(Number(data.interactions?.checked || 0) >= 62, `${label} must check key interactions`);
  expect(Number(data.interactions?.failed || 0) === 0, `${label} must have zero interaction failures`);
  const planInteraction = findResult(data.interactions?.results, "plan create, edit, task persistence, and navigation");
  expect(planInteraction?.status === "pass", `${label} must verify Plan create, edit, task persistence, and navigation`);
  const planDiagnostic = findResult(data.interactions?.results, "plan baseline diagnostic completion and reload persistence");
  expect(planDiagnostic?.status === "pass", `${label} must verify Plan baseline diagnostic completion and reload persistence`);
  expect(planDiagnostic?.diagnosticCompleted === true, `${label} must verify Plan baseline diagnostic completion`);
  expect(planDiagnostic?.reloaded === true, `${label} must verify Plan baseline diagnostic reload persistence`);
  expect(Number(planDiagnostic?.scoreRowCount || 0) > 0, `${label} must verify Plan baseline diagnostic score rows render`);
  const todoDockLifecycle = findResult(data.interactions?.results, "todo dock edit, complete, delete, and reload persistence");
  expect(todoDockLifecycle?.status === "pass", `${label} must verify Todo dock edit, complete, delete, and reload persistence`);
  expect(todoDockLifecycle?.edited === true, `${label} must verify Todo dock edit persistence`);
  expect(todoDockLifecycle?.completed === true, `${label} must verify Todo dock completion persistence`);
  expect(todoDockLifecycle?.reopened === true, `${label} must verify Todo dock close and reopen`);
  expect(todoDockLifecycle?.reloaded === true, `${label} must verify Todo dock reload persistence`);
  expect(todoDockLifecycle?.deleted === true, `${label} must verify Todo dock delete`);
  expect(todoDockLifecycle?.deletePersisted === true, `${label} must verify Todo dock delete persistence`);
  const problemSocialGuard = findResult(data.interactions?.results, "problems social like/comment no-cloud guard");
  expect(problemSocialGuard?.status === "pass", `${label} must verify Problems social no-cloud guard behavior`);
  const problemPaginationInterview = findResult(data.interactions?.results, "problems pagination, collection filter, and mock interview handoff");
  expect(problemPaginationInterview?.status === "pass", `${label} must verify Problems pagination, collection filter, and mock interview handoff`);
  expect(problemPaginationInterview?.paginationNavigated === true, `${label} must verify Problems pagination navigation`);
  expect(problemPaginationInterview?.collectionFilterActive === true, `${label} must verify Problems collection filter activation`);
  expect(problemPaginationInterview?.interviewHandoff === true, `${label} must verify Problems detail handoff to Interview`);
  const mobileProblemDetailHandoff = findResult(data.interactions?.results, "mobile problems detail actions and mock handoff avoid overflow");
  expect(mobileProblemDetailHandoff?.status === "pass", `${label} must verify mobile Problems detail actions and mock handoff`);
  expect(mobileProblemDetailHandoff?.mobileViewport === true, `${label} must verify mobile Problems detail viewport`);
  expect(mobileProblemDetailHandoff?.detailOpened === true, `${label} must verify mobile Problems detail opens`);
  expect(mobileProblemDetailHandoff?.answerRevealed === true, `${label} must verify mobile Problems answer reveal`);
  expect(mobileProblemDetailHandoff?.saveToggled === true, `${label} must verify mobile Problems saved toggle`);
  expect(mobileProblemDetailHandoff?.interviewHandoff === true, `${label} must verify mobile Problems mock-interview handoff`);
  expect(mobileProblemDetailHandoff?.noHorizontalOverflow === true, `${label} must verify mobile Problems flow has no horizontal overflow`);
  const problemRankingNavigation = findResult(data.interactions?.results, "problems ranking view opens ranked detail and preserves ranking navigation");
  expect(problemRankingNavigation?.status === "pass", `${label} must verify Problems ranking view opens ranked detail and preserves ranking navigation`);
  expect(problemRankingNavigation?.scoresDescending === true, `${label} must verify Problems ranking scores are descending`);
  expect(problemRankingNavigation?.rankingDetailPositionPass === true, `${label} must verify Problems ranking detail navigation follows ranked order`);
  expect(problemRankingNavigation?.returnedToRanking === true, `${label} must verify Problems detail back returns to ranking view`);
  const leetcodeHotTracking = findResult(data.interactions?.results, "problems LeetCode Hot 100 tracking persistence");
  expect(leetcodeHotTracking?.status === "pass", `${label} must verify LeetCode Hot 100 tracking persistence`);
  const overviewLeaderboard = findResult(data.interactions?.results, "overview leaderboard controls and news ticker navigation");
  expect(overviewLeaderboard?.status === "pass", `${label} must verify Overview leaderboard persistence and news ticker navigation`);
  const streakCheckIn = findResult(data.interactions?.results, "streak check-in calendar opens and persists activity");
  expect(streakCheckIn?.status === "pass", `${label} must verify streak check-in calendar opens and persists activity`);
  expect(streakCheckIn?.checkedIn === true, `${label} must verify streak check-in activity`);
  expect(streakCheckIn?.calendarOpened === true, `${label} must verify streak calendar opens`);
  expect(streakCheckIn?.todayLit === true, `${label} must verify streak calendar lights today`);
  expect(streakCheckIn?.reloaded === true, `${label} must verify streak reload persistence`);
  expect(streakCheckIn?.persisted === true, `${label} must verify streak local persistence`);
  const shellGlobalControls = findResult(data.interactions?.results, "shell sidebar and command shortcuts persist navigation state");
  expect(shellGlobalControls?.status === "pass", `${label} must verify shell sidebar and command shortcut navigation`);
  expect(shellGlobalControls?.sidebarCollapsed === true, `${label} must verify shell sidebar collapse`);
  expect(shellGlobalControls?.reloadPersisted === true, `${label} must verify shell sidebar reload persistence`);
  expect(shellGlobalControls?.sidebarExpanded === true, `${label} must verify shell sidebar re-expand`);
  expect(shellGlobalControls?.chatShortcut === true, `${label} must verify shell chat shortcut navigation`);
  expect(shellGlobalControls?.accountShortcut === true, `${label} must verify shell account shortcut navigation`);
  expect(shellGlobalControls?.settingsShortcut === true, `${label} must verify shell settings shortcut navigation`);
  const hashCompatDeepLink = findResult(data.interactions?.results, "hash compat deep links redirect without losing query state");
  expect(hashCompatDeepLink?.status === "pass", `${label} must verify hash-compatible deep links redirect`);
  expect(hashCompatDeepLink?.jobsPathname === "/jobs", `${label} must verify #jobs reaches the Jobs route`);
  expect(hashCompatDeepLink?.overviewAliasPathname === "/", `${label} must verify #dashboard alias reaches Overview`);
  expect(hashCompatDeepLink?.queryPreserved === true, `${label} must preserve query state during hash redirects`);
  expect(hashCompatDeepLink?.hashCleared === true, `${label} must clear legacy hashes after redirect`);
  expect(hashCompatDeepLink?.jobsRendered === true, `${label} must render Jobs after hash redirect`);
  expect(hashCompatDeepLink?.overviewRendered === true, `${label} must render Overview after hash alias redirect`);
  const mobileShellControls = findResult(data.interactions?.results, "mobile shell sidebar, search, and settings controls avoid overflow");
  expect(mobileShellControls?.status === "pass", `${label} must verify mobile shell controls avoid overflow`);
  expect(mobileShellControls?.mobileViewport === true, `${label} must verify mobile shell viewport`);
  expect(mobileShellControls?.noHorizontalOverflow === true, `${label} must verify mobile shell has no horizontal overflow`);
  expect(mobileShellControls?.searchUsable === true, `${label} must verify mobile shell search remains usable`);
  expect(mobileShellControls?.compactActions === true, `${label} must verify mobile shell compact action layout`);
  expect(mobileShellControls?.sidebarCollapsed === true, `${label} must verify mobile shell sidebar collapse`);
  expect(mobileShellControls?.reloadPersisted === true, `${label} must verify mobile shell sidebar reload persistence`);
  expect(mobileShellControls?.settingsShortcut === true, `${label} must verify mobile shell settings shortcut navigation`);
  const mobileModuleNav = findResult(data.interactions?.results, "mobile module nav groups open problems and library routes");
  expect(mobileModuleNav?.status === "pass", `${label} must verify mobile module nav groups open Problems and Library routes`);
  expect(mobileModuleNav?.mobileViewport === true, `${label} must verify mobile module nav viewport`);
  expect(mobileModuleNav?.trainingMenuOpened === true, `${label} must verify mobile training nav menu opens`);
  expect(mobileModuleNav?.problemsRoute === true, `${label} must verify mobile nav reaches Problems`);
  expect(mobileModuleNav?.resourcesMenuOpened === true, `${label} must verify mobile resources nav menu opens`);
  expect(mobileModuleNav?.libraryRoute === true, `${label} must verify mobile nav reaches Library`);
  expect(mobileModuleNav?.noHorizontalOverflow === true, `${label} must verify mobile nav has no horizontal overflow`);
  const skillsInteraction = findResult(data.interactions?.results, "skills radar hover and global search spotlight");
  expect(skillsInteraction?.status === "pass", `${label} must verify Skills radar hover and global search spotlight`);
  const globalSearchInteraction = findResult(data.interactions?.results, "global search module, problem, job, company, course, and news navigation");
  expect(globalSearchInteraction?.status === "pass", `${label} must verify global search module, problem, job, company, course, and news navigation`);
  const pokerInteraction = findResult(data.interactions?.results, "poker demo table starts, acts, and persists room state");
  expect(pokerInteraction?.status === "pass", `${label} must verify Poker demo table start, action, and persisted room state`);
  const pokerPreflopInteraction = findResult(data.interactions?.results, "poker preflop matrix position, hand selection, and leave-table navigation");
  expect(pokerPreflopInteraction?.status === "pass", `${label} must verify Poker preflop matrix selection and leave-table navigation`);
  expect(pokerPreflopInteraction?.leaveTableNavigated === true, `${label} must verify Poker leave-table navigation reaches Tools`);
  const interviewInteraction = findResult(data.interactions?.results, "interview onboarding, practice answer, favorite, exit, and resume");
  expect(interviewInteraction?.status === "pass", `${label} must verify Interview onboarding, practice answer, favorite, exit, and resume`);
  const interviewAttachment = findResult(data.interactions?.results, "interview attachment upload preview, transcript, and request payload");
  expect(interviewAttachment?.status === "pass", `${label} must verify Interview attachment upload preview, transcript, and request payload`);
  expect(interviewAttachment?.previewRendered === true, `${label} must verify Interview attachment preview rendering`);
  expect(interviewAttachment?.transcriptAttachmentRendered === true, `${label} must verify Interview transcript renders submitted attachments`);
  expect(interviewAttachment?.requestAttachmentSent === true, `${label} must verify Interview attachment request payload`);
  const interviewPdfSource = findResult(data.interactions?.results, "interview PDF source upload generates questions and starts session");
  expect(interviewPdfSource?.status === "pass", `${label} must verify Interview PDF source upload generates questions and starts session`);
  expect(interviewPdfSource?.requestPdfPayloadSent === true, `${label} must verify Interview PDF generation request payload`);
  expect(interviewPdfSource?.generatedQuestionRendered === true, `${label} must verify Interview PDF generated question rendering`);
  const mobileInterviewAdvancedSetup = findResult(data.interactions?.results, "mobile interview advanced setup controls avoid overflow");
  expect(mobileInterviewAdvancedSetup?.status === "pass", `${label} must verify mobile Interview advanced setup controls`);
  expect(mobileInterviewAdvancedSetup?.mobileViewport === true, `${label} must verify mobile Interview advanced setup viewport`);
  expect(mobileInterviewAdvancedSetup?.advancedOpened === true, `${label} must verify mobile Interview advanced setup opens`);
  expect(mobileInterviewAdvancedSetup?.technicalTypeSelected === true, `${label} must verify mobile Interview technical type selection`);
  expect(mobileInterviewAdvancedSetup?.optionCategorySelected === true, `${label} must verify mobile Interview category selection`);
  expect(mobileInterviewAdvancedSetup?.pdfSourceVisible === true, `${label} must verify mobile Interview PDF source visibility`);
  expect(mobileInterviewAdvancedSetup?.fullSourceRestored === true, `${label} must verify mobile Interview source can return to full question bank`);
  expect(mobileInterviewAdvancedSetup?.noHorizontalOverflow === true, `${label} must verify mobile Interview advanced setup has no horizontal overflow`);
  const settingsPersistence = findResult(data.interactions?.results, "settings saves runtime config, clears Google Client ID, and reloads");
  expect(settingsPersistence?.status === "pass", `${label} must verify Settings runtime config persistence`);
  expect(settingsPersistence?.googleClientIdCleared === true, `${label} must verify Settings can clear Google Client ID`);
  const settingsLanguageSwitch = findResult(data.interactions?.results, "settings language switch syncs URL and persists reload");
  expect(settingsLanguageSwitch?.status === "pass", `${label} must verify Settings language switching`);
  expect(settingsLanguageSwitch?.englishSelected === true, `${label} must verify Settings English selection`);
  expect(settingsLanguageSwitch?.englishUrlSynced === true, `${label} must verify Settings language URL sync`);
  expect(settingsLanguageSwitch?.queryPreserved === true, `${label} must verify Settings language switching preserves query state`);
  expect(settingsLanguageSwitch?.englishReloadPersisted === true, `${label} must verify Settings English reload persistence`);
  expect(settingsLanguageSwitch?.zhRestored === true, `${label} must verify Settings Chinese restoration`);
  expect(settingsLanguageSwitch?.statusMessageTranslated === true, `${label} must verify Settings language switching translates the default status message`);
  expect(settingsLanguageSwitch?.appShellVisible === true, `${label} must verify Settings language switching keeps the app shell visible`);
  const settingsBackup = findResult(data.interactions?.results, "settings backup export, import, and reset state");
  expect(settingsBackup?.status === "pass", `${label} must verify Settings backup export, import, and reset state`);
  const mobileSettingsControls = findResult(data.interactions?.results, "mobile settings config and backup controls avoid overflow");
  expect(mobileSettingsControls?.status === "pass", `${label} must verify mobile Settings config and backup controls`);
  expect(mobileSettingsControls?.mobileViewport === true, `${label} must verify mobile Settings viewport`);
  expect(mobileSettingsControls?.formControlsVisible === true, `${label} must verify mobile Settings form controls`);
  expect(mobileSettingsControls?.dataActionsVisible === true, `${label} must verify mobile Settings data actions`);
  expect(mobileSettingsControls?.longConfigPersisted === true, `${label} must verify mobile Settings long config persistence`);
  expect(mobileSettingsControls?.exportDownloadWorks === true, `${label} must verify mobile Settings export download`);
  expect(mobileSettingsControls?.noHorizontalOverflow === true, `${label} must verify mobile Settings has no horizontal overflow`);
  const toolsMentalMathCompletion = findResult(data.interactions?.results, "tools mental math completes session and persists records");
  expect(toolsMentalMathCompletion?.status === "pass", `${label} must verify Tools mental math completion and record persistence`);
  expect(toolsMentalMathCompletion?.recordPersisted === true, `${label} must verify Tools mental math record persistence`);
  expect(toolsMentalMathCompletion?.entryPersisted === true, `${label} must verify Tools mental math study entry persistence`);
  expect(toolsMentalMathCompletion?.reloaded === true, `${label} must verify Tools mental math reload persistence`);
  const toolsMarketGame = findResult(data.interactions?.results, "tools market game rejects crossed quote, scores valid quote, and persists record");
  expect(toolsMarketGame?.status === "pass", `${label} must verify Tools market game validation, scoring, and persistence`);
  const accountPersistence = findResult(data.interactions?.results, "account profile save and reload persistence");
  expect(accountPersistence?.status === "pass", `${label} must verify Account profile persistence`);
  const accountEmailChange = findResult(data.interactions?.results, "account local email change requires password and reauthenticates");
  expect(accountEmailChange?.status === "pass", `${label} must verify local account email change password guard and reauthentication`);
  expect(accountEmailChange?.wrongPasswordRejected === true, `${label} must reject local account email changes with a wrong password`);
  expect(accountEmailChange?.oldEmailRejected === true, `${label} must reject login with the old local account email`);
  expect(accountEmailChange?.reloginSucceeded === true, `${label} must relogin with the new local account email`);
  const accountUploadPersistence = findResult(data.interactions?.results, "account avatar upload, clear, and resume file persistence");
  expect(accountUploadPersistence?.status === "pass", `${label} must verify Account avatar and resume file upload persistence`);
  expect(accountUploadPersistence?.avatarCleared === true, `${label} must verify Account avatar clear persistence`);
  const mobileAccountControls = findResult(data.interactions?.results, "mobile account profile and upload controls avoid overflow");
  expect(mobileAccountControls?.status === "pass", `${label} must verify mobile Account profile and upload controls`);
  expect(mobileAccountControls?.mobileViewport === true, `${label} must verify mobile Account viewport`);
  expect(mobileAccountControls?.formControlsVisible === true, `${label} must verify mobile Account form controls`);
  expect(mobileAccountControls?.securityFieldVisible === true, `${label} must verify mobile Account security field`);
  expect(mobileAccountControls?.uploadControlsVisible === true, `${label} must verify mobile Account upload controls`);
  expect(mobileAccountControls?.profilePersisted === true, `${label} must verify mobile Account profile persistence`);
  expect(mobileAccountControls?.resumeUploadPersisted === true, `${label} must verify mobile Account resume upload persistence`);
  expect(mobileAccountControls?.noHorizontalOverflow === true, `${label} must verify mobile Account has no horizontal overflow`);
  const experiencesPersistence = findResult(data.interactions?.results, "experiences create, edit, share, delete, and reload persistence");
  expect(experiencesPersistence?.status === "pass", `${label} must verify Experiences record persistence`);
  const newsPersistence = findResult(data.interactions?.results, "news manual submit, filter, detail, and reload persistence");
  expect(newsPersistence?.status === "pass", `${label} must verify News manual submit and read persistence`);
  const mobileContent = findResult(data.interactions?.results, "mobile news and experiences controls avoid overflow");
  expect(mobileContent?.status === "pass", `${label} must verify mobile News and Experiences controls`);
  expect(mobileContent?.mobileViewport === true, `${label} must verify mobile content viewport`);
  expect(mobileContent?.experienceSaved === true, `${label} must verify mobile Experiences save`);
  expect(mobileContent?.experienceFilterUsable === true, `${label} must verify mobile Experiences filter`);
  expect(mobileContent?.experienceShared === true, `${label} must verify mobile Experiences community share`);
  expect(mobileContent?.newsSubmitted === true, `${label} must verify mobile News submit`);
  expect(mobileContent?.newsFiltersUsable === true, `${label} must verify mobile News filters`);
  expect(mobileContent?.newsDetailReadPersisted === true, `${label} must verify mobile News detail read persistence`);
  expect(mobileContent?.noHorizontalOverflow === true, `${label} must verify mobile content flow has no horizontal overflow`);
  const jobsInteraction = findResult(data.interactions?.results, "jobs filter and apply link behavior");
  expect(jobsInteraction?.status === "pass", `${label} must verify Jobs filter and apply link behavior`);
  const companiesInteraction = findResult(data.interactions?.results, "companies tier filter, practice navigation, and careers link behavior");
  expect(companiesInteraction?.status === "pass", `${label} must verify Companies tier, practice, and careers behavior`);
  const mobileCareerInteraction = findResult(data.interactions?.results, "mobile career jobs and companies controls avoid overflow");
  expect(mobileCareerInteraction?.status === "pass", `${label} must verify mobile career Jobs and Companies controls`);
  expect(mobileCareerInteraction?.mobileViewport === true, `${label} must verify mobile career viewport`);
  expect(mobileCareerInteraction?.jobsFilterUsable === true, `${label} must verify mobile Jobs filters`);
  expect(mobileCareerInteraction?.jobApplyLinkSafe === true, `${label} must verify mobile Jobs apply link safety`);
  expect(mobileCareerInteraction?.companiesFilterUsable === true, `${label} must verify mobile Companies tier filters`);
  expect(mobileCareerInteraction?.companyCareersLinkSafe === true, `${label} must verify mobile Companies careers link safety`);
  expect(mobileCareerInteraction?.companyPracticeNavigated === true, `${label} must verify mobile Companies practice navigation`);
  expect(mobileCareerInteraction?.noHorizontalOverflow === true, `${label} must verify mobile career flow has no horizontal overflow`);
  const libraryInteraction = findResult(data.interactions?.results, "library search, kind filter, practice navigation, and reader guard");
  expect(libraryInteraction?.status === "pass", `${label} must verify Library search, kind filter, practice navigation, and reader guard`);
  const libraryCloudReader = findResult(data.interactions?.results, "library cloud PDF reader opens, exposes links, and closes");
  expect(libraryCloudReader?.status === "pass", `${label} must verify Library cloud PDF reader opens, exposes links, and closes`);
  expect(libraryCloudReader?.readerOpened === true, `${label} must verify Library cloud PDF reader opens`);
  expect(libraryCloudReader?.closedByButton === true, `${label} must verify Library cloud PDF reader closes by button`);
  expect(libraryCloudReader?.closedByEscape === true, `${label} must verify Library cloud PDF reader closes by Escape`);
  expect(Number(libraryCloudReader?.readerTokenRequests || 0) >= 1, `${label} must verify Library reader-token request`);
  expect(Number(libraryCloudReader?.pdfRequests || 0) >= 1, `${label} must verify Library PDF probe/frame request`);
  const crossModuleJourney = findResult(data.interactions?.results, "cross-module prep journey persists library, problem, todo, resume, and settings state");
  expect(crossModuleJourney?.status === "pass", `${label} must verify the cross-module prep journey`);
  const pkInteraction = findResult(data.interactions?.results, "pk match, submit, reveal, and record persistence");
  expect(pkInteraction?.status === "pass", `${label} must verify PK match, submit, reveal, and record persistence`);
  const coursesPersistence = findResult(data.interactions?.results, "courses path, source switch, note, and reload persistence");
  expect(coursesPersistence?.status === "pass", `${label} must verify Courses path, source switch, and note persistence`);
  const resumePersistence = findResult(data.interactions?.results, "resume text save and reload persistence");
  expect(resumePersistence?.status === "pass", `${label} must verify Resume text persistence`);
  const resumeLlmReview = findResult(data.interactions?.results, "resume LLM review request, render, and reload persistence");
  expect(resumeLlmReview?.status === "pass", `${label} must verify Resume LLM review request, render, and reload persistence`);
  const mobileResumeReview = findResult(data.interactions?.results, "mobile resume review controls avoid overflow");
  expect(mobileResumeReview?.status === "pass", `${label} must verify mobile Resume review controls`);
  expect(mobileResumeReview?.mobileViewport === true, `${label} must verify mobile Resume viewport`);
  expect(mobileResumeReview?.textareaUsable === true, `${label} must verify mobile Resume textarea usability`);
  expect(mobileResumeReview?.reviewButtonsVisible === true, `${label} must verify mobile Resume review buttons`);
  expect(mobileResumeReview?.reviewRendered === true, `${label} must verify mobile Resume review rendering`);
  expect(mobileResumeReview?.requestPayloadSent === true, `${label} must verify mobile Resume review request payload`);
  expect(mobileResumeReview?.reviewPersisted === true, `${label} must verify mobile Resume review persistence`);
  expect(mobileResumeReview?.noHorizontalOverflow === true, `${label} must verify mobile Resume has no horizontal overflow`);
  const communityPersistence = findResult(data.interactions?.results, "community post, like, comment, and reload persistence");
  expect(communityPersistence?.status === "pass", `${label} must verify Community post persistence`);
  const communityMediaPost = findResult(data.interactions?.results, "community image post fallback and reload persistence");
  expect(communityMediaPost?.status === "pass", `${label} must verify Community image post fallback and reload persistence`);
  const communityVideoPost = findResult(data.interactions?.results, "community video post fallback and reload persistence");
  expect(communityVideoPost?.status === "pass", `${label} must verify Community video post fallback and reload persistence`);
  expect(communityVideoPost?.dataUrlFallback === true, `${label} must verify Community video post data URL fallback`);
  expect(communityVideoPost?.reloaded === true, `${label} must verify Community video post reload persistence`);
  const communityDirectMessage = findResult(data.interactions?.results, "community direct message from post opens messages thread");
  expect(communityDirectMessage?.status === "pass", `${label} must verify Community direct message from post opens Messages thread`);
  expect(communityDirectMessage?.openedMessages === true, `${label} must verify Community direct message navigates to Messages`);
  expect(communityDirectMessage?.threadPersisted === true, `${label} must verify Community direct message thread persistence`);
  expect(communityDirectMessage?.replyPersisted === true, `${label} must verify Community direct message reply persistence`);
  const mobileSocial = findResult(data.interactions?.results, "mobile community posting and messages controls avoid overflow");
  expect(mobileSocial?.status === "pass", `${label} must verify mobile Community and Messages controls`);
  expect(mobileSocial?.mobileViewport === true, `${label} must verify mobile social viewport`);
  expect(mobileSocial?.communityComposerUsable === true, `${label} must verify mobile Community composer usability`);
  expect(mobileSocial?.postLikeCommentPersisted === true, `${label} must verify mobile Community post, like, and comment persistence`);
  expect(mobileSocial?.directMessageNavigated === true, `${label} must verify mobile direct-message navigation`);
  expect(mobileSocial?.messageReplyPersisted === true, `${label} must verify mobile Messages reply persistence`);
  expect(mobileSocial?.messageReloadPersisted === true, `${label} must verify mobile Messages reload persistence`);
  expect(mobileSocial?.noHorizontalOverflow === true, `${label} must verify mobile social flow has no horizontal overflow`);
  const messagesPersistence = findResult(data.interactions?.results, "messages thread read, send, and reload persistence");
  expect(messagesPersistence?.status === "pass", `${label} must verify Messages thread persistence`);
  const messagesMultiThreadUnread = findResult(data.interactions?.results, "messages multi-thread unread badges clear and persist read state");
  expect(messagesMultiThreadUnread?.status === "pass", `${label} must verify Messages multi-thread unread persistence`);
  expect(messagesMultiThreadUnread?.threadCount === 2, `${label} must verify Messages multi-thread coverage`);
  expect(messagesMultiThreadUnread?.initialUnreadBadges === true, `${label} must verify Messages initial unread badges`);
  expect(messagesMultiThreadUnread?.switchClearedBadges === true, `${label} must verify Messages unread badges clear on thread switch`);
  expect(messagesMultiThreadUnread?.readStatePersisted === true, `${label} must verify Messages read state persistence`);
  expect(messagesMultiThreadUnread?.repliesPersisted === true, `${label} must verify Messages multi-thread replies persist`);
  expect(messagesMultiThreadUnread?.reloaded === true, `${label} must verify Messages multi-thread reload persistence`);
  const memoryPersistence = findResult(data.interactions?.results, "memory resource add, source link, and reload persistence");
  expect(memoryPersistence?.status === "pass", `${label} must verify Memory resource persistence`);
  const memoryImageUpload = findResult(data.interactions?.results, "memory image resource upload fallback and reload persistence");
  expect(memoryImageUpload?.status === "pass", `${label} must verify Memory image upload fallback and reload persistence`);
  const networkPersistence = findResult(data.interactions?.results, "network contact add, edit, delete, and reload persistence");
  expect(networkPersistence?.status === "pass", `${label} must verify Network contact persistence`);
  expect(data.unauthenticated?.status === "pass", `${label} must pass logged-out auth flow`);
  expect(data.unauthenticated?.redirectPath === "/login" || data.unauthenticated?.path === "/login", `${label} logged-out protected route must redirect to /login`);
  const localEmailAuth = data.unauthenticated?.localEmailAuth || {};
  expect(localEmailAuth.redirectedToLogin === true, `${label} must verify protected route redirects to the auth shell`);
  expect(localEmailAuth.registrationFormShown === true, `${label} must verify missing local email can enter registration`);
  expect(localEmailAuth.verificationOptional === true, `${label} must verify static local registration fallback when cloud verification is unavailable`);
  expect(localEmailAuth.registered === true, `${label} must verify local email registration`);
  expect(localEmailAuth.accountPersisted === true, `${label} must verify local auth account persistence`);
  expect(localEmailAuth.logoutReturnedToAuth === true, `${label} must verify logout returns to auth`);
  expect(localEmailAuth.passwordStepShown === true, `${label} must verify existing local email reaches password step`);
  expect(localEmailAuth.reloginSucceeded === true, `${label} must verify local email relogin`);
  expect(localEmailAuth.resetFormShown === true, `${label} must verify local email can enter password reset`);
  expect(localEmailAuth.resetCodeSent === true, `${label} must verify password reset code request`);
  expect(localEmailAuth.resetSucceeded === true, `${label} must verify password reset signs in`);
  expect(localEmailAuth.resetOldPasswordRejected === true, `${label} must reject the old password after reset`);
  expect(localEmailAuth.resetNewPasswordLoginSucceeded === true, `${label} must verify relogin with the reset password`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateModuleOwnershipSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(Number(data.modules || 0) === routeIds.length, `${label} must cover every route module`);
  expect(Number(data.manifestRoutes || 0) === routeIds.length, `${label} manifest route count must match UI contracts`);
  expect(Number(data.browserSmoke?.routesChecked || 0) === routeIds.length, `${label} must use browser smoke that checked every route`);
  expect(Number(data.browserSmoke?.mappedInteractions || 0) >= routeIds.length, `${label} must map at least one browser-smoke interaction per route`);
  expect(Number(data.browserSmoke?.interactionsChecked || 0) >= 35, `${label} must reference the full browser interaction smoke`);
  expect(Number(data.ownerGroups?.training || 0) >= 1, `${label} must include training owner group`);
  expect(Number(data.ownerGroups?.career || 0) >= 1, `${label} must include career owner group`);
  expect(Number(data.ownerGroups?.platform || 0) === 2, `${label} must include both platform utility modules`);
  expect(Number(data.navGroups?.utility || 0) === 2, `${label} must preserve utility nav ownership`);
  expect(Number(data.stateDomains?.userState || 0) >= 1, `${label} must expose userState ownership dependencies`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateMediaStorageRuntimeSmokeSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.media?.contentType === "image/png", `${label} must upload image/png media`);
  expect(Number(data.media?.byteSize || 0) > 0, `${label} must report uploaded media byte size`);
  expect(data.media?.storage === "api-media", `${label} must use API local media storage`);
  expect(data.media?.urlUsesApiMediaEndpoint === true, `${label} must return an API media URL`);
  expect(data.media?.responseDoesNotInlineDataUrl === true, `${label} must not inline original media data`);
  expect(data.checks?.registrationReturnedToken === true, `${label} must register and authenticate through the API`);
  expect(Number(data.checks?.authenticatedUploadStatus || 0) === 201, `${label} authenticated upload must return 201`);
  expect(Number(data.checks?.spoofedForwardedHostUploadStatus || 0) === 201, `${label} spoofed forwarded-host upload must return 201`);
  expect(data.checks?.spoofedForwardedHostIgnored === true, `${label} must ignore spoofed X-Forwarded-Host from direct clients`);
  expect(data.checks?.spoofedForwardedProtoIgnored === true, `${label} must ignore spoofed X-Forwarded-Proto from direct clients`);
  expect(data.checks?.spoofedForwardedMediaUrlUsesApiEndpoint === true, `${label} spoofed forwarded-host upload must still return an API media URL`);
  expect(data.spoofedForwardedHostUpload?.forwardedHostIgnored === true, `${label} spoofed forwarded-host evidence must show attacker host was not used`);
  expect(data.spoofedForwardedHostUpload?.forwardedProtoIgnored === true, `${label} spoofed forwarded-host evidence must show attacker proto was not used`);
  expect(Number(data.checks?.unauthenticatedUploadStatus || 0) === 401, `${label} unauthenticated upload must return 401`);
  expect(Number(data.checks?.getMediaStatus || 0) === 200, `${label} GET media must return 200`);
  expect(Number(data.checks?.unsupportedMediaStatus || 0) === 415, `${label} unsupported media type must return 415`);
  expect(Number(data.checks?.oversizedMediaStatus || 0) === 413, `${label} oversized media upload must return 413`);
  expect(Number(data.checks?.mismatchedExtensionUploadStatus || 0) === 201, `${label} MIME/filename mismatch upload must return 201`);
  expect(data.checks?.mismatchedExtensionStoredAsContentTypeExtension === true, `${label} MIME/filename mismatch must store using content-type extension`);
  expect(data.checks?.mismatchedExtensionOriginalNamePreserved === true, `${label} MIME/filename mismatch must preserve original display filename`);
  expect(data.checks?.localFilePersisted === true, `${label} must persist the local media file`);
  expect(data.checks?.localFileBytesMatch === true, `${label} local media bytes must match upload`);
  expect(data.checks?.databaseMediaRowPersisted === true, `${label} must persist media_objects row`);
  expect(Number(data.checks?.databaseUploadAuditEvents || 0) >= 1, `${label} must persist media.upload audit event`);
  expect(Number(data.checks?.databaseSessions || 0) >= 1, `${label} must persist an auth session`);
  const objectRead = data.objectStorage?.uploadReadThrough;
  expect(objectRead?.mediaStorage === "s3-media", `${label} must exercise object storage upload`);
  expect(Number(objectRead?.uploadStatus || 0) === 201, `${label} object storage upload must return 201`);
  expect(Number(objectRead?.getMediaStatus || 0) === 200, `${label} object storage read-through GET must return 200`);
  expect(objectRead?.putRequestSigned === true, `${label} object storage PUT must be SigV4 signed`);
  expect(objectRead?.getRequestSigned === true, `${label} object storage GET must be SigV4 signed`);
  expect(String(objectRead?.storagePath || "").startsWith("s3:runtime-smoke/"), `${label} object storage path must use s3: prefix`);
  expect(Number(objectRead?.apiReadBytes || 0) > 0, `${label} object storage read-through must return bytes`);
  const objectPublic = data.objectStorage?.publicUrlRedirect;
  expect(objectPublic?.mediaStorage === "s3-media", `${label} must exercise object storage public URL mode`);
  expect(Number(objectPublic?.uploadStatus || 0) === 201, `${label} public object storage upload must return 201`);
  expect(Number(objectPublic?.getMediaStatus || 0) === 302, `${label} public object storage API GET must redirect`);
  expect(objectPublic?.putRequestSigned === true, `${label} public object storage PUT must be SigV4 signed`);
  expect(objectPublic?.mediaUrlUsesPublicBase === true, `${label} public object storage media URL must use public base`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateMediaStorageProductionFixtureSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.productionFixture?.status === "pass", `${label} valid production fixture must pass`);
  expect(Number(data.productionFixture?.passed || 0) === 5, `${label} valid production fixture must pass all 5 config checks`);
  expect(Number(data.productionFixture?.failed || 0) === 0, `${label} valid production fixture must have zero failures`);
  expect(data.productionFixture?.storage === "r2", `${label} valid production fixture must use r2 storage`);
  expect(data.productionFixture?.endpointProtocol === "https", `${label} valid production endpoint must be HTTPS`);
  expect(data.productionFixture?.endpointHost === "r2.quantgym.test", `${label} valid production endpoint host must be redacted to host`);
  expect(data.productionFixture?.publicHost === "media.quantgym.test", `${label} valid public media host must be redacted to host`);
  expect(data.productionFixture?.accessKeyIdSet === true, `${label} valid production fixture must require access key`);
  expect(data.productionFixture?.secretAccessKeySet === true, `${label} valid production fixture must require secret key`);
  expect(data.checks?.validProductionAccessKeyRedacted === true, `${label} must redact access key id from output`);
  expect(data.checks?.validProductionSecretRedacted === true, `${label} must redact secret key from output`);
  expect(data.checks?.validProductionBucketRedacted === true, `${label} must redact bucket name from output`);
  expect(data.checks?.validProductionEndpointUrlRedacted === true, `${label} must redact full object endpoint URL from output`);
  expect(data.checks?.validProductionPublicBaseUrlRedacted === true, `${label} must redact full public base URL from output`);
  const hasRawProviderPublicBaseCoverage = data.checks?.rawProviderPublicBaseRejected !== undefined;
  expect(
    Array.isArray(data.negativeFixtures) && data.negativeFixtures.length >= (hasRawProviderPublicBaseCoverage ? 21 : 20),
    `${label} must include negative production fixtures`
  );
  expect(data.checks?.negativeFixturesRejected === true, `${label} negative production fixtures must be rejected`);
  expect(data.checks?.negativeFixturesMentionExpectedErrors === true, `${label} negative fixtures must mention expected errors`);
  expect(data.checks?.endpointEmbeddedCredentialsRejected === true, `${label} must reject object endpoint URLs with embedded credentials`);
  expect(data.checks?.endpointQueryRejected === true, `${label} must reject object endpoint URLs with query strings or fragments`);
  expect(data.checks?.publicBaseEmbeddedCredentialsRejected === true, `${label} must reject public media base URLs with embedded credentials`);
  expect(data.checks?.publicBaseQueryRejected === true, `${label} must reject public media base URLs with query strings or fragments`);
  if (hasRawProviderPublicBaseCoverage) {
    expect(data.checks?.rawProviderPublicBaseRejected === true, `${label} must reject raw provider object-storage public hosts`);
  } else if (/nested media storage production fixture/i.test(label)) {
    warnings.push("Release-readiness nested media storage production fixture lacks raw provider public-host coverage; rerun npm run check:release-readiness:local after production-boundary dependencies are available.");
  } else {
    expect(false, `${label} must reject raw provider object-storage public hosts`);
  }
  expect(data.checks?.placeholderAccessKeyRejected === true, `${label} must reject placeholder media access keys`);
  expect(data.checks?.shortSecretKeyRejected === true, `${label} must reject short media secret keys`);
  expect(data.checks?.unsafeBucketNameRejected === true, `${label} must reject unsafe media bucket names`);
  expect(data.checks?.unsafeObjectPrefixRejected === true, `${label} must reject unsafe media object prefixes`);
  expect(data.checks?.liveFixturePutGetPublicDelete === true, `${label} live fixture must prove PUT/GET/public GET/DELETE path`);
  const hasLiveContentTypeCoverage = data.checks?.liveFixturePreservesContentType !== undefined;
  if (hasLiveContentTypeCoverage) {
    expect(data.checks?.liveFixturePreservesContentType === true, `${label} live fixture must prove public Content-Type preservation`);
  } else if (/nested media storage production fixture/i.test(label)) {
    warnings.push("Release-readiness nested media storage production fixture lacks live Content-Type preservation coverage; rerun npm run check:release-readiness:local after production-boundary dependencies are available.");
  } else {
    expect(false, `${label} live fixture must prove public Content-Type preservation`);
  }
  for (const fixture of data.negativeFixtures || []) {
    expect(fixture.rejected === true, `${label} negative fixture ${fixture.name} must be rejected`);
    expect(fixture.expectedErrorObserved === true, `${label} negative fixture ${fixture.name} must report expected error`);
  }
  expect(data.liveFixture?.status === "pass", `${label} live fixture must pass against fake S3/CDN`);
  expect(data.liveFixture?.putSigned === true, `${label} live fixture PUT must be SigV4 signed`);
  expect(data.liveFixture?.signedGetSigned === true, `${label} live fixture signed GET must be SigV4 signed`);
  expect(data.liveFixture?.deleteSigned === true, `${label} live fixture DELETE must be SigV4 signed`);
  expect(Number(data.liveFixture?.putStatus || 0) >= 200 && Number(data.liveFixture?.putStatus || 0) < 300, `${label} live fixture PUT must return 2xx`);
  expect(Number(data.liveFixture?.signedGetStatus || 0) === 200, `${label} live fixture signed GET must return 200`);
  expect(Number(data.liveFixture?.publicGetStatus || 0) === 200, `${label} live fixture public GET must return 200`);
  expect([200, 202, 204].includes(Number(data.liveFixture?.deleteStatus || 0)), `${label} live fixture DELETE must succeed`);
  if (hasLiveContentTypeCoverage) {
    expect(String(data.liveFixture?.signedGetContentType || "").toLowerCase().includes("text/plain"), `${label} live fixture signed GET must preserve text/plain Content-Type`);
    expect(String(data.liveFixture?.publicGetContentType || "").toLowerCase().includes("text/plain"), `${label} live fixture public GET must preserve text/plain Content-Type`);
    expect(data.liveFixture?.contentTypePreserved === true, `${label} live fixture must report public Content-Type preservation`);
  }
  expect(Number(data.liveFixture?.objectsRemaining || 0) === 0, `${label} live fixture must clean up objects`);
  expect(data.livePublicFailureFixture?.rejected === true, `${label} failing public CDN fixture must be rejected`);
  expect(data.livePublicFailureFixture?.expectedErrorObserved === true, `${label} failing public CDN fixture must report public GET failure`);
  expect(data.livePublicFailureFixture?.deleteObserved === true, `${label} failing public CDN fixture must still DELETE the object`);
  expect(data.livePublicFailureFixture?.deleteSigned === true, `${label} failing public CDN fixture DELETE must be SigV4 signed`);
  expect(Number(data.livePublicFailureFixture?.objectsRemaining || 0) === 0, `${label} failing public CDN fixture must leave zero objects`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateOpsAlertRuntimeSmokeSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(Number(data.webhookReceived || 0) >= 4, `${label} must receive 404, two auth failures, and auth rate-limit alerts`);
  expect(data.payload?.eventType === "http.error.404", `${label} first payload must be the triggered 404`);
  expect(Number(data.payload?.statusCode || 0) === 404, `${label} first payload status must be 404`);
  expect(data.payload?.hasOccurredAt === true, `${label} first payload must include occurredAt`);
  expect(Array.isArray(data.alerts) && data.alerts.length >= 4, `${label} must report all received alerts`);
  const statusCodes = Array.isArray(data.checks?.statusCodes) ? data.checks.statusCodes.map(Number) : [];
  expect(JSON.stringify(statusCodes.slice(0, 4)) === JSON.stringify([404, 401, 401, 429]), `${label} must observe 404, 401, 401, 429 alert sequence`);
  expect(data.checks?.allExpectedAlertsDelivered === true, `${label} must deliver all expected alerts`);
  expect(data.checks?.webhookAuthorizationOk === true, `${label} must send the webhook bearer token`);
  expect(data.checks?.allWebhookPayloadsSanitized === true, `${label} must sanitize all webhook payloads`);
  expect(Number(data.checks?.authFailureAlertsDelivered || 0) === 2, `${label} must deliver both auth failure alerts`);
  expect(data.checks?.authRateLimitAlertDelivered === true, `${label} must deliver the auth rate-limit alert`);
  expect(data.checks?.spoofedForwardedForRateLimitAlertDelivered === true, `${label} must deliver the spoofed X-Forwarded-For Google rate-limit alert`);
  expect(JSON.stringify(data.authRateLimit?.statuses || []) === JSON.stringify([401, 401, 429]), `${label} auth limiter must return 401, 401, 429`);
  expect(data.authRateLimit?.rateLimited === true, `${label} auth limiter must rate-limit the third login`);
  expect(JSON.stringify(data.spoofedForwardedForRateLimit?.statuses || []) === JSON.stringify([400, 400, 429]), `${label} spoofed X-Forwarded-For limiter must return 400, 400, 429`);
  expect(data.spoofedForwardedForRateLimit?.rateLimited === true, `${label} spoofed X-Forwarded-For attempts must still rate-limit the third Google login`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateOpsAlertProductionFixtureSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.productionFixture?.status === "pass", `${label} valid production fixture must pass`);
  expect(Number(data.productionFixture?.passed || 0) === 4, `${label} valid production fixture must pass all 4 config checks`);
  expect(Number(data.productionFixture?.failed || 0) === 0, `${label} valid production fixture must have zero failures`);
  expect(data.productionFixture?.alertWebhookProtocol === "https", `${label} valid production webhook must be HTTPS`);
  expect(data.productionFixture?.alertWebhookTokenSet === true, `${label} valid production webhook must require a token`);
  expect(data.productionFixture?.proxyHeaderTrustEnabled === true, `${label} valid production fixture must enable explicit proxy-header trust`);
  expect(Number(data.productionFixture?.trustedProxyCidrCount || 0) >= 2, `${label} valid production fixture must validate trusted proxy CIDRs`);
  expect(data.productionFixture?.edgeProvider === "cloudflare", `${label} valid edge provider must be cloudflare`);
  expect(data.productionFixture?.edgeEvidenceHost === "dash.cloudflare.com", `${label} valid edge evidence host must be redacted to host only`);
  expect(data.checks?.validProductionWebhookTokenRedacted === true, `${label} must redact webhook token from output`);
  expect(data.checks?.validProductionWebhookUrlRedacted === true, `${label} must redact full webhook URL from output`);
  expect(data.checks?.validProductionEdgeEvidenceUrlRedacted === true, `${label} must redact full edge evidence URL from output`);
  expect(data.checks?.validProductionEdgeNotesRedacted === true, `${label} must redact edge notes from output`);
  const hasSpecificEdgeNotesChecks = data.checks?.validProductionEdgeNotesDescribeAuthSurface !== undefined;
  if (hasSpecificEdgeNotesChecks) {
    expect(data.productionFixture?.edgeNotesDescribeAuthSurface === true, `${label} valid edge notes must describe the protected auth surface`);
    expect(data.productionFixture?.edgeNotesDescribeClientIdentity === true, `${label} valid edge notes must describe client identity or IP`);
    expect(data.productionFixture?.edgeNotesDescribeEnforcementAction === true, `${label} valid edge notes must describe the enforcement action`);
    expect(data.checks?.validProductionEdgeNotesDescribeAuthSurface === true, `${label} must verify edge notes describe the protected auth surface`);
    expect(data.checks?.validProductionEdgeNotesDescribeClientIdentity === true, `${label} must verify edge notes describe client identity or IP`);
    expect(data.checks?.validProductionEdgeNotesDescribeEnforcementAction === true, `${label} must verify edge notes describe the enforcement action`);
    expect(data.checks?.genericEdgeNotesRejected === true, `${label} must reject generic edge notes`);
    expect(data.checks?.edgeNotesMissingClientIdentityRejected === true, `${label} must reject edge notes missing client identity`);
    expect(data.checks?.edgeNotesMissingEnforcementActionRejected === true, `${label} must reject edge notes missing enforcement action`);
  } else if (/nested ops alert production fixture/i.test(label)) {
    warnings.push("Release-readiness nested ops alert production fixture lacks specific edge-notes coverage; rerun npm run check:release-readiness:local after production-boundary dependencies are available.");
  } else {
    expect(false, `${label} must verify specific edge rate-limit notes coverage`);
  }
  expect(Array.isArray(data.negativeFixtures) && data.negativeFixtures.length >= (hasSpecificEdgeNotesChecks ? 22 : 19), `${label} must include negative production fixtures`);
  expect(data.checks?.negativeFixturesRejected === true, `${label} negative fixtures must be rejected`);
  expect(data.checks?.negativeFixturesMentionExpectedErrors === true, `${label} negative fixtures must mention expected errors`);
  expect(data.checks?.shortWebhookTokenRejected === true, `${label} must reject short production webhook tokens`);
  expect(data.checks?.placeholderWebhookTokenRejected === true, `${label} must reject placeholder production webhook tokens`);
  expect(data.checks?.webhookUrlEmbeddedCredentialsRejected === true, `${label} must reject webhook URLs with embedded credentials`);
  expect(data.checks?.webhookUrlQueryRejected === true, `${label} must reject webhook URLs with query strings or fragments`);
  expect(data.checks?.edgeEvidenceUrlEmbeddedCredentialsRejected === true, `${label} must reject edge evidence URLs with embedded credentials`);
  expect(data.checks?.edgeEvidenceUrlQueryRejected === true, `${label} must reject edge evidence URLs with query strings or fragments`);
  for (const fixture of data.negativeFixtures || []) {
    expect(fixture.rejected === true, `${label} negative fixture ${fixture.name} must be rejected`);
    expect(fixture.expectedErrorObserved === true, `${label} negative fixture ${fixture.name} must report expected error`);
  }
  expect(data.localWebhookSmoke?.status === "pass", `${label} local webhook smoke child must pass`);
  expect(data.localWebhookSmoke?.delivered === true, `${label} local webhook smoke must deliver one request`);
  expect(data.localWebhookSmoke?.tokenAccepted === true, `${label} local webhook smoke must send bearer token`);
  expect(data.localWebhookSmoke?.contentTypeJson === true, `${label} local webhook smoke must send JSON`);
  expect(data.localWebhookSmoke?.payload?.eventType === "ops.readiness.smoke", `${label} local webhook smoke event type must match`);
  expect(Number(data.localWebhookSmoke?.payload?.statusCode || 0) === 500, `${label} local webhook smoke status code must be 500`);
  expect(data.localWebhookSmoke?.payload?.path === "/ops/readiness-smoke", `${label} local webhook smoke payload path must match`);
  expect(data.localWebhookSmoke?.payload?.hasOccurredAt === true, `${label} local webhook smoke must include occurredAt`);
  expect(data.localWebhookSmoke?.payloadSanitized === true, `${label} local webhook smoke payload must be sanitized`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateJobsSourceRuntimeSmokeSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(Number(data.feedRequests?.okFeed || 0) >= 1, `${label} must fetch the source feed`);
  expect(Number(data.feedRequests?.failFeed || 0) >= 1, `${label} must exercise source failure fallback`);
  expect(Number(data.feedRequests?.invalidJsonFeed || 0) >= 1, `${label} must exercise invalid JSON feed fallback`);
  expect(Number(data.feedRequests?.largeFeed || 0) >= 1, `${label} must exercise oversized feed fallback`);
  expect(data.feedRequests?.tokenAccepted === true, `${label} must send the configured source bearer token`);
  expect(data.feedRequests?.cacheAvoidedSecondFetch === true, `${label} must prove source cache avoids a second fetch`);
  expect(data.merged?.source === "catalog+source", `${label} merged response must use catalog+source`);
  expect(data.merged?.sourceStatus === "ok", `${label} merged sourceStatus must be ok`);
  expect(data.merged?.firstId === "runtime-source-internship", `${label} source job must lead merged response`);
  expect(data.fallback?.source === "catalog-fallback", `${label} fallback response must use catalog-fallback`);
  expect(data.fallback?.sourceStatus === "error", `${label} fallback sourceStatus must be error`);
  expect(data.invalidJsonFallback?.source === "catalog-fallback", `${label} invalid JSON fallback response must use catalog-fallback`);
  expect(data.invalidJsonFallback?.sourceStatus === "error", `${label} invalid JSON fallback sourceStatus must be error`);
  expect(data.largeFeedFallback?.source === "catalog-fallback", `${label} oversized feed fallback response must use catalog-fallback`);
  expect(data.largeFeedFallback?.sourceStatus === "error", `${label} oversized feed fallback sourceStatus must be error`);
  expect(data.checks?.sourceStatusOk === true, `${label} must observe sourceStatus ok`);
  expect(data.checks?.sourceLabelCatalogPlusSource === true, `${label} must observe catalog+source label`);
  expect(data.checks?.sourceJobFirst === true, `${label} must keep source jobs first`);
  expect(data.checks?.duplicateIdPrefersSource === true, `${label} duplicate ids must prefer source data`);
  expect(data.checks?.unsafeSourceUrlSanitized === true, `${label} must sanitize unsafe source job URLs`);
  expect(data.checks?.unknownSourceTypeDefaulted === true, `${label} must default unknown source job types`);
  expect(data.checks?.invalidSourcePostedAtSanitized === true, `${label} must sanitize invalid source postedAt values`);
  expect(data.checks?.localFallbackJobIncluded === true, `${label} must retain local catalog jobs`);
  expect(data.checks?.postTypeFilterReturnedFulltimeOnly === true, `${label} must verify POST type filtering`);
  expect(data.checks?.fallbackSourceStatusError === true, `${label} must verify source error status`);
  expect(data.checks?.fallbackSourceLabel === true, `${label} must verify fallback source label`);
  expect(data.checks?.fallbackReturnedLocalCatalog === true, `${label} must return local catalog during fallback`);
  expect(data.checks?.invalidJsonFallbackSourceStatusError === true, `${label} must mark invalid JSON source as error`);
  expect(data.checks?.invalidJsonFallbackReturnedLocalCatalog === true, `${label} must return local catalog during invalid JSON fallback`);
  expect(data.checks?.largeFeedFallbackSourceStatusError === true, `${label} must mark oversized feed source as error`);
  expect(data.checks?.largeFeedFallbackReturnedLocalCatalog === true, `${label} must return local catalog during oversized feed fallback`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateJobsPublicAtsStaticFeedSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.feedPath === "public/data/jobs/public-ats-feed.json", `${label} must validate the checked-in public feed path`);
  expect(data.publicUrlHost === "beta.quantgym.app", `${label} public URL host must be beta.quantgym.app`);
  expect(data.publicUrlPath === "/data/jobs/public-ats-feed.json", `${label} public URL path must be stable`);
  expect(data.generatedBy === "scripts/build-public-ats-jobs-feed.mjs", `${label} must be generated by the public ATS generator`);
  expect(data.source === "public-ats-greenhouse", `${label} source must be public-ats-greenhouse`);
  expect(/^[a-f0-9]{64}$/.test(String(data.feedSha256 || "")), `${label} must include a SHA-256 digest`);
  expect(Number(data.count || 0) >= 20, `${label} must include at least 20 jobs`);
  expect(Number(data.internships || 0) > 0, `${label} must include internship roles`);
  expect(Number(data.fulltime || 0) > 0, `${label} must include full-time roles`);
  expect(Array.isArray(data.companies) && data.companies.length >= 3, `${label} must include multiple companies`);
  expect(data.checks?.feedExists === true, `${label} feedExists check must pass`);
  expect(data.checks?.generatedByPublicAts === true, `${label} generatedByPublicAts check must pass`);
  expect(data.checks?.sourcePublicAtsGreenhouse === true, `${label} sourcePublicAtsGreenhouse check must pass`);
  expect(data.checks?.generatedAtValid === true, `${label} generatedAtValid check must pass`);
  expect(data.checks?.hasMinimumJobs === true, `${label} hasMinimumJobs check must pass`);
  expect(data.checks?.includesInternshipAndFulltime === true, `${label} includesInternshipAndFulltime check must pass`);
  expect(data.checks?.includesMultipleCompanies === true, `${label} includesMultipleCompanies check must pass`);
  expect(data.checks?.uniqueIds === true, `${label} uniqueIds check must pass`);
  expect(data.checks?.validUrls === true, `${label} validUrls check must pass`);
  expect(data.checks?.validPostedAt === true, `${label} validPostedAt check must pass`);
  expect(data.checks?.realMetadata === true, `${label} realMetadata check must pass`);
  expect(data.checks?.publicUrlHttps === true, `${label} publicUrlHttps check must pass`);
  expect(data.checks?.publicUrlStablePath === true, `${label} publicUrlStablePath check must pass`);
  expect(data.checks?.feedSha256Set === true, `${label} feedSha256Set check must pass`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateDeployedJobsApiSourceSummary(data, expect, label) {
  expect(Number(data.id || 0) === 354, `${label} id must be 354`);
  expect(data.surface === "deployed jobs API source smoke", `${label} surface must match`);
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.apiHost === "api.quantgym.app", `${label} must target api.quantgym.app`);
  expect(data.apiPath === "/api/jobs", `${label} must target /api/jobs`);
  expect(Number(data.statusCode || 0) === 200, `${label} must return HTTP 200`);
  expect(String(data.contentType || "").toLowerCase().includes("application/json"), `${label} must return JSON`);
  expect(data.source === "catalog+source", `${label} must merge catalog and source jobs`);
  expect(data.sourceStatus === "ok", `${label} sourceStatus must be ok`);
  expect(Number(data.count || 0) >= 150, `${label} must return public ATS scale job count`);
  expect(Number(data.sourceCount || 0) >= 150, `${label} must include public ATS source jobs`);
  expect(Number(data.fallbackCount || 0) >= 1, `${label} must keep fallback catalog jobs merged`);
  expect(Number(data.internships || 0) > 0, `${label} must include internship roles`);
  expect(Number(data.fulltime || 0) > 0, `${label} must include full-time roles`);
  expect(data.firstId === "hudson-river-trading-1229082", `${label} first source job must match the static feed`);
  expect(!Number.isNaN(Date.parse(String(data.firstPostedAt || ""))), `${label} first source postedAt must be parseable`);
  expect(data.checks?.apiHttps === true, `${label} must use HTTPS`);
  expect(data.checks?.apiHostProduction === true, `${label} must use the production API host`);
  expect(data.checks?.apiPathJobs === true, `${label} must use the jobs API path`);
  expect(data.checks?.httpOk === true, `${label} HTTP check must pass`);
  expect(data.checks?.jsonContentType === true, `${label} JSON content-type check must pass`);
  expect(data.checks?.sourceMerged === true, `${label} source merge check must pass`);
  expect(data.checks?.sourceStatusOk === true, `${label} sourceStatus check must pass`);
  expect(data.checks?.countLooksLikePublicAtsFeed === true, `${label} total count check must pass`);
  expect(data.checks?.sourceCountLooksLikePublicAtsFeed === true, `${label} source count check must pass`);
  expect(data.checks?.includesInternshipAndFulltime === true, `${label} role-type check must pass`);
  expect(data.checks?.uniqueIds === true, `${label} unique id check must pass`);
  expect(data.checks?.validUrls === true, `${label} URL check must pass`);
  expect(data.checks?.sourceValidPostedAt === true, `${label} source postedAt check must pass`);
  expect(data.checks?.sourceRealMetadata === true, `${label} source metadata check must pass`);
  expect(data.checks?.fallbackCatalogMerged === true, `${label} fallback catalog merge check must pass`);
  expect(data.checks?.firstSourceJobMatchesStaticFeed === true, `${label} first source job check must pass`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateJobsSourceProductionFixtureSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.productionFixture?.status === "pass", `${label} valid production fixture must pass`);
  expect(Number(data.productionFixture?.passed || 0) === 2, `${label} valid production fixture must pass both config checks`);
  expect(Number(data.productionFixture?.failed || 0) === 0, `${label} valid production fixture must have zero failures`);
  expect(Number(data.productionFixture?.catalogCount || 0) === 2, `${label} valid catalog fixture must include two jobs`);
  expect(Number(data.productionFixture?.catalogInternships || 0) === 1, `${label} valid catalog fixture must include one internship`);
  expect(Number(data.productionFixture?.catalogFulltime || 0) === 1, `${label} valid catalog fixture must include one fulltime role`);
  expect(data.productionFixture?.sourceConfigured === true, `${label} production source must be configured`);
  expect(data.productionFixture?.sourceProtocol === "https", `${label} production source must be HTTPS`);
  expect(data.productionFixture?.sourceHost === "jobs.quantgym.test", `${label} production source host must be redacted to host`);
  expect(data.productionFixture?.sourceDefaulted === false, `${label} explicit production source must not be defaulted`);
  expect(data.productionFixture?.sourceTokenSet === true, `${label} production source token must be set`);
  expect(data.defaultProductionFixture?.status === "pass", `${label} default production fixture must pass`);
  expect(data.defaultProductionFixture?.sourceConfigured === true, `${label} default production source must be configured`);
  expect(data.defaultProductionFixture?.sourceProtocol === "https", `${label} default production source must be HTTPS`);
  expect(data.defaultProductionFixture?.sourceHost === "beta.quantgym.app", `${label} default production source must use the public ATS feed host`);
  expect(data.defaultProductionFixture?.sourceDefaulted === true, `${label} default production source must be marked as defaulted`);
  expect(data.defaultProductionFixture?.sourceTokenSet === false, `${label} default production source must not require a token`);
  expect(data.checks?.validProductionSourceTokenRedacted === true, `${label} must redact source token from output`);
  expect(data.checks?.validProductionSourceUrlRedacted === true, `${label} must redact full source URL from output`);
  expect(data.checks?.defaultProductionPass === true, `${label} default production check must pass`);
  expect(data.checks?.defaultProductionUsesPublicAtsFeed === true, `${label} default production source must use the public ATS feed`);
  expect(data.checks?.defaultProductionTokenOptional === true, `${label} default production source token must be optional`);
  expect(Array.isArray(data.negativeFixtures) && data.negativeFixtures.length >= 13, `${label} must include negative production fixtures`);
  expect(data.checks?.negativeFixturesRejected === true, `${label} negative production fixtures must be rejected`);
  expect(data.checks?.negativeFixturesMentionExpectedErrors === true, `${label} negative fixtures must mention expected errors`);
  expect(data.checks?.sourceUrlEmbeddedCredentialsRejected === true, `${label} must reject source URLs with embedded credentials`);
  expect(data.checks?.sourceUrlQueryRejected === true, `${label} must reject source URLs with query strings`);
  expect(data.checks?.placeholderSourceTokenRejected === true, `${label} must reject placeholder source tokens`);
  expect(data.checks?.shortSourceTokenRejected === true, `${label} must reject short source tokens`);
  for (const fixture of data.negativeFixtures || []) {
    expect(fixture.rejected === true, `${label} negative fixture ${fixture.name} must be rejected`);
    expect(fixture.expectedErrorObserved === true, `${label} negative fixture ${fixture.name} must report expected error`);
  }
  const valid = data.liveFixtures?.valid || {};
  expect(valid.status === "pass", `${label} valid live fixture must pass`);
  expect(Number(valid.sourceStatusCode || 0) === 200, `${label} valid live fixture source must return 200`);
  expect(Number(valid.count || 0) === 2, `${label} valid live fixture must return two jobs`);
  expect(Number(valid.internships || 0) === 1, `${label} valid live fixture must include internship`);
  expect(Number(valid.fulltime || 0) === 1, `${label} valid live fixture must include fulltime`);
  expect(valid.feedTokenAccepted === true, `${label} valid live fixture must send bearer token`);
  expect(valid.feedUserAgentOk === true, `${label} valid live fixture must send readiness user agent`);
  expect(data.checks?.liveValidPass === true, `${label} live valid check must pass`);
  expect(data.checks?.liveValidTokenAccepted === true, `${label} live valid token check must pass`);
  expect(data.checks?.liveInvalidFeedsRejected === true, `${label} invalid live feeds must be rejected`);
  expect(data.checks?.liveInvalidFeedsMentionExpectedErrors === true, `${label} invalid live feeds must mention expected errors`);
  for (const key of ["internshipOnly", "duplicateIds", "invalidUrl", "defaultedMetadata", "invalidPostedAt", "futurePostedAt", "invalidJson", "oversizedPayload", "missingToken"]) {
    const fixture = data.liveFixtures?.[key] || {};
    expect(fixture.rejected === true, `${label} live fixture ${key} must be rejected`);
    expect(fixture.expectedErrorObserved === true, `${label} live fixture ${key} must report expected error`);
  }
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validatePostgresCutoverExportSmokeSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(Array.isArray(data.fixture?.tablesSeeded), `${label} must report seeded tables`);
  for (const table of ["users", "sessions", "email_verification_codes", "user_states", "community", "problems", "media_objects", "audit_events"]) {
    expect(data.fixture.tablesSeeded.includes(table), `${label} must seed ${table}`);
  }
  expect(data.redactedExport?.status === "pass", `${label} redacted export must pass health checks`);
  expect(data.redactedExport?.includeSensitive === false, `${label} redacted export must not include sensitive rows`);
  expect(data.redactedExport?.summaryOnly === false, `${label} redacted export must include redacted rows`);
  expect(Number(data.redactedExport?.rowTables || 0) >= 8, `${label} redacted export must contain fixture row tables`);
  expect(data.redactedExport?.secretsRedacted === true, `${label} redacted export must not leak fixture secret markers`);
  for (const [key, value] of Object.entries(data.redactedExport?.redactionChecks || {})) {
    expect(value === true, `${label} redaction check ${key} must pass`);
  }
  expect(data.sensitiveExport?.status === "pass", `${label} include-sensitive export must pass health checks`);
  expect(data.sensitiveExport?.includeSensitive === true, `${label} include-sensitive export must opt into full rows`);
  expect(data.sensitiveExport?.summaryOnly === false, `${label} include-sensitive export must not be summary-only`);
  expect(data.sensitiveExport?.fullRowsPresent === true, `${label} include-sensitive export must include rows`);
  expect(data.sensitiveExport?.secretMarkersPresent === true, `${label} include-sensitive export must preserve fixture markers for migration input`);
  expect(data.truncatedSensitiveExport?.includeSensitive === true, `${label} truncated fixture must still be include-sensitive`);
  expect(data.truncatedSensitiveExport?.summaryOnly === false, `${label} truncated fixture must include rows`);
  expect(Number(data.truncatedSensitiveExport?.maxRowsPerTable || 0) === 1, `${label} truncated fixture must record the row limit`);
  expect(Array.isArray(data.truncatedSensitiveExport?.truncatedTables) && data.truncatedSensitiveExport.truncatedTables.length > 0, `${label} truncated fixture must report truncated tables`);
  expect(data.cutoverChecks?.includeSensitiveAccepted === true, `${label} cutover checker must accept include-sensitive export`);
  expect(data.cutoverChecks?.redactedRejected === true, `${label} cutover checker must reject redacted export`);
  expect(data.cutoverChecks?.redactedRejectsIncludeSensitiveRequirement === true, `${label} redacted rejection must mention include-sensitive requirement`);
  expect(data.cutoverChecks?.truncatedSensitiveRejected === true, `${label} cutover checker must reject truncated include-sensitive export`);
  expect(data.cutoverChecks?.truncatedRejectsFullExportRequirement === true, `${label} truncated rejection must mention full export requirement`);
  expect(data.cutoverChecks?.includeSensitiveImportPlanValid === true, `${label} include-sensitive export must have a valid import plan`);
  expect(data.cutoverChecks?.completeSignoffAccepted === true, `${label} complete cutover signoff fixture must pass`);
  expect(data.cutoverChecks?.completeSignoffNegativeFixturesRejected === true, `${label} complete signoff negative fixtures must be rejected`);
  expect(data.cutoverChecks?.completeSignoffNegativeFixturesMentionExpectedErrors === true, `${label} complete signoff negative fixtures must mention expected errors`);
  expect(data.cutoverChecks?.privateTargetHostRejected === true, `${label} complete signoff must reject private-network target hosts`);
  expect(data.cutoverChecks?.publicIpTargetHostRejected === true, `${label} complete signoff must reject raw IP target hosts`);
  expect(data.cutoverChecks?.privateEvidenceUrlRejected === true, `${label} complete signoff must reject private-network evidence URLs`);
  expect(data.cutoverChecks?.targetHostWhitespaceRejected === true, `${label} complete signoff must reject malformed target hosts`);
  expect(data.cutoverChecks?.databaseUnsafeCharactersRejected === true, `${label} complete signoff must reject unsafe database names`);
  expect(data.cutoverChecks?.evidenceUrlEmbeddedCredentialsRejected === true, `${label} complete signoff must reject evidence URLs with embedded credentials`);
  expect(data.cutoverChecks?.evidenceUrlQueryRejected === true, `${label} complete signoff must reject evidence URLs with query strings`);
  expect(data.cutoverChecks?.futureCompletedTimestampRejected === true, `${label} complete signoff must reject future completion timestamps`);
  expect(data.cutoverChecks?.exportShaMismatchRejected === true, `${label} complete signoff must reject export SHA mismatches`);
  expect(data.cutoverChecks?.sourceDbShaMismatchRejected === true, `${label} complete signoff must reject source DB SHA mismatches`);
  expect(data.cutoverChecks?.targetRowCountMismatchRejected === true, `${label} complete signoff must reject target row-count mismatches`);
  expect(data.cutoverChecks?.inactiveAppDatabaseRejected === true, `${label} complete signoff must reject inactive app database confirmation`);
  expect(data.cutoverChecks?.missingBackupConfirmationRejected === true, `${label} complete signoff must reject missing backup confirmation`);
  expect(Number(data.importPlan?.tableCount || 0) >= 8, `${label} import plan must cover API tables`);
  expect(Number(data.importPlan?.rowCount || 0) > 0, `${label} import plan must include rows`);
  expect(Number(data.importPlan?.jsonValuesChecked || 0) > 0, `${label} import plan must validate JSON values`);
  expect(Number(data.importPlan?.timestampValuesChecked || 0) > 0, `${label} import plan must validate timestamp values`);
  expect(data.importPlan?.columnShapeOk === true, `${label} import plan must validate row column shape`);
  expect(data.importPlan?.referencedTablesFirst === true, `${label} import plan must order referenced tables first`);
  expect(Array.isArray(data.importPlan?.copyOrder) && data.importPlan.copyOrder.includes("users"), `${label} import plan must include users in copy order`);
  expect(data.cutoverSignoff?.required === true, `${label} complete cutover signoff must be represented`);
  expect(data.cutoverSignoff?.appDatabaseActive === true, `${label} complete cutover signoff must require app DB activation`);
  expect(data.cutoverSignoff?.backupConfirmed === true, `${label} complete cutover signoff must require backup confirmation`);
  expect(data.cutoverSignoff?.evidenceHost === "render.com", `${label} complete cutover signoff must keep sanitized evidence host`);
  expect(typeof data.cutoverSignoff?.sourceDbSha256Prefix === "string" && data.cutoverSignoff.sourceDbSha256Prefix.length === 12, `${label} complete cutover signoff must bind the source DB hash prefix`);
  expect(typeof data.cutoverSignoff?.exportSha256Prefix === "string" && data.cutoverSignoff.exportSha256Prefix.length === 12, `${label} complete cutover signoff must bind the export hash prefix`);
  expect(Number(data.cutoverSignoff?.targetRowCount || 0) === Number(data.importPlan?.rowCount || -1), `${label} complete cutover signoff target row count must match the import plan`);
  expect(Array.isArray(data.completeSignoffNegativeFixtures) && data.completeSignoffNegativeFixtures.length >= 19, `${label} must include complete signoff negative fixtures`);
  expect(
    (data.completeSignoffNegativeFixtures || []).some((fixture) => (
      fixture.name === "empty database path rejected"
      && fixture.rejected === true
      && fixture.expectedErrorObserved === true
    )),
    `${label} must reject empty SQLite DB path in complete signoff`
  );
  for (const fixture of data.completeSignoffNegativeFixtures || []) {
    expect(fixture.rejected === true, `${label} complete signoff negative fixture ${fixture.name} must be rejected`);
    expect(fixture.expectedErrorObserved === true, `${label} complete signoff negative fixture ${fixture.name} must report expected error`);
  }
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateQuestionBankRightsSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.mode === "private-beta", `${label} release-readiness must check private beta mode`);
  expect(Number(data.activeSources || 0) === 15, `${label} must track the 15 active beta sources`);
  expect(Number(data.compiledProblems || 0) === 2997, `${label} must track the compiled catalog size`);
  expect(Number(data.rightsSources || 0) >= Number(data.activeSources || 0), `${label} rights manifest must cover active sources`);
  expect(Number(data.rightsStatus?.activePublicCommercial?.["needs-review"] || 0) === Number(data.activeSources || 0), `${label} all active sources must still require public/commercial review`);
  expect(Number(data.rightsStatus?.publicCommercial?.blocked || 0) >= 1, `${label} disabled/blocked sources must remain represented`);
  expect(Number(data.rightsStatus?.publicCommercial?.approved || 0) === 0, `${label} private-beta gate must not imply public/commercial approval`);
  const checks = Array.isArray(data.sourceChecks) ? data.sourceChecks : [];
  expect(checks.length === Number(data.rightsSources || 0), `${label} must report every rights source`);
  const quantguide = checks.find((item) => item.slug === "quantguide");
  expect(quantguide?.active === true, `${label} must include active QuantGuide source`);
  expect(Number(quantguide?.compiledProblems || 0) === 1204, `${label} must preserve QuantGuide compiled count`);
  expect(Array.isArray(quantguide?.visibility) && quantguide.visibility.includes("private"), `${label} must keep QuantGuide visibility private`);
  expect(quantguide?.publicCommercialStatus === "needs-review", `${label} QuantGuide must still block public/commercial release`);
  const archived = checks.find((item) => item.slug === "question-bank");
  expect(archived?.active === false, `${label} archived question-bank source must stay inactive`);
  expect(archived?.publicCommercialStatus === "blocked", `${label} archived question-bank source must stay blocked`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateQuestionBankRightsPublicSmokeSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.checks?.validPublicPass === true, `${label} valid approval must pass public mode`);
  expect(data.checks?.validCommercialPass === true, `${label} valid approval must pass commercial mode`);
  expect(data.checks?.publicOnlyPassesPublic === true, `${label} public-only approval must pass public mode`);
  expect(data.checks?.publicOnlyRejectedCommercial === true, `${label} public-only approval must fail commercial mode`);
  expect(data.checks?.publicOnlyCommercialMentionsScope === true, `${label} commercial rejection must mention missing commercial-use scope`);
  expect(data.checks?.placeholderEvidenceRejected === true, `${label} placeholder evidence must be rejected`);
  expect(data.checks?.privateEvidenceRejected === true, `${label} private-network evidence must be rejected`);
  expect(data.checks?.privateEvidenceMentionsPrivateNetwork === true, `${label} private-network rejection must mention private-network`);
  expect(data.checks?.evidenceUrlEmbeddedCredentialsRejected === true, `${label} evidence URLs with embedded credentials must be rejected`);
  expect(data.checks?.evidenceUrlQueryRejected === true, `${label} evidence URLs with query strings or fragments must be rejected`);
  expect(data.checks?.staleApprovalRejected === true, `${label} stale approval must be rejected`);
  expect(data.checks?.missingGrantorRejected === true, `${label} missing direct-permission grantor must be rejected`);
  expect(data.checks?.unsupportedScopeRejected === true, `${label} unsupported redistribution scope must be rejected`);
  expect(data.validApproval?.status === "pass", `${label} valid commercial fixture must report pass`);
  expect(Number(data.validApproval?.rightsStatus?.activePublicCommercial?.approved || 0) === 1, `${label} valid fixture must have one active approved source`);
  expect(Array.isArray(data.publicOnlyCommercialFailure?.failures) && data.publicOnlyCommercialFailure.failures.some((item) => /commercial-use/.test(item)), `${label} commercial failure must include commercial-use detail`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateQuestionBankRightsReleaseBlockersSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.releaseBlocked === true, `${label} must explicitly mark public/commercial release as blocked`);
  expect(data.privateBeta?.status === "pass", `${label} private-beta rights check must pass`);
  expect(Number(data.privateBeta?.activeSources || 0) === 15, `${label} private-beta must track 15 active sources`);
  expect(Number(data.privateBeta?.compiledProblems || 0) === 2997, `${label} private-beta must track 2997 compiled problems`);
  expect(Number(data.privateBeta?.rightsStatus?.privateBeta?.allowed || 0) === 15, `${label} private-beta must allow all active sources`);

  for (const [key, mode] of [["publicRelease", "public"], ["commercialRelease", "commercial"]]) {
    const result = data[key] || {};
    expect(result.status === "fail", `${label} ${mode} release must stay blocked`);
    expect(Number(result.exitCode || 0) !== 0, `${label} ${mode} release checker must exit non-zero`);
    expect(Number(result.activeSources || 0) === 15, `${label} ${mode} release must track 15 active sources`);
    expect(Number(result.failureCount || 0) === 15, `${label} ${mode} release must report one blocker per active source`);
    expect(Number(result.rightsStatus?.activePublicCommercial?.["needs-review"] || 0) === 15, `${label} ${mode} release must keep all active sources in needs-review`);
    expect(Number(result.rightsStatus?.activePublicCommercial?.approved || 0) === 0, `${label} ${mode} release must have zero active approvals`);
    const failures = Array.isArray(result.failures) ? result.failures : [];
    expect(failures.every((item) => String(item).includes(`blocks ${mode} release: publicCommercial.status is "needs-review"`)), `${label} ${mode} blockers must all be needs-review failures`);
  }

  const publicSlugs = data.blockerSlugs?.public || [];
  const commercialSlugs = data.blockerSlugs?.commercial || [];
  expect(Array.isArray(publicSlugs) && publicSlugs.length === 15, `${label} public blocker slugs must cover all active sources`);
  expect(Array.isArray(commercialSlugs) && commercialSlugs.length === 15, `${label} commercial blocker slugs must cover all active sources`);
  expect(publicSlugs.includes("quantguide"), `${label} public blockers must include QuantGuide`);
  expect(commercialSlugs.includes("quantguide"), `${label} commercial blockers must include QuantGuide`);
  expect(data.checks?.privateBetaPass === true, `${label} private beta check must pass`);
  expect(data.checks?.publicReleaseRejected === true, `${label} public release must be rejected`);
  expect(data.checks?.commercialReleaseRejected === true, `${label} commercial release must be rejected`);
  expect(data.checks?.publicRejectedForAllActiveSources === true, `${label} public blockers must match active sources`);
  expect(data.checks?.commercialRejectedForAllActiveSources === true, `${label} commercial blockers must match active sources`);
  expect(data.checks?.activePublicCommercialNeedsReview === true, `${label} active public/commercial rights must remain needs-review`);
  expect(data.checks?.noActivePublicCommercialApprovals === true, `${label} must have no active public/commercial approvals`);
  expect(data.checks?.quantguideStillPrivateAndBlocked === true, `${label} QuantGuide must remain private and blocked for public/commercial`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateQuestionBankRightsPacketSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.mode === "commercial", `${label} must target commercial release readiness`);
  expect(data.signoffCommand === "npm run check:question-bank-rights:public && npm run check:question-bank-rights:commercial", `${label} must record the full public/commercial signoff command`);
  expect(data.supportingCommands?.releaseBlockers === "npm run check:question-bank-rights:release-blockers", `${label} must record the release-blocker refresh command`);
  expect(data.supportingCommands?.rebuildPacket === "npm run build:question-bank-rights-packet", `${label} must record the packet rebuild command`);
  expect(data.releaseBlockerSummaryPath === "docs/browser-audit-screenshots/340-question-bank-rights-release-blockers-summary.json", `${label} must reference the blocker summary evidence`);
  expect(data.releaseBlocked === true, `${label} must keep public/commercial release blocked`);
  expect(Number(data.blockedSourceCount || 0) === 15, `${label} must include all 15 blocked active sources`);
  expect(Number(data.activeSourceCount || 0) === 15, `${label} must count all 15 active sources`);
  expect(Number(data.sourcePacketCount || 0) === 15, `${label} must write one source packet per active source`);
  expect(Number(data.manifestDraftSourceCount || 0) === 15, `${label} manifest draft must contain one entry per active source`);
  expect(Number(data.trackerRowCount || 0) === 15, `${label} tracker must contain one row per active source`);
  expect(Number(data.publicFailureCount || 0) === 15, `${label} public failure count must remain one per active source`);
  expect(Number(data.commercialFailureCount || 0) === 15, `${label} commercial failure count must remain one per active source`);
  const scopes = Array.isArray(data.requiredScopes) ? data.requiredScopes : [];
  for (const scope of ["public-web", "redistribution", "compiled-catalog", "derived-adaptation", "commercial-use"]) {
    expect(scopes.includes(scope), `${label} must include ${scope} scope`);
  }
  const files = Array.isArray(data.filesWritten) ? data.filesWritten : [];
  expect(files.includes("artifacts/question-bank-rights/public-commercial-approval-packet/README.md"), `${label} must write README packet`);
  expect(files.includes("artifacts/question-bank-rights/public-commercial-approval-packet/rights-evidence-tracker.csv"), `${label} must write tracker CSV`);
  expect(files.includes("artifacts/question-bank-rights/public-commercial-approval-packet/manifest-draft.json"), `${label} must write manifest draft`);
  const sources = Array.isArray(data.sources) ? data.sources : [];
  expect(sources.length === 15, `${label} must summarize all source packets`);
  expect(sources.some((source) => source.slug === "quantguide" && source.currentStatus === "needs-review"), `${label} must include QuantGuide as needs-review`);
  expect(sources.every((source) => String(source.packetPath || "").startsWith("artifacts/question-bank-rights/public-commercial-approval-packet/sources/")), `${label} source summaries must point at source packet files`);
  expect(data.checks?.allActiveSourcesHavePackets === true, `${label} all active sources must have packet coverage`);
  expect(data.checks?.sourcePacketCountMatchesBlockedSources === true, `${label} packet count must match blocked sources`);
  expect(data.checks?.manifestDraftEntriesMatchPackets === true, `${label} manifest draft entries must match packets`);
  expect(data.checks?.trackerRowsMatchPackets === true, `${label} tracker rows must match packets`);
  expect(data.checks?.filesIncludeOverviewTrackerAndManifestDraft === true, `${label} must include overview, tracker, and manifest draft files`);
  expect(data.checks?.includesCommercialUseScope === true, `${label} must include commercial-use scope`);
  expect(data.checks?.packetIncludesCompleteSignoffCommand === true, `${label} packet README must include complete signoff command`);
  expect(data.checks?.packetIncludesReleaseBlockerCommand === true, `${label} packet README must include blocker refresh command`);
  expect(data.checks?.packetIncludesEvidenceUrlSafetyRules === true, `${label} packet README must include evidence URL safety rules`);
  expect(data.checks?.sourcePacketsIncludeOutreachAndDrafts === true, `${label} source packets must include outreach and manifest draft sections`);
  expect(data.checks?.sourcePacketsListRequiredScopes === true, `${label} source packets must list required scopes`);
  expect(data.checks?.manifestDraftEntriesContainTodoPlaceholders === true, `${label} manifest draft must retain TODO placeholders`);
  expect(data.checks?.releaseBlockersMatchPacketSources === true, `${label} packet source list must match release blockers`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateOpsAlertEdgePacketSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.signoffCommand === "npm run check:ops-alerts:production && npm run check:ops-alerts:production -- --smoke", `${label} must record production config plus webhook-smoke signoff`);
  expectPacketFiles(data, expect, label, [
    "artifacts/ops-alert-edge/readiness-packet/README.md",
    "artifacts/ops-alert-edge/readiness-packet/render-api-env-template.txt",
    "artifacts/ops-alert-edge/readiness-packet/cloudflare-rate-limit-rule.md",
    "artifacts/ops-alert-edge/readiness-packet/webhook-contract.md",
    "artifacts/ops-alert-edge/readiness-packet/smoke-payload.sample.json",
    "artifacts/ops-alert-edge/readiness-packet/signoff-checklist.csv"
  ]);
  for (const envName of ["QUANTGYM_ALERT_WEBHOOK_URL", "QUANTGYM_ALERT_WEBHOOK_TOKEN", "QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL"]) {
    expect(Array.isArray(data.requiredEnv) && data.requiredEnv.includes(envName), `${label} must include ${envName}`);
  }
  expect(data.edgeRule?.provider === "cloudflare", `${label} must include Cloudflare edge-rule plan`);
  expect(String(data.edgeRule?.expression || "").includes("/api/auth/"), `${label} edge-rule plan must target auth endpoints`);
  expect(Number(data.evidence?.runtimeAlertCount || 0) >= 7, `${label} must retain runtime alert-count coverage`);
  expect(Number(data.evidence?.productionNegativeFixtureCount || 0) >= 19, `${label} must retain production negative-fixture coverage`);
  expectAllChecksTrue(data, expect, label, [
    "expectedFilesWritten",
    "includesProductionEnvTemplate",
    "includesWebhookContract",
    "includesCloudflareRuleRunbook",
    "includesSignoffChecklist",
    "includesWebhookSmokeSignoff",
    "usesPlaceholderOnlyForToken",
    "noDashboardQueryOrFragmentExamples",
    "runtimeSmokePass",
    "productionFixturePass",
    "fixtureRejectsUnsafeInputs",
    "fixtureOutputRedactsSecrets"
  ]);
  expectEmptyFailures(data, expect, label);
}

function validateMediaStoragePacketSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.signoffCommand === "npm run check:media-storage:production && npm run check:media-storage:production -- --live", `${label} must record production config plus live smoke signoff`);
  expectPacketFiles(data, expect, label, [
    "artifacts/media-storage/readiness-packet/README.md",
    "artifacts/media-storage/readiness-packet/render-api-env-template.txt",
    "artifacts/media-storage/readiness-packet/r2-bucket-cdn-runbook.md",
    "artifacts/media-storage/readiness-packet/object-storage-contract.md",
    "artifacts/media-storage/readiness-packet/live-smoke-checklist.csv"
  ]);
  for (const envName of ["QUANTGYM_MEDIA_S3_ENDPOINT", "QUANTGYM_MEDIA_S3_BUCKET", "QUANTGYM_MEDIA_S3_ACCESS_KEY_ID", "QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY", "QUANTGYM_MEDIA_PUBLIC_BASE_URL"]) {
    expect(Array.isArray(data.requiredEnv) && data.requiredEnv.includes(envName), `${label} must include ${envName}`);
  }
  const operations = Array.isArray(data.storagePlan?.requiredOperations) ? data.storagePlan.requiredOperations : [];
  for (const operation of ["signed PUT", "signed GET", "public CDN GET", "signed DELETE"]) {
    expect(operations.includes(operation), `${label} must require ${operation}`);
  }
  expect(data.evidence?.liveFixtureStatus === "pass", `${label} must include passing live fixture evidence`);
  expect(data.evidence?.liveFailureRejected === true, `${label} must include live failure rejection evidence`);
  expect(data.evidence?.liveFixtureContentTypePreserved === true, `${label} must include live Content-Type preservation evidence`);
  expectAllChecksTrue(data, expect, label, [
    "expectedFilesWritten",
    "includesProductionEnvTemplate",
    "includesBucketCdnRunbook",
    "includesObjectStorageContract",
    "includesLiveSmokeChecklist",
    "includesProductionConfigSignoff",
    "usesPlaceholderOnlyForSecrets",
    "noCredentialUrlExamples",
    "runtimeSmokePass",
    "productionFixturePass",
    "fixtureRejectsUnsafeInputs",
    "fixtureOutputRedactsSecrets",
    "liveFixtureCoversPutGetPublicDelete",
    "liveFixturePreservesContentType",
    "liveFixtureCleansUp"
  ]);
  expectEmptyFailures(data, expect, label);
}

function validateChromeStorePublicationPacketSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.signoffCommand === "npm run check:chrome-store-publication:published", `${label} must record final published signoff command`);
  expectPacketFiles(data, expect, label, [
    "artifacts/chrome-store-publication/readiness-packet/README.md",
    "artifacts/chrome-store-publication/readiness-packet/developer-dashboard-submission.md",
    "artifacts/chrome-store-publication/readiness-packet/listing-fields.md",
    "artifacts/chrome-store-publication/readiness-packet/published-signoff-env-template.txt",
    "artifacts/chrome-store-publication/readiness-packet/release-package-evidence.json",
    "artifacts/chrome-store-publication/readiness-packet/signoff-checklist.csv"
  ]);
  expect(data.releasePackage?.name === "QuantGym Collector", `${label} must bind the QuantGym Collector release package`);
  expect(data.releasePackage?.version === data.listing?.version, `${label} release package and listing versions must match`);
  expect(/^[a-f0-9]{64}$/.test(String(data.releasePackage?.uploadSha256 || "")), `${label} must include release package SHA-256`);
  expect(Number(data.releasePackage?.uploadBytes || 0) > 0, `${label} release package must be non-empty`);
  expect(Number(data.releasePackage?.uploadFileCount || 0) > 0, `${label} release package must include files`);
  expect(Number(data.listing?.screenshots || 0) >= 1, `${label} must include listing screenshot evidence`);
  expectAllChecksTrue(data, expect, label, [
    "expectedFilesWritten",
    "includesDeveloperDashboardChecklist",
    "includesReleasePackageSha",
    "includesPublishedSignoffEnvTemplate",
    "includesEvidenceUrlStoreDetailRequirement",
    "includesListingSnapshot",
    "includesFinalSignoffChecklist",
    "usesPlaceholdersForPublishedIds",
    "releasePackageExists",
    "releasePackageShaMatches",
    "publicationFixturePass",
    "submissionHandoffPass",
    "publishedFixturePass",
    "negativeFixturesRejected",
    "publishedEvidenceUrlBoundToStoreListing",
    "finalSignoffCommandRecorded",
    "externalPublicationStillRequired"
  ]);
  expectEmptyFailures(data, expect, label);
}

function validateJobsFeedPublicationPacketSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.signoffCommand === "npm run check:jobs-source:production -- --live", `${label} must record live jobs-source production signoff command`);
  expectPacketFiles(data, expect, label, [
    "artifacts/jobs-feed/publication-packet/README.md",
    "artifacts/jobs-feed/publication-packet/feed-hosting-runbook.md",
    "artifacts/jobs-feed/publication-packet/render-api-env-template.txt",
    "artifacts/jobs-feed/publication-packet/source-list.md",
    "artifacts/jobs-feed/publication-packet/generated-feed-manifest.json",
    "artifacts/jobs-feed/publication-packet/live-signoff-checklist.csv",
    "artifacts/jobs-feed/publication-packet/public-ats-feed.json"
  ]);
  expect(data.feed?.source === "public-ats-greenhouse", `${label} must bind the public ATS Greenhouse feed`);
  expect(/^[a-f0-9]{64}$/.test(String(data.feed?.feedSha256 || "")), `${label} must include feed SHA-256`);
  expect(Number(data.feed?.count || 0) > 0, `${label} feed must include jobs`);
  expect(Number(data.feed?.internships || 0) > 0, `${label} feed must include internships`);
  expect(Number(data.feed?.fulltime || 0) > 0, `${label} feed must include full-time roles`);
  const sources = Array.isArray(data.sources) ? data.sources : [];
  expect(sources.length >= 4, `${label} must include multiple public ATS sources`);
  expect(sources.every((source) => source.status === "pass" && /^https:\/\//.test(String(source.url || ""))), `${label} public ATS sources must pass and use HTTPS`);
  expectAllChecksTrue(data, expect, label, [
    "expectedFilesWritten",
    "generatorPass",
    "generatedFeedSnapshotWritten",
    "generatedFeedShaMatches",
    "generatedFeedIncludesInternshipAndFulltime",
    "generatedFeedHasRealMetadata",
    "includesProductionEnvTemplate",
    "includesHostingRunbook",
    "includesSourceList",
    "includesLiveSignoffChecklist",
    "usesPlaceholderOnlyForOptionalToken",
    "noCredentialUrlExamples"
  ]);
  expectEmptyFailures(data, expect, label);
}

function validatePostgresCutoverPacketSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.signoffCommand === 'npm run check:postgres-cutover:complete -- --db "$QUANTGYM_DB" --export /secure/quantgym-sqlite-export.json', `${label} must record complete cutover signoff command`);
  expectPacketFiles(data, expect, label, [
    "artifacts/postgres-cutover/readiness-packet/README.md",
    "artifacts/postgres-cutover/readiness-packet/secure-export-runbook.md",
    "artifacts/postgres-cutover/readiness-packet/postgres-import-runbook.md",
    "artifacts/postgres-cutover/readiness-packet/cutover-signoff-env-template.txt",
    "artifacts/postgres-cutover/readiness-packet/rollback-and-backup-checklist.md",
    "artifacts/postgres-cutover/readiness-packet/live-cutover-checklist.csv"
  ]);
  for (const envName of ["QUANTGYM_POSTGRES_CUTOVER_STATUS", "QUANTGYM_POSTGRES_CUTOVER_TARGET_HOST", "QUANTGYM_POSTGRES_CUTOVER_EVIDENCE_URL", "QUANTGYM_POSTGRES_CUTOVER_BACKUP_CONFIRMED"]) {
    expect(Array.isArray(data.requiredEnv) && data.requiredEnv.includes(envName), `${label} must include ${envName}`);
  }
  expect(data.migrationInputs?.schemaPath === "api-server/postgres/schema.sql", `${label} must reference the Postgres schema path`);
  expect(Number(data.evidence?.tableCount || 0) >= 12, `${label} must retain export table-count evidence`);
  expect(Number(data.evidence?.smokeRowCount || 0) >= 12, `${label} must retain export smoke row-count evidence`);
  expect(Number(data.evidence?.completeSignoffNegativeFixtureCount || 0) >= 19, `${label} must retain complete signoff negative fixtures`);
  expectAllChecksTrue(data, expect, label, [
    "expectedFilesWritten",
    "includesSecureExportRunbook",
    "includesPostgresImportRunbook",
    "includesSignoffEnvTemplate",
    "includesRollbackBackupChecklist",
    "includesLiveCutoverChecklist",
    "includesCompleteSignoffCommand",
    "usesPlaceholdersOnlyForSensitivePaths",
    "noCredentialUrlExamples",
    "exportSmokePass",
    "includeSensitiveAccepted",
    "importSqlGenerated",
    "importSqlContainsTransaction",
    "rejectsUnsafeExports",
    "completeSignoffFixturePass",
    "completeSignoffNegativeFixturesRejected",
    "completeSignoffRejectsRawIpTarget",
    "completeSignoffRejectsUnsafeEvidence"
  ]);
  expectEmptyFailures(data, expect, label);
}

function expectPacketFiles(data, expect, label, expectedFiles) {
  const files = Array.isArray(data.filesWritten) ? data.filesWritten : [];
  expect(files.length === expectedFiles.length, `${label} must write ${expectedFiles.length} packet files`);
  for (const file of expectedFiles) {
    expect(files.includes(file), `${label} must write ${file}`);
  }
}

function expectAllChecksTrue(data, expect, label, checks) {
  for (const check of checks) {
    expect(data.checks?.[check] === true, `${label} check ${check} must be true`);
  }
}

function expectEmptyFailures(data, expect, label) {
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateBrowserExtensionRuntimeSmokeSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.popup?.source === "browser-extension/popup.js", `${label} must execute popup.js`);
  expect(data.popup?.defaultBoardUrl === "https://beta.quantgym.app/", `${label} must keep the beta board URL default`);
  expect(Number(data.calls?.storageGets || 0) >= 1, `${label} must read extension storage`);
  expect(Number(data.calls?.storageSets || 0) >= 2, `${label} must write extension storage during URL changes`);
  expect(Number(data.calls?.tabQueries || 0) >= 1, `${label} must query the active tab`);
  expect(Number(data.calls?.scriptExecutions || 0) >= 1, `${label} must execute the active-tab content script`);
  expect(Number(data.calls?.openedTabs || 0) >= 1, `${label} must open QuantGym for a normal capture`);
  for (const [key, value] of Object.entries(data.checks || {})) {
    expect(value === true, `${label} check ${key} must pass`);
  }
  for (const key of [
    "popupLoaded",
    "storageDefaultLoaded",
    "activeTabQueried",
    "scriptExecuted",
    "sourceHostRendered",
    "problemTitleRendered",
    "problemPromptRendered",
    "problemMetaRendered",
    "copyJsonWroteClipboard",
    "collectOpenedQuantGym",
    "capturePayloadHasTitle",
	    "capturePayloadHasSourceUrl",
	    "boardUrlSaved",
	    "invalidBoardUrlRejected",
	    "insecureRemoteBoardUrlRejected",
	    "loopbackHttpBoardUrlAllowed",
	    "longCaptureFallsBackToClipboard"
	  ]) {
    expect(data.checks?.[key] === true, `${label} must pass ${key}`);
  }
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
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

function validateDeployedProductionBoundarySummary(data, expect, label) {
  const googleTokenOnlyPartial = data.status === "partial"
    && Number(data.passed) === 4
    && Number(data.skipped) === 1
    && Number(data.failed) === 0;
  const fullPass = data.status === "pass"
    && Number(data.passed) === 5
    && Number(data.skipped) === 0
    && Number(data.failed) === 0;
  expect(googleTokenOnlyPartial || fullPass, `${label} must be either Google-token-only partial or full deployed pass`);
  expect(data.cloudApiEndpoint === "https://api.quantgym.app/api", `${label} must target deployed API URL`);
  expect(data.llmEndpoint === "https://llm.quantgym.app/interview", `${label} must target deployed LLM URL`);
  expect(Number(data.failed) === 0, `${label} must have zero failures`);
  const cloudHealth = findResult(data.results, "cloud health");
  const googleConfig = findResult(data.results, "google provider config");
  const googleLogin = findResult(data.results, "google provider login");
  const resumeReview = findResult(data.results, "LLM resume review");
  const pdfGeneration = findResult(data.results, "LLM PDF question generation");
  expect(cloudHealth?.status === "pass" && cloudHealth?.data?.ok === true, `${label} must pass cloud health`);
  expect(googleConfig?.status === "pass" && googleConfig?.data?.googleClientIdSet === true, `${label} must pass Google config`);
  if (googleTokenOnlyPartial) {
    expect(googleLogin?.status === "skip" && googleLogin?.reason === "Set QUANTGYM_GOOGLE_ID_TOKEN.", `${label} must skip only Google provider login`);
  } else {
    expect(googleLogin?.status === "pass" && googleLogin?.data?.googleLinked === true, `${label} full deployed pass must include Google provider login`);
  }
  expect(resumeReview?.status === "pass" && Number(resumeReview?.data?.itemCount || 0) > 0, `${label} must pass deployed LLM resume review`);
  expect(pdfGeneration?.status === "pass" && Number(pdfGeneration?.data?.questionCount || 0) > 0, `${label} must pass deployed LLM PDF question generation`);
}

function validateDeployedBetaSmokeSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.baseUrl === "https://beta.quantgym.app", `${label} must target beta.quantgym.app`);
  expect(/^\S{2}\*\*\*@[^@\s]+$/.test(String(data.email || "")), `${label} must redact the beta account email`);
  const raw = JSON.stringify(data);
  expect(!/"password"\s*:/i.test(raw), `${label} must not include password fields`);
  expect(!/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(raw), `${label} must not include raw JWT/session tokens`);

  expect(data.login?.status === "pass", `${label} login must pass`);
  expect(data.login?.emailMatched === true, `${label} login must match the requested account`);
  expect(data.login?.hasCloudToken === true, `${label} login must establish a cloud token`);
  expect(data.login?.cloudUserIdSet === true, `${label} login must establish a cloud user id`);
  expect(data.login?.cloudEndpoint === "https://api.quantgym.app/api", `${label} login must use production API endpoint`);
  expect(["local", "google"].includes(String(data.login?.provider || "")), `${label} login provider must be local or google`);

  expect(data.config?.cloudApiEndpoint === "https://api.quantgym.app/api", `${label} runtime config must use production API endpoint`);
  expect(data.config?.llmEndpoint === "https://llm.quantgym.app/interview", `${label} runtime config must use production LLM endpoint`);
  expect(data.config?.googleLoginEnabled === true, `${label} runtime config must enable Google login`);
  expect(data.config?.googleClientIdSet === true, `${label} runtime config must include Google client id`);

  const expectedPreflights = new Set(["cloud sync preflight", "poker join preflight"]);
  expect(Array.isArray(data.corsPreflights), `${label} must include deployed API CORS preflight checks`);
  expect((data.corsPreflights || []).length === expectedPreflights.size, `${label} must check all deployed API CORS preflights`);
  for (const preflight of data.corsPreflights || []) {
    expect(expectedPreflights.has(preflight.name), `${label} contains unexpected CORS preflight ${preflight.name}`);
    expect(preflight.pass === true, `${label} CORS preflight ${preflight.name} must pass`);
    expect(preflight.statusPass === true, `${label} CORS preflight ${preflight.name} must return an allowed status`);
    expect(preflight.originPass === true, `${label} CORS preflight ${preflight.name} must allow beta origin`);
    expect(preflight.methodPass === true, `${label} CORS preflight ${preflight.name} must allow requested method`);
    expect(preflight.headersPass === true, `${label} CORS preflight ${preflight.name} must allow requested headers`);
    expect(preflight.allowOrigin === "https://beta.quantgym.app", `${label} CORS preflight ${preflight.name} must allow beta.quantgym.app exactly`);
  }
  expect(data.staticAssetFallback?.pass === true, `${label} missing asset fallback must pass`);
  expect(data.staticAssetFallback?.status === 404, `${label} missing asset fallback must return 404`);
  expect(data.staticAssetFallback?.notHtml200Pass === true, `${label} missing asset fallback must not return 200 text/html`);
  expect(data.staticAssetFallback?.noStorePass === true, `${label} missing asset fallback must be no-store`);

  expect(Number(data.routeSummary?.checked || 0) === routeIds.length, `${label} must check all deployed routes`);
  expect(Number(data.routeSummary?.passed || 0) === routeIds.length, `${label} must pass all deployed routes`);
  expect(Number(data.routeSummary?.failed || 0) === 0, `${label} must have zero route failures`);
  const expectedRoutes = new Set(routeIds);
  for (const route of data.routes || []) {
    expect(expectedRoutes.has(route.name), `${label} contains unexpected route ${route.name}`);
    expect(route.status === "pass", `${label} route ${route.name} must pass`);
    expect(route.health?.appShellVisible === true, `${label} route ${route.name} must show app shell`);
    expect(route.health?.authShellVisible === false, `${label} route ${route.name} must not show auth shell`);
    expect(Number(route.health?.bodyTextLength || 0) > 0, `${label} route ${route.name} must render text`);
    expect(Number(route.health?.horizontalOverflowPx || 0) <= 2, `${label} route ${route.name} must avoid horizontal overflow`);
    expect(Object.values(route.selectors || {}).every((value) => value === true), `${label} route ${route.name} selectors must be visible`);
  }
  expect((data.routes || []).length === expectedRoutes.size, `${label} route result count must match expected routes`);

  expect(Array.isArray(data.errors?.consoleErrors) && data.errors.consoleErrors.length === 0, `${label} must have no material console errors`);
  expect(Array.isArray(data.errors?.pageErrors) && data.errors.pageErrors.length === 0, `${label} must have no page errors`);
  expect(Array.isArray(data.errors?.requestFailures) && data.errors.requestFailures.length === 0, `${label} must have no material request failures`);
  expect(Array.isArray(data.errors?.httpErrors) && data.errors.httpErrors.length === 0, `${label} must have no material HTTP errors`);
  expect(data.checks?.loginPass === true, `${label} loginPass check must pass`);
  expect(data.checks?.summaryRedacted === true, `${label} summaryRedacted check must pass`);
  expect(data.checks?.corsPreflightPass === true, `${label} corsPreflightPass check must pass`);
  expect(data.checks?.staticAssetFallbackPass === true, `${label} staticAssetFallbackPass check must pass`);
  expect(data.checks?.routeCountPass === true, `${label} routeCountPass check must pass`);
  expect(data.checks?.noHttpErrors === true, `${label} noHttpErrors check must pass`);
}

function validateDeployedBetaMobileContentSmokeSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.surface === "deployed beta mobile content smoke", `${label} surface must match`);
  expect(data.baseUrl === "https://beta.quantgym.app", `${label} must target beta.quantgym.app`);
  expect(data.authMode === "isolated local browser state", `${label} must avoid mutating a real beta account`);
  expect(Number(data.viewport?.width || 0) <= 430, `${label} must run in a mobile viewport`);
  expect(Number(data.viewport?.height || 0) >= 700, `${label} must use a realistic mobile viewport height`);
  const raw = JSON.stringify(data);
  expect(!/"password"\s*:/i.test(raw), `${label} must not include password fields`);
  expect(!/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(raw), `${label} must not include raw JWT/session tokens`);

  expect(data.config?.cloudApiEndpoint === "https://api.quantgym.app/api", `${label} runtime config must use production API endpoint`);
  expect(data.config?.llmEndpoint === "https://llm.quantgym.app/interview", `${label} runtime config must use production LLM endpoint`);
  expect(data.config?.googleLoginEnabled === true, `${label} runtime config must enable Google login`);
  expect(data.config?.googleClientIdSet === true, `${label} runtime config must include Google client id`);

  const expectedLabels = [
    "experiences-open",
    "experiences-filtered",
    "experiences-share-confirm",
    "community-after-share",
    "news-open",
    "news-form",
    "news-filtered",
    "news-detail",
    "news-reload-read"
  ];
  expect(Array.isArray(data.checkpoints) && data.checkpoints.length === expectedLabels.length, `${label} must record nine mobile checkpoints`);
  for (const checkpoint of data.checkpoints || []) {
    expect(expectedLabels.includes(checkpoint.label), `${label} contains unexpected checkpoint ${checkpoint.label}`);
    expect(Number(checkpoint.width || 0) <= 430, `${label} checkpoint ${checkpoint.label} must use mobile width`);
    expect(Number(checkpoint.overflow || 0) <= 4, `${label} checkpoint ${checkpoint.label} must avoid horizontal overflow`);
    expect(Array.isArray(checkpoint.missing) && checkpoint.missing.length === 0, `${label} checkpoint ${checkpoint.label} must have no missing selectors`);
    expect(typeof checkpoint.path === "string" && checkpoint.path.startsWith("/"), `${label} checkpoint ${checkpoint.label} must record a path`);
  }
  for (const expectedLabel of expectedLabels) {
    expect((data.checkpoints || []).some((checkpoint) => checkpoint.label === expectedLabel), `${label} must include checkpoint ${expectedLabel}`);
  }

  expect(Boolean(data.recordId), `${label} must record the saved mobile experience id`);
  expect(Boolean(data.newsId), `${label} must record the saved mobile news id`);
  expect(data.finalPath === "/news", `${label} final path must return to News after reload persistence`);
  expect(data.checks?.appShellVisible === true, `${label} app shell check must pass`);
  expect(data.checks?.configUsesProductionEndpoints === true, `${label} production runtime config check must pass`);
  expect(data.checks?.checkpointCountPass === true, `${label} checkpoint count check must pass`);
  expect(data.checks?.allExpectedCheckpointsPresent === true, `${label} all expected checkpoint check must pass`);
  expect(data.checks?.experienceSaved === true, `${label} must verify mobile Experiences save`);
  expect(data.checks?.experienceFilterUsable === true, `${label} must verify mobile Experiences filter`);
  expect(data.checks?.experienceSharedToCommunity === true, `${label} must verify mobile Experiences community share`);
  expect(data.checks?.newsSubmitted === true, `${label} must verify mobile News submit`);
  expect(data.checks?.newsFiltersUsable === true, `${label} must verify mobile News filters`);
  expect(data.checks?.newsDetailReadPersisted === true, `${label} must verify mobile News detail read persistence`);
  expect(data.checks?.noHorizontalOverflow === true, `${label} no-horizontal-overflow check must pass`);
  expect(data.checks?.noMaterialConsoleErrors === true, `${label} must have no material console errors`);
  expect(data.checks?.noPageErrors === true, `${label} must have no page errors`);
  expect(data.checks?.noRequestFailures === true, `${label} must have no material request failures`);
  expect(data.checks?.noHttpErrors === true, `${label} must have no material HTTP errors`);
  expect(data.checks?.summaryRedacted === true, `${label} summaryRedacted check must pass`);
  expect(Array.isArray(data.errors?.consoleErrors) && data.errors.consoleErrors.length === 0, `${label} console errors must be empty`);
  expect(Array.isArray(data.errors?.pageErrors) && data.errors.pageErrors.length === 0, `${label} page errors must be empty`);
  expect(Array.isArray(data.errors?.requestFailures) && data.errors.requestFailures.length === 0, `${label} request failures must be empty`);
  expect(Array.isArray(data.errors?.httpErrors) && data.errors.httpErrors.length === 0, `${label} HTTP errors must be empty`);
}

function expectCountForProductionBoundary(data, expect, field, expected, label) {
  expect(Number(data[field]) === expected, `${label} ${field} count expected ${expected}, got ${data[field]}`);
}

function validateChromeStorePublicationFixtureSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.externalPublicationRequired === true, `${label} must keep external publication marked as required`);
  expect(data.finalSignoffCommand === "npm run check:chrome-store-publication:published", `${label} must name the final published signoff command`);

  const submission = data.submissionHandoff || {};
  expect(submission.status === "pass", `${label} submission handoff must pass`);
  expect(submission.mode === "submission-handoff", `${label} submission handoff mode must be submission-handoff`);
  expect(submission.published === false, `${label} submission handoff must run before publication`);
  expect(submission.manualSubmissionRequired === true, `${label} submission handoff must require manual store submission`);
  expect(Number(submission.passed || 0) === 2, `${label} submission handoff must pass both checks`);
  expect(Number(submission.failed || 0) === 0, `${label} submission handoff must have zero failures`);
  expect(/^artifacts\/browser-extension\/quantgym-collector-v\d+\.\d+\.\d+\.zip$/.test(String(submission.uploadOutput || "")), `${label} upload zip path must be versioned`);
  expect(/^[0-9a-f]{64}$/i.test(String(submission.uploadSha256 || "")), `${label} submission handoff must report upload SHA-256`);
  expect(Number(submission.uploadBytes || 0) > 0, `${label} submission handoff upload zip must be non-empty`);
  expect(Number(submission.screenshots || 0) >= 1, `${label} submission handoff must include a screenshot`);
  expect(Number(submission.reviewerNotes || 0) >= 2, `${label} submission handoff must include reviewer notes`);

  const published = data.publishedFixture || {};
  expect(published.status === "pass", `${label} published fixture must pass`);
  expect(published.mode === "published-signoff", `${label} published fixture mode must be published-signoff`);
  expect(published.published === true, `${label} published fixture must run in published mode`);
  expect(published.manualSubmissionRequired === false, `${label} published fixture must not require manual submission`);
  expect(Number(published.passed || 0) === 3, `${label} published fixture must pass all three checks`);
  expect(Number(published.failed || 0) === 0, `${label} published fixture must have zero failures`);
  expect(/^[a-p]{32}$/.test(String(published.itemId || "")), `${label} published fixture item id must look like Chrome extension id`);
  expect(published.listingHost === "chromewebstore.google.com", `${label} published fixture listing host must be Chrome Web Store`);
  expect(published.evidenceHost === "chromewebstore.google.com", `${label} published fixture evidence host must be Chrome Web Store`);
  expect(published.publicationStatus === "published", `${label} published fixture status must be published`);
  expect(published.submittedVersion === submission.version, `${label} published fixture version must match submission handoff`);
  expect(published.uploadSha256 === submission.uploadSha256, `${label} published fixture upload SHA-256 must match submission handoff`);

  const hasEvidenceUrlStoreBindingCoverage = data.checks?.evidenceUrlNonStoreRejected !== undefined;
  expect(
    Array.isArray(data.negativeFixtures) && data.negativeFixtures.length >= (hasEvidenceUrlStoreBindingCoverage ? 19 : 17),
    `${label} must include negative publication fixtures`
  );
  expect(data.checks?.submissionHandoffPass === true, `${label} submission handoff check must pass`);
  expect(data.checks?.submissionHandoffManualSubmissionRequired === true, `${label} must preserve manual submission handoff semantics`);
  expect(data.checks?.publishedFixturePass === true, `${label} published fixture check must pass`);
  expect(data.checks?.publishedFixtureHasAllChecks === true, `${label} published fixture must include all checks`);
  expect(data.checks?.publishedFixtureMatchesUploadSha === true, `${label} published fixture must bind upload SHA-256`);
  expect(data.checks?.publishedFixtureVersionMatchesManifest === true, `${label} published fixture must bind manifest version`);
  expect(data.checks?.negativeFixturesRejected === true, `${label} negative fixtures must be rejected`);
  expect(data.checks?.negativeFixturesMentionExpectedErrors === true, `${label} negative fixtures must mention expected errors`);
  expect(data.checks?.placeholderItemIdRejected === true, `${label} must reject placeholder-looking Chrome extension ids`);
  expect(data.checks?.listingUrlEmbeddedCredentialsRejected === true, `${label} must reject listing URLs with embedded credentials`);
  expect(data.checks?.listingUrlQueryRejected === true, `${label} must reject listing URLs with query strings`);
  expect(data.checks?.listingUrlDetailPathRejected === true, `${label} must reject non-detail Chrome Web Store listing URLs`);
  expect(data.checks?.listingUrlExtraPathRejected === true, `${label} must reject Chrome Web Store listing URLs with extra path after the item id`);
  if (hasEvidenceUrlStoreBindingCoverage) {
    expect(data.checks?.evidenceUrlNonStoreRejected === true, `${label} must reject non-store evidence URLs`);
    expect(data.checks?.evidenceUrlWithoutItemIdRejected === true, `${label} must reject evidence URLs for a different item id`);
  } else if (/nested Chrome store publication fixture/i.test(label)) {
    warnings.push("Release-readiness nested Chrome store publication fixture lacks evidence URL store/item-id binding coverage; rerun npm run check:release-readiness:local after production-boundary dependencies are available.");
  } else {
    expect(false, `${label} must reject evidence URLs outside the same Chrome Web Store item id`);
  }
  expect(data.checks?.evidenceUrlEmbeddedCredentialsRejected === true, `${label} must reject evidence URLs with embedded credentials`);
  expect(data.checks?.evidenceUrlQueryRejected === true, `${label} must reject evidence URLs with query strings`);
  expect(data.checks?.externalPublicationStillRequired === true, `${label} must not mark real Chrome publication complete`);
}

function validateApexWwwDomainSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass while the beta entrypoint is healthy`);
  expect(data.surface === "apex/www domain SSL or redirect", `${label} must report the apex/www surface`);
  expect(data.signoffCommand === "npm run check:apex-www-domain -- --require-clear", `${label} must record the clear-signoff command`);
  expect(data.launchReadiness === "blocked", `${label} must keep apex/www launch readiness blocked until HTTPS is usable`);
  expect(data.betaEntrypoint?.host === "beta.quantgym.app", `${label} must keep beta.quantgym.app as the current healthy entrypoint`);
  expect(data.betaEntrypoint?.https?.usableHttps === true, `${label} beta entrypoint must be usable`);
  expect(Array.isArray(data.promotionHosts) && data.promotionHosts.length === 2, `${label} must inspect both promotion hosts`);
  for (const host of ["quantgym.app", "www.quantgym.app"]) {
    const result = data.promotionHosts.find((item) => item.host === host);
    expect(Boolean(result), `${label} must include ${host}`);
    expect((result?.dns?.aRecords || []).length > 0 || (result?.dns?.cnameRecords || []).length > 0, `${label} ${host} must resolve in DNS`);
    expect(result?.https?.cloudflare525 === true, `${label} ${host} must record the current Cloudflare 525 state`);
    expect(result?.https?.usableHttps === false, `${label} ${host} must remain unusable until external SSL/redirect is fixed`);
    expect(result?.https?.blockedReason === "Cloudflare 525 SSL handshake error", `${label} ${host} must classify the blocker`);
  }
  expect(data.checks?.betaHealthy === true, `${label} must confirm beta remains healthy`);
  expect(data.checks?.apexDnsResolved === true, `${label} must confirm apex DNS resolves`);
  expect(data.checks?.wwwDnsResolved === true, `${label} must confirm WWW DNS resolves`);
  expect(data.checks?.apexHttpsProbeRan === true, `${label} must probe apex HTTPS`);
  expect(data.checks?.wwwHttpsProbeRan === true, `${label} must probe WWW HTTPS`);
  expect(data.checks?.apexWwwClear === false, `${label} must not clear apex/www while 525 remains`);
  expect(data.checks?.apexCloudflare525Observed === true, `${label} must observe apex Cloudflare 525`);
  expect(data.checks?.wwwCloudflare525Observed === true, `${label} must observe WWW Cloudflare 525`);
  expect(data.checks?.currentBlockedStateClassified === true, `${label} must classify the current blocked state`);
  expect(data.checks?.requireClearModeAvailable === true, `${label} must expose a require-clear mode`);
  expect(data.checks?.requireClearWouldFail === true, `${label} must prove require-clear would fail while blocked`);
  expect(Array.isArray(data.failures) && data.failures.length === 0, `${label} failures must be empty`);
}

function validateExternalLaunchBlockersSummary(data, expect, label, options = {}) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(data.launchReadiness === "blocked", `${label} must keep public launch marked blocked until external signoffs clear`);
  expect(Number(data.blockerCount || 0) === 6, `${label} must track six remaining external blockers after jobs feed clears`);
  expect(Number(data.trackedCount || 0) === 1, `${label} must track one continuing browser-journey expansion item`);
  expect(data.checks?.requiredScriptsPresent === true, `${label} must verify required signoff scripts exist`);
  expect(data.checks?.outstandingItemsTracked === true, `${label} must verify product-status outstanding items are tracked`);
  const releaseReadinessCheck = data.checks?.releaseReadinessIncludesExternalFixtures;
  const releaseReadinessBlockerGateCheck = data.checks?.releaseReadinessIncludesExternalBlockerGate;
  const skippedReleaseSummaryContent = data.checks?.skippedReleaseSummaryContent === true;
  expect(
    releaseReadinessCheck === true
      || (options.allowSkippedReleaseSummaryContent === true && releaseReadinessCheck === "skipped" && skippedReleaseSummaryContent),
    `${label} must verify release-readiness includes external fixture gates`
  );
  expect(
    releaseReadinessBlockerGateCheck === true
      || (options.allowSkippedReleaseSummaryContent === true && releaseReadinessBlockerGateCheck === "skipped" && skippedReleaseSummaryContent),
    `${label} must verify release-readiness includes the external blocker gate`
  );
  expect(data.checks?.requireClearWouldFail === true, `${label} must prove --require-clear would fail while blockers remain`);
  expect(data.checks?.browserDeployedBetaSmokePass === true, `${label} must verify the deployed beta smoke remains pass`);
  expect(data.checks?.browserDeployedBetaLoginPass === true, `${label} must verify the deployed beta smoke login remains pass`);
  expect(data.checks?.browserDeployedBetaRouteSweepPass === true, `${label} must verify the deployed beta smoke route sweep remains pass`);
  expect(data.checks?.browserDeployedBetaErrorSweepPass === true, `${label} must verify the deployed beta smoke error sweep remains pass`);
  expect(data.checks?.browserDeployedBetaMobileContentPass === true, `${label} must verify the deployed beta mobile content smoke remains pass`);
  expect(data.checks?.browserDeployedBetaMobileContentCheckpointPass === true, `${label} must verify the deployed beta mobile content checkpoints`);
  expect(data.checks?.browserDeployedBetaMobileContentExperiencePass === true, `${label} must verify the deployed beta mobile Experiences flow`);
  expect(data.checks?.browserDeployedBetaMobileContentNewsPass === true, `${label} must verify the deployed beta mobile News flow`);
  expect(data.checks?.browserDeployedBetaMobileContentErrorSweepPass === true, `${label} must verify the deployed beta mobile content error sweep`);
  expect(data.checks?.browserDeployedBetaMobileContentSummaryRedactedPass === true, `${label} must verify the deployed beta mobile content summary is redacted`);
  expect(data.checks?.browserAuthPasswordResetPass === true, `${label} must verify the Auth password reset browser journey remains pass`);
  expect(data.checks?.browserCrossModuleJourneyPass === true, `${label} must verify the cross-module browser journey remains pass`);
  expect(data.checks?.browserPlanBaselineDiagnosticPass === true, `${label} must verify the Plan baseline diagnostic browser journey remains pass`);
  expect(data.checks?.browserTodoDockLifecyclePass === true, `${label} must verify the Todo dock lifecycle browser journey remains pass`);
  expect(data.checks?.browserResumeLlmReviewPass === true, `${label} must verify the Resume LLM review browser journey remains pass`);
  expect(data.checks?.browserMobileResumeReviewPass === true, `${label} must verify the mobile Resume review browser journey remains pass`);
  expect(data.checks?.browserInterviewAttachmentPass === true, `${label} must verify the Interview attachment browser journey remains pass`);
  expect(data.checks?.browserInterviewPdfSourcePass === true, `${label} must verify the Interview PDF source browser journey remains pass`);
  expect(data.checks?.browserMobileInterviewAdvancedSetupPass === true, `${label} must verify the mobile Interview advanced setup browser journey remains pass`);
  expect(data.checks?.browserAccountEmailChangePass === true, `${label} must verify the Account email-change browser journey remains pass`);
  expect(data.checks?.browserAccountUploadPass === true, `${label} must verify the Account upload browser journey remains pass`);
  expect(data.checks?.browserAccountAvatarClearPass === true, `${label} must verify the Account avatar clear browser journey remains pass`);
  expect(data.checks?.browserMobileAccountControlsPass === true, `${label} must verify the mobile Account controls browser journey remains pass`);
  expect(data.checks?.browserCommunityMediaPostPass === true, `${label} must verify the Community media post browser journey remains pass`);
  expect(data.checks?.browserCommunityVideoPostPass === true, `${label} must verify the Community video post browser journey remains pass`);
  expect(data.checks?.browserCommunityDirectMessagePass === true, `${label} must verify the Community direct-message browser journey remains pass`);
  expect(data.checks?.browserMobileSocialControlsPass === true, `${label} must verify the mobile social browser journey remains pass`);
  expect(data.checks?.browserMemoryImageUploadPass === true, `${label} must verify the Memory image upload browser journey remains pass`);
  expect(data.checks?.browserToolsMentalMathCompletionPass === true, `${label} must verify the Tools mental math completion browser journey remains pass`);
  expect(data.checks?.browserToolsMarketGamePass === true, `${label} must verify the Tools market game browser journey remains pass`);
  expect(data.checks?.browserPokerPreflopPass === true, `${label} must verify the Poker preflop browser journey remains pass`);
  expect(data.checks?.browserPokerLeaveTablePass === true, `${label} must verify the Poker leave-table browser journey remains pass`);
  expect(data.checks?.browserOverviewLeaderboardPass === true, `${label} must verify the Overview leaderboard browser journey remains pass`);
  expect(data.checks?.browserStreakCheckInCalendarPass === true, `${label} must verify the streak check-in calendar browser journey remains pass`);
  expect(data.checks?.browserShellGlobalControlsPass === true, `${label} must verify the shell global controls browser journey remains pass`);
  expect(data.checks?.browserHashCompatDeepLinkPass === true, `${label} must verify the hash-compatible deep-link browser journey remains pass`);
  expect(data.checks?.browserSettingsRuntimeConfigPass === true, `${label} must verify the Settings runtime config browser journey remains pass`);
  expect(data.checks?.browserSettingsLanguageSwitchPass === true, `${label} must verify the Settings language-switch browser journey remains pass`);
  expect(data.checks?.browserSettingsGoogleClientClearPass === true, `${label} must verify the Settings Google Client ID clear browser journey remains pass`);
  expect(data.checks?.browserSettingsBackupPass === true, `${label} must verify the Settings backup browser journey remains pass`);
  expect(data.checks?.browserMobileSettingsControlsPass === true, `${label} must verify the mobile Settings controls browser journey remains pass`);
  expect(data.checks?.browserLibraryCloudPdfReaderPass === true, `${label} must verify the Library cloud PDF reader browser journey remains pass`);
  expect(data.checks?.browserProblemsSocialGuardPass === true, `${label} must verify the Problems social no-cloud browser journey remains pass`);
  expect(data.checks?.browserProblemsPaginationInterviewHandoffPass === true, `${label} must verify the Problems pagination/interview handoff browser journey remains pass`);
  expect(data.checks?.browserMobileProblemsDetailHandoffPass === true, `${label} must verify the mobile Problems detail/interview handoff browser journey remains pass`);
  expect(data.checks?.browserProblemsRankingNavigationPass === true, `${label} must verify the Problems ranking navigation browser journey remains pass`);
  expect(data.checks?.browserLeetcodeHotTrackingPass === true, `${label} must verify the LeetCode Hot 100 browser journey remains pass`);
  expect(data.checks?.browserMobileCareerControlsPass === true, `${label} must verify the mobile career browser journey remains pass`);

  for (const id of [
    "apex-www-ssl",
    "ops-alerts-edge-rate-limit",
    "media-bucket-cdn",
    "chrome-web-store-publication",
    "postgres-managed-cutover",
    "question-bank-public-commercial-rights"
  ]) {
    const blocker = findBlocker(data.blockers, id);
    expect(blocker?.status === "blocked", `${label} must keep ${id} blocked until real external signoff`);
    expect(typeof blocker?.ownerAction === "string" && blocker.ownerAction.length > 20, `${label} ${id} must describe the owner action`);
  }

  const apex = findBlocker(data.blockers, "apex-www-ssl");
  expect(apex?.signoffCommand === "npm run check:apex-www-domain -- --require-clear", `${label} apex/WWW must record the clear-signoff command`);
  expect(apex?.localCoverage?.trackedInProductStatus === true, `${label} must keep apex/WWW tracked in product status`);
  expect(apex?.localCoverage?.liveDiagnosisPass === true, `${label} must include apex/WWW live diagnosis coverage`);
  expect(apex?.localCoverage?.betaEntrypointHealthy === true, `${label} must prove beta entrypoint remains healthy`);
  expect(apex?.localCoverage?.apexDnsResolved === true, `${label} must include apex DNS coverage`);
  expect(apex?.localCoverage?.wwwDnsResolved === true, `${label} must include WWW DNS coverage`);
  expect(apex?.localCoverage?.currentBlockedStateClassified === true, `${label} must classify the apex/WWW blocked state`);
  expect(apex?.localCoverage?.apexCloudflare525Observed === true, `${label} must include apex Cloudflare 525 evidence`);
  expect(apex?.localCoverage?.wwwCloudflare525Observed === true, `${label} must include WWW Cloudflare 525 evidence`);
  expect(apex?.localCoverage?.requireClearModeAvailable === true, `${label} must expose apex/WWW require-clear mode`);
  expect(apex?.localCoverage?.requireClearWouldFail === true, `${label} must prove apex/WWW require-clear would fail while blocked`);

  const ops = findBlocker(data.blockers, "ops-alerts-edge-rate-limit");
  expect(ops?.signoffCommand === "npm run check:ops-alerts:production && npm run check:ops-alerts:production -- --smoke", `${label} ops alerts must record both production config and webhook-smoke signoff commands`);
  expect(ops?.localCoverage?.runtimeSmokePass === true, `${label} must include ops runtime smoke coverage`);
  expect(ops?.localCoverage?.productionFixturePass === true, `${label} must include ops production fixture coverage`);
  expect(ops?.localCoverage?.packetIncludesWebhookSmokeSignoff === true, `${label} must include ops packet webhook-smoke signoff coverage`);
  expect(ops?.localCoverage?.packetSignoffRequiresWebhookSmoke === true, `${label} must require the ops webhook smoke in final signoff`);
  expect(ops?.localCoverage?.localWebhookSmokeAuthorized === true, `${label} must include ops local webhook smoke authorization coverage`);
  expect(ops?.localCoverage?.localWebhookSmokePayloadSafe === true, `${label} must include ops local webhook smoke payload-safety coverage`);
  expect(ops?.localCoverage?.validProductionWebhookTokenRedacted === true, `${label} must include ops production webhook token redaction coverage`);
  expect(ops?.localCoverage?.validProductionWebhookUrlRedacted === true, `${label} must include ops production webhook URL redaction coverage`);
  expect(ops?.localCoverage?.validProductionEdgeEvidenceUrlRedacted === true, `${label} must include ops edge evidence URL redaction coverage`);
  expect(ops?.localCoverage?.shortWebhookTokenRejected === true, `${label} must include ops short webhook-token rejection`);
  expect(ops?.localCoverage?.placeholderWebhookTokenRejected === true, `${label} must include ops placeholder webhook-token rejection`);
  expect(ops?.localCoverage?.webhookUrlEmbeddedCredentialsRejected === true, `${label} must include ops webhook URL credential rejection`);
  expect(ops?.localCoverage?.webhookUrlQueryRejected === true, `${label} must include ops webhook URL query rejection`);
  expect(ops?.localCoverage?.edgeEvidenceUrlEmbeddedCredentialsRejected === true, `${label} must include ops edge evidence URL credential rejection`);
  expect(ops?.localCoverage?.edgeEvidenceUrlQueryRejected === true, `${label} must include ops edge evidence URL query rejection`);
  const media = findBlocker(data.blockers, "media-bucket-cdn");
  expect(media?.signoffCommand === "npm run check:media-storage:production && npm run check:media-storage:production -- --live", `${label} media storage must record both production config and live signoff commands`);
  expect(media?.localCoverage?.packetIncludesProductionConfigSignoff === true, `${label} must include media packet production-config signoff coverage`);
  expect(media?.localCoverage?.packetSignoffRequiresConfigAndLive === true, `${label} must require both media config and live signoff`);
  expect(media?.localCoverage?.validProductionAccessKeyRedacted === true, `${label} must include media access-key redaction coverage`);
  expect(media?.localCoverage?.validProductionSecretRedacted === true, `${label} must include media secret-key redaction coverage`);
  expect(media?.localCoverage?.validProductionEndpointUrlRedacted === true, `${label} must include media endpoint URL redaction coverage`);
  expect(media?.localCoverage?.validProductionPublicBaseUrlRedacted === true, `${label} must include media public-base URL redaction coverage`);
  expect(media?.localCoverage?.liveFixturePass === true, `${label} must include media live fixture coverage`);
  expect(media?.localCoverage?.liveFailureRejected === true, `${label} must include media failed-public-read live fixture rejection`);
  expect(media?.localCoverage?.endpointEmbeddedCredentialsRejected === true, `${label} must include media endpoint credential rejection`);
  expect(media?.localCoverage?.endpointQueryRejected === true, `${label} must include media endpoint query rejection`);
  expect(media?.localCoverage?.publicBaseEmbeddedCredentialsRejected === true, `${label} must include media public-base credential rejection`);
  expect(media?.localCoverage?.publicBaseQueryRejected === true, `${label} must include media public-base query rejection`);
  expect(media?.localCoverage?.rawProviderPublicBaseRejected === true, `${label} must include media raw provider public-host rejection`);
  expect(media?.localCoverage?.placeholderAccessKeyRejected === true, `${label} must include media placeholder access-key rejection`);
  expect(media?.localCoverage?.shortSecretKeyRejected === true, `${label} must include media short secret-key rejection`);
  expect(media?.localCoverage?.unsafeBucketNameRejected === true, `${label} must include media unsafe bucket-name rejection`);
  expect(media?.localCoverage?.unsafeObjectPrefixRejected === true, `${label} must include media unsafe object-prefix rejection`);
  expect(media?.localCoverage?.liveFixturePreservesContentType === true, `${label} must include media live Content-Type preservation coverage`);
  const jobs = findBlocker(data.blockers, "jobs-real-feed");
  expect(jobs?.status === "pass", `${label} must mark jobs real feed pass after deployed API source smoke`);
  expect(typeof jobs?.ownerAction === "string" && jobs.ownerAction.includes("Deployed API source feed is live"), `${label} jobs owner action must record deployed source signoff`);
  expect(jobs?.localCoverage?.liveValidFixturePass === true, `${label} must include jobs live fixture coverage`);
  expect(jobs?.localCoverage?.sourceUrlEmbeddedCredentialsRejected === true, `${label} must include jobs source URL credential rejection`);
  expect(jobs?.localCoverage?.sourceUrlQueryRejected === true, `${label} must include jobs source URL query rejection`);
  expect(jobs?.localCoverage?.placeholderSourceTokenRejected === true, `${label} must include jobs placeholder token rejection`);
  expect(jobs?.localCoverage?.shortSourceTokenRejected === true, `${label} must include jobs short token rejection`);
  expect(jobs?.localCoverage?.staticFeedPass === true, `${label} must include jobs static public ATS feed coverage`);
  expect(jobs?.localCoverage?.staticFeedPublicUrlReady === true, `${label} must include jobs static public URL readiness`);
  expect(jobs?.localCoverage?.staticFeedIncludesInternshipAndFulltime === true, `${label} must include jobs static internship/full-time coverage`);
  expect(jobs?.localCoverage?.staticFeedHasRealMetadata === true, `${label} must include jobs static real metadata coverage`);
  expect(jobs?.localCoverage?.staticFeedShaSet === true, `${label} must include jobs static feed SHA coverage`);
  expect(jobs?.localCoverage?.deployedApiSourcePass === true, `${label} must include deployed jobs API source smoke coverage`);
  expect(jobs?.localCoverage?.deployedApiSourceMerged === true, `${label} must include deployed jobs API source merge coverage`);
  expect(jobs?.localCoverage?.deployedApiSourceStatusOk === true, `${label} must include deployed jobs API sourceStatus coverage`);
  expect(jobs?.localCoverage?.deployedApiSourceCountLooksLikePublicAtsFeed === true, `${label} must include deployed jobs API public ATS count coverage`);
  expect(jobs?.localCoverage?.deployedApiSourceHasRealMetadata === true, `${label} must include deployed jobs API metadata coverage`);
  expect(jobs?.localCoverage?.deployedApiFallbackCatalogMerged === true, `${label} must include deployed jobs API fallback-catalog merge coverage`);
  const chrome = findBlocker(data.blockers, "chrome-web-store-publication");
  expect(chrome?.localCoverage?.packetReleasePackageExists === true, `${label} must include Chrome release package existence coverage`);
  expect(chrome?.localCoverage?.packetReleasePackageShaMatches === true, `${label} must include Chrome release package SHA match coverage`);
  expect(chrome?.localCoverage?.submissionHandoffPass === true, `${label} must include Chrome submission handoff coverage`);
  expect(chrome?.localCoverage?.submissionHandoffManualSubmissionRequired === true, `${label} must preserve Chrome manual submission requirement`);
  expect(chrome?.localCoverage?.publishedFixturePass === true, `${label} must include Chrome published fixture coverage`);
  expect(chrome?.localCoverage?.publishedFixtureHasAllChecks === true, `${label} must include Chrome published fixture full-check coverage`);
  expect(chrome?.localCoverage?.publishedFixtureMatchesUploadSha === true, `${label} must bind Chrome published fixture to the current upload SHA`);
  expect(chrome?.localCoverage?.publishedFixtureVersionMatchesManifest === true, `${label} must bind Chrome published fixture to manifest version`);
  expect(chrome?.localCoverage?.negativeFixturesRejected === true, `${label} must include Chrome negative publication fixture rejection`);
  expect(chrome?.localCoverage?.externalPublicationStillRequired === true, `${label} must preserve Chrome external publication requirement`);
  expect(chrome?.localCoverage?.placeholderItemIdRejected === true, `${label} must include Chrome placeholder item-id rejection`);
  expect(chrome?.localCoverage?.listingUrlEmbeddedCredentialsRejected === true, `${label} must include Chrome listing URL credential rejection`);
  expect(chrome?.localCoverage?.listingUrlQueryRejected === true, `${label} must include Chrome listing URL query rejection`);
  expect(chrome?.localCoverage?.listingUrlExtraPathRejected === true, `${label} must include Chrome listing URL extra-path rejection`);
  expect(chrome?.localCoverage?.listingUrlDetailPathRejected === true, `${label} must include Chrome non-detail listing rejection`);
  expect(chrome?.localCoverage?.evidenceUrlNonStoreRejected === true, `${label} must include Chrome non-store evidence URL rejection`);
  expect(chrome?.localCoverage?.evidenceUrlWithoutItemIdRejected === true, `${label} must include Chrome evidence URL item-id binding`);
  expect(chrome?.localCoverage?.evidenceUrlEmbeddedCredentialsRejected === true, `${label} must include Chrome evidence URL credential rejection`);
  expect(chrome?.localCoverage?.evidenceUrlQueryRejected === true, `${label} must include Chrome evidence URL query rejection`);
  const postgres = findBlocker(data.blockers, "postgres-managed-cutover");
  expect(postgres?.localCoverage?.packetIncludesCompleteSignoffCommand === true, `${label} must include Postgres packet complete-signoff command coverage`);
  expect(postgres?.localCoverage?.packetSignoffCommandRecorded === true, `${label} must record the Postgres final signoff command`);
  expect(postgres?.localCoverage?.packetUsesPlaceholdersOnlyForSensitivePaths === true, `${label} must keep Postgres packet placeholders limited to sensitive paths`);
  expect(postgres?.localCoverage?.packetNoCredentialUrlExamples === true, `${label} must keep Postgres packet free of credential URL examples`);
  expect(postgres?.localCoverage?.packetRejectsUnsafeExports === true, `${label} must include Postgres packet unsafe-export rejection coverage`);
  expect(postgres?.localCoverage?.packetCompleteSignoffRejectsRawIpTarget === true, `${label} must include Postgres packet raw-IP target rejection coverage`);
  expect(postgres?.localCoverage?.packetCompleteSignoffRejectsUnsafeEvidence === true, `${label} must include Postgres packet unsafe evidence rejection coverage`);
  expect(postgres?.localCoverage?.includeSensitiveImportPlanValid === true, `${label} must include Postgres include-sensitive import-plan validation`);
  expect(postgres?.localCoverage?.pendingStatusRejected === true, `${label} must include Postgres pending status rejection`);
  expect(postgres?.localCoverage?.localhostTargetHostRejected === true, `${label} must include Postgres localhost target-host rejection`);
  expect(postgres?.localCoverage?.completeSignoffNegativeFixturesRejected === true, `${label} must include Postgres negative signoff fixtures`);
  expect(postgres?.localCoverage?.privateTargetHostRejected === true, `${label} must include Postgres private target-host rejection`);
  expect(postgres?.localCoverage?.publicIpTargetHostRejected === true, `${label} must include Postgres raw-IP target-host rejection`);
  expect(postgres?.localCoverage?.databaseDsnRejected === true, `${label} must include Postgres database DSN rejection`);
  expect(postgres?.localCoverage?.placeholderEvidenceUrlRejected === true, `${label} must include Postgres placeholder evidence-URL rejection`);
  expect(postgres?.localCoverage?.privateEvidenceUrlRejected === true, `${label} must include Postgres private evidence-URL rejection`);
  expect(postgres?.localCoverage?.targetHostWhitespaceRejected === true, `${label} must include Postgres malformed target-host rejection`);
  expect(postgres?.localCoverage?.databaseUnsafeCharactersRejected === true, `${label} must include Postgres unsafe database-name rejection`);
  expect(postgres?.localCoverage?.evidenceUrlEmbeddedCredentialsRejected === true, `${label} must include Postgres evidence URL credential rejection`);
  expect(postgres?.localCoverage?.evidenceUrlQueryRejected === true, `${label} must include Postgres evidence URL query rejection`);
  expect(postgres?.localCoverage?.futureCompletedTimestampRejected === true, `${label} must include Postgres future timestamp rejection`);
  expect(postgres?.localCoverage?.exportShaMismatchRejected === true, `${label} must include Postgres export SHA mismatch rejection`);
  expect(postgres?.localCoverage?.sourceDbShaMismatchRejected === true, `${label} must include Postgres source DB SHA mismatch rejection`);
  expect(postgres?.localCoverage?.targetRowCountMismatchRejected === true, `${label} must include Postgres target row-count mismatch rejection`);
  expect(postgres?.localCoverage?.inactiveAppDatabaseRejected === true, `${label} must include Postgres inactive app DB rejection`);
  expect(postgres?.localCoverage?.missingBackupConfirmationRejected === true, `${label} must include Postgres missing backup confirmation rejection`);
  const rights = findBlocker(data.blockers, "question-bank-public-commercial-rights");
  expect(Number(rights?.localCoverage?.publicBlockerCount || 0) === 15, `${label} must keep all active public source-rights blockers visible`);
  expect(Number(rights?.localCoverage?.commercialBlockerCount || 0) === 15, `${label} must keep all active commercial source-rights blockers visible`);
  expect(rights?.localCoverage?.approvalPacketGenerated === true, `${label} must include question-bank approval packet coverage`);
  expect(rights?.localCoverage?.approvalPacketIncludesSignoffCommand === true, `${label} must include question-bank approval packet signoff command coverage`);
  expect(rights?.localCoverage?.approvalPacketSignoffCommandRecorded === true, `${label} must record question-bank approval packet signoff command`);
  expect(rights?.localCoverage?.approvalPacketIncludesReleaseBlockerCommand === true, `${label} must include question-bank blocker refresh command coverage`);
  expect(rights?.localCoverage?.approvalPacketIncludesEvidenceUrlSafetyRules === true, `${label} must include question-bank evidence URL safety rules`);
  expect(Number(rights?.localCoverage?.approvalPacketSourcePacketCount || 0) === 15, `${label} must include all question-bank source packets`);
  expect(rights?.localCoverage?.approvalPacketSourcePacketsMatchBlockers === true, `${label} must match question-bank source packets to release blockers`);
  expect(rights?.localCoverage?.approvalPacketDraftPlaceholders === true, `${label} must keep question-bank packet drafts placeholder-only`);
  expect(rights?.localCoverage?.approvalPacketSourcePacketsIncludeOutreachAndDrafts === true, `${label} must include question-bank outreach and draft packet coverage`);
  expect(rights?.localCoverage?.publicSmokePass === true, `${label} must include question-bank public smoke coverage`);
  expect(rights?.localCoverage?.validPublicApprovalFixturePass === true, `${label} must include valid public approval fixture coverage`);
  expect(rights?.localCoverage?.validCommercialApprovalFixturePass === true, `${label} must include valid commercial approval fixture coverage`);
  expect(rights?.localCoverage?.publicOnlyRejectedCommercial === true, `${label} must include public-only commercial rejection`);
  expect(rights?.localCoverage?.publicOnlyCommercialMentionsScope === true, `${label} must include public-only commercial scope detail`);
  expect(rights?.localCoverage?.placeholderEvidenceRejected === true, `${label} must include question-bank placeholder evidence rejection`);
  expect(rights?.localCoverage?.privateEvidenceRejected === true, `${label} must include question-bank private evidence rejection`);
  expect(rights?.localCoverage?.privateEvidenceMentionsPrivateNetwork === true, `${label} must include question-bank private-network rejection detail`);
  expect(rights?.localCoverage?.evidenceUrlEmbeddedCredentialsRejected === true, `${label} must include question-bank evidence URL credential rejection`);
  expect(rights?.localCoverage?.evidenceUrlQueryRejected === true, `${label} must include question-bank evidence URL query rejection`);
  expect(rights?.localCoverage?.staleApprovalRejected === true, `${label} must include question-bank stale approval rejection`);
  expect(rights?.localCoverage?.missingGrantorRejected === true, `${label} must include question-bank missing grantor rejection`);
  expect(rights?.localCoverage?.unsupportedScopeRejected === true, `${label} must include question-bank unsupported scope rejection`);
  const browser = findBlocker(data.blockers, "browser-journey-expansion");
  expect(browser?.status === "tracked", `${label} must keep browser journey expansion as a tracked beta-quality item`);
  expect(Number(browser?.localCoverage?.interactionsChecked || 0) >= 62, `${label} must reference the 62-interaction browser route smoke`);
  expect(browser?.localCoverage?.deployedBetaSmokePass === true, `${label} must include deployed beta smoke coverage`);
  expect(Number(browser?.localCoverage?.deployedBetaRoutesChecked || 0) >= routeIds.length, `${label} must include the all-route deployed beta smoke`);
  expect(browser?.localCoverage?.deployedBetaRoutesPass === true, `${label} must include deployed beta route sweep coverage`);
  expect(browser?.localCoverage?.deployedBetaLoginPass === true, `${label} must include deployed beta login coverage`);
  expect(browser?.localCoverage?.deployedBetaProductionEndpointPass === true, `${label} must include deployed beta production endpoint coverage`);
  expect(browser?.localCoverage?.deployedBetaCorsPreflightPass === true, `${label} must include deployed beta API CORS preflight coverage`);
  expect(browser?.localCoverage?.deployedBetaPokerCorsPreflightPass === true, `${label} must include deployed beta Poker join CORS preflight coverage`);
  expect(browser?.localCoverage?.deployedBetaStaticAssetFallbackPass === true, `${label} must include deployed beta missing asset 404 coverage`);
  expect(browser?.localCoverage?.deployedBetaErrorSweepPass === true, `${label} must include deployed beta error sweep coverage`);
  expect(browser?.localCoverage?.deployedBetaSummaryRedactedPass === true, `${label} must include deployed beta summary redaction coverage`);
  expect(browser?.localCoverage?.deployedBetaMobileContentPass === true, `${label} must include deployed beta mobile content coverage`);
  expect(browser?.localCoverage?.deployedBetaMobileContentCheckpointPass === true, `${label} must include deployed beta mobile content checkpoint coverage`);
  expect(browser?.localCoverage?.deployedBetaMobileContentExperiencePass === true, `${label} must include deployed beta mobile Experiences coverage`);
  expect(browser?.localCoverage?.deployedBetaMobileContentNewsPass === true, `${label} must include deployed beta mobile News coverage`);
  expect(browser?.localCoverage?.deployedBetaMobileContentErrorSweepPass === true, `${label} must include deployed beta mobile content error sweep coverage`);
  expect(browser?.localCoverage?.deployedBetaMobileContentSummaryRedactedPass === true, `${label} must include deployed beta mobile content redaction coverage`);
  expect(browser?.localCoverage?.authPasswordResetPass === true, `${label} must include Auth password reset browser coverage`);
  expect(browser?.localCoverage?.planBaselineDiagnosticPass === true, `${label} must include Plan baseline diagnostic browser coverage`);
  expect(browser?.localCoverage?.todoDockLifecyclePass === true, `${label} must include Todo dock lifecycle browser coverage`);
  expect(browser?.localCoverage?.resumeLlmReviewPass === true, `${label} must include Resume LLM review browser coverage`);
  expect(browser?.localCoverage?.mobileResumeReviewPass === true, `${label} must include mobile Resume review browser coverage`);
  expect(browser?.localCoverage?.interviewAttachmentPass === true, `${label} must include Interview attachment browser coverage`);
  expect(browser?.localCoverage?.interviewPdfSourcePass === true, `${label} must include Interview PDF source browser coverage`);
  expect(browser?.localCoverage?.mobileInterviewAdvancedSetupPass === true, `${label} must include mobile Interview advanced setup browser coverage`);
  expect(browser?.localCoverage?.accountEmailChangePass === true, `${label} must include Account email-change browser coverage`);
  expect(browser?.localCoverage?.accountUploadPass === true, `${label} must include Account upload browser coverage`);
  expect(browser?.localCoverage?.accountAvatarClearPass === true, `${label} must include Account avatar clear browser coverage`);
  expect(browser?.localCoverage?.mobileAccountControlsPass === true, `${label} must include mobile Account controls browser coverage`);
  expect(browser?.localCoverage?.communityMediaPostPass === true, `${label} must include Community media post browser coverage`);
  expect(browser?.localCoverage?.communityVideoPostPass === true, `${label} must include Community video post browser coverage`);
  expect(browser?.localCoverage?.communityDirectMessagePass === true, `${label} must include Community direct-message browser coverage`);
  expect(browser?.localCoverage?.mobileSocialControlsPass === true, `${label} must include mobile social browser coverage`);
  expect(browser?.localCoverage?.messagesMultiThreadUnreadPass === true, `${label} must include Messages multi-thread unread browser coverage`);
  expect(browser?.localCoverage?.mobileContentControlsPass === true, `${label} must include mobile News/Experiences browser coverage`);
  expect(browser?.localCoverage?.memoryImageUploadPass === true, `${label} must include Memory image upload browser coverage`);
  expect(browser?.localCoverage?.toolsMentalMathCompletionPass === true, `${label} must include Tools mental math completion browser coverage`);
  expect(browser?.localCoverage?.toolsMarketGamePass === true, `${label} must include Tools market game browser coverage`);
  expect(browser?.localCoverage?.pokerDefaultLocalNoAutoJoinPass === true, `${label} must include Poker default local no-auto-join browser coverage`);
  expect(browser?.localCoverage?.pokerPreflopPass === true, `${label} must include Poker preflop matrix browser coverage`);
  expect(browser?.localCoverage?.pokerLeaveTablePass === true, `${label} must include Poker leave-table browser coverage`);
  expect(browser?.localCoverage?.overviewLeaderboardPass === true, `${label} must include Overview leaderboard browser coverage`);
  expect(browser?.localCoverage?.streakCheckInCalendarPass === true, `${label} must include streak check-in calendar browser coverage`);
  expect(browser?.localCoverage?.shellGlobalControlsPass === true, `${label} must include shell global controls browser coverage`);
  expect(browser?.localCoverage?.hashCompatDeepLinkPass === true, `${label} must include hash-compatible deep-link browser coverage`);
  expect(browser?.localCoverage?.mobileShellControlsPass === true, `${label} must include mobile shell controls browser coverage`);
  expect(browser?.localCoverage?.mobileModuleNavPass === true, `${label} must include mobile module nav browser coverage`);
  expect(browser?.localCoverage?.settingsRuntimeConfigPass === true, `${label} must include Settings runtime config browser coverage`);
  expect(browser?.localCoverage?.settingsLanguageSwitchPass === true, `${label} must include Settings language-switch browser coverage`);
  expect(browser?.localCoverage?.settingsGoogleClientClearPass === true, `${label} must include Settings Google Client ID clear browser coverage`);
  expect(browser?.localCoverage?.settingsBackupPass === true, `${label} must include Settings backup browser coverage`);
  expect(browser?.localCoverage?.settingsInvalidBackupGuardPass === true, `${label} must include Settings invalid-backup guard browser coverage`);
  expect(browser?.localCoverage?.mobileSettingsControlsPass === true, `${label} must include mobile Settings controls browser coverage`);
  expect(browser?.localCoverage?.libraryCloudPdfReaderPass === true, `${label} must include Library cloud PDF reader browser coverage`);
  expect(browser?.localCoverage?.problemsSocialGuardPass === true, `${label} must include Problems social no-cloud browser coverage`);
  expect(browser?.localCoverage?.problemsPaginationInterviewHandoffPass === true, `${label} must include Problems pagination/interview handoff browser coverage`);
  expect(browser?.localCoverage?.mobileProblemsDetailHandoffPass === true, `${label} must include mobile Problems detail/interview handoff browser coverage`);
  expect(browser?.localCoverage?.problemsRankingNavigationPass === true, `${label} must include Problems ranking navigation browser coverage`);
  expect(browser?.localCoverage?.leetcodeHotTrackingPass === true, `${label} must include LeetCode Hot 100 browser coverage`);
  expect(browser?.localCoverage?.mobileCareerControlsPass === true, `${label} must include mobile career browser coverage`);
}

function validateChromeStoreReadinessSummary(data, expect, label) {
  expect(data.status === "pass", `${label} status must be pass`);
  expect(Number(data.failed || 0) === 0, `${label} must report zero failures`);
  const uploadZip = findResult(data.results, "upload zip");
  expect(uploadZip?.status === "pass", `${label} upload zip check must pass`);
  const zipData = uploadZip?.data || {};
  expect(/^artifacts\/browser-extension\/quantgym-collector-v\d+\.\d+\.\d+\.zip$/.test(String(zipData.output || "")), `${label} upload zip path must be versioned`);
  expect(/^[0-9a-f]{64}$/i.test(String(zipData.sha256 || "")), `${label} upload zip must report SHA-256`);
  expect(zipData.deterministic === true, `${label} upload zip must prove deterministic packaging`);
  expect(!Number.isNaN(Date.parse(String(zipData.deterministicTimestamp || ""))), `${label} upload zip must report deterministic timestamp`);
  expect(Array.isArray(zipData.files) && zipData.files.includes("manifest.json"), `${label} upload zip must include manifest.json`);
  expect(Array.isArray(zipData.hashedFiles), `${label} upload zip must report hashedFiles`);
  expect(zipData.hashedFiles?.length === zipData.files?.length, `${label} upload zip must hash every packaged file`);
}

function findResult(results, name) {
  return Array.isArray(results) ? results.find((result) => result.name === name) : undefined;
}

function findBlocker(blockers, id) {
  return Array.isArray(blockers) ? blockers.find((blocker) => blocker.id === id) : undefined;
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
