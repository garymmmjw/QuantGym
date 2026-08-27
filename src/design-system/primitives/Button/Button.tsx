import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Spinner } from "../Spinner";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "small" | "medium" | "large";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly fullWidth?: boolean;
  readonly isLoading?: boolean;
  readonly loadingLabel?: string;
  readonly size?: ButtonSize;
  readonly variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled = false,
    fullWidth = false,
    isLoading = false,
    loadingLabel = "Loading",
    size = "medium",
    type = "button",
    variant = "primary",
    ...buttonProps
  },
  ref,
) {
  const classes = [
    styles.root,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : undefined,
    className,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return (
    <button
      {...buttonProps}
      ref={ref}
      aria-busy={isLoading || undefined}
      className={classes}
      disabled={disabled || isLoading}
      type={type}
    >
      {isLoading ? (
        <>
          <Spinner className={styles.loadingSpinner} decorative size="small" />
          <span aria-live="polite" role="status">
            {loadingLabel}
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
