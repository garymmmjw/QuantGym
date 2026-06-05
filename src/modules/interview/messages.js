export function buildInterviewMessage(role, text, options = {}) {
  const id = options.id || options.makeId?.() || `${Date.now()}-${Math.random()}`;
  const attachments = Array.isArray(options.attachments) ? options.attachments : [];
  const actions = Array.isArray(options.actions) ? options.actions : [];
  const actionStep = options.actionStep || "";
  const variant = options.variant || "";
  if (options.thinking) {
    return {
      id,
      typewriter: false,
      message: { id, role, text: "", displayText: "", typing: false, thinking: true, attachments, actions, actionStep, variant }
    };
  }
  const typewriter = options.typewriter ?? role === "coach";
  const fullText = String(text || "");
  return {
    id,
    typewriter,
    message: typewriter
      ? { id, role, text: fullText, displayText: "", typing: true, attachments, actions, actionStep, variant }
      : { id, role, text: fullText, displayText: fullText, typing: false, attachments, actions, actionStep, variant }
  };
}

export function appendInterviewMessageRecord(messages = [], role, text, options = {}) {
  const built = buildInterviewMessage(role, text, options);
  return {
    id: built.id,
    typewriter: built.typewriter,
    messages: [...(Array.isArray(messages) ? messages : []), built.message]
  };
}

export function updateInterviewMessageRecord(messages = [], id, text, options = {}) {
  const fullText = String(text || "");
  return (Array.isArray(messages) ? messages : []).map((message) => (
    message.id === id ? {
      ...message,
      text: fullText,
      displayText: fullText,
      typing: false,
      thinking: false,
      attachments: options.attachments || message.attachments || [],
      actions: options.actions || message.actions || [],
      actionStep: options.actionStep || message.actionStep || "",
      variant: options.variant || message.variant || ""
    } : message
  ));
}

export function getInterviewTypingStep(text = "") {
  return Math.max(1, Math.ceil(String(text || "").length / 130));
}

export function startInterviewTypingState(messages = [], id, text) {
  const fullText = String(text || "");
  return {
    fullText,
    index: 0,
    step: getInterviewTypingStep(fullText),
    messages: (Array.isArray(messages) ? messages : []).map((message) => (
      message.id === id ? { ...message, text: fullText, displayText: "", typing: true, thinking: false } : message
    ))
  };
}

export function advanceInterviewTypingState(messages = [], id, fullText, index = 0, step = 1) {
  const source = String(fullText || "");
  const nextIndex = Math.min(source.length, Number(index || 0) + Math.max(1, Number(step || 1)));
  const displayText = source.slice(0, nextIndex);
  const done = nextIndex >= source.length;
  return {
    index: nextIndex,
    displayText,
    done,
    messages: (Array.isArray(messages) ? messages : []).map((message) => (
      message.id === id ? { ...message, displayText, typing: !done } : message
    ))
  };
}
