import { useId, type ReactNode } from "react";

import styles from "./ResultSummary.module.css";

export type ResultSummaryStatus = "completed" | "partial" | "reward" | "error";

export type ResultSummaryMetric = Readonly<{
  label: ReactNode;
  value: ReactNode;
}>;

export type ResultSummaryReward = Readonly<{
  id: string;
  label: ReactNode;
  value: ReactNode;
}>;

export type ResultSummaryProps = Readonly<{
  status: ResultSummaryStatus;
  title: ReactNode;
  actions?: ReactNode;
  ariaLabel?: string;
  className?: string;
  description?: ReactNode;
  metrics?: readonly ResultSummaryMetric[];
  rewards?: readonly ResultSummaryReward[];
  scoreLabel?: ReactNode;
  scoreValue?: ReactNode;
}>;

const statusIcon: Readonly<Record<ResultSummaryStatus, string>> = {
  completed: "✓",
  partial: "↗",
  reward: "✦",
  error: "×",
};

export function ResultSummary({
  actions,
  ariaLabel,
  className,
  description,
  metrics = [],
  rewards = [],
  scoreLabel,
  scoreValue,
  status,
  title,
}: ResultSummaryProps) {
  const titleId = useId();
  const classes = [styles.root, styles[status], className].filter(Boolean).join(" ");
  const role = status === "error" ? "alert" : "status";

  return (
    <section
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel === undefined ? titleId : undefined}
      aria-live={status === "error" ? "assertive" : "polite"}
      className={classes}
      data-result-status={status}
      role={role}
    >
      <div aria-hidden="true" className={styles.icon}>{statusIcon[status]}</div>
      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title} id={titleId}>{title}</h2>
            {description === undefined ? null : (
              <p className={styles.description}>{description}</p>
            )}
          </div>
          {scoreValue === undefined ? null : (
            <div className={styles.score} data-qg-metric>
              <strong>{scoreValue}</strong>
              {scoreLabel === undefined ? null : <span>{scoreLabel}</span>}
            </div>
          )}
        </header>

        {metrics.length === 0 ? null : (
          <dl className={styles.metrics}>
            {metrics.map((metric, index) => (
              <div className={styles.metric} key={index}>
                <dt>{metric.label}</dt>
                <dd data-qg-metric>{metric.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {rewards.length === 0 ? null : (
          <ul aria-label="Rewards earned" className={styles.rewards}>
            {rewards.map((reward) => (
              <li className={styles.rewardItem} key={reward.id}>
                <span>{reward.label}</span>
                <strong data-qg-metric>{reward.value}</strong>
              </li>
            ))}
          </ul>
        )}

        {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
      </div>
    </section>
  );
}
