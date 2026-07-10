import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { findBoundaryViolations } from "../scripts/check-frontend-v2-boundaries.mjs";
import { validateLegacyRemovalMap } from "../scripts/lib/frontend-upgrade-contracts.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const boundaryScript = fileURLToPath(
  new URL("../scripts/check-frontend-v2-boundaries.mjs", import.meta.url),
);
const legacyRemovalMap = JSON.parse(
  await readFile(
    new URL("../docs/frontend-upgrade/legacy-removal-map.json", import.meta.url),
    "utf8",
  ),
);
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const packageLock = JSON.parse(
  await readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
);

const exactFamilyIds = [
  "shell-auth",
  "daily-training",
  "interview-tools",
  "growth-competition",
  "remaining-domains",
  "static-runtime-entry",
  "runtime-glue",
];
const exactLegacyRoots = [
  "src/api", "src/app", "src/components", "src/features", "src/hooks", "src/layouts", "src/lib",
  "src/modules", "src/pages", "src/router", "src/routes", "src/state", "src/stores", "src/styles", "src/ui",
  "src/App.jsx", "src/catalog-data.js", "src/constants.js", "src/i18n.js", "src/main.js", "src/main.jsx",
  "src/prep-data.js", "src/router.js", "src/skills.js", "index.html", "config.js",
  "data/leetcode-hot-100.js", "data/library-catalog.js", "data/problem-catalog.js", "styles.css",
];
const exactFamilies = [
  {
    id: "shell-auth",
    removeInPhase: 1,
    priority: 60,
    globs: ["src/components/shell/**", "src/layouts/**", "src/router/**", "src/routes/**", "src/App.jsx", "src/main.jsx", "src/ui/appShellController.js", "src/ui/authRuntime.js", "src/styles/playful-precision-shell.css", "src/styles/playful-precision-replica-auth.css"],
    targetDomains: ["core", "account", "design-system"],
    replacementPaths: ["src/core/router", "src/core/providers", "src/domains/account", "src/design-system/patterns", "src/pages/v2"],
    exitChecks: ["new shell starts without legacy bootstrap", "auth credentials are not persisted in browser storage"],
  },
  {
    id: "daily-training",
    removeInPhase: 2,
    priority: 50,
    globs: ["src/features/overview/**", "src/features/plan/**", "src/features/problems/**", "src/modules/overview/**", "src/modules/plan/**", "src/modules/problems/**", "src/pages/OverviewPage.jsx", "src/pages/PlanPage.jsx", "src/pages/ProblemsPage.jsx", "src/app/services/overviewPageApi.js", "src/app/services/planPageApi.js", "src/app/services/problemsPageApi.js"],
    targetDomains: ["plan", "problems", "training"],
    replacementPaths: ["src/domains/plan", "src/domains/problems", "src/domains/training", "src/pages/training"],
    exitChecks: ["daily training e2e passes", "duplicate local and server training state is removed"],
  },
  {
    id: "interview-tools",
    removeInPhase: 3,
    priority: 50,
    globs: ["src/features/interview/**", "src/features/tools/**", "src/modules/interview/**", "src/modules/tools/**", "src/pages/InterviewPage.jsx", "src/pages/ToolsPage.jsx", "src/app/services/interviewPageApi.js", "src/app/services/toolsPageApi.js"],
    targetDomains: ["interview", "training"],
    replacementPaths: ["src/domains/interview", "src/domains/training", "src/pages/training"],
    exitChecks: ["AI job recovery e2e passes", "legacy interview and tools controllers are absent"],
  },
  {
    id: "growth-competition",
    removeInPhase: 4,
    priority: 50,
    globs: ["src/features/skills/**", "src/features/league/**", "src/features/pk/**", "src/features/poker/**", "src/modules/skills/**", "src/modules/economy/**", "src/modules/pk/**", "src/modules/poker/**", "src/pages/SkillsPage.jsx", "src/pages/LeaguePage.jsx", "src/pages/PkPage.jsx", "src/pages/PokerPage.jsx"],
    targetDomains: ["skills", "league", "economy", "poker", "training"],
    replacementPaths: ["src/domains/skills", "src/domains/league", "src/domains/economy", "src/domains/poker"],
    exitChecks: ["ledger-backed reward journeys pass", "competition routes use no client-owned balances"],
  },
  {
    id: "remaining-domains",
    removeInPhase: 5,
    priority: 50,
    globs: ["src/features/account/**", "src/features/community/**", "src/features/companies/**", "src/features/courses/**", "src/features/experiences/**", "src/features/jobs/**", "src/features/library/**", "src/features/memory/**", "src/features/messages/**", "src/features/network/**", "src/features/news/**", "src/features/resume/**", "src/features/settings/**", "src/pages/AccountPage.jsx", "src/pages/CommunityPage.jsx", "src/pages/CompaniesPage.jsx", "src/pages/CoursesPage.jsx", "src/pages/ExperiencesPage.jsx", "src/pages/JobsPage.jsx", "src/pages/LibraryPage.jsx", "src/pages/MemoryPage.jsx", "src/pages/MessagesPage.jsx", "src/pages/NetworkPage.jsx", "src/pages/NewsPage.jsx", "src/pages/ResumePage.jsx", "src/pages/SettingsPage.jsx"],
    targetDomains: ["account", "career", "community", "resources"],
    replacementPaths: ["src/domains/account", "src/domains/career", "src/domains/community", "src/domains/resources"],
    exitChecks: ["all Phase 5 route journeys pass", "old feature controllers for migrated routes are absent"],
  },
  {
    id: "static-runtime-entry",
    removeInPhase: 6,
    priority: 70,
    globs: ["index.html", "config.js", "data/leetcode-hot-100.js", "data/library-catalog.js", "data/problem-catalog.js"],
    targetDomains: ["core", "shared", "server-content"],
    replacementPaths: ["src/core/bootstrap", "src/shared/api", "data/leetcode-hot-100.json", "data/library-catalog.json", "data/problem-catalog.json"],
    exitChecks: ["index.html loads only the typed v2 bootstrap", "root runtime config is removed or generated from validated public config", "browser loads no catalog through classic global data scripts"],
  },
  {
    id: "runtime-glue",
    removeInPhase: 6,
    priority: 10,
    globs: ["src/api/**", "src/app/**", "src/components/common/**", "src/features/shared/**", "src/hooks/**", "src/lib/**", "src/modules/**", "src/pages/*Page.jsx", "src/router/**", "src/routes/**", "src/state/**", "src/stores/**", "src/styles/**", "src/ui/**", "src/App.jsx", "src/catalog-data.js", "src/constants.js", "src/i18n.js", "src/main.js", "src/main.jsx", "src/prep-data.js", "src/router.js", "src/skills.js", "styles.css"],
    targetDomains: ["core", "shared", "design-system"],
    replacementPaths: ["src/core", "src/shared", "src/design-system", "src/pages/v2"],
    exitChecks: ["legacy adapter is absent", "old store bridge and event bus are absent", "duplicate CSS is absent"],
  },
];

const gitTrackedFiles = (root) => {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "buffer",
  });
  assert.equal(result.status, 0, result.stderr.toString("utf8"));
  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
};

const makeFamily = (overrides = {}) => ({
  id: "owner",
  removeInPhase: 1,
  priority: 10,
  globs: ["src/legacy/**"],
  targetDomains: ["training"],
  replacementPaths: ["src/domains/training"],
  exitChecks: ["legacy code is absent"],
  ...overrides,
});

const makeRemovalMap = (overrides = {}) => ({
  version: 1,
  legacyRoots: ["src/legacy"],
  families: [makeFamily()],
  ...overrides,
});

const writeFixture = async (files, removalMap = legacyRemovalMap) => {
  const root = await mkdtemp(path.join(tmpdir(), "quantgym-v2-boundaries-"));
  const allFiles = {
    "docs/frontend-upgrade/legacy-removal-map.json": `${JSON.stringify(removalMap, null, 2)}\n`,
    ...files,
  };
  for (const [relativePath, contents] of Object.entries(allFiles)) {
    const absolutePath = path.join(root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents, "utf8");
  }
  return root;
};

const withFixture = async (files, callback, removalMap = legacyRemovalMap) => {
  const root = await writeFixture(files, removalMap);
  try {
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

test("the checked-in removal map has exactly seven complete families and covers tracked legacy files", () => {
  assert.deepEqual(legacyRemovalMap.families.map(({ id }) => id), exactFamilyIds);
  assert.deepEqual(legacyRemovalMap.legacyRoots, exactLegacyRoots);
  assert.equal(new Set(legacyRemovalMap.families.map(({ id }) => id)).size, exactFamilyIds.length);
  for (const family of legacyRemovalMap.families) {
    assert.ok(Number.isInteger(family.removeInPhase) && family.removeInPhase >= 1);
    assert.ok(Number.isInteger(family.priority));
    assert.ok(family.globs.length > 0);
    assert.ok(family.targetDomains.length > 0);
    assert.ok(family.replacementPaths.length > 0);
    assert.ok(family.exitChecks.length > 0);
  }

  assert.deepEqual(validateLegacyRemovalMap(legacyRemovalMap, gitTrackedFiles(projectRoot)), []);
});

test("freezes every removal-family record independently", () => {
  assert.deepEqual(legacyRemovalMap.families, exactFamilies);
});

test("declares the installed AST parser as an exact direct development dependency", () => {
  assert.equal(packageJson.devDependencies.rolldown, "1.0.3");
  assert.equal(packageLock.packages[""].devDependencies.rolldown, "1.0.3");
  assert.equal(packageLock.packages["node_modules/rolldown"].version, "1.0.3");
});

test("only legacy browser-global JavaScript catalogs are deletion inputs", () => {
  const browserGlobals = [
    "data/leetcode-hot-100.js",
    "data/library-catalog.js",
    "data/problem-catalog.js",
  ];
  const governedJson = browserGlobals.map((file) => file.replace(/\.js$/, ".json"));

  for (const file of browserGlobals) assert.ok(legacyRemovalMap.legacyRoots.includes(file));
  for (const file of governedJson) assert.ok(!legacyRemovalMap.legacyRoots.includes(file));
  assert.ok(governedJson.every((file) => (
    legacyRemovalMap.families
      .find(({ id }) => id === "static-runtime-entry")
      .replacementPaths.includes(file)
  )));
});

test("validates every required removal-family field", () => {
  const fieldMutations = [
    ["id", (family) => { family.id = ""; }],
    ["removeInPhase", (family) => { delete family.removeInPhase; }],
    ["priority", (family) => { delete family.priority; }],
    ["globs", (family) => { family.globs = []; }],
    ["targetDomains", (family) => { family.targetDomains = []; }],
    ["replacementPaths", (family) => { family.replacementPaths = []; }],
    ["exitChecks", (family) => { family.exitChecks = []; }],
  ];

  for (const [field, mutate] of fieldMutations) {
    const invalid = makeRemovalMap();
    mutate(invalid.families[0]);
    const failures = validateLegacyRemovalMap(invalid, ["src/legacy/owned.js"]);
    assert.ok(
      failures.some((failure) => failure.includes(field)),
      `${field} should be validated: ${failures.join(", ")}`,
    );
  }
});

test("assigns an overlapping legacy file to its one highest-priority family", () => {
  const removalMap = makeRemovalMap({
    families: [
      makeFamily({
        id: "low",
        priority: 10,
        globs: ["src/legacy/shared.js", "src/legacy/low-only.js"],
      }),
      makeFamily({
        id: "high",
        priority: 20,
        globs: ["src/legacy/shared.js", "src/legacy/high-only.js"],
      }),
    ],
  });
  const trackedFiles = [
    "src/legacy/shared.js",
    "src/legacy/low-only.js",
    "src/legacy/high-only.js",
  ];

  assert.deepEqual(validateLegacyRemovalMap(removalMap, trackedFiles), []);
});

test("rejects tied highest-priority owners deterministically", () => {
  const removalMap = makeRemovalMap({
    families: [
      makeFamily({ id: "z-owner", priority: 20 }),
      makeFamily({ id: "a-owner", priority: 20 }),
    ],
  });

  const failures = validateLegacyRemovalMap(removalMap, ["src/legacy/shared.js"]);

  assert.ok(failures.includes(
    "src/legacy/shared.js has tied highest-priority owners: a-owner, z-owner",
  ));
});

test("rejects unmatched tracked legacy files and families with no tracked match", () => {
  const removalMap = makeRemovalMap({
    families: [makeFamily({ globs: ["src/legacy/owned.js"] })],
  });

  const failures = validateLegacyRemovalMap(removalMap, [
    "src/legacy/owned.js",
    "src/legacy/unmatched.js",
  ]);
  assert.ok(failures.includes("src/legacy/unmatched.js has no removal family owner"));

  const noFamilyMatch = validateLegacyRemovalMap(
    makeRemovalMap({ families: [makeFamily({ globs: ["src/legacy/missing.js"] })] }),
    ["src/legacy/unmatched.js"],
  );
  assert.ok(noFamilyMatch.includes("owner matches no tracked legacy files"));
});

test("excludes replacement-path target subtrees from legacy ownership", () => {
  const removalMap = makeRemovalMap({
    legacyRoots: ["src/pages"],
    families: [makeFamily({
      globs: ["src/pages/**"],
      replacementPaths: ["src/pages/v2"],
    })],
  });

  assert.deepEqual(validateLegacyRemovalMap(removalMap, [
    "src/pages/LegacyPage.jsx",
    "src/pages/v2/Overview.tsx",
  ]), []);
});

test("allows typed domains to import shared API code and keeps governed JSON importable", async () => {
  await withFixture({
    "src/domains/training/load.ts": [
      'import { getPlan } from "@/shared/api/training";',
      'import { getProblems } from "../../shared/api/problems";',
      "export const load = () => Promise.all([getPlan(), getProblems()]);",
    ].join("\n"),
    "src/shared/api/training.ts": "export const getPlan = () => fetch('/api/plan');\n",
    "src/shared/api/problems.ts": "export const getProblems = () => fetch('/api/problems');\n",
    "src/shared/catalog.ts": 'import catalog from "../../data/problem-catalog.json";\nexport default catalog;\n',
    "src/core/browser-shell.ts": "document.querySelector('#root');\nwindow.addEventListener('focus', () => {});\n",
    "src/pages/v2/Overview.tsx": 'import "@/shared/api/training";\nexport default function Overview() {}\n',
    "src/pages/v2/Routes.ts": 'import Overview from "@/pages/v2/Overview";\nexport default Overview;\n',
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), []);
  });
});

test("rejects imports resolving into every declared legacy root", async () => {
  const importForRoot = (legacyRoot) => {
    if (legacyRoot.startsWith("src/")) {
      const suffix = path.posix.extname(legacyRoot) ? "" : "/probe";
      return `@/${legacyRoot.slice("src/".length)}${suffix}`;
    }
    const suffix = path.posix.extname(legacyRoot) ? "" : "/probe";
    return `../../../${legacyRoot}${suffix}`;
  };
  const files = {};
  const expectedSpecifiers = [];
  exactLegacyRoots.forEach((legacyRoot, index) => {
    const specifier = importForRoot(legacyRoot);
    expectedSpecifiers.push(specifier);
    const source = index % 3 === 0
      ? `import value from ${JSON.stringify(specifier)};\nvoid value;\n`
      : index % 3 === 1
        ? `const value = import(${JSON.stringify(specifier)});\nvoid value;\n`
        : `const value = require(${JSON.stringify(specifier)});\nvoid value;\n`;
    files[`src/domains/import-probes/case-${String(index).padStart(2, "0")}.ts`] = source;
  });

  await withFixture(files, async (root) => {
    const violations = await findBoundaryViolations(root);
    assert.equal(violations.length, exactLegacyRoots.length);
    assert.ok(violations.every(({ rule }) => rule === "legacyImport"));
    assert.deepEqual(
      violations.map(({ evidence }) => evidence).sort(),
      expectedSpecifiers.sort(),
    );
  });
});

test("resolves relative paths and the repository alias for static, dynamic, and require imports", async () => {
  await withFixture({
    "src/domains/import-probes/relative.ts": 'import "../../features/legacy";\n',
    "src/core/dynamic.ts": 'const legacy = import("@/api/client");\nvoid legacy;\n',
    "src/shared/required.ts": 'const legacy = require("@/lib/date");\nvoid legacy;\n',
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [
      { file: "src/core/dynamic.ts", rule: "legacyImport", evidence: "@/api/client" },
      { file: "src/domains/import-probes/relative.ts", rule: "legacyImport", evidence: "../../features/legacy" },
      { file: "src/shared/required.ts", rule: "legacyImport", evidence: "@/lib/date" },
    ]);
  });
});

test("normalizes repo-absolute aliases, traversal segments, and Windows separators", async () => {
  await withFixture({
    "src/core/escaped-alias.ts": 'import "@\\u002fapi/client";\n',
    "src/core/posix-traversal.ts": 'import "@/shared/../api/client";\n',
    "src/core/root-absolute.ts": 'import "/data/problem-catalog.js";\n',
    "src/shared/windows-traversal.ts": `const legacy = require(${JSON.stringify("@\\shared\\..\\state\\store")});\nvoid legacy;\n`,
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [
      {
        file: "src/core/escaped-alias.ts",
        rule: "legacyImport",
        evidence: "@/api/client",
      },
      {
        file: "src/core/posix-traversal.ts",
        rule: "legacyImport",
        evidence: "@/shared/../api/client",
      },
      {
        file: "src/core/root-absolute.ts",
        rule: "legacyImport",
        evidence: "/data/problem-catalog.js",
      },
      {
        file: "src/shared/windows-traversal.ts",
        rule: "legacyImport",
        evidence: "@\\shared\\..\\state\\store",
      },
    ]);
  });
});

test("parses re-exports and static template specifiers", async () => {
  await withFixture({
    "src/core/reexports.ts": [
      'export { client } from "@/api/client";',
      'export * from "@/state/store";',
    ].join("\n"),
    "src/core/template-specifiers.ts": [
      "const feature = import(`@/features/legacy`);",
      "const helper = require(`@/lib/date`);",
      "void feature;",
      "void helper;",
    ].join("\n"),
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [
      { file: "src/core/reexports.ts", rule: "legacyImport", evidence: "@/api/client" },
      { file: "src/core/reexports.ts", rule: "legacyImport", evidence: "@/state/store" },
      { file: "src/core/template-specifiers.ts", rule: "legacyImport", evidence: "@/features/legacy" },
      { file: "src/core/template-specifiers.ts", rule: "legacyImport", evidence: "@/lib/date" },
    ]);
  });
});

test("reports every non-import boundary rule and scopes fetch and DOM exceptions", async () => {
  await withFixture({
    "src/core/direct-fetch.ts": "export const load = () => fetch('/api/core');\n",
    "src/core/global-fetch.ts": "export const load = () => globalThis.fetch('/api/core');\n",
    "src/core/legacy-symbol.ts": "export const legacy = createAppContext;\n",
    "src/design-system/window-fetch.ts": "export const load = () => window.fetch('/api/theme');\n",
    "src/domains/training/document.ts": "export const root = document.querySelector('#root');\n",
    "src/domains/training/listener.ts": "window.addEventListener('online', () => {});\n",
    "src/pages/v2/page-fetch.tsx": "export const load = () => fetch('/api/page');\n",
    "src/shared/apiClient.ts": "export const load = () => fetch('/api/not-api-subtree');\n",
    "src/shared/events.ts": 'export const eventName = "quantgym:training-complete";\n',
  }, async (root) => {
    const violations = await findBoundaryViolations(root);
    assert.deepEqual(
      violations,
      [...violations].sort((left, right) => (
        left.file.localeCompare(right.file)
        || left.rule.localeCompare(right.rule)
        || left.evidence.localeCompare(right.evidence)
      )),
    );
    assert.ok(violations.every((violation) => (
      Object.keys(violation).sort().join(",") === "evidence,file,rule"
    )));
    assert.deepEqual(
      Object.fromEntries(["legacySymbol", "eventBus", "directFetch", "domainDom"].map((rule) => [
        rule,
        violations.filter((violation) => violation.rule === rule).length,
      ])),
      { legacySymbol: 1, eventBus: 1, directFetch: 5, domainDom: 2 },
    );
  });
});

test("detects TypeScript import-equals references to legacy modules", async () => {
  await withFixture({
    "src/core/import-equals.ts": [
      'import client = require("@/api/client");',
      "void client;",
    ].join("\n"),
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [{
      file: "src/core/import-equals.ts",
      rule: "legacyImport",
      evidence: "@/api/client",
    }]);
  });
});

test("detects domain DOM calls through nested member chains", async () => {
  await withFixture({
    "src/domains/training/document-body.ts": "document.body.querySelector('#root');\n",
    "src/domains/training/window-document.ts": "window.document.querySelector('#root');\n",
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [
      {
        file: "src/domains/training/document-body.ts",
        rule: "domainDom",
        evidence: "document.",
      },
      {
        file: "src/domains/training/window-document.ts",
        rule: "domainDom",
        evidence: "document.",
      },
    ]);
  });
});

test("recognizes legacy identifiers used as JSX element names", async () => {
  await withFixture({
    "src/core/legacy-provider.tsx": [
      "export const LegacyProvider = () => (",
      "  <AppServicesContext.Provider value={null} />",
      ");",
    ].join("\n"),
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [{
      file: "src/core/legacy-provider.tsx",
      rule: "legacySymbol",
      evidence: "AppServicesContext",
    }]);
  });
});

test("does not treat commented or string-quoted import examples as dependencies", async () => {
  await withFixture({
    "src/core/examples.ts": [
      '// import "@/api/client";',
      '/* require("@/state/store"); */',
      'const example = "import(\\\"@/app/runtime\\\")";',
      "void example;",
    ].join("\n"),
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), []);
  });
});

test("ignores member require calls and rule-shaped prose in strings or JSX text", async () => {
  await withFixture({
    "src/core/member-require.ts": [
      "const helper = { require: () => null };",
      'helper . require("@/api/client");',
    ].join("\n"),
    "src/domains/training/prose.ts": [
      'const docs = \'createAppContext fetch("/api") document.querySelector("#root")\';',
      "void docs;",
    ].join("\n"),
    "src/domains/training/prose.tsx": [
      "export const Example = () => (",
      "  <code>createAppContext fetch('/api') document.querySelector('#root')</code>",
      ");",
    ].join("\n"),
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), []);
  });
});

test("rejects symbolic links inside a v2 scan root instead of skipping their code", async () => {
  await withFixture({
    "unscanned/bypass.ts": 'import "@/api/client";\n',
  }, async (root) => {
    const linkPath = path.join(root, "src/core/bypass.ts");
    await mkdir(path.dirname(linkPath), { recursive: true });
    await symlink("../../unscanned/bypass.ts", linkPath);

    assert.deepEqual(await findBoundaryViolations(root), [{
      file: "src/core/bypass.ts",
      rule: "scanSymlink",
      evidence: "symbolic links are not allowed under v2 scan roots",
    }]);
  });
});

test("resolves an import alias outside scan roots before checking legacy ownership", async () => {
  await withFixture({
    "src/api/client.js": "export const client = true;\n",
    "src/core/use-bridge.ts": 'import "@/bridge/client";\n',
  }, async (root) => {
    await symlink("api", path.join(root, "src/bridge"));

    assert.deepEqual(await findBoundaryViolations(root), [{
      file: "src/core/use-bridge.ts",
      rule: "legacyImport",
      evidence: "@/bridge/client",
    }]);
  });
});

test("rejects a scan root that is itself a symbolic link", async () => {
  await withFixture({
    "core-target/entry.ts": "export const entry = true;\n",
  }, async (root) => {
    await mkdir(path.join(root, "src"), { recursive: true });
    await symlink("../core-target", path.join(root, "src/core"));

    assert.deepEqual(await findBoundaryViolations(root), [{
      file: "src/core",
      rule: "scanSymlink",
      evidence: "symbolic links are not allowed under v2 scan roots",
    }]);
  });
});

test("rejects an existing import whose realpath escapes the repository", async () => {
  const outsideRoot = await mkdtemp(path.join(tmpdir(), "quantgym-v2-outside-"));
  try {
    await writeFile(path.join(outsideRoot, "module.js"), "export const outside = true;\n", "utf8");
    await withFixture({
      "src/core/use-outside.ts": 'import "@/escape/module.js";\n',
    }, async (root) => {
      await symlink(outsideRoot, path.join(root, "src/escape"));

      assert.deepEqual(await findBoundaryViolations(root), [{
        file: "src/core/use-outside.ts",
        rule: "outsideImport",
        evidence: "@/escape/module.js",
      }]);
    });
  } finally {
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test("distinguishes regex literals, template expressions, and nested JSX prose", async () => {
  await withFixture({
    "src/core/regex-before-boundaries.ts": [
      "const token = /[/*]/;",
      'import "@/api/client";',
      "fetch('/api/core');",
      "void token;",
    ].join("\n"),
    "src/core/template-expression.ts": 'export const value = `${import("@/app/runtime")}`;\n',
    "src/domains/training/nested-prose.tsx": [
      "export const Example = () => (",
      "  <>",
      '    <code>import item from "@/api/client"</code>',
      "    <section><b />fetch('/api') document.querySelector('#root')</section>",
      "  </>",
      ");",
    ].join("\n"),
    "src/pages/v2/generic.tsx": [
      "export const identity = <T extends unknown>(value: T) => value;",
      "fetch('/api/page');",
    ].join("\n"),
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [
      { file: "src/core/regex-before-boundaries.ts", rule: "directFetch", evidence: "fetch(" },
      { file: "src/core/regex-before-boundaries.ts", rule: "legacyImport", evidence: "@/api/client" },
      { file: "src/core/template-expression.ts", rule: "legacyImport", evidence: "@/app/runtime" },
      { file: "src/pages/v2/generic.tsx", rule: "directFetch", evidence: "fetch(" },
    ]);
  });
});

test("ignores rule-shaped ordinary JSX text when a prop is followed by a parenthesized child", async () => {
  await withFixture({
    "src/domains/training/jsx-prose.tsx": [
      "export const Example = () => (",
      '  <section aria-label="boundary example">',
      "    (createAppContext fetch('/api') document.querySelector('#root'))",
      "  </section>",
      ");",
    ].join("\n"),
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), []);
  });
});

test("detects real calls after nested TSX generic constraints", async () => {
  await withFixture({
    "src/core/nested-generic.tsx": [
      "export const identity = <T extends { items: Array<{ id: string }> }>(value: T) => value;",
      "fetch('/api/core');",
    ].join("\n"),
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [{
      file: "src/core/nested-generic.tsx",
      rule: "directFetch",
      evidence: "fetch(",
    }]);
  });
});

test("separates regex and comment text from calls inside template expressions", async () => {
  await withFixture({
    "src/core/syntax-contexts.ts": [
      "if (true) {} /[/*]/.test('value');",
      'const value = `${import("@/api/client")}`;',
      "/* require('@/state/store'); fetch('/ignored'); */",
      "fetch('/api/core');",
      "void value;",
    ].join("\n"),
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [
      { file: "src/core/syntax-contexts.ts", rule: "directFetch", evidence: "fetch(" },
      { file: "src/core/syntax-contexts.ts", rule: "legacyImport", evidence: "@/api/client" },
    ]);
  });
});

test("returns a deterministic violation when typed source cannot be parsed", async () => {
  await withFixture({
    "src/core/broken.tsx": "export const broken = <section>;\n",
  }, async (root) => {
    assert.deepEqual(await findBoundaryViolations(root), [{
      file: "src/core/broken.tsx",
      rule: "parseError",
      evidence: "rolldown could not parse tsx source",
    }]);
  });
});

test("CLI validates tracked-file ownership before reporting boundary success", async () => {
  const removalMap = makeRemovalMap({
    families: [makeFamily({ globs: ["src/legacy/owned.js"] })],
  });
  await withFixture({
    "src/legacy/owned.js": "export const owned = true;\n",
    "src/legacy/unmatched.js": "export const unmatched = true;\n",
  }, async (root) => {
    const init = spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    const add = spawnSync("git", ["add", "."], { cwd: root, encoding: "utf8" });
    assert.equal(add.status, 0, add.stderr);

    const result = spawnSync(process.execPath, [boundaryScript, "--root", root], {
      cwd: projectRoot,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /src\/legacy\/unmatched\.js has no removal family owner/);
  }, removalMap);
});
