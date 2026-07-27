import type { PlanMutationIntent } from "./plan.mutations";
import { diagnosticQuestionIds } from "./plan.schema";
import {
  createPlanMutationDraft,
  persistPlanMutationDraft,
  recoverPlanMutationIntent,
} from "./plan.recovery";
import { createInMemoryDraftRepository } from "../../shared/storage/drafts";

const ownerScope = "acct-1234567890abcdef";
const taskId = "29584c83-7297-44ef-b985-f38e6c95de76";

const roundTripIntents: readonly PlanMutationIntent[] = [
  {
    idempotencyKey: "plan-create-intent-12345678",
    kind: "create",
    request: {
      role: "Quant Researcher",
      season: "2027 Spring",
      track: "internship",
      weeklyHours: 8,
    },
  },
  {
    idempotencyKey: "plan-diagnostic-intent-1234",
    kind: "diagnostic",
    request: {
      answers: diagnosticQuestionIds.map((questionId) => ({
        optionId: "recovery-test-option",
        questionId,
      })),
      definitionVersion: "baseline-v1",
      planVersion: 4,
    },
  },
  {
    idempotencyKey: "plan-update-intent-12345678",
    kind: "update-task",
    request: {
      planVersion: 4,
      taskVersion: 2,
      title: "复习概率论",
    },
    taskId,
  },
  {
    idempotencyKey: "plan-complete-intent-123456",
    kind: "complete-task",
    request: { planVersion: 4, taskVersion: 2 },
    taskId,
  },
];

describe("Plan draft recovery", () => {
  it.each(roundTripIntents)(
    "round-trips the $kind intent through a versioned draft",
    (intent) => {
      const draft = createPlanMutationDraft(ownerScope, intent);

      expect(recoverPlanMutationIntent(draft)).toEqual(intent);
      expect(draft.serverVersion).toBe(
        "planVersion" in intent.request ? intent.request.planVersion : null,
      );
    },
  );

  it("persists the server idempotency key for every plan intent", async () => {
    const repository = createInMemoryDraftRepository();
    for (const intent of roundTripIntents) {
      const draft = await persistPlanMutationDraft(ownerScope, intent, repository);
      expect(draft.idempotencyKey).toBe(intent.idempotencyKey);
      expect(recoverPlanMutationIntent(draft)).toEqual(intent);
    }

    expect((await repository.list(ownerScope))
      .map(({ idempotencyKey }) => idempotencyKey)
      .sort())
      .toEqual(roundTripIntents
        .map(({ idempotencyKey }) => idempotencyKey)
        .sort());
  });
});
