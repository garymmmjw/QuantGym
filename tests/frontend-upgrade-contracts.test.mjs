import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateDesignSystemContract } from "../scripts/lib/frontend-upgrade-contracts.mjs";

const validDesignSystem = JSON.parse(
  await readFile(
    new URL("../docs/frontend-upgrade/design-system-contract.json", import.meta.url),
    "utf8",
  ),
);

const completeHashFailure = "complete approved design-system contract hash mismatch";

const swapFirstTwo = (items) => {
  [items[0], items[1]] = [items[1], items[0]];
};

const reverseObjectKeys = (value) => {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, nestedValue]) => [key, reverseObjectKeys(nestedValue)]),
  );
};

test("locks the approved Playful Precision foundations", () => {
  const failures = validateDesignSystemContract(validDesignSystem);

  assert.deepEqual(failures, []);
  assert.deepEqual(validDesignSystem.themes, {
    light: {
      appBackground: "#f4f4fb",
      surfacePrimary: "#ffffff",
      surfaceSecondary: "#fbfbfd",
      textPrimary: "#1b1a38",
      textSecondary: "#4a4966",
      textMuted: "#6d6c8e",
      borderSubtle: "#ecebf7",
      actionPrimary: "#5b5ff5",
      actionPrimarySoft: "#eef0ff",
    },
    dark: {
      appBackground: "#111020",
      surfacePrimary: "#201f39",
      surfaceSecondary: "#1b1a30",
      textPrimary: "#f1f0fb",
      textSecondary: "#cbc9e8",
      textMuted: "#a6a4cf",
      borderSubtle: "#332f57",
      actionPrimary: "#7d7bff",
      actionPrimaryInk: "#b9b8ff",
    },
  });
  assert.deepEqual(validDesignSystem.typography, {
    ui: "Plus Jakarta Sans",
    metrics: "Space Grotesk",
    chineseFallbacks: ["PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "sans-serif"],
    metricFeatures: ["tabular-nums"],
  });
  assert.deepEqual(validDesignSystem.shape.radiusPx, [11, 14, 16, 20, 28]);
  assert.deepEqual(validDesignSystem.motion.microMs, [120, 180]);
  assert.deepEqual(validDesignSystem.motion.panelMs, [240, 300]);
  assert.deepEqual(validDesignSystem.viewports, [
    { id: "desktop", width: 1440, height: 900 },
    { id: "laptop", width: 1280, height: 720 },
    { id: "mobile", width: 390, height: 844 },
    { id: "tablet", width: 1024, height: 768, conditional: true },
  ]);
  assert.deepEqual(validDesignSystem.requiredStates, [
    "loading",
    "ready",
    "empty",
    "error",
    "disabled",
    "focus",
    "active",
    "reward",
    "reduced-motion",
  ]);
  assert.deepEqual(validDesignSystem.allowedDeviationReasons, [
    "real-data-density",
    "accessibility",
    "performance",
    "small-screen-usability",
  ]);
});

test("rejects raw-palette semantics and an unapproved deviation reason", () => {
  const invalid = structuredClone(validDesignSystem);
  invalid.semanticTokens.push("purple-500");
  invalid.allowedDeviationReasons.push("personal-preference");

  const failures = validateDesignSystemContract(invalid);

  assert.ok(failures.some((item) => item.includes("semantic token")));
  assert.ok(failures.some((item) => item.includes("deviation reason")));
});

test("canonical hashing ignores object key insertion order", () => {
  const reordered = reverseObjectKeys(validDesignSystem);

  assert.deepEqual(validateDesignSystemContract(reordered), []);
});

const topLevelMutations = [
  ["version", (contract) => { contract.version = 2; }],
  ["name", (contract) => { contract.name = "Playful Precision 2.1"; }],
  ["spec", (contract) => { contract.spec = contract.spec.replace("design.md", "design-v2.md"); }],
  ["designSource", (contract) => { contract.designSource = contract.designSource.replace("manifest.json", "manifest-v2.json"); }],
  ["productionAssets", (contract) => { contract.productionAssets = contract.productionAssets.replace("manifest.json", "manifest-v2.json"); }],
  ["themes", (contract) => { contract.themes.light.appBackground = "#f4f4fa"; }],
  ["semanticTokens", (contract) => { swapFirstTwo(contract.semanticTokens); }],
  ["typography", (contract) => { swapFirstTwo(contract.typography.chineseFallbacks); }],
  ["shape", (contract) => { contract.shape.shadowPolicy = "dialogs-command-notifications-only"; }],
  ["surfacePolicy", (contract) => { swapFirstTwo(contract.surfacePolicy.hierarchyOrder); }],
  ["densityPolicy", (contract) => { contract.densityPolicy.problems = "dense-professional-scan-optimized"; }],
  ["shellLayout", (contract) => { contract.shellLayout.ordinaryContentMaxPx = 1179; }],
  ["breakpoints", (contract) => { contract.breakpoints.mobileTouchTargetMinPx = 45; }],
  ["templateResponsiveRules", (contract) => { contract.templateResponsiveRules.dashboard = "stack-priority-sections-primary-action-first"; }],
  ["motion", (contract) => { contract.motion.rewardBlocksNextAction = true; }],
  ["motionProfiles", (contract) => { swapFirstTwo(contract.motionProfiles["panel-and-micro"]); }],
  ["viewports", (contract) => { contract.viewports[3].conditional = false; }],
  ["requiredStates", (contract) => { swapFirstTwo(contract.requiredStates); }],
  ["routeRecoveryStates", (contract) => { swapFirstTwo(contract.routeRecoveryStates); }],
  ["aiJobStates", (contract) => { swapFirstTwo(contract.aiJobStates); }],
  ["pageTemplates", (contract) => { swapFirstTwo(contract.pageTemplates); }],
  ["allowedDeviationReasons", (contract) => { swapFirstTwo(contract.allowedDeviationReasons); }],
  ["mascot", (contract) => { swapFirstTwo(contract.mascot.allowedRoles); }],
];

test("covers every top-level contract section with a shape-preserving mutation", () => {
  assert.deepEqual(
    topLevelMutations.map(([section]) => section),
    Object.keys(validDesignSystem),
  );
});

for (const [section, mutate] of topLevelMutations) {
  test(`hash-locks shape-preserving ${section} mutations`, () => {
    const invalid = structuredClone(validDesignSystem);
    mutate(invalid);

    const failures = validateDesignSystemContract(invalid);

    assert.ok(
      failures.includes(completeHashFailure),
      `${section} mutation should fail the complete contract hash: ${failures.join(", ")}`,
    );
  });
}
