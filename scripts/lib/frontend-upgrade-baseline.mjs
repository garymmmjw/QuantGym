import { APPROVED_ACCEPTANCE_POLICY } from "./frontend-upgrade-approved-acceptance.mjs";
import { CANONICAL_SURFACE_INVENTORY } from "./frontend-upgrade-approved-surfaces.mjs";
import { ROUTE_TARGETS } from "./browser-route-targets.mjs";
import { MODULE_MANIFEST } from "../../src/modules/manifest.js";

export const BASELINE_AXE_TAGS = Object.freeze([
  "wcag2a",
  "wcag2aa",
  "wcag21aa",
  "wcag22aa"
]);

export const BASELINE_VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ id: "desktop", width: 1440, height: 900 }),
  laptop: Object.freeze({ id: "laptop", width: 1280, height: 720 }),
  tablet: Object.freeze({ id: "tablet", width: 834, height: 1112 }),
  mobile: Object.freeze({ id: "mobile", width: 390, height: 844 })
});

export const PERFORMANCE_BASELINE_TARGETS = Object.freeze({
  lcpMs: 2500,
  inpFieldP75Ms: 200,
  cls: 0.1,
  initialJsGzipBytes: 184320,
  ordinaryRouteChunkGzipBytes: 102400,
  horizontalOverflowPx: 0
});

const ROUTE_PRESENTATION = Object.freeze({
  overview: { titleSelector: "#heroTypewriter", primaryActionSelector: "[data-overview-problems-cta]" },
  plan: { titleSelector: ".qg-plan-page h2, #prepPlanSetupForm h2", primaryActionSelector: "#prepPlanSetupForm button[type='submit'], #prepPlanDashboard button" },
  skills: { titleSelector: "#skillsPageTitle", primaryActionSelector: "#skillRadar, .skill-card" },
  league: { titleSelector: "#leaguePageTitle", primaryActionSelector: "#leagueLearningMap button, #leagueRewardShop button" },
  interview: { titleSelector: ".qg-interview-page > .section-heading h2", primaryActionSelector: "#startInterviewBtn" },
  problems: { titleSelector: ".qg-problems-page h2, .problem-workspace h2", primaryActionSelector: "#problemList [data-problem-id], #problemList button" },
  tools: { titleSelector: ".qg-tools-page h2, .mental-card h2", primaryActionSelector: "#startDrillSessionBtn" },
  poker: { titleSelector: ".qg-poker-kicker", primaryActionSelector: "#pokerTable button, .qg-poker-main button" },
  experiences: { titleSelector: ".qg-experiences-page h2, .section-heading h2", primaryActionSelector: "#newExperienceBtn" },
  news: { titleSelector: ".qg-news-page h2, .section-heading h2", primaryActionSelector: "#addNewsBtn, #newsList [data-news-id]" },
  community: { titleSelector: ".qg-community-page h2, .section-heading h2", primaryActionSelector: ".forum-post-cta" },
  messages: { titleSelector: ".qg-messages-page h2, .section-heading h2", primaryActionSelector: "#messageThreadList button, #messageComposerForm button[type='submit']" },
  network: { titleSelector: ".qg-network-page h2, .section-heading h2", primaryActionSelector: "#addNetworkBtn" },
  resume: { titleSelector: ".qg-resume-page h2, .section-heading h2", primaryActionSelector: "#resumeForm button[type='submit']" },
  jobs: { titleSelector: ".qg-jobs-page h2, .section-heading h2", primaryActionSelector: "#jobsList a, #jobsList button" },
  companies: { titleSelector: "#companiesPageTitle", primaryActionSelector: "[data-company-card], .company-list-row" },
  library: { titleSelector: "#libraryPageTitle", primaryActionSelector: "#libraryBookGrid button, #libraryBookGrid a" },
  courses: { titleSelector: "#learningPathTitle", primaryActionSelector: "#courseList button, #courseList a" },
  memory: { titleSelector: ".qg-memory-page h2, .section-heading h2", primaryActionSelector: "#addResourceBtn" },
  settings: { titleSelector: ".qg-settings-page h2, .section-heading h2", primaryActionSelector: "#settingsForm button[type='submit']" },
  account: { titleSelector: ".qg-account-page h2, .section-heading h2", primaryActionSelector: "#accountForm button[type='submit']" },
  pk: { titleSelector: ".qg-pk-page h2, .section-heading h2", primaryActionSelector: "#startPkBtn" }
});

export const FRONTEND_UPGRADE_ROUTE_FIXTURES = Object.freeze([
  Object.freeze({
    id: "auth",
    routeId: "auth",
    surfaceId: "system:auth",
    path: "/login",
    authenticated: false,
    selectors: Object.freeze(["#authShell", "#loginForm", "#loginEmail"]),
    titleSelector: "#authShell h1, #authShell h2",
    primaryActionSelector: "#loginForm button[type='submit']"
  }),
  ...MODULE_MANIFEST.map((route) => Object.freeze({
    id: route.id,
    routeId: route.id,
    surfaceId: `route:${route.id}`,
    path: route.path,
    authenticated: true,
    selectors: Object.freeze([...(ROUTE_TARGETS[route.id] || [])]),
    ...(ROUTE_PRESENTATION[route.id] || {
      titleSelector: ".app-route-root h1, .app-route-root h2",
      primaryActionSelector: ".app-route-root button, .app-route-root a"
    })
  }))
]);

export function buildCaptureCases(routeFixtures = FRONTEND_UPGRADE_ROUTE_FIXTURES, surfaceContracts = CANONICAL_SURFACE_INVENTORY) {
  const contracts = new Map((surfaceContracts || []).map((surface) => [surface.id, surface]));
  const cases = [];
  for (const fixture of routeFixtures || []) {
    const contract = contracts.get(fixture.surfaceId);
    if (!contract) throw new Error(`Missing surface contract for ${fixture.surfaceId}`);
    const viewportIds = ["desktop", "laptop", "mobile"];
    if (contract.kind === "route" && contract.responsive?.tabletDistinct === true) viewportIds.push("tablet");
    for (const theme of ["light", "dark"]) {
      for (const viewportId of viewportIds) {
        const viewport = BASELINE_VIEWPORTS[viewportId];
        cases.push(Object.freeze({
          id: `${fixture.id}--${theme}--${viewportId}`,
          kind: "route",
          fixtureId: fixture.id,
          routeId: fixture.routeId,
          surfaceId: fixture.surfaceId,
          path: fixture.path,
          authenticated: fixture.authenticated,
          selectors: fixture.selectors,
          titleSelector: fixture.titleSelector,
          primaryActionSelector: fixture.primaryActionSelector,
          acceptanceIds: contract.acceptanceChecks.slice(0, 2),
          theme,
          viewport
        }));
      }
    }
  }
  return cases;
}

const SHARED_STATE_DEFINITIONS = Object.freeze([
  shared("auth", "registration-error", {
    path: "/login", theme: "light", viewportId: "laptop",
    setup: interaction("auth-registration-error"), focusTarget: "#registerPassword",
    expected: expected("#authMessage", { text: "密码" })
  }),
  shared("auth", "password-reset", {
    path: "/login", theme: "dark", viewportId: "laptop",
    setup: interaction("auth-password-reset"), focusTarget: "#resetPasswordNewPassword",
    expected: expected("#resetPasswordForm:not(.hidden)", { visible: true })
  }),
  shared("auth", "keyboard-focus", {
    path: "/login", theme: "light", viewportId: "laptop",
    setup: interaction("focus-target"), focusTarget: "#loginEmail",
    expected: expected("#loginEmail", { attribute: { name: "focused", value: true } })
  }),
  shared("auth", "reduced-motion", {
    path: "/login", theme: "dark", viewportId: "laptop",
    setup: interaction("reduced-motion"), focusTarget: null,
    expected: expected("#authShell", { attribute: { name: "reducedMotion", value: true } })
  }),

  shared("desktop-shell", "collapsed-light", {
    path: "/", theme: "light", viewportId: "laptop",
    setup: interaction("desktop-sidebar-collapse"), focusTarget: "#sidebarToggleBtn",
    expected: expected("#sidebarToggleBtn", { aria: { expanded: "false" } })
  }),
  shared("desktop-shell", "expanded-dark", {
    path: "/", theme: "dark", viewportId: "laptop",
    setup: interaction("desktop-sidebar-expand"), focusTarget: "#sidebarToggleBtn",
    expected: expected("#sidebarToggleBtn", { aria: { expanded: "true" } })
  }),
  shared("desktop-shell", "keyboard-focus", {
    path: "/", theme: "light", viewportId: "laptop",
    setup: interaction("focus-target"), focusTarget: "#globalSearchInput",
    expected: expected("#globalSearchInput", { attribute: { name: "focused", value: true } })
  }),
  shared("desktop-shell", "reduced-motion", {
    path: "/", theme: "dark", viewportId: "laptop",
    setup: interaction("reduced-motion"), focusTarget: null,
    expected: expected("#appShell", { attribute: { name: "reducedMotion", value: true } })
  }),

  shared("mobile-shell", "drawer-open-light", {
    path: "/", theme: "light", viewportId: "mobile",
    setup: interaction("mobile-drawer-open"), focusTarget: ".qg-nav-sheet-close",
    expected: expected(".qg-nav-sheet.is-open", { aria: { hidden: null } })
  }),
  shared("mobile-shell", "drawer-open-dark", {
    path: "/", theme: "dark", viewportId: "mobile",
    setup: interaction("mobile-drawer-open"), focusTarget: ".qg-nav-sheet-close",
    expected: expected(".qg-nav-sheet.is-open", { visible: true })
  }),
  shared("mobile-shell", "keyboard-focus", {
    path: "/", theme: "light", viewportId: "mobile",
    setup: interaction("focus-target"), focusTarget: ".qg-tabbar-more",
    expected: expected(".qg-tabbar-more", { attribute: { name: "focused", value: true } })
  }),
  shared("mobile-shell", "reduced-motion", {
    path: "/", theme: "dark", viewportId: "mobile",
    setup: interaction("reduced-motion"), focusTarget: null,
    expected: expected(".qg-tabbar", { attribute: { name: "reducedMotion", value: true } })
  }),

  shared("global-search", "results-open", {
    path: "/", theme: "light", viewportId: "laptop",
    setup: interaction("global-search-results"), focusTarget: ".qg-cmdk-input",
    expected: expected(".qg-cmdk-list [role='option']", { visible: true })
  }),
  shared("global-search", "keyboard-focus", {
    path: "/", theme: "dark", viewportId: "laptop",
    setup: interaction("global-search-keyboard"), focusTarget: ".qg-cmdk-input",
    expected: expected(".qg-cmdk-input", { attribute: { name: "focused", value: true } })
  }),
  shared("global-search", "empty", {
    path: "/", theme: "light", viewportId: "laptop",
    setup: interaction("global-search-empty"), focusTarget: ".qg-cmdk-input",
    expected: expected(".qg-cmdk-empty", { visible: true })
  }),
  shared("global-search", "reduced-motion", {
    path: "/", theme: "dark", viewportId: "laptop",
    setup: interaction("global-search-reduced-motion"), focusTarget: ".qg-cmdk-input",
    expected: expected(".qg-cmdk", { attribute: { name: "reducedMotion", value: true } })
  }),

  shared("notifications-toast", "center-open", {
    path: "/", theme: "light", viewportId: "laptop",
    setup: interaction("notification-center-open"), focusTarget: "#qgNotifBtn",
    expected: expected("#qgNotifPanel", { aria: { hidden: null } })
  }),
  shared("notifications-toast", "live-toast", {
    path: "/league", theme: "light", viewportId: "laptop",
    setup: interaction("live-toast"), focusTarget: null,
    expected: expected(".qg-fb-toasts[role='status'][aria-live='polite']:has(.qg-fb-toast)", { aria: { live: "polite" } })
  }),
  shared("notifications-toast", "empty", {
    path: "/", theme: "dark", viewportId: "laptop",
    setup: interaction("notification-empty"), focusTarget: "#qgNotifBtn",
    expected: expected("#qgNotifPanel .qg-notif-empty", { text: "暂时没有新通知" })
  }),
  shared("notifications-toast", "reduced-motion", {
    path: "/league", theme: "dark", viewportId: "laptop",
    setup: interaction("live-toast-reduced-motion"), focusTarget: null,
    expected: expected(".qg-fb-toasts[role='status'][aria-live='polite']:has(.qg-fb-toast)", { attribute: { name: "reducedMotion", value: true } })
  }),

  shared("todo", "dock-open", {
    path: "/", theme: "light", viewportId: "laptop",
    setup: interaction("todo-dock-open"), focusTarget: "#todoDockAddInput",
    expected: expected("#todoDockPanel:not(.hidden)", { visible: true })
  }),
  shared("todo", "editor-focus", {
    path: "/", theme: "dark", viewportId: "laptop",
    setup: interaction("todo-editor-focus"), focusTarget: "#todoDockAddInput",
    expected: expected("#todoDockAddInput", { attribute: { name: "focused", value: true } })
  }),
  shared("todo", "empty-mobile", {
    path: "/", theme: "light", viewportId: "mobile",
    setup: interaction("todo-mobile-current-state"), focusTarget: null,
    expected: expected("#todoDockButton", { visible: false }),
    qualityFinding: "current mobile CSS hides the Todo dock, so the planned empty-mobile surface is not visibly reachable"
  }),
  shared("todo", "reduced-motion-mobile", {
    path: "/", theme: "dark", viewportId: "mobile",
    setup: interaction("reduced-motion"), focusTarget: null,
    expected: expected("#appShell", { attribute: { name: "reducedMotion", value: true } }),
    qualityFinding: "current mobile CSS hides the Todo dock; reduced motion is captured on the mobile shell instead of fabricating an open Todo panel"
  }),

  shared("theme-language", "theme-focus", {
    path: "/settings", theme: "light", viewportId: "laptop",
    setup: interaction("focus-target"), focusTarget: "#themeToggleBtn",
    expected: expected("#themeToggleBtn", { attribute: { name: "focused", value: true } })
  }),
  shared("theme-language", "language-focus", {
    path: "/settings", theme: "dark", viewportId: "laptop",
    setup: interaction("focus-target"), focusTarget: "#settingsLanguageSelect",
    expected: expected("#settingsLanguageSelect", { attribute: { name: "focused", value: true } })
  }),
  shared("theme-language", "mobile-controls", {
    path: "/settings", theme: "light", viewportId: "mobile",
    setup: interaction("theme-language-mobile"), focusTarget: "#settingsLanguageSelect",
    expected: expected("#settingsLanguageSelect", { visible: true })
  }),
  shared("theme-language", "reduced-motion-mobile", {
    path: "/settings", theme: "dark", viewportId: "mobile",
    setup: interaction("reduced-motion"), focusTarget: null,
    expected: expected("#settingsForm", { attribute: { name: "reducedMotion", value: true } })
  }),

  shared("network-recovery", "offline-draft", {
    path: "/settings", theme: "light", viewportId: "laptop",
    setup: interception("offline-draft"), focusTarget: "[data-retry]",
    expected: expected("[data-network-state='offline-draft']", { text: "离线" })
  }),
  shared("network-recovery", "recoverable-error", {
    path: "/settings", theme: "dark", viewportId: "laptop",
    setup: interception("recoverable-error"), focusTarget: "[data-retry]",
    expected: expected("[data-network-state='recoverable-error']", { aria: { live: "assertive" } })
  }),
  shared("network-recovery", "stale-conflict", {
    path: "/settings", theme: "light", viewportId: "mobile",
    setup: interception("stale-conflict"), focusTarget: "[data-resolve-conflict]",
    expected: expected("[data-network-state='stale-conflict']", { text: "冲突" })
  }),
  shared("network-recovery", "permission-denied-retry", {
    path: "/settings", theme: "dark", viewportId: "mobile",
    setup: interception("permission-denied-retry"), focusTarget: "[data-retry]",
    expected: expected("[data-network-state='permission-denied']", { text: "权限" })
  })
]);

export function buildSharedStateInventory(sourceRecords = APPROVED_ACCEPTANCE_POLICY.evidenceCases.sharedStates) {
  const sourceById = new Map((sourceRecords || []).map((record) => [record.id, record]));
  const definitionIds = new Set(SHARED_STATE_DEFINITIONS.map((item) => item.id));
  if (sourceById.size !== definitionIds.size) {
    throw new Error(`Shared-state source/definition count mismatch: ${sourceById.size} !== ${definitionIds.size}`);
  }
  return SHARED_STATE_DEFINITIONS.map((definition) => {
    const source = sourceById.get(definition.id);
    if (!source) throw new Error(`Missing approved shared-state record for ${definition.id}`);
    const future = source.expectedStatus === "future-gate";
    return Object.freeze({
      ...definition,
      acceptanceIds: Object.freeze([...(source.acceptanceIds || [])]),
      expectedStatus: future ? "future-gate" : "current-capture",
      targetPhase: future ? 1 : 0,
      screenshotClaim: !future,
      ...(future ? { targetCommand: source.targetCommand } : {})
    });
  });
}

export const SHARED_STATE_CAPTURE_INVENTORY = Object.freeze(buildSharedStateInventory());

export function partitionSharedStateCases(inventory = SHARED_STATE_CAPTURE_INVENTORY) {
  return {
    current: inventory.filter((item) => item.expectedStatus === "current-capture"),
    future: inventory.filter((item) => item.expectedStatus === "future-gate")
  };
}

export function selectTrackedReviewCases(routeCases, sharedStates) {
  const routeReviewCases = (routeCases || [])
    .filter((item) => item.theme === "light" && item.viewport.id === "laptop")
    .map((item) => Object.freeze({
      reviewId: `route-${item.fixtureId}`,
      kind: "route",
      surfaceId: item.surfaceId,
      sourceCaseId: item.id,
      outputFile: `docs/browser-audit-screenshots/370-frontend-upgrade-review/route-${item.fixtureId}.jpg`
    }));
  const preferredSharedStates = new Map([
    ["system:desktop-shell", "shared-state:desktop-shell:collapsed-light"],
    ["system:mobile-shell", "shared-state:mobile-shell:drawer-open-light"],
    ["system:global-search", "shared-state:global-search:results-open"],
    ["system:notifications-toast", "shared-state:notifications-toast:live-toast"],
    ["system:todo", "shared-state:todo:dock-open"],
    ["system:theme-language", "shared-state:theme-language:theme-focus"]
  ]);
  const sharedById = new Map((sharedStates || []).map((item) => [item.id, item]));
  const sharedReviewCases = [...preferredSharedStates].map(([surfaceId, id]) => {
    const item = sharedById.get(id);
    if (!item || item.expectedStatus !== "current-capture") {
      throw new Error(`Missing current shared-state review representative: ${id}`);
    }
    return Object.freeze({
      reviewId: `shared-${surfaceId.split(":")[1]}`,
      kind: "shared-state",
      surfaceId,
      sourceCaseId: item.id,
      outputFile: `docs/browser-audit-screenshots/370-frontend-upgrade-review/shared-${surfaceId.split(":")[1]}.jpg`
    });
  });
  return [...routeReviewCases, ...sharedReviewCases];
}

export function buildPerformanceCases(routeFixtures = FRONTEND_UPGRADE_ROUTE_FIXTURES) {
  const fixtureById = new Map((routeFixtures || []).map((fixture) => [fixture.routeId, fixture]));
  const routeIds = ["auth", "overview", "problems", "interview", "league", "messages"];
  return routeIds.flatMap((routeId) => {
    const fixture = fixtureById.get(routeId);
    if (!fixture) throw new Error(`Missing performance fixture: ${routeId}`);
    return ["laptop", "mobile"].map((viewportId) => Object.freeze({
      id: `${routeId}--light--${viewportId}--cold`,
      routeId,
      surfaceId: fixture.surfaceId,
      path: fixture.path,
      authenticated: fixture.authenticated,
      selectors: fixture.selectors,
      primaryActionSelector: fixture.primaryActionSelector,
      theme: "light",
      viewport: BASELINE_VIEWPORTS[viewportId],
      coldContext: true
    }));
  });
}

export function summarizeCaptureStatus({ captureFailures = [], findings = [] } = {}) {
  if (captureFailures.length > 0) return "fail";
  if (findings.length > 0) return "captured-with-findings";
  return "pass";
}

function shared(surface, state, details) {
  return Object.freeze({
    id: `shared-state:${surface}:${state}`,
    surfaceId: `system:${surface}`,
    state,
    ...details
  });
}

function interaction(id) {
  return Object.freeze({ kind: "interaction", id });
}

function interception(id) {
  return Object.freeze({ kind: "network-interception", id });
}

function expected(selector, details) {
  return Object.freeze({ selector, ...details });
}
