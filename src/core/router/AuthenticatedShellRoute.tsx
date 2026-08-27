import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { NetworkBanner } from "../../design-system/patterns/NetworkBanner";
import { RecoveryPanel, type RecoveryState } from "../../design-system/patterns/RecoveryPanel";
import { Spinner } from "../../design-system/primitives/Spinner";
import {
  clearPreferenceSyncDrafts,
  listPreferenceSyncDrafts,
  reconcilePreferencesFromMe,
  setLanguagePreference,
  setThemePreference,
  usePreferences,
} from "../../domains/platform/preferences";
import { todoDraftRepository } from "../../domains/platform/todo/todoDrafts";
import { useCurrentUserQuery } from "../../domains/account/auth/auth.queries";
import { readCsrfToken } from "../../shared/api/csrf";
import { ApiError } from "../../shared/api/errors";
import { cancelAndRemoveOwnerQueries } from "../../shared/api/ownerScopedQueries";
import { useI18n } from "../../shared/i18n";
import { useOnlineStatus } from "../../shared/lib/useOnlineStatus";
import { createAccountScope } from "../../shared/lib/accountScope";
import { recoverableDraftOwnerBoundary } from "../../shared/storage/draftOwnerBoundary";
import { recoveryPresentationFor } from "../errors/recoveryPresentation";
import styles from "./AuthenticatedShellRoute.module.css";
import { AuthenticatedPlatformShell } from "./AuthenticatedPlatformShell";

const recoveryStateFor = (error: unknown, online: boolean): RecoveryState => {
  if (!online) return "offline-draft";
  if (!(error instanceof ApiError)) return "recoverable-error";
  if (error.status === 401 || error.status === 403) return "permission-denied";
  if (error.status === 409) return "stale-version-conflict";
  if (error.retryable || error.status >= 500) return "recoverable-error";
  return "non-recoverable-error";
};

export function AuthenticatedShellRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUserQuery();
  const online = useOnlineStatus();
  const language = usePreferences((state) => state.language);
  const { t } = useI18n();
  const [readyDraftOwnerScope, setReadyDraftOwnerScope] = useState<string | null>(null);
  const [draftBoundaryFailure, setDraftBoundaryFailure] = useState<Readonly<{
    error: unknown;
    ownerScope: string;
  }> | null>(null);
  const [draftBoundaryRetry, setDraftBoundaryRetry] = useState(0);
  const resolvedOwnerScope = currentUser.data === null || currentUser.data === undefined
    ? null
    : createAccountScope(currentUser.data.email);

  useEffect(() => {
    if (resolvedOwnerScope === null) return;
    let active = true;
    void recoverableDraftOwnerBoundary.activate(resolvedOwnerScope, {
      beforeRecovery: async ({ previousOwnerScope }) => {
        if (previousOwnerScope !== null) {
          await cancelAndRemoveOwnerQueries(queryClient, previousOwnerScope);
        }
        clearPreferenceSyncDrafts();
        await todoDraftRepository.clear();
      },
      beforeChange: async ({ previousOwnerScope }) => {
        await cancelAndRemoveOwnerQueries(queryClient, previousOwnerScope);
        clearPreferenceSyncDrafts(previousOwnerScope);
        await todoDraftRepository.clear(previousOwnerScope);
      },
    }).then(() => {
      if (!active) return;
      setDraftBoundaryFailure(null);
      setReadyDraftOwnerScope(resolvedOwnerScope);
    }).catch((error: unknown) => {
      if (!active) return;
      setReadyDraftOwnerScope(null);
      setDraftBoundaryFailure({ error, ownerScope: resolvedOwnerScope });
    });
    return () => {
      active = false;
    };
  }, [draftBoundaryRetry, queryClient, resolvedOwnerScope]);

  useEffect(() => {
    if (currentUser.data !== null && currentUser.data !== undefined) {
      reconcilePreferencesFromMe(currentUser.data);
      const ownerScope = createAccountScope(currentUser.data.email);
      for (const draft of listPreferenceSyncDrafts(ownerScope)) {
        if (draft.field === "theme") setThemePreference(draft.value);
        else setLanguagePreference(draft.value);
      }
    }
  }, [currentUser.data]);

  if (currentUser.isPending) {
    return (
      <main aria-labelledby="shell-session-title" className={styles.sessionGate}>
        <Spinner label={t("shell.loading")} size="large" />
        <h1 id="shell-session-title">{t("shell.loading")}</h1>
        <p>{language === "zh-CN" ? "正在安全恢复你的训练会话。" : "Securely restoring your training session."}</p>
      </main>
    );
  }

  if (currentUser.isError) {
    const recoveryState = recoveryStateFor(currentUser.error, online);
    const presentation = recoveryPresentationFor(recoveryState, t);
    const requestId = currentUser.error instanceof ApiError ? currentUser.error.requestId : null;
    return (
      <main className={styles.recoveryPage}>
        <RecoveryPanel
          actionLabel={presentation.actionLabel}
          busy={currentUser.isFetching}
          busyLabel={language === "zh-CN" ? "正在重试" : "Retrying"}
          onReload={() => void currentUser.refetch()}
          onRetry={() => void currentUser.refetch()}
          onReturn={() => navigate("/", { replace: true })}
          onSignIn={() => navigate("/login?reauth=1", { replace: true })}
          referenceLabel={t("network.requestId")}
          requestId={requestId}
          state={recoveryState}
          message={presentation.message}
          title={presentation.title}
        />
      </main>
    );
  }

  if (currentUser.data === null || currentUser.data === undefined) {
    const redirect = `${location.pathname}${location.search}`;
    const params = new URLSearchParams();
    if (redirect !== "/") params.set("redirect", redirect);
    return <Navigate replace to={`/login${params.size === 0 ? "" : `?${params.toString()}`}`} />;
  }

  if (draftBoundaryFailure?.ownerScope === resolvedOwnerScope) {
    const presentation = recoveryPresentationFor("recoverable-error", t);
    return (
      <main className={styles.recoveryPage}>
        <RecoveryPanel
          actionLabel={presentation.actionLabel}
          busy={false}
          busyLabel={language === "zh-CN" ? "正在重试" : "Retrying"}
          onReload={() => setDraftBoundaryRetry((value) => value + 1)}
          onRetry={() => setDraftBoundaryRetry((value) => value + 1)}
          onReturn={() => navigate("/", { replace: true })}
          onSignIn={() => navigate("/login?reauth=1", { replace: true })}
          state="recoverable-error"
          message={language === "zh-CN"
            ? "无法确认本机草稿的账号边界。完成清理前不会显示账号内容。"
            : "The local draft owner boundary could not be verified. Account content remains hidden until cleanup succeeds."}
          title={language === "zh-CN" ? "本机草稿暂不可用" : "Local drafts unavailable"}
        />
      </main>
    );
  }

  if (readyDraftOwnerScope !== resolvedOwnerScope) {
    return (
      <main aria-labelledby="draft-owner-gate-title" className={styles.sessionGate}>
        <Spinner label={language === "zh-CN" ? "正在隔离本机草稿" : "Securing local drafts"} size="large" />
        <h1 id="draft-owner-gate-title">
          {language === "zh-CN" ? "正在确认本机草稿" : "Checking local drafts"}
        </h1>
        <p>
          {language === "zh-CN"
            ? "账号内容会在本机草稿边界确认后显示。"
            : "Account content appears after the local draft boundary is verified."}
        </p>
      </main>
    );
  }

  const sessionBoundaryKey = createAccountScope([
    currentUser.data.email,
    readCsrfToken() ?? "missing-csrf-proof",
    currentUser.dataUpdatedAt > 0 ? "resolved" : "pending",
  ].join(":"));

  return (
    <AuthenticatedPlatformShell
      currentUser={currentUser.data}
      key={sessionBoundaryKey}
    >
      {!online ? (
        <NetworkBanner
          actionLabel={t("network.retry")}
          ariaLabel={t("network.offlineTitle")}
          message={t("network.offlineBody")}
          onAction={() => void currentUser.refetch()}
          status="offline"
          title={t("network.offlineTitle")}
        />
      ) : null}
      <Outlet />
    </AuthenticatedPlatformShell>
  );
}
