import { useEffect, useRef } from "react";
import {
  getInterviewMessageAvatar,
  getInterviewMessageLabel
} from "../../modules/interview/format.js";
import {
  isImageAttachment,
  isSafeRichMediaUrl
} from "../../modules/interview/richText.js";
import { InterviewRichText } from "./InterviewRichText.jsx";
import { getQuantySrc } from "../../lib/quantyAssets.js";

const COACH_AVATAR_SRC = getQuantySrc("happy", 160);

export function InterviewTranscript({ messages = [], language = "zh", renderRichText, onAction, onActionValue }) {
  const containerRef = useRef(null);
  // Snapshot the message keys present on first render: history bubbles never
  // get the entrance animation; only messages appended afterwards do.
  const initialKeysRef = useRef(null);
  if (initialKeysRef.current === null) {
    initialKeysRef.current = new Set(
      messages.map((message, index) => message.id || `message-${index}`)
    );
  }

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
      {messages.map((message, index) => {
        const key = message.id || `message-${index}`;
        return (
          <InterviewTranscriptTurn
            key={key}
            message={message}
            language={language}
            renderRichText={renderRichText}
            onActionValue={onActionValue}
            entering={!initialKeysRef.current.has(key)}
          />
        );
      })}
    </div>
  );
}

function InterviewTranscriptTurn({ message, language, renderRichText, onActionValue, entering = false }) {
  const role = message.role || "system";
  const useZh = language !== "en";
  const enterClass = entering ? " is-entering" : "";

  if (message.thinking) {
    return (
      <article className={`message-turn ${role}${message.grouped ? " is-grouped" : ""}${enterClass}`} data-message-id={message.id || undefined}>
        <div className={`message-avatar avatar-${role}`} aria-hidden="true" style={message.grouped ? { visibility: "hidden" } : undefined}>
          {role === "coach" ? <CoachAvatar /> : getInterviewMessageAvatar(role)}
        </div>
        <div className="message-stack">
          <div className={`message ${role} thinking`} aria-label={useZh ? "正在思考" : "Thinking"}>
            <span className="thinking-label">{useZh ? "分析回答" : "Analyzing"}</span>
            <span className="thinking-dots"><i /><i /><i /></span>
          </div>
          {!message.grouped ? <div className="message-meta">{getInterviewMessageLabel(role, language)}</div> : null}
        </div>
      </article>
    );
  }

  if (role === "user") {
    return (
      <article className={`message-turn ${role}${message.grouped ? " is-grouped" : ""}${enterClass}`} data-message-id={message.id || undefined}>
        <div className="message-stack">
          <div className={`message ${role}${message.compact ? " message-short" : ""}${message.variant ? ` message-${message.variant}` : ""}${message.typing ? " is-streaming" : ""}`}>
            {message.text}
            <InterviewMessageAttachments attachments={message.attachments} language={language} />
          </div>
          {!message.grouped ? <div className="message-meta">{getInterviewMessageLabel(role, language)}</div> : null}
        </div>
      </article>
    );
  }

  return (
    <article className={`message-turn ${role}${message.grouped ? " is-grouped" : ""}${message.typing ? " is-streaming" : ""}${enterClass}`} data-message-id={message.id || undefined}>
      <div className={`message-avatar avatar-${role}`} aria-hidden="true" style={message.grouped ? { visibility: "hidden" } : undefined}>
        {role === "coach" ? <CoachAvatar /> : getInterviewMessageAvatar(role)}
      </div>
      <div className="message-stack">
        <div className={`message ${role}${message.variant ? ` message-${message.variant}` : ""}${message.typing ? " is-streaming" : ""}`}>
          <InterviewRichText content={message.text} renderInto={renderRichText} />
          <InterviewMessageAttachments attachments={message.attachments} language={language} />
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
        {!message.grouped ? <div className="message-meta">{getInterviewMessageLabel(role, language)}</div> : null}
      </div>
    </article>
  );
}

function InterviewMessageAttachments({ attachments = [], language = "zh" }) {
  const safeAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  if (!safeAttachments.length) return null;
  const fallbackName = language === "en" ? "Attachment" : "附件";

  return (
    <div className="message-attachments">
      {safeAttachments.map((attachment, index) => {
        const src = attachment.dataUrl || attachment.url || "";
        const showImage = isImageAttachment(attachment) && src && isSafeRichMediaUrl(src);
        const size = attachment.size ? `${Math.max(1, Math.round(Number(attachment.size) / 1024))} KB` : "";
        const label = [
          attachment.name || fallbackName,
          size
        ].filter(Boolean).join(" · ");
        return (
          <div className="message-attachment" key={`${attachment.name || "attachment"}-${attachment.size || 0}-${index}`}>
            {showImage ? (
              <img className="rich-media" src={src} alt={attachment.name || "Uploaded image"} loading="lazy" />
            ) : null}
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function CoachAvatar() {
  return (
    <div className="avatar-shark">
      <img src={COACH_AVATAR_SRC} alt="" loading="lazy" />
    </div>
  );
}
