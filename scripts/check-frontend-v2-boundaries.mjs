import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateLegacyRemovalMap } from "./lib/frontend-upgrade-contracts.mjs";

const SCAN_ROOTS = [
  "src/core",
  "src/design-system",
  "src/domains",
  "src/shared",
  "src/pages/v2",
];
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const RULES = {
  legacySymbol: /\b(?:createAppContext|usePageApi|AppServicesContext|storeBridge)\b/,
  eventBus: /["']quantgym:[^"']+["']/,
  directFetch: /\b(?:fetch|window\.fetch|globalThis\.fetch)\s*\(/,
  domainDom: /\b(?:document\.|window\.addEventListener\s*\()/,
};

const normalizeRepoPath = (value) => String(value || "")
  .replaceAll("\\", "/")
  .replace(/^\.\/+/, "")
  .replace(/\/{2,}/g, "/")
  .replace(/\/$/, "");

const isAtOrUnder = (parent, candidate) => (
  candidate === parent || candidate.startsWith(`${parent}/`)
);
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const readQuotedString = (source, start) => {
  const quote = source[start];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  let value = "";
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === quote) return { end: index + 1, value };
    if (quote === "`" && character === "$" && source[index + 1] === "{") return null;
    if (character === "\\" && index + 1 < source.length) {
      const escaped = source[index + 1];
      const escapes = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", 0: "\0" };
      const hexLength = escaped === "x" ? 2 : escaped === "u" ? 4 : 0;
      const hexDigits = hexLength > 0
        ? source.slice(index + 2, index + 2 + hexLength)
        : "";
      if (hexLength > 0 && new RegExp(`^[0-9A-Fa-f]{${hexLength}}$`).test(hexDigits)) {
        value += String.fromCodePoint(Number.parseInt(hexDigits, 16));
        index += 1 + hexLength;
      } else if (escaped === "u" && source[index + 2] === "{") {
        const closeBrace = source.indexOf("}", index + 3);
        const codePoint = closeBrace < 0 ? "" : source.slice(index + 3, closeBrace);
        if (/^[0-9A-Fa-f]{1,6}$/.test(codePoint) && Number.parseInt(codePoint, 16) <= 0x10ffff) {
          value += String.fromCodePoint(Number.parseInt(codePoint, 16));
          index = closeBrace;
        } else {
          value += escaped;
          index += 1;
        }
      } else if (escaped === "\n") {
        index += 1;
      } else if (escaped === "\r") {
        index += source[index + 2] === "\n" ? 2 : 1;
      } else {
        value += Object.hasOwn(escapes, escaped) ? escapes[escaped] : escaped;
        index += 1;
      }
    } else {
      value += character;
    }
  }
  return null;
};

const maskRange = (characters, start, end) => {
  for (let index = start; index < end; index += 1) {
    if (characters[index] !== "\n" && characters[index] !== "\r") characters[index] = " ";
  }
};

const REGEX_PREFIX_WORDS = new Set([
  "await", "case", "delete", "do", "else", "in", "instanceof", "new", "of",
  "return", "throw", "typeof", "void", "yield",
]);
const REGEX_PREFIX_TOKENS = new Set([
  "(", "[", "{", "=", ":", ",", ";", "!", "?", "?.", "&&", "||", "??",
  "=>", "+", "-", "*", "%", "&", "|", "^", "~", "<", ">", "control)",
]);
const JSX_PREFIX_WORDS = new Set(["case", "return", "throw", "yield"]);
const JSX_PREFIX_TOKENS = new Set([
  "(", "[", "{", "=", ":", ",", ";", "?", "=>", "&&", "||", "??",
]);
const CONTROL_PAREN_WORDS = new Set(["catch", "for", "if", "switch", "while", "with"]);

const extractDependencySpecifiers = (tokens) => {
  const specifiers = [];
  const previousIsMemberAccess = (index) => [".", "?."].includes(tokens[index - 1]?.value);
  const findFromSpecifier = (start) => {
    for (let index = start; index < tokens.length && tokens[index].value !== ";"; index += 1) {
      if (tokens[index].type === "identifier" && tokens[index].value === "from") {
        return tokens[index + 1]?.type === "string" ? tokens[index + 1].value : null;
      }
    }
    return null;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "identifier" || previousIsMemberAccess(index)) continue;
    if (token.value === "require" && tokens[index + 1]?.value === "(") {
      if (tokens[index + 2]?.type === "string") specifiers.push(tokens[index + 2].value);
      continue;
    }
    if (token.value === "import") {
      if (tokens[index + 1]?.value === "(") {
        if (tokens[index + 2]?.type === "string") specifiers.push(tokens[index + 2].value);
      } else if (tokens[index + 1]?.type === "string") {
        specifiers.push(tokens[index + 1].value);
      } else if (![".", ":"].includes(tokens[index + 1]?.value)) {
        const specifier = findFromSpecifier(index + 1);
        if (specifier) specifiers.push(specifier);
      }
      continue;
    }
    if (token.value === "export" && ["*", "{", "type"].includes(tokens[index + 1]?.value)) {
      const specifier = findFromSpecifier(index + 1);
      if (specifier) specifiers.push(specifier);
    }
  }
  return specifiers;
};

const analyzeSource = (source, file) => {
  const ruleCharacters = source.split("");
  const eventCharacters = source.split("");
  const tokens = [];
  const parenContexts = [];
  const jsxEnabled = /\.[jt]sx$/.test(file);
  const pushToken = (type, value) => tokens.push({ type, value });
  const maskBoth = (start, end) => {
    maskRange(ruleCharacters, start, end);
    maskRange(eventCharacters, start, end);
  };
  const lastToken = (floor = 0) => (tokens.length > floor ? tokens[tokens.length - 1] : null);
  const canStartRegex = (floor) => {
    const previous = lastToken(floor);
    if (!previous) return true;
    if (previous.type === "identifier") return REGEX_PREFIX_WORDS.has(previous.value);
    return REGEX_PREFIX_TOKENS.has(previous.value);
  };
  const canStartJsx = (floor) => {
    const previous = lastToken(floor);
    if (!previous) return true;
    if (previous.type === "identifier") return JSX_PREFIX_WORDS.has(previous.value);
    return JSX_PREFIX_TOKENS.has(previous.value);
  };
  const looksLikeJsx = (index, floor) => {
    if (!jsxEnabled || source[index] !== "<" || !canStartJsx(floor)) return false;
    if (source[index + 1] === ">") return true;
    if (!/[A-Za-z]/.test(source[index + 1] || "")) return false;
    let cursor = index + 2;
    while (/[\w.:-]/.test(source[cursor] || "")) cursor += 1;
    if (!/[\s/>]/.test(source[cursor] || "")) return false;
    const headerEnd = source.indexOf(">", cursor);
    if (headerEnd >= 0) {
      let afterHeader = headerEnd + 1;
      while (/\s/.test(source[afterHeader] || "")) afterHeader += 1;
      const header = source.slice(index + 1, headerEnd);
      if (source[afterHeader] === "(" && (/\bextends\b/.test(header) || /[,=]/.test(header))) {
        return false;
      }
    }
    return true;
  };

  const scanComment = (index) => {
    const lineComment = source.startsWith("//", index);
    const terminator = lineComment ? "\n" : "*/";
    const found = source.indexOf(terminator, index + 2);
    const end = found < 0 ? source.length : found + (lineComment ? 0 : 2);
    maskBoth(index, end);
    return end;
  };

  const scanQuoted = (index, { emitToken = true } = {}) => {
    const parsed = readQuotedString(source, index);
    const end = parsed?.end || source.length;
    maskRange(ruleCharacters, index, end);
    if (emitToken && parsed) pushToken("string", parsed.value);
    return end;
  };

  const scanRegex = (index) => {
    let cursor = index + 1;
    let inCharacterClass = false;
    while (cursor < source.length) {
      if (source[cursor] === "\\") {
        cursor += 2;
      } else if (source[cursor] === "[") {
        inCharacterClass = true;
        cursor += 1;
      } else if (source[cursor] === "]") {
        inCharacterClass = false;
        cursor += 1;
      } else if (source[cursor] === "/" && !inCharacterClass) {
        cursor += 1;
        while (/[A-Za-z]/.test(source[cursor] || "")) cursor += 1;
        break;
      } else {
        cursor += 1;
      }
    }
    maskBoth(index, cursor);
    pushToken("value", "regex");
    return cursor;
  };

  function scanTemplate(index) {
    const staticTemplate = readQuotedString(source, index);
    if (staticTemplate) {
      maskBoth(index, staticTemplate.end);
      pushToken("string", staticTemplate.value);
      return staticTemplate.end;
    }
    maskBoth(index, index + 1);
    let cursor = index + 1;
    while (cursor < source.length) {
      if (source[cursor] === "\\") {
        maskBoth(cursor, Math.min(cursor + 2, source.length));
        cursor += 2;
      } else if (source[cursor] === "`") {
        maskBoth(cursor, cursor + 1);
        pushToken("value", "template");
        return cursor + 1;
      } else if (source[cursor] === "$" && source[cursor + 1] === "{") {
        maskBoth(cursor, cursor + 1);
        cursor = scanCode(cursor + 2, true);
      } else {
        maskBoth(cursor, cursor + 1);
        cursor += 1;
      }
    }
    pushToken("value", "template");
    return cursor;
  }

  function scanJsxElement(index) {
    let cursor = index + 1;
    if (source[cursor] === ">") {
      cursor += 1;
    } else {
      while (/[\w.:-]/.test(source[cursor] || "")) cursor += 1;
      while (cursor < source.length) {
        if (source.startsWith("/>", cursor)) return cursor + 2;
        if (source[cursor] === ">") {
          cursor += 1;
          break;
        }
        if (source[cursor] === '"' || source[cursor] === "'") {
          cursor = scanQuoted(cursor, { emitToken: false });
        } else if (source[cursor] === "{") {
          cursor = scanCode(cursor + 1, true);
        } else {
          cursor += 1;
        }
      }
    }

    while (cursor < source.length) {
      if (source.startsWith("</", cursor)) {
        const close = source.indexOf(">", cursor + 2);
        return close < 0 ? source.length : close + 1;
      }
      if (source[cursor] === "<" && (
        source[cursor + 1] === ">" || /[A-Za-z]/.test(source[cursor + 1] || "")
      )) {
        cursor = scanJsxElement(cursor);
        continue;
      }
      if (source[cursor] === "{") {
        cursor = scanCode(cursor + 1, true);
        continue;
      }
      let textEnd = cursor;
      while (textEnd < source.length && source[textEnd] !== "<" && source[textEnd] !== "{") {
        textEnd += 1;
      }
      maskBoth(cursor, textEnd);
      cursor = textEnd === cursor ? cursor + 1 : textEnd;
    }
    return cursor;
  }

  function scanCode(start = 0, stopAtClosingBrace = false) {
    const floor = tokens.length;
    let braceDepth = 0;
    let index = start;
    while (index < source.length) {
      if (stopAtClosingBrace && source[index] === "}" && braceDepth === 0) return index + 1;
      if (/\s/.test(source[index])) {
        index += 1;
      } else if (source.startsWith("//", index) || source.startsWith("/*", index)) {
        index = scanComment(index);
      } else if (source[index] === '"' || source[index] === "'") {
        index = scanQuoted(index);
      } else if (source[index] === "`") {
        index = scanTemplate(index);
      } else if (looksLikeJsx(index, floor)) {
        index = scanJsxElement(index);
        pushToken("value", "jsx");
      } else if (source[index] === "/" && canStartRegex(floor)) {
        index = scanRegex(index);
      } else if (/[A-Za-z_$]/.test(source[index])) {
        const wordStart = index;
        index += 1;
        while (/[\w$]/.test(source[index] || "")) index += 1;
        pushToken("identifier", source.slice(wordStart, index));
      } else if (/\d/.test(source[index])) {
        index += 1;
        while (/[\w.]/.test(source[index] || "")) index += 1;
        pushToken("value", "number");
      } else {
        const threeCharacters = source.slice(index, index + 3);
        const twoCharacters = source.slice(index, index + 2);
        const punctuator = ["===", "!==", ">>>", "**=", "&&=", "||=", "??="].includes(threeCharacters)
          ? threeCharacters
          : ["=>", "?.", "&&", "||", "??", "==", "!=", "<=", ">=", "++", "--", "**"].includes(twoCharacters)
            ? twoCharacters
            : source[index];
        if (punctuator === "(") {
          parenContexts.push(CONTROL_PAREN_WORDS.has(lastToken(floor)?.value));
        }
        if (punctuator === ")") {
          const controlParen = parenContexts.pop() === true;
          pushToken("punctuator", controlParen ? "control)" : ")");
        } else {
          pushToken("punctuator", punctuator);
        }
        if (punctuator === "{") braceDepth += 1;
        if (punctuator === "}") braceDepth = Math.max(0, braceDepth - 1);
        index += punctuator.length;
      }
    }
    return index;
  }

  scanCode();
  return {
    specifiers: extractDependencySpecifiers(tokens),
    ruleCode: ruleCharacters.join(""),
    eventCode: eventCharacters.join(""),
  };
};

const resolveImportSpecifier = (importingFile, specifier) => {
  const normalizedSpecifier = normalizeRepoPath(specifier).replace(/[?#].*$/, "");
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
    resolved = path.posix.normalize(path.posix.join(path.posix.dirname(importingFile), normalizedSpecifier));
  } else {
    return null;
  }
  const normalizedResolved = normalizeRepoPath(path.posix.normalize(resolved));
  if (normalizedResolved === ".." || normalizedResolved.startsWith("../")) return null;
  return normalizedResolved;
};

const resolvesIntoLegacyRoot = (resolvedPath, legacyRoots) => legacyRoots.some((legacyRoot) => {
  if (legacyRoot === "src/pages" && isAtOrUnder("src/pages/v2", resolvedPath)) return false;
  if (isAtOrUnder(legacyRoot, resolvedPath)) return true;
  return path.posix.extname(legacyRoot) !== ""
    && path.posix.extname(resolvedPath) === ""
    && legacyRoot.startsWith(`${resolvedPath}.`);
});

const walkSourceFiles = async (root, relativeDirectory, scanViolations) => {
  const absoluteDirectory = path.join(root, relativeDirectory);
  let entries;
  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkSourceFiles(root, relativePath, scanViolations));
    } else if (entry.isSymbolicLink()) {
      scanViolations.push({
        file: relativePath,
        rule: "scanSymlink",
        evidence: "symbolic links are not allowed under v2 scan roots",
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
  const removalMap = await readRemovalMap(absoluteRoot);
  const legacyRoots = (Array.isArray(removalMap.legacyRoots) ? removalMap.legacyRoots : [])
    .map(normalizeRepoPath)
    .filter(Boolean);
  const violations = [];
  const sourceFiles = (await Promise.all(
    SCAN_ROOTS.map((scanRoot) => walkSourceFiles(absoluteRoot, scanRoot, violations)),
  )).flat();

  for (const file of sourceFiles) {
    const source = await readFile(path.join(absoluteRoot, file), "utf8");
    const analysis = analyzeSource(source, file);
    for (const specifier of analysis.specifiers) {
      const resolvedPath = resolveImportSpecifier(file, specifier);
      if (resolvedPath && resolvesIntoLegacyRoot(resolvedPath, legacyRoots)) {
        violations.push({ file, rule: "legacyImport", evidence: specifier });
      }
    }
    for (const [rule, matcher] of Object.entries(RULES)) {
      if (rule === "directFetch" && isAtOrUnder("src/shared/api", file)) continue;
      if (rule === "domainDom" && !file.startsWith("src/domains/")) continue;
      const match = (rule === "eventBus" ? analysis.eventCode : analysis.ruleCode).match(matcher);
      if (match) violations.push({ file, rule, evidence: match[0] });
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
