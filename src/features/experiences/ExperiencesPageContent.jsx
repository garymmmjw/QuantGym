import { useEffect, useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";
import { timestampOrZero } from "../../lib/date.js";

const EMPTY_FORM = {
  id: "",
  firm: "",
  role: "Quant Trading",
  stage: "OA / Assessment",
  season: "2027 Summer",
  date: "",
  outcome: "Waiting",
  tags: "",
  summary: "",
  topics: "",
  reflection: ""
};

const ROLE_OPTIONS = [
  { value: "Quant Trading", label: "Quant Trading" },
  { value: "Quant Research", label: "Quant Research" },
  { value: "Quant Developer", label: "Quant Developer" },
  { value: "Other", label: "其他方向" }
];

const STAGE_OPTIONS = [
  "OA / Assessment",
  "Recruiter / HR Screen",
  "Technical Interview",
  "Behavioral / Fit",
  "Final Day / Superday",
  "HR Close / Offer"
];

const SEASON_OPTIONS = ["2026 Summer", "2027 Summer", "2028 Summer", "Off-cycle"];

const OUTCOME_OPTIONS = [
  { value: "Waiting", label: "等待结果" },
  { value: "Advanced", label: "进入下一轮" },
  { value: "Offer", label: "Offer" },
  { value: "Closed", label: "流程结束" },
  { value: "Withdrawn", label: "已撤回" }
];

const OUTCOME_TONE = {
  Offer: "offer",
  Advanced: "wip",
  Waiting: "wip",
  Closed: "rej",
  Withdrawn: "rej"
};

const LOGO_PALETTE = ["#5b5ff5", "#e0562e", "#0b6ea8", "#16a06a", "#c8102e", "#2f9be0", "#7161f2", "#0f9d63"];

function firmInitials(firm) {
  const clean = String(firm || "").trim();
  if (!clean) return "QG";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.replace(/[^A-Za-z0-9一-龥]/g, "").slice(0, 3).toUpperCase() || clean.slice(0, 2).toUpperCase();
}

function firmColor(firm) {
  const key = String(firm || "");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return LOGO_PALETTE[hash % LOGO_PALETTE.length];
}

export function ExperiencesPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const api = pageApi.experiences;
  const userState = useUserStateStore((state) => state.value || {});
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [pendingShareId, setPendingShareId] = useState("");
  const [communityTick, setCommunityTick] = useState(0);

  useEffect(() => {
    const onCommunityUpdated = () => setCommunityTick((tick) => tick + 1);
    window.addEventListener("quantgym:community-updated", onCommunityUpdated);
    return () => window.removeEventListener("quantgym:community-updated", onCommunityUpdated);
  }, []);

  const records = useMemo(
    () => [...(userState.interviewExperiences || [])]
      .map((record) => api.normalize?.(record) || record)
      .sort((a, b) => timestampOrZero(b.updatedAt) - timestampOrZero(a.updatedAt)),
    [userState.interviewExperiences, api]
  );

  const companies = useMemo(() => {
    const seen = new Map();
    records.forEach((record) => {
      const firm = String(record.firm || "").trim();
      if (firm) seen.set(firm, (seen.get(firm) || 0) + 1);
    });
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [records]);

  const topTags = useMemo(() => {
    const counts = new Map();
    records.forEach((record) => {
      (record.tags || []).forEach((tag) => {
        const clean = String(tag || "").trim();
        if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
      });
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);
  }, [records]);

  const visible = useMemo(
    () => records.filter((item) =>
      (filter === "all" || item.stage === filter) &&
      (companyFilter === "all" || item.firm === companyFilter)),
    [filter, companyFilter, records]
  );
  const sharedCount = records.filter((record) => record.sharedPostId).length;
  const labels = api.labels || {};

  const communityPosts = useMemo(
    () => pageApi.community?.getPosts?.() || [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageApi, communityTick, records]
  );

  useEffect(() => {
    if (!form.date) setForm((prev) => ({ ...prev, date: pageApi.localDateKey?.() || "" }));
  }, [form.date, pageApi]);

  useScopedRefreshIcons(pageApi.refreshIcons, ".experiences-section", [visible, filter, pendingShareId, form.id, showForm, communityPosts]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, date: pageApi.localDateKey?.() || "" });
  };

  const openForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const save = (event) => {
    event.preventDefault();
    const previous = records.find((item) => item.id === form.id);
    const now = new Date().toISOString();
    const record = api.normalize?.({
      ...previous,
      id: previous?.id || pageApi.makeId?.(),
      firm: form.firm,
      role: form.role,
      stage: form.stage,
      season: form.season,
      date: form.date || pageApi.localDateKey?.(),
      outcome: form.outcome,
      tags: pageApi.parseTags?.(form.tags) || [],
      summary: form.summary,
      topics: form.topics,
      reflection: form.reflection,
      createdAt: previous?.createdAt || now,
      updatedAt: now
    });
    if (!record?.firm || !record?.summary) return;
    api.setRecords([record, ...records.filter((item) => item.id !== record.id)]);
    pageApi.saveState?.();
    setPendingShareId("");
    resetForm();
    setShowForm(false);
  };

  const edit = (record) => {
    setShowForm(true);
    setForm({
      id: record.id,
      firm: record.firm,
      role: record.role,
      stage: record.stage,
      season: record.season,
      date: record.date,
      outcome: record.outcome,
      tags: (record.tags || []).join(", "),
      summary: record.summary,
      topics: record.topics || "",
      reflection: record.reflection || ""
    });
  };

  const remove = (id) => {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    const warning = record.sharedPostId ? labels.deleteSharedWarning : labels.deleteWarning;
    if (!window.confirm(warning)) return;
    api.setRecords(records.filter((item) => item.id !== id));
    pageApi.saveState?.();
  };

  const confirmShare = (id) => {
    api.publish?.(id);
    setPendingShareId("");
    pageApi.saveState?.();
  };

  const openCommunityExperiences = () => {
    appServices.services?.switchModule?.("community");
  };

  return (
    <section className="experience-section experiences-section qg-support-page qg-experiences-page">
      <header className="experience-header">
        <div>
          <span className="experience-kicker">TRAINING · 面经</span>
          <h2 className="experience-title-line">面经 <span>Interview Notes</span></h2>
          <p>真实面试复盘 · 按公司/轮次归档 · 每篇都能跳转对应题库</p>
        </div>
        <button className="primary-button experience-write-btn" id="newExperienceBtn" type="button" onClick={openForm}>
          <i data-lucide="plus" />写面经 · +30 XP
        </button>
      </header>
      <div className="experience-company-chips">
        <button
          type="button"
          className={`experience-company-chip${companyFilter === "all" ? " is-active" : ""}`}
          onClick={() => setCompanyFilter("all")}
        >
          全部
        </button>
        {companies.map(([firm]) => (
          <button
            key={firm}
            type="button"
            className={`experience-company-chip${companyFilter === firm ? " is-active" : ""}`}
            onClick={() => setCompanyFilter(firm)}
          >
            {firm}
          </button>
        ))}
      </div>
      <div className="experience-main-grid">
        <div className="experience-feed">
        <form className={`experience-form${showForm ? "" : " hidden"}`} id="experienceForm" onSubmit={save}>
          <div className="experience-panel-heading">
            <h3 id="experienceFormTitle">{form.id ? labels.editTitle : labels.newTitle}</h3>
            <span className="experience-private"><i data-lucide="lock-keyhole" /> 私有保存</span>
          </div>
          <input id="experienceId" type="hidden" value={form.id} readOnly />
          <div className="experience-fields">
            <label>
              公司
              <input
                id="experienceFirm"
                type="text"
                value={form.firm}
                onChange={(e) => update("firm", e.target.value)}
                required
                placeholder="例如：Optiver / 匿名做市公司"
              />
            </label>
            <label>岗位方向
              <select id="experienceRole" value={form.role} onChange={(e) => update("role", e.target.value)}>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>轮次
              <select id="experienceStage" value={form.stage} onChange={(e) => update("stage", e.target.value)}>
                {STAGE_OPTIONS.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </label>
            <label>目标季次
              <select id="experienceSeason" value={form.season} onChange={(e) => update("season", e.target.value)}>
                {SEASON_OPTIONS.map((season) => <option key={season} value={season}>{season}</option>)}
              </select>
            </label>
            <label>面试日期
              <input id="experienceDate" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
            </label>
            <label>结果状态
              <select id="experienceOutcome" value={form.outcome} onChange={(e) => update("outcome", e.target.value)}>
                {OUTCOME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            标签
            <input
              id="experienceTags"
              type="text"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder="例如：mental math, probability, market making"
            />
          </label>
          <label>
            {labels.summaryLabel || "流程概览"}
            <textarea
              id="experienceSummaryInput"
              rows={3}
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              required
              placeholder="轮次时长、交流方式、整体节奏和感受。"
            />
          </label>
          <label>
            {labels.topicsLabel || "考察主题"}
            <textarea
              id="experienceTopics"
              rows={4}
              value={form.topics}
              onChange={(e) => update("topics", e.target.value)}
              placeholder="记录题型与能力主题即可，请勿写入受保密要求约束的原题。"
            />
          </label>
          <label>
            {labels.reflectionLabel || "复盘与下一步"}
            <textarea
              id="experienceReflection"
              rows={4}
              value={form.reflection}
              onChange={(e) => update("reflection", e.target.value)}
              placeholder="做得好的地方、卡住的点、下一次要强化的训练。"
            />
          </label>
          <p className="experience-safety"><i data-lucide="shield-check" /> 分享前请移除姓名、联系方式及公司要求保密的具体题目。</p>
          <div className="experience-form-stats">
            <div>
              <strong id="experienceCount">{records.length}</strong>
              <span>条面经记录</span>
            </div>
            <div>
              <strong id="sharedExperienceCount">{sharedCount}</strong>
              <span>已分享到社群</span>
            </div>
            <button
              className="secondary-button"
              id="openCommunityExperiencesBtn"
              type="button"
              data-jump-module="community"
              onClick={openCommunityExperiences}
            >
              <i data-lucide="users-round" />
              查看社群面经
            </button>
          </div>
          <div className="experience-form-actions">
            <button className="primary-button" type="submit"><i data-lucide="save" />保存面经</button>
            <button
              className="secondary-button"
              id="cancelExperienceEditBtn"
              type="button"
              onClick={closeForm}
            >
              {labels.cancel || "取消编辑"}
            </button>
          </div>
        </form>
        <div className="experience-list-toolbar">
          <h3>我的面经</h3>
          <select id="experienceFilter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="筛选面经轮次">
            <option value="all">全部轮次</option>
            {STAGE_OPTIONS.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </div>
        <div className="experience-list" id="experienceList">
          {!visible.length ? <EmptyState title={records.length ? labels.emptyFiltered : labels.emptyRecords} /> : visible.map((record) => {
            const sharedPost = record.sharedPostId
              ? communityPosts.find((post) => post.id === record.sharedPostId)
              : null;
            return (
            <article key={record.id} className="experience-card" data-experience-id={record.id}>
              <div className="experience-card-head">
                <span className="experience-card-logo" style={{ background: firmColor(record.firm) }}>{firmInitials(record.firm)}</span>
                <div className="experience-card-title">
                  <h4>{record.firm} · {record.role}</h4>
                  <small>{record.stage} · {record.season}{record.date ? ` · ${api.formatDate?.(record.date)}` : ""}</small>
                </div>
                <span className={`experience-outcome-pill tone-${OUTCOME_TONE[record.outcome] || "wip"}`}>
                  {api.formatOutcome?.(record.outcome) || record.outcome}
                </span>
                <div className="experience-card-actions">
                  <button type="button" className="icon-button ghost" aria-label="编辑面经" onClick={() => edit(record)}><i data-lucide="pencil-line" /></button>
                  <button type="button" className="icon-button ghost danger" aria-label="删除面经" onClick={() => remove(record.id)}><i data-lucide="trash-2" /></button>
                </div>
              </div>
              <div className="experience-badges">
                <span className={record.sharedPostId ? "shared" : "private"}>{record.sharedPostId ? "已分享到社群" : "私有记录"}</span>
              </div>
              <div className="experience-card-body">
                <div>
                  <strong>{labels.summaryLabel || "流程概览"}</strong>
                  <p>{record.summary}</p>
                </div>
                {record.topics ? (
                  <div>
                    <strong>{labels.topicsLabel || "考察主题"}</strong>
                    <p>{record.topics}</p>
                  </div>
                ) : null}
                {record.reflection ? (
                  <div>
                    <strong>{labels.reflectionLabel || "复盘与下一步"}</strong>
                    <p>{record.reflection}</p>
                  </div>
                ) : null}
              </div>
              {(record.tags || []).length || sharedPost ? (
                <div className="experience-tags">
                  {(record.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
                  {sharedPost ? (
                    <div className="experience-social">
                      <span className="experience-social-up"><i data-lucide="arrow-up" />{(sharedPost.likes || []).length}</span>
                      <span className="experience-social-comments"><i data-lucide="message-square" />{(sharedPost.comments || []).length}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="experience-share-row">
                <button type="button" className="secondary-button" onClick={() => setPendingShareId(record.id)}>
                  <i data-lucide="share-2" />{record.sharedPostId ? labels.updateShare : labels.shareToCommunity}
                </button>
              </div>
              {pendingShareId === record.id ? (
                <div className="experience-share-confirm">
                  <p>{labels.shareConfirmMessage}</p>
                  <div>
                    <button type="button" className="primary-button" onClick={() => confirmShare(record.id)}>{labels.confirmShare}</button>
                    <button type="button" className="secondary-button" onClick={() => setPendingShareId("")}>{labels.cancel}</button>
                  </div>
                </div>
              ) : null}
            </article>
            );
          })}
        </div>
        </div>
        {companies.length || topTags.length ? (
        <aside className="experience-side-panel">
          {companies.length ? (
            <div className="experience-rank-panel">
              <div className="experience-rank-title">面经最多的公司</div>
              <div className="experience-rank-list">
                {companies.slice(0, 5).map(([firm, count], index) => (
                  <div className="experience-rank-row" key={firm}>
                    <span className="experience-rank-index">{index + 1}</span>
                    <span className="experience-rank-logo" style={{ background: firmColor(firm) }}>{firmInitials(firm)}</span>
                    <span className="experience-rank-name">{firm}</span>
                    <span className="experience-rank-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {topTags.length ? (
            <div className="experience-hot-panel">
              <div className="experience-hot-title">
                <img src="/assets/generated/playful-precision/reward-target.webp" alt="" />
                高频考点
              </div>
              <div className="experience-hot-tags">
                {topTags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
          ) : null}
        </aside>
        ) : null}
      </div>
    </section>
  );
}
