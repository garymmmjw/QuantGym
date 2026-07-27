import { useId, type ReactNode } from "react";

import { Skeleton } from "../../primitives/Skeleton";
import styles from "./Metric.module.css";

export type MetricTone = "neutral" | "positive" | "warning" | "reward";

export type MetricProps = Readonly<{
  label: ReactNode;
  value: ReactNode;
  ariaLabel?: string;
  className?: string;
  detail?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  prefix?: ReactNode;
  tone?: MetricTone;
  trend?: ReactNode;
}>;

export function Metric({
  ariaLabel,
  className,
  detail,
  label,
  loading = false,
  loadingLabel = "Loading metric",
  prefix,
  tone = "neutral",
  trend,
  value,
}: MetricProps) {
  const labelId = useId();
  const classes = [styles.root, styles[tone], className].filter(Boolean).join(" ");

  return (
    <section
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel === undefined ? labelId : undefined}
      className={classes}
      data-metric-tone={tone}
    >
      <div className={styles.labelRow}>
        {prefix === undefined ? null : <span aria-hidden="true" className={styles.prefix}>{prefix}</span>}
        <h3 className={styles.label} id={labelId}>{label}</h3>
      </div>
      {loading ? (
        <div className={styles.loading} role="status" aria-label={loadingLabel}>
          <Skeleton height="2rem" width="58%" />
          <Skeleton height="1rem" width="76%" />
        </div>
      ) : (
        <>
          <div className={styles.valueRow}>
            <strong className={styles.value} data-qg-metric>{value}</strong>
            {trend === undefined ? null : <span className={styles.trend}>{trend}</span>}
          </div>
          {detail === undefined ? null : <p className={styles.detail}>{detail}</p>}
        </>
      )}
    </section>
  );
}
