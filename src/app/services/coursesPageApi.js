const EMPTY_COURSE_STATE = {
  saved: false,
  inPath: false,
  done: false,
  note: "",
  selectedSourceId: "",
  pathAddedAt: "",
  updatedAt: ""
};

export function createCoursesPageApi(deps = {}, userStateApi = {}) {
  const { getUserState, setUserPatch } = userStateApi;
  return {
    getCourses: () => deps.normalizeCourses?.(getUserState().courses || []) || [],
    getCourseStates: () => deps.normalizeCourseStates?.(getUserState().courseStates || []) || [],
    normalizeContentSources: deps.normalizeContentSources,
    formatPrompt: deps.formatCoursePrompt,
    formatSourceTitle: deps.formatCourseSourceTitle,
    getQueuedLabel: deps.getCourseQueuedLabel,
    getRemoveFromPathLabel: deps.getCourseRemoveFromPathLabel,
    getCourseState(courseId) {
      const states = this.getCourseStates();
      return states.find((item) => item.courseId === courseId) || { ...EMPTY_COURSE_STATE, courseId };
    },
    updateCourseState(courseId, patch = {}) {
      const current = this.getCourseState(courseId);
      const next = (deps.normalizeCourseStates?.([{
        ...current,
        ...patch,
        courseId,
        updatedAt: new Date().toISOString()
      }]) || [])[0];
      if (!next) return;
      const without = this.getCourseStates().filter((item) => item.courseId !== courseId);
      const courseStates = next.saved || next.inPath || next.done || next.note || next.selectedSourceId
        ? [...without, next]
        : without;
      setUserPatch({ courseStates });
    },
    getSelectedSource(course, courseState) {
      const sources = deps.normalizeContentSources?.(course.sources, {
        title: course.provider,
        provider: course.platform,
        url: course.url
      }) || [];
      return sources.find((source) => source.id === courseState.selectedSourceId)
        || sources.find((source) => source.embeddable)
        || sources[0]
        || null;
    }
  };
}
