import type { TrainingMutationIntent } from "./training.mutations";
import {
  createTrainingMutationDraft,
  persistTrainingMutationDraft,
  recoverTrainingMutationIntent,
} from "./training.recovery";
import { createInMemoryDraftRepository } from "../../shared/storage/drafts";

const ownerScope = "acct-1234567890abcdef";
const problemId = "29584c83-7297-44ef-b985-f38e6c95de76";
const sessionId = "19584c83-7297-44ef-b985-f38e6c95de76";
const attemptId = "39584c83-7297-44ef-b985-f38e6c95de76";

describe("Training draft recovery", () => {
  it.each<TrainingMutationIntent>([
    {
      idempotencyKey: "training-start-intent-123456",
      kind: "start",
      request: { problemId },
    },
    {
      kind: "attempt",
      request: { answer: "O(n)", kind: "text", version: 3 },
      sessionId,
    },
    {
      idempotencyKey: "training-complete-intent-1234",
      kind: "complete",
      request: { attemptId, version: 4 },
      sessionId,
    },
  ])("round-trips the $kind intent without session credentials", (intent) => {
    const draft = createTrainingMutationDraft(ownerScope, intent);

    expect(recoverTrainingMutationIntent(draft)).toEqual(intent);
    expect(JSON.stringify(draft)).not.toContain("csrf");
    expect(JSON.stringify(draft)).not.toContain("cookie");
  });

  it("keeps the completion idempotency key as durable retry metadata", async () => {
    const repository = createInMemoryDraftRepository();
    const intent: TrainingMutationIntent = {
      idempotencyKey: "training-complete-retry-1234",
      kind: "complete",
      request: { attemptId, version: 4 },
      sessionId,
    };

    const draft = await persistTrainingMutationDraft(ownerScope, intent, repository);

    expect(draft.idempotencyKey).toBe(intent.idempotencyKey);
    expect((await repository.list(ownerScope))[0]?.idempotencyKey)
      .toBe(intent.idempotencyKey);
  });
});
