import { listen } from '../../ui/events.js';

export function createJobsModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const text = (key, params) => deps.t?.(key, params) || key;
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };
  const getActiveFilter = () => document.querySelector("[data-job-filter].active")?.dataset.jobFilter || "all";
  const jobTime = (job) => {
    const value = new Date(job?.postedAt || job?.createdAt || 0).getTime();
    return Number.isNaN(value) ? 0 : value;
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

  const render = (filter = getActiveFilter()) => {
    const els = getElements();
    if (!els.jobsList) return;
    const selected = filter || "all";
    document.querySelectorAll("[data-job-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.jobFilter === selected);
    });

    const jobs = (deps.normalizeJobs?.(deps.getJobs?.() || []) || [])
      .filter((job) => selected === "all" || job.type === selected)
      .sort((a, b) => jobTime(b) - jobTime(a));
    els.jobsList.innerHTML = "";
    if (!jobs.length) {
      els.jobsList.appendChild(deps.emptyBlock?.(text("searchEmpty")) || document.createTextNode(""));
      return;
    }

    jobs.forEach((job) => {
      const card = document.createElement("article");
      card.className = "job-card content-card problem-card";
      card.dataset.jobId = job.id;
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      card.setAttribute("aria-label", `${text("applyNow")}: ${job.company} ${job.title}`);
      card.addEventListener("click", (event) => {
        if (event.target.closest("a")) return;
        deps.openExternalUrl?.(job.url);
      });
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        deps.openExternalUrl?.(job.url);
      });

      const title = document.createElement("h3");
      title.textContent = job.title;

      const meta = document.createElement("div");
      meta.className = "problem-meta";
      const typeLabel = job.type === "fulltime" ? text("fulltime") : text("internship");
      addTag(meta, typeLabel, `difficulty ${job.type === "fulltime" ? "medium" : "easy"}`);
      addTag(meta, job.company, "topic");
      addTag(meta, deps.formatDate?.(job.postedAt || job.createdAt || "") || "", "source");

      const prompt = document.createElement("div");
      prompt.className = "problem-prompt";
      prompt.textContent = deps.formatPrompt?.(job) || `${job.company} - ${job.location}`;

      const tags = document.createElement("div");
      tags.className = "problem-meta";
      job.tags.slice(0, 4).forEach((tag) => addTag(tags, tag, "skill"));

      const footer = document.createElement("div");
      footer.className = "problem-card-footer";
      const link = document.createElement("a");
      link.className = "content-card-link";
      link.href = deps.safeExternalUrl?.(job.url) || "#";
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = text("applyNow");
      const icon = document.createElement("i");
      icon.setAttribute("data-lucide", "external-link");
      footer.append(link, icon);

      card.append(title, meta, prompt, tags, footer);
      els.jobsList.appendChild(card);
    });
    deps.refreshIcons?.();
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      document.querySelectorAll("[data-job-filter]").forEach((button) => {
        bind(button, "click", () => {
          render(button.dataset.jobFilter || "all");
        });
      });

      bind(els.refreshJobsBtn, "click", () => {
        deps.refresh?.(true);
      });
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
