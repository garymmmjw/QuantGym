import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { DashboardTemplate } from "../../design-system/patterns/DashboardTemplate";
import { EmptyState } from "../../design-system/patterns/EmptyState";
import { Pagination } from "../../design-system/patterns/Pagination";
import {
  RecoveryPanel,
  type RecoveryState,
} from "../../design-system/patterns/RecoveryPanel";
import { useCurrentUserQuery } from "../../domains/account/auth/auth.queries";
import {
  newSaveProblemNoteIntent,
  newSetProblemFavoriteIntent,
} from "../../domains/problems/problems.mutations";
import {
  problemQueryKeys,
  useProblemDetailQuery,
  useProblemsQuery,
} from "../../domains/problems/problems.queries";
import type {
  ProblemDetail,
  ProblemSummary,
} from "../../domains/problems/problems.schema";
import {
  newCompleteTrainingIntent,
  newRevealTrainingSolutionIntent,
  newStartTrainingIntent,
  newSubmitTrainingAttemptIntent,
  newUseTrainingHintIntent,
} from "../../domains/training/training.mutations";
import {
  trainingQueryKeys,
  useTrainingResultQuery,
  useTrainingSessionQuery,
} from "../../domains/training/training.queries";
import type {
  TrainingResultResponse,
} from "../../domains/training/training.schema";
import type { TrainingRecoveryReceipt } from "../../domains/training/training.recovery";
import { readCsrfToken } from "../../shared/api/csrf";
import {
  classifyMutationFailure,
  type MutationFailure,
} from "../../shared/api/mutationRecovery";
import { verifyCurrentSessionOwner } from "../../shared/api/ownerScopedQueries";
import { useI18n, type AppLanguage } from "../../shared/i18n";
import { createAccountScope } from "../../shared/lib/accountScope";
import { useOnlineStatus } from "../../shared/lib/useOnlineStatus";
import {
  ProblemDetailPanel,
  ProblemsFilterPanel,
  ProblemsWorkspace,
  VirtualProblemList,
  type AttemptComposerCopy,
  type AttemptKind,
  type ProblemDetailCopy,
  type ProblemsFilterCopy,
  type ProblemsFilterValue,
  type VirtualProblemListCopy,
} from "./problems";
import {
  EMPTY_PROBLEMS_LOCATION,
  buildProblemsSearch,
  parseProblemsLocation,
  problemListFiltersFromLocation,
  replaceProblemsFilters,
  replaceProblemsSelection,
  type ProblemsLocationState,
} from "./problems/problemsPage.model";
import { useProblemMutationWorkflow } from "./problems/useProblemMutationWorkflow";
import { useProblemTrainingWorkflow } from "./problems/useProblemTrainingWorkflow";
import styles from "./ProblemsPage.module.css";

type NavigateTo = (href: string) => void;

export type ProblemsPageSession = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

export type ProblemsPageProps = Readonly<{
  onNavigate?: NavigateTo;
  session?: ProblemsPageSession;
}>;

type PageCopy = Readonly<{
  attempt: AttemptComposerCopy;
  backToList: string;
  detail: ProblemDetailCopy;
  detailLabel: string;
  emptyDetailDescription: string;
  emptyDetailTitle: string;
  filter: ProblemsFilterCopy;
  invalidAction: string;
  invalidDescription: string;
  invalidTitle: string;
  list: VirtualProblemListCopy;
  listLabel: string;
  loadingAccount: string;
  loadingDetail: string;
  loadingProblems: string;
  loadingResult: string;
  loadingSession: string;
  mascotAlt: string;
  metricCompleted: string;
  metricCurrentPage: string;
  metricSaved: string;
  nextPage: string;
  pageDescription: string;
  pageEyebrow: string;
  pageTitle: ReactNode;
  previousPage: string;
  queryErrorAction: string;
  queryErrorDescription: string;
  queryErrorTitle: string;
  resultCount: (count: number) => string;
  resultPlanCompleted: string;
  resultPlanUpdated: string;
  resultSkill: (skillKey: string, delta: number, score: number) => string;
  resultNextOverview: string;
  resultNextProblem: string;
  search: string;
  workspaceLabel: string;
}>;

const zhCopy: PageCopy = {
  attempt: {
    answerLabel: "你的答案",
    characterCount: (count, maximum) => `${count} / ${maximum}`,
    kindLabel: "作答方式",
    kindLabels: {
      code: "代码",
      multiple_choice: "选项",
      text: "文字",
    },
    placeholder: "写下推导、答案或代码…",
    submit: "提交作答",
    submitting: "正在提交作答",
    title: "先独立作答",
  },
  backToList: "返回题目列表",
  detail: {
    attempts: "尝试",
    bestScore: "最高分",
    bookmark: "收藏题目",
    complete: "完成本次训练",
    completing: "正在确认训练结果",
    companies: "常考公司",
    difficultyLabels: {
      Easy: "简单",
      Hard: "困难",
      Medium: "中等",
    },
    next: "下一题",
    navigation: "题目切换",
    previous: "上一题",
    prompt: "题目",
    readyDescription: "启动后可以使用提示、提交答案并记录正式训练结果。",
    readyLabel: "准备开始",
    revealSolution: "查看参考解析",
    revealingSolution: "正在获取解析",
    solution: "参考解析",
    start: "开始这道题",
    starting: "正在启动训练",
    tags: "知识点",
    trainingActions: "训练操作",
    unbookmark: "取消收藏",
  },
  detailLabel: "题目详情",
  emptyDetailDescription: "题目、提示、作答、解析与个人笔记会在这里展开。",
  emptyDetailTitle: "选择一道题开始训练",
  filter: {
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
  },
  invalidAction: "返回安全题库",
  invalidDescription: "当前链接包含重复、冲突或无效的题库状态，已停止读取这些参数。",
  invalidTitle: "无法安全打开这个题库链接",
  list: {
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
  },
  listLabel: "题目列表",
  loadingAccount: "正在确认训练账号",
  loadingDetail: "正在载入题目详情",
  loadingProblems: "正在载入题库",
  loadingResult: "正在确认训练结果",
  loadingSession: "正在恢复训练进度",
  mascotAlt: "Quanty 正在整理训练题库",
  metricCompleted: "本页完成",
  metricCurrentPage: "当前题目",
  metricSaved: "本页收藏",
  nextPage: "下一页",
  pageDescription: "筛选一道值得练的题，完成作答并把结果转化为真实训练进度。",
  pageEyebrow: "TRAINING · 题库",
  pageTitle: <>题目 <span>Problems</span></>,
  previousPage: "上一页",
  queryErrorAction: "重新载入",
  queryErrorDescription: "题库暂时没有返回可验证的数据，你可以安全重试。",
  queryErrorTitle: "暂时无法载入题库",
  resultCount: (count) => `当前结果 ${count} 题`,
  resultPlanCompleted: "关联计划任务已完成。",
  resultPlanUpdated: "关联计划进度已更新。",
  resultSkill: (skillKey, delta, score) => (
    delta > 0 ? `${skillKey} +${delta} · 最佳 ${score}` : `${skillKey} · 最佳 ${score}`
  ),
  resultNextOverview: "返回今日训练总览",
  resultNextProblem: "继续推荐题目",
  search: "搜索",
  workspaceLabel: "题目训练工作区",
};

const enCopy: PageCopy = {
  attempt: {
    answerLabel: "Your answer",
    characterCount: (count, maximum) => `${count} / ${maximum}`,
    kindLabel: "Answer format",
    kindLabels: {
      code: "Code",
      multiple_choice: "Choice",
      text: "Text",
    },
    placeholder: "Write your reasoning, answer, or code…",
    submit: "Submit answer",
    submitting: "Submitting answer",
    title: "Solve it independently first",
  },
  backToList: "Back to problem list",
  detail: {
    attempts: "Attempts",
    bestScore: "Best score",
    bookmark: "Save problem",
    complete: "Complete this session",
    completing: "Confirming result",
    companies: "Common at",
    difficultyLabels: {
      Easy: "Easy",
      Hard: "Hard",
      Medium: "Medium",
    },
    next: "Next problem",
    navigation: "Problem navigation",
    previous: "Previous problem",
    prompt: "Problem",
    readyDescription: "Start a session to use a hint, submit an answer, and record a verified result.",
    readyLabel: "READY",
    revealSolution: "View reference solution",
    revealingSolution: "Loading solution",
    solution: "Reference solution",
    start: "Start this problem",
    starting: "Starting session",
    tags: "Skills",
    trainingActions: "Training actions",
    unbookmark: "Remove saved problem",
  },
  detailLabel: "Problem detail",
  emptyDetailDescription: "The prompt, hint, answer, solution, and your notes will open here.",
  emptyDetailTitle: "Choose a problem to begin",
  filter: {
    all: "All",
    clear: "Clear filters",
    difficulty: "Level",
    difficultyLabels: {
      Easy: "Easy",
      Hard: "Hard",
      Medium: "Medium",
    },
    queryLabel: "Search problems",
    queryPlaceholder: "Search title or skill…",
    source: "Source",
    status: "Progress",
    statusLabels: {
      completed: "Completed",
      in_progress: "In progress",
      unstarted: "Not started",
    },
    submit: "Search",
    view: "Set",
    viewLabels: {
      all: "All problems",
      daily: "Daily training",
      hot100: "Hot 100",
      saved: "Saved",
    },
  },
  invalidAction: "Return to a safe list",
  invalidDescription: "This link contains duplicate, conflicting, or invalid state. Those parameters were not read.",
  invalidTitle: "This problem link cannot be opened safely",
  list: {
    attemptCount: (count) => `${count} attempts`,
    bestScore: (score) => `Best ${score}`,
    completed: "Completed",
    difficultyLabels: {
      Easy: "Easy",
      Hard: "Hard",
      Medium: "Medium",
    },
    emptyDescription: "Adjust the search or filters to find your next training problem.",
    emptyTitle: "No matching problems",
    favorite: "Save problem",
    inProgress: "In progress",
    loadingLabel: "Loading problems",
    resultCount: (count) => `${count} problems`,
    sortLabel: "Default order",
    unfavorite: "Remove saved problem",
  },
  listLabel: "Problem list",
  loadingAccount: "Confirming training account",
  loadingDetail: "Loading problem detail",
  loadingProblems: "Loading problem library",
  loadingResult: "Confirming training result",
  loadingSession: "Restoring training progress",
  mascotAlt: "Quanty is organizing the problem library",
  metricCompleted: "Completed here",
  metricCurrentPage: "Visible problems",
  metricSaved: "Saved here",
  nextPage: "Next page",
  pageDescription: "Choose a worthwhile problem, submit your work, and turn the result into verified training progress.",
  pageEyebrow: "TRAINING · PROBLEMS",
  pageTitle: <>Problems <span>题目</span></>,
  previousPage: "Previous page",
  queryErrorAction: "Reload",
  queryErrorDescription: "The problem library did not return verified data. It is safe to retry.",
  queryErrorTitle: "The problem library is unavailable",
  resultCount: (count) => `${count} results`,
  resultPlanCompleted: "The linked plan task is complete.",
  resultPlanUpdated: "The linked plan progress was updated.",
  resultSkill: (skillKey, delta, score) => (
    delta > 0 ? `${skillKey} +${delta} · best ${score}` : `${skillKey} · best ${score}`
  ),
  resultNextOverview: "Return to today's overview",
  resultNextProblem: "Continue to recommended problem",
  search: "Search",
  workspaceLabel: "Problem training workspace",
};

const copyFor = (language: AppLanguage): PageCopy => (
  language === "en" ? enCopy : zhCopy
);

const safeCsrfProof = (): string | null => {
  try {
    return readCsrfToken();
  } catch {
    return null;
  }
};

const localizedValue = (
  language: AppLanguage,
  zh: string | null,
  en: string | null,
  fallback: string,
): string => language === "en"
  ? en ?? zh ?? fallback
  : zh ?? en ?? fallback;

type WorkflowRecoveryProps = Readonly<{
  busy: boolean;
  discard: () => unknown | Promise<unknown>;
  failure: MutationFailure | null;
  inspect: () => unknown | Promise<unknown>;
  language: AppLanguage;
  loadLatest: () => unknown | Promise<unknown>;
  onSignIn: () => void;
  retry: () => unknown | Promise<unknown>;
  showRetryState?: boolean;
}>;

const englishRecoveryCopy: Readonly<
  Record<RecoveryState, Readonly<{ actionLabel: string; title: string }>>
> = {
  "non-recoverable-error": {
    actionLabel: "Return safely",
    title: "This action cannot continue",
  },
  "offline-draft": {
    actionLabel: "Retry when online",
    title: "You are offline",
  },
  "permission-denied": {
    actionLabel: "Sign in again",
    title: "Identity verification required",
  },
  "recoverable-error": {
    actionLabel: "Retry",
    title: "The action is temporarily unavailable",
  },
  "stale-version-conflict": {
    actionLabel: "Load latest version",
    title: "The content version changed",
  },
  retry: {
    actionLabel: "Retry",
    title: "Confirming the saved action",
  },
};

const recoveryLanguageProps = (language: AppLanguage) => (
  language === "en"
    ? {
        busyLabel: "Recovering",
        referenceLabel: "Reference",
      }
    : {}
);

function WorkflowRecovery({
  busy,
  discard,
  failure,
  inspect,
  language,
  loadLatest,
  onSignIn,
  retry,
  showRetryState = false,
}: WorkflowRecoveryProps) {
  if (failure === null && !showRetryState) return null;
  const state: RecoveryState = failure?.state ?? "retry";
  const title = language === "en"
    ? englishRecoveryCopy[state].title
    : state === "retry" ? "正在确认已保存的操作" : undefined;
  const message = failure?.message ?? (
    language === "en"
      ? "The action is saved. You can retry without creating a duplicate."
      : "这项操作已经保留，可以安全重试，不会重复创建结果。"
  );
  const retryAction = failure === null ? inspect : retry;

  return (
    <RecoveryPanel
      busy={busy}
      message={message}
      onReload={() => void loadLatest()}
      onRetry={() => void retryAction()}
      onReturn={() => void discard()}
      onSignIn={onSignIn}
      requestId={failure?.requestId ?? null}
      state={state}
      {...recoveryLanguageProps(language)}
      {...(language === "en"
        ? { actionLabel: englishRecoveryCopy[state].actionLabel }
        : {})}
      {...(title === undefined ? {} : { title })}
    />
  );
}

const sameProblem = (
  left: Pick<ProblemSummary, "id">,
  right: Pick<ProblemSummary, "id">,
) => left.id === right.id;

const abortRequested = (signal: AbortSignal | undefined): boolean => (
  signal?.aborted === true
);

const cursorHistoryFromLocation = (
  state: unknown,
  currentCursor: string | null,
): readonly (string | null)[] => {
  if (currentCursor === null) return [];
  if (
    typeof state !== "object"
    || state === null
    || !("problemsCursorHistory" in state)
    || !Array.isArray(state.problemsCursorHistory)
  ) return [null];

  const history = state.problemsCursorHistory;
  if (
    history.length === 0
    || history.length > 100
    || history[0] !== null
    || history.some((cursor, index) => (
      index > 0
      && (
        typeof cursor !== "string"
        || cursor.length === 0
        || cursor.length > 512
        || cursor.trim() !== cursor
      )
    ))
  ) return [null];
  return history as readonly (string | null)[];
};

type ProblemsSessionPageProps = Readonly<{
  onNavigate?: NavigateTo;
  session: ProblemsPageSession;
}>;

function ProblemsSessionPage({
  onNavigate,
  session,
}: ProblemsSessionPageProps) {
  const { language } = useI18n();
  const copy = copyFor(language);
  const location = useLocation();
  const navigate = useNavigate();
  const navigateApp = useCallback<NavigateTo>((href) => {
    if (onNavigate === undefined) navigate(href);
    else onNavigate(href);
  }, [navigate, onNavigate]);
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const parsed = useMemo(
    () => parseProblemsLocation(location.search),
    [location.search],
  );
  const locationState = parsed.state;
  const locationStateRef = useRef(locationState);
  const selectedControlRef = useRef<HTMLButtonElement>(null);
  const [queryEdit, setQueryEdit] = useState(() => ({
    locationKey: location.key,
    value: locationState.q,
  }));
  if (queryEdit.locationKey !== location.key) {
    setQueryEdit({
      locationKey: location.key,
      value: locationState.q,
    });
  }
  const queryDraft = queryEdit.locationKey === location.key
    ? queryEdit.value
    : locationState.q;
  const setQueryDraft = (value: string) => {
    setQueryEdit({
      locationKey: location.key,
      value: value.slice(0, 120),
    });
  };
  const cursorHistory = useMemo(
    () => cursorHistoryFromLocation(location.state, locationState.cursor),
    [location.state, locationState.cursor],
  );

  useEffect(() => {
    locationStateRef.current = locationState;
  }, [locationState]);

  const filters = useMemo(
    () => problemListFiltersFromLocation(locationState),
    [locationState],
  );
  const problems = useProblemsQuery({
    enabled: !parsed.invalid,
    filters,
    ownerScope: session.ownerScope,
  });

  const writeLocation = useCallback((
    next: ProblemsLocationState,
    replace = false,
    nextCursorHistory: readonly (string | null)[] = cursorHistory,
  ) => {
    navigate({
      pathname: "/problems",
      search: buildProblemsSearch(next),
    }, {
      replace,
      state: {
        problemsCursorHistory: next.cursor === null ? [] : nextCursorHistory,
      },
    });
  }, [cursorHistory, navigate]);

  const signIn = useCallback(() => {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    navigate(`/login?reauth=1&redirect=${redirect}`);
  }, [location.pathname, location.search, navigate]);

  const onLoadLatest = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted === true) return;
    await Promise.all([
      queryClient.refetchQueries({
        queryKey: problemQueryKeys.forOwner(session.ownerScope),
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: trainingQueryKeys.forOwner(session.ownerScope),
        type: "active",
      }),
    ]);
  }, [queryClient, session.ownerScope]);

  const onTrainingReceipt = useCallback(async (
    receipt: TrainingRecoveryReceipt,
    signal?: AbortSignal,
  ) => {
    if (abortRequested(signal)) return "defer" as const;
    const response = receipt.payload.response;
    const current = locationStateRef.current;
    if (
      receipt.payload.intentKind === "start"
      && current.problemId !== receipt.payload.response.problemId
    ) return "defer" as const;

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: problemQueryKeys.forOwner(session.ownerScope),
      }),
      queryClient.invalidateQueries({
        queryKey: trainingQueryKeys.session(
          session.ownerScope,
          response.sessionId,
        ),
      }),
      ...(receipt.payload.intentKind === "complete"
        ? [queryClient.invalidateQueries({
            queryKey: trainingQueryKeys.result(
              session.ownerScope,
              response.sessionId,
            ),
          })]
        : []),
    ]);
    if (abortRequested(signal)) return "defer" as const;

    if (receipt.payload.intentKind === "start") {
      const startResponse = receipt.payload.response;
      writeLocation(replaceProblemsSelection(current, {
        problemId: startResponse.problemId,
        sessionId: startResponse.sessionId,
      }), true);
    }
    return "consume" as const;
  }, [queryClient, session.ownerScope, writeLocation]);

  const problemWorkflow = useProblemMutationWorkflow({
    csrfProof: session.csrfProof,
    language,
    online,
    ownerScope: session.ownerScope,
    ...(session.verifyOwner === undefined
      ? {}
      : { verifyOwner: session.verifyOwner }),
  });
  const trainingWorkflow = useProblemTrainingWorkflow({
    csrfProof: session.csrfProof,
    language,
    online,
    onLoadLatest,
    onReceipt: onTrainingReceipt,
    ownerScope: session.ownerScope,
    ...(session.verifyOwner === undefined
      ? {}
      : { verifyOwner: session.verifyOwner }),
  });

  if (parsed.invalid) {
    return (
      <DashboardTemplate
        className={styles.page ?? ""}
        description={copy.invalidDescription}
        eyebrow={copy.pageEyebrow}
        title={copy.invalidTitle}
      >
        <RecoveryPanel
          actionLabel={copy.invalidAction}
          message={copy.invalidDescription}
          onReturn={() => writeLocation(EMPTY_PROBLEMS_LOCATION, true)}
          state="non-recoverable-error"
          title={copy.invalidTitle}
          {...recoveryLanguageProps(language)}
        />
      </DashboardTemplate>
    );
  }

  const applyFilters = (value: ProblemsFilterValue) => {
    writeLocation(replaceProblemsFilters(locationStateRef.current, {
      difficulty: value.difficulty,
      q: value.query.slice(0, 120),
      source: value.source,
      status: value.status,
      view: value.view,
    }), false, []);
  };
  const currentFilterValue: ProblemsFilterValue = {
    difficulty: locationState.difficulty,
    query: queryDraft,
    source: locationState.source,
    status: locationState.status,
    view: locationState.view,
  };
  const listPageKey = buildProblemsSearch({
    ...locationState,
    problemId: null,
    sessionId: null,
    taskId: null,
  });
  const listItems = problems.data?.items ?? [];
  const completedCount = listItems.filter(
    ({ progress }) => progress.status === "completed",
  ).length;
  const savedCount = listItems.filter(({ favorite }) => favorite.favorite).length;
  const queryFailure = problems.isError
    ? classifyMutationFailure(problems.error, online)
    : null;
  const problemFailure = problemWorkflow.inspectionFailure
    ?? problemWorkflow.workflow?.failure
    ?? null;
  const trainingFailure = trainingWorkflow.inspectionFailure
    ?? trainingWorkflow.workflow?.failure
    ?? null;

  const selectProblem = (problem: ProblemSummary) => {
    if (locationStateRef.current.problemId === problem.id) return;
    writeLocation(replaceProblemsSelection(locationStateRef.current, {
      problemId: problem.id,
    }));
  };
  const toggleFavorite = (problem: ProblemSummary) => {
    if (!problemWorkflow.canSubmit) return;
    void problemWorkflow.submit(
      newSetProblemFavoriteIntent(problem, !problem.favorite.favorite),
    );
  };
  const clearFilters = () => {
    setQueryDraft("");
    writeLocation(EMPTY_PROBLEMS_LOCATION, false, []);
  };

  const listFooter = (
    <Pagination
      ariaLabel={copy.listLabel}
      canGoNext={problems.data?.nextCursor != null}
      canGoPrevious={cursorHistory.length > 0}
      currentPage={cursorHistory.length + 1}
      disabled={problems.isFetching}
      loading={problems.isFetching && problems.data !== undefined}
      nextLabel={copy.nextPage}
      onNext={() => {
        const nextCursor = problems.data?.nextCursor ?? null;
        if (nextCursor === null) return;
        const nextCursorHistory = [
          ...cursorHistory,
          locationStateRef.current.cursor,
        ];
        writeLocation({
          ...replaceProblemsSelection(locationStateRef.current, {
            problemId: null,
          }),
          cursor: nextCursor,
        }, false, nextCursorHistory);
      }}
      onPrevious={() => {
        const previousCursor = cursorHistory.at(-1) ?? null;
        const nextCursorHistory = cursorHistory.slice(0, -1);
        writeLocation({
          ...replaceProblemsSelection(locationStateRef.current, {
            problemId: null,
          }),
          cursor: previousCursor,
        }, false, nextCursorHistory);
      }}
      previousLabel={copy.previousPage}
      rangeLabel={copy.resultCount(listItems.length)}
    />
  );

  const statusPanel = (
    <>
      {problemFailure === null && problemWorkflow.workflow === null ? null : (
        <div className={styles.globalRecovery}>
          <WorkflowRecovery
            busy={problemWorkflow.busy}
            discard={problemWorkflow.discard}
            failure={problemFailure}
            inspect={problemWorkflow.inspectRecovery}
            language={language}
            loadLatest={problemWorkflow.loadLatest}
            onSignIn={signIn}
            retry={problemWorkflow.retry}
            showRetryState={
              problemFailure === null
              && problemWorkflow.workflow?.phase === "reconciling"
            }
          />
        </div>
      )}
      {trainingFailure === null && trainingWorkflow.workflow === null ? null : (
        <div className={styles.globalRecovery}>
          <WorkflowRecovery
            busy={trainingWorkflow.busy}
            discard={trainingWorkflow.discard}
            failure={trainingFailure}
            inspect={trainingWorkflow.inspectRecovery}
            language={language}
            loadLatest={trainingWorkflow.loadLatest}
            onSignIn={signIn}
            retry={trainingWorkflow.retry}
            showRetryState={
              trainingFailure === null
              && trainingWorkflow.workflow?.phase === "reconciling"
            }
          />
        </div>
      )}
      {queryFailure === null || problems.data === undefined ? null : (
        <div className={styles.globalRecovery}>
          <RecoveryPanel
            actionLabel={copy.queryErrorAction}
            busy={problems.isFetching}
            message={queryFailure.message}
            onReload={() => void problems.refetch()}
            onRetry={() => void problems.refetch()}
            onReturn={() => void problems.refetch()}
            onSignIn={signIn}
            requestId={queryFailure.requestId}
            state={queryFailure.state}
            title={copy.queryErrorTitle}
            {...recoveryLanguageProps(language)}
          />
        </div>
      )}
    </>
  );

  const filterPanel = (
    <ProblemsFilterPanel
      ariaLabel={language === "en" ? "Filter problems" : "筛选题目"}
      busy={problems.isFetching && problems.data === undefined}
      copy={copy.filter}
      disabled={!problemWorkflow.recoveryReady}
      onClear={clearFilters}
      onDifficultyChange={(difficulty) => applyFilters({
        ...currentFilterValue,
        difficulty,
      })}
      onQueryChange={setQueryDraft}
      onQuerySubmit={() => applyFilters(currentFilterValue)}
      onSourceChange={(source) => applyFilters({
        ...currentFilterValue,
        source,
      })}
      onStatusChange={(status) => applyFilters({
        ...currentFilterValue,
        status,
      })}
      onViewChange={(view) => applyFilters({
        ...currentFilterValue,
        view,
      })}
      resultSummary={copy.resultCount(listItems.length)}
      sources={(problems.data?.availableSources ?? []).map((source) => ({
        label: source.name,
        value: source.slug,
      }))}
      value={currentFilterValue}
    />
  );

  const list = queryFailure !== null && problems.data === undefined ? (
    <div className={styles.listRecovery}>
      <RecoveryPanel
        actionLabel={copy.queryErrorAction}
        busy={problems.isFetching}
        message={queryFailure.message}
        onReload={() => void problems.refetch()}
        onRetry={() => void problems.refetch()}
        onReturn={clearFilters}
        onSignIn={signIn}
        requestId={queryFailure.requestId}
        state={queryFailure.state}
        title={copy.queryErrorTitle}
        {...recoveryLanguageProps(language)}
      />
    </div>
  ) : (
    <VirtualProblemList
      key={listPageKey}
      ariaLabel={copy.listLabel}
      copy={copy.list}
      emptyActionLabel={copy.filter.clear}
      footer={listFooter}
      favoriteDisabled={!problemWorkflow.canSubmit}
      isLoading={problems.isPending && problems.data === undefined}
      items={listItems}
      language={language}
      loadingState={copy.loadingProblems}
      onClearFilters={clearFilters}
      onSelect={selectProblem}
      onToggleFavorite={toggleFavorite}
      ordinalOffset={cursorHistory.length * 50}
      selectedControlRef={selectedControlRef}
      selectedId={locationState.problemId}
    />
  );

  const detail = locationState.problemId === null ? null : (
    <SelectedProblemPane
      key={locationState.problemId}
      copy={copy}
      language={language}
      listItems={listItems}
      onNavigate={(href) => {
        navigateApp(href);
      }}
      onSelectProblem={selectProblem}
      problemId={locationState.problemId}
      problemWorkflow={problemWorkflow}
      session={session}
      sessionId={locationState.sessionId}
      signIn={signIn}
      trainingWorkflow={trainingWorkflow}
      writeSelection={(selection, replace = false) => {
        writeLocation(replaceProblemsSelection(locationStateRef.current, selection), replace);
      }}
    />
  );

  return (
    <ProblemsWorkspace
      backLabel={copy.backToList}
      className={styles.page ?? ""}
      description={copy.pageDescription}
      detail={detail}
      detailLabel={copy.detailLabel}
      emptyDetail={(
        <EmptyState
          description={copy.emptyDetailDescription}
          headingLevel={2}
          mascot="calculator"
          mascotAlt=""
          title={copy.emptyDetailTitle}
        />
      )}
      eyebrow={copy.pageEyebrow}
      filterPanel={filterPanel}
      list={list}
      mascotAlt={copy.mascotAlt}
      metrics={[
        {
          id: "visible",
          label: copy.metricCurrentPage,
          value: listItems.length,
        },
        {
          id: "completed",
          label: copy.metricCompleted,
          tone: completedCount > 0 ? "positive" : "neutral",
          value: completedCount,
        },
        {
          id: "saved",
          label: copy.metricSaved,
          value: savedCount,
        },
      ]}
      metricsLabel={language === "en" ? "Problem overview" : "题库概览"}
      mobileView={locationState.problemId === null ? "list" : "detail"}
      onBackToList={() => {
        writeLocation(replaceProblemsSelection(locationStateRef.current, {
          problemId: null,
        }), true);
      }}
      returnFocusRef={selectedControlRef}
      statusPanel={statusPanel}
      title={copy.pageTitle}
      workspaceLabel={copy.workspaceLabel}
    />
  );
}

type ProblemWorkflowController = ReturnType<typeof useProblemMutationWorkflow>;
type TrainingWorkflowController = ReturnType<typeof useProblemTrainingWorkflow>;

type SelectedProblemPaneProps = Readonly<{
  copy: PageCopy;
  language: AppLanguage;
  listItems: readonly ProblemSummary[];
  onNavigate: NavigateTo;
  onSelectProblem: (problem: ProblemSummary) => void;
  problemId: string;
  problemWorkflow: ProblemWorkflowController;
  session: ProblemsPageSession;
  sessionId: string | null;
  signIn: () => void;
  trainingWorkflow: TrainingWorkflowController;
  writeSelection: (
    selection: Readonly<{
      problemId: string | null;
      sessionId?: string | null;
      taskId?: string | null;
    }>,
    replace?: boolean,
  ) => void;
}>;

function SelectedProblemPane({
  copy,
  language,
  listItems,
  onNavigate,
  onSelectProblem,
  problemId,
  problemWorkflow,
  session,
  sessionId,
  signIn,
  trainingWorkflow,
  writeSelection,
}: SelectedProblemPaneProps) {
  const online = useOnlineStatus();
  const detail = useProblemDetailQuery({
    ownerScope: session.ownerScope,
    problemId,
  });
  const [noteDraft, setNoteDraft] = useState<Readonly<{
    baseBody: string;
    baseVersion: number | null;
    problemId: string;
    savedAt: string | null;
    value: string;
  }> | null>(null);

  if (detail.isPending && detail.data === undefined) {
    return <DetailLoading label={copy.loadingDetail} />;
  }

  if (detail.isError && detail.data === undefined) {
    const failure = classifyMutationFailure(detail.error, online);
    return (
      <div className={styles.detailState}>
        <RecoveryPanel
          actionLabel={copy.queryErrorAction}
          busy={detail.isFetching}
          message={failure.message}
          onReload={() => void detail.refetch()}
          onRetry={() => void detail.refetch()}
          onReturn={() => writeSelection({ problemId: null })}
          onSignIn={signIn}
          requestId={failure.requestId}
          state={failure.state}
          title={copy.queryErrorTitle}
          {...recoveryLanguageProps(language)}
        />
      </div>
    );
  }

  if (detail.data === undefined) return null;
  if (detail.data.id !== problemId) {
    return (
      <div className={styles.detailState}>
        <RecoveryPanel
          actionLabel={language === "en" ? "Return to problem list" : "返回题目列表"}
          message={language === "en"
            ? "The problem response did not match the selected problem, so it was not displayed."
            : "题目响应与当前选择不一致，页面已停止显示这份数据。"}
          onReturn={() => writeSelection({ problemId: null })}
          state="non-recoverable-error"
          title={language === "en" ? "Problem mismatch" : "题目数据不匹配"}
          {...recoveryLanguageProps(language)}
        />
      </div>
    );
  }
  const problem = detail.data;
  const serverNoteBody = problem.note?.body ?? "";
  const serverNoteVersion = problem.note?.version ?? null;
  const activeNoteDraft = noteDraft?.problemId === problem.id ? noteDraft : null;
  const noteValue = activeNoteDraft?.value ?? serverNoteBody;
  const noteDirty = activeNoteDraft !== null
    && activeNoteDraft.value !== activeNoteDraft.baseBody;
  const noteVersionConflict = activeNoteDraft !== null
    && activeNoteDraft.baseVersion !== serverNoteVersion;
  const lastSavedAt = activeNoteDraft?.savedAt ?? problem.note?.updatedAt ?? null;
  const currentIndex = listItems.findIndex((item) => sameProblem(item, problem));
  const previousProblem = currentIndex > 0 ? listItems[currentIndex - 1] ?? null : null;
  const nextProblem = currentIndex >= 0
    ? listItems[currentIndex + 1] ?? null
    : null;
  const problemMutation = problemWorkflow.workflow?.intent.problemId === problem.id
    ? problemWorkflow.workflow
    : null;
  const noteMutation = problemMutation?.intent.kind === "save-note"
    ? problemMutation
    : null;
  const noteFailure = noteMutation?.failure ?? null;
  const noteStatus = noteVersionConflict
    ? "conflict"
    : noteMutation === null
      ? noteDirty ? "dirty" : lastSavedAt === null ? "idle" : "saved"
    : noteMutation.phase === "failed"
      ? noteFailure?.state === "offline-draft"
        ? "offline"
        : noteFailure?.state === "stale-version-conflict"
          ? "conflict"
          : "error"
      : "saving";
  const note = {
    description: language === "en"
      ? "Autosaves when you leave the field, or save it now."
      : "离开输入框时自动保存，也可以立即保存。",
    disabled: !problemWorkflow.canSubmit || noteVersionConflict,
    dirtyLabel: language === "en" ? "Unsaved changes" : "有未保存更改",
    error: noteFailure?.message,
    isSaving: noteMutation !== null && noteMutation.phase !== "failed",
    label: language === "en" ? "Problem notes" : "题目笔记",
    lastSavedAt: lastSavedAt === null
      ? undefined
      : new Intl.DateTimeFormat(language, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(lastSavedAt)),
    onChange: (value: string) => {
      setNoteDraft((current) => {
        if (current?.problemId === problem.id) return { ...current, value };
        return {
          baseBody: serverNoteBody,
          baseVersion: serverNoteVersion,
          problemId: problem.id,
          savedAt: lastSavedAt,
          value,
        };
      });
    },
    onRetry: () => {
      if (noteVersionConflict) {
        setNoteDraft(null);
        return;
      }
      void problemWorkflow.retry();
    },
    onSave: async () => {
      if (
        !problemWorkflow.canSubmit
        || noteVersionConflict
        || noteValue.trim() === ""
      ) return;
      const acknowledged = await problemWorkflow.submit(
        newSaveProblemNoteIntent(
          problem.id,
          noteValue,
          activeNoteDraft?.baseVersion ?? serverNoteVersion,
        ),
      );
      if (acknowledged) setNoteDraft(null);
    },
    placeholder: language === "en"
      ? "Capture the key idea, a common mistake, or what to review…"
      : "写下关键思路、易错点或待复习内容…",
    retryLabel: noteVersionConflict
      ? language === "en" ? "Load latest note" : "载入最新笔记"
      : language === "en" ? "Retry save" : "重试保存",
    saveLabel: language === "en" ? "Save note" : "保存笔记",
    savingLabel: language === "en" ? "Saving note" : "正在保存笔记",
    status: noteStatus,
    statusCopy: language === "en"
      ? {
          conflict: {
            message: "A newer note exists. Loading it will discard this local edit.",
            title: "Note version changed",
          },
          error: {
            message: "The note is still on this device and can be retried.",
            title: "Note was not saved",
          },
          offline: {
            message: "The note is stored on this device until the connection returns.",
            title: "Note saved offline",
          },
          queued: {
            message: "The note is queued behind the current request.",
            title: "Note queued",
          },
          saved: {
            message: "The latest note is synchronized with this account.",
            title: "Note saved",
          },
          saving: {
            message: "The latest note is being stored safely.",
            title: "Saving note",
          },
          submitted: {
            message: "The server confirmed this note.",
            title: "Note synchronized",
          },
        }
      : {
          conflict: {
            message: "其他位置已有更新。载入最新笔记会放弃这次本地修改。",
            title: "笔记版本已变化",
          },
          error: {
            message: "笔记仍保留在本机，可以安全重试。",
            title: "笔记尚未保存",
          },
          offline: {
            message: "笔记已保留在本机，恢复网络后可以继续同步。",
            title: "笔记已离线保存",
          },
          queued: {
            message: "笔记正在等待当前请求完成。",
            title: "笔记已排队",
          },
          saved: {
            message: "最新笔记已经同步到当前账号。",
            title: "笔记已保存",
          },
          saving: {
            message: "正在安全保存最新笔记。",
            title: "正在保存笔记",
          },
          submitted: {
            message: "服务端已经确认这条笔记。",
            title: "笔记已同步",
          },
        },
    title: language === "en" ? "My notes" : "我的笔记",
    value: noteValue,
  } as const;
  const common: ProblemDetailCommonProps = {
    copy: copy.detail,
    favoriteDisabled: !problemWorkflow.canSubmit,
    language,
    nextDisabled: nextProblem === null,
    note,
    onToggleFavorite: () => {
      if (!problemWorkflow.canSubmit) return;
      void problemWorkflow.submit(
        newSetProblemFavoriteIntent(problem, !problem.favorite.favorite),
      );
    },
    previousDisabled: previousProblem === null,
    problem,
    ...(nextProblem === null
      ? {}
      : { onNextProblem: () => onSelectProblem(nextProblem) }),
    ...(previousProblem === null
      ? {}
      : { onPreviousProblem: () => onSelectProblem(previousProblem) }),
  };
  if (sessionId === null) {
    const starting = trainingWorkflow.workflow?.intent.kind === "start"
      && trainingWorkflow.workflow.intent.request.problemId === problem.id
      && trainingWorkflow.workflow.phase !== "failed";
    return (
      <ProblemDetailPanel
        {...common}
        canComplete={false}
        completeDisabled
        isSessionActive={false}
        isStarting={starting}
        onComplete={() => undefined}
        onStart={() => {
          if (!trainingWorkflow.canSubmit) return;
          void trainingWorkflow.submit(newStartTrainingIntent({
            problemId: problem.id,
          }));
        }}
        solution={{
          content: null,
          onReveal: () => undefined,
          revealed: false,
        }}
        startDisabled={!trainingWorkflow.canSubmit}
      />
    );
  }

  return (
    <TrainingSessionDetail
      key={sessionId}
      common={common}
      copy={copy}
      language={language}
      onNavigate={onNavigate}
      problem={problem}
      session={session}
      sessionId={sessionId}
      signIn={signIn}
      trainingWorkflow={trainingWorkflow}
      writeSelection={writeSelection}
    />
  );
}

type ProblemDetailCommonProps = Pick<
  React.ComponentProps<typeof ProblemDetailPanel>,
  | "copy"
  | "favoriteDisabled"
  | "language"
  | "nextDisabled"
  | "note"
  | "onNextProblem"
  | "onPreviousProblem"
  | "onToggleFavorite"
  | "previousDisabled"
  | "problem"
>;

type TrainingSessionDetailProps = Readonly<{
  common: ProblemDetailCommonProps;
  copy: PageCopy;
  language: AppLanguage;
  onNavigate: NavigateTo;
  problem: ProblemDetail;
  session: ProblemsPageSession;
  sessionId: string;
  signIn: () => void;
  trainingWorkflow: TrainingWorkflowController;
  writeSelection: SelectedProblemPaneProps["writeSelection"];
}>;

function TrainingSessionDetail({
  common,
  copy,
  language,
  onNavigate,
  problem,
  session,
  sessionId,
  signIn,
  trainingWorkflow,
  writeSelection,
}: TrainingSessionDetailProps) {
  const online = useOnlineStatus();
  const trainingSession = useTrainingSessionQuery({
    ownerScope: session.ownerScope,
    sessionId,
  });
  const result = useTrainingResultQuery({
    enabled: trainingSession.data?.status === "completed",
    ownerScope: session.ownerScope,
    sessionId,
  });
  const [answer, setAnswer] = useState("");
  const [attemptKind, setAttemptKind] = useState<AttemptKind>("text");

  if (trainingSession.isPending && trainingSession.data === undefined) {
    return <DetailLoading label={copy.loadingSession} />;
  }

  if (trainingSession.isError && trainingSession.data === undefined) {
    const failure = classifyMutationFailure(trainingSession.error, online);
    return (
      <div className={styles.detailState}>
        <RecoveryPanel
          actionLabel={copy.queryErrorAction}
          busy={trainingSession.isFetching}
          message={failure.message}
          onReload={() => void trainingSession.refetch()}
          onRetry={() => void trainingSession.refetch()}
          onReturn={() => writeSelection({ problemId: problem.id })}
          onSignIn={signIn}
          requestId={failure.requestId}
          state={failure.state}
          title={copy.queryErrorTitle}
          {...recoveryLanguageProps(language)}
        />
      </div>
    );
  }

  const snapshot = trainingSession.data;
  if (
    snapshot === undefined
    || snapshot.sessionId !== sessionId
    || snapshot.problemId !== problem.id
  ) {
    return (
      <div className={styles.detailState}>
        <RecoveryPanel
          actionLabel={language === "en" ? "Return to problem" : "返回题目"}
          message={language === "en"
            ? "The session does not belong to this problem. It was not opened."
            : "当前训练会话与这道题不一致，页面已停止打开该会话。"}
          onReturn={() => writeSelection({ problemId: problem.id })}
          state="non-recoverable-error"
          title={language === "en" ? "Session mismatch" : "训练会话不匹配"}
          {...recoveryLanguageProps(language)}
        />
      </div>
    );
  }

  if (snapshot.status === "completed") {
    if (result.isPending && result.data === undefined) {
      return <DetailLoading label={copy.loadingResult} />;
    }
    if (result.isError && result.data === undefined) {
      const failure = classifyMutationFailure(result.error, online);
      return (
        <div className={styles.detailState}>
          <RecoveryPanel
            actionLabel={copy.queryErrorAction}
            busy={result.isFetching}
            message={failure.message}
            onReload={() => void result.refetch()}
            onRetry={() => void result.refetch()}
            onReturn={() => writeSelection({ problemId: problem.id })}
            onSignIn={signIn}
            requestId={failure.requestId}
            state={failure.state}
            title={copy.queryErrorTitle}
            {...recoveryLanguageProps(language)}
          />
        </div>
      );
    }
  }

  if (snapshot.status === "abandoned") {
    return (
      <div className={styles.detailState}>
        <RecoveryPanel
          actionLabel={language === "en" ? "Return to problem" : "返回题目"}
          message={language === "en"
            ? "This training session is no longer active. Return to the problem and start a current session."
            : "这次训练会话已失效，请返回题目后重新开始当前训练。"}
          onReturn={() => writeSelection({ problemId: problem.id })}
          state="non-recoverable-error"
          title={language === "en" ? "Session is no longer active" : "训练会话已失效"}
          {...recoveryLanguageProps(language)}
        />
      </div>
    );
  }

  const workflowIntent = trainingWorkflow.workflow?.intent;
  const workflowForSession = (
    workflowIntent !== undefined
    && "sessionId" in workflowIntent
    && workflowIntent.sessionId === snapshot.sessionId
  ) ? trainingWorkflow.workflow : null;
  const activeIntentKind = workflowForSession?.intent.kind ?? null;
  const busy = workflowForSession !== null && workflowForSession.phase !== "failed";
  const hint = localizedValue(
    language,
    snapshot.hintZh,
    snapshot.hintEn,
    language === "en" ? "No hint is available." : "当前没有可用提示。",
  );
  const solution = localizedValue(
    language,
    snapshot.solutionZh,
    snapshot.solutionEn,
    language === "en" ? "No solution is available." : "当前没有可用解析。",
  );
  const resultData = result.data;
  if (
    resultData !== undefined
    && (
      resultData.sessionId !== snapshot.sessionId
      || resultData.problemId !== problem.id
    )
  ) {
    return (
      <div className={styles.detailState}>
        <RecoveryPanel
          actionLabel={language === "en" ? "Return to problem" : "返回题目"}
          message={language === "en"
            ? "The result did not match this training session, so it was not displayed."
            : "训练结果与当前会话不一致，页面已停止显示这份结果。"}
          onReturn={() => writeSelection({ problemId: problem.id })}
          state="non-recoverable-error"
          title={language === "en" ? "Result mismatch" : "训练结果不匹配"}
          {...recoveryLanguageProps(language)}
        />
      </div>
    );
  }
  const trainingResult = resultData === undefined
    ? undefined
    : resultProps(
        resultData,
        copy,
        language,
        onNavigate,
        writeSelection,
      );
  const attempt = snapshot.status !== "active" ? undefined : {
    answer,
    availableKinds: ["text", "code", "multiple_choice"] as const,
    copy: copy.attempt,
    disabled: !trainingWorkflow.canSubmit,
    isSubmitting: activeIntentKind === "attempt" && busy,
    kind: attemptKind,
    onAnswerChange: setAnswer,
    onKindChange: setAttemptKind,
    onSubmit: () => {
      if (!trainingWorkflow.canSubmit) return;
      void trainingWorkflow.submit(newSubmitTrainingAttemptIntent({
        sessionId: snapshot.sessionId,
        sessionVersion: snapshot.sessionVersion,
      }, {
        answer,
        kind: attemptKind,
      }));
    },
    ...(snapshot.score === null
      ? {}
      : {
          feedback: (
            <p className={styles.attemptScore} data-qg-metric>
              {language === "en"
                ? `Latest score: ${snapshot.score}`
                : `最近一次得分：${snapshot.score}`}
            </p>
          ),
        }),
  } as const;
  const hintState = snapshot.status !== "active" ? undefined : {
    description: language === "en"
      ? "Using a hint is recorded in this training session."
      : "使用提示会记录到本次训练进度中。",
    disabled: !trainingWorkflow.canSubmit,
    hint,
    isLoading: activeIntentKind === "hint" && busy,
    loadingLabel: language === "en" ? "Loading hint" : "正在获取提示",
    onReveal: () => {
      if (!trainingWorkflow.canSubmit) return;
      void trainingWorkflow.submit(newUseTrainingHintIntent({
        sessionId: snapshot.sessionId,
        sessionVersion: snapshot.sessionVersion,
      }));
    },
    revealLabel: language === "en" ? "Use hint" : "使用提示",
    revealed: snapshot.hintZh !== null || snapshot.hintEn !== null,
    title: language === "en" ? "Need a direction?" : "需要一点方向？",
  } as const;

  return (
    <ProblemDetailPanel
      {...common}
      canComplete={snapshot.status === "active" && snapshot.attemptId !== null}
      completeDisabled={!trainingWorkflow.canSubmit}
      isCompleting={activeIntentKind === "complete" && busy}
      isSessionActive={snapshot.status === "active"}
      onComplete={() => {
        if (
          snapshot.attemptId === null
          || !trainingWorkflow.canSubmit
        ) return;
        void trainingWorkflow.submit(newCompleteTrainingIntent({
          sessionId: snapshot.sessionId,
          sessionVersion: snapshot.sessionVersion,
        }, snapshot.attemptId));
      }}
      onStart={() => undefined}
      solution={{
        content: solution,
        disabled: !trainingWorkflow.canSubmit,
        isLoading: activeIntentKind === "solution" && busy,
        onReveal: () => {
          if (!trainingWorkflow.canSubmit) return;
          void trainingWorkflow.submit(newRevealTrainingSolutionIntent({
            sessionId: snapshot.sessionId,
            sessionVersion: snapshot.sessionVersion,
          }));
        },
        revealed: snapshot.solutionZh !== null || snapshot.solutionEn !== null,
      }}
      {...(attempt === undefined ? {} : { attempt })}
      {...(hintState === undefined ? {} : { hint: hintState })}
      {...(trainingResult === undefined ? {} : { result: trainingResult })}
    />
  );
}

const resultProps = (
  result: TrainingResultResponse,
  copy: PageCopy,
  language: AppLanguage,
  onNavigate: NavigateTo,
  writeSelection: SelectedProblemPaneProps["writeSelection"],
) => {
  const nextIsProblem = result.nextAction.target === "problems";
  return {
    ariaLabel: language === "en" ? "Training complete" : "训练完成",
    description: language === "en"
      ? "The result is confirmed. Reward details appear below without blocking your next action."
      : "结果已经确认。奖励信息会在下方出现，但不会阻挡下一步操作。",
    nextAction: nextIsProblem
      ? copy.resultNextProblem
      : copy.resultNextOverview,
    nextActionLabel: language === "en" ? "Next action" : "下一步",
    nextLabel: nextIsProblem
      ? copy.resultNextProblem
      : copy.resultNextOverview,
    loadingLabel: language === "en" ? "Opening next action" : "正在打开下一步",
    onNext: () => {
      if (
        result.nextAction.target === "problems"
        && result.nextAction.problemId !== null
      ) {
        writeSelection({
          problemId: result.nextAction.problemId,
          sessionId: null,
          taskId: null,
        });
        return;
      }
      onNavigate("/");
    },
    planEffect: result.planEffect === null
      ? null
      : {
          description: result.planEffect.taskCompleted
            ? copy.resultPlanCompleted
            : copy.resultPlanUpdated,
          taskCompleted: result.planEffect.taskCompleted,
        },
    rewardLabel: language === "en" ? "Training reward" : "训练奖励",
    rewardPrefix: language === "en" ? "Earned this session" : "本次获得",
    score: result.score,
    scoreLabel: language === "en" ? "points" : "分",
    skillEffect: copy.resultSkill(
      result.skillEffect.skillKey,
      result.skillEffect.delta,
      result.skillEffect.currentBestScore,
    ),
    skillEffectLabel: language === "en" ? "Skill effect" : "能力变化",
    title: language === "en" ? "Training result" : "本次训练结果",
    xpDelta: result.xpDelta,
  } as const;
};

function DetailLoading({ label }: Readonly<{ label: string }>) {
  return (
    <div className={styles.detailState} role="status">
      <EmptyState
        description={label}
        headingLevel={2}
        mascot="calculator"
        mascotAlt=""
        title={label}
      />
    </div>
  );
}

function ProblemsPageFromSession({
  onNavigate,
}: Readonly<{ onNavigate?: NavigateTo }>) {
  const { language } = useI18n();
  const currentUser = useCurrentUserQuery();
  const session = useMemo<ProblemsPageSession | null>(() => {
    if (currentUser.data === null || currentUser.data === undefined) return null;
    const ownerScope = createAccountScope(currentUser.data.email);
    return {
      csrfProof: safeCsrfProof(),
      ownerScope,
      verifyOwner: (signal?: AbortSignal) => (
        verifyCurrentSessionOwner(ownerScope, signal)
      ),
    };
  }, [currentUser.data]);

  if (session === null) {
    return (
      <DashboardTemplate status="loading" title={copyFor(language).loadingAccount}>
        <div />
      </DashboardTemplate>
    );
  }
  return (
    <ProblemsSessionPage
      session={session}
      {...(onNavigate === undefined ? {} : { onNavigate })}
    />
  );
}

export function ProblemsPage({
  onNavigate,
  session,
}: ProblemsPageProps) {
  return session === undefined
    ? (
        <ProblemsPageFromSession
          {...(onNavigate === undefined ? {} : { onNavigate })}
        />
      )
    : (
        <ProblemsSessionPage
          session={session}
          {...(onNavigate === undefined ? {} : { onNavigate })}
        />
      );
}

export default ProblemsPage;
