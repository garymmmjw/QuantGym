const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

import { QueryClient } from "@tanstack/react-query";

import type { ProblemMutationIntent } from "./problems.mutations";
import {
  createProblemMutationDraft,
  persistProblemMutationDraft,
  recoverProblemMutationIntent,
  replayProblemMutationDrafts,
} from "./problems.recovery";
import { createInMemoryDraftRepository } from "../../shared/storage/drafts";

const ownerScope = "acct-1234567890abcdef";
const problemId = "29584c83-7297-44ef-b985-f38e6c95de76";
const stateId = "19584c83-7297-44ef-b985-f38e6c95de76";
const verifyOwner = async (): Promise<void> => undefined;

describe("Problems draft recovery", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    vi.spyOn(document, "cookie", "get").mockReturnValue(
      "__Host-qg_csrf=session-proof-problems-123456",
    );
  });

  it.each<ProblemMutationIntent>([
    {
      expectedStateId: stateId,
      expectedVersion: 2,
      favorite: true,
      idempotencyKey: "problem-favorite-intent-1234",
      kind: "set-favorite",
      problemId,
    },
    {
      body: "保留双指针思路",
      expectedVersion: 3,
      idempotencyKey: "problem-note-intent-12345678",
      kind: "save-note",
      problemId,
    },
  ])("round-trips the $kind intent without auth material", (intent) => {
    const draft = createProblemMutationDraft(ownerScope, intent);

    expect(recoverProblemMutationIntent(draft)).toEqual(intent);
    expect(JSON.stringify(draft.payload)).not.toContain("csrf");
    expect(draft.idempotencyKey).toBe(intent.idempotencyKey);
  });

  it("keeps a failed reconnect draft, reuses its key, then removes it on acknowledgement", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: ProblemMutationIntent = {
      body: "联网后同步",
      expectedVersion: null,
      idempotencyKey: "problem-note-reconnect-123456",
      kind: "save-note",
      problemId,
    };
    const draft = await persistProblemMutationDraft(ownerScope, intent, repository);
    apiRequestMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        body: intent.body,
        updatedAt: "2026-07-27T04:00:00Z",
        version: 1,
      });

    const first = await replayProblemMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });
    const second = await replayProblemMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(first.retained).toEqual([{
      code: "NETWORK_OFFLINE",
      draftId: draft.draftId,
      reason: "failed",
      requestId: null,
      retryable: true,
      state: "offline-draft",
    }]);
    expect(second.acknowledged).toEqual([draft.draftId]);
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(recoverProblemMutationIntent(draft).idempotencyKey).toBe(intent.idempotencyKey);
    queryClient.clear();
  });
});
