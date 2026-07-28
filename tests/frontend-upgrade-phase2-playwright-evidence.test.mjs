import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPhase2ComponentSummary,
  loadPhase2ComponentContext,
  parsePhase2PlaywrightReport,
  phase2PlaywrightComponentConfiguration,
} from "../scripts/lib/frontend-upgrade-phase2-playwright-evidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commit = "a".repeat(40);
const manifestSha256 = "b".repeat(64);
const phase1EvidenceLockSha256 = "c".repeat(64);
const checkedAt = "2026-07-27T12:00:00.000Z";

const passedResult = () => ({
  attachments: [],
  duration: 10,
  errors: [],
  retry: 0,
  status: "passed",
  stderr: [],
  stdout: [],
});

const specFor = (tags, { annotations = [], result, status = "expected" } = {}) => ({
  id: tags.join("-"),
  ok: status === "expected",
  tags,
  title: `${tags.map((tag) => `@${tag}`).join(" ")} synthetic evidence`,
  tests: [{
    annotations,
    expectedStatus: "passed",
    projectId: "",
    projectName: "",
    results: result ? [result] : [passedResult()],
    status,
  }],
});

const reportFor = (specs) => ({
  config: {
    projects: [{ id: "", name: "", retries: 0 }],
    reporter: [["json"]],
  },
  errors: [],
  stats: {
    expected: specs.length,
    flaky: 0,
    skipped: 0,
    unexpected: 0,
  },
  suites: [{
    specs,
    suites: [],
    title: "synthetic",
  }],
});

const accessibilityGateIds = [
  "a11y:overview",
  "a11y:plan",
  "a11y:problems",
];

const accessibilityRouteFacts = (routeId) => ({
  axeCheckedViewportCount: 2,
  axeViolationCount: 0,
  focusCheckCount: 2,
  focusFailures: 0,
  kind: "phase2-accessibility-route-facts",
  routeId,
  schemaVersion: 1,
  seriousOrCriticalAxeFindings: 0,
  viewportWidths: [390, 1_440],
});

const accessibilitySpecs = () => [
  ...accessibilityGateIds.map((gateId) => (
    specFor([`phase2:${gateId.split(":")[1]}`, gateId])
  )),
  specFor(["e2e:desktop-shell-keyboard-navigation"], {
    annotations: [{
      type: "phase2-accessibility-desktop-facts",
      description: JSON.stringify({
        focusCheckCount: 7,
        focusFailures: 0,
        keyboardJourneyCount: 6,
        keyboardJourneyFailures: 0,
        kind: "phase2-accessibility-desktop-facts",
        schemaVersion: 1,
      }),
    }],
  }),
  specFor(["e2e:mobile-shell-navigation"], {
    annotations: [{
      type: "phase2-accessibility-mobile-facts",
      description: JSON.stringify({
        focusCheckCount: 4,
        focusFailures: 0,
        keyboardJourneyCount: 4,
        keyboardJourneyFailures: 0,
        kind: "phase2-accessibility-mobile-facts",
        mobileTargetCount: 6,
        mobileTargetFailures: 0,
        schemaVersion: 1,
      }),
    }],
  }),
  ...["overview", "plan", "problems"].map((routeId) => (
    specFor([`e2e:phase2-a11y-route-${routeId}`], {
      annotations: [{
        type: "phase2-accessibility-route-facts",
        description: JSON.stringify(accessibilityRouteFacts(routeId)),
      }],
    })
  )),
];

const parseAccessibilityReport = (report) => {
  const configuration = phase2PlaywrightComponentConfiguration("accessibility");
  return parsePhase2PlaywrightReport({
    report,
    expectedIds: accessibilityGateIds,
    supportTags: configuration.supportTags,
    annotationRequirements: configuration.annotationRequirements,
  });
};

const journeyGateIds = [
  "e2e:overview-resume-training",
  "e2e:plan-recommendation",
  "e2e:problem-attempt-completion",
];

const runtimeIntegrityMetrics = () => ({
  applicationConsoleErrors: 0,
  failedFirstPartyRequests: 0,
  horizontalOverflowPx: 0,
  pageErrors: 0,
  unhandledRejections: 0,
});

const dailyLoopFacts = () => ({
  checks: {
    authenticatedEntry: true,
    dailyLoopPassed: true,
    exactTrainingSession: true,
    overviewUpdated: true,
    planUpdated: true,
    resultVisibleBeforeNavigation: true,
    singleRewardPassed: true,
  },
  completion: {
    idempotencyKeyReused: true,
    requestCount: 2,
    rewardCount: 1,
    sameAcknowledgement: true,
    xpLedgerEntryCount: 1,
  },
  integrity: runtimeIntegrityMetrics(),
  kind: "phase2-daily-loop-facts",
  overview: {
    finalPlanCompletedTasks: 1,
    finalTodayTaskStatus: "completed",
    finalWeeklyXp: 160,
    initialPlanCompletedTasks: 0,
    initialTodayTaskStatus: "open",
    initialWeeklyXp: 120,
  },
  plan: {
    completedTasks: 1,
    taskId: "20000000-0000-4000-8000-000000000002",
    taskStatus: "completed",
    totalTasks: 1,
  },
  schemaVersion: 1,
  session: {
    planTaskId: "20000000-0000-4000-8000-000000000002",
    problemId: "11111111-1111-4111-8111-111111111111",
    sessionId: "22222222-2222-4222-8222-222222222222",
  },
});

const journeySpecs = () => [
  specFor(["phase2:overview", journeyGateIds[0]]),
  specFor(["phase2:plan", journeyGateIds[1]]),
  specFor(["phase2:problems", journeyGateIds[2]]),
  specFor(["e2e:phase2-runtime-integrity"], {
    annotations: [{
      type: "phase2-runtime-integrity-metrics",
      description: JSON.stringify(runtimeIntegrityMetrics()),
    }],
  }),
  specFor(["e2e:phase2-daily-loop-facts"], {
    annotations: [{
      type: "phase2-daily-loop-facts",
      description: JSON.stringify(dailyLoopFacts()),
    }],
  }),
];

const parseJourneysReport = (report) => {
  const configuration = phase2PlaywrightComponentConfiguration("journeys");
  return parsePhase2PlaywrightReport({
    report,
    expectedIds: journeyGateIds,
    supportTags: configuration.supportTags,
    annotationRequirements: configuration.annotationRequirements,
  });
};

test("parser extracts only assigned IDs while one test proves multiple gates", () => {
  const expectedIds = ["e2e:one", "e2e:two"];
  const supportTags = ["e2e:support"];
  const report = reportFor([
    specFor(["phase2:overview", ...expectedIds]),
    specFor(supportTags),
  ]);
  const parsed = parsePhase2PlaywrightReport({ report, expectedIds, supportTags });
  assert.deepEqual(parsed.resultIds, expectedIds);
  assert.deepEqual(parsed.supportTags, supportTags);
  assert.equal(parsed.executedTestCount, 2);
});

test("parser extracts runtime metrics from the single required support annotation", () => {
  const expectedIds = ["e2e:one"];
  const supportTags = ["e2e:runtime"];
  const metrics = {
    applicationConsoleErrors: 0,
    unhandledRejections: 0,
    pageErrors: 0,
    failedFirstPartyRequests: 0,
    horizontalOverflowPx: 0,
  };
  const report = reportFor([
    specFor(["phase2:overview", ...expectedIds]),
    specFor(supportTags, {
      annotations: [{
        type: "phase2-runtime-integrity-metrics",
        description: JSON.stringify(metrics),
      }],
    }),
  ]);
  const parsed = parsePhase2PlaywrightReport({
    report,
    expectedIds,
    supportTags,
    metricAnnotationType: "phase2-runtime-integrity-metrics",
  });
  assert.deepEqual(parsed.reportedMetrics, metrics);
});

test("parser rejects skipped tests", () => {
  const report = reportFor([specFor(["phase2:overview", "e2e:one"])]);
  report.stats.expected = 0;
  report.stats.skipped = 1;
  report.suites[0].specs[0].tests[0].status = "skipped";
  report.suites[0].specs[0].tests[0].results[0].status = "skipped";
  assert.throws(
    () => parsePhase2PlaywrightReport({ report, expectedIds: ["e2e:one"] }),
    /skipped/u,
  );
});

test("parser rejects skip, todo, xfail, xpass, fixme, and pending annotations", () => {
  for (const type of ["skip", "todo", "xfail", "xpass", "fixme", "pending"]) {
    const report = reportFor([specFor(["phase2:overview", "e2e:one"])]);
    report.suites[0].specs[0].tests[0].annotations.push({ type });
    assert.throws(
      () => parsePhase2PlaywrightReport({ report, expectedIds: ["e2e:one"] }),
      /skip\/todo\/xfail annotation/u,
      type,
    );
  }
});

test("parser rejects retried tests even when the final attempt passes", () => {
  const report = reportFor([specFor(["phase2:overview", "e2e:one"])]);
  report.suites[0].specs[0].tests[0].results.push({
    ...passedResult(),
    retry: 1,
  });
  assert.throws(
    () => parsePhase2PlaywrightReport({ report, expectedIds: ["e2e:one"] }),
    /retried/u,
  );
});

test("parser rejects flaky tests", () => {
  const report = reportFor([specFor(["phase2:overview", "e2e:one"])]);
  report.stats.expected = 0;
  report.stats.flaky = 1;
  report.suites[0].specs[0].tests[0].status = "flaky";
  assert.throws(
    () => parsePhase2PlaywrightReport({ report, expectedIds: ["e2e:one"] }),
    /flaky/u,
  );
});

test("parser rejects a non-zero configured retry budget", () => {
  const report = reportFor([specFor(["phase2:overview", "e2e:one"])]);
  report.config.projects[0].retries = 1;
  assert.throws(
    () => parsePhase2PlaywrightReport({ report, expectedIds: ["e2e:one"] }),
    /zero configured retries/u,
  );
});

test("parser rejects duplicate gate ownership", () => {
  const report = reportFor([
    specFor(["phase2:overview", "e2e:one"]),
    specFor(["phase2:plan", "e2e:one"]),
  ]);
  assert.throws(
    () => parsePhase2PlaywrightReport({ report, expectedIds: ["e2e:one"] }),
    /duplicate gate/u,
  );
});

test("parser rejects missing assigned gates", () => {
  const report = reportFor([specFor(["phase2:overview", "e2e:one"])]);
  assert.throws(
    () => parsePhase2PlaywrightReport({
      report,
      expectedIds: ["e2e:one", "e2e:missing"],
    }),
    /missing gates/u,
  );
});

test("parser rejects extra executed specs", () => {
  const report = reportFor([
    specFor(["phase2:overview", "e2e:one"]),
    specFor(["phase2:overview", "e2e:extra"]),
  ]);
  assert.throws(
    () => parsePhase2PlaywrightReport({ report, expectedIds: ["e2e:one"] }),
    /extra executed spec/u,
  );
});

test("parser rejects a missing runtime metrics annotation", () => {
  const report = reportFor([
    specFor(["phase2:overview", "e2e:one"]),
    specFor(["e2e:runtime"]),
  ]);
  assert.throws(
    () => parsePhase2PlaywrightReport({
      report,
      expectedIds: ["e2e:one"],
      supportTags: ["e2e:runtime"],
      metricAnnotationType: "phase2-runtime-integrity-metrics",
    }),
    /exactly one phase2-runtime-integrity-metrics annotation/u,
  );
});

test("journeys summary derives loop state and runtime checks from two strict facts", () => {
  const parsedEvidence = parseJourneysReport(reportFor(journeySpecs()));
  const summary = buildPhase2ComponentSummary({
    component: "journeys",
    checkedAt,
    commit,
    manifestSha256,
    phase1EvidenceLockSha256,
    expectedIds: journeyGateIds,
    parsedEvidence,
  });
  assert.deepEqual(summary.checks, {
    dailyLoopPassed: true,
    singleRewardPassed: true,
    planUpdated: true,
    overviewUpdated: true,
    consolePassed: true,
    rejectionsPassed: true,
    overflowPassed: true,
  });
  assert.deepEqual(summary.metrics, runtimeIntegrityMetrics());
});

test("journeys parser rejects a missing daily-loop support tag", () => {
  const specs = journeySpecs();
  const index = specs.findIndex((spec) => (
    spec.tags.includes("e2e:phase2-daily-loop-facts")
  ));
  specs.splice(index, 1);
  assert.throws(
    () => parseJourneysReport(reportFor(specs)),
    /missing support tests/u,
  );
});

test("journeys parser rejects a missing daily-loop annotation", () => {
  const specs = journeySpecs();
  const dailyLoop = specs.find((spec) => (
    spec.tags.includes("e2e:phase2-daily-loop-facts")
  ));
  dailyLoop.tests[0].annotations = [];
  assert.throws(
    () => parseJourneysReport(reportFor(specs)),
    /exactly one phase2-daily-loop-facts annotation/u,
  );
});

test("journeys summary rejects malformed daily-loop facts", () => {
  const specs = journeySpecs();
  const dailyLoop = specs.find((spec) => (
    spec.tags.includes("e2e:phase2-daily-loop-facts")
  ));
  const annotation = dailyLoop.tests[0].annotations[0];
  const facts = JSON.parse(annotation.description);
  delete facts.completion.rewardCount;
  annotation.description = JSON.stringify(facts);
  const parsedEvidence = parseJourneysReport(reportFor(specs));
  assert.throws(
    () => buildPhase2ComponentSummary({
      component: "journeys",
      checkedAt,
      commit,
      manifestSha256,
      phase1EvidenceLockSha256,
      expectedIds: journeyGateIds,
      parsedEvidence,
    }),
    /completion facts are malformed/u,
  );
});

test("journeys summary rejects false daily-loop and single-reward facts", () => {
  const specs = journeySpecs();
  const dailyLoop = specs.find((spec) => (
    spec.tags.includes("e2e:phase2-daily-loop-facts")
  ));
  const annotation = dailyLoop.tests[0].annotations[0];
  const facts = JSON.parse(annotation.description);
  facts.checks.dailyLoopPassed = false;
  facts.completion.rewardCount = 2;
  annotation.description = JSON.stringify(facts);
  const parsedEvidence = parseJourneysReport(reportFor(specs));
  assert.throws(
    () => buildPhase2ComponentSummary({
      component: "journeys",
      checkedAt,
      commit,
      manifestSha256,
      phase1EvidenceLockSha256,
      expectedIds: journeyGateIds,
      parsedEvidence,
    }),
    /facts contain failed checks/u,
  );
});

test("journeys summary rejects non-zero runtime metrics", () => {
  const specs = journeySpecs();
  const runtime = specs.find((spec) => (
    spec.tags.includes("e2e:phase2-runtime-integrity")
  ));
  const annotation = runtime.tests[0].annotations[0];
  const metrics = JSON.parse(annotation.description);
  metrics.applicationConsoleErrors = 1;
  annotation.description = JSON.stringify(metrics);
  const parsedEvidence = parseJourneysReport(reportFor(specs));
  assert.throws(
    () => buildPhase2ComponentSummary({
      component: "journeys",
      checkedAt,
      commit,
      manifestSha256,
      phase1EvidenceLockSha256,
      expectedIds: journeyGateIds,
      parsedEvidence,
    }),
    /facts contain failed checks/u,
  );
});

test("accessibility summary is derived from exact route, keyboard, target and focus facts", () => {
  const parsedEvidence = parseAccessibilityReport(reportFor(accessibilitySpecs()));
  const summary = buildPhase2ComponentSummary({
    component: "accessibility",
    checkedAt,
    commit,
    manifestSha256,
    phase1EvidenceLockSha256,
    expectedIds: accessibilityGateIds,
    parsedEvidence,
  });
  assert.deepEqual(summary.checks, {
    axePassed: true,
    keyboardJourneysPassed: true,
    mobileTargetsPassed: true,
    focusPassed: true,
  });
  assert.deepEqual(summary.metrics, {
    seriousOrCriticalAxeFindings: 0,
    keyboardJourneyFailures: 0,
    mobileTargetFailures: 0,
    focusFailures: 0,
  });
});

test("accessibility parser rejects a missing support tag", () => {
  const specs = accessibilitySpecs();
  const index = specs.findIndex((spec) => (
    spec.tags.includes("e2e:phase2-a11y-route-plan")
  ));
  specs.splice(index, 1);
  assert.throws(
    () => parseAccessibilityReport(reportFor(specs)),
    /missing support tests/u,
  );
});

test("accessibility parser rejects a missing required fact annotation", () => {
  const specs = accessibilitySpecs();
  const mobile = specs.find((spec) => spec.tags.includes("e2e:mobile-shell-navigation"));
  mobile.tests[0].annotations = [];
  assert.throws(
    () => parseAccessibilityReport(reportFor(specs)),
    /exactly one phase2-accessibility-mobile-facts annotation/u,
  );
});

test("accessibility summary rejects non-zero axe findings", () => {
  const specs = accessibilitySpecs();
  const overview = specs.find((spec) => (
    spec.tags.includes("e2e:phase2-a11y-route-overview")
  ));
  const annotation = overview.tests[0].annotations[0];
  const facts = JSON.parse(annotation.description);
  facts.axeViolationCount = 1;
  facts.seriousOrCriticalAxeFindings = 1;
  annotation.description = JSON.stringify(facts);
  const parsedEvidence = parseAccessibilityReport(reportFor(specs));
  assert.throws(
    () => buildPhase2ComponentSummary({
      component: "accessibility",
      checkedAt,
      commit,
      manifestSha256,
      phase1EvidenceLockSha256,
      expectedIds: accessibilityGateIds,
      parsedEvidence,
    }),
    /non-zero failures/u,
  );
});

test("accessibility summary rejects non-zero mobile-target and focus facts", () => {
  const specs = accessibilitySpecs();
  const mobile = specs.find((spec) => spec.tags.includes("e2e:mobile-shell-navigation"));
  const annotation = mobile.tests[0].annotations[0];
  const facts = JSON.parse(annotation.description);
  facts.focusFailures = 1;
  facts.mobileTargetFailures = 1;
  annotation.description = JSON.stringify(facts);
  const parsedEvidence = parseAccessibilityReport(reportFor(specs));
  assert.throws(
    () => buildPhase2ComponentSummary({
      component: "accessibility",
      checkedAt,
      commit,
      manifestSha256,
      phase1EvidenceLockSha256,
      expectedIds: accessibilityGateIds,
      parsedEvidence,
    }),
    /non-zero failures/u,
  );
});

test("manifest allocation stays exact at 3 accessibility, 3 journey and 67 recovery IDs", async () => {
  const contexts = await Promise.all([
    loadPhase2ComponentContext({ root, component: "accessibility" }),
    loadPhase2ComponentContext({ root, component: "journeys" }),
    loadPhase2ComponentContext({ root, component: "recovery" }),
  ]);
  assert.deepEqual(contexts.map(({ expectedIds }) => expectedIds.length), [3, 3, 67]);
  assert.equal(
    contexts[2].expectedIds.at(-1),
    "mutation:problems.complete:retry-idempotency",
  );
});
