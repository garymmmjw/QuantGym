import { useState } from "react";
import { normalizeNewsItem } from "../../modules/news/data.js";

const SKILL_OPTIONS = [
  "market", "deepLearning", "option", "statistics", "machineLearning",
  "probabilityExpectation", "pandasNumpy", "leetcode", "mentalMath"
];

export function NewsForm({ t, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    source: "",
    sourceUrl: "",
    sourceType: "news",
    primarySkill: "market",
    tags: "",
    summary: "",
    insight: ""
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const item = normalizeNewsItem({
      title: form.title,
      titleZh: form.title,
      source: form.source,
      sourceType: form.sourceType,
      sourceUrl: form.sourceUrl,
      publishedAt: new Date().toISOString(),
      tags: form.tags,
      skills: [form.primarySkill],
      summary: form.summary,
      insight: form.insight,
      createdAt: new Date().toISOString()
    });
    if (!item.titleZh || !item.summary) return;
    onSubmit(item);
    setForm({
      title: "",
      source: "",
      sourceUrl: "",
      sourceType: "news",
      primarySkill: "market",
      tags: "",
      summary: "",
      insight: ""
    });
  };

  return (
    <form id="newsForm" className="news-form" onSubmit={handleSubmit}>
      <input id="newsTitle" type="text" placeholder={t("newsTitlePlaceholder") || "新闻标题"} value={form.title} onChange={(e) => update("title", e.target.value)} />
      <input id="newsSource" type="text" placeholder={t("newsSourcePlaceholder") || "来源"} value={form.source} onChange={(e) => update("source", e.target.value)} />
      <input id="newsUrl" type="url" placeholder={t("newsUrlPlaceholder") || "来源链接"} value={form.sourceUrl} onChange={(e) => update("sourceUrl", e.target.value)} />
      <select id="newsSourceType" aria-label={t("newsSourceTypeAria") || "来源类型"} value={form.sourceType} onChange={(e) => update("sourceType", e.target.value)}>
        <option value="news">{t("newsSourceNews")}</option>
        <option value="official">{t("newsSourceOfficial")}</option>
        <option value="linkedin">{t("newsSourceLinkedIn")}</option>
        <option value="xiaohongshu">{t("newsSourceXiaohongshu")}</option>
        <option value="manual">{t("newsSourceManual")}</option>
      </select>
      <select id="newsPrimarySkill" aria-label={t("newsSkillAria") || "关联能力"} value={form.primarySkill} onChange={(e) => update("primarySkill", e.target.value)}>
        {SKILL_OPTIONS.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
      </select>
      <input id="newsTags" type="text" placeholder={t("newsTagsPlaceholder") || "tags"} value={form.tags} onChange={(e) => update("tags", e.target.value)} />
      <textarea id="newsSummary" rows={4} placeholder={t("newsSummaryPlaceholder") || "摘要"} value={form.summary} onChange={(e) => update("summary", e.target.value)} />
      <textarea id="newsInsight" rows={3} placeholder={t("newsInsightPlaceholder") || "面试启发"} value={form.insight} onChange={(e) => update("insight", e.target.value)} />
      <div className="problem-actions">
        <button className="secondary-button" type="submit">
          <i data-lucide="save"></i>
          {t("newsSave") || "保存新闻"}
        </button>
        <button className="ghost-button" type="button" onClick={onCancel}>{t("cancel") || "取消"}</button>
      </div>
    </form>
  );
}
