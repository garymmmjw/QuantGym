import {
  parseDraftOwnerScope,
  recoverableDraftRepository,
  type RecoverableDraftRepository,
} from "./drafts";

export type DraftOwnerChange = Readonly<{
  nextOwnerScope: string;
  previousOwnerScope: string;
}>;

export type ActivateDraftOwnerOptions = Readonly<{
  beforeChange?: (change: DraftOwnerChange) => Promise<void> | void;
  beforeRecovery?: (change: Readonly<{
    nextOwnerScope: string;
    previousOwnerScope: string | null;
  }>) => Promise<void> | void;
}>;

export type ClearDraftOwnerOptions = Readonly<{
  beforeClear?: () => Promise<void> | void;
}>;

export type DraftOwnerBoundary = Readonly<{
  activate: (
    ownerScope: string,
    options?: ActivateDraftOwnerOptions,
  ) => Promise<DraftOwnerChange | null>;
  beginLogout: () => Promise<void>;
  cancelLogout: () => Promise<void>;
  logout: (options?: ClearDraftOwnerOptions) => Promise<void>;
}>;

/**
 * Serializes account-boundary transitions. The active owner marker lives in
 * the same IndexedDB database as the drafts, so a reload cannot accidentally
 * make a previous account's recovery queue visible to a newly signed-in user.
 */
export const createDraftOwnerBoundary = (
  repository: RecoverableDraftRepository,
): DraftOwnerBoundary => {
  let queue: Promise<void> = Promise.resolve();

  const serialize = <Result>(operation: () => Promise<Result>): Promise<Result> => {
    const result = queue.catch(() => undefined).then(operation);
    queue = result.then(() => undefined, () => undefined);
    return result;
  };

  return {
    activate: (ownerScope, options = {}) => serialize(async () => {
      const nextOwnerScope = parseDraftOwnerScope(ownerScope);
      let previousOwnerScope = await repository.readActiveOwner();
      if (await repository.readLogoutCleanupPending()) {
        await options.beforeRecovery?.({ nextOwnerScope, previousOwnerScope });
        await repository.clear();
        await repository.writeActiveOwner(null);
        await repository.writeLogoutCleanupPending(false);
        previousOwnerScope = null;
      }
      if (previousOwnerScope === nextOwnerScope) return null;

      if (previousOwnerScope !== null) {
        const change = { nextOwnerScope, previousOwnerScope };
        await options.beforeChange?.(change);
        await repository.clear(previousOwnerScope);
        await repository.writeActiveOwner(nextOwnerScope);
        return change;
      }

      await repository.writeActiveOwner(nextOwnerScope);
      return null;
    }),
    beginLogout: () => serialize(async () => {
      await repository.writeLogoutCleanupPending(true);
    }),
    cancelLogout: () => serialize(async () => {
      await repository.writeLogoutCleanupPending(false);
    }),
    logout: (options = {}) => serialize(async () => {
      await repository.writeLogoutCleanupPending(true);
      await options.beforeClear?.();
      await repository.clear();
      await repository.writeActiveOwner(null);
      await repository.writeLogoutCleanupPending(false);
    }),
  };
};

export const recoverableDraftOwnerBoundary = createDraftOwnerBoundary(
  recoverableDraftRepository,
);
