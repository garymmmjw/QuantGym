#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src/app/createAppContext");
const sourcePath = path.join(src, "buildContext.js");
const lines = fs.readFileSync(sourcePath, "utf8").split("\n");

const importEnd = lines.findIndex((line, index) => index > 0 && line.startsWith("export function createAppContext"));
const importLines = lines.slice(0, importEnd);

const slices = [
  { name: "initRuntimeSlice", start: 225, end: 598, returnsBag: true },
  { name: "initShellSlice", start: 599, end: 877, returnsBag: true },
  { name: "initInterviewSlice", start: 879, end: 1234, returnsBag: true },
  { name: "initDomainSlice", start: 1235, end: 1716, returnsBag: true },
  { name: "initOverviewSlice", start: 1718, end: 1887, returnsBag: true },
  { name: "assemblePageApiSlice", start: 1889, end: 2218, returnsBag: false }
];

function toReExports(importBlock) {
  return importBlock
    .map((line) => line.replace(/^import\s+/, "export "))
    .join("\n");
}

function collectBindings(codeLines) {
  const names = new Set();
  for (const line of codeLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;

    let match = trimmed.match(/^(?:const|let)\s+(\w+)\s*=/);
    if (match) {
      names.add(match[1]);
      continue;
    }

    match = trimmed.match(/^function\s+(\w+)\s*\(/);
    if (match) {
      names.add(match[1]);
      continue;
    }

    match = trimmed.match(/^(?:const|let)\s*\{([^}]+)\}\s*=/);
    if (match) {
      match[1].split(",").forEach((part) => {
        const piece = part.trim();
        if (!piece) return;
        const alias = piece.includes(":") ? piece.split(":").pop().trim() : piece;
        if (/^\w+$/.test(alias)) names.add(alias);
      });
      continue;
    }

    match = trimmed.match(/^(\w+)\s*=\s*/);
    if (match && !["if", "for", "while", "switch", "return"].includes(match[1])) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

function makeSliceFunction(slice, codeLines) {
  const bindings = collectBindings(codeLines);
  const code = codeLines.join("\n");
  const returnStatement = slice.returnsBag
    ? `\nreturn { ${bindings.join(", ")} };`
    : "";

  const bodyLiteral = JSON.stringify(`${code}${returnStatement}`);

  if (slice.name === "initRuntimeSlice") {
    return `import * as shared from "../sharedImports.js";

export function ${slice.name}() {
  const importKeys = Object.keys(shared);
  const importValues = Object.values(shared);
  const body = ${bodyLiteral};
  const runner = new Function(...importKeys, body);
  return runner(...importValues);
}
`;
  }

  return `import * as shared from "../sharedImports.js";

export function ${slice.name}(ctx) {
  const importKeys = Object.keys(shared);
  const importValues = Object.values(shared);
  const ctxKeys = Object.keys(ctx);
  const ctxValues = Object.values(ctx);
  const body = ${bodyLiteral};
  const runner = new Function(...importKeys, ...ctxKeys, body);
  return runner(...importValues, ...ctxValues);
}
`;
}

fs.mkdirSync(path.join(src, "slices"), { recursive: true });
fs.writeFileSync(path.join(src, "sharedImports.js"), `${toReExports(importLines)}\n`);

for (const slice of slices) {
  const codeLines = lines.slice(slice.start - 1, slice.end);
  fs.writeFileSync(path.join(src, "slices", `${slice.name}.js`), makeSliceFunction(slice, codeLines));
}

const orchestrator = `import { initRuntimeSlice } from "./slices/initRuntimeSlice.js";
import { initShellSlice } from "./slices/initShellSlice.js";
import { initInterviewSlice } from "./slices/initInterviewSlice.js";
import { initDomainSlice } from "./slices/initDomainSlice.js";
import { initOverviewSlice } from "./slices/initOverviewSlice.js";
import { assemblePageApiSlice } from "./slices/assemblePageApiSlice.js";

export function createAppContext(options = {}) {
  const ctx = { options, ...initRuntimeSlice() };
  Object.assign(ctx, initShellSlice(ctx));
  Object.assign(ctx, initInterviewSlice(ctx));
  Object.assign(ctx, initDomainSlice(ctx));
  Object.assign(ctx, initOverviewSlice(ctx));
  return assemblePageApiSlice(ctx);
}
`;

fs.writeFileSync(path.join(src, "buildContext.js"), orchestrator);
console.log("Split buildContext.js into slices.");
