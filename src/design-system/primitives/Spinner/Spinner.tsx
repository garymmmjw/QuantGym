import type { HTMLAttributes } from "react";

import styles from "./Spinner.module.css";

export type SpinnerSize = "small" | "medium" | "large";

export type SpinnerProps = Omit<HTMLAttributes<HTMLSpanElement>, "aria-label" | "role"> & {
  readonly decorative?: boolean;
  readonly label?: string;
  readonly size?: SpinnerSize;
};

export function Spinner({
  className,
  decorative = false,
  label = "Loading",
  size = "medium",
  ...spinnerProps
}: SpinnerProps) {
  const classes = [styles.root, styles[size], className]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return (
    <span
      {...spinnerProps}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className={classes}
      role={decorative ? undefined : "status"}
    />
  );
}
