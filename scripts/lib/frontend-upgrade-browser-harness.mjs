import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeWithTimeout } from "../cleanup-timeout.mjs";
import {
  CANONICAL_BROWSER_BUILD_CONFIG,
  assertSuccessfulSubprocess,
  canonicalBrowserBuildEnv,
  distRuntimeFingerprint,
  readBuiltRuntimeProvenance
} from "./browser-route-targets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const viteBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");

export { distRuntimeFingerprint };

export function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function isAllowedFrontendUpgradeConsoleError(text, locationUrl, firstPartyOrigins = []) {
  const origins = new Set((firstPartyOrigins || []).flatMap((value) => {
    try {
      return [new URL(value).origin];
    } catch {
      return [];
    }
  }));
  try {
    if (origins.has(new URL(locationUrl).origin)) return false;
  } catch {}
  return /(?:\[reporter-pb\]: request error TypeError: Failed to fetch|@bilibili\/bili-user-fingerprint\(report\): report is not found)/i.test(text)
    || /^Permissions policy violation: compute-pressure is not allowed in this document\.$/.test(text);
}

export function buildFrontendUpgradeHarnessEnv(distDir, ambientEnv = process.env) {
  return canonicalBrowserBuildEnv(distDir, ambientEnv);
}

export function buildPreviewArgs(distDir, port) {
  return [
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--outDir",
    String(distDir),
    "--strictPort"
  ];
}

export function recordFrontendUpgradeBuildEnvironment(env = {}) {
  return {
    ...Object.fromEntries(Object.keys(CANONICAL_BROWSER_BUILD_CONFIG.env).map((key) => [key, String(env[key] ?? "")])),
    QUANTGYM_WEB_DIST: "<temporary-dist>"
  };
}

export async function createFrontendUpgradeBrowserHarness(options = {}) {
  const tempRoot = options.tempRoot || fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-frontend-upgrade-"));
  const ownsTempRoot = !options.tempRoot;
  const distDir = path.resolve(options.distDir || path.join(tempRoot, "dist"));
  const port = Number(options.port) || await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const buildEnv = buildFrontendUpgradeHarnessEnv(distDir, options.ambientEnv || process.env);
  let preview = null;
  let cleaned = false;

  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    let cleanupError = null;
    if (preview) {
      try {
        await stopProcessWithTimeout(preview, options.cleanupTimeoutMs || 5000);
      } catch (error) {
        cleanupError = error;
      }
    }
    if (ownsTempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
    if (cleanupError) throw cleanupError;
  };

  try {
    fs.mkdirSync(distDir, { recursive: true });
    const build = spawnSync(process.execPath, ["scripts/build-static-site.mjs"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 30,
      timeout: options.buildTimeoutMs || 120000,
      killSignal: "SIGTERM",
      windowsHide: true,
      env: buildEnv
    });
    assertSuccessfulSubprocess("Frontend-upgrade production build", build);

    const provenance = readBuiltRuntimeProvenance(distDir);
    const fingerprint = distRuntimeFingerprint(distDir);
    const chromePath = options.chromePath || process.env.CHROME_PATH || findChromeExecutable();
    if (!chromePath) throw new Error("Google Chrome/Chromium executable not found for frontend-upgrade baselines.");

    preview = startPreviewProcess({ distDir, port, env: options.ambientEnv || process.env });
    const version = await waitForVersionJson(`${baseUrl}/version.json`, preview, options.previewTimeoutMs || 20000);
    return {
      root,
      tempRoot,
      distDir,
      port,
      baseUrl,
      buildEnv: recordFrontendUpgradeBuildEnvironment(buildEnv),
      buildOutput: { stdout: build.stdout || "", stderr: build.stderr || "" },
      chromePath,
      fingerprint,
      provenance,
      version,
      preview,
      cleanup
    };
  } catch (error) {
    await cleanup().catch((cleanupError) => {
      error.message += `\nCleanup also failed: ${cleanupError.message}`;
    });
    throw error;
  }
}

export function findChromeExecutable() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

export async function stopProcessWithTimeout(child, timeoutMs = 5000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return true;
  const closed = await closeWithTimeout(
    "frontend-upgrade preview server",
    () => new Promise((resolve, reject) => {
      const onExit = () => {
        child.off("error", onError);
        resolve();
      };
      const onError = (error) => {
        child.off("exit", onExit);
        reject(error);
      };
      child.once("exit", onExit);
      child.once("error", onError);
      child.kill("SIGTERM");
    }),
    timeoutMs,
    () => child.kill("SIGKILL")
  );
  if (!closed) throw new Error(`Timed out stopping frontend-upgrade preview server after ${timeoutMs}ms.`);
  return true;
}

function startPreviewProcess({ distDir, port, env }) {
  const child = spawn(viteBin, buildPreviewArgs(distDir, port), {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...(env || process.env), QUANTGYM_WEB_DIST: distDir }
  });
  child.stdoutText = "";
  child.stderrText = "";
  child.stdout.on("data", (chunk) => {
    child.stdoutText += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    child.stderrText += chunk.toString();
  });
  return child;
}

async function waitForVersionJson(url, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Vite preview exited before readiness.\n${tail(child.stdoutText)}\n${tail(child.stderrText)}`);
    }
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return await response.json();
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tail(value, limit = 3000) {
  const text = String(value || "");
  return text.length > limit ? text.slice(-limit) : text;
}
