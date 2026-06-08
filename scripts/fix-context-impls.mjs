#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const implDir = path.join(root, "src/app/createAppContext/slices/impl");

const RESERVED = new Set([
  "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return",
  "function", "const", "let", "var", "new", "typeof", "instanceof", "in", "of", "try",
  "catch", "finally", "throw", "async", "await", "true", "false", "null", "undefined",
  "this", "delete", "void", "export", "import", "from", "default", "class", "extends",
  "super", "yield", "with", "debugger"
]);

function collectDeclaredIdentifiers(body) {
  const declared = new Set();
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\basync\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body))) declared.add(match[1]);
  }
  let match;
  const destructRe = /\b(?:const|let|var)\s*\{([^}]+)\}\s*=/g;
  while ((match = destructRe.exec(body))) {
    match[1].split(",").forEach((part) => {
      const piece = part.trim();
      if (!piece) return;
      const segments = piece.split(":");
      const key = segments[0].trim();
      const alias = segments.length > 1 ? segments.slice(1).join(":").trim() : key;
      if (/^\w+$/.test(key)) declared.add(key);
      if (/^\w+$/.test(alias)) declared.add(alias);
    });
  }
  const arrayRe = /\b(?:const|let|var)\s*\[([^\]]+)\]\s*=/g;
  while ((match = arrayRe.exec(body))) {
    match[1].split(",").forEach((part) => {
      const name = part.trim();
      if (/^\w+$/.test(name)) declared.add(name);
    });
  }
  return declared;
}

function collectIdentifiers(body) {
  const declared = collectDeclaredIdentifiers(body);
  const ids = new Set();
  const re = /\b([A-Za-z_$][\w$]*)\b/g;
  let match;
  while ((match = re.exec(body))) {
    const name = match[1];
    if (!RESERVED.has(name) && !declared.has(name)) ids.add(name);
  }
  return [...ids].sort();
}

function extractImplParts(source, sliceName) {
  const fnName = `${sliceName}Impl`;
  const headerEnd = source.indexOf("} = __sliceScope;");
  if (headerEnd < 0) throw new Error(`Could not parse ${sliceName}`);
  const body = source.slice(headerEnd + "} = __sliceScope;".length).trimEnd();
  const closing = body.lastIndexOf("\n}");
  const code = body.slice(0, closing).replace(/^\n/, "").replace(/^  /gm, "");
  const argsMatch = source.match(new RegExp(`export function ${fnName}\\(([^)]*)\\)`));
  const usesCtx = argsMatch?.[1]?.includes("ctx");
  return { code, usesCtx };
}

function rewriteImpl(sliceName, code, usesCtx) {
  const ids = collectIdentifiers(code);
  const args = usesCtx ? "shared, ctx" : "shared";
  const mergeLine = usesCtx
    ? "  const __sliceScope = { ...shared, ...ctx };"
    : "  const __sliceScope = { ...shared };";
  return `export function ${sliceName}Impl(${args}) {
${mergeLine}
  let {
  ${ids.join(",\n  ")}
  } = __sliceScope;

${code.split("\n").map((line) => (line ? `  ${line}` : "")).join("\n")}
}
`;
}

for (const fileName of fs.readdirSync(implDir).filter((n) => n.endsWith(".impl.js"))) {
  const sliceName = fileName.replace(".impl.js", "");
  const source = fs.readFileSync(path.join(implDir, fileName), "utf8");
  const { code, usesCtx } = extractImplParts(source, sliceName);
  fs.writeFileSync(path.join(implDir, fileName), rewriteImpl(sliceName, code, usesCtx));
  console.log(`Fixed ${sliceName} (${collectIdentifiers(code).length} scope ids)`);
}
