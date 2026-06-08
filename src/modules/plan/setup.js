import {
  prepRoleDefs,
  prepSeasonDefs
} from '../../prep-data.js';
import { normalizePrepPlan } from './data.js';

function getNowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

function getFormData(form) {
  return form instanceof FormData ? form : new FormData(form);
}

export function readPrepPlanForm(form) {
  const data = getFormData(form);
  const roleValue = data.get("prepRole");
  const seasonValue = data.get("prepSeason");
  return {
    track: data.get("prepTrack") === "fulltime" ? "fulltime" : "internship",
    role: prepRoleDefs[roleValue] ? roleValue : "quantTrading",
    season: prepSeasonDefs[seasonValue] ? seasonValue : "2027-summer",
    weeklyHours: Number(data.get("prepHours") || 8),
    wantsDiagnostic: data.get("prepDiagnostic") !== "skip"
  };
}

export function buildPrepPlanFromValues(values = {}, options = {}) {
  const {
    previousPrepPlan,
    makeId,
    localDateKey,
    now = new Date()
  } = options;

  const track = values.track === "fulltime" ? "fulltime" : "internship";
  const role = prepRoleDefs[values.role] ? values.role : "quantTrading";
  const season = prepSeasonDefs[values.season] ? values.season : "2027-summer";
  const weeklyHours = Number(values.weeklyHours || 8);
  const wantsDiagnostic = values.diagnostic !== "skip" && values.wantsDiagnostic !== false;

  const previous = normalizePrepPlan(previousPrepPlan, { makeId, localDateKey });
  const sameTarget = previous
    && previous.track === track
    && previous.role === role
    && previous.season === season;
  const diagnosticStatus = wantsDiagnostic
    ? sameTarget && previous.diagnosticStatus === "completed" ? "completed" : "pending"
    : "skipped";

  return normalizePrepPlan({
    track,
    role,
    season,
    weeklyHours,
    diagnosticStatus,
    diagnosticScore: diagnosticStatus === "completed" ? previous.diagnosticScore : 0,
    diagnosticScores: diagnosticStatus === "completed" ? previous.diagnosticScores : {},
    completedTasks: sameTarget ? previous.completedTasks : {},
    taskOverrides: sameTarget ? previous.taskOverrides : {},
    customTasks: sameTarget ? previous.customTasks : [],
    createdAt: sameTarget ? previous.createdAt : getNowIso(now),
    updatedAt: getNowIso(now)
  }, { makeId, localDateKey });
}

export function buildPrepPlanFromForm(options = {}) {
  const {
    form,
    previousPrepPlan,
    makeId,
    localDateKey,
    now = new Date()
  } = options;
  if (!form) return null;

  const values = readPrepPlanForm(form);
  const previous = normalizePrepPlan(previousPrepPlan, { makeId, localDateKey });
  const sameTarget = previous
    && previous.track === values.track
    && previous.role === values.role
    && previous.season === values.season;
  const diagnosticStatus = values.wantsDiagnostic
    ? sameTarget && previous.diagnosticStatus === "completed" ? "completed" : "pending"
    : "skipped";

  return normalizePrepPlan({
    track: values.track,
    role: values.role,
    season: values.season,
    weeklyHours: values.weeklyHours,
    diagnosticStatus,
    diagnosticScore: diagnosticStatus === "completed" ? previous.diagnosticScore : 0,
    diagnosticScores: diagnosticStatus === "completed" ? previous.diagnosticScores : {},
    completedTasks: sameTarget ? previous.completedTasks : {},
    taskOverrides: sameTarget ? previous.taskOverrides : {},
    customTasks: sameTarget ? previous.customTasks : [],
    createdAt: sameTarget ? previous.createdAt : getNowIso(now),
    updatedAt: getNowIso(now)
  }, { makeId, localDateKey });
}
