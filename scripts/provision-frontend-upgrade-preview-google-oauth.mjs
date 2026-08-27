#!/usr/bin/env node

/**
 * One-shot Preview Google OAuth credential installer.
 *
 * Invoke only with Node 20.20.2 and an explicit `--execute` flag. The Render
 * operator token is read only from `RENDER_API_KEY`. Non-TTY stdin must contain
 * exactly this JSON shape:
 *
 * {
 *   "QUANTGYM_GOOGLE_CLIENT_ID": "...apps.googleusercontent.com",
 *   "QUANTGYM_GOOGLE_CLIENT_SECRET": "..."
 * }
 *
 * The helper never writes credentials to disk. Provider response bodies and
 * credential values are never printed. Any failure after a Render mutation
 * restores both target variables to their exact preflight state and verifies
 * that rollback before reporting it as complete. This helper intentionally
 * does not trigger a Render deploy or restart.
 */

import {
  createHash,
} from "node:crypto";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

import {
  Agent,
  EnvHttpProxyAgent,
  fetch as undiciFetch,
  setGlobalDispatcher,
} from "undici";

const OPERATION = "frontend-v2-preview-google-oauth-install";
const REQUIRED_NODE_VERSION = "20.20.2";
const RENDER_API = "https://api.render.com";
const RENDER_API_SERVICE_ID = "srv-d9cbq9rbc2fs73bn8cd0";
const RENDER_API_SERVICE_NAME = "quantgym-v2-preview-api";
const RENDER_LLM_SERVICE_ID = "srv-d9cak157vvec73d1kubg";
const RENDER_LLM_SERVICE_NAME = "quantgym-v2-preview-llm";
const RENDER_REPOSITORY = "https://github.com/garymmmjw/QuantGym";
const RENDER_BRANCH = "codex/frontend-v2-preview";
const RENDER_API_ROOT_DIRECTORY = "api";
const RENDER_API_BUILD_COMMAND = (
  "python -m pip install --require-hashes -r requirements.lock.txt"
);
const RENDER_API_START_COMMAND = (
  "python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT"
);
const RENDER_API_HEALTH_PATH = "/api/v2/health";
const APPROVED_PREVIEW_GROUP_ID_SHA256 = (
  "525a3dbf93afca11420b5a5ff2b432817fb7c946a6f97749d5b453dfa0a34fe9"
);
const RENDER_PREVIEW_GROUP_NAME = "quantgym-v2-preview";
const RENDER_CLIENT_ID_KEY = "QUANTGYM_GOOGLE_CLIENT_ID";
const RENDER_CLIENT_SECRET_KEY = "QUANTGYM_GOOGLE_CLIENT_SECRET";
const RENDER_TARGET_KEYS = Object.freeze([
  RENDER_CLIENT_ID_KEY,
  RENDER_CLIENT_SECRET_KEY,
]);
const RENDER_PREVIEW_BINDINGS = Object.freeze({
  QUANTGYM_PREVIEW_ENVIRONMENT: "preview-v2",
  QUANTGYM_PREVIEW_SERVICE: "api",
});
const GOOGLE_REDIRECT_URI = (
  "https://quantgym-v2-preview.pages.dev/api/v2/auth/google/callback"
);
const GOOGLE_REDIRECT_KEYS = Object.freeze([
  "QUANTGYM_GOOGLE_REDIRECT_URI",
  "QUANTGYM_V2_GOOGLE_REDIRECT_URI",
]);
const CONFLICTING_OAUTH_ALIAS_KEYS = Object.freeze([
  "QUANTGYM_V2_GOOGLE_CLIENT_ID",
  "QUANTGYM_V2_GOOGLE_CLIENT_SECRET",
]);
const RENDER_ENV_READ_KEYS = new Set([
  ...Object.keys(RENDER_PREVIEW_BINDINGS),
  ...RENDER_TARGET_KEYS,
  ...GOOGLE_REDIRECT_KEYS,
  ...CONFLICTING_OAUTH_ALIAS_KEYS,
]);
const RENDER_ENV_MUTATION_KEYS = new Set(RENDER_TARGET_KEYS);
const INPUT_KEYS = [...RENDER_TARGET_KEYS].sort();
const GOOGLE_CLIENT_ID_PATTERN = (
  /^[A-Za-z0-9-]{6,200}\.apps\.googleusercontent\.com$/u
);
const GOOGLE_CLIENT_ID_OUTPUT_PATTERN = (
  /[A-Za-z0-9-]{6,200}\.apps\.googleusercontent\.com/u
);
const RENDER_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{20,4096}$/u;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SAFE_FAILURE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/u;
const MAX_STDIN_BYTES = 16 * 1024;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_PAGES = 100;
const REQUEST_TIMEOUT_MS = 20_000;
const READBACK_ATTEMPTS = 4;
const READBACK_DELAY_MS = 250;
const REDACTION_DOMAIN = "quantgym-preview-google-oauth-redaction-v1";
const TEST_ONLY_GOOGLE_OAUTH = Symbol(
  "frontend-v2-preview-google-oauth-test-only",
);

class OperationError extends Error {
  constructor(code, phase, details = {}) {
    super(code);
    this.name = "OperationError";
    this.code = code;
    this.phase = phase;
    this.details = details;
  }
}

const requireCondition = (condition, code, phase, details = {}) => {
  if (!condition) throw new OperationError(code, phase, details);
};

const sha256 = (value) => (
  createHash("sha256")
    .update(value)
    .digest("hex")
);

const redactedIdentity = (value) => (
  sha256(`${REDACTION_DOMAIN}\0${value}`)
);

const normalizeRepository = (value) => (
  typeof value === "string"
    ? value.trim().replace(/\.git$/iu, "")
    : ""
);

const serviceCommand = (service, key) => (
  service?.serviceDetails?.envSpecificDetails?.[key]
);
const requireExactNodeVersion = (version) => {
  requireCondition(
    version === REQUIRED_NODE_VERSION,
    "NODE_20_20_2_REQUIRED",
    "input",
  );
};

const validateRenderToken = (value) => {
  requireCondition(
    typeof value === "string"
    && RENDER_TOKEN_PATTERN.test(value),
    "RENDER_API_KEY_REQUIRED",
    "input",
  );
  return value;
};

const parseCredentialPayload = (value) => {
  requireCondition(
    value !== null
    && typeof value === "object"
    && !Array.isArray(value),
    "CREDENTIAL_JSON_OBJECT_REQUIRED",
    "input",
  );
  const keys = Object.keys(value).sort();
  requireCondition(
    keys.length === INPUT_KEYS.length
    && keys.every((key, index) => key === INPUT_KEYS[index]),
    "CREDENTIAL_JSON_KEYS_INVALID",
    "input",
  );

  const clientId = value[RENDER_CLIENT_ID_KEY];
  const clientSecret = value[RENDER_CLIENT_SECRET_KEY];
  requireCondition(
    typeof clientId === "string"
    && GOOGLE_CLIENT_ID_PATTERN.test(clientId),
    "GOOGLE_CLIENT_ID_INVALID",
    "input",
  );
  requireCondition(
    typeof clientSecret === "string"
    && clientSecret.length >= 16
    && clientSecret.length <= 512
    && ![...clientSecret].some((character) => (
      character.trim() === ""
      || character.codePointAt(0) < 32
      || character.codePointAt(0) === 127
    )),
    "GOOGLE_CLIENT_SECRET_INVALID",
    "input",
  );
  requireCondition(
    clientSecret !== clientId,
    "GOOGLE_OAUTH_CREDENTIALS_NOT_DISTINCT",
    "input",
  );
  return Object.freeze({ clientId, clientSecret });
};

const topLevelJsonObjectKeys = (sourceText) => {
  const keys = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let expectingTopLevelKey = false;
  let topLevelKeyStart = -1;
  for (let index = 0; index < sourceText.length; index += 1) {
    const character = sourceText[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
        if (topLevelKeyStart >= 0) {
          keys.push(JSON.parse(
            sourceText.slice(topLevelKeyStart, index + 1),
          ));
          topLevelKeyStart = -1;
          expectingTopLevelKey = false;
        }
      }
      continue;
    }
    if (character === "\"") {
      inString = true;
      if (depth === 1 && expectingTopLevelKey) {
        topLevelKeyStart = index;
      }
      continue;
    }
    if (character === "{") {
      depth += 1;
      if (depth === 1) expectingTopLevelKey = true;
      continue;
    }
    if (character === "[") {
      depth += 1;
      continue;
    }
    if (character === "}" || character === "]") {
      depth -= 1;
      continue;
    }
    if (character === "," && depth === 1) {
      expectingTopLevelKey = true;
    }
  }
  return keys;
};

const readCredentialJson = async (input, sensitiveValues) => {
  requireCondition(
    input?.isTTY !== true
    && input
    && typeof input[Symbol.asyncIterator] === "function",
    "CREDENTIAL_STDIN_REQUIRED",
    "input",
  );
  const chunks = [];
  let length = 0;
  let source;
  let sourceText = "";
  try {
    for await (const chunkValue of input) {
      const chunk = Buffer.from(chunkValue);
      length += chunk.length;
      if (length > MAX_STDIN_BYTES) {
        chunk.fill(0);
        throw new OperationError("CREDENTIAL_STDIN_TOO_LARGE", "input");
      }
      chunks.push(chunk);
    }
    requireCondition(length > 0, "CREDENTIAL_STDIN_EMPTY", "input");
    source = Buffer.concat(chunks, length);
    try {
      sourceText = new TextDecoder("utf-8", { fatal: true }).decode(source);
    } catch {
      throw new OperationError("CREDENTIAL_STDIN_UTF8_INVALID", "input");
    }
    sensitiveValues.add(sourceText);
    let parsed;
    try {
      parsed = JSON.parse(sourceText);
    } catch {
      throw new OperationError("CREDENTIAL_JSON_INVALID", "input");
    }
    const topLevelKeys = topLevelJsonObjectKeys(sourceText);
    requireCondition(
      new Set(topLevelKeys).size === topLevelKeys.length,
      "CREDENTIAL_JSON_DUPLICATE_KEY",
      "input",
    );
    const credentials = parseCredentialPayload(parsed);
    sensitiveValues.add(credentials.clientId);
    sensitiveValues.add(credentials.clientSecret);
    return credentials;
  } finally {
    source?.fill(0);
    for (const chunk of chunks) chunk.fill(0);
    sourceText = "";
  }
};

const safeRequestId = (response) => {
  const candidate = (
    response.headers.get("x-request-id")
    || response.headers.get("cf-ray")
    || ""
  ).trim();
  if (
    !SAFE_REQUEST_ID_PATTERN.test(candidate)
    || /(?:bearer|credential|password|secret|token)/iu.test(candidate)
  ) return "unavailable";
  return candidate;
};

const discardBody = async (response) => {
  try {
    await response.body?.cancel();
  } catch {
    // Provider error bodies are deliberately discarded without inspection.
  }
};

const readBounded = async (response, phase) => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const advertised = Number(contentLength);
    requireCondition(
      Number.isFinite(advertised)
      && advertised >= 0
      && advertised <= MAX_JSON_BYTES,
      "RENDER_RESPONSE_TOO_LARGE",
      phase,
      { status: response.status, requestId: safeRequestId(response) },
    );
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    const bytes = Buffer.from(await response.arrayBuffer());
    requireCondition(
      bytes.length <= MAX_JSON_BYTES,
      "RENDER_RESPONSE_TOO_LARGE",
      phase,
      { status: response.status, requestId: safeRequestId(response) },
    );
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      length += chunk.length;
      if (length > MAX_JSON_BYTES) {
        chunk.fill(0);
        await reader.cancel();
        throw new OperationError(
          "RENDER_RESPONSE_TOO_LARGE",
          phase,
          { status: response.status, requestId: safeRequestId(response) },
        );
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, length);
  } finally {
    for (const chunk of chunks) chunk.fill(0);
  }
};

const parseSuccessJson = async (response, phase) => {
  let bytes;
  try {
    bytes = await readBounded(response, phase);
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    if (error instanceof OperationError) throw error;
    throw new OperationError(
      "RENDER_RESPONSE_INVALID",
      phase,
      { status: response.status, requestId: safeRequestId(response) },
    );
  } finally {
    bytes?.fill(0);
  }
};

const renderRequest = async ({
  fetchImpl,
  renderToken,
  suffix,
  phase,
  method = "GET",
  body,
  acceptedStatuses = [200],
  parseJson = true,
}) => {
  let response;
  try {
    response = await fetchImpl(`${RENDER_API}${suffix}`, {
      method,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${renderToken}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new OperationError(
      "RENDER_REQUEST_UNAVAILABLE",
      phase,
      { requestId: "unavailable" },
    );
  }
  if (!acceptedStatuses.includes(response.status)) {
    const details = {
      status: response.status,
      requestId: safeRequestId(response),
    };
    await discardBody(response);
    throw new OperationError("RENDER_REQUEST_REJECTED", phase, details);
  }
  if (!parseJson || response.status === 204) {
    await discardBody(response);
    return undefined;
  }
  return parseSuccessJson(response, phase);
};

const unwrap = (value, key) => (
  value?.[key] ?? value
);

const selectServiceLink = (value, phase) => {
  requireCondition(
    value !== null
    && typeof value === "object"
    && typeof value.id === "string"
    && value.id.length > 0
    && typeof value.name === "string"
    && value.name.length > 0,
    "RENDER_ENV_GROUP_SERVICE_LINK_INVALID",
    phase,
  );
  return { id: value.id, name: value.name };
};

const selectEnvironmentGroupSummary = (entry) => {
  const value = unwrap(entry, "envGroup");
  requireCondition(
    value !== null
    && typeof value === "object"
    && typeof value.id === "string"
    && value.id.length > 0
    && typeof value.name === "string"
    && value.name.length > 0
    && typeof value.ownerId === "string"
    && value.ownerId.length > 0
    && Array.isArray(value.serviceLinks),
    "RENDER_ENV_GROUP_ENTRY_INVALID",
    "render-env-group-list",
  );
  return {
    id: value.id,
    name: value.name,
    ownerId: value.ownerId,
    serviceLinks: value.serviceLinks.map((link) => (
      selectServiceLink(link, "render-env-group-list")
    )),
  };
};

const selectEnvironmentGroupDetail = (payload) => {
  const value = unwrap(payload, "envGroup");
  requireCondition(
    value !== null
    && typeof value === "object"
    && typeof value.id === "string"
    && value.id.length > 0
    && typeof value.name === "string"
    && value.name.length > 0
    && typeof value.ownerId === "string"
    && value.ownerId.length > 0
    && Array.isArray(value.serviceLinks)
    && Array.isArray(value.envVars)
    && Array.isArray(value.secretFiles),
    "RENDER_ENV_GROUP_DETAIL_INVALID",
    "render-env-group-read",
  );
  const envVars = value.envVars.map((entry) => {
    requireCondition(
      entry !== null
      && typeof entry === "object"
      && typeof entry.key === "string"
      && entry.key.length > 0
      && typeof entry.value === "string",
      "RENDER_ENV_GROUP_ENV_ENTRY_INVALID",
      "render-env-group-read",
    );
    return { key: entry.key, value: entry.value };
  });
  const secretFileNames = value.secretFiles.map((entry) => {
    const secretFile = unwrap(entry, "secretFile");
    requireCondition(
      secretFile !== null
      && typeof secretFile === "object"
      && typeof secretFile.name === "string"
      && secretFile.name.length > 0,
      "RENDER_ENV_GROUP_SECRET_FILE_INVALID",
      "render-env-group-read",
    );
    return secretFile.name;
  });
  return {
    id: value.id,
    name: value.name,
    ownerId: value.ownerId,
    serviceLinks: value.serviceLinks.map((link) => (
      selectServiceLink(link, "render-env-group-read")
    )),
    envVars,
    secretFileNames,
  };
};

const createRenderAdapter = ({ fetchImpl = undiciFetch } = {}) => ({
  async readService(renderToken) {
    const payload = await renderRequest({
      fetchImpl,
      renderToken,
      suffix: `/v1/services/${encodeURIComponent(RENDER_API_SERVICE_ID)}`,
      phase: "render-service-verify",
    });
    return unwrap(payload, "service");
  },

  async readEnvironment(renderToken) {
    const entries = [];
    const cursors = new Set();
    let cursor = "";
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const query = cursor
        ? `limit=100&cursor=${encodeURIComponent(cursor)}`
        : "limit=100";
      const payload = await renderRequest({
        fetchImpl,
        renderToken,
        suffix: (
          `/v1/services/${encodeURIComponent(RENDER_API_SERVICE_ID)}`
          + `/env-vars?${query}`
        ),
        phase: "render-env-read",
      });
      requireCondition(
        Array.isArray(payload),
        "RENDER_ENV_LIST_INVALID",
        "render-env-read",
      );
      for (const entry of payload) {
        requireCondition(
          entry !== null
          && typeof entry === "object"
          && entry.envVar !== null
          && typeof entry.envVar === "object"
          && typeof entry.envVar.key === "string"
          && typeof entry.envVar.value === "string",
          "RENDER_ENV_ENTRY_INVALID",
          "render-env-read",
        );
        const envVar = entry.envVar;
        if (!RENDER_ENV_READ_KEYS.has(envVar.key)) continue;
        entries.push({
          key: envVar.key,
          value: envVar.value,
        });
      }
      if (payload.length < 100) return entries;
      const nextCursor = String(payload.at(-1)?.cursor ?? "").trim();
      requireCondition(
        nextCursor
        && !cursors.has(nextCursor),
        "RENDER_ENV_CURSOR_INVALID",
        "render-env-read",
      );
      cursors.add(nextCursor);
      cursor = nextCursor;
    }
    throw new OperationError(
      "RENDER_ENV_PAGINATION_EXCEEDED",
      "render-env-read",
    );
  },

  async readEnvironmentGroups(renderToken) {
    const groups = [];
    const cursors = new Set();
    let cursor = "";
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const query = cursor
        ? `limit=100&cursor=${encodeURIComponent(cursor)}`
        : "limit=100";
      const payload = await renderRequest({
        fetchImpl,
        renderToken,
        suffix: `/v1/env-groups?${query}`,
        phase: "render-env-group-list",
      });
      requireCondition(
        Array.isArray(payload),
        "RENDER_ENV_GROUP_LIST_INVALID",
        "render-env-group-list",
      );
      for (const entry of payload) {
        groups.push(selectEnvironmentGroupSummary(entry));
      }
      if (payload.length < 100) return groups;
      const nextCursor = String(payload.at(-1)?.cursor ?? "").trim();
      requireCondition(
        nextCursor
        && !cursors.has(nextCursor),
        "RENDER_ENV_GROUP_CURSOR_INVALID",
        "render-env-group-list",
      );
      cursors.add(nextCursor);
      cursor = nextCursor;
    }
    throw new OperationError(
      "RENDER_ENV_GROUP_PAGINATION_EXCEEDED",
      "render-env-group-list",
    );
  },

  async readEnvironmentGroup(renderToken, groupId) {
    requireCondition(
      typeof groupId === "string"
      && sha256(groupId) === APPROVED_PREVIEW_GROUP_ID_SHA256,
      "RENDER_ENV_GROUP_ID_INVALID",
      "render-env-group-read",
    );
    const payload = await renderRequest({
      fetchImpl,
      renderToken,
      suffix: `/v1/env-groups/${encodeURIComponent(groupId)}`,
      phase: "render-env-group-read",
    });
    return selectEnvironmentGroupDetail(payload);
  },

  async putEnvironment(renderToken, key, value) {
    requireCondition(
      RENDER_ENV_MUTATION_KEYS.has(key),
      "RENDER_ENV_MUTATION_KEY_INVALID",
      "render-env-set",
    );
    await renderRequest({
      fetchImpl,
      renderToken,
      suffix: (
        `/v1/services/${encodeURIComponent(RENDER_API_SERVICE_ID)}`
        + `/env-vars/${encodeURIComponent(key)}`
      ),
      phase: "render-env-set",
      method: "PUT",
      body: { value },
      acceptedStatuses: [200],
      parseJson: false,
    });
  },

  async deleteEnvironment(renderToken, key) {
    requireCondition(
      RENDER_ENV_MUTATION_KEYS.has(key),
      "RENDER_ENV_MUTATION_KEY_INVALID",
      "render-env-delete",
    );
    await renderRequest({
      fetchImpl,
      renderToken,
      suffix: (
        `/v1/services/${encodeURIComponent(RENDER_API_SERVICE_ID)}`
        + `/env-vars/${encodeURIComponent(key)}`
      ),
      phase: "render-env-delete",
      method: "DELETE",
      acceptedStatuses: [204, 404],
      parseJson: false,
    });
  },
});

const matchingEntries = (entries, key) => (
  entries.filter((entry) => entry.key === key)
);

const requireUniqueEntry = (entries, key, phase) => {
  const matches = matchingEntries(entries, key);
  requireCondition(
    matches.length <= 1,
    "RENDER_ENV_KEY_DUPLICATED",
    phase,
    { key, matchCount: matches.length },
  );
  return matches[0];
};

const addSensitiveEnvironmentValues = (entries, sensitiveValues) => {
  for (const entry of entries) {
    if (
      [
        ...RENDER_TARGET_KEYS,
        ...CONFLICTING_OAUTH_ALIAS_KEYS,
      ].includes(entry.key)
      && entry.value
    ) sensitiveValues.add(entry.value);
  }
};

const verifyRenderService = (service) => {
  requireCondition(
    service?.id === RENDER_API_SERVICE_ID
    && service?.name === RENDER_API_SERVICE_NAME
    && service?.type === "web_service"
    && typeof service?.ownerId === "string"
    && service.ownerId.length > 0
    && normalizeRepository(service?.repo) === RENDER_REPOSITORY
    && service?.branch === RENDER_BRANCH
    && service?.rootDir === RENDER_API_ROOT_DIRECTORY
    && service?.autoDeploy === "no"
    && service?.serviceDetails?.runtime === "python"
    && (
      service?.serviceDetails?.healthCheckPath
      ?? service?.serviceDetails?.envSpecificDetails?.healthCheckPath
    ) === RENDER_API_HEALTH_PATH
    && serviceCommand(service, "buildCommand") === RENDER_API_BUILD_COMMAND
    && serviceCommand(service, "startCommand") === RENDER_API_START_COMMAND,
    "RENDER_SERVICE_IDENTITY_INVALID",
    "render-service-verify",
  );
};

const canonicalServiceLinks = (links) => (
  [...links]
    .map(({ id, name }) => `${id}\0${name}`)
    .sort()
);

const verifyEnvironmentGroupTopology = ({
  groups,
  service,
  approvedGroupIdHash,
}) => {
  requireCondition(
    Array.isArray(groups)
    && new Set(groups.map((group) => group.id)).size === groups.length,
    "RENDER_ENV_GROUP_TOPOLOGY_INVALID",
    "render-env-group-verify",
  );
  const linked = groups.filter((group) => (
    group.serviceLinks.some((link) => link.id === RENDER_API_SERVICE_ID)
  ));
  requireCondition(
    linked.length === 1,
    "RENDER_ENV_GROUP_LINKAGE_INVALID",
    "render-env-group-verify",
    { matchCount: linked.length },
  );
  const group = linked[0];
  const expectedLinks = [
    { id: RENDER_API_SERVICE_ID, name: RENDER_API_SERVICE_NAME },
    { id: RENDER_LLM_SERVICE_ID, name: RENDER_LLM_SERVICE_NAME },
  ];
  requireCondition(
    sha256(group.id) === approvedGroupIdHash
    && group.name === RENDER_PREVIEW_GROUP_NAME
    && group.ownerId === service.ownerId
    && JSON.stringify(canonicalServiceLinks(group.serviceLinks))
      === JSON.stringify(canonicalServiceLinks(expectedLinks)),
    "RENDER_ENV_GROUP_IDENTITY_INVALID",
    "render-env-group-verify",
  );
  return {
    id: group.id,
    name: group.name,
    ownerId: group.ownerId,
    serviceLinks: group.serviceLinks,
  };
};

const verifyEnvironmentGroupDetail = (detail, lock) => {
  requireCondition(
    detail?.id === lock.id
    && detail?.name === lock.name
    && detail?.ownerId === lock.ownerId
    && JSON.stringify(canonicalServiceLinks(detail?.serviceLinks ?? []))
      === JSON.stringify(canonicalServiceLinks(lock.serviceLinks))
    && Array.isArray(detail?.secretFileNames)
    && detail.secretFileNames.length === 0,
    "RENDER_ENV_GROUP_DETAIL_MISMATCH",
    "render-env-group-verify",
  );
  const entries = detail.envVars.filter((entry) => (
    RENDER_ENV_READ_KEYS.has(entry.key)
  ));
  for (const key of [
    ...RENDER_TARGET_KEYS,
    ...CONFLICTING_OAUTH_ALIAS_KEYS,
  ]) {
    requireCondition(
      matchingEntries(entries, key).length === 0,
      "RENDER_ENV_GROUP_OAUTH_CONFLICT",
      "render-env-group-verify",
      { key, matchCount: matchingEntries(entries, key).length },
    );
  }
  return entries;
};

const indexedEntries = (entries, phase) => {
  const indexed = new Map();
  for (const entry of entries) {
    requireCondition(
      !indexed.has(entry.key),
      "RENDER_ENV_KEY_DUPLICATED",
      phase,
      { key: entry.key, matchCount: 2 },
    );
    indexed.set(entry.key, entry);
  }
  return indexed;
};

const effectiveEnvironment = (groupEntries, directEntries) => {
  const effective = indexedEntries(
    groupEntries,
    "render-env-group-verify",
  );
  for (const [key, entry] of indexedEntries(
    directEntries,
    "render-env-read",
  )) {
    effective.set(key, entry);
  }
  return [...effective.values()];
};

const verifyOAuthSourceBoundaries = (groupEntries, directEntries) => {
  const allEntries = [...groupEntries, ...directEntries];
  const canonicalRedirects = matchingEntries(
    allEntries,
    GOOGLE_REDIRECT_KEYS[0],
  );
  const aliasRedirects = matchingEntries(
    allEntries,
    GOOGLE_REDIRECT_KEYS[1],
  );
  requireCondition(
    canonicalRedirects.length === 1
    && canonicalRedirects[0].value === GOOGLE_REDIRECT_URI
    && aliasRedirects.length === 0,
    "RENDER_GOOGLE_REDIRECT_URI_MISMATCH",
    "render-env-preflight",
    {
      key: GOOGLE_REDIRECT_KEYS[0],
      matchCount: canonicalRedirects.length,
    },
  );
};

const verifyPreviewEnvironment = (entries, phase = "render-env-preflight") => {
  for (const [key, expected] of Object.entries(RENDER_PREVIEW_BINDINGS)) {
    const entry = requireUniqueEntry(entries, key, phase);
    requireCondition(
      entry?.value === expected,
      "RENDER_PREVIEW_BINDING_MISMATCH",
      phase,
      { key, matchCount: entry ? 1 : 0 },
    );
  }
  for (const key of CONFLICTING_OAUTH_ALIAS_KEYS) {
    const entry = requireUniqueEntry(entries, key, phase);
    requireCondition(
      entry === undefined,
      "RENDER_OAUTH_ALIAS_CONFLICT",
      phase,
      { key, matchCount: 1 },
    );
  }
  const canonicalRedirect = requireUniqueEntry(
    entries,
    GOOGLE_REDIRECT_KEYS[0],
    phase,
  );
  const aliasRedirect = requireUniqueEntry(
    entries,
    GOOGLE_REDIRECT_KEYS[1],
    phase,
  );
  requireCondition(
    canonicalRedirect?.value === GOOGLE_REDIRECT_URI
    && aliasRedirect === undefined,
    "RENDER_GOOGLE_REDIRECT_URI_MISMATCH",
    phase,
    {
      key: GOOGLE_REDIRECT_KEYS[0],
      matchCount: canonicalRedirect ? 1 : 0,
    },
  );
};

const readLockedRenderState = async ({
  adapter,
  renderToken,
  approvedGroupIdHash,
  sensitiveValues,
}) => {
  const service = await adapter.readService(renderToken);
  verifyRenderService(service);
  const groups = await adapter.readEnvironmentGroups(renderToken);
  const groupLock = verifyEnvironmentGroupTopology({
    groups,
    service,
    approvedGroupIdHash,
  });
  sensitiveValues.add(service.ownerId);
  sensitiveValues.add(groupLock.id);
  for (const link of groupLock.serviceLinks) {
    sensitiveValues.add(link.id);
  }
  const groupDetail = await adapter.readEnvironmentGroup(
    renderToken,
    groupLock.id,
  );
  addSensitiveEnvironmentValues(groupDetail?.envVars ?? [], sensitiveValues);
  const groupEntries = verifyEnvironmentGroupDetail(
    groupDetail,
    groupLock,
  );
  const directEntries = await adapter.readEnvironment(renderToken);
  addSensitiveEnvironmentValues(groupEntries, sensitiveValues);
  addSensitiveEnvironmentValues(directEntries, sensitiveValues);
  verifyOAuthSourceBoundaries(groupEntries, directEntries);
  const effectiveEntries = effectiveEnvironment(
    groupEntries,
    directEntries,
  );
  verifyPreviewEnvironment(effectiveEntries);
  return {
    directEntries,
    effectiveEntries,
    groupLock,
  };
};

const snapshotTargets = (entries, phase, sensitiveValues) => {
  const snapshot = new Map();
  for (const key of RENDER_TARGET_KEYS) {
    const entry = requireUniqueEntry(entries, key, phase);
    if (entry?.value) sensitiveValues.add(entry.value);
    snapshot.set(key, entry
      ? { present: true, value: entry.value }
      : { present: false, value: "" });
  }
  return snapshot;
};

const targetPresence = (snapshot) => ({
  clientIdPresent: snapshot.get(RENDER_CLIENT_ID_KEY)?.present === true,
  clientSecretPresent: (
    snapshot.get(RENDER_CLIENT_SECRET_KEY)?.present === true
  ),
});

const requireTargetsMatch = ({
  entries,
  expected,
  phase,
  code,
  sensitiveValues,
}) => {
  const actual = snapshotTargets(entries, phase, sensitiveValues);
  for (const key of RENDER_TARGET_KEYS) {
    const expectedEntry = expected.get(key);
    const actualEntry = actual.get(key);
    requireCondition(
      actualEntry.present === expectedEntry.present
      && (
        !expectedEntry.present
        || actualEntry.value === expectedEntry.value
      ),
      code,
      phase,
      { key },
    );
  }
  return actual;
};

const snapshotEntryMatches = (actual, expected) => (
  actual.present === expected.present
  && (!expected.present || actual.value === expected.value)
);

const normalizeOperationError = (error, phase) => (
  error instanceof OperationError
    ? error
    : new OperationError("UNEXPECTED_FAILURE", phase)
);

const verifyEnvironmentEventually = async ({
  read,
  verify,
  phase,
  wait = pause,
}) => {
  let lastError = new OperationError("RENDER_ENV_READBACK_MISMATCH", phase);
  for (let attempt = 0; attempt < READBACK_ATTEMPTS; attempt += 1) {
    try {
      const value = await read();
      verify(value);
      return value;
    } catch (error) {
      lastError = normalizeOperationError(error, phase);
    }
    if (attempt + 1 < READBACK_ATTEMPTS) {
      await wait(READBACK_DELAY_MS);
    }
  }
  throw lastError;
};

const verifyEnvironmentStably = async ({
  read,
  verify,
  phase,
  wait = pause,
  requiredConsecutiveReads = 2,
}) => {
  let consecutiveReads = 0;
  let lastError = new OperationError(
    "RENDER_ENV_STABLE_READBACK_UNCONFIRMED",
    phase,
  );
  for (let attempt = 0; attempt < READBACK_ATTEMPTS; attempt += 1) {
    try {
      const value = await read();
      verify(value);
      consecutiveReads += 1;
      if (consecutiveReads >= requiredConsecutiveReads) return value;
      lastError = new OperationError(
        "RENDER_ENV_STABLE_READBACK_UNCONFIRMED",
        phase,
      );
    } catch (error) {
      consecutiveReads = 0;
      lastError = normalizeOperationError(error, phase);
    }
    if (attempt + 1 < READBACK_ATTEMPTS) {
      await wait(READBACK_DELAY_MS);
    }
  }
  throw lastError;
};

const restoreRenderTargets = async ({
  adapter,
  renderToken,
  before,
  ownedExpected,
  approvedGroupIdHash,
  sensitiveValues,
  wait = pause,
}) => {
  const readOwnedState = async (phase) => {
    try {
      const currentState = await readLockedRenderState({
        adapter,
        renderToken,
        approvedGroupIdHash,
        sensitiveValues,
      });
      const current = snapshotTargets(
        currentState.directEntries,
        phase,
        sensitiveValues,
      );
      for (const key of RENDER_TARGET_KEYS) {
        const actual = current.get(key);
        const original = before.get(key);
        const owned = ownedExpected.get(key);
        requireCondition(
          snapshotEntryMatches(actual, original)
          || snapshotEntryMatches(actual, owned),
          "RENDER_ENV_CONCURRENT_CHANGE",
          phase,
          { key, manualActionRequired: true },
        );
      }
      return current;
    } catch (error) {
      const precheck = normalizeOperationError(error, phase);
      throw new OperationError(
        "RENDER_ENV_ROLLBACK_UNCONFIRMED",
        "render-env-rollback",
        {
          primaryFailureCode: precheck.code,
          requestFailureCount: 0,
          manualActionRequired: true,
        },
      );
    }
  };

  await readOwnedState("render-env-rollback-precheck");

  const restoreRequestFailures = [];
  for (const key of [
    RENDER_CLIENT_ID_KEY,
    RENDER_CLIENT_SECRET_KEY,
  ]) {
    // Render has no compare-and-swap env-var endpoint. Re-read immediately
    // before each compensating write so a change made after the initial
    // rollback precheck is not silently overwritten.
    const current = await readOwnedState("render-env-rollback-prewrite");
    const snapshot = before.get(key);
    if (snapshotEntryMatches(current.get(key), snapshot)) continue;
    try {
      if (snapshot.present) {
        await adapter.putEnvironment(renderToken, key, snapshot.value);
      } else {
        await adapter.deleteEnvironment(renderToken, key);
      }
    } catch (error) {
      restoreRequestFailures.push(
        normalizeOperationError(error, "render-env-rollback"),
      );
    }
  }

  try {
    await verifyEnvironmentStably({
      read: () => readLockedRenderState({
        adapter,
        renderToken,
        approvedGroupIdHash,
        sensitiveValues,
      }),
      phase: "render-env-rollback-verify",
      wait,
      verify: (renderState) => {
        requireTargetsMatch({
          entries: renderState.directEntries,
          expected: before,
          phase: "render-env-rollback-verify",
          code: "RENDER_ENV_ROLLBACK_MISMATCH",
          sensitiveValues,
        });
      },
    });
  } catch (error) {
    const verification = normalizeOperationError(
      error,
      "render-env-rollback-verify",
    );
    throw new OperationError(
      "RENDER_ENV_ROLLBACK_UNCONFIRMED",
      "render-env-rollback",
      {
        primaryFailureCode: verification.code,
        requestFailureCount: restoreRequestFailures.length,
        manualActionRequired: true,
      },
    );
  }
};

const installOAuthInRender = async ({
  adapter,
  renderToken,
  credentials,
  state,
  approvedGroupIdHash,
  sensitiveValues,
  wait = pause,
}) => {
  state.phase = "render-service-verify";
  const originalState = await readLockedRenderState({
    adapter,
    renderToken,
    approvedGroupIdHash,
    sensitiveValues,
  });
  state.phase = "render-env-preflight";
  const before = snapshotTargets(
    originalState.directEntries,
    "render-env-preflight",
    sensitiveValues,
  );

  state.phase = "render-env-premutation-confirm";
  const confirmationState = await readLockedRenderState({
    adapter,
    renderToken,
    approvedGroupIdHash,
    sensitiveValues,
  });
  requireTargetsMatch({
    entries: confirmationState.directEntries,
    expected: before,
    phase: "render-env-premutation-confirm",
    code: "RENDER_ENV_PREMUTATION_CHANGED",
    sensitiveValues,
  });

  const expected = new Map([
    [
      RENDER_CLIENT_ID_KEY,
      { present: true, value: credentials.clientId },
    ],
    [
      RENDER_CLIENT_SECRET_KEY,
      { present: true, value: credentials.clientSecret },
    ],
  ]);
  state.adapter = adapter;
  state.before = before;
  state.ownedExpected = expected;
  state.approvedGroupIdHash = approvedGroupIdHash;
  state.renderState = "mutating";
  state.mutationStarted = true;

  try {
    state.phase = "render-env-secret-set";
    await adapter.putEnvironment(
      renderToken,
      RENDER_CLIENT_SECRET_KEY,
      credentials.clientSecret,
    );
    state.phase = "render-env-client-id-set";
    await adapter.putEnvironment(
      renderToken,
      RENDER_CLIENT_ID_KEY,
      credentials.clientId,
    );
    state.phase = "render-env-readback";
    await verifyEnvironmentEventually({
      phase: "render-env-readback",
      wait,
      read: () => readLockedRenderState({
        adapter,
        renderToken,
        approvedGroupIdHash,
        sensitiveValues,
      }),
      verify: (renderState) => {
        requireTargetsMatch({
          entries: renderState.directEntries,
          expected,
          phase: "render-env-readback",
          code: "RENDER_ENV_READBACK_MISMATCH",
          sensitiveValues,
        });
      },
    });
    state.renderState = "committed";
  } catch (error) {
    const primary = normalizeOperationError(error, state.phase);
    state.phase = "render-env-rollback";
    state.rollbackAttempted = true;
    try {
      await restoreRenderTargets({
        adapter,
        renderToken,
        before,
        ownedExpected: expected,
        approvedGroupIdHash,
        sensitiveValues,
        wait,
      });
      state.renderState = "rolled-back";
      state.rollbackConfirmed = true;
    } catch (rollbackError) {
      state.renderState = "rollback-unconfirmed";
      state.rollbackConfirmed = false;
      const rollback = normalizeOperationError(
        rollbackError,
        "render-env-rollback",
      );
      throw new OperationError(
        "RENDER_ENV_ROLLBACK_UNCONFIRMED",
        "render-env-rollback",
        {
          primaryFailureCode: primary.code,
          rollbackFailureCode: rollback.code,
          manualActionRequired: true,
        },
      );
    }
    throw primary;
  }

  return {
    environmentKeys: [...RENDER_TARGET_KEYS],
    before: targetPresence(before),
    after: {
      clientIdPresent: true,
      clientSecretPresent: true,
    },
    previewEnvironmentExact: true,
    previewServiceRoleExact: true,
    canonicalRedirectExact: true,
    serviceContractExact: true,
    linkedEnvironmentGroupExact: true,
    readbackExact: true,
    deploymentTriggered: false,
  };
};

const safeError = (error, fallbackPhase) => {
  if (!(error instanceof OperationError)) {
    return { code: "UNEXPECTED_FAILURE", phase: fallbackPhase };
  }
  const details = {};
  if (Number.isInteger(error.details?.status)) {
    details.providerStatus = error.details.status;
  }
  if (
    SAFE_REQUEST_ID_PATTERN.test(error.details?.requestId ?? "")
    && error.details.requestId !== "unavailable"
  ) details.requestId = error.details.requestId;
  if (
    typeof error.details?.key === "string"
    && RENDER_ENV_READ_KEYS.has(error.details.key)
  ) details.environmentKey = error.details.key;
  if (Number.isInteger(error.details?.matchCount)) {
    details.matchCount = error.details.matchCount;
  }
  if (Number.isInteger(error.details?.requestFailureCount)) {
    details.requestFailureCount = error.details.requestFailureCount;
  }
  if (
    SAFE_FAILURE_CODE_PATTERN.test(
      error.details?.primaryFailureCode ?? "",
    )
  ) details.primaryFailureCode = error.details.primaryFailureCode;
  if (
    SAFE_FAILURE_CODE_PATTERN.test(
      error.details?.rollbackFailureCode ?? "",
    )
  ) details.rollbackFailureCode = error.details.rollbackFailureCode;
  return {
    code: error.code,
    phase: error.phase,
    ...(Object.keys(details).length > 0 ? { details } : {}),
  };
};

const assertRedacted = (serialized, sensitiveValues) => {
  for (const value of sensitiveValues) {
    if (
      typeof value === "string"
      && value.length > 0
      && serialized.includes(value)
    ) {
      throw new OperationError("OUTPUT_REDACTION_FAILURE", "output");
    }
  }
  requireCondition(
    !GOOGLE_CLIENT_ID_OUTPUT_PATTERN.test(serialized)
    && !/GOCSPX-[A-Za-z0-9_-]+/u.test(serialized)
    && !/"(?:authorization|clientId|clientSecret|client_id|client_secret|renderToken|value)"\s*:/iu
      .test(serialized),
    "OUTPUT_CREDENTIAL_FIELD_DETECTED",
    "output",
  );
};

const serializeOutput = (value, sensitiveValues) => {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  assertRedacted(serialized, sensitiveValues);
  return serialized;
};

const failureOutput = ({
  error,
  state,
  startedAt,
}) => ({
  schemaVersion: 1,
  operation: OPERATION,
  status: "fail",
  startedAt: startedAt.toISOString(),
  completedAt: new Date().toISOString(),
  failure: safeError(error, state.phase),
  target: {
    renderServiceIdentityHash: redactedIdentity(
      `${RENDER_API_SERVICE_ID}\0${RENDER_API_SERVICE_NAME}`,
    ),
  },
  state: {
    render: state.renderState,
  },
  rollback: {
    attempted: state.rollbackAttempted,
    confirmed: state.rollbackConfirmed,
  },
  manualActionRequired: state.renderState === "rollback-unconfirmed",
  failureCodes: [
    error instanceof OperationError
      ? error.code
      : "UNEXPECTED_FAILURE",
  ],
});

const approvedGroupIdHashFor = ({
  adapter,
  environment,
  testOnly,
}) => {
  if (testOnly === undefined) return APPROVED_PREVIEW_GROUP_ID_SHA256;
  requireCondition(
    process.env.NODE_ENV === "test"
    && environment.NODE_ENV === "test"
    && adapter
    && testOnly.authority === TEST_ONLY_GOOGLE_OAUTH
    && /^[a-f0-9]{64}$/u.test(testOnly.approvedGroupIdHash ?? ""),
    "TEST_ONLY_CONFIGURATION_REJECTED",
    "input",
  );
  return testOnly.approvedGroupIdHash;
};

const runOperation = async ({
  argv = process.argv,
  environment = process.env,
  input = process.stdin,
  adapter,
  testOnly,
  wait = pause,
  writeOutput = (serialized) => process.stdout.write(serialized),
} = {}) => {
  const sensitiveValues = new Set([
    RENDER_API_SERVICE_ID,
    RENDER_API_SERVICE_NAME,
    RENDER_LLM_SERVICE_ID,
    RENDER_LLM_SERVICE_NAME,
  ]);
  const startedAt = new Date();
  const state = {
    phase: "input",
    adapter: undefined,
    before: undefined,
    ownedExpected: undefined,
    approvedGroupIdHash: undefined,
    mutationStarted: false,
    renderState: "unchanged",
    rollbackAttempted: false,
    rollbackConfirmed: false,
  };
  let renderToken = "";
  let credentials;
  try {
    requireCondition(
      argv.length === 3
      && argv[2] === "--execute",
      "EXPLICIT_EXECUTE_FLAG_REQUIRED",
      "input",
    );
    requireExactNodeVersion(process.versions.node);
    renderToken = validateRenderToken(environment.RENDER_API_KEY);
    sensitiveValues.add(renderToken);
    credentials = await readCredentialJson(input, sensitiveValues);
    const renderAdapter = adapter ?? createRenderAdapter();
    state.adapter = renderAdapter;
    const approvedGroupIdHash = approvedGroupIdHashFor({
      adapter,
      environment,
      testOnly,
    });
    state.approvedGroupIdHash = approvedGroupIdHash;

    const renderEvidence = await installOAuthInRender({
      adapter: renderAdapter,
      renderToken,
      credentials,
      state,
      approvedGroupIdHash,
      sensitiveValues,
      wait,
    });
    state.phase = "output";
    const result = {
      schemaVersion: 1,
      operation: OPERATION,
      status: "pass",
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      target: {
        renderServiceIdentityHash: redactedIdentity(
          `${RENDER_API_SERVICE_ID}\0${RENDER_API_SERVICE_NAME}`,
        ),
        previewEnvironment: "preview-v2",
        previewServiceRole: "api",
      },
      render: renderEvidence,
      rollback: {
        attempted: false,
        confirmed: false,
      },
      checks: {
        exactNodeRuntime: true,
        exactRenderService: true,
        exactRenderServiceContract: true,
        exactApprovedLinkedEnvironmentGroup: true,
        exactPreviewBindings: true,
        exactCanonicalRedirect: true,
        exactOAuthEnvironmentKeys: true,
        credentialValuesReadBackExact: true,
        rollbackRequiresOwnedValues: true,
        renderDeployNotTriggered: true,
        noSecretPersistedToLocalDisk: true,
        noSecretIncludedInOutput: true,
      },
      manualActionRequired: false,
      failureCodes: [],
    };
    const serialized = serializeOutput(result, sensitiveValues);
    writeOutput(serialized);
    return 0;
  } catch (caughtError) {
    let error = normalizeOperationError(caughtError, state.phase);
    if (
      state.renderState === "committed"
      && state.adapter
      && state.before
      && state.ownedExpected
      && state.approvedGroupIdHash
      && renderToken
    ) {
      state.phase = "render-env-postcommit-rollback";
      state.rollbackAttempted = true;
      try {
        await restoreRenderTargets({
          adapter: state.adapter,
          renderToken,
          before: state.before,
          ownedExpected: state.ownedExpected,
          approvedGroupIdHash: state.approvedGroupIdHash,
          sensitiveValues,
          wait,
        });
        state.renderState = "rolled-back";
        state.rollbackConfirmed = true;
      } catch (rollbackError) {
        const rollback = normalizeOperationError(
          rollbackError,
          "render-env-postcommit-rollback",
        );
        state.renderState = "rollback-unconfirmed";
        state.rollbackConfirmed = false;
        error = new OperationError(
          "RENDER_ENV_ROLLBACK_UNCONFIRMED",
          "render-env-postcommit-rollback",
          {
            primaryFailureCode: error.code,
            rollbackFailureCode: rollback.code,
            manualActionRequired: true,
          },
        );
      }
    }

    const result = failureOutput({ error, state, startedAt });
    try {
      writeOutput(serializeOutput(result, sensitiveValues));
    } catch {
      writeOutput(`${JSON.stringify({
        schemaVersion: 1,
        operation: OPERATION,
        status: "fail",
        failure: {
          code: "OUTPUT_REDACTION_FAILURE",
          phase: "output",
        },
        state: {
          render: state.renderState === "rolled-back"
            ? "rolled-back"
            : "unknown",
        },
        rollback: {
          attempted: state.rollbackAttempted,
          confirmed: state.rollbackConfirmed,
        },
        manualActionRequired: (
          state.renderState !== "unchanged"
          && state.renderState !== "rolled-back"
        ),
        failureCodes: ["OUTPUT_REDACTION_FAILURE"],
      }, null, 2)}\n`);
    }
    return 1;
  } finally {
    renderToken = "";
    credentials = undefined;
  }
};

const configureTransport = () => {
  const hasProxy = [
    process.env.HTTPS_PROXY,
    process.env.https_proxy,
    process.env.HTTP_PROXY,
    process.env.http_proxy,
  ].some((value) => typeof value === "string" && value.trim());
  const dispatcher = hasProxy
    ? new EnvHttpProxyAgent()
    : new Agent({ connectTimeout: REQUEST_TIMEOUT_MS });
  setGlobalDispatcher(dispatcher);
  return dispatcher;
};

const executeMain = async () => {
  const dispatcher = configureTransport();
  try {
    process.exitCode = await runOperation();
  } finally {
    try {
      await dispatcher.close();
    } catch {
      // Transport cleanup must not replace the already-redacted result.
    }
  }
};

const isEntrypoint = Boolean(
  process.argv[1]
  && realpathSync(resolve(process.argv[1]))
    === realpathSync(fileURLToPath(import.meta.url)),
);

if (isEntrypoint) {
  await executeMain();
}

export const __test = Object.freeze({
  APPROVED_PREVIEW_GROUP_ID_SHA256,
  GOOGLE_REDIRECT_URI,
  INPUT_KEYS,
  OPERATION,
  OperationError,
  READBACK_ATTEMPTS,
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
  installOAuthInRender,
  parseCredentialPayload,
  requireExactNodeVersion,
  restoreRenderTargets,
  runOperation,
  serializeOutput,
  sha256,
  topLevelJsonObjectKeys,
  verifyEnvironmentGroupTopology,
  verifyPreviewEnvironment,
  verifyRenderService,
});
