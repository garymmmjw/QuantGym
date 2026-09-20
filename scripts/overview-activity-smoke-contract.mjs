// This function is self-contained so browser smoke checks can pass it to evaluate.
export function readOverviewActivityChart() {
  const overview = document.querySelector('.overview-route-page');
  const chart = overview?.querySelector('#overviewActivityBars');
  const controls = overview?.querySelector('[role="group"][aria-label="活跃度指标"]');
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  return {
    month: chart?.dataset.month || '',
    mode: chart?.dataset.mode || '',
    today,
    monthControl: overview?.querySelector('select[aria-label="统计月份"]')?.value || '',
    modeControl: overview?.querySelector('select[aria-label="统计粒度"]')?.value || '',
    metrics: [...(controls?.querySelectorAll('button') || [])].map(button => ({ label: button.textContent.trim(), pressed: button.getAttribute('aria-pressed') })),
    buckets: [...(chart?.querySelectorAll('.overview-activity-day') || [])].map(button => ({
      start: button.dataset.start || '', end: button.dataset.end || '', disabled: button.disabled === true,
    })),
  };
}

export function overviewActivityChartFailures(chart) {
  if (!chart || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(chart.month) || Number(chart.month.slice(0, 4)) < 1000) return ['Missing or invalid chart month'];
  if (!['day', 'week'].includes(chart.mode)) return ['Missing or invalid chart granularity'];
  const failures = [];
  const first = new Date(`${chart.month}-01T12:00:00Z`);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  const daysInMonth = last.getUTCDate();
  const date = day => `${chart.month}-${String(day).padStart(2, '0')}`;
  const expected = [];
  for (let day = 1; day <= daysInMonth;) {
    const weekday = new Date(`${date(day)}T12:00:00Z`).getUTCDay();
    const end = chart.mode === 'day' ? day : Math.min(daysInMonth, day + (7 - weekday) % 7);
    expected.push({ start: date(day), end: date(end) });
    day = end + 1;
  }
  const buckets = Array.isArray(chart.buckets) ? chart.buckets : [];
  if (buckets.length !== expected.length) failures.push(`Expected ${expected.length} ${chart.mode} buckets, found ${buckets.length}`);
  expected.forEach((range, index) => {
    const bucket = buckets[index];
    if (!bucket || bucket.start !== range.start || bucket.end !== range.end) failures.push(`Bucket ${index + 1} must cover ${range.start} through ${range.end}`);
    if (bucket && bucket.start > chart.today && !bucket.disabled) failures.push(`Future bucket ${bucket.start} must be disabled`);
  });
  if (chart.monthControl !== chart.month || chart.modeControl !== chart.mode) failures.push('Chart controls and rendered buckets disagree');
  const metrics = Array.isArray(chart.metrics) ? chart.metrics : [];
  if (metrics.length !== 2 || metrics[0]?.label !== '活跃分' || metrics[1]?.label !== '完成量'
    || metrics.some(item => !['true', 'false'].includes(item.pressed)) || metrics.filter(item => item.pressed === 'true').length !== 1) failures.push('Activity metric controls must expose one selected score/count mode');
  return failures;
}
