import { useCallback, useState } from "react";
import { usePageApi } from "../../stores/usePageApi.js";

export function usePkPageModel() {
  const pageApi = usePageApi();
  const api = usePageApi("pk");
  const [view, setView] = useState(() => api?.getView?.() || {
    opponentName: "Online Quant",
    userScore: 0,
    opponentScore: 0,
    problemText: "点击匹配开始。",
    feed: [],
    answer: ""
  });

  const sync = useCallback((next) => {
    if (next) setView(next);
    else setView(api?.getView?.() || view);
  }, [api, view]);

  const start = useCallback(() => {
    sync(api?.start?.());
    pageApi?.refreshIcons?.({ root: document.querySelector(".pk-section") || document });
  }, [api, pageApi, sync]);

  const submit = useCallback((event) => {
    event?.preventDefault?.();
    const submittedAnswer = event?.currentTarget?.elements?.pkAnswer?.value ?? view.answer;
    sync(api?.submit?.(submittedAnswer));
    pageApi?.refreshIcons?.({ root: document.querySelector(".pk-section") || document });
  }, [api, pageApi, sync, view.answer]);

  const reveal = useCallback(() => {
    sync(api?.reveal?.());
  }, [api, sync]);

  const setAnswer = useCallback((value) => {
    sync(api?.setAnswer?.(value));
  }, [api, sync]);

  return {
    view,
    start,
    submit,
    reveal,
    setAnswer
  };
}
