import { useQueryClient } from "@tanstack/react-query";
import { isRouteErrorResponse, useNavigate, useRevalidator, useRouteError } from "react-router-dom";

import { RecoveryPanel, type RecoveryState } from "../../design-system/patterns/RecoveryPanel";
import { ApiError } from "../../shared/api/errors";
import { useI18n } from "../../shared/i18n";
import { recoveryPresentationFor } from "../errors/recoveryPresentation";
import styles from "./AuthenticatedShellRoute.module.css";

const classifyRouteError = (error: unknown): RecoveryState => {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return "permission-denied";
    if (error.status === 409) return "stale-version-conflict";
    if (error.retryable || error.status >= 500) return "recoverable-error";
    return "non-recoverable-error";
  }
  if (isRouteErrorResponse(error)) {
    if (error.status === 401 || error.status === 403) return "permission-denied";
    if (error.status === 409) return "stale-version-conflict";
    return error.status >= 500 ? "recoverable-error" : "non-recoverable-error";
  }
  return "recoverable-error";
};

const routeRequestId = (error: unknown) => {
  if (error instanceof ApiError) return error.requestId;
  if (!isRouteErrorResponse(error) || typeof error.data !== "object" || error.data === null) return null;
  const requestId = (error.data as Record<string, unknown>).requestId;
  return typeof requestId === "string" ? requestId : null;
};

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const { language, t } = useI18n();
  const state = classifyRouteError(error);
  const presentation = recoveryPresentationFor(state, t);
  const retry = () => revalidator.revalidate();
  const signInAgain = () => {
    queryClient.clear();
    navigate("/login?reauth=1", { replace: true });
  };

  return (
    <main className={styles.recoveryPage}>
      <RecoveryPanel
        actionLabel={presentation.actionLabel}
        ariaLabel={language === "zh-CN" ? "页面恢复" : "Page recovery"}
        busy={revalidator.state !== "idle"}
        busyLabel={language === "zh-CN" ? "正在恢复页面" : "Recovering page"}
        onReload={retry}
        onRetry={retry}
        onReturn={() => navigate("/", { replace: true })}
        onSignIn={signInAgain}
        referenceLabel={t("network.requestId")}
        requestId={routeRequestId(error)}
        state={state}
        message={presentation.message}
        title={presentation.title}
      />
    </main>
  );
}
