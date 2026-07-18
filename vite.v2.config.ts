import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const canonicalProjectRoot = realpathSync(projectRoot);
const approvedAssetRoot = path.join(canonicalProjectRoot, "assets/generated/playful-precision");
const approvedSourceExtensions = new Set([".css", ".ts", ".tsx"]);

type RuntimeAsset = {
  variants: Array<{ path: string }>;
};

type RuntimeAssetManifest = {
  schemaVersion: number;
  kind: string;
  assets: RuntimeAsset[];
};

const runtimeManifestPath = path.join(
  projectRoot,
  "assets/generated/playful-precision/quanty-runtime-manifest.json",
);

const isAtOrUnder = (parent: string, candidate: string) => {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
};

const assertPathChainHasNoSymlink = (absolutePath: string) => {
  const relative = path.relative(canonicalProjectRoot, absolutePath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`V2_PATH_OUTSIDE_REPOSITORY: ${absolutePath}`);
  }
  let currentPath = canonicalProjectRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, segment);
    if (lstatSync(currentPath).isSymbolicLink()) {
      throw new Error(`V2_PATH_SYMLINK: ${path.relative(canonicalProjectRoot, currentPath)}`);
    }
  }
};

const canonicalSecureFile = (absolutePath: string) => {
  assertPathChainHasNoSymlink(absolutePath);
  const linkStats = lstatSync(absolutePath);
  if (!linkStats.isFile()) throw new Error(`V2_PATH_NOT_REGULAR_FILE: ${absolutePath}`);
  const canonicalPath = realpathSync(absolutePath);
  if (!isAtOrUnder(canonicalProjectRoot, canonicalPath)) {
    throw new Error(`V2_FILE_OUTSIDE_REPOSITORY: ${absolutePath}`);
  }
  return canonicalPath;
};

const canonicalSecureDirectory = (absolutePath: string) => {
  if (!existsSync(absolutePath)) return path.resolve(absolutePath);
  assertPathChainHasNoSymlink(absolutePath);
  if (!lstatSync(absolutePath).isDirectory()) {
    throw new Error(`V2_PATH_NOT_DIRECTORY: ${absolutePath}`);
  }
  const canonicalPath = realpathSync(absolutePath);
  if (!isAtOrUnder(canonicalProjectRoot, canonicalPath)) {
    throw new Error(`V2_DIRECTORY_OUTSIDE_REPOSITORY: ${absolutePath}`);
  }
  return canonicalPath;
};

const canonicalRuntimeManifestPath = canonicalSecureFile(runtimeManifestPath);
const runtimeManifest = JSON.parse(
  readFileSync(canonicalRuntimeManifestPath, "utf8"),
) as RuntimeAssetManifest;
if (
  runtimeManifest.schemaVersion !== 1
  || runtimeManifest.kind !== "quanty-runtime-assets"
  || !Array.isArray(runtimeManifest.assets)
) {
  throw new Error("V2_ASSET_MANIFEST_INVALID");
}

const assertApprovedVariantPath = (relativePath: string) => {
  if (
    !/^assets\/generated\/playful-precision\/optimized\/[a-z0-9-]+-(?:160|320|640)\.webp$/.test(relativePath)
    || relativePath.includes("..")
  ) {
    throw new Error(`V2_ASSET_VARIANT_PATH_INVALID: ${relativePath}`);
  }
  return relativePath;
};

const approvedVariantRelativePaths = runtimeManifest.assets.flatMap((asset) => {
  if (asset.variants.length !== 3) throw new Error("V2_ASSET_VARIANT_COUNT_INVALID");
  const widths = asset.variants.map((variant) => variant.path.match(/-(160|320|640)\.webp$/)?.[1]);
  if (new Set(widths).size !== 3 || widths.some((width) => width === undefined)) {
    throw new Error("V2_ASSET_VARIANT_WIDTHS_INVALID");
  }
  return asset.variants.map((variant) => assertApprovedVariantPath(variant.path));
});
if (
  approvedVariantRelativePaths.length !== 48
  || new Set(approvedVariantRelativePaths).size !== approvedVariantRelativePaths.length
) {
  throw new Error("V2_ASSET_ALLOWLIST_INVALID");
}

const approvedSourceDirectories = [
  "src/core",
  "src/design-system",
  "src/domains",
  "src/pages/v2",
  "src/shared/api",
  "src/shared/i18n",
  "src/shared/lib",
  "src/shared/storage",
  "src/shared/testing",
].map((relativePath) => canonicalSecureDirectory(path.join(canonicalProjectRoot, relativePath)));

const approvedAssetPaths = new Set([
  "assets/generated/playful-precision/brand-q-mark.webp",
  "assets/generated/playful-precision/brand-quantgym-logo.webp",
  ...approvedVariantRelativePaths,
].map((relativePath) => {
  const canonicalPath = canonicalSecureFile(path.join(projectRoot, relativePath));
  if (!isAtOrUnder(approvedAssetRoot, canonicalPath)) {
    throw new Error(`V2_ASSET_OUTSIDE_APPROVED_ROOT: ${relativePath}`);
  }
  return canonicalPath;
}));

type ModuleGuardPolicy = Readonly<{
  projectRoot: string;
  entryPath: string;
  nodeModulesPath: string;
  sourceDirectories: readonly string[];
  assetPaths: ReadonlySet<string>;
}>;

const canonicalModulePath = (id: string) => {
  if (id.startsWith("\0") || id.startsWith("virtual:")) return null;
  const withoutQuery = id.replace(/[?#].*$/, "");
  if (!path.isAbsolute(withoutQuery) || !existsSync(withoutQuery)) return null;
  return realpathSync(withoutQuery);
};

const createModuleAssertion = (policy: ModuleGuardPolicy) => {
  const canonicalRoot = realpathSync(policy.projectRoot);
  const canonicalEntry = realpathSync(policy.entryPath);
  const canonicalNodeModules = realpathSync(policy.nodeModulesPath);
  const canonicalSources = policy.sourceDirectories
    .filter((directory) => existsSync(directory))
    .map((directory) => realpathSync(directory));
  const canonicalAssets = new Set([...policy.assetPaths].map((assetPath) => realpathSync(assetPath)));
  return (id: string) => {
    const canonicalPath = canonicalModulePath(id);
    if (canonicalPath === null) return;
    if (isAtOrUnder(canonicalNodeModules, canonicalPath)) return;
    if (canonicalPath === canonicalEntry) return;
    if (
      approvedSourceExtensions.has(path.extname(canonicalPath))
      && canonicalSources.some((directory) => isAtOrUnder(directory, canonicalPath))
    ) return;
    if (canonicalAssets.has(canonicalPath)) return;
    throw new Error(`V2_MODULE_OUTSIDE_ALLOWLIST: ${path.relative(canonicalRoot, canonicalPath)}`);
  };
};

type GuardApi = Readonly<{
  createModuleAssertion: typeof createModuleAssertion;
}>;

const v2ResolvedModuleGuard = (): Plugin<GuardApi> => {
  const assertApprovedModule = createModuleAssertion({
    projectRoot: canonicalProjectRoot,
    entryPath: canonicalSecureFile(path.join(canonicalProjectRoot, "v2.html")),
    nodeModulesPath: canonicalSecureDirectory(path.join(canonicalProjectRoot, "node_modules")),
    sourceDirectories: approvedSourceDirectories,
    assetPaths: approvedAssetPaths,
  });
  return {
    name: "quantgym-v2-resolved-module-guard",
    enforce: "pre",
    transform(_source, id) {
      assertApprovedModule(id);
      return null;
    },
    moduleParsed(moduleInfo) {
      assertApprovedModule(moduleInfo.id);
    },
    api: { createModuleAssertion },
  };
};

export default defineConfig({
  root: projectRoot,
  base: "/",
  publicDir: path.join(projectRoot, "public-v2"),
  appType: "spa",
  plugins: [v2ResolvedModuleGuard(), react()],
  build: {
    outDir: path.join(projectRoot, "dist-v2"),
    emptyOutDir: true,
    copyPublicDir: true,
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      input: path.join(projectRoot, "v2.html"),
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
