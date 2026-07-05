import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(args.root || defaultRoot);
const extensionDir = path.join(projectRoot, "browser-extension");
const artifactsDir = path.join(projectRoot, "artifacts", "browser-extension");
const manifestPath = path.join(extensionDir, "manifest.json");
const packageFiles = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "quantgym-bridge.js",
  "README.md",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png"
];

function fail(message) {
  console.error(`Browser extension package failed: ${message}`);
  process.exit(1);
}

const check = spawnSync(process.execPath, [path.join(defaultRoot, "scripts", "check-browser-extension.mjs"), "--root", projectRoot], {
  cwd: projectRoot,
  encoding: "utf8"
});
if (check.status !== 0) {
  process.stderr.write(check.stderr || check.stdout || "Browser extension check failed\n");
  process.exit(check.status || 1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const packageName = `quantgym-collector-v${manifest.version}.zip`;
const outputPath = path.join(artifactsDir, packageName);
const tempOutputPath = path.join(artifactsDir, `.tmp-${process.pid}-${Date.now()}-${packageName}`);
const tempStagingDir = path.join(artifactsDir, `.tmp-${process.pid}-${Date.now()}-source`);
const deterministicDate = new Date(Number(process.env.SOURCE_DATE_EPOCH || 1704067200) * 1000);
fs.mkdirSync(artifactsDir, { recursive: true });
if (fs.existsSync(tempOutputPath)) fs.rmSync(tempOutputPath);
if (fs.existsSync(tempStagingDir)) fs.rmSync(tempStagingDir, { recursive: true, force: true });

const missing = packageFiles.filter((file) => !fs.existsSync(path.join(extensionDir, file)));
if (missing.length) fail(`missing package files: ${missing.join(", ")}`);

let zipFailure = "";
try {
  stagePackageFiles();
  const zip = spawnSync("zip", ["-X", "-q", tempOutputPath, ...packageFiles], {
    cwd: tempStagingDir,
    encoding: "utf8"
  });
  if (zip.status !== 0) {
    zipFailure = (zip.stderr || zip.stdout || "zip command failed").trim();
  }
} finally {
  if (fs.existsSync(tempStagingDir)) fs.rmSync(tempStagingDir, { recursive: true, force: true });
}
if (zipFailure) {
  if (fs.existsSync(tempOutputPath)) fs.rmSync(tempOutputPath, { force: true });
  fail(zipFailure);
}

const tempStat = fs.statSync(tempOutputPath);
if (tempStat.size <= 0) {
  fs.rmSync(tempOutputPath, { force: true });
  fail("package zip is empty");
}
fs.renameSync(tempOutputPath, outputPath);
const stat = fs.statSync(outputPath);
if (stat.size <= 0) fail("package zip is empty");

console.log(JSON.stringify({
  status: "pass",
  version: manifest.version,
  output: path.relative(projectRoot, outputPath),
  sha256: sha256File(outputPath),
  bytes: stat.size,
  files: packageFiles,
  deterministicTimestamp: deterministicDate.toISOString(),
  fileHashes: Object.fromEntries(packageFiles.map((file) => [
    file,
    sha256File(path.join(extensionDir, file))
  ]))
}, null, 2));

function stagePackageFiles() {
  for (const file of packageFiles) {
    const source = path.join(extensionDir, file);
    const destination = path.join(tempStagingDir, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, 0o644);
    fs.utimesSync(destination, deterministicDate, deterministicDate);
  }
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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
