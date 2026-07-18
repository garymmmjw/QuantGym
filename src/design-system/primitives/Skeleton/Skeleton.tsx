import type { CSSProperties, HTMLAttributes } from "react";

import styles from "./Skeleton.module.css";

export type SkeletonVariant = "text" | "rectangle" | "circle";

export type SkeletonProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "aria-hidden" | "aria-label" | "role"
> & {
  readonly height?: number | string;
  readonly label?: string;
  readonly lines?: number;
  readonly variant?: SkeletonVariant;
  readonly width?: number | string;
};

type SkeletonProperties = CSSProperties & {
  "--qg-skeleton-height": string;
  "--qg-skeleton-width": string;
};

const toCssSize = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value;

export function Skeleton({
  className,
  height,
  label,
  lines = 1,
  style,
  variant = "rectangle",
  width = "100%",
  ...skeletonProps
}: SkeletonProps) {
  const lineCount = Math.max(1, Math.floor(lines));
  const isMultiLine = variant === "text" && lineCount > 1;
  const defaultHeight = variant === "circle" ? "3rem" : variant === "text" ? "1rem" : "4rem";
  const skeletonStyle: SkeletonProperties = {
    ...style,
    "--qg-skeleton-height": toCssSize(height ?? defaultHeight),
    "--qg-skeleton-width": toCssSize(width),
  };
  const classes = [
    styles.root,
    styles[variant],
    isMultiLine ? styles.multiLine : undefined,
    className,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return (
    <div
      {...skeletonProps}
      aria-hidden={label === undefined ? "true" : undefined}
      aria-label={label}
      className={classes}
      role={label === undefined ? undefined : "status"}
      style={skeletonStyle}
    >
      {isMultiLine
        ? Array.from({ length: lineCount }, (_, index) => (
            <span
              key={index}
              className={[styles.line, index === lineCount - 1 ? styles.lastLine : undefined]
                .filter((value): value is string => Boolean(value))
                .join(" ")}
            />
          ))
        : null}
    </div>
  );
}
