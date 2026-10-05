import { useEffect, useRef, useState } from "react";
import { getFreePracticeStatus } from "../../modules/problems/freePracticeAttempts.js";

export function useFreePracticeAttempt(problemId, model) {
  const [now, setNow] = useState(Date.now);
  const modelRef = useRef(model);
  modelRef.current = model;
  const resumeRef = useRef(null);
  const personal = model.problemStates.find(item => item.problemId === problemId) || { problemId };
  const status = getFreePracticeStatus(personal, now);

  useEffect(() => {
    if (!problemId) return undefined;
    const accountId = modelRef.current.accountId;
    let sessionId = null;
    let pageHidden = false;
    let recover = true;
    let lastCheckpoint = Date.now();
    const ownsAccount = () => modelRef.current.accountId === accountId;
    const visible = () => !document.hidden && !pageHidden && ownsAccount();
    const resume = () => {
      if (!visible()) return;
      const result = modelRef.current.startPractice(problemId, { recover });
      recover = false;
      sessionId = result?.sessionId || null;
      lastCheckpoint = Date.now();
      setNow(lastCheckpoint);
    };
    const pause = () => {
      if (ownsAccount() && sessionId) modelRef.current.pausePractice(problemId, sessionId);
    };
    const tick = () => {
      if (!visible()) return;
      const at = Date.now();
      // Bound progress loss if the browser is terminated without lifecycle
      // events; reopening must never count the time it was closed.
      if (at - lastCheckpoint >= 10000 || at < lastCheckpoint) {
        if (sessionId) modelRef.current.checkpointPractice(problemId, sessionId);
        lastCheckpoint = at;
      }
      setNow(at);
    };
    const onVisibility = () => {
      if (document.hidden) {
        pause();
        setNow(Date.now());
      } else resume();
    };
    const onPageHide = () => {
      pageHidden = true;
      pause();
      setNow(Date.now());
    };
    const onPageShow = () => {
      pageHidden = false;
      resume();
    };
    resumeRef.current = resume;
    resume();
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      resumeRef.current = null;
      pause();
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [problemId, model.accountId, status.sessionId]);

  useEffect(() => {
    if (problemId && !status.selectedOutcome && !status.isRunning) resumeRef.current?.();
  }, [problemId, model.accountId, status.selectedOutcome, status.isRunning]);

  return {
    ...status,
    remainingSeconds: Math.max(0, Math.ceil(((status.windowExpiresAtMs || 0) - now) / 1000)),
    recordOutcome(outcome) {
      model.recordPracticeOutcome(problemId, outcome);
      setNow(Date.now());
    }
  };
}
