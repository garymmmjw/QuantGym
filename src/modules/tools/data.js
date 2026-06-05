export function normalizeMentalMathRecords(records = [], deps = {}) {
  const makeId = deps.makeId || (() => `${Date.now()}-${Math.random()}`);
  return (Array.isArray(records) ? records : [])
    .map((record) => ({
      id: String(record?.id || makeId()),
      mode: String(record?.mode || "numberLogic"),
      label: String(record?.label || "").trim(),
      score: Number(record?.score || 0),
      correct: Math.max(0, Number(record?.correct || 0)),
      incorrect: Math.max(0, Number(record?.incorrect || 0)),
      skipped: Math.max(0, Number(record?.skipped || 0)),
      total: Math.max(0, Number(record?.total || 0)),
      accuracy: Math.max(0, Math.min(100, Number(record?.accuracy || 0))),
      durationSeconds: Math.max(0, Number(record?.durationSeconds || 0)),
      createdAt: record?.createdAt || new Date().toISOString()
    }))
    .filter((record) => record.total > 0 || record.score !== 0)
    .slice(-80);
}

export function normalizeGameRecords(records = [], deps = {}) {
  const makeId = deps.makeId || (() => `${Date.now()}-${Math.random()}`);
  return (Array.isArray(records) ? records : [])
    .map((record) => ({
      id: String(record?.id || makeId()),
      game: String(record?.game || "market"),
      score: Number(record?.score || 0),
      detail: String(record?.detail || "").trim().slice(0, 280),
      createdAt: record?.createdAt || new Date().toISOString()
    }))
    .filter((record) => record.game)
    .slice(-80);
}
