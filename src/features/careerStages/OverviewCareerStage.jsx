import { formatStagePeriod } from './stagePractice.js';
import './overviewCareerStage.css';

const METRICS = [
  { key: 'applications', label: 'Applications' },
  { key: 'leetcode', label: 'LeetCode' },
  { key: 'technical', label: 'Tech' },
  { key: 'behavioral', label: 'Behavioral' },
  { key: 'mentalMathAverage', label: 'Mental Math', detail: '平均分', average: true },
];
const countFormat = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
const averageFormat = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function MetricValue({ value, average = false }) {
  const known = typeof value === 'number' && Number.isFinite(value) && value >= 0;
  if (!known) return <span className="overview-stage-summary-unknown" aria-label={average ? '暂无完整训练' : '暂无可用统计'} title={average ? '暂无完整训练' : '暂无可用统计'}>—</span>;
  return <span className="overview-stage-summary-value">{(average ? averageFormat : countFormat).format(value)}{average && <span className="overview-stage-summary-unit">分</span>}</span>;
}

export function OverviewCareerStage({ rows = [], note = '' }) {
  const displayRows = [...rows].reverse();
  return <section className="overview-stage-summary" aria-label="求职准备阶段统计">
    {displayRows.length ? <table className="overview-stage-summary-table" role="table">
      <caption className="overview-stage-summary-sr-only">各阶段的投递与训练统计，按新到旧排列</caption>
      <colgroup><col className="overview-stage-summary-stage-column" /><col className="overview-stage-summary-period-column" />{METRICS.map(metric => <col key={metric.key} />)}</colgroup>
      <thead role="rowgroup"><tr role="row">
        <th scope="col" role="columnheader">Stage</th><th scope="col" role="columnheader">时间范围</th>
        {METRICS.map(metric => <th scope="col" role="columnheader" key={metric.key}>{metric.label}{metric.detail && <span className="overview-stage-summary-heading-detail">{metric.detail}</span>}</th>)}
      </tr></thead>
      <tbody role="rowgroup">{displayRows.map(row => <tr key={row.id} role="row" className={row.isCurrent ? 'is-current' : undefined} aria-current={row.isCurrent ? 'step' : undefined}>
        <th scope="row" role="rowheader" className="overview-stage-summary-identity"><span className="overview-stage-summary-name">{row.label}</span>{row.isCurrent && <span className="overview-stage-summary-current">当前阶段</span>}</th>
        <td role="cell" className="overview-stage-summary-period" title={row.periodStart && row.periodEnd && row.periodStart <= row.periodEnd ? `统计 ${row.periodStart} 之后至 ${row.periodEnd} 当日的记录，不含起始日、包含结束日。` : '请在投递 Tracker 中补充或校正阶段日期。'}>{formatStagePeriod(row)}</td>
        {METRICS.map(metric => <td role="cell" key={metric.key} className={`overview-stage-summary-metric${metric.average ? ' overview-stage-summary-average' : ''}`}>
          <span className="overview-stage-summary-mobile-label" aria-hidden="true">{metric.label}{metric.detail && ` ${metric.detail}`}</span>
          <MetricValue value={row[metric.key]} average={metric.average} />
        </td>)}
      </tr>)}</tbody>
    </table> : <p className="overview-stage-summary-empty">暂无 Stage 记录。在投递 Tracker 中添加阶段后，这里会显示对应的投递与训练统计。</p>}
    {note && <p className="overview-stage-count-note">{note}</p>}
  </section>;
}
