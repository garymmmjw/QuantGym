import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const CONTRACT_FILE = "docs/frontend-upgrade/design-system-contract.json";
const TOKEN_FILES = {
  foundations: "src/design-system/tokens/foundations.css",
  light: "src/design-system/tokens/light.css",
  dark: "src/design-system/tokens/dark.css",
  typography: "src/design-system/tokens/typography.css",
  motion: "src/design-system/motion/motion.css",
};
const RAW_VALUE_SOURCE_FILES = new Set([
  TOKEN_FILES.foundations,
  TOKEN_FILES.light,
  TOKEN_FILES.dark,
  TOKEN_FILES.typography,
]);
const FONT_ASSETS = new Map([
  [
    "src/design-system/assets/fonts/PlusJakartaSans-wght.woff2",
    "9653905086e228a7d6db138a975cb44c012e0982c744a29aecc2b034a7299cfd",
  ],
  [
    "src/design-system/assets/fonts/SpaceGrotesk-wght.woff2",
    "462259d04fd658eb29e0b554607dca910def11962cf703acbe3b246644cf3c7b",
  ],
]);
const FONT_PROVENANCE_FILES = [
  "src/design-system/assets/fonts/README.md",
  "src/design-system/assets/fonts/OFL-1.1.txt",
];
export const V2_STYLE_SCAN_ROOTS = Object.freeze([
  "src/core",
  "src/design-system",
  "src/domains",
  "src/pages/plan",
  "src/pages/training",
  "src/pages/v2",
  "src/shared",
]);
const THEME_TOKEN_FIELDS = {
  appBackground: "app-background",
  surfacePrimary: "surface-primary",
  surfaceSecondary: "surface-secondary",
  textPrimary: "text-primary",
  textSecondary: "text-secondary",
  textMuted: "text-muted",
  borderSubtle: "border-subtle",
  actionPrimary: "action-primary",
  actionPrimarySoft: "action-primary-soft",
  actionPrimaryInk: "action-primary-ink",
};
const THEME_REQUIRED_VALUES = {
  light: {
    "--qg-border-control": "#8d8aaa",
    "--qg-action-primary-ink": "#5b5ff5",
    "--qg-action-primary-gradient": "linear-gradient(180deg, var(--qg-action-primary), #4d46e5)",
    "--qg-on-action-primary": "#ffffff",
    "--qg-status-success": "#16a06a",
    "--qg-status-success-text": "#087647",
    "--qg-status-warning": "#ff9f2e",
    "--qg-status-danger": "#d0524b",
    "--qg-status-danger-text": "#b13b35",
    "--qg-reward-xp": "var(--qg-action-primary-ink)",
    "--qg-reward-coin": "var(--qg-status-warning)",
    "--qg-focus-ring": "var(--qg-action-primary)",
    "--qg-shadow-focus-ring": "0 0 0 2px var(--qg-surface-primary), 0 0 0 5px var(--qg-focus-ring)",
  },
  dark: {
    "--qg-border-control": "#716d9c",
    "--qg-action-primary-soft": "#2a2856",
    "--qg-action-primary-gradient": "linear-gradient(180deg, var(--qg-action-primary), #6d70f8)",
    "--qg-on-action-primary": "#141322",
    "--qg-status-success": "#16a06a",
    "--qg-status-success-text": "#54dd9b",
    "--qg-status-warning": "#ff9f2e",
    "--qg-status-danger": "#d0524b",
    "--qg-status-danger-text": "#f58d87",
    "--qg-reward-xp": "var(--qg-action-primary-ink)",
    "--qg-reward-coin": "var(--qg-status-warning)",
    "--qg-focus-ring": "var(--qg-action-primary)",
    "--qg-shadow-focus-ring": "0 0 0 2px var(--qg-surface-primary), 0 0 0 5px var(--qg-focus-ring)",
  },
};
const APPROVED_SHADOW_TOKENS = new Set([
  "--qg-shadow-focus-ring",
  "--qg-shadow-primary-action",
  "--qg-shadow-primary-action-pressed",
  "--qg-shadow-dialog",
  "--qg-shadow-command-surface",
  "--qg-shadow-notification",
  "--qg-shadow-mascot-overlay",
  "--qg-shadow-auth-atmosphere",
  "--qg-shadow-auth-mark",
  "--qg-shadow-auth-orbit-dot",
  "--qg-shadow-auth-mascot",
  "--qg-shadow-auth-card",
  "--qg-shadow-auth-tab",
]);
const CSS_WIDE_KEYWORDS = new Set([
  "inherit",
  "initial",
  "revert",
  "revert-layer",
  "unset",
]);
const CSS_NAMED_COLORS = new Set(`
  aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue
  blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk
  crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki
  darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue
  dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite
  gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
  lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen
  lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen
  magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen
  mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream
  mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid
  palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum
  powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
  seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen
  steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen
`.trim().split(/\s+/));
const COLOR_FUNCTION_PATTERN = /\b(?:color|device-cmyk|hsl|hsla|hwb|lab|lch|oklab|oklch|rgb|rgba)\s*\(/i;
const RAW_HEX_PATTERN = /#[0-9a-f]{3,8}(?![0-9a-f])/i;
const DECLARATION_PATTERN = /([\w-]+)\s*:\s*([^;{}]+)(?:;|(?=\}))/g;

const normalizeRepoPath = (value) => String(value || "")
  .replaceAll("\\", "/")
  .replace(/^\.\/+/, "")
  .replace(/\/{2,}/g, "/");

const compareViolations = (left, right) => (
  left.file.localeCompare(right.file)
  || (left.line ?? 0) - (right.line ?? 0)
  || left.rule.localeCompare(right.rule)
  || left.evidence.localeCompare(right.evidence)
);

const lineAt = (source, index) => source.slice(0, index).split("\n").length;

const stripCssComments = (source) => {
  const input = String(source);
  let result = "";
  let index = 0;
  let quote = null;
  let inComment = false;
  while (index < input.length) {
    const current = input[index];
    const next = input[index + 1];
    if (inComment) {
      if (current === "*" && next === "/") {
        result += "  ";
        index += 2;
        inComment = false;
      } else {
        result += current === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }
    if (quote !== null) {
      result += current;
      if (current === "\\" && index + 1 < input.length) {
        result += next;
        index += 2;
      } else {
        if (current === quote) quote = null;
        index += 1;
      }
      continue;
    }
    if (current === "/" && next === "*") {
      result += "  ";
      index += 2;
      inComment = true;
      continue;
    }
    if (current === '"' || current === "'") quote = current;
    result += current;
    index += 1;
  }
  return result;
};

const stripCommentsAndStrings = (source) => {
  let result = "";
  let index = 0;
  let quote = null;
  let inComment = false;
  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];
    if (inComment) {
      if (current === "*" && next === "/") {
        result += "  ";
        index += 2;
        inComment = false;
      } else {
        result += current === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (current === "\\" && index + 1 < source.length) {
        result += "  ";
        index += 2;
      } else if (current === quote) {
        result += " ";
        index += 1;
        quote = null;
      } else {
        result += current === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }
    if (current === "/" && next === "*") {
      result += "  ";
      index += 2;
      inComment = true;
      continue;
    }
    if (current === '"' || current === "'") {
      result += " ";
      index += 1;
      quote = current;
      continue;
    }
    result += current;
    index += 1;
  }
  return result;
};

const isColorBearingProperty = (property) => (
  property.startsWith("--")
  || property === "color"
  || property === "fill"
  || property === "stroke"
  || property === "background"
  || property === "background-image"
  || property === "background-color"
  || property === "accent-color"
  || property === "caret-color"
  || property.includes("border")
  || property.includes("outline")
  || property.includes("text-decoration")
  || property.includes("text-emphasis")
  || property.includes("column-rule")
);

const hasNamedColor = (value) => {
  const identifiers = value.toLowerCase().match(/[a-z][a-z0-9-]*/g) || [];
  return identifiers.some((identifier) => CSS_NAMED_COLORS.has(identifier));
};

const stripImportant = (value) => value.replace(/\s*!important\s*$/i, "").trim();

const isSemanticShadowValue = (value) => {
  const normalized = stripImportant(value);
  return normalized === "none"
    || CSS_WIDE_KEYWORDS.has(normalized)
    || /^var\(--qg-shadow-[a-z0-9-]+\)(?:\s*,\s*var\(--qg-shadow-[a-z0-9-]+\))*$/i.test(normalized);
};

const isSemanticLayerValue = (value) => {
  const normalized = stripImportant(value);
  return normalized === "auto"
    || CSS_WIDE_KEYWORDS.has(normalized)
    || /^var\(--qg-layer-[a-z0-9-]+\)$/i.test(normalized);
};

export function findStylePolicyViolations(file, source) {
  const normalizedFile = normalizeRepoPath(file);
  const originalSource = String(source);
  const violations = [];
  const commentFreeSource = stripCssComments(originalSource);
  const remoteFontMatch = /@font-face\s*\{[^}]*\burl\(\s*["']?\s*(?:https?:)?\/\//i.exec(commentFreeSource)
    || /@import\s+(?:url\(\s*)?["']?\s*(?:https?:)?\/\//i.exec(commentFreeSource);
  if (remoteFontMatch) {
    violations.push({
      file: normalizedFile,
      line: lineAt(originalSource, remoteFontMatch.index),
      rule: "remote-font-url",
      evidence: "V2 CSS must not load remote font resources",
    });
  }
  if (RAW_VALUE_SOURCE_FILES.has(normalizedFile)) return violations;

  const sanitized = stripCommentsAndStrings(originalSource);
  for (const match of sanitized.matchAll(DECLARATION_PATTERN)) {
    const property = match[1].toLowerCase();
    const value = match[2].trim();
    const line = lineAt(sanitized, match.index);
    const add = (rule, evidence) => violations.push({
      file: normalizedFile,
      line,
      rule,
      evidence,
    });

    if (["box-shadow", "text-shadow"].includes(property)) {
      if (!isSemanticShadowValue(value)) add("raw-shadow", `${property}: ${value}`);
      continue;
    }
    if (property === "filter" && /\bdrop-shadow\s*\(/i.test(value)) {
      add("raw-shadow", `${property}: ${value}`);
      continue;
    }
    if (property === "z-index") {
      if (!isSemanticLayerValue(value)) add("raw-z-index", `${property}: ${value}`);
      continue;
    }
    if (
      isColorBearingProperty(property)
      && (
        RAW_HEX_PATTERN.test(value)
        || COLOR_FUNCTION_PATTERN.test(value)
        || hasNamedColor(value)
      )
    ) {
      add("raw-color", `${property}: ${value}`);
    }
  }
  return violations;
}

const readRequiredText = async (root, relativeFile, violations) => {
  try {
    const stats = await lstat(path.join(root, relativeFile));
    if (stats.isSymbolicLink()) {
      violations.push({
        file: relativeFile,
        line: 0,
        rule: "scan-symlink",
        evidence: "symbolic links are not allowed in the V2 design-system gate",
      });
      return "";
    }
    if (!stats.isFile()) throw new Error("path is not a regular file");
    return await readFile(path.join(root, relativeFile), "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      violations.push({
        file: relativeFile,
        line: 0,
        rule: "invalid-file",
        evidence: error.message,
      });
      return "";
    }
    violations.push({
      file: relativeFile,
      line: 0,
      rule: "missing-file",
      evidence: "required design-system file is missing",
    });
    return "";
  }
};

const readContract = async (root, violations) => {
  const source = await readRequiredText(root, CONTRACT_FILE, violations);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    violations.push({
      file: CONTRACT_FILE,
      line: 0,
      rule: "invalid-contract",
      evidence: error.message,
    });
    return null;
  }
};

const readRequiredBuffer = async (root, relativeFile, violations) => {
  try {
    const stats = await lstat(path.join(root, relativeFile));
    if (stats.isSymbolicLink()) {
      addContractViolation(
        violations,
        relativeFile,
        "scan-symlink",
        "symbolic links are not allowed in the V2 design-system gate",
      );
      return null;
    }
    if (!stats.isFile()) throw new Error("path is not a regular file");
    return await readFile(path.join(root, relativeFile));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      addContractViolation(violations, relativeFile, "invalid-file", error.message);
      return null;
    }
    addContractViolation(
      violations,
      relativeFile,
      "missing-file",
      "required design-system file is missing",
    );
    return null;
  }
};

const customProperties = (source) => {
  const properties = new Map();
  for (const match of stripCssComments(source).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
    if (!properties.has(match[1])) properties.set(match[1], match[2].trim());
  }
  return properties;
};

const customPropertyOccurrences = (source) => {
  const occurrences = new Map();
  for (const match of stripCssComments(source).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
    const values = occurrences.get(match[1]) || [];
    values.push(match[2].trim());
    occurrences.set(match[1], values);
  }
  return occurrences;
};

const addContractViolation = (violations, file, rule, evidence) => violations.push({
  file,
  line: 0,
  rule,
  evidence,
});

const validateThemes = (contract, sources, violations) => {
  for (const themeName of ["light", "dark"]) {
    const file = TOKEN_FILES[themeName];
    const source = sources[themeName];
    const properties = customProperties(source);
    const approvedTheme = contract?.themes?.[themeName] || {};
    for (const token of contract?.semanticTokens || []) {
      const property = `--qg-${token}`;
      if (!properties.has(property)) {
        addContractViolation(
          violations,
          file,
          "semantic-token-coverage",
          `${themeName} theme is missing ${property}`,
        );
      }
    }
    for (const [contractField, tokenName] of Object.entries(THEME_TOKEN_FIELDS)) {
      if (!Object.hasOwn(approvedTheme, contractField)) continue;
      const property = `--qg-${tokenName}`;
      if (properties.get(property)?.toLowerCase() !== approvedTheme[contractField].toLowerCase()) {
        addContractViolation(
          violations,
          file,
          "approved-theme-value",
          `${property} must equal ${approvedTheme[contractField]}`,
        );
      }
    }
    for (const [property, expectedValue] of Object.entries(THEME_REQUIRED_VALUES[themeName])) {
      if (properties.get(property)?.toLowerCase() !== expectedValue.toLowerCase()) {
        addContractViolation(
          violations,
          file,
          "approved-semantic-value",
          `${property} must equal ${expectedValue}`,
        );
      }
    }
    const actualShadowTokens = [...properties.keys()].filter((property) => (
      property.startsWith("--qg-shadow-")
    ));
    for (const property of APPROVED_SHADOW_TOKENS) {
      if (!properties.has(property)) {
        addContractViolation(
          violations,
          file,
          "shadow-role-coverage",
          `${themeName} theme is missing ${property}`,
        );
      }
    }
    for (const property of actualShadowTokens) {
      if (!APPROVED_SHADOW_TOKENS.has(property)) {
        addContractViolation(
          violations,
          file,
          "unapproved-shadow-role",
          `${property} is outside the approved shadow policy`,
        );
      }
    }
  }

  if (!sources.light.includes('[data-qg-theme="light"]')) {
    addContractViolation(
      violations,
      TOKEN_FILES.light,
      "theme-selector",
      'light tokens require [data-qg-theme="light"]',
    );
  }
  if (!sources.dark.includes('[data-qg-theme="dark"]')) {
    addContractViolation(
      violations,
      TOKEN_FILES.dark,
      "theme-selector",
      'dark tokens require [data-qg-theme="dark"]',
    );
  }
};

const validateUniqueTokenDefinitions = (sources, violations) => {
  for (const key of ["foundations", "light", "dark", "typography"]) {
    const file = TOKEN_FILES[key];
    for (const [property, values] of customPropertyOccurrences(sources[key])) {
      if (values.length > 1) {
        addContractViolation(
          violations,
          file,
          "duplicate-token-definition",
          `${property} is defined ${values.length} times`,
        );
      }
    }
  }
};

const validateFoundations = (contract, source, violations) => {
  const properties = customProperties(source);
  const expectedRadii = new Map([
    ["--qg-radius-compact", "11px"],
    ["--qg-radius-control", "14px"],
    ["--qg-radius-card", "16px"],
    ["--qg-radius-panel", "20px"],
    ["--qg-radius-feature", "28px"],
  ]);
  const contractRadii = contract?.shape?.radiusPx || [];
  if (JSON.stringify(contractRadii) !== JSON.stringify([11, 14, 16, 20, 28])) {
    addContractViolation(
      violations,
      CONTRACT_FILE,
      "approved-radius-contract",
      "approved radius scale must remain 11/14/16/20/28",
    );
  }
  for (const [property, expected] of expectedRadii) {
    if (properties.get(property) !== expected) {
      addContractViolation(
        violations,
        TOKEN_FILES.foundations,
        "radius-token",
        `${property} must equal ${expected}`,
      );
    }
  }
  if (properties.get("--qg-touch-target-min") !== "44px") {
    addContractViolation(
      violations,
      TOKEN_FILES.foundations,
      "touch-target-token",
      "--qg-touch-target-min must equal 44px",
    );
  }
};

const validateTypography = (contract, source, violations) => {
  const properties = customProperties(source);
  const chineseFallbacks = contract?.typography?.chineseFallbacks || [];
  const expectedUiFamilies = [contract?.typography?.ui, ...chineseFallbacks]
    .filter(Boolean)
    .map((family) => family === "sans-serif" ? family : `"${family}"`)
    .join(", ");
  const expectedMetricFamilies = [
    contract?.typography?.metrics,
    contract?.typography?.ui,
    ...chineseFallbacks,
  ]
    .filter(Boolean)
    .map((family) => family === "sans-serif" ? family : `"${family}"`)
    .join(", ");
  if (properties.get("--qg-font-ui") !== expectedUiFamilies) {
    addContractViolation(
      violations,
      TOKEN_FILES.typography,
      "typography-stack",
      `--qg-font-ui must equal ${expectedUiFamilies}`,
    );
  }
  if (properties.get("--qg-font-metrics") !== expectedMetricFamilies) {
    addContractViolation(
      violations,
      TOKEN_FILES.typography,
      "typography-stack",
      `--qg-font-metrics must equal ${expectedMetricFamilies}`,
    );
  }
  const requiredEvidence = [
    'font-family: "Plus Jakarta Sans"',
    "url('../assets/fonts/PlusJakartaSans-wght.woff2')",
    "font-weight: 200 800",
    'font-family: "Space Grotesk"',
    "url('../assets/fonts/SpaceGrotesk-wght.woff2')",
    "font-weight: 300 700",
    "font-display: swap",
    "font-variant-numeric: tabular-nums",
    'font-feature-settings: "tnum" 1',
  ];
  for (const evidence of requiredEvidence) {
    if (!source.includes(evidence)) {
      addContractViolation(
        violations,
        TOKEN_FILES.typography,
        "typography-evidence",
        `missing ${evidence}`,
      );
    }
  }
  if (/url\(\s*["']?(?:https?:)?\/\//i.test(source)) {
    addContractViolation(
      violations,
      TOKEN_FILES.typography,
      "remote-font-url",
      "V2 fonts must be loaded only from the checked-in self-hosted assets",
    );
  }
};

const validateFontAssets = async (root, violations) => {
  for (const [relativeFile, expectedSha256] of FONT_ASSETS) {
    const contents = await readRequiredBuffer(root, relativeFile, violations);
    if (!contents) continue;
    const actualSha256 = createHash("sha256").update(contents).digest("hex");
    if (actualSha256 !== expectedSha256) {
      addContractViolation(
        violations,
        relativeFile,
        "font-asset-integrity",
        `SHA-256 must equal ${expectedSha256}`,
      );
    }
  }
  for (const relativeFile of FONT_PROVENANCE_FILES) {
    await readRequiredBuffer(root, relativeFile, violations);
  }
};

const validateMotion = (contract, source, violations) => {
  const properties = customProperties(source);
  const expected = new Map([
    ["--qg-motion-micro-fast", `${contract?.motion?.microMs?.[0]}ms`],
    ["--qg-motion-micro", `${contract?.motion?.microMs?.[1]}ms`],
    ["--qg-motion-panel-fast", `${contract?.motion?.panelMs?.[0]}ms`],
    ["--qg-motion-panel", `${contract?.motion?.panelMs?.[1]}ms`],
  ]);
  for (const [property, expectedValue] of expected) {
    if (properties.get(property) !== expectedValue) {
      addContractViolation(
        violations,
        TOKEN_FILES.motion,
        "motion-token",
        `${property} must equal ${expectedValue}`,
      );
    }
  }
  if (!source.includes("@media (prefers-reduced-motion: reduce)")) {
    addContractViolation(
      violations,
      TOKEN_FILES.motion,
      "reduced-motion-media",
      "prefers-reduced-motion support is required",
    );
  }
  if (!source.includes('[data-qg-motion="reduced"]')) {
    addContractViolation(
      violations,
      TOKEN_FILES.motion,
      "reduced-motion-selector",
      'Storybook override [data-qg-motion="reduced"] is required',
    );
  }
  if (!source.includes("scroll-behavior: auto !important")) {
    addContractViolation(
      violations,
      TOKEN_FILES.motion,
      "scroll-jacking-policy",
      "reduced motion must disable smooth scrolling",
    );
  }
};

const walkCssFiles = async (root, relativeDirectory, violations) => {
  const absoluteDirectory = path.join(root, relativeDirectory);
  let entries;
  try {
    const directoryStats = await lstat(absoluteDirectory);
    if (directoryStats.isSymbolicLink()) {
      addContractViolation(
        violations,
        relativeDirectory,
        "scan-symlink",
        "symbolic links are not allowed in the V2 design-system gate",
      );
      return [];
    }
    if (!directoryStats.isDirectory()) return [];
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = normalizeRepoPath(path.posix.join(relativeDirectory, entry.name));
    if (entry.isSymbolicLink()) {
      addContractViolation(
        violations,
        relativePath,
        "scan-symlink",
        "symbolic links are not allowed in the V2 design-system gate",
      );
    } else if (entry.isDirectory()) {
      files.push(...await walkCssFiles(root, relativePath, violations));
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(relativePath);
    }
  }
  return files;
};

export async function checkDesignSystemV2({ root = PROJECT_ROOT } = {}) {
  const absoluteRoot = path.resolve(root);
  const violations = [];
  const contract = await readContract(absoluteRoot, violations);
  const sources = {};
  for (const [key, relativeFile] of Object.entries(TOKEN_FILES)) {
    sources[key] = await readRequiredText(absoluteRoot, relativeFile, violations);
  }
  const validationSources = Object.fromEntries(
    Object.entries(sources).map(([key, source]) => [key, stripCssComments(source)]),
  );

  if (contract) {
    validateUniqueTokenDefinitions(validationSources, violations);
    validateThemes(contract, validationSources, violations);
    validateFoundations(contract, validationSources.foundations, violations);
    validateTypography(contract, validationSources.typography, violations);
    validateMotion(contract, validationSources.motion, violations);
  }
  await validateFontAssets(absoluteRoot, violations);

  const styleFiles = [];
  for (const scanRoot of V2_STYLE_SCAN_ROOTS) {
    styleFiles.push(...await walkCssFiles(absoluteRoot, scanRoot, violations));
  }
  for (const styleFile of styleFiles) {
    const source = await readFile(path.join(absoluteRoot, styleFile), "utf8");
    violations.push(...findStylePolicyViolations(styleFile, source));
  }
  return violations.sort(compareViolations);
}

const parseCli = (argv) => {
  if (argv.length === 0) return { root: PROJECT_ROOT };
  if (argv.length === 2 && argv[0] === "--root" && argv[1]) {
    return { root: path.resolve(argv[1]) };
  }
  throw new Error("usage: node scripts/check-design-system-v2.mjs [--root <path>]");
};

const isDirectInvocation = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  try {
    const options = parseCli(process.argv.slice(2));
    const violations = await checkDesignSystemV2(options);
    if (violations.length > 0) {
      console.error("V2 design-system check failed");
      for (const violation of violations) {
        const location = violation.line ? `${violation.file}:${violation.line}` : violation.file;
        console.error(`- ${location} [${violation.rule}] ${violation.evidence}`);
      }
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify({ status: "pass", contract: CONTRACT_FILE }, null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
