import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { membershipConnection, membershipRequest } from "../src/features/membership/membershipApi.js";
import { hasMemberPracticeAccess } from "../src/features/problems/practiceBanks.js";

function membershipHookFixture() {
  const refs = [];
  const states = [];
  const pending = [];
  let refIndex = 0;
  let stateIndex = 0;
  const account = { userId: 'one', config: { userId: 'one', token: 'session-one', endpoint: 'https://example.invalid/api' } };
  const services = { refreshProblemCatalog: async () => ({ ok: true }) };
  const source = fs.readFileSync(new URL('../src/features/membership/useMembership.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function useMembership', 'function useMembership');
  const context = vm.createContext({
    AbortController,
    membershipConnection,
    membershipRequest: (...args) => new Promise((resolve, reject) => pending.push({ resolve, reject, args })),
    useAppServicesContext: () => services,
    useAuthStore: selector => selector({ currentUser: { id: account.userId } }),
    useAppStore: selector => selector({ cloudConfig: account.config }),
    useCallback: fn => fn,
    useEffect() {},
    useRef(value) { const index = refIndex++; return refs[index] ||= { current: value }; },
    useState(value) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = value;
      return [states[index], update => { states[index] = typeof update === 'function' ? update(states[index]) : update; }];
    }
  });
  vm.runInContext(source, context);
  return { account, pending, render() { refIndex = 0; stateIndex = 0; return context.useMembership(); } };
}

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

test('background membership checks preserve an open member question, but first checks and denials block it', async () => {
  const fixture = membershipHookFixture();
  assert.equal(hasMemberPracticeAccess(fixture.render()), false);
  const first = fixture.render().refresh();
  assert.equal(fixture.render().loading, true);
  assert.equal(hasMemberPracticeAccess(fixture.render()), false);
  fixture.pending.shift().resolve({ isMember: true });
  await first;
  assert.equal(hasMemberPracticeAccess(fixture.render()), true);
  const background = fixture.render().refresh();
  assert.equal(fixture.render().checking, true);
  assert.equal(fixture.render().loading, false);
  assert.equal(hasMemberPracticeAccess(fixture.render()), true);
  fixture.pending.shift().resolve({ isMember: true });
  await background;
  assert.equal(fixture.render().checking, false);
  assert.equal(hasMemberPracticeAccess(fixture.render()), true);
  const revoke = fixture.render().refresh();
  fixture.pending.shift().resolve({ isMember: false });
  await revoke;
  assert.equal(hasMemberPracticeAccess(fixture.render()), false);
  const retry = fixture.render().refresh();
  assert.equal(fixture.render().loading, true);
  assert.equal(hasMemberPracticeAccess(fixture.render()), false);
  fixture.pending.shift().resolve({ isMember: false });
  await retry;
});

test('failed checks revoke access and session changes cannot reuse or restore an old grant', async () => {
  const fixture = membershipHookFixture();
  const first = fixture.render().refresh();
  fixture.pending.shift().resolve({ isMember: true });
  await first;
  const failing = fixture.render().refresh();
  fixture.pending.shift().reject(new Error('network unavailable'));
  await failing;
  assert.equal(hasMemberPracticeAccess(fixture.render()), false);
  assert.match(fixture.render().error, /network unavailable/);
  const retry = fixture.render().refresh();
  assert.equal(fixture.render().loading, true);
  fixture.pending.shift().resolve({ isMember: true });
  await retry;
  const oldCheck = fixture.render().refresh();
  const oldRequest = fixture.pending.shift();
  fixture.account.config = { ...fixture.account.config, token: 'session-two' };
  assert.equal(hasMemberPracticeAccess(fixture.render()), false);
  assert.equal(fixture.render().loading, true);
  oldRequest.resolve({ isMember: true });
  await oldCheck;
  assert.equal(hasMemberPracticeAccess(fixture.render()), false);
  const newCheck = fixture.render().refresh();
  fixture.pending.shift().resolve({ isMember: false });
  await newCheck;
  assert.equal(hasMemberPracticeAccess(fixture.render()), false);
});
