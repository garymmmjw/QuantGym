import { QueryClient } from "@tanstack/react-query";

import {
  acknowledgeNotificationRead,
  markNotificationRead,
} from "./notifications.mutations";
import {
  getNotifications,
  notificationQueryKeys,
  selectUnreadNotificationCount,
} from "./notifications.queries";
import type {
  Notification,
  NotificationsResponse,
} from "./notifications.schema";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

const unreadNotification: Notification = {
  body: "完成今天的概率训练。",
  createdAt: "2026-07-23T08:30:00+08:00",
  id: "10000000-0000-4000-8000-000000000001",
  kind: "training-reminder",
  readAt: null,
  title: "今日训练提醒",
};

const page: NotificationsResponse = {
  items: [unreadNotification],
  nextCursor: null,
  unreadCount: 1,
};
const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";
const sessionCsrfProof = "session-proof-0123456789abcdef";

describe("notification API adapters", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("loads and validates the first page with request cancellation", async () => {
    const controller = new AbortController();
    apiRequestMock.mockResolvedValue(page);

    await expect(getNotifications(null, controller.signal)).resolves.toEqual(page);

    expect(apiRequestMock).toHaveBeenCalledWith("/notifications", {
      signal: controller.signal,
    });
  });

  it("encodes an opaque cursor without interpolating it into the path", async () => {
    apiRequestMock.mockResolvedValue({ ...page, nextCursor: "later" });

    await getNotifications("page +/=?");

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/notifications?cursor=page+%2B%2F%3D%3F",
      {},
    );
  });

  it("rejects an invalid server payload instead of rendering fabricated records", async () => {
    apiRequestMock.mockResolvedValue({
      items: [{ ...unreadNotification, id: "not-a-uuid" }],
      nextCursor: null,
      unreadCount: 1,
    });

    await expect(getNotifications()).rejects.toThrow();
  });

  it("PATCHes only a validated notification identifier", async () => {
    const acknowledged = {
      ...unreadNotification,
      readAt: "2026-07-23T09:00:00+08:00",
    };
    apiRequestMock.mockResolvedValue(acknowledged);

    await expect(markNotificationRead(
      { id: unreadNotification.id },
      sessionCsrfProof,
    )).resolves.toEqual(acknowledged);
    expect(apiRequestMock).toHaveBeenCalledWith(
      `/notifications/${unreadNotification.id}/read`,
      { csrfProof: sessionCsrfProof, method: "PATCH" },
    );

    await expect(markNotificationRead(
      { id: "../account" },
      sessionCsrfProof,
    )).rejects.toThrow();
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });

  it("updates rows and unread counts only after an acknowledged read transition", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(notificationQueryKeys.list(ownerScope, null), page);
    const acknowledged = {
      ...unreadNotification,
      readAt: "2026-07-23T09:00:00+08:00",
    };

    expect(selectUnreadNotificationCount(
      queryClient.getQueryData(notificationQueryKeys.list(ownerScope, null)),
    )).toBe(1);

    acknowledgeNotificationRead(queryClient, ownerScope, acknowledged);

    expect(queryClient.getQueryData(notificationQueryKeys.list(ownerScope, null))).toEqual({
      items: [acknowledged],
      nextCursor: null,
      unreadCount: 0,
    });
    queryClient.clear();
  });

  it("does not invent a row or decrement the count for an unknown acknowledgement", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(notificationQueryKeys.list(ownerScope, null), page);

    acknowledgeNotificationRead(queryClient, ownerScope, {
      ...unreadNotification,
      id: "20000000-0000-4000-8000-000000000002",
      readAt: "2026-07-23T09:00:00+08:00",
    });

    expect(queryClient.getQueryData(notificationQueryKeys.list(ownerScope, null))).toEqual(page);
    queryClient.clear();
  });

  it("never updates another authenticated account's notification cache", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(notificationQueryKeys.list(ownerScope, null), page);
    queryClient.setQueryData(notificationQueryKeys.list(otherOwnerScope, null), page);
    const acknowledged = {
      ...unreadNotification,
      readAt: "2026-07-23T09:00:00+08:00",
    };

    acknowledgeNotificationRead(queryClient, ownerScope, acknowledged);

    expect(queryClient.getQueryData(notificationQueryKeys.list(ownerScope, null)))
      .toEqual(expect.objectContaining({ unreadCount: 0 }));
    expect(queryClient.getQueryData(notificationQueryKeys.list(otherOwnerScope, null)))
      .toEqual(page);
    queryClient.clear();
  });
});
