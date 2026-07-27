const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("./client", () => ({ apiRequest: apiRequestMock }));

import { QueryClient } from "@tanstack/react-query";

import { createAccountScope } from "../lib/accountScope";
import {
  cancelAndRemoveOwnerQueries,
  runOwnerScopedQuery,
  runOwnerVerifiedOperation,
} from "./ownerScopedQueries";

const ownerAEmail = "account-a@example.com";
const ownerBEmail = "account-b@example.com";
const ownerA = createAccountScope(ownerAEmail);
const ownerB = createAccountScope(ownerBEmail);
const firstSessionProof = "session-proof-account-a-first-123456";
let liveSessionProof = firstSessionProof;

describe("owner-scoped query boundary", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    liveSessionProof = firstSessionProof;
    vi.spyOn(document, "cookie", "get").mockImplementation(
      () => `__Host-qg_csrf=${liveSessionProof}`,
    );
  });

  it("cancels in-flight work and removes only the previous owner across A to B to A", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let ownerAAborted = false;
    const pendingOwnerA = queryClient.fetchQuery({
      queryFn: ({ signal }) => new Promise<never>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          ownerAAborted = true;
          reject(signal.reason);
        }, { once: true });
      }),
      queryKey: ["dashboard", ownerA, "overview"],
    });
    queryClient.setQueryData(["plans", ownerA, "current"], { owner: "A" });
    queryClient.setQueryData(["plans", ownerB, "current"], { owner: "B" });
    queryClient.setQueryData(["auth", "me"], { owner: "auth-boundary" });

    await cancelAndRemoveOwnerQueries(queryClient, ownerA);
    await expect(pendingOwnerA).rejects.toMatchObject({ name: "Error" });
    expect(ownerAAborted).toBe(true);
    expect(queryClient.getQueryData(["dashboard", ownerA, "overview"])).toBeUndefined();
    expect(queryClient.getQueryData(["plans", ownerA, "current"])).toBeUndefined();
    expect(queryClient.getQueryData(["plans", ownerB, "current"])).toEqual({ owner: "B" });
    expect(queryClient.getQueryData(["auth", "me"])).toEqual({ owner: "auth-boundary" });

    queryClient.setQueryData(["problems", ownerA, "list"], { owner: "A-return" });
    await cancelAndRemoveOwnerQueries(queryClient, ownerB);
    expect(queryClient.getQueryData(["plans", ownerB, "current"])).toBeUndefined();
    expect(queryClient.getQueryData(["problems", ownerA, "list"]))
      .toEqual({ owner: "A-return" });
    queryClient.clear();
  });

  it("rejects a raced B response before it can commit beneath A's key", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    apiRequestMock.mockResolvedValue({ email: ownerBEmail });

    const raced = queryClient.fetchQuery({
      queryFn: ({ signal }) => runOwnerScopedQuery(
        ownerA,
        async () => ({ privateOwner: "B" }),
        signal,
      ),
      queryKey: ["dashboard", ownerA, "overview"],
    });

    await expect(raced).rejects.toMatchObject({
      code: "AUTH_SESSION_OWNER_CHANGED",
      status: 401,
    });
    expect(queryClient.getQueryData(["dashboard", ownerA, "overview"]))
      .toBeUndefined();
    queryClient.clear();
  });

  it("rejects an A1 to B to A2 ABA response even when final /me is owner A", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    apiRequestMock.mockResolvedValue({ email: ownerAEmail });

    const raced = queryClient.fetchQuery({
      queryFn: ({ signal }) => runOwnerScopedQuery(
        ownerA,
        async () => {
          liveSessionProof = "session-proof-account-a-second-654321";
          return { privateOwner: "B" };
        },
        signal,
      ),
      queryKey: ["dashboard", ownerA, "overview"],
    });

    await expect(raced).rejects.toMatchObject({
      code: "AUTH_SESSION_BOUNDARY_CHANGED",
      status: 401,
    });
    expect(apiRequestMock).toHaveBeenCalledWith("/me", {
      signal: expect.any(AbortSignal),
    });
    expect(queryClient.getQueryData(["dashboard", ownerA, "overview"]))
      .toBeUndefined();
    queryClient.clear();
  });

  it("fails closed when an authenticated owner query has no session proof", async () => {
    vi.spyOn(document, "cookie", "get").mockReturnValue("");

    await expect(runOwnerScopedQuery(
      ownerA,
      async () => ({ privateOwner: "A" }),
    )).rejects.toMatchObject({
      code: "SESSION_PROOF_REQUIRED",
      status: 401,
    });
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("rejects a mutation response when the owner changes while it is in flight", async () => {
    let verificationCount = 0;
    const verifyOwner = vi.fn(async () => {
      verificationCount += 1;
      if (verificationCount === 2) {
        throw new Error("AUTH_SESSION_OWNER_CHANGED");
      }
    });

    await expect(runOwnerVerifiedOperation(
      verifyOwner,
      async () => ({ privateOwner: "B" }),
    )).rejects.toThrow("AUTH_SESSION_OWNER_CHANGED");
    expect(verifyOwner).toHaveBeenCalledTimes(2);
  });
});
