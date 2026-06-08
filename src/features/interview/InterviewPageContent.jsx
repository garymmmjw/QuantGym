import { InterviewCategoryPicker } from "./InterviewCategoryPicker.jsx";
import { InterviewConsole } from "./InterviewConsole.jsx";
import { useInterviewPageModel } from "./interviewHooks.js";

export function InterviewPageContent() {
  const model = useInterviewPageModel();
  const setup = model.view.setup || {};
  const isSession = model.view.phase === "session";
  const gridClass = isSession ? "interview-grid session-only" : "interview-grid setup-only";
  const language = model.view.language === "en" ? "en" : "zh";
  const setupMode = setup.mode === "live" ? "live" : "practice";

  return (
    <section className="interview-section">
      <div className="section-heading">
        <div>
          <h2>模拟面试</h2>
          <small id="interviewSummary">{setup.summaryText || "配置题型、题数、主题范围和题目来源。"}</small>
        </div>
      </div>
      <div id="interviewGrid" className={gridClass}>
        <div className="interview-setup-shark" id="interviewSetupShark" aria-hidden="true">
          <img src="assets/generated/shark-hero-clean.png?v=original-clean-1" alt="" loading="lazy" draggable="false" />
        </div>
        <div id="interviewSetup" className={`interview-setup${isSession ? " hidden" : ""}`}>
          <div className="interview-setup-top">
            <div>
              <strong>开始一场模拟面试</strong>
              <small>先选好语言、模型和模式，进入后由 AI 面试官用对话完成方向、难度、题量、风格等设置。</small>
            </div>
          </div>
          <div className="interview-setup-choices">
            <div className="interview-setup-field">
              <span className="interview-setup-label">语言</span>
              <div className="segmented interview-language-toggle" aria-label="面试语言">
                <button
                  className={`segment${language === "zh" ? " active" : ""}`}
                  type="button"
                  data-interview-lang="zh"
                  aria-pressed={language === "zh"}
                  onClick={() => model.selectLanguage("zh")}
                >
                  中文
                </button>
                <button
                  className={`segment${language === "en" ? " active" : ""}`}
                  type="button"
                  data-interview-lang="en"
                  aria-pressed={language === "en"}
                  onClick={() => model.selectLanguage("en")}
                >
                  English
                </button>
              </div>
            </div>
            <div className="interview-setup-field">
              <span className="interview-setup-label">模式</span>
              <div className="segmented interview-mode-toggle" aria-label="面试模式">
                <button
                  className={`segment${setupMode === "practice" ? " active" : ""}`}
                  type="button"
                  data-interview-mode="practice"
                  aria-pressed={setupMode === "practice"}
                  onClick={() => model.selectMode("practice")}
                >
                  训练练习
                </button>
                <button
                  className={`segment${setupMode === "live" ? " active" : ""}`}
                  type="button"
                  data-interview-mode="live"
                  aria-pressed={setupMode === "live"}
                  onClick={() => model.selectMode("live")}
                >
                  真实面试
                </button>
              </div>
            </div>
            <div className="interview-setup-field">
              <span className="interview-setup-label">模型</span>
              <select id="llmModelInput" aria-label="LLM Model" defaultValue="gpt-5-nano">
                <option value="gpt-5-nano">gpt-5-nano · 最便宜</option>
                <option value="gpt-5-mini">gpt-5-mini · 更稳</option>
                <option value="gpt-5">gpt-5 · 更强</option>
                <option value="gpt-5.4-mini">gpt-5.4-mini · 新 mini</option>
                <option value="gpt-5.4">gpt-5.4 · 高质量</option>
                <option value="gpt-4o-mini">gpt-4o-mini · 旧版低价</option>
                <option value="gpt-4.1-nano">gpt-4.1-nano · 旧版 nano</option>
              </select>
            </div>
          </div>
          <details className="interview-advanced-config">
            <summary>高级设置</summary>
            <div className="interview-advanced-grid">
              <label>
                面试类型
                <select id="interviewTypeSelect" aria-label="面试类型" onChange={() => model.handleSetupChange("type")}>
                  <option value="oa">Online Assessment</option>
                  <option value="technical">Technical Interview</option>
                  <option value="behavioral">Behavioral Interview</option>
                </select>
              </label>
              <label>
                问题数量
                <input id="interviewQuestionCount" type="number" min="1" max="12" defaultValue="3" onInput={() => model.handleSetupChange("count")} />
              </label>
              <label>
                每题时间（分钟）
                <input id="interviewQuestionTime" type="number" min="1" max="60" defaultValue="5" onInput={() => model.handleSetupChange("time")} />
              </label>
              <label className="hidden" aria-hidden="true">
                作答方式
                <select id="interviewAnswerModeSelect" aria-label="作答方式" onChange={() => model.api?.updateAnswerMode?.()}>
                  <option value="text">文字作答</option>
                  <option value="file">文件上传</option>
                  <option value="voice">语音作答</option>
                </select>
              </label>
              <label>
                题目来源
                <select id="interviewSourceSelect" aria-label="题目来源" onChange={() => model.handleSetupChange("source")}>
                  <option value="full">全范围题库</option>
                  <option value="pdf">上传 PDF 生成题目</option>
                </select>
              </label>
              <label id="interviewPdfRow" className={`interview-pdf-row${setup.showPdfRow ? "" : " hidden"}`}>
                PDF 文件
                <input id="interviewPdfInput" type="file" accept="application/pdf" onChange={model.updatePdfMeta} />
                <small id="interviewPdfMeta">上传 PDF 后会由 LLM 总结重点并生成题目。</small>
              </label>
              <div id="interviewCategoryRow" className={`interview-category-row${setup.showCategoryRow ? "" : " hidden"}`}>
                <span>主题范围</span>
                <div
                  id="interviewCategoryPicker"
                  className="interview-category-picker"
                  aria-label="主题范围"
                >
                  <InterviewCategoryPicker
                    categories={setup.categories || []}
                    onToggle={model.toggleCategory}
                  />
                </div>
              </div>
              <input id="llmEndpointInput" type="url" defaultValue="http://127.0.0.1:8787/interview" placeholder="http://127.0.0.1:8787/interview" />
            </div>
          </details>
          <button className="primary-button" id="startInterviewBtn" type="button" onClick={model.start}>
            <i data-lucide="messages-square" />
            进入模拟面试
          </button>
          <button
            className={`secondary-button${setup.hasDurableSession ? "" : " hidden"}`}
            id="resumeInterviewBtn"
            type="button"
            onClick={model.resume}
          >
            <i data-lucide="rotate-ccw" />
            继续上次面试
          </button>
        </div>
        <InterviewConsole session={model.view.session} model={model} />
      </div>
    </section>
  );
}
