import {
  createInMemoryTodoDraftRepository,
  createTodoDraft,
  decodePersistedTodoDraft,
  decodePersistedTodoDrafts,
  resolvePersistedTodoDraftRemoval,
  selectPersistedTodoDraftsForOwner,
} from "./todoDrafts";
import { newCreateTodoIntent } from "./todo.mutations";

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";

describe("Todo recoverable drafts", () => {
  it("keeps one persistent record for one idempotent user intent", async () => {
    const repository = createInMemoryTodoDraftRepository();
    const intent = newCreateTodoIntent("复习哈希表");
    const draft = createTodoDraft(intent, ownerScope);

    await repository.put(draft);
    await repository.put(draft);

    expect(await repository.list(ownerScope)).toEqual([draft]);
  });

  it("removes a draft only after explicit acknowledgement", async () => {
    const repository = createInMemoryTodoDraftRepository();
    const first = createTodoDraft(newCreateTodoIntent("第一项"), ownerScope);
    const second = createTodoDraft(newCreateTodoIntent("第二项"), ownerScope);
    await repository.put(first);
    await repository.put(second);

    await repository.remove(ownerScope, first.draftId);
    expect(await repository.list(ownerScope)).toEqual([second]);

    await repository.clear(ownerScope);
    expect(await repository.list(ownerScope)).toEqual([]);
  });

  it("never writes recoverable drafts to localStorage", async () => {
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    const repository = createInMemoryTodoDraftRepository();

    await repository.put(createTodoDraft(newCreateTodoIntent("本地草稿"), ownerScope));

    expect(storageWrite).not.toHaveBeenCalled();
  });

  it("isolates drafts between authenticated accounts", async () => {
    const repository = createInMemoryTodoDraftRepository();
    const first = createTodoDraft(newCreateTodoIntent("Gary 的草稿"), ownerScope);
    const second = createTodoDraft(newCreateTodoIntent("另一账号的草稿"), otherOwnerScope);
    await repository.put(first);
    await repository.put(second);

    expect(await repository.list(ownerScope)).toEqual([first]);
    expect(await repository.list(otherOwnerScope)).toEqual([second]);

    await repository.clear(ownerScope);
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(await repository.list(otherOwnerScope)).toEqual([second]);
  });

  it("rejects a malformed persisted record instead of silently dropping it", () => {
    const valid = createTodoDraft(newCreateTodoIntent("有效草稿"), ownerScope);
    const malformed = {
      ...valid,
      ownerScope: "gary@example.com",
    };

    expect(() => decodePersistedTodoDraft(malformed))
      .toThrow("TODO_DRAFT_PERSISTED_RECORD_INVALID");
    expect(() => decodePersistedTodoDrafts([valid, malformed]))
      .toThrow("TODO_DRAFT_PERSISTED_RECORD_INVALID");
  });

  it("validates every persisted record before owner filtering", () => {
    const currentOwnerDraft = createTodoDraft(
      newCreateTodoIntent("当前账号"),
      ownerScope,
    );
    const malformedOtherOwnerDraft = {
      ...createTodoDraft(newCreateTodoIntent("其他账号"), otherOwnerScope),
      intent: { kind: "create", title: "" },
    };

    expect(() => selectPersistedTodoDraftsForOwner(
      [currentOwnerDraft, malformedOtherOwnerDraft],
      ownerScope,
    )).toThrow("TODO_DRAFT_PERSISTED_RECORD_INVALID");
  });

  it("fails closed when a removal target is malformed or belongs to another owner", () => {
    const currentOwnerDraft = createTodoDraft(
      newCreateTodoIntent("当前账号"),
      ownerScope,
    );
    const otherOwnerDraft = createTodoDraft(
      newCreateTodoIntent("其他账号"),
      otherOwnerScope,
    );

    expect(() => resolvePersistedTodoDraftRemoval(
      { ...currentOwnerDraft, createdAt: "invalid" },
      ownerScope,
      currentOwnerDraft.draftId,
    )).toThrow("TODO_DRAFT_PERSISTED_RECORD_INVALID");
    expect(() => resolvePersistedTodoDraftRemoval(
      otherOwnerDraft,
      ownerScope,
      otherOwnerDraft.draftId,
    )).toThrow("TODO_DRAFT_PERSISTED_RECORD_OWNER_MISMATCH");
    expect(resolvePersistedTodoDraftRemoval(
      undefined,
      ownerScope,
      currentOwnerDraft.draftId,
    )).toBeNull();
  });
});
