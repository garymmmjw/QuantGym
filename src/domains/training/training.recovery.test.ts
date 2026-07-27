const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "../../shared/api/errors";
import {
  createInMemoryDraftRepository,
  reviseRecoverableDraft,
  type DraftJsonObject,
  type RecoverableDraftRepository,
} from "../../shared/storage/drafts";
import {
  newCompleteTrainingIntent,
  type TrainingMutationIntent,
} from "./training.mutations";
import {
  consumeTrainingRecoveryReceipt,
  createTrainingMutationDraft,
  listTrainingRecoveryReceipts,
  persistTrainingMutationDraft,
  recoverTrainingMutationIntent,
  replayTrainingMutationDrafts,
  trainingRecoveryReceiptMatchesSourceAttempt,
} from "./training.recovery";

const ownerScope = "acct-1234567890abcdef";
const problemId = "29584c83-7297-44ef-b985-f38e6c95de76";
const sessionId = "19584c83-7297-44ef-b985-f38e6c95de76";
const attemptId = "39584c83-7297-44ef-b985-f38e6c95de76";
const verifyOwner = async (): Promise<void> => undefined;

describe("Training draft recovery", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    vi.spyOn(document, "cookie", "get").mockReturnValue(
      "__Host-qg_csrf=session-proof-training-123456",
    );
  });

  it.each<TrainingMutationIntent>([
    {
      idempotencyKey: "training-start-intent-123456",
      kind: "start",
      request: { problemId },
    },
    {
      idempotencyKey: "training-attempt-intent-1234",
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

  it.each([
    {
      intent: {
        idempotencyKey: "training-hint-content-free-123",
        kind: "hint" as const,
        request: { version: 3 },
        sessionId,
      },
      response: {
        eventId: "49584c83-7297-44ef-b985-f38e6c95de76",
        eventSequence: 2,
        hintEn: "Private hint content.",
        hintZh: "受权限保护的提示正文。",
        sessionId,
        sessionVersion: 4,
      },
      secrets: ["Private hint content.", "受权限保护的提示正文。", "hintEn", "hintZh"],
    },
    {
      intent: {
        idempotencyKey: "training-solution-content-free-1",
        kind: "solution" as const,
        request: { version: 3 },
        sessionId,
      },
      response: {
        eventId: "59584c83-7297-44ef-b985-f38e6c95de76",
        eventSequence: 2,
        sessionId,
        sessionVersion: 4,
        solutionEn: "Private solution content.",
        solutionZh: "受权限保护的题解正文。",
      },
      secrets: [
        "Private solution content.",
        "受权限保护的题解正文。",
        "solutionEn",
        "solutionZh",
      ],
    },
  ])("stores a content-free $intent.kind recovery receipt", async ({
    intent,
    response,
    secrets,
  }) => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const source = await persistTrainingMutationDraft(ownerScope, intent, repository);
    apiRequestMock.mockResolvedValue(response);

    const report = await replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(report.acknowledged).toEqual([source.draftId]);
    const receipts = await listTrainingRecoveryReceipts(ownerScope, repository);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]?.payload.response).toEqual({
      eventId: response.eventId,
      eventSequence: response.eventSequence,
      sessionId,
      sessionVersion: response.sessionVersion,
    });
    const persisted = JSON.stringify(await repository.list(ownerScope));
    for (const secret of secrets) expect(persisted).not.toContain(secret);
    queryClient.clear();
  });

  it("durably preserves a replayed attempt result before deleting its source draft", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: TrainingMutationIntent = {
      idempotencyKey: "training-attempt-replay-1234",
      kind: "attempt",
      request: { answer: "O(n)", kind: "text", version: 3 },
      sessionId,
    };
    const response = {
      attemptId,
      eventId: "49584c83-7297-44ef-b985-f38e6c95de76",
      eventSequence: 2,
      score: 100,
      sessionId,
      sessionVersion: 4,
    };
    const source = await persistTrainingMutationDraft(ownerScope, intent, repository);
    queryClient.setQueryData(["dashboard", ownerScope, "overview"], { stale: true });
    queryClient.setQueryData(["problems", ownerScope, "list"], { stale: true });
    apiRequestMock.mockResolvedValue(response);

    const report = await replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(report.acknowledged).toEqual([source.draftId]);
    const receipts = await listTrainingRecoveryReceipts(ownerScope, repository);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]?.payload).toEqual(expect.objectContaining({
      intentKind: "attempt",
      response,
      sourceAttemptCount: 1,
      sourceDraftId: source.draftId,
      sourceGenerationId: source.generationId,
      sourceLastAttemptAt: expect.any(String),
    }));
    expect(JSON.stringify(receipts[0])).not.toContain(intent.request.answer);
    const receipt = receipts[0];
    if (receipt?.payload.intentKind !== "attempt") {
      throw new Error("ATTEMPT_RECEIPT_EXPECTED");
    }
    const sourceAttemptCount = receipt.payload.sourceAttemptCount;
    const sourceLastAttemptAt = receipt.payload.sourceLastAttemptAt;
    if (sourceAttemptCount === undefined || sourceLastAttemptAt === undefined) {
      throw new Error("ATTEMPT_RECEIPT_SOURCE_IDENTITY_EXPECTED");
    }
    const exactAttempt = {
      ...source,
      attemptCount: sourceAttemptCount,
      lastAttemptAt: sourceLastAttemptAt,
    };
    expect(trainingRecoveryReceiptMatchesSourceAttempt(receipt, exactAttempt)).toBe(true);
    expect(trainingRecoveryReceiptMatchesSourceAttempt(receipt, {
      ...exactAttempt,
      attemptCount: exactAttempt.attemptCount + 1,
      lastAttemptAt: new Date(Date.parse(sourceLastAttemptAt) + 1_000).toISOString(),
    })).toBe(false);
    expect(newCompleteTrainingIntent({
      sessionId: receipt.payload.response.sessionId,
      sessionVersion: receipt.payload.response.sessionVersion,
    }, receipt.payload.response.attemptId)).toEqual(expect.objectContaining({
      kind: "complete",
      request: { attemptId, version: 4 },
      sessionId,
    }));
    expect(queryClient.getQueryState(["dashboard", ownerScope, "overview"])?.isInvalidated)
      .toBe(true);
    expect(queryClient.getQueryState(["problems", ownerScope, "list"])?.isInvalidated)
      .toBe(true);
    expect(await consumeTrainingRecoveryReceipt(ownerScope, receipt, repository)).toBe(true);
    expect(await repository.list(ownerScope)).toEqual([]);
    queryClient.clear();
  });

  it("shares one replay signal across outer, preflight, mutation, and postflight", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const source = await persistTrainingMutationDraft(ownerScope, {
      idempotencyKey: "training-start-shared-signal-1",
      kind: "start",
      request: { problemId },
    }, repository);
    const response = {
      problemId,
      resumed: false,
      sessionId,
      sessionVersion: 1,
    };
    const observedOwnerSignals: (AbortSignal | undefined)[] = [];
    let mutationSignal: AbortSignal | undefined;
    const signalAwareVerifier = vi.fn(async (signal?: AbortSignal) => {
      observedOwnerSignals.push(signal);
    });
    apiRequestMock.mockImplementation((
      _path: string,
      requestOptions?: Readonly<{ signal?: AbortSignal }>,
    ) => {
      mutationSignal = requestOptions?.signal;
      return Promise.resolve(response);
    });

    await expect(replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner: signalAwareVerifier,
    })).resolves.toMatchObject({ acknowledged: [source.draftId] });

    expect(signalAwareVerifier).toHaveBeenCalledTimes(3);
    const [outerSignal, preflightSignal, postflightSignal] = observedOwnerSignals;
    expect(outerSignal).toBeInstanceOf(AbortSignal);
    expect(preflightSignal).toBe(outerSignal);
    expect(mutationSignal).toBe(outerSignal);
    expect(postflightSignal).toBe(outerSignal);
    queryClient.clear();
  });

  it("does not verify postflight or persist a receipt after the replay deadline aborts", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const controller = new AbortController();
    const timeout = new DOMException("Replay deadline exceeded", "TimeoutError");
    const source = await persistTrainingMutationDraft(ownerScope, {
      idempotencyKey: "training-start-abort-signal-12",
      kind: "start",
      request: { problemId },
    }, repository);
    let sharedSignal: AbortSignal | undefined;
    const signalAwareVerifier = vi.fn(async (signal?: AbortSignal) => {
      sharedSignal ??= signal;
      expect(signal).toBe(sharedSignal);
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    apiRequestMock.mockImplementation((
      _path: string,
      requestOptions?: Readonly<{ signal?: AbortSignal }>,
    ) => {
      expect(requestOptions?.signal).toBe(sharedSignal);
      controller.abort(timeout);
      return Promise.resolve({
        problemId,
        resumed: false,
        sessionId,
        sessionVersion: 1,
      });
    });

    await expect(replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      signal: controller.signal,
      verifyOwner: signalAwareVerifier,
    })).rejects.toBe(timeout);

    expect(signalAwareVerifier).toHaveBeenCalledTimes(2);
    expect(apiRequestMock).toHaveBeenCalledOnce();
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(await listTrainingRecoveryReceipts(ownerScope, repository)).toEqual([]);
    expect(await repository.list(ownerScope)).toEqual([
      expect.objectContaining({
        draftId: source.draftId,
        lastAttemptAt: null,
      }),
    ]);
    queryClient.clear();
  });

  it("rejects recovery receipts with only half of the source attempt identity", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: TrainingMutationIntent = {
      idempotencyKey: "training-attempt-partial-receipt-1",
      kind: "attempt",
      request: { answer: "O(n log n)", kind: "text", version: 3 },
      sessionId,
    };
    const response = {
      attemptId,
      eventId: "49584c83-7297-44ef-b985-f38e6c95de76",
      eventSequence: 2,
      score: 100,
      sessionId,
      sessionVersion: 4,
    };
    await persistTrainingMutationDraft(ownerScope, intent, repository);
    apiRequestMock.mockResolvedValue(response);
    await replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });
    const [validReceiptDraft] = await repository.list(ownerScope);
    if (validReceiptDraft === undefined) {
      throw new Error("TRAINING_RECOVERY_RECEIPT_EXPECTED");
    }
    const validPayload = validReceiptDraft.payload as DraftJsonObject;
    const countOnlyPayload = { ...validPayload };
    const timestampOnlyPayload = { ...validPayload };
    delete countOnlyPayload.sourceLastAttemptAt;
    delete timestampOnlyPayload.sourceAttemptCount;

    await repository.clear(ownerScope);
    await repository.put(reviseRecoverableDraft(validReceiptDraft, {
      payload: countOnlyPayload,
      serverVersion: validReceiptDraft.serverVersion,
    }));
    expect(await listTrainingRecoveryReceipts(ownerScope, repository)).toEqual([]);
    expect(await repository.list(ownerScope)).toEqual([]);

    await repository.put(reviseRecoverableDraft(validReceiptDraft, {
      payload: timestampOnlyPayload,
      serverVersion: validReceiptDraft.serverVersion,
    }));
    expect(await listTrainingRecoveryReceipts(ownerScope, repository)).toEqual([]);
    expect(await repository.list(ownerScope)).toEqual([]);
    queryClient.clear();
  });

  it("does not persist a late receipt after its exact replay source is removed", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: TrainingMutationIntent = {
      idempotencyKey: "training-attempt-late-receipt-1",
      kind: "attempt",
      request: { answer: "O(log n)", kind: "text", version: 3 },
      sessionId,
    };
    const response = {
      attemptId,
      eventId: "49584c83-7297-44ef-b985-f38e6c95de76",
      eventSequence: 2,
      score: 100,
      sessionId,
      sessionVersion: 4,
    };
    const source = await persistTrainingMutationDraft(ownerScope, intent, repository);
    let resolveResponse: (value: typeof response) => void = () => undefined;
    const pendingResponse = new Promise<typeof response>((resolve) => {
      resolveResponse = resolve;
    });
    apiRequestMock.mockReturnValue(pendingResponse);

    const operation = replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });
    await vi.waitFor(() => expect(apiRequestMock).toHaveBeenCalledOnce());
    const attemptedSource = (await repository.list(ownerScope)).find(
      ({ kind }) => kind === "training.attempt",
    );
    if (attemptedSource === undefined) {
      throw new Error("ATTEMPTED_TRAINING_SOURCE_EXPECTED");
    }
    expect(attemptedSource.lastAttemptAt).not.toBeNull();
    expect(await repository.acknowledge(attemptedSource)).toBe(true);

    resolveResponse(response);
    await expect(operation).resolves.toMatchObject({
      acknowledged: [],
      retained: [{ draftId: source.draftId, reason: "superseded" }],
    });
    expect(await listTrainingRecoveryReceipts(ownerScope, repository)).toEqual([]);
    expect(await repository.list(ownerScope)).toEqual([]);
    queryClient.clear();
  });

  it("uses an exact-generation receipt after a crash without submitting the answer twice", async () => {
    const baseRepository = createInMemoryDraftRepository();
    let interruptFirstSourceAcknowledgement = true;
    const repository: RecoverableDraftRepository = {
      ...baseRepository,
      acknowledge: async (draft) => {
        if (draft.kind === "training.attempt" && interruptFirstSourceAcknowledgement) {
          interruptFirstSourceAcknowledgement = false;
          return false;
        }
        return baseRepository.acknowledge(draft);
      },
    };
    const queryClient = new QueryClient();
    const intent: TrainingMutationIntent = {
      idempotencyKey: "training-attempt-crash-12345",
      kind: "attempt",
      request: { answer: "binary search", kind: "text", version: 3 },
      sessionId,
    };
    const response = {
      attemptId,
      eventId: "49584c83-7297-44ef-b985-f38e6c95de76",
      eventSequence: 2,
      score: 100,
      sessionId,
      sessionVersion: 4,
    };
    const source = await persistTrainingMutationDraft(ownerScope, intent, repository);
    apiRequestMock.mockResolvedValue(response);

    const interrupted = await replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });
    expect(interrupted.retained).toEqual([{
      draftId: source.draftId,
      reason: "superseded",
    }]);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);

    const resumed = await replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });
    expect(resumed.acknowledged).toEqual([source.draftId]);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(await listTrainingRecoveryReceipts(ownerScope, repository)).toHaveLength(1);
    queryClient.clear();
  });

  it("does not let an older receipt suppress a newer source generation", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: TrainingMutationIntent = {
      idempotencyKey: "training-attempt-generation-1234",
      kind: "attempt",
      request: { answer: "same safe retry", kind: "text", version: 3 },
      sessionId,
    };
    const response = {
      attemptId,
      eventId: "49584c83-7297-44ef-b985-f38e6c95de76",
      eventSequence: 2,
      score: 100,
      sessionId,
      sessionVersion: 4,
    };
    const source = await persistTrainingMutationDraft(ownerScope, intent, repository);
    apiRequestMock.mockResolvedValue(response);
    await replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });
    const newer = reviseRecoverableDraft(source, {
      payload: source.payload,
      serverVersion: source.serverVersion,
      updatedAt: source.updatedAt,
    });
    await repository.put(newer);

    await replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(newer.generationId).not.toBe(source.generationId);
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    expect(await listTrainingRecoveryReceipts(ownerScope, repository)).toHaveLength(2);
    queryClient.clear();
  });

  it("retains a retryable idempotency 409 for a later replay", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const source = await persistTrainingMutationDraft(ownerScope, {
      idempotencyKey: "training-attempt-in-progress-1",
      kind: "attempt",
      request: { answer: "O(log n)", kind: "text", version: 3 },
      sessionId,
    }, repository);
    apiRequestMock.mockImplementation(() => {
      throw new ApiError({
        code: "IDEMPOTENCY_REQUEST_IN_PROGRESS",
        message: "request is still in progress",
        requestId: "request-retryable-409",
        retryable: true,
        status: 409,
      });
    });

    const report = await replayTrainingMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(report.retained).toEqual([{
      code: "IDEMPOTENCY_REQUEST_IN_PROGRESS",
      draftId: source.draftId,
      reason: "failed",
      requestId: "request-retryable-409",
      retryable: true,
      state: "recoverable-error",
    }]);
    expect(await repository.list(ownerScope)).toHaveLength(1);
    apiRequestMock.mockReset();
  });
});
