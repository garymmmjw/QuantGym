import { InterviewFavorites } from "./InterviewFavorites.jsx";
import { InterviewQuestionPanel } from "./InterviewQuestionPanel.jsx";
import { InterviewTranscript } from "./InterviewTranscript.jsx";

export function InterviewConsole({ session, model }) {
  if (!session?.showConsole) return null;

  const layout = session.layout || {};
  const status = session.status || {};
  const action = session.actionPanel || {};

  return (
    <div
      id="interviewConsole"
      className={`interview-console${layout.showPanel ? " show-panel" : ""}`}
    >
      <div className="interview-console-head">
        <div className="interview-console-head-main">
          <button className="interview-exit-btn" id="exitInterviewBtn" type="button" title="退出模拟面试" aria-label="退出模拟面试" onClick={model.exit}>
            <i data-lucide="log-out" />
            退出
          </button>
          <div>
            <strong id="interviewSessionTitle">{status.title}</strong>
            <small id="interviewQuestionStatus">{status.questionStatus}</small>
          </div>
        </div>
        <div className="interview-console-head-actions">
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
          <div id="interviewTimer" className="interview-timer">{status.timerText}</div>
        </div>
      </div>
      <div className="interview-workspace">
        <InterviewTranscript
          messages={session.messages}
          language={model.view.language}
          renderRichText={session.renderRichText}
          onAction={model.handleTranscriptAction}
          onActionValue={model.handleTranscriptActionValue}
        />
        <InterviewQuestionPanel
          panel={session.questionPanel}
          renderRichText={session.renderRichText}
          appendInlineRichText={session.appendInlineRichText}
          onToggleItem={model.setPanelExpandedIndex}
        />
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
      <div id="interviewCompleteActions" className={`interview-complete-actions${action.completeActionsHidden ? " hidden" : ""}`}>
        <button className={`primary-button${action.nextHidden ? " hidden" : ""}`} id="nextInterviewQuestionBtn" type="button" disabled={action.nextDisabled} onClick={model.nextQuestion}>
          <i data-lucide="skip-forward" />
          下一题
        </button>
        <button className={`secondary-button${action.saveHidden ? " hidden" : ""}`} id="saveInterviewFavoriteBtn" type="button" disabled={action.saveDisabled} onClick={model.saveFavorite}>
          <i data-lucide="bookmark-plus" />
          总结到收藏夹
        </button>
        <button className={`secondary-button${action.shareHidden ? " hidden" : ""}`} id="shareInterviewQuestionBtn" type="button" disabled={action.shareDisabled} onClick={model.shareQuestion}>
          <i data-lucide="copy" />
          分享
        </button>
        <button className={`primary-button${action.restartHidden ? " hidden" : ""}`} id="restartInterviewBtn" type="button" onClick={model.restart}>
          <i data-lucide="rotate-ccw" />
          再来一场
        </button>
        <button className={`secondary-button${action.exportHidden ? " hidden" : ""}`} id="exportInterviewReportBtn" type="button" onClick={model.exportReport}>
          <i data-lucide="file-down" />
          导出 PDF
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
