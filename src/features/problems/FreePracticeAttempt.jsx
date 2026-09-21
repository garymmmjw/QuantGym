export const PRACTICE_OUTCOMES = [
  { value: "correct", zh: "自己做对", en: "Solved independently", icon: "✓" },
  { value: "idea_wrong", zh: "有思路做错", en: "Had an approach, got it wrong", icon: "~" },
  { value: "wrong", zh: "做错", en: "Got it wrong", icon: "×" }
];

function duration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const remaining = total % 60;
  return [hours || null, String(minutes).padStart(2, "0"), String(remaining).padStart(2, "0")].filter(value => value !== null).join(":");
}

export function FreePracticeTimer({ practice, isEnglish, onShowAnswer }) {
  return <div className="fp-attempt-timer-bar">
    <div className="fp-attempt-clock"><span className={practice.isRunning ? "is-running" : ""} aria-hidden="true" /><span>{isEnglish ? (practice.isRunning ? "Time elapsed" : "Recorded time") : (practice.isRunning ? "本次计时" : "本次用时")}</span><strong data-free-practice-timer role="timer">{duration(practice.elapsedSeconds)}</strong></div>
    <button type="button" data-practice-show-answer onClick={onShowAnswer}>{isEnglish ? "View answer" : "查看答案"} <span aria-hidden="true">↗</span></button>
  </div>;
}

export function FreePracticeOutcomes({ practice, isEnglish }) {
  const remainingHours = Math.floor(practice.remainingSeconds / 3600);
  const remainingMinutes = Math.floor(practice.remainingSeconds / 60) % 60;
  const remaining = isEnglish
    ? `${remainingHours}h ${remainingMinutes}m ${practice.remainingSeconds % 60}s`
    : `${remainingHours ? `${remainingHours} 小时 ` : ""}${remainingMinutes ? `${remainingMinutes} 分 ` : ""}${practice.remainingSeconds % 60} 秒`;
  return <section className="fp-attempt-results" aria-label={isEnglish ? "Practice result" : "本次练习结果"}>
    <div className="fp-attempt-results-heading"><h3>{isEnglish ? "How did this attempt go?" : "这次做得怎么样？"}</h3><span>{isEnglish ? "Attempts: " : "本题已练 "}<strong data-free-practice-attempt-count>{practice.attemptCount}</strong>{isEnglish ? "" : " 次"}</span></div>
    <div className="fp-outcome-options" role="group" aria-label={isEnglish ? "Choose an outcome" : "选择本次结果"}>
      {PRACTICE_OUTCOMES.map(option => <button key={option.value} type="button" data-practice-outcome={option.value} aria-pressed={practice.selectedOutcome === option.value} className={`fp-outcome is-${option.value}${practice.selectedOutcome === option.value ? " is-selected" : ""}`} onClick={() => practice.recordOutcome(option.value)}><span className="fp-outcome-symbol" aria-hidden="true">{option.icon}</span>{isEnglish ? option.en : option.zh}</button>)}
    </div>
    {practice.selectedOutcome ? <p className="fp-attempt-rule" data-practice-cooldown>{isEnglish ? `Recorded. You can revise this result; it still counts as one attempt. A new attempt can be recorded in ${remaining}.` : `已记录。本次可改选，不重复计数。${remaining}后可再次记录。`}</p>
      : <p className="fp-attempt-rule">{isEnglish ? "Choose any result to record one attempt and stop the timer. You can view the answer at any time." : "点击任一结果，记一次练习并停止计时。答案随时可以查看。"}</p>}
  </section>;
}
