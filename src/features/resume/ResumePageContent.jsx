import { useEffect, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { CoderSticker } from "../shared/CoderSticker.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

const RESUME_TEMPLATES = [
  { id: "classic", name: "品牌紫", accent: "#5b5ff5" },
  { id: "mono", name: "极简黑", accent: "var(--qg-text)" },
  { id: "emerald", name: "稳重绿", accent: "#0f9d63" }
];

const RESUME_SECTIONS = [
  { id: "basic", name: "基本信息", count: 1 },
  { id: "edu", name: "教育背景", count: 1 },
  { id: "exp", name: "实习经历", count: 2 },
  { id: "skill", name: "技能", count: 8 },
  { id: "ach", name: "QuantGym 成就", count: 1 }
];

const RESUME_SKILLS = [
  "Python",
  "C++",
  "NumPy / pandas",
  "概率论",
  "随机过程",
  "蒙特卡洛",
  "期权定价",
  "Delta 对冲"
];

export function ResumePageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const t = appServices.t;
  const userState = useUserStateStore((state) => state.value || {});
  const api = pageApi.resume;
  void userState.resume;
  const [text, setText] = useState(() => api.getResume().text || "");
  const [review, setReview] = useState(() => api.getResume().review || []);
  const [busy, setBusy] = useState(false);
  const [template, setTemplate] = useState("classic");
  const [hiddenSections, setHiddenSections] = useState({});

  useEffect(() => {
    api.renderAccountResumeMeta?.();
  }, [api, userState.resume]);

  useScopedRefreshIcons(pageApi.refreshIcons, ".resume-section", [review, busy, template, hiddenSections]);

  const save = () => {
    api.saveText(text);
    setText(api.getResume().text || "");
  };

  const exportPdf = () => {
    window.print();
  };

  const toggleSection = (id) => {
    setHiddenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const runReview = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const items = await api.review(text);
      setReview(items || []);
      api.setResume({ ...api.getResume(), review: items || [] });
      pageApi.saveState?.();
    } finally {
      setBusy(false);
    }
  };

  const hasReview = review.length > 0;
  const accent = (RESUME_TEMPLATES.find((tpl) => tpl.id === template) || RESUME_TEMPLATES[0]).accent;

  return (
    <section className="resume-section qg-support-page qg-resume-page" style={{ "--tpl-accent": accent }}>
      <header className="resume-topbar">
        <div className="section-heading resume-heading">
          <div>
            <span className="resume-eyebrow">JOBS · 简历工作台</span>
            <h2>
              简历 <span className="resume-title-accent">Resume</span>
            </h2>
            <small id="resumeSummary">{t("resumeSummary")}</small>
          </div>
        </div>
        <div className="resume-topbar-actions">
          <div className="resume-ats-pill">
            <div className="resume-ats-ring">
              <div className="resume-ats-value">82</div>
            </div>
            <div className="resume-ats-copy">
              <div className="resume-ats-label">ATS 评分</div>
              <div className="resume-ats-grade">良好</div>
            </div>
          </div>
          <button className="primary-button resume-export" type="button" onClick={exportPdf}>
            <i data-lucide="download" />
            导出 PDF
          </button>
        </div>
      </header>

      <div className="resume-grid resume-workbench">
        <aside className="resume-side">
          <div className="resume-panel">
            <div className="resume-panel-title">模板风格</div>
            <div className="resume-template-grid">
              {RESUME_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`resume-template-chip${template === tpl.id ? " is-active" : ""}`}
                  style={{ "--tpl-accent": tpl.accent }}
                  onClick={() => setTemplate(tpl.id)}
                  aria-pressed={template === tpl.id}
                >
                  <span className="resume-template-swatch" style={{ background: tpl.accent }} />
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="resume-panel">
            <div className="resume-panel-head">
              <div className="resume-panel-title">简历分区</div>
              <span className="resume-add">+ 添加</span>
            </div>
            <div className="resume-section-list">
              {RESUME_SECTIONS.map((sectionDef) => {
                const hidden = Boolean(hiddenSections[sectionDef.id]);
                return (
                  <button
                    key={sectionDef.id}
                    type="button"
                    className={`resume-section-row${hidden ? " is-hidden" : ""}`}
                    onClick={() => toggleSection(sectionDef.id)}
                    aria-pressed={!hidden}
                  >
                    <i data-lucide="grip-vertical" className="resume-grip" />
                    <span className="resume-section-name">{sectionDef.name}</span>
                    <span className="resume-section-count">{sectionDef.count} 项</span>
                    <span className={`resume-section-eye${hidden ? " is-off" : ""}`}>
                      <i key={hidden ? "eye-off" : "eye"} data-lucide={hidden ? "eye-off" : "eye"} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="resume-panel resume-ai-card">
            <div className="resume-ai-head">
              <img src="/assets/generated/playful-precision/avatar-wink-v2.png" alt="" />
              <div className="resume-ai-title">{t("resumeReviewTitle") || "AI 润色建议"}</div>
            </div>
            <div id="resumeReview" className="resume-review resume-ai-list">
              {hasReview ? (
                <ul>
                  {review.map((item, index) => (
                    <li key={index}>
                      <span className="resume-ai-dot">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="resume-ai-empty">
                  粘贴简历后点击「{t("reviewResume") || "LLM 修改简历"}」，AI 会针对 quant 岗位逐条给出修改建议。
                </p>
              )}
            </div>
          </div>
        </aside>

        <form id="resumeForm" className="resume-preview-wrap" onSubmit={runReview}>
          <div className="resume-doc">
            {!hiddenSections.basic && (
              <div className="resume-doc-header">
                <div className="resume-doc-name">Quant Liu</div>
                <div className="resume-doc-role">Aspiring Quantitative Trader / Researcher</div>
                <div className="resume-doc-meta">
                  <span>quant.liu@quantgym.io</span>
                  <span>· +86 138 0000 0000</span>
                  <span>· 上海</span>
                  <span>· github.com/quantliu</span>
                </div>
              </div>
            )}

            {!hiddenSections.edu && (
              <div className="resume-doc-block">
                <div className="resume-doc-h">教育背景 · Education</div>
                <div className="resume-doc-line">
                  <span className="resume-doc-strong">上海交通大学 · 金融工程（本硕）</span>
                  <span className="resume-doc-date">2021 — 2026</span>
                </div>
                <div className="resume-doc-sub">GPA 3.9/4.0 · 相关课程：随机过程、概率论、凸优化、数值方法、机器学习</div>
              </div>
            )}

            {!hiddenSections.exp && (
              <div className="resume-doc-block">
                <div className="resume-doc-h">实习经历 · Experience</div>
                <div className="resume-doc-item">
                  <div className="resume-doc-line">
                    <span className="resume-doc-strong">某自营做市商 · 量化研究实习</span>
                    <span className="resume-doc-date">2025 夏</span>
                  </div>
                  <ul className="resume-doc-bullets">
                    <li>用 Python 处理 2GB 高频行情，构建做市信号，回测夏普 1.8</li>
                    <li>实现 delta 对冲模拟，将库存风险敞口降低 23%</li>
                  </ul>
                </div>
                <div className="resume-doc-item">
                  <div className="resume-doc-line">
                    <span className="resume-doc-strong">券商衍生品部 · 定价实习</span>
                    <span className="resume-doc-date">2024 冬</span>
                  </div>
                  <ul className="resume-doc-bullets">
                    <li>用 C++ 实现蒙特卡洛期权定价，较基线提速 4×</li>
                  </ul>
                </div>
              </div>
            )}

            {!hiddenSections.skill && (
              <div className="resume-doc-block">
                <div className="resume-doc-h">技能 · Skills</div>
                <div className="resume-doc-skills">
                  {RESUME_SKILLS.map((skill) => (
                    <span key={skill} className="resume-doc-skill">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!hiddenSections.ach && (
              <div className="resume-doc-block">
                <div className="resume-doc-h">QuantGym 成就 · Highlights</div>
                <div className="resume-doc-text">已解 342 题 · Mental Math 正确率 91% · 连续训练 12 天 · 段位 Analyst II</div>
              </div>
            )}
          </div>

          <div className="resume-editor">
            <label htmlFor="resumeText" className="resume-editor-label">
              {t("resumeContent") || "简历内容"}
            </label>
            <textarea
              id="resumeText"
              rows={14}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("resumePlaceholder")}
            />
            <div className="form-row resume-editor-actions">
              <button className="primary-button" id="reviewResumeBtn" type="submit" disabled={busy}>
                <i data-lucide="wand-sparkles" />
                {busy ? t("resumeReviewing") : t("reviewResume") || "LLM 修改简历"}
              </button>
              <button className="secondary-button" id="saveResumeBtn" type="button" onClick={save}>
                <i data-lucide="save" />
                {t("saveResume") || "保存简历"}
              </button>
            </div>
          </div>
        </form>
      </div>
      <CoderSticker page="resume" />
    </section>
  );
}
