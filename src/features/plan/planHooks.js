import { useCallback, useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

const DEFAULT_SETUP = {
  track: "internship",
  season: "2027-summer",
  role: "quantTrading",
  weeklyHours: 8,
  diagnostic: "take"
};

export function usePlanPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const userState = useUserStateStore((state) => state.value || {});
  const t = appServices.t || ((key) => key);
  const api = usePageApi("plan");
  const [revision, setRevision] = useState(0);
  const [setup, setSetup] = useState(DEFAULT_SETUP);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState({});
  const [diagnosticMessage, setDiagnosticMessage] = useState("");

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const view = useMemo(() => {
    void revision;
    void userState.prepPlan;
    return api?.getViewModel?.() || { mode: "setup", showSetup: true, setupDefaults: DEFAULT_SETUP };
  }, [api, revision, userState.prepPlan]);

  const updateSetup = useCallback((key, value) => {
    setSetup((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSetupFromView = useCallback(() => {
    if (view.setupDefaults) setSetup(view.setupDefaults);
  }, [view.setupDefaults]);

  const createPlan = useCallback((event) => {
    event?.preventDefault?.();
    api?.create?.(setup);
    bump();
  }, [api, bump, setup]);

  const openEditor = useCallback(() => {
    const next = api?.openEditor?.();
    if (next?.setupDefaults) setSetup(next.setupDefaults);
    bump();
  }, [api, bump]);

  const toggleTask = useCallback((taskId) => {
    api?.toggleTask?.(taskId);
    bump();
  }, [api, bump]);

  const openTask = useCallback((action, query) => {
    api?.openTask?.(action, query);
  }, [api]);

  const startDiagnostic = useCallback((status) => {
    api?.startDiagnostic?.(status);
    setDiagnosticAnswers({});
    setDiagnosticMessage("");
    bump();
  }, [api, bump]);

  const setDiagnosticAnswer = useCallback((questionId, value) => {
    setDiagnosticAnswers((prev) => ({ ...prev, [`diagnostic-${questionId}`]: value }));
  }, []);

  const submitDiagnostic = useCallback((event) => {
    event?.preventDefault?.();
    const result = api?.submitDiagnostic?.(diagnosticAnswers);
    if (!result?.ok) {
      setDiagnosticMessage(result?.missingCount
        ? `还有 ${result.missingCount} 题未作答。`
        : "");
      return;
    }
    setDiagnosticAnswers({});
    setDiagnosticMessage("");
    bump();
  }, [api, bump, diagnosticAnswers]);

  const refreshIcons = useCallback(() => {
    pageApi?.refreshIcons?.();
  }, [appServices]);

  return {
    t,
    view,
    setup,
    updateSetup,
    resetSetupFromView,
    createPlan,
    openEditor,
    toggleTask,
    openTask,
    startDiagnostic,
    diagnosticAnswers,
    setDiagnosticAnswer,
    submitDiagnostic,
    diagnosticMessage,
    formatCategoryLabel: api?.formatCategoryLabel,
    safeExternalUrl: api?.safeExternalUrl,
    refreshIcons
  };
}
