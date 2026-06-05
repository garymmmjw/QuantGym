export function renderTodayPlanCard(container, plan = null, options = {}) {
  if (!container) return { rendered: false };
  const {
    documentRef = globalThis.document,
    prepPlanActive = false,
    t = (key) => key,
    onOpen = () => {}
  } = options;

  container.innerHTML = "";
  container.classList.toggle("hidden", !plan);
  if (!plan) return { rendered: false };

  const top = documentRef.createElement("div");
  top.className = "today-plan-top";
  const title = documentRef.createElement("strong");
  title.textContent = t("planTitle");
  const meta = documentRef.createElement("span");
  meta.textContent = plan.summary || t("planGenerated");
  top.append(title, meta);

  const list = documentRef.createElement("ul");
  (plan.items || []).slice(0, 4).forEach((item) => {
    const row = documentRef.createElement("li");
    row.classList.toggle("done", Boolean(item.done));
    const dot = documentRef.createElement("span");
    dot.className = "plan-dot";
    dot.textContent = item.done ? "OK" : item.minutes ? `${item.minutes}` : "Q";
    const copy = documentRef.createElement("div");
    const rowTitle = documentRef.createElement("strong");
    rowTitle.textContent = item.title;
    const detail = documentRef.createElement("small");
    detail.textContent = item.detail;
    copy.append(rowTitle, detail);
    row.append(dot, copy);
    list.appendChild(row);
  });

  const open = documentRef.createElement("button");
  open.className = "secondary-button today-plan-open";
  open.type = "button";
  const icon = documentRef.createElement("i");
  icon.setAttribute("data-lucide", "arrow-right");
  open.append(icon, documentRef.createTextNode(` ${t(prepPlanActive ? "todayPlanView" : "todayPlanCreate")}`));
  open.addEventListener("click", () => onOpen());

  container.append(top, list, open);
  return { rendered: true };
}

export function flashTodayPlanCreated(container, options = {}) {
  if (!container) return;
  const windowRef = options.windowRef || globalThis.window;
  const duration = Number(options.duration ?? 600);
  container.classList.add("just-created");
  windowRef?.setTimeout?.(() => container.classList.remove("just-created"), duration);
}
