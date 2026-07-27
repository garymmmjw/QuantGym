import { QueryClient } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { notificationQueryKeys } from "../platform/notifications/notifications.queries";
import { planQueryKeys } from "../plan/plan.queries";
import { dashboardQueryKeys } from "../dashboard/dashboard.queries";
import { problemQueryKeys } from "../problems/problems.queries";
import {
  completeTrainingSession,
  invalidateTrainingCompletionReadModels,
  invalidateTrainingProgressReadModels,
  newCompleteTrainingIntent,
  newRevealTrainingSolutionIntent,
  newStartTrainingIntent,
  newSubmitTrainingAttemptIntent,
  newUseTrainingHintIntent,
  nextTrainingSessionVersion,
  revealTrainingSolution,
  startOrResumeTraining,
  submitTrainingAttempt,
  requestTrainingHint,
} from "./training.mutations";
import {
  getTrainingResult,
  trainingQueryKeys,
} from "./training.queries";

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";
const csrfProof = "session-proof-0123456789abcdef";
const problemId = "10000000-0000-4000-8000-000000000001";
const planTaskId = "20000000-0000-4000-8000-000000000002";
const sessionId = "30000000-0000-4000-8000-000000000003";
const hintEventId = "40000000-0000-4000-8000-000000000004";
const attemptEventId = "50000000-0000-4000-8000-000000000005";
const solutionEventId = "60000000-0000-4000-8000-000000000006";
const attemptId = "70000000-0000-4000-8000-000000000007";

const trainingResult = {
  completedAt: "2026-07-27T03:00:00Z",
  planEffect: { planVersion: 9, taskCompleted: true },
  problemId,
  score: 100,
  sessionId,
  sessionVersion: 5,
  xpDelta: 20,
} as const;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("daily training API client", () => {
  it("reuses a start idempotency key for one intent and gives a new intent a new key", async () => {
    const keys: string[] = [];
    server.use(
      http.post("*/api/v2/training/sessions", async ({ request }) => {
        keys.push(request.headers.get("x-idempotency-key") ?? "");
        expect(request.headers.get("x-csrf-token")).toBe(csrfProof);
        await expect(request.json()).resolves.toEqual({
          planTaskId,
          problemId,
        });
        return HttpResponse.json({
          problemId,
          resumed: keys.length > 1,
          sessionId,
          sessionVersion: 1,
        }, { status: 201 });
      }),
    );
    const intent = newStartTrainingIntent({ planTaskId, problemId });

    await startOrResumeTraining(intent, csrfProof);
    await startOrResumeTraining(intent, csrfProof);
    const nextIntent = newStartTrainingIntent({ planTaskId, problemId });
    await startOrResumeTraining(nextIntent, csrfProof);

    expect(keys).toEqual([
      intent.idempotencyKey,
      intent.idempotencyKey,
      nextIntent.idempotencyKey,
    ]);
    expect(nextIntent.idempotencyKey).not.toBe(intent.idempotencyKey);
  });

  it("carries every acknowledged session version through hint, attempt, solution, and completion", async () => {
    const answer = "0.5";
    server.use(
      http.post(
        "*/api/v2/training/sessions/:sessionId/hint",
        async ({ params, request }) => {
          expect(params.sessionId).toBe(sessionId);
          expect(request.headers.get("x-idempotency-key")).toMatch(
            /^[A-Za-z0-9._~-]{16,128}$/,
          );
          await expect(request.json()).resolves.toEqual({ version: 1 });
          return HttpResponse.json({
            eventId: hintEventId,
            eventSequence: 1,
            hintEn: "Use symmetry.",
            hintZh: "使用对称性。",
            sessionId,
            sessionVersion: 2,
          });
        },
      ),
      http.post(
        "*/api/v2/training/sessions/:sessionId/attempts",
        async ({ request }) => {
          expect(request.headers.get("x-idempotency-key")).toMatch(
            /^[A-Za-z0-9._~-]{16,128}$/,
          );
          await expect(request.json()).resolves.toEqual({
            answer,
            kind: "text",
            version: 2,
          });
          return HttpResponse.json({
            attemptId,
            eventId: attemptEventId,
            eventSequence: 2,
            score: 100,
            sessionId,
            sessionVersion: 3,
          }, { status: 201 });
        },
      ),
      http.post(
        "*/api/v2/training/sessions/:sessionId/solution",
        async ({ request }) => {
          expect(request.headers.get("x-idempotency-key")).toMatch(
            /^[A-Za-z0-9._~-]{16,128}$/,
          );
          await expect(request.json()).resolves.toEqual({ version: 3 });
          return HttpResponse.json({
            eventId: solutionEventId,
            eventSequence: 3,
            sessionId,
            sessionVersion: 4,
            solutionEn: "One half.",
            solutionZh: "二分之一。",
          });
        },
      ),
      http.post(
        "*/api/v2/training/sessions/:sessionId/complete",
        async ({ request }) => {
          expect(request.headers.get("x-idempotency-key")).toMatch(
            /^[A-Za-z0-9._~-]{16,128}$/,
          );
          await expect(request.json()).resolves.toEqual({
            attemptId,
            version: 4,
          });
          return HttpResponse.json({
            planEffect: { planVersion: 9, taskCompleted: true },
            sessionId,
            sessionVersion: 5,
            xpDelta: 20,
          });
        },
      ),
    );

    const hint = await requestTrainingHint(
      newUseTrainingHintIntent({ sessionId, sessionVersion: 1 }),
      csrfProof,
    );
    const attempt = await submitTrainingAttempt(
      newSubmitTrainingAttemptIntent(
        nextTrainingSessionVersion(hint),
        { answer, kind: "text" },
      ),
      csrfProof,
    );
    expect(attempt).not.toHaveProperty("answer");
    const solution = await revealTrainingSolution(
      newRevealTrainingSolutionIntent(nextTrainingSessionVersion(attempt)),
      csrfProof,
    );
    const completionIntent = newCompleteTrainingIntent(
      nextTrainingSessionVersion(solution),
      attempt.attemptId,
    );
    const first = await completeTrainingSession(completionIntent, csrfProof);
    const replay = await completeTrainingSession(completionIntent, csrfProof);

    expect(first).toEqual(replay);
    expect(first).toEqual({
      planEffect: { planVersion: 9, taskCompleted: true },
      sessionId,
      sessionVersion: 5,
      xpDelta: 20,
    });
  });

  it("gives every recoverable interaction a stable, per-intent server key", () => {
    const hint = newUseTrainingHintIntent({ sessionId, sessionVersion: 2 });
    const attempt = newSubmitTrainingAttemptIntent(
      { sessionId, sessionVersion: 2 },
      { answer: "answer", kind: "text" },
    );
    const solution = newRevealTrainingSolutionIntent({ sessionId, sessionVersion: 2 });

    expect(hint.idempotencyKey).toHaveLength(36);
    expect(attempt.idempotencyKey).toHaveLength(36);
    expect(solution.idempotencyKey).toHaveLength(36);
    expect(newUseTrainingHintIntent({ sessionId, sessionVersion: 2 }).idempotencyKey)
      .not.toBe(hint.idempotencyKey);
    expect(newSubmitTrainingAttemptIntent(
      { sessionId, sessionVersion: 2 },
      { answer: "answer", kind: "text" },
    ).idempotencyKey).not.toBe(attempt.idempotencyKey);
    expect(newRevealTrainingSolutionIntent({ sessionId, sessionVersion: 2 }).idempotencyKey)
      .not.toBe(solution.idempotencyKey);
  });

  it("loads a validated result through an abortable owner-scoped query", async () => {
    server.use(
      http.get(
        "*/api/v2/training/sessions/:sessionId/result",
        async () => {
          await delay("infinite");
          return HttpResponse.json(trainingResult);
        },
      ),
    );
    const controller = new AbortController();
    const pending = getTrainingResult(sessionId, controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(trainingQueryKeys.result(ownerScope, sessionId)).not.toEqual(
      trainingQueryKeys.result(otherOwnerScope, sessionId),
    );
  });

  it("rejects invalid result identifiers and payloads before they reach UI state", async () => {
    await expect(getTrainingResult("../foreign-session")).rejects.toThrow();

    server.use(
      http.get(
        "*/api/v2/training/sessions/:sessionId/result",
        () => HttpResponse.json({ ...trainingResult, score: 101 }),
      ),
    );
    await expect(getTrainingResult(sessionId)).rejects.toThrow();
  });

  it("invalidates every owner-confirmed completion read model without crossing accounts", async () => {
    const queryClient = new QueryClient();
    const ownerKeys = [
      trainingQueryKeys.result(ownerScope, sessionId),
      planQueryKeys.current(ownerScope),
      dashboardQueryKeys.overview(ownerScope),
      problemQueryKeys.detail(ownerScope, problemId),
      notificationQueryKeys.list(ownerScope, null),
    ];
    const otherOwnerKeys = [
      trainingQueryKeys.result(otherOwnerScope, sessionId),
      planQueryKeys.current(otherOwnerScope),
      dashboardQueryKeys.overview(otherOwnerScope),
      problemQueryKeys.detail(otherOwnerScope, problemId),
      notificationQueryKeys.list(otherOwnerScope, null),
    ];
    for (const key of [...ownerKeys, ...otherOwnerKeys]) {
      queryClient.setQueryData(key, { marker: key[1] });
    }

    await invalidateTrainingCompletionReadModels(
      queryClient,
      ownerScope,
      sessionId,
    );

    for (const key of ownerKeys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    for (const key of otherOwnerKeys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    }
    queryClient.clear();
  });

  it("invalidates problem progress and dashboard weakness after in-session events", async () => {
    const queryClient = new QueryClient();
    const ownerKeys = [
      dashboardQueryKeys.overview(ownerScope),
      problemQueryKeys.detail(ownerScope, problemId),
    ];
    const otherOwnerKeys = [
      dashboardQueryKeys.overview(otherOwnerScope),
      problemQueryKeys.detail(otherOwnerScope, problemId),
    ];
    for (const key of [...ownerKeys, ...otherOwnerKeys]) {
      queryClient.setQueryData(key, { marker: key[1] });
    }

    await invalidateTrainingProgressReadModels(queryClient, ownerScope);

    for (const key of ownerKeys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    for (const key of otherOwnerKeys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    }
    queryClient.clear();
  });
});
