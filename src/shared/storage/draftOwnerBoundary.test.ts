import { createInMemoryDraftRepository, createRecoverableDraft } from "./drafts";
import { createDraftOwnerBoundary } from "./draftOwnerBoundary";

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";

const draftFor = (owner: string, body: string) => createRecoverableDraft({
  kind: "plan.diagnostic",
  ownerScope: owner,
  payload: { answers: [body] },
  resourceId: "current",
  serverVersion: 1,
});

describe("draft owner boundary", () => {
  it("keeps drafts when restoring the same account", async () => {
    const repository = createInMemoryDraftRepository();
    const boundary = createDraftOwnerBoundary(repository);
    const draft = draftFor(ownerScope, "same owner");
    await repository.put(draft);
    await repository.writeActiveOwner(ownerScope);

    await expect(boundary.activate(ownerScope)).resolves.toBeNull();
    expect(await repository.list(ownerScope)).toEqual([draft]);
  });

  it("clears a pending logout before the same account can render again", async () => {
    const repository = createInMemoryDraftRepository();
    const boundary = createDraftOwnerBoundary(repository);
    const draft = draftFor(ownerScope, "must not survive logout");
    await repository.put(draft);
    await repository.writeActiveOwner(ownerScope);
    await boundary.beginLogout();
    const beforeRecovery = vi.fn();

    await expect(boundary.activate(ownerScope, { beforeRecovery })).resolves.toBeNull();

    expect(beforeRecovery).toHaveBeenCalledWith({
      nextOwnerScope: ownerScope,
      previousOwnerScope: ownerScope,
    });
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(await repository.readActiveOwner()).toBe(ownerScope);
    expect(await repository.readLogoutCleanupPending()).toBe(false);
  });

  it("keeps the pending logout fail-closed until external cleanup succeeds", async () => {
    const repository = createInMemoryDraftRepository();
    const boundary = createDraftOwnerBoundary(repository);
    const draft = draftFor(ownerScope, "retry cleanup");
    await repository.put(draft);
    await repository.writeActiveOwner(ownerScope);
    await boundary.beginLogout();

    await expect(boundary.activate(ownerScope, {
      beforeRecovery: async () => {
        throw new Error("TODO_DRAFT_CLEANUP_FAILED");
      },
    })).rejects.toThrow("TODO_DRAFT_CLEANUP_FAILED");

    expect(await repository.list(ownerScope)).toEqual([draft]);
    expect(await repository.readActiveOwner()).toBe(ownerScope);
    expect(await repository.readLogoutCleanupPending()).toBe(true);
  });

  it("clears the previous account before activating the next account", async () => {
    const repository = createInMemoryDraftRepository();
    const boundary = createDraftOwnerBoundary(repository);
    const previousDraft = draftFor(ownerScope, "previous");
    const returningDraft = draftFor(otherOwnerScope, "returning");
    await repository.put(previousDraft);
    await repository.put(returningDraft);
    await repository.writeActiveOwner(ownerScope);
    const beforeChange = vi.fn(async () => {
      expect(await repository.readActiveOwner()).toBe(ownerScope);
      expect(await repository.list(ownerScope)).toEqual([previousDraft]);
    });

    await expect(boundary.activate(otherOwnerScope, { beforeChange })).resolves.toEqual({
      nextOwnerScope: otherOwnerScope,
      previousOwnerScope: ownerScope,
    });

    expect(beforeChange).toHaveBeenCalledTimes(1);
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(await repository.list(otherOwnerScope)).toEqual([returningDraft]);
    expect(await repository.readActiveOwner()).toBe(otherOwnerScope);
  });

  it("does not expose the next account when external cleanup fails", async () => {
    const repository = createInMemoryDraftRepository();
    const boundary = createDraftOwnerBoundary(repository);
    const previousDraft = draftFor(ownerScope, "keep until retry");
    await repository.put(previousDraft);
    await repository.writeActiveOwner(ownerScope);

    await expect(boundary.activate(otherOwnerScope, {
      beforeChange: async () => {
        throw new Error("TODO_DRAFT_CLEANUP_FAILED");
      },
    })).rejects.toThrow("TODO_DRAFT_CLEANUP_FAILED");

    expect(await repository.readActiveOwner()).toBe(ownerScope);
    expect(await repository.list(ownerScope)).toEqual([previousDraft]);
  });

  it("logout clears every owner and resets the persisted boundary", async () => {
    const repository = createInMemoryDraftRepository();
    const boundary = createDraftOwnerBoundary(repository);
    await repository.put(draftFor(ownerScope, "first"));
    await repository.put(draftFor(otherOwnerScope, "second"));
    await repository.writeActiveOwner(ownerScope);
    const beforeClear = vi.fn();

    await boundary.logout({ beforeClear });

    expect(beforeClear).toHaveBeenCalledTimes(1);
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(await repository.list(otherOwnerScope)).toEqual([]);
    expect(await repository.readActiveOwner()).toBeNull();
    expect(await repository.readLogoutCleanupPending()).toBe(false);
  });

  it("persists the pending boundary when logout cleanup fails", async () => {
    const repository = createInMemoryDraftRepository();
    const boundary = createDraftOwnerBoundary(repository);
    const draft = draftFor(ownerScope, "pending cleanup");
    await repository.put(draft);
    await repository.writeActiveOwner(ownerScope);

    await expect(boundary.logout({
      beforeClear: async () => {
        throw new Error("TODO_DRAFT_CLEANUP_FAILED");
      },
    })).rejects.toThrow("TODO_DRAFT_CLEANUP_FAILED");

    expect(await repository.list(ownerScope)).toEqual([draft]);
    expect(await repository.readActiveOwner()).toBe(ownerScope);
    expect(await repository.readLogoutCleanupPending()).toBe(true);
  });

  it("serializes racing account changes", async () => {
    const repository = createInMemoryDraftRepository();
    const boundary = createDraftOwnerBoundary(repository);
    await repository.writeActiveOwner(ownerScope);
    const transitions: string[] = [];

    await Promise.all([
      boundary.activate(otherOwnerScope, {
        beforeChange: async ({ previousOwnerScope, nextOwnerScope }) => {
          transitions.push(`${previousOwnerScope}->${nextOwnerScope}`);
        },
      }),
      boundary.activate(ownerScope, {
        beforeChange: async ({ previousOwnerScope, nextOwnerScope }) => {
          transitions.push(`${previousOwnerScope}->${nextOwnerScope}`);
        },
      }),
    ]);

    expect(transitions).toEqual([
      `${ownerScope}->${otherOwnerScope}`,
      `${otherOwnerScope}->${ownerScope}`,
    ]);
    expect(await repository.readActiveOwner()).toBe(ownerScope);
  });
});
