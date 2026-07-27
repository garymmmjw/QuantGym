import {
  diagnosticAnswerRequestSchema,
  diagnosticQuestionIds,
  type DiagnosticAnswerRequest,
} from "../../domains/plan/plan.schema";

export const planDiagnosticDefinitionVersion = "baseline-v1" as const;

export type PlanDiagnosticQuestionId = (typeof diagnosticQuestionIds)[number];

export interface LocalizedDiagnosticText {
  readonly en: string;
  readonly zh: string;
}

export interface PlanDiagnosticOption {
  readonly label: LocalizedDiagnosticText;
  readonly optionId: string;
}

export interface PlanDiagnosticQuestion {
  readonly options: readonly PlanDiagnosticOption[];
  readonly prompt: LocalizedDiagnosticText;
  readonly questionId: PlanDiagnosticQuestionId;
  readonly skillKey: string;
}

export interface DiagnosticAnswerSelection {
  readonly optionId: string;
  readonly questionId: string;
}

export const planDiagnosticCatalog = [
  {
    options: [
      { label: { en: "37.5", zh: "37.5" }, optionId: "37.5" },
      { label: { en: "40", zh: "40" }, optionId: "40" },
      { label: { en: "42.5", zh: "42.5" }, optionId: "42.5" },
      { label: { en: "47.5", zh: "47.5" }, optionId: "47.5" },
    ],
    prompt: {
      en: "Without a calculator, what is 17% of 250?",
      zh: "不使用计算器，250 的 17% 等于多少？",
    },
    questionId: "mm-percent",
    skillKey: "mentalMath",
  },
  {
    options: [
      { label: { en: "1/8", zh: "1/8" }, optionId: "1/8" },
      { label: { en: "1/4", zh: "1/4" }, optionId: "1/4" },
      { label: { en: "3/8", zh: "3/8" }, optionId: "3/8" },
      { label: { en: "1/2", zh: "1/2" }, optionId: "1/2" },
    ],
    prompt: {
      en: "A fair coin is flipped three times. What is the probability of getting exactly two heads?",
      zh: "公平硬币抛 3 次，恰好出现 2 次正面的概率是？",
    },
    questionId: "prob-coin",
    skillKey: "probabilityExpectation",
  },
  {
    options: [
      { label: { en: "3", zh: "3" }, optionId: "3" },
      { label: { en: "3.5", zh: "3.5" }, optionId: "3.5" },
      { label: { en: "4", zh: "4" }, optionId: "4" },
      { label: { en: "4.5", zh: "4.5" }, optionId: "4.5" },
    ],
    prompt: {
      en: "What is the expected value of a fair six-sided die?",
      zh: "公平六面骰子的期望点数是？",
    },
    questionId: "prob-die",
    skillKey: "probabilityExpectation",
  },
  {
    options: [
      {
        label: {
          en: "The null hypothesis has a 3% probability of being true",
          zh: "原假设为真的概率是 3%",
        },
        optionId: "null-is-true",
      },
      {
        label: {
          en: "Under the null hypothesis, the probability of this result or a more extreme one is 3%",
          zh: "在原假设下观察到同样或更极端结果的概率为 3%",
        },
        optionId: "null-hypothesis-tail",
      },
      {
        label: {
          en: "The alternative hypothesis has a 97% probability of being true",
          zh: "备择假设为真的概率是 97%",
        },
        optionId: "alternative-is-true",
      },
      {
        label: {
          en: "The model is 97% accurate",
          zh: "模型准确率是 97%",
        },
        optionId: "model-accuracy",
      },
    ],
    prompt: {
      en: "What is the most accurate interpretation of a p-value of 0.03?",
      zh: "p-value = 0.03 最准确的含义是？",
    },
    questionId: "stats-pvalue",
    skillKey: "statistics",
  },
  {
    options: [
      {
        label: { en: "Sell to the market maker", zh: "向做市商卖出" },
        optionId: "sell-to-market-maker",
      },
      {
        label: { en: "Buy from the market maker", zh: "从做市商买入" },
        optionId: "buy-from-market-maker",
      },
      {
        label: { en: "Buy and sell at the same time", zh: "同时买卖" },
        optionId: "buy-and-sell",
      },
      {
        label: { en: "No trade is executed", zh: "没有成交" },
        optionId: "no-fill",
      },
    ],
    prompt: {
      en: "With a quote of bid 99 / ask 101, what does trading at 101 mean you did?",
      zh: "报价 bid 99 / ask 101 时，你以 101 成交意味着你做了什么？",
    },
    questionId: "market-spread",
    skillKey: "market",
  },
  {
    options: [
      {
        label: { en: "The underlying price", zh: "标的价格" },
        optionId: "underlying",
      },
      {
        label: { en: "The strike price", zh: "行权价" },
        optionId: "strike",
      },
      {
        label: { en: "The premium paid", zh: "已付权利金" },
        optionId: "premium-paid",
      },
      {
        label: { en: "Volatility", zh: "波动率" },
        optionId: "volatility",
      },
    ],
    prompt: {
      en: "What usually limits the maximum loss for the holder of a European call option?",
      zh: "持有欧式 call 的最大亏损通常受限于什么？",
    },
    questionId: "option-call",
    skillKey: "option",
  },
  {
    options: [
      { label: { en: "Queue", zh: "队列" }, optionId: "queue" },
      { label: { en: "Hash map", zh: "哈希表" }, optionId: "hash-map" },
      {
        label: { en: "Linked list", zh: "链表" },
        optionId: "linked-list",
      },
      {
        label: { en: "Heap only", zh: "仅使用堆" },
        optionId: "heap-only",
      },
    ],
    prompt: {
      en: "Which core data structure is commonly used to solve Two Sum in one pass?",
      zh: "在一次遍历中求 Two Sum，常用的核心数据结构是？",
    },
    questionId: "code-two-sum",
    skillKey: "leetcode",
  },
  {
    options: [
      {
        label: { en: "Randomly shuffled K-fold", zh: "随机打乱 K-fold" },
        optionId: "random-k-fold",
      },
      {
        label: { en: "Walk-forward validation", zh: "按时间滚动/前向验证" },
        optionId: "walk-forward",
      },
      {
        label: { en: "Evaluate only on the training set", zh: "只看训练集" },
        optionId: "train-only",
      },
      {
        label: {
          en: "Repeatedly tune against the test set",
          zh: "重复使用测试集调参",
        },
        optionId: "reuse-test",
      },
    ],
    prompt: {
      en: "Which validation method is more appropriate for avoiding future-data leakage in time-series forecasting?",
      zh: "时间序列预测里，为避免未来信息泄漏，更合适的验证方式是？",
    },
    questionId: "research-validation",
    skillKey: "machineLearning",
  },
] as const satisfies readonly PlanDiagnosticQuestion[];

/**
 * Converts UI selections into the canonical server order after validating that
 * every baseline question is answered exactly once with a supported option.
 */
export const buildDiagnosticAnswerRequests = (
  selections: readonly DiagnosticAnswerSelection[],
): DiagnosticAnswerRequest[] => {
  const answersByQuestionId = new Map<
    PlanDiagnosticQuestionId,
    DiagnosticAnswerRequest
  >();

  for (const selection of selections) {
    const question = planDiagnosticCatalog.find(
      ({ questionId }) => questionId === selection.questionId,
    );
    if (question === undefined) {
      throw new Error(`未知诊断题目：${selection.questionId}`);
    }
    if (answersByQuestionId.has(question.questionId)) {
      throw new Error(`诊断题目重复作答：${question.questionId}`);
    }
    if (!question.options.some(
      ({ optionId }) => optionId === selection.optionId,
    )) {
      throw new Error(
        `题目 ${question.questionId} 的选项无效：${selection.optionId}`,
      );
    }

    const answer = diagnosticAnswerRequestSchema.parse({
      optionId: selection.optionId,
      questionId: question.questionId,
    });
    answersByQuestionId.set(question.questionId, answer);
  }

  return diagnosticQuestionIds.map((questionId) => {
    const answer = answersByQuestionId.get(questionId);
    if (answer === undefined) {
      throw new Error(`诊断缺少题目：${questionId}`);
    }
    return answer;
  });
};
