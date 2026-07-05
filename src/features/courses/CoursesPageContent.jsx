import { useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { Tag } from "../../components/common/Tag.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";
import { timestampOrZero } from "../../lib/date.js";

// Decorative accent palette keyed by a stable hash of the course topic.
// These are display-only gradient accents (like category colors), not data.
const COURSE_ACCENTS = ["a", "b", "c", "d", "e", "f", "g"];

// Chinese display names for the (English) topic values in the catalog.
// Display-only mapping used by the filter chips and card category chips.
const TOPIC_LABELS_ZH = {
  "Quant Interview": "量化面试",
  Probability: "概率",
  "Statistics / ML": "统计 / 机器学习",
  "Quant Modeling": "量化建模",
  "Quant Finance": "量化金融",
  "Interview Problems": "面试题",
  "Market Making": "做市"
};

function topicLabel(topic) {
  return TOPIC_LABELS_ZH[String(topic || "").trim()] || topic;
}

function accentFor(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  }
  return COURSE_ACCENTS[hash % COURSE_ACCENTS.length];
}

function markFor(course) {
  const source = String(course?.provider || course?.title || "").trim();
  const cjk = source.match(/[一-龥]/);
  if (cjk) return cjk[0];
  const words = source.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "Q";
  if (words.length === 1) return words[0].slice(0, 3);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function CoursesPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const t = appServices.t;
  const api = pageApi.courses;
  const userState = useUserStateStore((state) => state.value || {});
  const courses = api.getCourses();
  void userState.courseStates;

  const [activeTopic, setActiveTopic] = useState("all");
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const toggleExpanded = (courseId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const topics = useMemo(() => {
    const seen = [];
    courses.forEach((course) => {
      const topic = String(course.topic || "").trim();
      if (topic && !seen.includes(topic)) seen.push(topic);
    });
    return seen;
  }, [courses]);

  const visibleCourses = useMemo(
    () => (activeTopic === "all" ? courses : courses.filter((course) => course.topic === activeTopic)),
    [courses, activeTopic]
  );

  const pathItems = useMemo(() => {
    const byId = new Map(courses.map((c) => [c.id, c]));
    return api.getCourseStates()
      .filter((item) => item.inPath && byId.has(item.courseId))
      .sort((a, b) => timestampOrZero(a.pathAddedAt || a.updatedAt) - timestampOrZero(b.pathAddedAt || b.updatedAt))
      .map((item) => ({ item, course: byId.get(item.courseId) }));
  }, [courses, api, userState.courseStates]);

  // Hero "continue learning" course: the first unfinished course in the
  // learning path, else the latest path entry, else the first course.
  const heroCourse = useMemo(() => {
    const entry = pathItems.find(({ item }) => !item.done) || pathItems[pathItems.length - 1] || null;
    return entry?.course || courses[0] || null;
  }, [pathItems, courses]);

  const doneCount = useMemo(() => {
    const ids = new Set(courses.map((c) => c.id));
    return api.getCourseStates().filter((item) => item.done && ids.has(item.courseId)).length;
  }, [courses, api, userState.courseStates]);

  const heroPercent = courses.length ? Math.round((doneCount / courses.length) * 100) : 0;
  const heroSources = heroCourse
    ? api.normalizeContentSources?.(heroCourse.sources, { title: heroCourse.provider, provider: heroCourse.platform, url: heroCourse.url }) || []
    : [];

  // First unfinished step is the "current" node in the path stepper.
  const currentPathIndex = useMemo(() => pathItems.findIndex(({ item }) => !item.done), [pathItems]);

  useScopedRefreshIcons(pageApi.refreshIcons, ".courses-section", [pathItems, userState.courseStates, activeTopic, expandedIds]);

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

  const handleHeroContinue = () => {
    if (!heroCourse) return;
    if (activeTopic !== "all" && heroCourse.topic !== activeTopic) setActiveTopic("all");
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(heroCourse.id);
      return next;
    });
    window.setTimeout(() => {
      document
        .querySelector(`.qg-courses-page .course-card[data-course-id="${heroCourse.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 90);
  };

  return (
    <section className="courses-section qg-support-page qg-courses-page">
      <div className="section-heading courses-header">
        <div className="courses-header-copy">
          <span className="courses-kicker">RESOURCES · {t("courses")}</span>
          <h2>{t("courses")} <span className="courses-title-accent">Courses</span></h2>
          <small id="coursesSummary">{t("coursesSummary")}</small>
        </div>
      </div>

      {heroCourse ? (
        <div className="courses-hero">
          <div className="courses-hero-main">
            <span className="courses-hero-pill">继续学习 · Continue</span>
            <h2 className="courses-hero-title">{heroCourse.title}</h2>
            <p className="courses-hero-sub">{api.formatPrompt?.(heroCourse) || `${heroCourse.provider} · ${heroCourse.level}`}</p>
            <div className="courses-hero-progress">
              <div className="courses-hero-track"><i style={{ width: `${Math.max(heroPercent, 2)}%` }} /></div>
              <span className="courses-hero-pct">{heroPercent}%</span>
            </div>
            <button type="button" className="courses-hero-cta" onClick={handleHeroContinue}>
              <i data-lucide="play" /> 继续观看
            </button>
          </div>
          <div className="courses-hero-cover" aria-hidden="true">
            <span className="courses-hero-cover-cat">{heroCourse.topic}</span>
            <div>
              <div className="courses-hero-cover-mark">{markFor(heroCourse)}</div>
              <div className="courses-hero-cover-meta">{heroSources.length} 个来源 · {heroCourse.level}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="courses-filter" role="tablist" aria-label={t("courses")}>
        <button
          type="button"
          className={`courses-filter-chip${activeTopic === "all" ? " is-active" : ""}`}
          aria-pressed={activeTopic === "all"}
          onClick={() => setActiveTopic("all")}
        >
          全部
        </button>
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            className={`courses-filter-chip${activeTopic === topic ? " is-active" : ""}`}
            aria-pressed={activeTopic === topic}
            onClick={() => setActiveTopic(topic)}
          >
            {topicLabel(topic)}
          </button>
        ))}
      </div>

      <div id="courseList" className="course-list">
        {visibleCourses.map((course) => {
          const state = api.getCourseState(course.id);
          const selected = api.getSelectedSource(course, state);
          const sources = api.normalizeContentSources?.(course.sources, { title: course.provider, provider: course.platform, url: course.url }) || [];
          const statusLabel = state.done ? t("courseDone") : state.inPath ? t("inLearningPath") : course.level;
          const isExpanded = expandedIds.has(course.id);
          return (
            <article
              key={course.id}
              className={`course-card content-card problem-card${state.done ? " is-course-done" : ""}${isExpanded ? " is-expanded" : ""}`}
              data-course-id={course.id}
              data-course-accent={accentFor(course.topic)}
            >
              <div className="course-card-thumb">
                <span className="course-card-cat">{course.platform}</span>
                <span className="course-card-mark">{markFor(course)}</span>
                <button
                  type="button"
                  className="course-card-play"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "收起课程详情" : "展开课程详情"}
                  onClick={() => toggleExpanded(course.id)}
                >
                  <i data-lucide="play" />
                </button>
              </div>
              <h3>{course.title}</h3>
              <div className="course-card-subtitle">{course.provider}</div>
              <div className="problem-meta">
                <Tag label={topicLabel(course.topic)} variant="topic" />
                <span className="course-card-count">{sources.length} 个来源</span>
              </div>
              <div className="course-card-progress" aria-hidden="true">
                <i style={{ width: state.done ? "100%" : "2%" }} />
              </div>
              <span className="course-card-progress-label">{state.done ? t("courseDone") : state.inPath ? t("inLearningPath") : "未开始"}</span>
              <div className="course-card-status">
                <span className={`course-card-status-dot${state.done ? " is-done" : state.inPath ? " is-active" : ""}`} />
                {statusLabel}
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

      <aside className="learning-path-panel courses-path-panel" aria-labelledby="learningPathTitle">
        <div className="courses-path-head">
          <h3 id="learningPathTitle">{t("learningPathTitle")}</h3>
          <p id="learningPathHint">{t("learningPathHint")}</p>
        </div>
        <div id="coursePathList" className={`course-path-list${pathItems.length ? " is-timeline" : ""}`}>
          {!pathItems.length ? <EmptyState title={t("learningPathEmpty")} /> : pathItems.map(({ item, course }, index) => {
            const isCurrent = index === currentPathIndex;
            const isLocked = !item.done && !isCurrent;
            return (
              <div
                key={course.id}
                className={`course-path-item${item.done ? " is-done" : ""}${isCurrent ? " is-current" : ""}${isLocked ? " is-locked" : ""}`}
              >
                <div className="course-path-step">
                  <span className="course-path-node" aria-hidden="true">
                    {item.done ? <i data-lucide="check" /> : isLocked ? <i data-lucide="lock" /> : null}
                  </span>
                  <div className="course-path-copy">
                    <strong>{course.title}</strong>
                    <small>{course.topic} - {item.done ? t("courseDone") : api.getQueuedLabel?.()}</small>
                  </div>
                  <span className="course-path-actions">
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
                  </span>
                </div>
                {index < pathItems.length - 1 ? <span className="course-path-line" aria-hidden="true" /> : null}
              </div>
            );
          })}
        </div>
      </aside>
    </section>
  );
}
