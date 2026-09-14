import test from "node:test";
import assert from "node:assert/strict";
import { guardianRequest, saveGuardianSession, readGuardianSession, clearGuardianSession, getGuardianApiBaseUrl } from "../src/features/guardian/guardianApi.js";
import { guardianOwnerRequest } from "../src/features/guardian/guardianOwnerApi.js";
import { getCloudSessionStatus, reportCloudSessionResponse } from "../src/state/cloudSessionStatus.js";

test("guardian client never borrows the student token and sends codes only in the request body", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ ok: true }) }; };
  try {
    const services = { appState: { cloudConfig: { endpoint: "https://fixture.invalid/api/", token: "student-secret" } } };
    const baseUrl = getGuardianApiBaseUrl(services);
    await guardianRequest("/api/guardian/session", { baseUrl, method: "POST", body: { code: "shared-secret" } });
    assert.equal(calls[0].url, "https://fixture.invalid/api/guardian/session");
    assert.equal(calls[0].options.headers.Authorization, undefined);
    assert.equal(calls[0].options.credentials, "omit");
    assert.equal(calls[0].options.cache, "no-store");
    assert.equal(calls[0].options.referrerPolicy, "no-referrer");
    assert.deepEqual(JSON.parse(calls[0].options.body), { code: "shared-secret" });
    await guardianRequest("/guardian/dashboard", { baseUrl, token: "guardian-only" });
    assert.equal(calls[1].options.headers.Authorization, "Bearer guardian-only");
  } finally { globalThis.fetch = originalFetch; }
});

test("tab session excludes shared code and personal data, and expires locally", () => {
  const original = globalThis.sessionStorage;
  const entries = new Map();
  globalThis.sessionStorage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  try {
    const session = { token: "short-lived-token", expiresAt: new Date(Date.now() + 60000).toISOString(), code: "do-not-store", student: { name: "Private" } };
    saveGuardianSession(session);
    assert.deepEqual(readGuardianSession(), { token: session.token, expiresAt: session.expiresAt });
    assert.ok(![...entries.values()][0].includes("do-not-store"));
    saveGuardianSession({ token: session.token, expiresAt: new Date(0).toISOString() });
    assert.equal(readGuardianSession(), null);
    assert.equal(entries.size, 0);
    clearGuardianSession();
  } finally { globalThis.sessionStorage = original; }
});

test("mail and access failures stay failures, without retrying mutations", async () => {
  const originalFetch = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => { count += 1; return { ok: false, status: 503, json: async () => ({ error: "邮件服务未配置" }) }; };
  try {
    await assert.rejects(guardianRequest("/guardian/reminders", { method: "POST", token: "guardian-token", body: { message: "Reminder" } }), error => error.status === 503 && error.message === "邮件服务未配置");
    assert.equal(count, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test("guardian rejection cannot expire a student session; owner rejection belongs to captured credentials", async () => {
  const originalFetch = globalThis.fetch;
  const oldConfig = { endpoint: "https://fixture.invalid/api", userId: "owner-before", token: "owner-old-token" };
  const newConfig = { ...oldConfig, userId: "owner-after", token: "owner-new-token" };
  reportCloudSessionResponse(oldConfig, 200);
  reportCloudSessionResponse(newConfig, 200);
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: "expired" }) });
  try {
    await assert.rejects(guardianRequest("/guardian/dashboard", { baseUrl: oldConfig.endpoint, token: "guardian-token" }), error => error.status === 401);
    assert.equal(getCloudSessionStatus(oldConfig).phase, "connected");
    assert.equal(getCloudSessionStatus(newConfig).phase, "connected");

    let rejectOwner;
    const activeConfig = { ...oldConfig };
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `${oldConfig.endpoint}/guardian/access/rotate`);
      assert.equal(options.headers.Authorization, `Bearer ${oldConfig.token}`);
      await new Promise(resolve => { rejectOwner = resolve; });
      return { ok: false, status: 401, json: async () => ({ error: "expired" }) };
    };
    const pending = guardianOwnerRequest("/guardian/access/rotate", { config: activeConfig, method: "POST" });
    Object.assign(activeConfig, newConfig);
    rejectOwner();
    await assert.rejects(pending, error => error.status === 401);
    assert.equal(getCloudSessionStatus(oldConfig).phase, "expired");
    assert.equal(getCloudSessionStatus(newConfig).phase, "connected");
  } finally { globalThis.fetch = originalFetch; }
});

test("owner access success reports connected without accepting guardian-only endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const config = { endpoint: "https://fixture.invalid/api", userId: "owner-success", token: "owner-success-token" };
  let requests = 0;
  globalThis.fetch = async () => { requests += 1; return { ok: true, status: 200, json: async () => ({ code: "fixture-code" }) }; };
  try {
    assert.equal(getCloudSessionStatus(config).phase, "unknown");
    await guardianOwnerRequest("/guardian/access", { config });
    assert.equal(getCloudSessionStatus(config).phase, "connected");
    await assert.rejects(guardianOwnerRequest("/guardian/dashboard", { config }), /owner access endpoint/);
    assert.equal(requests, 1);
  } finally { globalThis.fetch = originalFetch; }
});
