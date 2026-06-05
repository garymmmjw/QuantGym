export function getInterviewQuestionSpeechText(problem = {}, options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const title = language === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
  const prompt = language === "zh" ? problem.promptZh || problem.promptEn : problem.promptEn || problem.promptZh;
  return [title, prompt].filter(Boolean).join(". ");
}

export function normalizeInterviewSpeechText(text, options = {}) {
  const normalizeRichText = options.normalizeRichText || ((value) => String(value || ""));
  return normalizeRichText(text)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/[#*_`>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

export function getInterviewSpeechLanguage(language = "zh") {
  return language === "en" ? "en-US" : "zh-CN";
}

export function stopInterviewSpeechSynthesis(speechSynthesis = globalThis.speechSynthesis) {
  if (speechSynthesis?.speaking || speechSynthesis?.pending) {
    speechSynthesis.cancel();
    return true;
  }
  return false;
}

export function speakInterviewText(text, options = {}) {
  const {
    enabled = true,
    language = "zh",
    speechSynthesis = globalThis.speechSynthesis,
    SpeechSynthesisUtteranceCtor = globalThis.SpeechSynthesisUtterance,
    normalizeRichText
  } = options;
  if (!enabled || !speechSynthesis || !SpeechSynthesisUtteranceCtor) return false;
  const cleanText = normalizeInterviewSpeechText(text, { normalizeRichText });
  if (!cleanText) return false;
  stopInterviewSpeechSynthesis(speechSynthesis);
  const utterance = new SpeechSynthesisUtteranceCtor(cleanText);
  utterance.lang = getInterviewSpeechLanguage(language);
  utterance.rate = language === "zh" ? 0.96 : 1;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
  return true;
}

export function getSpeechRecognitionConstructor(windowRef = globalThis) {
  return windowRef?.SpeechRecognition || windowRef?.webkitSpeechRecognition || null;
}

export function getVoiceUnsupportedMessage(language = "zh") {
  return language === "en"
    ? "Speech recognition is not supported in this browser. Use text answer instead."
    : "当前浏览器不支持语音识别，请使用文字作答。";
}

export function extractSpeechTranscript(event = {}) {
  return [...(event.results || [])]
    .map((result) => result?.[0]?.transcript || "")
    .join(" ")
    .trim();
}

export function createInterviewVoiceRecognition(options = {}) {
  const {
    SpeechRecognitionCtor,
    language = "zh",
    onTranscript,
    onEnd
  } = options;
  if (!SpeechRecognitionCtor) return null;
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = getInterviewSpeechLanguage(language);
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.addEventListener("result", (event) => {
    const transcript = extractSpeechTranscript(event);
    if (transcript) onTranscript?.(transcript);
  });
  recognition.addEventListener("end", () => {
    onEnd?.();
  });
  return recognition;
}

export function stopInterviewVoiceRecognition(recognition) {
  if (!recognition) return false;
  recognition.stop();
  return true;
}
