import { useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { ACTIVITY_WEIGHTS } from './activityMetrics.js';
import { buildActivityChart } from './activityChartModel.js';
import { localDayKey } from '../personal/calendar/calendarModel.js';
import './overviewActivityChart.css';

const CATEGORIES = [
  { key: 'applications', label: '投递' },
  { key: 'leetcode', label: 'LeetCode' },
  { key: 'technical', label: 'Tech' },
  { key: 'behavioral', label: 'Behavioral' },
  { key: 'mentalMath', label: '速算' },
];
const number = value => value == null ? '—' : value.toLocaleString('zh-CN');
const dateLabel = day => day.slice(5).replace('-', '.');
const rangeLabel = bucket => bucket.start === bucket.end ? dateLabel(bucket.start) : `${dateLabel(bucket.start)} – ${dateLabel(bucket.end)}`;

function monthChoices(bundle, today) {
  const months = new Set([today.slice(0, 7)]);
  const [year, month] = today.split('-').map(Number);
  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(year, month - 1 - offset, 1, 12);
    months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  for (const record of bundle.records || []) {
    if (record.day && localDayKey(record.day) === record.day && record.day <= today) months.add(record.day.slice(0, 7));
  }
  return [...months].sort().reverse();
}

export function OverviewActivityChart({ activity }) {
  const today = activity.days.find(day => day.isToday)?.day || localDayKey();
  const [chosenMonth, setChosenMonth] = useState(null);
  const [granularity, setGranularity] = useState('day');
  const [metric, setMetric] = useState('score');
  const [selectedKey, setSelectedKey] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const bars = useRef(null);
  const months = useMemo(() => monthChoices(activity.recordBundle, today), [activity.recordBundle, today]);
  const month = months.includes(chosenMonth) ? chosenMonth : today.slice(0, 7);
  const chart = useMemo(() => buildActivityChart(activity.recordBundle, { month, today, granularity, metric }),
    [activity.recordBundle, month, today, granularity, metric]);
  const selected = chart.buckets.find(bucket => bucket.key === (hoveredKey || selectedKey));
  const selectedIndex = selected ? chart.buckets.indexOf(selected) : -1;
  const unit = metric === 'score' ? '分' : '项';
  const contribution = (counts, key) => counts[key] == null ? null : counts[key] * (metric === 'score' ? ACTIVITY_WEIGHTS[key] : 1);
  const resetSelection = () => { setSelectedKey(null); setHoveredKey(null); };
  const moveFocus = event => {
    const buttons = [...bars.current.querySelectorAll('button:not(:disabled)')];
    const current = buttons.indexOf(event.currentTarget);
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : event.key === 'ArrowLeft' ? Math.max(0, current - 1) : event.key === 'ArrowRight' ? Math.min(buttons.length - 1, current + 1) : null;
    if (target !== null) { event.preventDefault(); buttons[target]?.focus(); }
    if (event.key === 'Escape') { resetSelection(); event.currentTarget.blur(); }
  };

  return <article className="overview-effect-panel overview-activity-panel qg-overview-rhythm activity-chart" aria-labelledby="overviewActivityTitle">
    <header className="activity-chart-heading">
      <h2 id="overviewActivityTitle">活跃度</h2>
      <span className="activity-chart-total" title={chart.partial ? '仅汇总已记录的活动' : undefined}>
        {chart.partial ? '已记录' : '合计'} <strong>{number(chart.totalValue)}</strong> {unit}
      </span>
    </header>
    <div className="activity-chart-toolbar">
      <div className="activity-chart-segments" role="group" aria-label="活跃度指标">
        {[['score', '活跃分'], ['count', '完成量']].map(([value, label]) => <button type="button" key={value}
          aria-pressed={metric === value} onClick={() => { setMetric(value); resetSelection(); }}>{label}</button>)}
      </div>
      <div className="activity-chart-filters">
        <label><select aria-label="统计粒度" value={granularity} onChange={event => { setGranularity(event.target.value); resetSelection(); }}>
          <option value="day">日</option><option value="week">周</option>
        </select><ChevronDown size={14} aria-hidden="true" /></label>
        <label><select aria-label="统计月份" value={month} onChange={event => { setChosenMonth(event.target.value); resetSelection(); }}>
          {months.map(value => <option key={value} value={value}>{value.replace('-0', '-')}</option>)}
        </select><ChevronDown size={14} aria-hidden="true" /></label>
      </div>
    </div>

    <div className="activity-chart-plot">
      <div className="activity-chart-grid" aria-hidden="true"><span /><span /><span /></div>
      <div className="activity-chart-scale" aria-hidden="true"><span>{number(chart.axisMax)}</span><span>{number(chart.axisMax / 2)}</span><span>0</span></div>
      <div className="overview-activity-bars" id="overviewActivityBars" ref={bars} data-mode={granularity} data-month={month}
        role="group" aria-label="活跃度柱状图，选择日期查看明细" onMouseLeave={() => setHoveredKey(null)}>
        {chart.buckets.map(bucket => {
          const value = bucket.value;
          return <button type="button" key={bucket.key} className={`overview-activity-day${value == null ? ' is-unknown' : ''}${selected?.key === bucket.key ? ' is-selected' : ''}`}
            data-start={bucket.start} data-end={bucket.end} disabled={bucket.future} aria-pressed={selectedKey === bucket.key}
            aria-label={`${rangeLabel(bucket)}，${bucket.future ? '尚未开始' : value == null ? '数据待同步' : `${number(value)} ${unit}${bucket.partial ? '，已记录' : ''}`}`}
            aria-controls="overviewActivityDetails" onClick={() => { setSelectedKey(selectedKey === bucket.key ? null : bucket.key); setHoveredKey(null); }}
            onMouseEnter={() => setHoveredKey(bucket.key)} onFocus={() => setHoveredKey(bucket.key)} onBlur={() => setHoveredKey(null)}
            onKeyDown={moveFocus}>
            <span className="activity-chart-stack" style={{ height: `${(value || 0) / chart.axisMax * 100}%` }} aria-hidden="true">
              {CATEGORIES.map(({ key }) => { const points = contribution(bucket.counts, key); return points > 0
                ? <span key={key} className={`activity-chart-piece activity-color-${key}`} style={{ flexGrow: points }} /> : null; })}
            </span>
          </button>;
        })}
      </div>
      {chart.totalValue === null && <p className="activity-chart-empty">活动记录待同步</p>}
      {chart.totalValue === 0 && <p className="activity-chart-empty">本月暂无{chart.partial ? '已记录活动' : '活动'}</p>}
      {selected && <div className="activity-chart-tooltip" id="overviewActivityDetails" role="status" aria-live="polite"
        style={{ '--tooltip-x': `${Math.max(20, Math.min(80, (selectedIndex + .5) / chart.buckets.length * 100))}%` }}>
        <div className="activity-chart-tooltip-head"><strong>{rangeLabel(selected)}</strong><span>{number(selected.value)} {unit}</span>
          <button type="button" aria-label="关闭活跃度明细" onClick={resetSelection}><X size={13} /></button></div>
        {selected.partial && <small>已记录</small>}
        <dl>{CATEGORIES.map(({ key, label }) => <div key={key}><dt className={`activity-color-${key}`}>{label}</dt>
          <dd>{number(selected.counts[key])}{metric === 'score' && <span> × {ACTIVITY_WEIGHTS[key]}</span>}</dd></div>)}</dl>
      </div>}
    </div>
    <div className="activity-chart-dates" aria-hidden="true"><span>{dateLabel(chart.buckets[0].start)}</span><span>{dateLabel(chart.buckets.at(-1).end)}</span></div>
    <dl className="activity-chart-legend" aria-label={metric === 'score' ? '各类活动贡献分数' : '各类活动完成数量'}>
      {CATEGORIES.map(({ key, label }) => <div key={key} title={`${label}：${number(chart.totals[key])} 项，每项 ${ACTIVITY_WEIGHTS[key]} 分`}>
        <dt className={`activity-color-${key}`}>{label}</dt><dd>{number(contribution(chart.totals, key))}</dd>
      </div>)}
    </dl>
  </article>;
}
