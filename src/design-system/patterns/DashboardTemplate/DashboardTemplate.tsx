import { useId, type ReactNode } from "react";

import { Skeleton } from "../../primitives/Skeleton";
import styles from "./DashboardTemplate.module.css";

export type DashboardTemplateStatus = "ready" | "loading";
export type DashboardTemplateLayout = "default" | "tablet-stacked";

export type DashboardTemplateProps = Readonly<{
  title: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
  aside?: ReactNode;
  asideLabel?: string;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  hero?: ReactNode;
  loadingLabel?: string;
  layout?: DashboardTemplateLayout;
  metrics?: ReactNode;
  metricsLabel?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  status?: DashboardTemplateStatus;
}>;

const DashboardLoadingState = ({ label }: Readonly<{ label: string }>) => (
  <div className={styles.loading} role="status" aria-label={label}>
    <span className={styles.visuallyHidden}>{label}</span>
    <div className={styles.loadingHero}>
      <Skeleton height="1rem" width="28%" />
      <Skeleton height="2rem" width="62%" />
      <Skeleton height="1rem" lines={2} variant="text" width="78%" />
    </div>
    <div className={styles.loadingMetrics}>
      <Skeleton height="6.5rem" />
      <Skeleton height="6.5rem" />
      <Skeleton height="6.5rem" />
    </div>
    <Skeleton height="16rem" />
  </div>
);

export function DashboardTemplate({
  ariaLabel,
  aside,
  asideLabel = "Supporting information",
  children,
  className,
  description,
  eyebrow,
  hero,
  layout = "default",
  loadingLabel = "Loading dashboard",
  metrics,
  metricsLabel = "Key metrics",
  primaryAction,
  secondaryAction,
  status = "ready",
  title,
}: DashboardTemplateProps) {
  const titleId = useId();
  const classes = [styles.root, className].filter(Boolean).join(" ");
  const hasActions = primaryAction !== undefined || secondaryAction !== undefined;

  return (
    <section
      aria-busy={status === "loading" || undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel === undefined ? titleId : undefined}
      className={classes}
      data-dashboard-layout={layout}
      data-dashboard-status={status}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          {eyebrow === undefined ? null : <p className={styles.eyebrow}>{eyebrow}</p>}
          <h1 className={styles.title} id={titleId}>{title}</h1>
          {description === undefined ? null : (
            <p className={styles.description}>{description}</p>
          )}
        </div>
        {hasActions ? (
          <div className={styles.actions}>
            {primaryAction}
            {secondaryAction}
          </div>
        ) : null}
      </header>

      {status === "loading" ? <DashboardLoadingState label={loadingLabel} /> : (
        <>
          {hero === undefined ? null : <div className={styles.hero}>{hero}</div>}
          {metrics === undefined ? null : (
            <section aria-label={metricsLabel} className={styles.metrics}>{metrics}</section>
          )}
          <div className={styles.body}>
            <div className={styles.primary}>{children}</div>
            {aside === undefined ? null : (
              <aside aria-label={asideLabel} className={styles.aside}>{aside}</aside>
            )}
          </div>
        </>
      )}
    </section>
  );
}
