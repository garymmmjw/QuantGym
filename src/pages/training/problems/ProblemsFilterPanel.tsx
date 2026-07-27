import { useId, type FormEvent, type ReactNode } from "react";

import { Button } from "../../../design-system/primitives/Button";
import { TextField } from "../../../design-system/primitives/TextField";
import type {
  ProblemDifficulty,
  ProblemStatus,
} from "../../../domains/problems/problems.schema";
import type { ProblemsView } from "./problemsPage.model";
import styles from "./ProblemsWorkspace.module.css";

export type ProblemSourceOption = Readonly<{
  label: string;
  value: string;
}>;

export type ProblemsFilterValue = Readonly<{
  difficulty: ProblemDifficulty | null;
  query: string;
  source: string | null;
  status: ProblemStatus | null;
  view: ProblemsView;
}>;

export type ProblemsFilterCopy = Readonly<{
  all: string;
  clear: string;
  difficulty: string;
  difficultyLabels: Readonly<Record<ProblemDifficulty, string>>;
  queryLabel: string;
  queryPlaceholder: string;
  source: string;
  status: string;
  statusLabels: Readonly<Record<ProblemStatus, string>>;
  submit: string;
  view: string;
  viewLabels: Readonly<Record<ProblemsView, string>>;
}>;

const defaultCopy: ProblemsFilterCopy = {
  all: "全部",
  clear: "清除筛选",
  difficulty: "难度",
  difficultyLabels: {
    Easy: "简单",
    Hard: "困难",
    Medium: "中等",
  },
  queryLabel: "搜索题目",
  queryPlaceholder: "搜索题目名称 / 知识点…",
  source: "来源",
  status: "进度",
  statusLabels: {
    completed: "已完成",
    in_progress: "进行中",
    unstarted: "未开始",
  },
  submit: "搜索",
  view: "题集",
  viewLabels: {
    all: "全部题目",
    daily: "今日训练",
    hot100: "Hot 100",
    saved: "已收藏",
  },
};

const difficulties: readonly ProblemDifficulty[] = ["Easy", "Medium", "Hard"];
const statuses: readonly ProblemStatus[] = ["unstarted", "in_progress", "completed"];
const views: readonly ProblemsView[] = ["all", "daily", "hot100", "saved"];

export type ProblemsFilterPanelProps = Readonly<{
  onClear: () => void;
  onDifficultyChange: (difficulty: ProblemDifficulty | null) => void;
  onQueryChange: (query: string) => void;
  onSourceChange: (source: string | null) => void;
  onStatusChange: (status: ProblemStatus | null) => void;
  onViewChange: (view: ProblemsView) => void;
  sources: readonly ProblemSourceOption[];
  value: ProblemsFilterValue;
  ariaLabel?: string;
  busy?: boolean;
  className?: string;
  copy?: ProblemsFilterCopy;
  disabled?: boolean;
  onQuerySubmit?: () => void;
  resultSummary?: string;
}>;

const activeFilterCount = (value: ProblemsFilterValue): number => [
  value.query.trim() !== "",
  value.difficulty !== null,
  value.source !== null,
  value.status !== null,
  value.view !== "all",
].filter(Boolean).length;

export function ProblemsFilterPanel({
  ariaLabel = "筛选题目",
  busy = false,
  className,
  copy = defaultCopy,
  disabled = false,
  onClear,
  onDifficultyChange,
  onQueryChange,
  onQuerySubmit,
  onSourceChange,
  onStatusChange,
  onViewChange,
  resultSummary,
  sources,
  value,
}: ProblemsFilterPanelProps) {
  const summaryId = useId();
  const classes = [styles.filterPanel, className].filter(Boolean).join(" ");
  const isDisabled = disabled || busy;
  const count = activeFilterCount(value);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onQuerySubmit?.();
  };

  return (
    <form
      aria-busy={busy || undefined}
      aria-describedby={resultSummary === undefined ? undefined : summaryId}
      aria-label={ariaLabel}
      className={classes}
      onSubmit={handleSubmit}
      role="search"
    >
      <div className={styles.searchRow}>
        <TextField
          disabled={isDisabled}
          label={copy.queryLabel}
          leadingAdornment={<span aria-hidden="true">⌕</span>}
          maxLength={120}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder={copy.queryPlaceholder}
          type="search"
          value={value.query}
          visuallyHideLabel
        />
        {value.query === "" ? null : (
          <Button
            aria-label={`${copy.clear}：${copy.queryLabel}`}
            disabled={isDisabled}
            onClick={() => onQueryChange("")}
            size="small"
            variant="ghost"
          >
            <span aria-hidden="true">×</span>
          </Button>
        )}
        {onQuerySubmit === undefined ? null : (
          <Button disabled={isDisabled} isLoading={busy} size="small" type="submit">
            {copy.submit}
          </Button>
        )}
      </div>

      <FilterChipGroup label={copy.view}>
        {views.map((view) => (
          <FilterChip
            key={view}
            active={value.view === view}
            disabled={isDisabled}
            label={copy.viewLabels[view]}
            onClick={() => onViewChange(view)}
          />
        ))}
      </FilterChipGroup>

      <FilterChipGroup label={copy.difficulty}>
        <FilterChip
          active={value.difficulty === null}
          disabled={isDisabled}
          label={copy.all}
          onClick={() => onDifficultyChange(null)}
        />
        {difficulties.map((difficulty) => (
          <FilterChip
            key={difficulty}
            active={value.difficulty === difficulty}
            disabled={isDisabled}
            label={copy.difficultyLabels[difficulty]}
            onClick={() => onDifficultyChange(difficulty)}
            tone={difficulty.toLowerCase() as Lowercase<ProblemDifficulty>}
          />
        ))}
      </FilterChipGroup>

      <FilterChipGroup label={copy.status}>
        <FilterChip
          active={value.status === null}
          disabled={isDisabled}
          label={copy.all}
          onClick={() => onStatusChange(null)}
        />
        {statuses.map((status) => (
          <FilterChip
            key={status}
            active={value.status === status}
            disabled={isDisabled}
            label={copy.statusLabels[status]}
            onClick={() => onStatusChange(status)}
          />
        ))}
      </FilterChipGroup>

      <FilterChipGroup label={copy.source}>
        <FilterChip
          active={value.source === null}
          disabled={isDisabled}
          label={copy.all}
          onClick={() => onSourceChange(null)}
        />
        {sources.map((source) => (
          <FilterChip
            key={source.value}
            active={value.source === source.value}
            disabled={isDisabled}
            label={source.label}
            onClick={() => onSourceChange(source.value)}
          />
        ))}
      </FilterChipGroup>

      <footer className={styles.filterFooter}>
        <span aria-live="polite" id={summaryId}>{resultSummary}</span>
        <Button
          disabled={isDisabled || count === 0}
          onClick={onClear}
          size="small"
          variant="ghost"
        >
          {copy.clear}{count === 0 ? null : ` · ${count}`}
        </Button>
      </footer>
    </form>
  );
}

function FilterChipGroup({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <div aria-label={label} className={styles.filterGroup} role="group">
      <span aria-hidden="true" className={styles.filterGroupLabel}>{label}</span>
      <div className={styles.chipScroller}>{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  disabled,
  label,
  onClick,
  tone = "neutral",
}: Readonly<{
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "easy" | "medium" | "hard";
}>) {
  return (
    <button
      aria-pressed={active}
      className={styles.filterChip}
      data-tone={tone}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
