const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

import {
  mutateTraining,
  type TrainingMutationIntent,
} from "./training.mutations";

const csrfProof = "csrf-proof-1234567890abcdef";
const problemId = "29584c83-7297-44ef-b985-f38e6c95de76";
const sessionId = "19584c83-7297-44ef-b985-f38e6c95de76";
const attemptId = "39584c83-7297-44ef-b985-f38e6c95de76";

describe("training mutation signal propagation", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("passes one caller signal through every training mutation API", async () => {
    const controller = new AbortController();
    const intents: readonly TrainingMutationIntent[] = [
      {
        idempotencyKey: "training-start-signal-12345",
        kind: "start",
        request: { problemId },
      },
      {
        idempotencyKey: "training-hint-signal-123456",
        kind: "hint",
        request: { version: 1 },
        sessionId,
      },
      {
        idempotencyKey: "training-attempt-signal-1234",
        kind: "attempt",
        request: { answer: "O(n)", kind: "text", version: 2 },
        sessionId,
      },
      {
        idempotencyKey: "training-solution-signal-123",
        kind: "solution",
        request: { version: 3 },
        sessionId,
      },
      {
        idempotencyKey: "training-complete-signal-123",
        kind: "complete",
        request: { attemptId, version: 4 },
        sessionId,
      },
    ];
    const responses = [
      {
        problemId,
        resumed: false,
        sessionId,
        sessionVersion: 1,
      },
      {
        eventId: "49584c83-7297-44ef-b985-f38e6c95de76",
        eventSequence: 1,
        hintEn: "Use symmetry.",
        hintZh: "使用对称性。",
        sessionId,
        sessionVersion: 2,
      },
      {
        attemptId,
        eventId: "59584c83-7297-44ef-b985-f38e6c95de76",
        eventSequence: 2,
        score: 100,
        sessionId,
        sessionVersion: 3,
      },
      {
        eventId: "69584c83-7297-44ef-b985-f38e6c95de76",
        eventSequence: 3,
        sessionId,
        sessionVersion: 4,
        solutionEn: "One half.",
        solutionZh: "二分之一。",
      },
      {
        nextAction: { problemId: null, target: "overview" },
        planEffect: { planVersion: 9, taskCompleted: true },
        sessionId,
        sessionVersion: 5,
        skillEffect: {
          currentBestScore: 100,
          delta: 20,
          previousBestScore: 80,
          skillKey: "arrays",
        },
        xpDelta: 20,
      },
    ] as const;
    for (const response of responses) {
      apiRequestMock.mockResolvedValueOnce(response);
    }

    for (const intent of intents) {
      await mutateTraining(intent, csrfProof, controller.signal);
    }

    expect(apiRequestMock).toHaveBeenCalledTimes(5);
    for (const [, requestOptions] of apiRequestMock.mock.calls) {
      expect(requestOptions).toEqual(expect.objectContaining({
        signal: controller.signal,
      }));
    }
  });
});
