import { useMemo } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { Tag } from "../../components/common/Tag.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

export function CoursesPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const t = appServices.t;
  const api = pageApi.courses;
  const userState = useUserStateStore((state) => state.value || {});
  const courses = api.getCourses();
  void userState.courseStates;

  const pathItems = useMemo(() => {
    const byId = new Map(courses.map((c) => [c.id, c]));
    return api.getCourseStates()
      .filter((item) => item.inPath && byId.has(item.courseId))
      .sort((a, b) => new Date(a.pathAddedAt || a.updatedAt || 0) - new Date(b.pathAddedAt || b.updatedAt || 0))
      .map((item) => ({ item, course: byId.get(item.courseId) }));
  }, [courses, api]);

  useScopedRefreshIcons(pageApi.refreshIcons, ".courses-section", [pathItems, userState.courseStates]);

  const handleAction = (courseId, action, extra = {}) => {
    const state = api.getCourseState(courseId);
    if (action === "source") api.updateCourseState(courseId, { selectedSourceId: extra.sourceId || "" });
    if (action === "save") api.updateCourseState(courseId, { saved: !state.saved });
    if (action === "path") {
      const inPath = !state.inPath;
      api.updateCourseState(courseId, { inPath, pathAddedAt: inPath ? (state.pathAddedAt || new Date().toISOString()) : "" });
    }
    if (action === "done") {
      api.updateCourseState(courseId, {
        done: !state.done,
        inPath: true,
        pathAddedAt: state.pathAddedAt || new Date().toISOString()
      });
    }
  };

  return (
    <section className="courses-section">
      <div className="section-heading">
        <div>
          <h2>{t("courses")}</h2>
          <small id="coursesSummary">{t("coursesSummary")}</small>
        </div>
      </div>
      <aside className="learning-path-panel" aria-labelledby="learningPathTitle">
        <div>
          <h3 id="learningPathTitle">{t("learningPathTitle")}</h3>
          <p id="learningPathHint">{t("learningPathHint")}</p>
        </div>
        <div id="coursePathList" className="course-path-list">
          {!pathItems.length ? <EmptyState title={t("learningPathEmpty")} /> : pathItems.map(({ item, course }, index) => (
            <div key={course.id} className={`course-path-item${item.done ? " is-done" : ""}`}>
              <span className="course-path-index">{index + 1}</span>
              <div>
                <strong>{course.title}</strong>
                <small>{course.topic} - {item.done ? t("courseDone") : api.getQueuedLabel?.()}</small>
              </div>
              <button
                type="button"
                className="icon-button ghost"
                data-course-action="done"
                data-course-id={course.id}
                title={item.done ? t("courseDone") : t("markCourseDone")}
                aria-label={item.done ? t("courseDone") : t("markCourseDone")}
                onClick={() => handleAction(course.id, "done")}
              >
                <i data-lucide={item.done ? "check-circle-2" : "circle"} />
              </button>
              <button
                type="button"
                className="icon-button ghost"
                data-course-action="path"
                data-course-id={course.id}
                title={api.getRemoveFromPathLabel?.()}
                aria-label={api.getRemoveFromPathLabel?.()}
                onClick={() => handleAction(course.id, "path")}
              >
                <i data-lucide="x" />
              </button>
            </div>
          ))}
        </div>
      </aside>
      <div id="courseList" className="course-list">
        {courses.map((course) => {
          const state = api.getCourseState(course.id);
          const selected = api.getSelectedSource(course, state);
          const sources = api.normalizeContentSources?.(course.sources, { title: course.provider, provider: course.platform, url: course.url }) || [];
          return (
            <article key={course.id} className="course-card content-card problem-card" data-course-id={course.id}>
              <h3>{course.title}</h3>
              <div className="problem-meta">
                <Tag label={course.platform} variant="topic" />
                <Tag label={course.topic} variant="skill" />
                <Tag label={course.level} variant="score" />
              </div>
              <div className="problem-prompt">{api.formatPrompt?.(course)}</div>
              <div className="course-source-bar">
                {sources.map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    data-course-action="source"
                    data-course-id={course.id}
                    data-source-id={source.id}
                    className={source.id === selected?.id ? "active" : ""}
                    onClick={() => handleAction(course.id, "source", { sourceId: source.id })}
                  >
                    {source.provider}
                  </button>
                ))}
              </div>
              <div className="course-player">
                {selected?.embedUrl ? (
                  <iframe
                    src={selected.embedUrl}
                    title={api.formatSourceTitle?.(course, selected)}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="course-player-fallback"><strong>{t("previewUnavailable")}</strong></div>
                )}
              </div>
              <div className="course-actions">
                <button
                  type="button"
                  className={`secondary-button compact${state.saved ? " is-active" : ""}`}
                  data-course-action="save"
                  data-course-id={course.id}
                  onClick={() => handleAction(course.id, "save")}
                >
                  <i data-lucide={state.saved ? "bookmark-check" : "bookmark"} />{state.saved ? t("savedCourse") : t("saveCourse")}
                </button>
                <button
                  type="button"
                  className={`secondary-button compact${state.inPath ? " is-active" : ""}`}
                  data-course-action="path"
                  data-course-id={course.id}
                  onClick={() => handleAction(course.id, "path")}
                >
                  <i data-lucide={state.inPath ? "route" : "plus"} />{state.inPath ? t("inLearningPath") : t("addToPath")}
                </button>
                <button
                  type="button"
                  className={`secondary-button compact${state.done ? " is-active" : ""}`}
                  data-course-action="done"
                  data-course-id={course.id}
                  onClick={() => handleAction(course.id, "done")}
                >
                  <i data-lucide={state.done ? "check-circle-2" : "circle"} />{state.done ? t("courseDone") : t("markCourseDone")}
                </button>
              </div>
              <label className="course-note-field">
                <span>{t("courseNote")}</span>
                <textarea
                  data-course-note={course.id}
                  rows={3}
                  placeholder={t("courseNotePlaceholder")}
                  value={state.note || ""}
                  onChange={(event) => api.updateCourseState(course.id, { note: event.target.value })}
                />
              </label>
              <div className="problem-card-footer">
                <a className="content-card-link" href={pageApi.safeExternalUrl?.(selected?.url || course.url) || "#"} target="_blank" rel="noreferrer">{t("openOriginal")}</a>
                <i data-lucide="external-link" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
