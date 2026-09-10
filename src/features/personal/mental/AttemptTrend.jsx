import React, { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { exportAttemptHistoryCsv, formatAttemptSettings, getAttemptHistory } from './attemptHistory.js';
import { summarizeTrial } from './mentalEngine.js';
import { trainerKind, difficultyLabel } from './trainingSettings.js';

const seconds = value => value == null ? '—' : `${(value / 1000).toFixed(2)}s`;
const dateLabel = (date, language) => new Date(date).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const AttemptTrend = memo(function AttemptTrend({ trials, currentSettings, language, selectedId, disabled, onSelect, dayKey }) {
  const en = language === 'en';
  const chartId = useId();
  const [settingsFilter, setSettingsFilter] = useState('current');
  const [timeRange, setTimeRange] = useState('all');
  const [xAxis, setXAxis] = useState('attempt');
  const [inspectedId, setInspectedId] = useState(null);
  const markerRefs = useRef(new Map());
  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(840);
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return undefined;
    const measure = () => setChartWidth(Math.max(280, Math.min(840, element.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const history = useMemo(() => getAttemptHistory(trials, { currentSettings, settingsFilter, timeRange, xAxis, language }),
    [trials, currentSettings, settingsFilter, timeRange, xAxis, language, dayKey]);
  const { points, xDomain, yMax } = history;
  const inspected = points.find(point => point.id === inspectedId) || points.find(point => point.id === selectedId) || points.at(-1);
  const width = chartWidth, height = width < 600 ? 250 : 300, left = 48, right = 25, top = 24, bottom = 55;
  const roughStep = yMax / 5;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, roughStep)));
  const step = [1, 2, 5, 10].map(value => value * magnitude).find(value => value >= roughStep);
  const ceiling = Math.max(step, Math.ceil(yMax / step) * step);
  const x = value => left + (xDomain[0] === xDomain[1] ? .5 : (value - xDomain[0]) / (xDomain[1] - xDomain[0])) * (width - left - right);
  const y = value => top + (1 - value / ceiling) * (height - top - bottom);
  const yTicks = Array.from({ length: ceiling / step + 1 }, (_, index) => index * step);
  const tickPoints = [...new Set([0, .25, .5, .75, 1].map(ratio => Math.round((points.length - 1) * ratio)))].map(index => points[index]).filter(Boolean);
  // Date plots may contain several trials only seconds apart; keep axis labels from colliding.
  const xTicks = [];
  for (const point of tickPoints) {
    const previous = xTicks.at(-1);
    const last = points.at(-1);
    if (!previous || (x(point.x) - x(previous.x) >= 70 && x(last.x) - x(point.x) >= 70)) xTicks.push(point);
  }
  const lastPoint = points.at(-1);
  if (lastPoint && xTicks.at(-1)?.id !== lastPoint.id && x(lastPoint.x) - x(xTicks.at(-1).x) >= 1) xTicks.push(lastPoint);
  const pointLabel = point => `Attempt #${point.ordinal} · ${dateLabel(point.startedAt, language)} · ${en ? 'Score' : '正确数'} ${point.score} · ${point.settingsLabel}`;

  function moveMarker(event, index) {
    const movement = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];
    if (movement != null || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, index + movement));
      markerRefs.current.get(points[nextIndex].id)?.focus();
    } else if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onSelect(points[index].id);
    }
  }

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([exportAttemptHistoryCsv(points, { language })], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mental-${trainerKind(currentSettings)}-attempts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="pm-analysis" aria-label={en ? 'Attempt progress' : 'Attempt 成绩趋势'}>
    <div className="pm-section-heading"><div><h3>{en ? 'Attempt progress' : 'Attempt 成绩趋势'}</h3><p>{en ? 'One completed trial, one score. Your score is the number of correct answers.' : '每次完整试次一个点，得分为该次答对题数。'}</p></div><button type="button" className="pm-text-button" onClick={exportCsv} disabled={!points.length}>{en ? 'Export CSV' : '导出曲线数据'}</button></div>
    <div className="pm-trend-filters">
      <label>{en ? 'Settings' : '训练设置'}<select value={settingsFilter} onChange={event => setSettingsFilter(event.target.value)}>
        <option value="current">{en ? 'Current settings' : '当前设置'}</option><option value="all">{en ? 'All settings' : '所有设置'}</option>
        {history.settingsOptions.map((option, index) => <option key={option.key} value={option.key}>{en ? 'Settings' : '设置'} {index + 1} · {option.label}</option>)}
      </select></label>
      <label>{en ? 'Horizontal axis' : '横轴'}<select value={xAxis} onChange={event => setXAxis(event.target.value)}><option value="attempt">{en ? 'By attempts' : '按 Attempt 次序'}</option><option value="date">{en ? 'By date' : '按日期'}</option></select></label>
      <label>{en ? 'Time range' : '时间范围'}<select value={timeRange} onChange={event => setTimeRange(event.target.value)}><option value="all">{en ? 'All time attempts' : '全部时间'}</option><option value="last30days">{en ? 'Last 30 days' : '最近 30 天'}</option><option value="last90days">{en ? 'Last 90 days' : '最近 90 天'}</option></select></label>
    </div>
    <p className="pm-note pm-filter-description">{settingsFilter === 'all' ? (en ? 'Different durations, difficulty levels and number ranges affect scores. Use matching settings to compare your progress.' : '不同时长、难度和数字范围会影响得分；比较进步时建议选择相同设置。') : formatAttemptSettings(settingsFilter === 'current' ? currentSettings : history.settingsOptions.find(option => option.key === settingsFilter)?.settings, language)}</p>
    <figure className="pm-attempt-chart" ref={chartRef}>
      <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-labelledby={`${chartId}-title ${chartId}-description`}>
        <title id={`${chartId}-title`}>{en ? 'Scores across attempts' : '历次 Attempt 得分曲线'}</title>
        <desc id={`${chartId}-description`}>{en ? 'Use arrow keys to inspect points and Enter to open question details. Early endings are excluded. The full trial history is also available below.' : '使用方向键查看各点，Enter 打开逐题明细。提前结束不计入曲线，下方保留全部试次历史。'}</desc>
        {yTicks.map(tick => <g key={tick} aria-hidden="true"><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="pm-chart-grid" /><text x={left - 10} y={y(tick) + 4} textAnchor="end" className="pm-chart-label">{tick}</text></g>)}
        <text x={left} y="12" className="pm-chart-label" aria-hidden="true">{en ? 'Score' : '得分'}</text>
        {xTicks.map(point => <text key={point.id} x={x(point.x)} y={height - bottom + 23} textAnchor="middle" className="pm-chart-label" aria-hidden="true">{xAxis === 'attempt' ? point.ordinal : new Date(point.timestamp).toLocaleDateString(en ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', ...(xDomain[1] - xDomain[0] > 31536000000 ? { year: '2-digit' } : {}) })}</text>)}
        <text x={width / 2} y={height - 5} textAnchor="middle" className="pm-chart-label" aria-hidden="true">{xAxis === 'attempt' ? 'Attempt Number' : en ? 'Date' : '日期'}</text>
        <polyline points={points.map(point => `${x(point.x)},${y(point.score)}`).join(' ')} className="pm-trend-line" aria-hidden="true" />
        {points.map((point, index) => <g key={point.id} ref={element => { if (element) markerRefs.current.set(point.id, element); else markerRefs.current.delete(point.id); }}
          role="button" tabIndex={inspected?.id === point.id ? 0 : -1} aria-label={pointLabel(point)} aria-disabled={disabled || undefined}
          onFocus={() => setInspectedId(point.id)} onMouseEnter={() => setInspectedId(point.id)} onKeyDown={event => moveMarker(event, index)}
          onClick={() => { setInspectedId(point.id); if (!disabled) onSelect(point.id); }} className="pm-trend-point">
          <title>{pointLabel(point)}</title>
          <circle cx={x(point.x)} cy={y(point.score)} r="12" fill="transparent" />
          <circle cx={x(point.x)} cy={y(point.score)} r={inspected?.id === point.id ? 5.5 : 3.5} className="pm-trend-dot" />
          {selectedId === point.id && <circle cx={x(point.x)} cy={y(point.score)} r="9" className="pm-trend-ring" />}
        </g>)}
      </svg>
      {!points.length && <p className="pm-history-empty">{history.emptyReason === 'no-history' ? en ? 'Complete a full trial to start your progress curve.' : '完成一次完整试次后，成绩会出现在这里。' : en ? 'No completed attempts match these filters. Try all settings or a wider time range.' : '当前筛选下没有完整试次，可切换所有设置或扩大时间范围。'}</p>}
      {inspected && <figcaption className="pm-trend-caption"><strong>Attempt #{inspected.ordinal} · {inspected.score} {en ? 'correct' : '题'}</strong><span>{dateLabel(inspected.startedAt, language)} · {en ? 'Average' : '正确题均时'} {seconds(inspected.meanMs)}</span><span>{inspected.settingsLabel}</span><button type="button" className="pm-text-button" disabled={disabled} onClick={() => onSelect(inspected.id)}>{en ? 'View question details' : '查看该次逐题明细'} ↗</button></figcaption>}
    </figure>
    <p className="pm-note">{en ? `${points.length} completed attempts shown. Attempt numbers keep their original order after filtering. Early endings stay in history below.` : `显示 ${points.length} 次完整试次。筛选后保留原始 Attempt 序号；提前结束的记录仍在下方历史中。`}{disabled && (en ? ' Finish the running trial to open past question details.' : ' 当前试次结束后可打开历史逐题明细。')}</p>
  </section>;
});

export const TrialHistory = memo(function TrialHistory({ trials, selectedId, disabled, language, onSelect }) {
  const en = language === 'en';
  const [visibleCount, setVisibleCount] = useState(50);
  const rows = useMemo(() => trials.map(trial => ({ trial, summary: summarizeTrial(trial) })), [trials]);
  return <section className="pm-history"><div className="pm-section-heading"><div><h3>{en ? 'Trial history' : '试次历史'}</h3><p>{en ? 'All trials, including early endings. Chart filters do not hide these records.' : '保留所有试次及提前结束记录，不受曲线筛选影响。'}</p></div><span className="pm-history-count">{trials.length} {en ? 'trials' : '次'}</span></div>
    {trials.length ? <><div className="pm-table-scroll pm-history-scroll"><table className="pm-table"><thead><tr><th>{en ? 'Started' : '开始时间'}</th><th>{en ? 'Settings' : '设置'}</th><th>{en ? 'Correct' : '正确数'}</th><th>{en ? 'Average / correct' : '正确题均时'}</th><th>{en ? 'Status' : '状态'}</th><th><span className="pm-visually-hidden">{en ? 'View details' : '查看详情'}</span></th></tr></thead><tbody>{rows.slice(0, visibleCount).map(({ trial, summary }) => <tr key={trial.id} className={selectedId === trial.id ? 'pm-history-selected' : ''}><td>{dateLabel(trial.startedAt, language)}</td><td><details className="pm-history-settings"><summary>{trial.settings?.durationSeconds}s · {trainerKind(trial) === 'math' ? trial.settings?.operations?.map(op => ({ add: '+', subtract: '−', multiply: '×', divide: '÷' })[op]).join(' ') : difficultyLabel(trial.settings.difficulty, language)}</summary><p>{formatAttemptSettings(trial.settings, language)}</p></details></td><td><strong>{trial.correct}</strong></td><td>{seconds(summary.meanMs)}</td><td>{trial.status === 'completed' ? en ? 'Completed' : '完整完成' : en ? 'Ended early' : '提前结束'}</td><td><button type="button" className="pm-text-button" disabled={disabled} aria-label={`${en ? 'View trial' : '查看试次'} ${dateLabel(trial.startedAt, language)}`} onClick={() => onSelect(trial.id)}>{selectedId === trial.id ? en ? 'Selected' : '已选' : en ? 'View' : '查看'} ↗</button></td></tr>)}</tbody></table></div>{visibleCount < rows.length && <button type="button" className="pm-text-button" onClick={() => setVisibleCount(count => count + 50)}>{en ? 'Show more trials' : '查看更多试次'} ({Math.min(visibleCount, rows.length)} / {rows.length})</button>}</> : <div className="pm-history-empty">{en ? 'Your trial history starts here.' : '你的训练记录，会从这里开始。'}</div>}
  </section>;
});
