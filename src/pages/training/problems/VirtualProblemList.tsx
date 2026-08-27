import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Button } from "../../../design-system/primitives/Button";
import { EmptyState } from "../../../design-system/patterns/EmptyState";
import type {
  ProblemDifficulty,
  ProblemStatus,
  ProblemSummary,
} from "../../../domains/problems/problems.schema";
import styles from "./ProblemsWorkspace.module.css";

type VirtualListStyle = CSSProperties & Readonly<{
  "--qg-problem-list-size": string;
}>;

type VirtualRowStyle = CSSProperties & Readonly<{
  "--qg-problem-row-start": string;
}>;

export type VirtualProblemListCopy = Readonly<{
  attemptCount: (count: number) => string;
  bestScore: (score: number) => string;
  completed: string;
  difficultyLabels: Readonly<Record<ProblemDifficulty, string>>;
  emptyDescription: string;
  emptyTitle: string;
  favorite: string;
  inProgress: string;
  loadingLabel: string;
  resultCount: (count: number) => string;
  sortLabel: string;
  unfavorite: string;
}>;

const defaultCopy: VirtualProblemListCopy = {
  attemptCount: (count) => `${count} 次尝试`,
  bestScore: (score) => `最高 ${score} 分`,
  completed: "已完成",
  difficultyLabels: {
    Easy: "简单",
    Hard: "困难",
    Medium: "中等",
  },
  emptyDescription: "调整搜索或筛选条件，找到下一道适合你的训练题。",
  emptyTitle: "没有找到匹配题目",
  favorite: "收藏题目",
  inProgress: "进行中",
  loadingLabel: "正在载入题目",
  resultCount: (count) => `显示 ${count} 题`,
  sortLabel: "默认排序",
  unfavorite: "取消收藏",
};

const statusLabel = (
  status: ProblemStatus,
  copy: VirtualProblemListCopy,
): string | null => {
  if (status === "completed") return copy.completed;
  if (status === "in_progress") return copy.inProgress;
  return null;
};

const problemTitle = (
  problem: ProblemSummary,
  language: "en" | "zh-CN",
): string => language === "en"
  ? problem.titleEn ?? problem.titleZh ?? "Untitled problem"
  : problem.titleZh ?? problem.titleEn ?? "未命名题目";

const secondaryTitle = (
  problem: ProblemSummary,
  language: "en" | "zh-CN",
): string | null => {
  if (problem.titleZh === null || problem.titleEn === null) return null;
  if (problem.titleZh === problem.titleEn) return null;
  return language === "en" ? problem.titleZh : problem.titleEn;
};

export type VirtualProblemListProps = Readonly<{
  items: readonly ProblemSummary[];
  onSelect: (problem: ProblemSummary) => void;
  selectedId: string | null;
  ariaLabel?: string;
  className?: string;
  copy?: VirtualProblemListCopy;
  emptyActionLabel?: string;
  estimatedRowHeight?: number;
  favoriteDisabled?: boolean;
  footer?: ReactNode;
  initialScrollOffset?: number;
  isLoading?: boolean;
  language?: "en" | "zh-CN";
  loadingState?: ReactNode;
  onClearFilters?: () => void;
  onScrollOffsetChange?: (offset: number) => void;
  onToggleFavorite?: (problem: ProblemSummary) => void;
  ordinalOffset?: number;
  selectedControlRef?: RefObject<HTMLButtonElement | null>;
}>;

export function VirtualProblemList({
  ariaLabel = "题目列表",
  className,
  copy = defaultCopy,
  emptyActionLabel = "清除筛选",
  estimatedRowHeight = 88,
  favoriteDisabled = false,
  footer,
  initialScrollOffset = 0,
  isLoading = false,
  items,
  language = "zh-CN",
  loadingState,
  onClearFilters,
  onScrollOffsetChange,
  onSelect,
  onToggleFavorite,
  ordinalOffset = 0,
  selectedControlRef,
  selectedId,
}: VirtualProblemListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastSelectedIdRef = useRef(selectedId);
  const classes = [styles.listCard, className].filter(Boolean).join(" ");
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is the approved list virtualization contract.
  const virtualizer = useVirtualizer({
    count: items.length,
    estimateSize: () => estimatedRowHeight,
    getItemKey: (index) => items[index]?.id ?? index,
    getScrollElement: () => scrollRef.current,
    initialOffset: initialScrollOffset,
    initialRect: { height: 560, width: 420 },
    overscan: 6,
  });
  const virtualRows = virtualizer.getVirtualItems();

  useEffect(() => {
    if (selectedId !== null) lastSelectedIdRef.current = selectedId;
  }, [selectedId]);

  const moveSelection = (currentIndex: number, targetIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(items.length - 1, targetIndex));
    if (clampedIndex === currentIndex || items.length === 0) return;
    const nextProblem = items[clampedIndex];
    if (nextProblem === undefined) return;
    virtualizer.scrollToIndex(clampedIndex, { align: "auto" });
    onSelect(nextProblem);
    requestAnimationFrame(() => {
      (rowRefs.current.get(nextProblem.id) ?? scrollRef.current)?.focus();
    });
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(index, index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(index, index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveSelection(index, 0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveSelection(index, items.length - 1);
    }
  };

  return (
    <section aria-label={ariaLabel} className={classes}>
      <header className={styles.listHeader}>
        <strong data-qg-metric>{copy.resultCount(items.length)}</strong>
        <span>{copy.sortLabel}</span>
      </header>

      {isLoading ? (
        <div aria-label={copy.loadingLabel} className={styles.listLoading} role="status">
          {loadingState ?? copy.loadingLabel}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          className={styles.listEmpty ?? ""}
          description={copy.emptyDescription}
          headingLevel={3}
          mascot="search"
          mascotAlt=""
          mascotSize="small"
          title={copy.emptyTitle}
          {...(onClearFilters === undefined ? {} : {
            action: <Button onClick={onClearFilters}>{emptyActionLabel}</Button>,
          })}
        />
      ) : (
        <div
          ref={scrollRef}
          className={styles.listScroller}
          onScroll={(event) => onScrollOffsetChange?.(event.currentTarget.scrollTop)}
          tabIndex={-1}
        >
          <ol
            className={styles.virtualList}
            style={{
              "--qg-problem-list-size": `${virtualizer.getTotalSize()}px`,
            } as VirtualListStyle}
          >
            {virtualRows.map((virtualRow) => {
              const problem = items[virtualRow.index];
              if (problem === undefined) return null;
              const selected = problem.id === selectedId;
              const progressLabel = statusLabel(problem.progress.status, copy);
              const secondary = secondaryTitle(problem, language);
              return (
                <li
                  key={problem.id}
                  ref={virtualizer.measureElement}
                  aria-posinset={virtualRow.index + 1}
                  aria-setsize={items.length}
                  className={styles.virtualRow}
                  data-index={virtualRow.index}
                  data-selected={selected || undefined}
                  style={{
                    "--qg-problem-row-start": `${virtualRow.start}px`,
                  } as VirtualRowStyle}
                >
                  <span className={styles.problemOrdinal} data-qg-metric>
                    {ordinalOffset + virtualRow.index + 1}
                  </span>
                  <button
                    ref={(node) => {
                      if (node === null) {
                        const previousNode = rowRefs.current.get(problem.id);
                        rowRefs.current.delete(problem.id);
                        if (
                          previousNode !== undefined
                          && selectedControlRef?.current === previousNode
                        ) {
                          selectedControlRef.current = null;
                        }
                      } else {
                        rowRefs.current.set(problem.id, node);
                      }
                      if (
                        node !== null
                        && (selected || lastSelectedIdRef.current === problem.id)
                        && selectedControlRef !== undefined
                      ) {
                        selectedControlRef.current = node;
                      }
                    }}
                    aria-current={selected ? "true" : undefined}
                    className={styles.problemSelect}
                    onClick={() => onSelect(problem)}
                    onKeyDown={(event) => handleRowKeyDown(event, virtualRow.index)}
                    type="button"
                  >
                    <span className={styles.problemTitleLine}>
                      <strong>{problemTitle(problem, language)}</strong>
                      {progressLabel === null ? null : (
                        <span className={styles.progressLabel} data-status={problem.progress.status}>
                          <span aria-hidden="true">{problem.progress.status === "completed" ? "✓" : "•"}</span>
                          {progressLabel}
                        </span>
                      )}
                    </span>
                    {secondary === null ? null : (
                      <span className={styles.problemSecondaryTitle}>{secondary}</span>
                    )}
                    <span className={styles.problemMetaLine}>
                      <span>{problem.category}</span>
                      <span>{problem.source.name}</span>
                      {problem.hot100 ? <span>HOT 100</span> : null}
                    </span>
                  </button>
                  <span
                    className={styles.difficultyBadge}
                    data-difficulty={problem.difficulty.toLowerCase()}
                  >
                    {copy.difficultyLabels[problem.difficulty]}
                  </span>
                  <span className={styles.problemPerformance} data-qg-metric>
                    {problem.progress.bestScore === null
                      ? copy.attemptCount(problem.progress.attemptCount)
                      : copy.bestScore(problem.progress.bestScore)}
                  </span>
                  {onToggleFavorite === undefined ? null : (
                    <button
                      aria-label={problem.favorite.favorite ? copy.unfavorite : copy.favorite}
                      aria-pressed={problem.favorite.favorite}
                      className={styles.favoriteControl}
                      disabled={favoriteDisabled}
                      onClick={() => onToggleFavorite(problem)}
                      type="button"
                    >
                      <span aria-hidden="true">{problem.favorite.favorite ? "★" : "☆"}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {footer === undefined ? null : <footer className={styles.listFooter}>{footer}</footer>}
    </section>
  );
}
