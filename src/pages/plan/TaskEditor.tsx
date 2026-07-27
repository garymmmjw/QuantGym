import { useId, useMemo, useState, type FormEvent } from "react";

import type { PlanTaskChanges } from "../../domains/plan/plan.mutations";
import type { OfficialPlanTask } from "../../domains/plan/plan.schema";
import { Button } from "../../design-system/primitives/Button";
import { TextField } from "../../design-system/primitives/TextField";
import type { AppLanguage } from "../../shared/i18n";
import { localizedPlanTaskContent } from "./plan.model";
import styles from "./TaskEditor.module.css";

type TaskEditorValue = Readonly<{
  detail: string;
  estimatedMinutes: string;
  scheduledFor: string;
  sortOrder: string;
  title: string;
}>;

type TaskEditorErrors = Partial<Record<keyof TaskEditorValue, string>>;

export type TaskEditorProps = Readonly<{
  language: AppLanguage;
  onCancel: () => void;
  onSubmit: (changes: PlanTaskChanges) => void;
  task: OfficialPlanTask;
  disabled?: boolean;
  id?: string;
  isSubmitting?: boolean;
}>;

const copyByLanguage = {
  en: {
    cancel: "Cancel",
    description: "Change only this task. The current plan and task versions are verified when you save.",
    detail: "Task notes",
    detailHint: "Optional, up to 2,000 characters",
    edit: "Edit task",
    estimatedMinutes: "Estimated minutes",
    noChanges: "Make at least one change before saving.",
    order: "Task order",
    orderHint: "1 is the first task on the board",
    save: "Save changes",
    saving: "Saving task",
    scheduledFor: "Scheduled date",
    title: "Task title",
    validation: {
      detail: "Task notes must be 2,000 characters or fewer and use supported characters.",
      estimatedMinutes: "Enter a whole number from 1 to 1,440, or leave it empty.",
      order: "Enter a whole number from 1 to 2,147,483,648.",
      scheduledFor: "Use a date in YYYY-MM-DD format, or leave it empty.",
      title: "Enter a title from 1 to 240 supported characters.",
    },
  },
  "zh-CN": {
    cancel: "取消",
    description: "这里只修改当前任务；保存时会同时校验最新计划版本与任务版本。",
    detail: "任务说明",
    detailHint: "选填，最多 2,000 个字符",
    edit: "编辑任务",
    estimatedMinutes: "预计分钟数",
    noChanges: "请至少修改一项内容后再保存。",
    order: "任务顺序",
    orderHint: "1 表示看板中的第一项任务",
    save: "保存更改",
    saving: "正在保存任务",
    scheduledFor: "计划日期",
    title: "任务标题",
    validation: {
      detail: "任务说明不能超过 2,000 个字符，且不能包含不支持的字符。",
      estimatedMinutes: "请输入 1 至 1,440 的整数，或留空。",
      order: "请输入 1 至 2,147,483,648 的整数。",
      scheduledFor: "请使用 YYYY-MM-DD 日期格式，或留空。",
      title: "请输入 1 至 240 个受支持字符的标题。",
    },
  },
} as const;

const initialValue = (
  task: OfficialPlanTask,
  language: AppLanguage,
): TaskEditorValue => {
  const content = localizedPlanTaskContent(task, language);
  return {
    detail: content.detail ?? "",
    estimatedMinutes: task.estimatedMinutes?.toString() ?? "",
    scheduledFor: task.scheduledFor ?? "",
    sortOrder: String(task.sortOrder + 1),
    title: content.title,
  };
};

const hasUnsupportedTitleCharacter = (value: string) => [...value].some((character) => {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint < 32 || codePoint === 127;
});

const hasUnsupportedDetailCharacter = (value: string) => [...value].some((character) => {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint < 32 && character !== "\n" && character !== "\t";
});

const parseTaskChanges = (
  value: TaskEditorValue,
  task: OfficialPlanTask,
  baseline: TaskEditorValue,
  language: AppLanguage,
): Readonly<{
  changes: PlanTaskChanges | null;
  errors: TaskEditorErrors;
}> => {
  const copy = copyByLanguage[language];
  const errors: TaskEditorErrors = {};
  const title = value.title.trim();
  const detail = value.detail.trim() === "" ? null : value.detail.trim();
  const scheduledFor = value.scheduledFor === "" ? null : value.scheduledFor;
  const estimatedMinutes = value.estimatedMinutes === ""
    ? null
    : Number(value.estimatedMinutes);
  const displayedOrder = Number(value.sortOrder);
  const sortOrder = displayedOrder - 1;

  if (title.length < 1 || title.length > 240 || hasUnsupportedTitleCharacter(title)) {
    errors.title = copy.validation.title;
  }
  if (
    detail !== null
    && (detail.length > 2_000 || hasUnsupportedDetailCharacter(detail))
  ) {
    errors.detail = copy.validation.detail;
  }
  if (
    scheduledFor !== null
    && !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u.test(scheduledFor)
  ) {
    errors.scheduledFor = copy.validation.scheduledFor;
  }
  if (
    estimatedMinutes !== null
    && (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1_440)
  ) {
    errors.estimatedMinutes = copy.validation.estimatedMinutes;
  }
  if (
    !Number.isInteger(displayedOrder)
    || displayedOrder < 1
    || displayedOrder > 2_147_483_648
  ) {
    errors.sortOrder = copy.validation.order;
  }
  if (Object.keys(errors).length > 0) return { changes: null, errors };

  const changes: {
    detail?: string | null;
    estimatedMinutes?: number | null;
    scheduledFor?: string | null;
    sortOrder?: number;
    title?: string;
  } = {};
  const baselineTitle = baseline.title.trim();
  const baselineDetail = baseline.detail.trim() === "" ? null : baseline.detail.trim();
  if (title !== baselineTitle) changes.title = title;
  if (detail !== baselineDetail) changes.detail = detail;
  if (scheduledFor !== task.scheduledFor) changes.scheduledFor = scheduledFor;
  if (estimatedMinutes !== task.estimatedMinutes) changes.estimatedMinutes = estimatedMinutes;
  if (sortOrder !== task.sortOrder) changes.sortOrder = sortOrder;
  return {
    changes: Object.keys(changes).length === 0 ? null : changes,
    errors,
  };
};

export function TaskEditor({
  disabled = false,
  id,
  isSubmitting = false,
  language,
  onCancel,
  onSubmit,
  task,
}: TaskEditorProps) {
  const copy = copyByLanguage[language];
  const headingId = useId();
  const detailId = useId();
  const detailHintId = `${detailId}-hint`;
  const detailErrorId = `${detailId}-error`;
  const baseline = useMemo(() => initialValue(task, language), [language, task]);
  const [value, setValue] = useState<TaskEditorValue>(() => baseline);
  const validation = useMemo(
    () => parseTaskChanges(value, task, baseline, language),
    [baseline, language, task, value],
  );
  const unavailable = disabled || isSubmitting;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!unavailable && validation.changes !== null) onSubmit(validation.changes);
  };

  return (
    <form
      aria-labelledby={headingId}
      className={styles.root}
      data-task-editor="true"
      id={id}
      noValidate
      onSubmit={handleSubmit}
    >
      <header className={styles.header}>
        <h4 id={headingId}>{copy.edit}</h4>
        <p>{copy.description}</p>
      </header>

      <TextField
        autoComplete="off"
        autoFocus
        disabled={unavailable}
        error={validation.errors.title}
        label={copy.title}
        maxLength={240}
        onChange={(event) => setValue({ ...value, title: event.currentTarget.value })}
        required
        value={value.title}
      />

      <div className={styles.textareaField}>
        <label htmlFor={detailId}>{copy.detail}</label>
        <textarea
          aria-describedby={validation.errors.detail === undefined
            ? detailHintId
            : `${detailHintId} ${detailErrorId}`}
          aria-invalid={validation.errors.detail === undefined ? undefined : true}
          className={styles.textarea}
          disabled={unavailable}
          id={detailId}
          maxLength={2_000}
          onChange={(event) => setValue({ ...value, detail: event.currentTarget.value })}
          rows={4}
          value={value.detail}
        />
        <span className={styles.hint} id={detailHintId}>{copy.detailHint}</span>
        {validation.errors.detail === undefined ? null : (
          <span className={styles.error} id={detailErrorId} role="alert">
            {validation.errors.detail}
          </span>
        )}
      </div>

      <div className={styles.fieldGrid}>
        <TextField
          disabled={unavailable}
          error={validation.errors.scheduledFor}
          label={copy.scheduledFor}
          onChange={(event) => setValue({ ...value, scheduledFor: event.currentTarget.value })}
          type="date"
          value={value.scheduledFor}
        />
        <TextField
          disabled={unavailable}
          error={validation.errors.estimatedMinutes}
          inputMode="numeric"
          label={copy.estimatedMinutes}
          max={1_440}
          min={1}
          onChange={(event) => setValue({ ...value, estimatedMinutes: event.currentTarget.value })}
          step={1}
          type="number"
          value={value.estimatedMinutes}
        />
        <TextField
          disabled={unavailable}
          error={validation.errors.sortOrder}
          hint={copy.orderHint}
          inputMode="numeric"
          label={copy.order}
          max={2_147_483_648}
          min={1}
          onChange={(event) => setValue({ ...value, sortOrder: event.currentTarget.value })}
          step={1}
          type="number"
          value={value.sortOrder}
        />
      </div>

      <div className={styles.actions}>
        <Button disabled={unavailable} onClick={onCancel} type="button" variant="ghost">
          {copy.cancel}
        </Button>
        <Button
          disabled={disabled || validation.changes === null}
          isLoading={isSubmitting}
          loadingLabel={copy.saving}
          type="submit"
        >
          {copy.save}
        </Button>
      </div>
      {validation.changes === null && Object.keys(validation.errors).length === 0 ? (
        <p className={styles.noChanges}>{copy.noChanges}</p>
      ) : null}
    </form>
  );
}
