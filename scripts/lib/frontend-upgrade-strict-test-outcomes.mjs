import path from "node:path";

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const nonNegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

const FORBIDDEN_PLAYWRIGHT_ANNOTATIONS = new Set([
  "disabled",
  "expected-failure",
  "fixme",
  "pending",
  "skip",
  "todo",
  "xfail",
  "xpass",
]);

const flattenPlaywrightSpecs = (suites) => {
  if (!Array.isArray(suites)) throw new Error("Playwright suites are missing");
  const specs = [];
  const visit = (suite) => {
    if (!isPlainObject(suite)) throw new Error("Playwright suite is invalid");
    if (Array.isArray(suite.specs)) specs.push(...suite.specs);
    if (Array.isArray(suite.suites)) suite.suites.forEach(visit);
  };
  suites.forEach(visit);
  return specs;
};

export function assertStrictPlaywrightReport(report, { expectedCount } = {}) {
  if (!Number.isSafeInteger(expectedCount) || expectedCount <= 0) {
    throw new Error("Playwright strict expected test count is invalid");
  }
  if (
    !isPlainObject(report)
    || !isPlainObject(report.config)
    || !Array.isArray(report.config.reporter)
    || report.config.reporter.length !== 1
    || !Array.isArray(report.config.reporter[0])
    || report.config.reporter[0][0] !== "json"
    || !Array.isArray(report.config.projects)
    || report.config.projects.length === 0
    || report.config.projects.some((project) => project?.retries !== 0)
    || !Array.isArray(report.errors)
    || report.errors.length !== 0
    || !isPlainObject(report.stats)
  ) throw new Error("Playwright strict report envelope is invalid");

  for (const key of ["skipped", "unexpected", "flaky"]) {
    if (!nonNegativeInteger(report.stats[key]) || report.stats[key] !== 0) {
      throw new Error(`Playwright strict report contains ${key} outcomes`);
    }
  }
  if (!nonNegativeInteger(report.stats.expected) || report.stats.expected <= 0) {
    throw new Error("Playwright strict report contains no passing tests");
  }
  if (report.stats.expected !== expectedCount) {
    throw new Error("Playwright strict report test count changed");
  }

  const specs = flattenPlaywrightSpecs(report.suites);
  const tests = specs.flatMap((spec) => {
    if (!isPlainObject(spec) || spec.ok !== true || !Array.isArray(spec.tests)) {
      throw new Error("Playwright strict report contains an invalid spec");
    }
    return spec.tests;
  });
  if (tests.length !== report.stats.expected) {
    throw new Error("Playwright strict report test inventory is inconsistent");
  }
  for (const test of tests) {
    const annotations = Array.isArray(test?.annotations) ? test.annotations : [];
    if (annotations.some(({ type }) => (
      typeof type === "string"
      && FORBIDDEN_PLAYWRIGHT_ANNOTATIONS.has(type.trim().toLowerCase())
    ))) throw new Error("Playwright strict report contains skip/todo/xfail annotation");
    if (
      test?.expectedStatus !== "passed"
      || test?.status !== "expected"
      || !Array.isArray(test.results)
      || test.results.length !== 1
    ) throw new Error("Playwright strict report contains a non-passing test");
    const [result] = test.results;
    if (
      result?.retry !== 0
      || result?.status !== "passed"
      || result?.error !== undefined
      || (Array.isArray(result?.errors) && result.errors.length !== 0)
    ) throw new Error("Playwright strict report contains a retry or failed result");
  }
  return Object.freeze({ testCount: tests.length });
}

const TAP_SUMMARY_KEYS = Object.freeze([
  "tests",
  "pass",
  "fail",
  "cancelled",
  "skipped",
  "todo",
]);

export function parseStrictNodeTap(tap, { expectedCount } = {}) {
  if (!Number.isSafeInteger(expectedCount) || expectedCount <= 0) {
    throw new Error("Node strict expected test count is invalid");
  }
  if (typeof tap !== "string" || !tap.startsWith("TAP version 13\n")) {
    throw new Error("Node strict TAP report is missing");
  }
  const values = {};
  for (const key of TAP_SUMMARY_KEYS) {
    const matches = [...tap.matchAll(new RegExp(`^# ${key} (\\d+)$`, "gmu"))];
    if (matches.length !== 1) throw new Error(`Node strict TAP ${key} total is invalid`);
    values[key] = Number(matches[0][1]);
  }
  if (values.tests !== expectedCount) {
    throw new Error("Node strict TAP test count changed");
  }
  if (
    values.pass !== values.tests
    || values.fail !== 0
    || values.cancelled !== 0
    || values.skipped !== 0
    || values.todo !== 0
  ) throw new Error("Node strict TAP contains skip, todo, cancellation, or failure outcomes");
  const planMatches = [...tap.matchAll(/^1\.\.(\d+)$/gmu)];
  if (planMatches.length !== 1) {
    throw new Error("Node strict TAP plan is invalid");
  }
  const rootPlan = Number(planMatches[0][1]);
  const rootResults = [...tap.matchAll(/^(not ok|ok) (\d+)(?: - [^\n]*)?$/gmu)];
  if (
    rootResults.length !== rootPlan
    || rootResults.some((result, index) => (
      result[1] !== "ok" || Number(result[2]) !== index + 1
    ))
    || /^[ \t]*not ok \d+(?: - [^\n]*)?$/gmu.test(tap)
    || /^[ \t]*(?:not ok|ok) \d+(?: - [^\n]*)? #[ \t]*(?:SKIP|TODO)\b/gimu.test(tap)
  ) throw new Error("Node strict TAP root plan or nested results are invalid");
  return Object.freeze(values);
}

export function assertStrictVitestReport(report, {
  expectedCount,
  expectedFileCount,
  expectedFiles,
  root,
  expectedSuiteCount,
} = {}) {
  if (
    !Number.isSafeInteger(expectedCount)
    || expectedCount <= 0
    || !Number.isSafeInteger(expectedFileCount)
    || expectedFileCount <= 0
    || !Number.isSafeInteger(expectedSuiteCount)
    || expectedSuiteCount <= 0
    || !Array.isArray(expectedFiles)
    || expectedFiles.length !== expectedFileCount
    || expectedFiles.some((file) => (
      typeof file !== "string"
      || file.length === 0
      || path.isAbsolute(file)
      || file.includes("\\")
      || file.split("/").includes("..")
    ))
    || new Set(expectedFiles).size !== expectedFiles.length
    || typeof root !== "string"
    || !path.isAbsolute(root)
  ) throw new Error("Vitest strict expected inventory is invalid");
  if (
    !isPlainObject(report)
    || report.success !== true
    || !nonNegativeInteger(report.numTotalTests)
    || report.numPassedTests !== report.numTotalTests
    || report.numFailedTests !== 0
    || report.numPendingTests !== 0
    || report.numTodoTests !== 0
    || report.numFailedTestSuites !== 0
    || report.numPendingTestSuites !== 0
    || !Array.isArray(report.testResults)
    || !nonNegativeInteger(report.numTotalTestSuites)
    || !nonNegativeInteger(report.numPassedTestSuites)
    || report.testResults.length === 0
    || report.snapshot?.failure !== false
  ) throw new Error("Vitest strict report contains skip, todo, or failure outcomes");
  if (
    report.numTotalTests !== expectedCount
    || report.numTotalTestSuites !== expectedSuiteCount
    || report.numPassedTestSuites !== expectedSuiteCount
    || report.testResults.length !== expectedFileCount
  ) throw new Error("Vitest strict report inventory changed");
  const actualFiles = report.testResults.map((result) => {
    if (typeof result?.name !== "string" || !path.isAbsolute(result.name)) {
      throw new Error("Vitest strict report file path is invalid");
    }
    const relative = path.relative(root, result.name);
    if (
      relative.length === 0
      || path.isAbsolute(relative)
      || relative === ".."
      || relative.startsWith(`..${path.sep}`)
    ) throw new Error("Vitest strict report file escapes the repository");
    return relative.split(path.sep).join("/");
  }).sort();
  const frozenFiles = [...expectedFiles].sort();
  if (
    actualFiles.length !== frozenFiles.length
    || actualFiles.some((file, index) => file !== frozenFiles[index])
  ) throw new Error("Vitest strict report file inventory changed");
  const assertions = report.testResults.flatMap((result) => {
    if (result?.status !== "passed" || !Array.isArray(result.assertionResults)) {
      throw new Error("Vitest strict report contains a non-passing suite");
    }
    return result.assertionResults;
  });
  if (
    assertions.length !== report.numTotalTests
    || assertions.some((assertion) => (
      assertion?.status !== "passed"
      || !Array.isArray(assertion.failureMessages)
      || assertion.failureMessages.length !== 0
    ))
  ) throw new Error("Vitest strict report assertion inventory is invalid");
  return Object.freeze({ testCount: assertions.length });
}

export function parseStrictUnittestOutput({
  stdout = "",
  stderr = "",
  expectedCount,
  expectedTestIds,
} = {}) {
  if (
    !Number.isSafeInteger(expectedCount)
    || expectedCount <= 0
    || !Array.isArray(expectedTestIds)
    || expectedTestIds.length !== expectedCount
    || expectedTestIds.some((testId) => (
      typeof testId !== "string"
      || !/^[A-Za-z_][A-Za-z0-9_.]*$/u.test(testId)
    ))
    || new Set(expectedTestIds).size !== expectedTestIds.length
  ) {
    throw new Error("unittest strict expected test count is invalid");
  }
  if (typeof stdout !== "string" || typeof stderr !== "string") {
    throw new Error("unittest strict output is invalid");
  }
  const terminal = `${stdout}\n${stderr}`.replaceAll("\r\n", "\n");
  const ran = [...terminal.matchAll(/^Ran (\d+) tests? in [^\n]+$/gmu)];
  const summaries = [...terminal.matchAll(/^OK(?: \([^\n]+\))?$/gmu)];
  if (ran.length === 1 && Number(ran[0][1]) !== expectedCount) {
    throw new Error("unittest strict test count changed");
  }
  if (
    ran.length !== 1
    || summaries.length !== 1
    || summaries[0][0] !== "OK"
  ) throw new Error("unittest strict output contains skip or expected-failure outcomes");
  const resultLines = [...terminal.matchAll(
    /^(\S+) \(([^)\n]+)\) \.\.\. ([^\n]+)$/gmu,
  )];
  if (
    resultLines.length !== expectedCount
    || resultLines.some((line) => (
      line[3] !== "ok"
      || line[2].split(".").at(-1) !== line[1]
    ))
  ) throw new Error("unittest strict verbose result inventory is invalid");
  const actualTestIds = resultLines.map((line) => line[2]).sort();
  const frozenTestIds = [...expectedTestIds].sort();
  if (actualTestIds.some((testId, index) => testId !== frozenTestIds[index])) {
    throw new Error("unittest strict test-name inventory changed");
  }
  return Object.freeze({ testCount: Number(ran[0][1]) });
}
