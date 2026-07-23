import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import {
  notificationSchema,
  type Notification,
  type NotificationsResponse,
} from "./notifications.schema";
import { notificationQueryKeys } from "./notifications.queries";

export type MarkNotificationReadInput = Readonly<{
  id: string;
}>;

const notificationPathIdSchema = notificationSchema.shape.id;

export const markNotificationRead = async (
  input: MarkNotificationReadInput,
  csrfProof: string | null,
): Promise<Notification> => {
  const id = notificationPathIdSchema.parse(input.id);
  const response = await apiRequest<unknown>(`/notifications/${id}/read`, {
    csrfProof,
    method: "PATCH",
  });
  return notificationSchema.parse(response);
};

export const acknowledgeNotificationRead = (
  queryClient: QueryClient,
  ownerScope: string,
  acknowledged: Notification,
) => {
  queryClient.setQueriesData<NotificationsResponse>(
    { queryKey: notificationQueryKeys.forOwner(ownerScope) },
    (current) => {
      if (current === undefined) return current;
      const existing = current.items.find(({ id }) => id === acknowledged.id);
      if (existing === undefined) return current;
      const becameRead = existing.readAt === null && acknowledged.readAt !== null;
      return {
        ...current,
        items: current.items.map((item) => (
          item.id === acknowledged.id ? acknowledged : item
        )),
        unreadCount: becameRead
          ? Math.max(0, current.unreadCount - 1)
          : current.unreadCount,
      };
    },
  );
};

export type MarkNotificationReadMutationOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  verifyOwner?: () => Promise<void>;
}>;

const noOpOwnerVerification = async (): Promise<void> => undefined;

export const useMarkNotificationReadMutation = ({
  csrfProof,
  ownerScope,
  verifyOwner = noOpOwnerVerification,
}: MarkNotificationReadMutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation<Notification, unknown, MarkNotificationReadInput>({
    mutationFn: async (input) => {
      await verifyOwner();
      return markNotificationRead(input, csrfProof);
    },
    networkMode: "always",
    onSuccess: (acknowledged) => {
      acknowledgeNotificationRead(queryClient, ownerScope, acknowledged);
    },
    retry: false,
  });
};
