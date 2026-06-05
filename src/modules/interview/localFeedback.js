import { clampNumber } from "../../lib/number.js";
import {
  formatStructuredInterviewFeedback as formatStructuredInterviewFeedbackView,
  parseInterviewFeedbackEvaluation,
  parseInterviewFeedbackScore
} from "./format.js";
import { normalizeRichTextContent } from "./richText.js";

const dimensionKeys = ["correctness", "reasoning", "communication", "speed", "readiness"];

function normalizeLanguage(language) {
  return language === "en" ? "en" : "zh";
}

function normalizeCategoryValue(problem, options = {}) {
  return options.normalizeCategory ? options.normalizeCategory(problem.category) : String(problem.category || "");
}

function localizedProblemField(problem, field, isEn, options = {}) {
  if (options.getLocalizedProblemField) return options.getLocalizedProblemField(problem, field, isEn);
  const suffix = isEn ? "En" : "Zh";
  return problem?.[`${field}${suffix}`] || problem?.[field] || "";
}

export function isBehavioralLikeProblem(problem = {}, options = {}) {
  const tags = Array.isArray(problem.tags) ? problem.tags.join(" ") : String(problem.tags || "");
  return options.interviewType === "behavioral"
    || /behavioral|resume|research|deep-dive|STAR/i.test(tags)
    || /^behavioral-|^resume-|^research-/i.test(String(problem.id || ""));
}

export function getLocalInterviewMissingSignals(problem, answer, options = {}) {
  const language = normalizeLanguage(options.language);
  const missing = [];
  if (isBehavioralLikeProblem(problem, options)) {
    if (!/(situation|task|action|result|star|背景|任务|行动|结果|我负责|我做|反思|learn|impact|影响)/i.test(answer)) {
      missing.push(language === "zh" ? "STAR 结构和个人责任" : "STAR structure and personal ownership");
    }
    if (!/(\d+|%|percent|baseline|metric|指标|提升|降低|节省|用户|收益|准确率|延迟|成本)/i.test(answer)) {
      missing.push(language === "zh" ? "具体证据或可量化结果" : "specific evidence or measurable result");
    }
    return missing;
  }

  const category = normalizeCategoryValue(problem, options);
  if (category === "leetcode" && !/(o\(|time|space|复杂度|哈希|hash|dp|binary|二分)/i.test(answer)) {
    missing.push(language === "zh" ? "复杂度或关键数据结构" : "complexity or core data structure");
  }
  if (category === "cppProgramming" && !/(c\+\+|const|static|virtual|pointer|reference|lifetime|memory|thread|class|inherit|指针|引用|虚函数|多态|抽象类|生命周期|内存|线程|常量|静态)/i.test(answer)) {
    missing.push(language === "zh" ? "C++ 语义、内存或对象生命周期" : "C++ semantics, memory, or object lifetime");
  }
  if (category === "probabilityExpectation" && !/(期望|概率|条件|bayes|expect|prob|conditional|sample space)/i.test(answer)) {
    missing.push(language === "zh" ? "随机变量或条件概率结构" : "random variable or conditioning structure");
  }
  if (category === "statistics" && !/(p-value|hypothesis|置信|检验|估计|regression|回归|sample|抽样)/i.test(answer)) {
    missing.push(language === "zh" ? "统计假设、估计或样本结构" : "statistical hypothesis, estimator, or sampling setup");
  }
  if (category === "calculus" && !/(limit|derivative|integral|l'hospital|differential|ode|极限|导数|积分|洛必达|微分方程|常微分)/i.test(answer)) {
    missing.push(language === "zh" ? "极限、导数、积分或微分方程步骤" : "limit, derivative, integral, or differential-equation step");
  }
  if (category === "algebra" && !/(inequality|induction|polynomial|binomial|algebra|不等式|归纳|多项式|二项式|代数)/i.test(answer)) {
    missing.push(language === "zh" ? "代数变形、不等式条件或归纳结构" : "algebraic manipulation, inequality condition, or induction structure");
  }
  if (category === "linearAlgebra" && !/(matrix|eigen|determinant|semidefinite|definite|rank|矩阵|特征值|特征向量|行列式|半正定|正定|秩)/i.test(answer)) {
    missing.push(language === "zh" ? "矩阵、特征值或正定性条件" : "matrix, eigenvalue, or definiteness condition");
  }
  if (category === "optimization" && !/(decision variable|objective|constraint|dual|slack|linear program|quadratic program|network flow|决策变量|目标函数|约束|对偶|松弛|线性规划|二次规划|网络流)/i.test(answer)) {
    missing.push(language === "zh" ? "决策变量、目标函数或约束结构" : "decision variables, objective, or constraint structure");
  }
  if (category === "complexNumbers" && !/(complex|imaginary|euler|polar|logarithm|branch|复数|虚数|欧拉|极形式|对数|分支)/i.test(answer)) {
    missing.push(language === "zh" ? "复数表示、欧拉公式或分支选择" : "complex representation, Euler formula, or branch choice");
  }
  if (category === "machineLearning" && !/(feature|特征|validation|验证|overfit|过拟合|metric|指标|model|模型)/i.test(answer)) {
    missing.push(language === "zh" ? "特征、验证或指标" : "features, validation, or metrics");
  }
  if (category === "deepLearning" && !/(gradient|梯度|loss|attention|transformer|backprop|反向传播|neural|神经)/i.test(answer)) {
    missing.push(language === "zh" ? "梯度、loss 或网络结构" : "gradients, loss, or architecture");
  }
  if (category === "market" && !/(risk|inventory|spread|fair|风险|库存|价差|公允)/i.test(answer)) {
    missing.push(language === "zh" ? "风险、库存或价差" : "risk, inventory, or spread");
  }
  if (category === "option" && !/(delta|gamma|vega|theta|vol|iv|波动率|期权|对冲|hedge)/i.test(answer)) {
    missing.push(language === "zh" ? "Greeks、波动率或对冲逻辑" : "Greeks, volatility, or hedging logic");
  }
  return missing;
}

export function getInterviewMaxFollowups(problem = {}, options = {}) {
  const category = normalizeCategoryValue(problem, options);
  const difficulty = String(problem.difficulty || "").toLowerCase();
  const configDifficulty = options.configDifficulty || "";
  if (configDifficulty === "easy" || difficulty === "easy") return 2;
  if (configDifficulty === "hard" || difficulty === "hard") return category === "mentalMath" ? 2 : 4;
  return category === "market" || category === "statistics" || category === "machineLearning" ? 3 : 2;
}

export function localInterviewConverse(problem, conversation = {}, options = {}) {
  const language = normalizeLanguage(options.language);
  const missing = getLocalInterviewMissingSignals(problem, (conversation.turns || []).map((turn) => turn.text).join(" "), options);
  const shouldWrap = (conversation.followupCount || 0) >= Math.max(1, (conversation.maxFollowups || 2) - 1);
  if (shouldWrap) {
    return {
      action: "wrap",
      message: language === "zh"
        ? "好的，这题先到这里。我们进入下一题。"
        : "Good, we will stop this question here and move on.",
      coverage: [],
      missing,
      runningAssessment: missing.length
        ? (language === "zh" ? `仍缺少：${missing.join("、")}` : `Still missing: ${missing.join(", ")}`)
        : (language === "zh" ? "回答已覆盖主要方向。" : "The answer covered the main direction.")
    };
  }
  if (isBehavioralLikeProblem(problem, options)) {
    const followups = language === "zh"
      ? [
        "能给一个具体例子吗？请说清楚当时背景、你的动作和结果。",
        "这个结果怎么衡量？如果没有数字，有什么证据说明它真的有影响？",
        "复盘来看，如果重来一次，你会改变哪一步？"
      ]
      : [
        "Can you give one concrete example with context, your action, and the result?",
        "How did you measure the outcome? If there is no metric, what evidence shows impact?",
        "Looking back, what would you change if you did it again?"
      ];
    return {
      action: "followup",
      message: followups[Math.min(followups.length - 1, conversation.followupCount || 0)],
      coverage: [],
      missing,
      runningAssessment: language === "zh" ? "需要更具体的行为证据。" : "Needs more specific behavioral evidence."
    };
  }

  const category = normalizeCategoryValue(problem, options);
  const followups = {
    leetcode: language === "zh" ? "请把时间复杂度、空间复杂度和关键数据结构说清楚。" : "Clarify the time complexity, space complexity, and core data structure.",
    cppProgramming: language === "zh" ? "请说明 C++ 语义、对象生命周期或内存/const 边界。" : "Clarify the C++ semantics, object lifetime, or memory/const boundary.",
    probabilityExpectation: language === "zh" ? "请明确随机变量和条件概率结构，再继续推导。" : "Define the random variables and conditioning structure, then continue.",
    statistics: language === "zh" ? "请说明样本、估计量或检验假设，以及你如何验证结论。" : "State the sample, estimator or hypothesis, and how you would validate the conclusion.",
    calculus: language === "zh" ? "请说明用到的极限、导数、积分或微分方程步骤。" : "Clarify the limit, derivative, integral, or differential-equation step you are using.",
    algebra: language === "zh" ? "请把代数恒等变形、不等式条件或归纳步骤说清楚。" : "Clarify the algebraic manipulation, inequality condition, or induction step.",
    linearAlgebra: language === "zh" ? "请说明矩阵、特征值、正定性或线性空间条件。" : "Clarify the matrix, eigenvalue, definiteness, or vector-space condition.",
    optimization: language === "zh" ? "请明确决策变量、目标函数、约束和对偶/松弛解释。" : "Clarify the decision variables, objective, constraints, and dual or slack interpretation.",
    complexNumbers: language === "zh" ? "请说明复数表示、分支选择或欧拉公式的使用。" : "Clarify the complex representation, branch choice, or Euler-formula step.",
    machineLearning: language === "zh" ? "请补充特征、验证方式和如何避免 leakage。" : "Add features, validation, and how you would avoid leakage.",
    deepLearning: language === "zh" ? "请说明输入输出、loss 和训练信号。" : "Clarify inputs, outputs, loss, and training signal.",
    market: language === "zh" ? "请把 fair value、spread 和 inventory risk 的关系讲清楚。" : "Clarify the relationship between fair value, spread, and inventory risk.",
    option: language === "zh" ? "请补充 Greeks、波动率或对冲频率会如何影响答案。" : "Add how Greeks, volatility, or hedge frequency affects the answer.",
    mentalMath: language === "zh" ? "请用更快的数量级估算方式重算一遍。" : "Redo it with a faster order-of-magnitude estimate."
  };
  return {
    action: "followup",
    message: followups[category] || (language === "zh" ? "请更具体一点：你的关键假设是什么？" : "Be more specific: what is your key assumption?"),
    coverage: [],
    missing,
    runningAssessment: language === "zh" ? "需要继续追问。" : "Needs another follow-up."
  };
}

export function scoreLocalInterviewAnswer(answer, missingCount) {
  const lengthBonus = Math.min(20, Math.round(String(answer || "").trim().length / 18));
  return Math.round(clampNumber(48 + lengthBonus - missingCount * 12, 20, 92));
}

export function getLocalInterviewEvaluation(answer, missing, options = {}) {
  const language = normalizeLanguage(options.language);
  if (!missing.length && String(answer || "").trim().length > 60) {
    return language === "zh"
      ? "核心方向已覆盖，再把边界条件和最终结论压得更清楚。"
      : "The core direction is covered; make the edge cases and final conclusion sharper.";
  }

  return language === "zh"
    ? `优先补上${missing.join("、") || "更明确的中间推导"}。`
    : `Prioritize ${missing.join(", ") || "clearer intermediate reasoning"}.`;
}

export function getInterviewReferenceSummary(problem, options = {}) {
  const language = normalizeLanguage(options.language);
  const isEn = language === "en";
  const raw = [
    localizedProblemField(problem, "answer", isEn, options),
    localizedProblemField(problem, "explanation", isEn, options)
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) {
    return language === "zh"
      ? "围绕题干建立变量、说明推导，再给出可验证结论。"
      : "Define the variables, explain the reasoning, then give a checkable conclusion.";
  }
  return raw.slice(0, language === "zh" ? 180 : 240);
}

export function localStructuredInterviewFeedback(problem, answer, options = {}) {
  const language = normalizeLanguage(options.language);
  const missing = getLocalInterviewMissingSignals(problem, answer, options);
  const score = scoreLocalInterviewAnswer(answer, missing.length);
  const evaluation = getLocalInterviewEvaluation(answer, missing, { language });
  const reference = getInterviewReferenceSummary(problem, options);
  const nextStep = missing.length
    ? [language === "zh" ? `补齐 ${missing.join("、")}，再用 60 秒重讲一遍。` : `Add ${missing.join(", ")} and restate the answer in 60 seconds.`]
    : [language === "zh" ? "把最终结论提前，并补一句复杂度、风险或边界条件。" : "Lead with the final conclusion and add one complexity, risk, or edge-case line."];
  const dimensionBase = Math.round(clampNumber(score / 20, 1, 5));
  return {
    overall: score,
    summary: evaluation,
    dimensions: {
      correctness: { score: clampNumber(dimensionBase - (missing.length ? 1 : 0), 1, 5), comment: missing.length ? missing[0] : (language === "zh" ? "核心方向覆盖。" : "Core direction covered.") },
      reasoning: { score: dimensionBase, comment: language === "zh" ? "推理需要显式写出关键步骤。" : "Make the key steps explicit." },
      communication: { score: Math.min(5, dimensionBase + 1), comment: language === "zh" ? "先结论后展开会更像面试答案。" : "Lead with the conclusion, then expand." },
      speed: { score: dimensionBase, comment: language === "zh" ? "保持 60 秒版本。" : "Keep a 60-second version ready." },
      readiness: { score: dimensionBase, comment: language === "zh" ? "可进入下一轮，但仍需补齐要点。" : "Usable with some missing details." }
    },
    missing,
    interviewerConcern: missing.length
      ? (language === "zh" ? `真实面试中会担心：${missing.join("、")}没有说清。` : `A real interviewer may worry that ${missing.join(", ")} was not clear.`)
      : (language === "zh" ? "真实面试中主要风险是结论不够前置。" : "The main interview risk is not leading with the conclusion."),
    referenceDelta: reference,
    nextStep
  };
}

export function localInterviewFeedback(problem, answer, options = {}) {
  return formatStructuredInterviewFeedbackView(localStructuredInterviewFeedback(problem, answer, options), {
    language: normalizeLanguage(options.language)
  });
}

export function normalizeInterviewFeedback(input, problem, answer, options = {}) {
  const language = normalizeLanguage(options.language);
  if (input && typeof input === "object") {
    const structured = normalizeStructuredInterviewFeedback(input.feedback || input, problem, answer, options);
    return {
      score: structured.overall,
      evaluation: structured.summary || parseInterviewFeedbackEvaluation(formatStructuredInterviewFeedbackView(structured, { language })),
      dimensions: structured.dimensions,
      missing: structured.missing,
      interviewerConcern: structured.interviewerConcern,
      referenceDelta: structured.referenceDelta,
      nextStep: structured.nextStep,
      text: formatStructuredInterviewFeedbackView(structured, { language })
    };
  }
  const raw = normalizeRichTextContent(input).trim();
  const local = localInterviewFeedback(problem, answer, options);
  const score = parseInterviewFeedbackScore(raw) ?? parseInterviewFeedbackScore(local) ?? 0;
  const evaluation = parseInterviewFeedbackEvaluation(raw) || parseInterviewFeedbackEvaluation(local);
  const displayText = raw || local;
  const hasScoreLine = parseInterviewFeedbackScore(displayText) != null;
  return {
    score,
    evaluation,
    text: hasScoreLine
      ? displayText
      : (language === "zh" ? `得分：${score}/100\n\n${displayText}` : `Score: ${score}/100\n\n${displayText}`)
  };
}

export function normalizeStructuredInterviewFeedback(input, problem, answer, options = {}) {
  const local = localStructuredInterviewFeedback(problem, answer, options);
  const source = input && typeof input === "object" ? input : {};
  const dimensions = source.dimensions && typeof source.dimensions === "object" ? source.dimensions : local.dimensions;
  return {
    overall: Math.round(clampNumber(source.overall ?? source.score ?? local.overall, 0, 100)),
    summary: String(source.summary || source.evaluation || local.summary || "").trim(),
    dimensions: normalizeInterviewDimensions(dimensions, local.dimensions),
    missing: Array.isArray(source.missing) ? source.missing.map(String).filter(Boolean).slice(0, 6) : local.missing,
    interviewerConcern: String(source.interviewerConcern || source.concern || local.interviewerConcern || "").trim(),
    referenceDelta: String(source.referenceDelta || source.reference || local.referenceDelta || "").trim(),
    nextStep: Array.isArray(source.nextStep) ? source.nextStep.map(String).filter(Boolean).slice(0, 4) : local.nextStep
  };
}

export function normalizeInterviewDimensions(dimensions, fallback = {}) {
  return Object.fromEntries(dimensionKeys.map((key) => {
    const item = dimensions?.[key] || fallback[key] || {};
    return [key, {
      score: Math.round(clampNumber(item.score ?? item.value ?? 3, 0, 5)),
      comment: String(item.comment || item.note || "").trim()
    }];
  }));
}

export function localInterviewHint(problem, options = {}) {
  const language = normalizeLanguage(options.language);
  const randomChoice = options.randomChoice || ((items) => items[Math.floor(Math.random() * items.length)]);
  const category = normalizeCategoryValue(problem, options);
  const hints = {
    leetcode: ["先说 brute force，再说如何优化。", "明确输入规模、时间复杂度和关键数据结构。"],
    cppProgramming: ["先说语言语义，再说边界和代价。", "注意对象生命周期、const、指针/引用或线程安全。"],
    pandasNumpy: ["先说明表结构和目标列。", "考虑 groupby、merge、pivot 或向量化。"],
    probabilityExpectation: ["先定义随机变量和样本空间。", "尝试条件期望或递推。"],
    statistics: ["先说假设、样本、估计量和评价指标。", "区分 correlation、causality 和 sampling bias。"],
    calculus: ["先确定这是极限、导数、积分还是微分方程。", "把换元、分部积分或边界条件写清楚。"],
    algebra: ["先写出要证明的不等式或恒等式。", "考虑归纳、展开或构造平方项。"],
    linearAlgebra: ["先写矩阵条件和目标量。", "考虑特征值、行列式或正定性。"],
    optimization: ["先定义决策变量、目标函数和约束。", "检查 binding 约束、对偶变量或网络流结构。"],
    complexNumbers: ["先选定复数表示和对数分支。", "考虑欧拉公式或极形式。"],
    machineLearning: ["先定义 label、feature 和 validation。", "说明避免 leakage 和 overfitting 的方法。"],
    deepLearning: ["先说输入、输出、loss 和训练信号。", "如果有序列或注意力，明确 token/embedding 结构。"],
    market: ["从 fair value、spread、inventory risk 三个角度开始。", "把市场微观结构和风险约束讲清楚。"],
    option: ["先定位 payoff 和 Greeks。", "说明波动率、对冲频率和 tail risk。"],
    mentalMath: ["先做数量级估计。", "把复杂计算拆成百分比、平方或分数。"]
  };
  const translation = {
    "先说 brute force，再说如何优化。": "Start with brute force, then explain the optimization.",
    "明确输入规模、时间复杂度和关键数据结构。": "Clarify input size, time complexity, and the key data structure.",
    "先说语言语义，再说边界和代价。": "Start with language semantics, then discuss boundaries and cost.",
    "注意对象生命周期、const、指针/引用或线程安全。": "Watch object lifetime, const, pointers/references, or thread safety.",
    "先说明表结构和目标列。": "Start by describing the table schema and target columns.",
    "考虑 groupby、merge、pivot 或向量化。": "Consider groupby, merge, pivot, or vectorization.",
    "先定义随机变量和样本空间。": "Define the random variables and sample space first.",
    "尝试条件期望或递推。": "Try conditional expectation or recurrence.",
    "先说假设、样本、估计量和评价指标。": "State the hypothesis, sample, estimator, and evaluation metric.",
    "区分 correlation、causality 和 sampling bias。": "Separate correlation, causality, and sampling bias.",
    "先确定这是极限、导数、积分还是微分方程。": "First identify whether this is a limit, derivative, integral, or differential equation.",
    "把换元、分部积分或边界条件写清楚。": "Make the substitution, integration by parts, or boundary condition explicit.",
    "先写出要证明的不等式或恒等式。": "Start by writing the inequality or identity to be proved.",
    "考虑归纳、展开或构造平方项。": "Consider induction, expansion, or completing a square.",
    "先写矩阵条件和目标量。": "Start with the matrix condition and target quantity.",
    "考虑特征值、行列式或正定性。": "Consider eigenvalues, determinants, or definiteness.",
    "先定义决策变量、目标函数和约束。": "Define the decision variables, objective, and constraints first.",
    "检查 binding 约束、对偶变量或网络流结构。": "Check binding constraints, dual variables, or network-flow structure.",
    "先选定复数表示和对数分支。": "Choose the complex representation and logarithm branch first.",
    "考虑欧拉公式或极形式。": "Consider Euler's formula or polar form.",
    "先定义 label、feature 和 validation。": "Define labels, features, and validation.",
    "说明避免 leakage 和 overfitting 的方法。": "Explain how you avoid leakage and overfitting.",
    "先说输入、输出、loss 和训练信号。": "Start with input, output, loss, and training signal.",
    "如果有序列或注意力，明确 token/embedding 结构。": "For sequence or attention problems, clarify tokens and embeddings.",
    "从 fair value、spread、inventory risk 三个角度开始。": "Start from fair value, spread, and inventory risk.",
    "把市场微观结构和风险约束讲清楚。": "Make market microstructure and risk constraints explicit.",
    "先定位 payoff 和 Greeks。": "Identify payoff and Greeks first.",
    "说明波动率、对冲频率和 tail risk。": "Explain volatility, hedge frequency, and tail risk.",
    "先做数量级估计。": "Start with an order-of-magnitude estimate.",
    "把复杂计算拆成百分比、平方或分数。": "Break the calculation into percentages, squares, or fractions."
  };
  const hint = randomChoice(hints[category] || hints.probabilityExpectation);
  return language === "zh" ? `Hint：${hint}` : `Hint: ${translation[hint] || hint}`;
}
