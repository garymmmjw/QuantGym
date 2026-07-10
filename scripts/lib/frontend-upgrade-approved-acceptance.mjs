import {
  APPROVED_MUTATION_INVENTORY,
  RECOVERY_ACCEPTANCE_STATES,
  mutationRecoveryAcceptanceId,
  mutationRetryIdempotencyAcceptanceId,
} from "./frontend-upgrade-approved-mutations.mjs";
import {
  APPROVED_TABLET_ROUTE_IDS,
  CANONICAL_SURFACE_INVENTORY,
} from "./frontend-upgrade-approved-surfaces.mjs";

export const ROUTE_MATRIX_EVIDENCE_PATH =
  "docs/browser-audit-screenshots/370-frontend-upgrade-visual-a11y-baseline-summary.json";
export const SHARED_STATE_EVIDENCE_PATH =
  "docs/browser-audit-screenshots/370-frontend-upgrade-shared-state-baseline-summary.json";
export const CORE_FLOW_EVIDENCE_PATH =
  "docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json";

const ROUTE_MATRIX_ROUTE_IDS = [
  "overview", "plan", "skills", "league", "interview", "problems", "tools", "poker",
  "experiences", "news", "community", "messages", "network", "resume", "jobs", "companies",
  "library", "courses", "memory", "settings", "account", "pk",
];

const catalogEntries = [
  ...CANONICAL_SURFACE_INVENTORY.flatMap((surface) => surface.acceptanceChecks.map((id, index) => {
    const isNetworkRecovery = surface.id === "system:network-recovery";
    const isSystemJourney = surface.kind === "system" && index === 2;
    const expectedStatus = (isNetworkRecovery || isSystemJourney) ? "future-gate" : "legacy-baseline";
    return {
      id,
      surfaceId: surface.id,
      kind: index === 0 ? "visual" : (index === 1 ? "axe" : "journey"),
      expectedStatus,
      targetPhase: expectedStatus === "legacy-baseline" ? 0 : surface.phase,
    };
  })),
  ...APPROVED_MUTATION_INVENTORY.flatMap((mutation) => [
    ...RECOVERY_ACCEPTANCE_STATES.map((state) => ({
      id: mutationRecoveryAcceptanceId(mutation.id, state),
      surfaceId: mutation.surfaceId,
      kind: "mutation-recovery",
      expectedStatus: "future-gate",
      targetPhase: mutation.targetPhase,
    })),
    ...((mutation.rewardProducing || mutation.ledgerMutation) ? [{
      id: mutationRetryIdempotencyAcceptanceId(mutation.id),
      surfaceId: mutation.surfaceId,
      kind: "retry-idempotency",
      expectedStatus: "future-gate",
      targetPhase: mutation.targetPhase,
    }] : []),
  ]),
];

const SHARED_STATES = [
  ["system:auth", ["registration-error", "password-reset", "keyboard-focus", "reduced-motion"]],
  ["system:desktop-shell", ["collapsed-light", "expanded-dark", "keyboard-focus", "reduced-motion"]],
  ["system:mobile-shell", ["drawer-open-light", "drawer-open-dark", "keyboard-focus", "reduced-motion"]],
  ["system:global-search", ["results-open", "keyboard-focus", "empty", "reduced-motion"]],
  ["system:notifications-toast", ["center-open", "live-toast", "empty", "reduced-motion"]],
  ["system:todo", ["dock-open", "editor-focus", "empty-mobile", "reduced-motion-mobile"]],
  ["system:theme-language", ["theme-focus", "language-focus", "mobile-controls", "reduced-motion-mobile"]],
  ["system:network-recovery", ["offline-draft", "recoverable-error", "stale-conflict", "permission-denied-retry"]],
];

const FUTURE_SHARED_STATE_IDS = new Set([
  "shared-state:notifications-toast:center-open",
  "shared-state:notifications-toast:empty",
  "shared-state:network-recovery:offline-draft",
  "shared-state:network-recovery:recoverable-error",
  "shared-state:network-recovery:stale-conflict",
  "shared-state:network-recovery:permission-denied-retry",
]);

const surfaceById = new Map(CANONICAL_SURFACE_INVENTORY.map((surface) => [surface.id, surface]));

const sharedStates = SHARED_STATES.flatMap(([surfaceId, states]) => {
  const surface = surfaceById.get(surfaceId);
  return states.map((state) => {
    const id = `shared-state:${surfaceId.split(":")[1]}:${state}`;
    const future = FUTURE_SHARED_STATE_IDS.has(id);
    return {
      id,
      surfaceId,
      state,
      acceptanceIds: future ? [surface.acceptanceChecks[2]] : surface.acceptanceChecks.slice(0, 2),
      source: SHARED_STATE_EVIDENCE_PATH,
      expectedStatus: future ? "future-gate" : "legacy-baseline",
      targetPhase: future ? 1 : 0,
      ...(future ? { targetCommand: `npm run test:e2e:v2 -- --grep @${id}` } : {}),
    };
  });
});

const CORE_FLOW_INTERACTIONS = [
  ["overview", "overview CTA opens problems"],
  ["plan", "plan create, edit, task persistence, and navigation"],
  ["problems", "problems search, detail, reveal, and save"],
  ["interview", "interview onboarding, practice answer, favorite, exit, and resume"],
  ["tools", "tools mental math completes session and persists records"],
  ["skills", "skills radar hover and global search spotlight"],
  ["league", "league standings, learning map, and reward shop guard"],
  ["pk", "pk match, submit, reveal, and record persistence"],
  ["poker", "poker demo table starts, acts, and persists room state"],
  ["experiences", "experiences create, edit, share, delete, and reload persistence"],
  ["news", "news manual submit, filter, detail, and reload persistence"],
  ["community", "community post, like, comment, and reload persistence"],
  ["messages", "messages thread read, send, and reload persistence"],
  ["network", "network contact add, edit, delete, and reload persistence"],
  ["resume", "resume LLM review request, render, and reload persistence"],
  ["jobs", "jobs filter and apply link behavior"],
  ["companies", "companies tier filter, practice navigation, and careers link behavior"],
  ["library", "library search, kind filter, practice navigation, and reader guard"],
  ["courses", "courses path, source switch, note, and reload persistence"],
  ["memory", "memory resource add, source link, and reload persistence"],
  ["settings", "settings backup export, import, and reset state"],
  ["account", "account profile save and reload persistence"],
];

const coreFlows = CORE_FLOW_INTERACTIONS.map(([routeId, interactionName]) => {
  const surface = surfaceById.get(`route:${routeId}`);
  return {
    id: `core-flow:${routeId}`,
    routeId,
    surfaceId: surface.id,
    acceptanceId: surface.acceptanceChecks[2],
    source: CORE_FLOW_EVIDENCE_PATH,
    interactionName,
    resultLocator: `interactions.results[name=${JSON.stringify(interactionName)}]`,
    expectedStatus: "legacy-baseline",
    targetPhase: 0,
  };
});

export const APPROVED_ACCEPTANCE_POLICY = {
  catalogEntries,
  evidenceCases: {
    routeMatrix: {
      id: "route-visual-a11y-matrix",
      source: ROUTE_MATRIX_EVIDENCE_PATH,
      expectedStatus: "legacy-baseline",
      targetPhase: 0,
      surfaceIds: ["system:auth", ...ROUTE_MATRIX_ROUTE_IDS.map((id) => `route:${id}`)],
      themes: ["light", "dark"],
      baseViewports: ["desktop", "laptop", "mobile"],
      tabletDistinctRouteIds: APPROVED_TABLET_ROUTE_IDS,
      caseCount: 150,
    },
    sharedStates,
    coreFlows,
  },
};
