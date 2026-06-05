import { listen } from '../../ui/events.js';

const EMPTY_COURSE_STATE = {
  saved: false,
  inPath: false,
  done: false,
  note: "",
  selectedSourceId: "",
  pathAddedAt: "",
  updatedAt: ""
};

export function createCoursesModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const text = (key, params) => deps.t?.(key, params) || key;
  const escape = (value) => deps.escapeHtml?.(String(value ?? "")) ?? String(value ?? "");
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };
  const getCourses = () => deps.normalizeCourses?.(deps.getCourses?.() || []) || [];
  const getCourseStates = () => deps.normalizeCourseStates?.(deps.getCourseStates?.() || []) || [];

  const getCourseState = (courseId) => {
    const normalized = getCourseStates().find((item) => item.courseId === courseId);
    return normalized || { ...EMPTY_COURSE_STATE, courseId };
  };

  const updateCourseState = (courseId, patch = {}) => {
    const current = getCourseState(courseId);
    const next = (deps.normalizeCourseStates?.([{
      ...current,
      ...patch,
      courseId,
      updatedAt: new Date().toISOString()
    }]) || [])[0];
    if (!next) return;
    const without = getCourseStates().filter((item) => item.courseId !== courseId);
    if (next.saved || next.inPath || next.done || next.note || next.selectedSourceId) {
      deps.setCourseStates?.([...without, next]);
    } else {
      deps.setCourseStates?.(without);
    }
    deps.save?.();
  };

  const getSelectedSource = (course, courseState = getCourseState(course.id)) => {
    const sources = deps.normalizeContentSources?.(course.sources, {
      title: course.provider,
      provider: course.platform,
      url: course.url
    }) || [];
    return sources.find((source) => source.id === courseState.selectedSourceId)
      || sources.find((source) => source.embeddable)
      || sources[0]
      || null;
  };

  const addTag = (container, label, variant = "") => {
    if (deps.addTag) {
      deps.addTag(container, label, variant);
      return;
    }
    const tag = document.createElement("span");
    tag.className = variant ? `problem-tag ${variant}` : "problem-tag";
    tag.textContent = label;
    container.appendChild(tag);
  };

  const renderLearningPath = (courses = getCourses()) => {
    const els = getElements();
    if (!els.coursePathList) return;
    deps.setText?.("#learningPathTitle", text("learningPathTitle"));
    deps.setText?.("#learningPathHint", text("learningPathHint"));
    const courseById = new Map(courses.map((course) => [course.id, course]));
    const pathItems = getCourseStates()
      .filter((item) => item.inPath && courseById.has(item.courseId))
      .sort((a, b) => new Date(a.pathAddedAt || a.updatedAt || 0) - new Date(b.pathAddedAt || b.updatedAt || 0));

    els.coursePathList.innerHTML = "";
    if (!pathItems.length) {
      els.coursePathList.appendChild(deps.emptyBlock?.(text("learningPathEmpty")) || document.createTextNode(""));
      return;
    }

    pathItems.forEach((item, index) => {
      const course = courseById.get(item.courseId);
      const row = document.createElement("div");
      row.className = `course-path-item${item.done ? " is-done" : ""}`;
      const indexNode = document.createElement("span");
      indexNode.className = "course-path-index";
      indexNode.textContent = String(index + 1);
      const copy = document.createElement("div");
      copy.innerHTML = `<strong>${escape(course.title)}</strong><small>${escape(course.topic)} - ${escape(item.done ? text("courseDone") : deps.getQueuedLabel?.() || "Queued")}</small>`;
      const done = document.createElement("button");
      done.type = "button";
      done.className = "icon-button ghost";
      done.dataset.courseAction = "done";
      done.dataset.courseId = course.id;
      done.title = item.done ? text("courseDone") : text("markCourseDone");
      done.setAttribute("aria-label", done.title);
      done.innerHTML = `<i data-lucide="${item.done ? "check-circle-2" : "circle"}"></i>`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button ghost";
      remove.dataset.courseAction = "path";
      remove.dataset.courseId = course.id;
      remove.title = deps.getRemoveFromPathLabel?.() || "Remove from path";
      remove.setAttribute("aria-label", remove.title);
      remove.innerHTML = '<i data-lucide="x"></i>';
      row.append(indexNode, copy, done, remove);
      els.coursePathList.appendChild(row);
    });
  };

  const render = () => {
    const els = getElements();
    if (!els.courseList) return;
    const courses = getCourses();
    els.courseList.innerHTML = "";
    renderLearningPath(courses);

    courses.forEach((course) => {
      const courseState = getCourseState(course.id);
      const selectedSource = getSelectedSource(course, courseState);
      const card = document.createElement("article");
      card.className = "course-card content-card problem-card";
      card.dataset.courseId = course.id;

      const title = document.createElement("h3");
      title.textContent = course.title;

      const meta = document.createElement("div");
      meta.className = "problem-meta";
      addTag(meta, course.platform, "topic");
      addTag(meta, course.topic, "skill");
      addTag(meta, course.level, "score");

      const prompt = document.createElement("div");
      prompt.className = "problem-prompt";
      prompt.textContent = deps.formatPrompt?.(course) || `${course.provider} - ${course.summary}`;

      const sourceBar = document.createElement("div");
      sourceBar.className = "course-source-bar";
      course.sources.forEach((source) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.courseAction = "source";
        button.dataset.courseId = course.id;
        button.dataset.sourceId = source.id;
        button.className = source.id === selectedSource?.id ? "active" : "";
        button.textContent = source.provider;
        sourceBar.appendChild(button);
      });

      const player = document.createElement("div");
      player.className = "course-player";
      if (selectedSource?.embedUrl) {
        const iframe = document.createElement("iframe");
        iframe.src = selectedSource.embedUrl;
        iframe.title = deps.formatSourceTitle?.(course, selectedSource) || `${course.title} - ${selectedSource.provider}`;
        iframe.loading = "lazy";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        player.appendChild(iframe);
      } else {
        const fallback = document.createElement("div");
        fallback.className = "course-player-fallback";
        fallback.innerHTML = `<strong>${escape(text("previewUnavailable"))}</strong>`;
        player.appendChild(fallback);
      }

      const tags = document.createElement("div");
      tags.className = "problem-meta";
      course.tags.slice(0, 4).forEach((tag) => addTag(tags, tag, "skill"));

      const actions = document.createElement("div");
      actions.className = "course-actions";
      [
        ["save", courseState.saved ? text("savedCourse") : text("saveCourse"), courseState.saved ? "bookmark-check" : "bookmark"],
        ["path", courseState.inPath ? text("inLearningPath") : text("addToPath"), courseState.inPath ? "route" : "plus"],
        ["done", courseState.done ? text("courseDone") : text("markCourseDone"), courseState.done ? "check-circle-2" : "circle"]
      ].forEach(([action, label, iconName]) => {
        const button = document.createElement("button");
        const stateKey = action === "save" ? "saved" : action === "path" ? "inPath" : "done";
        button.type = "button";
        button.className = `secondary-button compact${courseState[stateKey] ? " is-active" : ""}`;
        button.dataset.courseAction = action;
        button.dataset.courseId = course.id;
        button.innerHTML = `<i data-lucide="${iconName}"></i>${escape(label)}`;
        actions.appendChild(button);
      });

      const notes = document.createElement("label");
      notes.className = "course-note-field";
      notes.innerHTML = `<span>${escape(text("courseNote"))}</span>`;
      const textarea = document.createElement("textarea");
      textarea.dataset.courseNote = course.id;
      textarea.rows = 3;
      textarea.placeholder = text("courseNotePlaceholder");
      textarea.value = courseState.note || "";
      notes.appendChild(textarea);

      const footer = document.createElement("div");
      footer.className = "problem-card-footer";
      const link = document.createElement("a");
      link.className = "content-card-link";
      link.href = deps.safeExternalUrl?.(selectedSource?.url || course.url) || "#";
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = text("openOriginal");
      const icon = document.createElement("i");
      icon.setAttribute("data-lucide", "external-link");
      footer.append(link, icon);

      card.append(title, meta, prompt, sourceBar, player, tags, actions, notes, footer);
      els.courseList.appendChild(card);
    });
    deps.refreshIcons?.();
  };

  const handleClick = (event) => {
    const button = event.target.closest("[data-course-action]");
    if (!button) return;
    const courseId = button.dataset.courseId || "";
    const course = getCourses().find((item) => item.id === courseId);
    if (!course) return;
    const courseState = getCourseState(courseId);
    const action = button.dataset.courseAction;
    if (action === "source") {
      updateCourseState(courseId, { selectedSourceId: button.dataset.sourceId || "" });
    } else if (action === "save") {
      updateCourseState(courseId, { saved: !courseState.saved });
    } else if (action === "path") {
      const inPath = !courseState.inPath;
      updateCourseState(courseId, {
        inPath,
        pathAddedAt: inPath ? (courseState.pathAddedAt || new Date().toISOString()) : ""
      });
    } else if (action === "done") {
      updateCourseState(courseId, {
        done: !courseState.done,
        inPath: true,
        pathAddedAt: courseState.pathAddedAt || new Date().toISOString()
      });
    }
    render();
    deps.refreshIcons?.();
  };

  const handleNoteChange = (event) => {
    const field = event.target.closest("[data-course-note]");
    if (!field) return;
    updateCourseState(field.dataset.courseNote, { note: field.value });
    renderLearningPath();
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.courseList, "click", handleClick);
      bind(els.courseList, "change", handleNoteChange);
      bind(els.coursePathList, "click", handleClick);
    },

    render() {
      render();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
