import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createOwnerScopedBrowserNotification } from "./ownerScopedBrowserNotification";

type BroadcastListener = (event: MessageEvent<unknown>) => void;

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];

  readonly listeners = new Set<BroadcastListener>();
  readonly postMessage = vi.fn();
  readonly close = vi.fn();

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "message") this.listeners.add(listener as BroadcastListener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "message") this.listeners.delete(listener as BroadcastListener);
  }

  emit(data: unknown): void {
    const event = new MessageEvent("message", { data });
    for (const listener of this.listeners) listener(event);
  }
}

const definition = {
  channelName: "qg-v2-test-drafts",
  eventName: "qg-v2-test-draft-changed",
  messageType: "test-draft-changed",
} as const;

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";

describe("owner-scoped browser notifications", () => {
  beforeEach(() => {
    FakeBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("publishes the same owner-scoped payload locally and across tabs", () => {
    const notifications = createOwnerScopedBrowserNotification(definition);
    const listener = vi.fn();
    const unsubscribe = notifications.subscribe(ownerScope, listener);

    notifications.publish(ownerScope);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(FakeBroadcastChannel.instances).toHaveLength(2);
    expect(FakeBroadcastChannel.instances[0]?.name).toBe(definition.channelName);
    expect(FakeBroadcastChannel.instances[1]?.postMessage).toHaveBeenCalledWith({
      ownerScope,
      type: definition.messageType,
    });
    expect(FakeBroadcastChannel.instances[1]?.close).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("accepts only matching owners and message types from local and broadcast sources", () => {
    const notifications = createOwnerScopedBrowserNotification(definition);
    const listener = vi.fn();
    const unsubscribe = notifications.subscribe(ownerScope, listener);
    const subscriptionChannel = FakeBroadcastChannel.instances[0];

    window.dispatchEvent(new CustomEvent(definition.eventName, {
      detail: { ownerScope: otherOwnerScope, type: definition.messageType },
    }));
    window.dispatchEvent(new CustomEvent(definition.eventName, {
      detail: { ownerScope, type: "another-message" },
    }));
    window.dispatchEvent(new CustomEvent(definition.eventName, {
      detail: { ownerScope, type: definition.messageType },
    }));
    subscriptionChannel?.emit({
      ownerScope: otherOwnerScope,
      type: definition.messageType,
    });
    subscriptionChannel?.emit({ ownerScope, type: "another-message" });
    subscriptionChannel?.emit({ ownerScope, type: definition.messageType });

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it("removes both transports and closes the subscription channel", () => {
    const notifications = createOwnerScopedBrowserNotification(definition);
    const listener = vi.fn();
    const unsubscribe = notifications.subscribe(ownerScope, listener);
    const subscriptionChannel = FakeBroadcastChannel.instances[0];

    unsubscribe();
    window.dispatchEvent(new CustomEvent(definition.eventName, {
      detail: { ownerScope, type: definition.messageType },
    }));
    subscriptionChannel?.emit({ ownerScope, type: definition.messageType });

    expect(listener).not.toHaveBeenCalled();
    expect(subscriptionChannel?.close).toHaveBeenCalledTimes(1);
  });

  it("keeps local delivery available when BroadcastChannel cannot be created", () => {
    class UnavailableBroadcastChannel {
      constructor() {
        throw new Error("BroadcastChannel unavailable");
      }
    }
    vi.stubGlobal("BroadcastChannel", UnavailableBroadcastChannel);
    const notifications = createOwnerScopedBrowserNotification(definition);
    const listener = vi.fn();
    const unsubscribe = notifications.subscribe(ownerScope, listener);

    expect(() => notifications.publish(ownerScope)).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
