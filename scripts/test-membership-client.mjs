import test from "node:test";
import assert from "node:assert/strict";
import { membershipConnection, membershipRequest } from "../src/features/membership/membershipApi.js";

test("only a matching cloud session can check membership", () => {
  assert.equal(membershipConnection({ token: "fixture", userId: "one" }, "two").connected, false);
  assert.equal(membershipConnection({ token: "", userId: "one" }, "one").connected, false);
  assert.equal(membershipConnection({ token: "fixture", userId: "one" }, "one").connected, true);
});

test("membership requests require authentication and disable caching", async t => {
  let request;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ isMember: true }) };
  });
  await assert.rejects(membershipRequest("/membership"), error => error.status === 401);
  assert.equal(request, undefined);
  assert.deepEqual(await membershipRequest("/membership", { baseUrl: "https://example.invalid/api/", token: "fixture-token" }), { isMember: true });
  assert.equal(request.url, "https://example.invalid/api/membership");
  assert.equal(request.options.headers.Authorization, "Bearer fixture-token");
  assert.equal(request.options.cache, "no-store");
  assert.equal(request.options.credentials, "omit");
});

test("server denial surfaces an actionable message without internal error details", async t => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 403, json: async () => ({ error: "sensitive internal detail" }) }));
  await assert.rejects(membershipRequest("/admin/memberships", { token: "fixture" }), error => {
    assert.equal(error.status, 403);
    assert.match(error.message, /仅管理员/);
    assert.ok(!error.message.includes("sensitive internal detail"));
    return true;
  });
});

test("account transition aborts the pending membership request", async t => {
  t.mock.method(globalThis, "fetch", async (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
  }));
  const controller = new AbortController();
  const pending = membershipRequest("/membership", { token: "fixture", signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, error => error.name === "AbortError");
});
