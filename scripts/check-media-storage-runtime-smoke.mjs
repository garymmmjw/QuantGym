#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/329-media-storage-runtime-smoke-summary.json";
const keepTemp = args.includes("--keep-temp");
const startedAt = Date.now();
const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const tinyPng = Buffer.from(tinyPngBase64, "base64");
const oversizedPng = Buffer.alloc(129, 1);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-media-runtime-"));
const tempDb = path.join(tempDir, "quantgym-media-runtime.sqlite3");
const tempMediaRoot = path.join(tempDir, "media");
const failures = [];
const warnings = [];
let apiProcess;

try {
  const apiPort = await findFreePort();
  const baseUrl = `http://127.0.0.1:${apiPort}`;
  apiProcess = startApi(apiPort);
  await waitForHealth(baseUrl);

  const unauthenticatedUpload = await postJson(`${baseUrl}/api/media`, {
    dataUrl: `data:image/png;base64,${tinyPngBase64}`,
    name: "tiny-upload.png",
    context: "unauthenticated-media-runtime-smoke"
  });
  if (unauthenticatedUpload.status !== 401) {
    fail(`Unauthenticated media upload should return 401, got ${unauthenticatedUpload.status}.`);
  }

  const email = `media-runtime-${Date.now()}@example.test`;
  const registerResponse = await postJson(`${baseUrl}/api/auth/register`, {
    password: "media-smoke-password",
    account: {
      id: `media-runtime-${Date.now()}`,
      provider: "local",
      email,
      name: "Media Runtime Smoke",
      country: "us",
      region: "CA"
    },
    state: {},
    problemStates: [],
    community: { posts: [] }
  });
  if (registerResponse.status !== 201) {
    throw new Error(`Registration failed with ${registerResponse.status}: ${JSON.stringify(registerResponse.data)}`);
  }
  const token = registerResponse.data?.token;
  if (!token) throw new Error("Registration did not return a bearer token.");

  const uploadResponse = await postJson(
    `${baseUrl}/api/media`,
    {
      dataUrl: `data:image/png;base64,${tinyPngBase64}`,
      name: "tiny upload.png",
      type: "image",
      context: "media-runtime-smoke"
    },
    token
  );
  if (uploadResponse.status !== 201) {
    throw new Error(`Authenticated media upload failed with ${uploadResponse.status}: ${JSON.stringify(uploadResponse.data)}`);
  }

  const media = uploadResponse.data?.media || {};
  validateUploadResponse(media, baseUrl);

  const spoofedForwardedUploadResponse = await postJson(
    `${baseUrl}/api/media`,
    {
      dataUrl: `data:image/png;base64,${tinyPngBase64}`,
      name: "spoofed-forwarded-host.png",
      type: "image",
      context: "spoofed-forwarded-host-media-runtime-smoke"
    },
    token,
    {
      "X-Forwarded-Proto": "https",
      "X-Forwarded-Ssl": "on",
      "X-Forwarded-Host": "evil.example.test",
      "CF-Connecting-IP": "203.0.113.10"
    }
  );
  if (spoofedForwardedUploadResponse.status !== 201) {
    fail(`Spoofed forwarded-host upload should return 201, got ${spoofedForwardedUploadResponse.status}.`);
  }
  const spoofedForwardedMedia = spoofedForwardedUploadResponse.data?.media || {};
  validateSpoofedForwardedHostMedia(spoofedForwardedMedia, baseUrl);

	  const filePath = path.join(tempMediaRoot, `${media.id}.png`);
	  if (!fs.existsSync(filePath)) {
	    fail(`Expected uploaded media file to exist at ${filePath}.`);
	  } else if (!fs.readFileSync(filePath).equals(tinyPng)) {
	    fail("Uploaded media file bytes did not match the original payload.");
	  }

	  const getResponse = await fetch(`${baseUrl}${media.path || `/api/media/${media.id}`}`);
	  const getBytes = Buffer.from(await getResponse.arrayBuffer());
	  validateGetResponse(getResponse, getBytes);

	  const mismatchedExtensionResponse = await postJson(
	    `${baseUrl}/api/media`,
	    {
	      dataUrl: `data:image/png;base64,${tinyPngBase64}`,
	      name: "mismatched-extension.mp4",
	      type: "image",
	      context: "mismatched-extension-media-runtime-smoke"
	    },
	    token
	  );
	  if (mismatchedExtensionResponse.status !== 201) {
	    fail(`Mismatched extension media upload should return 201, got ${mismatchedExtensionResponse.status}.`);
	  }
	  const mismatchedMedia = mismatchedExtensionResponse.data?.media || {};
	  const mismatchedDatabase = inspectDatabase(mismatchedMedia.id || "");
	  validateMismatchedExtensionMedia(mismatchedMedia, mismatchedDatabase);

	  const unsupportedResponse = await postJson(
	    `${baseUrl}/api/media`,
	    {
      dataUrl: `data:text/plain;base64,${Buffer.from("unsupported").toString("base64")}`,
      name: "unsupported.txt",
      context: "unsupported-media-runtime-smoke"
    },
    token
  );
  if (unsupportedResponse.status !== 415) {
    fail(`Unsupported media type should return 415, got ${unsupportedResponse.status}.`);
  }

  const oversizedResponse = await postJson(
    `${baseUrl}/api/media`,
    {
      dataUrl: `data:image/png;base64,${oversizedPng.toString("base64")}`,
      name: "oversized.png",
      context: "oversized-media-runtime-smoke"
    },
    token
  );
  if (oversizedResponse.status !== 413) {
    fail(`Oversized media upload should return 413, got ${oversizedResponse.status}.`);
  }

  const database = inspectDatabase(media.id);
  validateDatabase(database, media);
  const objectStorage = await exerciseObjectStorageRuntime();

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    apiPort,
    media: {
      id: media.id,
      path: media.path,
      contentType: media.contentType,
      byteSize: media.byteSize,
      storage: media.storage,
      urlUsesApiMediaEndpoint: typeof media.url === "string" && media.url.startsWith(`${baseUrl}/api/media/`),
      responseDoesNotInlineDataUrl: typeof media.dataUrl === "string" && !media.dataUrl.startsWith("data:")
    },
    spoofedForwardedHostUpload: {
      status: spoofedForwardedUploadResponse.status,
      mediaUrl: spoofedForwardedMedia.url || "",
      urlUsesApiMediaEndpoint: typeof spoofedForwardedMedia.url === "string" && spoofedForwardedMedia.url.startsWith(`${baseUrl}/api/media/`),
      forwardedHostIgnored: typeof spoofedForwardedMedia.url === "string" && !spoofedForwardedMedia.url.includes("evil.example.test"),
      forwardedProtoIgnored: typeof spoofedForwardedMedia.url === "string" && spoofedForwardedMedia.url.startsWith("http://")
    },
    objectStorage,
    checks: {
      registrationReturnedToken: Boolean(token),
      authenticatedUploadStatus: uploadResponse.status,
      spoofedForwardedHostUploadStatus: spoofedForwardedUploadResponse.status,
      spoofedForwardedHostIgnored: typeof spoofedForwardedMedia.url === "string" && !spoofedForwardedMedia.url.includes("evil.example.test"),
      spoofedForwardedProtoIgnored: typeof spoofedForwardedMedia.url === "string" && spoofedForwardedMedia.url.startsWith("http://"),
      spoofedForwardedMediaUrlUsesApiEndpoint: typeof spoofedForwardedMedia.url === "string" && spoofedForwardedMedia.url.startsWith(`${baseUrl}/api/media/`),
      unauthenticatedUploadStatus: unauthenticatedUpload.status,
      getMediaStatus: getResponse.status,
      getMediaBodyBytes: getBytes.length,
	      unsupportedMediaStatus: unsupportedResponse.status,
	      oversizedMediaStatus: oversizedResponse.status,
	      mismatchedExtensionUploadStatus: mismatchedExtensionResponse.status,
	      mismatchedExtensionStoredAsContentTypeExtension: String(mismatchedDatabase.media?.storage_path || "").endsWith(".png"),
	      mismatchedExtensionOriginalNamePreserved: mismatchedMedia.name === "mismatched-extension.mp4",
	      localFilePersisted: fs.existsSync(filePath),
	      localFileBytesMatch: fs.existsSync(filePath) && fs.readFileSync(filePath).equals(tinyPng),
	      databaseMediaRowPersisted: Boolean(database.media),
      databaseUploadAuditEvents: database.auditUploadEvents,
      databaseSessions: database.sessions
    },
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  fail(error?.stack || error?.message || String(error));
  const summary = {
    status: "fail",
    durationMs: Date.now() - startedAt,
    dbPath: tempDb,
    mediaRoot: tempMediaRoot,
    apiStdoutTail: tail(apiProcess?.stdoutText || ""),
    apiStderrTail: tail(apiProcess?.stderrText || ""),
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  if (apiProcess) await stopProcess(apiProcess);
  if (!keepTemp) fs.rmSync(tempDir, { recursive: true, force: true });
}

function startApi(port, envOverrides = {}) {
  const child = spawn("python3", ["api-server/server.py"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
      PORT: String(port),
      QUANTGYM_HOST: "127.0.0.1",
      QUANTGYM_DB: tempDb,
      QUANTGYM_MEDIA_ROOT: tempMediaRoot,
      QUANTGYM_MEDIA_STORAGE: "local",
      QUANTGYM_MEDIA_MAX_BYTES: "128",
      QUANTGYM_MAX_BODY_BYTES: "4096",
      QUANTGYM_REQUIRE_EMAIL_VERIFICATION: "0",
      QUANTGYM_RATE_LIMIT_DISABLED: "1",
      QUANTGYM_BETA_EMAIL_ALLOWLIST: "",
      ...envOverrides
    }
  });
  child.stdoutText = "";
  child.stderrText = "";
  child.stdout.on("data", (chunk) => {
    child.stdoutText += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    child.stderrText += chunk.toString("utf8");
  });
  return child;
}

async function waitForHealth(baseUrl, child = apiProcess) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (child.exitCode != null) {
      throw new Error(`API exited before health check. stderr: ${tail(child.stderrText || "")}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok === true) return;
    } catch {
      // Keep polling until startup finishes or timeout.
    }
    await delay(200);
  }
  throw new Error("Timed out waiting for API health.");
}

async function postJson(url, payload, token = "", extraHeaders = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { rawBody: text };
  }
  return { status: response.status, headers: response.headers, data };
}

function validateUploadResponse(media, baseUrl) {
  if (!media || typeof media !== "object") {
    fail("Upload response did not include a media object.");
    return;
  }
  if (!media.id) fail("Upload response media.id is missing.");
  if (media.path !== `/api/media/${media.id}`) fail(`Upload response path mismatch: ${media.path}.`);
  if (media.url !== `${baseUrl}/api/media/${media.id}`) fail(`Upload response URL should point at API media endpoint, got ${media.url}.`);
  if (media.dataUrl !== media.url) fail("Upload response dataUrl should be the stored media URL.");
  if (typeof media.dataUrl === "string" && media.dataUrl.startsWith("data:")) fail("Upload response must not inline the original data URL.");
  if (media.type !== "image") fail(`Upload media type should be image, got ${media.type}.`);
  if (media.name !== "tiny upload.png") fail(`Upload filename should be preserved, got ${media.name}.`);
  if (media.contentType !== "image/png") fail(`Upload contentType should be image/png, got ${media.contentType}.`);
  if (Number(media.byteSize) !== tinyPng.length) fail(`Upload byteSize expected ${tinyPng.length}, got ${media.byteSize}.`);
  if (media.storage !== "api-media") fail(`Upload storage should be api-media, got ${media.storage}.`);
}

function validateSpoofedForwardedHostMedia(media, baseUrl) {
  if (!media?.id) {
    fail("Spoofed forwarded-host upload response did not include a media id.");
    return;
  }
  const expectedUrl = `${baseUrl}/api/media/${media.id}`;
  if (media.url !== expectedUrl) {
    fail(`Spoofed forwarded-host upload should ignore forwarded host/proto and return ${expectedUrl}, got ${media.url}.`);
  }
  if (String(media.url || "").includes("evil.example.test")) {
    fail(`Spoofed forwarded-host upload leaked attacker-controlled host in media URL: ${media.url}.`);
  }
  if (String(media.url || "").startsWith("https://")) {
    fail(`Spoofed forwarded-host upload should not trust X-Forwarded-Proto from an untrusted direct client: ${media.url}.`);
  }
}

function validateGetResponse(response, body) {
  if (response.status !== 200) fail(`GET /api/media/:id should return 200, got ${response.status}.`);
  const contentType = response.headers.get("content-type") || "";
  if (!/^image\/png\b/i.test(contentType)) fail(`GET media content-type should be image/png, got ${contentType}.`);
  const contentLength = response.headers.get("content-length") || "";
  if (Number(contentLength) !== tinyPng.length) fail(`GET media content-length expected ${tinyPng.length}, got ${contentLength}.`);
  const disposition = response.headers.get("content-disposition") || "";
  if (!disposition.includes("tiny%20upload.png")) fail(`GET media content-disposition should include encoded filename, got ${disposition}.`);
  if (!body.equals(tinyPng)) fail("GET media response bytes did not match the uploaded payload.");
}

function inspectDatabase(mediaId) {
  const script = `
import json
import sqlite3
import sys

db_path, media_id = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
media = conn.execute(
    "SELECT id, owner_user_id, filename, content_type, byte_size, storage_path FROM media_objects WHERE id = ?",
    (media_id,),
).fetchone()
audit_upload_events = conn.execute("SELECT COUNT(*) FROM audit_events WHERE event_type = 'media.upload'").fetchone()[0]
sessions = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
print(json.dumps({
    "media": dict(media) if media else None,
    "auditUploadEvents": audit_upload_events,
    "sessions": sessions,
}))
`;
  const result = spawnSync("python3", ["-c", script, tempDb, mediaId], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1"
    }
  });
  if (result.status !== 0) {
    fail(`Could not inspect media runtime database: ${tail(result.stderr || result.stdout || "")}`);
    return { media: null, auditUploadEvents: 0, sessions: 0 };
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`Could not parse media runtime database inspection output: ${error.message}`);
    return { media: null, auditUploadEvents: 0, sessions: 0 };
  }
}

function validateDatabase(database, media) {
  const row = database.media;
  if (!row) {
    fail("Database did not persist a media_objects row for the uploaded media.");
    return;
  }
  if (row.id !== media.id) fail(`Database media id mismatch: ${row.id}.`);
  if (row.filename !== "tiny upload.png") fail(`Database filename mismatch: ${row.filename}.`);
  if (row.content_type !== "image/png") fail(`Database content_type mismatch: ${row.content_type}.`);
  if (Number(row.byte_size) !== tinyPng.length) fail(`Database byte_size expected ${tinyPng.length}, got ${row.byte_size}.`);
  if (row.storage_path !== `${media.id}.png`) fail(`Database storage_path expected ${media.id}.png, got ${row.storage_path}.`);
  if (!row.owner_user_id) fail("Database media row is missing owner_user_id.");
  if (Number(database.auditUploadEvents || 0) < 1) fail("Database did not persist a media.upload audit event.");
  if (Number(database.sessions || 0) < 1) fail("Database did not persist an auth session.");
}

function validateMismatchedExtensionMedia(media, database) {
  if (!media?.id) {
    fail("Mismatched extension upload response did not include a media id.");
    return;
  }
  if (media.name !== "mismatched-extension.mp4") {
    fail(`Mismatched extension upload should preserve original filename, got ${media.name}.`);
  }
  if (media.contentType !== "image/png") {
    fail(`Mismatched extension upload contentType should remain image/png, got ${media.contentType}.`);
  }
  if (!database.media) {
    fail("Mismatched extension upload did not persist a media_objects row.");
    return;
  }
  const storagePath = String(database.media.storage_path || "");
  if (storagePath !== `${media.id}.png`) {
    fail(`Mismatched extension storage path should use MIME-derived .png extension, got ${storagePath}.`);
  }
  const expectedFilePath = path.join(tempMediaRoot, `${media.id}.png`);
  if (!fs.existsSync(expectedFilePath)) {
    fail(`Mismatched extension upload should persist ${expectedFilePath}.`);
  }
  const unexpectedFilePath = path.join(tempMediaRoot, `${media.id}.mp4`);
  if (fs.existsSync(unexpectedFilePath)) {
    fail(`Mismatched extension upload must not persist a filename-derived .mp4 object at ${unexpectedFilePath}.`);
  }
}

async function exerciseObjectStorageRuntime() {
  const uploadScenario = await runObjectStorageScenario({ publicBaseUrl: "" });
  const publicScenario = await runObjectStorageScenario({ publicBaseUrl: "https://media.quantgym.example.test/public" });
  return {
    uploadReadThrough: uploadScenario,
    publicUrlRedirect: publicScenario
  };
}

async function runObjectStorageScenario({ publicBaseUrl }) {
  const fakeS3 = await createFakeS3Server();
  const dbPath = path.join(tempDir, `object-storage-${publicBaseUrl ? "public" : "read"}.sqlite3`);
  const apiPort = await findFreePort();
  const baseUrl = `http://127.0.0.1:${apiPort}`;
  const api = startApi(apiPort, {
    QUANTGYM_DB: dbPath,
    QUANTGYM_MEDIA_STORAGE: "s3",
    QUANTGYM_MEDIA_S3_ENDPOINT: fakeS3.endpoint,
    QUANTGYM_MEDIA_S3_BUCKET: "quantgym-smoke-bucket",
    QUANTGYM_MEDIA_S3_REGION: "us-east-1",
    QUANTGYM_MEDIA_S3_ACCESS_KEY_ID: "quantgym-smoke-access-key",
    QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY: "quantgym-smoke-secret-key",
    QUANTGYM_MEDIA_S3_PREFIX: "runtime-smoke",
    QUANTGYM_MEDIA_PUBLIC_BASE_URL: publicBaseUrl,
    QUANTGYM_MEDIA_MAX_BYTES: "128",
    QUANTGYM_MAX_BODY_BYTES: "4096"
  });
  try {
    await waitForHealth(baseUrl, api);
    const email = `media-object-${Date.now()}-${publicBaseUrl ? "public" : "read"}@example.test`;
    const registerResponse = await postJson(`${baseUrl}/api/auth/register`, {
      password: "media-smoke-password",
      account: {
        id: `media-object-${Date.now()}-${publicBaseUrl ? "public" : "read"}`,
        provider: "local",
        email,
        name: "Media Object Storage Smoke",
        country: "us",
        region: "CA"
      },
      state: {},
      problemStates: [],
      community: { posts: [] }
    });
    if (registerResponse.status !== 201) {
      fail(`Object storage registration failed with ${registerResponse.status}: ${JSON.stringify(registerResponse.data)}`);
    }
    const token = registerResponse.data?.token || "";
    const uploadResponse = await postJson(
      `${baseUrl}/api/media`,
      {
        dataUrl: `data:image/png;base64,${tinyPngBase64}`,
        name: publicBaseUrl ? "object public.png" : "object read.png",
        type: "image",
        context: publicBaseUrl ? "media-object-public-smoke" : "media-object-read-smoke"
      },
      token
    );
    if (uploadResponse.status !== 201) {
      fail(`Object storage upload failed with ${uploadResponse.status}: ${JSON.stringify(uploadResponse.data)}`);
    }
    const media = uploadResponse.data?.media || {};
    const database = inspectObjectStorageDatabase(dbPath, media.id);
    const getResponse = await fetch(`${baseUrl}${media.path || `/api/media/${media.id}`}`, { redirect: "manual" });
    const getBytes = getResponse.status === 200 ? Buffer.from(await getResponse.arrayBuffer()) : Buffer.alloc(0);
    const putRequest = fakeS3.requests.find((request) => request.method === "PUT");
    const getRequest = fakeS3.requests.find((request) => request.method === "GET");
    validateObjectStorageScenario({
      publicBaseUrl,
      media,
      database,
      getResponse,
      getBytes,
      fakeS3,
      putRequest,
      getRequest
    });
    return {
      mode: publicBaseUrl ? "public-url" : "api-read-through",
      uploadStatus: uploadResponse.status,
      getMediaStatus: getResponse.status,
      redirectLocation: getResponse.headers.get("location") || "",
      storedObjectCount: fakeS3.objects.size,
      putRequestSigned: hasSigV4Headers(putRequest),
      getRequestSigned: getRequest ? hasSigV4Headers(getRequest) : false,
      storagePath: database.media?.storage_path || "",
      mediaStorage: media.storage,
      mediaUrl: media.url || "",
      mediaUrlUsesPublicBase: publicBaseUrl ? String(media.url || "").startsWith(`${publicBaseUrl}/runtime-smoke/`) : false,
      apiReadBytes: getBytes.length
    };
  } finally {
    await stopProcess(api);
    await closeServer(fakeS3.server);
  }
}

function validateObjectStorageScenario({ publicBaseUrl, media, database, getResponse, getBytes, fakeS3, putRequest, getRequest }) {
  const mode = publicBaseUrl ? "public object storage" : "object storage read-through";
  if (!media.id) fail(`${mode} upload response media.id is missing.`);
  if (media.storage !== "s3-media") fail(`${mode} upload should report s3-media storage, got ${media.storage}.`);
  if (media.contentType !== "image/png") fail(`${mode} upload contentType should be image/png, got ${media.contentType}.`);
  if (Number(media.byteSize) !== tinyPng.length) fail(`${mode} byteSize expected ${tinyPng.length}, got ${media.byteSize}.`);
  if (!putRequest) {
    fail(`${mode} fake S3 server did not receive a PUT request.`);
  } else {
    if (!hasSigV4Headers(putRequest)) fail(`${mode} PUT request was missing SigV4 headers.`);
    if (!putRequest.body.equals(tinyPng)) fail(`${mode} PUT request bytes did not match upload payload.`);
    if (!putRequest.path.startsWith("/quantgym-smoke-bucket/runtime-smoke/")) {
      fail(`${mode} PUT path should include bucket and prefix, got ${putRequest.path}.`);
    }
  }
  if (!database.media) {
    fail(`${mode} database did not persist media_objects row.`);
  } else {
    if (!String(database.media.storage_path || "").startsWith("s3:runtime-smoke/")) {
      fail(`${mode} storage_path should use s3:runtime-smoke prefix, got ${database.media.storage_path}.`);
    }
    if (database.media.content_type !== "image/png") fail(`${mode} database content_type mismatch: ${database.media.content_type}.`);
  }
  if (Number(database.auditUploadEvents || 0) < 1) fail(`${mode} database did not persist media.upload audit event.`);
  if (fakeS3.objects.size !== 1) fail(`${mode} fake S3 should contain one object, got ${fakeS3.objects.size}.`);

  if (publicBaseUrl) {
    const expectedPrefix = `${publicBaseUrl}/runtime-smoke/`;
    if (!String(media.url || "").startsWith(expectedPrefix)) fail(`${mode} media URL should use public base ${expectedPrefix}, got ${media.url}.`);
    if (getResponse.status !== 302) fail(`${mode} API GET should redirect to public URL, got ${getResponse.status}.`);
    if (getResponse.headers.get("location") !== media.url) fail(`${mode} redirect location should match media.url.`);
  } else {
    if (String(media.url || "").startsWith("data:")) fail(`${mode} media URL must not inline the original data URL.`);
    if (!String(media.url || "").startsWith("http://127.0.0.1:")) fail(`${mode} media URL should fall back to API media endpoint, got ${media.url}.`);
    if (getResponse.status !== 200) fail(`${mode} API GET should read through object storage and return 200, got ${getResponse.status}.`);
    if (!getRequest) fail(`${mode} fake S3 server did not receive a GET request.`);
    if (getRequest && !hasSigV4Headers(getRequest)) fail(`${mode} GET request was missing SigV4 headers.`);
    if (!getBytes.equals(tinyPng)) fail(`${mode} API read-through bytes did not match upload payload.`);
  }
}

function hasSigV4Headers(request) {
  if (!request) return false;
  return /^AWS4-HMAC-SHA256\b/.test(String(request.headers.authorization || ""))
    && /^[0-9a-f]{64}$/i.test(String(request.headers["x-amz-content-sha256"] || ""))
    && /^\d{8}T\d{6}Z$/.test(String(request.headers["x-amz-date"] || ""));
}

function inspectObjectStorageDatabase(dbPath, mediaId) {
  const script = `
import json
import sqlite3
import sys

db_path, media_id = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
media = conn.execute(
    "SELECT id, owner_user_id, filename, content_type, byte_size, storage_path FROM media_objects WHERE id = ?",
    (media_id,),
).fetchone()
audit_upload_events = conn.execute("SELECT COUNT(*) FROM audit_events WHERE event_type = 'media.upload'").fetchone()[0]
print(json.dumps({
    "media": dict(media) if media else None,
    "auditUploadEvents": audit_upload_events,
}))
`;
  const result = spawnSync("python3", ["-c", script, dbPath, mediaId || ""], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1"
    }
  });
  if (result.status !== 0) {
    fail(`Could not inspect object storage database: ${tail(result.stderr || result.stdout || "")}`);
    return { media: null, auditUploadEvents: 0 };
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`Could not parse object storage database inspection output: ${error.message}`);
    return { media: null, auditUploadEvents: 0 };
  }
}

function createFakeS3Server() {
  const objects = new Map();
  const requests = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
      const item = {
        method: request.method,
        path: decodeURIComponent(requestUrl.pathname),
        url: request.url,
        headers: request.headers,
        body
      };
      requests.push(item);
      if (request.method === "PUT") {
        objects.set(item.path, {
          body,
          contentType: request.headers["content-type"] || "application/octet-stream"
        });
        response.writeHead(200, { ETag: "\"quantgym-smoke\"" });
        response.end();
        return;
      }
      if (request.method === "GET") {
        const object = objects.get(item.path);
        if (!object) {
          response.writeHead(404, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: "not found" }));
          return;
        }
        response.writeHead(200, {
          "Content-Type": object.contentType,
          "Content-Length": String(object.body.length)
        });
        response.end(object.body);
        return;
      }
      response.writeHead(405, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "method not allowed" }));
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        endpoint: `http://127.0.0.1:${server.address().port}`,
        objects,
        requests
      });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function findFreePort() {
  const server = http.createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function stopProcess(child) {
  return new Promise((resolve) => {
    if (child.exitCode != null) return resolve();
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode == null) child.kill("SIGKILL");
      resolve();
    }, 2000).unref();
  });
}

function writeSummary(summary) {
  if (!summaryPath) return;
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  failures.push(message);
}

function tail(value, max = 2000) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(-max) : text;
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}
