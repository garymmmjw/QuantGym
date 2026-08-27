export type OwnerScopedNotificationDefinition<TMessageType extends string> = Readonly<{
  channelName: string;
  eventName: string;
  messageType: TMessageType;
}>;

type OwnerScopedNotificationMessage<TMessageType extends string> = Readonly<{
  ownerScope: string;
  type: TMessageType;
}>;

export type OwnerScopedBrowserNotification = Readonly<{
  publish: (ownerScope: string) => void;
  subscribe: (ownerScope: string, listener: () => void) => () => void;
}>;

export const createOwnerScopedBrowserNotification = <TMessageType extends string>(
  definition: OwnerScopedNotificationDefinition<TMessageType>,
): OwnerScopedBrowserNotification => {
  const createMessage = (
    ownerScope: string,
  ): OwnerScopedNotificationMessage<TMessageType> => ({
    ownerScope,
    type: definition.messageType,
  });

  const isMessage = (
    value: unknown,
  ): value is OwnerScopedNotificationMessage<TMessageType> => {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return candidate.type === definition.messageType
      && typeof candidate.ownerScope === "string";
  };

  const publish = (ownerScope: string): void => {
    const message = createMessage(ownerScope);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(definition.eventName, { detail: message }));
    }
    if (typeof BroadcastChannel === "undefined") return;
    try {
      const channel = new BroadcastChannel(definition.channelName);
      channel.postMessage(message);
      channel.close();
    } catch {
      // Persistence already succeeded; browser notifications are best-effort only.
    }
  };

  const subscribe = (
    ownerScope: string,
    listener: () => void,
  ): (() => void) => {
    if (typeof window === "undefined") return () => undefined;
    const handleMessage = (value: unknown) => {
      if (isMessage(value) && value.ownerScope === ownerScope) listener();
    };
    const handleLocal = (event: Event) => {
      if (event instanceof CustomEvent) handleMessage(event.detail);
    };
    window.addEventListener(definition.eventName, handleLocal);

    let channel: BroadcastChannel | null = null;
    const handleBroadcast = (event: MessageEvent<unknown>) => handleMessage(event.data);
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(definition.channelName);
        channel.addEventListener("message", handleBroadcast);
      } catch {
        channel = null;
      }
    }

    return () => {
      window.removeEventListener(definition.eventName, handleLocal);
      channel?.removeEventListener("message", handleBroadcast);
      channel?.close();
    };
  };

  return Object.freeze({ publish, subscribe });
};
