#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slicesDir = path.join(root, "src/app/createAppContext/slices");
const implDir = path.join(slicesDir, "impl");

const RESERVED = new Set([
  "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return",
  "function", "const", "let", "var", "new", "typeof", "instanceof", "in", "of", "try",
  "catch", "finally", "throw", "async", "await", "true", "false", "null", "undefined",
  "this", "delete", "void", "export", "import", "from", "default", "class", "extends",
  "super", "yield", "with", "debugger"
]);

function extractBody(source) {
  const marker = "const body = ";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("body marker not found");
  let i = start + marker.length;
  if (source[i] !== '"') throw new Error("expected string literal body");
  i += 1;
  let body = "";
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      const next = source[i + 1];
      const escapes = { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\" };
      body += escapes[next] ?? next;
      i += 2;
      continue;
    }
    if (ch === '"') break;
    body += ch;
    i += 1;
  }
  return body;
}

function collectDeclaredIdentifiers(body) {
  const declared = new Set();
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\basync\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g,
    /\b(?:const|let|var)\s*\{([^}]+)\}\s*=/g,
    /\b(?:const|let|var)\s*\[([^\]]+)\]\s*=/g
  ];
  for (const pattern of patterns.slice(0, 3)) {
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

function getSharedKeys() {
  const sharedPath = path.join(root, "src/app/createAppContext/sharedImports.js");
  const text = fs.readFileSync(sharedPath, "utf8");
  const keys = new Set();
  for (const match of text.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)) keys.add(match[1]);
  for (const match of text.matchAll(/export\s*\{([^}]+)\}/g)) {
    match[1].split(",").forEach((part) => {
      const piece = part.trim();
      if (!piece) return;
      const alias = piece.includes(" as ") ? piece.split(" as ").pop().trim() : piece.split(":").pop().trim();
      if (/^\w+$/.test(alias)) keys.add(alias);
    });
  }
  return keys;
}

function makeWrapper(sliceName, usesCtx) {
  if (usesCtx) {
    return `import * as shared from "../sharedImports.js";
import { ${sliceName}Impl } from "./impl/${sliceName}.impl.js";

export function ${sliceName}(ctx = {}) {
  return ${sliceName}Impl(shared, ctx);
}
`;
  }
  return `import * as shared from "../sharedImports.js";
import { ${sliceName}Impl } from "./impl/${sliceName}.impl.js";

export function ${sliceName}() {
  return ${sliceName}Impl(shared);
}
`;
}

function makeImpl(sliceName, body, usesCtx) {
  const ids = collectIdentifiers(body);
  const destructured = ids.join(",\n  ");
  const args = usesCtx ? "shared, ctx" : "shared";
  const mergeLine = usesCtx
    ? "  const __sliceScope = { ...shared, ...ctx };"
    : "  const __sliceScope = { ...shared };";
  return `export function ${sliceName}Impl(${args}) {
${mergeLine}
  let {
  ${destructured}
  } = __sliceScope;

${body.split("\n").map((line) => (line ? `  ${line}` : "")).join("\n")}
}
`;
}

const sharedKeys = getSharedKeys();
fs.mkdirSync(implDir, { recursive: true });

const sliceFiles = fs.readdirSync(slicesDir).filter((name) => name.endsWith("Slice.js"));
for (const fileName of sliceFiles) {
  const sliceName = fileName.replace(/\.js$/, "");
  const source = fs.readFileSync(path.join(slicesDir, fileName), "utf8");
  if (!source.includes("const body = ")) {
    fs.rmSync(path.join(implDir, `${sliceName}.impl.js`), { force: true });
  }
  if (!source.includes("const body = ") && fs.existsSync(path.join(implDir, `${sliceName}.impl.js`))) {
    console.log(`Skip ${sliceName} (already decoded)`);
    continue;
  }
  if (!source.includes("const body = ")) {
    console.log(`Skip ${sliceName} (no body to decode)`);
    continue;
  }
  const body = extractBody(source);
  const usesCtx = source.includes("ctxKeys");
  const impl = makeImpl(sliceName, body, usesCtx);
  fs.writeFileSync(path.join(implDir, `${sliceName}.impl.js`), impl);
  fs.writeFileSync(path.join(slicesDir, fileName), makeWrapper(sliceName, usesCtx));
  const unknown = collectIdentifiers(body).filter((id) => !sharedKeys.has(id));
  console.log(`Decoded ${sliceName} (${body.length} chars, ctx=${usesCtx}, localIds=${unknown.length})`);
}
