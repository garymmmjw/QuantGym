import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

export function useInterviewPageModel() {
  const appServices = useAppServices();
  const api = usePageApi("interview");
  const pageApi = usePageApi();
  const userState = useUserStateStore((state) => state.value || {});
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const interviewLive = api?.getState?.() || {};

  const view = useMemo(() => {
    void revision;
    void userState.problems;
    void userState.problemStates;
    void interviewLive.messages?.length;
    void interviewLive.session?.currentIndex;
    void interviewLive.session?.remainingSeconds;
    void interviewLive.session?.completed;
    void interviewLive.session?.awaitingNext;
    return api?.getViewModel?.() || { phase: "setup", setup: {} };
  }, [
    api,
    revision,
    userState.problems,
    userState.problemStates,
    interviewLive.messages?.length,
    interviewLive.session?.currentIndex,
    interviewLive.session?.remainingSeconds,
    interviewLive.session?.completed,
    interviewLive.session?.awaitingNext
  ]);

  useEffect(() => {
    api?.sync?.();
  }, [api, revision, userState.problems, userState.problemStates]);

  useEffect(() => {
    pageApi?.refreshIcons?.({ root: document.querySelector(".interview-section") || document });
  }, [pageApi, userState.problems, userState.problemStates, view.phase]);

  useEffect(() => {
    if (!interviewLive.session || interviewLive.session.completed) return undefined;
    const id = window.setInterval(() => bump(), 1000);
    return () => window.clearInterval(id);
  }, [bump, interviewLive.session, interviewLive.session?.completed]);

  const wrap = useCallback((fn) => (...args) => {
    const result = fn?.(...args);
    if (result && typeof result.finally === "function") {
      result.finally(() => bump());
      return result;
    }
    bump();
    return result;
  }, [bump]);

  return {
    api,
    view,
    selectLanguage: wrap((value) => api?.selectLanguage?.(value)),
    selectMode: wrap((value) => api?.selectMode?.(value)),
    handleSetupChange: wrap((field) => api?.handleSetupChange?.(field)),
    toggleCategory: wrap((value) => api?.toggleCategory?.(value)),
    updatePdfMeta: wrap((event) => api?.updatePdfMeta?.(event)),
    updateAnswerFileMeta: wrap((event) => api?.updateAnswerFileMeta?.(event)),
    autoSizeAnswer: () => api?.autoSizeAnswer?.(),
    handleAnswerKeydown: (event) => api?.handleAnswerKeydown?.(event),
    handleTranscriptAction: wrap((event) => api?.handleTranscriptAction?.(event)),
    handleTranscriptActionValue: wrap((value) => api?.handleTranscriptActionValue?.(value)),
    saveLlmConfig: wrap(() => api?.saveLlmConfig?.()),
    start: wrap(() => api?.start?.()),
    requestHint: wrap(() => api?.requestHint?.()),
    revealAnswer: wrap(() => api?.revealAnswer?.()),
    nextQuestion: wrap(() => api?.nextQuestion?.()),
    saveFavorite: wrap(() => api?.saveFavorite?.()),
    shareQuestion: wrap(() => api?.shareQuestion?.()),
    restart: wrap(() => api?.restart?.()),
    exportReport: wrap(() => api?.exportReport?.()),
    togglePanel: wrap(() => api?.togglePanel?.()),
    setPanelExpandedIndex: wrap((index) => api?.setPanelExpandedIndex?.(index)),
    exit: wrap(() => api?.exit?.()),
    resume: wrap(() => api?.resume?.()),
    toggleVoice: wrap(() => api?.toggleVoice?.()),
    clear: wrap(() => api?.clear?.()),
    submitAnswer: wrap((event) => { event?.preventDefault?.(); return api?.submitAnswer?.(); }),
    bump
  };
}
