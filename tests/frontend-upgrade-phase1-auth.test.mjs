import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PHASE1_AUTH_REQUIRED_SOURCES,
  PHASE1_AUTH_CLEANUP_CHANNEL,
  buildPhase1AuthLiveSummary,
  collectPhase1AuthOfflineEvidence,
  phase1AuthBrowserLaunchOptions,
  runPhase1AuthLiveProbe,
  validatePhase1AuthSources,
} from "../scripts/check-frontend-upgrade-phase1-auth.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const loadSources = async () => Object.fromEntries(await Promise.all(
  Object.entries(PHASE1_AUTH_REQUIRED_SOURCES).map(async ([key, relativePath]) => (
    [key, await readFile(path.join(root, relativePath), "utf8")]
  )),
));

test("checked-in auth boundaries satisfy the offline Phase 1 gate", async () => {
  const result = await collectPhase1AuthOfflineEvidence(root);
  assert.deepEqual(result.failures, []);
  assert.equal(result.summary.status, "pass");
  assert.deepEqual(Object.values(result.summary.checks), [true, true, true, true, true, true]);
});

test("auth source validation rejects cookie, persistence, OAuth, and OpenAPI regressions", async () => {
  const sources = await loadSources();
  assert.deepEqual(validatePhase1AuthSources(sources), []);

  assert.match(validatePhase1AuthSources({
    ...sources,
    authRouter: `${sources.authRouter}\nresponse.set_cookie(domain="example.invalid")`,
  }).join("\n"), /Domain/u);
  assert.match(validatePhase1AuthSources({
    ...sources,
    client: `${sources.client}\nlocalStorage.setItem("session", "bad");`,
  }).join("\n"), /persist authentication/u);
  assert.match(validatePhase1AuthSources({
    ...sources,
    googleFlow: `${sources.googleFlow}\nconst tokeninfo = true`,
  }).join("\n"), /tokeninfo/u);
  assert.match(validatePhase1AuthSources({
    ...sources,
    googleFlow: sources.googleFlow.replace(
      "claimed = await self._challenge_store.claim_and_delete_verifier(",
      "claim_removed = await self._challenge_store.removed(",
    ),
  }).join("\n"), /claim once before controlled provider failure/u);
  const openapi = JSON.parse(sources.openapi);
  delete openapi.paths["/api/v2/auth/logout"];
  assert.match(validatePhase1AuthSources({
    ...sources,
    openapi: JSON.stringify(openapi),
  }).join("\n"), /OpenAPI is missing.*logout/u);
});

test("auth browser launch only accepts the explicit system Chrome switch", () => {
  assert.throws(
    () => phase1AuthBrowserLaunchOptions({}),
    /requires PLAYWRIGHT_USE_SYSTEM_CHROME=1/u,
  );
  assert.deepEqual(
    phase1AuthBrowserLaunchOptions({ PLAYWRIGHT_USE_SYSTEM_CHROME: "1" }),
    { headless: true, channel: "chrome" },
  );
  for (const value of ["0", "true", "msedge", "chrome-beta"]) {
    assert.throws(
      () => phase1AuthBrowserLaunchOptions({
        PLAYWRIGHT_CHANNEL: "msedge",
        PLAYWRIGHT_USE_SYSTEM_CHROME: value,
      }),
      /requires PLAYWRIGHT_USE_SYSTEM_CHROME=1/u,
    );
  }
});

const jsonResponse = (status, value, setCookies = [], extraHeaders = {}) => {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(value), { status, headers });
};

test("live auth probe verifies CSRF, rotation, origin, logout, OAuth replay, and storage", async () => {
  const preAuth = "p".repeat(43);
  const session = "s".repeat(43);
  const sessionCsrf = "c".repeat(43);
  const oauthBinding = "b".repeat(43);
  const oauthState = "o".repeat(86);
  const calls = [];
  let authenticated = false;
  let loggedOut = false;
  let callbackCount = 0;
  const cleanupTargets = [];
  const csrfSigningSecret = "phase1-test-csrf-signing-secret-32-bytes";

  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input);
    const headers = new Headers(init.headers);
    const record = {
      pathname: `${url.pathname}${url.search}`,
      method: init.method ?? "GET",
      origin: headers.get("origin"),
      csrf: headers.get("x-csrf-token"),
      cookie: headers.get("cookie"),
    };
    calls.push(record);

    if (url.pathname === "/api/v2/auth/csrf") {
      return jsonResponse(200, { csrfToken: preAuth }, [
        `__Host-qg_csrf=${preAuth}; Path=/; Secure; SameSite=Lax; Max-Age=600`,
      ]);
    }
    if (url.pathname === "/api/v2/auth/register" && headers.get("origin") !== url.origin) {
      return jsonResponse(403, { error: { code: "CSRF_ORIGIN_INVALID" } });
    }
    if (url.pathname === "/api/v2/auth/register") {
      assert.equal(headers.get("x-csrf-token"), preAuth);
      assert.match(headers.get("cookie") ?? "", new RegExp(`__Host-qg_csrf=${preAuth}`, "u"));
      authenticated = true;
      return jsonResponse(201, { user: { id: "redacted" } }, [
        `__Host-qg_session=${session}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800`,
        `__Host-qg_csrf=${sessionCsrf}; Path=/; Secure; SameSite=Lax; Max-Age=604800`,
      ]);
    }
    if (url.pathname === "/api/v2/me") {
      if (authenticated && !loggedOut) return jsonResponse(200, { id: "redacted" });
      assert.match(
        headers.get("cookie") ?? "",
        new RegExp(`(?:^|; )__Host-qg_session=${session}(?:;|$)`, "u"),
      );
      return jsonResponse(401, { error: { code: "AUTH_SESSION_REQUIRED" } });
    }
    if (url.pathname === "/api/v2/auth/logout") {
      if (
        headers.get("origin") !== url.origin
        || headers.get("x-csrf-token") !== sessionCsrf
      ) {
        return jsonResponse(403, { error: { code: "CSRF_PROOF_INVALID" } });
      }
      loggedOut = true;
      return jsonResponse(200, { status: "ok" }, [
        "__Host-qg_session=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0",
        "__Host-qg_csrf=; Path=/; Secure; SameSite=Lax; Max-Age=0",
      ]);
    }
    if (url.pathname === "/api/v2/auth/google/start") {
      const location = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      location.searchParams.set("state", oauthState);
      location.searchParams.set("nonce", "n".repeat(43));
      location.searchParams.set("code_challenge", "k".repeat(43));
      location.searchParams.set("code_challenge_method", "S256");
      return new Response(null, {
        status: 302,
        headers: {
          location: location.href,
          "set-cookie": (
            `__Host-qg_csrf=${oauthBinding}; Path=/; Secure; SameSite=Lax; Max-Age=600`
          ),
        },
      });
    }
    if (url.pathname === "/api/v2/auth/google/callback") {
      assert.match(
        headers.get("cookie") ?? "",
        new RegExp(`(?:^|; )__Host-qg_csrf=${oauthBinding}(?:;|$)`, "u"),
      );
      assert.equal(url.searchParams.get("error"), "access_denied");
      assert.equal(url.searchParams.get("state"), oauthState);
      callbackCount += 1;
      const requestId = `req_${String(callbackCount).padStart(32, "0")}`;
      return jsonResponse(400, {
        code: "GOOGLE_OAUTH_FAILED",
        message: "Google 登录未能完成",
        fieldErrors: {},
        requestId,
        retryable: false,
      }, [], {
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "x-request-id": requestId,
      });
    }
    throw new Error(`unexpected request ${url.href}`);
  };

  const summary = await runPhase1AuthLiveProbe({
    baseOrigin: "https://quantgym-v2-preview.pages.dev",
    env: { PLAYWRIGHT_USE_SYSTEM_CHROME: "1" },
    fetchImpl,
    randomBytes: () => Buffer.from("0123456789abcdef"),
    browserStorageProbe: async ({ cookies }) => {
      assert.equal(cookies.length, 2);
      assert.equal(cookies.find(({ name }) => name === "__Host-qg_session")?.httpOnly, true);
      return {
        localStorageEntryCount: 1,
        sessionStorageEntryCount: 0,
        indexedDbRecordCount: 0,
        sensitiveEntryCount: 0,
      };
    },
    csrfSigningSecret,
    [PHASE1_AUTH_CLEANUP_CHANNEL]: (target) => {
      cleanupTargets.push(target);
    },
  });

  assert.equal(summary.status, "pass");
  assert.deepEqual(Object.values(summary.checks), [
    true, true, true, true, true, true, true, true,
  ]);
  assert.equal(summary.syntheticDataCount, 1);
  assert.match(summary.syntheticDataFingerprint, /^[0-9a-f]{64}$/u);
  assert.equal(callbackCount, 2);
  assert.equal(calls.filter(({ pathname }) => pathname === "/api/v2/me").length, 2);
  assert.equal(calls.filter(({ pathname }) => pathname === "/api/v2/auth/logout").length, 3);
  const preAuthTokenHash = createHmac(
    "sha256",
    Buffer.from(csrfSigningSecret, "utf8"),
  )
    .update(Buffer.from("quantgym:v2:csrf:pre-auth:v1", "ascii"))
    .update(Buffer.from([0, 0]))
    .update(preAuth, "ascii")
    .digest("hex");
  const oauthTokenHash = createHash("sha256").update(oauthState).digest("hex");
  assert.deepEqual(cleanupTargets, [
    { kind: "pre_auth_csrf", tokenHash: preAuthTokenHash, expectedConsumed: true },
    { kind: "google_oauth", tokenHash: oauthTokenHash, expectedConsumed: true },
  ]);
  const renderedSummary = JSON.stringify(summary);
  assert.equal(renderedSummary.includes(preAuthTokenHash), false);
  assert.equal(renderedSummary.includes(oauthTokenHash), false);
});

test("live auth probe fails closed before network access without system Chrome", async () => {
  await assert.rejects(
    runPhase1AuthLiveProbe({
      baseOrigin: "https://quantgym-v2-preview.pages.dev",
      env: {},
      fetchImpl: async () => {
        throw new Error("must not be called");
      },
      browserStorageProbe: async () => {
        throw new Error("must not be called");
      },
    }),
    /requires PLAYWRIGHT_USE_SYSTEM_CHROME=1/u,
  );
});

test("live auth probe fails closed on browser persistence of auth material", async () => {
  await assert.rejects(
    runPhase1AuthLiveProbe({
      baseOrigin: "https://unapproved.example.invalid",
      fetchImpl: async () => {
        throw new Error("must not be called");
      },
      browserStorageProbe: async () => ({
        localStorageEntryCount: 1,
        sessionStorageEntryCount: 0,
        indexedDbRecordCount: 0,
        sensitiveEntryCount: 1,
      }),
    }),
    /Preview origin is invalid/u,
  );
});

test("cleanup channel receives an exact digest before a later auth assertion fails", async () => {
  const createdToken = "z".repeat(43);
  const targets = [];
  await assert.rejects(
    runPhase1AuthLiveProbe({
      baseOrigin: "https://quantgym-v2-preview.pages.dev",
      env: { PLAYWRIGHT_USE_SYSTEM_CHROME: "1" },
      csrfSigningSecret: "phase1-test-csrf-signing-secret-32-bytes",
      fetchImpl: async () => jsonResponse(
        200,
        { csrfToken: createdToken },
        [`__Host-qg_csrf=${"y".repeat(43)}; Path=/; Secure; SameSite=Lax`],
      ),
      browserStorageProbe: async () => {
        throw new Error("must not be called");
      },
      [PHASE1_AUTH_CLEANUP_CHANNEL]: (target) => {
        targets.push(target);
      },
    }),
    /not paired/u,
  );
  assert.equal(targets.length, 1);
  assert.equal(targets[0].kind, "pre_auth_csrf");
  assert.match(targets[0].tokenHash, /^[0-9a-f]{64}$/u);
});

test("live auth evidence uses the strict aggregate envelope", () => {
  const summary = buildPhase1AuthLiveSummary({
    live: {
      checks: {
        hostCookiePolicy: true,
        csrfPairing: true,
        exactOriginEnforced: true,
        sessionAndCsrfRotated: true,
        logoutRevokedSession: true,
        oauthPkceS256: true,
        oauthReplayRejected: true,
        browserStorageSafe: true,
      },
      browserStorage: {
        localStorageEntryCount: 2,
        sessionStorageEntryCount: 0,
        indexedDbRecordCount: 0,
        sensitiveEntryCount: 0,
      },
      syntheticDataCount: 1,
      syntheticDataFingerprint: "a".repeat(64),
      cleanupRequired: true,
    },
    checkedAt: new Date("2026-07-23T00:00:00.000Z"),
    commit: "b".repeat(40),
    evidenceSha256: "c".repeat(64),
  });
  assert.deepEqual(Object.keys(summary).sort(), [
    "check",
    "checkedAt",
    "checks",
    "commit",
    "counts",
    "evidenceSha256",
    "failureCodes",
    "hashes",
    "schemaVersion",
    "status",
  ]);
  assert.equal(summary.counts.syntheticUsersCreated, 1);
  assert.equal(summary.checks.syntheticCleanupRequired, true);
});
