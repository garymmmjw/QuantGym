import {
  getInterviewMessageAvatar,
  getInterviewMessageLabel,
  isCompactInterviewReply
} from './format.js';
import {
  appendInterviewActions,
  appendMessageAttachments,
  renderRichText
} from './richText.js';

const COACH_AVATAR_SRC = "assets/generated/shark-avatar-happy.webp?v=premium-system-4";

export function getInterviewEmptyTranscriptText(language = "zh") {
  return language === "en"
    ? "Once we start, I will confirm focus, difficulty, scope, and style through chat, then move into the first question."
    : "进入后，我会用对话和你确认方向、难度、题量和风格，然后自然进入第一题。";
}

export function appendInterviewMessageNode(container, role, text, options = {}) {
  if (!container) return null;
  const language = options.language === "en" ? "en" : "zh";
  const typing = Boolean(options.typing);
  const thinking = Boolean(options.thinking);
  const grouped = Boolean(options.grouped);
  const turn = document.createElement("article");
  turn.className = `message-turn ${role}`;
  if (options.id) turn.dataset.messageId = options.id;
  if (options.variant) turn.classList.add(`message-${options.variant}`);
  if (typing) turn.classList.add("is-streaming");
  if (grouped) turn.classList.add("is-grouped");

  const avatar = document.createElement("div");
  avatar.className = `message-avatar avatar-${role}`;
  avatar.setAttribute("aria-hidden", "true");
  if (role === "coach") {
    avatar.classList.add("avatar-shark");
    const coachImg = document.createElement("img");
    coachImg.src = options.coachAvatarSrc || COACH_AVATAR_SRC;
    coachImg.alt = "";
    coachImg.loading = "lazy";
    avatar.appendChild(coachImg);
  } else {
    avatar.textContent = getInterviewMessageAvatar(role);
  }
  if (grouped) avatar.style.visibility = "hidden";

  const stack = document.createElement("div");
  stack.className = "message-stack";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = getInterviewMessageLabel(role, language);
  const node = document.createElement("div");
  node.className = `message ${role}`;
  if (options.variant) node.classList.add(`message-${options.variant}`);
  if (role === "user" && isCompactInterviewReply(text)) node.classList.add("message-short");

  if (thinking) {
    node.classList.add("thinking");
    node.setAttribute("aria-label", language === "zh" ? "正在思考" : "Thinking");
    const thinkingLabel = document.createElement("span");
    thinkingLabel.className = "thinking-label";
    thinkingLabel.textContent = language === "zh" ? "分析回答" : "Analyzing";
    node.appendChild(thinkingLabel);
    const dots = document.createElement("span");
    dots.className = "thinking-dots";
    for (let index = 0; index < 3; index += 1) {
      dots.appendChild(document.createElement("i"));
    }
    node.appendChild(dots);
  } else if (typing) {
    renderRichText(node, text, { language });
  } else {
    renderRichText(node, text, { language });
    appendMessageAttachments(node, options.attachments || [], { language });
    appendInterviewActions(node, options.actions || [], options.actionStep || "", {
      isCurrentOnboardingStep: options.isCurrentOnboardingStep
    });
  }

  if (role === "user") {
    stack.append(node);
    turn.append(stack);
  } else {
    if (!grouped) stack.append(meta);
    stack.append(node);
    turn.append(avatar, stack);
  }
  container.appendChild(turn);
  return turn;
}

export function renderInterviewTranscript(container, messages = [], options = {}) {
  if (!container) return;
  const language = options.language === "en" ? "en" : "zh";
  const safeMessages = Array.isArray(messages) ? messages : [];
  container.innerHTML = "";
  if (!safeMessages.length) {
    appendInterviewMessageNode(container, "system", getInterviewEmptyTranscriptText(language), {
      language,
      isCurrentOnboardingStep: options.isCurrentOnboardingStep
    });
    return;
  }

  let prevRole = null;
  safeMessages.forEach((message) => {
    const grouped = message.role !== "user" && message.role === prevRole;
    appendInterviewMessageNode(container, message.role, message.displayText ?? message.text, {
      id: message.id,
      language,
      typing: message.typing,
      thinking: message.thinking,
      attachments: message.attachments || [],
      actions: message.actions || [],
      actionStep: message.actionStep || "",
      variant: message.variant || "",
      grouped,
      isCurrentOnboardingStep: options.isCurrentOnboardingStep
    });
    prevRole = message.role;
  });
  container.scrollTop = container.scrollHeight;
  if (!safeMessages.some((message) => message.typing)) {
    options.scheduleMathTypeset?.(container);
  }
}
