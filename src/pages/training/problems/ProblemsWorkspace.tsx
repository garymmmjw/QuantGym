import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "../../../design-system/primitives/Button";
import { Metric, type MetricTone } from "../../../design-system/patterns/Metric";
import {
  QuantyImage,
  type QuantyAssetName,
} from "../../../design-system/patterns/QuantyImage";
import styles from "./ProblemsWorkspace.module.css";

export type ProblemsWorkspaceView = "detail" | "list";

export type ProblemsWorkspaceMetric = Readonly<{
  id: string;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: MetricTone;
  trend?: ReactNode;
}>;

export type ProblemsWorkspaceProps = Readonly<{
  detail: ReactNode;
  filterPanel: ReactNode;
  list: ReactNode;
  mobileView: ProblemsWorkspaceView;
  onBackToList: () => void;
  backLabel?: string;
  className?: string;
  description?: ReactNode;
  detailLabel?: string;
  emptyDetail?: ReactNode;
  eyebrow?: ReactNode;
  mascot?: QuantyAssetName | null;
  mascotAlt?: string;
  metricsLabel?: string;
  metrics?: readonly ProblemsWorkspaceMetric[];
  returnFocusRef?: RefObject<HTMLElement | null>;
  statusPanel?: ReactNode;
  title?: ReactNode;
  workspaceLabel?: string;
}>;

export function ProblemsWorkspace({
  backLabel = "返回题目列表",
  className,
  description = "覆盖速算、概率、微积分、衍生品与编程的训练题库。",
  detail,
  detailLabel = "题目详情",
  emptyDetail,
  eyebrow = "TRAINING · 题库",
  filterPanel,
  list,
  mascot = "calculator",
  mascotAlt = "",
  metricsLabel = "题库概览",
  metrics = [],
  mobileView,
  onBackToList,
  returnFocusRef,
  statusPanel,
  title = <>题目 <span>Problems</span></>,
  workspaceLabel = "题目训练工作区",
}: ProblemsWorkspaceProps) {
  const detailRef = useRef<HTMLElement>(null);
  const previousViewRef = useRef<ProblemsWorkspaceView>(mobileView);
  const classes = [styles.workspace, className].filter(Boolean).join(" ");

  useEffect(() => {
    const previousView = previousViewRef.current;
    previousViewRef.current = mobileView;
    if (previousView === mobileView) return;
    if (mobileView === "detail") detailRef.current?.focus();
    else returnFocusRef?.current?.focus();
  }, [mobileView, returnFocusRef]);

  return (
    <div className={classes}>
      <header className={styles.workspaceHeader}>
        <div className={styles.workspaceHeading}>
          <p className={styles.workspaceEyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.workspaceDescription}>{description}</p>
        </div>
        {mascot === null ? null : (
          <QuantyImage
            alt={mascotAlt}
            asset={mascot}
            className={styles.workspaceMascot}
            priority
            prominence="supporting"
            size="small"
          />
        )}
        {metrics.length === 0 ? null : (
          <div aria-label={metricsLabel} className={styles.workspaceMetrics}>
            {metrics.map((metric) => (
              <Metric
                key={metric.id}
                className={styles.workspaceMetric ?? ""}
                detail={metric.detail}
                label={metric.label}
                tone={metric.tone ?? "neutral"}
                trend={metric.trend}
                value={metric.value}
              />
            ))}
          </div>
        )}
      </header>

      {statusPanel}

      <div
        className={styles.workspaceFilterPanel}
        data-mobile-view={mobileView}
      >
        {filterPanel}
      </div>

      <section
        aria-label={workspaceLabel}
        className={styles.workspaceGrid}
        data-mobile-view={mobileView}
      >
        <div className={styles.workspaceListPane}>
          {list}
        </div>
        <section
          ref={detailRef}
          aria-label={detailLabel}
          className={styles.workspaceDetailPane}
          tabIndex={-1}
        >
          <div className={styles.mobileReturn}>
            <Button onClick={onBackToList} variant="ghost">
              <span aria-hidden="true">←</span>{backLabel}
            </Button>
          </div>
          {detail ?? emptyDetail ?? (
            <div className={styles.emptyDetail}>
              <QuantyImage
                alt=""
                asset="calculator"
                prominence="supporting"
                size="small"
              />
              <div>
                <h2>选择一道题开始训练</h2>
                <p>题目、提示、作答与笔记会在这里展开。</p>
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
