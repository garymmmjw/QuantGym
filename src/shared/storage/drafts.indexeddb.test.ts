import { indexedDB as fakeIndexedDb } from "fake-indexeddb";

import {
  RECOVERABLE_DRAFT_DATABASE_NAME,
  RECOVERABLE_DRAFT_DATABASE_VERSION,
  createIndexedDbDraftRepository,
  createRecoverableDraft,
  reviseRecoverableDraft,
} from "./drafts";

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";

const deleteDatabase = (): Promise<void> => new Promise((resolve, reject) => {
  const request = fakeIndexedDb.deleteDatabase(RECOVERABLE_DRAFT_DATABASE_NAME);
  request.onerror = () => reject(request.error ?? new Error("TEST_DATABASE_DELETE_FAILED"));
  request.onblocked = () => reject(new Error("TEST_DATABASE_DELETE_BLOCKED"));
  request.onsuccess = () => resolve();
});

const injectPersistedRecord = (record: unknown): Promise<void> => (
  new Promise((resolve, reject) => {
    const request = fakeIndexedDb.open(
      RECOVERABLE_DRAFT_DATABASE_NAME,
      RECOVERABLE_DRAFT_DATABASE_VERSION,
    );
    request.onerror = () => reject(request.error ?? new Error("TEST_DATABASE_OPEN_FAILED"));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("drafts", "readwrite");
      transaction.onerror = () => reject(
        transaction.error ?? new Error("TEST_DATABASE_TRANSACTION_FAILED"),
      );
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.objectStore("drafts").put(record);
    };
  })
);

const draftFor = (
  owner: string,
  body: string,
  idempotencyKey: string,
) => createRecoverableDraft({
  idempotencyKey,
  kind: "problems.note",
  ownerScope: owner,
  payload: { body, expectedVersion: null },
  resourceId: "be7a8d4d-0cbe-46b0-8df0-e80b06f967e3",
  serverVersion: null,
  updatedAt: "2026-07-27T03:00:00.000Z",
});

beforeAll(() => {
  vi.stubGlobal("indexedDB", fakeIndexedDb);
});

beforeEach(async () => {
  await deleteDatabase();
});

afterAll(async () => {
  await deleteDatabase();
  vi.unstubAllGlobals();
});

describe("native IndexedDB recoverable drafts", () => {
  it("executes owner-scoped stores, metadata, generation checks, and acknowledgement", async () => {
    const repository = createIndexedDbDraftRepository();
    const first = draftFor(ownerScope, "第一版", "indexed-db-first-intent-1234");
    const revised = reviseRecoverableDraft(first, {
      payload: { body: "第二版", expectedVersion: 2 },
      serverVersion: 2,
      updatedAt: first.updatedAt,
    });
    const other = draftFor(
      otherOwnerScope,
      "其他账号",
      "indexed-db-other-intent-1234",
    );

    await repository.put(first);
    await repository.put(revised);
    await repository.put(other);
    await repository.writeActiveOwner(ownerScope);

    expect(await repository.readActiveOwner()).toBe(ownerScope);
    expect(await repository.list(ownerScope)).toEqual([revised]);
    expect(await repository.list(otherOwnerScope)).toEqual([other]);
    expect(await repository.acknowledge(first)).toBe(false);
    expect(await repository.acknowledge(revised)).toBe(true);
    expect(await repository.list(ownerScope)).toEqual([]);

    await repository.clear(otherOwnerScope);
    await repository.writeActiveOwner(null);
    expect(await repository.list(otherOwnerScope)).toEqual([]);
    expect(await repository.readActiveOwner()).toBeNull();
  });

  it("does not remove an IndexedDB source snapshot after replay advances it", async () => {
    const repository = createIndexedDbDraftRepository();
    const original = draftFor(
      ownerScope,
      "等待重放",
      "indexed-db-replay-intent-1234",
    );
    await repository.put(original);
    const attempted = await repository.markAttempt(
      original,
      "2026-07-27T03:01:00.000Z",
    );
    if (attempted === null) throw new Error("ATTEMPTED_DRAFT_EXPECTED");

    expect(await repository.acknowledge(original)).toBe(false);
    expect(await repository.discard(original)).toBe(false);
    expect(await repository.list(ownerScope)).toEqual([attempted]);
    expect(await repository.acknowledge(attempted)).toBe(true);
  });

  it("moves corrupt persisted records to a payload-free quarantine store", async () => {
    const repository = createIndexedDbDraftRepository();
    const valid = draftFor(ownerScope, "有效", "indexed-db-valid-intent-1234");
    const secret = "never-persist-this-session-proof";
    await repository.put(valid);
    await injectPersistedRecord({
      ...valid,
      draftId: "draft-corrupt-indexed-db-record-1234",
      payload: { csrfProof: secret },
    });

    expect(await repository.list(ownerScope)).toEqual([valid]);
    const quarantine = await repository.listQuarantine();
    expect(quarantine).toHaveLength(1);
    expect(quarantine[0]).toEqual(expect.objectContaining({ reason: "auth-material" }));
    expect(JSON.stringify(quarantine)).not.toContain(secret);
  });

  it("discards only the exact user-selected generation", async () => {
    const repository = createIndexedDbDraftRepository();
    const original = draftFor(
      ownerScope,
      "准备丢弃的旧内容",
      "indexed-db-discard-intent-1234",
    );
    const revision = reviseRecoverableDraft(original, {
      payload: { body: "需要保留的新内容", expectedVersion: 4 },
      serverVersion: 4,
      updatedAt: original.updatedAt,
    });
    await repository.put(original);
    await repository.put(revision);

    expect(await repository.discard(original)).toBe(false);
    expect(await repository.list(ownerScope)).toEqual([revision]);
    expect(await repository.discard(revision)).toBe(true);
    expect(await repository.list(ownerScope)).toEqual([]);
  });
});
