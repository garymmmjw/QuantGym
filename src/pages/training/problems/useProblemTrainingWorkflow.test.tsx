import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  newStartTrainingIntent,
} from "../../../domains/training/training.mutations";
import type * as TrainingRecoveryModule from "../../../domains/training/training.recovery";
import {
  createTrainingRecoveryReceipt,
  persistTrainingMutationDraft,
  type TrainingRecoveryReceipt,
} from "../../../domains/training/training.recovery";
import {
  createInMemoryDraftRepository,
  createRecoverableDraft,
  type DraftReplayReport,
  type RecoverableDraft,
  type RecoverableDraftRepository,
} from "../../../shared/storage/drafts";

const { replayTrainingMutationDraftsMock } = vi.hoisted(() => ({
  replayTrainingMutationDraftsMock: vi.fn(),
}));

vi.mock("../../../domains/training/training.recovery", async (importOriginal) => {
  const actual = await importOriginal<typeof TrainingRecoveryModule>();
  return {
    ...actual,
    replayTrainingMutationDrafts: replayTrainingMutationDraftsMock,
  };
});

import {
  useProblemTrainingWorkflow,
  type ProblemTrainingWorkflowOptions,
} from "./useProblemTrainingWorkflow";

const ownerScope = "acct-aaaaaaaaaaaaaaaa";
const otherOwnerScope = "acct-bbbbbbbbbbbbbbbb";
const problemId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";

const createWrapper = (queryClient: QueryClient) => (
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }
);

const acknowledgedStartReplay = (
  repository: RecoverableDraftRepository,
  activeOwnerScope = ownerScope,
) => async (): Promise<DraftReplayReport> => {
  const source = (await repository.list(activeOwnerScope))[0];
  if (source === undefined) throw new Error("missing source draft");
  const attempted = await repository.markAttempt(source);
  if (attempted === null) throw new Error("missing attempt lease");
  const intent = newStartTrainingIntent({ problemId });
  const receipt = createTrainingRecoveryReceipt(
    activeOwnerScope,
    attempted,
    {
      ...intent,
      idempotencyKey: attempted.idempotencyKey,
    },
    {
      problemId,
      resumed: false,
      sessionId,
      sessionVersion: 1,
    },
  );
  await repository.put(receipt.draft);
  await repository.acknowledge(attempted);
  return {
    acknowledged: [attempted.draftId],
    attempted: [attempted.draftId],
    retained: [],
  };
};

const putStartReceipt = async (
  repository: RecoverableDraftRepository,
  activeOwnerScope = ownerScope,
  acknowledgeSource = true,
): Promise<Readonly<{
  receipt: TrainingRecoveryReceipt;
  source: RecoverableDraft;
}>> => {
  const intent = newStartTrainingIntent({ problemId });
  const source = await persistTrainingMutationDraft(
    activeOwnerScope,
    intent,
    repository,
  );
  const attempted = await repository.markAttempt(source);
  if (attempted === null) throw new Error("missing attempt lease");
  const receipt = createTrainingRecoveryReceipt(
    activeOwnerScope,
    attempted,
    {
      ...intent,
      idempotencyKey: attempted.idempotencyKey,
    },
    {
      problemId,
      resumed: false,
      sessionId,
      sessionVersion: 1,
    },
  );
  await repository.put(receipt.draft);
  if (acknowledgeSource) await repository.acknowledge(attempted);
  return { receipt, source: attempted };
};

const renderWorkflow = (
  repository: RecoverableDraftRepository,
  onReceipt: ProblemTrainingWorkflowOptions["onReceipt"] = vi.fn(async (
    receipt: TrainingRecoveryReceipt,
  ) => {
    void receipt;
  }),
  online = true,
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onLoadLatest = vi.fn(async () => undefined);
  const verifyOwner = vi.fn(async () => undefined);
  const result = renderHook(() => useProblemTrainingWorkflow({
    csrfProof: "csrf",
    language: "en",
    online,
    onLoadLatest,
    onReceipt,
    ownerScope,
    repository,
    verifyOwner,
  }), { wrapper: createWrapper(queryClient) });
  return { ...result, onReceipt: vi.mocked(onReceipt), queryClient };
};

describe("useProblemTrainingWorkflow", () => {
  beforeEach(() => {
    replayTrainingMutationDraftsMock.mockReset();
  });

  it("persists one intent before replay and consumes its durable receipt", async () => {
    const repository = createInMemoryDraftRepository();
    replayTrainingMutationDraftsMock.mockImplementation(
      acknowledgedStartReplay(repository),
    );
    const { result, onReceipt } = renderWorkflow(repository);
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    expect(result.current.canSubmit).toBe(true);

    const intent = newStartTrainingIntent({ problemId });
    await act(async () => {
      await result.current.submit(intent);
    });

    await waitFor(() => expect(onReceipt).toHaveBeenCalledTimes(1));
    expect(onReceipt.mock.calls[0]?.[0].payload.intentKind).toBe("start");
    expect(await repository.list(ownerScope)).toEqual([]);
    await waitFor(() => expect(result.current.workflow).toBeNull());
  });

  it("retains an offline draft and retries with the same idempotency key", async () => {
    const repository = createInMemoryDraftRepository();
    replayTrainingMutationDraftsMock.mockImplementationOnce(async () => {
      const source = (await repository.list(ownerScope))[0];
      if (source === undefined) throw new Error("missing source draft");
      return {
        acknowledged: [],
        attempted: [],
        retained: [{
          code: "NETWORK_OFFLINE",
          draftId: source.draftId,
          reason: "failed",
          requestId: null,
          retryable: true,
          state: "offline-draft",
        }],
      };
    });
    const { result } = renderWorkflow(repository);
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    const intent = newStartTrainingIntent({ problemId });

    await act(async () => {
      await result.current.submit(intent);
    });
    const retained = (await repository.list(ownerScope))[0];
    expect(retained?.idempotencyKey).toBe(intent.idempotencyKey);
    await waitFor(() => expect(result.current.workflow?.phase).toBe("failed"));

    replayTrainingMutationDraftsMock.mockImplementationOnce(
      acknowledgedStartReplay(repository),
    );
    await act(async () => {
      await result.current.retry();
    });
    expect(replayTrainingMutationDraftsMock).toHaveBeenCalledTimes(2);
    expect(await repository.list(ownerScope)).toEqual([]);
  });

  it("persists offline without starting an owner or mutation request", async () => {
    const repository = createInMemoryDraftRepository();
    const { result } = renderWorkflow(repository, undefined, false);
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    const intent = newStartTrainingIntent({ problemId });

    await act(async () => {
      expect(await result.current.submit(intent)).toBe(false);
    });

    expect(replayTrainingMutationDraftsMock).not.toHaveBeenCalled();
    expect(result.current.workflow?.failure).toMatchObject({
      code: "TRAINING_RECOVERY_PENDING",
      state: "offline-draft",
    });
    const [draft] = await repository.list(ownerScope);
    expect(draft?.idempotencyKey).toBe(intent.idempotencyKey);
    expect(draft?.attemptCount).toBe(0);
    expect(draft?.lastAttemptAt).toBeNull();

    await act(async () => {
      expect(await result.current.retry()).toBe(false);
    });
    expect(replayTrainingMutationDraftsMock).not.toHaveBeenCalled();
  });

  it("keeps the classified failure when its own draft inspection runs", async () => {
    const repository = createInMemoryDraftRepository();
    replayTrainingMutationDraftsMock.mockImplementationOnce(async () => {
      const source = (await repository.list(ownerScope))[0];
      if (source === undefined) throw new Error("missing source draft");
      return {
        acknowledged: [],
        attempted: [source.draftId],
        retained: [{
          code: "AUTH_PERMISSION_DENIED",
          draftId: source.draftId,
          reason: "failed",
          requestId: "training-permission-request",
          retryable: false,
          state: "permission-denied",
        }],
      };
    });
    const { result } = renderWorkflow(repository);
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));

    await act(async () => {
      await result.current.submit(newStartTrainingIntent({ problemId }));
    });
    await waitFor(() => expect(result.current.workflow?.phase).toBe("failed"));
    await act(async () => {
      await result.current.inspectRecovery();
    });

    expect(result.current.workflow?.failure).toMatchObject({
      code: "AUTH_PERMISSION_DENIED",
      requestId: "training-permission-request",
      retryable: false,
      state: "permission-denied",
    });
  });

  it("rejects a second intent while the first persistence is active", async () => {
    const repository = createInMemoryDraftRepository();
    let releaseReplay: (() => void) | undefined;
    replayTrainingMutationDraftsMock.mockImplementation(() => (
      new Promise<DraftReplayReport>((resolve) => {
        releaseReplay = () => resolve({
          acknowledged: [],
          attempted: [],
          retained: [],
        });
      })
    ));
    const { result } = renderWorkflow(repository);
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    const first = newStartTrainingIntent({ problemId });
    const second = newStartTrainingIntent({ problemId });

    let firstResult: boolean | undefined;
    let firstOperation: Promise<boolean> | undefined;
    act(() => {
      firstOperation = result.current.submit(first);
    });
    await waitFor(() => expect(replayTrainingMutationDraftsMock).toHaveBeenCalled());
    expect(result.current.canSubmit).toBe(false);
    let secondResult: boolean | undefined;
    await act(async () => {
      secondResult = await result.current.submit(second);
    });
    await act(async () => {
      releaseReplay?.();
      firstResult = await firstOperation;
    });

    expect(secondResult).toBe(false);
    expect(firstResult).toBe(true);
    const drafts = await repository.list(ownerScope);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.idempotencyKey).toBe(first.idempotencyKey);
  });

  it("defers an unmatched receipt without acknowledging its source or consuming it", async () => {
    const repository = createInMemoryDraftRepository();
    const { receipt, source } = await putStartReceipt(
      repository,
      ownerScope,
      false,
    );
    let receiptAttempt = 0;
    const onReceipt = vi.fn(async () => {
      receiptAttempt += 1;
      return receiptAttempt === 1 ? "defer" as const : "consume" as const;
    });
    const { result } = renderWorkflow(repository, onReceipt);

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    expect(onReceipt).toHaveBeenCalledTimes(1);
    expect(await repository.list(ownerScope)).toEqual(expect.arrayContaining([
      source,
      receipt.draft,
    ]));
    expect(await repository.list(ownerScope)).toHaveLength(2);
    expect(result.current.workflow).toBeNull();
    expect(result.current.canSubmit).toBe(true);

    await act(async () => {
      await result.current.inspectRecovery();
    });

    await waitFor(async () => {
      expect(await repository.list(ownerScope)).toEqual([]);
    });
    expect(onReceipt).toHaveBeenCalledTimes(2);
  });

  it("does not let a delayed receipt from the previous owner mutate the active owner", async () => {
    const repository = createInMemoryDraftRepository();
    const { receipt } = await putStartReceipt(repository);
    let releaseReceipt: (() => void) | undefined;
    const onReceipt = vi.fn(() => new Promise<"consume">((resolve) => {
      releaseReceipt = () => resolve("consume");
    }));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const onLoadLatest = vi.fn(async () => undefined);
    const verifyOwner = vi.fn(async () => undefined);
    const hook = renderHook(
      ({ activeOwnerScope }: Readonly<{ activeOwnerScope: string }>) => (
        useProblemTrainingWorkflow({
          csrfProof: "csrf",
          language: "en",
          online: true,
          onLoadLatest,
          onReceipt,
          ownerScope: activeOwnerScope,
          repository,
          verifyOwner,
        })
      ),
      {
        initialProps: { activeOwnerScope: ownerScope },
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(onReceipt).toHaveBeenCalledTimes(1));
    const previousInspection = hook.result.current.inspectRecovery();
    hook.rerender({ activeOwnerScope: otherOwnerScope });
    await waitFor(() => expect(hook.result.current.recoveryReady).toBe(true));
    expect(hook.result.current.canSubmit).toBe(true);
    expect(hook.result.current.workflow).toBeNull();

    await act(async () => {
      releaseReceipt?.();
      await previousInspection;
    });

    expect(await repository.list(ownerScope)).toEqual([receipt.draft]);
    expect(await repository.list(otherOwnerScope)).toEqual([]);
    expect(hook.result.current.inspectionFailure).toBeNull();
    expect(hook.result.current.workflow).toBeNull();
  });

  it("does not consume a delayed receipt after unmount", async () => {
    const repository = createInMemoryDraftRepository();
    const { receipt } = await putStartReceipt(repository);
    let releaseReceipt: (() => void) | undefined;
    const onReceipt = vi.fn(() => new Promise<"consume">((resolve) => {
      releaseReceipt = () => resolve("consume");
    }));
    const hook = renderWorkflow(repository, onReceipt);

    await waitFor(() => expect(onReceipt).toHaveBeenCalledTimes(1));
    const pendingInspection = hook.result.current.inspectRecovery();
    hook.unmount();
    releaseReceipt?.();
    await pendingInspection;

    expect(await repository.list(ownerScope)).toEqual([receipt.draft]);
  });

  it("removes only the exact malformed training draft and continues recovery", async () => {
    const repository = createInMemoryDraftRepository();
    const validDraft = await persistTrainingMutationDraft(
      ownerScope,
      newStartTrainingIntent({ problemId }),
      repository,
    );
    const malformedDraft = createRecoverableDraft({
      idempotencyKey: "malformed-training-draft-1",
      kind: "training.attempt",
      ownerScope,
      payload: { answer: "missing-kind-and-version" },
      resourceId: sessionId,
      serverVersion: 1,
      updatedAt: "2099-01-01T00:00:00.000Z",
    });
    await repository.put(malformedDraft);
    const { result } = renderWorkflow(repository);

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));

    expect(await repository.list(ownerScope)).toEqual([validDraft]);
    expect(result.current.inspectionFailure).toBeNull();
    expect(result.current.workflow?.draft).toEqual(validDraft);
    expect(result.current.workflow?.phase).toBe("failed");
  });
});
