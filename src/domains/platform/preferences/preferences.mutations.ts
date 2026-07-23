import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { z } from "zod";

import { authQueryKeys } from "../../account/auth/auth.queries";
import type { MeResponse } from "../../account/auth/auth.schema";
import { apiRequest } from "../../../shared/api/client";
import {
  classifyMutationFailure,
  type MutationFailure,
} from "../../../shared/api/mutationRecovery";
import { createAccountScope } from "../../../shared/lib/accountScope";
import {
  preferenceStore,
  reconcilePreferencesFromMe,
  setLanguagePreference,
  setThemePreference,
} from "./preferences.store";
import type {
  PreferenceLanguage,
  PreferenceState,
  PreferenceTheme,
} from "./preferences.types";
import {
  listPreferenceSyncDrafts,
  removePreferenceSyncDraft,
  upsertPreferenceSyncDraft,
} from "./preferences.drafts";

const preferencesResponseSchema = z.object({
  language: z.enum(["zh-CN", "en"]),
  theme: z.enum(["light", "dark", "system"]),
  version: z.number().int().positive(),
}).strict();

export type PreferencesResponse = z.infer<typeof preferencesResponseSchema>;

export type PreferenceMutationInput =
  | Readonly<{ field: "theme"; value: PreferenceTheme; version: number }>
  | Readonly<{ field: "language"; value: PreferenceLanguage; version: number }>;

export const updatePreferences = async (
  input: PreferenceMutationInput,
  csrfProof: string | null,
): Promise<PreferencesResponse> => {
  const response = await apiRequest<unknown>("/preferences", {
    body: input.field === "theme"
      ? { theme: input.value, version: input.version }
      : { language: input.value, version: input.version },
    csrfProof,
    method: "PATCH",
  });
  return preferencesResponseSchema.parse(response);
};

type MutationContext = Readonly<{
  draftId: string;
  ownerScope: string;
  previousPreferences: PreferenceState;
}>;

const noOpOwnerVerification = async (): Promise<void> => undefined;

export const usePreferencesMutation = (
  ownerScope: string,
  csrfProof: string | null,
  verifyOwner: () => Promise<void> = noOpOwnerVerification,
) => {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<MutationFailure | null>(null);
  const clearFailure = useCallback(() => setFailure(null), []);
  const mutation = useMutation<
    PreferencesResponse,
    unknown,
    PreferenceMutationInput,
    MutationContext
  >({
    mutationFn: async (input) => {
      await verifyOwner();
      return updatePreferences(input, csrfProof);
    },
    networkMode: "always",
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: authQueryKeys.me });
      const previousPreferences = preferenceStore.getState();
      const draft = upsertPreferenceSyncDraft(ownerScope, input);
      if (input.field === "theme") setThemePreference(input.value);
      else setLanguagePreference(input.value);
      setFailure(null);
      return { draftId: draft.draftId, ownerScope, previousPreferences };
    },
    onError: (error, input, context) => {
      const classified = classifyMutationFailure(error);
      const requestOwnerScope = context?.ownerScope ?? ownerScope;
      const current = queryClient.getQueryData<MeResponse | null>(authQueryKeys.me);
      const ownerStillCurrent = (
        current !== null
        && current !== undefined
        && createAccountScope(current.email) === requestOwnerScope
      );
      if (ownerStillCurrent) setFailure(classified);
      if (!classified.preserveDraft) {
        removePreferenceSyncDraft(
          requestOwnerScope,
          input.field,
          input.value,
          context?.draftId,
        );
      }
      if (
        ownerStillCurrent
        && classified.state !== "offline-draft"
        && context !== undefined
      ) {
        setThemePreference(context.previousPreferences.theme);
        setLanguagePreference(context.previousPreferences.language);
        for (const draft of listPreferenceSyncDrafts(requestOwnerScope)) {
          if (draft.draftId === context.draftId) continue;
          if (draft.field === "theme") setThemePreference(draft.value);
          else setLanguagePreference(draft.value);
        }
      }
    },
    onSuccess: (preferences, input, context) => {
      const requestOwnerScope = context?.ownerScope ?? ownerScope;
      removePreferenceSyncDraft(
        requestOwnerScope,
        input.field,
        input.value,
        context?.draftId,
      );
      const current = queryClient.getQueryData<MeResponse | null>(authQueryKeys.me);
      if (
        current === null
        || current === undefined
        || createAccountScope(current.email) !== requestOwnerScope
        || current.preferences.version > preferences.version
      ) return;
      const updated: MeResponse = { ...current, preferences };
      queryClient.setQueryData(authQueryKeys.me, updated);
      reconcilePreferencesFromMe(updated);
      for (const draft of listPreferenceSyncDrafts(requestOwnerScope)) {
        if (draft.field === "theme") setThemePreference(draft.value);
        else setLanguagePreference(draft.value);
      }
      setFailure(null);
    },
    retry: false,
  });

  return {
    ...mutation,
    clearFailure,
    failure,
  };
};
