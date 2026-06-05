import { prepProcessStages, prepSourceLinks } from '../../prep-data.js';

export function renderPrepPlanDashboard(container, plan = {}, options = {}) {
  if (!container || !plan) return false;
  const escapeHtml = options.escapeHtml || ((value) => String(value ?? ""));
  const escapeAttribute = options.escapeAttribute || escapeHtml;
  const t = options.t || ((key) => key);
  const role = options.role || {};
  const season = options.season || {};
  const tasks = Array.isArray(options.tasks) ? options.tasks : [];
  const stageIndex = Math.max(0, Math.min(prepProcessStages.length - 1, Number(options.stageIndex || 0)));
  const paceText = options.paceText || "";
  const done = tasks.filter((task) => task.done).length;
  const diagnosticQuestionCount = Number(options.diagnosticQuestionCount || 0);
  const diagnosticCopy = plan.diagnosticStatus === "completed"
    ? `Baseline ${plan.diagnosticScore}/${diagnosticQuestionCount}`
    : plan.diagnosticStatus === "pending" ? "Baseline 待完成" : "未测评";
  const renderTask = options.renderTask || ((task) => renderPrepTaskMarkup(task, options));
  const renderDiagnostic = options.renderDiagnostic || ((prepPlan) => renderPrepDiagnosticMarkup(prepPlan, options));

  container.innerHTML = `
    <section class="prep-status-band">
      <div class="prep-status-copy">
        <span class="prep-status-label">${escapeHtml(plan.track === "internship" ? t("prepTrackInternship") : t("prepTrackFulltime"))}</span>
        <h3>${escapeHtml(season.label)} · ${escapeHtml(role.label)}</h3>
        <p>${escapeHtml(paceText)}</p>
      </div>
      <div class="prep-status-metrics">
        <div><strong>${escapeHtml(String(plan.weeklyHours))}</strong><span>${escapeHtml(t("prepHoursWeek"))}</span></div>
        <div><strong>${escapeHtml(String(done))}/${escapeHtml(String(tasks.length))}</strong><span>${escapeHtml(t("prepDoneToday"))}</span></div>
        <div><strong>${escapeHtml(diagnosticCopy)}</strong><span>${escapeHtml(t("prepSkillLevel"))}</span></div>
      </div>
    </section>
    <div class="prep-dashboard-grid">
      <section class="prep-work-panel">
        <div class="prep-panel-heading">
          <div>
            <h3>${escapeHtml(t("prepTodayTraining"))}</h3>
            <p>${escapeHtml(role.technical)} · ${escapeHtml(t("prepCurrentFocus"))}${escapeHtml(prepProcessStages[stageIndex].name)}</p>
          </div>
        </div>
        <div class="prep-task-list">
          ${tasks.map(renderTask).join("")}
        </div>
      </section>
      <section class="prep-assessment-panel">
        ${renderDiagnostic(plan)}
      </section>
    </div>
    <section class="prep-process-section">
      <div class="prep-panel-heading">
        <div>
          <h3>${escapeHtml(t("prepRecruitProcess"))}</h3>
          <p>${escapeHtml(t("prepRecruitProcessDetail"))}</p>
        </div>
      </div>
      <div class="prep-stage-list">
        ${prepProcessStages.map((stage, index) => `
          <article class="prep-stage${index === stageIndex ? " current" : ""}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <h4>${escapeHtml(stage.name)}</h4>
            <p>${escapeHtml(stage.detail)}</p>
            <small>${escapeHtml(stage.evidence)}</small>
          </article>
        `).join("")}
      </div>
    </section>
    <section class="prep-source-section">
      <div class="prep-panel-heading">
        <div>
          <h3>${escapeHtml(t("prepSourceTitle"))}</h3>
          <p>${escapeHtml(t("prepSourceDetail"))}</p>
        </div>
      </div>
      <div class="prep-source-links">
        ${prepSourceLinks.map((source) => `
          <a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">
            <strong>${escapeHtml(source.label)}</strong>
            <span>${escapeHtml(source.note)}</span>
            <i data-lucide="external-link"></i>
          </a>
        `).join("")}
      </div>
    </section>
  `;
  options.refreshIcons?.();
  return true;
}

export function renderPrepTaskMarkup(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || ((value) => String(value ?? ""));
  return `
    <article class="prep-task${task.done ? " done" : ""}">
      <button class="prep-task-toggle" type="button" data-prep-toggle-task="${escapeHtml(task.id)}" aria-label="${task.done ? "标为未完成" : "标为完成"}">
        <i data-lucide="${task.done ? "check" : "circle"}"></i>
      </button>
      <div>
        <h4>${escapeHtml(task.title)}</h4>
        <p>${escapeHtml(task.detail)}</p>
        <span>${escapeHtml(String(task.minutes))} min</span>
      </div>
      <button class="secondary-button prep-task-action" type="button" data-prep-open="${escapeHtml(task.action)}" data-prep-query="${escapeHtml(task.query || "")}">开始</button>
    </article>
  `;
}

export function renderPrepDiagnosticMarkup(plan = {}, options = {}) {
  const escapeHtml = options.escapeHtml || ((value) => String(value ?? ""));
  const questions = Array.isArray(options.questions) ? options.questions : [];
  const skillDefs = options.skillDefs || {};
  const formatCategoryLabel = options.formatCategoryLabel || ((value) => value);

  if (plan.diagnosticStatus === "pending") {
    return `
      <div class="prep-panel-heading">
        <div>
          <h3>Baseline 测评</h3>
          <p>8 题快速定位当前训练优先级，不影响题库进度。</p>
        </div>
        <button class="secondary-button compact" type="button" data-prep-skip-test="true">暂时跳过</button>
      </div>
      <form id="prepDiagnosticForm" class="prep-diagnostic-form">
        ${questions.map((question, index) => `
          <fieldset>
            <legend>${index + 1}. ${escapeHtml(question.prompt)}</legend>
            ${question.options.map((option) => `
              <label><input type="radio" name="diagnostic-${escapeHtml(question.id)}" value="${escapeHtml(option)}"> ${escapeHtml(option)}</label>
            `).join("")}
          </fieldset>
        `).join("")}
        <p class="prep-diagnostic-message" id="prepDiagnosticMessage"></p>
        <button class="primary-button" type="submit"><i data-lucide="check-circle-2"></i>提交测评</button>
      </form>
    `;
  }

  if (plan.diagnosticStatus === "skipped") {
    return `
      <div class="prep-panel-heading">
        <div>
          <h3>能力定位</h3>
          <p>当前按岗位默认路径生成任务。补做 baseline 后会调整训练排序。</p>
        </div>
      </div>
      <button class="secondary-button" type="button" data-prep-start-test="true"><i data-lucide="clipboard-check"></i>开始 8 题测评</button>
    `;
  }

  const scores = Object.entries(plan.diagnosticScores || {})
    .filter(([key]) => skillDefs[key])
    .sort((left, right) => left[1] - right[1]);
  const level = plan.diagnosticScore === questions.length
    ? "基础覆盖良好；保持速度训练并进入面试表达"
    : plan.diagnosticScore >= 7
      ? "面试热身就绪；优先补齐低分能力"
      : plan.diagnosticScore >= 4 ? "核心能力建设中；优先训练低分能力" : "从基础模块开始；优先训练低分能力";
  return `
    <div class="prep-panel-heading">
      <div>
        <h3>Baseline ${escapeHtml(String(plan.diagnosticScore))}/${questions.length}</h3>
        <p>${escapeHtml(level)}。</p>
      </div>
      <button class="secondary-button compact" type="button" data-prep-start-test="true">重测</button>
    </div>
    <div class="prep-score-list">
      ${scores.map(([key, score]) => `
        <div class="prep-score-row">
          <span>${escapeHtml(formatCategoryLabel(key))}</span>
          <div><i style="width: ${score}%"></i></div>
          <strong>${score}</strong>
        </div>
      `).join("")}
    </div>
  `;
}
