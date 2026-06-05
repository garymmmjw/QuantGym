import { listen } from '../../ui/events.js';

export function createExperiencesModule(deps = {}) {
  let mounted = false;
  let pendingShareId = "";
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getRecords = () => deps.getRecords?.() || [];
  const text = (key, params) => deps.t?.(key, params) || key;
  const label = (key) => {
    const value = deps.labels?.[key];
    return typeof value === "function" ? value() : value || key;
  };
  const escape = (value) => deps.escapeHtml?.(String(value ?? "")) ?? String(value ?? "");
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  const localDateKey = () => deps.localDateKey?.() || new Date().toISOString().slice(0, 10);
  const normalize = (record) => deps.normalizeExperience?.(record) || record;

  const resetForm = () => {
    const els = getElements();
    if (!els.experienceForm) return;
    els.experienceForm.reset();
    els.experienceId.value = "";
    els.experienceDate.value = localDateKey();
    els.experienceFormTitle.textContent = label("newTitle");
    els.cancelExperienceEditBtn?.classList.add("hidden");
  };

  const editRecord = (id) => {
    const els = getElements();
    const record = getRecords().find((item) => item.id === id);
    if (!record || !els.experienceForm) return;
    els.experienceId.value = record.id;
    els.experienceFirm.value = record.firm;
    els.experienceRole.value = record.role;
    els.experienceStage.value = record.stage;
    els.experienceSeason.value = record.season;
    els.experienceDate.value = record.date;
    els.experienceOutcome.value = record.outcome;
    els.experienceTags.value = record.tags.join(", ");
    els.experienceSummaryInput.value = record.summary;
    els.experienceTopics.value = record.topics;
    els.experienceReflection.value = record.reflection;
    els.experienceFormTitle.textContent = label("editTitle");
    els.cancelExperienceEditBtn?.classList.remove("hidden");
    els.experienceForm.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const render = () => {
    const els = getElements();
    if (!els.experienceList) return;
    if (els.experienceDate && !els.experienceDate.value && !els.experienceId.value) {
      els.experienceDate.value = localDateKey();
    }
    const records = [...getRecords()]
      .map(normalize)
      .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
    const filter = els.experienceFilter?.value || "all";
    const visibleRecords = filter === "all" ? records : records.filter((item) => item.stage === filter);
    const sharedCount = records.filter((item) => item.sharedPostId).length;
    if (els.experienceCount) els.experienceCount.textContent = String(records.length);
    if (els.sharedExperienceCount) els.sharedExperienceCount.textContent = String(sharedCount);
    els.experienceList.innerHTML = "";
    if (!visibleRecords.length) {
      els.experienceList.appendChild(deps.emptyBlock?.(records.length ? label("emptyFiltered") : label("emptyRecords")) || document.createTextNode(""));
      return;
    }
    els.experienceList.innerHTML = visibleRecords.map((record) => `
      <article class="experience-card">
        <div class="experience-card-head">
          <div class="experience-card-title">
            <div class="experience-badges">
              <span>${escape(record.stage)}</span>
              <span class="outcome">${escape(deps.formatOutcome?.(record.outcome) || record.outcome)}</span>
              ${record.sharedPostId ? `<span class="shared">${escape(text("experienceShared"))}</span>` : `<span class="private">${escape(text("experiencePrivate"))}</span>`}
            </div>
            <h4>${escape(record.firm)} - ${escape(record.role)}</h4>
            <small>${escape(record.season)} - ${escape(deps.formatDate?.(record.date) || record.date)}</small>
          </div>
          <div class="experience-card-actions">
            <button class="icon-button ghost" type="button" data-experience-edit="${escape(record.id)}" aria-label="${escape(text("editExperience"))}" title="${escape(text("editExperience"))}"><i data-lucide="pencil-line"></i></button>
            <button class="icon-button ghost danger" type="button" data-experience-delete="${escape(record.id)}" aria-label="${escape(text("deleteExperience"))}" title="${escape(text("deleteExperience"))}"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
        <div class="experience-card-body">
          <div><strong>${escape(label("summaryLabel"))}</strong><p>${escape(record.summary)}</p></div>
          ${record.topics ? `<div><strong>${escape(label("topicsLabel"))}</strong><p>${escape(record.topics)}</p></div>` : ""}
          ${record.reflection ? `<div><strong>${escape(label("reflectionLabel"))}</strong><p>${escape(record.reflection)}</p></div>` : ""}
        </div>
        ${record.tags.length ? `<div class="experience-tags">${record.tags.map((tag) => `<span>${escape(tag)}</span>`).join("")}</div>` : ""}
        <div class="experience-share-row">
          <button class="secondary-button" type="button" data-experience-share="${escape(record.id)}"><i data-lucide="share-2"></i>${escape(record.sharedPostId ? label("updateShare") : label("shareToCommunity"))}</button>
        </div>
        ${pendingShareId === record.id ? `
          <div class="experience-share-confirm" role="alert">
            <p>${escape(label("shareConfirmMessage"))}</p>
            <div>
              <button class="primary-button" type="button" data-experience-share-confirm="${escape(record.id)}">${escape(label("confirmShare"))}</button>
              <button class="secondary-button" type="button" data-experience-share-cancel="true">${escape(label("cancel"))}</button>
            </div>
          </div>
        ` : ""}
      </article>
    `).join("");
    deps.refreshIcons?.();
  };

  const save = () => {
    const els = getElements();
    if (!els.experienceForm) return;
    const previous = getRecords().find((item) => item.id === els.experienceId.value);
    const now = new Date().toISOString();
    const record = normalize({
      ...previous,
      id: previous?.id || deps.makeId?.(),
      firm: els.experienceFirm.value,
      role: els.experienceRole.value,
      stage: els.experienceStage.value,
      season: els.experienceSeason.value,
      date: els.experienceDate.value || localDateKey(),
      outcome: els.experienceOutcome.value,
      tags: deps.parseTags?.(els.experienceTags.value) || [],
      summary: els.experienceSummaryInput.value,
      topics: els.experienceTopics.value,
      reflection: els.experienceReflection.value,
      createdAt: previous?.createdAt || now,
      updatedAt: now
    });
    if (!record.firm || !record.summary) return;
    deps.setRecords?.([
      record,
      ...getRecords().filter((item) => item.id !== record.id)
    ]);
    pendingShareId = "";
    deps.saveState?.();
    resetForm();
    render();
  };

  const removeRecord = (id) => {
    const els = getElements();
    const record = getRecords().find((item) => item.id === id);
    if (!record) return;
    const warning = record.sharedPostId ? label("deleteSharedWarning") : label("deleteWarning");
    if (!window.confirm(warning)) return;
    deps.setRecords?.(getRecords().filter((item) => item.id !== id));
    if (els.experienceId?.value === id) resetForm();
    pendingShareId = "";
    deps.saveState?.();
    render();
  };

  const handleListAction = (event) => {
    const edit = event.target.closest("[data-experience-edit]");
    if (edit) {
      editRecord(edit.dataset.experienceEdit);
      return;
    }
    const remove = event.target.closest("[data-experience-delete]");
    if (remove) {
      removeRecord(remove.dataset.experienceDelete);
      return;
    }
    const share = event.target.closest("[data-experience-share]");
    if (share) {
      pendingShareId = share.dataset.experienceShare;
      render();
      return;
    }
    if (event.target.closest("[data-experience-share-cancel]")) {
      pendingShareId = "";
      render();
      return;
    }
    const confirmShare = event.target.closest("[data-experience-share-confirm]");
    if (confirmShare) {
      pendingShareId = "";
      deps.publish?.(confirmShare.dataset.experienceShareConfirm);
    }
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.newExperienceBtn, "click", resetForm);
      bind(els.cancelExperienceEditBtn, "click", resetForm);

      bind(els.experienceForm, "submit", (event) => {
        event.preventDefault();
        save();
      });

      bind(els.experienceFilter, "change", render);
      bind(els.experienceList, "click", handleListAction);
      bind(els.openCommunityExperiencesBtn, "click", () => deps.openCommunityExperiences?.());
    },

    render() {
      render();
    },

    resetForm,

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
