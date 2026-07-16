import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  TEST_ONLY_PROVIDER_EVIDENCE,
  buildFrontendUpgradeProviderEvidence,
} from "../scripts/build-frontend-upgrade-provider-evidence.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const probePath = path.join(projectRoot, "scripts/serve-frontend-upgrade-preview-probe.mjs");
const webBuilderPath = path.join(projectRoot, "scripts/build-frontend-upgrade-preview-web.mjs");
const packetBuilderPath = path.join(projectRoot, "scripts/build-frontend-upgrade-preview-packet.mjs");
const providerBuilderPath = path.join(
  projectRoot,
  "scripts/build-frontend-upgrade-provider-evidence.mjs",
);
const previewContract = JSON.parse(
  await readFile(
    new URL("../docs/frontend-upgrade/preview-environment.json", import.meta.url),
    "utf8",
  ),
);

const COMMIT = "9f47af483ca4b173f6666e472f91d48881c7a634";
const BRANCH = "codex/frontend-v2-preview";
const WEB_ORIGIN = "https://quantgym-v2-preview.pages.dev";
const API_ORIGIN = "https://quantgym-v2-preview-api.onrender.com";
const API_BASE = `${API_ORIGIN}/api/v2`;
const REPO = "https://github.com/garymmmjw/QuantGym";
const PAGE_BUILD = (
  "npm ci && node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview"
);
const RENDER_BUILD = "npm ci";
const RENDER_START = "node scripts/serve-frontend-upgrade-preview-probe.mjs";
const NODE_VERSION = "20.20.2";
const CF_ACCOUNT_ID = "023e105f4ecef8ad9ca31a8372d0c353";
const CF_TOKEN = "cf-test-token-that-must-never-be-written";
const RENDER_TOKEN = "rnd-test-token-that-must-never-be-written";
const PROVIDER_OUTPUT = (
  "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json"
);
const PACKET_FILES = [
  "README.md",
  "cloudflare-pages-env-template.txt",
  "cloudflare-pages-runbook.md",
  "manual-signoff-checklist.csv",
  "operator-live-check-env-template.txt",
  "postgres-runbook.md",
  "provider-evidence-schema.json",
  "r2-runbook.md",
  "render-api-env-template.txt",
  "render-llm-env-template.txt",
  "render-services-runbook.md",
].sort();

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const r2IdentityHash = (accountId, bucketName, jurisdiction = "default") => (
  sha256(JSON.stringify([accountId, bucketName, jurisdiction || "default"]))
);

const listFiles = async (root, current = root) => {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, absolute));
    else files.push(path.relative(root, absolute).split(path.sep).join("/"));
  }
  return files.sort();
};

const waitForReady = async (child, service) => {
  let stdout = "";
  let stderr = "";
  let readyPort = 0;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`probe readiness timeout\nstdout=${stdout}\nstderr=${stderr}`));
    }, 5_000);
    const inspect = () => {
      const match = stdout.match(new RegExp(
        `Preview ${service} probe listening on 0\\.0\\.0\\.0:(\\d+)`,
      ));
      if (!match) return;
      readyPort = Number(match[1]);
      clearTimeout(timeout);
      child.off("exit", onExit);
      resolve();
    };
    const onExit = (code) => {
      clearTimeout(timeout);
      reject(new Error(`probe exited ${code}\nstdout=${stdout}\nstderr=${stderr}`));
    };
    child.stdout.on("data", inspect);
    child.once("exit", onExit);
  });

  return { port: readyPort, stdout: () => stdout, stderr: () => stderr };
};

const stopChild = async (child) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 2_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
};

const spawnProbe = async (service, overrides = {}) => {
  const requestedPort = overrides.PORT ?? 0;
  const env = {
    PATH: process.env.PATH,
    NODE_ENV: "test",
    PORT: String(requestedPort),
    QUANTGYM_PREVIEW_ENVIRONMENT: "preview-v2",
    QUANTGYM_PREVIEW_SERVICE: service,
    QUANTGYM_PREVIEW_COMMIT: COMMIT,
    RENDER_GIT_COMMIT: COMMIT,
    ...overrides,
  };
  const child = spawn(process.execPath, [probePath], {
    cwd: projectRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = await waitForReady(child, service);
  return { child, port: output.port, output };
};

const startJsonFixture = async ({ body, status = 200 }) => {
  const server = createServer((request, response) => {
    response.statusCode = request.url === "/health" ? status : 404;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(request.url === "/health" ? body : { status: "not-found" }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    ))),
  };
};

const healthEnvelope = (service) => ({
  status: "ok",
  environment: "preview-v2",
  service,
  commit: COMMIT,
  legacySchemaLoaded: false,
});

test("the LLM probe reads Render env, binds all interfaces, and serves only its exact health envelope", async (t) => {
  const llm = await spawnProbe("llm");
  t.after(() => stopChild(llm.child));

  const response = await fetch(`http://127.0.0.1:${llm.port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), healthEnvelope("llm"));
  assert.equal(response.headers.get("access-control-allow-origin"), null);

  const wrongRoute = await fetch(`http://127.0.0.1:${llm.port}/api/v2/health`);
  assert.equal(wrongRoute.status, 404);
  const wrongMethod = await fetch(`http://127.0.0.1:${llm.port}/health`, { method: "POST" });
  assert.equal(wrongMethod.status, 405);
  assert.equal(llm.output.stderr(), "");
});

test("the API probe verifies the internal LLM and returns no internal address", async (t) => {
  const llm = await spawnProbe("llm");
  t.after(() => stopChild(llm.child));
  const internalUrl = `http://127.0.0.1:${llm.port}`;
  const api = await spawnProbe("api", {
    QUANTGYM_PREVIEW_LLM_INTERNAL_URL: internalUrl,
    QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN,
  });
  t.after(() => stopChild(api.child));

  const response = await fetch(`http://127.0.0.1:${api.port}/api/v2/health`, {
    headers: { origin: WEB_ORIGIN },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), WEB_ORIGIN);
  assert.equal(response.headers.get("vary"), "Origin");
  const body = await response.json();
  assert.deepEqual(body, {
    ...healthEnvelope("api"),
    llmVerified: true,
    llmCommit: COMMIT,
  });
  assert.doesNotMatch(JSON.stringify(body), /127\.0\.0\.1|internal|url/i);

  const wrongRoute = await fetch(`http://127.0.0.1:${api.port}/health`);
  assert.equal(wrongRoute.status, 404);
  assert.equal(api.output.stderr(), "");
});

test("the API accepts the Render Dashboard private-service address at startup", async (t) => {
  const api = await spawnProbe("api", {
    QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "http://quantgym-v2-preview-llm:10000",
    QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN,
  });
  t.after(() => stopChild(api.child));
  assert.equal(api.output.stderr(), "");
});

test("the API health route grants CORS only to the configured Preview Pages origin", async (t) => {
  const fixture = await startJsonFixture({ body: healthEnvelope("llm") });
  t.after(() => fixture.close());
  const api = await spawnProbe("api", {
    QUANTGYM_PREVIEW_LLM_INTERNAL_URL: fixture.origin,
    QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN,
  });
  t.after(() => stopChild(api.child));
  const url = `http://127.0.0.1:${api.port}/api/v2/health`;

  const allowed = await fetch(url, {
    method: "OPTIONS",
    headers: { origin: WEB_ORIGIN, "access-control-request-method": "GET" },
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), WEB_ORIGIN);
  assert.equal(allowed.headers.get("access-control-allow-methods"), "GET, OPTIONS");

  for (const origin of ["https://beta.quantgym.app", "https://unrelated.invalid"]) {
    const deniedPreflight = await fetch(url, {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "GET" },
    });
    assert.equal(deniedPreflight.status, 403, origin);
    assert.equal(deniedPreflight.headers.get("access-control-allow-origin"), null, origin);

    const deniedGet = await fetch(url, { headers: { origin } });
    assert.equal(deniedGet.status, 403, origin);
    assert.equal(deniedGet.headers.get("access-control-allow-origin"), null, origin);
  }
});

for (const [label, mutate] of [
  ["environment", (body) => { body.environment = "production"; }],
  ["service", (body) => { body.service = "api"; }],
  ["commit", (body) => { body.commit = "different-commit"; }],
  ["legacy-schema flag", (body) => { body.legacySchemaLoaded = true; }],
]) {
  test(`the API rejects an internal LLM with the wrong ${label} without leaking its response`, async (t) => {
    const body = {
      ...healthEnvelope("llm"),
      internalUrl: "https://private-llm.invalid",
      bearerToken: "fixture-secret-token",
    };
    mutate(body);
    const fixture = await startJsonFixture({ body });
    t.after(() => fixture.close());
    const api = await spawnProbe("api", {
      QUANTGYM_PREVIEW_LLM_INTERNAL_URL: fixture.origin,
      QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN,
    });
    t.after(() => stopChild(api.child));

    const response = await fetch(`http://127.0.0.1:${api.port}/api/v2/health`);
    assert.equal(response.status, 502);
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), {
      ...healthEnvelope("api"),
      status: "error",
      llmVerified: false,
    });
    assert.doesNotMatch(text, /private-llm|fixture-secret|bearer|url/i);
  });
}

test("the API rejects an unavailable or malformed internal LLM without logging response data", async (t) => {
  const fixture = await startJsonFixture({
    status: 503,
    body: { error: "provider down", secret: "upstream-private-response" },
  });
  t.after(() => fixture.close());
  const api = await spawnProbe("api", {
    QUANTGYM_PREVIEW_LLM_INTERNAL_URL: fixture.origin,
    QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN,
  });
  t.after(() => stopChild(api.child));

  const response = await fetch(`http://127.0.0.1:${api.port}/api/v2/health`);
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /provider down|upstream-private-response/i);
  assert.doesNotMatch(api.output.stdout() + api.output.stderr(), /provider down|upstream-private-response/i);
});

for (const [label, overrides, diagnostic] of [
  ["missing PORT", { PORT: "" }, "PORT must be an integer between 0 and 65535"],
  ["wrong environment", { QUANTGYM_PREVIEW_ENVIRONMENT: "production" }, "environment must equal preview-v2"],
  ["unknown service", { QUANTGYM_PREVIEW_SERVICE: "worker" }, "service must equal api or llm"],
  ["missing commit", { QUANTGYM_PREVIEW_COMMIT: "" }, "commit is required"],
  ["Render commit mismatch", { RENDER_GIT_COMMIT: "wrong" }, "commit must match RENDER_GIT_COMMIT"],
  ["missing API LLM URL", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "", QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN }, "LLM internal URL is required"],
  ["missing API CORS origin", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "http://127.0.0.1:1", QUANTGYM_PREVIEW_CORS_ORIGIN: "" }, "CORS origin is required"],
  ["production API CORS origin", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "http://127.0.0.1:1", QUANTGYM_PREVIEW_CORS_ORIGIN: "https://beta.quantgym.app" }, "CORS origin must be the Preview web origin"],
  ["lookalike API CORS origin", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "http://127.0.0.1:1", QUANTGYM_PREVIEW_CORS_ORIGIN: "https://evilquantgym-v2-preview.attacker.test" }, "CORS origin must be the Preview web origin"],
  ["port-bearing API CORS origin", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "http://127.0.0.1:1", QUANTGYM_PREVIEW_CORS_ORIGIN: "https://quantgym-v2-preview.pages.dev:8443" }, "CORS origin must be the Preview web origin"],
  ["production LLM URL", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "https://llm.quantgym.app", QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN }, "LLM internal URL must use the Preview private service"],
  ["production loopback LLM URL", { NODE_ENV: "production", QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "http://127.0.0.1:18080", QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN }, "LLM internal URL must use the Preview private service"],
  ["Render loopback LLM URL", { RENDER: "true", QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "http://127.0.0.1:18080", QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN }, "LLM internal URL must use the Preview private service"],
  ["public Render LLM URL", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "https://quantgym-v2-preview-llm.onrender.com", QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN }, "LLM internal URL must use the Preview private service"],
  ["suffixed Render LLM URL", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "http://quantgym-v2-preview-llm-ab1c:18080", QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN }, "LLM internal URL must use the Preview private service"],
  ["portless Render LLM URL", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "http://quantgym-v2-preview-llm", QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN }, "LLM internal URL must use the Preview private service"],
  ["unrelated LLM URL", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "https://llm.attacker.test", QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN }, "LLM internal URL must use the Preview private service"],
  ["lookalike LLM URL", { QUANTGYM_PREVIEW_SERVICE: "api", QUANTGYM_PREVIEW_LLM_INTERNAL_URL: "https://evilquantgym-v2-preview-llm.attacker.test", QUANTGYM_PREVIEW_CORS_ORIGIN: WEB_ORIGIN }, "LLM internal URL must use the Preview private service"],
]) {
  test(`probe startup rejects ${label} before listening`, () => {
    const result = spawnSync(process.execPath, [probePath], {
      cwd: projectRoot,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "test",
        PORT: "0",
        QUANTGYM_PREVIEW_ENVIRONMENT: "preview-v2",
        QUANTGYM_PREVIEW_SERVICE: "llm",
        QUANTGYM_PREVIEW_COMMIT: COMMIT,
        RENDER_GIT_COMMIT: COMMIT,
        ...overrides,
      },
      encoding: "utf8",
      timeout: 3_000,
    });
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(`^FAIL: .*${diagnostic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n$`, "i"));
    assert.doesNotMatch(result.stderr, /stack|at file:|api-server|postgres|openai/i);
  });
}

const validWebEnv = () => ({
  PATH: process.env.PATH,
  CF_PAGES: "1",
  CF_PAGES_COMMIT_SHA: COMMIT,
  CF_PAGES_BRANCH: BRANCH,
  QUANTGYM_PREVIEW_ENVIRONMENT: "preview-v2",
  QUANTGYM_PREVIEW_SERVICE: "web",
  QUANTGYM_PREVIEW_COMMIT: COMMIT,
  QUANTGYM_PREVIEW_BRANCH: BRANCH,
  QUANTGYM_PREVIEW_API_BASE: API_BASE,
});

test("the Pages builder replaces its destination with only the three minimal probe files", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-preview-web-"));
  const outDir = path.join(fixtureRoot, "dist-preview");
  try {
    await mkdir(path.join(outDir, "data"), { recursive: true });
    await writeFile(path.join(outDir, "data/problems.json"), "private catalog", "utf8");
    await writeFile(path.join(outDir, "config.js"), "window.GOOGLE_CLIENT_ID='secret'", "utf8");

    const result = spawnSync(
      process.execPath,
      [webBuilderPath, "--out-dir", outDir],
      { cwd: projectRoot, env: validWebEnv(), encoding: "utf8" },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.deepEqual(await listFiles(outDir), ["config.json", "index.html", "version.json"]);

    const config = JSON.parse(await readFile(path.join(outDir, "config.json"), "utf8"));
    const version = JSON.parse(await readFile(path.join(outDir, "version.json"), "utf8"));
    assert.deepEqual(config, {
      environment: "preview-v2",
      service: "web",
      commit: COMMIT,
      branch: BRANCH,
      buildSource: "cloudflare-pages",
      apiBase: API_BASE,
    });
    assert.deepEqual(version, {
      environment: "preview-v2",
      service: "web",
      commit: COMMIT,
      branch: BRANCH,
      buildSource: "cloudflare-pages",
    });

    const combined = (await Promise.all(
      (await listFiles(outDir)).map((file) => readFile(path.join(outDir, file), "utf8")),
    )).join("\n");
    assert.doesNotMatch(combined, /google(?:_|-)?client|openai|bearer|postgres(?:ql)?:|r2[_-]?(?:secret|access)|llm(?:_|-)?(?:url|origin)|jobs(?:\.json|feed)|problem(?:s|-catalog)|private question/i);
    assert.doesNotMatch(combined, /cf-test-token|rnd-test-token|api-server|schema\.sql/i);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

for (const [label, mutate, diagnostic] of [
  ["missing Pages commit", (env) => { env.CF_PAGES_COMMIT_SHA = ""; }, "CF_PAGES_COMMIT_SHA is required"],
  ["commit mismatch", (env) => { env.QUANTGYM_PREVIEW_COMMIT = "wrong"; }, "commit must match CF_PAGES_COMMIT_SHA"],
  ["wrong Pages branch", (env) => { env.CF_PAGES_BRANCH = "main"; }, `CF_PAGES_BRANCH must equal ${BRANCH}`],
  ["branch mismatch", (env) => { env.QUANTGYM_PREVIEW_BRANCH = "main"; }, "branch must match CF_PAGES_BRANCH"],
  ["wrong environment", (env) => { env.QUANTGYM_PREVIEW_ENVIRONMENT = "production"; }, "environment must equal preview-v2"],
  ["wrong service", (env) => { env.QUANTGYM_PREVIEW_SERVICE = "api"; }, "service must equal web"],
  ["production API base", (env) => { env.QUANTGYM_PREVIEW_API_BASE = "https://api.quantgym.app/api/v2"; }, "API base must use the Preview API origin"],
  ["lookalike API base", (env) => { env.QUANTGYM_PREVIEW_API_BASE = "https://evilquantgym-v2-preview-api.attacker.test/api/v2"; }, "API base must use the Preview API origin"],
  ["subdomain API base", (env) => { env.QUANTGYM_PREVIEW_API_BASE = "https://extra.quantgym-v2-preview-api.onrender.com/api/v2"; }, "API base must use the Preview API origin"],
  ["port-bearing API base", (env) => { env.QUANTGYM_PREVIEW_API_BASE = "https://quantgym-v2-preview-api.onrender.com:8443/api/v2"; }, "API base must use the Preview API origin"],
  ["wrong API path", (env) => { env.QUANTGYM_PREVIEW_API_BASE = `${API_ORIGIN}/api/v1`; }, "API base path must equal /api/v2"],
  ["credential-bearing API base", (env) => { env.QUANTGYM_PREVIEW_API_BASE = "https://operator:secret@quantgym-v2-preview-api.invalid/api/v2"; }, "API base must not contain credentials"],
]) {
  test(`the Pages builder rejects ${label} without creating output`, async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-preview-web-reject-"));
    const outDir = path.join(fixtureRoot, "dist-preview");
    try {
      const env = validWebEnv();
      mutate(env);
      const result = spawnSync(
        process.execPath,
        [webBuilderPath, "--out-dir", outDir],
        { cwd: projectRoot, env, encoding: "utf8" },
      );
      assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, new RegExp(diagnostic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      assert.deepEqual(await readdir(fixtureRoot), []);
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });
}

const validProviderFixture = () => ({
  cloudflare: {
    previewPages: {
      result: {
        id: "pages-preview-raw-id",
        name: "quantgym-v2-preview",
        source: {
          type: "github",
          config: { owner: "garymmmjw", repo_name: "QuantGym", production_branch: BRANCH },
        },
        build_config: { build_command: PAGE_BUILD, destination_dir: "dist-preview" },
        latest_deployment: {
          deployment_trigger: { metadata: { branch: BRANCH, commit_hash: COMMIT } },
          latest_stage: { status: "success" },
          environment: { SECRET_TOKEN: "pages-deployment-secret" },
          analytics_engine_datasets: ["private-analytics-dataset"],
        },
        deployment_configs: { production: { env_vars: { PRIVATE_KEY: { value: "secret" } } } },
      },
      success: true,
      messages: [],
    },
    productionPages: {
      result: { id: "pages-production-raw-id", name: "quantgym-beta" },
      success: true,
    },
    previewR2: {
      result: {
        name: "quantgym-v2-preview-media",
        jurisdiction: null,
        storage_class: "Standard",
        secretAccessKey: "r2-secret-that-must-be-discarded",
      },
      success: true,
    },
    productionR2: {
      result: { name: "quantgym-media", jurisdiction: "default" },
      success: true,
    },
    lifecycle: {
      result: {
        rules: [{
          id: "preview-smoke-cleanup",
          enabled: true,
          conditions: { prefix: "readiness-smoke/" },
          deleteObjectsTransition: {
            condition: { type: "Age", maxAge: 7 * 24 * 60 * 60 },
          },
        }],
      },
      success: true,
    },
    cors: {
      result: { rules: [{ allowed: { origins: [WEB_ORIGIN], methods: ["GET", "PUT", "HEAD"] } }] },
      success: true,
    },
    managedDomain: {
      result: {
        bucketId: "preview-r2-bucket-raw-id",
        domain: "quantgym-v2-preview-media.example.r2.dev",
        enabled: false,
      },
      success: true,
    },
    customDomains: {
      result: { domains: [] },
      success: true,
    },
  },
  render: {
    services: [
      {
        service: {
          id: "render-preview-api-raw-id",
          ownerId: "render-workspace-raw-id",
          name: "quantgym-v2-preview-api",
          type: "web_service",
          repo: REPO,
          branch: BRANCH,
          serviceDetails: {
            env: "node",
            runtime: "node",
            region: "oregon",
            url: API_ORIGIN,
            envSpecificDetails: {
              buildCommand: RENDER_BUILD,
              startCommand: RENDER_START,
            },
          },
          envVars: [{ key: "SECRET_TOKEN", value: "render-service-secret" }],
        },
      },
      {
        service: {
          id: "render-preview-llm-raw-id",
          ownerId: "render-workspace-raw-id",
          name: "quantgym-v2-preview-llm",
          type: "private_service",
          repo: REPO,
          branch: BRANCH,
          serviceDetails: {
            env: "node",
            runtime: "node",
            region: "oregon",
            url: "quantgym-v2-preview-llm:10000",
            envSpecificDetails: {
              buildCommand: RENDER_BUILD,
              startCommand: RENDER_START,
            },
          },
        },
      },
      {
        service: {
          id: "render-production-api-raw-id",
          ownerId: "render-workspace-raw-id",
          name: "quantgym-api",
        },
      },
      {
        service: {
          id: "render-production-llm-raw-id",
          ownerId: "render-workspace-raw-id",
          name: "quantgym-llm",
        },
      },
    ],
    envGroups: [
      {
        id: "render-preview-group-raw-id",
        name: "quantgym-v2-preview",
        ownerId: "render-workspace-raw-id",
        serviceLinks: [
          { id: "render-preview-api-raw-id", name: "quantgym-v2-preview-api", type: "web_service" },
          { id: "render-preview-llm-raw-id", name: "quantgym-v2-preview-llm", type: "private_service" },
        ],
        envVars: [{ key: "TOKEN", value: "group-secret" }],
      },
      {
        id: "render-production-group-raw-id",
        name: "quantgym-production",
        ownerId: "render-workspace-raw-id",
        serviceLinks: [
          { id: "render-production-api-raw-id", name: "quantgym-api", type: "web_service" },
          { id: "render-production-llm-raw-id", name: "quantgym-llm", type: "private_service" },
        ],
      },
    ],
    envVars: {
      "render-preview-api-raw-id": [
        { envVar: { key: "NODE_VERSION", value: NODE_VERSION }, cursor: "node-api" },
        { envVar: { key: "QUANTGYM_PREVIEW_LLM_INTERNAL_URL", value: "http://quantgym-v2-preview-llm:10000" }, cursor: "llm-url-api" },
        { envVar: { key: "OPENAI_API_KEY", value: "render-env-secret" }, cursor: "secret-api" },
      ],
      "render-preview-llm-raw-id": [
        { envVar: { key: "NODE_VERSION", value: NODE_VERSION }, cursor: "node-llm" },
        { envVar: { key: "PRIVATE_TOKEN", value: "render-llm-env-secret" }, cursor: "secret-llm" },
      ],
    },
    deploys: {
      "render-preview-api-raw-id": [{ deploy: { id: "deploy-api-raw", status: "live", commit: { id: COMMIT }, environment: { SECRET: "deploy-secret" } } }],
      "render-preview-llm-raw-id": [{ deploy: { id: "deploy-llm-raw", status: "live", commit: { id: COMMIT } } }],
    },
    postgres: [
      {
        postgres: {
          id: "render-preview-postgres-raw-id",
          owner: {
            id: "render-workspace-raw-id",
            name: "QuantGym",
            email: "workspace-owner-secret@example.com",
            type: "team",
          },
          name: "quantgym-v2-preview-postgres",
          databaseName: "quantgym_v2_preview",
          databaseUser: "quantgym_v2_preview_role",
          plan: "basic_256mb",
          status: "available",
        },
      },
      {
        postgres: {
          id: "render-production-postgres-raw-id",
          owner: {
            id: "render-workspace-raw-id",
            name: "QuantGym",
            email: "workspace-owner-secret@example.com",
            type: "team",
          },
          name: "quantgym-postgres",
          databaseName: "quantgym_production",
          databaseUser: "quantgym_production_role",
          plan: "basic_256mb",
          status: "available",
        },
      },
    ],
    connectionInfo: {
      "render-preview-postgres-raw-id": {
        password: "render-postgres-password-secret",
        internalConnectionString: "postgresql://quantgym_v2_preview_role:render-postgres-password-secret@preview-postgres.internal/quantgym_v2_preview",
        externalConnectionString: "postgresql://quantgym_v2_preview_role:render-postgres-password-secret@preview-postgres.render.com/quantgym_v2_preview",
        psqlCommand: "PGPASSWORD=render-postgres-password-secret psql --host preview-postgres.render.com",
      },
    },
    recovery: {
      "render-preview-postgres-raw-id": {
        recoveryStatus: "AVAILABLE",
        startsAt: "2026-07-13T00:00:00Z",
      },
    },
  },
});

const cloudflareUrl = (suffix) => (
  `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}${suffix}`
);
const providerResponse = (body, { status = 200, requestId = "fixture-request-id" } = {}) => (
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cf-ray": requestId, "x-request-id": requestId },
  })
);

const fixtureFetch = (fixture, requests = []) => async (input, init = {}) => {
  const url = new URL(input);
  assert.equal(url.protocol, "https:");
  requests.push({
    url: url.href,
    method: init.method,
    authorization: new Headers(init.headers).get("authorization"),
    r2Jurisdiction: new Headers(init.headers).get("cf-r2-jurisdiction"),
  });

  if (url.href === cloudflareUrl("/pages/projects/quantgym-v2-preview")) {
    return providerResponse(fixture.cloudflare.previewPages);
  }
  if (url.href === cloudflareUrl("/pages/projects/quantgym-beta")) {
    return providerResponse(fixture.cloudflare.productionPages);
  }
  if (url.href === cloudflareUrl("/r2/buckets/quantgym-v2-preview-media")) {
    return providerResponse(fixture.cloudflare.previewR2);
  }
  if (url.href === cloudflareUrl("/r2/buckets/quantgym-media")) {
    return providerResponse(fixture.cloudflare.productionR2);
  }
  if (url.href === cloudflareUrl("/r2/buckets/quantgym-v2-preview-media/lifecycle")) {
    return providerResponse(fixture.cloudflare.lifecycle);
  }
  if (url.href === cloudflareUrl("/r2/buckets/quantgym-v2-preview-media/cors")) {
    return providerResponse(fixture.cloudflare.cors);
  }
  if (url.href === cloudflareUrl("/r2/buckets/quantgym-v2-preview-media/domains/managed")) {
    return providerResponse(fixture.cloudflare.managedDomain);
  }
  if (url.href === cloudflareUrl("/r2/buckets/quantgym-v2-preview-media/domains/custom")) {
    return providerResponse(fixture.cloudflare.customDomains);
  }
  if (url.href === "https://api.render.com/v1/services?limit=100") {
    return providerResponse(fixture.render.services);
  }
  if (url.href === "https://api.render.com/v1/env-groups?limit=100") {
    return providerResponse(fixture.render.envGroups);
  }
  if (url.href === "https://api.render.com/v1/postgres?limit=100") {
    return providerResponse(fixture.render.postgres);
  }
  const envVarsMatch = url.href.match(
    /^https:\/\/api\.render\.com\/v1\/services\/([^/]+)\/env-vars\?limit=100$/,
  );
  if (envVarsMatch) return providerResponse(fixture.render.envVars[envVarsMatch[1]] ?? []);
  const deployMatch = url.href.match(/^https:\/\/api\.render\.com\/v1\/services\/([^/]+)\/deploys\?limit=1$/);
  if (deployMatch) return providerResponse(fixture.render.deploys[deployMatch[1]] ?? []);
  const connectionInfoMatch = url.href.match(
    /^https:\/\/api\.render\.com\/v1\/postgres\/([^/]+)\/connection-info$/,
  );
  if (connectionInfoMatch) {
    return providerResponse(fixture.render.connectionInfo[connectionInfoMatch[1]] ?? {});
  }
  const recoveryMatch = url.href.match(
    /^https:\/\/api\.render\.com\/v1\/postgres\/([^/]+)\/recovery$/,
  );
  if (recoveryMatch) return providerResponse(fixture.render.recovery[recoveryMatch[1]] ?? {});
  throw new Error(`unexpected fixture request: ${url.href}`);
};

const providerEnv = () => ({
  NODE_ENV: "test",
  CLOUDFLARE_API_TOKEN: CF_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID,
  RENDER_API_KEY: RENDER_TOKEN,
  QUANTGYM_PREVIEW_WEB_URL: WEB_ORIGIN,
});

const buildProviderFixture = async (fixture = validProviderFixture(), options = {}) => {
  const root = await mkdtemp(path.join(tmpdir(), "quantgym-provider-evidence-"));
  const requests = [];
  try {
    const result = await buildFrontendUpgradeProviderEvidence({
      env: options.env ?? providerEnv(),
      expectedCommit: COMMIT,
      operator: "preview-operator",
      budgetOwner: "budget-owner",
      destroyOwner: "destroy-owner",
      r2CredentialScope: options.r2CredentialScope ?? "single-bucket-read-write",
      r2Jurisdiction: options.r2Jurisdiction ?? "default",
      productionR2Jurisdiction: options.productionR2Jurisdiction ?? "default",
      previewEnvironmentGroupIds: options.previewEnvironmentGroupIds
        ?? ["render-preview-group-raw-id"],
      [TEST_ONLY_PROVIDER_EVIDENCE]: {
        root,
        now: new Date("2026-07-13T08:09:10.000Z"),
        fetchImpl: options.fetchImpl ?? fixtureFetch(fixture, requests),
      },
    });
    const output = path.join(root, PROVIDER_OUTPUT);
    return {
      root,
      output,
      requests,
      evidence: JSON.parse(await readFile(output, "utf8")),
      result,
    };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
};

const cleanupProviderBuild = async (built) => {
  await rm(built.root, { recursive: true, force: true });
};

test("provider evidence selects only the exact redacted allowlist and hashes every identifier", async () => {
  const built = await buildProviderFixture();
  try {
    assert.deepEqual(await listFiles(built.root), [PROVIDER_OUTPUT]);
    assert.equal(built.result.output, built.output);
    assert.equal((await stat(built.output)).mode & 0o777, 0o600);
    assert.deepEqual(Object.keys(built.evidence), [
      "schemaVersion", "authenticatedSource", "capturedAt", "operator", "budgetOwner",
      "destroyOwner", "cloudflare", "render",
    ]);
    assert.deepEqual(Object.keys(built.evidence.cloudflare), [
      "accountIdHash", "pages", "productionPagesProjectIdHash", "r2",
      "productionR2BucketIdentityHash",
    ]);
    assert.deepEqual(Object.keys(built.evidence.cloudflare.pages), [
      "projectIdHash", "name", "productionBranch", "buildCommand", "destinationDir",
      "latestDeploymentCommit", "latestDeploymentStatus",
    ]);
    assert.deepEqual(Object.keys(built.evidence.cloudflare.r2), [
      "bucketIdentityHash", "bucketName", "jurisdiction", "endpointAccountIdHash", "private",
      "r2DevEnabled", "credentialScope", "signingRegion", "lifecycleDays", "corsOrigin",
    ]);
    assert.deepEqual(Object.keys(built.evidence.render), [
      "workspaceIdHash", "services", "productionServiceIdHashes",
      "previewAllowedGroupIdHashes", "productionGroupIdHashes", "postgres",
      "productionPostgresResourceIdHash",
    ]);
    assert.deepEqual(Object.keys(built.evidence.render.postgres), [
      "resourceIdHash", "hostHash", "databaseHash", "roleHash",
    ]);
    for (const service of built.evidence.render.services) {
      assert.deepEqual(Object.keys(service), [
        "serviceIdHash", "name", "type", "repo", "branch", "buildCommand", "startCommand",
        "nodeVersion", "linkedGroupIdHashes",
      ]);
    }

    assert.equal(built.evidence.schemaVersion, 1);
    assert.equal(
      built.evidence.authenticatedSource,
      "cloudflare-and-render-https-apis-plus-operator-r2-scope-attestation",
    );
    assert.equal(built.evidence.capturedAt, "2026-07-13T08:09:10.000Z");
    assert.equal(built.evidence.operator, "preview-operator");
    assert.equal(built.evidence.budgetOwner, "budget-owner");
    assert.equal(built.evidence.destroyOwner, "destroy-owner");
    assert.equal(built.evidence.cloudflare.accountIdHash, sha256(CF_ACCOUNT_ID));
    assert.equal(
      built.evidence.cloudflare.r2.bucketIdentityHash,
      r2IdentityHash(CF_ACCOUNT_ID, "quantgym-v2-preview-media", "default"),
    );
    assert.equal(built.evidence.cloudflare.r2.jurisdiction, "default");
    assert.equal(built.evidence.cloudflare.r2.signingRegion, "auto");
    assert.equal(built.evidence.cloudflare.r2.endpointAccountIdHash, sha256(CF_ACCOUNT_ID));

    const outputText = await readFile(built.output, "utf8");
    for (const forbidden of [
      CF_ACCOUNT_ID, CF_TOKEN, RENDER_TOKEN, "pages-preview-raw-id", "render-workspace-raw-id",
      "render-preview-api-raw-id", "render-preview-group-raw-id", "preview-postgres.internal",
      "quantgym_v2_preview_role", "pages-deployment-secret", "private-analytics-dataset",
      "r2-secret-that-must-be-discarded", "render-service-secret", "deploy-secret", "group-secret",
      "render-env-secret", "render-llm-env-secret", "workspace-owner-secret@example.com",
      "render-postgres-password-secret", "preview-r2-bucket-raw-id",
    ]) {
      assert.equal(outputText.includes(forbidden), false, forbidden);
    }
    assert.doesNotMatch(outputText, /(?:api|access|secret|bearer)[_-]?(?:key|token)\s*"?\s*:/i);
    for (const hash of outputText.match(/[a-f0-9]{64}/g) ?? []) assert.match(hash, /^[a-f0-9]{64}$/);

    assert.ok(built.requests.length >= 17);
    for (const expectedUrl of [
      cloudflareUrl("/r2/buckets/quantgym-v2-preview-media/domains/managed"),
      cloudflareUrl("/r2/buckets/quantgym-v2-preview-media/domains/custom"),
      "https://api.render.com/v1/services/render-preview-api-raw-id/env-vars?limit=100",
      "https://api.render.com/v1/services/render-preview-llm-raw-id/env-vars?limit=100",
      "https://api.render.com/v1/postgres/render-preview-postgres-raw-id/connection-info",
      "https://api.render.com/v1/postgres/render-preview-postgres-raw-id/recovery",
    ]) {
      assert.ok(built.requests.some((request) => request.url === expectedUrl), expectedUrl);
    }
    for (const request of built.requests) {
      const expected = request.url.includes("cloudflare.com") ? `Bearer ${CF_TOKEN}` : `Bearer ${RENDER_TOKEN}`;
      assert.equal(request.method, "GET");
      assert.equal(request.authorization, expected);
      assert.equal(
        request.r2Jurisdiction,
        request.url.includes("/r2/buckets/") ? "default" : null,
      );
    }
  } finally {
    await cleanupProviderBuild(built);
  }
});

test("provider evidence permits an empty production environment-group array", async () => {
  const fixture = validProviderFixture();
  fixture.render.envGroups = fixture.render.envGroups.filter(
    (envGroup) => envGroup.id !== "render-production-group-raw-id",
  );
  const built = await buildProviderFixture(fixture);
  try {
    assert.deepEqual(built.evidence.render.productionGroupIdHashes, []);
    assert.equal(built.evidence.render.previewAllowedGroupIdHashes.length, 1);
  } finally {
    await cleanupProviderBuild(built);
  }
});

test("provider evidence permits service-level-only Preview configuration", async () => {
  const fixture = validProviderFixture();
  fixture.render.envGroups = fixture.render.envGroups.filter(
    (envGroup) => envGroup.id !== "render-preview-group-raw-id",
  );
  const built = await buildProviderFixture(fixture, { previewEnvironmentGroupIds: [] });
  try {
    assert.deepEqual(built.evidence.render.previewAllowedGroupIdHashes, []);
    assert.ok(built.evidence.render.services.every(
      (service) => service.linkedGroupIdHashes.length === 0,
    ));
  } finally {
    await cleanupProviderBuild(built);
  }
});

test("provider evidence ignores environment groups owned by unrelated Render workspaces", async () => {
  const fixture = validProviderFixture();
  fixture.render.envGroups.push({
    id: "other-workspace-group-raw-id",
    name: "unrelated-shared-group",
    ownerId: "other-workspace-raw-id",
    serviceLinks: [],
  });
  const built = await buildProviderFixture(fixture);
  try {
    assert.equal(built.evidence.render.previewAllowedGroupIdHashes.length, 1);
    assert.equal(built.evidence.render.productionGroupIdHashes.length, 1);
  } finally {
    await cleanupProviderBuild(built);
  }
});

test("provider evidence follows Render environment-group pagination before proving isolation", async () => {
  const fixture = validProviderFixture();
  const firstPage = [
    { ...fixture.render.envGroups[0], cursor: "preview-group" },
    ...Array.from({ length: 99 }, (_, index) => ({
      id: `harmless-group-${index}`,
      name: `harmless-${index}`,
      ownerId: "render-workspace-raw-id",
      serviceLinks: [],
      cursor: index === 98 ? "environment-groups-page-two" : `harmless-${index}`,
    })),
  ];
  const secondPage = [{
    id: "late-unlisted-group",
    name: "late-unlisted",
    ownerId: "render-workspace-raw-id",
    serviceLinks: [{
      id: "render-preview-api-raw-id",
      name: "quantgym-v2-preview-api",
      type: "web_service",
    }],
  }];
  const fallback = fixtureFetch(fixture);
  let requestedSecondPage = false;
  const fetchImpl = async (input, init) => {
    const url = new URL(input);
    if (url.href === "https://api.render.com/v1/env-groups?limit=100") {
      return providerResponse(firstPage);
    }
    if (
      url.href
      === "https://api.render.com/v1/env-groups?limit=100&cursor=environment-groups-page-two"
    ) {
      requestedSecondPage = true;
      return providerResponse(secondPage);
    }
    return fallback(input, init);
  };

  await assert.rejects(
    () => buildProviderFixture(fixture, { fetchImpl }),
    /complete linked-group set.*subset of approved groups/i,
  );
  assert.equal(requestedSecondPage, true);
});

test("provider evidence follows service env-var pagination and discards non-allowlisted values", async () => {
  const fixture = validProviderFixture();
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    envVar: { key: `PRIVATE_${index}`, value: `paginated-secret-${index}` },
    cursor: index === 99 ? "api-env-page-two" : `api-env-${index}`,
  }));
  const fallback = fixtureFetch(fixture);
  let requestedSecondPage = false;
  const fetchImpl = async (input, init) => {
    const url = new URL(input);
    if (
      url.href
      === "https://api.render.com/v1/services/render-preview-api-raw-id/env-vars?limit=100"
    ) {
      return providerResponse(firstPage);
    }
    if (
      url.href
      === "https://api.render.com/v1/services/render-preview-api-raw-id/env-vars?limit=100&cursor=api-env-page-two"
    ) {
      requestedSecondPage = true;
      return providerResponse([
        {
          envVar: { key: "NODE_VERSION", value: NODE_VERSION },
          cursor: "api-node-version",
        },
        {
          envVar: {
            key: "QUANTGYM_PREVIEW_LLM_INTERNAL_URL",
            value: "http://quantgym-v2-preview-llm:10000",
          },
          cursor: "api-llm-origin",
        },
      ]);
    }
    return fallback(input, init);
  };

  const built = await buildProviderFixture(fixture, { fetchImpl });
  try {
    assert.equal(requestedSecondPage, true);
    assert.doesNotMatch(await readFile(built.output, "utf8"), /paginated-secret-/);
  } finally {
    await cleanupProviderBuild(built);
  }
});

for (const [label, webUrl] of [
  ["unrelated web origin", "https://pages.attacker.test"],
  ["lookalike web origin", "https://evilquantgym-v2-preview.attacker.test"],
  ["port-bearing web origin", "https://quantgym-v2-preview.pages.dev:8443"],
]) {
  test(`provider evidence rejects an ${label}`, async () => {
    await assert.rejects(
      () => buildProviderFixture(validProviderFixture(), {
        env: { ...providerEnv(), QUANTGYM_PREVIEW_WEB_URL: webUrl },
      }),
      /QUANTGYM_PREVIEW_WEB_URL must use the Preview Pages project/i,
    );
  });
}

for (const [label, mutate, diagnostic] of [
  ["Pages branch", (fixture) => { fixture.cloudflare.previewPages.result.source.config.production_branch = "main"; }, "Pages production branch"],
  ["Pages repository owner", (fixture) => { fixture.cloudflare.previewPages.result.source.config.owner = "attacker"; }, "Pages repository"],
  ["Pages repository name", (fixture) => { fixture.cloudflare.previewPages.result.source.config.repo_name = "Other"; }, "Pages repository"],
  ["Pages build command", (fixture) => { fixture.cloudflare.previewPages.result.build_config.build_command = "npm run build"; }, "Pages build command"],
  ["Pages destination", (fixture) => { fixture.cloudflare.previewPages.result.build_config.destination_dir = "dist"; }, "Pages destination"],
  ["Pages deployment branch", (fixture) => { fixture.cloudflare.previewPages.result.latest_deployment.deployment_trigger.metadata.branch = "main"; }, "Pages deployment branch"],
  ["Pages deployment commit", (fixture) => { fixture.cloudflare.previewPages.result.latest_deployment.deployment_trigger.metadata.commit_hash = "wrong"; }, "Pages deployment commit"],
  ["Pages deployment status", (fixture) => { fixture.cloudflare.previewPages.result.latest_deployment.latest_stage.status = "failure"; }, "Pages deployment status"],
  ["production Pages project name", (fixture) => { fixture.cloudflare.productionPages.result.name = "other-pages"; }, "production Pages project name"],
  ["API service type", (fixture) => { fixture.render.services[0].service.type = "private_service"; }, "API service type"],
  ["LLM service type", (fixture) => { fixture.render.services[1].service.type = "web_service"; }, "LLM service type"],
  ["Render repository", (fixture) => { fixture.render.services[0].service.repo = "https://github.com/attacker/QuantGym"; }, "Render repository"],
  ["Render branch", (fixture) => { fixture.render.services[1].service.branch = "main"; }, "Render branch"],
  ["Render build command", (fixture) => { fixture.render.services[0].service.serviceDetails.envSpecificDetails.buildCommand = "npm run build"; }, "Render build command"],
  ["Render start command", (fixture) => { fixture.render.services[1].service.serviceDetails.envSpecificDetails.startCommand = "node server.mjs"; }, "Render start command"],
  ["API service runtime", (fixture) => { fixture.render.services[0].service.serviceDetails.runtime = "python"; }, "API service runtime"],
  ["LLM service runtime", (fixture) => { fixture.render.services[1].service.serviceDetails.runtime = "ruby"; }, "LLM service runtime"],
  ["Render service region", (fixture) => { fixture.render.services[1].service.serviceDetails.region = "singapore"; }, "Render Preview service region"],
  ["Render LLM service address", (fixture) => { fixture.render.services[1].service.serviceDetails.url = "https://quantgym-v2-preview-llm.onrender.com"; }, "Render LLM service address"],
  ["Render LLM suffixed service address", (fixture) => { fixture.render.services[1].service.serviceDetails.url = "quantgym-v2-preview-llm-ab1c:10000"; }, "Render LLM service address"],
  ["Render API LLM binding", (fixture) => { fixture.render.envVars["render-preview-api-raw-id"][1].envVar.value = "http://quantgym-v2-preview-llm:10001"; }, "Render API LLM private-service binding"],
  ["missing Render API LLM binding", (fixture) => { fixture.render.envVars["render-preview-api-raw-id"] = fixture.render.envVars["render-preview-api-raw-id"].filter((entry) => entry.envVar.key !== "QUANTGYM_PREVIEW_LLM_INTERNAL_URL"); }, "Render API LLM internal URL must be configured exactly once"],
  ["Render Node version", (fixture) => { fixture.render.envVars["render-preview-api-raw-id"][0].envVar.value = "22"; }, "Render Node version"],
  ["missing Render Node version", (fixture) => { fixture.render.envVars["render-preview-llm-raw-id"] = []; }, "Render Node version"],
  ["duplicate Render Node version", (fixture) => { fixture.render.envVars["render-preview-api-raw-id"].push({ envVar: { key: "NODE_VERSION", value: NODE_VERSION }, cursor: "duplicate-node" }); }, "Render Node version"],
  ["Render deployment commit", (fixture) => { fixture.render.deploys["render-preview-api-raw-id"][0].deploy.commit.id = "wrong"; }, "Render deployment commit"],
  ["Render deployment status", (fixture) => { fixture.render.deploys["render-preview-llm-raw-id"][0].deploy.status = "build_failed"; }, "Render deployment status"],
]) {
  test(`provider evidence rejects an incorrect ${label}`, async () => {
    const fixture = validProviderFixture();
    mutate(fixture);
    await assert.rejects(() => buildProviderFixture(fixture), new RegExp(diagnostic, "i"));
  });
}

test("provider evidence rejects overlapping Preview and production groups", async () => {
  const fixture = validProviderFixture();
  fixture.render.envGroups[1].serviceLinks.push({
    id: "render-preview-api-raw-id",
    name: "quantgym-v2-preview-api",
    type: "web_service",
  });
  await assert.rejects(
    () => buildProviderFixture(fixture),
    /Preview and production environment groups must be disjoint/i,
  );
});

test("provider evidence rejects a Preview service linked outside the complete allowed set", async () => {
  const fixture = validProviderFixture();
  fixture.render.envGroups.push({
    id: "unlisted-group-raw-id",
    name: "shared-unlisted",
    ownerId: "render-workspace-raw-id",
    serviceLinks: [{
      id: "render-preview-api-raw-id",
      name: "quantgym-v2-preview-api",
      type: "web_service",
    }],
  });
  await assert.rejects(
    () => buildProviderFixture(fixture),
    /complete linked-group set.*subset of approved groups/i,
  );
});

test("provider evidence never treats a Preview-looking environment-group name as approval", async () => {
  const fixture = validProviderFixture();
  fixture.render.envGroups.push({
    id: "lookalike-preview-group-raw-id",
    name: "quantgym-v2-preview-production-secrets",
    ownerId: "render-workspace-raw-id",
    serviceLinks: [{
      id: "render-preview-llm-raw-id",
      name: "quantgym-v2-preview-llm",
      type: "private_service",
    }],
  });
  await assert.rejects(
    () => buildProviderFixture(fixture),
    /complete linked-group set.*subset of approved groups/i,
  );
});

test("provider evidence rejects an approved Preview group that was not returned uniquely", async () => {
  await assert.rejects(
    () => buildProviderFixture(validProviderFixture(), {
      previewEnvironmentGroupIds: ["missing-preview-group-raw-id"],
    }),
    /approved Preview environment group must exist uniquely/i,
  );
});

test("provider evidence rejects duplicate approved Preview group IDs", async () => {
  await assert.rejects(
    () => buildProviderFixture(validProviderFixture(), {
      previewEnvironmentGroupIds: [
        "render-preview-group-raw-id",
        "render-preview-group-raw-id",
      ],
    }),
    /Preview environment group IDs must be unique/i,
  );
});

test("provider evidence rejects an approved Preview group linked to an unrelated service", async () => {
  const fixture = validProviderFixture();
  fixture.render.envGroups[0].serviceLinks.push({
    id: "unrelated-service-raw-id",
    name: "unrelated-service",
    type: "web_service",
  });
  await assert.rejects(
    () => buildProviderFixture(fixture),
    /approved Preview environment groups must link only Preview services/i,
  );
});

test("provider evidence rejects a cross-workspace group that links a scoped service", async () => {
  const fixture = validProviderFixture();
  fixture.render.envGroups.push({
    id: "cross-workspace-group-raw-id",
    name: "cross-workspace-group",
    ownerId: "other-workspace-raw-id",
    serviceLinks: [{
      id: "render-preview-api-raw-id",
      name: "quantgym-v2-preview-api",
      type: "web_service",
    }],
  });
  await assert.rejects(
    () => buildProviderFixture(fixture),
    /service links must stay inside the service workspace/i,
  );
});

for (const [label, mutate, diagnostic] of [
  ["enabled r2.dev", (fixture) => { fixture.cloudflare.managedDomain.result.enabled = true; }, "r2.dev must be disabled"],
  ["an attached R2 custom domain", (fixture) => { fixture.cloudflare.customDomains.result.domains.push({ domain: "media.example.com", enabled: false }); }, "R2 custom domains must be absent"],
  ["wrong lifecycle prefix", (fixture) => { fixture.cloudflare.lifecycle.result.rules[0].conditions.prefix = "tmp/"; }, "R2 lifecycle"],
  ["wrong lifecycle days", (fixture) => { fixture.cloudflare.lifecycle.result.rules[0].deleteObjectsTransition.condition.maxAge = 30 * 24 * 60 * 60; }, "R2 lifecycle"],
  ["date-based lifecycle rule", (fixture) => { fixture.cloudflare.lifecycle.result.rules[0].deleteObjectsTransition.condition.type = "Date"; }, "R2 lifecycle"],
  ["disabled lifecycle rule", (fixture) => { fixture.cloudflare.lifecycle.result.rules[0].enabled = false; }, "R2 lifecycle"],
  ["production CORS origin", (fixture) => { fixture.cloudflare.cors.result.rules[0].allowed.origins = ["https://beta.quantgym.app"]; }, "R2 CORS origin"],
]) {
  test(`provider evidence rejects ${label}`, async () => {
    const fixture = validProviderFixture();
    mutate(fixture);
    await assert.rejects(() => buildProviderFixture(fixture), new RegExp(diagnostic, "i"));
  });
}

test("provider evidence rejects an unconfirmed single-bucket R2 credential scope", async () => {
  await assert.rejects(
    () => buildProviderFixture(validProviderFixture(), { r2CredentialScope: "account-wide" }),
    /R2 credential scope confirmation must equal single-bucket-read-write/i,
  );
});

test("provider evidence sends an explicit non-default jurisdiction on every Preview R2 request", async () => {
  const fixture = validProviderFixture();
  fixture.cloudflare.previewR2.result.jurisdiction = "eu";
  const built = await buildProviderFixture(fixture, { r2Jurisdiction: "eu" });
  try {
    const previewR2Requests = built.requests.filter(
      (request) => request.url.includes("/r2/buckets/quantgym-v2-preview-media"),
    );
    assert.ok(previewR2Requests.length >= 5);
    assert.ok(previewR2Requests.every((request) => request.r2Jurisdiction === "eu"));
    assert.equal(built.evidence.cloudflare.r2.jurisdiction, "eu");
  } finally {
    await cleanupProviderBuild(built);
  }
});

test("provider evidence rejects a jurisdiction response that differs from the explicit selector", async () => {
  const fixture = validProviderFixture();
  fixture.cloudflare.previewR2.result.jurisdiction = "eu";
  await assert.rejects(
    () => buildProviderFixture(fixture),
    /Preview R2 jurisdiction must equal default/i,
  );
});

for (const [label, mutate, diagnostic] of [
  ["wrong Postgres workspace", (fixture) => { fixture.render.postgres[0].postgres.owner.id = "other-workspace"; }, "Render Postgres workspace"],
  ["Postgres without recovery backups", (fixture) => { fixture.render.recovery["render-preview-postgres-raw-id"].recoveryStatus = "NOT_AVAILABLE"; }, "Preview Postgres must have a recovery backup policy"],
  ["unavailable Postgres", (fixture) => { fixture.render.postgres[0].postgres.status = "suspended"; }, "Preview Postgres status"],
  ["invalid Postgres connection info", (fixture) => { fixture.render.connectionInfo["render-preview-postgres-raw-id"].externalConnectionString = "not-a-postgres-url"; }, "Preview Postgres connection info"],
  ["mismatched Postgres connection role", (fixture) => { fixture.render.connectionInfo["render-preview-postgres-raw-id"].externalConnectionString = "postgresql://other-role:secret@preview-postgres.render.com/quantgym_v2_preview"; }, "Preview Postgres connection info"],
  ["mismatched Postgres connection database", (fixture) => { fixture.render.connectionInfo["render-preview-postgres-raw-id"].externalConnectionString = "postgresql://quantgym_v2_preview_role:secret@preview-postgres.render.com/other_database"; }, "Preview Postgres connection info"],
]) {
  test(`provider evidence rejects ${label}`, async () => {
    const fixture = validProviderFixture();
    mutate(fixture);
    await assert.rejects(() => buildProviderFixture(fixture), new RegExp(diagnostic, "i"));
  });
}

test("provider evidence rejects duplicate named resources across Render workspaces", async () => {
  const fixture = validProviderFixture();
  fixture.render.services.push({
    service: {
      ...fixture.render.services[0].service,
      id: "duplicate-preview-api-raw-id",
      ownerId: "other-workspace-raw-id",
    },
  });
  await assert.rejects(
    () => buildProviderFixture(fixture),
    /Render service quantgym-v2-preview-api must be unique/i,
  );
});

for (const [label, mutate, diagnostic] of [
  ["Pages identity reuse", (fixture) => { fixture.cloudflare.productionPages.result.id = "pages-preview-raw-id"; }, "Pages identity must differ from production"],
  ["production R2 name mismatch", (fixture) => { fixture.cloudflare.productionR2.result.name = "quantgym-v2-preview-media"; }, "production R2 bucket name"],
  ["invalid R2 jurisdiction", (fixture) => { fixture.cloudflare.previewR2.result.jurisdiction = "moon"; }, "R2 jurisdiction"],
  ["Preview service identity reuse", (fixture) => { fixture.render.services[1].service.id = "render-preview-api-raw-id"; }, "Preview API and LLM service identities must differ"],
  ["production service identity reuse", (fixture) => { fixture.render.services[3].service.id = "render-production-api-raw-id"; }, "production API and LLM service identities must differ"],
  ["Render service identity reuse", (fixture) => { fixture.render.services[2].service.id = "render-preview-api-raw-id"; }, "Render service identity must differ from production"],
  ["Postgres resource reuse", (fixture) => { fixture.render.postgres[1].postgres.id = "render-preview-postgres-raw-id"; }, "Postgres resource identity must differ from production"],
  ["Postgres database reuse", (fixture) => { fixture.render.postgres[1].postgres.databaseName = "quantgym_v2_preview"; }, "Postgres database must differ from production"],
  ["Postgres role reuse", (fixture) => { fixture.render.postgres[1].postgres.databaseUser = "quantgym_v2_preview_role"; }, "Postgres role must differ from production"],
]) {
  test(`provider evidence rejects ${label}`, async () => {
    const fixture = validProviderFixture();
    mutate(fixture);
    await assert.rejects(() => buildProviderFixture(fixture), new RegExp(diagnostic, "i"));
  });
}

test("provider HTTP failures expose only provider, status, and a non-sensitive request id", async () => {
  const responseBodySecret = "raw-provider-secret-body";
  const fetchImpl = async (input) => {
    const url = new URL(input);
    if (url.hostname === "api.cloudflare.com") {
      return providerResponse(
        { errors: [{ message: responseBodySecret }], token: CF_TOKEN },
        { status: 503, requestId: "safe-cf-request-id" },
      );
    }
    throw new Error("Render must not be reached after the first failure");
  };

  let captured;
  try {
    await buildProviderFixture(validProviderFixture(), { fetchImpl });
  } catch (error) {
    captured = error;
  }
  assert.ok(captured);
  assert.equal(
    captured.message,
    "Cloudflare request failed (status 503, request id safe-cf-request-id)",
  );
  assert.doesNotMatch(captured.stack, new RegExp(`${responseBodySecret}|${CF_TOKEN}`));
});

test("provider HTTP failures suppress a credential-shaped request id", async () => {
  const fetchImpl = async () => providerResponse(
    { errors: [{ message: "private body" }] },
    { status: 502, requestId: CF_TOKEN },
  );

  await assert.rejects(
    () => buildProviderFixture(validProviderFixture(), { fetchImpl }),
    (error) => {
      assert.equal(
        error.message,
        "Cloudflare request failed (status 502, request id unavailable)",
      );
      assert.doesNotMatch(error.stack, new RegExp(CF_TOKEN));
      return true;
    },
  );
});

test("provider HTTP failures suppress a request id containing an operator identifier", async () => {
  const fetchImpl = async () => providerResponse(
    { errors: [{ message: "private body" }] },
    { status: 502, requestId: `prefix-${CF_ACCOUNT_ID.toUpperCase()}-suffix` },
  );

  await assert.rejects(
    () => buildProviderFixture(validProviderFixture(), { fetchImpl }),
    (error) => {
      assert.equal(
        error.message,
        "Cloudflare request failed (status 502, request id unavailable)",
      );
      assert.doesNotMatch(error.stack, new RegExp(CF_ACCOUNT_ID, "i"));
      return true;
    },
  );
});

test("provider HTTP failures suppress a request id containing a selected raw resource ID", async () => {
  const fixture = validProviderFixture();
  const fallback = fixtureFetch(fixture);
  const fetchImpl = async (input, init) => {
    const url = new URL(input);
    if (
      url.href
      === "https://api.render.com/v1/services/render-preview-api-raw-id/env-vars?limit=100"
    ) {
      return providerResponse(
        { message: "private body" },
        { status: 502, requestId: "trace-render-preview-api-raw-id" },
      );
    }
    return fallback(input, init);
  };

  await assert.rejects(
    () => buildProviderFixture(fixture, { fetchImpl }),
    (error) => {
      assert.equal(
        error.message,
        "Render request failed (status 502, request id unavailable)",
      );
      assert.doesNotMatch(error.stack, /render-preview-api-raw-id/i);
      return true;
    },
  );
});

test("provider fixture injection is unavailable outside an explicit test environment", async () => {
  let requested = false;
  await assert.rejects(
    () => buildFrontendUpgradeProviderEvidence({
      env: { ...providerEnv(), NODE_ENV: "production" },
      expectedCommit: COMMIT,
      operator: "preview-operator",
      budgetOwner: "budget-owner",
      destroyOwner: "destroy-owner",
      [TEST_ONLY_PROVIDER_EVIDENCE]: {
        root: projectRoot,
        now: new Date("2026-07-13T08:09:10.000Z"),
        fetchImpl: async () => {
          requested = true;
          throw new Error("must not request");
        },
      },
    }),
    /test-only provider injection requires NODE_ENV=test/i,
  );
  assert.equal(requested, false);
});

test("the provider CLI validates all operator-only credentials before making a request and never echoes them", () => {
  const result = spawnSync(
    process.execPath,
    [
      providerBuilderPath,
      "--expected-commit", COMMIT,
      "--operator", "preview-operator",
      "--budget-owner", "budget-owner",
      "--destroy-owner", "destroy-owner",
    ],
    {
      cwd: projectRoot,
      env: {
        PATH: process.env.PATH,
        CLOUDFLARE_API_TOKEN: CF_TOKEN,
        CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID,
        RENDER_API_KEY: "",
        QUANTGYM_PREVIEW_WEB_URL: WEB_ORIGIN,
      },
      encoding: "utf8",
      timeout: 3_000,
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /^FAIL: RENDER_API_KEY is required\n$/);
  assert.doesNotMatch(result.stderr, new RegExp(`${CF_TOKEN}|${CF_ACCOUNT_ID}`));
});

test("the provider CLI requires explicit R2 scope confirmation before any network request", () => {
  const result = spawnSync(
    process.execPath,
    [
      providerBuilderPath,
      "--expected-commit", COMMIT,
      "--operator", "preview-operator",
      "--budget-owner", "budget-owner",
      "--destroy-owner", "destroy-owner",
    ],
    {
      cwd: projectRoot,
      env: {
        PATH: process.env.PATH,
        CLOUDFLARE_API_TOKEN: CF_TOKEN,
        CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID,
        RENDER_API_KEY: RENDER_TOKEN,
        QUANTGYM_PREVIEW_WEB_URL: WEB_ORIGIN,
      },
      encoding: "utf8",
      timeout: 3_000,
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "FAIL: R2 credential scope confirmation is required\n");
  assert.doesNotMatch(result.stderr, new RegExp(`${CF_TOKEN}|${CF_ACCOUNT_ID}|${RENDER_TOKEN}`));
});

test("the provider CLI requires explicit R2 jurisdictions before any network request", () => {
  const result = spawnSync(
    process.execPath,
    [
      providerBuilderPath,
      "--expected-commit", COMMIT,
      "--operator", "preview-operator",
      "--budget-owner", "budget-owner",
      "--destroy-owner", "destroy-owner",
      "--r2-credential-scope", "single-bucket-read-write",
    ],
    {
      cwd: projectRoot,
      env: {
        PATH: process.env.PATH,
        CLOUDFLARE_API_TOKEN: CF_TOKEN,
        CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID,
        RENDER_API_KEY: RENDER_TOKEN,
        QUANTGYM_PREVIEW_WEB_URL: WEB_ORIGIN,
      },
      encoding: "utf8",
      timeout: 3_000,
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "FAIL: Preview R2 jurisdiction is required\n");
  assert.doesNotMatch(result.stderr, new RegExp(`${CF_TOKEN}|${CF_ACCOUNT_ID}|${RENDER_TOKEN}`));
});

const parseTemplate = (source) => source.trimEnd().split("\n").map((line) => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=$/);
  assert.ok(match, `expected a blank NAME= line, got ${JSON.stringify(line)}`);
  return match[1];
});

test("the packet builder writes exactly the approved eleven-file operator packet", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-preview-packet-"));
  try {
    const result = spawnSync(
      process.execPath,
      [packetBuilderPath, "--out-dir", fixtureRoot],
      { cwd: projectRoot, env: { PATH: process.env.PATH }, encoding: "utf8" },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.deepEqual(await listFiles(fixtureRoot), PACKET_FILES);

    const scopes = {
      "cloudflare-pages-env-template.txt": previewContract.environmentVariablesByScope.cloudflarePages,
      "render-api-env-template.txt": previewContract.environmentVariablesByScope.renderApi,
      "render-llm-env-template.txt": previewContract.environmentVariablesByScope.renderLlm,
      "operator-live-check-env-template.txt": [
        ...previewContract.environmentVariablesByScope.operatorSecrets,
        ...previewContract.environmentVariablesByScope.operatorEvidence,
      ],
    };
    for (const [file, expectedNames] of Object.entries(scopes)) {
      const source = await readFile(path.join(fixtureRoot, file), "utf8");
      assert.deepEqual(parseTemplate(source), expectedNames, file);
      assert.doesNotMatch(source, /=\S/);
    }
    const operatorTemplate = await readFile(
      path.join(fixtureRoot, "operator-live-check-env-template.txt"),
      "utf8",
    );
    assert.match(operatorTemplate, /^CLOUDFLARE_API_TOKEN=$/m);
    assert.match(operatorTemplate, /^CLOUDFLARE_ACCOUNT_ID=$/m);
    assert.match(operatorTemplate, /^RENDER_API_KEY=$/m);

    const schema = JSON.parse(
      await readFile(path.join(fixtureRoot, "provider-evidence-schema.json"), "utf8"),
    );
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.required, [
      "schemaVersion", "authenticatedSource", "capturedAt", "operator", "budgetOwner",
      "destroyOwner", "cloudflare", "render",
    ]);
    assert.deepEqual(schema.properties.cloudflare.required, [
      "accountIdHash", "pages", "productionPagesProjectIdHash", "r2",
      "productionR2BucketIdentityHash",
    ]);
    assert.deepEqual(schema.properties.render.required, [
      "workspaceIdHash", "services", "productionServiceIdHashes",
      "previewAllowedGroupIdHashes", "productionGroupIdHashes", "postgres",
      "productionPostgresResourceIdHash",
    ]);
    assert.deepEqual(
      schema.properties.render.properties.services.allOf.map((rule) => ({
        name: rule.contains.properties.name.const,
        type: rule.contains.properties.type.const,
        minContains: rule.minContains,
        maxContains: rule.maxContains,
      })),
      [
        {
          name: "quantgym-v2-preview-api",
          type: "web_service",
          minContains: 1,
          maxContains: 1,
        },
        {
          name: "quantgym-v2-preview-llm",
          type: "private_service",
          minContains: 1,
          maxContains: 1,
        },
      ],
    );
    assert.deepEqual(
      {
        minItems: schema.properties.render.properties.productionServiceIdHashes.minItems,
        maxItems: schema.properties.render.properties.productionServiceIdHashes.maxItems,
        uniqueItems: schema.properties.render.properties.productionServiceIdHashes.uniqueItems,
      },
      { minItems: 2, maxItems: 2, uniqueItems: true },
    );

    const combined = (await Promise.all(
      PACKET_FILES.map((file) => readFile(path.join(fixtureRoot, file), "utf8")),
    )).join("\n");
    for (const required of [
      "quantgym-v2-preview",
      BRANCH,
      PAGE_BUILD,
      "dist-preview",
      "quantgym-v2-preview-api",
      "quantgym-v2-preview-llm",
      "web_service",
      "private_service",
      NODE_VERSION,
      RENDER_BUILD,
      RENDER_START,
      "/api/v2/health",
      "https://beta.quantgym.app",
      "quantgym-v2-preview-postgres",
      "quantgym-v2-preview-media",
      "readiness-smoke/",
      "7-day",
      "reserved, independently verified resources",
      "Phase 1",
      "budget owner",
      "data-reset owner",
      "resource expiry/review date",
      "rollback",
      "destroy",
      PROVIDER_OUTPUT,
      "SHA-256",
      "unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID RENDER_API_KEY",
      "--r2-credential-scope single-bucket-read-write",
      "--r2-jurisdiction",
      "--production-r2-jurisdiction",
      "--preview-environment-group-id",
      "cloudflare-and-render-https-apis-plus-operator-r2-scope-attestation",
    ]) {
      assert.ok(combined.includes(required), required);
    }
    assert.match(combined, /browser receives only the Preview API base/i);
    assert.match(combined, /no OpenAI key is configured anywhere in the Phase 0 probes/i);
    assert.match(combined, /no current app bundle.*v1 catalog.*private question data.*jobs data.*root runtime config.*Google OAuth config.*browser LLM endpoint/is);
    assert.match(combined, /no use of .*import-api-sqlite-export-to-postgres\.py.*schema\.sql/is);
    assert.match(combined, /raw provider responses.*must never be (?:saved|written)/i);
    assert.match(combined, /read-only Cloudflare R2 API.*does not expose.*credential scope/is);
    assert.match(
      combined,
      /unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID RENDER_API_KEY/,
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("the tracked runbook carries the exact provider, isolation, and secret-handling instructions", async () => {
  const source = await readFile(
    new URL("../docs/frontend-upgrade/preview-environment-runbook.md", import.meta.url),
    "utf8",
  );
  for (const exact of [
    "`quantgym-v2-preview`",
    "`codex/frontend-v2-preview`",
    `\`${PAGE_BUILD}\``,
    "`dist-preview`",
    "`quantgym-v2-preview-api`",
    "`quantgym-v2-preview-llm`",
    "`web_service`",
    "`private_service`",
    "`20.20.2`",
    `\`${RENDER_START}\``,
    "`QUANTGYM_PREVIEW_LLM_INTERNAL_URL`",
    "`QUANTGYM_PREVIEW_CORS_ORIGIN`",
    "`https://beta.quantgym.app`",
    "`quantgym-v2-preview-postgres`",
    "`quantgym-v2-preview-media`",
    "`readiness-smoke/`",
    "`auto`",
    PROVIDER_OUTPUT,
  ]) assert.ok(source.includes(exact), exact);
  assert.match(source, /PostgreSQL and R2 are reserved, independently verified resources in Phase 0/i);
  assert.match(source, /temporary API probe is intentionally not bound to either/i);
  assert.match(source, /Phase 1 performs the first application binding and schema migration/i);
  assert.match(source, /browser receives only the Preview API base/i);
  assert.match(source, /never receives an OpenAI key, R2 secret, Postgres URL, or internal LLM URL/i);
  assert.match(source, /tokens are operator-only.*unset after the check/is);
  assert.match(source, /raw provider responses.*never.*disk/is);
  assert.match(source, /HTTP failures.*provider name.*status code.*request ID/is);
  assert.match(source, /--r2-credential-scope single-bucket-read-write/);
  assert.match(source, /--r2-jurisdiction default/);
  assert.match(source, /--production-r2-jurisdiction default/);
  assert.match(source, /--preview-environment-group-id PREVIEW_ENV_GROUP_ID/);
  assert.match(source, /NODE_VERSION=20\.20\.2.*directly on each service/is);
  assert.match(source, /same Render region/i);
  assert.match(source, /exact LLM Dashboard Service Address host quantgym-v2-preview-llm and its assigned port/i);
  assert.doesNotMatch(source, /<render-hash>/);
  assert.match(source, /binds? that origin to the authenticated LLM private-service address/i);
  assert.match(source, /read-only Cloudflare R2 API.*does not expose.*credential scope/is);
  assert.match(source, /generate the operator packet before capturing provider evidence/i);
  assert.match(
    source,
    /unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID RENDER_API_KEY/,
  );
});

test("package scripts and ignore rules expose exactly the four Task 9 commands", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(
    Object.fromEntries([
      "build:frontend-upgrade:preview-packet",
      "build:frontend-upgrade:preview-web",
      "build:frontend-upgrade:provider-evidence",
      "serve:frontend-upgrade:preview-probe",
    ].map((name) => [name, packageJson.scripts[name]])),
    {
      "build:frontend-upgrade:preview-packet": "node scripts/build-frontend-upgrade-preview-packet.mjs",
      "build:frontend-upgrade:preview-web": "node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview",
      "build:frontend-upgrade:provider-evidence": "node scripts/build-frontend-upgrade-provider-evidence.mjs",
      "serve:frontend-upgrade:preview-probe": "node scripts/serve-frontend-upgrade-preview-probe.mjs",
    },
  );
  const ignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");
  assert.equal(ignore.split("\n").filter((line) => line === "dist-preview/").length, 1);
});
