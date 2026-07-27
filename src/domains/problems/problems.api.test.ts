import { QueryClient } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import {
  acknowledgeProblemFavorite,
  acknowledgeProblemNote,
  newSaveProblemNoteIntent,
  newSetProblemFavoriteIntent,
  saveProblemNote,
  setProblemFavorite,
} from "./problems.mutations";
import {
  getProblem,
  getProblems,
  normalizeProblemListFilters,
  problemQueryKeys,
} from "./problems.queries";
import type {
  FavoriteState,
  ProblemDetail,
  ProblemListResponse,
  ProblemNote,
  ProblemSummary,
} from "./problems.schema";

const problemId = "30000000-0000-4000-8000-000000000003";
const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";
const csrfProof = "session-proof-0123456789abcdef";

const unfavorited: FavoriteState = {
  favorite: false,
  stateId: null,
  updatedAt: null,
  version: null,
};

const summary: ProblemSummary = {
  category: "Array",
  companies: ["QuantGym"],
  difficulty: "Medium",
  favorite: unfavorited,
  hot100: true,
  id: problemId,
  noteExists: false,
  noteVersion: null,
  progress: {
    attemptCount: 0,
    bestScore: null,
    completedAt: null,
    hintCount: 0,
    lastPracticedAt: null,
    lastScore: null,
    solutionRevealedAt: null,
    status: "unstarted",
    version: null,
  },
  source: {
    contentVersion: "preview-v1",
    name: "QuantGym Preview",
    slug: "quantgym-preview",
  },
  tags: ["array", "hash-table"],
  titleEn: "Two Sum",
  titleZh: "两数之和",
  version: 1,
};

const detail: ProblemDetail = {
  ...summary,
  note: null,
  promptEn: "Return the two indices.",
  promptZh: "返回两个下标。",
};

const page: ProblemListResponse = {
  availableSources: [summary.source],
  items: [summary],
  nextCursor: null,
};

const favoriteAcknowledgement: FavoriteState = {
  favorite: true,
  stateId: "50000000-0000-4000-8000-000000000005",
  updatedAt: "2026-07-27T02:05:00Z",
  version: 1,
};

const noteAcknowledgement: ProblemNote = {
  body: "用 Map 保存已经看过的值。",
  updatedAt: "2026-07-27T02:06:00Z",
  version: 1,
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("problems typed client", () => {
  it("normalizes filters, safely encodes the URL, and validates the MSW response", async () => {
    server.use(http.get("*/api/v2/problems", ({ request }) => {
      const url = new URL(request.url);
      expect([...url.searchParams.entries()]).toEqual([
        ["q", "two sum"],
        ["source", "quantgym-preview"],
        ["difficulty", "Medium"],
        ["status", "in_progress"],
        ["favorite", "false"],
        ["hot100", "true"],
        ["daily", "true"],
        ["cursor", "page +/=?"],
        ["limit", "10"],
      ]);
      return HttpResponse.json(page);
    }));

    await expect(getProblems({
      cursor: "page +/=?",
      daily: true,
      difficulty: "Medium",
      favorite: false,
      hot100: true,
      limit: 10,
      q: "  two sum  ",
      source: "quantgym-preview",
      status: "in_progress",
    })).resolves.toEqual(page);

    expect(normalizeProblemListFilters({})).toEqual({
      cursor: null,
      daily: false,
      difficulty: null,
      favorite: null,
      hot100: null,
      limit: 20,
      q: null,
      source: null,
      status: null,
    });
  });

  it("forwards list cancellation and rejects invalid detail identifiers before fetch", async () => {
    server.use(http.get("*/api/v2/problems", async () => {
      await delay(1_000);
      return HttpResponse.json(page);
    }));
    const controller = new AbortController();
    const request = getProblems({}, controller.signal);
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    await expect(getProblem("../private-answer")).rejects.toThrow();
  });

  it("rejects inconsistent personal state from the server", async () => {
    server.use(http.get("*/api/v2/problems/:problemId", () => HttpResponse.json({
      ...detail,
      favorite: { ...unfavorited, favorite: true },
    })));

    await expect(getProblem(problemId)).rejects.toThrow();
  });

  it("uses desired-state PUT plus CAS while keeping retry identity local", async () => {
    const favoriteBodies: unknown[] = [];
    server.use(
      http.put("*/api/v2/problems/:problemId/favorite", async ({ params, request }) => {
        expect(params.problemId).toBe(problemId);
        expect(request.headers.get("x-csrf-token")).toBe(csrfProof);
        expect(request.headers.get("x-idempotency-key")).toBeNull();
        const body = await request.json() as { favorite?: boolean };
        favoriteBodies.push(body);
        return HttpResponse.json(body.favorite === false ? unfavorited : favoriteAcknowledgement);
      }),
      http.put("*/api/v2/problems/:problemId/note", async ({ request }) => {
        expect(request.headers.get("x-csrf-token")).toBe(csrfProof);
        expect(request.headers.get("x-idempotency-key")).toBeNull();
        await expect(request.json()).resolves.toEqual({
          body: noteAcknowledgement.body,
        });
        return HttpResponse.json(noteAcknowledgement);
      }),
    );
    const favoriteIntent = newSetProblemFavoriteIntent(summary, true);
    const removeFavoriteIntent = newSetProblemFavoriteIntent({
      ...summary,
      favorite: favoriteAcknowledgement,
    }, false);
    const noteIntent = newSaveProblemNoteIntent(problemId, noteAcknowledgement.body, null);

    await expect(setProblemFavorite(favoriteIntent, csrfProof))
      .resolves.toEqual(favoriteAcknowledgement);
    await expect(setProblemFavorite(favoriteIntent, csrfProof))
      .resolves.toEqual(favoriteAcknowledgement);
    await expect(setProblemFavorite(removeFavoriteIntent, csrfProof))
      .resolves.toEqual(unfavorited);
    await expect(saveProblemNote(noteIntent, csrfProof)).resolves.toEqual(noteAcknowledgement);

    expect(favoriteBodies).toEqual([
      { favorite: true },
      { favorite: true },
      {
        expectedStateId: favoriteAcknowledgement.stateId,
        expectedVersion: favoriteAcknowledgement.version,
        favorite: false,
      },
    ]);
    expect(favoriteIntent.idempotencyKey.length).toBeGreaterThanOrEqual(16);
    expect(newSetProblemFavoriteIntent(summary, true).idempotencyKey)
      .not.toBe(favoriteIntent.idempotencyKey);
  });

  it("patches acknowledged caches, invalidates filtered lists, and isolates owners", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const filters = { favorite: true } as const;
    const favoritedPage: ProblemListResponse = {
      ...page,
      items: [{ ...summary, favorite: favoriteAcknowledgement }],
    };
    const favoritedDetail: ProblemDetail = {
      ...detail,
      favorite: favoriteAcknowledgement,
    };
    queryClient.setQueryData(problemQueryKeys.list(ownerScope, filters), favoritedPage);
    queryClient.setQueryData(problemQueryKeys.detail(ownerScope, problemId), favoritedDetail);
    queryClient.setQueryData(problemQueryKeys.list(otherOwnerScope, filters), page);
    const intent = newSetProblemFavoriteIntent(favoritedPage.items[0]!, false);

    await acknowledgeProblemFavorite(
      queryClient,
      ownerScope,
      intent,
      unfavorited,
    );

    expect(queryClient.getQueryData<ProblemListResponse>(
      problemQueryKeys.list(ownerScope, filters),
    )?.items[0]?.favorite).toEqual(unfavorited);
    expect(queryClient.getQueryData<ProblemDetail>(
      problemQueryKeys.detail(ownerScope, problemId),
    )?.favorite).toEqual(unfavorited);
    expect(queryClient.getQueryState(problemQueryKeys.list(ownerScope, filters))?.isInvalidated)
      .toBe(true);
    expect(queryClient.getQueryState(
      problemQueryKeys.detail(ownerScope, problemId),
    )?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData<ProblemListResponse>(
      problemQueryKeys.list(otherOwnerScope, filters),
    )).toEqual(page);
    queryClient.clear();
  });

  it("does not let a delayed null-generation add acknowledgement undo a later remove", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(problemQueryKeys.list(ownerScope), page);
    queryClient.setQueryData(problemQueryKeys.detail(ownerScope, problemId), detail);
    const delayedAddIntent = newSetProblemFavoriteIntent(summary, true);

    await acknowledgeProblemFavorite(
      queryClient,
      ownerScope,
      delayedAddIntent,
      favoriteAcknowledgement,
    );

    expect(queryClient.getQueryData<ProblemListResponse>(
      problemQueryKeys.list(ownerScope),
    )?.items[0]?.favorite).toEqual(unfavorited);
    expect(queryClient.getQueryData<ProblemDetail>(
      problemQueryKeys.detail(ownerScope, problemId),
    )?.favorite).toEqual(unfavorited);
    expect(queryClient.getQueryState(problemQueryKeys.list(ownerScope))?.isInvalidated)
      .toBe(true);
    expect(queryClient.getQueryState(
      problemQueryKeys.detail(ownerScope, problemId),
    )?.isInvalidated).toBe(true);
    queryClient.clear();
  });

  it("applies note versions monotonically and ignores an older acknowledgement", () => {
    const queryClient = new QueryClient();
    const currentNote = { ...noteAcknowledgement, body: "更新后的笔记", version: 2 };
    const currentPage: ProblemListResponse = {
      ...page,
      items: [{ ...summary, noteExists: true, noteVersion: 2 }],
    };
    const currentDetail: ProblemDetail = {
      ...detail,
      note: currentNote,
      noteExists: true,
      noteVersion: 2,
    };
    queryClient.setQueryData(problemQueryKeys.list(ownerScope), currentPage);
    queryClient.setQueryData(problemQueryKeys.detail(ownerScope, problemId), currentDetail);
    const intent = newSaveProblemNoteIntent(problemId, noteAcknowledgement.body, null);

    acknowledgeProblemNote(queryClient, ownerScope, intent, noteAcknowledgement);

    expect(queryClient.getQueryData<ProblemDetail>(
      problemQueryKeys.detail(ownerScope, problemId),
    )?.note).toEqual(currentNote);
    expect(queryClient.getQueryData<ProblemListResponse>(
      problemQueryKeys.list(ownerScope),
    )?.items[0]?.noteVersion).toBe(2);
    queryClient.clear();
  });
});
