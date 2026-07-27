import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { DashboardTemplate } from "../../design-system/patterns/DashboardTemplate";
import { RecoveryPanel } from "../../design-system/patterns/RecoveryPanel";
import { Button } from "../../design-system/primitives/Button";
import { useCurrentUserQuery } from "../../domains/account/auth/auth.queries";
import { useProblemDetailQuery } from "../../domains/problems/problems.queries";
import {
  buildProblemTrainingRoute,
  type ProblemTrainingRoute,
} from "../../domains/problems/problems.routes";
import { classifyMutationFailure } from "../../shared/api/mutationRecovery";
import { useI18n, type AppLanguage } from "../../shared/i18n";
import { createAccountScope } from "../../shared/lib/accountScope";
import { useOnlineStatus } from "../../shared/lib/useOnlineStatus";
import styles from "./ProblemTrainingHandoffPage.module.css";

export type ProblemTrainingHandoffPageProps = Readonly<{
  handoff: ProblemTrainingRoute | null;
}>;

const copyFor = (language: AppLanguage) => language === "zh-CN"
  ? {
      back: "返回总览",
      category: "分类",
      difficulty: "难度",
      errorAction: "重新载入题目",
      errorDescription: "交接编号会按链接原样保留，但暂时无法读取链接指定的题目。",
      errorTitle: "题目暂时无法载入",
      handoffReceived: "已接收训练交接",
      invalidDescription: "该链接必须且只能包含一个题目编号和一个训练交接编号。",
      invalidTitle: "训练交接链接无效",
      loadingDescription: "正在读取交接链接指定的题目；交接编号会按链接原样保留。",
      loadingLabel: "正在载入训练题目",
      loadingTitle: "正在准备训练",
      note: "个人笔记",
      pageEyebrow: "训练交接",
      promptUnavailable: "这道题暂时没有可显示的题面。",
      sessionReadyDescription: "已读取交接链接指定的题目与当前个人进度；交接编号仅按链接内容展示。",
      sessionReference: "交接编号",
      source: "来源",
      status: "进度",
      untitled: "未命名题目",
    }
  : {
      back: "Back to Overview",
      category: "Category",
      difficulty: "Difficulty",
      errorAction: "Reload problem",
      errorDescription: "The handoff reference is preserved as supplied, but the problem identified by the link cannot be read right now.",
      errorTitle: "Problem unavailable",
      handoffReceived: "Training handoff received",
      invalidDescription: "This link must contain exactly one problem ID and one training handoff reference.",
      invalidTitle: "Invalid training handoff",
      loadingDescription: "Loading the problem identified by the handoff link; the handoff reference is preserved as supplied.",
      loadingLabel: "Loading training problem",
      loadingTitle: "Preparing training",
      note: "Personal note",
      pageEyebrow: "Training handoff",
      promptUnavailable: "No problem prompt is available yet.",
      sessionReadyDescription: "The problem identified by the handoff link and current personal progress are loaded; the handoff reference is displayed exactly as supplied.",
      sessionReference: "Handoff reference",
      source: "Source",
      status: "Progress",
      untitled: "Untitled problem",
    };

function InvalidTrainingHandoff() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const copy = copyFor(language);
  return (
    <DashboardTemplate
      description={copy.invalidDescription}
      eyebrow={copy.pageEyebrow}
      title={copy.invalidTitle}
    >
      <RecoveryPanel
        actionLabel={copy.back}
        message={copy.invalidDescription}
        onReturn={() => navigate("/", { replace: true })}
        state="non-recoverable-error"
        title={copy.invalidTitle}
      />
    </DashboardTemplate>
  );
}

function ProblemTrainingHandoff({
  handoff,
}: Readonly<{ handoff: ProblemTrainingRoute }>) {
  const navigate = useNavigate();
  const { language } = useI18n();
  const copy = copyFor(language);
  const online = useOnlineStatus();
  const currentUser = useCurrentUserQuery();
  const ownerScope = useMemo(() => (
    currentUser.data === null || currentUser.data === undefined
      ? null
      : createAccountScope(currentUser.data.email)
  ), [currentUser.data]);
  const returnTarget = buildProblemTrainingRoute(handoff);

  if (ownerScope === null) {
    return (
      <DashboardTemplate
        description={copy.loadingDescription}
        eyebrow={copy.pageEyebrow}
        loadingLabel={copy.loadingLabel}
        status="loading"
        title={copy.loadingTitle}
      >
        <div />
      </DashboardTemplate>
    );
  }

  return (
    <ProblemTrainingDetail
      handoff={handoff}
      language={language}
      onBack={() => navigate("/")}
      onSignIn={() => navigate(
        `/login?reauth=1&redirect=${encodeURIComponent(returnTarget)}`,
        { replace: true },
      )}
      online={online}
      ownerScope={ownerScope}
    />
  );
}

function ProblemTrainingDetail({
  handoff,
  language,
  onBack,
  onSignIn,
  online,
  ownerScope,
}: Readonly<{
  handoff: ProblemTrainingRoute;
  language: AppLanguage;
  onBack: () => void;
  onSignIn: () => void;
  online: boolean;
  ownerScope: string;
}>) {
  const copy = copyFor(language);
  const problem = useProblemDetailQuery({
    ownerScope,
    problemId: handoff.problemId,
  });

  if (problem.isPending && problem.data === undefined) {
    return (
      <DashboardTemplate
        description={copy.loadingDescription}
        eyebrow={copy.pageEyebrow}
        loadingLabel={copy.loadingLabel}
        status="loading"
        title={copy.loadingTitle}
      >
        <div />
      </DashboardTemplate>
    );
  }

  if (problem.isError && problem.data === undefined) {
    const failure = classifyMutationFailure(problem.error, online);
    return (
      <DashboardTemplate
        description={copy.errorDescription}
        eyebrow={copy.pageEyebrow}
        title={copy.errorTitle}
      >
        <RecoveryPanel
          actionLabel={copy.errorAction}
          busy={problem.isFetching}
          busyLabel={copy.errorAction}
          message={copy.errorDescription}
          onReload={() => void problem.refetch()}
          onRetry={() => void problem.refetch()}
          onReturn={onBack}
          onSignIn={onSignIn}
          referenceLabel={language === "zh-CN" ? "请求编号" : "Request ID"}
          requestId={failure.requestId}
          state={failure.state}
          title={copy.errorTitle}
        />
      </DashboardTemplate>
    );
  }

  if (problem.data === undefined) return null;

  const detail = problem.data;
  const title = language === "zh-CN"
    ? detail.titleZh ?? detail.titleEn ?? copy.untitled
    : detail.titleEn ?? detail.titleZh ?? copy.untitled;
  const prompt = language === "zh-CN"
    ? detail.promptZh ?? detail.promptEn ?? copy.promptUnavailable
    : detail.promptEn ?? detail.promptZh ?? copy.promptUnavailable;

  return (
    <DashboardTemplate
      className={styles.page ?? ""}
      description={copy.sessionReadyDescription}
      eyebrow={copy.pageEyebrow}
      primaryAction={(
        <Button onClick={onBack} variant="secondary">{copy.back}</Button>
      )}
      title={title}
    >
      <article className={styles.detail} data-training-handoff="native">
        <section
          aria-labelledby="training-handoff-received"
          className={styles.session}
        >
          <span className={styles.sessionMark} aria-hidden="true">↳</span>
          <div>
            <h2 id="training-handoff-received">{copy.handoffReceived}</h2>
            <p>
              <span>{copy.sessionReference}</span>
              <code>{handoff.sessionId}</code>
            </p>
          </div>
        </section>

        <dl className={styles.metadata}>
          <div>
            <dt>{copy.difficulty}</dt>
            <dd>{detail.difficulty}</dd>
          </div>
          <div>
            <dt>{copy.category}</dt>
            <dd>{detail.category}</dd>
          </div>
          <div>
            <dt>{copy.source}</dt>
            <dd>{detail.source.name}</dd>
          </div>
          <div>
            <dt>{copy.status}</dt>
            <dd>{detail.progress.status}</dd>
          </div>
        </dl>

        <section aria-label={title} className={styles.prompt}>
          <p>{prompt}</p>
        </section>

        {detail.note === null ? null : (
          <section aria-labelledby="training-handoff-note" className={styles.note}>
            <h2 id="training-handoff-note">{copy.note}</h2>
            <p>{detail.note.body}</p>
          </section>
        )}
      </article>
    </DashboardTemplate>
  );
}

export function ProblemTrainingHandoffPage({
  handoff,
}: ProblemTrainingHandoffPageProps) {
  return handoff === null
    ? <InvalidTrainingHandoff />
    : <ProblemTrainingHandoff handoff={handoff} />;
}

export default ProblemTrainingHandoffPage;
