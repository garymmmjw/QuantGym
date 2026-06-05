import { clampNumber } from '../../lib/number.js';
import {
  interviewDifficultyDefs,
  interviewFocusDefs,
  interviewModeDefs,
  interviewOnboardingSteps,
  interviewPersonaDefs
} from './defs.js';

export function getInterviewOnboardingPrompt(step = "language", options = {}) {
  const uiLanguage = options.uiLanguage === "en" ? "en" : "zh";
  const useZh = uiLanguage !== "en";
  const modeDefs = options.modeDefs || interviewModeDefs;
  const focusDefs = options.focusDefs || interviewFocusDefs;
  const difficultyDefs = options.difficultyDefs || interviewDifficultyDefs;
  const personaDefs = options.personaDefs || interviewPersonaDefs;
  const modeOptions = Object.entries(modeDefs).map(([value, item]) => ({
    value,
    label: useZh ? item.labelZh : item.labelEn,
    description: useZh ? item.descriptionZh : item.descriptionEn
  }));
  const focusOptions = Object.entries(focusDefs).map(([value, item]) => ({
    value,
    label: useZh ? item.labelZh : item.labelEn
  }));
  const difficultyOptions = Object.entries(difficultyDefs).map(([value, item]) => ({
    value,
    label: useZh ? item.labelZh : item.labelEn
  }));
  const personaOptions = Object.entries(personaDefs).map(([value, item]) => ({
    value,
    label: useZh ? item.labelZh : item.labelEn
  }));

  const prompts = {
    language: {
      text: useZh ? "今天的面试想用什么语言？" : "Which language should we use for this interview?",
      actions: [
        { value: "zh", label: "中文" },
        { value: "en", label: "English" }
      ]
    },
    mode: {
      text: useZh ? "好的，本场我会全程使用中文。你想进行真实模拟面试，还是训练练习？" : "Great. Should this be a live mock interview or a practice session?",
      actions: modeOptions
    },
    focus: {
      text: useZh ? "今天主要想练哪一类题？" : "What should we focus on today?",
      actions: focusOptions
    },
    difficulty: {
      text: useZh ? "难度希望设成什么？" : "What difficulty should I use?",
      actions: difficultyOptions
    },
    scope: {
      text: useZh ? "这场想做多少题，或者按时长来？" : "How many questions, or should we run by time?",
      actions: [
        { value: "3", label: useZh ? "3 题" : "3 questions" },
        { value: "5", label: useZh ? "5 题" : "5 questions" },
        { value: "10", label: useZh ? "10 题" : "10 questions" },
        { value: "30m", label: useZh ? "30 分钟" : "30 minutes" }
      ]
    },
    persona: {
      text: useZh ? "你希望面试官是什么风格？" : "What interviewer style do you want?",
      actions: personaOptions
    },
    tts: {
      text: useZh ? "最后一个设置：要不要开启读题？" : "Last setting: should I read questions aloud?",
      actions: [
        { value: "on", label: useZh ? "开启读题" : "Read aloud" },
        { value: "off", label: useZh ? "关闭读题" : "Text only" }
      ]
    }
  };
  return prompts[step] || prompts.language;
}

export function parseInterviewOnboardingAnswer(step = "", value = "", options = {}) {
  const modeDefs = options.modeDefs || interviewModeDefs;
  const focusDefs = options.focusDefs || interviewFocusDefs;
  const difficultyDefs = options.difficultyDefs || interviewDifficultyDefs;
  const personaDefs = options.personaDefs || interviewPersonaDefs;
  const language = options.language === "en" ? "en" : "zh";
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  const useZh = language !== "en";
  const fail = () => ({
    ok: false,
    message: useZh ? "我没有完全识别这个设置。可以点一下快捷选项，或换一种说法。" : "I could not read that setting. Use a quick option or phrase it another way."
  });

  if (step === "language") {
    if (/^(en|english)$/i.test(lower) || /英/.test(raw)) return { ok: true, value: "en", label: "English" };
    if (/^(zh|cn|chinese|中文)$/i.test(lower) || /中/.test(raw)) return { ok: true, value: "zh", label: "中文" };
    return fail();
  }

  if (step === "mode") {
    if (/live|real|mock|真实|正式|模拟真实/.test(lower) || /真实|正式/.test(raw)) {
      const item = modeDefs.live;
      return { ok: true, value: "live", label: useZh ? item.labelZh : item.labelEn };
    }
    if (/practice|train|练习|训练|刷题/.test(lower) || /练习|训练/.test(raw)) {
      const item = modeDefs.practice;
      return { ok: true, value: "practice", label: useZh ? item.labelZh : item.labelEn };
    }
    if (modeDefs[lower]) {
      const item = modeDefs[lower];
      return { ok: true, value: lower, label: useZh ? item.labelZh : item.labelEn };
    }
    return fail();
  }

  if (step === "focus") {
    const directFocus = Object.keys(focusDefs).find((key) => key.toLowerCase() === lower);
    if (directFocus) {
      const item = focusDefs[directFocus];
      return { ok: true, value: directFocus, label: useZh ? item.labelZh : item.labelEn };
    }
    const aliases = {
      mixed: ["mixed", "mix", "综合", "混合", "随机"],
      probability: ["probability", "statistics", "stats", "概率", "统计"],
      algorithms: ["algorithm", "algorithms", "leetcode", "oa", "算法"],
      ml: ["ml", "machine learning", "deep learning", "机器学习", "深度学习"],
      market: ["market", "trading", "市场", "交易", "直觉"],
      marketMaking: ["market making", "making", "做市", "bid", "ask"],
      behavioral: ["behavioral", "behavior", "行为", "star"],
      resume: ["resume", "cv", "简历"],
      research: ["research", "project", "研究", "项目深挖", "论文"]
    };
    const match = Object.entries(aliases).find(([key, words]) => key === lower || words.some((word) => lower.includes(word) || raw.includes(word)));
    if (!match) return fail();
    const item = focusDefs[match[0]];
    return { ok: true, value: match[0], label: useZh ? item.labelZh : item.labelEn };
  }

  if (step === "difficulty") {
    const aliases = {
      easy: ["easy", "简单", "基础"],
      medium: ["medium", "中等", "普通"],
      hard: ["hard", "困难", "高难", "难"],
      adaptive: ["adaptive", "自适应", "动态"]
    };
    const match = Object.entries(aliases).find(([key, words]) => key === lower || words.some((word) => lower.includes(word) || raw.includes(word)));
    if (!match) return fail();
    const item = difficultyDefs[match[0]];
    return { ok: true, value: match[0], label: useZh ? item.labelZh : item.labelEn };
  }

  if (step === "scope") {
    const number = Number((lower.match(/\d+/) || [])[0]);
    if (/30m|minute|minutes|分钟|时长/.test(lower) || /分钟|时长/.test(raw)) {
      return { ok: true, value: { durationMinutes: number || 30, questionCount: 0 }, label: useZh ? `${number || 30} 分钟` : `${number || 30} minutes` };
    }
    if (Number.isFinite(number) && number > 0) {
      const questionCount = Math.round(clampNumber(number, 1, 12));
      return { ok: true, value: { questionCount, durationMinutes: 0 }, label: useZh ? `${questionCount} 题` : `${questionCount} questions` };
    }
    return fail();
  }

  if (step === "persona") {
    const aliases = {
      friendly: ["friendly", "kind", "友好", "引导", "温和"],
      neutral: ["neutral", "professional", "中性", "专业"],
      pressure: ["pressure", "stress", "fast", "高压", "快节奏", "严格"]
    };
    const match = Object.entries(aliases).find(([key, words]) => key === lower || words.some((word) => lower.includes(word) || raw.includes(word)));
    if (!match) return fail();
    const item = personaDefs[match[0]];
    return { ok: true, value: match[0], label: useZh ? item.labelZh : item.labelEn };
  }

  if (step === "tts") {
    const enabled = !(/off|no|false|关闭|不要|不用|文字/.test(lower) || /关闭|不要|不用|文字/.test(raw));
    return { ok: true, value: enabled, label: enabled ? (useZh ? "开启读题" : "Read aloud") : (useZh ? "关闭读题" : "Text only") };
  }

  return fail();
}

export function getNextInterviewOnboardingStep(step = "", steps = interviewOnboardingSteps) {
  const index = steps.indexOf(step);
  return index >= 0 ? steps[index + 1] || "" : "";
}
