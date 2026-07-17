import { useEffect, useMemo, useRef, useState } from "react";
import { useAppServices } from "../../stores/usePageApi.js";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { buildGlobalSearchResults, getModuleSearchDefs } from "../../ui/globalSearchData.js";
import { activateGlobalSearchResult } from "../../ui/globalSearch.js";
import { formatCategoryLabel, isCatalogProblem } from "../../modules/problems/data.js";
import { createProblemSearchRecord, scoreProblemSearchRecord } from "../../modules/problems/search.js";
import { normalizeJobs } from "../../modules/jobs/data.js";
import { normalizeCourses } from "../../modules/courses/data.js";
import { sortNews } from "../../modules/news/data.js";
import { useBodyScrollLock } from "./useBodyScrollLock.js";
import { QuantyImage } from "@/components/common/QuantyImage.jsx";

const MODULE_ICONS = {
  overview: "layout-dashboard",
  plan: "calendar-check-2",
  skills: "radar",
  interview: "messages-square",
  problems: "library-big",
  tools: "brain",
  poker: "spade",
  pk: "zap",
  experiences: "notebook-pen",
  news: "newspaper",
  community: "message-circle-heart",
  messages: "message-square-text",
  network: "network",
  resume: "file-user",
  jobs: "briefcase-business",
  companies: "building-2",
  courses: "video",
  library: "book-open",
  memory: "archive",
  account: "user",
  settings: "settings"
};

const TYPE_ICONS = {
  module: "compass",
  problem: "library-big",
  company: "building-2",
  job: "briefcase-business",
  course: "video",
  skill: "radar",
  news: "newspaper"
};

const MAX_ROWS = 12;

export function CommandPalette({ open, onClose, theme, onToggleTheme }) {
  const appServices = useAppServices();
  const userStateValue = useUserStateStore((state) => state.value || {});
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const rowsRef = useRef([]);
  const activeIndexRef = useRef(0);
  const problemRecordCacheRef = useRef(new Map());

  const t = appServices.t || ((key) => key);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    setDebouncedQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => setDebouncedQuery(query), 90);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  const runRow = (row) => {
    onClose();
    if (!row) return;
    if (row.kind === "action") {
      row.run?.();
      return;
    }
    const services = appServices.services || {};
    services.rebindElements?.();
    if (row.kind === "module") {
      services.switchModule?.(row.module);
      return;
    }
    activateGlobalSearchResult({ getMatch: () => row.result }, 0, {
      switchModule: services.switchModule,
      setCompanyTier: (value) => appServices.companyTierFilterState?.setTier?.(value),
      clear: () => {}
    });
  };

  const rows = useMemo(() => {
    if (!open) return [];
    const trimmed = debouncedQuery.trim();
    const actionRows = [
      {
        kind: "action",
        id: `action-theme-${theme}`,
        icon: theme === "dark" ? "sun" : "moon-star",
        label: theme === "dark" ? t("cmdkThemeToLight") : t("cmdkThemeToDark"),
        hint: t("cmdkThemeHint"),
        keys: "主题 深色 浅色 外观 theme dark light mode",
        run: () => onToggleTheme?.()
      },
      {
        kind: "action",
        id: "action-train",
        icon: "zap",
        label: t("cmdkStartTraining"),
        hint: t("cmdkStartTrainingHint"),
        keys: "训练 任务 计划 打卡 today train plan quest",
        run: () => {
          const services = appServices.services || {};
          services.rebindElements?.();
          services.switchModule?.("plan");
        }
      }
    ];

    if (!trimmed) {
      const moduleRows = getModuleSearchDefs(t).map((def) => ({
        kind: "module",
        id: `module-${def.module}`,
        icon: MODULE_ICONS[def.module] || "compass",
        label: def.label,
        hint: t("cmdkModuleHint", { detail: def.detail }),
        module: def.module
      }));
      return [...actionRows, ...moduleRows];
    }

    const results = buildGlobalSearchResults(trimmed, {
      state: userStateValue,
      t,
      getLanguage: appServices.getLanguage,
      isCatalogProblem,
      createProblemSearchRecord,
      getProblemSearchOptions: () => ({ cache: problemRecordCacheRef.current }),
      formatCategoryLabel,
      scoreProblemSearchRecord,
      quantCompanyDefs: appServices.companyDefs || [],
      getCompanyProblemStats: appServices.getCompanyProblemStats,
      normalizeJobs,
      normalizeCourses,
      skillDefs: appServices.skillDefs || {},
      sortNews,
      inferSource: appServices.inferSource,
      formatNewsDate: appServices.formatNewsDate
    });
    const resultRows = results.map((result, index) => ({
      kind: "result",
      id: `result-${result.type}-${result.id ?? result.module ?? index}`,
      icon: result.type === "module"
        ? (MODULE_ICONS[result.module] || "compass")
        : (TYPE_ICONS[result.type] || "compass"),
      label: result.title,
      hint: `${result.typeLabel} · ${result.detail}`,
      result
    }));
    const lowered = trimmed.toLowerCase();
    const matchedActions = actionRows.filter((action) => (
      `${action.label} ${action.keys}`.toLowerCase().includes(lowered)
    ));
    return [...matchedActions, ...resultRows].slice(0, MAX_ROWS);
  }, [open, debouncedQuery, theme, userStateValue, appServices, t, onToggleTheme]);

  rowsRef.current = rows;

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(Math.max(0, rowsRef.current.length - 1), index + 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const row = rowsRef.current[Math.min(activeIndexRef.current, rowsRef.current.length - 1)];
        if (row) runRow(row);
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  activeIndexRef.current = activeIndex;

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => globalThis.lucide?.createIcons?.());
  }, [open, rows]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector?.(".qg-cmdk-row.is-active");
    node?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeIndex]);

  if (!open) return null;

  const boundedIndex = Math.min(activeIndex, Math.max(0, rows.length - 1));

  return (
    <div
      className="qg-cmdk"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="qg-cmdk-panel" role="dialog" aria-modal="true" aria-label={t("cmdkPanelAria")}>
        <div className="qg-cmdk-head">
          <span className="qg-cmdk-head-icon" aria-hidden="true">
            <i data-lucide="search"></i>
          </span>
          <input
            ref={inputRef}
            className="qg-cmdk-input"
            type="text"
            value={query}
            placeholder={t("cmdkSearchPlaceholder")}
            aria-label={t("cmdkSearchAria")}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="qg-cmdk-esc" type="button" onClick={onClose}>ESC</button>
        </div>
        <div className="qg-cmdk-list" ref={listRef} role="listbox" aria-label={t("cmdkResultsAria")}>
          {rows.length ? rows.map((row, index) => (
            <div
              className={index === boundedIndex ? "qg-cmdk-row is-active" : "qg-cmdk-row"}
              key={row.id}
              role="option"
              aria-selected={index === boundedIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => runRow(row)}
            >
              <span className="qg-cmdk-row-icon" aria-hidden="true">
                <i data-lucide={row.icon}></i>
              </span>
              <span className="qg-cmdk-row-copy">
                <strong>{row.label}</strong>
                <small>{row.hint}</small>
              </span>
              <span className="qg-cmdk-row-kbd" aria-hidden="true">↵</span>
            </div>
          )) : (
            <div className="qg-cmdk-empty">
              <QuantyImage asset="search" size="small" />
              <strong>{t("cmdkNoResult", { query: debouncedQuery.trim() })}</strong>
              <span>{t("cmdkNoResultHint")}</span>
            </div>
          )}
        </div>
        <div className="qg-cmdk-foot">
          <span>{t("cmdkFootSelect")}</span>
          <span>{t("cmdkFootJump")}</span>
          <span>{t("cmdkFootClose")}</span>
          <span className="qg-cmdk-foot-hint">{t("cmdkFootHint")}</span>
        </div>
      </div>
    </div>
  );
}
