import { DEFAULT_GRADUATION_TERM } from '../../constants.js';
import {
  prepDiagnosticQuestions,
  prepProcessStages,
  prepRoleDefs,
  prepSeasonDefs
} from '../../prep-data.js';
import { skillDefs } from '../../skills.js';

export function normalizeStudyPlan(raw = null, deps = {}) {
  const makeId = deps.makeId || (() => `${Date.now()}-${Math.random()}`);
  if (!raw || !Array.isArray(raw.items)) return null;
  const items = raw.items
    .map((item) => ({
      id: item?.id || makeId(),
      title: String(item?.title || "").trim(),
      detail: String(item?.detail || "").trim(),
      minutes: Math.max(0, Number(item?.minutes || 0)),
      skill: String(item?.skill || "").trim(),
      done: Boolean(item?.done)
    }))
    .filter((item) => item.title || item.detail);
  if (!items.length) return null;
  return {
    createdAt: raw.createdAt || new Date().toISOString(),
    summary: String(raw.summary || "").trim(),
    items
  };
}

export function normalizePrepPlan(raw = null, deps = {}) {
  const makeId = deps.makeId || (() => `${Date.now()}-${Math.random()}`);
  const localDateKey = deps.localDateKey || (() => new Date().toISOString().slice(0, 10));
  if (!raw || !prepRoleDefs[raw.role] || !prepSeasonDefs[raw.season]) return null;
  const track = raw.track === "fulltime" ? "fulltime" : "internship";
  const diagnosticStatus = ["pending", "completed", "skipped"].includes(raw.diagnosticStatus)
    ? raw.diagnosticStatus
    : "skipped";
  const diagnosticScores = raw.diagnosticScores && typeof raw.diagnosticScores === "object"
    ? Object.fromEntries(Object.entries(raw.diagnosticScores).map(([key, value]) => [key, Math.max(0, Math.min(100, Number(value || 0)))]))
    : {};
  const taskOverrides = raw.taskOverrides && typeof raw.taskOverrides === "object"
    ? Object.fromEntries(Object.entries(raw.taskOverrides).map(([key, value]) => [key, {
      title: String(value?.title || "").trim().slice(0, 120),
      detail: String(value?.detail || "").trim().slice(0, 260),
      minutes: Math.max(0, Number(value?.minutes || 0))
    }]))
    : {};
  const customTasks = Array.isArray(raw.customTasks)
    ? raw.customTasks.map((task) => ({
      id: String(task?.id || makeId()).trim(),
      date: String(task?.date || localDateKey()).slice(0, 10),
      title: String(task?.title || "").trim().slice(0, 120),
      detail: String(task?.detail || "").trim().slice(0, 260),
      minutes: Math.max(0, Number(task?.minutes || 15)),
      action: String(task?.action || "custom").trim(),
      query: String(task?.query || "").trim()
    })).filter((task) => task.id && (task.title || task.detail))
    : [];
  return {
    track,
    role: raw.role,
    season: raw.season,
    weeklyHours: [5, 8, 12, 16].includes(Number(raw.weeklyHours)) ? Number(raw.weeklyHours) : 8,
    diagnosticStatus,
    diagnosticScore: Math.max(0, Math.min(prepDiagnosticQuestions.length, Number(raw.diagnosticScore || 0))),
    diagnosticScores,
    completedTasks: raw.completedTasks && typeof raw.completedTasks === "object" ? raw.completedTasks : {},
    taskOverrides,
    customTasks,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString()
  };
}

export function weeksUntilDate(dateText, now = Date.now()) {
  const target = new Date(`${dateText}T12:00:00`);
  const current = typeof now === "number" ? now : new Date(now).getTime();
  const delta = target.getTime() - current;
  return Math.ceil(delta / (7 * 24 * 60 * 60 * 1000));
}

export function getPrepStageIndex(plan, options = {}) {
  const season = prepSeasonDefs[plan.season];
  const weeksToStart = weeksUntilDate(season.startDate, options.now);
  const weeksToApplications = weeksUntilDate(season.applicationDate, options.now);
  if (weeksToStart <= 6) return 5;
  if (weeksToApplications > 8) return 0;
  if (weeksToApplications > 0 || plan.diagnosticStatus !== "completed") return 1;
  if (weeksToStart <= 18) return 5;
  if (weeksToStart <= 30) return 4;
  return plan.diagnosticScore >= 6 ? 3 : 1;
}

export function getPrepPaceText(plan, options = {}) {
  const season = prepSeasonDefs[plan.season];
  const weeksToStart = weeksUntilDate(season.startDate, options.now);
  const weeksToApplications = weeksUntilDate(season.applicationDate, options.now);
  if (weeksToStart <= 0) return "目标 summer 已开始：以补录、面试复盘和下一周期准备为主。";
  if (weeksToStart <= 6) return `距目标开始约 ${weeksToStart} 周：以补录、整套模拟和 final-day 即时准备为主。`;
  if (weeksToApplications <= 0) return "常见申请窗口已开启：滚动投递，同时推进 OA、technical 与 behavioral 准备。";
  if (weeksToApplications <= 8) return `距常见申请窗口约 ${weeksToApplications} 周：立即准备简历、baseline 与 OA 限时训练。`;
  return `距常见申请窗口约 ${weeksToApplications} 周：先建立基础、项目表达和岗位判断，再转入限时训练。`;
}

export function getPrepFocusSkills(plan) {
  const roleFocus = prepRoleDefs[plan.role].focus;
  if (plan.diagnosticStatus !== "completed") return roleFocus;
  return [...roleFocus].sort((left, right) => (
    Number(plan.diagnosticScores[left] ?? 50) - Number(plan.diagnosticScores[right] ?? 50)
  ));
}

export function getPrepDailyTasks(plan, deps = {}) {
  const localDateKey = deps.localDateKey || (() => new Date().toISOString().slice(0, 10));
  const formatCategoryLabel = deps.formatCategoryLabel || ((value) => value);
  const focus = getPrepFocusSkills(plan);
  const stageIndex = getPrepStageIndex(plan, { now: deps.now });
  const primary = focus[0] || "probabilityExpectation";
  const secondary = focus[1] || "leetcode";
  const tasks = [
    {
      id: "core",
      title: `${formatCategoryLabel(primary)} 基础题`,
      detail: `完成 3 道 ${formatCategoryLabel(primary)} 题并写下清晰解题结构。`,
      minutes: plan.weeklyHours >= 12 ? 45 : 35,
      action: "problems",
      query: primary
    },
    {
      id: "speed",
      title: plan.role === "quantDeveloper" ? "限时 Coding OA" : "OA 速度训练",
      detail: plan.role === "quantDeveloper"
        ? "限时完成 2 道算法题，复盘复杂度与边界情况。"
        : "完成一轮速算，再做 2 道概率或期望短题。",
      minutes: 25,
      action: plan.role === "quantDeveloper" ? "problems" : "tools",
      query: plan.role === "quantDeveloper" ? "leetcode" : ""
    },
    {
      id: "verbal",
      title: stageIndex >= 3 ? "面试口述模拟" : `${formatCategoryLabel(secondary)} 主题复盘`,
      detail: stageIndex >= 3
        ? "进行 3 题 technical mock：先澄清，再口述假设与结论。"
        : `学习 ${formatCategoryLabel(secondary)}，并把一道题讲成面试回答。`,
      minutes: 35,
      action: stageIndex >= 3 ? "interview" : "problems",
      query: secondary
    },
    {
      id: "application",
      title: stageIndex >= 3 ? "Behavioral 故事库" : "申请材料与岗位扫描",
      detail: stageIndex >= 3
        ? "整理 1 个协作或失败复盘故事，并练习 Why quant / Why firm。"
        : "完善一条量化项目 bullet，并追踪合适的目标岗位。",
      minutes: 25,
      action: stageIndex >= 3 ? "interview-behavioral" : "resume"
    },
    {
      id: "pipeline",
      title: stageIndex >= 3 ? "面经复盘归档" : "申请管线维护",
      detail: stageIndex >= 3
        ? "记录最近一次轮次的流程、考察主题和下一步训练，再决定是否分享。"
        : "核对岗位季次、毕业要求、deadline 与下一步联系人。",
      minutes: 15,
      action: stageIndex >= 3 ? "experiences" : "jobs"
    }
  ];
  const limit = plan.weeklyHours <= 5 ? 3 : plan.weeklyHours <= 8 ? 4 : 5;
  const dateKey = localDateKey();
  const preparedTasks = tasks.slice(0, limit).map((task) => {
    const key = `${dateKey}:${task.id}`;
    const override = plan.taskOverrides?.[key] || {};
    return {
      ...task,
      title: override.title || task.title,
      detail: override.detail || task.detail,
      minutes: override.minutes || task.minutes,
      skill: task.query || task.action,
      done: Boolean(plan.completedTasks[key])
    };
  });
  const customTasks = (plan.customTasks || [])
    .filter((task) => task.date === dateKey)
    .map((task) => ({
      ...task,
      skill: task.query || task.action || "custom",
      done: Boolean(plan.completedTasks[`${dateKey}:${task.id}`])
    }));
  return [...preparedTasks, ...customTasks];
}

export function buildLegacyTodayStudyPlan(options = {}) {
  const {
    state = {},
    language = "zh",
    makeId = () => `${Date.now()}-${Math.random()}`,
    getSkillScore = (xp) => Math.min(100, Math.floor((xp || 0) / 40)),
    graduationTerm = DEFAULT_GRADUATION_TERM
  } = options;
  const isEn = language === "en";
  const weakSkills = Object.entries(skillDefs)
    .map(([key, def]) => ({ key, def, score: getSkillScore(state.skills?.[key] || 0) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  const primary = weakSkills[0]?.def || skillDefs.probabilityExpectation;
  const secondary = weakSkills[1]?.def || skillDefs.leetcode;
  const resumeText = state.resume?.text || "";
  const resumeTask = resumeText.length > 300
    ? {
      id: makeId(),
      title: isEn ? "Tighten resume bullets" : "过一遍简历 bullet",
      detail: isEn
        ? "Rewrite 2 bullets with metric + action + result, then run the Resume Module."
        : "挑 2 条经历改成 metric + action + result，再用简历模块检查。",
      minutes: 20,
      skill: "resume"
    }
    : {
      id: makeId(),
      title: isEn ? "Upload resume draft" : "上传或粘贴简历",
      detail: isEn
        ? `Target graduation term: ${graduationTerm}. Add a first draft so QuantGym can review gaps.`
        : `毕业时间先按 ${graduationTerm}。先放入一版简历，方便系统检查短板。`,
      minutes: 15,
      skill: "resume"
    };

  return {
    createdAt: new Date().toISOString(),
    summary: isEn ? "Built from your lowest score areas." : "根据当前最低分能力项生成。",
    items: [
      {
        id: makeId(),
        title: isEn ? `Drill ${primary.name}` : `刷 ${primary.name}`,
        detail: isEn
          ? "Solve 3 question-bank or interview-style problems and write the clean conditioning / setup."
          : "刷 3 道题库/面试风格题，把条件、随机变量和关键等式写清楚。",
        minutes: 35,
        skill: weakSkills[0]?.key || "probabilityExpectation"
      },
      {
        id: makeId(),
        title: isEn ? `LeetCode + ${secondary.name}` : `LeetCode + ${secondary.name}`,
        detail: isEn
          ? "Do 2 LeetCode problems around the weakest pattern, then summarize the template."
          : "做 2 道相关 LeetCode，重点复盘模板、复杂度和边界条件。",
        minutes: 45,
        skill: weakSkills[1]?.key || "leetcode"
      },
      resumeTask,
      {
        id: makeId(),
        title: isEn ? "Applications scan" : "求职岗位扫描",
        detail: isEn
          ? "Open the Jobs module and save 2 internship/full-time roles worth applying to."
          : "打开求职模块，筛 2 个 internship/full-time 岗位，记录申请链接。",
        minutes: 15,
        skill: "jobs"
      }
    ]
  };
}

export function buildTodayStudyPlan(options = {}) {
  const prepPlan = normalizePrepPlan(options.prepPlan, {
    makeId: options.makeId,
    localDateKey: options.localDateKey
  });
  if (prepPlan) {
    const tasks = getPrepDailyTasks(prepPlan, {
      localDateKey: options.localDateKey,
      formatCategoryLabel: options.formatCategoryLabel,
      now: options.now
    });
    const done = tasks.filter((task) => task.done).length;
    return {
      createdAt: new Date().toISOString(),
      summary: `${prepSeasonDefs[prepPlan.season].label} · ${prepRoleDefs[prepPlan.role].label} · 今日 ${done}/${tasks.length} 完成`,
      items: tasks
    };
  }
  return buildLegacyTodayStudyPlan(options);
}
