import { createHash, randomBytes, randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const HTTP_TIMEOUT_MS = 20_000;
const NAVIGATION_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REMAINING_READ_ONLY_CONTROL_PROVIDERS = Object.freeze([
  "cloudflare",
  "r2",
]);
const TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS = Object.freeze(["render"]);
const TERMINAL_TEMPORARY_CONTROL_PROVIDERS = Object.freeze(["postgres", "render"]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clean = (value) => typeof value === "string" ? value.trim() : "";
const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);
const exactKeys = (value, expected) => (
  isPlainObject(value)
  && Object.keys(value).length === expected.length
  && expected.every((key) => Object.hasOwn(value, key))
);
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));

const requireCondition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const boundedJson = async (response, label) => {
  const length = Number(response.headers.get("content-length"));
  requireCondition(
    !Number.isFinite(length) || length <= MAX_RESPONSE_BYTES,
    `${label} response is too large`,
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  try {
    requireCondition(bytes.length <= MAX_RESPONSE_BYTES, `${label} response is too large`);
    return JSON.parse(bytes.toString("utf8"));
  } finally {
    bytes.fill(0);
  }
};

class CookieJar {
  #cookies = new Map();

  absorb(headers) {
    const values = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
    for (const source of values) {
      const pair = clean(source).split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (!name || /[\s;,]/u.test(name)) continue;
      if (value === "" || /Max-Age=0/iu.test(source)) this.#cookies.delete(name);
      else this.#cookies.set(name, value);
    }
  }

  header() {
    return [...this.#cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  playwrightCookies(origin) {
    return [...this.#cookies.entries()].map(([name, value]) => ({
      name,
      value,
      url: origin,
      httpOnly: name === "__Host-qg_session",
      secure: true,
      sameSite: "Lax",
    }));
  }

  clear() {
    this.#cookies.clear();
  }
}

const requestJson = async ({
  fetchImpl,
  jar,
  origin,
  pathname,
  method = "GET",
  body,
  csrf,
  idempotencyKey,
  acceptedStatuses = [200],
  label,
}) => {
  const response = await fetchImpl(new URL(pathname, origin), {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(jar.header() ? { cookie: jar.header() } : {}),
      ...(csrf ? { "x-csrf-token": csrf } : {}),
      ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  jar.absorb(response.headers);
  requireCondition(
    acceptedStatuses.includes(response.status),
    `${label} returned an unexpected status`,
  );
  return boundedJson(response, label);
};

const firstDiagnosticAnswers = Object.freeze([
  ["mm-percent", "42.5"],
  ["prob-coin", "3/8"],
  ["prob-die", "3.5"],
  ["stats-pvalue", "null-hypothesis-tail"],
  ["market-spread", "buy-from-market-maker"],
  ["option-call", "strike"],
  ["code-two-sum", "hash-map"],
  ["research-validation", "walk-forward"],
].map(([questionId, optionId]) => Object.freeze({ questionId, optionId })));

const waitForVisible = async (locator, label) => {
  await locator.waitFor({ state: "visible", timeout: NAVIGATION_TIMEOUT_MS });
  requireCondition(await locator.isVisible(), `${label} is not visible`);
};

const requireNoRuntimeErrors = ({ consoleErrors, pageErrors, failedRequests }, label) => {
  requireCondition(consoleErrors.length === 0, `${label} emitted a console error`);
  requireCondition(pageErrors.length === 0, `${label} emitted a page error`);
  requireCondition(failedRequests.length === 0, `${label} had a failed first-party request`);
};

const attachRuntimeMonitoring = (page) => {
  const facts = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on("console", (message) => {
    if (message.type() === "error") facts.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => facts.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const failure = request.failure()?.errorText ?? "";
    if (
      url.pathname.startsWith("/api/v2/")
      && !/ERR_ABORTED|NS_BINDING_ABORTED/iu.test(failure)
    ) facts.failedRequests.push(`${request.method()} ${url.pathname}`);
  });
  return facts;
};

const launchAuthenticatedContext = async ({ state, viewport }) => {
  requireCondition(state !== undefined, "acceptance state is absent");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      colorScheme: "light",
      locale: "zh-CN",
      reducedMotion: "reduce",
      serviceWorkers: "block",
      viewport,
    });
    await context.addCookies(state.jar.playwrightCookies(state.webOrigin));
    return { browser, context };
  } catch (error) {
    await browser.close();
    throw error;
  }
};

const assertPageIntegrity = async (page, expectedCommit) => {
  const facts = await page.evaluate(() => {
    const root = document.documentElement;
    const images = [...document.images];
    return {
      bodyTextLength: document.body?.innerText?.trim().length ?? 0,
      horizontalOverflowPx: Math.max(
        0,
        root.scrollWidth - root.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      imagesComplete: images.every((image) => image.complete && image.naturalWidth > 0),
      mainPresent: document.querySelector("main#qg-main-content") !== null,
      title: document.title,
    };
  });
  requireCondition(
    facts.bodyTextLength > 100
      && facts.horizontalOverflowPx === 0
      && facts.imagesComplete
      && facts.mainPresent
      && !/error|not found|无法访问/iu.test(facts.title),
    "deployed visual integrity failed",
  );
  const version = await page.evaluate(async () => {
    const response = await fetch(`/version.json?phase2=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    return response.ok ? response.json() : null;
  });
  requireCondition(
    version?.commit === expectedCommit,
    "deployed visual is not bound to the candidate commit",
  );
  return facts;
};

export function createApprovedPhase2OperatorCapabilities({
  fetchImpl,
} = {}) {
  requireCondition(typeof fetchImpl === "function", "approved fetch capability is required");
  let state;

  const acceptance = Object.freeze({
    preflight: async (input) => {
      requireCondition(
        exactKeys(input, [
          "apiOrigin",
          "catalogPath",
          "expectedCommit",
          "webOrigin",
        ])
          && SHA_PATTERN.test(input.expectedCommit)
          && new URL(input.webOrigin).protocol === "https:"
          && new URL(input.apiOrigin).protocol === "https:",
        "approved acceptance preflight is invalid",
      );
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      return { ready: true, kind: "quantgym-live-acceptance-v1" };
    },

    seed: async (input) => {
      requireCondition(
        exactKeys(input, [
          "apiOrigin",
          "catalogPath",
          "expectedCommit",
          "importCatalog",
          "syntheticEmail",
          "webOrigin",
        ])
          && typeof input.importCatalog === "function"
          && SHA_PATTERN.test(input.expectedCommit)
          && /^phase2-[0-9a-f-]{36}@preview\.quantgym\.invalid$/iu.test(
            input.syntheticEmail,
          ),
        "approved acceptance seed is invalid",
      );
      requireCondition(state === undefined, "acceptance seed was already created");
      const jar = new CookieJar();
      state = {
        actorId: "",
        expectedCommit: input.expectedCommit,
        jar,
        syntheticEmail: input.syntheticEmail,
        webOrigin: input.webOrigin,
      };
      await input.importCatalog();

      const csrfIssue = await requestJson({
        fetchImpl,
        jar,
        origin: input.webOrigin,
        pathname: "/api/v2/auth/csrf",
        label: "acceptance CSRF",
      });
      const preAuthCsrf = clean(csrfIssue?.csrfToken);
      requireCondition(preAuthCsrf.length >= 32, "acceptance CSRF is invalid");
      const password = `${randomBytes(32).toString("base64url")}Aa1!`;
      const email = input.syntheticEmail;
      const registered = await requestJson({
        fetchImpl,
        jar,
        origin: input.webOrigin,
        pathname: "/api/v2/auth/register",
        method: "POST",
        body: {
          displayName: "Phase 2 Synthetic Audit",
          email,
          password,
        },
        csrf: preAuthCsrf,
        acceptedStatuses: [201],
        label: "acceptance registration",
      });
      const actorId = clean(registered?.user?.id).toLowerCase();
      const sessionCsrf = jar.header().match(/(?:^|; )__Host-qg_csrf=([^;]+)/u)?.[1] ?? "";
      requireCondition(
        UUID_PATTERN.test(actorId) && sessionCsrf.length >= 32,
        "acceptance identity is invalid",
      );
      const plan = await requestJson({
        fetchImpl,
        jar,
        origin: input.webOrigin,
        pathname: "/api/v2/plans",
        method: "POST",
        body: {
          role: "quant-research",
          season: "phase2-preview",
          track: "internship",
          weeklyHours: 8,
        },
        csrf: sessionCsrf,
        idempotencyKey: randomUUID(),
        acceptedStatuses: [201],
        label: "acceptance plan creation",
      });
      const planId = clean(plan?.planId).toLowerCase();
      requireCondition(
        UUID_PATTERN.test(planId) && plan?.planVersion === 1,
        "acceptance plan is invalid",
      );
      await requestJson({
        fetchImpl,
        jar,
        origin: input.webOrigin,
        pathname: "/api/v2/plans/current/diagnostic",
        method: "POST",
        body: {
          answers: firstDiagnosticAnswers,
          definitionVersion: "baseline-v1",
          planVersion: 1,
        },
        csrf: sessionCsrf,
        idempotencyKey: randomUUID(),
        label: "acceptance plan diagnostic",
      });
      const current = await requestJson({
        fetchImpl,
        jar,
        origin: input.webOrigin,
        pathname: "/api/v2/plans/current",
        label: "acceptance plan read",
      });
      const task = current?.plan?.tasks?.find((entry) => (
        UUID_PATTERN.test(clean(entry?.targetProblemId))
      ));
      requireCondition(
        current?.plan?.id === planId
          && current?.plan?.diagnosticStatus === "completed"
          && task !== undefined
          && UUID_PATTERN.test(clean(task.id)),
        "acceptance plan lacks a rights-labelled training task",
      );
      Object.assign(state, {
        actorId,
        planId,
        taskId: clean(task.id).toLowerCase(),
        problemId: clean(task.targetProblemId).toLowerCase(),
        sessionCsrf,
      });
      return { actorSha256: sha256(actorId) };
    },

    runDailyLoop: async (input) => {
      requireCondition(
        state !== undefined
          && input.expectedCommit === state.expectedCommit
          && input.webOrigin === state.webOrigin,
        "approved daily loop is not seed-bound",
      );
      const { browser, context } = await launchAuthenticatedContext({
        state,
        viewport: { width: 1440, height: 900 },
      });
      try {
        const page = await context.newPage();
        const runtime = attachRuntimeMonitoring(page);
        let completionRequest;
        page.on("request", (request) => {
          if (
            request.method() === "POST"
            && /\/api\/v2\/training\/sessions\/[^/]+\/complete$/u.test(
              new URL(request.url()).pathname,
            )
          ) {
            completionRequest = {
              pathname: new URL(request.url()).pathname,
              body: request.postDataJSON(),
              idempotencyKey: request.headers()["x-idempotency-key"],
              csrf: request.headers()["x-csrf-token"],
            };
          }
        });
        await page.goto(state.webOrigin, { waitUntil: "domcontentloaded" });
        await waitForVisible(page.getByRole("main"), "Overview main");
        await page.getByRole("button", {
          name: "开始 / 继续训练",
          exact: true,
        }).click();
        await page.waitForURL(/\/problems\?problem=/u, { timeout: NAVIGATION_TIMEOUT_MS });
        await waitForVisible(
          page.locator(`article[data-problem-id="${state.problemId}"]`),
          "training problem",
        );
        await page.getByRole("button", { name: "使用提示", exact: true }).click();
        await page.getByRole("textbox", { name: "你的答案", exact: true })
          .fill("2/3 — synthetic Preview acceptance answer");
        await page.getByRole("button", { name: "提交作答", exact: true }).click();
        await waitForVisible(page.getByText(/最近一次得分：/u), "training score");
        await page.getByRole("button", { name: "完成本次训练", exact: true }).click();
        const result = page.getByRole("region", { name: "训练完成", exact: true });
        await waitForVisible(result, "training completion");
        await waitForVisible(result.getByText(/\+[0-9]+ XP/u), "training reward");
        requireCondition(completionRequest !== undefined, "completion request was not observed");
        const firstResult = await requestJson({
          fetchImpl,
          jar: state.jar,
          origin: state.webOrigin,
          pathname: completionRequest.pathname,
          method: "POST",
          body: completionRequest.body,
          csrf: completionRequest.csrf,
          idempotencyKey: completionRequest.idempotencyKey,
          label: "acceptance completion replay",
        });
        requireCondition(
          firstResult?.sessionId && firstResult?.xpDelta > 0,
          "completion replay was not idempotent",
        );
        await page.getByRole("navigation", { name: "主导航", exact: true })
          .getByRole("link", { name: "计划", exact: true }).click();
        await page.waitForURL(/\/plan$/u, { timeout: NAVIGATION_TIMEOUT_MS });
        await waitForVisible(
          page.locator(`article[data-plan-task-status="completed"]`),
          "completed plan task",
        );
        await page.getByRole("navigation", { name: "主导航", exact: true })
          .getByRole("link", { name: "总览", exact: true }).click();
        await page.waitForURL(/\/$/u, { timeout: NAVIGATION_TIMEOUT_MS });
        const pageFacts = await assertPageIntegrity(page, state.expectedCommit);
        const screenshot = await page.screenshot({ animations: "disabled", fullPage: true });
        requireNoRuntimeErrors(runtime, "daily-loop browser");
        const evidenceSha256 = sha256(Buffer.concat([
          screenshot,
          Buffer.from(canonicalJson({
            actor: sha256(state.actorId),
            pageFacts,
            plan: sha256(state.planId),
            problem: sha256(state.problemId),
            replay: firstResult,
          })),
        ]));
        screenshot.fill(0);
        return { passed: true, evidenceSha256 };
      } finally {
        await context.close();
        await browser.close();
      }
    },

    runAccessibility: async (input) => {
      requireCondition(
        state !== undefined && input.expectedCommit === state.expectedCommit,
        "approved accessibility check is not seed-bound",
      );
      const { browser, context } = await launchAuthenticatedContext({
        state,
        viewport: { width: 1440, height: 900 },
      });
      try {
        const page = await context.newPage();
        const facts = [];
        for (const pathname of ["/", "/plan", `/problems?problem=${state.problemId}`]) {
          await page.goto(new URL(pathname, state.webOrigin).href, {
            waitUntil: "domcontentloaded",
          });
          await waitForVisible(page.getByRole("main"), `accessibility ${pathname}`);
          await assertPageIntegrity(page, state.expectedCommit);
          const result = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();
          requireCondition(
            result.violations.length === 0,
            `accessibility violation on ${pathname}`,
          );
          facts.push({ pathname, passes: result.passes.length });
        }
        return { passed: true, evidenceSha256: sha256(canonicalJson(facts)) };
      } finally {
        await context.close();
        await browser.close();
      }
    },

    runVisual: async (input) => {
      requireCondition(
        state !== undefined && input.expectedCommit === state.expectedCommit,
        "approved visual check is not seed-bound",
      );
      const digests = [];
      for (const viewport of [
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
      ]) {
        const { browser, context } = await launchAuthenticatedContext({ state, viewport });
        try {
          const page = await context.newPage();
          for (const pathname of ["/", "/plan", `/problems?problem=${state.problemId}`]) {
            await page.goto(new URL(pathname, state.webOrigin).href, {
              waitUntil: "domcontentloaded",
            });
            await waitForVisible(page.getByRole("main"), `visual ${pathname}`);
            await assertPageIntegrity(page, state.expectedCommit);
            const screenshot = await page.screenshot({
              animations: "disabled",
              fullPage: true,
            });
            digests.push(sha256(screenshot));
            screenshot.fill(0);
          }
        } finally {
          await context.close();
          await browser.close();
        }
      }
      return { passed: true, evidenceSha256: sha256(canonicalJson(digests)) };
    },

    cleanup: async (input) => {
      requireCondition(
        state !== undefined
          && typeof input.cleanupDatabase === "function"
          && input.expectedCommit === state.expectedCommit,
        "approved acceptance cleanup is not seed-bound",
      );
      const result = await input.cleanupDatabase({
        actorId: state.actorId,
        email: state.syntheticEmail,
      });
      requireCondition(
        exactKeys(result, ["syntheticApplicationRows", "syntheticCatalogRows"])
          && result.syntheticApplicationRows === 0
          && result.syntheticCatalogRows === 0,
        "approved acceptance cleanup is incomplete",
      );
      state.jar.clear();
      return result;
    },

    verifyRecovery: async (input) => {
      requireCondition(
        state !== undefined
          && typeof input.verifyDatabase === "function"
          && input.expectedCommit === state.expectedCommit,
        "approved acceptance verification is not seed-bound",
      );
      const result = await input.verifyDatabase({
        actorId: state.actorId,
        email: state.syntheticEmail,
      });
      requireCondition(
        exactKeys(result, ["syntheticApplicationRows", "syntheticCatalogRows"])
          && result.syntheticApplicationRows === 0
          && result.syntheticCatalogRows === 0,
        "approved acceptance rows remain",
      );
      return result;
    },
  });

  const control = Object.freeze({
    preflight: async (input) => {
      requireCondition(
        isPlainObject(input)
          && exactKeys(input, [
            "remainingReadOnlyProviders",
            "terminalTemporaryProviders",
            "terminalTemporaryUnscopedProviders",
            "terminalRevocationRequired",
            "probe",
          ])
          && canonicalJson(input.remainingReadOnlyProviders)
            === canonicalJson(REMAINING_READ_ONLY_CONTROL_PROVIDERS)
          && canonicalJson(input.terminalTemporaryUnscopedProviders)
            === canonicalJson(TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS)
          && canonicalJson(input.terminalTemporaryProviders)
            === canonicalJson(TERMINAL_TEMPORARY_CONTROL_PROVIDERS)
          && input.terminalRevocationRequired === true
          && typeof input.probe === "function",
        "approved control preflight is invalid",
      );
      const result = await input.probe();
      const proofs = result?.remainingReadOnlyControlProofs;
      const terminal = result?.terminalTemporaryControl;
      requireCondition(
        exactKeys(result, [
          "remainingReadOnlyControlProofs",
          "terminalTemporaryControl",
        ])
          && exactKeys(proofs, ["cloudflare", "r2"])
          && exactKeys(proofs.cloudflare, [
            "accountBound",
            "providerScopeReadOnly",
            "evidenceSha256",
          ])
          && proofs.cloudflare.accountBound === true
          && proofs.cloudflare.providerScopeReadOnly === true
          && HASH_PATTERN.test(proofs.cloudflare.evidenceSha256)
          && exactKeys(proofs.r2, [
            "policyBucketBound",
            "policyReadOnly",
            "previewReadSucceeded",
            "previewWriteDenied",
            "productionAccessDenied",
            "evidenceSha256",
          ])
          && proofs.r2.policyBucketBound === true
          && proofs.r2.policyReadOnly === true
          && proofs.r2.previewReadSucceeded === true
          && proofs.r2.previewWriteDenied === true
          && proofs.r2.productionAccessDenied === true
          && HASH_PATTERN.test(proofs.r2.evidenceSha256)
          && exactKeys(terminal, [
            "providers",
            "unscopedProviders",
            "terminalRevocationRequired",
            "postgres",
            "renderCredentialIdentitySha256",
          ])
          && canonicalJson(terminal.providers)
            === canonicalJson(TERMINAL_TEMPORARY_CONTROL_PROVIDERS)
          && canonicalJson(terminal.unscopedProviders)
            === canonicalJson(TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS)
          && terminal.terminalRevocationRequired === true
          && exactKeys(terminal.postgres, [
            "applicationDmlDenied",
            "ddlDenied",
            "largeObjectCreationDenied",
            "selectSucceeded",
            "sqlManagedTemporaryRole",
            "transactionReadOnly",
            "finalDropRequired",
            "providerCredentialInventoryUnchanged",
            "providerCredentialInventorySha256",
            "persistentProviderAdmin",
            "evidenceSha256",
          ])
          && terminal.postgres.applicationDmlDenied === true
          && terminal.postgres.ddlDenied === true
          && terminal.postgres.largeObjectCreationDenied === true
          && terminal.postgres.selectSucceeded === true
          && terminal.postgres.sqlManagedTemporaryRole === true
          && terminal.postgres.transactionReadOnly === true
          && terminal.postgres.finalDropRequired === true
          && terminal.postgres.providerCredentialInventoryUnchanged === true
          && HASH_PATTERN.test(
            terminal.postgres.providerCredentialInventorySha256,
          )
          && exactKeys(terminal.postgres.persistentProviderAdmin, [
            "retained",
            "privilege",
            "excludedFromReadOnlyControlAssertions",
            "identitySha256",
            "sqlIdentitySha256",
            "providerCredentialInventoryUnchanged",
            "providerCredentialInventorySha256",
            "evidenceSha256",
          ])
          && terminal.postgres.persistentProviderAdmin.retained === true
          && terminal.postgres.persistentProviderAdmin.privilege === "admin"
          && terminal.postgres.persistentProviderAdmin
            .excludedFromReadOnlyControlAssertions === true
          && terminal.postgres.persistentProviderAdmin
            .providerCredentialInventoryUnchanged === true
          && terminal.postgres.persistentProviderAdmin
            .providerCredentialInventorySha256
              === terminal.postgres.providerCredentialInventorySha256
          && [
            terminal.postgres.persistentProviderAdmin.identitySha256,
            terminal.postgres.persistentProviderAdmin.sqlIdentitySha256,
            terminal.postgres.persistentProviderAdmin.evidenceSha256,
          ].every((value) => HASH_PATTERN.test(value))
          && HASH_PATTERN.test(terminal.postgres.evidenceSha256)
          && HASH_PATTERN.test(terminal.renderCredentialIdentitySha256),
        "approved control probe did not prove the composite control boundary",
      );
      return {
        ready: true,
        kind: "quantgym-provider-composite-control-v1",
        remainingReadOnlyProvidersProven: true,
        terminalRevocationRequired: true,
      };
    },
  });

  const revocation = Object.freeze({
    preflight: async (input) => {
      requireCondition(
        isPlainObject(input)
          && input.readOnly === true
          && typeof input.probe === "function",
        "approved revocation preflight is invalid",
      );
      const result = await input.probe();
      requireCondition(
        exactKeys(result, ["ready", "evidenceSha256"])
          && result.ready === true
          && HASH_PATTERN.test(result.evidenceSha256),
        "approved revocation probe failed",
      );
      return { ready: true, kind: "quantgym-temporary-access-revocation-v1" };
    },
    revokeRender: async (input) => {
      requireCondition(
        exactKeys(input, ["revoke"])
          && typeof input.revoke === "function",
        "approved Render revoke is invalid",
      );
      return input.revoke();
    },
    revokePostgres: async (input) => {
      requireCondition(
        exactKeys(input, ["revoke"])
          && typeof input.revoke === "function",
        "approved PostgreSQL revoke is invalid",
      );
      return input.revoke();
    },
  });

  return Object.freeze({
    available: true,
    acceptance,
    control,
    revocation,
    dispose: () => {
      state?.jar.clear();
      state = undefined;
    },
  });
}
