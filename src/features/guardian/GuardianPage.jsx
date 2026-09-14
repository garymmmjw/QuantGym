import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAppServicesContext } from "../../stores/AppServicesContext.jsx";
import {
  clearGuardianSession,
  getGuardianApiBaseUrl,
  guardianRequest,
  readGuardianSession,
  saveGuardianSession
} from "./guardianApi.js";
import "./guardian.css";

function GuardianIcon({ name = "shield", size = 20, ...props }) {
  const paths = {
    shield: <><path d="m12 3 8 3v6c0 4.6-5.4 7.8-8 9-2.6-1.2-8-4.4-8-9V6l8-3Z" /><path d="m8.5 11.5 2.5 2.5 4.5-5" /></>,
    arrow: <><path d="M4 12h15M13 6l6 6-6 6" /></>,
    book: <><path d="M12 6v15M12 6C9 3.5 5 3.5 2 5v14c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1V5c-3-1.5-7-1.5-10 1Z" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    gift: <><path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13" /><path d="M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 11-2l3 3M4 16l3 3a7 7 0 0 0 11-2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 11h18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    exit: <><path d="M10 4H4v16h6M9 12h12M17 8l4 4-4 4" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.shield}</svg>;
}

function dateInZone(timeZone) {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addDays(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function displayTime(value, timeZone, includeDate = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone, ...(includeDate ? { month: "numeric", day: "numeric" } : {}), hour: "2-digit", minute: "2-digit", hour12: false
  }).format(date);
}

function humanError(error, fallback) {
  const message = error?.message || "";
  const translations = [
    ["Too many guardian code attempts", "监护码尝试次数过多，请 15 分钟后再试。"],
    ["Up to 20 goals", "24 小时内最多创建 20 个目标，请明天再试。"],
    ["Up to 30 active goals", "最多同时保留 30 个进行中的目标，请先取消不需要的目标。"],
    ["Reminder limit reached", "已达到邮件提醒的发送间隔或次数限制，请稍后再试。"],
    ["Email delivery is not configured", "邮件服务尚未配置，本次提醒未发送。"],
    ["does not have a valid registered email", "学习者的账户邮箱不可用，请让对方先完善账户邮箱。"],
    ["Completed goals cannot be cancelled", "这个目标已达成，无法取消。请刷新查看最新进度。"],
    ["Goal not found", "这个目标已不存在，请刷新后重试。"],
    ["IANA timeZone", "所选时区暂不可用，请选择其他时区。"]
  ];
  const translated = translations.find(([text]) => message.includes(text));
  if (translated) return translated[1];
  if (error?.status === 429) return "操作有点频繁，请稍后再试。";
  return message || fallback;
}

const TIME_ZONE_LABELS = {
  "Asia/Shanghai": "中国标准时间", "Asia/Hong_Kong": "香港时间", "Asia/Taipei": "台北时间",
  "Asia/Tokyo": "日本时间", "Asia/Singapore": "新加坡时间", "America/Chicago": "美国中部时间",
  "America/New_York": "美国东部时间", "America/Los_Angeles": "美国太平洋时间", "Europe/London": "伦敦时间", UTC: "协调世界时"
};
const GOAL_STATUS = { active: "进行中", completed: "已达成", expired: "已结束", cancelled: "已取消" };
const KIND_LABELS = { quant: "量化题", problem: "题库练习", interview: "面试练习", mental: "心算", sequence: "数列", pattern: "图形推理", tech: "技术面试", behavioral: "行为面试", daily: "每日训练", quiz: "答题练习", manual: "题库练习", coding: "编程题" };
const TRAINER_LABELS = { mental: "Mental Math", sequence: "数列推理", pattern: "图形推理" };
const DELIVERY_LABELS = { pending: "达标邮件待发送", sent: "达标邮件已发送", disabled: "邮件服务尚未配置", retry: "达标邮件等待重试", failed: "达标邮件发送失败" };
const REMINDER_STATUS_LABELS = { pending: "提醒邮件待发送", sent: "提醒邮件已发送", disabled: "邮件服务尚未配置", retry: "提醒邮件等待重试", failed: "提醒邮件发送失败", cancelled: "提醒已取消" };

function Notice({ children, error = false }) {
  if (!children) return null;
  return <div className={`guardian-notice${error ? " guardian-notice-error" : ""}`} role={error ? "alert" : "status"}>{children}</div>;
}

function PracticeRecordRow({ question, timeZone }) {
  const trainer = TRAINER_LABELS[question.kind];
  const count = Number(trainer ? question.completedCount ?? question.count : question.count) || 0;
  const number = typeof question.problemNumber === "string" ? question.problemNumber.trim() : "";
  return <tr>
    <td>
      {trainer ? <><strong>{trainer}</strong><small>本次训练 · 总数计 1 题</small></> : <>
        <strong>{number && <span className="guardian-problem-number">题号 {number} · </span>}{question.title || question.titleEn || "练习题目"}</strong>
        {question.titleEn && question.title && question.titleEn !== question.title && <small>{question.titleEn}</small>}
      </>}
      {question.source === "leetcode" && <span className="guardian-source-label">LeetCode 账户同步</span>}
      {question.source === "manual" && <span className="guardian-source-label">手动记录</span>}
      {question.source === "legacy" && <span className="guardian-source-label">历史记录</span>}
    </td>
    <td><span className="guardian-question-kind">{KIND_LABELS[question.kind] || question.kind || "练习"}</span></td>
    <td className="guardian-completion-count">完成了 {count.toLocaleString("zh-CN")} 道</td>
    <td><time dateTime={question.completedAt}>{displayTime(question.completedAt, timeZone)}</time></td>
  </tr>;
}

function GoalItem({ goal, onCancel, cancelling }) {
  const count = Number(goal.progress) || 0;
  const target = Number(goal.targetCount) || 1;
  const percent = Math.min(100, Math.max(0, Math.round(count / target * 100)));
  return (
    <article className={`guardian-goal guardian-goal-${goal.status}`}>
      <div className="guardian-goal-top">
        <h3>{goal.title || "刷题目标"}</h3>
        <span className={`guardian-status guardian-status-${goal.status}`}>{goal.status === "completed" && <GuardianIcon name="check" size={13} />}{GOAL_STATUS[goal.status] || "进行中"}</span>
      </div>
      <p className="guardian-goal-dates">{goal.startDate} 至 {goal.endDate}<span> · {TIME_ZONE_LABELS[goal.timeZone] || goal.timeZone}</span></p>
      <div className="guardian-goal-progress-copy"><span>已完成 <strong>{count.toLocaleString("zh-CN")}</strong> / {target.toLocaleString("zh-CN")} 题</span><span>{percent}%</span></div>
      <progress className="guardian-progress" value={Math.min(count, target)} max={target} aria-label={`${goal.title}，已完成 ${count} 题，目标 ${target} 题`} />
      {goal.reward && <p className="guardian-goal-reward"><GuardianIcon name="gift" size={17} /><span>{goal.reward}</span></p>}
      {(goal.status === "completed" || goal.status === "active") && <div className="guardian-goal-bottom">
        <small>{goal.status === "completed" ? DELIVERY_LABELS[goal.notificationStatus] || "已达成，邮件状态待更新" : "达标后自动邮件通知学习者"}</small>
        {goal.status === "active" && <button type="button" className="guardian-text-button" onClick={() => onCancel(goal)} disabled={cancelling === goal.id}>{cancelling === goal.id ? "取消中…" : "取消目标"}</button>}
      </div>}
    </article>
  );
}

export function GuardianPage() {
  const appServices = useAppServicesContext();
  const baseUrl = getGuardianApiBaseUrl(appServices);
  const [session, setSession] = useState(() => readGuardianSession());
  const [code, setCode] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai");
  const [date, setDate] = useState(() => dateInZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai"));
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalFeedback, setGoalFeedback] = useState(null);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [cancellingGoal, setCancellingGoal] = useState(null);
  const [cancelCandidate, setCancelCandidate] = useState(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderFeedback, setReminderFeedback] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [nextAllowedAt, setNextAllowedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const requestNumber = useRef(0);
  const tokenRef = useRef(session?.token);
  tokenRef.current = session?.token;
  const dashboardLoader = useRef(null);
  const localToday = dateInZone(timeZone);
  const timeZones = [...new Set([timeZone, ...Object.keys(TIME_ZONE_LABELS), ...(typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [])])];
  const reminderCooldown = nextAllowedAt && new Date(nextAllowedAt).getTime() > now;

  const expireSession = useCallback(() => {
    tokenRef.current = null;
    clearGuardianSession();
    setSession(null);
    setDashboard(null);
    setCode("");
    setLoginError("监护访问已过期或已被撤销，请重新输入监护码。");
  }, []);

  const loadDashboard = useCallback(async ({ signal, quiet = false } = {}) => {
    if (!session?.token) return;
    const number = ++requestNumber.current;
    if (!quiet) setLoading(true);
    setDashboardError("");
    try {
      const query = new URLSearchParams({ date, timeZone });
      const result = await guardianRequest(`/api/guardian/dashboard?${query}`, { token: session.token, baseUrl, signal });
      if (number !== requestNumber.current || signal?.aborted || tokenRef.current !== session.token) return;
      setDashboard(result);
      setNextAllowedAt(result.reminder?.nextAllowedAt || null);
      if (result.reminder?.status === "sent") setReminderFeedback((feedback) => feedback && !feedback.error ? { error: false, text: "提醒邮件已发送。" } : feedback);
    } catch (error) {
      if (signal?.aborted || number !== requestNumber.current || tokenRef.current !== session.token) return;
      if (error?.status === 401 || error?.status === 403) expireSession();
      else setDashboardError(humanError(error, "暂时无法获取学习记录，请重试。"));
    } finally {
      if (number === requestNumber.current && !signal?.aborted) setLoading(false);
    }
  }, [baseUrl, date, expireSession, session?.token, timeZone]);
  dashboardLoader.current = loadDashboard;

  useEffect(() => {
    if (!session?.token) return undefined;
    const controller = new AbortController();
    setDashboard(null);
    setGoalFeedback(null);
    setReminderFeedback(null);
    loadDashboard({ signal: controller.signal });
    return () => controller.abort();
  }, [loadDashboard, session?.token]);

  useEffect(() => {
    if (!session?.token) return undefined;
    const refresh = () => { if (document.visibilityState !== "hidden") loadDashboard({ quiet: true }); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [loadDashboard, session?.token]);

  useEffect(() => {
    if (!reminderCooldown) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [reminderCooldown]);

  useEffect(() => {
    document.title = "监护人空间 · QuantGym";
  }, []);

  async function login(event) {
    event.preventDefault();
    if (signingIn || !code.trim()) return;
    setSigningIn(true);
    setLoginError("");
    try {
      const result = await guardianRequest("/api/guardian/session", { method: "POST", body: { code: code.trim() }, baseUrl });
      saveGuardianSession(result);
      setSession(result);
      setCode("");
    } catch (error) {
      setLoginError(error?.status === 401 ? "监护码无效或已重置，请向学习者确认后再试。" : humanError(error, "暂时无法进入，请稍后重试。"));
    } finally {
      setSigningIn(false);
    }
  }

  function logout() {
    const oldToken = session?.token;
    tokenRef.current = null;
    requestNumber.current += 1;
    clearGuardianSession();
    setSession(null);
    setDashboard(null);
    setShowGoalForm(false);
    setGoalFeedback(null);
    setReminderFeedback(null);
    setCancelCandidate(null);
    setLoginError("");
    if (oldToken) guardianRequest("/api/guardian/session", { method: "DELETE", token: oldToken, baseUrl }).catch(() => {});
  }

  function handleActionError(error, setter, fallback) {
    if (error?.status === 401 || error?.status === 403) expireSession();
    else setter({ error: true, text: humanError(error, fallback) });
  }

  async function createGoal(event) {
    event.preventDefault();
    if (creatingGoal) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") || "").trim(), targetCount: Number(form.get("targetCount")),
      startDate: String(form.get("startDate") || ""), endDate: String(form.get("endDate") || ""),
      timeZone, reward: String(form.get("reward") || "").trim()
    };
    if (payload.endDate < payload.startDate) {
      setGoalFeedback({ error: true, text: "结束日期不能早于开始日期。" });
      return;
    }
    if (!payload.title) {
      setGoalFeedback({ error: true, text: "请为目标起一个名字。" });
      return;
    }
    if (Date.parse(payload.endDate) - Date.parse(payload.startDate) > 365 * 86400000) {
      setGoalFeedback({ error: true, text: "一个目标的日期范围最多为 366 天，请缩短目标周期。" });
      return;
    }
    const actionToken = session.token;
    setCreatingGoal(true);
    setGoalFeedback(null);
    try {
      await guardianRequest("/api/guardian/goals", { method: "POST", body: payload, token: actionToken, baseUrl });
      if (tokenRef.current !== actionToken) return;
      setShowGoalForm(false);
      setGoalFeedback({ error: false, text: "目标已设置，系统会根据已同步的刷题记录更新进度。" });
      await dashboardLoader.current({ quiet: true });
    } catch (error) {
      if (tokenRef.current === actionToken) handleActionError(error, setGoalFeedback, "目标保存失败，请重试。");
    } finally {
      setCreatingGoal(false);
    }
  }

  async function cancelGoal() {
    if (!cancelCandidate || cancellingGoal) return;
    const actionToken = session.token;
    const goalId = cancelCandidate.id;
    setCancellingGoal(goalId);
    setGoalFeedback(null);
    try {
      await guardianRequest(`/api/guardian/goals/${encodeURIComponent(goalId)}`, { method: "DELETE", token: actionToken, baseUrl });
      if (tokenRef.current !== actionToken) return;
      setCancelCandidate(null);
      setGoalFeedback({ error: false, text: "目标已取消。" });
      await dashboardLoader.current({ quiet: true });
    } catch (error) {
      if (tokenRef.current === actionToken) handleActionError(error, setGoalFeedback, "取消失败，请重试。");
    } finally {
      setCancellingGoal(null);
    }
  }

  async function sendReminder(event) {
    event.preventDefault();
    if (sendingReminder || reminderCooldown) return;
    const actionToken = session.token;
    setSendingReminder(true);
    setReminderFeedback(null);
    try {
      const result = await guardianRequest("/api/guardian/reminders", { method: "POST", body: { message: reminderMessage.trim() }, token: actionToken, baseUrl });
      if (tokenRef.current !== actionToken) return;
      const status = result.notification?.status;
      const copy = {
        sent: "提醒邮件已发送。", pending: "提醒已加入发送队列，邮件发送状态可能稍有延迟。",
        retry: "邮件暂未发送成功，系统正在等待重试。", disabled: "邮件服务尚未配置，提醒未发送。", failed: "邮件发送失败，请稍后重试。"
      };
      setReminderFeedback({ error: status === "failed" || status === "disabled", text: copy[status] || "提醒请求已提交，邮件发送状态待确认。" });
      if (status === "sent" || status === "pending") setReminderMessage("");
      setNextAllowedAt(result.nextAllowedAt || null);
      setNow(Date.now());
      await dashboardLoader.current({ quiet: true });
    } catch (error) {
      if (tokenRef.current === actionToken) handleActionError(error, setReminderFeedback, "邮件提醒未发送，请稍后重试。");
    } finally {
      setSendingReminder(false);
    }
  }

  const studentName = dashboard?.student?.name || session?.student?.name || "学习者";
  const goals = Array.isArray(dashboard?.goals) ? dashboard.goals : [];
  const questions = Array.isArray(dashboard?.questions) ? dashboard.questions : [];
  const summary = dashboard?.summary || {};

  return (
    <div className="guardian-page">
      <header className="guardian-header">
        <Link to="/" className="guardian-brand" aria-label="QuantGym 首页"><span className="guardian-brand-mark">Q</span><span>QuantGym</span></Link>
        <div className="guardian-header-right"><span className="guardian-space-label"><GuardianIcon size={15} />监护人空间</span>{session?.token && <button type="button" className="guardian-text-button guardian-logout" onClick={logout}><GuardianIcon name="exit" size={16} />退出</button>}</div>
      </header>

      {!session?.token ? <main className="guardian-login-main">
        <section className="guardian-login-story">
          <p className="guardian-eyebrow">A LITTLE SUPPORT. EVERY DAY.</p>
          <h1>每一份坚持，<br />都值得被看见。</h1>
          <p className="guardian-login-description">了解学习近况，定下一个小目标，<br className="guardian-desktop-break" />再送上一点鼓励。一起让刷题成为习惯。</p>
          <div className="guardian-login-features">
            <div><GuardianIcon name="book" /><span><strong>看见今天的进步</strong><small>刷题数量与练习记录，一目了然。</small></span></div>
            <div><GuardianIcon name="target" /><span><strong>约定目标与奖励</strong><small>记录彼此的约定，达标后邮件通知。</small></span></div>
            <div><GuardianIcon name="mail" /><span><strong>送出一封鼓励</strong><small>给对应学习者发送刷题提醒。</small></span></div>
          </div>
        </section>
        <section className="guardian-login-card" aria-labelledby="guardian-login-title">
          <div className="guardian-login-icon"><GuardianIcon size={29} /></div>
          <h2 id="guardian-login-title">进入监护人空间</h2>
          <p>无需注册或登录账户，输入学习者分享的监护码即可。</p>
          <form onSubmit={login}>
            <label className="guardian-field" htmlFor="guardian-code">监护码<input id="guardian-code" name="guardianCode" className="guardian-code-input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="输入监护码" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={128} required disabled={signingIn} /></label>
            <Notice error>{loginError}</Notice>
            <button className="guardian-primary guardian-full-width" type="submit" disabled={signingIn || !code.trim()}>{signingIn ? "正在连接…" : "进入监护人空间"}<GuardianIcon name="arrow" size={18} /></button>
          </form>
          <p className="guardian-login-help">监护码可由学习者在「账户」页面获取。<br />持有码即可访问学习记录，请妥善保管。</p>
          <Link to="/" className="guardian-back-link">返回账户登录</Link>
        </section>
      </main> : <main className="guardian-main">
        <div className="guardian-page-title">
          <div><p className="guardian-eyebrow">LEARNING, TOGETHER</p><h1>{studentName} 的学习近况</h1><p>记录每一步进步，让鼓励在需要的时候到来。</p></div>
          <button type="button" className="guardian-secondary" onClick={() => loadDashboard()} disabled={loading}><GuardianIcon name="refresh" size={16} />{loading ? "更新中…" : "刷新记录"}</button>
        </div>

        <div className="guardian-toolbar">
          <div className="guardian-date-control"><GuardianIcon name="calendar" size={18} /><label htmlFor="guardian-date">查看日期</label><input id="guardian-date" type="date" value={date} max={localToday} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} />{date !== localToday && <button className="guardian-text-button" type="button" onClick={() => setDate(localToday)}>回到今天</button>}</div>
          <label className="guardian-timezone-control" htmlFor="guardian-timezone">统计时区<select id="guardian-timezone" value={timeZone} onChange={(event) => { setTimeZone(event.target.value); setDate(dateInZone(event.target.value)); }}>{timeZones.map((zone) => <option key={zone} value={zone}>{TIME_ZONE_LABELS[zone] ? `${TIME_ZONE_LABELS[zone]} · ` : ""}{zone}</option>)}</select></label>
        </div>
        <Notice error>{dashboardError}</Notice>
        {loading && !dashboard && <div className="guardian-loading" role="status"><span className="guardian-loading-dot" />正在读取学习记录…</div>}
        {!loading && !dashboard && dashboardError && <button className="guardian-secondary" type="button" onClick={() => loadDashboard()}>重新加载</button>}

        {dashboard && <>
          {!dashboard.emailConfigured && <Notice>邮件服务尚未配置。学习记录和目标可以正常使用，邮件提醒暂不可用。</Notice>}
          <section className="guardian-stats" aria-label="学习数据概览">
            {[{ label: date === localToday ? "今天刷题" : "当日刷题", value: summary.todayCount, unit: "题", featured: true }, { label: "累计刷题", value: summary.totalCount, unit: "题" }, { label: "累计学习", value: summary.activeDays, unit: "天" }, { label: "达成目标", value: summary.completedGoals, unit: "个" }].map((stat) => <div key={stat.label} className={`guardian-stat${stat.featured ? " guardian-stat-featured" : ""}`}><span>{stat.label}</span><p><strong>{Number(stat.value || 0).toLocaleString("zh-CN")}</strong><small>{stat.unit}</small></p></div>)}
          </section>

          <p className="guardian-table-note">Mental Math、数列与图形每次训练计入总数 1 题，明细显示本次完成了多少道。其他题目点击「我做完了」后逐题计入。LeetCode 同一题距离上一次计数的通过提交满 3 小时，可再次计入。</p>
          {Number(summary.undatedLeetcodeCount) > 0 && <p className="guardian-history-note">累计已包含 LeetCode 账户历史已解的 {Number(summary.leetcodeLifetimeSolvedCount).toLocaleString("zh-CN")} 道题，以及符合间隔要求的重复练习。其中 {Number(summary.undatedLeetcodeCount).toLocaleString("zh-CN")} 道历史题尚无提交明细，暂不归入某一天或日期目标。</p>}

          <div className="guardian-workspace">
            <div className="guardian-primary-column">
              <section className="guardian-panel guardian-records" aria-labelledby="guardian-records-title">
                <div className="guardian-section-heading"><div><h2 id="guardian-records-title">{date === localToday ? "今天" : "当日"}练习了什么</h2><p>{date} · 已同步的练习记录</p></div><span className="guardian-small-count">{questions.length}{dashboard.questionsTruncated ? "+" : ""} 条记录</span></div>
                {questions.length ? <div className="guardian-question-table"><table><thead><tr><th scope="col">练习内容</th><th scope="col">类型</th><th scope="col">完成数量</th><th scope="col">最近完成</th></tr></thead><tbody>{questions.map((question, index) => <PracticeRecordRow key={`${question.source || question.kind}-${question.id}-${index}`} question={question} timeZone={timeZone} />)}</tbody></table></div> : <div className="guardian-empty"><span className="guardian-empty-icon"><GuardianIcon name="book" size={26} /></span><h3>这一天还没有完成记录</h3><p>完成训练、点击「我做完了」或同步 LeetCode 通过记录后，会显示在这里。</p></div>}
                {dashboard.questionsTruncated && <p className="guardian-table-note">当前展示最近 200 条记录，统计数量包含全部记录。</p>}
              </section>

              <section className="guardian-panel" aria-labelledby="guardian-goals-title">
                <div className="guardian-section-heading"><div><h2 id="guardian-goals-title">目标与奖励</h2><p>把期待变成一个可以完成的小目标。</p></div><button className="guardian-secondary guardian-add-goal" type="button" aria-expanded={showGoalForm} aria-controls="guardian-goal-form" onClick={() => { setShowGoalForm(!showGoalForm); setGoalFeedback(null); }}><GuardianIcon name="plus" size={16} />{showGoalForm ? "收起" : "设置目标"}</button></div>
                <Notice error={goalFeedback?.error}>{goalFeedback?.text}</Notice>
                {showGoalForm && <form id="guardian-goal-form" className="guardian-goal-form" onSubmit={createGoal}>
                  <fieldset disabled={creatingGoal}>
                    <label className="guardian-field">目标名称<input name="title" placeholder="例如：这周完成 20 道题" maxLength={100} required /></label>
                    <div className="guardian-form-grid"><label className="guardian-field">目标题数<input name="targetCount" type="number" min="1" max="10000" step="1" defaultValue="20" required /></label><label className="guardian-field">开始日期<input name="startDate" type="date" defaultValue={localToday} required /></label><label className="guardian-field">结束日期<input name="endDate" type="date" defaultValue={addDays(localToday, 6)} required /></label></div>
                    <label className="guardian-field">达标奖励 <span className="guardian-optional">选填</span><textarea name="reward" rows={2} maxLength={500} placeholder="例如：周末一起看一场电影" /></label>
                    <p className="guardian-form-note">按 {TIME_ZONE_LABELS[timeZone] || timeZone} 统计日期范围内的刷题数。达标后自动邮件通知，约定的奖励由你兑现。</p>
                    <div className="guardian-form-actions"><button type="button" className="guardian-text-button" onClick={() => setShowGoalForm(false)}>暂不设置</button><button type="submit" className="guardian-primary">{creatingGoal ? "保存中…" : "保存目标"}</button></div>
                  </fieldset>
                </form>}
                {cancelCandidate && <div className="guardian-cancel-confirm" role="group" aria-label="确认取消目标"><p>取消「{cancelCandidate.title}」？取消后不再追踪这个目标。</p><div><button className="guardian-secondary" type="button" onClick={() => setCancelCandidate(null)} disabled={Boolean(cancellingGoal)}>保留目标</button><button className="guardian-danger-button" type="button" onClick={cancelGoal} disabled={Boolean(cancellingGoal)}>{cancellingGoal ? "取消中…" : "确认取消"}</button></div></div>}
                {goals.length ? <div className="guardian-goal-list">{goals.map((goal) => <GoalItem key={goal.id} goal={goal} onCancel={setCancelCandidate} cancelling={cancellingGoal} />)}</div> : !showGoalForm && <div className="guardian-empty guardian-empty-goals"><span className="guardian-empty-icon"><GuardianIcon name="target" size={26} /></span><h3>一起约定第一个小目标</h3><p>设置完成题数与期限，再加上一份值得期待的奖励。</p><button className="guardian-text-button" type="button" onClick={() => setShowGoalForm(true)}>设置一个目标<GuardianIcon name="arrow" size={16} /></button></div>}
              </section>
            </div>

            <aside className="guardian-sidebar">
              <section className="guardian-panel guardian-reminder" aria-labelledby="guardian-reminder-title">
                <div className="guardian-reminder-icon"><GuardianIcon name="mail" size={23} /></div><h2 id="guardian-reminder-title">一封小小的鼓励</h2><p>直接发给 {studentName} 的账户邮箱，提醒对方抽一点时间练习。</p>
                <form onSubmit={sendReminder}><label className="guardian-field" htmlFor="guardian-reminder-message">想说的话 <span className="guardian-optional">选填</span><textarea id="guardian-reminder-message" rows={5} maxLength={1000} value={reminderMessage} onChange={(event) => setReminderMessage(event.target.value)} placeholder="今天也记得留一点时间刷题。每天进步一点点，我为你的坚持加油！" disabled={sendingReminder || !dashboard.emailConfigured} /></label><div className="guardian-message-count">{reminderMessage.length} / 1000</div><button type="submit" className="guardian-primary guardian-full-width" disabled={sendingReminder || !dashboard.emailConfigured || Boolean(reminderCooldown)}><GuardianIcon name="mail" size={17} />{sendingReminder ? "正在提交…" : !dashboard.emailConfigured ? "邮件服务尚未配置" : reminderCooldown ? "请稍后再发送" : "发送邮件提醒"}</button></form>
                <Notice error={reminderFeedback?.error}>{reminderFeedback?.text}</Notice>
                {dashboard.reminder?.status && <p className={`guardian-reminder-delivery${dashboard.reminder.status === "failed" ? " guardian-reminder-delivery-error" : ""}`} role="status">{REMINDER_STATUS_LABELS[dashboard.reminder.status] || "提醒发送状态待更新"}</p>}
                {reminderCooldown && <p className="guardian-reminder-meta">下次可发送：{displayTime(nextAllowedAt, timeZone, true)}</p>}
                {dashboard.reminder?.lastSentAt && <p className="guardian-reminder-meta">上次发送：{displayTime(dashboard.reminder.lastSentAt, timeZone, true)}</p>}
              </section>
              <div className="guardian-sync-note"><GuardianIcon name="shield" size={19} /><div><strong>关于这些记录</strong><p>{dashboard.countingNote || "学习记录来自学习者已同步的数据。尚未同步的练习暂不会计入，请让学习者联网后完成同步。"}</p>{dashboard.syncedAt && <small>最近同步：{displayTime(dashboard.syncedAt, timeZone, true)}</small>}</div></div>
            </aside>
          </div>
        </>}
      </main>}
      <footer className="guardian-footer"><span>QuantGym</span><span>一点坚持，一点陪伴。</span></footer>
    </div>
  );
}

export default GuardianPage;
