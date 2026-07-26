import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  phase1AuditCredentialsAreValid,
  writeFileAtomicallyWithinTrustedRoot,
} from "./lib/frontend-upgrade-phase1-contracts.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-auth-security-summary.json"
);
const PREVIEW_HOST = "quantgym-v2-preview.pages.dev";
const PREVIEW_ORIGIN = `https://${PREVIEW_HOST}`;
const MAX_RESPONSE_BYTES = 64 * 1024;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const PRE_AUTH_CSRF_DOMAIN = Buffer.from("quantgym:v2:csrf:pre-auth:v1", "ascii");
const API_ERROR_KEYS = Object.freeze([
  "code",
  "fieldErrors",
  "message",
  "requestId",
  "retryable",
]);

export const PHASE1_AUTH_CLEANUP_CHANNEL = Symbol(
  "frontend-upgrade-phase1-auth-cleanup-channel",
);

export const PHASE1_AUTH_REQUIRED_SOURCES = Object.freeze({
  authRouter: "api/app/auth/router.py",
  authService: "api/app/auth/service.py",
  authDependencies: "api/app/auth/dependencies.py",
  googleFlow: "api/app/auth/google.py",
  googleStore: "api/app/auth/google_store.py",
  client: "src/shared/api/client.ts",
  csrf: "src/shared/api/csrf.ts",
  shell: "src/core/router/AuthenticatedPlatformShell.tsx",
  authE2e: "tests/e2e-v2/auth.spec.ts",
  platformE2e: "tests/e2e-v2/platform-surfaces.spec.ts",
  openapi: "api/openapi.json",
});

const AUTH_PATHS = Object.freeze([
  "/api/v2/auth/csrf",
  "/api/v2/auth/register",
  "/api/v2/auth/login",
  "/api/v2/auth/logout",
  "/api/v2/auth/password/forgot",
  "/api/v2/auth/password/reset",
  "/api/v2/auth/google/start",
  "/api/v2/auth/google/callback",
  "/api/v2/me",
]);

const isObject = (value) => (
  value !== null && typeof value === "object" && !Array.isArray(value)
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preAuthCsrfDigest = (token, signingSecret) => {
  if (
    typeof token !== "string"
    || !/^[A-Za-z0-9_-]{43}$/u.test(token)
    || typeof signingSecret !== "string"
  ) {
    throw new Error("Phase 1 cleanup binding is invalid");
  }
  let key;
  try {
    key = Buffer.from(signingSecret, "utf8");
  } catch {
    throw new Error("Phase 1 cleanup binding is invalid");
  }
  if (key.byteLength < 32) throw new Error("Phase 1 cleanup binding is invalid");
  return createHmac("sha256", key)
    .update(PRE_AUTH_CSRF_DOMAIN)
    .update(Buffer.from([0, 0]))
    .update(token, "ascii")
    .digest("hex");
};
const cleanupChannelFor = (options) => {
  const channel = options[PHASE1_AUTH_CLEANUP_CHANNEL];
  if (channel !== undefined && typeof channel !== "function") {
    throw new Error("Phase 1 cleanup channel is invalid");
  }
  return channel;
};
const publishCleanupTarget = (channel, target) => {
  if (!channel) return;
  const result = channel(Object.freeze({ ...target }));
  if (result !== undefined) {
    throw new Error("Phase 1 cleanup channel is invalid");
  }
};
const unique = (values) => [...new Set(values)];
const exactObjectKeys = (value, expected) => (
  isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
);
const requirePreviewOrigin = (value) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Preview origin is invalid");
  }
  if (
    parsed.origin !== PREVIEW_ORIGIN
    || parsed.href !== `${PREVIEW_ORIGIN}/`
    || parsed.username
    || parsed.password
  ) {
    throw new Error("Preview origin is invalid");
  }
  return parsed.origin;
};

const securelyReadSource = async (root, relativePath) => {
  const absolute = path.join(root, relativePath);
  const [rootRealPath, stats] = await Promise.all([realpath(root), lstat(absolute)]);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${relativePath}: required source must be a regular file`);
  }
  const resolved = await realpath(absolute);
  const relative = path.relative(rootRealPath, resolved);
  if (
    relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error(`${relativePath}: required source resolves outside the repository`);
  }
  return readFile(resolved, "utf8");
};

const includesAll = (source, fragments, label, failures) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) failures.push(`${label} is missing ${fragment}`);
  }
};

const validateOpenApi = (document, failures) => {
  if (!isObject(document) || !isObject(document.paths)) {
    failures.push("OpenAPI document is invalid");
    return;
  }
  for (const pathName of AUTH_PATHS) {
    if (!isObject(document.paths[pathName])) failures.push(`OpenAPI is missing ${pathName}`);
  }
  const schemes = document.components?.securitySchemes;
  if (
    !isObject(schemes)
    || schemes.SessionCookie?.type !== "apiKey"
    || schemes.SessionCookie?.in !== "cookie"
    || schemes.SessionCookie?.name !== "__Host-qg_session"
  ) {
    failures.push("OpenAPI session-cookie scheme is invalid");
  }
  if (
    !isObject(schemes)
    || schemes.SessionCsrf?.type !== "apiKey"
    || schemes.SessionCsrf?.in !== "header"
    || schemes.SessionCsrf?.name !== "X-CSRF-Token"
  ) {
    failures.push("OpenAPI CSRF scheme is invalid");
  }
  if (Object.values(schemes ?? {}).some((scheme) => (
    scheme?.type === "http" && String(scheme?.scheme ?? "").toLowerCase() === "bearer"
  ))) {
    failures.push("OpenAPI must not expose bearer authentication");
  }
};

export function validatePhase1AuthSources(sources = {}) {
  const failures = [];
  const requiredKeys = Object.keys(PHASE1_AUTH_REQUIRED_SOURCES);
  for (const key of requiredKeys) {
    if (typeof sources[key] !== "string" || sources[key].length === 0) {
      failures.push(`required auth source ${key} is unavailable`);
    }
  }
  if (failures.length > 0) return unique(failures);

  includesAll(sources.authRouter, [
    "httponly=True",
    "httponly=False",
    "secure=True",
    'samesite="lax"',
    'path="/"',
    "_clear_auth_cookies(response)",
    "_mark_oauth_redirect(response)",
  ], "auth cookie boundary", failures);
  if (/\bdomain\s*=/u.test(sources.authRouter)) {
    failures.push("auth cookies must not set a Domain attribute");
  }

  includesAll(sources.authDependencies, [
    'name="X-CSRF-Token"',
    "session_cookie_from_request",
    "csrf_proof_from_request",
    "require_session_csrf",
  ], "auth proof dependencies", failures);
  includesAll(sources.authService, [
    'SESSION_COOKIE_NAME = "__Host-qg_session"',
    'CSRF_COOKIE_NAME = "__Host-qg_csrf"',
    "existing_session_token",
    "revoke_token_hash",
    "validate_pre_auth_csrf",
    "validate_session_csrf",
    "revoked_at",
  ], "session rotation and revocation", failures);
  includesAll(sources.googleFlow, [
    "code_challenge_method",
    '"S256"',
    'algorithms=["RS256"]',
    'issuer=GOOGLE_ISSUER',
    "audience=self._client_id",
    '"nonce"',
    "claim_and_delete_verifier",
  ], "Google OAuth security", failures);
  includesAll(sources.googleStore, [
    "consumed_at IS NULL",
    "pkce_verifier_ciphertext = NULL",
    "pkce_key_id = NULL",
  ], "Google OAuth replay store", failures);
  const oauthClaimIndex = sources.googleFlow.indexOf(
    "claimed = await self._challenge_store.claim_and_delete_verifier(",
  );
  const oauthProviderErrorIndex = sources.googleFlow.indexOf(
    "if provider_error is not None:",
  );
  const oauthCodeValidationIndex = sources.googleFlow.indexOf(
    "if not _is_safe_text(code, minimum=1, maximum=4096):",
  );
  const oauthExchangeIndex = sources.googleFlow.indexOf(
    "id_token = await self._exchange_code(code=code, verifier=verifier)",
  );
  if (
    oauthClaimIndex < 0
    || oauthProviderErrorIndex <= oauthClaimIndex
    || oauthCodeValidationIndex <= oauthProviderErrorIndex
    || oauthExchangeIndex <= oauthCodeValidationIndex
  ) {
    failures.push(
      "Google OAuth callback must claim once before controlled provider failure",
    );
  }
  if (/tokeninfo/iu.test(`${sources.googleFlow}\n${sources.googleStore}`)) {
    failures.push("production Google OAuth must not use tokeninfo");
  }

  includesAll(sources.client, [
    'const API_BASE = "/api/v2"',
    'headers.delete("Authorization")',
    'headers.delete("Cookie")',
    'credentials: "include"',
    'cache: "no-store"',
    'redirect: "manual"',
  ], "browser API client", failures);
  includesAll(sources.csrf, [
    'const CSRF_COOKIE_NAME = "__Host-qg_csrf"',
    "let fallbackCsrfToken: string | null = null",
    "document.cookie",
  ], "browser CSRF boundary", failures);
  const persistenceForbidden = /\b(?:localStorage|sessionStorage|indexedDB)\b/u;
  for (const [label, source] of [
    ["browser API client", sources.client],
    ["browser CSRF helper", sources.csrf],
  ]) {
    if (persistenceForbidden.test(source)) {
      failures.push(`${label} must not persist authentication material`);
    }
  }

  includesAll(sources.shell, [
    "clearPreferenceSyncDrafts",
    "clearTodoDrafts",
    "logoutRequestRef",
    "finishLocalLogout",
  ], "logout browser cleanup", failures);
  includesAll(sources.authE2e, [
    "@e2e:auth-session-and-recovery",
    "@visual:auth:light-dark",
    "@a11y:auth",
  ], "auth browser gates", failures);
  includesAll(sources.platformE2e, [
    "@e2e:logout-session-boundary",
    "@e2e:logout-retry",
  ], "logout browser gates", failures);

  let openapi;
  try {
    openapi = JSON.parse(sources.openapi);
  } catch {
    failures.push("OpenAPI JSON is invalid");
  }
  if (openapi !== undefined) validateOpenApi(openapi, failures);
  return unique(failures).sort();
}

export async function collectPhase1AuthOfflineEvidence(root = defaultRoot) {
  const entries = await Promise.all(Object.entries(PHASE1_AUTH_REQUIRED_SOURCES).map(
    async ([key, relativePath]) => [key, await securelyReadSource(root, relativePath)],
  ));
  const sources = Object.fromEntries(entries);
  const failures = validatePhase1AuthSources(sources);
  return {
    failures,
    summary: {
      schemaVersion: 1,
      check: "frontend-upgrade-phase1-auth",
      status: failures.length === 0 ? "pass" : "fail",
      mode: "offline",
      checks: {
        cookieContract: failures.every((failure) => !failure.includes("cookie")),
        csrfAndOriginContract: failures.every((failure) => !failure.includes("proof")),
        sessionRotationAndLogoutContract: failures.every((failure) => (
          !failure.includes("rotation") && !failure.includes("logout")
        )),
        oauthReplayContract: failures.every((failure) => !failure.includes("OAuth")),
        browserStorageContract: failures.every((failure) => !failure.includes("persist")),
        openapiContract: failures.every((failure) => !failure.includes("OpenAPI")),
      },
      failureCount: failures.length,
    },
  };
}

const splitSetCookie = (headers) => {
  if (typeof headers?.getSetCookie === "function") return headers.getSetCookie();
  const combined = headers?.get?.("set-cookie") ?? "";
  if (!combined) return [];
  return combined
    .split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/u)
    .map((value) => value.trim())
    .filter(Boolean);
};

const parseSetCookie = (value) => {
  const parts = String(value).split(";").map((part) => part.trim()).filter(Boolean);
  const first = parts.shift() ?? "";
  const separator = first.indexOf("=");
  if (separator <= 0) throw new Error("Set-Cookie is invalid");
  const attributes = new Map();
  for (const part of parts) {
    const attributeSeparator = part.indexOf("=");
    const name = (
      attributeSeparator < 0 ? part : part.slice(0, attributeSeparator)
    ).trim().toLowerCase();
    const attributeValue = attributeSeparator < 0
      ? true
      : part.slice(attributeSeparator + 1).trim();
    if (!name || attributes.has(name)) throw new Error("Set-Cookie attributes are invalid");
    attributes.set(name, attributeValue);
  }
  return {
    name: first.slice(0, separator),
    value: first.slice(separator + 1),
    attributes,
    raw: value,
  };
};

const assertHostCookie = (cookie, { httpOnly }) => {
  if (
    !cookie.name.startsWith("__Host-")
    || cookie.attributes.has("domain")
    || cookie.attributes.get("path") !== "/"
    || cookie.attributes.get("secure") !== true
    || String(cookie.attributes.get("samesite") ?? "").toLowerCase() !== "lax"
    || cookie.attributes.has("httponly") !== httpOnly
  ) {
    throw new Error("authentication cookie policy is invalid");
  }
};

const responseText = async (response, label) => {
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^\d+$/u.test(declared) || Number(declared) > MAX_RESPONSE_BYTES)) {
    throw new Error(`${label} response is too large`);
  }
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) {
    throw new Error(`${label} response is too large`);
  }
  return text;
};

const responseJson = async (response, label) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^application\/json(?:;|$)/iu.test(contentType)) {
    throw new Error(`${label} response is not JSON`);
  }
  try {
    return JSON.parse(await responseText(response, label));
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("response is too large")) throw error;
    throw new Error(`${label} response JSON is invalid`);
  }
};

const cookieHeader = (jar) => [...jar.entries()]
  .filter(([, value]) => value.length > 0)
  .map(([name, value]) => `${name}=${value}`)
  .join("; ");

const applySetCookies = (response, jar) => splitSetCookie(response.headers).map(parseSetCookie)
  .map((cookie) => {
    const maximumAge = String(cookie.attributes.get("max-age") ?? "");
    if (cookie.value === "" || maximumAge === "0") jar.delete(cookie.name);
    else jar.set(cookie.name, cookie.value);
    return cookie;
  });

const authRequest = async ({
  baseOrigin,
  body,
  fetchImpl,
  jar,
  label,
  method = "GET",
  origin,
  pathname,
  csrfProof,
}) => {
  const headers = new Headers({ accept: "application/json", "cache-control": "no-store" });
  const cookies = cookieHeader(jar);
  if (cookies) headers.set("cookie", cookies);
  if (origin) headers.set("origin", origin);
  if (csrfProof) headers.set("x-csrf-token", csrfProof);
  let serializedBody;
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    serializedBody = JSON.stringify(body);
  }
  const response = await fetchImpl(`${baseOrigin}${pathname}`, {
    method,
    headers,
    body: serializedBody,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const cookiesSet = applySetCookies(response, jar);
  return { response, cookiesSet, label };
};

const requireStatus = (result, expected) => {
  if (result.response.status !== expected) {
    throw new Error(`${result.label} returned an unexpected status`);
  }
};

const requireApiErrorCode = async (result, expectedCode) => {
  const body = await responseJson(result.response, result.label);
  if (
    !exactObjectKeys(body, API_ERROR_KEYS)
    || body.code !== expectedCode
    || typeof body.message !== "string"
    || body.message.length === 0
    || !isObject(body.fieldErrors)
    || !/^req_[0-9a-f]{32}$/u.test(body.requestId)
    || body.retryable !== false
    || result.response.headers.get("x-request-id") !== body.requestId
    || result.response.headers.get("cache-control") !== "no-store"
  ) {
    throw new Error(`${result.label} error envelope is invalid`);
  }
};

export const phase1AuthBrowserLaunchOptions = (environment = process.env) => {
  if (environment?.PLAYWRIGHT_USE_SYSTEM_CHROME !== "1") {
    throw new Error(
      "Phase 1 live auth evidence requires PLAYWRIGHT_USE_SYSTEM_CHROME=1",
    );
  }
  return { headless: true, channel: "chrome" };
};

export const browserStorageEvidenceContainsAuthenticationMaterial = (evidence) => (
  /(?:bearer|access.?token|session|csrf|oauth|email|"user")/iu.test(JSON.stringify([
    Object.entries(evidence.local),
    Object.entries(evidence.session),
    evidence.indexedRecords,
  ]))
);

const defaultBrowserStorageProbe = async ({ baseOrigin, cookies, environment }) => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(phase1AuthBrowserLaunchOptions(environment));
  try {
    const context = await browser.newContext();
    await context.addCookies(cookies.map((cookie) => ({
      ...cookie,
      domain: PREVIEW_HOST,
      path: "/",
      secure: true,
      sameSite: "Lax",
    })));
    const page = await context.newPage();
    const failures = [];
    page.on("pageerror", () => failures.push("pageerror"));
    await page.goto(baseOrigin, { waitUntil: "networkidle" });
    const evidence = await page.evaluate(async () => {
      const local = Object.fromEntries(Object.keys(localStorage).map((key) => (
        [key, localStorage.getItem(key)]
      )));
      const session = Object.fromEntries(Object.keys(sessionStorage).map((key) => (
        [key, sessionStorage.getItem(key)]
      )));
      const databases = typeof indexedDB.databases === "function"
        ? await indexedDB.databases()
        : [];
      const indexedRecords = [];
      for (const databaseInfo of databases) {
        if (!databaseInfo.name) continue;
        const database = await new Promise((resolve, reject) => {
          const request = indexedDB.open(databaseInfo.name);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
        try {
          for (const storeName of database.objectStoreNames) {
            const records = await new Promise((resolve, reject) => {
              const transaction = database.transaction(storeName, "readonly");
              const request = transaction.objectStore(storeName).getAll();
              request.onerror = () => reject(request.error);
              request.onsuccess = () => resolve(request.result);
            });
            indexedRecords.push({ database: databaseInfo.name, storeName, records });
          }
        } finally {
          database.close();
        }
      }
      return { local, session, indexedRecords };
    });
    if (browserStorageEvidenceContainsAuthenticationMaterial(evidence)) {
      failures.push("sensitive-browser-storage");
    }
    return {
      localStorageEntryCount: Object.keys(evidence.local).length,
      sessionStorageEntryCount: Object.keys(evidence.session).length,
      indexedDbRecordCount: evidence.indexedRecords.reduce(
        (count, store) => count + store.records.length,
        0,
      ),
      sensitiveEntryCount: failures.length,
    };
  } finally {
    await browser.close();
  }
};

export async function runPhase1AuthLiveProbe(options = {}) {
  const baseOrigin = requirePreviewOrigin(options.baseOrigin ?? process.env.QUANTGYM_PHASE1_PREVIEW_URL);
  const fetchImpl = options.fetchImpl ?? fetch;
  const browserStorageProbe = options.browserStorageProbe ?? defaultBrowserStorageProbe;
  const environment = options.env ?? process.env;
  phase1AuthBrowserLaunchOptions(environment);
  const cleanupChannel = cleanupChannelFor(options);
  const csrfSigningSecret = (
    options.csrfSigningSecret
    ?? process.env.QUANTGYM_V2_CSRF_SIGNING_SECRET
  );
  if (cleanupChannel) {
    preAuthCsrfDigest("a".repeat(43), csrfSigningSecret);
  }
  const jar = new Map();

  const issued = await authRequest({
    baseOrigin,
    fetchImpl,
    jar,
    label: "CSRF issue",
    pathname: "/api/v2/auth/csrf",
  });
  requireStatus(issued, 200);
  const issuedBody = await responseJson(issued.response, issued.label);
  const preAuthCookie = issued.cookiesSet.find((cookie) => cookie.name === "__Host-qg_csrf");
  const cleanupCsrfToken = (
    typeof issuedBody?.csrfToken === "string"
    && /^[A-Za-z0-9_-]{43}$/u.test(issuedBody.csrfToken)
  )
    ? issuedBody.csrfToken
    : preAuthCookie?.value;
  if (
    cleanupChannel
    && typeof cleanupCsrfToken === "string"
    && /^[A-Za-z0-9_-]{43}$/u.test(cleanupCsrfToken)
  ) {
    publishCleanupTarget(cleanupChannel, {
      kind: "pre_auth_csrf",
      tokenHash: preAuthCsrfDigest(cleanupCsrfToken, csrfSigningSecret),
      expectedConsumed: true,
    });
  }
  if (!preAuthCookie || issuedBody?.csrfToken !== preAuthCookie.value) {
    throw new Error("pre-auth CSRF cookie and response are not paired");
  }
  assertHostCookie(preAuthCookie, { httpOnly: false });

  const auditNonce = (options.randomBytes ?? randomBytes)(16).toString("hex");
  const suppliedCredentials = options.auditCredentials ?? (
    process.env.QUANTGYM_PHASE1_AUTH_AUDIT_EMAIL
      || process.env.QUANTGYM_PHASE1_AUTH_AUDIT_PASSWORD
      ? {
          email: process.env.QUANTGYM_PHASE1_AUTH_AUDIT_EMAIL,
          password: process.env.QUANTGYM_PHASE1_AUTH_AUDIT_PASSWORD,
        }
      : null
  );
  if (
    suppliedCredentials !== null
    && !phase1AuditCredentialsAreValid(suppliedCredentials)
  ) {
    throw new Error("audit credentials are invalid");
  }
  const registrationBody = {
    email: suppliedCredentials?.email ?? `phase1-audit-${auditNonce}@example.com`,
    password: suppliedCredentials?.password ?? `Qg!${auditNonce}aZ9`,
    displayName: "Phase 1 audit",
  };
  const wrongOrigin = await authRequest({
    baseOrigin,
    body: registrationBody,
    csrfProof: preAuthCookie.value,
    fetchImpl,
    jar,
    label: "cross-origin registration",
    method: "POST",
    origin: "https://unrelated.invalid",
    pathname: "/api/v2/auth/register",
  });
  requireStatus(wrongOrigin, 403);
  await requireApiErrorCode(wrongOrigin, "CSRF_ORIGIN_INVALID");

  const registered = await authRequest({
    baseOrigin,
    body: registrationBody,
    csrfProof: preAuthCookie.value,
    fetchImpl,
    jar,
    label: "same-origin registration",
    method: "POST",
    origin: baseOrigin,
    pathname: "/api/v2/auth/register",
  });
  requireStatus(registered, 201);
  await responseJson(registered.response, registered.label);
  const sessionCookie = registered.cookiesSet.find(
    (cookie) => cookie.name === "__Host-qg_session",
  );
  const sessionCsrfCookie = registered.cookiesSet.find(
    (cookie) => cookie.name === "__Host-qg_csrf",
  );
  if (
    !sessionCookie
    || !sessionCsrfCookie
    || sessionCsrfCookie.value === preAuthCookie.value
    || !sessionCookie.value
  ) {
    throw new Error("registration did not rotate session and CSRF cookies");
  }
  assertHostCookie(sessionCookie, { httpOnly: true });
  assertHostCookie(sessionCsrfCookie, { httpOnly: false });

  const browserStorage = await browserStorageProbe({
    baseOrigin,
    environment,
    cookies: [
      { name: sessionCookie.name, value: sessionCookie.value, httpOnly: true },
      { name: sessionCsrfCookie.name, value: sessionCsrfCookie.value, httpOnly: false },
    ],
  });
  if (
    !isObject(browserStorage)
    || browserStorage.sensitiveEntryCount !== 0
    || !Number.isInteger(browserStorage.localStorageEntryCount)
    || !Number.isInteger(browserStorage.sessionStorageEntryCount)
    || !Number.isInteger(browserStorage.indexedDbRecordCount)
  ) {
    throw new Error("browser storage contains authentication material");
  }

  const meBefore = await authRequest({
    baseOrigin,
    fetchImpl,
    jar,
    label: "authenticated me",
    pathname: "/api/v2/me",
  });
  requireStatus(meBefore, 200);
  await responseJson(meBefore.response, meBefore.label);
  const revokedSessionJar = new Map([
    ["__Host-qg_session", sessionCookie.value],
  ]);

  const missingCsrfLogout = await authRequest({
    baseOrigin,
    fetchImpl,
    jar,
    label: "logout without CSRF",
    method: "POST",
    origin: baseOrigin,
    pathname: "/api/v2/auth/logout",
  });
  requireStatus(missingCsrfLogout, 403);
  await requireApiErrorCode(missingCsrfLogout, "CSRF_PROOF_MISSING");
  const wrongOriginLogout = await authRequest({
    baseOrigin,
    csrfProof: sessionCsrfCookie.value,
    fetchImpl,
    jar,
    label: "cross-origin logout",
    method: "POST",
    origin: "https://unrelated.invalid",
    pathname: "/api/v2/auth/logout",
  });
  requireStatus(wrongOriginLogout, 403);
  await requireApiErrorCode(wrongOriginLogout, "CSRF_ORIGIN_INVALID");

  const loggedOut = await authRequest({
    baseOrigin,
    csrfProof: sessionCsrfCookie.value,
    fetchImpl,
    jar,
    label: "same-origin logout",
    method: "POST",
    origin: baseOrigin,
    pathname: "/api/v2/auth/logout",
  });
  requireStatus(loggedOut, 200);
  await responseJson(loggedOut.response, loggedOut.label);
  const clearedNames = new Set(loggedOut.cookiesSet.filter((cookie) => (
    cookie.value === "" || String(cookie.attributes.get("max-age") ?? "") === "0"
  )).map((cookie) => cookie.name));
  if (!clearedNames.has("__Host-qg_session") || !clearedNames.has("__Host-qg_csrf")) {
    throw new Error("logout did not clear both authentication cookies");
  }
  const meAfter = await authRequest({
    baseOrigin,
    fetchImpl,
    jar: revokedSessionJar,
    label: "revoked me",
    pathname: "/api/v2/me",
  });
  requireStatus(meAfter, 401);

  const oauthStart = await authRequest({
    baseOrigin,
    fetchImpl,
    jar,
    label: "Google OAuth start",
    pathname: "/api/v2/auth/google/start?redirectPath=%2F",
  });
  requireStatus(oauthStart, 302);
  const oauthBindingCookie = oauthStart.cookiesSet.find(
    (cookie) => cookie.name === "__Host-qg_csrf",
  );
  if (
    !oauthBindingCookie
    || !/^[A-Za-z0-9_-]{43}$/u.test(oauthBindingCookie.value)
  ) {
    throw new Error("Google OAuth browser binding cookie is missing");
  }
  assertHostCookie(oauthBindingCookie, { httpOnly: false });
  const location = oauthStart.response.headers.get("location");
  let authorization;
  try {
    authorization = new URL(location);
  } catch {
    throw new Error("Google OAuth authorization redirect is invalid");
  }
  const oauthState = authorization.searchParams.get("state");
  if (cleanupChannel && typeof oauthState === "string" && oauthState.length > 0) {
    publishCleanupTarget(cleanupChannel, {
      kind: "google_oauth",
      tokenHash: sha256(oauthState),
      expectedConsumed: true,
    });
  }
  if (
    authorization.origin !== "https://accounts.google.com"
    || authorization.pathname !== "/o/oauth2/v2/auth"
    || authorization.searchParams.get("code_challenge_method") !== "S256"
    || !/^[A-Za-z0-9_-]{86}$/u.test(authorization.searchParams.get("state") ?? "")
    || !/^[A-Za-z0-9_-]{43}$/u.test(authorization.searchParams.get("nonce") ?? "")
    || !/^[A-Za-z0-9_-]{43}$/u.test(
      authorization.searchParams.get("code_challenge") ?? "",
    )
  ) {
    throw new Error("Google OAuth authorization redirect is invalid");
  }
  const callbackPath = (
    "/api/v2/auth/google/callback?error=access_denied&state="
    + encodeURIComponent(authorization.searchParams.get("state"))
  );
  const oauthCancelled = await authRequest({
    baseOrigin,
    fetchImpl,
    jar,
    label: "Google OAuth cancellation",
    pathname: callbackPath,
  });
  requireStatus(oauthCancelled, 400);
  const oauthCancelledBody = await responseJson(
    oauthCancelled.response,
    oauthCancelled.label,
  );
  if (
    !exactObjectKeys(oauthCancelledBody, API_ERROR_KEYS)
    || oauthCancelledBody.code !== "GOOGLE_OAUTH_FAILED"
    || oauthCancelledBody.retryable !== false
    || !isObject(oauthCancelledBody.fieldErrors)
    || Object.keys(oauthCancelledBody.fieldErrors).length !== 0
    || typeof oauthCancelledBody.message !== "string"
    || oauthCancelledBody.message.length === 0
    || !/^req_[0-9a-f]{32}$/u.test(oauthCancelledBody.requestId)
    || oauthCancelled.response.headers.get("x-request-id")
      !== oauthCancelledBody.requestId
    || oauthCancelled.response.headers.get("cache-control") !== "no-store"
    || oauthCancelled.response.headers.get("referrer-policy") !== "no-referrer"
  ) {
    throw new Error("Google OAuth controlled failure envelope is invalid");
  }
  const oauthReplay = await authRequest({
    baseOrigin,
    fetchImpl,
    jar,
    label: "Google OAuth replay",
    pathname: callbackPath,
  });
  requireStatus(oauthReplay, 400);
  const oauthReplayBody = await responseJson(oauthReplay.response, oauthReplay.label);
  if (
    !exactObjectKeys(oauthReplayBody, API_ERROR_KEYS)
    || oauthReplayBody.code !== "GOOGLE_OAUTH_FAILED"
    || oauthReplayBody.retryable !== false
    || !isObject(oauthReplayBody.fieldErrors)
    || Object.keys(oauthReplayBody.fieldErrors).length !== 0
    || typeof oauthReplayBody.message !== "string"
    || oauthReplayBody.message.length === 0
    || !/^req_[0-9a-f]{32}$/u.test(oauthReplayBody.requestId)
    || oauthReplay.response.headers.get("x-request-id") !== oauthReplayBody.requestId
    || oauthReplayBody.requestId === oauthCancelledBody.requestId
    || oauthReplay.response.headers.get("cache-control") !== "no-store"
    || oauthReplay.response.headers.get("referrer-policy") !== "no-referrer"
  ) {
    throw new Error("Google OAuth replay failure envelope is invalid");
  }

  return {
    schemaVersion: 1,
    check: "frontend-upgrade-phase1-auth",
    status: "pass",
    mode: "live",
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
      localStorageEntryCount: browserStorage.localStorageEntryCount,
      sessionStorageEntryCount: browserStorage.sessionStorageEntryCount,
      indexedDbRecordCount: browserStorage.indexedDbRecordCount,
      sensitiveEntryCount: 0,
    },
    syntheticDataCount: 1,
    syntheticDataFingerprint: sha256(registrationBody.email),
    cleanupRequired: true,
  };
}

export function buildPhase1AuthLiveSummary({
  live,
  checkedAt,
  commit,
  evidenceSha256,
}) {
  return {
    schemaVersion: 1,
    check: "frontend-upgrade-phase1-auth",
    status: "pass",
    checkedAt: checkedAt.toISOString(),
    commit,
    evidenceSha256,
    hashes: {
      syntheticDataSha256: live.syntheticDataFingerprint,
    },
    checks: {
      offlineContractPassed: true,
      ...live.checks,
      syntheticCleanupRequired: live.cleanupRequired,
    },
    counts: {
      localStorageEntries: live.browserStorage.localStorageEntryCount,
      sessionStorageEntries: live.browserStorage.sessionStorageEntryCount,
      indexedDbRecords: live.browserStorage.indexedDbRecordCount,
      sensitiveEntries: live.browserStorage.sensitiveEntryCount,
      syntheticUsersCreated: live.syntheticDataCount,
    },
    failureCodes: [],
  };
}

export async function runFrontendUpgradePhase1AuthCheck(options = {}) {
  const root = path.resolve(options.root ?? defaultRoot);
  const mode = options.mode ?? "offline";
  const offline = await collectPhase1AuthOfflineEvidence(root);
  if (offline.failures.length > 0) {
    throw new Error(`offline auth contract failed (${offline.failures.length})`);
  }
  if (mode === "offline") return { summary: offline.summary, output: null };
  if (mode !== "live") throw new Error("auth check mode must be offline or live");
  const expectedCommit = options.expectedCommit ?? process.env.QUANTGYM_PHASE1_EXPECTED_COMMIT;
  if (!SHA_PATTERN.test(expectedCommit ?? "")) throw new Error("expected commit is invalid");
  const evidenceSha256 = (
    options.evidenceSha256
    ?? process.env.QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256
  );
  if (!HASH_PATTERN.test(evidenceSha256 ?? "")) {
    throw new Error("provider evidence SHA-256 is invalid");
  }
  const checkedAt = new Date(options.checkedAt ?? Date.now());
  if (!Number.isFinite(checkedAt.getTime())) throw new Error("checkedAt is invalid");
  const live = await runPhase1AuthLiveProbe(options);
  const summary = buildPhase1AuthLiveSummary({
    live,
    checkedAt,
    commit: expectedCommit,
    evidenceSha256,
  });
  const serialized = `${JSON.stringify(summary, null, 2)}\n`;
  for (const value of [
    process.env.QUANTGYM_PHASE1_AUTH_AUDIT_PASSWORD,
    process.env.QUANTGYM_V2_SESSION_SECRET,
    process.env.QUANTGYM_V2_CSRF_SIGNING_SECRET,
  ]) {
    if (typeof value === "string" && value && serialized.includes(value)) {
      throw new Error("auth summary contains a secret");
    }
  }
  await writeFileAtomicallyWithinTrustedRoot({
    root,
    relativePath: SUMMARY_RELATIVE,
    data: serialized,
    mode: 0o644,
  });
  return { summary, output: path.join(root, SUMMARY_RELATIVE) };
}

const parseArguments = (argumentsList) => {
  let mode = "offline";
  let root = defaultRoot;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--offline" || argument === "--live") {
      mode = argument.slice(2);
    } else if (argument === "--root") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--root requires a directory");
      root = path.resolve(value);
      index += 1;
    } else {
      throw new Error(`unsupported argument: ${argument}`);
    }
  }
  return { mode, root };
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = await runFrontendUpgradePhase1AuthCheck(options);
    console.log(JSON.stringify(result.summary, null, 2));
  } catch {
    console.error("FAIL: frontend upgrade Phase 1 auth check failed");
    process.exitCode = 1;
  }
}
