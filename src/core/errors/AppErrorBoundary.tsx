import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";

import {
  RecoveryPanel,
  type RecoveryState,
} from "../../design-system/patterns/RecoveryPanel";
import { ApiError } from "../../shared/api/errors";

export type AppErrorBoundaryResetReason = "keys" | "user";

export type AppErrorBoundaryResetDetails = Readonly<{
  error: Error;
  reason: AppErrorBoundaryResetReason;
}>;

export type AppErrorBoundaryCopy = Readonly<{
  actionLabel?: ReactNode;
  ariaLabel?: string;
  busyLabel?: string;
  message?: ReactNode;
  referenceLabel?: ReactNode;
  title?: ReactNode;
}>;

type AppErrorBoundaryProps = Readonly<{
  children: ReactNode;
  classifyError?: (error: Error) => RecoveryState;
  copy?: AppErrorBoundaryCopy;
  copyForState?: (state: RecoveryState, error: Error) => AppErrorBoundaryCopy;
  onError?: (error: Error, info: ErrorInfo) => void;
  onReturn?: () => void;
  onReset?: (details: AppErrorBoundaryResetDetails) => Promise<void> | void;
  onSignIn?: () => void;
  resetKeys?: readonly unknown[];
}>;

type AppErrorBoundaryState = Readonly<{
  error: Error | null;
  isResetting: boolean;
  resetAttempt: number;
}>;

const resetKeysChanged = (
  previous: readonly unknown[] | undefined,
  current: readonly unknown[] | undefined,
) => {
  if (previous === current) return false;
  if (previous === undefined || current === undefined || previous.length !== current.length) return true;
  return previous.some((value, index) => !Object.is(value, current[index]));
};

const defaultRecoveryState = (error: Error): RecoveryState => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline-draft";
  if (!(error instanceof ApiError)) return "recoverable-error";
  if (error.status === 401 || error.status === 403) return "permission-denied";
  if (error.status === 409) return "stale-version-conflict";
  if (error.retryable || error.status >= 500) return "recoverable-error";
  return "non-recoverable-error";
};

const requestIdFrom = (error: Error) => (
  error instanceof ApiError ? error.requestId : null
);

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public override state: AppErrorBoundaryState = {
    error: null,
    isResetting: false,
    resetAttempt: 0,
  };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error, isResetting: false, resetAttempt: 0 };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  public override componentDidUpdate(previousProps: AppErrorBoundaryProps) {
    if (
      this.state.error !== null
      && !this.state.isResetting
      && resetKeysChanged(previousProps.resetKeys, this.props.resetKeys)
    ) {
      void this.reset("keys");
    }
  }

  private readonly reset = async (reason: AppErrorBoundaryResetReason) => {
    const error = this.state.error;
    if (error === null || this.state.isResetting) return;
    this.setState({ isResetting: true });

    if (this.props.onReset === undefined) {
      if (reason === "keys") {
        this.setState((state) => ({
          error: null,
          isResetting: false,
          resetAttempt: state.resetAttempt + 1,
        }));
        return;
      }
      window.location.reload();
      this.setState({ isResetting: false });
      return;
    }

    try {
      await this.props.onReset({ error, reason });
      this.setState((state) => ({
        error: null,
        isResetting: false,
        resetAttempt: state.resetAttempt + 1,
      }));
    } catch {
      this.setState({ isResetting: false });
    }
  };

  public override render() {
    if (this.state.error === null) {
      return <Fragment key={this.state.resetAttempt}>{this.props.children}</Fragment>;
    }
    const recoveryState = (this.props.classifyError ?? defaultRecoveryState)(this.state.error);
    const copy = this.props.copyForState?.(recoveryState, this.state.error) ?? this.props.copy;
    const reset = () => void this.reset("user");
    const optionalStringCopy = {
      ...(copy?.ariaLabel === undefined ? {} : { ariaLabel: copy.ariaLabel }),
      ...(copy?.busyLabel === undefined ? {} : { busyLabel: copy.busyLabel }),
    };
    return (
      <main>
        <RecoveryPanel
          {...optionalStringCopy}
          state={recoveryState}
          actionLabel={copy?.actionLabel}
          busy={this.state.isResetting}
          message={copy?.message}
          onReload={reset}
          onRetry={reset}
          onReturn={this.props.onReturn ?? reset}
          onSignIn={this.props.onSignIn ?? reset}
          referenceLabel={copy?.referenceLabel}
          requestId={requestIdFrom(this.state.error)}
          title={copy?.title}
        />
      </main>
    );
  }
}
