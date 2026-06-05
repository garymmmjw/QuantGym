import { listen } from '../../ui/events.js';

export function createResumeModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getResume = () => deps.normalizeResume?.(deps.getResume?.() || {}) || {};
  const setResume = (resume) => deps.setResume?.(deps.normalizeResume?.(resume) || resume);
  const text = (key, params) => deps.t?.(key, params) || key;
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  const renderReview = () => {
    const els = getElements();
    if (!els.resumeReview) return;
    const review = Array.isArray(getResume().review) ? getResume().review : [];
    els.resumeReview.innerHTML = "";
    if (!review.length) {
      const empty = document.createElement("p");
      empty.className = "muted-empty";
      empty.textContent = deps.getEmptyReviewLabel?.() || "Run the review to get role-specific edits.";
      els.resumeReview.appendChild(empty);
      return;
    }
    const list = document.createElement("ul");
    review.forEach((item) => {
      const row = document.createElement("li");
      row.textContent = item;
      list.appendChild(row);
    });
    els.resumeReview.appendChild(list);
  };

  const render = () => {
    const els = getElements();
    if (!els.resumeText || !els.resumeReview) return;
    const resume = getResume();
    if (document.activeElement !== els.resumeText) {
      els.resumeText.value = resume.text || "";
    }
    renderReview();
    deps.renderAccountResumeMeta?.();
  };

  const save = () => {
    const els = getElements();
    const resume = getResume();
    const body = els.resumeText?.value.trim() || "";
    setResume({
      ...resume,
      text: body,
      updatedAt: new Date().toISOString()
    });
    deps.saveState?.();
    render();
    if (els.accountMessage) els.accountMessage.textContent = text("resumeSaved");
  };

  const renderInlineReview = (items) => {
    setResume({ ...getResume(), review: items });
    renderReview();
  };

  const review = async () => {
    const els = getElements();
    const body = els.resumeText?.value.trim() || getResume().text || "";
    if (!body) {
      renderInlineReview([text("resumeNoContent")]);
      return;
    }
    setResume({
      ...getResume(),
      text: body,
      updatedAt: new Date().toISOString()
    });
    deps.saveState?.();
    deps.setButtonBusy?.(els.reviewResumeBtn, true, text("resumeReviewing"));
    try {
      let suggestions;
      try {
        suggestions = await deps.requestReview?.(body);
      } catch {
        suggestions = deps.localReview?.(body);
      }
      setResume({
        ...getResume(),
        review: suggestions || [],
        updatedAt: new Date().toISOString()
      });
      deps.saveState?.();
      render();
    } finally {
      deps.setButtonBusy?.(els.reviewResumeBtn, false);
    }
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.saveResumeBtn, "click", () => {
        save();
      });

      bind(els.resumeForm, "submit", (event) => {
        event.preventDefault();
        review();
      });
    },

    render() {
      render();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
