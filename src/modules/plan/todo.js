import {
  normalizePrepPlan,
  normalizeStudyPlan
} from './data.js';

function getNowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

function getDateKey(localDateKey) {
  return typeof localDateKey === "function"
    ? localDateKey()
    : new Date().toISOString().slice(0, 10);
}

function getTaskId(makeId) {
  return `custom-${typeof makeId === "function" ? makeId() : Date.now()}`;
}

export function buildTodoDockPlan(options = {}) {
  const {
    prepPlan,
    studyPlan,
    buildPrepTodayPlan,
    fallbackSummary = "",
    makeId,
    localDateKey
  } = options;
  const normalizedPrepPlan = normalizePrepPlan(prepPlan, { makeId, localDateKey });
  if (normalizedPrepPlan) {
    const todayPlan = typeof buildPrepTodayPlan === "function" ? buildPrepTodayPlan(normalizedPrepPlan) : null;
    return {
      type: "prep",
      summary: todayPlan?.summary || "",
      items: Array.isArray(todayPlan?.items) ? todayPlan.items : []
    };
  }
  const normalizedStudyPlan = normalizeStudyPlan(studyPlan, { makeId });
  if (!normalizedStudyPlan) return null;
  return {
    type: "study",
    summary: normalizedStudyPlan.summary || fallbackSummary,
    items: normalizedStudyPlan.items
  };
}

export function addTodoTaskToPlans(options = {}) {
  const {
    title: rawTitle = "",
    prepPlan,
    studyPlan,
    makeId,
    localDateKey,
    fallbackSummary = "",
    now = new Date()
  } = options;
  const title = String(rawTitle || "").trim();
  if (!title) return { changed: false };

  const nowIso = getNowIso(now);
  const dateKey = getDateKey(localDateKey);
  const normalizedPrepPlan = normalizePrepPlan(prepPlan, { makeId, localDateKey });
  if (normalizedPrepPlan) {
    return {
      changed: true,
      mode: "prep",
      prepPlan: {
        ...normalizedPrepPlan,
        customTasks: [
          ...(normalizedPrepPlan.customTasks || []),
          {
            id: getTaskId(makeId),
            date: dateKey,
            title,
            detail: "",
            minutes: 15,
            action: "custom",
            query: ""
          }
        ],
        updatedAt: nowIso
      }
    };
  }

  const normalizedStudyPlan = normalizeStudyPlan(studyPlan, { makeId }) || {
    createdAt: nowIso,
    summary: fallbackSummary,
    items: []
  };
  return {
    changed: true,
    mode: "study",
    studyPlan: {
      ...normalizedStudyPlan,
      items: [
        ...normalizedStudyPlan.items,
        {
          id: getTaskId(makeId),
          title,
          detail: "",
          minutes: 15,
          skill: "custom",
          done: false
        }
      ]
    }
  };
}

export function toggleStudyTodoTask(options = {}) {
  const { studyPlan, taskId, makeId } = options;
  if (!taskId) return { changed: false };
  const normalizedStudyPlan = normalizeStudyPlan(studyPlan, { makeId });
  if (!normalizedStudyPlan) return { changed: false };
  let found = false;
  const items = normalizedStudyPlan.items.map((item) => {
    if (item.id !== taskId) return item;
    found = true;
    return { ...item, done: !item.done };
  });
  if (!found) return { changed: false };
  return {
    changed: true,
    studyPlan: {
      ...normalizedStudyPlan,
      items
    }
  };
}

export function togglePrepTaskCompletion(options = {}) {
  const {
    prepPlan,
    taskId,
    makeId,
    localDateKey,
    now = new Date()
  } = options;
  if (!taskId) return { changed: false };
  const normalizedPrepPlan = normalizePrepPlan(prepPlan, { makeId, localDateKey });
  if (!normalizedPrepPlan) return { changed: false };
  const dateKey = getDateKey(localDateKey);
  const key = `${dateKey}:${taskId}`;
  const completedTasks = { ...(normalizedPrepPlan.completedTasks || {}) };
  completedTasks[key] = !completedTasks[key];
  return {
    changed: true,
    prepPlan: {
      ...normalizedPrepPlan,
      completedTasks,
      updatedAt: getNowIso(now)
    }
  };
}

export function updateTodoTaskInPlans(options = {}) {
  const {
    prepPlan,
    studyPlan,
    taskId,
    field,
    rawValue = "",
    makeId,
    localDateKey,
    now = new Date()
  } = options;
  if (!["title", "detail"].includes(field) || !taskId) return { changed: false };
  const value = String(rawValue || "").trim().slice(0, field === "title" ? 120 : 260);
  const normalizedPrepPlan = normalizePrepPlan(prepPlan, { makeId, localDateKey });
  if (normalizedPrepPlan) {
    const dateKey = getDateKey(localDateKey);
    let updatedCustomTask = false;
    const customTasks = (normalizedPrepPlan.customTasks || []).map((task) => {
      if (task.date !== dateKey || task.id !== taskId) return task;
      updatedCustomTask = true;
      return { ...task, [field]: value };
    });
    const taskOverrides = updatedCustomTask
      ? normalizedPrepPlan.taskOverrides
      : {
        ...(normalizedPrepPlan.taskOverrides || {}),
        [`${dateKey}:${taskId}`]: {
          ...(normalizedPrepPlan.taskOverrides?.[`${dateKey}:${taskId}`] || {}),
          [field]: value
        }
      };
    return {
      changed: true,
      mode: "prep",
      prepPlan: {
        ...normalizedPrepPlan,
        customTasks,
        taskOverrides,
        updatedAt: getNowIso(now)
      }
    };
  }

  const normalizedStudyPlan = normalizeStudyPlan(studyPlan, { makeId });
  if (!normalizedStudyPlan) return { changed: false };
  let found = false;
  const items = normalizedStudyPlan.items.map((item) => {
    if (item.id !== taskId) return item;
    found = true;
    return { ...item, [field]: value };
  });
  if (!found) return { changed: false };
  return {
    changed: true,
    mode: "study",
    studyPlan: {
      ...normalizedStudyPlan,
      items
    }
  };
}
