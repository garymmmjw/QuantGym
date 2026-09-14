import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ACTIVITY_KINDS, MANUAL_KINDS, TRIAL_KINDS, addLocalDays, buildDailySummaries, collectCalendarActivities, createManualActivity, localDayKey, parseLocalDay, recordManualActivity, summarizeActivities } from "./calendarModel.js";
import { collectLeetCodeActivities, leetcodeDailySummary } from "./leetcodeCalendar.js";
import "./calendar.css";

const KIND_LABELS = {
  zh: { quant: "量化题目", mental: "Mental Math", sequence: "数列 / 字母推理", pattern: "图形推理", tech: "Technical Interview", coding: "Coding OA", behavioral: "Behavioral", daily: "历史综合训练" },
  en: { quant: "Quant questions", mental: "Mental Math", sequence: "Sequences", pattern: "Patterns", tech: "Technical Interview", coding: "Coding OA", behavioral: "Behavioral", daily: "Past combined practice" }
};

export function TrainingCalendar({ state = {}, update, legacyState = {}, language = "zh", leetcode }) {
  const en = language === "en";
  const locale = en ? "en-US" : "zh-CN";
  const t = (zh, english) => en ? english : zh;
  const labels = KIND_LABELS[en ? "en" : "zh"];
  const [today, setToday] = useState(() => localDayKey());
  const [selectedDay, setSelectedDay] = useState(() => localDayKey());
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ kind: "quant", count: "1", dateKey: localDayKey(), note: "" });
  const [notice, setNotice] = useState(null);
  const [lastManualId, setLastManualId] = useState("");
  const stripRef = useRef(null);
  const selectedRef = useRef(null);
  const formRef = useRef(null);
  const pendingManualRef = useRef(null);
  const { activities: personalActivities, undatedLegacyCount } = useMemo(() => collectCalendarActivities(state, legacyState), [state, legacyState]);
  const leetcodeRecords = useMemo(() => collectLeetCodeActivities(leetcode?.data), [leetcode?.data]);
  const leetcodeLinked = leetcode?.data?.connection?.site === "cn";
  const leetcodeDay = useMemo(() => leetcodeDailySummary(leetcodeRecords, selectedDay), [leetcodeRecords, selectedDay]);
  const leetcodeSourceDays = useMemo(() => new Set(leetcodeRecords.calendarDays.filter((day) => day.submissions > 0).map((day) => day.dayKey)), [leetcodeRecords]);
  const activities = useMemo(() => [...personalActivities, ...leetcodeRecords.activities].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt) || a.id.localeCompare(b.id)), [personalActivities, leetcodeRecords]);
  const selectedActivities = useMemo(() => activities.filter((item) => item.dayKey === selectedDay), [activities, selectedDay]);
  const selectedSummary = useMemo(() => summarizeActivities(selectedActivities.filter((item) => item.source !== "leetcode")), [selectedActivities]);
  const recentDays = useMemo(() => buildDailySummaries(activities, selectedDay), [activities, selectedDay]);
  const visibleDays = useMemo(() => Array.from({ length: 15 }, (_, index) => addLocalDays(selectedDay, index - 7)).filter((key) => parseLocalDay(key)), [selectedDay]);
  const allDays = useMemo(() => new Set(activities.map((item) => item.dayKey)), [activities]);
  const recentTotal = recentDays.reduce((sum, day) => sum + day.totalQuestions, 0);
  const recentActiveDays = recentDays.filter((day) => day.activityCount > 0).length;
  const recentMax = Math.max(1, ...recentDays.map((day) => day.totalQuestions));
  const dateFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const fullDateFormatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const shortDateFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    const refreshToday = () => setToday(localDayKey());
    const timer = window.setInterval(refreshToday, 30000);
    window.addEventListener("focus", refreshToday);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshToday); };
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    const selected = selectedRef.current;
    if (!strip || !selected) return;
    strip.scrollLeft = selected.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2;
  }, [selectedDay]);

  useEffect(() => {
    if (showManual) formRef.current?.querySelector("select")?.focus();
  }, [showManual]);

  const selectDate = (key) => {
    if (parseLocalDay(key)) setSelectedDay(key);
  };

  const storeUpdate = (change) => {
    try {
      if (typeof update !== "function") throw new Error("unavailable");
      const result = update(change);
      if (result?.ok === false) throw new Error(result.error || "storage");
      return true;
    } catch {
      setNotice({ error: true, text: t("更改暂未保存到浏览器。请保留此页，重试保存或导出备份。", "Changes are not saved to the browser. Keep this tab open, retry saving, or export a backup.") });
      return false;
    }
  };

  const saveManual = (event) => {
    event.preventDefault();
    let activity;
    try {
      activity = createManualActivity(manual);
      if (pendingManualRef.current) activity = { ...activity, id: pendingManualRef.current.id, createdAt: pendingManualRef.current.createdAt };
    } catch (error) {
      setNotice({ error: true, text: error.message === "invalid_count" ? t("题数需为 1–10,000 的整数。", "Enter a whole number from 1 to 10,000.") : t("请选择有效的训练类型和日期。", "Choose a valid activity and date.") });
      return;
    }
    pendingManualRef.current = activity;
    setLastManualId(activity.id);
    if (!storeUpdate((latest) => recordManualActivity(latest, activity))) return;
    pendingManualRef.current = null;
    setSelectedDay(manual.dateKey);
    setLastManualId(activity.id);
    setShowManual(false);
    setManual((current) => ({ ...current, count: "1", note: "" }));
    setNotice({ error: false, text: t("已补记训练。", "Training added.") });
  };

  const undoManual = () => {
    if (!lastManualId) return;
    if (!storeUpdate((latest) => ({ ...latest, activities: (latest.activities || []).filter((item) => !(item.id === lastManualId && item.source === "manual")), removedActivityIds: [...new Set([...(latest.removedActivityIds || []), lastManualId])] }))) return;
    pendingManualRef.current = null;
    setShowManual(false);
    setLastManualId("");
    setNotice({ error: false, text: t("已撤销这次补记。", "Entry removed.") });
  };

  const activityAmount = (activity) => activity.kind === "daily"
    ? t(`${activity.count} 轮`, `${activity.count} ${activity.count === 1 ? "round" : "rounds"}`)
    : TRIAL_KINDS.includes(activity.kind)
      ? t(`${activity.count} 题正确${activity.trialCount ? ` · ${activity.trialCount} trial` : ""}`, `${activity.count} correct${activity.trialCount ? ` · ${activity.trialCount} trial` : ""}`)
    : activity.countedAsSolved === false
      ? activity.kind === "coding" ? t(`${activity.count} 次复盘 · 不计通过题数`, `${activity.count} reviews · excluded from solved counts`)
        : t("未确认完成", "Completion not confirmed")
      : t(`${activity.count} 题`, `${activity.count} ${activity.count === 1 ? "question" : "questions"}`);

  return (
    <main className="personal-calendar" aria-labelledby="pc-title">
      <header className="pc-header">
        <div>
          <p className="pc-eyebrow">PERSONAL PRACTICE</p>
          <h1 id="pc-title">{t("训练日历", "Training calendar")}</h1>
          <p className="pc-intro">{t("把申请准备，落实到每一天。", "A record of your preparation, one day at a time.")}</p>
        </div>
        <div className="pc-practice-links">
          <Link className="pc-primary" to="/coding-oa">Coding OA <span aria-hidden="true">↗</span></Link>
          <Link className="pc-secondary" to="/technical-interview">Technical Interview <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="pc-calendar" aria-label={t("选择训练日期", "Choose a training date")}>
        <div className="pc-calendar-toolbar">
          <div className="pc-month-controls">
            <h2>{dateFormatter.format(parseLocalDay(selectedDay))}</h2>
            <button type="button" className="pc-icon-button" aria-label={t("上一周", "Previous week")} onClick={() => selectDate(addLocalDays(selectedDay, -7))}>‹</button>
            <button type="button" className="pc-icon-button" aria-label={t("下一周", "Next week")} onClick={() => selectDate(addLocalDays(selectedDay, 7))}>›</button>
          </div>
          <div className="pc-date-actions">
            <label className="pc-sr-only" htmlFor="pc-date-jump">{t("跳转日期", "Jump to date")}</label>
            <input id="pc-date-jump" className="pc-date-input" type="date" value={selectedDay} onChange={(event) => selectDate(event.target.value)} />
            <button type="button" className="pc-text-button" onClick={() => selectDate(localDayKey())}>{t("回到今天", "Today")}</button>
          </div>
        </div>

        <div className="pc-date-navigation">
          <button type="button" className="pc-icon-button pc-day-arrow" aria-label={t("前一天", "Previous day")} onClick={() => selectDate(addLocalDays(selectedDay, -1))}>←</button>
          <div className="pc-date-strip" ref={stripRef} role="group" aria-label={t("左右滑动查看日期", "Swipe to browse dates")}>
            {visibleDays.map((key) => {
              const date = parseLocalDay(key);
              const selected = key === selectedDay;
              return <button
                key={key}
                ref={selected ? selectedRef : null}
                type="button"
                className={`pc-date${selected ? " is-selected" : ""}${key === today ? " is-today" : ""}`}
                aria-pressed={selected}
                aria-current={key === today ? "date" : undefined}
                aria-label={`${fullDateFormatter.format(date)}${allDays.has(key) ? t("，有训练记录", ", training recorded") : ""}${leetcodeSourceDays.has(key) ? t("，有力扣源站日历提交", ", submissions in the LeetCode source calendar") : ""}`}
                onClick={() => selectDate(key)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  selectDate(addLocalDays(key, event.key === "ArrowLeft" ? -1 : 1));
                  window.requestAnimationFrame(() => selectedRef.current?.focus({ preventScroll: true }));
                }}
              >
                <span>{key === today ? t("今天", "Today") : weekdayFormatter.format(date)}</span>
                <strong>{String(date.getDate()).padStart(2, "0")}</strong>
                <span className="pc-date-dots" aria-hidden="true"><span className={`pc-date-dot${allDays.has(key) ? " has-activity" : ""}`} /><span className={`pc-date-dot pc-leetcode-source-dot${leetcodeSourceDays.has(key) ? " has-activity" : ""}`} /></span>
              </button>;
            })}
          </div>
          <button type="button" className="pc-icon-button pc-day-arrow" aria-label={t("后一天", "Next day")} onClick={() => selectDate(addLocalDays(selectedDay, 1))}>→</button>
        </div>
        <p className="pc-swipe-hint">{t("左右滑动日期，或直接跳转到任意一天", "Swipe the dates, or jump directly to any day")}</p>
        {leetcodeLinked && <p className="pc-source-legend"><span aria-hidden="true">○</span> {t(`空心圆：力扣日历的提交日期${leetcodeRecords.calendarTimeZone ? `（${leetcodeRecords.calendarTimeZone}）` : "（源站时区）"}`, `Hollow dot: LeetCode calendar submission date (${leetcodeRecords.calendarTimeZone || "source time zone"})`)}</p>}
      </section>

      <section className="pc-selected-day" aria-labelledby="pc-day-title">
        <div className="pc-section-heading">
          <div>
            <p className="pc-eyebrow">{selectedDay === today ? "TODAY" : "DAILY RECORD"}</p>
            <h2 id="pc-day-title">{fullDateFormatter.format(parseLocalDay(selectedDay))}</h2>
          </div>
          <button type="button" className="pc-secondary" aria-expanded={showManual} aria-controls="pc-manual-form" onClick={() => { if (!pendingManualRef.current) setManual((current) => ({ ...current, dateKey: selectedDay })); setShowManual((value) => !value); }}>{t("＋ 补记训练", "+ Add training")}</button>
        </div>

        <dl className="pc-stats">
          {ACTIVITY_KINDS.filter((kind) => kind !== "daily" || selectedSummary.daily > 0).map((kind) => <div className={`pc-stat pc-kind-${kind}`} key={kind}>
            <dt>{labels[kind]}</dt>
            <dd><strong>{selectedSummary[kind].toLocaleString(locale)}</strong><span>{kind === "daily" ? t("轮", "rounds") : t("题", "questions")}</span></dd>
            <p>{TRIAL_KINDS.includes(kind) ? t(`正确作答 · ${selectedSummary[`${kind}Trials`]} 次 trial`, `Correct · ${selectedSummary[`${kind}Trials`]} trials`) : kind === "daily" ? t("整套完成", "Full sets completed") : kind === "tech" ? t("已确认完成", "Completion confirmed") : kind === "coding" ? selectedSummary.codingReviews ? t(`另有 ${selectedSummary.codingReviews} 次力扣复盘，不计入刷题数`, `${selectedSummary.codingReviews} LeetCode reviews excluded from solved counts`) : t("力扣通过题数见下方", "See synced LeetCode solves below") : kind === "behavioral" ? t("表达练习", "Behavioral practice") : t("完成题目", "Problems completed")}</p>
          </div>)}
        </dl>

        {leetcode && <section className="pc-leetcode" aria-labelledby="pc-leetcode-title">
          <div className="pc-leetcode-heading"><div><h3 id="pc-leetcode-title">LeetCode</h3><p>{leetcodeLinked ? leetcode.data.connection.displayName || leetcode.data.connection.username : t("把力扣刷题也放进训练日历", "Include your LeetCode practice in the calendar")}</p></div><Link className="pc-text-button" to="/leetcode">{leetcodeLinked ? t("进入 LeetCode 模块", "Open LeetCode") : t("关联力扣账号", "Connect LeetCode")} <span aria-hidden="true">↗</span></Link></div>
          {leetcodeLinked ? <>
            <dl className="pc-leetcode-stats">
              <div><dt>{t("这一天已同步的通过题目", "Known problems solved this day")}</dt><dd><strong>{leetcodeDay.solved === null ? "—" : leetcodeDay.solved.toLocaleString(locale)}</strong>{leetcodeDay.solved !== null && <span>{t("题", "problems")}</span>}</dd><p>{leetcodeDay.solved === null ? t("题目明细未同步", "Problem details not synced") : t(`同题当天只计一次 · ${leetcodeDay.acceptedSubmissions} 次通过提交`, `Each problem counts once per day · ${leetcodeDay.acceptedSubmissions} accepted submissions`)}</p></div>
              <div><dt>{t("力扣日历当日提交", "Submissions in LeetCode’s daily calendar")}</dt><dd><strong>{leetcodeDay.sourceSubmissions === null ? "—" : leetcodeDay.sourceSubmissions.toLocaleString(locale)}</strong>{leetcodeDay.sourceSubmissions !== null && <span>{t("次", "submissions")}</span>}</dd><p>{leetcodeDay.sourceSubmissions === null ? t("源站当日记录未同步", "No source record synced for this day") : t("包含重复提交，不等于通过题数", "Includes repeated attempts; not a solved count")}</p></div>
            </dl>
            <p className="pc-leetcode-note">{t("通过题目按设备本地日期归档；力扣日历提交量保留源站日期", "Solved problems use your device’s local date; daily submission totals retain LeetCode’s source date")}{leetcodeRecords.calendarTimeZone ? ` (${leetcodeRecords.calendarTimeZone})` : t("（源站时区未提供）", " (source time zone unavailable)")}{t("，跨日记录可能不同。", "; dates near midnight can differ.")}{!leetcodeRecords.historyComplete && t(" 公开近期记录不包含完整历史；题数与下方周统计仅计已同步的通过题目。", " Recent public records do not cover your full history. Problem counts and the weekly chart include only synced accepted problems.")}</p>
            {leetcode.error && <p className="pc-leetcode-note" role="status">{t("力扣数据暂时无法更新，当前展示已保存的记录。可进入 LeetCode 模块重试。", "LeetCode could not be updated. Saved records are shown; retry from the LeetCode module.")}</p>}
          </> : <p className="pc-leetcode-note">{leetcode.phase === "loading" ? t("正在读取关联状态…", "Loading connection…") : t("关联后查看每日通过题目、提交次数，并从完成记录跳转回力扣复习。", "Connect to see daily solved problems and submissions, and revisit problems on LeetCode.")}</p>}
        </section>}

        {notice && <div className={`pc-notice${notice.error ? " is-error" : ""}`} role={notice.error ? "alert" : "status"}>
          <span>{notice.text}</span>
          {lastManualId && <button type="button" className="pc-text-button" onClick={undoManual}>{t("撤销这次补记", "Undo entry")}</button>}
        </div>}

        {showManual && <form className="pc-manual-form" id="pc-manual-form" ref={formRef} onSubmit={saveManual}>
          <div className="pc-form-heading"><h3>{t("补记线下训练", "Record offline practice")}</h3><p>{t("仅补记已经做完的练习。Coding OA 补记保留为力扣复盘，通过题数以账号同步为准。", "Record only practice you have finished. Coding OA entries are reviews; LeetCode solved counts come from account sync.")}</p></div>
          <div className="pc-form-fields">
            <label>{t("训练类型", "Activity")}<select value={manual.kind} onChange={(event) => setManual({ ...manual, kind: event.target.value })}>{MANUAL_KINDS.map((kind) => <option key={kind} value={kind}>{labels[kind]}</option>)}</select></label>
            <label>{TRIAL_KINDS.includes(manual.kind) ? t("正确题数", "Correct answers") : t("完成题数", "Questions completed")}<input type="number" inputMode="numeric" min="1" max="10000" step="1" required value={manual.count} onChange={(event) => setManual({ ...manual, count: event.target.value })} /></label>
            <label>{t("完成日期", "Date completed")}<input type="date" required value={manual.dateKey} onChange={(event) => setManual({ ...manual, dateKey: event.target.value })} /></label>
            <label className="pc-note-field">{t("备注（可选）", "Note (optional)")}<input type="text" maxLength="500" value={manual.note} placeholder={t("例如：复盘条件概率、练习项目介绍", "e.g. Conditional probability review")} onChange={(event) => setManual({ ...manual, note: event.target.value })} /></label>
          </div>
          {TRIAL_KINDS.includes(manual.kind) && <p className="pc-form-help">{t("手动补记只增加正确题数，不计入 trial 或速度纪录。", "Manual entries add correct answers; they do not add timed trials or speed records.")}</p>}
          <div className="pc-form-actions"><button type="button" className="pc-text-button" onClick={() => setShowManual(false)}>{t("取消", "Cancel")}</button><button type="submit" className="pc-primary">{t("保存补记", "Save entry")}</button></div>
        </form>}

        <div className="pc-activity-heading"><h3>{t("完成记录", "Completed activity")}</h3><span>{t(`${selectedActivities.length} 条记录`, `${selectedActivities.length} records`)}</span></div>
        {selectedActivities.length ? <ol className="pc-activity-list">
          {selectedActivities.map((activity) => <li key={activity.id} className={`pc-activity pc-kind-${activity.kind}`}>
            <span className="pc-activity-mark" aria-hidden="true">{activity.kind === "daily" ? "✓" : activity.kind === "mental" ? "±" : activity.kind === "sequence" ? "⋯" : activity.kind === "pattern" ? "◇" : activity.kind === "coding" ? "⌘" : "·"}</span>
            <div className="pc-activity-description"><strong>{activity.source === "leetcode" ? "LeetCode" : labels[activity.kind]}</strong><p>{activity.source === "leetcode" ? <a href={activity.problemUrl} target="_blank" rel="noopener noreferrer">{activity.frontendId ? `${activity.frontendId}. ` : ""}{en ? activity.titleEn : activity.title} <span aria-hidden="true">↗</span><span className="pc-sr-only">{t("（在新标签页打开力扣）", " (opens LeetCode in a new tab)")}</span></a> : activity.note || (en ? activity.titleEn || activity.title : activity.title) || (activity.status === "aborted" ? t("提前结束的 trial", "Trial ended early") : activity.kind === "daily" ? t("所有训练板块已完成", "All training sections completed") : t("训练已记录", "Practice recorded"))}</p></div>
            <div className="pc-activity-meta"><strong>{activityAmount(activity)}</strong>{activity.source === "leetcode" && <span>{t(`${activity.submissionCount} 次通过提交`, `${activity.submissionCount} accepted submissions`)}</span>}<span>{activity.source === "manual" ? t("手动补记", "Manual entry") : activity.source === "legacy" ? t("历史训练", "Previous training") : timeFormatter.format(new Date(activity.completedAt))}</span></div>
          </li>)}
        </ol> : <div className="pc-empty">
          <span className="pc-empty-symbol" aria-hidden="true">○</span>
          <h3>{leetcodeDay.sourceSubmissions > 0 ? t("这一天的题目明细尚未同步", "Problem details have not been synced for this day") : t("这一天，还没有训练记录", "No training recorded for this day")}</h3>
          <p>{leetcodeDay.sourceSubmissions > 0 ? t("力扣日历中有提交记录，但没有对应的已同步通过题目。提交次数不计入完成题数。", "LeetCode’s calendar has submissions, but no accepted problem details are synced. Submission totals do not count as completed problems.") : t("完成一次练习后，它会出现在对应日期。也可以补记线下完成的训练。", "Completed practice appears on its date. You can also add your offline training.")}</p>
          <div className="pc-empty-links"><Link to="/tools">Mental Math <span aria-hidden="true">↗</span></Link><Link to="/coding-oa">Coding OA <span aria-hidden="true">↗</span></Link><Link to="/technical-interview">Technical Interview <span aria-hidden="true">↗</span></Link></div>
        </div>}
      </section>

      <section className="pc-week" aria-labelledby="pc-week-title">
        <div className="pc-section-heading"><div><p className="pc-eyebrow">LAST 7 DAYS</p><h2 id="pc-week-title">{t("近 7 天的训练节奏", "Your last seven days")}</h2><p className="pc-week-range">{shortDateFormatter.format(parseLocalDay(recentDays[0].key))} – {shortDateFormatter.format(parseLocalDay(selectedDay))}</p></div><p className="pc-week-total"><strong>{recentActiveDays}</strong> / 7 {t("天有训练", "days active")}<span>{t(`共完成 ${recentTotal.toLocaleString(locale)} 题`, `${recentTotal.toLocaleString(locale)} questions completed`)}</span></p></div>
        <div className="pc-week-chart" role="group" aria-label={t("近七天每日完成题数", "Questions completed each day")}>
          {recentDays.map((day) => <button type="button" key={day.key} className={`pc-week-day${day.key === selectedDay ? " is-selected" : ""}`} onClick={() => selectDate(day.key)} aria-label={`${fullDateFormatter.format(parseLocalDay(day.key))} · ${t(`${day.totalQuestions} 题`, `${day.totalQuestions} questions`)}${day.daily ? t(`，${day.daily} 轮历史综合训练`, `, ${day.daily} past combined practice rounds`) : ""}`}>
            <strong>{day.totalQuestions.toLocaleString(locale)}</strong>
            <span className="pc-bar-track"><span className="pc-bar" style={{ height: `${day.totalQuestions ? Math.max(5, day.totalQuestions / recentMax * 100) : 0}%` }} /></span>
            <span>{weekdayFormatter.format(parseLocalDay(day.key))}</span><small>{shortDateFormatter.format(parseLocalDay(day.key))}</small>
          </button>)}
        </div>
        <p className="pc-data-note">{t("刷题总数只计已确认完成的题目；Mental Math、数列和图形训练单独统计，不计入总数。抽题、保存草稿和力扣复盘不增加刷题数。", "Solved totals include confirmed completions. Mental Math, sequences, and patterns keep separate training stats. Drawing questions, saving drafts, and LeetCode reviews do not add to solved totals.")}{recentDays.some((day) => day.daily > 0) && t(" 历史综合训练的轮数单独保留。", " Past combined practice rounds are retained separately.")}{leetcodeLinked && t(" LeetCode 仅计从账号同步的通过题目，同题当天计一次；导入记录和源站日历提交量不计入。", " LeetCode includes accepted problems synced from the account, once per problem per day. Imported history and source-calendar submission totals are excluded.")}</p>
      </section>

      <footer className="pc-footer"><p>{t("记录按你设备的本地日期归档。已有明确完成时间的旧训练会自动汇入，未记录完成日期的历史进度可手动补记。", "Records follow your device’s local dates. Dated training history is included automatically; older progress without a completion date can be added manually.")}{undatedLegacyCount > 0 && <span> {t(`有 ${undatedLegacyCount} 条旧记录因缺少可靠日期未计入。`, `${undatedLegacyCount} older records have no reliable date and are not included.`)}</span>}</p></footer>
    </main>
  );
}
