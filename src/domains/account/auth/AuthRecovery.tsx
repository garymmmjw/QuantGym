import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "../../../design-system/primitives/Alert";
import { Button } from "../../../design-system/primitives/Button";
import { TextField } from "../../../design-system/primitives/TextField";
import { ApiError } from "../../../shared/api/errors";
import type { components } from "../../../shared/api/generated/schema";
import { AuthMutationError } from "./auth.mutations";
import { forgotPasswordSchema } from "./auth.schema";
import styles from "./auth.module.css";

type ForgotPasswordRequest = components["schemas"]["ForgotPasswordRequest"];
type ResetPasswordRequest = components["schemas"]["ResetPasswordRequest"];
type StatusResponse = components["schemas"]["StatusResponse"];

export type AuthRecoveryPhase = "forgot" | "forgot-sent" | "reset" | "reset-success";

export type AuthRecoveryProps = Readonly<{
  onBack: () => void;
  onPhaseChange: (phase: AuthRecoveryPhase) => void;
  phase: AuthRecoveryPhase;
  requestPasswordReset: (values: ForgotPasswordRequest) => Promise<StatusResponse>;
  resetPassword: (values: ResetPasswordRequest) => Promise<StatusResponse>;
  resetToken?: string | undefined;
}>;

const resetFormSchema = z.object({
  confirmPassword: z.string().min(1, "请再次输入新密码"),
  password: z.string().min(12, "新密码至少需要 12 位").max(128, "新密码不能超过 128 位"),
}).refine((values) => values.password === values.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

type ForgotValues = z.infer<typeof forgotPasswordSchema>;
type ResetValues = z.infer<typeof resetFormSchema>;

type RecoveryErrorAction = "back" | "request-new" | "retry";

type RecoveryErrorPresentation = Readonly<{
  action?: RecoveryErrorAction | undefined;
  actionLabel?: string | undefined;
  message: string;
  requestId?: string | undefined;
  title: string;
  tone: "danger" | "info" | "warning";
}>;

const recoveryError = (error: unknown): RecoveryErrorPresentation => {
  if (error instanceof AuthMutationError) {
    if (error.code === "PASSWORD_RESET_UNAVAILABLE") {
      return {
        action: "back",
        actionLabel: "返回登录",
        title: "邮件重置暂未开放",
        message: "当前预览环境尚未接入邮件发送服务。你仍可使用 Google 登录，或稍后再试。",
        requestId: error.requestId ?? undefined,
        tone: "warning",
      };
    }
    if (error.kind === "rate") {
      return {
        action: "retry",
        actionLabel: "再试一次",
        message: "请稍等片刻后再试。",
        requestId: error.requestId ?? undefined,
        title: "操作太频繁",
        tone: "warning",
      };
    }
    if (error.kind === "permission") {
      return {
        action: "retry",
        actionLabel: "重新验证并提交",
        message: "页面验证已过期，请重新提交以获取新的安全验证。",
        requestId: error.requestId ?? undefined,
        title: "需要重新验证",
        tone: "danger",
      };
    }
    if (error.kind === "conflict") {
      return {
        action: "request-new",
        actionLabel: "申请新链接",
        message: "请使用最近收到的重置链接。",
        requestId: error.requestId ?? undefined,
        title: "链接状态已变化",
        tone: "warning",
      };
    }
    if (error.kind === "offline") {
      return {
        action: "retry",
        actionLabel: "联网后重试",
        message: error.message,
        requestId: error.requestId ?? undefined,
        title: "当前处于离线状态",
        tone: "info",
      };
    }
    return {
      action: error.kind === "retryable" ? "retry" : undefined,
      actionLabel: error.kind === "retryable" ? "重试" : undefined,
      message: error.message,
      requestId: error.requestId ?? undefined,
      title: "未能完成操作",
      tone: error.kind === "invalid" ? "danger" : "warning",
    };
  }
  if (error instanceof ApiError) {
    if (error.code === "PASSWORD_RESET_UNAVAILABLE") {
      return {
        action: "back",
        actionLabel: "返回登录",
        title: "邮件重置暂未开放",
        message: "当前预览环境尚未接入邮件发送服务。你仍可使用 Google 登录，或稍后再试。",
        requestId: error.requestId ?? undefined,
        tone: "warning",
      };
    }
    if (error.status === 429) {
      return {
        action: "retry",
        actionLabel: "再试一次",
        message: "请稍等片刻后再试。",
        requestId: error.requestId ?? undefined,
        title: "操作太频繁",
        tone: "warning",
      };
    }
    if (error.status === 403) {
      return {
        action: "retry",
        actionLabel: "重新验证并提交",
        message: "页面验证已过期，请重新提交以获取新的安全验证。",
        requestId: error.requestId ?? undefined,
        title: "需要重新验证",
        tone: "danger",
      };
    }
    if (error.status === 409) {
      return {
        action: "request-new",
        actionLabel: "申请新链接",
        message: "请使用最近收到的重置链接。",
        requestId: error.requestId ?? undefined,
        title: "链接状态已变化",
        tone: "warning",
      };
    }
    return {
      action: error.retryable || error.status >= 500 ? "retry" : undefined,
      actionLabel: error.retryable || error.status >= 500 ? "重试" : undefined,
      message: error.message,
      requestId: error.requestId ?? undefined,
      title: "未能完成操作",
      tone: error.status >= 500 ? "warning" : "danger",
    };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      action: "retry",
      actionLabel: "联网后重试",
      message: "网络恢复后可直接重试，当前填写内容仍在。",
      title: "当前处于离线状态",
      tone: "info",
    };
  }
  return {
    action: "retry",
    actionLabel: "重试",
    message: "请确认网络后重试，当前填写内容仍在。",
    title: "连接暂时中断",
    tone: "warning",
  };
};

function ErrorDetail({ error }: Readonly<{ error: RecoveryErrorPresentation }>) {
  return (
    <span className={styles.errorDetail}>
      <span>{error.message}</span>
      {error.requestId === undefined ? null : (
        <span className={styles.requestId}>参考编号：{error.requestId}</span>
      )}
    </span>
  );
}

function ForgotPasswordForm({
  onBack,
  onSent,
  requestPasswordReset,
}: Readonly<{
  onBack: () => void;
  onSent: () => void;
  requestPasswordReset: AuthRecoveryProps["requestPasswordReset"];
}>) {
  const [requestError, setRequestError] = useState<ReturnType<typeof recoveryError> | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<ForgotValues>({
    defaultValues: { email: "" },
    mode: "onBlur",
    resolver: zodResolver(forgotPasswordSchema),
  });

  const submit = handleSubmit(async (values) => {
    setRequestError(null);
    try {
      await requestPasswordReset(values);
      onSent();
    } catch (error) {
      if (error instanceof ApiError || error instanceof AuthMutationError) {
        const message = error.fieldErrors.email?.[0];
        if (message !== undefined) setError("email", { message, type: "server" });
      }
      setRequestError(recoveryError(error));
    }
  });

  return (
    <form className={styles.formStack} noValidate onSubmit={submit}>
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
      {requestError === null ? null : (
        <Alert
          action={requestError.actionLabel === undefined ? undefined : (
            <Button
              className={styles.alertActionButton}
              size="small"
              type={requestError.action === "back" ? "button" : "submit"}
              variant="secondary"
              onClick={requestError.action === "back" ? onBack : undefined}
            >
              {requestError.actionLabel}
            </Button>
          )}
          title={requestError.title}
          tone={requestError.tone}
        >
          <ErrorDetail error={requestError} />
        </Alert>
      )}
      <Button
        fullWidth
        isLoading={isSubmitting}
        loadingLabel="正在发送"
        size="large"
        type="submit"
      >
        发送重置链接
      </Button>
      <button
        className={styles.backButton}
        disabled={isSubmitting}
        type="button"
        onClick={onBack}
      >
        ← 返回登录
      </button>
    </form>
  );
}

function ResetPasswordForm({
  onBack,
  onCompleted,
  onRequestNewReset,
  resetPassword,
  resetToken,
}: Readonly<{
  onBack: () => void;
  onCompleted: () => void;
  onRequestNewReset: () => void;
  resetPassword: AuthRecoveryProps["resetPassword"];
  resetToken?: string | undefined;
}>) {
  const [requestError, setRequestError] = useState<ReturnType<typeof recoveryError> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<ResetValues>({
    defaultValues: { confirmPassword: "", password: "" },
    mode: "onBlur",
    resolver: zodResolver(resetFormSchema),
  });

  const submit = handleSubmit(async (values) => {
    if (resetToken === undefined) return;
    setRequestError(null);
    try {
      await resetPassword({ password: values.password, token: resetToken });
      onCompleted();
    } catch (error) {
      if (error instanceof ApiError || error instanceof AuthMutationError) {
        const message = error.fieldErrors.password?.[0];
        if (message !== undefined) setError("password", { message, type: "server" });
      }
      setRequestError(recoveryError(error));
    }
  });

  const passwordToggle = (
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

  if (resetToken === undefined) {
    return (
      <div className={styles.formStack}>
        <Alert title="重置链接无效" tone="danger">
          这个链接缺少必要信息或已经损坏，请重新申请密码重置。
        </Alert>
        <Button fullWidth size="large" onClick={onRequestNewReset}>
          重新申请重置链接
        </Button>
        <button className={styles.backButton} type="button" onClick={onBack}>
          ← 返回登录
        </button>
      </div>
    );
  }

  return (
    <form className={styles.formStack} noValidate onSubmit={submit}>
      <TextField
        autoComplete="new-password"
        error={errors.password?.message}
        hint="至少 12 位，建议使用密码管理器生成。"
        label="新密码"
        maxLength={128}
        minLength={12}
        placeholder="至少 12 位"
        required
        trailingAdornment={passwordToggle}
        type={showPassword ? "text" : "password"}
        {...register("password")}
      />
      <TextField
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        label="确认新密码"
        maxLength={128}
        minLength={12}
        placeholder="再次输入新密码"
        required
        type={showPassword ? "text" : "password"}
        {...register("confirmPassword")}
      />
      {requestError === null ? null : (
        <Alert
          action={requestError.actionLabel === undefined ? undefined : (
            <Button
              className={styles.alertActionButton}
              size="small"
              type={requestError.action === "retry" ? "submit" : "button"}
              variant="secondary"
              onClick={requestError.action === "request-new" ? onRequestNewReset : (
                requestError.action === "back" ? onBack : undefined
              )}
            >
              {requestError.actionLabel}
            </Button>
          )}
          title={requestError.title}
          tone={requestError.tone}
        >
          <ErrorDetail error={requestError} />
        </Alert>
      )}
      <Button
        fullWidth
        isLoading={isSubmitting}
        loadingLabel="正在更新密码"
        size="large"
        type="submit"
      >
        设置新密码
      </Button>
    </form>
  );
}

export function AuthRecovery({
  onBack,
  onPhaseChange,
  phase,
  requestPasswordReset,
  resetPassword,
  resetToken,
}: AuthRecoveryProps) {
  if (phase === "forgot-sent") {
    return (
      <div className={styles.recoveryResult}>
        <span aria-hidden="true" className={styles.resultIcon}>✓</span>
        <h1 className={styles.cardTitle}>检查你的邮箱</h1>
        <p className={styles.cardSubtitle}>
          如果该邮箱已注册，我们会发送一封重置邮件。链接将在 30 分钟后失效。
        </p>
        <Button fullWidth size="large" onClick={onBack}>返回登录</Button>
      </div>
    );
  }

  if (phase === "reset-success") {
    return (
      <div className={styles.recoveryResult}>
        <span aria-hidden="true" className={styles.resultIcon}>✓</span>
        <h1 className={styles.cardTitle}>密码已更新</h1>
        <p className={styles.cardSubtitle}>所有旧登录会话已安全退出，请使用新密码重新登录。</p>
        <Button fullWidth size="large" onClick={onBack}>返回登录</Button>
      </div>
    );
  }

  const isReset = phase === "reset";
  return (
    <div className={styles.authContent}>
      <header className={styles.cardHeader}>
        <p className={styles.eyebrow}>ACCOUNT RECOVERY</p>
        <h1 className={styles.cardTitle}>{isReset ? "设置新密码" : "重置密码"}</h1>
        <p className={styles.cardSubtitle}>
          {isReset ? "创建一个新的安全密码。" : "输入注册邮箱，我们会发送安全重置链接。"}
        </p>
      </header>
      {isReset ? (
        <ResetPasswordForm
          onBack={onBack}
          onRequestNewReset={() => onPhaseChange("forgot")}
          resetPassword={resetPassword}
          resetToken={resetToken}
          onCompleted={() => onPhaseChange("reset-success")}
        />
      ) : (
        <ForgotPasswordForm
          onBack={onBack}
          requestPasswordReset={requestPasswordReset}
          onSent={() => onPhaseChange("forgot-sent")}
        />
      )}
    </div>
  );
}
