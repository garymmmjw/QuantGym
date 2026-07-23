import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import {
  notificationsResponseSchema,
  type NotificationsResponse,
} from "./notifications.schema";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  forOwner: (ownerScope: string) => ["notifications", ownerScope] as const,
  list: (ownerScope: string, cursor: string | null = null) => (
    ["notifications", ownerScope, "list", cursor] as const
  ),
} as const;

export type NotificationsQueryOptions = Readonly<{
  cursor?: string | null;
  enabled?: boolean;
  ownerScope: string;
}>;

const notificationsPath = (cursor: string | null) => {
  if (cursor === null) return "/notifications";
  const search = new URLSearchParams({ cursor });
  return `/notifications?${search.toString()}`;
};

export const getNotifications = async (
  cursor: string | null = null,
  signal?: AbortSignal,
): Promise<NotificationsResponse> => {
  const response = await apiRequest<unknown>(notificationsPath(cursor), {
    ...(signal === undefined ? {} : { signal }),
  });
  return notificationsResponseSchema.parse(response);
};

export const notificationsQueryOptions = (
  options: NotificationsQueryOptions,
) => {
  const cursor = options.cursor ?? null;
  return queryOptions({
    enabled: options.enabled ?? true,
    queryFn: ({ signal }) => getNotifications(cursor, signal),
    queryKey: notificationQueryKeys.list(options.ownerScope, cursor),
  });
};

export const useNotificationsQuery = (
  options: NotificationsQueryOptions,
) => useQuery(notificationsQueryOptions(options));

export const selectUnreadNotificationCount = (
  response: NotificationsResponse | null | undefined,
) => response?.unreadCount ?? 0;

export const useUnreadNotificationCount = (
  options: NotificationsQueryOptions,
) => {
  const query = useNotificationsQuery(options);
  return {
    count: selectUnreadNotificationCount(query.data),
    isError: query.isError,
    isPending: query.isPending,
  } as const;
};
