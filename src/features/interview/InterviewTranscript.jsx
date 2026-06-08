import { useEffect, useRef } from "react";
import {
  getInterviewMessageAvatar,
  getInterviewMessageLabel
} from "../../modules/interview/format.js";
import { InterviewRichText } from "./InterviewRichText.jsx";

const COACH_AVATAR_SRC = "assets/generated/shark-avatar-happy.webp?v=premium-system-4";

export function InterviewTranscript({ messages = [], language = "zh", renderRichText, onAction, onActionValue }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    node.scrollTop = node.scrollHeight;
    return undefined;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      id="interviewTranscript"
      className="interview-transcript"
      onClick={onAction}
    >
      {messages.map((message, index) => (
        <InterviewTranscriptTurn
          key={message.id || `message-${index}`}
          message={message}
          language={language}
          renderRichText={renderRichText}
          onActionValue={onActionValue}
        />
      ))}
    </div>
  );
}

function InterviewTranscriptTurn({ message, language, renderRichText, onActionValue }) {
  const role = message.role || "system";
  const useZh = language !== "en";

  if (message.thinking) {
    return (
      <article className={`message-turn ${role}${message.grouped ? " is-grouped" : ""}`} data-message-id={message.id || undefined}>
        <div className={`message-avatar avatar-${role}`} aria-hidden="true" style={message.grouped ? { visibility: "hidden" } : undefined}>
          {role === "coach" ? <CoachAvatar /> : getInterviewMessageAvatar(role)}
        </div>
        <div className="message-stack">
          {!message.grouped ? <div className="message-meta">{getInterviewMessageLabel(role, language)}</div> : null}
          <div className={`message ${role} thinking`} aria-label={useZh ? "正在思考" : "Thinking"}>
            <span className="thinking-label">{useZh ? "分析回答" : "Analyzing"}</span>
            <span className="thinking-dots"><i /><i /><i /></span>
          </div>
        </div>
      </article>
    );
  }

  if (role === "user") {
    return (
      <article className={`message-turn ${role}${message.grouped ? " is-grouped" : ""}`} data-message-id={message.id || undefined}>
        <div className="message-stack">
          <div className={`message ${role}${message.compact ? " message-short" : ""}${message.variant ? ` message-${message.variant}` : ""}${message.typing ? " is-streaming" : ""}`}>
            {message.text}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`message-turn ${role}${message.grouped ? " is-grouped" : ""}${message.typing ? " is-streaming" : ""}`} data-message-id={message.id || undefined}>
      <div className={`message-avatar avatar-${role}`} aria-hidden="true" style={message.grouped ? { visibility: "hidden" } : undefined}>
        {role === "coach" ? <CoachAvatar /> : getInterviewMessageAvatar(role)}
      </div>
      <div className="message-stack">
        {!message.grouped ? <div className="message-meta">{getInterviewMessageLabel(role, language)}</div> : null}
        <div className={`message ${role}${message.variant ? ` message-${message.variant}` : ""}${message.typing ? " is-streaming" : ""}`}>
          <InterviewRichText content={message.text} renderInto={renderRichText} />
          {message.actions?.length ? (
            <div className="interview-action-tray">
              {message.actions.map((action) => (
                <button
                  key={`${message.id}-${action.value || action.label}`}
                  type="button"
                  className="interview-action-chip"
                  data-interview-action={message.actionStep || "choice"}
                  data-interview-action-value={action.value || action.label}
                  title={action.description || undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    onActionValue?.(action.value || action.label);
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CoachAvatar() {
  return (
    <div className="avatar-shark">
      <img src={COACH_AVATAR_SRC} alt="" loading="lazy" />
    </div>
  );
}
