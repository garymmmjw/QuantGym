import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { AuthFrame } from "../../domains/account/auth/AuthFrame";
import { AuthSessionGate } from "../../domains/account/auth/AuthSessionGate";
import {
  AuthRecovery,
  type AuthRecoveryPhase,
} from "../../domains/account/auth/AuthRecovery";
import {
  EmailAuthForm,
  type AuthMode,
} from "../../domains/account/auth/EmailAuthForm";
import {
  useForgotPasswordMutation,
  useLoginMutation,
  useRegisterMutation,
  useResetPasswordMutation,
} from "../../domains/account/auth/auth.mutations";
import {
  authQueryKeys,
  useCurrentUserQuery,
} from "../../domains/account/auth/auth.queries";
import {
  DEFAULT_AUTH_REDIRECT,
  googleAuthErrorFromSearch,
  googleAuthErrorPresentation,
  initialAuthView,
  resetTokenFromFragment,
  safeAuthRedirectPath,
} from "../../domains/account/auth/auth.routing";
import type { MeResponse } from "../../domains/account/auth/auth.schema";

const recoveryAnnouncement = (phase: AuthRecoveryPhase) => {
  switch (phase) {
    case "forgot":
      return "已打开密码重置表单。";
    case "forgot-sent":
      return "重置申请已处理，请检查邮箱。";
    case "reset":
      return "已打开新密码设置表单。";
    case "reset-success":
      return "密码更新成功。";
  }
};

type TransientAuthView = Extract<AuthRecoveryPhase, "forgot-sent" | "reset-success">;

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const redirectPath = useMemo(
    () => safeAuthRedirectPath(new URLSearchParams(location.search).get("redirect")),
    [location.search],
  );
  const googleErrorCode = useMemo(
    () => googleAuthErrorFromSearch(location.search),
    [location.search],
  );
  const forceReauthentication = useMemo(
    () => (
      new URLSearchParams(location.search).get("reauth") === "1"
      || googleErrorCode !== undefined
    ),
    [googleErrorCode, location.search],
  );
  const routeIdentity = `${location.pathname}${location.search}`;
  const routedView = initialAuthView(location.pathname, location.search);
  const [transientView, setTransientView] = useState<Readonly<{
    routeIdentity: string;
    view: TransientAuthView;
  }> | null>(null);
  const view = transientView?.routeIdentity === routeIdentity ? transientView.view : routedView;
  const [resetToken] = useState(() => resetTokenFromFragment(window.location.hash));
  const [announcement, setAnnouncement] = useState("");
  const currentUser = useCurrentUserQuery();
  const login = useLoginMutation();
  const register = useRegisterMutation();
  const forgot = useForgotPasswordMutation();
  const reset = useResetPasswordMutation();

  useEffect(() => {
    if (location.pathname !== "/auth/reset" || window.location.hash.length === 0) return;
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, [location.pathname]);

  useEffect(() => {
    if (
      currentUser.isSuccess
      && currentUser.data !== null
      && currentUser.data !== undefined
      && location.pathname !== "/auth/reset"
      && !forceReauthentication
    ) {
      navigate(redirectPath, { replace: true });
    }
  }, [currentUser.data, currentUser.isSuccess, forceReauthentication, location.pathname, navigate, redirectPath]);

  const authSearchFor = (mode: AuthMode | "forgot") => {
    const params = new URLSearchParams();
    if (mode !== "login") params.set("mode", mode);
    if (redirectPath !== DEFAULT_AUTH_REDIRECT) params.set("redirect", redirectPath);
    if (forceReauthentication) params.set("reauth", "1");
    const search = params.toString();
    return search.length === 0 ? "" : `?${search}`;
  };

  const finishAuthentication = (user: MeResponse) => {
    queryClient.setQueryData(authQueryKeys.me, user);
    setAnnouncement(`欢迎回来，${user.displayName}。正在进入训练空间。`);
    navigate(redirectPath, { replace: true });
  };

  const returnToLogin = () => {
    setAnnouncement("已返回登录。你可以继续使用邮箱或 Google 登录。");
    setTransientView(null);
    navigate(
      { pathname: "/login", search: authSearchFor("login") },
      { replace: true },
    );
  };

  const changeMode = (mode: AuthMode) => {
    setAnnouncement(mode === "login" ? "已切换到登录。" : "已切换到注册。");
    setTransientView(null);
    navigate({ pathname: "/login", search: authSearchFor(mode) });
  };

  const isRecovery = view === "forgot"
    || view === "forgot-sent"
    || view === "reset"
    || view === "reset-success";
  const isCheckingSession = currentUser.isPending
    && location.pathname !== "/auth/reset"
    && !forceReauthentication;
  const frameAnnouncement = announcement || (
    googleErrorCode === undefined ? "" : googleAuthErrorPresentation[googleErrorCode].message
  );

  return (
    <AuthFrame announcement={frameAnnouncement}>
      {isCheckingSession ? (
        <AuthSessionGate />
      ) : isRecovery ? (
        <AuthRecovery
          onBack={returnToLogin}
          onPhaseChange={(phase) => {
            setAnnouncement(recoveryAnnouncement(phase));
            if (phase === "forgot-sent" || phase === "reset-success") {
              setTransientView({ routeIdentity, view: phase });
            } else {
              setTransientView(null);
              if (phase === "forgot") {
                navigate(
                  { pathname: "/login", search: authSearchFor("forgot") },
                  { replace: true },
                );
              }
            }
          }}
          phase={view}
          requestPasswordReset={forgot.mutateAsync}
          resetPassword={async (values) => {
            const result = await reset.mutateAsync(values);
            queryClient.setQueryData<MeResponse | null>(authQueryKeys.me, null);
            return result;
          }}
          resetToken={resetToken}
        />
      ) : (
        <EmailAuthForm
          googleErrorCode={googleErrorCode}
          mode={view}
          onAuthenticated={finishAuthentication}
          onForgotPassword={() => {
            setAnnouncement("已打开密码重置表单。");
            setTransientView(null);
            navigate({ pathname: "/login", search: authSearchFor("forgot") });
          }}
          onModeChange={changeMode}
          redirectPath={redirectPath}
          submitLogin={login.mutateAsync}
          submitRegister={register.mutateAsync}
        />
      )}
    </AuthFrame>
  );
}
