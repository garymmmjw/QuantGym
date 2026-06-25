import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(args.root || defaultRoot);
const extensionDir = path.join(projectRoot, "browser-extension");
const requiredFiles = ["manifest.json", "popup.html", "popup.css", "popup.js", "quantgym-bridge.js"];

function fail(message) {
  console.error(`Browser extension check failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(projectRoot, filePath)} is not valid JSON: ${error.message}`);
  }
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(extensionDir, file))) {
    fail(`${path.join("browser-extension", file)} is missing`);
  }
}

const manifest = readJson(path.join(extensionDir, "manifest.json"));
if (manifest.manifest_version !== 3) fail("manifest_version must be 3");
if (!/^\d+\.\d+\.\d+$/.test(String(manifest.version || ""))) fail("version must use x.y.z semver");
if (manifest.action?.default_popup !== "popup.html") fail("action.default_popup must be popup.html");

const requiredIcons = { 16: "icons/icon16.png", 32: "icons/icon32.png", 48: "icons/icon48.png", 128: "icons/icon128.png" };
for (const [size, iconPath] of Object.entries(requiredIcons)) {
  if (manifest.icons?.[size] !== iconPath) fail(`manifest.icons.${size} must be ${iconPath}`);
  assertPngSize(path.join(extensionDir, iconPath), Number(size));
}
for (const [size, iconPath] of Object.entries({ 16: "icons/icon16.png", 32: "icons/icon32.png" })) {
  if (manifest.action?.default_icon?.[size] !== iconPath) fail(`action.default_icon.${size} must be ${iconPath}`);
}

const permissions = new Set(manifest.permissions || []);
const allowedPermissions = ["activeTab", "scripting", "storage", "tabs"];
for (const permission of allowedPermissions) {
  if (!permissions.has(permission)) fail(`missing required permission: ${permission}`);
}
for (const permission of permissions) {
  if (!allowedPermissions.includes(permission)) {
    fail(`unexpected permission: ${permission}`);
  }
}

const hostPermissions = manifest.host_permissions || [];
if (hostPermissions.some((permission) => permission === "<all_urls>" || permission.includes("*://*/*"))) {
  fail("host_permissions must not request all URLs");
}
const requiredHostPermissions = ["https://beta.quantgym.app/*", "https://quantgym.app/*", "https://www.quantgym.app/*"];
for (const permission of requiredHostPermissions) {
  if (!hostPermissions.includes(permission)) fail(`missing required host permission: ${permission}`);
}
for (const permission of hostPermissions) {
  if (!requiredHostPermissions.includes(permission)) {
    fail(`unexpected host permission: ${permission}`);
  }
}
const bridgeScript = (manifest.content_scripts || []).find((item) => (item.js || []).includes("quantgym-bridge.js"));
if (!bridgeScript) fail("manifest.content_scripts must register quantgym-bridge.js");
for (const permission of requiredHostPermissions) {
  if (!(bridgeScript.matches || []).includes(permission)) fail(`quantgym-bridge.js must match ${permission}`);
}
if (bridgeScript.run_at !== "document_idle") fail("quantgym-bridge.js must run at document_idle");

const popupHtml = fs.readFileSync(path.join(extensionDir, "popup.html"), "utf8");
if (!popupHtml.includes('<script src="popup.js"></script>')) fail("popup.html must load popup.js");
if (/<script\b(?![^>]*\bsrc="popup\.js")[^>]*>/i.test(popupHtml)) {
  fail("popup.html must not use inline or remote scripts");
}
if (/https?:\/\//i.test(popupHtml)) fail("popup.html must not load remote resources");

const popupJs = fs.readFileSync(path.join(extensionDir, "popup.js"), "utf8");
if (!popupJs.includes("https://beta.quantgym.app/")) fail("popup.js must default to the beta QuantGym URL");
if (!popupJs.includes("captureVisibleTab")) fail("popup.js must capture the visible tab for one-click recording");
if (!popupJs.includes("quantgym:viewport-capture")) fail("popup.js must send the QuantGym viewport capture bridge message");
const defaultBoardUrlMatch = popupJs.match(/const\s+DEFAULT_BOARD_URL\s*=\s*["']([^"']+)["']/);
if (!defaultBoardUrlMatch) fail("popup.js must declare DEFAULT_BOARD_URL");
const defaultBoardUrl = defaultBoardUrlMatch[1];
if (/127\.0\.0\.1|localhost/i.test(defaultBoardUrl)) fail("popup.js must not default to local development URLs");
if (!popupJs.includes("isAllowedBoardUrl")) fail("popup.js must validate allowed Board URL origins");

const syntax = spawnSync(process.execPath, ["--check", path.join(extensionDir, "popup.js")], {
  encoding: "utf8"
});
if (syntax.status !== 0) {
  fail((syntax.stderr || syntax.stdout || "popup.js syntax check failed").trim());
}
const bridgeSyntax = spawnSync(process.execPath, ["--check", path.join(extensionDir, "quantgym-bridge.js")], {
  encoding: "utf8"
});
if (bridgeSyntax.status !== 0) {
  fail((bridgeSyntax.stderr || bridgeSyntax.stdout || "quantgym-bridge.js syntax check failed").trim());
}

console.log(JSON.stringify({
  status: "pass",
  manifestVersion: manifest.manifest_version,
  version: manifest.version,
  permissions: [...permissions].sort(),
  hostPermissions: hostPermissions.sort(),
  icons: Object.keys(requiredIcons).map(Number),
  defaultBoardUrl: "https://beta.quantgym.app/"
}, null, 2));

function assertPngSize(filePath, expectedSize) {
  if (!fs.existsSync(filePath)) fail(`${path.relative(projectRoot, filePath)} is missing`);
  const buffer = fs.readFileSync(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    fail(`${path.relative(projectRoot, filePath)} must be a PNG file`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== expectedSize || height !== expectedSize) {
    fail(`${path.relative(projectRoot, filePath)} must be ${expectedSize}x${expectedSize}, got ${width}x${height}`);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}
