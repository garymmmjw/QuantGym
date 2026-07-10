import { createHash } from "node:crypto";

import { APPROVED_ACCEPTANCE_POLICY } from "./frontend-upgrade-approved-acceptance.mjs";
import {
  APPROVED_MUTATION_INVENTORY,
  RECOVERY_ACCEPTANCE_STATES,
  mutationRecoveryAcceptanceId,
  mutationRetryIdempotencyAcceptanceId,
} from "./frontend-upgrade-approved-mutations.mjs";
import {
  APPROVED_TABLET_ROUTE_IDS,
  CANONICAL_SURFACE_INVENTORY,
  CORE_ENTITY_NAMES,
  REQUIRED_SYSTEM_SURFACE_IDS,
  SUPPORTING_SOURCES,
} from "./frontend-upgrade-approved-surfaces.mjs";

const canonicalizeJson = (value) => {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeJson(value[key])]),
  );
};

function canonicalJsonSha256(value) {
  const canonicalJson = JSON.stringify(canonicalizeJson(value));
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

export function validateDesignSystemContract(contract = {}) {
  const failures = [];
  const exact = (actual, expected, label) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push(`${label} mismatch`);
  };
  if (contract.version !== 1) failures.push("design contract version must be 1");
  if (contract.themes?.light?.actionPrimary !== "#5b5ff5") failures.push("light actionPrimary mismatch");
  if (contract.themes?.dark?.actionPrimary !== "#7d7bff") failures.push("dark actionPrimary mismatch");
  if (contract.typography?.ui !== "Plus Jakarta Sans") failures.push("UI type family mismatch");
  if (contract.typography?.metrics !== "Space Grotesk") failures.push("metric type family mismatch");
  exact(contract.shape?.radiusPx, [11, 14, 16, 20, 28], "radius scale");
  exact(contract.motion?.microMs, [120, 180], "micro motion range");
  exact(contract.motion?.panelMs, [240, 300], "panel motion range");
  exact((contract.viewports || []).map(({ id, width, height }) => ({ id, width, height })), [
    { id: "desktop", width: 1440, height: 900 },
    { id: "laptop", width: 1280, height: 720 },
    { id: "mobile", width: 390, height: 844 },
    { id: "tablet", width: 1024, height: 768 },
  ], "viewports");
  exact(contract.requiredStates, [
    "loading", "ready", "empty", "error", "disabled", "focus", "active", "reward", "reduced-motion",
  ], "required states");
  exact(contract.routeRecoveryStates, [
    "loading", "empty", "recoverable-error", "non-recoverable-error", "offline-draft",
    "permission-denied", "stale-version-conflict", "retry",
  ], "route recovery states");
  exact(contract.aiJobStates, [
    "queued", "running", "streaming", "completed", "failed", "cancelled", "retry",
  ], "AI job states");
  exact(contract.allowedDeviationReasons, [
    "real-data-density", "accessibility", "performance", "small-screen-usability",
  ], "deviation reasons");
  for (const token of contract.semanticTokens || []) {
    if (/^(?:purple|blue|gray|red|green)-\d+$/i.test(token)) failures.push(`semantic token cannot be raw palette: ${token}`);
  }
  if (contract.motion?.reducedMotionRequired !== true) failures.push("reduced motion is required");
  if (contract.motion?.scrollJackingAllowed !== false) failures.push("scroll jacking must be disabled");
  if (canonicalJsonSha256(contract) !== "aae0b65079c600f6448511af04049d645d3acbd392567e8f00368c3010a1bee7") {
    failures.push("complete approved design-system contract hash mismatch");
  }
  return failures;
}

export const APPROVED_PHASE_REGISTRY = {
  version: 1,
  spec: "docs/superpowers/specs/2026-07-10-quantgym-frontend-platform-upgrade-design.md",
  phases: [
    { id: 0, name: "baseline-and-design-freeze", routes: [] },
    { id: 1, name: "kernel-shell-auth", routes: [] },
    { id: 2, name: "daily-training-loop", routes: ["overview", "plan", "problems"] },
    { id: 3, name: "interview-and-tools", routes: ["interview", "tools"] },
    { id: 4, name: "skills-economy-competition", routes: ["skills", "league", "pk", "poker"] },
    {
      id: 5,
      name: "remaining-product-domains",
      routes: [
        "experiences", "news", "community", "messages", "network", "resume", "jobs",
        "companies", "library", "courses", "memory", "settings", "account",
      ],
    },
    { id: 6, name: "hardening-and-cutover", routes: [] },
  ],
};

const APPROVED_DEVIATION_REASONS = new Set([
  "real-data-density",
  "accessibility",
  "performance",
  "small-screen-usability",
]);

const jsonEqual = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
const canonicalJsonEqual = (actual, expected) => (
  jsonEqual(canonicalizeJson(actual), canonicalizeJson(expected))
);
const sortedUnique = (values) => [...new Set(values)].sort();
const sortedJsonEqual = (actual, expected) => jsonEqual(sortedUnique(actual), sortedUnique(expected));
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const reportUnapprovedKeys = (actual, expected, surfaceId, prefix, failures) => {
  if (actual === null || expected === null || Array.isArray(actual) || Array.isArray(expected)) return;
  if (typeof actual !== "object" || typeof expected !== "object") return;
  for (const key of Object.keys(actual)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (!Object.hasOwn(expected, key)) {
      failures.push(`${surfaceId} ${field} is not approved`);
      continue;
    }
    reportUnapprovedKeys(actual[key], expected[key], surfaceId, field, failures);
  }
};

export function validatePhaseRegistry(registry = {}, manifestIds = []) {
  const failures = [];
  const normalizedManifestIds = manifestIds.map((item) => (
    typeof item === "string" ? item : item?.id
  )).filter(Boolean);
  if (registry.version !== APPROVED_PHASE_REGISTRY.version) {
    failures.push("phase registry version mismatch");
  }
  if (registry.spec !== APPROVED_PHASE_REGISTRY.spec) {
    failures.push("phase registry spec mismatch");
  }
  if (!Array.isArray(registry.phases)) {
    failures.push("phase registry phases must be an array");
    return failures;
  }

  const expectedPhaseById = new Map(APPROVED_PHASE_REGISTRY.phases.map((phase) => [phase.id, phase]));
  const actualPhaseIds = registry.phases.map((phase) => phase?.id);
  if (!jsonEqual(actualPhaseIds, APPROVED_PHASE_REGISTRY.phases.map((phase) => phase.id))) {
    failures.push("phase registry phase IDs mismatch");
  }
  for (const phase of registry.phases) {
    const expected = expectedPhaseById.get(phase?.id);
    if (!expected) {
      failures.push(`phase registry contains unapproved phase ${String(phase?.id)}`);
      continue;
    }
    if (phase.name !== expected.name) failures.push(`phase registry phase ${phase.id} name mismatch`);
    if (!jsonEqual(phase.routes, expected.routes)) failures.push(`phase registry phase ${phase.id} routes mismatch`);
  }

  const phaseRouteIds = registry.phases.flatMap((phase) => (
    Array.isArray(phase?.routes) ? phase.routes : []
  ));
  const expectedRouteIds = normalizedManifestIds.length
    ? normalizedManifestIds
    : APPROVED_PHASE_REGISTRY.phases.flatMap((phase) => phase.routes);
  if (!sortedJsonEqual(phaseRouteIds, expectedRouteIds)) {
    failures.push("phase registry route IDs mismatch");
  }
  for (const routeId of expectedRouteIds) {
    const occurrences = phaseRouteIds.filter((item) => item === routeId).length;
    if (occurrences !== 1) failures.push(`route ${routeId} must appear in exactly one phase`);
  }
  return failures;
}

const compareCanonicalSurface = (actual, expected, failures) => {
  const id = expected.id;
  reportUnapprovedKeys(actual, expected, id, "", failures);
  if (!canonicalJsonEqual(actual, expected)) failures.push(`${id} canonical surface mismatch`);
  const scalarFields = [
    "kind", "routeId", "phase", "template", "stateSetRef", "recoveryStateSetRef", "aiJobStateSetRef",
  ];
  const arrayFields = [
    "designFiles", "components", "entityRefs", "readModels", "interactions", "mutations", "acceptanceChecks", "deviations",
  ];
  for (const field of scalarFields) {
    if (!jsonEqual(actual?.[field], expected[field])) failures.push(`${id} ${field} mismatch`);
  }
  for (const field of arrayFields) {
    if (!jsonEqual(actual?.[field], expected[field])) failures.push(`${id} ${field} mismatch`);
  }
  if (!jsonEqual(actual?.responsive?.requiredViewports, expected.responsive.requiredViewports)) {
    failures.push(`${id} responsive.requiredViewports mismatch`);
  }
  if (actual?.responsive?.tabletDistinct !== expected.responsive.tabletDistinct) {
    failures.push(`${id} responsive.tabletDistinct mismatch`);
  }
  if (actual?.motion?.profile !== expected.motion.profile) failures.push(`${id} motion.profile mismatch`);
  if (actual?.motion?.reducedMotion !== expected.motion.reducedMotion) failures.push(`${id} motion.reducedMotion mismatch`);
  if (actual?.motion?.blocksPrimaryAction !== expected.motion.blocksPrimaryAction) {
    failures.push(`${id} motion.blocksPrimaryAction mismatch`);
  }
  if (!jsonEqual(actual?.recoveryAcceptance, expected.recoveryAcceptance)) {
    failures.push(`${id} recoveryAcceptance mismatch`);
  }
};

export function validateSurfaceContracts(contract = {}, registry = {}, designManifest = {}, manifestIds = []) {
  const failures = [];
  const surfaces = Array.isArray(contract?.surfaces) ? contract.surfaces : [];
  const normalizedManifestIds = manifestIds.map((item) => (
    typeof item === "string" ? item : item?.id
  )).filter(Boolean);
  const expectedManifestIds = normalizedManifestIds.length
    ? normalizedManifestIds
    : CANONICAL_SURFACE_INVENTORY.filter((surface) => surface.kind === "route").map((surface) => surface.routeId);

  if (contract.version !== 1) failures.push("surface contract version must be 1");
  if (contract.spec !== APPROVED_PHASE_REGISTRY.spec) failures.push("surface contract spec mismatch");
  if (contract.designSystem !== "docs/frontend-upgrade/design-system-contract.json") {
    failures.push("surface contract designSystem mismatch");
  }
  if (!Array.isArray(contract?.surfaces)) failures.push("surface contract surfaces must be an array");

  const surfaceIds = surfaces.map((surface) => surface?.id).filter(isNonEmptyString);
  const routeIds = surfaces.filter((surface) => surface?.kind === "route").map((surface) => surface?.routeId).filter(isNonEmptyString);
  for (const id of new Set(surfaceIds)) {
    if (surfaceIds.filter((item) => item === id).length > 1) failures.push(`duplicate surface id ${id}`);
  }
  for (const routeId of new Set(routeIds)) {
    if (routeIds.filter((item) => item === routeId).length > 1) failures.push(`duplicate route id ${routeId}`);
  }
  if (!sortedJsonEqual(routeIds, expectedManifestIds)) failures.push("route IDs mismatch with MODULE_MANIFEST");

  for (const requiredId of REQUIRED_SYSTEM_SURFACE_IDS) {
    if (!surfaceIds.includes(requiredId)) failures.push(`missing required system surface ${requiredId}`);
  }

  const canonicalById = new Map(CANONICAL_SURFACE_INVENTORY.map((surface) => [surface.id, surface]));
  const actualById = new Map(surfaces.map((surface) => [surface?.id, surface]));
  for (const expected of CANONICAL_SURFACE_INVENTORY) {
    const actual = actualById.get(expected.id);
    if (!actual) {
      failures.push(`missing canonical surface ${expected.id}`);
      continue;
    }
    compareCanonicalSurface(actual, expected, failures);
  }
  for (const surface of surfaces) {
    if (isNonEmptyString(surface?.id) && !canonicalById.has(surface.id)) {
      failures.push(`unapproved surface ${surface.id}`);
    }
  }

  const manifestSourceFiles = (Array.isArray(designManifest?.textFiles) ? designManifest.textFiles : [])
    .map((item) => item?.path)
    .filter(isNonEmptyString);
  const manifestSourceSet = new Set(manifestSourceFiles);
  const referencedDesignFiles = surfaces.flatMap((surface) => (
    Array.isArray(surface?.designFiles) ? surface.designFiles : []
  ));
  for (const file of referencedDesignFiles) {
    if (!manifestSourceSet.has(file)) failures.push(`missing design source ${file}`);
  }

  const supportingSources = Array.isArray(contract?.supportingSources) ? contract.supportingSources : [];
  if (!jsonEqual(supportingSources, SUPPORTING_SOURCES)) failures.push("supportingSources mismatch");
  const supportingFiles = supportingSources.map((item) => item?.file).filter(isNonEmptyString);
  for (const file of new Set(supportingFiles)) {
    if (supportingFiles.filter((item) => item === file).length > 1) failures.push(`duplicate supporting source ${file}`);
  }
  for (const file of supportingFiles) {
    if (referencedDesignFiles.includes(file)) failures.push(`${file} is used as both supporting and surface design source`);
  }
  if (!sortedJsonEqual([...referencedDesignFiles, ...supportingFiles], manifestSourceFiles)) {
    failures.push("extracted source coverage mismatch");
  }

  const phaseFailures = validatePhaseRegistry(registry, expectedManifestIds);
  failures.push(...phaseFailures);
  const phases = Array.isArray(registry?.phases) ? registry.phases : [];
  for (const surface of surfaces) {
    if (!isNonEmptyString(surface?.id)) {
      failures.push("surface id must be a non-empty string");
      continue;
    }
    const id = surface.id;
    for (const field of ["template", "stateSetRef", "recoveryStateSetRef"]) {
      if (!isNonEmptyString(surface[field])) failures.push(`${id} ${field} must be a non-empty string`);
    }
    for (const field of ["designFiles", "components", "entityRefs", "readModels", "interactions", "acceptanceChecks"]) {
      if (!Array.isArray(surface[field]) || surface[field].length === 0) {
        failures.push(`${id} ${field} must be a non-empty array`);
      }
    }
    if (!Array.isArray(surface.mutations)) failures.push(`${id} mutations must be an array`);
    if (!Array.isArray(surface.deviations)) failures.push(`${id} deviations must be an array`);
    if (!surface.responsive || typeof surface.responsive !== "object") failures.push(`${id} responsive mapping is required`);
    if (!surface.motion || typeof surface.motion !== "object") failures.push(`${id} motion mapping is required`);
    if (surface.motion?.reducedMotion !== true) failures.push(`${id} motion.reducedMotion must be true`);
    if (surface.motion?.blocksPrimaryAction !== false) failures.push(`${id} motion.blocksPrimaryAction must be false`);
    if (surface.stateSetRef !== "design-system.requiredStates") failures.push(`${id} stateSetRef must use design-system.requiredStates`);
    if (surface.recoveryStateSetRef !== "design-system.routeRecoveryStates") {
      failures.push(`${id} recoveryStateSetRef must use design-system.routeRecoveryStates`);
    }

    if (surface.kind === "route") {
      if (!Number.isInteger(surface.phase) || surface.phase < 2 || surface.phase > 5) {
        failures.push(`${id} phase must be one of 2, 3, 4, or 5`);
      }
      const matchingPhases = phases.filter((phase) => Array.isArray(phase?.routes) && phase.routes.includes(surface.routeId));
      if (matchingPhases.length !== 1) failures.push(`${id} must map to exactly one phase registry entry`);
      if (matchingPhases.length === 1 && matchingPhases[0].id !== surface.phase) {
        failures.push(`${id} phase does not match phase registry`);
      }
    } else if (surface.kind === "system" && surface.phase !== 1) {
      failures.push(`${id} phase must be 1 for system surfaces`);
    }

    const acceptanceChecks = Array.isArray(surface.acceptanceChecks) ? surface.acceptanceChecks : [];
    const acceptanceCategories = [
      ["visual", (value) => value.startsWith("visual:")],
      ["a11y", (value) => value.startsWith("a11y:")],
      ["journey", (value) => /^(?:e2e|contract):/.test(value)],
    ];
    for (const [category, predicate] of acceptanceCategories) {
      if (acceptanceChecks.filter((value) => isNonEmptyString(value) && predicate(value)).length !== 1) {
        failures.push(`${id} acceptanceChecks ${category} category must appear exactly once`);
      }
    }

    for (const entityRef of Array.isArray(surface.entityRefs) ? surface.entityRefs : []) {
      if (!CORE_ENTITY_NAMES.includes(entityRef)) failures.push(`${id} entityRefs contains non-core entity ${entityRef}`);
    }
    if (["route:interview", "route:resume"].includes(id)) {
      if (surface.aiJobStateSetRef !== "design-system.aiJobStates") {
        failures.push(`${id} aiJobStateSetRef must use design-system.aiJobStates`);
      }
    } else if (surface.aiJobStateSetRef !== undefined) {
      failures.push(`${id} aiJobStateSetRef is not approved for this surface`);
    }

    if (surface.responsive?.tabletDistinct === true) {
      if (surface.kind !== "route" || !APPROVED_TABLET_ROUTE_IDS.includes(surface.routeId)) {
        failures.push(`${id} responsive.tabletDistinct is not approved`);
      }
      if (!surface.responsive?.requiredViewports?.includes("tablet")) {
        failures.push(`${id} responsive.requiredViewports must include tablet`);
      }
    } else if (surface.responsive?.requiredViewports?.includes("tablet")) {
      failures.push(`${id} responsive.requiredViewports cannot include tablet without tabletDistinct`);
    }

    for (const [index, deviation] of (Array.isArray(surface.deviations) ? surface.deviations : []).entries()) {
      if (!APPROVED_DEVIATION_REASONS.has(deviation?.reason)) failures.push(`${id} deviations[${index}].reason is not approved`);
      if (!isNonEmptyString(deviation?.designFile)) failures.push(`${id} deviations[${index}].designFile is required`);
      if (isNonEmptyString(deviation?.designFile) && !surface.designFiles?.includes(deviation.designFile)) {
        failures.push(`${id} deviations[${index}].designFile must reference a surface design file`);
      }
      if (!isNonEmptyString(deviation?.decision)) failures.push(`${id} deviations[${index}].decision is required`);
      if (!isNonEmptyString(deviation?.acceptanceCheck)) failures.push(`${id} deviations[${index}].acceptanceCheck is required`);
    }
  }

  const actualTabletRoutes = surfaces
    .filter((surface) => surface?.kind === "route" && surface?.responsive?.tabletDistinct === true)
    .map((surface) => surface.routeId);
  if (!sortedJsonEqual(actualTabletRoutes, APPROVED_TABLET_ROUTE_IDS)) {
    failures.push("tabletDistinct route IDs mismatch");
  }

  return [...new Set(failures)];
}

const phase0EvidenceFor = (policyEntry) => {
  if (policyEntry.expectedStatus !== "legacy-baseline") return null;
  if (policyEntry.kind === "visual" || policyEntry.kind === "axe") {
    const routeMatrix = policyEntry.surfaceId === "system:auth" || policyEntry.surfaceId.startsWith("route:");
    const path = routeMatrix
      ? APPROVED_ACCEPTANCE_POLICY.evidenceCases.routeMatrix.source
      : APPROVED_ACCEPTANCE_POLICY.evidenceCases.sharedStates[0].source;
    return {
      path,
      locator: `cases[acceptanceIds includes ${JSON.stringify(policyEntry.id)}]`,
    };
  }
  if (policyEntry.kind === "journey") {
    const coreFlow = APPROVED_ACCEPTANCE_POLICY.evidenceCases.coreFlows
      .find((item) => item.acceptanceId === policyEntry.id);
    return coreFlow ? {
      path: coreFlow.source,
      interactionName: coreFlow.interactionName,
      resultLocator: coreFlow.resultLocator,
    } : null;
  }
  return null;
};

const targetCommandFor = (policyEntry) => {
  if (policyEntry.expectedStatus === "future-gate") {
    return `npm run test:e2e:v2 -- --grep @${policyEntry.id}`;
  }
  if (policyEntry.kind === "visual" || policyEntry.kind === "axe") {
    return "node scripts/capture-frontend-upgrade-baseline.mjs";
  }
  return `node scripts/check-browser-route-smoke.mjs --summary ${APPROVED_ACCEPTANCE_POLICY.evidenceCases.coreFlows[0].source}`;
};

export function buildAcceptanceCatalog(contract = {}) {
  const declaredIds = new Set((Array.isArray(contract?.surfaces) ? contract.surfaces : [])
    .flatMap((surface) => Array.isArray(surface?.acceptanceChecks) ? surface.acceptanceChecks : []));
  const policySurfaceIds = new Set(APPROVED_ACCEPTANCE_POLICY.catalogEntries
    .filter((item) => ["visual", "axe", "journey"].includes(item.kind))
    .map((item) => item.id));
  if (declaredIds.size > 0 && !sortedJsonEqual([...declaredIds], [...policySurfaceIds])) {
    throw new Error("Cannot build acceptance catalog from non-canonical surface acceptance IDs");
  }
  return {
    version: 1,
    policy: "scripts/lib/frontend-upgrade-approved-acceptance.mjs",
    entries: APPROVED_ACCEPTANCE_POLICY.catalogEntries.map((policyEntry) => ({
      id: policyEntry.id,
      surfaceId: policyEntry.surfaceId,
      kind: policyEntry.kind,
      phase0Evidence: phase0EvidenceFor(policyEntry),
      targetPhase: policyEntry.targetPhase,
      targetCommand: targetCommandFor(policyEntry),
      expectedStatus: policyEntry.expectedStatus,
    })),
  };
}

export function validateApprovedAcceptancePolicy(policy = APPROVED_ACCEPTANCE_POLICY) {
  const failures = [];
  const entries = Array.isArray(policy?.catalogEntries) ? policy.catalogEntries : [];
  if (entries.length !== 540) failures.push(`approved acceptance policy must contain 540 catalog entries; got ${entries.length}`);
  if (new Set(entries.map((item) => item?.id)).size !== entries.length) failures.push("approved acceptance policy has duplicate catalog IDs");
  if (entries.filter((item) => item.expectedStatus === "legacy-baseline").length !== 80) {
    failures.push("approved acceptance policy must contain 80 legacy-baseline catalog entries");
  }
  if (entries.filter((item) => item.expectedStatus === "future-gate").length !== 460) {
    failures.push("approved acceptance policy must contain 460 future-gate catalog entries");
  }

  const routeMatrix = policy?.evidenceCases?.routeMatrix || {};
  const computedRouteCases = (routeMatrix.surfaceIds?.length || 0)
    * (routeMatrix.themes?.length || 0)
    * (routeMatrix.baseViewports?.length || 0)
    + (routeMatrix.tabletDistinctRouteIds?.length || 0) * (routeMatrix.themes?.length || 0);
  if (routeMatrix.caseCount !== 150 || computedRouteCases !== 150) {
    failures.push("approved route evidence policy must resolve to 150 cases");
  }
  if (routeMatrix.expectedStatus !== "legacy-baseline" || routeMatrix.targetPhase !== 0) {
    failures.push("approved route evidence policy status mismatch");
  }

  const sharedStates = Array.isArray(policy?.evidenceCases?.sharedStates)
    ? policy.evidenceCases.sharedStates
    : [];
  if (sharedStates.length !== 32 || new Set(sharedStates.map((item) => item?.id)).size !== 32) {
    failures.push("approved shared-state evidence policy must contain 32 unique cases");
  }
  if (sharedStates.filter((item) => item.expectedStatus === "legacy-baseline" && item.targetPhase === 0).length !== 26) {
    failures.push("approved shared-state evidence policy must contain 26 Phase 0 legacy cases");
  }
  if (sharedStates.filter((item) => item.expectedStatus === "future-gate" && item.targetPhase === 1).length !== 6) {
    failures.push("approved shared-state evidence policy must contain six Phase 1 future gates");
  }

  const coreFlows = Array.isArray(policy?.evidenceCases?.coreFlows) ? policy.evidenceCases.coreFlows : [];
  if (coreFlows.length !== 22 || new Set(coreFlows.map((item) => item?.routeId)).size !== 22) {
    failures.push("approved core-flow evidence policy must contain 22 unique routes");
  }
  for (const coreFlow of coreFlows) {
    if (!isNonEmptyString(coreFlow?.interactionName) || !isNonEmptyString(coreFlow?.resultLocator)) {
      failures.push(`${coreFlow?.id || "core-flow"} must include an exact interaction and result locator`);
    }
    if (coreFlow?.expectedStatus !== "legacy-baseline" || coreFlow?.targetPhase !== 0) {
      failures.push(`${coreFlow?.id || "core-flow"} status policy mismatch`);
    }
  }
  return failures;
}

export function validateAcceptanceCatalog(catalog = {}, contract = {}) {
  const failures = [...validateApprovedAcceptancePolicy()];
  const entries = Array.isArray(catalog?.entries) ? catalog.entries : [];
  if (catalog.version !== 1) failures.push("acceptance catalog version must be 1");
  if (catalog.policy !== "scripts/lib/frontend-upgrade-approved-acceptance.mjs") {
    failures.push("acceptance catalog policy source mismatch");
  }
  if (!Array.isArray(catalog?.entries)) failures.push("acceptance catalog entries must be an array");

  const actualIds = entries.map((entry) => entry?.id).filter(isNonEmptyString);
  for (const id of new Set(actualIds)) {
    if (actualIds.filter((item) => item === id).length > 1) failures.push(`duplicate acceptance catalog id ${id}`);
  }
  const expected = buildAcceptanceCatalog(contract);
  const expectedById = new Map(expected.entries.map((entry) => [entry.id, entry]));
  const actualById = new Map(entries.map((entry) => [entry?.id, entry]));
  for (const expectedEntry of expected.entries) {
    const actualEntry = actualById.get(expectedEntry.id);
    if (!actualEntry) {
      failures.push(`missing acceptance catalog entry ${expectedEntry.id}`);
      continue;
    }
    for (const field of [
      "surfaceId", "kind", "phase0Evidence", "targetPhase", "targetCommand", "expectedStatus",
    ]) {
      if (!jsonEqual(actualEntry[field], expectedEntry[field])) {
        failures.push(`${expectedEntry.id} ${field} mismatch`);
      }
    }
  }
  for (const entry of entries) {
    if (isNonEmptyString(entry?.id) && !expectedById.has(entry.id)) {
      failures.push(`orphan acceptance catalog entry ${entry.id}`);
    }
  }
  return [...new Set(failures)];
}
