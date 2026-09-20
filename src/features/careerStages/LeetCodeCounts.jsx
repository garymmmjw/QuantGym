import './leetcodeCounts.css';

const number = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
const DEFINITIONS = {
  new: '新完成：全历史首次通过的不同题目。阶段统计按首次通过日期归属。',
  total: '总完成：包含新完成和有效重做；同题距上次计入的通过记录至少 3 小时可再计一次。',
};

export function LeetCodeCounts({ newCount, totalCount, newStatus = 'unavailable', totalStatus = 'unavailable', layout = 'stacked', scope = 'lifetime' }) {
  const metrics = [
    { key: 'new', label: '新完成', unit: '题', value: newCount, status: newStatus },
    { key: 'total', label: '总完成', unit: '次', value: totalCount, status: totalStatus },
  ];
  return <dl className={`leetcode-counts leetcode-counts-${layout}`}>
    {metrics.map(({ key, label, unit, value, status }) => {
      const known = ['ready', 'partial'].includes(status) && Number.isSafeInteger(value) && value >= 0;
      const partial = known && status === 'partial';
      const provisional = partial && key === 'total' && scope === 'stage';
      const minimum = partial && !provisional;
      const detail = !known ? '暂无法确认。' : provisional ? '已记录次数，补齐历史后可能重新归属。' : partial ? '当前仅能确认这些记录。' : '';
      return <div className={`leetcode-count leetcode-count-${key}`} key={key} title={`${DEFINITIONS[key]}${detail}`}>
        <dt>{label}</dt>
        <dd aria-label={`${label}：${known ? `${minimum ? '至少 ' : ''}${number.format(value)} ${unit}${provisional ? '，已记录次数，补齐历史后可能重新归属' : ''}` : '暂无法确认'}`}>
          <strong className={!known ? 'is-unknown' : undefined}>{minimum && <small className="leetcode-count-minimum" aria-hidden="true">≥</small>}{known ? number.format(value) : '—'}</strong>
          <span className="leetcode-count-unit">{unit}</span>
        </dd>
      </div>;
    })}
  </dl>;
}
