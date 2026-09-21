import { useEffect, useRef, useState } from "react";
import { getFreePracticeStatus } from "../../modules/problems/freePracticeAttempts.js";

export function useFreePracticeAttempt(problemId, model) {
  const [now, setNow] = useState(Date.now);
  const startRef = useRef(model.startPractice);
  startRef.current = model.startPractice;
  const personal = model.problemStates.find(item => item.problemId === problemId) || { problemId };
  const status = getFreePracticeStatus(personal, now);

  useEffect(() => {
    setNow(Date.now());
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [problemId, model.accountId]);

  useEffect(() => {
    if (problemId && !status.selectedOutcome && !status.isRunning) startRef.current(problemId);
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
