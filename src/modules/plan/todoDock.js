export function createTodoDockOpenState(initialOpen = false) {
  let open = Boolean(initialOpen);
  return {
    isOpen() {
      return open;
    },
    setOpen(value) {
      open = Boolean(value);
      return open;
    },
    toggle() {
      open = !open;
      return open;
    }
  };
}

export function renderTodoDock(elements = {}, plan = null, options = {}) {
  if (!elements.todoDockButton || !elements.todoDockPanel || !elements.todoDockList) {
    return { rendered: false, pending: 0, total: 0 };
  }
  const {
    documentRef = globalThis.document,
    open = false,
    t = (key) => key,
    refreshIcons = () => {}
  } = options;
  const items = Array.isArray(plan?.items) ? plan.items : [];
  const pending = items.filter((item) => !item.done).length;

  elements.todoDockPanel.classList.toggle("hidden", !open);
  elements.todoDockButton.classList.toggle("open", open);
  elements.todoDockButton.setAttribute("aria-expanded", String(open));
  if (elements.todoDockButtonLabel) elements.todoDockButtonLabel.textContent = t("todoButton");
  if (elements.todoDockCount) elements.todoDockCount.textContent = String(pending);
  if (elements.todoDockEyebrow) elements.todoDockEyebrow.textContent = t("todoEyebrow");
  if (elements.todoDockTitle) elements.todoDockTitle.textContent = t("todoTitle");
  if (elements.todoDockSummary) elements.todoDockSummary.textContent = plan?.summary || t("todoSummaryEmpty");
  if (elements.todoDockEmpty) {
    elements.todoDockEmpty.textContent = t("todoEmpty");
    elements.todoDockEmpty.classList.toggle("hidden", items.length > 0);
  }
  if (elements.todoDockAddInput) elements.todoDockAddInput.placeholder = t("todoAddPlaceholder");

  elements.todoDockList.innerHTML = "";
  items.forEach((item) => {
    elements.todoDockList.appendChild(createTodoDockTask(item, {
      documentRef,
      t
    }));
  });
  refreshIcons();
  return { rendered: true, pending, total: items.length };
}

export function createTodoDockTask(item = {}, options = {}) {
  const {
    documentRef = globalThis.document,
    t = (key) => key
  } = options;
  const taskId = String(item.id || "");
  const titleText = String(item.title || "");
  const detailText = String(item.detail || "");

  const row = documentRef.createElement("article");
  row.className = `todo-task${item.done ? " done" : ""}`;
  row.dataset.todoId = taskId;

  const toggle = documentRef.createElement("button");
  toggle.className = "todo-task-toggle";
  toggle.type = "button";
  toggle.dataset.todoToggle = taskId;
  toggle.setAttribute("aria-label", item.done ? t("todoDone") : t("todoUndone"));
  const icon = documentRef.createElement("i");
  icon.setAttribute("data-lucide", item.done ? "check" : "circle");
  toggle.appendChild(icon);

  const fields = documentRef.createElement("div");
  fields.className = "todo-task-fields";
  const title = documentRef.createElement("input");
  title.type = "text";
  title.value = titleText;
  title.dataset.todoId = taskId;
  title.dataset.todoField = "title";
  title.setAttribute("aria-label", titleText || t("todoAddPlaceholder"));
  const detail = documentRef.createElement("textarea");
  detail.rows = 2;
  detail.dataset.todoId = taskId;
  detail.dataset.todoField = "detail";
  detail.setAttribute("aria-label", `${titleText || t("todoAddPlaceholder")} detail`);
  detail.textContent = detailText;
  fields.append(title, detail);

  const meta = documentRef.createElement("div");
  meta.className = "todo-task-meta";
  const time = documentRef.createElement("span");
  time.className = "todo-task-time";
  time.textContent = `${String(item.minutes || 0)}m`;
  meta.appendChild(time);
  if (item.deletable) {
    const deleteButton = documentRef.createElement("button");
    deleteButton.className = "todo-task-delete icon-button ghost danger";
    deleteButton.type = "button";
    deleteButton.dataset.todoDelete = taskId;
    deleteButton.setAttribute("aria-label", t("deleteTask") || "Delete task");
    deleteButton.title = t("deleteTask") || "Delete task";
    const deleteIcon = documentRef.createElement("i");
    deleteIcon.setAttribute("data-lucide", "trash-2");
    deleteButton.appendChild(deleteIcon);
    meta.appendChild(deleteButton);
  }

  row.append(toggle, fields, meta);
  return row;
}
