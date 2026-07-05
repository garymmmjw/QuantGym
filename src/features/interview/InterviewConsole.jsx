import { useEffect, useRef, useState } from "react";
import { InterviewFavorites } from "./InterviewFavorites.jsx";
import { InterviewQuestionPanel } from "./InterviewQuestionPanel.jsx";
import { InterviewRichText } from "./InterviewRichText.jsx";
import { InterviewTranscript } from "./InterviewTranscript.jsx";

const WAVE_HEIGHTS = [6, 14, 20, 10, 18, 8, 16, 12, 7];

function parseTimerSeconds(text) {
  const match = /^(\d+):(\d{2})$/.exec(String(text || "").trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatRecTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function pickFeedbackItem(items = []) {
  const withFeedback = items.filter((item) => (
    item.targetScore != null || item.dimensions?.length || item.evaluation
  ));
  if (!withFeedback.length) return null;
  return withFeedback.find((item) => item.current) || withFeedback[withFeedback.length - 1];
}

export function InterviewConsole({ session, model }) {
  if (!session?.showConsole) return null;
  return <InterviewConsoleInner session={session} model={model} />;
}

function InterviewConsoleInner({ session, model }) {
  const layout = session.layout || {};
  const status = session.status || {};
  const action = session.actionPanel || {};
  const panelItems = session.questionPanel?.items || [];
  const feedbackItem = pickFeedbackItem(panelItems);
  const timerSeconds = parseTimerSeconds(status.timerText);
  const timerLow = timerSeconds != null && timerSeconds <= 120;
  const panelStats = session.questionPanel?.stats || [];
  const focusStat = panelStats.find((item) => item.label === "方向" || item.label === "Focus");
  const focusChipText = focusStat?.value || "";
  const inQuestionFlow = panelItems.length > 0 && !action.nextHidden;

  const [ioTab, setIoTab] = useState("voice");
  const [recording, setRecording] = useState(false);
  const [recStartedAt, setRecStartedAt] = useState(null);
  const [, setRecTick] = useState(0);

  useEffect(() => {
    const btn = document.getElementById("voiceAnswerBtn");
    if (!btn) return undefined;
    const syncRecording = () => setRecording(btn.classList.contains("active-like"));
    syncRecording();
    const observer = new MutationObserver(syncRecording);
    observer.observe(btn, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!recording) {
      setRecStartedAt(null);
      return undefined;
    }
    setRecStartedAt(Date.now());
    const id = window.setInterval(() => setRecTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const recSeconds = recording && recStartedAt ? Math.floor((Date.now() - recStartedAt) / 1000) : 0;

  const ioTabs = [
    { key: "voice", label: "语音转写" },
    { key: "code", label: "代码" },
    { key: "board", label: "白板" }
  ];

  return (
    <div
      id="interviewConsole"
      className={`interview-console${layout.showPanel ? " show-panel" : ""}`}
    >
      <div className="interview-console-head">
        <div className="interview-console-head-main">
          <button className="interview-exit-btn" id="exitInterviewBtn" type="button" title="退出考场" aria-label="退出考场" onClick={model.exit}>
            <i data-lucide="log-out" />
            退出考场
          </button>
          <div>
            <strong id="interviewSessionTitle">{status.title}</strong>
            <small id="interviewQuestionStatus">{status.questionStatus}</small>
          </div>
        </div>
        {panelItems.length ? (
          <div className="interview-head-dots" aria-hidden="true">
            {panelItems.map((item) => (
              <span
                key={item.index}
                className={item.current ? "is-current" : (item.scored || item.wrapped ? "is-done" : "")}
              >
                {item.index + 1}
              </span>
            ))}
          </div>
        ) : null}
        <div className="interview-console-head-actions">
          {focusChipText ? (
            <div className="interview-head-chip" title="面试方向">
              <img src="/assets/generated/reward-target.webp" alt="" loading="lazy" draggable="false" />
              <span>{focusChipText}</span>
            </div>
          ) : null}
          <button
            className={`icon-button ghost interview-panel-toggle${action.showPanelToggle ? "" : " hidden"}${layout.showPanel ? " is-active" : ""}`}
            id="toggleInterviewPanelBtn"
            type="button"
            title="进度面板"
            aria-label="进度面板"
            aria-pressed={String(layout.showPanel)}
            onClick={model.togglePanel}
          >
            <i data-lucide="panel-right" />
          </button>
          <div id="interviewTimer" className={`interview-timer${timerLow ? " is-low" : ""}`}>
            <i data-lucide="clock" />
            <span className="interview-timer-text">{status.timerText}</span>
          </div>
        </div>
      </div>
      <div className="interview-workspace">
        <InterviewQuestionPanel
          panel={session.questionPanel}
          renderRichText={session.renderRichText}
          appendInlineRichText={session.appendInlineRichText}
          onToggleItem={model.setPanelExpandedIndex}
          onRequestHint={model.requestHint}
          hintHidden={action.hintHidden}
        />
        <div className="interview-io-col">
          <div className="interview-io-card">
            <div className="interview-io-tabs" role="tablist" aria-label="作答工作区">
              {ioTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={ioTab === tab.key}
                  className={`interview-io-tab${ioTab === tab.key ? " is-active" : ""}`}
                  onClick={() => setIoTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className={`interview-io-pane interview-io-voice${ioTab === "voice" ? "" : " hidden"}`}>
              <InterviewTranscript
                messages={session.messages}
                language={model.view.language}
                renderRichText={session.renderRichText}
                onAction={model.handleTranscriptAction}
                onActionValue={model.handleTranscriptActionValue}
              />
              {!action.voiceHidden ? (
                <div className={`interview-voice-row${recording ? " is-recording" : ""}`}>
                  <button
                    type="button"
                    className="interview-voice-mic"
                    title={recording ? "停止语音作答" : "语音作答"}
                    aria-label={recording ? "停止语音作答" : "语音作答"}
                    aria-pressed={recording}
                    onClick={model.toggleVoice}
                  >
                    <i data-lucide="mic" />
                  </button>
                  <div className="interview-voice-copy">
                    <strong>{recording ? "正在聆听…" : "开始作答"}</strong>
                    {recording ? (
                      <span className="interview-voice-waves" aria-hidden="true">
                        {WAVE_HEIGHTS.map((height, index) => (
                          <i
                            key={index}
                            style={{
                              "--wave-h": `${height}px`,
                              animationDuration: `${(0.7 + index * 0.07).toFixed(2)}s`,
                              animationDelay: `${(index * 0.05).toFixed(2)}s`
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      <small>点击麦克风开始作答，AI 将实时转写并评分</small>
                    )}
                  </div>
                  <span className="interview-voice-time">{formatRecTime(recSeconds)}</span>
                </div>
              ) : null}
            </div>
            <div className={`interview-io-pane interview-io-code${ioTab === "code" ? "" : " hidden"}`}>
              <InterviewCodePane />
            </div>
            <div className={`interview-io-pane interview-io-board${ioTab === "board" ? "" : " hidden"}`}>
              <InterviewWhiteboard />
            </div>
          </div>
          {feedbackItem ? (
            <section className="interview-feedback-panel" aria-label="AI 面试官反馈">
              <div className="interview-feedback-head">
                <img src="/assets/generated/playful-precision/avatar-focused-v2.png" alt="" loading="lazy" />
                <div className="interview-feedback-title">
                  <strong>AI 面试官反馈</strong>
                  <small>实时评估 · 仅你可见</small>
                </div>
                <div className="interview-feedback-score-wrap">
                  <strong>{feedbackItem.targetScore != null ? (feedbackItem.targetScore / 10).toFixed(1) : "--"}</strong>
                  <small>综合评分</small>
                </div>
              </div>
              {feedbackItem.dimensions?.length ? (
                <div className="interview-feedback-rubric">
                  {feedbackItem.dimensions.map((dim) => {
                    const pct = Math.max(0, Math.min(100, Math.round((Number(dim.score) / 5) * 100)));
                    const tone = pct >= 85 ? "high" : pct >= 75 ? "mid" : "low";
                    return (
                      <div key={dim.key} className="interview-rubric-row">
                        <div className="interview-rubric-meta">
                          <span>{dim.label}</span>
                          <b>{dim.score}/5</b>
                        </div>
                        <div className="interview-rubric-track">
                          <i className={`is-${tone}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {feedbackItem.evaluation ? (
                <div className="interview-feedback-tip">
                  <span className="interview-feedback-tip-label">建议 · </span>
                  <InterviewRichText
                    content={feedbackItem.evaluation}
                    renderInto={(node, text) => session.appendInlineRichText?.(node, text)}
                    className="interview-feedback-tip-body"
                  />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
      <form id="interviewForm" className="interview-form" onSubmit={model.submitAnswer}>
        <div className="interview-chat-input">
          <label id="interviewAnswerFileRow" className={`interview-attach-plus${action.answerFileRowHidden ? " hidden" : ""}`} title="上传图片或文件" aria-label="上传图片或文件">
            <input id="interviewAnswerFile" type="file" accept=".txt,.md,.tex,.pdf,text/*,application/pdf,image/*" onChange={model.updateAnswerFileMeta} />
            <i data-lucide="plus" />
            <span id="interviewAnswerFileMeta" className="sr-only">支持图片、文本文件和 PDF。</span>
          </label>
          <textarea
            id="interviewAnswer"
            rows={1}
            placeholder={action.answerPlaceholder || "输入你的回答"}
            disabled={action.answerDisabled}
            onInput={model.autoSizeAnswer}
            onKeyDown={model.handleAnswerKeydown}
          />
          <div id="interviewAttachmentPreview" className="interview-attachment-preview hidden" />
          <div className="interview-chat-actions">
            <button className={`icon-button ghost${action.voiceHidden ? " hidden" : ""}`} id="voiceAnswerBtn" type="button" title="语音作答" aria-label="语音作答" onClick={model.toggleVoice}>
              <i data-lucide="mic" />
            </button>
            <button className={`icon-button ghost${action.hintHidden ? " hidden" : ""}`} id="hintInterviewBtn" type="button" title="Hint" aria-label="Hint" onClick={model.requestHint}>
              <i data-lucide="lightbulb" />
            </button>
            <button className={`icon-button ghost${action.revealHidden ? " hidden" : ""}`} id="revealAnswerBtn" type="button" title="显示参考答案" aria-label="显示参考答案" onClick={model.revealAnswer}>
              <i data-lucide="book-open" />
            </button>
            <button className="icon-button accent interview-send-button" type="submit" title="提交回答" aria-label="提交回答" disabled={action.answerDisabled}>
              <i data-lucide="send" />
            </button>
          </div>
        </div>
      </form>
      <div id="interviewCompleteActions" className={`interview-complete-actions${action.completeActionsHidden ? " is-waiting" : ""}`}>
        <button
          className={`secondary-button interview-prev-btn${inQuestionFlow ? "" : " hidden"}`}
          type="button"
          disabled
          aria-disabled="true"
          title="本场面试不支持回到上一题"
        >
          ← 上一题
        </button>
        <button className={`primary-button interview-next-cta${action.nextHidden || (action.completeActionsHidden && !inQuestionFlow) ? " hidden" : ""}`} id="nextInterviewQuestionBtn" type="button" disabled={action.completeActionsHidden || action.nextDisabled} onClick={model.nextQuestion}>
          <i data-lucide="skip-forward" />
          下一题
        </button>
        <button className={`secondary-button${action.completeActionsHidden || action.saveHidden ? " hidden" : ""}`} id="saveInterviewFavoriteBtn" type="button" disabled={action.saveDisabled} onClick={model.saveFavorite}>
          <i data-lucide="bookmark-plus" />
          总结到收藏夹
        </button>
        <button className={`secondary-button${action.completeActionsHidden || action.shareHidden ? " hidden" : ""}`} id="shareInterviewQuestionBtn" type="button" disabled={action.shareDisabled} onClick={model.shareQuestion}>
          <i data-lucide="copy" />
          分享
        </button>
        <button className={`primary-button interview-next-cta${action.completeActionsHidden || action.restartHidden ? " hidden" : ""}`} id="restartInterviewBtn" type="button" onClick={model.restart}>
          <i data-lucide="rotate-ccw" />
          再来一场
        </button>
        <button className={`secondary-button${action.completeActionsHidden || action.exportHidden ? " hidden" : ""}`} id="exportInterviewReportBtn" type="button" onClick={model.exportReport}>
          <i data-lucide="file-down" />
          导出 PDF
        </button>
        <button className="secondary-button interview-finish-btn" id="finishInterviewBtn" type="button" onClick={model.exit}>
          结束并查看报告
        </button>
      </div>
      <InterviewFavorites
        summary={session.favorites?.summary}
        items={session.favorites?.items}
        emptyText={session.favorites?.emptyText}
      />
    </div>
  );
}

function InterviewCodePane() {
  const [code, setCode] = useState("");
  return (
    <div className="interview-code-pane">
      <div className="interview-code-editor">
        <div className="interview-code-chrome">
          <span className="interview-code-dot is-red" />
          <span className="interview-code-dot is-amber" />
          <span className="interview-code-dot is-green" />
          <small>solution.py</small>
        </div>
        <textarea
          className="interview-code-input"
          value={code}
          spellCheck={false}
          placeholder={"# 在这里写下代码草稿，配合口述验证思路\n# 内容仅保留在本地考场，不会自动提交"}
          onChange={(event) => setCode(event.target.value)}
          aria-label="代码草稿"
        />
      </div>
      <div className="interview-code-actions">
        <button type="button" className="interview-code-clear" onClick={() => setCode("")}>
          重置
        </button>
        <small>草稿不会自动提交，可复制进回答框。</small>
      </div>
    </div>
  );
}

function InterviewWhiteboard() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    let drawing = false;

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#5b5ff5";
    };

    const pointFromEvent = (event) => {
      const rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const onDown = (event) => {
      syncSize();
      drawing = true;
      canvas.setPointerCapture?.(event.pointerId);
      const [x, y] = pointFromEvent(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
      canvas.classList.add("has-strokes");
    };
    const onMove = (event) => {
      if (!drawing) return;
      const [x, y] = pointFromEvent(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const onUp = () => {
      drawing = false;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="interview-board-wrap">
      <canvas ref={canvasRef} className="interview-board-canvas" aria-label="白板" />
      <span className="interview-board-hint" aria-hidden="true">白板 · 拖动书写推导过程</span>
    </div>
  );
}
