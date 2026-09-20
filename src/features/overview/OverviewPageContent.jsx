import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Activity, Check, Code2, Calculator, BriefcaseBusiness, BrainCircuit, MessagesSquare } from "lucide-react";
import { useOverviewPageModel } from "./overviewHooks.js";
import { useOverviewActivity } from "./useOverviewActivity.js";
import { ACTIVITY_WEIGHTS } from "./activityMetrics.js";
import { OverviewCareerStage } from "../careerStages/OverviewCareerStage.jsx";
import "./overviewDashboard.css";

const TOTALS = [
  { key: "applications", label: "已投递申请", unit: "份" },
  { key: "leetcode", label: "LeetCode 已解", unit: "题" },
  { key: "technical", label: "Tech 已解决", unit: "题" },
  { key: "behavioral", label: "Behavioral 已准备", unit: "题" },
  { key: "mock", label: "Mock 已完成", unit: "次", note: "旧 Mock 历史未记录账号归属，暂无法核实累计次数。" },
  { key: "experiences", label: "面经已读", unit: "篇", note: "按面经页的已读标记累计；旧阅读历史未记录。" }
];
const TASKS = [
  { key: "leetcode", title: "一道 LeetCode", points: 5, to: "/leetcode", Icon: Code2 },
  { key: "mentalMath", title: "一次 Mental Math", points: 5, to: "/tools", Icon: Calculator },
  { key: "applications", title: "一份 Application", points: 2, to: "/tracker", Icon: BriefcaseBusiness },
  { key: "technical", title: "一道 Tech", points: 10, to: "/technical-interview", Icon: BrainCircuit },
  { key: "behavioral", title: "一道 Behavioral", points: 10, to: "/behavioral-interview", Icon: MessagesSquare }
];
const ACTIVITY_CATEGORIES = [
  { key: "applications", label: "投递", title: "Application" },
  { key: "leetcode", label: "LeetCode", title: "LeetCode" },
  { key: "technical", label: "Tech", title: "Tech" },
  { key: "behavioral", label: "Behavioral", title: "Behavioral" },
  { key: "mentalMath", label: "速算", title: "Mental Math" }
];
const shortDate = day => day ? day.slice(5).split("-").map(Number).join("/") : "—";
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const number = value => value == null ? "—" : Number(value).toLocaleString("zh-CN");

export function OverviewPageContent() {
  const model = useOverviewPageModel();
  const activity = useOverviewActivity();
  const [selectedDay, setSelectedDay] = useState(null);
  const questsDone = TASKS.filter(task => activity.today.counts[task.key] > 0).length;
  const totalSolved = model.problemProgress.reduce((max, item) => Math.max(max, item.done || 0), 0);
  const recordedDays = activity.days.slice(0, activity.days.findIndex(day => day.isToday) + 1);
  const weekTotal = recordedDays.some(day => day.activityScore != null)
    ? recordedDays.reduce((sum, day) => sum + (day.activityScore || 0), 0) : null;
  const sourcesComplete = Object.values(activity.recordBundle.sources).every(Boolean)
    && activity.recordBundle.personalComplete && activity.recordBundle.applicationsComplete && activity.recordBundle.leetcodeComplete;
  const isCompleteDay = day => Boolean(sourcesComplete && day && Object.values(day.counts).every(value => value != null));
  const weekKnown = recordedDays.length > 0 && recordedDays.every(isCompleteDay);
  const maxScore = Math.max(1, ...recordedDays.map(day => day.activityScore || 0));
  const today = activity.days.find(day => day.isToday);
  const selected = recordedDays.find(day => day.day === selectedDay) || today;
  const activeDays = recordedDays.filter(day => day.activityScore > 0).length;
  const hasRecordedDays = recordedDays.some(day => day.activityScore != null);

  return (
    <div className="overview-route-page qg-growth-page qg-overview-page overview-dashboard">
      <section className="quanty-hero qg-overview-hero" aria-label="累计进展">
        <div className="quanty-hero-copy">
          <h2 className="overview-greeting"><span className="overview-greeting-name">加油，{model.displayName}</span><span>越努力，越幸运。</span></h2>
          <dl className="overview-lifetime-totals">
            {TOTALS.map(item => (
              <div key={item.key} title={item.note || (activity.totals[item.key] == null ? "数据待同步，暂不显示为零。" : undefined)}>
                <dt>{item.label}</dt>
                <dd><strong>{number(activity.totals[item.key])}</strong><span>{item.unit}</span></dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="shark-stage" id="sharkStage">
          <span className="stage-glow" aria-hidden="true" />
          <span className="stage-ring stage-ring-outer" aria-hidden="true" />
          <span className="stage-ring stage-ring-inner" aria-hidden="true" />
          <span className="stage-shadow" aria-hidden="true" />
          <div className="shark-bubble" id="sharkBubble" role="status" aria-live="polite" />
          <button className="shark-interactive" id="sharkInteractive" type="button" aria-label="戳一下 Quanty">
            <img src="/assets/generated/playful-precision/mascot-hero-v5-clean.png" id="heroShark" alt="Quanty 鲨鱼吉祥物" draggable="false" />
          </button>
        </div>
      </section>

      <OverviewCareerStage rows={activity.stageRows} />

      <section className="overview-daily-tasks qg-overview-quests" aria-labelledby="overviewDailyTasksTitle">
        <div className="qg-quests-head">
          <div className="qg-quests-title">
            <img src="/assets/generated/playful-precision/reward-target.webp" alt="" width="36" height="36" loading="lazy" />
            <h2 id="overviewDailyTasksTitle">每日任务</h2>
          </div>
          <div className="qg-quests-progress" role="progressbar" aria-label="每日任务完成进度" aria-valuemin={0} aria-valuemax={TASKS.length} aria-valuenow={questsDone}>
            <i aria-hidden="true"><span style={{ width: `${questsDone / TASKS.length * 100}%` }} /></i>
            <b>{questsDone}/{TASKS.length}</b>
          </div>
        </div>
        <div className="overview-task-list qg-quest-list">
          {TASKS.map(({ key, title, points, to, Icon }) => {
            const count = activity.today.counts[key];
            const done = count > 0;
            return (
              <Link className={`overview-task qg-quest-row${done ? " is-done" : ""}`} key={key} to={to}>
                <span className="qg-quest-badge" aria-hidden="true">{done ? <Check size={20} /> : <Icon size={20} />}</span>
                <span className="qg-quest-copy"><strong>{title}</strong><small>{done ? "已完成" : count == null ? "待同步" : "待完成"}</small></span>
                <span className="qg-quest-xp">+{points} 活跃度</span>
                <span className="qg-quest-check" aria-hidden="true"><Check size={15} /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="overview-effect-grid qg-overview-effects" aria-label="刷题进度与活跃度">
        <article className="overview-effect-panel problem-progress-panel qg-overview-progress">
          <div className="effect-panel-heading">
            <h2>刷题进度</h2>
            <div className="effect-head-side">
              <span className="effect-head-stat">已解 {number(totalSolved)} 题</span>
              <Link className="icon-button ghost" to="/problems" title="打开题库" aria-label="打开题库"><ArrowUpRight size={18} /></Link>
            </div>
          </div>
          <div id="overviewProblemProgress" className="effect-progress-group">
            {model.problemProgress.map(item => (
              <div className="effect-progress-row" key={item.key} style={{ "--value": String(item.percent), "--accent-index": String(item.accentIndex) }}>
                <div>
                  <span className="progress-row-name"><span className="progress-dot" aria-hidden="true" /><strong>{item.label}</strong></span>
                  <span className="progress-row-nums"><span>{item.done} / {item.total}</span><b>{item.percent}%</b></span>
                </div>
                <i aria-hidden="true"><span /></i>
              </div>
            ))}
            {!model.problemProgress.length && <p className="overview-progress-empty">完成题库中的题目后，这里会显示你的进度。</p>}
          </div>
        </article>

        <article className="overview-effect-panel overview-activity-panel qg-overview-rhythm" aria-labelledby="overviewActivityTitle">
          <div className="overview-activity-heading">
            <h2 id="overviewActivityTitle"><Activity size={18} aria-hidden="true" />活跃度</h2>
            <span className="overview-activity-range">{shortDate(activity.days[0]?.day)} – {shortDate(activity.days.at(-1)?.day)}</span>
          </div>
          <div className="overview-activity-summary">
            <div className="overview-activity-total">
              <span>本周{weekKnown ? "累计" : "已记录"}</span>
              <div><strong>{number(weekTotal)}</strong><span>分</span></div>
            </div>
            <dl className="overview-activity-highlights">
              <div><dt>今日{isCompleteDay(today) ? "积分" : "已记录"}</dt><dd>{number(today?.activityScore)}<span>分</span></dd></div>
              <div><dt>已活跃</dt><dd>{hasRecordedDays ? activeDays : "—"}<span>天</span></dd></div>
            </dl>
          </div>
          <div className="overview-activity-bars" id="overviewActivityBars" role="group" aria-label="每日活跃度，选择日期查看明细">
            {activity.days.map((day, index) => {
              const future = !today || day.day > today.day;
              const chosen = selected?.day === day.day;
              return (
                <button type="button"
                  className={`overview-activity-day${day.isToday ? " is-today" : ""}${chosen ? " is-selected" : ""}${future ? " is-future" : ""}`}
                  key={day.day} disabled={future} aria-pressed={chosen}
                  aria-controls="overviewActivityDetails"
                  aria-label={`${shortDate(day.day)} 周${WEEKDAYS[index]}${day.isToday ? " 今天" : ""}，${future ? "尚未开始" : day.activityScore == null ? "数据待同步" : `${number(day.activityScore)} 分${isCompleteDay(day) ? "" : "，部分记录"}`}`}
                  onClick={() => setSelectedDay(day.day)}>
                  <strong>{future ? "—" : number(day.activityScore)}</strong>
                  <span className="overview-activity-track" aria-hidden="true"><i style={{ height: `${(day.activityScore || 0) / maxScore * 100}%` }} /></span>
                  <span className="overview-activity-weekday">{day.isToday ? "今天" : WEEKDAYS[index]}</span>
                </button>
              );
            })}
          </div>
          <div className="overview-activity-details" id="overviewActivityDetails" aria-live="polite" aria-atomic="true">
            <div className="overview-activity-detail-heading">
              <span>{selected?.isToday ? "今日明细" : `${shortDate(selected?.day)} · 明细`}{selected && !isCompleteDay(selected) && <small> · 已记录</small>}</span>
              <strong>{number(selected?.activityScore)}<small> 分</small></strong>
            </div>
            <dl className="overview-activity-breakdown">
              {ACTIVITY_CATEGORIES.map(category => (
                <div key={category.key} title={`${category.title}：${number(selected?.counts[category.key])} × ${ACTIVITY_WEIGHTS[category.key]} 分`}>
                  <dt>{category.label}</dt>
                  <dd><strong>{number(selected?.counts[category.key])}</strong><span>×{ACTIVITY_WEIGHTS[category.key]}</span></dd>
                </div>
              ))}
            </dl>
          </div>
        </article>
      </section>
      {activity.statusNote && <p className="overview-data-note">{activity.statusNote}</p>}
    </div>
  );
}
