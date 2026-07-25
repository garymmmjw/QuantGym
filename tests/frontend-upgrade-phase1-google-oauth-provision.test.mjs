// All provider behavior in this suite is implemented by in-memory fakes.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  __test,
} from "../scripts/provision-frontend-upgrade-preview-google-oauth.mjs";

const {
  GOOGLE_REDIRECT_URI,
  INPUT_KEYS,
  OperationError,
  RENDER_API_SERVICE_ID,
  RENDER_API_SERVICE_NAME,
  RENDER_API_BUILD_COMMAND,
  RENDER_API_HEALTH_PATH,
  RENDER_API_START_COMMAND,
  RENDER_BRANCH,
  RENDER_CLIENT_ID_KEY,
  RENDER_CLIENT_SECRET_KEY,
  RENDER_LLM_SERVICE_ID,
  RENDER_LLM_SERVICE_NAME,
  RENDER_PREVIEW_BINDINGS,
  RENDER_PREVIEW_GROUP_NAME,
  RENDER_REPOSITORY,
  REQUIRED_NODE_VERSION,
  TEST_ONLY_GOOGLE_OAUTH,
  createRenderAdapter,
  parseCredentialPayload,
  requireExactNodeVersion,
  runOperation,
  serializeOutput,
  sha256,
  topLevelJsonObjectKeys,
  verifyPreviewEnvironment,
  verifyRenderService,
} = __test;

const RENDER_TOKEN = `rnd_${"r".repeat(40)}`;
const CLIENT_ID = `${"1234567890-preview"}.apps.googleusercontent.com`;
const CLIENT_SECRET = `GOCSPX-${"s".repeat(32)}`;
const OLD_CLIENT_ID = `${"9876543210-preview"}.apps.googleusercontent.com`;
const OLD_CLIENT_SECRET = `GOCSPX-${"o".repeat(32)}`;
const TEST_GROUP_ID = "evg-preview-offline-fixture";
const TEST_GROUP_ID_HASH = sha256(TEST_GROUP_ID);
const TEST_OWNER_ID = "tea-preview-offline-fixture";
const SCRIPT_PATH = fileURLToPath(new URL(
  "../scripts/provision-frontend-upgrade-preview-google-oauth.mjs",
  import.meta.url,
));

assert.equal(
  process.versions.node,
  REQUIRED_NODE_VERSION,
  "OAuth provisioning tests require the repository's exact Node runtime",
);
process.env.NODE_ENV = "test";

const credentialsPayload = (overrides = {}) => ({
  [RENDER_CLIENT_ID_KEY]: CLIENT_ID,
  [RENDER_CLIENT_SECRET_KEY]: CLIENT_SECRET,
  ...overrides,
});

const baseEnvironment = (overrides = {}) => new Map([
  ...Object.entries(RENDER_PREVIEW_BINDINGS),
  ["QUANTGYM_GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI],
  ...Object.entries(overrides),
]);

const exactService = (overrides = {}) => ({
  id: RENDER_API_SERVICE_ID,
  name: RENDER_API_SERVICE_NAME,
  type: "web_service",
  ownerId: TEST_OWNER_ID,
  repo: RENDER_REPOSITORY,
  branch: RENDER_BRANCH,
  rootDir: "api",
  autoDeploy: "no",
  serviceDetails: {
    runtime: "python",
    healthCheckPath: RENDER_API_HEALTH_PATH,
    envSpecificDetails: {
      buildCommand: RENDER_API_BUILD_COMMAND,
      startCommand: RENDER_API_START_COMMAND,
    },
  },
  ...overrides,
});

const makeMemoryAdapter = ({
  environment = baseEnvironment(),
  service = exactService(),
  groups = [{
    id: TEST_GROUP_ID,
    name: RENDER_PREVIEW_GROUP_NAME,
    ownerId: TEST_OWNER_ID,
    serviceLinks: [
      {
        id: RENDER_API_SERVICE_ID,
        name: RENDER_API_SERVICE_NAME,
      },
      {
        id: RENDER_LLM_SERVICE_ID,
        name: RENDER_LLM_SERVICE_NAME,
      },
    ],
  }],
  groupEnvironment = [],
  groupSecretFileNames = [],
  beforeRead,
  afterPut,
  beforeDelete,
} = {}) => {
  const values = new Map(environment);
  const calls = [];
  let readCount = 0;
  let putCount = 0;
  let deleteCount = 0;
  return {
    calls,
    values,
    async readService(renderToken) {
      calls.push({ operation: "read-service" });
      assert.equal(renderToken, RENDER_TOKEN);
      return { ...service };
    },
    async readEnvironment(renderToken) {
      readCount += 1;
      calls.push({ operation: "read-environment", readCount });
      assert.equal(renderToken, RENDER_TOKEN);
      await beforeRead?.({ readCount, values });
      return [...values].map(([key, value]) => ({ key, value }));
    },
    async readEnvironmentGroups(renderToken) {
      calls.push({ operation: "read-environment-groups" });
      assert.equal(renderToken, RENDER_TOKEN);
      return structuredClone(groups);
    },
    async readEnvironmentGroup(renderToken, groupId) {
      calls.push({ operation: "read-environment-group" });
      assert.equal(renderToken, RENDER_TOKEN);
      assert.equal(groupId, TEST_GROUP_ID);
      const group = groups.find((entry) => entry.id === groupId);
      return {
        ...structuredClone(group),
        envVars: structuredClone(groupEnvironment),
        secretFileNames: [...groupSecretFileNames],
      };
    },
    async putEnvironment(renderToken, key, value) {
      putCount += 1;
      calls.push({ operation: "put", key, putCount });
      assert.equal(renderToken, RENDER_TOKEN);
      values.set(key, value);
      await afterPut?.({ key, putCount, value, values });
    },
    async deleteEnvironment(renderToken, key) {
      deleteCount += 1;
      calls.push({ operation: "delete", key, deleteCount });
      assert.equal(renderToken, RENDER_TOKEN);
      await beforeDelete?.({ key, deleteCount, values });
      values.delete(key);
    },
  };
};

const invokeOffline = async ({
  adapter = makeMemoryAdapter(),
  payload = credentialsPayload(),
  inputSource,
  renderToken = RENDER_TOKEN,
} = {}) => {
  let output = "";
  const exitCode = await runOperation({
    argv: ["node", "helper", "--execute"],
    environment: {
      NODE_ENV: "test",
      RENDER_API_KEY: renderToken,
    },
    input: Readable.from([
      inputSource ?? JSON.stringify(payload),
    ]),
    adapter,
    testOnly: {
      authority: TEST_ONLY_GOOGLE_OAUTH,
      approvedGroupIdHash: TEST_GROUP_ID_HASH,
    },
    wait: async () => {},
    writeOutput: (serialized) => {
      output += serialized;
    },
  });
  return {
    adapter,
    exitCode,
    output,
    result: JSON.parse(output),
  };
};

const assertSensitiveValuesAbsent = (output, values = []) => {
  for (const value of [
    RENDER_TOKEN,
    CLIENT_ID,
    CLIENT_SECRET,
    OLD_CLIENT_ID,
    OLD_CLIENT_SECRET,
    RENDER_API_SERVICE_ID,
    RENDER_API_SERVICE_NAME,
    TEST_GROUP_ID,
    RENDER_LLM_SERVICE_ID,
    TEST_OWNER_ID,
    ...values,
  ]) {
    assert.equal(output.includes(value), false);
  }
};

test("credential input uses only the exact API configuration aliases", () => {
  assert.deepEqual(
    INPUT_KEYS,
    [
      "QUANTGYM_GOOGLE_CLIENT_ID",
      "QUANTGYM_GOOGLE_CLIENT_SECRET",
    ],
  );
  assert.deepEqual(
    parseCredentialPayload(credentialsPayload()),
    {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    },
  );

  for (const invalid of [
    { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
    {
      ...credentialsPayload(),
      QUANTGYM_V2_GOOGLE_CLIENT_ID: CLIENT_ID,
    },
    {
      [RENDER_CLIENT_ID_KEY]: "preview.invalid",
      [RENDER_CLIENT_SECRET_KEY]: CLIENT_SECRET,
    },
    {
      [RENDER_CLIENT_ID_KEY]: CLIENT_ID,
      [RENDER_CLIENT_SECRET_KEY]: "short",
    },
    {
      [RENDER_CLIENT_ID_KEY]: CLIENT_ID,
      [RENDER_CLIENT_SECRET_KEY]: `${CLIENT_SECRET}\n`,
    },
  ]) {
    assert.throws(
      () => parseCredentialPayload(invalid),
      (error) => error instanceof OperationError,
    );
  }
});

test("stdin JSON scanner rejects duplicate top-level credential keys", async () => {
  const duplicateSource = JSON.stringify(credentialsPayload()).replace(
    `"${RENDER_CLIENT_SECRET_KEY}":`,
    (
      `"${RENDER_CLIENT_ID_KEY}":"${OLD_CLIENT_ID}",`
      + `"${RENDER_CLIENT_SECRET_KEY}":`
    ),
  );
  const keys = topLevelJsonObjectKeys(duplicateSource);
  assert.equal(keys.length, 3);
  assert.equal(new Set(keys).size, 2);

  const nestedMention = JSON.stringify({
    [RENDER_CLIENT_ID_KEY]: CLIENT_ID,
    nested: {
      [RENDER_CLIENT_ID_KEY]: OLD_CLIENT_ID,
    },
  });
  assert.deepEqual(topLevelJsonObjectKeys(nestedMention), [
    RENDER_CLIENT_ID_KEY,
    "nested",
  ]);

  const adapter = makeMemoryAdapter();
  const {
    exitCode,
    output,
    result,
  } = await invokeOffline({ adapter, inputSource: duplicateSource });
  assert.equal(exitCode, 1);
  assert.equal(result.failure.code, "CREDENTIAL_JSON_DUPLICATE_KEY");
  assert.equal(adapter.calls.length, 0);
  assertSensitiveValuesAbsent(output);
});

test("helper requires the repository's exact Node runtime", () => {
  assert.doesNotThrow(() => requireExactNodeVersion(REQUIRED_NODE_VERSION));
  for (const version of ["20.20.1", "20.20.3", "21.0.0", "18.20.8"]) {
    assert.throws(
      () => requireExactNodeVersion(version),
      (error) => (
        error instanceof OperationError
        && error.code === "NODE_20_20_2_REQUIRED"
        && error.phase === "input"
      ),
    );
  }
});

test("real CLI input failure emits one redacted JSON result without provider access", () => {
  const malformedInput = (
    `{"${RENDER_CLIENT_ID_KEY}":"${CLIENT_ID}",`
    + `"${RENDER_CLIENT_SECRET_KEY}":"${CLIENT_SECRET}"`
  );
  const result = spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--execute"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        RENDER_API_KEY: RENDER_TOKEN,
        HTTPS_PROXY: "http://127.0.0.1:1",
        HTTP_PROXY: "http://127.0.0.1:1",
        https_proxy: "http://127.0.0.1:1",
        http_proxy: "http://127.0.0.1:1",
        NO_PROXY: "",
        no_proxy: "",
        NODE_NO_WARNINGS: "1",
      },
      input: malformedInput,
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, "fail");
  assert.equal(
    [
      "CREDENTIAL_JSON_INVALID",
      "NODE_20_20_2_REQUIRED",
    ].includes(output.failure.code),
    true,
  );
  assertSensitiveValuesAbsent(result.stdout);
});

test("service and preview locks are exact and reject OAuth alias conflicts", () => {
  assert.doesNotThrow(() => verifyRenderService(exactService()));
  for (const invalid of [
    exactService({
      id: "srv-other",
    }),
    exactService({
      name: "quantgym-api",
    }),
    exactService({
      type: "private_service",
    }),
    exactService({
      branch: "main",
    }),
    exactService({
      autoDeploy: "yes",
    }),
  ]) {
    assert.throws(
      () => verifyRenderService(invalid),
      (error) => (
        error instanceof OperationError
        && error.code === "RENDER_SERVICE_IDENTITY_INVALID"
      ),
    );
  }

  const exact = [...baseEnvironment()]
    .map(([key, value]) => ({ key, value }));
  assert.doesNotThrow(() => verifyPreviewEnvironment(exact));

  for (const entries of [
    [...baseEnvironment({
      QUANTGYM_PREVIEW_ENVIRONMENT: "production",
    })],
    [...baseEnvironment({
      QUANTGYM_PREVIEW_SERVICE: "llm",
    })],
    [...baseEnvironment({
      QUANTGYM_V2_GOOGLE_CLIENT_ID: CLIENT_ID,
    })],
    [...baseEnvironment({
      QUANTGYM_GOOGLE_REDIRECT_URI: "https://example.invalid/callback",
    })],
  ]) {
    assert.throws(
      () => verifyPreviewEnvironment(
        entries.map(([key, value]) => ({ key, value })),
      ),
      (error) => error instanceof OperationError,
    );
  }
});

test("linked Preview group is exact and cannot supply OAuth credentials", async (t) => {
  const cases = [
    {
      name: "unapproved group identity",
      adapter: makeMemoryAdapter({
        groups: [{
          id: "evg-unapproved-offline-fixture",
          name: RENDER_PREVIEW_GROUP_NAME,
          ownerId: TEST_OWNER_ID,
          serviceLinks: [
            {
              id: RENDER_API_SERVICE_ID,
              name: RENDER_API_SERVICE_NAME,
            },
            {
              id: RENDER_LLM_SERVICE_ID,
              name: RENDER_LLM_SERVICE_NAME,
            },
          ],
        }],
      }),
      failureCode: "RENDER_ENV_GROUP_IDENTITY_INVALID",
    },
    {
      name: "same-name replacement LLM service",
      adapter: makeMemoryAdapter({
        groups: [{
          id: TEST_GROUP_ID,
          name: RENDER_PREVIEW_GROUP_NAME,
          ownerId: TEST_OWNER_ID,
          serviceLinks: [
            {
              id: RENDER_API_SERVICE_ID,
              name: RENDER_API_SERVICE_NAME,
            },
            {
              id: "srv-replacement-llm-offline-fixture",
              name: RENDER_LLM_SERVICE_NAME,
            },
          ],
        }],
      }),
      failureCode: "RENDER_ENV_GROUP_IDENTITY_INVALID",
    },
    {
      name: "shared production service link",
      adapter: makeMemoryAdapter({
        groups: [{
          id: TEST_GROUP_ID,
          name: RENDER_PREVIEW_GROUP_NAME,
          ownerId: TEST_OWNER_ID,
          serviceLinks: [
            {
              id: RENDER_API_SERVICE_ID,
              name: RENDER_API_SERVICE_NAME,
            },
            {
              id: "srv-production-api-offline-fixture",
              name: "quantgym-api",
            },
          ],
        }],
      }),
      failureCode: "RENDER_ENV_GROUP_IDENTITY_INVALID",
    },
    {
      name: "group OAuth secret",
      adapter: makeMemoryAdapter({
        groupEnvironment: [{
          key: RENDER_CLIENT_SECRET_KEY,
          value: `GOCSPX-${"x".repeat(32)}`,
        }],
      }),
      failureCode: "RENDER_ENV_GROUP_OAUTH_CONFLICT",
    },
    {
      name: "group secret file",
      adapter: makeMemoryAdapter({
        groupSecretFileNames: ["shared-production-secret"],
      }),
      failureCode: "RENDER_ENV_GROUP_DETAIL_MISMATCH",
    },
    {
      name: "duplicate canonical redirect source",
      adapter: makeMemoryAdapter({
        groupEnvironment: [{
          key: "QUANTGYM_GOOGLE_REDIRECT_URI",
          value: GOOGLE_REDIRECT_URI,
        }],
      }),
      failureCode: "RENDER_GOOGLE_REDIRECT_URI_MISMATCH",
    },
  ];
  for (const fixture of cases) {
    await t.test(fixture.name, async () => {
      const {
        exitCode,
        output,
        result,
      } = await invokeOffline({ adapter: fixture.adapter });
      assert.equal(exitCode, 1);
      assert.equal(result.failure.code, fixture.failureCode);
      assert.equal(result.state.render, "unchanged");
      assert.equal(
        fixture.adapter.calls.some((call) => (
          call.operation === "put"
          || call.operation === "delete"
        )),
        false,
      );
      assertSensitiveValuesAbsent(output);
    });
  }
});

test("canonical redirect may come only from the approved linked group", async () => {
  const environment = baseEnvironment();
  environment.delete("QUANTGYM_GOOGLE_REDIRECT_URI");
  const adapter = makeMemoryAdapter({
    environment,
    groupEnvironment: [{
      key: "QUANTGYM_GOOGLE_REDIRECT_URI",
      value: GOOGLE_REDIRECT_URI,
    }],
  });
  const {
    exitCode,
    result,
  } = await invokeOffline({ adapter });
  assert.equal(exitCode, 0);
  assert.equal(result.render.canonicalRedirectExact, true);
});

test("offline transaction writes only the two exact keys and emits redacted evidence", async () => {
  const adapter = makeMemoryAdapter();
  const {
    exitCode,
    output,
    result,
  } = await invokeOffline({ adapter });

  assert.equal(exitCode, 0);
  assert.equal(result.status, "pass");
  assert.equal(result.target.previewEnvironment, "preview-v2");
  assert.equal(result.target.previewServiceRole, "api");
  assert.deepEqual(result.render.environmentKeys, [
    RENDER_CLIENT_ID_KEY,
    RENDER_CLIENT_SECRET_KEY,
  ]);
  assert.deepEqual(result.render.before, {
    clientIdPresent: false,
    clientSecretPresent: false,
  });
  assert.deepEqual(result.render.after, {
    clientIdPresent: true,
    clientSecretPresent: true,
  });
  assert.equal(result.render.readbackExact, true);
  assert.equal(result.render.canonicalRedirectExact, true);
  assert.equal(result.render.serviceContractExact, true);
  assert.equal(result.render.linkedEnvironmentGroupExact, true);
  assert.equal(result.render.deploymentTriggered, false);
  assert.equal(result.checks.renderDeployNotTriggered, true);
  assert.equal(adapter.values.get(RENDER_CLIENT_ID_KEY), CLIENT_ID);
  assert.equal(
    adapter.values.get(RENDER_CLIENT_SECRET_KEY),
    CLIENT_SECRET,
  );
  assert.deepEqual(
    adapter.calls
      .filter((call) => call.operation === "put")
      .map((call) => call.key),
    [RENDER_CLIENT_SECRET_KEY, RENDER_CLIENT_ID_KEY],
  );
  assertSensitiveValuesAbsent(output);
});

test("a failed second mutation restores exact pre-existing values", async () => {
  let failed = false;
  const adapter = makeMemoryAdapter({
    environment: baseEnvironment({
      [RENDER_CLIENT_ID_KEY]: OLD_CLIENT_ID,
      [RENDER_CLIENT_SECRET_KEY]: OLD_CLIENT_SECRET,
    }),
    afterPut: ({ key }) => {
      if (!failed && key === RENDER_CLIENT_ID_KEY) {
        failed = true;
        throw new OperationError(
          "RENDER_REQUEST_UNAVAILABLE",
          "render-env-client-id-set",
        );
      }
    },
  });
  const {
    exitCode,
    output,
    result,
  } = await invokeOffline({ adapter });

  assert.equal(exitCode, 1);
  assert.equal(result.status, "fail");
  assert.equal(result.failure.code, "RENDER_REQUEST_UNAVAILABLE");
  assert.equal(result.state.render, "rolled-back");
  assert.deepEqual(result.rollback, {
    attempted: true,
    confirmed: true,
  });
  assert.equal(result.manualActionRequired, false);
  assert.equal(adapter.values.get(RENDER_CLIENT_ID_KEY), OLD_CLIENT_ID);
  assert.equal(
    adapter.values.get(RENDER_CLIENT_SECRET_KEY),
    OLD_CLIENT_SECRET,
  );
  assertSensitiveValuesAbsent(output);
});

test("a failed mutation deletes both keys when both were initially absent", async () => {
  let failed = false;
  const adapter = makeMemoryAdapter({
    afterPut: ({ key }) => {
      if (!failed && key === RENDER_CLIENT_ID_KEY) {
        failed = true;
        throw new OperationError(
          "RENDER_REQUEST_UNAVAILABLE",
          "render-env-client-id-set",
        );
      }
    },
  });
  const {
    exitCode,
    result,
  } = await invokeOffline({ adapter });

  assert.equal(exitCode, 1);
  assert.equal(result.state.render, "rolled-back");
  assert.equal(adapter.values.has(RENDER_CLIENT_ID_KEY), false);
  assert.equal(adapter.values.has(RENDER_CLIENT_SECRET_KEY), false);
  assert.deepEqual(
    adapter.calls
      .filter((call) => call.operation === "delete")
      .map((call) => call.key),
    [RENDER_CLIENT_ID_KEY, RENDER_CLIENT_SECRET_KEY],
  );
});

test("third-party readback value is preserved and requires manual action", async () => {
  const tamperedSecret = `GOCSPX-${"t".repeat(32)}`;
  const adapter = makeMemoryAdapter({
    environment: baseEnvironment({
      [RENDER_CLIENT_ID_KEY]: OLD_CLIENT_ID,
      [RENDER_CLIENT_SECRET_KEY]: OLD_CLIENT_SECRET,
    }),
    beforeRead: ({ readCount, values }) => {
      if (readCount === 3) {
        values.set(RENDER_CLIENT_SECRET_KEY, tamperedSecret);
      }
    },
  });
  const {
    exitCode,
    output,
    result,
  } = await invokeOffline({ adapter });

  assert.equal(exitCode, 1);
  assert.equal(result.failure.code, "RENDER_ENV_ROLLBACK_UNCONFIRMED");
  assert.equal(result.state.render, "rollback-unconfirmed");
  assert.equal(result.manualActionRequired, true);
  assert.equal(adapter.values.get(RENDER_CLIENT_ID_KEY), CLIENT_ID);
  assert.equal(
    adapter.values.get(RENDER_CLIENT_SECRET_KEY),
    tamperedSecret,
  );
  assertSensitiveValuesAbsent(output, [tamperedSecret]);
});

test("unconfirmed rollback is fail-closed and requires manual action", async () => {
  let mutationFailed = false;
  const adapter = makeMemoryAdapter({
    afterPut: ({ key }) => {
      if (!mutationFailed && key === RENDER_CLIENT_ID_KEY) {
        mutationFailed = true;
        throw new OperationError(
          "RENDER_REQUEST_UNAVAILABLE",
          "render-env-client-id-set",
        );
      }
    },
    beforeDelete: () => {
      throw new OperationError(
        "RENDER_REQUEST_UNAVAILABLE",
        "render-env-rollback",
      );
    },
  });
  const {
    exitCode,
    output,
    result,
  } = await invokeOffline({ adapter });

  assert.equal(exitCode, 1);
  assert.equal(result.failure.code, "RENDER_ENV_ROLLBACK_UNCONFIRMED");
  assert.equal(result.state.render, "rollback-unconfirmed");
  assert.deepEqual(result.rollback, {
    attempted: true,
    confirmed: false,
  });
  assert.equal(result.manualActionRequired, true);
  assertSensitiveValuesAbsent(output);
});

test("post-commit output failure rolls Render back before reporting failure", async () => {
  const adapter = makeMemoryAdapter({
    environment: baseEnvironment({
      [RENDER_CLIENT_ID_KEY]: OLD_CLIENT_ID,
      [RENDER_CLIENT_SECRET_KEY]: OLD_CLIENT_SECRET,
    }),
  });
  let firstWrite = true;
  let output = "";
  const exitCode = await runOperation({
    argv: ["node", "helper", "--execute"],
    environment: {
      NODE_ENV: "test",
      RENDER_API_KEY: RENDER_TOKEN,
    },
    input: Readable.from([JSON.stringify(credentialsPayload())]),
    adapter,
    testOnly: {
      authority: TEST_ONLY_GOOGLE_OAUTH,
      approvedGroupIdHash: TEST_GROUP_ID_HASH,
    },
    wait: async () => {},
    writeOutput: (serialized) => {
      if (firstWrite) {
        firstWrite = false;
        throw new Error("simulated output failure");
      }
      output += serialized;
    },
  });
  const result = JSON.parse(output);

  assert.equal(exitCode, 1);
  assert.equal(result.status, "fail");
  assert.equal(result.state.render, "rolled-back");
  assert.deepEqual(result.rollback, {
    attempted: true,
    confirmed: true,
  });
  assert.equal(adapter.values.get(RENDER_CLIENT_ID_KEY), OLD_CLIENT_ID);
  assert.equal(
    adapter.values.get(RENDER_CLIENT_SECRET_KEY),
    OLD_CLIENT_SECRET,
  );
  assertSensitiveValuesAbsent(output);
});

test("rollback requires stable reads and catches a late ambiguous mutation", async () => {
  let mutationFailed = false;
  const adapter = makeMemoryAdapter({
    afterPut: ({ key }) => {
      if (!mutationFailed && key === RENDER_CLIENT_ID_KEY) {
        mutationFailed = true;
        throw new OperationError(
          "RENDER_REQUEST_UNAVAILABLE",
          "render-env-client-id-set",
        );
      }
    },
    beforeRead: ({ readCount, values }) => {
      // Reads 4 and 5 are the per-key ownership checks. Inject only after
      // both compensating writes so the stable verification must detect it.
      if (mutationFailed && readCount === 6) {
        values.set(RENDER_CLIENT_SECRET_KEY, CLIENT_SECRET);
      }
    },
  });
  const {
    exitCode,
    output,
    result,
  } = await invokeOffline({ adapter });

  assert.equal(exitCode, 1);
  assert.equal(result.failure.code, "RENDER_ENV_ROLLBACK_UNCONFIRMED");
  assert.equal(result.state.render, "rollback-unconfirmed");
  assert.equal(result.manualActionRequired, true);
  assertSensitiveValuesAbsent(output);
});

test("rollback rechecks ownership before each compensating write", async () => {
  const concurrentSecret = `GOCSPX-${"c".repeat(32)}`;
  let mutationFailed = false;
  let concurrentChangeInjected = false;
  const adapter = makeMemoryAdapter({
    afterPut: ({ key }) => {
      if (!mutationFailed && key === RENDER_CLIENT_ID_KEY) {
        mutationFailed = true;
        throw new OperationError(
          "RENDER_REQUEST_UNAVAILABLE",
          "render-env-client-id-set",
        );
      }
    },
    beforeDelete: ({ key, values }) => {
      if (
        !concurrentChangeInjected
        && key === RENDER_CLIENT_ID_KEY
      ) {
        concurrentChangeInjected = true;
        values.set(RENDER_CLIENT_SECRET_KEY, concurrentSecret);
      }
    },
  });
  const {
    exitCode,
    output,
    result,
  } = await invokeOffline({ adapter });

  assert.equal(exitCode, 1);
  assert.equal(result.failure.code, "RENDER_ENV_ROLLBACK_UNCONFIRMED");
  assert.equal(result.state.render, "rollback-unconfirmed");
  assert.equal(result.manualActionRequired, true);
  assert.equal(
    adapter.values.get(RENDER_CLIENT_SECRET_KEY),
    concurrentSecret,
  );
  assert.deepEqual(
    adapter.calls
      .filter((call) => call.operation === "delete")
      .map((call) => call.key),
    [RENDER_CLIENT_ID_KEY],
  );
  assertSensitiveValuesAbsent(output, [concurrentSecret]);
});

test("preflight mismatch performs no Render mutation", async () => {
  const adapter = makeMemoryAdapter({
    environment: baseEnvironment({
      QUANTGYM_PREVIEW_SERVICE: "llm",
    }),
  });
  const {
    exitCode,
    output,
    result,
  } = await invokeOffline({ adapter });

  assert.equal(exitCode, 1);
  assert.equal(result.failure.code, "RENDER_PREVIEW_BINDING_MISMATCH");
  assert.equal(result.state.render, "unchanged");
  assert.equal(result.rollback.attempted, false);
  assert.equal(
    adapter.calls.some((call) => (
      call.operation === "put"
      || call.operation === "delete"
    )),
    false,
  );
  assertSensitiveValuesAbsent(output);
});

test("Render adapter is pinned to the locked service and uses no provider in tests", async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, method: options.method, body: options.body });
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.render.com");
    assert.equal(
      parsed.pathname.startsWith(`/v1/services/${RENDER_API_SERVICE_ID}`),
      true,
    );
    if (
      options.method === "GET"
      && parsed.pathname === `/v1/services/${RENDER_API_SERVICE_ID}`
    ) {
      return new Response(JSON.stringify({
        ...exactService(),
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (options.method === "GET" && parsed.pathname.endsWith("/env-vars")) {
      return new Response(JSON.stringify([
        ...baseEnvironment(),
      ].map(([key, value]) => ({ envVar: { key, value } }))), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (options.method === "PUT") {
      return new Response(null, { status: 200 });
    }
    if (options.method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    assert.fail("unexpected fake Render route");
  };
  const adapter = createRenderAdapter({ fetchImpl: fakeFetch });
  const service = await adapter.readService(RENDER_TOKEN);
  const entries = await adapter.readEnvironment(RENDER_TOKEN);
  await adapter.putEnvironment(
    RENDER_TOKEN,
    RENDER_CLIENT_SECRET_KEY,
    CLIENT_SECRET,
  );
  await adapter.deleteEnvironment(RENDER_TOKEN, RENDER_CLIENT_ID_KEY);

  verifyRenderService(service);
  verifyPreviewEnvironment(entries);
  assert.equal(calls.length, 4);
  assert.equal(
    calls.every((call) => (
      call.url.startsWith(
        `https://api.render.com/v1/services/${RENDER_API_SERVICE_ID}`,
      )
    )),
    true,
  );
});

test("Render adapter rejects malformed or masked environment values", async () => {
  for (const payload of [
    [{
      envVar: {
        key: RENDER_CLIENT_SECRET_KEY,
        value: null,
      },
    }],
    [{
      key: RENDER_CLIENT_SECRET_KEY,
      value: CLIENT_SECRET,
    }],
    [{
      envVar: {
        key: RENDER_CLIENT_SECRET_KEY,
        value: { redacted: true },
      },
    }],
  ]) {
    const adapter = createRenderAdapter({
      fetchImpl: async () => new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    });
    await assert.rejects(
      adapter.readEnvironment(RENDER_TOKEN),
      (error) => (
        error instanceof OperationError
        && error.code === "RENDER_ENV_ENTRY_INVALID"
      ),
    );
  }
});

test("Render adapter rejects undocumented mutation success statuses", async () => {
  const adapter = createRenderAdapter({
    fetchImpl: async () => new Response(null, { status: 202 }),
  });
  await assert.rejects(
    adapter.putEnvironment(
      RENDER_TOKEN,
      RENDER_CLIENT_ID_KEY,
      CLIENT_ID,
    ),
    (error) => (
      error instanceof OperationError
      && error.code === "RENDER_REQUEST_REJECTED"
    ),
  );
});

test("redaction guard rejects accidental credential-bearing output", () => {
  for (const value of [RENDER_TOKEN, CLIENT_ID, CLIENT_SECRET]) {
    assert.throws(
      () => serializeOutput(
        { status: "fail", accidental: value },
        new Set([RENDER_TOKEN, CLIENT_ID, CLIENT_SECRET]),
      ),
      (error) => (
        error instanceof OperationError
        && error.code === "OUTPUT_REDACTION_FAILURE"
      ),
    );
  }
});
