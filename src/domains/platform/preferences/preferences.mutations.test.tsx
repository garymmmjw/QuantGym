import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { authQueryKeys } from "../../account/auth/auth.queries";
import type { MeResponse } from "../../account/auth/auth.schema";
import { ApiError } from "../../../shared/api/errors";
import { createAccountScope } from "../../../shared/lib/accountScope";
import {
  preferenceController,
  preferenceStore,
  setLanguagePreference,
  setThemePreference,
} from "./preferences.store";
import {
  type PreferencesResponse,
  updatePreferences,
  usePreferencesMutation,
} from "./preferences.mutations";
import {
  clearPreferenceSyncDrafts,
  listPreferenceSyncDrafts,
  upsertPreferenceSyncDraft,
} from "./preferences.drafts";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

const me: MeResponse = {
  displayName: "Gary",
  email: "gary@example.com",
  emailVerified: true,
  preferences: { language: "zh-CN", theme: "light", version: 4 },
};
const ownerScope = createAccountScope(me.email);
const sessionCsrfProof = "session-proof-0123456789abcdef";

const createDeferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const createHarness = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  queryClient.setQueryData(authQueryKeys.me, me);
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

beforeEach(() => {
  clearPreferenceSyncDrafts();
  preferenceController.reconcileFromMe(me);
});

describe("preference mutations", () => {
  it("sends exactly one versioned preference field", async () => {
    apiRequestMock.mockResolvedValue({
      language: "zh-CN",
      theme: "dark",
      version: 5,
    });

    await expect(updatePreferences({
      field: "theme",
      value: "dark",
      version: 4,
    }, sessionCsrfProof)).resolves.toMatchObject({ theme: "dark", version: 5 });

    expect(apiRequestMock).toHaveBeenCalledWith("/preferences", {
      body: { theme: "dark", version: 4 },
      csrfProof: sessionCsrfProof,
      method: "PATCH",
    });
  });

  it("applies immediately and reconciles the /me cache after acknowledgement", async () => {
    apiRequestMock.mockResolvedValue({
      language: "zh-CN",
      theme: "dark",
      version: 5,
    });
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({
        field: "theme",
        value: "dark",
        version: 4,
      });
    });

    expect(preferenceStore.getState().theme).toBe("dark");
    expect(queryClient.getQueryData<MeResponse>(authQueryKeys.me)?.preferences).toEqual({
      language: "zh-CN",
      theme: "dark",
      version: 5,
    });
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([]);
  });

  it("does not overwrite a newer queued field while acknowledging another field", async () => {
    apiRequestMock.mockResolvedValue({
      language: "zh-CN",
      theme: "dark",
      version: 5,
    });
    const { wrapper } = createHarness();
    upsertPreferenceSyncDraft(ownerScope, { field: "language", value: "en" });
    setLanguagePreference("en");
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({
        field: "theme",
        value: "dark",
        version: 4,
      });
    });

    expect(preferenceStore.getState()).toEqual({ language: "en", theme: "dark" });
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([
      expect.objectContaining({ field: "language", value: "en" }),
    ]);
  });

  it("keeps a newer same-value draft when an older response is already stale", async () => {
    const request = createDeferred<PreferencesResponse>();
    apiRequestMock.mockReturnValue(request.promise);
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof),
      { wrapper },
    );

    let pending!: Promise<PreferencesResponse>;
    await act(async () => {
      pending = result.current.mutateAsync({
        field: "theme",
        value: "dark",
        version: 4,
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledOnce());
    const firstDraft = listPreferenceSyncDrafts(ownerScope)[0];
    expect(firstDraft).toBeDefined();

    const newerMe: MeResponse = {
      ...me,
      preferences: { language: "zh-CN", theme: "light", version: 6 },
    };
    queryClient.setQueryData(authQueryKeys.me, newerMe);
    preferenceController.reconcileFromMe(newerMe);
    const newerDraft = upsertPreferenceSyncDraft(
      ownerScope,
      { field: "theme", value: "dark" },
    );
    setThemePreference("dark");

    request.resolve({ language: "zh-CN", theme: "dark", version: 5 });
    await act(async () => pending);

    expect(queryClient.getQueryData(authQueryKeys.me)).toEqual(newerMe);
    expect(preferenceStore.getState().theme).toBe("dark");
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([newerDraft]);
    expect(newerDraft.draftId).not.toBe(firstDraft?.draftId);
  });

  it("keeps a newer same-value draft applied when the older request fails", async () => {
    const request = createDeferred<PreferencesResponse>();
    apiRequestMock.mockReturnValue(request.promise);
    const { wrapper } = createHarness();
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof),
      { wrapper },
    );

    let pending!: Promise<PreferencesResponse>;
    await act(async () => {
      pending = result.current.mutateAsync({
        field: "theme",
        value: "dark",
        version: 4,
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledOnce());
    const newerDraft = upsertPreferenceSyncDraft(
      ownerScope,
      { field: "theme", value: "dark" },
    );
    setThemePreference("dark");

    request.reject(new ApiError({
      code: "PREFERENCE_SERVICE_UNAVAILABLE",
      message: "稍后重试",
      requestId: "request-older-failure",
      retryable: true,
      status: 503,
    }));
    await act(async () => {
      await expect(pending).rejects.toThrow("稍后重试");
    });

    expect(preferenceStore.getState().theme).toBe("dark");
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([newerDraft]);
  });

  it("keeps an offline preference as a local draft", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    apiRequestMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { wrapper } = createHarness();
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof),
      { wrapper },
    );

    await act(async () => {
      await expect(result.current.mutateAsync({
        field: "language",
        value: "en",
        version: 4,
      })).rejects.toThrow();
    });

    expect(preferenceStore.getState().language).toBe("en");
    expect(result.current.failure?.state).toBe("offline-draft");
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([
      expect.objectContaining({ field: "language", value: "en" }),
    ]);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("does not write a scoped preference after the server session owner changes", async () => {
    const { wrapper } = createHarness();
    const verifyOwner = vi.fn().mockRejectedValue(new ApiError({
      code: "AUTH_SESSION_OWNER_CHANGED",
      message: "账号已变化",
      requestId: null,
      status: 401,
    }));
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof, verifyOwner),
      { wrapper },
    );

    await act(async () => {
      await expect(result.current.mutateAsync({
        field: "theme",
        value: "dark",
        version: 4,
      })).rejects.toThrow("账号已变化");
    });

    expect(verifyOwner).toHaveBeenCalledOnce();
    expect(apiRequestMock).not.toHaveBeenCalled();
    expect(result.current.failure?.state).toBe("permission-denied");
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([
      expect.objectContaining({ field: "theme", value: "dark" }),
    ]);
  });

  it("keeps the mounted shell proof if the cookie changes after owner verification", async () => {
    apiRequestMock.mockResolvedValue({
      language: "zh-CN",
      theme: "dark",
      version: 5,
    });
    let liveCookieProof = sessionCsrfProof;
    const verifyOwner = vi.fn().mockImplementation(async () => {
      liveCookieProof = "new-session-proof-0123456789abcdef";
    });
    const { wrapper } = createHarness();
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof, verifyOwner),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({
        field: "theme",
        value: "dark",
        version: 4,
      });
    });

    expect(liveCookieProof).toBe("new-session-proof-0123456789abcdef");
    expect(apiRequestMock).toHaveBeenCalledWith("/preferences", {
      body: { theme: "dark", version: 4 },
      csrfProof: sessionCsrfProof,
      method: "PATCH",
    });
  });

  it("discards a previous account response after the current owner changes", async () => {
    const request = createDeferred<PreferencesResponse>();
    apiRequestMock.mockReturnValue(request.promise);
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof),
      { wrapper },
    );
    const otherUser: MeResponse = {
      displayName: "Ada",
      email: "ada@example.com",
      emailVerified: true,
      preferences: { language: "en", theme: "light", version: 9 },
    };

    let pending!: Promise<PreferencesResponse>;
    await act(async () => {
      pending = result.current.mutateAsync({
        field: "theme",
        value: "dark",
        version: 4,
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledOnce());
    queryClient.setQueryData(authQueryKeys.me, otherUser);
    preferenceController.reconcileFromMe(otherUser);

    request.resolve({ language: "zh-CN", theme: "dark", version: 5 });
    await act(async () => pending);

    expect(queryClient.getQueryData(authQueryKeys.me)).toEqual(otherUser);
    expect(preferenceStore.getState()).toEqual({ language: "en", theme: "light" });
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([]);
  });

  it("does not repopulate the auth cache after logout while a request is pending", async () => {
    const request = createDeferred<PreferencesResponse>();
    apiRequestMock.mockReturnValue(request.promise);
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof),
      { wrapper },
    );

    let pending!: Promise<PreferencesResponse>;
    await act(async () => {
      pending = result.current.mutateAsync({
        field: "theme",
        value: "dark",
        version: 4,
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledOnce());
    queryClient.clear();
    preferenceController.reset();

    request.resolve({ language: "zh-CN", theme: "dark", version: 5 });
    await act(async () => pending);

    expect(queryClient.getQueryData(authQueryKeys.me)).toBeUndefined();
    expect(preferenceStore.getState()).toEqual({ language: "zh-CN", theme: "light" });
  });

  it("does not roll a new account back when the previous account request fails late", async () => {
    const request = createDeferred<PreferencesResponse>();
    apiRequestMock.mockReturnValue(request.promise);
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(
      () => usePreferencesMutation(ownerScope, sessionCsrfProof),
      { wrapper },
    );
    const otherUser: MeResponse = {
      displayName: "Ada",
      email: "ada@example.com",
      emailVerified: true,
      preferences: { language: "en", theme: "dark", version: 9 },
    };

    let pending!: Promise<PreferencesResponse>;
    await act(async () => {
      pending = result.current.mutateAsync({
        field: "theme",
        value: "dark",
        version: 4,
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledOnce());
    queryClient.setQueryData(authQueryKeys.me, otherUser);
    preferenceController.reconcileFromMe(otherUser);

    request.reject(new ApiError({
      code: "PREFERENCE_SERVICE_UNAVAILABLE",
      message: "稍后重试",
      requestId: "request-late-failure",
      retryable: true,
      status: 503,
    }));
    await act(async () => {
      await expect(pending).rejects.toThrow("稍后重试");
    });

    expect(queryClient.getQueryData(authQueryKeys.me)).toEqual(otherUser);
    expect(preferenceStore.getState()).toEqual({ language: "en", theme: "dark" });
    expect(result.current.failure).toBeNull();
  });
});
