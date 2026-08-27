import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  PHASE1_EVIDENCE_LOCK_PATH,
  PHASE2_ACCEPTANCE_MANIFEST_PATH,
} from "./frontend-upgrade-phase2-contracts.mjs";
import {
  writeFileAtomicallyWithinTrustedRoot,
} from "./frontend-upgrade-phase1-contracts.mjs";

const execFileAsync = promisify(execFile);
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const MAX_REPORT_BYTES = 64 * 1024 * 1024;
const REPORT_FILENAME = "phase2-playwright-report.json";
const MAX_EVIDENCE_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;

const SUMMARY_ENVELOPE_KEYS = Object.freeze([
  "schemaVersion",
  "check",
  "status",
  "checkedAt",
  "commit",
  "manifestSha256",
  "phase1EvidenceLockSha256",
  "results",
  "visualCases",
  "checks",
  "counts",
  "metrics",
  "failureCodes",
]);

const REQUIRED_COUNTS = Object.freeze({
  skippedResultCount: 0,
  failedResultCount: 0,
  retriedResultCount: 0,
  flakyResultCount: 0,
});

const COMPONENTS = Object.freeze({
  accessibility: Object.freeze({
    check: "frontend-upgrade-phase2-accessibility",
    expectedGateCount: 3,
    expectedGateIds: Object.freeze([
      "a11y:overview",
      "a11y:plan",
      "a11y:problems",
    ]),
    summaryPath: (
      "docs/browser-audit-screenshots/"
      + "390-frontend-upgrade-phase-2-accessibility-summary.json"
    ),
    supportTags: Object.freeze([
      "e2e:desktop-shell-keyboard-navigation",
      "e2e:mobile-shell-navigation",
      "e2e:phase2-a11y-route-overview",
      "e2e:phase2-a11y-route-plan",
      "e2e:phase2-a11y-route-problems",
    ]),
    annotationRequirements: Object.freeze([
      Object.freeze({
        type: "phase2-accessibility-desktop-facts",
        ownerTags: Object.freeze(["e2e:desktop-shell-keyboard-navigation"]),
      }),
      Object.freeze({
        type: "phase2-accessibility-mobile-facts",
        ownerTags: Object.freeze(["e2e:mobile-shell-navigation"]),
      }),
      Object.freeze({
        type: "phase2-accessibility-route-facts",
        ownerTags: Object.freeze([
          "e2e:phase2-a11y-route-overview",
          "e2e:phase2-a11y-route-plan",
          "e2e:phase2-a11y-route-problems",
        ]),
      }),
    ]),
    checks: Object.freeze([
      "axePassed",
      "keyboardJourneysPassed",
      "mobileTargetsPassed",
      "focusPassed",
    ]),
    metrics: Object.freeze({
      seriousOrCriticalAxeFindings: 0,
      keyboardJourneyFailures: 0,
      mobileTargetFailures: 0,
      focusFailures: 0,
    }),
  }),
  journeys: Object.freeze({
    check: "frontend-upgrade-phase2-journeys",
    expectedGateCount: 3,
    expectedGateIds: Object.freeze([
      "e2e:overview-resume-training",
      "e2e:plan-recommendation",
      "e2e:problem-attempt-completion",
    ]),
    summaryPath: (
      "docs/browser-audit-screenshots/"
      + "390-frontend-upgrade-phase-2-journeys-summary.json"
    ),
    supportTags: Object.freeze([
      "e2e:phase2-runtime-integrity",
      "e2e:phase2-daily-loop-facts",
    ]),
    annotationRequirements: Object.freeze([
      Object.freeze({
        type: "phase2-runtime-integrity-metrics",
        ownerTags: Object.freeze(["e2e:phase2-runtime-integrity"]),
      }),
      Object.freeze({
        type: "phase2-daily-loop-facts",
        ownerTags: Object.freeze(["e2e:phase2-daily-loop-facts"]),
      }),
    ]),
    checks: Object.freeze([
      "dailyLoopPassed",
      "singleRewardPassed",
      "planUpdated",
      "overviewUpdated",
      "consolePassed",
      "rejectionsPassed",
      "overflowPassed",
    ]),
    metrics: Object.freeze({
      applicationConsoleErrors: 0,
      unhandledRejections: 0,
      pageErrors: 0,
      failedFirstPartyRequests: 0,
      horizontalOverflowPx: 0,
    }),
  }),
  recovery: Object.freeze({
    check: "frontend-upgrade-phase2-recovery",
    expectedGateCount: 67,
    expectedGateIds: null,
    summaryPath: (
      "docs/browser-audit-screenshots/"
      + "390-frontend-upgrade-phase-2-recovery-summary.json"
    ),
    supportTags: Object.freeze([]),
    annotationRequirements: Object.freeze([]),
    checks: Object.freeze([
      "allGatesPassed",
      "noSkippedResults",
      "noRetriedResults",
      "noFlakyResults",
      "idempotencyPassed",
    ]),
    metrics: Object.freeze({
      retryIdempotencyGateCount: 1,
    }),
  }),
});

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const exactKeys = (value, expectedKeys) => (
  isPlainObject(value)
  && Object.keys(value).length === expectedKeys.length
  && expectedKeys.every((key) => Object.hasOwn(value, key))
);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const componentConfiguration = (component) => {
  const configuration = COMPONENTS[component];
  if (!configuration) {
    throw new Error(`unknown Phase 2 Playwright evidence component: ${String(component)}`);
  }
  return configuration;
};

const arraysEqual = (left, right) => (
  Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((entry, index) => entry === right[index])
);

const normalizedTag = (tag) => (
  typeof tag === "string" ? tag.replace(/^@/u, "") : ""
);

const tagsForSpec = (spec) => {
  const reported = Array.isArray(spec?.tags)
    ? spec.tags.map(normalizedTag).filter(Boolean)
    : [];
  const titleTags = typeof spec?.title === "string"
    ? [...spec.title.matchAll(/(?:^|\s)@([^\s]+)/gu)].map((match) => match[1])
    : [];
  return [...new Set([...reported, ...titleTags])];
};

const flattenSpecs = (suites) => {
  const specs = [];
  const visit = (suite) => {
    if (!isPlainObject(suite)) throw new Error("Playwright report contains an invalid suite");
    if (Array.isArray(suite.specs)) specs.push(...suite.specs);
    if (Array.isArray(suite.suites)) suite.suites.forEach(visit);
  };
  if (!Array.isArray(suites)) throw new Error("Playwright report suites are missing");
  suites.forEach(visit);
  return specs;
};

const reporterIsJsonOnly = (reporter) => (
  Array.isArray(reporter)
  && reporter.length === 1
  && Array.isArray(reporter[0])
  && reporter[0][0] === "json"
);

const resultHasErrors = (result) => (
  result?.error !== undefined
  || (Array.isArray(result?.errors) && result.errors.length > 0)
);

const validatePassedTest = (test, label) => {
  const annotations = Array.isArray(test?.annotations) ? test.annotations : [];
  if (annotations.some((annotation) => [
    "disabled",
    "expected-failure",
    "fixme",
    "pending",
    "skip",
    "todo",
    "xfail",
    "xpass",
  ].includes(String(annotation?.type ?? "").trim().toLowerCase()))) {
    throw new Error(`Playwright evidence contains skip/todo/xfail annotation: ${label}`);
  }
  if (test?.expectedStatus !== "passed" || test?.status === "skipped") {
    throw new Error(`Playwright evidence contains skipped test: ${label}`);
  }
  if (test?.status === "flaky") {
    throw new Error(`Playwright evidence contains flaky test: ${label}`);
  }
  if (test?.status !== "expected") {
    throw new Error(`Playwright evidence contains failed test: ${label}`);
  }
  if (!Array.isArray(test.results) || test.results.length !== 1) {
    throw new Error(`Playwright evidence contains retried test: ${label}`);
  }
  const [result] = test.results;
  if (result?.retry !== 0) {
    throw new Error(`Playwright evidence contains retried test: ${label}`);
  }
  if (result?.status === "skipped") {
    throw new Error(`Playwright evidence contains skipped test result: ${label}`);
  }
  if (result?.status !== "passed" || resultHasErrors(result)) {
    throw new Error(`Playwright evidence contains failed test result: ${label}`);
  }
};

const expectedRecoveryGateIds = (manifest) => {
  const mutations = Array.isArray(manifest?.mutations) ? manifest.mutations : [];
  const states = Array.isArray(manifest?.recoveryStates) ? manifest.recoveryStates : [];
  const ids = mutations.flatMap((mutation) => (
    states.map((state) => mutation?.recoveryGateIds?.[state])
  ));
  const completion = mutations.find((mutation) => mutation?.id === "problems.complete");
  ids.push(completion?.retryIdempotencyGateId);
  return ids;
};

const assertManifestAllocation = (component, manifest, expectedIds) => {
  const configuration = componentConfiguration(component);
  if (
    manifest?.schemaVersion !== 1
    || manifest?.phase !== 2
    || !Array.isArray(manifest.gates)
  ) {
    throw new Error("Phase 2 acceptance manifest is invalid");
  }
  if (
    expectedIds.length !== configuration.expectedGateCount
    || new Set(expectedIds).size !== expectedIds.length
  ) {
    throw new Error(`Phase 2 ${component} manifest allocation is invalid`);
  }
  if (
    configuration.expectedGateIds
    && !arraysEqual(expectedIds, configuration.expectedGateIds)
  ) {
    throw new Error(`Phase 2 ${component} manifest gate inventory is invalid`);
  }
  if (
    component === "recovery"
    && !arraysEqual(expectedIds, expectedRecoveryGateIds(manifest))
  ) {
    throw new Error("Phase 2 recovery manifest gate inventory is invalid");
  }
};

const validateReportEnvelope = (report) => {
  if (!isPlainObject(report) || !isPlainObject(report.config)) {
    throw new Error("Playwright JSON report is invalid");
  }
  if (!reporterIsJsonOnly(report.config.reporter)) {
    throw new Error("Playwright evidence must use only the JSON reporter");
  }
  const projects = report.config.projects;
  if (
    !Array.isArray(projects)
    || projects.length === 0
    || projects.some((project) => project?.retries !== 0)
  ) {
    throw new Error("Playwright evidence must run with zero configured retries");
  }
  if (!Array.isArray(report.errors) || report.errors.length !== 0) {
    throw new Error("Playwright evidence contains report errors");
  }
  if (!isPlainObject(report.stats)) {
    throw new Error("Playwright report stats are missing");
  }
  for (const key of ["skipped", "unexpected", "flaky"]) {
    if (!Number.isSafeInteger(report.stats[key]) || report.stats[key] !== 0) {
      throw new Error(`Playwright evidence contains non-zero ${key} count`);
    }
  }
};

export function parsePhase2PlaywrightReport({
  report,
  expectedIds,
  supportTags = [],
  metricAnnotationType,
  annotationRequirements = [],
} = {}) {
  validateReportEnvelope(report);
  if (
    !Array.isArray(expectedIds)
    || expectedIds.length === 0
    || expectedIds.some((id) => typeof id !== "string" || id.length === 0)
    || new Set(expectedIds).size !== expectedIds.length
  ) {
    throw new Error("expected Phase 2 gate IDs are invalid");
  }
  if (
    !Array.isArray(supportTags)
    || supportTags.some((tag) => typeof tag !== "string" || tag.length === 0)
    || new Set(supportTags).size !== supportTags.length
  ) {
    throw new Error("expected Playwright support tags are invalid");
  }
  const allOwnedTags = new Set([...expectedIds, ...supportTags]);
  if (
    !Array.isArray(annotationRequirements)
    || annotationRequirements.some((requirement) => (
      !exactKeys(requirement, ["type", "ownerTags"])
      || typeof requirement.type !== "string"
      || requirement.type.length === 0
      || !Array.isArray(requirement.ownerTags)
      || requirement.ownerTags.length === 0
      || new Set(requirement.ownerTags).size !== requirement.ownerTags.length
      || requirement.ownerTags.some((tag) => !allOwnedTags.has(tag))
    ))
    || new Set(annotationRequirements.map(({ type }) => type)).size
      !== annotationRequirements.length
  ) {
    throw new Error("expected Playwright fact annotations are invalid");
  }
  const expectedSet = new Set(expectedIds);
  const supportSet = new Set(supportTags);
  const annotationRequirementByType = new Map(annotationRequirements.map((requirement) => (
    [requirement.type, requirement]
  )));
  const gateOwners = new Map();
  const supportOwners = new Map();
  const reportedMetricAnnotations = [];
  const reportedFactAnnotations = new Map(annotationRequirements.map(({ type }) => (
    [type, new Map()]
  )));
  const specs = flattenSpecs(report.suites);
  let executedTestCount = 0;

  for (const [specIndex, spec] of specs.entries()) {
    if (!isPlainObject(spec)) throw new Error("Playwright report contains an invalid spec");
    const label = spec.title ?? `spec ${specIndex + 1}`;
    const tags = tagsForSpec(spec);
    const matchedGates = tags.filter((tag) => expectedSet.has(tag));
    const matchedSupport = tags.filter((tag) => supportSet.has(tag));
    if (matchedGates.length === 0 && matchedSupport.length === 0) {
      throw new Error(`Playwright evidence contains extra executed spec: ${label}`);
    }
    if (!Array.isArray(spec.tests) || spec.tests.length !== 1) {
      throw new Error(`Playwright evidence spec has an unexpected project count: ${label}`);
    }
    const [reportedTest] = spec.tests;
    validatePassedTest(reportedTest, label);
    if (spec.ok !== true) throw new Error(`Playwright evidence contains failed spec: ${label}`);
    executedTestCount += 1;

    if (
      matchedGates.length > 0
      && !tags.some((tag) => /^phase2:(?:overview|plan|problems)$/u.test(tag))
    ) {
      throw new Error(`Phase 2 gate test is missing its route tag: ${label}`);
    }
    for (const gateId of matchedGates) {
      if (gateOwners.has(gateId)) {
        throw new Error(`Playwright evidence contains duplicate gate: ${gateId}`);
      }
      gateOwners.set(gateId, label);
    }
    for (const supportTag of matchedSupport) {
      if (supportOwners.has(supportTag)) {
        throw new Error(`Playwright evidence contains duplicate support test: ${supportTag}`);
      }
      supportOwners.set(supportTag, label);
    }
    const annotations = Array.isArray(reportedTest.annotations)
      ? reportedTest.annotations
      : [];
    for (const [annotationType, requirement] of annotationRequirementByType) {
      const matchingAnnotations = annotations.filter((annotation) => (
        annotation?.type === annotationType
      ));
      const matchedOwners = requirement.ownerTags.filter((tag) => tags.includes(tag));
      if (matchingAnnotations.length === 0 && matchedOwners.length === 0) continue;
      if (matchedOwners.length !== 1 || matchingAnnotations.length !== 1) {
        throw new Error(
          `Playwright evidence requires exactly one ${annotationType} annotation per owner`,
        );
      }
      let facts;
      try {
        facts = JSON.parse(matchingAnnotations[0].description);
      } catch {
        throw new Error(`Playwright evidence ${annotationType} annotation is invalid JSON`);
      }
      if (!isPlainObject(facts)) {
        throw new Error(`Playwright evidence ${annotationType} annotation must contain an object`);
      }
      const factsByOwner = reportedFactAnnotations.get(annotationType);
      if (factsByOwner.has(matchedOwners[0])) {
        throw new Error(
          `Playwright evidence contains duplicate ${annotationType} owner: ${matchedOwners[0]}`,
        );
      }
      factsByOwner.set(matchedOwners[0], facts);
    }
    if (metricAnnotationType !== undefined) {
      for (const annotation of annotations) {
        if (annotation?.type === metricAnnotationType) {
          reportedMetricAnnotations.push(annotation);
        }
      }
    }
  }

  const missing = expectedIds.filter((id) => !gateOwners.has(id));
  if (missing.length > 0) {
    throw new Error(`Playwright evidence is missing gates: ${missing.join(", ")}`);
  }
  const missingSupport = supportTags.filter((tag) => !supportOwners.has(tag));
  if (missingSupport.length > 0) {
    throw new Error(`Playwright evidence is missing support tests: ${missingSupport.join(", ")}`);
  }
  if (report.stats.expected !== executedTestCount) {
    throw new Error("Playwright report expected count does not match executed tests");
  }
  for (const requirement of annotationRequirements) {
    const factsByOwner = reportedFactAnnotations.get(requirement.type);
    const missingOwners = requirement.ownerTags.filter((tag) => !factsByOwner.has(tag));
    if (missingOwners.length > 0) {
      throw new Error(
        `Playwright evidence is missing ${requirement.type} annotations: `
        + missingOwners.join(", "),
      );
    }
  }

  let reportedMetrics = null;
  if (metricAnnotationType !== undefined) {
    if (typeof metricAnnotationType !== "string" || metricAnnotationType.length === 0) {
      throw new Error("Playwright metric annotation type is invalid");
    }
    if (reportedMetricAnnotations.length !== 1) {
      throw new Error(
        `Playwright evidence requires exactly one ${metricAnnotationType} annotation`,
      );
    }
    try {
      reportedMetrics = JSON.parse(reportedMetricAnnotations[0].description);
    } catch {
      throw new Error("Playwright evidence metric annotation is invalid JSON");
    }
    if (!isPlainObject(reportedMetrics)) {
      throw new Error("Playwright evidence metric annotation must contain an object");
    }
  }

  return Object.freeze({
    executedTestCount,
    reportedAnnotations: Object.freeze(Object.fromEntries(
      [...reportedFactAnnotations].map(([type, factsByOwner]) => [
        type,
        Object.freeze(Object.fromEntries(
          [...factsByOwner].map(([owner, facts]) => [owner, Object.freeze({ ...facts })]),
        )),
      ]),
    )),
    reportedMetrics: reportedMetrics === null
      ? null
      : Object.freeze({ ...reportedMetrics }),
    resultIds: Object.freeze([...expectedIds]),
    supportTags: Object.freeze([...supportTags]),
  });
}

const assertMetrics = (component, metrics) => {
  const expected = componentConfiguration(component).metrics;
  const keys = Object.keys(expected);
  if (!exactKeys(metrics, keys)) {
    throw new Error(`Phase 2 ${component} metrics have an invalid envelope`);
  }
  for (const key of keys) {
    if (metrics[key] !== expected[key]) {
      throw new Error(`Phase 2 ${component} metric ${key} is invalid`);
    }
  }
};

const ACCESSIBILITY_ROUTE_FACT_KEYS = Object.freeze([
  "axeCheckedViewportCount",
  "axeViolationCount",
  "focusCheckCount",
  "focusFailures",
  "kind",
  "routeId",
  "schemaVersion",
  "seriousOrCriticalAxeFindings",
  "viewportWidths",
]);

const nonNegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

const deriveAccessibilityAssessment = (parsedEvidence) => {
  const reported = parsedEvidence?.reportedAnnotations;
  if (!isPlainObject(reported)) {
    throw new Error("Phase 2 accessibility fact annotations are missing");
  }
  const routeFacts = reported["phase2-accessibility-route-facts"];
  const expectedRoutes = Object.freeze({
    "e2e:phase2-a11y-route-overview": "overview",
    "e2e:phase2-a11y-route-plan": "plan",
    "e2e:phase2-a11y-route-problems": "problems",
  });
  if (!isPlainObject(routeFacts) || !exactKeys(routeFacts, Object.keys(expectedRoutes))) {
    throw new Error("Phase 2 accessibility route facts are incomplete");
  }
  const validatedRouteFacts = Object.entries(expectedRoutes).map(([ownerTag, routeId]) => {
    const facts = routeFacts[ownerTag];
    if (
      !exactKeys(facts, ACCESSIBILITY_ROUTE_FACT_KEYS)
      || facts.schemaVersion !== 1
      || facts.kind !== "phase2-accessibility-route-facts"
      || facts.routeId !== routeId
      || facts.axeCheckedViewportCount !== 2
      || facts.focusCheckCount !== 2
      || !arraysEqual(facts.viewportWidths, [390, 1_440])
      || !nonNegativeInteger(facts.axeViolationCount)
      || !nonNegativeInteger(facts.seriousOrCriticalAxeFindings)
      || !nonNegativeInteger(facts.focusFailures)
    ) {
      throw new Error(`Phase 2 accessibility route facts are invalid: ${routeId}`);
    }
    return facts;
  });

  const desktopFacts = reported["phase2-accessibility-desktop-facts"]
    ?.["e2e:desktop-shell-keyboard-navigation"];
  if (
    !exactKeys(desktopFacts, [
      "focusCheckCount",
      "focusFailures",
      "keyboardJourneyCount",
      "keyboardJourneyFailures",
      "kind",
      "schemaVersion",
    ])
    || desktopFacts.schemaVersion !== 1
    || desktopFacts.kind !== "phase2-accessibility-desktop-facts"
    || !Number.isSafeInteger(desktopFacts.focusCheckCount)
    || desktopFacts.focusCheckCount <= 0
    || !nonNegativeInteger(desktopFacts.focusFailures)
    || !Number.isSafeInteger(desktopFacts.keyboardJourneyCount)
    || desktopFacts.keyboardJourneyCount <= 0
    || !nonNegativeInteger(desktopFacts.keyboardJourneyFailures)
  ) {
    throw new Error("Phase 2 accessibility desktop facts are invalid");
  }

  const mobileFacts = reported["phase2-accessibility-mobile-facts"]
    ?.["e2e:mobile-shell-navigation"];
  if (
    !exactKeys(mobileFacts, [
      "focusCheckCount",
      "focusFailures",
      "keyboardJourneyCount",
      "keyboardJourneyFailures",
      "kind",
      "mobileTargetCount",
      "mobileTargetFailures",
      "schemaVersion",
    ])
    || mobileFacts.schemaVersion !== 1
    || mobileFacts.kind !== "phase2-accessibility-mobile-facts"
    || !Number.isSafeInteger(mobileFacts.focusCheckCount)
    || mobileFacts.focusCheckCount <= 0
    || !nonNegativeInteger(mobileFacts.focusFailures)
    || !Number.isSafeInteger(mobileFacts.keyboardJourneyCount)
    || mobileFacts.keyboardJourneyCount <= 0
    || !nonNegativeInteger(mobileFacts.keyboardJourneyFailures)
    || !Number.isSafeInteger(mobileFacts.mobileTargetCount)
    || mobileFacts.mobileTargetCount <= 0
    || !nonNegativeInteger(mobileFacts.mobileTargetFailures)
  ) {
    throw new Error("Phase 2 accessibility mobile facts are invalid");
  }

  const metrics = {
    seriousOrCriticalAxeFindings: validatedRouteFacts.reduce((total, facts) => (
      total + facts.seriousOrCriticalAxeFindings
    ), 0),
    keyboardJourneyFailures: (
      desktopFacts.keyboardJourneyFailures + mobileFacts.keyboardJourneyFailures
    ),
    mobileTargetFailures: mobileFacts.mobileTargetFailures,
    focusFailures: validatedRouteFacts.reduce((total, facts) => (
      total + facts.focusFailures
    ), desktopFacts.focusFailures + mobileFacts.focusFailures),
  };
  const checks = {
    axePassed: (
      metrics.seriousOrCriticalAxeFindings === 0
      && validatedRouteFacts.every(({ axeViolationCount }) => axeViolationCount === 0)
    ),
    keyboardJourneysPassed: metrics.keyboardJourneyFailures === 0,
    mobileTargetsPassed: metrics.mobileTargetFailures === 0,
    focusPassed: metrics.focusFailures === 0,
  };
  if (Object.values(checks).some((value) => value !== true)) {
    throw new Error("Phase 2 accessibility facts contain non-zero failures");
  }
  return { checks, metrics };
};

const DAILY_LOOP_FACT_KEYS = Object.freeze([
  "checks",
  "completion",
  "integrity",
  "kind",
  "overview",
  "plan",
  "schemaVersion",
  "session",
]);

const DAILY_LOOP_INTEGRITY_KEYS = Object.freeze([
  "applicationConsoleErrors",
  "failedFirstPartyRequests",
  "horizontalOverflowPx",
  "pageErrors",
  "unhandledRejections",
]);

const nonEmptyString = (value) => typeof value === "string" && value.length > 0;

const deriveJourneysAssessment = (parsedEvidence) => {
  const reported = parsedEvidence?.reportedAnnotations;
  const runtimeMetrics = reported?.["phase2-runtime-integrity-metrics"]
    ?.["e2e:phase2-runtime-integrity"];
  if (!exactKeys(runtimeMetrics, DAILY_LOOP_INTEGRITY_KEYS)) {
    throw new Error("Phase 2 journeys runtime metrics are missing or malformed");
  }
  for (const [key, value] of Object.entries(runtimeMetrics)) {
    if (!nonNegativeInteger(value)) {
      throw new Error(`Phase 2 journeys runtime metric ${key} is malformed`);
    }
  }

  const dailyLoop = reported?.["phase2-daily-loop-facts"]
    ?.["e2e:phase2-daily-loop-facts"];
  if (
    !exactKeys(dailyLoop, DAILY_LOOP_FACT_KEYS)
    || dailyLoop.schemaVersion !== 1
    || dailyLoop.kind !== "phase2-daily-loop-facts"
  ) {
    throw new Error("Phase 2 daily-loop facts are missing or malformed");
  }
  const dailyChecks = dailyLoop.checks;
  if (
    !exactKeys(dailyChecks, [
      "authenticatedEntry",
      "dailyLoopPassed",
      "exactTrainingSession",
      "overviewUpdated",
      "planUpdated",
      "resultVisibleBeforeNavigation",
      "singleRewardPassed",
    ])
    || Object.values(dailyChecks).some((value) => typeof value !== "boolean")
  ) {
    throw new Error("Phase 2 daily-loop check facts are malformed");
  }
  const completion = dailyLoop.completion;
  if (
    !exactKeys(completion, [
      "idempotencyKeyReused",
      "requestCount",
      "rewardCount",
      "sameAcknowledgement",
      "xpLedgerEntryCount",
    ])
    || typeof completion.idempotencyKeyReused !== "boolean"
    || !nonNegativeInteger(completion.requestCount)
    || !nonNegativeInteger(completion.rewardCount)
    || typeof completion.sameAcknowledgement !== "boolean"
    || !nonNegativeInteger(completion.xpLedgerEntryCount)
  ) {
    throw new Error("Phase 2 daily-loop completion facts are malformed");
  }
  const integrity = dailyLoop.integrity;
  if (
    !exactKeys(integrity, DAILY_LOOP_INTEGRITY_KEYS)
    || Object.values(integrity).some((value) => !nonNegativeInteger(value))
  ) {
    throw new Error("Phase 2 daily-loop integrity facts are malformed");
  }
  const overview = dailyLoop.overview;
  if (
    !exactKeys(overview, [
      "finalPlanCompletedTasks",
      "finalTodayTaskStatus",
      "finalWeeklyXp",
      "initialPlanCompletedTasks",
      "initialTodayTaskStatus",
      "initialWeeklyXp",
    ])
    || !nonNegativeInteger(overview.finalPlanCompletedTasks)
    || !nonNegativeInteger(overview.finalWeeklyXp)
    || !nonNegativeInteger(overview.initialPlanCompletedTasks)
    || !nonNegativeInteger(overview.initialWeeklyXp)
    || !nonEmptyString(overview.finalTodayTaskStatus)
    || !nonEmptyString(overview.initialTodayTaskStatus)
  ) {
    throw new Error("Phase 2 daily-loop overview facts are malformed");
  }
  const plan = dailyLoop.plan;
  if (
    !exactKeys(plan, ["completedTasks", "taskId", "taskStatus", "totalTasks"])
    || !nonNegativeInteger(plan.completedTasks)
    || !nonNegativeInteger(plan.totalTasks)
    || !nonEmptyString(plan.taskId)
    || !nonEmptyString(plan.taskStatus)
  ) {
    throw new Error("Phase 2 daily-loop plan facts are malformed");
  }
  const session = dailyLoop.session;
  if (
    !exactKeys(session, ["planTaskId", "problemId", "sessionId"])
    || !nonEmptyString(session.planTaskId)
    || !nonEmptyString(session.problemId)
    || !nonEmptyString(session.sessionId)
  ) {
    throw new Error("Phase 2 daily-loop session facts are malformed");
  }

  const metrics = { ...runtimeMetrics };
  const checks = {
    dailyLoopPassed: (
      dailyChecks.authenticatedEntry
      && dailyChecks.dailyLoopPassed
      && dailyChecks.exactTrainingSession
      && dailyChecks.resultVisibleBeforeNavigation
      && session.planTaskId === plan.taskId
      && Object.values(integrity).every((value) => value === 0)
    ),
    singleRewardPassed: (
      dailyChecks.singleRewardPassed
      && completion.idempotencyKeyReused
      && completion.sameAcknowledgement
      && completion.requestCount === 2
      && completion.rewardCount === 1
      && completion.xpLedgerEntryCount === 1
    ),
    planUpdated: (
      dailyChecks.planUpdated
      && plan.completedTasks === 1
      && plan.totalTasks === 1
      && plan.taskStatus === "completed"
    ),
    overviewUpdated: (
      dailyChecks.overviewUpdated
      && overview.initialPlanCompletedTasks === 0
      && overview.finalPlanCompletedTasks === 1
      && overview.initialTodayTaskStatus === "open"
      && overview.finalTodayTaskStatus === "completed"
      && overview.finalWeeklyXp - overview.initialWeeklyXp === 40
    ),
    consolePassed: (
      metrics.applicationConsoleErrors === 0
      && metrics.pageErrors === 0
      && metrics.failedFirstPartyRequests === 0
    ),
    rejectionsPassed: metrics.unhandledRejections === 0,
    overflowPassed: metrics.horizontalOverflowPx === 0,
  };
  if (Object.values(checks).some((value) => value !== true)) {
    throw new Error("Phase 2 journeys facts contain failed checks");
  }
  return { checks, metrics };
};

export function validatePhase2ComponentSummary(summary, {
  component,
  expectedCommit,
  expectedIds,
  manifestSha256,
  nowMs,
  phase1EvidenceLockSha256,
} = {}) {
  const configuration = componentConfiguration(component);
  const checkedAtMs = Date.parse(summary?.checkedAt);
  if (
    !exactKeys(summary, SUMMARY_ENVELOPE_KEYS)
    || summary.schemaVersion !== 1
    || summary.check !== configuration.check
    || summary.status !== "pass"
    || summary.commit !== expectedCommit
    || !SHA_PATTERN.test(summary.commit ?? "")
    || summary.manifestSha256 !== manifestSha256
    || !HASH_PATTERN.test(summary.manifestSha256 ?? "")
    || summary.phase1EvidenceLockSha256 !== phase1EvidenceLockSha256
    || !HASH_PATTERN.test(summary.phase1EvidenceLockSha256 ?? "")
    || !Number.isFinite(checkedAtMs)
    || new Date(checkedAtMs).toISOString() !== summary.checkedAt
    || !Number.isFinite(nowMs)
    || checkedAtMs > nowMs + CLOCK_SKEW_MS
    || nowMs - checkedAtMs > MAX_EVIDENCE_AGE_MS
    || !Array.isArray(expectedIds)
    || expectedIds.length !== configuration.expectedGateCount
    || new Set(expectedIds).size !== expectedIds.length
    || (
      configuration.expectedGateIds
      && !arraysEqual(expectedIds, configuration.expectedGateIds)
    )
    || !Array.isArray(summary.results)
    || summary.results.length !== expectedIds.length
    || !arraysEqual(summary.results.map((entry) => entry?.id), expectedIds)
    || summary.results.some((entry) => (
      !exactKeys(entry, ["id", "status", "skipped", "retried", "flaky"])
      || entry.status !== "pass"
      || entry.skipped !== false
      || entry.retried !== false
      || entry.flaky !== false
    ))
    || !Array.isArray(summary.visualCases)
    || summary.visualCases.length !== 0
    || !exactKeys(summary.checks, configuration.checks)
    || Object.values(summary.checks).some((value) => value !== true)
    || !exactKeys(summary.counts, [
      "resultCount",
      "skippedResultCount",
      "failedResultCount",
      "retriedResultCount",
      "flakyResultCount",
    ])
    || summary.counts.resultCount !== expectedIds.length
    || Object.entries(summary.counts).some(([key, value]) => (
      key !== "resultCount" && value !== 0
    ))
    || !Array.isArray(summary.failureCodes)
    || summary.failureCodes.length !== 0
  ) throw new Error(`Phase 2 ${component} summary is invalid or stale`);
  assertMetrics(component, summary.metrics);
  if (
    component === "recovery"
    && expectedIds.filter((id) => id === "mutation:problems.complete:retry-idempotency")
      .length !== 1
  ) throw new Error("Phase 2 retry idempotency gate is missing");
  return summary;
}

export function buildPhase2ComponentSummary({
  component,
  checkedAt,
  commit,
  manifestSha256,
  phase1EvidenceLockSha256,
  expectedIds,
  parsedEvidence,
  metrics,
} = {}) {
  const configuration = componentConfiguration(component);
  if (
    typeof checkedAt !== "string"
    || !Number.isFinite(Date.parse(checkedAt))
    || new Date(Date.parse(checkedAt)).toISOString() !== checkedAt
  ) throw new Error("Phase 2 evidence timestamp is invalid");
  if (!SHA_PATTERN.test(commit ?? "")) throw new Error("Phase 2 evidence commit is invalid");
  if (!HASH_PATTERN.test(manifestSha256 ?? "")) {
    throw new Error("Phase 2 manifest hash is invalid");
  }
  if (!HASH_PATTERN.test(phase1EvidenceLockSha256 ?? "")) {
    throw new Error("Phase 1 evidence lock hash is invalid");
  }
  if (
    !Array.isArray(expectedIds)
    || !Array.isArray(parsedEvidence?.resultIds)
    || !arraysEqual(parsedEvidence.resultIds, expectedIds)
  ) {
    throw new Error(`Phase 2 ${component} parsed gate inventory is invalid`);
  }
  if (expectedIds.length !== configuration.expectedGateCount) {
    throw new Error(`Phase 2 ${component} result count is invalid`);
  }
  const assessment = component === "accessibility"
    ? deriveAccessibilityAssessment(parsedEvidence)
    : component === "journeys"
      ? deriveJourneysAssessment(parsedEvidence)
      : {
        checks: Object.fromEntries(configuration.checks.map((key) => [key, true])),
        metrics: metrics
          ?? parsedEvidence?.reportedMetrics
          ?? configuration.metrics,
      };
  assertMetrics(component, assessment.metrics);
  if (
    component === "recovery"
    && expectedIds.filter((id) => id === "mutation:problems.complete:retry-idempotency")
      .length !== 1
  ) {
    throw new Error("Phase 2 retry idempotency gate is missing");
  }

  const summary = {
    schemaVersion: 1,
    check: configuration.check,
    status: "pass",
    checkedAt,
    commit,
    manifestSha256,
    phase1EvidenceLockSha256,
    results: expectedIds.map((id) => ({
      id,
      status: "pass",
      skipped: false,
      retried: false,
      flaky: false,
    })),
    visualCases: [],
    checks: { ...assessment.checks },
    counts: {
      resultCount: expectedIds.length,
      ...REQUIRED_COUNTS,
    },
    metrics: { ...assessment.metrics },
    failureCodes: [],
  };
  return validatePhase2ComponentSummary(summary, {
    component,
    expectedCommit: commit,
    expectedIds,
    manifestSha256,
    nowMs: Date.parse(checkedAt),
    phase1EvidenceLockSha256,
  });
}

const regexEscape = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

export const buildPhase2TagGrep = (tags) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    throw new Error("Phase 2 Playwright grep tags are missing");
  }
  return `(?:^|\\s)@(?:${tags.map(regexEscape).join("|")})(?=\\s|$)`;
};

export async function loadPhase2ComponentContext({ root, component } = {}) {
  const configuration = componentConfiguration(component);
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("Phase 2 evidence root must be absolute");
  }
  const manifestPath = path.join(root, PHASE2_ACCEPTANCE_MANIFEST_PATH);
  const phase1LockPath = path.join(root, PHASE1_EVIDENCE_LOCK_PATH);
  const [manifestBytes, phase1EvidenceLockBytes] = await Promise.all([
    readFile(manifestPath),
    readFile(phase1LockPath),
  ]);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("Phase 2 acceptance manifest is not valid JSON");
  }
  const expectedIds = manifest.gates
    .filter((gate) => gate?.phase2EvidencePath === configuration.summaryPath)
    .map((gate) => gate.id);
  assertManifestAllocation(component, manifest, expectedIds);
  return {
    configuration,
    expectedIds,
    grep: buildPhase2TagGrep([...expectedIds, ...configuration.supportTags]),
    manifestSha256: sha256(manifestBytes),
    phase1EvidenceLockSha256: sha256(phase1EvidenceLockBytes),
  };
}

const resolveCommit = async (root) => {
  const { stdout } = await execFileAsync(
    "/usr/bin/git",
    ["-c", "core.fsmonitor=false", "rev-parse", "HEAD"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_NO_REPLACE_OBJECTS: "1",
      },
      maxBuffer: 128 * 1024,
    },
  );
  const commit = stdout.trim();
  if (!SHA_PATTERN.test(commit)) throw new Error("current Git commit is invalid");
  return commit;
};

export async function runPhase2PlaywrightReport({ root, grep } = {}) {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "quantgym-phase2-playwright-"),
  );
  const reportPath = path.join(temporaryDirectory, REPORT_FILENAME);
  const cliPath = path.join(root, "node_modules/playwright/cli.js");
  let exitCode = 0;
  let commandError;
  try {
    try {
      await execFileAsync(
        process.execPath,
        [
          cliPath,
          "test",
          "--config",
          "playwright.v2.config.ts",
          "--grep",
          grep,
          "--reporter=json",
          "--retries=0",
          "--workers=1",
        ],
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${path.dirname(process.execPath)}:${process.env.PATH ?? ""}`,
            PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
          },
          maxBuffer: 8 * 1024 * 1024,
        },
      );
    } catch (error) {
      exitCode = Number.isSafeInteger(error?.code) ? error.code : 1;
      commandError = error;
    }
    const reportStat = await stat(reportPath).catch(() => null);
    if (!reportStat?.isFile() || reportStat.size > MAX_REPORT_BYTES) {
      throw new Error("Playwright JSON report is missing or oversized", { cause: commandError });
    }
    let report;
    try {
      report = JSON.parse(await readFile(reportPath, "utf8"));
    } catch (error) {
      throw new Error("Playwright JSON report cannot be parsed", { cause: error });
    }
    return { exitCode, report };
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

export async function runPhase2ComponentEvidenceBuilder({
  root,
  component,
  reportRunner = runPhase2PlaywrightReport,
  commitResolver = resolveCommit,
  now = () => new Date(),
  writeSummary = true,
} = {}) {
  const context = await loadPhase2ComponentContext({ root, component });
  const execution = await reportRunner({ root, grep: context.grep, component });
  const parsedEvidence = parsePhase2PlaywrightReport({
    report: execution?.report,
    expectedIds: context.expectedIds,
    supportTags: context.configuration.supportTags,
    metricAnnotationType: context.configuration.metricAnnotationType,
    annotationRequirements: context.configuration.annotationRequirements,
  });
  if (execution?.exitCode !== 0) {
    throw new Error(`Playwright exited with code ${String(execution?.exitCode)}`);
  }
  const checkedAtDate = now();
  if (!(checkedAtDate instanceof Date) || !Number.isFinite(checkedAtDate.getTime())) {
    throw new Error("Phase 2 evidence clock is invalid");
  }
  const summary = buildPhase2ComponentSummary({
    component,
    checkedAt: checkedAtDate.toISOString(),
    commit: await commitResolver(root),
    manifestSha256: context.manifestSha256,
    phase1EvidenceLockSha256: context.phase1EvidenceLockSha256,
    expectedIds: context.expectedIds,
    parsedEvidence,
  });
  if (writeSummary) {
    await writeFileAtomicallyWithinTrustedRoot({
      root,
      relativePath: context.configuration.summaryPath,
      data: `${JSON.stringify(summary, null, 2)}\n`,
    });
  }
  return {
    outputPath: context.configuration.summaryPath,
    parsedEvidence,
    summary,
  };
}

export const phase2PlaywrightEvidenceComponents = Object.freeze(
  Object.keys(COMPONENTS),
);

export const phase2PlaywrightComponentConfiguration = (component) => {
  const configuration = componentConfiguration(component);
  return Object.freeze({
    ...configuration,
    checks: Object.freeze([...configuration.checks]),
    metrics: Object.freeze({ ...configuration.metrics }),
    supportTags: Object.freeze([...configuration.supportTags]),
    annotationRequirements: Object.freeze(configuration.annotationRequirements.map((requirement) => (
      Object.freeze({
        ...requirement,
        ownerTags: Object.freeze([...requirement.ownerTags]),
      })
    ))),
  });
};
