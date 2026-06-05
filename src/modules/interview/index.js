import { listen } from '../../ui/events.js';
import { setInterviewToggleGroupActive } from './setup.js';

export function createInterviewModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getRoot = () => deps.documentRef || globalThis.document;
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();
      const root = getRoot();

      root.querySelectorAll("[data-interview-lang]").forEach((button) => {
        bind(button, "click", () => {
          setInterviewToggleGroupActive(root, "[data-interview-lang]", button);
          deps.selectLanguage?.(button.dataset.interviewLang);
        });
      });

      root.querySelectorAll("[data-interview-mode]").forEach((button) => {
        bind(button, "click", () => {
          setInterviewToggleGroupActive(root, "[data-interview-mode]", button);
        });
      });

      [
        [els.interviewTypeSelect, "type"],
        [els.interviewQuestionCount, "count"],
        [els.interviewQuestionTime, "time"],
        [els.interviewSourceSelect, "source"]
      ].forEach(([node, field]) => {
        bind(node, "change", () => deps.handleSetupChange?.(field));
      });

      bind(els.interviewCategoryPicker, "click", (event) => {
        const button = event.target.closest("[data-interview-category]");
        if (!button) return;
        deps.toggleCategory?.(button.dataset.interviewCategory);
      });

      [els.interviewQuestionCount, els.interviewQuestionTime].forEach((node) => {
        bind(node, "input", () => deps.updateSetupVisibility?.());
      });

      bind(els.interviewAnswerModeSelect, "change", () => deps.updateAnswerMode?.());
      bind(els.interviewPdfInput, "change", (event) => deps.updatePdfMeta?.(event));
      bind(els.interviewAnswerFile, "change", (event) => deps.updateAnswerFileMeta?.(event));
      bind(els.interviewAnswer, "input", () => deps.autoSizeAnswer?.());
      bind(els.interviewAnswer, "keydown", (event) => deps.handleAnswerKeydown?.(event));
      bind(els.interviewTranscript, "click", (event) => deps.handleTranscriptAction?.(event));
      bind(els.saveLlmConfigBtn, "click", () => deps.saveLlmConfig?.());
      bind(els.startInterviewBtn, "click", () => deps.start?.());
      bind(els.hintInterviewBtn, "click", () => deps.requestHint?.());
      bind(els.revealAnswerBtn, "click", () => deps.revealAnswer?.());
      bind(els.nextInterviewQuestionBtn, "click", () => deps.nextQuestion?.());
      bind(els.saveInterviewFavoriteBtn, "click", () => deps.saveFavorite?.());
      bind(els.shareInterviewQuestionBtn, "click", () => deps.shareQuestion?.());
      bind(els.restartInterviewBtn, "click", () => deps.restart?.());
      bind(els.exportInterviewReportBtn, "click", () => deps.exportReport?.());
      bind(els.toggleInterviewPanelBtn, "click", () => deps.togglePanel?.());
      bind(els.exitInterviewBtn, "click", () => deps.exit?.());
      bind(els.resumeInterviewBtn, "click", () => deps.resume?.());
      bind(els.voiceAnswerBtn, "click", () => deps.toggleVoice?.());
      bind(els.clearInterviewBtn, "click", () => deps.clear?.());

      bind(els.interviewForm, "submit", (event) => {
        event.preventDefault();
        deps.submitAnswer?.();
      });
    },

    render() {
      deps.renderSetup?.();
      deps.renderTranscript?.();
      deps.renderFavorites?.();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
