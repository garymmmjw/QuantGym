import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import openapiTS, { astToString } from "openapi-typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const openapiPath = path.join(root, "api/openapi.json");
const schemaPath = path.join(root, "src/shared/api/generated/schema.d.ts");
const mode = process.argv[2];

if (!new Set(["--check", "--write"]).has(mode) || process.argv.length !== 3) {
  console.error("Usage: node scripts/openapi-v2.mjs --check|--write");
  process.exit(2);
}

const python = process.env.QUANTGYM_PYTHON_313 || "python3.13";
const exportArguments = ["api/scripts/export_openapi.py"];
if (mode === "--check") exportArguments.push("--check");
const exported = spawnSync(python, exportArguments, {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
});
if (exported.error || exported.status !== 0) {
  const message = exported.error?.code === "ENOENT"
    ? "Python 3.13.14 is required to verify OpenAPI."
    : (exported.stderr.trim() || "OpenAPI server export failed.");
  console.error(message);
  process.exit(exported.status || 1);
}

const document = JSON.parse(await readFile(openapiPath, "utf8"));
const generated = `${astToString(await openapiTS(document, {
  alphabetize: true,
  rootTypes: false,
})).trimEnd()}\n`;

if (mode === "--write") {
  await mkdir(path.dirname(schemaPath), { recursive: true });
  await writeFile(schemaPath, generated, { encoding: "utf8" });
  process.stdout.write(exported.stdout);
  console.log("Generated src/shared/api/generated/schema.d.ts.");
  process.exit(0);
}

let committed;
try {
  committed = await readFile(schemaPath, "utf8");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  console.error("OpenAPI drift: generated TypeScript schema is missing.");
  process.exit(1);
}
if (committed !== generated) {
  console.error("OpenAPI drift: regenerate the TypeScript schema.");
  process.exit(1);
}
process.stdout.write(exported.stdout);
console.log("OpenAPI TypeScript contract is current.");
