import { useEffect } from "react";
import { usePlanPageModel } from "./planHooks.js";

function PrepDiagnosticPanel({ model, plan }) {
  const { t, diagnosticAnswers, setDiagnosticAnswer, submitDiagnostic, diagnosticMessage, startDiagnostic, formatCategoryLabel } = model;

  if (plan.diagnosticStatus === "pending") {
    return (
      <>
        <div className="prep-panel-heading">
          <div>
            <h3>Baseline 测评</h3>
            <p>8 题快速定位当前训练优先级，不影响题库进度。</p>
          </div>
          <button className="secondary-button compact" type="button" data-prep-skip-test="true" onClick={() => startDiagnostic("skipped")}>
            暂时跳过
          </button>
        </div>
        <form id="prepDiagnosticForm" className="prep-diagnostic-form" onSubmit={submitDiagnostic}>
          {model.view.diagnosticQuestions?.map((question, index) => (
            <fieldset key={question.id}>
              <legend>{index + 1}. {question.prompt}</legend>
              {question.options.map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name={`diagnostic-${question.id}`}
                    value={option}
                    checked={diagnosticAnswers[`diagnostic-${question.id}`] === option}
                    onChange={() => setDiagnosticAnswer(question.id, option)}
                  />
                  {" "}
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          <p className="prep-diagnostic-message" id="prepDiagnosticMessage">{diagnosticMessage}</p>
          <button className="primary-button" type="submit">
            <i data-lucide="check-circle-2" />
            提交测评
          </button>
        </form>
      </>
    );
  }

  if (plan.diagnosticStatus === "skipped") {
    return (
      <>
        <div className="prep-panel-heading">
          <div>
            <h3>能力定位</h3>
            <p>当前按岗位默认路径生成任务。补做 baseline 后会调整训练排序。</p>
          </div>
        </div>
        <button className="secondary-button" type="button" data-prep-start-test="true" onClick={() => startDiagnostic("pending")}>
          <i data-lucide="clipboard-check" />
          开始 8 题测评
        </button>
      </>
    );
  }

  const questions = model.view.diagnosticQuestions || [];
  const level = plan.diagnosticScore === questions.length
    ? "基础覆盖良好；保持速度训练并进入面试表达"
    : plan.diagnosticScore >= 7
      ? "面试热身就绪；优先补齐低分能力"
      : plan.diagnosticScore >= 4 ? "核心能力建设中；优先训练低分能力" : "从基础模块开始；优先训练低分能力";

  return (
    <>
      <div className="prep-panel-heading">
        <div>
          <h3>Baseline {plan.diagnosticScore}/{questions.length}</h3>
          <p>{level}。</p>
        </div>
        <button className="secondary-button compact" type="button" data-prep-start-test="true" onClick={() => startDiagnostic("pending")}>
          重测
        </button>
      </div>
      <div className="prep-score-list">
        {model.view.diagnosticScores?.map(([key, score]) => (
          <div className="prep-score-row" key={key}>
            <span>{formatCategoryLabel?.(key) || key}</span>
            <div><i style={{ width: `${score}%` }} /></div>
            <strong>{score}</strong>
          </div>
        ))}
      </div>
    </>
  );
}

function PrepSetupForm({ model, hidden = false }) {
  const { setup, updateSetup, createPlan } = model;

  return (
    <form id="prepPlanSetupForm" className={`prep-plan-setup${hidden ? " hidden" : ""}`} onSubmit={createPlan}>
      <div className="prep-setup-heading">
        <strong>建立你的备战路线</strong>
        <span>不同岗位和招聘季，需要不同的训练重点与节奏。</span>
      </div>
      <fieldset className="prep-choice-group">
        <legend>你要申请什么类型的岗位？</legend>
        <label className="prep-choice">
          <input type="radio" name="prepTrack" value="internship" checked={setup.track === "internship"} onChange={() => updateSetup("track", "internship")} />
          <strong>Internship</strong>
          <span>在校生暑期实习，围绕目标 summer 做倒排。</span>
        </label>
        <label className="prep-choice">
          <input type="radio" name="prepTrack" value="fulltime" checked={setup.track === "fulltime"} onChange={() => updateSetup("track", "fulltime")} />
          <strong>Full-time / New Grad</strong>
          <span>校招或毕业岗，增加项目表达与完整面试循环。</span>
        </label>
      </fieldset>
      <fieldset className="prep-choice-group three">
        <legend>目标招聘季</legend>
        {[
          ["2026-summer", "2026 Summer", "临近开工，按补录与即时面试冲刺。"],
          ["2027-summer", "2027 Summer", "主申请周期，系统建设能力与申请材料。"],
          ["2028-summer", "2028 Summer", "提前布局，先建立基础与项目经历。"]
        ].map(([value, title, copy]) => (
          <label className="prep-choice" key={value}>
            <input type="radio" name="prepSeason" value={value} checked={setup.season === value} onChange={() => updateSetup("season", value)} />
            <strong>{title}</strong>
            <span>{copy}</span>
          </label>
        ))}
      </fieldset>
      <div className="prep-setup-fields">
        <label>
          目标方向
          <select id="prepRoleSelect" name="prepRole" value={setup.role} onChange={(event) => updateSetup("role", event.target.value)}>
            <option value="quantTrading">Quant Trading</option>
            <option value="quantResearch">Quant Research</option>
            <option value="quantDeveloper">Quant Developer</option>
          </select>
        </label>
        <label>
          每周可投入
          <select id="prepHoursSelect" name="prepHours" value={String(setup.weeklyHours)} onChange={(event) => updateSetup("weeklyHours", Number(event.target.value))}>
            <option value="5">5 小时 / 周</option>
            <option value="8">8 小时 / 周</option>
            <option value="12">12 小时 / 周</option>
            <option value="16">16+ 小时 / 周</option>
          </select>
        </label>
      </div>
      <fieldset className="prep-choice-group">
        <legend>是否先做水平测试？</legend>
        <label className="prep-choice">
          <input type="radio" name="prepDiagnostic" value="take" checked={setup.diagnostic === "take"} onChange={() => updateSetup("diagnostic", "take")} />
          <strong>先做 baseline 测评</strong>
          <span>8 道短题，识别概率、速算、代码和市场基础的优先级。</span>
        </label>
        <label className="prep-choice">
          <input type="radio" name="prepDiagnostic" value="skip" checked={setup.diagnostic === "skip"} onChange={() => updateSetup("diagnostic", "skip")} />
          <strong>暂不测试</strong>
          <span>直接按岗位常见要求开始，之后可补做测评。</span>
        </label>
      </fieldset>
      <button className="primary-button prep-create-button" type="submit">
        <i data-lucide="route" />
        制定计划
      </button>
    </form>
  );
}

function PrepDashboard({ model, hidden = false }) {
  const { view, toggleTask, openTask, t, safeExternalUrl } = model;
  const { plan, role, season, tasks, stageIndex, paceText, processStages, sourceLinks, doneCount } = view;
  const diagnosticCopy = plan.diagnosticStatus === "completed"
    ? `Baseline ${plan.diagnosticScore}/${view.diagnosticQuestionCount}`
    : plan.diagnosticStatus === "pending" ? "Baseline 待完成" : "未测评";

  return (
    <div className={`prep-plan-dashboard${hidden ? " hidden" : ""}`} id="prepPlanDashboard" aria-live="polite">
      <section className="prep-status-band">
        <div className="prep-status-copy">
          <span className="prep-status-label">{plan.track === "internship" ? t("prepTrackInternship") : t("prepTrackFulltime")}</span>
          <h3>{season.label} · {role.label}</h3>
          <p>{paceText}</p>
        </div>
        <div className="prep-status-metrics">
          <div><strong>{String(plan.weeklyHours)}</strong><span>{t("prepHoursWeek")}</span></div>
          <div><strong>{doneCount}/{tasks.length}</strong><span>{t("prepDoneToday")}</span></div>
          <div><strong>{diagnosticCopy}</strong><span>{t("prepSkillLevel")}</span></div>
        </div>
      </section>
      <div className="prep-dashboard-grid">
        <section className="prep-work-panel">
          <div className="prep-panel-heading">
            <div>
              <h3>{t("prepTodayTraining")}</h3>
              <p>{role.technical} · {t("prepCurrentFocus")}{processStages[stageIndex]?.name}</p>
            </div>
          </div>
          <div className="prep-task-list">
            {tasks.map((task) => (
              <article className={`prep-task${task.done ? " done" : ""}`} key={task.id}>
                <button
                  className="prep-task-toggle"
                  type="button"
                  data-prep-toggle-task={task.id}
                  aria-label={task.done ? "标为未完成" : "标为完成"}
                  onClick={() => toggleTask(task.id)}
                >
                  <i data-lucide={task.done ? "check" : "circle"} />
                </button>
                <div>
                  <h4>{task.title}</h4>
                  <p>{task.detail}</p>
                  <span>{task.minutes} min</span>
                </div>
                <button
                  className="secondary-button prep-task-action"
                  type="button"
                  data-prep-open={task.action}
                  data-prep-query={task.query || ""}
                  onClick={() => openTask(task.action, task.query || "")}
                >
                  开始
                </button>
              </article>
            ))}
          </div>
        </section>
        <section className="prep-assessment-panel">
          <PrepDiagnosticPanel model={model} plan={plan} />
        </section>
      </div>
      <section className="prep-process-section">
        <div className="prep-panel-heading">
          <div>
            <h3>{t("prepRecruitProcess")}</h3>
            <p>{t("prepRecruitProcessDetail")}</p>
          </div>
        </div>
        <div className="prep-stage-list">
          {processStages.map((stage, index) => (
            <article className={`prep-stage${index === stageIndex ? " current" : ""}`} key={stage.key}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h4>{stage.name}</h4>
              <p>{stage.detail}</p>
              <small>{stage.evidence}</small>
            </article>
          ))}
        </div>
      </section>
      <section className="prep-source-section">
        <div className="prep-panel-heading">
          <div>
            <h3>{t("prepSourceTitle")}</h3>
            <p>{t("prepSourceDetail")}</p>
          </div>
        </div>
        <div className="prep-source-links">
          {sourceLinks.map((source) => (
            <a href={safeExternalUrl?.(source.url) || source.url} target="_blank" rel="noopener noreferrer" key={source.url}>
              <strong>{source.label}</strong>
              <span>{source.note}</span>
              <i data-lucide="external-link" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PlanPageContent() {
  const model = usePlanPageModel();
  const showSetup = model.view.showSetup;
  const hasPlan = Boolean(model.view.plan);

  useEffect(() => {
    if (showSetup && model.view.setupDefaults) model.resetSetupFromView();
  }, [showSetup, model.view.setupDefaults, model.resetSetupFromView]);

  useEffect(() => {
    model.refreshIcons?.();
  });

  return (
    <section className="prep-plan-section">
      <header className="prep-plan-header">
        <div>
          <span className="rank-label">PREP PLAN</span>
          <h2>Quant 面试备战计划</h2>
          <p>以目标招聘季和岗位方向为起点，覆盖 assessment、技术面、behavioral 与 final day。</p>
        </div>
        <button
          className={`secondary-button${hasPlan && !showSetup ? "" : " hidden"}`}
          id="editPrepPlanBtn"
          type="button"
          onClick={model.openEditor}
        >
            <i data-lucide="sliders-horizontal" />
            调整目标
        </button>
      </header>
      <PrepSetupForm model={model} hidden={!showSetup} />
      {!showSetup && model.view.mode === "dashboard"
        ? <PrepDashboard model={model} />
        : <div className="prep-plan-dashboard hidden" id="prepPlanDashboard" aria-live="polite" />}
    </section>
  );
}
