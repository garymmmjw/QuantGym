import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Check, Code2, Calculator, BriefcaseBusiness, BrainCircuit, MessagesSquare } from "lucide-react";
import { useOverviewPageModel } from "./overviewHooks.js";
import { useOverviewActivity } from "./useOverviewActivity.js";
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
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const number = value => value == null ? "—" : Number(value).toLocaleString("zh-CN");

export function OverviewPageContent() {
  const model = useOverviewPageModel();
  const activity = useOverviewActivity();
  const questsDone = TASKS.filter(task => activity.today.counts[task.key] > 0).length;
  const totalSolved = model.problemProgress.reduce((max, item) => Math.max(max, item.done || 0), 0);
  const recordedDays = activity.days.slice(0, activity.days.findIndex(day => day.isToday) + 1);
  const weekTotal = recordedDays.some(day => day.activityScore != null)
    ? recordedDays.reduce((sum, day) => sum + (day.activityScore || 0), 0) : null;
  const weekKnown = recordedDays.every(day => Object.values(day.counts).every(value => value != null));
  const maxScore = Math.max(1, ...activity.days.map(day => day.activityScore || 0));

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

      <section className="overview-daily-tasks" aria-labelledby="overviewDailyTasksTitle">
        <div className="overview-section-heading">
          <h2 id="overviewDailyTasksTitle">每日任务</h2>
          <span className="overview-task-progress">{questsDone}<span> / 5</span></span>
        </div>
        <div className="overview-task-list">
          {TASKS.map(({ key, title, points, to, Icon }) => {
            const count = activity.today.counts[key];
            const done = count > 0;
            return (
              <Link className={`overview-task${done ? " is-done" : ""}`} key={key} to={to}>
                <span className="overview-task-icon" aria-hidden="true"><Icon size={21} /></span>
                <span className="overview-task-copy"><strong>{title}</strong><small>活跃度 +{points}</small></span>
                <span className="overview-task-state">{done ? <><Check size={16} aria-hidden="true" /><span>已完成</span></> : <><span>{count == null ? "待同步" : "去完成"}</span><ArrowRight size={16} aria-hidden="true" /></>}</span>
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

        <article className="overview-effect-panel overview-activity-panel qg-overview-rhythm">
          <div className="effect-panel-heading">
            <h2>活跃度</h2>
            <div className="overview-activity-total"><strong>{number(weekTotal)}<small> 分</small></strong><span>本周{weekKnown ? "累计" : "已记录"}</span></div>
          </div>
          <div className="overview-activity-bars" id="overviewActivityBars" role="img" aria-label={`本周活跃度，${activity.days.map((day, index) => `周${WEEKDAYS[index]} ${number(day.activityScore)} 分`).join("，")}`}>
            {activity.days.map((day, index) => (
              <div className={`overview-activity-day${day.isToday ? " is-today" : ""}`} key={day.day} title={`${day.day} · ${number(day.activityScore)} 分`}>
                <strong>{number(day.activityScore)}</strong>
                <div className="overview-activity-track"><i style={{ height: day.activityScore ? `${Math.max(5, day.activityScore / maxScore * 100)}%` : "3px" }} /></div>
                <span>{day.isToday ? "今天" : WEEKDAYS[index]}</span>
              </div>
            ))}
          </div>
          <p className="overview-activity-rule">Application 2 · LeetCode 5 · Tech 10 · Behavioral 10 · Mental Math 5</p>
        </article>
      </section>
      {activity.statusNote && <p className="overview-data-note">{activity.statusNote}</p>}
    </div>
  );
}
