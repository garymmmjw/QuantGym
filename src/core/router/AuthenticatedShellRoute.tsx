import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "../../design-system/patterns/AppShell";
import { NetworkBanner } from "../../design-system/patterns/NetworkBanner";
import { RecoveryPanel, type RecoveryState } from "../../design-system/patterns/RecoveryPanel";
import { Spinner } from "../../design-system/primitives/Spinner";
import {
  reconcilePreferencesFromMe,
  setLanguagePreference,
  toggleThemePreference,
  usePreferences,
} from "../../domains/platform/preferences";
import { useCurrentUserQuery } from "../../domains/account/auth/auth.queries";
import { ApiError } from "../../shared/api/errors";
import { useI18n } from "../../shared/i18n";
import { useOnlineStatus } from "../../shared/lib/useOnlineStatus";
import { recoveryPresentationFor } from "../errors/recoveryPresentation";
import styles from "./AuthenticatedShellRoute.module.css";

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
  const currentUser = useCurrentUserQuery();
  const online = useOnlineStatus();
  const theme = usePreferences((state) => state.theme);
  const language = usePreferences((state) => state.language);
  const { t } = useI18n();

  useEffect(() => {
    if (currentUser.data !== null && currentUser.data !== undefined) {
      reconcilePreferencesFromMe(currentUser.data);
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

  return (
    <AppShell
      language={language}
      onLanguageChange={setLanguagePreference}
      onToggleTheme={toggleThemePreference}
      theme={theme}
      user={{ displayName: currentUser.data.displayName, email: currentUser.data.email }}
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
    </AppShell>
  );
}
