import { APPLICATION_DEFAULTS, APPLICATION_FIELDS, getApplications, saveApplication, setApplicationArchived } from './applicationModel.js';

export function createApplicationDraft({ application = null, prefill = null } = {}) {
  return {
    id: application?.id || null,
    newApplicationId: application?.id || `application-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    baseline: application,
    values: { ...Object.fromEntries(APPLICATION_FIELDS.map(field => [field, application?.[field] ?? APPLICATION_DEFAULTS[field]])), ...prefill },
  };
}

// The store keeps failed writes in memory. Keep their identity and opening snapshot
// with the form, then force a durable write when the user retries an unchanged form.
export function persistApplicationDraft(update, draft) {
  let nextDraft = draft;
  const result = update(latest => {
    const applicationId = draft.id || draft.newApplicationId;
    const existing = getApplications(latest, { includeArchived: true }).find(row => row.id === applicationId);
    const next = saveApplication(latest, existing ? applicationId : draft.id, draft.values, {
      baseline: draft.baseline,
      newApplicationId: applicationId,
    });
    const saved = getApplications(next, { includeArchived: true }).find(row => row.id === applicationId);
    nextDraft = { ...draft, id: saved.id, baseline: saved };
    return { ...next };
  });
  return { ...result, draft: nextDraft };
}

export function persistApplicationArchive(update, applicationId, archived) {
  return update(latest => ({ ...setApplicationArchived(latest, applicationId, archived) }));
}
