import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phase2DependencyBaseCommit = "4e84ef11275e38b8ebb8e21f9d0976ebf835aa8a";
const allowedAddition = Object.freeze({
  name: "@tanstack/react-virtual",
  version: "3.14.8",
  lockPath: "node_modules/@tanstack/react-virtual",
  transitiveLockPath: "node_modules/@tanstack/virtual-core",
});
const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), "utf8"),
);
const readAcceptedJson = (relativePath) => JSON.parse(execFileSync(
  "git",
  ["show", `${phase2DependencyBaseCommit}:${relativePath}`],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
));

test("Phase 2 keeps the approved dependency lock and adds only react-virtual", async () => {
  const [packageJson, packageLock] = await Promise.all([
    readJson("package.json"),
    readJson("package-lock.json"),
  ]);
  const phase1Package = readAcceptedJson("package.json");
  const phase1Lock = readAcceptedJson("package-lock.json");
  const expectedDependencies = {
    ...phase1Package.dependencies,
    [allowedAddition.name]: allowedAddition.version,
  };

  assert.deepEqual(packageJson.dependencies, expectedDependencies);
  assert.deepEqual(packageJson.devDependencies, phase1Package.devDependencies);
  assert.deepEqual(packageLock.packages[""].dependencies, expectedDependencies);
  assert.deepEqual(
    packageLock.packages[""].devDependencies,
    phase1Lock.packages[""].devDependencies,
  );
  assert.equal(
    packageLock.packages[allowedAddition.lockPath]?.version,
    allowedAddition.version,
  );

  const addedLockEntries = Object.keys(packageLock.packages)
    .filter((key) => !Object.hasOwn(phase1Lock.packages, key))
    .sort();
  const removedLockEntries = Object.keys(phase1Lock.packages)
    .filter((key) => !Object.hasOwn(packageLock.packages, key))
    .sort();
  assert.deepEqual(addedLockEntries, [
    allowedAddition.lockPath,
    allowedAddition.transitiveLockPath,
  ]);
  assert.deepEqual(removedLockEntries, []);

  for (const [lockPath, acceptedEntry] of Object.entries(phase1Lock.packages)) {
    if (lockPath !== "") assert.deepEqual(packageLock.packages[lockPath], acceptedEntry, lockPath);
  }
  assert.equal(Object.hasOwn(packageJson.devDependencies, "wrangler"), false);
  assert.equal(Object.hasOwn(packageLock.packages, "node_modules/wrangler"), false);
});

test("operator tools use a separate exact-version and hash lock outside package-lock", async () => {
  const operatorLock = await readJson(
    "docs/frontend-upgrade/phase-2-operator-toolchain-lock.json",
  );
  assert.deepEqual(operatorLock, {
    schemaVersion: 1,
    scope: "phase-2-preview-operator-only",
    applicationPackageLockIntegration: true,
    applicationPackageLockSha256: "411cd3646ddf62cd8687dddf1717bda192d18f5948401d2be3d3ec9925d36471",
    pythonRuntime: {
      version: "3.13.14",
      requirementsLockSha256: "e1b3ddb0c1d29d749e9180c21b93b3fe2cd29205e057a5964060d635e2ec8141",
      resolution: "fresh-private-venv-require-hashes",
      sitePackages: {
        relativePath: "lib/python3.13/site-packages",
        closureSha256: "355c445c683c12a9867600abce8fe32d2acfc892bec3d098a74d9cf27914d364",
        derivedBytecodePolicy: "exclude-cpython-313-pyc-under-__pycache__",
        recordPolicy: "include-record-normalize-venv-bin-hash-size",
        distributions: [
          ["alembic", "1.18.5"],
          ["annotated-doc", "0.0.4"],
          ["annotated-types", "0.7.0"],
          ["anyio", "4.14.2"],
          ["argon2-cffi", "25.1.0"],
          ["argon2-cffi-bindings", "25.1.0"],
          ["asgi-lifespan", "2.1.0"],
          ["boto3", "1.43.51"],
          ["botocore", "1.43.51"],
          ["certifi", "2026.6.17"],
          ["cffi", "2.1.0"],
          ["charset-normalizer", "3.4.9"],
          ["click", "8.4.2"],
          ["cryptography", "49.0.0"],
          ["dnspython", "2.8.0"],
          ["docker", "7.2.0"],
          ["email-validator", "2.3.0"],
          ["fastapi", "0.139.2"],
          ["h11", "0.16.0"],
          ["httpcore", "1.0.9"],
          ["httptools", "0.8.0"],
          ["httpx", "0.28.1"],
          ["idna", "3.18"],
          ["iniconfig", "2.3.0"],
          ["jmespath", "1.1.0"],
          ["mako", "1.3.12"],
          ["markupsafe", "3.0.3"],
          ["packaging", "26.2"],
          ["pip", "26.1.2"],
          ["pluggy", "1.6.0"],
          ["psycopg", "3.3.4"],
          ["psycopg-binary", "3.3.4"],
          ["pwdlib", "0.3.0"],
          ["pycparser", "3.0"],
          ["pydantic", "2.13.4"],
          ["pydantic-core", "2.46.4"],
          ["pydantic-settings", "2.14.2"],
          ["pygments", "2.20.0"],
          ["pyjwt", "2.13.0"],
          ["pytest", "9.1.1"],
          ["pytest-asyncio", "1.4.0"],
          ["python-dateutil", "2.9.0.post0"],
          ["python-dotenv", "1.2.2"],
          ["pyyaml", "6.0.3"],
          ["requests", "2.34.2"],
          ["s3transfer", "0.19.1"],
          ["six", "1.17.0"],
          ["sniffio", "1.3.1"],
          ["sqlalchemy", "2.0.51"],
          ["starlette", "1.3.1"],
          ["testcontainers", "4.14.2"],
          ["typing-extensions", "4.16.0"],
          ["typing-inspection", "0.4.2"],
          ["urllib3", "2.7.0"],
          ["uvicorn", "0.51.0"],
          ["uvloop", "0.22.1"],
          ["watchfiles", "1.2.0"],
          ["websockets", "16.1.1"],
          ["wrapt", "2.2.2"],
        ].map(([name, version]) => ({ name, version })),
      },
    },
    postgresClient: {
      version: "18.4",
      requiredExecutables: ["pg_dump", "pg_restore", "psql"],
      executableSha256: {
        pg_dump: "1c4a884d5ad3154fedf80cc9b28e5a1d4447293adfcea862998f8c93b79076bd",
        pg_restore: "51f5f3a9b5245a04547186a1a2649b3f1229596def9c86e5e245499586cafe0a",
        psql: "823383db827c7edc654465e52ebf9284126c13fbd97fbac8bf799878515809a4",
      },
    },
    wrangler: {
      version: "4.86.0",
      binSha256: "770db21641fb72c8035877b33c6a32856d61d253b58d9ea20e37820bcbc79007",
      closureSha256: "2ba16de471310a9ab8d2463e1fb3041b018f131bc12034622c33d5bf050b7666",
      resolution: "operator-clean-install-closure",
    },
  });
  assert.match(operatorLock.applicationPackageLockSha256, /^[0-9a-f]{64}$/u);
  assert.match(operatorLock.pythonRuntime.requirementsLockSha256, /^[0-9a-f]{64}$/u);
  assert.match(
    operatorLock.pythonRuntime.sitePackages.closureSha256,
    /^[0-9a-f]{64}$/u,
  );
  assert.match(operatorLock.wrangler.binSha256, /^[0-9a-f]{64}$/u);
  assert.match(operatorLock.wrangler.closureSha256, /^[0-9a-f]{64}$/u);
  for (const digest of Object.values(operatorLock.postgresClient.executableSha256)) {
    assert.match(digest, /^[0-9a-f]{64}$/u);
  }
});
