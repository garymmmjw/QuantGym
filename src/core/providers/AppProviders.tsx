import { RouterProvider } from "react-router-dom";
import { QueryErrorResetBoundary, useQueryClient } from "@tanstack/react-query";

import { AppErrorBoundary } from "../errors/AppErrorBoundary";
import { recoveryPresentationFor } from "../errors/recoveryPresentation";
import { appRouter } from "../router/router";
import { useI18n } from "../../shared/i18n";
import { QueryProvider } from "./QueryProvider";
import { RuntimeProviders } from "./RuntimeProviders";

function ApplicationBoundary() {
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <AppErrorBoundary
          copyForState={(state) => ({
            ...recoveryPresentationFor(state, t),
            ariaLabel: language === "zh-CN" ? "应用恢复" : "Application recovery",
            busyLabel: language === "zh-CN" ? "正在恢复应用" : "Recovering application",
            referenceLabel: t("network.requestId"),
          })}
          onReturn={() => window.location.assign("/")}
          onReset={reset}
          onSignIn={() => {
            queryClient.clear();
            window.location.assign("/login?reauth=1");
          }}
        >
          <RouterProvider router={appRouter} />
        </AppErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

export const AppProviders = () => (
  <QueryProvider>
    <RuntimeProviders>
      <ApplicationBoundary />
    </RuntimeProviders>
  </QueryProvider>
);
