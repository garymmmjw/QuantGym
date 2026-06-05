import {
  advanceInterviewTypingState,
  appendInterviewMessageRecord,
  startInterviewTypingState,
  updateInterviewMessageRecord
} from './messages.js';

export function createInterviewMessageController(deps = {}) {
  const elements = deps.elements || {};
  const windowRef = deps.windowRef || globalThis;
  const getMessages = deps.getMessages || (() => []);
  const setMessages = deps.setMessages || (() => {});

  function appendMessage(role, text, options = {}) {
    const result = appendInterviewMessageRecord(getMessages(), role, text, {
      ...options,
      makeId: deps.makeId
    });
    setMessages(result.messages);
    deps.renderTranscript?.();
    if (result.typewriter) startTyping(result.id, text);
    return result.id;
  }

  function updateMessage(id, text, options = {}) {
    stopTyping(id);
    if (options.typewriter) {
      startTyping(id, text);
      return;
    }
    setMessages(updateInterviewMessageRecord(getMessages(), id, text, options));
    deps.renderTranscript?.();
  }

  function startTyping(id, text) {
    const typingState = startInterviewTypingState(getMessages(), id, text);
    const { fullText, step } = typingState;
    let { index } = typingState;
    setMessages(typingState.messages);
    deps.renderTranscript?.();

    const findTurn = () => elements.interviewTranscript?.querySelector?.(`[data-message-id="${id}"]`);
    const timer = windowRef.setInterval?.(() => {
      const nextState = advanceInterviewTypingState(getMessages(), id, fullText, index, step);
      index = nextState.index;
      setMessages(nextState.messages);

      if (nextState.done) {
        stopTyping(id);
        deps.renderTranscript?.();
        deps.scheduleMathTypeset?.(elements.interviewTranscript);
        return;
      }

      const turn = findTurn();
      const node = turn?.querySelector?.(".message");
      if (node) {
        deps.renderRichText?.(node, nextState.displayText);
        if (elements.interviewTranscript) {
          elements.interviewTranscript.scrollTop = elements.interviewTranscript.scrollHeight;
        }
      } else {
        deps.renderTranscript?.();
      }
    }, 42);
    deps.setTypingTimer?.(id, timer);
  }

  function stopTyping(id) {
    deps.clearTypingTimer?.(id);
  }

  return {
    appendMessage,
    startTyping,
    stopTyping,
    updateMessage
  };
}
