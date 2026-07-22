import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { Alert } from "../../../design-system/primitives/Alert";
import { Button } from "../../../design-system/primitives/Button";
import { Tabs } from "../../../design-system/primitives/Tabs";
import { TextField } from "../../../design-system/primitives/TextField";
import { ApiError } from "../../../shared/api/errors";
import type { components } from "../../../shared/api/generated/schema";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { AuthMutationError } from "./auth.mutations";
import {
  googleAuthErrorPresentation,
  type GoogleAuthErrorCode,
} from "./auth.routing";
import { loginSchema, registerSchema } from "./auth.schema";
import styles from "./auth.module.css";

export type AuthMode = "login" | "register";

type LoginRequest = components["schemas"]["LoginRequest"];
type RegisterRequest = components["schemas"]["RegisterRequest"];
type AuthResponse = components["schemas"]["AuthResponse"];
type MeResponse = components["schemas"]["MeResponse"];

type AuthFormValues = {
  displayName: string;
  email: string;
  password: string;
};

export type EmailAuthFormProps = Readonly<{
  googleErrorCode?: GoogleAuthErrorCode | undefined;
  mode: AuthMode;
  onAuthenticated: (user: MeResponse) => void;
  onForgotPassword: () => void;
  onModeChange: (mode: AuthMode) => void;
  redirectPath: string;
  submitLogin: (values: LoginRequest) => Promise<AuthResponse>;
  submitRegister: (values: RegisterRequest) => Promise<AuthResponse>;
}>;

type ErrorPresentation = Readonly<{
  actionLabel?: string | undefined;
  message: string;
  requestId?: string | undefined;
  title: string;
  tone: "danger" | "info" | "warning";
}>;

export const AUTH_SUCCESS_FEEDBACK_MS = 1_200;

const presentError = (error: unknown): ErrorPresentation => {
  if (error instanceof AuthMutationError) {
    if (error.kind === "permission") {
      return {
        actionLabel: "重新验证并提交",
        message: "当前请求没有通过安全校验。请刷新页面后再试。",
        requestId: error.requestId ?? undefined,
        title: "需要重新验证",
        tone: "danger",
      };
    }
    if (error.kind === "conflict") {
      return {
        actionLabel: "使用当前内容重试",
        message: "页面状态已经更新，你填写的内容仍在，可以直接重新提交。",
        requestId: error.requestId ?? undefined,
        title: "信息已变化",
        tone: "warning",
      };
    }
    if (error.kind === "rate") {
      return {
        actionLabel: "再试一次",
        message: "尝试次数较多，请稍等片刻再继续。",
        requestId: error.requestId ?? undefined,
        title: "操作太频繁",
        tone: "warning",
      };
    }
    if (error.kind === "offline") {
      return {
        actionLabel: "联网后重试",
        message: error.message,
        requestId: error.requestId ?? undefined,
        title: "当前处于离线状态",
        tone: "info",
      };
    }
    return {
      actionLabel: error.kind === "retryable" ? "重试" : undefined,
      message: error.message,
      requestId: error.requestId ?? undefined,
      title: error.kind === "retryable" ? "服务暂时不可用" : "请检查输入",
      tone: error.kind === "retryable" ? "warning" : "danger",
    };
  }
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return {
        actionLabel: "重新验证并提交",
        message: "当前请求没有通过安全校验。请刷新页面后再试。",
        requestId: error.requestId ?? undefined,
        title: "需要重新验证",
        tone: "danger",
      };
    }
    if (error.status === 409) {
      return {
        actionLabel: "使用当前内容重试",
        message: "页面状态已经更新，你填写的内容仍在，可以直接重新提交。",
        requestId: error.requestId ?? undefined,
        title: "信息已变化",
        tone: "warning",
      };
    }
    if (error.status === 429) {
      return {
        actionLabel: "再试一次",
        message: "尝试次数较多，请稍等片刻再继续。",
        requestId: error.requestId ?? undefined,
        title: "操作太频繁",
        tone: "warning",
      };
    }
    if (error.retryable || error.status >= 500) {
      return {
        actionLabel: "重试",
        message: error.message,
        requestId: error.requestId ?? undefined,
        title: "服务暂时不可用",
        tone: "warning",
      };
    }
    return {
      message: error.message,
      requestId: error.requestId ?? undefined,
      title: "请检查输入",
      tone: "danger",
    };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      actionLabel: "联网后重试",
      message: "网络恢复后可以直接重试，当前填写内容已为你保留在此页面。",
      title: "当前处于离线状态",
      tone: "info",
    };
  }
  return {
    actionLabel: "重试",
    message: "连接暂时中断，当前填写内容仍在，请确认网络后重试。",
    title: "未能连接到服务",
    tone: "warning",
  };
};

const firstFieldMessage = (
  fieldErrors: Readonly<Record<string, readonly string[]>>,
  field: string,
) => fieldErrors[field]?.[0];

function AuthFormPanel({
  googleErrorCode,
  mode,
  onAuthenticated,
  onBusyChange,
  onForgotPassword,
  redirectPath,
  submitLogin,
  submitRegister,
}: Omit<EmailAuthFormProps, "onModeChange"> & Readonly<{
  onBusyChange: (busy: boolean) => void;
}>) {
  const [showPassword, setShowPassword] = useState(false);
  const [requestError, setRequestError] = useState<ErrorPresentation | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<MeResponse | null>(null);
  const activeSchema = mode === "login" ? loginSchema : registerSchema;
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<AuthFormValues>({
    defaultValues: mode === "login"
      ? { email: "", password: "" }
      : { displayName: "", email: "", password: "" },
    mode: "onBlur",
    resolver: zodResolver(activeSchema) as unknown as Resolver<AuthFormValues>,
  });

  useEffect(() => {
    if (authenticatedUser === null) return;
    const timer = window.setTimeout(
      () => onAuthenticated(authenticatedUser),
      AUTH_SUCCESS_FEEDBACK_MS,
    );
    return () => window.clearTimeout(timer);
  }, [authenticatedUser, onAuthenticated]);

  const submit = handleSubmit(async (values) => {
    onBusyChange(true);
    setRequestError(null);
    setSuccessMessage(null);
    setAuthenticatedUser(null);
    try {
      const response = mode === "login"
        ? await submitLogin({ email: values.email, password: values.password })
        : await submitRegister({
            displayName: values.displayName,
            email: values.email,
            password: values.password,
          });
      const message = mode === "login" ? "登录成功，正在进入训练空间。" : "账号创建成功，正在准备你的训练空间。";
      setSuccessMessage(message);
      setAuthenticatedUser(response.user);
    } catch (error) {
      onBusyChange(false);
      if (error instanceof ApiError || error instanceof AuthMutationError) {
        const fields = mode === "login"
          ? (["email", "password"] as const)
          : (["displayName", "email", "password"] as const);
        for (const field of fields) {
          const message = firstFieldMessage(error.fieldErrors, field);
          if (message !== undefined) setError(field, { message, type: "server" });
        }
      }
      setRequestError(presentError(error));
    }
  });

  const passwordAdornment = (
    <button
      aria-label={showPassword ? "隐藏密码" : "显示密码"}
      aria-pressed={showPassword}
      className={styles.passwordToggle}
      type="button"
      onClick={() => setShowPassword((visible) => !visible)}
    >
      {showPassword ? "隐藏" : "显示"}
    </button>
  );

  return (
    <form className={styles.formStack} noValidate onSubmit={submit}>
      {mode === "register" ? (
        <TextField
          autoComplete="name"
          error={errors.displayName?.message}
          label="名字"
          maxLength={120}
          placeholder="你希望我们怎么称呼你"
          required
          {...register("displayName")}
        />
      ) : null}
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email?.message}
        inputMode="email"
        label="邮箱"
        maxLength={320}
        placeholder="you@example.com"
        required
        spellCheck={false}
        {...register("email")}
      />
      <TextField
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        error={errors.password?.message}
        hint={mode === "register" ? "至少 12 位，建议使用密码管理器生成。" : undefined}
        label="密码"
        maxLength={128}
        minLength={mode === "login" ? 1 : 12}
        placeholder={mode === "login" ? "输入密码" : "至少 12 位"}
        required
        trailingAdornment={passwordAdornment}
        type={showPassword ? "text" : "password"}
        {...register("password")}
      />

      {mode === "login" ? (
        <div className={styles.forgotRow}>
          <button
            aria-label="忘记密码"
            className={styles.textAction}
            disabled={isSubmitting || authenticatedUser !== null}
            type="button"
            onClick={onForgotPassword}
          >
            忘记密码？
          </button>
        </div>
      ) : null}

      {requestError === null ? null : (
        <Alert
          action={requestError.actionLabel === undefined ? undefined : (
            <Button
              className={styles.alertActionButton}
              size="small"
              type="submit"
              variant="secondary"
            >
              {requestError.actionLabel}
            </Button>
          )}
          title={requestError.title}
          tone={requestError.tone}
        >
          <span className={styles.errorDetail}>
            <span>{requestError.message}</span>
            {requestError.requestId === undefined ? null : (
              <span className={styles.requestId}>参考编号：{requestError.requestId}</span>
            )}
          </span>
        </Alert>
      )}
      {successMessage === null ? null : (
        <Alert title="已完成" tone="success">{successMessage}</Alert>
      )}

      <Button
        disabled={authenticatedUser !== null}
        fullWidth
        isLoading={isSubmitting}
        loadingLabel={mode === "login" ? "正在登录" : "正在创建账号"}
        size="large"
        type="submit"
      >
        {mode === "login" ? "登录" : "创建账号"}
      </Button>

      <div aria-hidden="true" className={styles.divider}>
        <span>或</span>
      </div>
      <GoogleAuthButton
        disabled={isSubmitting || authenticatedUser !== null}
        isRetry={googleErrorCode !== undefined}
        redirectPath={redirectPath}
      />
      <p className={styles.legalNote}>
        私测阶段需要白名单邮箱。继续即表示你接受 QuantGym 的服务条款与隐私说明。
      </p>
    </form>
  );
}

export function EmailAuthForm({
  googleErrorCode,
  mode,
  onAuthenticated,
  onForgotPassword,
  onModeChange,
  redirectPath,
  submitLogin,
  submitRegister,
}: EmailAuthFormProps) {
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const panel = (
    <AuthFormPanel
      key={mode}
      googleErrorCode={googleErrorCode}
      mode={mode}
      onAuthenticated={onAuthenticated}
      onBusyChange={setIsAuthBusy}
      onForgotPassword={onForgotPassword}
      redirectPath={redirectPath}
      submitLogin={submitLogin}
      submitRegister={submitRegister}
    />
  );

  return (
    <div className={styles.authContent}>
      <header className={styles.cardHeader}>
        <p className={styles.eyebrow}>QUANTGYM ACCESS</p>
        <h1 className={styles.cardTitle}>{mode === "login" ? "欢迎回来" : "创建训练账号"}</h1>
        <p className={styles.cardSubtitle}>
          {mode === "login" ? "继续今天的量化训练。" : "从真实面试题开始建立你的优势。"}
        </p>
      </header>
      {googleErrorCode === undefined ? null : (
        <Alert
          className={styles.googleError}
          title={googleAuthErrorPresentation[googleErrorCode].title}
          tone="warning"
        >
          {googleAuthErrorPresentation[googleErrorCode].message}
        </Alert>
      )}
      <Tabs
        ariaLabel="选择登录或注册"
        className={styles.authTabs ?? ""}
        tabs={[
          {
            content: mode === "login" ? panel : null,
            disabled: isAuthBusy && mode !== "login",
            id: "login",
            label: "登录",
          },
          {
            content: mode === "register" ? panel : null,
            disabled: isAuthBusy && mode !== "register",
            id: "register",
            label: "注册",
          },
        ]}
        value={mode}
        onValueChange={(value) => {
          if (!isAuthBusy && (value === "login" || value === "register")) onModeChange(value);
        }}
      />
    </div>
  );
}
