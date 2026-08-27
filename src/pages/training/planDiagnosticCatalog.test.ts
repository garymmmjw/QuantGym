import {
  diagnosticAnswerRequestSchema,
  diagnosticQuestionIds,
  runPlanDiagnosticRequestSchema,
} from "../../domains/plan/plan.schema";
import {
  buildDiagnosticAnswerRequests,
  planDiagnosticCatalog,
  planDiagnosticDefinitionVersion,
} from "./planDiagnosticCatalog";

const expectedOptionIds = [
  ["37.5", "40", "42.5", "47.5"],
  ["1/8", "1/4", "3/8", "1/2"],
  ["3", "3.5", "4", "4.5"],
  [
    "null-is-true",
    "null-hypothesis-tail",
    "alternative-is-true",
    "model-accuracy",
  ],
  [
    "sell-to-market-maker",
    "buy-from-market-maker",
    "buy-and-sell",
    "no-fill",
  ],
  ["underlying", "strike", "premium-paid", "volatility"],
  ["queue", "hash-map", "linked-list", "heap-only"],
  ["random-k-fold", "walk-forward", "train-only", "reuse-test"],
] as const;

const validSelections = planDiagnosticCatalog.map((question) => ({
  optionId: question.options[0].optionId,
  questionId: question.questionId,
}));
const firstValidSelection = {
  optionId: planDiagnosticCatalog[0].options[0].optionId,
  questionId: planDiagnosticCatalog[0].questionId,
};

const collectObjectKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectObjectKeys);
  }
  if (value === null || typeof value !== "object") {
    return [];
  }
  return Object.entries(value).flatMap(([key, nestedValue]) => [
    key,
    ...collectObjectKeys(nestedValue),
  ]);
};

describe("baseline-v1 plan diagnostic catalog", () => {
  it("locks question IDs to the domain schema in canonical order", () => {
    expect(planDiagnosticDefinitionVersion).toBe("baseline-v1");
    expect(planDiagnosticCatalog.map(({ questionId }) => questionId)).toEqual(
      diagnosticQuestionIds,
    );
  });

  it("uses exactly the option slugs accepted by the service", () => {
    expect(planDiagnosticCatalog.map((question) => (
      question.options.map(({ optionId }) => optionId)
    ))).toEqual(expectedOptionIds);
  });

  it("ships bilingual display text without exposing answer metadata", () => {
    for (const question of planDiagnosticCatalog) {
      expect(question.prompt.zh.trim()).not.toBe("");
      expect(question.prompt.en.trim()).not.toBe("");
      for (const option of question.options) {
        expect(option.label.zh.trim()).not.toBe("");
        expect(option.label.en.trim()).not.toBe("");
      }
    }

    const keys = collectObjectKeys(planDiagnosticCatalog);
    expect(keys).not.toContain("answer");
    expect(keys).not.toContain("correctAnswer");
  });

  it("builds schema-valid answers in canonical question order", () => {
    const answers = buildDiagnosticAnswerRequests([...validSelections].reverse());

    expect(answers.map(({ questionId }) => questionId)).toEqual(
      diagnosticQuestionIds,
    );
    for (const answer of answers) {
      expect(diagnosticAnswerRequestSchema.parse(answer)).toEqual(answer);
    }
    expect(runPlanDiagnosticRequestSchema.parse({
      answers,
      definitionVersion: planDiagnosticDefinitionVersion,
      planVersion: 1,
    }).answers).toEqual(answers);
  });

  it("rejects a missing question", () => {
    expect(() => buildDiagnosticAnswerRequests(validSelections.slice(1)))
      .toThrow(`诊断缺少题目：${diagnosticQuestionIds[0]}`);
  });

  it("rejects a duplicate question", () => {
    expect(() => buildDiagnosticAnswerRequests([
      ...validSelections,
      firstValidSelection,
    ])).toThrow(`诊断题目重复作答：${diagnosticQuestionIds[0]}`);
  });

  it("rejects an unknown question", () => {
    expect(() => buildDiagnosticAnswerRequests([
      ...validSelections.slice(0, -1),
      { optionId: "walk-forward", questionId: "unknown-question" },
    ])).toThrow("未知诊断题目：unknown-question");
  });

  it("rejects an unknown option", () => {
    expect(() => buildDiagnosticAnswerRequests([
      { ...firstValidSelection, optionId: "unknown-option" },
      ...validSelections.slice(1),
    ])).toThrow(`题目 ${diagnosticQuestionIds[0]} 的选项无效：unknown-option`);
  });
});
