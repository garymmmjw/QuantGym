import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ACTIVITY_KINDS, MANUAL_KINDS, TRIAL_KINDS, addLocalDays, buildDailySummaries, collectCalendarActivities, createManualActivity, localDayKey, parseLocalDay, recordManualActivity, summarizeActivities } from "./calendarModel.js";
import "./calendar.css";

const KIND_LABELS = {
  zh: { quant: "量化题目", mental: "Mental Math", sequence: "数列 / 字母推理", pattern: "图形推理", tech: "Tech Interview", coding: "Coding OA", behavioral: "Behavioral", daily: "Daily Mock" },
  en: { quant: "Quant questions", mental: "Mental Math", sequence: "Sequences", pattern: "Patterns", tech: "Tech Interview", coding: "Coding OA", behavioral: "Behavioral", daily: "Daily Mock" }
};

export function TrainingCalendar({ state = {}, update, legacyState = {}, language = "zh" }) {
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
  const { activities, undatedLegacyCount } = useMemo(() => collectCalendarActivities(state, legacyState), [state, legacyState]);
  const selectedActivities = useMemo(() => activities.filter((item) => item.dayKey === selectedDay), [activities, selectedDay]);
  const selectedSummary = useMemo(() => summarizeActivities(selectedActivities), [selectedActivities]);
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
      : t(`${activity.count} 题`, `${activity.count} ${activity.count === 1 ? "question" : "questions"}`);

  return (
    <main className="personal-calendar" aria-labelledby="pc-title">
      <header className="pc-header">
        <div>
          <p className="pc-eyebrow">PERSONAL PRACTICE</p>
          <h1 id="pc-title">{t("训练日历", "Training calendar")}</h1>
          <p className="pc-intro">{t("把申请准备，落实到每一天。", "A record of your preparation, one day at a time.")}</p>
        </div>
        <Link className="pc-primary" to="/daily-mock">{t("开始 Daily Mock", "Start Daily Mock")} <span aria-hidden="true">↗</span></Link>
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
                aria-label={`${fullDateFormatter.format(date)}${allDays.has(key) ? t("，有训练记录", ", training recorded") : ""}`}
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
                <span className={`pc-date-dot${allDays.has(key) ? " has-activity" : ""}`} aria-hidden="true" />
              </button>;
            })}
          </div>
          <button type="button" className="pc-icon-button pc-day-arrow" aria-label={t("后一天", "Next day")} onClick={() => selectDate(addLocalDays(selectedDay, 1))}>→</button>
        </div>
        <p className="pc-swipe-hint">{t("左右滑动日期，或直接跳转到任意一天", "Swipe the dates, or jump directly to any day")}</p>
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
          {ACTIVITY_KINDS.map((kind) => <div className={`pc-stat pc-kind-${kind}`} key={kind}>
            <dt>{labels[kind]}</dt>
            <dd><strong>{selectedSummary[kind].toLocaleString(locale)}</strong><span>{kind === "daily" ? t("轮", "rounds") : t("题", "questions")}</span></dd>
            <p>{TRIAL_KINDS.includes(kind) ? t(`正确作答 · ${selectedSummary[`${kind}Trials`]} 次 trial`, `Correct · ${selectedSummary[`${kind}Trials`]} trials`) : kind === "daily" ? t("整套完成", "Full sets completed") : kind === "tech" ? t("面试练习", "Interview practice") : kind === "coding" ? t("编程训练", "Coding practice") : kind === "behavioral" ? t("表达练习", "Behavioral practice") : t("完成题目", "Problems completed")}</p>
          </div>)}
        </dl>

        {notice && <div className={`pc-notice${notice.error ? " is-error" : ""}`} role={notice.error ? "alert" : "status"}>
          <span>{notice.text}</span>
          {lastManualId && <button type="button" className="pc-text-button" onClick={undoManual}>{t("撤销这次补记", "Undo entry")}</button>}
        </div>}

        {showManual && <form className="pc-manual-form" id="pc-manual-form" ref={formRef} onSubmit={saveManual}>
          <div className="pc-form-heading"><h3>{t("补记线下训练", "Record offline practice")}</h3><p>{t("在这里记录尚未计入的练习；应用内完成的训练会自动出现。", "Add practice that has not been recorded. In-app training appears automatically.")}</p></div>
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
            <div className="pc-activity-description"><strong>{labels[activity.kind]}</strong><p>{activity.note || (en ? activity.titleEn || activity.title : activity.title) || (activity.status === "aborted" ? t("提前结束的 trial", "Trial ended early") : activity.kind === "daily" ? t("所有训练板块已完成", "All training sections completed") : t("训练已记录", "Practice recorded"))}</p></div>
            <div className="pc-activity-meta"><strong>{activityAmount(activity)}</strong><span>{activity.source === "manual" ? t("手动补记", "Manual entry") : activity.source === "legacy" ? t("历史训练", "Previous training") : timeFormatter.format(new Date(activity.completedAt))}</span></div>
          </li>)}
        </ol> : <div className="pc-empty">
          <span className="pc-empty-symbol" aria-hidden="true">○</span>
          <h3>{t("这一天，还没有训练记录", "No training recorded for this day")}</h3>
          <p>{t("完成一次练习后，它会出现在对应日期。也可以补记线下完成的训练。", "Completed practice appears on its date. You can also add your offline training.")}</p>
          <div className="pc-empty-links"><Link to="/tools">Mental Math <span aria-hidden="true">↗</span></Link><Link to="/problems">{t("量化题库", "Question bank")} <span aria-hidden="true">↗</span></Link></div>
        </div>}
      </section>

      <section className="pc-week" aria-labelledby="pc-week-title">
        <div className="pc-section-heading"><div><p className="pc-eyebrow">LAST 7 DAYS</p><h2 id="pc-week-title">{t("近 7 天的训练节奏", "Your last seven days")}</h2><p className="pc-week-range">{shortDateFormatter.format(parseLocalDay(recentDays[0].key))} – {shortDateFormatter.format(parseLocalDay(selectedDay))}</p></div><p className="pc-week-total"><strong>{recentActiveDays}</strong> / 7 {t("天有训练", "days active")}<span>{t(`共完成 ${recentTotal.toLocaleString(locale)} 题`, `${recentTotal.toLocaleString(locale)} questions completed`)}</span></p></div>
        <div className="pc-week-chart" role="group" aria-label={t("近七天每日完成题数", "Questions completed each day")}>
          {recentDays.map((day) => <button type="button" key={day.key} className={`pc-week-day${day.key === selectedDay ? " is-selected" : ""}`} onClick={() => selectDate(day.key)} aria-label={`${fullDateFormatter.format(parseLocalDay(day.key))} · ${t(`${day.totalQuestions} 题，${day.daily} 轮 Daily Mock`, `${day.totalQuestions} questions, ${day.daily} Daily Mock rounds`)}`}>
            <strong>{day.totalQuestions.toLocaleString(locale)}</strong>
            <span className="pc-bar-track"><span className="pc-bar" style={{ height: `${day.activityCount ? Math.max(5, day.totalQuestions / recentMax * 100) : 0}%` }} /></span>
            <span>{weekdayFormatter.format(parseLocalDay(day.key))}</span><small>{shortDateFormatter.format(parseLocalDay(day.key))}</small>
          </button>)}
        </div>
        <p className="pc-data-note">{t("柱状图按完成题数统计；心算、数列与图形推理只计正确作答，Daily Mock 轮数单独统计。", "Bars show completed questions; math, sequences and patterns count correct answers only. Daily Mock rounds are counted separately.")}</p>
      </section>

      <footer className="pc-footer"><p>{t("记录按你设备的本地日期归档。已有明确完成时间的旧训练会自动汇入，未记录完成日期的历史进度可手动补记。", "Records follow your device’s local dates. Dated training history is included automatically; older progress without a completion date can be added manually.")}{undatedLegacyCount > 0 && <span> {t(`有 ${undatedLegacyCount} 条旧记录因缺少可靠日期未计入。`, `${undatedLegacyCount} older records have no reliable date and are not included.`)}</span>}</p></footer>
    </main>
  );
}
