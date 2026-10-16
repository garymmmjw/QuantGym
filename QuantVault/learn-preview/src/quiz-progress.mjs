// Only submitted quiz state is restored; an old XP flag alone is not evidence
// of the student's exact answer. The authored quiz guards against stale state
// if captured content changes while retaining the same lesson/slide identity.
export function createQuizProgress(storage) {
  const key = (lessonId, slide) => `sv-quiz-state-${lessonId}-${slide.n}`;
  const stateFor = (slide, value) => {
    if (!value || value.answered !== true || typeof value.correct !== 'boolean') return null;
    const type = slide.quiz?.type || 'mc';
    const state = { answered: true, correct: value.correct, selected: null };
    if (type === 'numeric') {
      if (typeof value.userAnswer !== 'string' || value.userAnswer.length > 1000) return null;
      state.userAnswer = value.userAnswer;
    } else if (['mc', 'tf', 'codepick'].includes(type)) {
      const max = type === 'tf' ? 2 : type === 'codepick' ? String(slide.quiz.code || '').split('\n').length + 1 : slide.quiz.choices?.length || 0;
      if (!Number.isInteger(value.selected) || value.selected < 0 || value.selected >= max) return null;
      state.selected = value.selected;
    } else if (type === 'order') {
      if (!Array.isArray(value.placed) || value.placed.length !== slide.quiz.items?.length || value.placed.some(v => !Number.isInteger(v) || v < 0 || v >= slide.quiz.items.length)) return null;
      state.placed = [...value.placed];
    } else if (type === 'match' || type === 'sort') {
      const field = type === 'match' ? 'map' : 'where', count = type === 'match' ? slide.quiz.pairs?.length : slide.quiz.items?.length;
      const max = type === 'match' ? count : slide.quiz.buckets?.length;
      if (!value[field] || Object.keys(value[field]).length !== count) return null;
      state[field] = {};
      for (let i = 0; i < count; i++) {
        const answer = value[field][i];
        if (!Number.isInteger(answer) || answer < 0 || answer >= max) return null;
        state[field][i] = answer;
      }
    } else return null;
    return state;
  };
  return {
    save(lessonId, slide, value) {
      const state = stateFor(slide, value);
      if (lessonId && slide?.quiz && state) storage.setItem(key(lessonId, slide), JSON.stringify({ version: 1, quiz: JSON.stringify(slide.quiz), state }));
    },
    restore(lessonId, slides) {
      const restored = {};
      for (const slide of slides) {
        if (!slide.quiz) continue;
        try {
          const entry = JSON.parse(storage.getItem(key(lessonId, slide)));
          if (entry?.version !== 1 || entry.quiz !== JSON.stringify(slide.quiz)) continue;
          const state = stateFor(slide, entry.state);
          if (state) restored[slide.n] = state;
        } catch { /* An invalid local entry must not stop the course renderer. */ }
      }
      return restored;
    },
    accuracyBonus(lessonId, slides) {
      return slides.filter(slide => (slide.quiz || slide.code) && storage.getItem(`sv-xp-${lessonId}-${slide.n}`)).length * 5;
    },
  };
}
