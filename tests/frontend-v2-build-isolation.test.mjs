import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadConfigFromFile, runnerImport } from "vite";

import {
  resolveBuildMetadata,
  validateV2PublicDirectory,
  validateV2PublicDeploymentPolicy,
} from "../scripts/build-frontend-v2.mjs";
import {
  resolveRepositoryBuildBranch,
} from "../scripts/lib/frontend-v2-build-branch.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const nodeBin = process.execPath;
const buildScript = path.join(projectRoot, "scripts/build-frontend-v2.mjs");
const distDirectory = path.join(projectRoot, "dist-v2");
const viteConfigPath = path.join(projectRoot, "vite.v2.config.ts");
let viteV2ModulePromise;

const loadViteV2Module = async () => {
  viteV2ModulePromise ??= runnerImport(viteConfigPath, {
    root: projectRoot,
    logLevel: "silent",
  }).then((result) => result.module);
  return viteV2ModulePromise;
};

const exactDependencies = {
  "@hookform/resolvers": "5.4.0",
  "@tanstack/react-query": "5.101.2",
  "openapi-typescript": "7.13.0",
  react: "19.2.7",
  "react-dom": "19.2.7",
  "react-hook-form": "7.82.0",
  "react-router-dom": "7.17.0",
  undici: "6.27.0",
  zod: "4.4.3",
  zustand: "5.0.14",
};

const exactDevDependencies = {
  "@axe-core/playwright": "4.12.1",
  "@eslint/js": "10.0.1",
  "@storybook/addon-a11y": "10.5.2",
  "@storybook/addon-docs": "10.5.2",
  "@storybook/react-vite": "10.5.2",
  "@testing-library/dom": "10.4.1",
  "@testing-library/jest-dom": "6.9.1",
  "@testing-library/react": "16.3.2",
  "@testing-library/user-event": "14.6.1",
  "@types/node": "20.19.43",
  "@types/react": "19.2.17",
  "@types/react-dom": "19.2.3",
  "@vitejs/plugin-react": "6.0.3",
  eslint: "10.7.0",
  "eslint-plugin-react-hooks": "7.1.1",
  "eslint-plugin-react-refresh": "0.5.3",
  "fake-indexeddb": "6.2.5",
  globals: "17.7.0",
  jsdom: "29.1.1",
  msw: "2.15.0",
  playwright: "1.61.1",
  "playwright-core": "1.61.1",
  rolldown: "1.1.5",
  storybook: "10.5.2",
  stylelint: "17.14.0",
  "stylelint-config-standard": "40.0.0",
  typescript: "5.9.3",
  "typescript-eslint": "8.64.0",
  vite: "8.1.5",
  vitest: "4.1.10",
};

const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(projectRoot, relativePath), "utf8"),
);

const walkFiles = async (root, relativeDirectory = "") => {
  const absoluteDirectory = path.join(root, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(root, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
};

const sha384 = (buffer) => `sha384-${createHash("sha384").update(buffer).digest("base64")}`;

const outputFingerprint = async () => Object.fromEntries(await Promise.all(
  (await walkFiles(distDirectory)).map(async (relativePath) => [
    relativePath,
    sha384(await readFile(path.join(distDirectory, relativePath))),
  ]),
));

const deterministicBuildEnvironment = () => {
  const environment = { ...process.env };
  delete environment.CF_PAGES_COMMIT_SHA;
  delete environment.CF_PAGES_BRANCH;
  return {
    ...environment,
    QUANTGYM_BUILD_COMMIT: "1111111111111111111111111111111111111111",
    QUANTGYM_BUILD_BRANCH: "codex/frontend-v2-preview",
    QUANTGYM_BUILD_SOURCE: "test",
  };
};

test("pins the complete Phase 1 frontend toolchain without floating package entries", async () => {
  const packageJson = await readJson("package.json");
  const packageLock = await readJson("package-lock.json");

  assert.equal(packageJson.packageManager, "npm@10.8.2");
  assert.deepEqual(packageJson.engines, { node: "20.20.2", npm: "10.8.2" });
  assert.deepEqual(packageJson.dependencies, exactDependencies);
  assert.deepEqual(packageJson.devDependencies, exactDevDependencies);
  assert.deepEqual(packageLock.packages[""].dependencies, exactDependencies);
  assert.deepEqual(packageLock.packages[""].devDependencies, exactDevDependencies);
  assert.deepEqual(packageLock.packages[""].engines, packageJson.engines);

  for (const [name, version] of Object.entries({ ...exactDependencies, ...exactDevDependencies })) {
    assert.doesNotMatch(version, /[~^*xX]|latest|next|workspace:|file:/);
    assert.equal(packageLock.packages[`node_modules/${name}`].version, version, name);
  }
});

test("declares the isolated V2 commands and exact source program", async () => {
  const packageJson = await readJson("package.json");
  assert.deepEqual(
    Object.fromEntries([
      "typecheck:v2",
      "lint:v2",
      "lint:styles:v2",
      "test:v2",
      "build:v2",
      "check:frontend-v2-build-isolation",
    ].map((name) => [name, packageJson.scripts[name]])),
    {
      "typecheck:v2": "tsc --project tsconfig.v2.json --noEmit",
      "lint:v2": "eslint --max-warnings 0 --no-error-on-unmatched-pattern --config eslint.config.mjs 'src/{core,design-system,domains,legacy-preview,pages/plan,pages/training,pages/v2}/**/*.{ts,tsx}' 'src/shared/{api,i18n,lib,storage,testing}/**/*.{ts,tsx}' 'functions/**/*.ts' '.storybook/*.ts' vite.v2.config.ts vitest.v2.config.ts",
      "lint:styles:v2": "stylelint --config stylelint.config.mjs 'src/{core,shared,design-system,domains,legacy-preview,pages/plan,pages/training,pages/v2}/**/*.css' --allow-empty-input",
      "test:v2": "vitest --config vitest.v2.config.ts run",
      "build:v2": "node scripts/build-frontend-v2.mjs",
      "check:frontend-v2-build-isolation": "node --test tests/frontend-v2-build-isolation.test.mjs && node scripts/check-frontend-v2-boundaries.mjs",
    },
  );

  const tsconfig = await readJson("tsconfig.v2.json");
  assert.equal(tsconfig.compilerOptions.strict, true);
  assert.equal(tsconfig.compilerOptions.noUncheckedIndexedAccess, true);
  assert.equal(tsconfig.compilerOptions.exactOptionalPropertyTypes, true);
  assert.equal(tsconfig.compilerOptions.allowJs, false);
  assert.deepEqual(tsconfig.include, [
    "src/core/**/*.ts",
    "src/core/**/*.tsx",
    "src/design-system/**/*.ts",
    "src/design-system/**/*.tsx",
    "src/domains/**/*.ts",
    "src/domains/**/*.tsx",
    "src/legacy-preview/**/*.ts",
    "src/legacy-preview/**/*.tsx",
    "src/pages/plan/**/*.ts",
    "src/pages/plan/**/*.tsx",
    "src/pages/training/**/*.ts",
    "src/pages/training/**/*.tsx",
    "src/pages/v2/**/*.ts",
    "src/pages/v2/**/*.tsx",
    "src/shared/api/**/*.ts",
    "src/shared/api/**/*.tsx",
    "src/shared/i18n/**/*.ts",
    "src/shared/i18n/**/*.tsx",
    "src/shared/lib/**/*.ts",
    "src/shared/lib/**/*.tsx",
    "src/shared/storage/**/*.ts",
    "src/shared/storage/**/*.tsx",
    "src/shared/testing/**/*.ts",
    "src/shared/testing/**/*.tsx",
    "functions/**/*.ts",
    ".storybook/main.ts",
    ".storybook/preview.ts",
    "vite.v2.config.ts",
    "vitest.v2.config.ts",
  ]);
  assert.ok(!tsconfig.include.includes("src/**/*"));

  const vitestConfig = await loadConfigFromFile(
    { command: "serve", mode: "test" },
    path.join(projectRoot, "vitest.v2.config.ts"),
    projectRoot,
  );
  assert.ok(vitestConfig);
  assert.equal(vitestConfig.config.test?.passWithNoTests, false);
  assert.deepEqual(vitestConfig.config.test?.include, [
    "tests/frontend-v2-edge-proxy.test.mjs",
    "src/core/**/*.test.{ts,tsx}",
    "src/design-system/**/*.test.{ts,tsx}",
    "src/domains/**/*.test.{ts,tsx}",
    "src/legacy-preview/**/*.test.{ts,tsx}",
    "src/pages/plan/**/*.test.{ts,tsx}",
    "src/pages/training/**/*.test.{ts,tsx}",
    "src/pages/v2/**/*.test.{ts,tsx}",
    "src/shared/**/*.test.{ts,tsx}",
  ]);
});

test("uses v2.html as the sole Vite entry and guards the canonical module graph", async () => {
  const viteV2Module = await loadViteV2Module();
  assert.deepEqual(viteV2Module.V2_SOURCE_ROOTS, [
    "src/core",
    "src/design-system",
    "src/domains",
    "src/pages/plan",
    "src/pages/training",
    "src/pages/v2",
    "src/shared/api",
    "src/shared/i18n",
    "src/shared/lib",
    "src/shared/storage",
    "src/shared/testing",
  ]);
  const loaded = await loadConfigFromFile(
    { command: "build", mode: "test" },
    path.join(projectRoot, "vite.v2.config.ts"),
    projectRoot,
  );
  assert.ok(loaded);
  assert.equal(loaded.config.root, projectRoot);
  assert.equal(loaded.config.publicDir, path.join(projectRoot, "public-v2"));
  assert.equal(loaded.config.build?.outDir, path.join(projectRoot, "dist-v2"));
  assert.equal(loaded.config.build?.rollupOptions?.input, path.join(projectRoot, "v2.html"));

  const guard = loaded.config.plugins?.find(
    (plugin) => plugin.name === "quantgym-v2-resolved-module-guard",
  );
  assert.ok(guard && typeof guard.transform === "function" && guard.api);
  assert.equal(guard.api.legacyPreviewAllowed, true);
  assert.doesNotThrow(() => guard.transform("", path.join(projectRoot, "src/core/bootstrap/main.tsx")));
  assert.doesNotThrow(() => guard.transform(
    "",
    path.join(projectRoot, "src/legacy-preview/LegacyRouteAdapter.tsx"),
  ));
  assert.doesNotThrow(() => guard.transform(
    "",
    path.join(projectRoot, "assets/generated/playful-precision/optimized/hero-wave-320.webp"),
  ));
  assert.doesNotThrow(() => guard.transform(
    "",
    path.join(projectRoot, "assets/generated/playful-precision/brand-q-mark.webp"),
  ));
  for (const relativePath of [
    "src/design-system/assets/fonts/PlusJakartaSans-wght.woff2",
    "src/design-system/assets/fonts/SpaceGrotesk-wght.woff2",
  ]) {
    assert.doesNotThrow(() => guard.transform("", path.join(projectRoot, relativePath)));
  }
  const runtimeManifest = await readJson(
    "assets/generated/playful-precision/quanty-runtime-manifest.json",
  );
  const forbiddenPaths = [
    "src/router.js",
    "config.js",
    "data/problem-catalog.js",
    "styles.css",
    "assets/generated/playful-precision/quanty-runtime-manifest.json",
    ...runtimeManifest.assets.map((asset) => asset.master.path),
  ];
  assert.equal(new Set(runtimeManifest.assets.map((asset) => asset.master.path)).size, 16);
  for (const relativePath of forbiddenPaths) {
    assert.throws(
      () => guard.transform("", path.join(projectRoot, relativePath)),
      /V2_MODULE_OUTSIDE_ALLOWLIST/,
      relativePath,
    );
  }
  for (const removedPath of ["src/main.jsx", "src/App.jsx"]) {
    assert.equal(
      await lstat(path.join(projectRoot, removedPath)).catch(() => null),
      null,
      `${removedPath} must remain deleted after the Phase 1 shell cutover`,
    );
  }
});

test("production branch builds reject the Preview adapter at the canonical module guard", async () => {
  const previousBranch = process.env.QUANTGYM_BUILD_BRANCH;
  const previousSource = process.env.QUANTGYM_BUILD_SOURCE;
  process.env.QUANTGYM_BUILD_BRANCH = "main";
  process.env.QUANTGYM_BUILD_SOURCE = "test";
  try {
    const loaded = await loadConfigFromFile(
      { command: "build", mode: "production" },
      path.join(projectRoot, "vite.v2.config.ts"),
      projectRoot,
    );
    const guard = loaded?.config.plugins?.find(
      (plugin) => plugin.name === "quantgym-v2-resolved-module-guard",
    );
    assert.ok(guard && typeof guard.transform === "function" && guard.api);
    assert.equal(guard.api.legacyPreviewAllowed, false);
    assert.throws(
      () => guard.transform(
        "",
        path.join(projectRoot, "src/legacy-preview/LegacyRouteAdapter.tsx"),
      ),
      /V2_MODULE_OUTSIDE_ALLOWLIST/,
    );
  } finally {
    if (previousBranch === undefined) delete process.env.QUANTGYM_BUILD_BRANCH;
    else process.env.QUANTGYM_BUILD_BRANCH = previousBranch;
    if (previousSource === undefined) delete process.env.QUANTGYM_BUILD_SOURCE;
    else process.env.QUANTGYM_BUILD_SOURCE = previousSource;
  }
});

test("canonical module guard rejects JavaScript and symlinks escaping an approved source root", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-v2-module-guard-"));
  const outsideRoot = await mkdtemp(path.join(tmpdir(), "quantgym-v2-module-outside-"));
  try {
    await Promise.all([
      mkdir(path.join(fixtureRoot, "src/core"), { recursive: true }),
      mkdir(path.join(fixtureRoot, "node_modules"), { recursive: true }),
      writeFile(path.join(fixtureRoot, "v2.html"), "<div id=\"root\"></div>\n", "utf8"),
      writeFile(path.join(fixtureRoot, "legacy.ts"), "export const legacy = true;\n", "utf8"),
      writeFile(path.join(outsideRoot, "outside.ts"), "export const outside = true;\n", "utf8"),
    ]);
    await Promise.all([
      writeFile(path.join(fixtureRoot, "src/core/allowed.ts"), "export const allowed = true;\n", "utf8"),
      writeFile(path.join(fixtureRoot, "src/core/forbidden.js"), "export const forbidden = true;\n", "utf8"),
      symlink("../../legacy.ts", path.join(fixtureRoot, "src/core/legacy-link.ts")),
      symlink(path.join(outsideRoot, "outside.ts"), path.join(fixtureRoot, "src/core/outside-link.ts")),
    ]);

    const loaded = await loadConfigFromFile(
      { command: "build", mode: "test" },
      path.join(projectRoot, "vite.v2.config.ts"),
      projectRoot,
    );
    const guard = loaded?.config.plugins?.find(
      (plugin) => plugin.name === "quantgym-v2-resolved-module-guard",
    );
    assert.ok(guard?.api && typeof guard.api.createModuleAssertion === "function");
    const assertFixtureModule = guard.api.createModuleAssertion({
      projectRoot: fixtureRoot,
      entryPath: path.join(fixtureRoot, "v2.html"),
      nodeModulesPath: path.join(fixtureRoot, "node_modules"),
      sourceDirectories: [path.join(fixtureRoot, "src/core")],
      assetPaths: new Set(),
    });
    assert.doesNotThrow(() => assertFixtureModule(path.join(fixtureRoot, "src/core/allowed.ts")));
    for (const relativePath of [
      "src/core/forbidden.js",
      "src/core/legacy-link.ts",
      "src/core/outside-link.ts",
    ]) {
      assert.throws(
        () => assertFixtureModule(path.join(fixtureRoot, relativePath)),
        /V2_MODULE_OUTSIDE_ALLOWLIST/,
        relativePath,
      );
    }
  } finally {
    await Promise.all([
      rm(fixtureRoot, { recursive: true, force: true }),
      rm(outsideRoot, { recursive: true, force: true }),
    ]);
  }
});

test("keeps initial V2 application imports relative", async () => {
  for (const relativeDirectory of ["src/core", "src/shared/api"]) {
    for (const relativePath of await walkFiles(path.join(projectRoot, relativeDirectory))) {
      if (!/\.(?:ts|tsx)$/.test(relativePath)) continue;
      const source = await readFile(path.join(projectRoot, relativeDirectory, relativePath), "utf8");
      assert.doesNotMatch(source, /(?:from\s*|import\s*\()\s*["']@\//, `${relativeDirectory}/${relativePath}`);
    }
  }
});

test("uses complete Cloudflare Pages provenance as the authoritative deployment identity", () => {
  const gitValue = () => {
    throw new Error("Git provenance must not be read when Cloudflare metadata is complete");
  };
  assert.deepEqual(resolveBuildMetadata({
    CF_PAGES_COMMIT_SHA: "2222222222222222222222222222222222222222",
    CF_PAGES_BRANCH: "codex/frontend-v2-preview",
  }, gitValue), {
    commit: "2222222222222222222222222222222222222222",
    branch: "codex/frontend-v2-preview",
    source: "cloudflare-pages",
  });
  assert.deepEqual(resolveBuildMetadata({
    QUANTGYM_BUILD_COMMIT: "2222222222222222222222222222222222222222",
    QUANTGYM_BUILD_BRANCH: "codex/frontend-v2-preview",
    QUANTGYM_BUILD_SOURCE: "cloudflare-pages",
    CF_PAGES_COMMIT_SHA: "2222222222222222222222222222222222222222",
    CF_PAGES_BRANCH: "codex/frontend-v2-preview",
  }, gitValue), {
    commit: "2222222222222222222222222222222222222222",
    branch: "codex/frontend-v2-preview",
    source: "cloudflare-pages",
  });
  assert.throws(() => resolveBuildMetadata({
    CF_PAGES_COMMIT_SHA: "2222222222222222222222222222222222222222",
  }, gitValue), /V2_CLOUDFLARE_METADATA_INCOMPLETE/);
  assert.throws(() => resolveBuildMetadata({
    CF_PAGES_COMMIT_SHA: "2222222222222222222222222222222222222222",
    CF_PAGES_BRANCH: "codex/frontend-v2-preview",
    QUANTGYM_BUILD_COMMIT: "3333333333333333333333333333333333333333",
  }, gitValue), /V2_CLOUDFLARE_COMMIT_OVERRIDE_MISMATCH/);
  assert.throws(() => resolveBuildMetadata({
    CF_PAGES_COMMIT_SHA: "2222222222222222222222222222222222222222",
    CF_PAGES_BRANCH: "codex/frontend-v2-preview",
    QUANTGYM_BUILD_BRANCH: "wrong-branch",
  }, gitValue), /V2_CLOUDFLARE_BRANCH_OVERRIDE_MISMATCH/);
  assert.throws(() => resolveBuildMetadata({
    CF_PAGES_COMMIT_SHA: "2222222222222222222222222222222222222222",
    CF_PAGES_BRANCH: "codex/frontend-v2-preview",
    QUANTGYM_BUILD_SOURCE: "forged-provider",
  }, gitValue), /V2_CLOUDFLARE_SOURCE_OVERRIDE_MISMATCH/);

  const localGitValue = (args) => (
    args.includes("rev-parse")
      ? "4444444444444444444444444444444444444444"
      : "main"
  );
  assert.deepEqual(resolveBuildMetadata({}, localGitValue), {
    commit: "4444444444444444444444444444444444444444",
    branch: "main",
    source: "local",
  });
  assert.throws(() => resolveBuildMetadata({
    QUANTGYM_BUILD_BRANCH: "codex/frontend-v2-preview",
  }, localGitValue), /V2_LOCAL_BRANCH_OVERRIDE_MISMATCH/);
  assert.throws(() => resolveBuildMetadata({
    QUANTGYM_BUILD_COMMIT: "5555555555555555555555555555555555555555",
  }, localGitValue), /V2_LOCAL_COMMIT_OVERRIDE_MISMATCH/);
  assert.throws(() => resolveBuildMetadata({
    QUANTGYM_BUILD_SOURCE: "cloudflare-pages",
  }, localGitValue), /V2_CLOUDFLARE_METADATA_REQUIRED/);
  assert.deepEqual(resolveBuildMetadata({
    QUANTGYM_BUILD_COMMIT: "5555555555555555555555555555555555555555",
    QUANTGYM_BUILD_BRANCH: "codex/frontend-v2-preview",
    QUANTGYM_BUILD_SOURCE: "test",
  }, localGitValue), {
    commit: "5555555555555555555555555555555555555555",
    branch: "codex/frontend-v2-preview",
    source: "test",
  });
});

test("resolves a detached GitHub PR merge checkout to its trusted head branch", async () => {
  let branchReads = 0;
  const environment = {
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_HEAD_REF: "codex/frontend-v2-preview",
    GITHUB_REF_NAME: "130/merge",
    GITHUB_REF_TYPE: "branch",
  };
  assert.equal(resolveRepositoryBuildBranch(environment, () => {
    branchReads += 1;
    return "";
  }), "codex/frontend-v2-preview");
  assert.equal(branchReads, 0);

  const gitValue = (args) => {
    if (args[0] === "rev-parse") return "6666666666666666666666666666666666666666";
    throw new Error("Detached PR builds must use the trusted GitHub head ref");
  };
  assert.deepEqual(resolveBuildMetadata(environment, gitValue), {
    commit: "6666666666666666666666666666666666666666",
    branch: "codex/frontend-v2-preview",
    source: "local",
  });

  const viteV2Module = await loadViteV2Module();
  let viteBranchReads = 0;
  const viteBranch = viteV2Module.resolveV2BuildBranch({
    ...environment,
    QUANTGYM_BUILD_SOURCE: "test",
  }, () => {
    viteBranchReads += 1;
    return "";
  });
  assert.equal(viteBranch, "codex/frontend-v2-preview");
  assert.equal(viteBranchReads, 0);
});

test("keeps a detached GitHub main build on the production legacy-frame policy", async () => {
  const environment = {
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "push",
    GITHUB_HEAD_REF: "codex/frontend-v2-preview",
    GITHUB_REF_NAME: "main",
    GITHUB_REF_TYPE: "branch",
  };
  const branch = resolveRepositoryBuildBranch(environment, () => {
    throw new Error("GitHub branch metadata must take precedence over detached Git");
  });
  assert.equal(branch, "main");
  const gitValue = (args) => {
    if (args[0] === "rev-parse") return "7777777777777777777777777777777777777777";
    throw new Error("Detached production builds must use the trusted GitHub ref name");
  };
  assert.deepEqual(resolveBuildMetadata(environment, gitValue), {
    commit: "7777777777777777777777777777777777777777",
    branch: "main",
    source: "local",
  });
  await assert.rejects(
    validateV2PublicDeploymentPolicy(branch === "codex/frontend-v2-preview"),
    /V2_PRODUCTION_LEGACY_FRAME_POLICY_FORBIDDEN/,
  );
  assert.equal(
    resolveRepositoryBuildBranch({
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_HEAD_REF: "codex/frontend-v2-preview",
    }, () => "main"),
    "main",
    "GitHub refs outside GitHub Actions must not override the repository branch",
  );
  const tagEnvironment = {
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "push",
    GITHUB_REF_NAME: "codex/frontend-v2-preview",
    GITHUB_REF_TYPE: "tag",
  };
  let tagBranchReads = 0;
  assert.equal(resolveRepositoryBuildBranch(tagEnvironment, () => {
    tagBranchReads += 1;
    return "codex/frontend-v2-preview";
  }), "detached");
  assert.equal(tagBranchReads, 0);

  const viteV2Module = await loadViteV2Module();
  let viteTagBranchReads = 0;
  assert.equal(viteV2Module.resolveV2BuildBranch(tagEnvironment, () => {
    viteTagBranchReads += 1;
    return "codex/frontend-v2-preview";
  }), "detached");
  assert.equal(viteTagBranchReads, 0);

  const unknownRefEnvironment = {
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "push",
    GITHUB_REF_NAME: "codex/frontend-v2-preview",
    GITHUB_REF_TYPE: "unknown",
  };
  let unknownRefBranchReads = 0;
  assert.equal(resolveRepositoryBuildBranch(unknownRefEnvironment, () => {
    unknownRefBranchReads += 1;
    return "codex/frontend-v2-preview";
  }), "detached");
  assert.equal(unknownRefBranchReads, 0);
});

test("public-v2 accepts only the four reviewed regular deployment files", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-v2-public-"));
  const outsideRoot = await mkdtemp(path.join(tmpdir(), "quantgym-v2-public-outside-"));
  try {
    await Promise.all([
      writeFile(path.join(fixtureRoot, "_headers"), "/assets/*\n  Cache-Control: public\n", "utf8"),
      writeFile(path.join(fixtureRoot, "_redirects"), "/* /index.html 200\n", "utf8"),
      writeFile(path.join(fixtureRoot, "_routes.json"), "{\"version\":1,\"include\":[\"/api/v2/*\"],\"exclude\":[]}\n", "utf8"),
      writeFile(path.join(fixtureRoot, "favicon.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n", "utf8"),
      writeFile(path.join(outsideRoot, "secret.pem"), "PRIVATE MATERIAL\n", "utf8"),
    ]);
    await assert.doesNotReject(validateV2PublicDirectory(fixtureRoot));
    await writeFile(path.join(fixtureRoot, ".env"), "SECRET=value\n", "utf8");
    await assert.rejects(validateV2PublicDirectory(fixtureRoot), /V2_PUBLIC_FILES_INVALID/);
    await rm(path.join(fixtureRoot, ".env"));
    await rm(path.join(fixtureRoot, "_headers"));
    await symlink(path.join(outsideRoot, "secret.pem"), path.join(fixtureRoot, "_headers"));
    await assert.rejects(validateV2PublicDirectory(fixtureRoot), /V2_PUBLIC_FILE_INVALID/);
  } finally {
    await Promise.all([
      rm(fixtureRoot, { recursive: true, force: true }),
      rm(outsideRoot, { recursive: true, force: true }),
    ]);
  }
});

test("allows the legacy frame policy only for the isolated Preview build", async () => {
  await assert.doesNotReject(validateV2PublicDeploymentPolicy(true));
  await assert.rejects(
    validateV2PublicDeploymentPolicy(false),
    /V2_PRODUCTION_LEGACY_FRAME_POLICY_FORBIDDEN/,
  );
});

test("builds exactly one V2 HTML entry and deterministic public metadata", { timeout: 120_000 }, async () => {
  await rm(distDirectory, { recursive: true, force: true });
  const result = spawnSync(nodeBin, [buildScript], {
    cwd: projectRoot,
    encoding: "utf8",
    env: deterministicBuildEnvironment(),
    maxBuffer: 20 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const files = await walkFiles(distDirectory);
  assert.ok(files.includes("index.html"));
  assert.ok(!files.includes("404.html"));
  assert.ok(files.includes("config.json"));
  assert.ok(files.includes("version.json"));
  assert.ok(files.includes("asset-integrity.json"));
  assert.ok(files.includes("_headers"));
  assert.ok(files.includes("_redirects"));
  assert.ok(files.includes("_routes.json"));
  assert.ok(files.includes("favicon.svg"));
  assert.ok(!files.includes("v2.html"));
  assert.ok(!files.includes("index.html.html"));

  const indexHtml = await readFile(path.join(distDirectory, "index.html"), "utf8");
  assert.match(indexHtml, /<div id="root"><\/div>/);
  assert.match(indexHtml, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml"\s*\/?>/);
  assert.doesNotMatch(indexHtml, /(?:src\/main\.jsx|config\.js|data\/.*\.js)/);

  for (const deploymentFile of ["_headers", "_redirects", "_routes.json", "favicon.svg"]) {
    assert.deepEqual(
      await readFile(path.join(distDirectory, deploymentFile)),
      await readFile(path.join(projectRoot, "public-v2", deploymentFile)),
      deploymentFile,
    );
  }
  assert.equal(await readFile(path.join(distDirectory, "_redirects"), "utf8"), "/* /index.html 200\n");
  assert.deepEqual(await readJson("dist-v2/_routes.json"), {
    version: 1,
    include: ["/api/v2", "/api/v2/*"],
    exclude: [],
  });

  assert.deepEqual(await readJson("dist-v2/config.json"), {
    schemaVersion: 1,
    apiBase: "/api/v2",
  });
  assert.deepEqual(await readJson("dist-v2/version.json"), {
    schemaVersion: 1,
    commit: "1111111111111111111111111111111111111111",
    branch: "codex/frontend-v2-preview",
    source: "test",
  });

  const integrity = await readJson("dist-v2/asset-integrity.json");
  assert.equal(integrity.schemaVersion, 1);
  assert.deepEqual(Object.keys(integrity.assets), Object.keys(integrity.assets).sort());
  assert.ok(Object.keys(integrity.assets).length > 0);
  assert.ok(!Object.hasOwn(integrity.assets, "asset-integrity.json"));
  for (const [relativePath, metadata] of Object.entries(integrity.assets)) {
    const contents = await readFile(path.join(distDirectory, relativePath));
    assert.deepEqual(metadata, { bytes: contents.byteLength, integrity: sha384(contents) });
  }

  for (const relativePath of files) {
    const linkStats = await lstat(path.join(distDirectory, relativePath));
    assert.equal(linkStats.isSymbolicLink(), false, relativePath);
    const canonical = await realpath(path.join(distDirectory, relativePath));
    const targetStats = await stat(canonical);
    assert.equal(targetStats.isFile(), true, relativePath);
  }

  const firstFingerprint = await outputFingerprint();
  const repeat = spawnSync(nodeBin, [buildScript], {
    cwd: projectRoot,
    encoding: "utf8",
    env: deterministicBuildEnvironment(),
    maxBuffer: 20 * 1024 * 1024,
  });
  assert.equal(repeat.status, 0, `${repeat.stdout}\n${repeat.stderr}`);
  assert.deepEqual(await outputFingerprint(), firstFingerprint);
});

test("the V2 output contains no legacy bootstrap, raw secret, or provider origin", async () => {
  if ((await stat(distDirectory).catch(() => null)) === null) {
    execFileSync(nodeBin, [buildScript], { cwd: projectRoot, stdio: "pipe" });
  }
  const forbidden = [
    /src\/main\.jsx/,
    /createAppContext/,
    /pageApi/,
    /storeBridge/,
    /quantgym:/,
    /\.onrender\.com/i,
    /r2\.cloudflarestorage\.com/i,
    /postgres(?:ql)?:\/\//i,
    /(?:api[_-]?key|client[_-]?secret|private[_-]?key)\s*[:=]/i,
  ];
  for (const relativePath of await walkFiles(distDirectory)) {
    const source = await readFile(path.join(distDirectory, relativePath), "utf8").catch(() => null);
    if (source === null) continue;
    for (const pattern of forbidden) assert.doesNotMatch(source, pattern, relativePath);
  }
});
