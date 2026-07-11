import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const ROUTE_TARGETS = {
  overview: ["#heroTypewriter", "#overviewProblemProgress", "#leaderboardMetricSelect"],
  plan: ["#prepPlanSetupForm", "#prepPlanDashboard"],
  skills: ["#skillsPageTitle", "#skillRadar"],
  league: ["#leaguePageTitle", "#leagueStandings", "#leagueLearningMap", "#leagueRewardShop"],
  interview: ["#interviewSetup", "#startInterviewBtn"],
  problems: ["#problemSearch", "#problemList"],
  tools: ["#startDrillSessionBtn", "#drillQuestion"],
  poker: ["#pokerLobbySummary", "#pokerTable"],
  experiences: ["#newExperienceBtn", "#experienceForm"],
  news: ["#newsTopicFilter", "#newsList"],
  community: ["#communityForm", "#communityText"],
  messages: ["#messageThreadList", "#messageComposerForm"],
  network: ["#addNetworkBtn", "#networkForm"],
  resume: ["#resumeForm", "#resumeText"],
  jobs: ["#jobsSummary", "#jobsList"],
  companies: ["#companiesPageTitle", "#companyTierFilter"],
  library: ["#librarySearch", "#libraryBookGrid"],
  courses: ["#learningPathTitle", "#courseList"],
  memory: ["#addResourceBtn", "#resourceForm"],
  settings: ["#settingsForm", "#settingsLanguageSelect"],
  account: ["#accountForm", "#accountNameInput"],
  pk: ["#startPkBtn", "#pkProblem"]
};

export const BROWSER_BUILD_ENV_KEYS_TO_CLEAR = Object.freeze([
  "CF_PAGES_BRANCH",
  "CF_PAGES_COMMIT_SHA",
  "CLOUD_API_ENDPOINT",
  "GITHUB_REF_NAME",
  "GITHUB_SHA",
  "LLM_ENDPOINT",
  "OPENAI_MODEL",
  "QUANTGYM_CLOUD_API_ENDPOINT",
  "QUANTGYM_GOOGLE_CLIENT_ID",
  "QUANTGYM_LLM_ENDPOINT",
  "QUANTGYM_LLM_MODEL",
  "QUANTGYM_WEB_API_ENDPOINT",
  "QUANTGYM_WEB_BUILD_BRANCH",
  "QUANTGYM_WEB_BUILD_COMMIT",
  "QUANTGYM_WEB_DIST",
  "QUANTGYM_WEB_GOOGLE_CLIENT_ID",
  "QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED",
  "QUANTGYM_WEB_IGNORE_DOTENV",
  "QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG",
  "QUANTGYM_WEB_LLM_ENDPOINT",
  "QUANTGYM_WEB_LLM_MODEL",
  "QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT",
  "QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE",
  "QUANTGYM_WEB_STRICT",
  "RENDER_GIT_BRANCH",
  "RENDER_GIT_COMMIT",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_GIT_COMMIT_SHA"
]);

export const CANONICAL_BROWSER_BUILD_CONFIG = Object.freeze({
  apiEndpoint: "http://127.0.0.1:8790/api",
  llmEndpoint: "http://127.0.0.1:8787/interview",
  llmModel: "gpt-5-nano",
  problemCatalogScript: "/data/problem-catalog.js?v=2",
  env: Object.freeze({
    QUANTGYM_WEB_API_ENDPOINT: "http://127.0.0.1:8790/api",
    QUANTGYM_WEB_GOOGLE_CLIENT_ID: "",
    QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED: "false",
    QUANTGYM_WEB_IGNORE_DOTENV: "1",
    QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG: "1",
    QUANTGYM_WEB_LLM_ENDPOINT: "http://127.0.0.1:8787/interview",
    QUANTGYM_WEB_LLM_MODEL: "gpt-5-nano",
    QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT: "/data/problem-catalog.js?v=2"
  })
});

const BUILD_PROVENANCE_SENTINELS = {
  buildCommit: "__QUANTGYM_BUILD_COMMIT__",
  buildBranch: "__QUANTGYM_BUILD_BRANCH__",
  buildSource: "__QUANTGYM_BUILD_SOURCE__"
};

export function distRuntimeFingerprint(distDir) {
  const absoluteDistDir = path.resolve(distDir);
  const files = listDistFiles(absoluteDistDir)
    .filter((relativePath) => relativePath !== "version.json")
    .sort(compareLexically);
  const hash = createHash("sha256");
  for (const relativePath of files) {
    const filePath = path.join(absoluteDistDir, ...relativePath.split("/"));
    const bytes = relativePath === "config.js"
      ? Buffer.from(normalizeBuiltConfigProvenance(fs.readFileSync(filePath, "utf8")))
      : fs.readFileSync(filePath);
    hashFramedBytes(hash, Buffer.from(relativePath));
    hashFramedBytes(hash, bytes);
  }
  return hash.digest("hex");
}

export function readBuiltRuntimeProvenance(distDir) {
  const absoluteDistDir = path.resolve(distDir);
  const configPath = path.join(absoluteDistDir, "config.js");
  const versionPath = path.join(absoluteDistDir, "version.json");
  const config = parseBuiltConfig(configPath);
  const version = parseVersionFile(versionPath);
  const configProvenance = {
    buildCommit: requireProvenanceString(config.buildCommit, "config buildCommit", { commit: true }),
    buildBranch: requireProvenanceString(config.buildBranch, "config buildBranch"),
    buildSource: requireProvenanceString(config.buildSource, "config buildSource")
  };
  const versionProvenance = {
    buildCommit: requireProvenanceString(version.commit, "version commit", { commit: true }),
    buildBranch: requireProvenanceString(version.branch, "version branch"),
    buildSource: requireProvenanceString(version.source, "version source")
  };
  for (const key of Object.keys(configProvenance)) {
    if (configProvenance[key] !== versionProvenance[key]) {
      const label = key.replace(/^build/, "").toLowerCase();
      throw new Error(`Built provenance ${label} mismatch between config.js and version.json: ${JSON.stringify(configProvenance[key])} !== ${JSON.stringify(versionProvenance[key])}`);
    }
  }
  return configProvenance;
}

export function canonicalBrowserBuildEnv(distDir, ambientEnv = process.env) {
  const env = { ...(ambientEnv || {}) };
  for (const name of BROWSER_BUILD_ENV_KEYS_TO_CLEAR) delete env[name];
  return {
    ...env,
    ...CANONICAL_BROWSER_BUILD_CONFIG.env,
    QUANTGYM_WEB_DIST: String(distDir || "")
  };
}

export function assertSuccessfulSubprocess(label, result) {
  const failed = Boolean(result?.error) || Boolean(result?.signal) || result?.status !== 0;
  if (!failed) return result;
  const errorCode = result?.error?.code ? ` (${result.error.code})` : "";
  const details = [
    `${label} failed`,
    result?.error ? `error${errorCode}: ${result.error.message || result.error}` : "",
    result?.signal ? `signal: ${result.signal}` : "",
    Number.isInteger(result?.status) ? `status ${result.status}` : "status unavailable",
    `stdout:\n${tailText(result?.stdout)}`,
    `stderr:\n${tailText(result?.stderr)}`
  ].filter(Boolean);
  throw new Error(details.join("\n"));
}

function parseBuiltConfig(configPath) {
  let source;
  try {
    source = fs.readFileSync(configPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read built runtime config ${configPath}: ${error.message}`, { cause: error });
  }
  const match = source.match(/window\.QUANTGYM_CONFIG\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) throw new Error(`Could not parse built runtime config: ${configPath}`);
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Could not parse built runtime config JSON ${configPath}: ${error.message}`, { cause: error });
  }
}

function parseVersionFile(versionPath) {
  let source;
  try {
    source = fs.readFileSync(versionPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read built version.json ${versionPath}: ${error.message}`, { cause: error });
  }
  try {
    const value = JSON.parse(source);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("expected an object");
    return value;
  } catch (error) {
    throw new Error(`Could not parse built version.json ${versionPath}: ${error.message}`, { cause: error });
  }
}

function requireProvenanceString(value, label, options = {}) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Built provenance ${label} must be a nonempty string.`);
  }
  const normalized = value.trim();
  if (options.commit && !/^[0-9a-f]{7,40}$/i.test(normalized)) {
    throw new Error(`Built provenance ${label} must be a 7-40 character hexadecimal commit.`);
  }
  return normalized;
}

function tailText(value, max = 4000) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(-max) : text;
}

function listDistFiles(directory, relativeDirectory = "") {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listDistFiles(absolutePath, relativePath);
    if (entry.isFile()) return [relativePath];
    throw new Error(`Unsupported entry in built dist: ${relativePath}`);
  });
}

function normalizeBuiltConfigProvenance(source) {
  let normalized = source;
  for (const [key, sentinel] of Object.entries(BUILD_PROVENANCE_SENTINELS)) {
    const pattern = new RegExp(`("${key}"\\s*:\\s*)"(?:\\\\.|[^"\\\\])*"`, "g");
    let replacementCount = 0;
    normalized = normalized.replace(pattern, (_match, prefix) => {
      replacementCount += 1;
      return `${prefix}${JSON.stringify(sentinel)}`;
    });
    if (replacementCount !== 1) {
      throw new Error(`Expected exactly one ${key} value in built config.js; found ${replacementCount}`);
    }
  }
  return normalized;
}

function hashFramedBytes(hash, bytes) {
  const length = Buffer.allocUnsafe(8);
  length.writeBigUInt64BE(BigInt(bytes.length));
  hash.update(length);
  hash.update(bytes);
}

function compareLexically(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
