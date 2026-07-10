export const RECOVERY_ACCEPTANCE_STATES = [
  "recoverable-error",
  "non-recoverable-error",
  "offline-draft",
  "permission-denied",
  "stale-version-conflict",
  "retry",
];

const MUTATION_GROUPS = [
  ["system:auth", 1, ["auth.sign-in", "auth.register", "auth.reset-password", "auth.google-sign-in"]],
  ["system:notifications-toast", 1, ["notifications.mark-read"]],
  ["system:todo", 1, ["todo.create", "todo.update", "todo.complete", "todo.delete"]],
  ["system:theme-language", 1, ["preferences.update-theme", "preferences.update-language"]],
  ["system:network-recovery", 1, ["session.retry"]],
  ["route:overview", 2, ["training.start-or-resume"]],
  ["route:plan", 2, ["plan.run-diagnostic", "plan.create", "plan.update-task", "plan.complete-task"]],
  ["route:problems", 2, [
    "problems.use-hint", "problems.submit-attempt", "problems.reveal-solution",
    "problems.save-note", "problems.toggle-favorite", "problems.complete",
  ]],
  ["route:interview", 3, [
    "interview.create-session", "interview.upload-attachment", "interview.autosave",
    "interview.submit-turn", "interview.finish", "interview.add-recommendations-to-plan",
  ]],
  ["route:tools", 3, ["tools.submit-answer", "tools.submit-quote", "tools.finish-session"]],
  ["route:league", 4, ["league.purchase-reward"]],
  ["route:pk", 4, ["pk.create-match", "pk.submit-attempt", "pk.finish-match"]],
  ["route:poker", 4, ["poker.join", "poker.act", "poker.finish-hand", "poker.leave"]],
  ["route:experiences", 5, ["experiences.create", "experiences.update", "experiences.share", "experiences.delete"]],
  ["route:news", 5, ["news.refresh", "news.save"]],
  ["route:community", 5, ["community.create-post", "community.like", "community.comment", "community.message-author"]],
  ["route:messages", 5, ["messages.send", "messages.mark-read"]],
  ["route:network", 5, ["network.create", "network.update", "network.schedule-follow-up", "network.delete"]],
  ["route:resume", 5, ["resume.save", "resume.upload", "resume.request-review", "resume.retry-review"]],
  ["route:jobs", 5, ["jobs.save", "jobs.move-application"]],
  ["route:courses", 5, ["courses.complete-lesson"]],
  ["route:memory", 5, ["memory.create", "memory.attach", "memory.update", "memory.delete"]],
  ["route:settings", 5, ["settings.save", "settings.export", "settings.import", "settings.reset"]],
  ["route:account", 5, ["account.save-profile", "account.upload-avatar", "account.revoke-session"]],
];

const REWARD_PRODUCING_MUTATIONS = new Set([
  "problems.complete",
  "interview.finish",
  "tools.finish-session",
  "pk.finish-match",
  "poker.finish-hand",
]);

const LEDGER_MUTATIONS = new Set([
  ...REWARD_PRODUCING_MUTATIONS,
  "league.purchase-reward",
]);

export const APPROVED_MUTATION_INVENTORY = MUTATION_GROUPS.flatMap(
  ([surfaceId, targetPhase, mutationIds]) => mutationIds.map((id) => ({
    id,
    surfaceId,
    targetPhase,
    rewardProducing: REWARD_PRODUCING_MUTATIONS.has(id),
    ledgerMutation: LEDGER_MUTATIONS.has(id),
  })),
);

export function mutationRecoveryAcceptanceId(mutationId, state) {
  return `mutation:${mutationId}:${state}`;
}

export function mutationRetryIdempotencyAcceptanceId(mutationId) {
  return `mutation:${mutationId}:retry-idempotency`;
}

export function buildRecoveryAcceptance(mutationIds = []) {
  const mutationById = new Map(APPROVED_MUTATION_INVENTORY.map((item) => [item.id, item]));
  return {
    source: "approved-mutation-inventory",
    stateSetRef: "design-system.routeRecoveryStates",
    mutations: Object.fromEntries(mutationIds.map((mutationId) => {
      const mutation = mutationById.get(mutationId);
      if (!mutation) throw new Error(`Unknown approved mutation ${mutationId}`);
      return [mutationId, {
        states: Object.fromEntries(
          RECOVERY_ACCEPTANCE_STATES.map((state) => [
            state,
            mutationRecoveryAcceptanceId(mutationId, state),
          ]),
        ),
        ...((mutation.rewardProducing || mutation.ledgerMutation)
          ? { retryIdempotency: mutationRetryIdempotencyAcceptanceId(mutationId) }
          : {}),
      }];
    })),
  };
}
