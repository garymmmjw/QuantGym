import { execFileSync } from "node:child_process";
import { lstat, readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAst } from "rolldown/parseAst";

import { validateLegacyRemovalMap } from "./lib/frontend-upgrade-contracts.mjs";

export const V2_BOUNDARY_SCAN_ROOTS = Object.freeze([
  "src/core",
  "src/design-system",
  "src/domains",
  "src/shared",
  "src/pages/plan",
  "src/pages/training",
  "src/pages/v2",
]);
const V2_PAGE_ROOTS = Object.freeze([
  "src/pages/plan",
  "src/pages/training",
  "src/pages/v2",
]);
const PARSER_LANGUAGE = new Map([
  [".js", "js"],
  [".jsx", "jsx"],
  [".ts", "ts"],
  [".tsx", "tsx"],
]);
const SOURCE_EXTENSIONS = new Set(PARSER_LANGUAGE.keys());
const IMPORT_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".json"];
const LEGACY_IDENTIFIERS = new Set([
  "createAppContext",
  "usePageApi",
  "AppServicesContext",
  "storeBridge",
]);
const IMPORT_SOURCE_NODES = new Set([
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportAllDeclaration",
]);
const SCAN_SYMLINK_EVIDENCE = "symbolic links are not allowed under v2 scan roots";
const LEGACY_PREVIEW_ROUTER_FILE = "src/core/router/router.tsx";
const LEGACY_PREVIEW_ADAPTER_SPECIFIER = "../../legacy-preview/LegacyRouteAdapter";

const normalizeRepoPath = (value) => String(value || "")
  .replaceAll("\\", "/")
  .replace(/^\.\/+/, "")
  .replace(/\/{2,}/g, "/")
  .replace(/\/$/, "");

const isAtOrUnder = (parent, candidate) => (
  candidate === parent || candidate.startsWith(`${parent}/`)
);

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const staticStringValue = (node) => {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions?.length === 0) {
    return node.quasis?.[0]?.value?.cooked ?? node.quasis?.[0]?.value?.raw ?? null;
  }
  return null;
};

const memberExpressionName = (node) => {
  if (node?.type === "Identifier") return node.name;
  if (node?.type !== "MemberExpression") return null;
  const object = memberExpressionName(node.object);
  const property = node.computed
    ? staticStringValue(node.property)
    : node.property?.type === "Identifier"
      ? node.property.name
      : null;
  return object && property ? `${object}.${property}` : null;
};

const traverseAst = (root, visit) => {
  const stack = [root];
  const seen = new WeakSet();
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visit(node);
    const children = Object.entries(node)
      .filter(([key]) => key !== "parent" && key !== "scope")
      .flatMap(([, value]) => Array.isArray(value) ? value : [value]);
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
  }
};

const analyzeAst = (source, file) => {
  const language = PARSER_LANGUAGE.get(path.posix.extname(file));
  let ast;
  try {
    ast = parseAst(source, { lang: language }, file);
  } catch (error) {
    if (error?.code !== "PARSE_ERROR") throw error;
    return {
      specifiers: [],
      violations: [{
        file,
        rule: "parseError",
        evidence: `rolldown could not parse ${language} source`,
      }],
    };
  }

  const specifiers = [];
  const violations = [];
  const addViolation = (rule, evidence) => violations.push({ file, rule, evidence });

  traverseAst(ast, (node) => {
    if (IMPORT_SOURCE_NODES.has(node.type)) {
      const specifier = staticStringValue(node.source);
      if (specifier !== null) specifiers.push(specifier);
    } else if (node.type === "ImportExpression") {
      const specifier = staticStringValue(node.source);
      if (specifier !== null) specifiers.push(specifier);
    } else if (node.type === "TSExternalModuleReference") {
      const specifier = staticStringValue(node.expression);
      if (specifier !== null) specifiers.push(specifier);
    }

    if (
      ["Identifier", "JSXIdentifier", "PrivateIdentifier"].includes(node.type)
      && LEGACY_IDENTIFIERS.has(node.name)
    ) {
      addViolation("legacySymbol", node.name);
    }

    if (node.type === "Literal" && typeof node.value === "string" && node.value.startsWith("quantgym:")) {
      addViolation("eventBus", JSON.stringify(node.value));
    }
    if (node.type === "TemplateLiteral") {
      const value = staticStringValue(node);
      if (value?.startsWith("quantgym:")) addViolation("eventBus", JSON.stringify(value));
    }

    if (file.startsWith("src/domains/") && node.type === "MemberExpression") {
      const memberName = memberExpressionName(node);
      if (
        memberName?.startsWith("document.")
        || memberName?.startsWith("window.document.")
      ) {
        addViolation("domainDom", "document.");
      }
    }

    if (node.type !== "CallExpression") return;
    const identifierCallee = node.callee?.type === "Identifier" ? node.callee.name : null;
    const memberCallee = memberExpressionName(node.callee);
    if (identifierCallee === "require") {
      const specifier = staticStringValue(node.arguments?.[0]);
      if (specifier !== null) specifiers.push(specifier);
    }
    if (identifierCallee === "fetch") addViolation("directFetch", "fetch(");
    if (["window.fetch", "globalThis.fetch"].includes(memberCallee)) {
      addViolation("directFetch", `${memberCallee}(`);
    }
    if (file.startsWith("src/domains/") && memberCallee === "window.addEventListener") {
      addViolation("domainDom", "window.addEventListener(");
    }
  });

  return { specifiers, violations };
};

const resolveImportSpecifier = (importingFile, specifier) => {
  const normalizedSpecifier = String(specifier)
    .replaceAll("\\", "/")
    .replace(/\/{2,}/g, "/")
    .replace(/[?#].*$/, "");
  let resolved;
  if (normalizedSpecifier === "@") {
    resolved = "src";
  } else if (normalizedSpecifier.startsWith("@/")) {
    resolved = `src/${normalizedSpecifier.slice(2)}`;
  } else if (normalizedSpecifier.startsWith("/")) {
    resolved = normalizedSpecifier.slice(1);
  } else if (normalizedSpecifier.startsWith("src/")) {
    resolved = normalizedSpecifier;
  } else if (normalizedSpecifier.startsWith(".")) {
    resolved = path.posix.join(path.posix.dirname(importingFile), normalizedSpecifier);
  } else {
    return null;
  }
  const normalizedResolved = normalizeRepoPath(path.posix.normalize(resolved));
  if (normalizedResolved === ".." || normalizedResolved.startsWith("../")) {
    return { outsideRepository: true, repoPath: null };
  }
  return { outsideRepository: false, repoPath: normalizedResolved };
};

const resolvesIntoLegacyRoot = (resolvedPath, legacyRoots) => legacyRoots.some((legacyRoot) => {
  if (
    legacyRoot === "src/pages"
    && V2_PAGE_ROOTS.some((pageRoot) => isAtOrUnder(pageRoot, resolvedPath))
  ) return false;
  if (isAtOrUnder(legacyRoot, resolvedPath)) return true;
  return path.posix.extname(legacyRoot) !== ""
    && path.posix.extname(resolvedPath) === ""
    && legacyRoot.startsWith(`${resolvedPath}.`);
});

const importCandidates = (repoPath) => {
  if (path.posix.extname(repoPath)) return [repoPath];
  return [
    repoPath,
    ...IMPORT_EXTENSIONS.map((extension) => `${repoPath}${extension}`),
    ...IMPORT_EXTENSIONS.map((extension) => `${repoPath}/index${extension}`),
  ];
};

const isMissingPathError = (error) => ["ENOENT", "ENOTDIR"].includes(error?.code);

const isOutsideAbsoluteRoot = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
};

const resolveExistingImport = async (root, rootRealPath, repoPath) => {
  for (const candidate of importCandidates(repoPath)) {
    const absoluteCandidate = path.resolve(root, candidate);
    let linkStats;
    try {
      linkStats = await lstat(absoluteCandidate);
    } catch (error) {
      if (isMissingPathError(error)) continue;
      throw error;
    }

    let targetStats = linkStats;
    if (linkStats.isSymbolicLink()) {
      try {
        targetStats = await stat(absoluteCandidate);
      } catch (error) {
        if (isMissingPathError(error)) continue;
        throw error;
      }
    }
    if (targetStats.isDirectory()) continue;

    const candidateRealPath = await realpath(absoluteCandidate);
    if (isOutsideAbsoluteRoot(rootRealPath, candidateRealPath)) {
      return { outsideRepository: true, repoPath: null };
    }
    return {
      outsideRepository: false,
      repoPath: normalizeRepoPath(path.relative(rootRealPath, candidateRealPath)),
    };
  }
  return null;
};

const classifyImport = async (root, rootRealPath, importingFile, specifier, legacyRoots) => {
  const lexical = resolveImportSpecifier(importingFile, specifier);
  if (!lexical) return null;
  if (lexical.outsideRepository) return "outsideImport";

  const existing = await resolveExistingImport(root, rootRealPath, lexical.repoPath);
  if (existing?.outsideRepository) return "outsideImport";
  if (
    resolvesIntoLegacyRoot(lexical.repoPath, legacyRoots)
    || (existing && resolvesIntoLegacyRoot(existing.repoPath, legacyRoots))
  ) {
    return "legacyImport";
  }
  return null;
};

const walkSourceFiles = async (root, relativeDirectory, scanViolations) => {
  const absoluteDirectory = path.join(root, relativeDirectory);
  let directoryStats;
  try {
    directoryStats = await lstat(absoluteDirectory);
  } catch (error) {
    if (isMissingPathError(error)) return [];
    throw error;
  }
  if (directoryStats.isSymbolicLink()) {
    scanViolations.push({
      file: relativeDirectory,
      rule: "scanSymlink",
      evidence: SCAN_SYMLINK_EVIDENCE,
    });
    return [];
  }
  if (!directoryStats.isDirectory()) return [];

  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkSourceFiles(root, relativePath, scanViolations));
    } else if (entry.isSymbolicLink()) {
      scanViolations.push({
        file: relativePath,
        rule: "scanSymlink",
        evidence: SCAN_SYMLINK_EVIDENCE,
      });
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.posix.extname(entry.name))) {
      files.push(relativePath);
    }
  }
  return files;
};

const readRemovalMap = async (root) => JSON.parse(
  await readFile(path.join(root, "docs/frontend-upgrade/legacy-removal-map.json"), "utf8"),
);

export async function findBoundaryViolations(root) {
  const absoluteRoot = path.resolve(root);
  const rootRealPath = await realpath(absoluteRoot);
  const removalMap = await readRemovalMap(absoluteRoot);
  const legacyRoots = (Array.isArray(removalMap.legacyRoots) ? removalMap.legacyRoots : [])
    .map(normalizeRepoPath)
    .filter(Boolean);
  const violations = [];
  const sourceFiles = [];
  for (const scanRoot of V2_BOUNDARY_SCAN_ROOTS) {
    sourceFiles.push(...await walkSourceFiles(absoluteRoot, scanRoot, violations));
  }

  for (const file of sourceFiles) {
    const source = await readFile(path.join(absoluteRoot, file), "utf8");
    const analysis = analyzeAst(source, file);
    violations.push(...analysis.violations.filter(({ rule }) => (
      rule !== "directFetch" || !isAtOrUnder("src/shared/api", file)
    )));
    for (const specifier of analysis.specifiers) {
      const rule = await classifyImport(
        absoluteRoot,
        rootRealPath,
        file,
        specifier,
        legacyRoots,
      );
      const approvedPreviewAdapterImport = (
        rule === "legacyImport"
        && file === LEGACY_PREVIEW_ROUTER_FILE
        && specifier === LEGACY_PREVIEW_ADAPTER_SPECIFIER
      );
      if (rule && !approvedPreviewAdapterImport) {
        violations.push({ file, rule, evidence: specifier });
      }
    }
  }

  const unique = new Map(violations.map((violation) => [
    `${violation.file}\0${violation.rule}\0${violation.evidence}`,
    violation,
  ]));
  return [...unique.values()].sort((left, right) => (
    compareText(left.file, right.file)
    || compareText(left.rule, right.rule)
    || compareText(left.evidence, right.evidence)
  ));
}

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const runCli = async () => {
  const rootFlagIndex = process.argv.indexOf("--root");
  if (rootFlagIndex >= 0 && !process.argv[rootFlagIndex + 1]) {
    throw new Error("--root requires a directory path");
  }
  const root = rootFlagIndex >= 0 ? path.resolve(process.argv[rootFlagIndex + 1]) : defaultRoot;
  const removalMap = await readRemovalMap(root);
  const trackedFiles = execFileSync("git", ["-C", root, "ls-files", "-z"], {
    encoding: "buffer",
  }).toString("utf8").split("\0").filter(Boolean);
  const removalMapFailures = validateLegacyRemovalMap(removalMap, trackedFiles);
  const violations = await findBoundaryViolations(root);
  if (removalMapFailures.length > 0 || violations.length > 0) {
    for (const failure of removalMapFailures) console.error(`FAIL: ${failure}`);
    for (const { file, rule, evidence } of violations) {
      console.error(`FAIL: ${file} [${rule}] ${evidence}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `Frontend v2 boundaries valid: ${removalMap.families.length} legacy families, 0 violations.`,
  );
};

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) await runCli();
