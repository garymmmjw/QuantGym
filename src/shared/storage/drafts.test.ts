import {
  RECOVERABLE_DRAFT_DATABASE_NAME,
  RECOVERABLE_DRAFT_DATABASE_VERSION,
  RECOVERABLE_DRAFT_SCHEMA_VERSION,
  createInMemoryDraftRepository,
  createRecoverableDraft,
  decodePersistedDraft,
  registerDraftReconnectReplay,
  replayRecoverableDrafts,
  reviseRecoverableDraft,
} from "./drafts";

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";

const createProblemDraft = (
  title: string,
  owner = ownerScope,
  idempotencyKey?: string,
) => createRecoverableDraft({
  ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
  kind: "problems.note",
  ownerScope: owner,
  payload: { body: title },
  resourceId: "problem-two-sum",
  serverVersion: 3,
  updatedAt: "2026-07-27T02:00:00.000Z",
});

describe("native recoverable draft storage", () => {
  it("persists an explicit record schema and database version", () => {
    const draft = createProblemDraft("保留这个思路");

    expect(RECOVERABLE_DRAFT_DATABASE_NAME).toBe("qg-v2-phase2-draft-recovery");
    expect(RECOVERABLE_DRAFT_DATABASE_VERSION).toBe(1);
    expect(draft.schemaVersion).toBe(RECOVERABLE_DRAFT_SCHEMA_VERSION);
    expect(draft).toEqual(expect.objectContaining({
      attemptCount: 0,
      lastAttemptAt: null,
      ownerScope,
      resourceId: "problem-two-sum",
      serverVersion: 3,
    }));
  });

  it("keeps one durable record and one key for one user intent", async () => {
    const repository = createInMemoryDraftRepository();
    const intentKey = "intent_1234567890abcdef";
    const first = createProblemDraft("同一意图", ownerScope, intentKey);
    const retry = createProblemDraft("同一意图", ownerScope, intentKey);

    await repository.put(first);
    await repository.put(retry);

    expect(retry.draftId).toBe(first.draftId);
    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
    expect(await repository.list(ownerScope)).toEqual([retry]);
  });

  it("gives a new user intent a new idempotency key and draft identity", () => {
    const first = createProblemDraft("第一次");
    const second = createProblemDraft("第二次");

    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(second.draftId).not.toBe(first.draftId);
  });

  it("rejects auth material recursively instead of persisting it", () => {
    expect(() => createRecoverableDraft({
      kind: "training.complete",
      ownerScope,
      payload: { nested: { csrf_token: "csrf-secret-value" } },
      resourceId: "training-session",
      serverVersion: 1,
    })).toThrow("RECOVERABLE_DRAFT_AUTH_MATERIAL_FORBIDDEN");
    expect(() => createRecoverableDraft({
      kind: "training.complete",
      ownerScope,
      payload: { answer: "Bearer secret-token" },
      resourceId: "training-session",
      serverVersion: 1,
    })).toThrow("RECOVERABLE_DRAFT_AUTH_MATERIAL_FORBIDDEN");
  });

  it("isolates owners and refuses cross-owner acknowledgement", async () => {
    const repository = createInMemoryDraftRepository();
    const current = createProblemDraft("Gary", ownerScope);
    const other = createProblemDraft("Other", otherOwnerScope);
    await repository.put(current);
    await repository.put(other);

    expect(await repository.list(ownerScope)).toEqual([current]);
    expect(await repository.list(otherOwnerScope)).toEqual([other]);
    await expect(repository.acknowledge({
      ...current,
      ownerScope: otherOwnerScope,
    })).rejects.toThrow("RECOVERABLE_DRAFT_OWNER_MISMATCH");
    expect(await repository.list(ownerScope)).toEqual([current]);
  });

  it("quarantines corrupt records without copying their payload or secret", async () => {
    const secret = "never-copy-this-cookie";
    const valid = createProblemDraft("有效");
    const repository = createInMemoryDraftRepository([
      valid,
      {
        ...valid,
        draftId: "draft-corrupt-record-1234",
        payload: { cookie: secret },
      },
      {
        ...valid,
        draftId: "draft-future-record-1234",
        schemaVersion: 99,
      },
    ]);

    expect(await repository.list(ownerScope)).toEqual([valid]);
    const quarantine = await repository.listQuarantine();
    expect(quarantine).toHaveLength(2);
    expect(quarantine.map(({ reason }) => reason).sort()).toEqual([
      "auth-material",
      "invalid-record",
    ]);
    expect(JSON.stringify(quarantine)).not.toContain(secret);
    expect(Object.keys(quarantine[0] ?? {}).sort()).toEqual([
      "quarantineId",
      "quarantinedAt",
      "reason",
      "schemaVersion",
    ]);
  });

  it("deletes only the exact acknowledged generation", async () => {
    const repository = createInMemoryDraftRepository();
    const original = createProblemDraft("原始内容");
    const revision = reviseRecoverableDraft(original, {
      payload: { body: "修订内容" },
      serverVersion: 4,
      updatedAt: "2026-07-27T03:00:00.000Z",
    });
    await repository.put(original);
    await repository.put(revision);

    expect(await repository.acknowledge(original)).toBe(false);
    expect(await repository.list(ownerScope)).toEqual([revision]);
    expect(await repository.acknowledge(revision)).toBe(true);
    expect(await repository.list(ownerScope)).toEqual([]);
  });

  it("reuses the persisted key across failed reconnects and deletes after acknowledgement", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("联网重试");
    const seenKeys: string[] = [];
    await repository.put(draft);

    const failed = await replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async (persisted) => {
        seenKeys.push(persisted.idempotencyKey);
        throw new TypeError("Failed to fetch");
      },
      repository,
    });
    expect(failed.retained).toEqual([{ draftId: draft.draftId, reason: "failed" }]);

    const acknowledged = await replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async (persisted) => {
        seenKeys.push(persisted.idempotencyKey);
        return { acknowledged: true };
      },
      repository,
    });

    expect(seenKeys).toEqual([draft.idempotencyKey, draft.idempotencyKey]);
    expect(acknowledged.acknowledged).toEqual([draft.draftId]);
    expect(await repository.list(ownerScope)).toEqual([]);
  });

  it("does not remove a draft when the server defers acknowledgement", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("等待确认");
    await repository.put(draft);

    const report = await replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async () => ({ acknowledged: false }),
      repository,
    });

    expect(report.retained).toEqual([{ draftId: draft.draftId, reason: "deferred" }]);
    expect((await repository.list(ownerScope))[0]).toEqual(expect.objectContaining({
      attemptCount: 1,
      idempotencyKey: draft.idempotencyKey,
    }));
  });

  it("deduplicates overlapping reconnect replay runs", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("只提交一次");
    await repository.put(draft);
    let release: (() => void) | undefined;
    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });
    const replay = vi.fn(async () => {
      await blocker;
      return { acknowledged: true };
    });

    const first = replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay,
      repository,
    });
    const second = replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay,
      repository,
    });
    release?.();

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(replay).toHaveBeenCalledTimes(1);
  });

  it("replays when the browser reconnects and unregisters cleanly", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("online event");
    await repository.put(draft);
    const target = new EventTarget();
    const onReport = vi.fn();
    const stop = registerDraftReconnectReplay({
      kinds: ["problems.note"],
      onReport,
      ownerScope,
      replay: async () => ({ acknowledged: true }),
      repository,
      target,
    });

    target.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(onReport).toHaveBeenCalledTimes(1));
    expect(await repository.list(ownerScope)).toEqual([]);

    stop();
    target.dispatchEvent(new Event("online"));
    await Promise.resolve();
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed owner scopes and unsupported persisted schemas", () => {
    const valid = createProblemDraft("schema");
    expect(() => decodePersistedDraft({ ...valid, ownerScope: "gary@example.com" }))
      .toThrow("RECOVERABLE_DRAFT_RECORD_INVALID");
    expect(() => decodePersistedDraft({ ...valid, schemaVersion: 2 }))
      .toThrow("RECOVERABLE_DRAFT_RECORD_INVALID");
  });
});
