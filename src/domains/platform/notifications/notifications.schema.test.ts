import { ZodError } from "zod";

import {
  notificationSchema,
  notificationsResponseSchema,
} from "./notifications.schema";

const unreadNotification = {
  body: "完成今天的概率训练。",
  createdAt: "2026-07-23T08:30:00+08:00",
  id: "10000000-0000-4000-8000-000000000001",
  kind: "training-reminder",
  readAt: null,
  title: "今日训练提醒",
} as const;

describe("notification schemas", () => {
  it("accepts the strict public notification response", () => {
    expect(notificationsResponseSchema.parse({
      items: [unreadNotification],
      nextCursor: "next-page",
      unreadCount: 3,
    })).toEqual({
      items: [unreadNotification],
      nextCursor: "next-page",
      unreadCount: 3,
    });
  });

  it("rejects malformed identifiers, timestamps, and unknown fields", () => {
    expect(() => notificationSchema.parse({
      ...unreadNotification,
      id: "../notification",
    })).toThrow(ZodError);
    expect(() => notificationSchema.parse({
      ...unreadNotification,
      createdAt: "not-a-time",
    })).toThrow(ZodError);
    expect(() => notificationSchema.parse({
      ...unreadNotification,
      fabricated: true,
    })).toThrow(ZodError);
  });

  it("rejects an unread count smaller than the unread items returned", () => {
    expect(() => notificationsResponseSchema.parse({
      items: [unreadNotification],
      nextCursor: null,
      unreadCount: 0,
    })).toThrow(/Unread count/);
  });
});
