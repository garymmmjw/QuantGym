export function problemNoteStorageKey(ownerId, problemId) {
  if (typeof ownerId !== 'string' || !ownerId || ownerId === 'guest' || !problemId) return '';
  // Historical unscoped notes are retained on disk, but never assigned to the
  // next person signing in on a shared device without proof of ownership.
  return `quantgym.problemNote.v2:${encodeURIComponent(ownerId)}:${encodeURIComponent(problemId)}`;
}

export function readOwnedProblemNotes(storage, ownerId) {
  const prefix = problemNoteStorageKey(ownerId, '_').slice(0, -1);
  if (!prefix) return [];
  const notes = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    try {
      const problemId = decodeURIComponent(key.slice(prefix.length));
      const text = storage.getItem(key);
      if (problemId && text) notes.push({ problemId, text });
    } catch { /* Leave damaged/unknown keys untouched. */ }
  }
  return notes;
}
