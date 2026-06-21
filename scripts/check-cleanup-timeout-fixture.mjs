#!/usr/bin/env node

import { closeWithTimeout } from "./cleanup-timeout.mjs";

const startedAt = Date.now();
const failures = [];

await check("hanging cleanup returns false and calls timeout hook", async () => {
  let timeoutCalled = false;
  const closeStartedAt = Date.now();
  const result = await closeWithTimeout(
    "fixture cleanup",
    () => new Promise(() => {}),
    50,
    () => {
      timeoutCalled = true;
    }
  );
  assert(result === false, "Expected hanging cleanup to return false.");
  assert(timeoutCalled === true, "Expected timeout hook to be called.");
  assert(Date.now() - closeStartedAt < 1000, "Hanging cleanup took too long to release.");
  return { result, timeoutCalled };
});

await check("successful cleanup returns true", async () => {
  const result = await closeWithTimeout("fixture cleanup", async () => {}, 1000);
  assert(result === true, "Expected successful cleanup to return true.");
  return { result };
});

await check("cleanup error rejects before timeout", async () => {
  let rejected = false;
  try {
    await closeWithTimeout("fixture cleanup", async () => {
      throw new Error("fixture close failed");
    }, 1000);
  } catch (error) {
    rejected = /fixture close failed/.test(error.message || "");
  }
  assert(rejected === true, "Expected cleanup errors to reject.");
  return { rejected };
});

const failed = failures.filter((item) => item.status === "fail");
const summary = {
  status: failed.length ? "fail" : "pass",
  durationMs: Date.now() - startedAt,
  checks: failures
};

console.log(JSON.stringify(summary, null, 2));
if (failed.length) process.exit(1);

async function check(name, fn) {
  try {
    failures.push({ name, status: "pass", data: await fn() });
  } catch (error) {
    failures.push({ name, status: "fail", error: error.message || String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
