import { useCallback, useEffect, useState } from "react";
import { dayKey, localDateKey } from "../../lib/date.js";
import { getStreak } from "../../modules/skills/data.js";
import { usePlanPageModel } from "./planHooks.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

function PrepDiagnosticPanel({ model, plan }) {
  const { t, diagnosticAnswers, setDiagnosticAnswer, submitDiagnostic, diagnosticMessage, startDiagnostic, formatCategoryLabel } = model;

  if (plan.diagnosticStatus === "pending") {
    return (
      <>
        <div className="prep-panel-heading">
          <div>
            <h3>{t("planBaselineTitle")}</h3>
            <p>{t("planBaselineDesc")}</p>
          </div>
          <button className="secondary-button compact" type="button" data-prep-skip-test="true" onClick={() => startDiagnostic("skipped")}>
            {t("planBaselineSkip")}
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
            {t("planBaselineSubmit")}
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
            <h3>{t("planAbilityTitle")}</h3>
            <p>{t("planAbilityDesc")}</p>
          </div>
        </div>
        <button className="secondary-button" type="button" data-prep-start-test="true" onClick={() => startDiagnostic("pending")}>
          <i data-lucide="clipboard-check" />
          {t("planStartBaseline")}
        </button>
      </>
    );
  }

  const questions = model.view.diagnosticQuestions || [];
  const level = plan.diagnosticScore === questions.length
    ? t("planDiagStrong")
    : plan.diagnosticScore >= 7
      ? t("planDiagWarm")
      : plan.diagnosticScore >= 4 ? t("planDiagBuilding") : t("planDiagBasics");

  return (
    <>
      <div className="prep-panel-heading">
        <div>
          <h3>Baseline {plan.diagnosticScore}/{questions.length}</h3>
          <p>{level}</p>
        </div>
        <button className="secondary-button compact" type="button" data-prep-start-test="true" onClick={() => startDiagnostic("pending")}>
          {t("planRetest")}
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
  const { setup, updateSetup, createPlan, t } = model;

  return (
    <form id="prepPlanSetupForm" className={`prep-plan-setup qg-plan-setup${hidden ? " hidden" : ""}`} onSubmit={createPlan}>
      <div className="prep-setup-heading">
        <strong>{t("planSetupTitle")}</strong>
        <span>{t("planSetupSub")}</span>
      </div>
      <fieldset className="prep-choice-group">
        <legend>{t("planSetupRoleLegend")}</legend>
        <label className="prep-choice">
          <input type="radio" name="prepTrack" value="internship" checked={setup.track === "internship"} onChange={() => updateSetup("track", "internship")} />
          <strong>Internship</strong>
          <span>{t("planRoleInternSub")}</span>
        </label>
        <label className="prep-choice">
          <input type="radio" name="prepTrack" value="fulltime" checked={setup.track === "fulltime"} onChange={() => updateSetup("track", "fulltime")} />
          <strong>Full-time / New Grad</strong>
          <span>{t("planRoleGradSub")}</span>
        </label>
      </fieldset>
      <fieldset className="prep-choice-group three">
        <legend>{t("planSetupSeasonLegend")}</legend>
        {[
          ["2026-summer", "2026 Summer", t("planSeason2026Sub")],
          ["2027-summer", "2027 Summer", t("planSeason2027Sub")],
          ["2028-summer", "2028 Summer", t("planSeason2028Sub")]
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
          {t("planGoalLabel")}
          <select id="prepRoleSelect" name="prepRole" value={setup.role} onChange={(event) => updateSetup("role", event.target.value)}>
            <option value="quantTrading">Quant Trading</option>
            <option value="quantResearch">Quant Research</option>
            <option value="quantDeveloper">Quant Developer</option>
          </select>
        </label>
        <label>
          {t("planWeeklyLabel")}
          <select id="prepHoursSelect" name="prepHours" value={String(setup.weeklyHours)} onChange={(event) => updateSetup("weeklyHours", Number(event.target.value))}>
            <option value="5">{t("planHoursPerWeek", { n: 5 })}</option>
            <option value="8">{t("planHoursPerWeek", { n: 8 })}</option>
            <option value="12">{t("planHoursPerWeek", { n: 12 })}</option>
            <option value="16">{t("planHoursPerWeekPlus", { n: 16 })}</option>
          </select>
        </label>
      </div>
      <fieldset className="prep-choice-group">
        <legend>{t("planTestLegend")}</legend>
        <label className="prep-choice">
          <input type="radio" name="prepDiagnostic" value="take" checked={setup.diagnostic === "take"} onChange={() => updateSetup("diagnostic", "take")} />
          <strong>{t("planTestBaselineTitle")}</strong>
          <span>{t("planTestBaselineSub")}</span>
        </label>
        <label className="prep-choice">
          <input type="radio" name="prepDiagnostic" value="skip" checked={setup.diagnostic === "skip"} onChange={() => updateSetup("diagnostic", "skip")} />
          <strong>{t("planTestSkipTitle")}</strong>
          <span>{t("planTestSkipSub")}</span>
        </label>
      </fieldset>
      <button className="primary-button prep-create-button" type="submit">
        <i data-lucide="route" />
        {t("planCreatePlan")}
      </button>
    </form>
  );
}

const TASK_TAG_KEYS = {
  problems: { labelKey: "planCatProblems", color: "#5b5ff5" },
  interview: { labelKey: "planCatInterview", color: "#ff9f2e" },
  "interview-behavioral": { labelKey: "planCatInterviewBehavioral", color: "#8a63e8" },
  tools: { labelKey: "planCatTools", color: "#16a06a" },
  resume: { labelKey: "planCatResume", color: "#16879a" },
  jobs: { labelKey: "planCatJobs", color: "#2f9be0" },
  experiences: { labelKey: "planCatExperiences", color: "#d0524b" },
  custom: { labelKey: "planCatCustom", color: "#7161f2" }
};

function taskTag(task, t) {
  const def = TASK_TAG_KEYS[task.action] || TASK_TAG_KEYS.custom;
  return { label: t(def.labelKey), color: def.color };
}

const TASK_XP_DEFS = {
  problems: 40,
  interview: 60,
  "interview-behavioral": 45,
  tools: 30,
  resume: 20,
  jobs: 15,
  experiences: 15,
  custom: 10
};

function taskXp(task) {
  return Number(task.xp) || TASK_XP_DEFS[task.action] || TASK_XP_DEFS.custom;
}

function taskStatus(task) {
  if (task.status === "doing" || task.status === "done" || task.status === "todo") return task.status;
  return task.done ? "done" : "todo";
}

function isDoneValue(value) {
  // completedTasks 三态取值：'done'（或旧数据 true）才算完成，'doing' 不算
  return value === true || value === "done";
}

// zh short weekday labels (Mon-first) stay the visual default; EN derives
// localized short names from the actual date via Intl.
const WEEK_DOWS_ZH = ["一", "二", "三", "四", "五", "六", "日"];
const TIMELINE_SLOTS = ["09:00", "11:30", "14:00", "16:30", "20:00", "21:00", "21:30", "22:00"];

function weekMonday(offset = 0) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  return monday;
}

function formatWeekLabel(offset = 0, t) {
  const monday = weekMonday(offset);
  return t("planWeekLabel", { month: monday.getMonth() + 1, week: Math.ceil(monday.getDate() / 7) });
}

function buildWeekStrip(plan, todayTotal, offset = 0, isEnglish = false) {
  const monday = weekMonday(offset);
  const todayKey = localDateKey();
  const completed = plan?.completedTasks || {};
  const customTasks = plan?.customTasks || [];
  const weeklyHours = Number(plan?.weeklyHours || 8);
  const baseLimit = weeklyHours <= 5 ? 3 : weeklyHours <= 8 ? 4 : 5;
  const enWeekday = isEnglish ? new Intl.DateTimeFormat("en-US", { weekday: "short" }) : null;
  return WEEK_DOWS_ZH.map((dowZh, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = dayKey(date);
    const isToday = key === todayKey;
    const done = Object.entries(completed).filter(([taskKey, value]) => isDoneValue(value) && taskKey.startsWith(`${key}:`)).length;
    const total = isToday
      ? Math.max(todayTotal, done)
      : Math.max(baseLimit + customTasks.filter((task) => task.date === key).length, done);
    const pct = total > 0 ? Math.round(Math.min(1, done / total) * 100) : 0;
    const dow = enWeekday ? enWeekday.format(date) : dowZh;
    return { key, dow, date: date.getDate(), isToday, done: Math.min(done, total), total, pct };
  });
}

function activityDaySet(entries, checkIns) {
  return new Set([
    ...(Array.isArray(entries) ? entries : []).map((item) => dayKey(item.date)),
    ...(Array.isArray(checkIns) ? checkIns : []).map((item) => dayKey(item.date))
  ]);
}

function PlanWeekStrip({ week, t }) {
  return (
    <div className="qg-plan-week-strip" role="list" aria-label={t("planWeekProgressAria")}>
      {week.map((day) => (
        <div className={`qg-plan-day${day.isToday ? " today" : ""}`} role="listitem" key={day.key}>
          <span className="qg-plan-day-dow">{day.dow}</span>
          <strong className="qg-plan-day-date">{day.date}</strong>
          <div
            className="qg-plan-day-ring"
            style={{
              background: `conic-gradient(${
                day.isToday ? "var(--qg-brand)" : day.pct > 0 ? "#8a7bff" : "var(--qg-plan-ring-empty, #dedcf0)"
              } 0% ${day.pct}%, var(--qg-border) ${day.pct}% 100%)`
            }}
          >
            <span className="qg-plan-day-ring-inner">{day.done}/{day.total}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanTimeline({ items, t }) {
  return (
    <section className="qg-plan-timeline">
      <h3 className="qg-plan-timeline-title">{t("planTodayTimeline")}</h3>
      <div className="qg-plan-timeline-list">
        {items.map((item) => (
          <div className={`qg-plan-timeline-row ${item.status}`} key={item.id}>
            <div className="qg-plan-timeline-rail">
              <span className="qg-plan-timeline-dot" />
              <span className="qg-plan-timeline-line" />
            </div>
            <div className="qg-plan-timeline-body">
              <div className="qg-plan-timeline-time">{item.time}</div>
              <div className="qg-plan-timeline-name">{item.title}</div>
              <div className="qg-plan-timeline-sub">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanStreakBanner({ streak, remaining, bars, t }) {
  return (
    <aside className="qg-plan-streak">
      <img src="/assets/generated/playful-precision/reward-fire.webp" alt="" width="44" height="44" />
      <div className="qg-plan-streak-copy">
        <div className="qg-plan-streak-count">{t("planStreakCount", { days: streak })}</div>
        <div className="qg-plan-streak-sub">
          {remaining > 0 ? t("planStreakRemaining", { n: remaining }) : t("planStreakDoneToday")}
        </div>
      </div>
      <div className="qg-plan-streak-bars" aria-hidden="true">
        {bars.map((on, index) => (
          <span key={index} className={on ? "on" : ""} />
        ))}
      </div>
    </aside>
  );
}

function PlanBoardCard({ task, advanceTask, openTask, t }) {
  const tag = taskTag(task, t);
  const status = taskStatus(task);
  return (
    <article
      className={`qg-plan-card${status === "done" ? " done" : ""}${status === "doing" ? " doing" : ""}`}
      title={task.detail || ""}
      onClick={() => advanceTask(task)}
    >
      <button
        className="prep-task-toggle qg-plan-card-toggle"
        type="button"
        data-prep-toggle-task={task.id}
        aria-label={task.done ? t("planTaskMarkIncomplete") : t("planTaskAdvance")}
        onClick={(event) => {
          event.stopPropagation();
          advanceTask(task);
        }}
      >
        <span className="qg-plan-card-tag" style={{ background: tag.color }}>{tag.label}</span>
        {task.done ? <span className="qg-plan-card-check"><i data-lucide="check" /></span> : null}
      </button>
      <h4 className="qg-plan-card-title">{task.title}</h4>
      <div className="qg-plan-card-foot">
        <button
          className="qg-plan-card-go"
          type="button"
          data-prep-open={task.action}
          data-prep-query={task.query || ""}
          onClick={(event) => {
            event.stopPropagation();
            openTask(task.action, task.query || "");
          }}
        >
          {t("planTaskMinutesGo", { minutes: task.minutes })}
        </button>
        <span className="qg-plan-card-xp">+{taskXp(task)}</span>
      </div>
    </article>
  );
}

function PrepDashboard({ model, weekOffset = 0, advanceTask, hidden = false }) {
  const { view, userState, openTask, t, isEnglish, safeExternalUrl } = model;
  const { plan, tasks, stageIndex, processStages, sourceLinks, doneCount } = view;
  const week = buildWeekStrip(plan, tasks.length, weekOffset, isEnglish);
  const currentWeek = weekOffset === 0 ? week : buildWeekStrip(plan, tasks.length, 0, isEnglish);

  const columns = [
    { key: "todo", title: t("planColTodo"), tasks: tasks.filter((task) => taskStatus(task) === "todo") },
    { key: "doing", title: t("planColDoing"), tasks: tasks.filter((task) => taskStatus(task) === "doing") },
    { key: "done", title: t("planColDone"), tasks: tasks.filter((task) => taskStatus(task) === "done") }
  ];

  const timeline = tasks.map((task, index) => {
    const state = taskStatus(task);
    const status = state === "done" ? "done" : state === "doing" ? "active" : "pending";
    const stateLabel = status === "done" ? t("planStateDone") : status === "active" ? t("planStateActive") : t("planStateTodo");
    return {
      id: task.id,
      time: TIMELINE_SLOTS[Math.min(index, TIMELINE_SLOTS.length - 1)],
      title: task.title,
      status,
      sub: t("planCardSub", { state: stateLabel, minutes: task.minutes })
    };
  });

  const entries = Array.isArray(userState?.entries) ? userState.entries : [];
  const checkIns = Array.isArray(userState?.checkIns) ? userState.checkIns : [];
  const streak = getStreak(entries, checkIns, new Date(), userState?.economy?.frozenDays || []);
  const daySet = activityDaySet(entries, checkIns);
  const streakBars = currentWeek.map((day) => daySet.has(day.key));
  const remaining = Math.max(0, tasks.length - doneCount);

  return (
    <div className={`prep-plan-dashboard qg-plan-dashboard${hidden ? " hidden" : ""}`} id="prepPlanDashboard" aria-live="polite">
      <PlanWeekStrip week={week} t={t} />
      <div className="prep-dashboard-grid qg-plan-board">
        <section className="prep-work-panel qg-plan-work">
          <div className="prep-panel-heading qg-plan-board-head">
            <div>
              <h3>{t("planBoardTitle")}</h3>
            </div>
            <span className="qg-plan-board-hint">{t("planBoardHint")}</span>
          </div>
          <div className="prep-task-list qg-plan-columns">
            {columns.map((column) => (
              <div className="qg-plan-column" key={column.key}>
                <div className="qg-plan-column-head">
                  <span className={`qg-plan-column-dot ${column.key}`} />
                  <span className="qg-plan-column-title">{column.title}</span>
                  <span className="qg-plan-column-count">{column.tasks.length}</span>
                </div>
                <div className="qg-plan-column-body">
                  {column.tasks.map((task) => (
                    <PlanBoardCard key={task.id} task={task} advanceTask={advanceTask} openTask={openTask} t={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="qg-plan-side">
          <PlanTimeline items={timeline} t={t} />
          <PlanStreakBanner streak={streak} remaining={remaining} bars={streakBars} t={t} />
        </div>
      </div>
      <section className="prep-assessment-panel">
        <PrepDiagnosticPanel model={model} plan={plan} />
      </section>
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
  const { t } = model;
  const showSetup = model.view.showSetup;
  const hasPlan = Boolean(model.view.plan);
  const { advanceTask: advanceTaskById, migrateDoingTasks } = model;
  const [weekOffset, setWeekOffset] = useState(0);

  // 一次性迁移：旧版把「进行中」存在 localStorage（qg-plan-doing:YYYY-MM-DD），
  // 现在并入真实 store（prepPlan.completedTasks 三态）随云同步，随后清除旧 key。
  useEffect(() => {
    if (!hasPlan) return;
    const legacyPrefix = "qg-plan-doing:";
    const todayKey = `${legacyPrefix}${localDateKey()}`;
    let legacyIds = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(todayKey) || "[]");
      if (Array.isArray(parsed)) legacyIds = parsed.map(String).filter(Boolean);
    } catch {
      legacyIds = [];
    }
    try {
      const staleKeys = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith(legacyPrefix)) staleKeys.push(key);
      }
      staleKeys.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      /* storage unavailable */
    }
    if (legacyIds.length) migrateDoingTasks(legacyIds);
  }, [hasPlan, migrateDoingTasks]);

  const advanceTask = useCallback((task) => {
    if (!task?.id) return;
    advanceTaskById(task.id);
  }, [advanceTaskById]);

  useEffect(() => {
    if (showSetup && model.view.setupDefaults) model.resetSetupFromView();
  }, [showSetup, model.view.setupDefaults, model.resetSetupFromView]);

  useScopedRefreshIcons(model.refreshIcons, ".prep-plan-section", [model.view, showSetup, hasPlan]);

  return (
    <section className="prep-plan-section qg-growth-page qg-plan-page">
      <header className="prep-plan-header">
        <div>
          <span className="rank-label qg-plan-kicker">{t("planKicker")}</span>
          <h2>{t("planTitle")} <span className="qg-plan-title-accent">Plan</span></h2>
          <p>{t("planHeaderSub")}</p>
        </div>
        <div className="qg-plan-header-actions">
          <button
            className={`secondary-button qg-plan-edit-btn${hasPlan && !showSetup ? "" : " hidden"}`}
            id="editPrepPlanBtn"
            type="button"
            onClick={model.openEditor}
          >
            <i data-lucide="sliders-horizontal" />
            {t("planAdjustGoal")}
          </button>
          {hasPlan && !showSetup ? (
            <div className="qg-plan-week-nav">
              <button
                type="button"
                className="qg-plan-week-nav-btn"
                aria-label={t("planPrevWeekAria")}
                onClick={() => setWeekOffset((value) => value - 1)}
              >
                ‹
              </button>
              <span className="qg-plan-week-nav-label">{formatWeekLabel(weekOffset, t)}</span>
              <button
                type="button"
                className="qg-plan-week-nav-btn"
                aria-label={t("planNextWeekAria")}
                onClick={() => setWeekOffset((value) => value + 1)}
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <PrepSetupForm model={model} hidden={!showSetup} />
      {!showSetup && model.view.mode === "dashboard"
        ? <PrepDashboard model={model} weekOffset={weekOffset} advanceTask={advanceTask} />
        : <div className="prep-plan-dashboard qg-plan-dashboard hidden" id="prepPlanDashboard" aria-live="polite" />}
    </section>
  );
}
