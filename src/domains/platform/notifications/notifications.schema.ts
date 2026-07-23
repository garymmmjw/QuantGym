import { z } from "zod";

export const notificationSchema = z.object({
  body: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
  kind: z.string().trim().min(1).max(48),
  readAt: z.string().datetime({ offset: true }).nullable(),
  title: z.string().trim().min(1).max(200),
}).strict();

export const notificationsResponseSchema = z.object({
  items: z.array(notificationSchema),
  nextCursor: z.string().trim().min(1).max(2_048).nullable(),
  unreadCount: z.number().int().nonnegative(),
}).strict().superRefine((response, context) => {
  const unreadItemsOnPage = response.items.filter(({ readAt }) => readAt === null).length;
  if (response.unreadCount < unreadItemsOnPage) {
    context.addIssue({
      code: "custom",
      message: "Unread count cannot be smaller than the unread items on this page.",
      path: ["unreadCount"],
    });
  }
});

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;
