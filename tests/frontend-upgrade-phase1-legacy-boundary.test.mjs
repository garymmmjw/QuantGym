import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  APPROVED_BUSINESS_ROUTES,
  APPROVED_LEGACY_SANDBOX_TOKENS,
  APPROVED_NATIVE_BUSINESS_ROUTES,
  APPROVED_UNMIGRATED_ROUTES,
  LEGACY_PREVIEW_ORIGIN,
  PHASE1_PRODUCTION_SOURCE_ROOTS,
  PHASE1_SYSTEM_SURFACES,
  findPhase1LegacyBoundaryFailures,
  validateBusinessRouteOwnershipSource,
  validateBuildIsolationSources,
  validateLegacyAdapterReachableGraph,
  validateLegacyAdapterSource,
  validateLegacyPreviewFileSource,
  validateRouterMappingSources,
  validateRuntimeBoundarySpecSource,
  validateUnmigratedRoutesSource,
  validateV2SourceApiBoundary,
} from "../scripts/check-frontend-upgrade-phase1-legacy-boundary.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const goodRoutesSource = `
export const LEGACY_PREVIEW_ORIGIN = ${JSON.stringify(LEGACY_PREVIEW_ORIGIN)};
export const UNMIGRATED_ROUTES = Object.freeze(${JSON.stringify(APPROVED_UNMIGRATED_ROUTES)});
`;

const goodOwnershipSource = `
export const BUSINESS_ROUTE_OWNERSHIP = Object.freeze(${JSON.stringify(
  APPROVED_BUSINESS_ROUTES.map((route) => ({
    ...route,
    owner: APPROVED_NATIVE_BUSINESS_ROUTES.some(({ id }) => id === route.id)
      ? "native"
      : "compatibility",
  })),
)});
`;

const goodAdapterSource = `
import {
  LEGACY_PREVIEW_ORIGIN,
  UNMIGRATED_ROUTES,
} from "./unmigratedRoutes";
const LEGACY_FRAME_SANDBOX = "allow-forms allow-same-origin allow-scripts";
export function LegacyRouteAdapter() {
  const route = UNMIGRATED_ROUTES[0];
  return (
    <section aria-label="Compatibility surface">
      <p>Compatibility surface · 兼容模式</p>
      <iframe
        data-legacy-preview-frame
        sandbox={LEGACY_FRAME_SANDBOX}
        src={new URL(route.path, LEGACY_PREVIEW_ORIGIN).href}
        title="Legacy compatibility route"
      />
    </section>
  );
}
`;

const goodRuntimeSpecSource = `
const legacyOrigin = "https://legacy-compat.quantgym-v2-preview.pages.dev";
const apiBase = "/api/v2";
const frameSelector = "iframe[data-legacy-preview-frame]";
const observe = (page, request) => {
  const main = page.mainFrame();
  const owner = request.frame();
  const kind = request.resourceType();
  return { main, owner, kind, frameSelector, apiBase, legacyOrigin };
};
${PHASE1_SYSTEM_SURFACES.map((surface) => (
  `test("@phase1-system ${surface}", async () => { await observe(page, request); });`
)).join("\n")}
`;

const goodBuildSources = {
  viteSource: `
    const previewSources = mode === "preview" ? ["src/legacy-preview"] : [];
  `,
  buildSource: `
    const FORBIDDEN_PRODUCTION_OUTPUT = [
      ["legacy-preview", /legacy-preview/],
      ["legacy compatibility origin", /legacy-compat.quantgym-v2-preview.pages.dev/],
    ];
    throw new Error("V2_OUTPUT_INVALID");
  `,
};

const goodNavigationSource = `
const item = (id: string, path: string) => ({ id, path });
export const PREVIEW_BUSINESS_ROUTES = [
${APPROVED_BUSINESS_ROUTES.map(({ id, path: routePath }) => (
  `  item(${JSON.stringify(id)}, ${JSON.stringify(routePath)}),`
)).join("\n")}
];
`;

const goodRouterSource = `
import { COMPATIBILITY_BUSINESS_ROUTES } from "./businessRouteOwnership";
const legacyRouteAdapter = lazy(
  () => import("../../legacy-preview/LegacyRouteAdapter"),
);
const problemsPage = lazy(
  () => import("../../pages/training/ProblemsPage"),
);
const legacyCompatibilityElement = (
  <Suspense fallback={<Spinner label="正在载入兼容预览" size="large" />}>
    {createElement(legacyRouteAdapter)}
  </Suspense>
);
const nativeOverviewElement = <OverviewPage />;
const nativePlanElement = <PlanPage />;
const nativeProblemsElement = (
  <Suspense fallback={<ProblemsRouteLoadingFallback />}>
    {createElement(problemsPage)}
  </Suspense>
);
const businessRouteChildren = COMPATIBILITY_BUSINESS_ROUTES
  .map(({ id, path }) => ({
    path: path.slice(1),
    element: legacyCompatibilityElement,
    id: \`preview-\${id}\`,
  }));
export const routes = [
  { index: true, element: nativeOverviewElement },
  { path: "plan", element: nativePlanElement },
  { path: "problems", element: nativeProblemsElement },
  ...businessRouteChildren,
];
`;

const expectFailure = (failures, pattern) => {
  assert.match(failures.join("\n"), pattern);
};

test("tracks three native and 19 compatibility routes while preserving the Phase 1 isolation contract", () => {
  assert.equal(APPROVED_BUSINESS_ROUTES.length, 22);
  assert.equal(APPROVED_NATIVE_BUSINESS_ROUTES.length, 3);
  assert.deepEqual(APPROVED_NATIVE_BUSINESS_ROUTES, [
    { id: "overview", path: "/" },
    { id: "plan", path: "/plan" },
    { id: "problems", path: "/problems" },
  ]);
  assert.equal(APPROVED_UNMIGRATED_ROUTES.length, 19);
  assert.equal(new Set(APPROVED_UNMIGRATED_ROUTES.map(({ id }) => id)).size, 19);
  assert.equal(new Set(APPROVED_UNMIGRATED_ROUTES.map(({ path: routePath }) => routePath)).size, 19);
  assert.ok(PHASE1_PRODUCTION_SOURCE_ROOTS.includes("src/pages/plan"));
  assert.ok(PHASE1_PRODUCTION_SOURCE_ROOTS.includes("src/pages/training"));
  assert.deepEqual(PHASE1_SYSTEM_SURFACES, [
    "system:auth",
    "system:desktop-shell",
    "system:mobile-shell",
    "system:global-search",
    "system:notifications-toast",
    "system:todo",
    "system:theme-language",
    "system:network-recovery",
  ]);
  assert.equal(
    LEGACY_PREVIEW_ORIGIN,
    "https://legacy-compat.quantgym-v2-preview.pages.dev",
  );
  assert.deepEqual(APPROVED_LEGACY_SANDBOX_TOKENS, [
    "allow-forms",
    "allow-same-origin",
    "allow-scripts",
  ]);
});

test("accepts only the exact independent unmigrated-route allowlist", () => {
  assert.deepEqual(validateUnmigratedRoutesSource(goodRoutesSource), []);

  const deadApprovedArray = [
    goodRoutesSource.replace(
      "export const UNMIGRATED_ROUTES",
      "const DEAD_APPROVED_ROUTES",
    ),
    "export const UNMIGRATED_ROUTES = [];",
  ].join("\n");
  expectFailure(
    validateUnmigratedRoutesSource(deadApprovedArray),
    /UNMIGRATED_ROUTES.*exact independent 19-route compatibility allowlist/u,
  );

  const missing = goodRoutesSource.replace(
    JSON.stringify(APPROVED_UNMIGRATED_ROUTES[0]),
    "",
  );
  expectFailure(validateUnmigratedRoutesSource(missing), /19-route compatibility allowlist|route count/u);

  const duplicate = goodRoutesSource.replace(
    "Object.freeze([",
    `Object.freeze([${JSON.stringify(APPROVED_UNMIGRATED_ROUTES[0])},`,
  );
  expectFailure(validateUnmigratedRoutesSource(duplicate), /19-route compatibility allowlist|route count|unique/u);

  const unexpected = goodRoutesSource.replace(
    '"path":"/account"',
    '"path":"/admin"',
  );
  expectFailure(validateUnmigratedRoutesSource(unexpected), /19-route compatibility allowlist/u);

  const queryPath = goodRoutesSource.replace(
    '"path":"/skills"',
    '"path":"/skills?legacy=1"',
  );
  expectFailure(validateUnmigratedRoutesSource(queryPath), /not canonical|19-route compatibility allowlist/u);

  const wrongOrigin = goodRoutesSource.replace(
    "legacy-compat.quantgym-v2-preview.pages.dev",
    "unapproved.example.invalid",
  );
  expectFailure(validateUnmigratedRoutesSource(wrongOrigin), /exact compatibility origin/u);

});

test("requires the explicit staged business-route ownership split", () => {
  assert.deepEqual(validateBusinessRouteOwnershipSource(goodOwnershipSource), []);

  expectFailure(
    validateBusinessRouteOwnershipSource(
      goodOwnershipSource.replace('"owner":"native"', '"owner":"compatibility"'),
    ),
    /Overview, Plan, and Problems to native and the remaining 19 routes to compatibility/u,
  );
  expectFailure(
    validateBusinessRouteOwnershipSource(
      goodOwnershipSource.replace(
        '{"id":"plan","path":"/plan","owner":"native"}',
        '{"id":"plan","path":"/plan","owner":"compatibility"}',
      ),
    ),
    /Overview, Plan, and Problems to native and the remaining 19 routes to compatibility/u,
  );
  expectFailure(
    validateBusinessRouteOwnershipSource(
      goodOwnershipSource.replace('"owner":"compatibility"', '"owner":"native"'),
    ),
    /Overview, Plan, and Problems to native and the remaining 19 routes to compatibility/u,
  );
});

test("locks the adapter to one labelled iframe with the exact sandbox and no state bridge", () => {
  assert.deepEqual(validateLegacyAdapterSource(goodAdapterSource, goodRoutesSource), []);

  expectFailure(
    validateLegacyAdapterSource(
      goodAdapterSource.replace(
        'from "./unmigratedRoutes";',
        'from "./unmigratedRoutes";\nimport "../shared/lib/adapterBridge";',
      ),
      goodRoutesSource,
    ),
    /outside its exact allowlist/u,
  );

  const forbiddenCapabilities = [
    "allow-popups",
    "allow-top-navigation",
    "allow-downloads",
  ];
  for (const capability of forbiddenCapabilities) {
    const invalid = goodAdapterSource.replace(
      "allow-forms allow-same-origin allow-scripts",
      `allow-forms allow-same-origin allow-scripts ${capability}`,
    );
    expectFailure(
      validateLegacyAdapterSource(invalid, goodRoutesSource),
      /sandbox must be exactly|forbidden sandbox capability/u,
    );
  }

  const unsafeSources = [
    ["TanStack Query", 'import { useQuery } from "@tanstack/react-query";'],
    ["Zustand", 'import { create } from "zustand";'],
    ["postMessage bridge", "window.parent.postMessage({ type: \"sync\" }, \"*\");"],
    ["message event bridge", 'window.addEventListener("message", () => undefined);'],
    ["browser local storage", 'localStorage.setItem("state", "{}");'],
    ["browser session storage", 'sessionStorage.setItem("state", "{}");'],
    ["browser IndexedDB", 'indexedDB.open("legacy");'],
    ["V1 endpoint", 'const endpoint = "/api/v1/me";'],
    ["legacy state_json", 'const field = "state_json";'],
    ["legacy state hydration", "const hydrate = () => undefined;"],
  ];
  for (const [label, addition] of unsafeSources) {
    const invalid = goodAdapterSource.replace(
      "export function LegacyRouteAdapter()",
      `${addition}\nexport function LegacyRouteAdapter()`,
    );
    expectFailure(
      validateLegacyAdapterSource(invalid, goodRoutesSource),
      new RegExp(label.replaceAll(" ", ".*"), "u"),
    );
  }

  expectFailure(
    validateLegacyAdapterSource(
      goodAdapterSource.replace("data-legacy-preview-frame", ""),
      goodRoutesSource,
    ),
    /data-legacy-preview-frame/u,
  );
  expectFailure(
    validateLegacyAdapterSource(
      goodAdapterSource.replace('title="Legacy compatibility route"', ""),
      goodRoutesSource,
    ),
    /accessible title/u,
  );
  expectFailure(
    validateLegacyAdapterSource(
      goodAdapterSource
        .replace(/compatibility/giu, "temporary")
        .replace(/兼容/gu, "临时"),
      goodRoutesSource,
    ),
    /compatibility surface/u,
  );
});

test("requires real runtime coverage for all eight Phase 1 systems", () => {
  assert.deepEqual(validateRuntimeBoundarySpecSource(goodRuntimeSpecSource), []);

  expectFailure(
    validateRuntimeBoundarySpecSource(
      goodRuntimeSpecSource.replace("@phase1-system system:auth", "system:auth"),
    ),
    /one generated or exactly 8 explicit @phase1-system cases/u,
  );
  expectFailure(
    validateRuntimeBoundarySpecSource(
      goodRuntimeSpecSource.replace("system:todo", "system:desktop-shell"),
    ),
    /system:todo/u,
  );
  expectFailure(
    validateRuntimeBoundarySpecSource(
      goodRuntimeSpecSource.replace("request.frame()", "request.ownerFrame"),
    ),
    /request frame observation/u,
  );
  expectFailure(
    validateRuntimeBoundarySpecSource(
      `${goodRuntimeSpecSource}\nconst LEGACY_BOOT_COUNT = 0;\n`,
    ),
    /observe resources instead of trusting a boot marker/u,
  );
});

test("requires Preview-only source inclusion and explicit production artifact rejection", () => {
  assert.deepEqual(validateBuildIsolationSources(goodBuildSources), []);

  expectFailure(
    validateBuildIsolationSources({
      ...goodBuildSources,
      viteSource: 'const sources = ["src/legacy-preview"];',
    }),
    /gate legacy-preview modules on Preview mode/u,
  );
  expectFailure(
    validateBuildIsolationSources({
      ...goodBuildSources,
      buildSource: 'throw new Error("V2_OUTPUT_INVALID");',
    }),
    /reject adapter chunks and the legacy origin/u,
  );
});

test("proves the V2 router maps three native and 19 compatibility routes", () => {
  assert.deepEqual(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource,
    routesSource: goodRoutesSource,
  }), []);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource.replace(
      'item("account", "/account"),',
      "",
    ),
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource,
    routesSource: goodRoutesSource,
  }), /exactly the approved 22 business routes|same 22 routes/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      "const businessRouteChildren = COMPATIBILITY_BUSINESS_ROUTES",
      "const businessRouteChildren = []",
    ),
    routesSource: goodRoutesSource,
  }), /map all 19 compatibility routes/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      "element: legacyCompatibilityElement,",
      "element: nativeOverviewElement,",
    ),
    routesSource: goodRoutesSource,
  }), /bind all 19 compatibility routes directly to legacyCompatibilityElement/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      "() => import(\"../../pages/training/ProblemsPage\")",
      "() => import(\"../../pages/training/OverviewPage\")",
    ),
    routesSource: goodRoutesSource,
  }), /problemsPage must uniquely lazy-load the native ProblemsPage/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      "createElement(problemsPage)",
      "createElement(legacyRouteAdapter)",
    ),
    routesSource: goodRoutesSource,
  }), /nativeProblemsElement must be one unique Suspense wrapper/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      "const nativeOverviewElement",
      "const retiredGateway = <ProblemsRoute compatibilityElement={legacyCompatibilityElement} />;\nconst nativeOverviewElement",
    ),
    routesSource: goodRoutesSource,
  }), /must not declare the retired ProblemsRoute compatibility gateway/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      "createElement(legacyRouteAdapter)",
      "createElement(overviewPage)",
    ),
    routesSource: goodRoutesSource,
  }), /unique Suspense wrapper around createElement\(legacyRouteAdapter\)/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      "id: `preview-${id}`",
      'id: "preview-static"',
    ),
    routesSource: goodRoutesSource,
  }), /derive every route id as preview-\$\{id\}/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      "{ index: true, element: nativeOverviewElement }",
      "{ index: true, element: null }",
    ),
    routesSource: goodRoutesSource,
  }), /root Overview route/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      '{ path: "plan", element: nativePlanElement }',
      '{ path: "plan", element: null }',
    ),
    routesSource: goodRoutesSource,
  }), /native Plan element/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource.replace(
      '{ path: "problems", element: nativeProblemsElement }',
      '{ path: "problems", element: null }',
    ),
    routesSource: goodRoutesSource,
  }), /native Problems element/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource,
    ownershipSource: goodOwnershipSource.replace(
      '"owner":"native"',
      '"owner":"compatibility"',
    ),
    routerSource: goodRouterSource,
    routesSource: goodRoutesSource,
  }), /three native plus 19 compatibility routes/u);

  const deadApprovedNavigation = [
    goodNavigationSource.replace(
      "export const PREVIEW_BUSINESS_ROUTES",
      "const DEAD_APPROVED_ROUTES",
    ),
    "export const PREVIEW_BUSINESS_ROUTES = [];",
  ].join("\n");
  expectFailure(validateRouterMappingSources({
    navigationSource: deadApprovedNavigation,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource,
    routesSource: goodRoutesSource,
  }), /exactly the approved 22 business routes/u);

  const duplicateRuntimeRoute = goodNavigationSource.replace(
    /\n\];\s*$/u,
    '\n  item("overview", "/"),\n];',
  );
  expectFailure(validateRouterMappingSources({
    navigationSource: duplicateRuntimeRoute,
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource,
    routesSource: goodRoutesSource,
  }), /exactly the approved 22 business routes/u);

  expectFailure(validateRouterMappingSources({
    navigationSource: goodNavigationSource.replace(
      "({ id, path })",
      '({ id, path: "/admin" })',
    ),
    ownershipSource: goodOwnershipSource,
    routerSource: goodRouterSource,
    routesSource: goodRoutesSource,
  }), /item helper must preserve its first id and second path arguments/u);
});

test("recursively forbids state bridges and external CSS inside legacy-preview", () => {
  assert.deepEqual(validateLegacyPreviewFileSource(
    "unmigratedRoutes.ts",
    'export const path = "/plan";',
  ), []);
  expectFailure(validateLegacyPreviewFileSource(
    "bridge.ts",
    'window.parent.postMessage({ type: "sync" }, "*");',
  ), /postMessage bridge/u);
  expectFailure(validateLegacyPreviewFileSource(
    "store.ts",
    'import { create } from "zustand";',
  ), /Zustand/u);
  expectFailure(validateLegacyPreviewFileSource(
    "adapter.module.css",
    '@import "https://legacy.example.invalid/styles.css";',
  ), /CSS must not import external runtime content/u);
});

test("walks the adapter dependency graph and rejects transitive state or owner escapes", async (t) => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "quantgym-phase1-adapter-graph-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  await Promise.all([
    mkdir(path.join(fixture, "src/legacy-preview"), { recursive: true }),
    mkdir(path.join(fixture, "src/shared/i18n"), { recursive: true }),
    mkdir(path.join(fixture, "src/shared/lib"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(fixture, "src/legacy-preview/LegacyRouteAdapter.tsx"),
      [
        'import "react";',
        'import "react-router-dom";',
        'import "../shared/i18n";',
        'import "./adapter.module.css";',
        'import "./unmigratedRoutes";',
        "export const Adapter = () => null;",
      ].join("\n"),
    ),
    writeFile(
      path.join(fixture, "src/legacy-preview/unmigratedRoutes.ts"),
      'export const UNMIGRATED_ROUTES = [];\n',
    ),
    writeFile(path.join(fixture, "src/legacy-preview/adapter.module.css"), ".root {}\n"),
    writeFile(
      path.join(fixture, "src/shared/i18n/index.ts"),
      'export * from "./bridge";\n',
    ),
    writeFile(
      path.join(fixture, "src/shared/i18n/bridge.ts"),
      'export const bridge = localStorage.getItem("legacy");\n',
    ),
    writeFile(
      path.join(fixture, "src/shared/lib/bridge.ts"),
      "export const bridge = true;\n",
    ),
  ]);

  expectFailure(
    await validateLegacyAdapterReachableGraph(fixture),
    /src\/shared\/i18n\/bridge\.ts:.*browser local storage/u,
  );

  await writeFile(
    path.join(fixture, "src/shared/i18n/index.ts"),
    'export * from "../lib/bridge";\n',
  );
  expectFailure(
    await validateLegacyAdapterReachableGraph(fixture),
    /adapter graph reaches an unapproved source owner: src\/shared\/lib\/bridge\.ts/u,
  );
});

test("rejects non-V2 API literals and top-level legacy runtime evidence", async (t) => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "quantgym-phase1-legacy-api-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  await mkdir(path.join(fixture, "src/core"), { recursive: true });
  await writeFile(
    path.join(fixture, "src/core/good.ts"),
    'export const endpoint = "/api/v2/me";\n',
  );
  assert.deepEqual(await validateV2SourceApiBoundary(fixture), []);

  await writeFile(
    path.join(fixture, "src/core/bad.ts"),
    'export const endpoint = "/api/v1/me";\n',
  );
  expectFailure(await validateV2SourceApiBoundary(fixture), /non-V2 API literal/u);

  await writeFile(
    path.join(fixture, "src/core/bad.ts"),
    'export const endpoint = "https://upstream.example.invalid/api/v2/me";\n',
  );
  expectFailure(await validateV2SourceApiBoundary(fixture), /external API literal/u);

  await writeFile(
    path.join(fixture, "src/core/bad.ts"),
    'export const legacy = "src/main.jsx";\n',
  );
  expectFailure(
    await validateV2SourceApiBoundary(fixture),
    /top-level V2 source contains legacy runtime evidence/u,
  );
});

test("rejects symlinks inside the audited V2 source graph", async (t) => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "quantgym-phase1-legacy-link-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  await mkdir(path.join(fixture, "src/core"), { recursive: true });
  await writeFile(path.join(fixture, "outside.ts"), "export const outside = true;\n");
  await symlink("../../outside.ts", path.join(fixture, "src/core/linked.ts"));
  expectFailure(
    await validateV2SourceApiBoundary(fixture),
    /symlinks are not allowed/u,
  );
});

test("registers the Phase 1 legacy checker command", async () => {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["check:frontend-upgrade:phase1:legacy"],
    "node scripts/check-frontend-upgrade-phase1-legacy-boundary.mjs",
  );
});

test("the checked-in Task 9 boundary is complete", async () => {
  assert.deepEqual(await findPhase1LegacyBoundaryFailures(projectRoot), []);
});
