import { useEffect, useRef, useState } from "react";
import { drawReviewProblem, problemUrl } from "./leetcodeModel.js";
import { drawDueReview, previewReview, reviewState, reviewStatus, reviewSummary } from "./leetcodeReviewModel.js";

const ratings = [
  { value: "again", zh: "忘记了", en: "Forgot" },
  { value: "hard", zh: "费力想起", en: "With effort" },
  { value: "good", zh: "记得", en: "Remembered" },
  { value: "easy", zh: "很熟悉", en: "Very familiar" },
];

export function formatReviewDate(value, language = "zh") {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date) : "";
}

function intervalLabel(days, en) {
  if (!Number.isFinite(days) || days < 0) return en ? "After your feedback" : "反馈后安排";
  if (days < 1) {
    const minutes = Math.max(1, Math.round(days * 1440));
    if (minutes < 60) return en ? `In ${minutes} min` : `${minutes} 分钟后`;
    const hours = Math.round(minutes / 60);
    return en ? `In ${hours} ${hours === 1 ? "hour" : "hours"}` : `${hours} 小时后`;
  }
  const count = Math.round(days);
  return en ? `In ${count} ${count === 1 ? "day" : "days"}` : `${count} 天后`;
}

function reviewEventId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) return null;
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ReviewDueDate({ problem, language, now }) {
  const en = language === "en";
  const review = reviewState(problem);
  const state = reviewStatus(problem, now);
  const date = formatReviewDate(review.nextReviewAt, language);
  if (state === "uninitialized" || !date) return <div className="lc-problem-due is-uninitialized"><span>{en ? "First review pending" : "待首次复习"}</span><small>{en ? "No review date yet" : "尚未安排时间"}</small></div>;
  const due = new Date(review.nextReviewAt);
  const today = due.toDateString() === new Date(now).toDateString();
  const label = today ? (en ? "Today" : "今日复习") : state === "due" ? (en ? "Overdue" : "已逾期") : (en ? "Upcoming" : "未到期");
  return <div className={`lc-problem-due is-${state}`}><span>{label}</span><time dateTime={review.nextReviewAt}>{date}</time></div>;
}

export function LeetcodeReviewPanel({ lc, pool, allProblems, selectedProblem, onSelect, now, onLockChange }) {
  const en = lc.language === "en";
  const t = (zh, english) => en ? english : zh;
  const { connection } = lc.data;
  const feedbackAvailable = lc.data.reviewPolicy?.version === 1 && lc.data.reviewPolicy?.algorithm === "sm2" && typeof lc.recordReview === "function";
  const summary = reviewSummary(allProblems, now);
  const nextDue = drawDueReview(pool, selectedProblem?.slug || "", () => 0, now);
  const [submission, setSubmission] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [localError, setLocalError] = useState("");
  const alive = useRef(false);
  const operation = useRef(0);
  const pendingRequest = useRef(null);
  const headingRef = useRef(null);
  const locked = Boolean(submission);
  const saving = submission?.phase === "saving" || submission?.phase === "refreshing";
  const connectionKey = `${connection?.username || ""}:${connection?.linkedAt || ""}`;
  const latestConnection = useRef(connectionKey);
  latestConnection.current = connectionKey;
  const labels = en ? { 1: "Easy", 2: "Medium", 3: "Hard" } : { 1: "简单", 2: "中等", 3: "困难" };

  useEffect(() => { alive.current = true; return () => { alive.current = false; operation.current += 1; }; }, []);
  useEffect(() => { onLockChange(locked); }, [locked, onLockChange]);
  useEffect(() => {
    setConfirmation(null); setLocalError("");
    if (selectedProblem) headingRef.current?.focus({ preventScroll: true });
  }, [selectedProblem?.slug]);

  function select(problem) {
    if (locked || lc.busy || !problem) return;
    pendingRequest.current = null;
    setConfirmation(null); setLocalError("");
    onSelect(problem);
  }

  async function submit(request) {
    if (saving || !feedbackAvailable || !request) return;
    const attempt = ++operation.current;
    const capturedConnection = connectionKey;
    pendingRequest.current = request;
    setSubmission({ phase: "saving", request });
    setLocalError("");
    let result;
    try { result = await lc.recordReview(request); }
    catch (error) { result = { data: null, error }; }
    if (!alive.current || attempt !== operation.current || capturedConnection !== latestConnection.current) return;
    const data = result?.data;
    if (data && data.connection?.username === request.username && data.connection?.linkedAt === request.linkedAt) {
      const reviewed = data.problems?.find(problem => problem.slug === request.problemSlug);
      const nextDate = formatReviewDate(reviewed?.review?.nextReviewAt, lc.language);
      if (nextDate && Number(reviewed.review.version) > Number(request.expectedVersion)) {
        setConfirmation({ slug: request.problemSlug, nextReviewAt: reviewed.review.nextReviewAt, rating: request.rating });
        pendingRequest.current = null;
        setSubmission(null);
        return;
      }
    }
    const conflict = result?.error?.status === 409 || Boolean(data);
    setSubmission({ phase: conflict ? "conflict" : "error", request, error: result?.error });
  }

  function record(rating) {
    if (!selectedProblem || locked || lc.busy || !feedbackAvailable || confirmation?.slug === selectedProblem.slug) return;
    const eventId = reviewEventId();
    if (!eventId) {
      setLocalError(t("此浏览器暂不支持安全保存复习，请使用最新版浏览器打开 HTTPS 网站后重试。", "This browser cannot save reviews securely. Open the HTTPS site in an up-to-date browser and try again."));
      return;
    }
    submit({ username: connection.username, linkedAt: connection.linkedAt, problemSlug: selectedProblem.slug, rating, eventId, expectedVersion: reviewState(selectedProblem).version });
  }

  async function reloadAfterConflict() {
    if (saving) return;
    const attempt = ++operation.current;
    const capturedConnection = connectionKey;
    setSubmission(previous => ({ ...previous, phase: "refreshing" }));
    let data;
    try { data = await lc.reload?.(); } catch { /* Keep the unresolved feedback visible. */ }
    if (!alive.current || attempt !== operation.current || capturedConnection !== latestConnection.current) return;
    if (data?.connection?.username === connection.username && data?.connection?.linkedAt === connection.linkedAt) {
      pendingRequest.current = null;
      setSubmission(null); setConfirmation(null);
      setLocalError(t("已读取最新进度，请重新确认回忆程度。", "Latest progress loaded. Choose your recall rating again."));
    } else setSubmission(previous => ({ ...previous, phase: "conflict" }));
  }

  const saved = confirmation?.slug === selectedProblem?.slug ? confirmation : null;
  return <section className="lc-review lc-memory-review" aria-labelledby="lc-review-title">
    <div className="lc-review-main">
      <p className="lc-eyebrow">REVISIT & REMEMBER</p><h2 id="lc-review-title">{t("记忆复习", "Memory review")}</h2>
      <p className="lc-muted">{t("优先复习到期的题，再建立新题的复习节奏。", "Start with due problems, then build a rhythm for your first reviews.")}</p>
      {selectedProblem ? <div className="lc-drawn-problem">
        <div className="lc-drawn-meta"><span>#{selectedProblem.frontendId || "—"}</span>{labels[selectedProblem.difficulty] && <span className={`lc-difficulty lc-difficulty-${selectedProblem.difficulty}`}>{labels[selectedProblem.difficulty]}</span>}<ReviewDueDate problem={selectedProblem} language={lc.language} now={now} /></div>
        <h3 ref={headingRef} tabIndex={-1}>{en ? selectedProblem.titleEn || selectedProblem.title || selectedProblem.slug : selectedProblem.title || selectedProblem.titleEn || selectedProblem.slug}</h3>
        <div className="lc-actions"><a className="lc-button is-primary" href={problemUrl(selectedProblem.slug)} target="_blank" rel="noopener noreferrer">{t("去力扣挑战", "Solve on LeetCode")} ↗</a><button className="lc-button" type="button" disabled={locked || lc.busy || !nextDue} onClick={() => select(nextDue)}>{t("下一道待复习", "Next due problem")}</button><button className="lc-text-button" type="button" disabled={locked || lc.busy || !pool.length} onClick={() => select(drawReviewProblem(pool, selectedProblem.slug))}>{t("随机换一道", "Draw randomly")}</button></div>
        {saved ? <div className="lc-review-saved" role="status"><span className="lc-review-saved-mark" aria-hidden="true">✓</span><div><strong>{t("复习已保存", "Review saved")}</strong><p>{t("建议下次复习：", "Suggested next review: ")}<time dateTime={saved.nextReviewAt}>{formatReviewDate(saved.nextReviewAt, lc.language)}</time></p></div></div> : <div className="lc-recall" aria-busy={saving}>
          <h4>{t("这次能独立想起解法吗？", "Could you recall the solution on your own?")}</h4>
          <p>{t("完成练习后如实选择，才会记录这次复习。下方是预计的下次间隔。", "Rate your recall after practicing to record a review. The estimates below show the next interval.")}</p>
          <div className="lc-recall-options" role="group" aria-label={t("记录回忆程度", "Record recall rating")}>
            {ratings.map(rating => {
              const preview = previewReview(selectedProblem, rating.value, now);
              const relative = intervalLabel(preview.intervalDays, en);
              return <button key={rating.value} type="button" data-review-rating={rating.value} disabled={locked || lc.busy || !feedbackAvailable} onClick={() => record(rating.value)} title={formatReviewDate(preview.nextReviewAt, lc.language)} aria-label={`${en ? rating.en : rating.zh} · ${relative}`}><strong>{en ? rating.en : rating.zh}</strong><span>{relative}</span></button>;
            })}
          </div>
          {reviewState(selectedProblem).source === "unknown" && <p className="lc-review-origin">{t("这题没有可靠的通过时间，首次反馈后开始安排复习。", "This problem has no reliable completion date. Your first feedback starts its review schedule.")}</p>}
          {!feedbackAvailable && <p className="lc-review-note" role="status">{t("复习计划暂不可用，请刷新后再试。", "Review scheduling is temporarily unavailable. Refresh and try again.")}</p>}
        </div>}
        {submission && <div className={`lc-feedback${saving ? "" : " is-error"}`} role={saving ? "status" : "alert"}>
          {saving ? t("正在保存或读取最新复习进度…", "Saving or loading your latest review progress…") : submission.phase === "conflict" ? <><p>{t("复习进度或关联账号已变化。这次反馈尚未确认，请先刷新，再重新选择。", "The review progress or connected account changed. This feedback is unconfirmed. Reload before choosing a rating again.")}</p><button type="button" className="lc-text-button" onClick={reloadAfterConflict}>{t("刷新复习进度", "Reload review progress")}</button></> : <><p>{submission.error?.status === 401 ? t("云端登录已失效。这次反馈尚未确认，请先恢复登录。", "Your cloud session expired. This feedback is unconfirmed; sign in again first.") : t("暂时无法确认保存，请重试同一次反馈。不会重复记录。", "The save could not be confirmed. Retry this feedback; it will not be recorded twice.")}</p><button type="button" className="lc-text-button" disabled={lc.busy} onClick={() => submit(pendingRequest.current)}>{t("重试保存", "Retry saving")}</button></>}
        </div>}
        {localError && <p className="lc-review-note" role="status">{localError}</p>}
      </div> : <div className="lc-review-start"><span className="lc-review-symbol" aria-hidden="true">↻</span><p>{nextDue ? t(`当前筛选有 ${pool.length} 道题。先从最早到期的开始。`, `${pool.length} problems match your filter. Start with the earliest due.`) : pool.length ? t("当前筛选没有到期或待首次复习的题，可以休息一下，也可以随机温习。", "No due or first-review problems match this filter. Take a break, or draw a problem for extra practice.") : t("还没有符合筛选条件的已通过题目。", "No solved problems match this filter.")}</p><div className="lc-actions"><button className="lc-button is-primary" type="button" disabled={!nextDue || lc.busy} onClick={() => select(nextDue)}>{t("开始复习", "Start review")} ↗</button><button className="lc-text-button" type="button" disabled={!pool.length || lc.busy} onClick={() => select(drawReviewProblem(pool))}>{t("随机抽一道", "Draw randomly")}</button></div></div>}
      <p className="lc-review-footnote">{t("打开题目和随机抽取不会记作复习。建议时间按本地时区显示。", "Opening or drawing a problem does not record a review. Suggested times use your local timezone.")}</p>
    </div>
    <aside className="lc-review-aside lc-memory-aside"><p className="lc-eyebrow">YOUR REVIEW RHYTHM</p><h3>{t("按记忆安排下一次", "A rhythm for remembering")}</h3>
      <dl className="lc-review-counts"><div><dt>{t("待复习", "Due")}</dt><dd>{summary.due}</dd></div><div><dt>{t("待首次复习", "First review")}</dt><dd>{summary.uninitialized}</dd></div><div><dt>{t("未来 7 天", "Next 7 days")}</dt><dd>{summary.upcoming7Days}</dd></div></dl>
      <p>{t("依据 SM-2 间隔复习：记得越牢，间隔逐步拉长；想不起来，就缩短间隔。每道题会按你的反馈单独调整。", "Based on SM-2 spaced repetition: stronger recall gradually lengthens the interval; forgetting brings a problem back sooner. Each problem adapts to your feedback.")}</p>
      <span className="lc-review-aside-note">{t("这是复习建议，不是遗忘时间的精确预测。以上统计涵盖全部已同步题目。", "These are review suggestions, not exact predictions of forgetting. Counts include all synced problems.")}</span>
    </aside>
  </section>;
}
