import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDirectory = path.join(projectRoot, "dist-v2");
const publicDirectory = path.join(projectRoot, "public-v2");
const EXPECTED_PUBLIC_FILES = ["_headers", "_redirects", "_routes.json"];
const EXPECTED_OUTPUT_ROOT_FILES = new Set([
  "404.html",
  "_headers",
  "_redirects",
  "_routes.json",
  "asset-integrity.json",
  "config.json",
  "index.html",
  "version.json",
]);
const TEXT_OUTPUT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".map", ".svg", ".txt"]);
const FORBIDDEN_OUTPUT_PATTERNS = [
  ["legacy bootstrap", /src\/main\.jsx/],
  ["legacy context", /createAppContext/],
  ["legacy page API", /pageApi/],
  ["legacy store bridge", /storeBridge/],
  ["legacy event bus", /quantgym:/],
  ["Render origin", /(?:https?:)?\/\/[^\s"']+\.onrender\.com/i],
  ["R2 origin", /(?:https?:)?\/\/[^\s"']+\.r2\.cloudflarestorage\.com/i],
  ["PostgreSQL URL", /postgres(?:ql)?:\/\//i],
  ["secret-shaped assignment", /(?:api[_-]?key|client[_-]?secret|private[_-]?key)\s*[:=]/i],
];

const assertExactRuntime = () => {
  if (process.versions.node !== "20.20.2") {
    throw new Error(`V2_NODE_VERSION_INVALID: expected 20.20.2, received ${process.versions.node}`);
  }
};

const safeGitEnvironment = () => ({
  HOME: process.env.HOME ?? "",
  PATH: "/usr/bin:/bin",
  LANG: "C",
  LC_ALL: "C",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_NO_REPLACE_OBJECTS: "1",
});

const readGitValue = (args) => execFileSync("/usr/bin/git", args, {
  cwd: projectRoot,
  encoding: "utf8",
  env: safeGitEnvironment(),
}).trim();

const validateCommit = (value) => {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error("V2_BUILD_COMMIT_INVALID");
  return value;
};

const validateLabel = (label, value) => {
  if (!/^[A-Za-z0-9._/-]{1,128}$/.test(value) || value.includes("..") || value.includes("//")) {
    throw new Error(`V2_BUILD_${label.toUpperCase()}_INVALID`);
  }
  return value;
};

export const resolveBuildMetadata = (
  environment = process.env,
  gitValue = readGitValue,
) => {
  const hasCloudflareCommit = environment.CF_PAGES_COMMIT_SHA !== undefined;
  const hasCloudflareBranch = environment.CF_PAGES_BRANCH !== undefined;
  if (hasCloudflareCommit !== hasCloudflareBranch) {
    throw new Error("V2_CLOUDFLARE_METADATA_INCOMPLETE");
  }
  if (hasCloudflareCommit && hasCloudflareBranch) {
    const commit = validateCommit(environment.CF_PAGES_COMMIT_SHA);
    const branch = validateLabel("branch", environment.CF_PAGES_BRANCH);
    if (
      environment.QUANTGYM_BUILD_COMMIT !== undefined
      && environment.QUANTGYM_BUILD_COMMIT !== commit
    ) {
      throw new Error("V2_CLOUDFLARE_COMMIT_OVERRIDE_MISMATCH");
    }
    if (
      environment.QUANTGYM_BUILD_BRANCH !== undefined
      && environment.QUANTGYM_BUILD_BRANCH !== branch
    ) {
      throw new Error("V2_CLOUDFLARE_BRANCH_OVERRIDE_MISMATCH");
    }
    if (
      environment.QUANTGYM_BUILD_SOURCE !== undefined
      && environment.QUANTGYM_BUILD_SOURCE !== "cloudflare-pages"
    ) {
      throw new Error("V2_CLOUDFLARE_SOURCE_OVERRIDE_MISMATCH");
    }
    return { commit, branch, source: "cloudflare-pages" };
  }

  const commit = validateCommit(
    environment.QUANTGYM_BUILD_COMMIT ?? gitValue(["rev-parse", "HEAD"]),
  );
  const branch = validateLabel(
    "branch",
    environment.QUANTGYM_BUILD_BRANCH
      ?? (gitValue(["branch", "--show-current"]) || "detached"),
  );
  const source = validateLabel("source", environment.QUANTGYM_BUILD_SOURCE ?? "local");
  return { commit, branch, source };
};

const isMissingPathError = (error) => error?.code === "ENOENT";

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const walkFiles = async (directory, relativeDirectory = "") => {
  const entries = await readdir(path.join(directory, relativeDirectory), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, relativePath);
    const linkStats = await lstat(absolutePath);
    if (linkStats.isSymbolicLink()) throw new Error(`V2_OUTPUT_SYMLINK: ${relativePath}`);
    if (linkStats.isDirectory()) files.push(...await walkFiles(directory, relativePath));
    else if (linkStats.isFile()) files.push(relativePath);
    else throw new Error(`V2_OUTPUT_NON_REGULAR_FILE: ${relativePath}`);
  }
  return files;
};

export const validateV2PublicDirectory = async (directory = publicDirectory) => {
  const directoryStats = await lstat(directory);
  if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
    throw new Error("V2_PUBLIC_DIRECTORY_INVALID");
  }
  const entries = (await readdir(directory, { withFileTypes: true }))
    .sort((left, right) => compareText(left.name, right.name));
  if (
    entries.length !== EXPECTED_PUBLIC_FILES.length
    || entries.some((entry, index) => entry.name !== EXPECTED_PUBLIC_FILES[index])
  ) {
    throw new Error(`V2_PUBLIC_FILES_INVALID: ${entries.map((entry) => entry.name).join(",")}`);
  }
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const linkStats = await lstat(absolutePath);
    if (entry.isSymbolicLink() || linkStats.isSymbolicLink() || !linkStats.isFile()) {
      throw new Error(`V2_PUBLIC_FILE_INVALID: ${entry.name}`);
    }
    if (linkStats.size <= 0 || linkStats.size > 64 * 1024) {
      throw new Error(`V2_PUBLIC_FILE_SIZE_INVALID: ${entry.name}`);
    }
    const contents = await readFile(absolutePath, "utf8");
    if (contents.includes("\0")) throw new Error(`V2_PUBLIC_FILE_CONTENT_INVALID: ${entry.name}`);
    if (entry.name === "_routes.json") JSON.parse(contents);
  }
};

const validateFinalOutputPaths = async () => {
  const files = await walkFiles(outputDirectory);
  const rootFiles = files.filter((relativePath) => !relativePath.startsWith("assets/"));
  const expectedRootFiles = [...EXPECTED_OUTPUT_ROOT_FILES].sort(compareText);
  if (
    rootFiles.length !== expectedRootFiles.length
    || rootFiles.some((relativePath, index) => relativePath !== expectedRootFiles[index])
  ) {
    throw new Error(`V2_OUTPUT_ROOT_FILES_INVALID: ${rootFiles.join(",")}`);
  }
  const bundledAssets = files.filter((relativePath) => relativePath.startsWith("assets/"));
  if (!bundledAssets.some((relativePath) => relativePath.endsWith(".js"))) {
    throw new Error("V2_OUTPUT_ENTRY_JAVASCRIPT_MISSING");
  }
  for (const relativePath of files) {
    if (relativePath.startsWith("assets/")) {
      if (!/^assets\/[A-Za-z0-9_.-]+\.(?:css|js|webp|woff2)$/.test(relativePath)) {
        throw new Error(`V2_OUTPUT_ASSET_PATH_INVALID: ${relativePath}`);
      }
      continue;
    }
    if (!EXPECTED_OUTPUT_ROOT_FILES.has(relativePath)) {
      throw new Error(`V2_OUTPUT_PATH_INVALID: ${relativePath}`);
    }
  }
};

const atomicWrite = async (destination, contents) => {
  await mkdir(path.dirname(destination), { recursive: true });
  const temporaryPath = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporaryPath, "wx", 0o644);
  try {
    await handle.writeFile(contents);
    await handle.sync();
    await handle.close();
    await rename(temporaryPath, destination);
  } catch (error) {
    await handle.close().catch(() => {});
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
};

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const renameSingleHtmlEntry = async () => {
  const htmlEntries = (await walkFiles(outputDirectory))
    .filter((entry) => entry.endsWith(".html"))
    .sort();
  if (htmlEntries.length !== 1 || htmlEntries[0] !== "v2.html") {
    throw new Error(`V2_HTML_ENTRY_INVALID: ${htmlEntries.join(",")}`);
  }
  const oldPath = path.join(outputDirectory, "v2.html");
  const destination = path.join(outputDirectory, "index.html");
  const existingDestination = await lstat(destination).catch((error) => {
    if (isMissingPathError(error)) return null;
    throw error;
  });
  if (existingDestination !== null) throw new Error("V2_INDEX_ALREADY_EXISTS");

  const temporaryPath = path.join(outputDirectory, `.index.${process.pid}.${randomUUID()}.tmp`);
  await rename(oldPath, temporaryPath);
  await rename(temporaryPath, destination);
  const oldEntry = await lstat(oldPath).catch((error) => {
    if (isMissingPathError(error)) return null;
    throw error;
  });
  if (oldEntry !== null) throw new Error("V2_OLD_HTML_ENTRY_REMAINS");
};

const writePublicMetadata = async (metadata) => {
  const config = {
    schemaVersion: 1,
    apiBase: "/api/v2",
  };
  const version = {
    schemaVersion: 1,
    commit: metadata.commit,
    branch: metadata.branch,
    source: metadata.source,
  };
  const index = await readFile(path.join(outputDirectory, "index.html"));
  await Promise.all([
    atomicWrite(path.join(outputDirectory, "config.json"), json(config)),
    atomicWrite(path.join(outputDirectory, "version.json"), json(version)),
    atomicWrite(path.join(outputDirectory, "404.html"), index),
  ]);
};

const scanOutput = async () => {
  for (const relativePath of await walkFiles(outputDirectory)) {
    if (!TEXT_OUTPUT_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) continue;
    const source = await readFile(path.join(outputDirectory, relativePath), "utf8");
    for (const [label, pattern] of FORBIDDEN_OUTPUT_PATTERNS) {
      if (pattern.test(source)) throw new Error(`V2_OUTPUT_FORBIDDEN_${label.replaceAll(" ", "_").toUpperCase()}: ${relativePath}`);
    }
  }
};

const writeIntegrityManifest = async () => {
  const assets = {};
  for (const relativePath of await walkFiles(outputDirectory)) {
    if (relativePath === "asset-integrity.json") continue;
    const absolutePath = path.join(outputDirectory, relativePath);
    const canonicalPath = await realpath(absolutePath);
    const targetStats = await stat(canonicalPath);
    if (!targetStats.isFile()) throw new Error(`V2_INTEGRITY_NON_FILE: ${relativePath}`);
    const contents = await readFile(canonicalPath);
    assets[relativePath] = {
      bytes: contents.byteLength,
      integrity: `sha384-${createHash("sha384").update(contents).digest("base64")}`,
    };
  }
  await atomicWrite(path.join(outputDirectory, "asset-integrity.json"), json({
    schemaVersion: 1,
    algorithm: "sha384",
    assets,
  }));
};

export const buildFrontendV2 = async () => {
  assertExactRuntime();
  const metadata = resolveBuildMetadata();
  await rm(outputDirectory, { recursive: true, force: true });
  await validateV2PublicDirectory();
  await build({
    configFile: path.join(projectRoot, "vite.v2.config.ts"),
    mode: "production",
  });
  await renameSingleHtmlEntry();
  await writePublicMetadata(metadata);
  await scanOutput();
  await writeIntegrityManifest();
  await validateFinalOutputPaths();
  await scanOutput();
  console.log(`Frontend V2 build valid: ${metadata.commit} (${metadata.branch}, ${metadata.source}).`);
};

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  await buildFrontendV2();
}
