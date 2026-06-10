import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

export function useLibraryPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const api = usePageApi("library");
  const [revision, setRevision] = useState(0);
  const [alertMessage, setAlertMessage] = useState("");

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const view = useMemo(() => {
    void revision;
    return api?.getViewModel?.() || {
      kindFilter: "all",
      query: "",
      stats: { bookCount: 0, setCount: 0, totalProblems: 0 },
      labels: {},
      continueReading: [],
      books: [],
      questionSets: [],
      isEmpty: true,
      reader: { open: false }
    };
  }, [api, revision]);

  const setQuery = useCallback((value) => {
    api?.setQuery?.(value);
    bump();
  }, [api, bump]);

  const setKindFilter = useCallback((value) => {
    api?.setKindFilter?.(value);
    bump();
  }, [api, bump]);

  const openReader = useCallback(async (entryId) => {
    const result = await api?.openReader?.(entryId);
    if (!result?.ok && result?.message) setAlertMessage(result.message);
    bump();
    return result;
  }, [api, bump]);

  const closeReader = useCallback(() => {
    api?.closeReader?.();
    bump();
  }, [api, bump]);

  const handleAction = useCallback(async (entryId, action) => {
    const result = await api?.handleCardAction?.(entryId, action);
    if (result && typeof result.then === "function") {
      const settled = await result;
      if (!settled?.ok && settled?.message) setAlertMessage(settled.message);
      bump();
      return settled;
    }
    if (!result?.ok && result?.message) setAlertMessage(result.message);
    bump();
    return result;
  }, [api, bump]);

  const refreshIcons = useCallback((options) => {
    pageApi?.refreshIcons?.(options);
  }, [pageApi]);

  useEffect(() => {
    if (!alertMessage) return undefined;
    const timer = window.setTimeout(() => setAlertMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [alertMessage]);

  return {
    view,
    setQuery,
    setKindFilter,
    openReader,
    closeReader,
    handleAction,
    alertMessage,
    refreshIcons
  };
}
