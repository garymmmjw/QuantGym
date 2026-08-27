import type { OfficialPlanTask } from "../../domains/plan/plan.schema";
import { Button } from "../../design-system/primitives/Button";
import type { AppLanguage } from "../../shared/i18n";
import {
  formatPlanDate,
  localizedPlanTaskContent,
  planCopyFor,
  planTaskActionsFor,
  skillLabelFor,
} from "./plan.model";
import styles from "./PlanTaskCard.module.css";

export type PlanTaskPendingAction = "complete" | "edit" | "navigate" | "training";

export type PlanTaskCardProps = Readonly<{
  language: AppLanguage;
  task: OfficialPlanTask;
  disabled?: boolean;
  editing?: boolean;
  editorId?: string;
  editTriggerId?: string;
  onComplete?: (task: OfficialPlanTask) => void;
  onEdit?: (task: OfficialPlanTask) => void;
  onNavigate?: (route: string, task: OfficialPlanTask) => void;
  onStartTraining?: (problemId: string, task: OfficialPlanTask) => void;
  pendingAction?: PlanTaskPendingAction | null;
}>;

export function PlanTaskCard({
  disabled = false,
  editing = false,
  editorId,
  editTriggerId,
  language,
  onComplete,
  onEdit,
  onNavigate,
  onStartTraining,
  pendingAction = null,
  task,
}: PlanTaskCardProps) {
  const copy = planCopyFor(language);
  const content = localizedPlanTaskContent(task, language);
  const actions = planTaskActionsFor(task, language);
  const statusLabel = task.status === "completed"
    ? copy.statusCompleted
    : copy.statusOpen;
  const isBusy = pendingAction !== null;

  return (
    <article
      aria-busy={isBusy || undefined}
      className={styles.root}
      data-plan-task-status={task.status}
    >
      <header className={styles.header}>
        <span className={styles.status}>{statusLabel}</span>
        <h3 className={styles.title}>{content.title}</h3>
      </header>

      {content.detail === null || content.detail.trim() === "" ? null : (
        <p className={styles.detail}>{content.detail}</p>
      )}

      <dl className={styles.metadata}>
        {task.scheduledFor === null ? null : (
          <div>
            <dt className={styles.visuallyHidden}>{copy.scheduledTaskLabel}</dt>
            <dd>
              <time dateTime={task.scheduledFor} data-qg-metric>
                {copy.scheduledFor(formatPlanDate(task.scheduledFor, language))}
              </time>
            </dd>
          </div>
        )}
        {task.estimatedMinutes === null ? null : (
          <div>
            <dt className={styles.visuallyHidden}>{copy.taskDurationLabel}</dt>
            <dd data-qg-metric>{copy.estimatedMinutes(task.estimatedMinutes)}</dd>
          </div>
        )}
        {task.skillKey === null ? null : (
          <div>
            <dt>{copy.skillLabel}</dt>
            <dd>{skillLabelFor(task.skillKey, language)}</dd>
          </div>
        )}
      </dl>

      <TaskActions
        actions={actions}
        copy={copy}
        disabled={disabled}
        editing={editing}
        editorId={editorId}
        editTriggerId={editTriggerId}
        pendingAction={pendingAction}
        task={task}
        {...(onComplete === undefined ? {} : { onComplete })}
        {...(onEdit === undefined ? {} : { onEdit })}
        {...(onNavigate === undefined ? {} : { onNavigate })}
        {...(onStartTraining === undefined ? {} : { onStartTraining })}
      />
    </article>
  );
}

type TaskActionsProps = Readonly<{
  actions: ReturnType<typeof planTaskActionsFor>;
  copy: ReturnType<typeof planCopyFor>;
  disabled: boolean;
  editing: boolean;
  editorId: string | undefined;
  editTriggerId: string | undefined;
  pendingAction: PlanTaskPendingAction | null;
  task: OfficialPlanTask;
  onComplete?: (task: OfficialPlanTask) => void;
  onEdit?: (task: OfficialPlanTask) => void;
  onNavigate?: (route: string, task: OfficialPlanTask) => void;
  onStartTraining?: (problemId: string, task: OfficialPlanTask) => void;
}>;

function TaskActions({
  actions,
  copy,
  disabled,
  editing,
  editorId,
  editTriggerId,
  onComplete,
  onEdit,
  onNavigate,
  onStartTraining,
  pendingAction,
  task,
}: TaskActionsProps) {
  const hasTrainingAction = actions.training !== null && onStartTraining !== undefined;
  const hasNavigationAction = actions.navigation !== null && onNavigate !== undefined;
  const hasCompleteAction = actions.canComplete && onComplete !== undefined;
  const hasEditAction = task.status === "open" && onEdit !== undefined;
  if (!hasTrainingAction && !hasNavigationAction && !hasCompleteAction && !hasEditAction) {
    return null;
  }

  return (
    <div className={styles.actions}>
      {actions.training === null || onStartTraining === undefined ? null : (
        <Button
          disabled={disabled || pendingAction !== null}
          isLoading={pendingAction === "training"}
          loadingLabel={copy.startingTraining}
          onClick={() => onStartTraining(actions.training!.problemId, task)}
          size="small"
        >
          {actions.training.label}
        </Button>
      )}
      {actions.navigation === null || onNavigate === undefined ? null : (
        <Button
          disabled={disabled || pendingAction !== null}
          isLoading={pendingAction === "navigate"}
          loadingLabel={copy.openingTaskTarget}
          onClick={() => onNavigate(actions.navigation!.route, task)}
          size="small"
          variant="secondary"
        >
          {actions.navigation.label}
        </Button>
      )}
      {!actions.canComplete || onComplete === undefined ? null : (
        <Button
          disabled={disabled || pendingAction !== null}
          isLoading={pendingAction === "complete"}
          loadingLabel={copy.completingTask}
          onClick={() => onComplete(task)}
          size="small"
          variant={actions.navigation === null ? "primary" : "ghost"}
        >
          {copy.completeTask}
        </Button>
      )}
      {!hasEditAction ? null : (
        <Button
          aria-controls={editorId}
          aria-expanded={editing}
          disabled={disabled || pendingAction !== null}
          id={editTriggerId}
          isLoading={pendingAction === "edit"}
          loadingLabel={copy.editingTask}
          onClick={() => onEdit(task)}
          size="small"
          variant="ghost"
        >
          {copy.editTask}
        </Button>
      )}
    </div>
  );
}
