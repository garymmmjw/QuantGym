import { useQueryClient } from "@tanstack/react-query";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "../../design-system/patterns/AppShell";
import {
  PREVIEW_BUSINESS_ROUTES,
} from "../../design-system/patterns/AppShell/navigation";
import { useToast } from "../../design-system/patterns/ToastRegion";
import {
  useLogoutMutation,
} from "../../domains/account/auth/auth.mutations";
import {
  authQueryKeys,
  currentUserQueryOptions,
} from "../../domains/account/auth/auth.queries";
import type { MeResponse } from "../../domains/account/auth/auth.schema";
import {
  clearPreferenceSyncDrafts,
  listPreferenceSyncDrafts,
  preferenceController,
  reconcilePreferencesFromMe,
  removePreferenceSyncDraft,
  setLanguagePreference,
  setThemePreference,
  upsertPreferenceSyncDraft,
  usePreferences,
  usePreferencesMutation,
} from "../../domains/platform/preferences";
import {
  notificationQueryKeys,
  useUnreadNotificationCount,
} from "../../domains/platform/notifications/notifications.queries";
import {
  createPhase1SearchRegistry,
} from "../../domains/platform/search/search.registry";
import type {
  CompatibilityNavigationSearchResult,
  SearchProviderResult,
} from "../../domains/platform/search/search.types";
import {
  useGlobalSearchShortcut,
} from "../../domains/platform/search/useGlobalSearchShortcut";
import { TodoLauncher } from "../../domains/platform/todo/TodoLauncher";
import { todoQueryKeys } from "../../domains/platform/todo/todo.queries";
import { clearTodoDrafts } from "../../domains/platform/todo/todoDrafts";
import { readCsrfToken } from "../../shared/api/csrf";
import { ApiError } from "../../shared/api/errors";
import {
  classifyMutationFailure,
  type MutationFailure,
} from "../../shared/api/mutationRecovery";
import { createAccountScope } from "../../shared/lib/accountScope";
import { useOnlineStatus } from "../../shared/lib/useOnlineStatus";
import styles from "./AuthenticatedPlatformShell.module.css";

const LazyCommandPalette = lazy(async () => {
  const module = await import("../../domains/platform/search/CommandPalette");
  return { default: module.CommandPalette };
});

const LazyNotificationCenter = lazy(async () => {
  const module = await import("../../domains/platform/notifications/NotificationCenter");
  return { default: module.NotificationCenter };
});

const LazyTodoDock = lazy(async () => {
  const module = await import("../../domains/platform/todo/TodoDock");
  return { default: module.TodoDock };
});

type ActiveSurface = "search" | "notifications" | "todo" | null;

type PreferenceMutationCommand =
  | Readonly<{ field: "theme"; value: "light" | "dark"; version: number }>
  | Readonly<{ field: "language"; value: "zh-CN" | "en"; version: number }>;

type PreferenceFailureNotice = Readonly<{
  failure: MutationFailure;
  input: PreferenceMutationCommand;
  reloadRequired: boolean;
}>;

const preferenceToastId = (
  ownerScope: string,
  field: PreferenceMutationCommand["field"],
) => (
  `preference-${ownerScope}-${field}-sync`
);

export type AuthenticatedPlatformShellProps = Readonly<{
  children: ReactNode;
  currentUser: MeResponse;
}>;

const compatibilitySearchResults: readonly CompatibilityNavigationSearchResult[] = (
  PREVIEW_BUSINESS_ROUTES.map((item) => ({
    description: {
      "zh-CN": "在已隔离的兼容预览中打开",
      en: "Open in the isolated compatibility preview",
    },
    href: item.path,
    id: item.id,
    keywords: [item.id, item.path],
    kind: "compatibility-navigation" as const,
    title: item.label,
  }))
);

export function AuthenticatedPlatformShell({
  children,
  currentUser,
}: AuthenticatedPlatformShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeSurface, setActiveSurface] = useState<ActiveSurface>(null);
  const surfaceReturnFocusRef = useRef<HTMLElement>(null);
  const todoLauncherRef = useRef<HTMLButtonElement>(null);
  const logoutRequestRef = useRef(false);
  const sessionBoundaryActiveRef = useRef(true);
  const previousOwnerScopeRef = useRef<string | null>(null);
  const preferenceOperationInFlightRef = useRef(false);
  const preferenceRecoveryInFlightRef = useRef(false);
  const preferenceVersionRef = useRef(currentUser.preferences.version);
  const promptedPreferenceDraftRef = useRef<string | null>(null);
  const [preferenceFailureNotice, setPreferenceFailureNotice] = (
    useState<PreferenceFailureNotice | null>(null)
  );
  const online = useOnlineStatus();
  const ownerScope = useMemo(
    () => createAccountScope(currentUser.email),
    [currentUser.email],
  );
  const sessionCsrfProof = useMemo(() => readCsrfToken(), []);
  const sessionToastScope = useMemo(
    () => createAccountScope(`${ownerScope}:${sessionCsrfProof ?? "missing-csrf-proof"}`),
    [ownerScope, sessionCsrfProof],
  );
  const logoutToastId = `session-${sessionToastScope}-logout`;
  const verifyCurrentOwner = useCallback(async () => {
    const latest = await queryClient.fetchQuery({
      ...currentUserQueryOptions(),
      networkMode: "always",
      staleTime: 0,
    });
    if (
      latest === null
      || createAccountScope(latest.email) !== ownerScope
    ) {
      queryClient.removeQueries({
        queryKey: notificationQueryKeys.forOwner(ownerScope),
      });
      queryClient.removeQueries({
        queryKey: todoQueryKeys.forOwner(ownerScope),
      });
      throw new ApiError({
        code: "AUTH_SESSION_OWNER_CHANGED",
        message: "当前浏览器会话的账号已发生变化，请确认账号后重试。",
        requestId: null,
        status: 401,
      });
    }
  }, [ownerScope, queryClient]);
  const currentCacheMatchesOwner = useCallback((expectedOwnerScope: string) => {
    const latest = queryClient.getQueryData<MeResponse | null>(authQueryKeys.me);
    return (
      latest !== null
      && latest !== undefined
      && createAccountScope(latest.email) === expectedOwnerScope
    );
  }, [queryClient]);
  const theme = usePreferences((state) => state.theme);
  const language = usePreferences((state) => state.language);
  const preferenceMutation = usePreferencesMutation(
    ownerScope,
    sessionCsrfProof,
    verifyCurrentOwner,
  );
  const clearPreferenceMutationFailure = preferenceMutation.clearFailure;
  const logoutMutation = useLogoutMutation(sessionCsrfProof);
  const notificationSummary = useUnreadNotificationCount({ ownerScope });
  const searchRegistry = useMemo(() => createPhase1SearchRegistry({
    compatibilityNavigation: compatibilitySearchResults,
    v2Navigation: [],
  }), []);

  const rememberSurfaceTrigger = useCallback(() => {
    surfaceReturnFocusRef.current = (
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    );
  }, []);

  const openSearch = useCallback(() => {
    rememberSurfaceTrigger();
    setActiveSurface("search");
  }, [rememberSurfaceTrigger]);

  const openNotifications = useCallback(() => {
    rememberSurfaceTrigger();
    setActiveSurface("notifications");
  }, [rememberSurfaceTrigger]);

  useGlobalSearchShortcut({
    enabled: activeSurface === null,
    onOpen: openSearch,
  });

  const recoverSession = useCallback(() => {
    preferenceController.reset();
    queryClient.clear();
    navigate("/login?reauth=1", { replace: true });
  }, [navigate, queryClient]);

  const finishLocalLogout = useCallback(() => {
    preferenceController.reset();
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [navigate, queryClient]);

  const clearDraftsAndFinishLogout = useCallback(function clearLocalDrafts() {
    clearPreferenceSyncDrafts();
    void clearTodoDrafts()
      .then(() => {
        if (sessionBoundaryActiveRef.current) finishLocalLogout();
      })
      .catch((error: unknown) => {
        if (!sessionBoundaryActiveRef.current) return;
        finishLocalLogout();
        toast.addToast({
          action: {
            label: language === "zh-CN" ? "重试清理" : "Retry cleanup",
            onSelect: clearLocalDrafts,
          },
          dedupeKey: "session-local-draft-cleanup-failed",
          durationMs: null,
          message: error instanceof Error ? error.message : undefined,
          title: language === "zh-CN"
            ? "已退出，但本地待办草稿尚未清除"
            : "Signed out, but local task drafts remain",
          tone: "danger",
        });
      });
  }, [finishLocalLogout, language, toast]);

  const signOut = useCallback(function requestSignOut() {
    if (logoutMutation.isPending || logoutRequestRef.current) return;
    const requestOwnerScope = ownerScope;
    logoutRequestRef.current = true;
    toast.dismissToast(logoutToastId);
    void verifyCurrentOwner()
      .then(() => {
        if (
          !sessionBoundaryActiveRef.current
          || !currentCacheMatchesOwner(requestOwnerScope)
        ) {
          logoutRequestRef.current = false;
          return;
        }
        logoutMutation.mutate(undefined, {
          onError: (error) => {
            if (
              !sessionBoundaryActiveRef.current
              || !currentCacheMatchesOwner(requestOwnerScope)
            ) return;
            if (error.status === 401) {
              clearDraftsAndFinishLogout();
              return;
            }
            toast.addToast({
              action: {
                label: language === "zh-CN" ? "重试" : "Retry",
                onSelect: requestSignOut,
              },
              dedupeKey: logoutToastId,
              durationMs: null,
              id: logoutToastId,
              message: error.message,
              title: language === "zh-CN" ? "暂时无法退出" : "Couldn’t sign out",
              tone: "danger",
            });
          },
          onSettled: () => {
            logoutRequestRef.current = false;
          },
          onSuccess: () => {
            if (
              !sessionBoundaryActiveRef.current
              || !currentCacheMatchesOwner(requestOwnerScope)
            ) return;
            toast.dismissToast(logoutToastId);
            clearDraftsAndFinishLogout();
          },
        });
      })
      .catch((error: unknown) => {
        logoutRequestRef.current = false;
        if (
          !sessionBoundaryActiveRef.current
          || !currentCacheMatchesOwner(requestOwnerScope)
        ) return;
        const failure = classifyMutationFailure(error);
        toast.addToast({
          action: {
            label: language === "zh-CN" ? "重试" : "Retry",
            onSelect: requestSignOut,
          },
          dedupeKey: logoutToastId,
          durationMs: null,
          id: logoutToastId,
          message: failure.message,
          title: language === "zh-CN" ? "退出前需要确认账号" : "Confirm the account before signing out",
          tone: "warning",
        });
      });
  }, [
    clearDraftsAndFinishLogout,
    currentCacheMatchesOwner,
    language,
    logoutToastId,
    logoutMutation,
    ownerScope,
    toast,
    verifyCurrentOwner,
  ]);

  useEffect(() => {
    const previousOwnerScope = previousOwnerScopeRef.current;
    if (previousOwnerScope !== null && previousOwnerScope !== ownerScope) {
      queryClient.removeQueries({
        queryKey: notificationQueryKeys.forOwner(previousOwnerScope),
      });
      queryClient.removeQueries({
        queryKey: todoQueryKeys.forOwner(previousOwnerScope),
      });
    }
    previousOwnerScopeRef.current = ownerScope;
  }, [ownerScope, queryClient]);

  useEffect(() => {
    preferenceVersionRef.current = currentUser.preferences.version;
  }, [currentUser.preferences.version, ownerScope]);

  const startPreferenceMutation = useCallback((input: PreferenceMutationCommand) => {
    const requestOwnerScope = ownerScope;
    preferenceOperationInFlightRef.current = true;
    setPreferenceFailureNotice(null);
    toast.dismissToast(preferenceToastId(requestOwnerScope, input.field));
    preferenceMutation.mutate(input, {
      onError: (error) => {
        if (!currentCacheMatchesOwner(requestOwnerScope)) return;
        setPreferenceFailureNotice({
          failure: classifyMutationFailure(error),
          input,
          reloadRequired: false,
        });
      },
      onSettled: () => {
        preferenceOperationInFlightRef.current = false;
      },
      onSuccess: (preferences) => {
        if (!currentCacheMatchesOwner(requestOwnerScope)) return;
        preferenceVersionRef.current = Math.max(
          preferenceVersionRef.current,
          preferences.version,
        );
        toast.dismissToast(preferenceToastId(requestOwnerScope, input.field));
      },
    });
  }, [
    currentCacheMatchesOwner,
    ownerScope,
    preferenceMutation,
    toast,
  ]);

  const mutatePreference = useCallback((input: PreferenceMutationCommand) => {
    if (
      preferenceOperationInFlightRef.current
      || preferenceRecoveryInFlightRef.current
      || preferenceMutation.isPending
    ) {
      upsertPreferenceSyncDraft(ownerScope, input);
      if (input.field === "theme") setThemePreference(input.value);
      else setLanguagePreference(input.value);
      return;
    }
    startPreferenceMutation(input);
  }, [
    ownerScope,
    preferenceMutation.isPending,
    startPreferenceMutation,
  ]);

  useEffect(() => {
    if (
      preferenceFailureNotice === null
      || preferenceMutation.isPending
      || preferenceOperationInFlightRef.current
      || preferenceRecoveryInFlightRef.current
    ) return;

    const notice = preferenceFailureNotice;
    const { failure, input } = notice;
    const retryWithLatestVersion = async (reloadFromServer: boolean) => {
      if (
        preferenceOperationInFlightRef.current
        || preferenceRecoveryInFlightRef.current
      ) {
        setPreferenceFailureNotice(notice);
        return;
      }
      preferenceRecoveryInFlightRef.current = true;
      try {
        let latest: MeResponse | null = queryClient.getQueryData<MeResponse | null>(
          authQueryKeys.me,
        ) ?? currentUser;
        if (reloadFromServer) {
          latest = await queryClient.fetchQuery({
            ...currentUserQueryOptions(),
            networkMode: "always",
            staleTime: 0,
          });
        }
        if (latest === null) {
          recoverSession();
          return;
        }
        preferenceVersionRef.current = latest.preferences.version;
        const pendingDraft = listPreferenceSyncDrafts(ownerScope)
          .find((draft) => draft.field === input.field);
        const nextInput = {
          field: input.field,
          value: pendingDraft?.value ?? input.value,
          version: latest.preferences.version,
        } as PreferenceMutationCommand;
        preferenceRecoveryInFlightRef.current = false;
        startPreferenceMutation(nextInput);
      } catch (reloadError) {
        setPreferenceFailureNotice({
          failure: classifyMutationFailure(reloadError),
          input,
          reloadRequired: reloadFromServer,
        });
      } finally {
        preferenceRecoveryInFlightRef.current = false;
      }
    };

    const discardLocalIntent = () => {
      removePreferenceSyncDraft(ownerScope, input.field);
      const latest = queryClient.getQueryData<MeResponse | null>(authQueryKeys.me);
      reconcilePreferencesFromMe(latest);
      for (const draft of listPreferenceSyncDrafts(ownerScope)) {
        if (draft.field === "theme") setThemePreference(draft.value);
        else setLanguagePreference(draft.value);
      }
      promptedPreferenceDraftRef.current = null;
      clearPreferenceMutationFailure();
    };
    const reloadFailure = notice.reloadRequired
      && failure.state !== "stale-version-conflict";
    const action = failure.state === "permission-denied"
      ? {
        label: language === "zh-CN" ? "重新登录" : "Sign in again",
        onSelect: recoverSession,
      }
      : reloadFailure
        ? {
          label: language === "zh-CN" ? "重试载入" : "Retry loading",
          onSelect: () => {
            void retryWithLatestVersion(true);
          },
        }
        : failure.state === "stale-version-conflict"
          ? {
            label: language === "zh-CN" ? "载入最新后重试" : "Load latest and retry",
            onSelect: () => {
              void retryWithLatestVersion(true);
            },
          }
          : failure.state === "non-recoverable-error"
            ? {
              label: language === "zh-CN" ? "恢复服务器设置" : "Restore server settings",
              onSelect: discardLocalIntent,
            }
            : {
              label: language === "zh-CN" ? "重试" : "Retry",
              onSelect: () => {
                void retryWithLatestVersion(false);
              },
            };
    toast.addToast({
      action,
      dedupeKey: `preference-${ownerScope}-${input.field}-failed`,
      durationMs: null,
      id: preferenceToastId(ownerScope, input.field),
      message: reloadFailure
        ? failure.message
        : failure.state === "offline-draft"
          ? (language === "zh-CN"
            ? "更改已保留在本机，联网后可重试同步。"
            : "The change is kept locally. Retry when online.")
          : (language === "zh-CN"
            ? "服务器尚未确认这项更改。"
            : "The server has not confirmed this change."),
      recoveryState: failure.state,
      title: reloadFailure
        ? (language === "zh-CN"
          ? "无法载入最新设置"
          : "Couldn’t load the latest settings")
        : (language === "zh-CN" ? "偏好尚未同步" : "Preference not synced"),
      tone: "warning",
    });
    setPreferenceFailureNotice(null);
  }, [
    currentUser,
    clearPreferenceMutationFailure,
    language,
    ownerScope,
    preferenceFailureNotice,
    preferenceMutation.isPending,
    queryClient,
    recoverSession,
    startPreferenceMutation,
    toast,
  ]);

  useEffect(() => {
    if (
      preferenceFailureNotice !== null
      || preferenceMutation.failure !== null
      || preferenceMutation.isPending
      || preferenceOperationInFlightRef.current
      || preferenceRecoveryInFlightRef.current
    ) return;
    const draft = listPreferenceSyncDrafts(ownerScope)[0];
    if (draft === undefined) {
      promptedPreferenceDraftRef.current = null;
      return;
    }
    const signature = [
      ownerScope,
      draft.field,
      draft.value,
      preferenceVersionRef.current,
    ].join(":");
    if (promptedPreferenceDraftRef.current === signature) return;
    promptedPreferenceDraftRef.current = signature;
    const input = {
      field: draft.field,
      value: draft.value,
      version: preferenceVersionRef.current,
    } as PreferenceMutationCommand;
    toast.addToast({
      action: {
        label: language === "zh-CN" ? "同步设置" : "Sync settings",
        onSelect: () => mutatePreference(input),
      },
      dedupeKey: `preference-${ownerScope}-${draft.field}-failed`,
      durationMs: null,
      id: preferenceToastId(ownerScope, draft.field),
      message: language === "zh-CN"
        ? "本机仍有一项尚未得到服务器确认的设置。"
        : "A local setting is still waiting for server confirmation.",
      recoveryState: online ? "retry" : "offline-draft",
      title: language === "zh-CN" ? "偏好等待同步" : "Preference waiting to sync",
      tone: "warning",
    });
  }, [
    currentUser.preferences.version,
    language,
    mutatePreference,
    online,
    ownerScope,
    preferenceFailureNotice,
    preferenceMutation.failure,
    preferenceMutation.isPending,
    toast,
  ]);

  useEffect(() => {
    sessionBoundaryActiveRef.current = true;
    return () => {
      sessionBoundaryActiveRef.current = false;
      toast.dismissToast(logoutToastId);
      toast.dismissToast(preferenceToastId(ownerScope, "theme"));
      toast.dismissToast(preferenceToastId(ownerScope, "language"));
    };
  }, [logoutToastId, ownerScope, toast]);

  const navigateFromSearch = (result: SearchProviderResult) => {
    setActiveSurface(null);
    navigate(result.href);
  };

  return (
    <AppShell
      language={language}
      notificationCount={notificationSummary.count}
      notificationsOpen={activeSurface === "notifications"}
      onLanguageChange={(nextLanguage) => mutatePreference({
        field: "language",
        value: nextLanguage,
        version: preferenceVersionRef.current,
      })}
      onOpenNotifications={openNotifications}
      onOpenSearch={openSearch}
      onSignOut={signOut}
      onToggleTheme={() => mutatePreference({
        field: "theme",
        value: theme === "dark" ? "light" : "dark",
        version: preferenceVersionRef.current,
      })}
      searchOpen={activeSurface === "search"}
      theme={theme}
      user={{ displayName: currentUser.displayName, email: currentUser.email }}
    >
      {children}
      <TodoLauncher
        language={language}
        onClick={() => setActiveSurface("todo")}
        open={activeSurface === "todo"}
        ref={todoLauncherRef}
      />
      <Suspense
        fallback={(
          <p aria-live="polite" className={styles.surfaceLoading} role="status">
            {language === "zh-CN" ? "正在打开…" : "Opening…"}
          </p>
        )}
      >
        {activeSurface === "search" ? (
          <LazyCommandPalette
            language={language}
            onNavigate={navigateFromSearch}
            onOpenChange={(open) => {
              if (!open) setActiveSurface(null);
            }}
            open
            registry={searchRegistry}
            returnFocusRef={surfaceReturnFocusRef}
          />
        ) : null}
        {activeSurface === "notifications" ? (
          <LazyNotificationCenter
            csrfProof={sessionCsrfProof}
            key={ownerScope}
            language={language}
            onOpenChange={(open) => {
              if (!open) setActiveSurface(null);
            }}
            onSignIn={recoverSession}
            open
            ownerScope={ownerScope}
            returnFocusRef={surfaceReturnFocusRef}
            verifyOwner={verifyCurrentOwner}
          />
        ) : null}
        {activeSurface === "todo" ? (
          <LazyTodoDock
            csrfProof={sessionCsrfProof}
            key={ownerScope}
            language={language}
            onOpenChange={(open) => {
              if (!open) setActiveSurface(null);
            }}
            onPermissionRecovery={recoverSession}
            open
            ownerScope={ownerScope}
            returnFocusRef={todoLauncherRef}
            verifyOwner={verifyCurrentOwner}
          />
        ) : null}
      </Suspense>
    </AppShell>
  );
}
