export function problemNoteStorageKey(ownerId, problemId) {
  if (typeof ownerId !== 'string' || !ownerId || ownerId === 'guest' || !problemId) return '';
  // Historical unscoped notes are retained on disk, but never assigned to the
  // next person signing in on a shared device without proof of ownership.
  return `quantgym.problemNote.v2:${encodeURIComponent(ownerId)}:${encodeURIComponent(problemId)}`;
}
