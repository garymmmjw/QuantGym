const validClock = value => Number.isFinite(Date.parse(value)) ? value : '';

export function normalizeProblemNote(value) {
  // UTF-16 maxLength must never leave half of an emoji at the boundary.
  return String(value ?? '').slice(0, 20000).replace(/[\uD800-\uDBFF]$/, '');
}

export function nextProblemFieldTime(previous, at = Date.now()) {
  return new Date(Math.max(at, (Date.parse(previous) || 0) + 1)).toISOString();
}

/** Independent clocks prevent a timer checkpoint from undoing a bookmark/note. */
export function pickProblemField(left, right, field, clock) {
  const a = validClock(left[clock]), b = validClock(right[clock]);
  if (Boolean(a) !== Boolean(b)) return a ? left : right;
  const timeA = Date.parse(a || (field === 'favorite' ? left.lastFavoriteAt || left.updatedAt : left.updatedAt)) || 0;
  const timeB = Date.parse(b || (field === 'favorite' ? right.lastFavoriteAt || right.updatedAt : right.updatedAt)) || 0;
  if (timeA !== timeB) return timeA > timeB ? left : right;
  if (field === 'favorite') return left.favorite === false ? left : right;
  return String(left[field] ?? '') > String(right[field] ?? '') ? left : right;
}

export function mergeProblemPersonalFields(left = {}, right = {}) {
  const saved = pickProblemField(left, right, 'favorite', 'favoriteUpdatedAt');
  const result = { favorite: Boolean(saved.favorite), lastFavoriteAt: saved.lastFavoriteAt || '' };
  if (saved.favoriteUpdatedAt) result.favoriteUpdatedAt = saved.favoriteUpdatedAt;
  const hasNote = value => Object.hasOwn(value, 'note') || Boolean(value.noteUpdatedAt);
  if (hasNote(left) || hasNote(right)) {
    const note = !hasNote(left) ? right : !hasNote(right) ? left : pickProblemField(left, right, 'note', 'noteUpdatedAt');
    result.note = normalizeProblemNote(note.note);
    if (note.noteUpdatedAt) result.noteUpdatedAt = note.noteUpdatedAt;
  }
  return result;
}
