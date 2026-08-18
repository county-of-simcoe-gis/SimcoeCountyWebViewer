import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useInteractionManagerStore,
  type InteractionHandler,
  type InteractionEventType,
} from "@/stores/interactionManagerStore";

// Reset store before each test
beforeEach(() => {
  useInteractionManagerStore.setState({ handlers: [] });
});

// Helper to create a mock handler
function createHandler(overrides: Partial<InteractionHandler> = {}): InteractionHandler {
  return {
    id: "test-handler",
    eventType: "singleclick",
    handler: vi.fn(),
    ...overrides,
  };
}

describe("interactionManagerStore", () => {
  describe("Initial State", () => {
    it("should start with an empty handlers array", () => {
      const state = useInteractionManagerStore.getState();
      expect(state.handlers).toEqual([]);
    });
  });

  describe("registerHandler", () => {
    it("should add a handler", () => {
      const handler = createHandler({ id: "h1" });
      useInteractionManagerStore.getState().registerHandler(handler);

      const state = useInteractionManagerStore.getState();
      expect(state.handlers).toHaveLength(1);
      expect(state.handlers[0].id).toBe("h1");
    });

    it("should assign default priority of 100", () => {
      const handler = createHandler({ id: "h1", priority: undefined });
      useInteractionManagerStore.getState().registerHandler(handler);

      expect(useInteractionManagerStore.getState().handlers[0].priority).toBe(100);
    });

    it("should preserve explicit priority", () => {
      const handler = createHandler({ id: "h1", priority: 10 });
      useInteractionManagerStore.getState().registerHandler(handler);

      expect(useInteractionManagerStore.getState().handlers[0].priority).toBe(10);
    });

    it("should sort handlers by priority (lower number = higher priority)", () => {
      const { registerHandler } = useInteractionManagerStore.getState();
      registerHandler(createHandler({ id: "low-priority", priority: 200 }));
      registerHandler(createHandler({ id: "high-priority", priority: 10 }));
      registerHandler(createHandler({ id: "default-priority" })); // 100

      const handlers = useInteractionManagerStore.getState().handlers;
      expect(handlers[0].id).toBe("high-priority");
      expect(handlers[1].id).toBe("default-priority");
      expect(handlers[2].id).toBe("low-priority");
    });

    it("should replace existing handler with same ID", () => {
      const handler1 = createHandler({ id: "h1", eventType: "singleclick" });
      const handler2 = createHandler({ id: "h1", eventType: "contextmenu" });

      const store = useInteractionManagerStore.getState();
      store.registerHandler(handler1);
      store.registerHandler(handler2);

      const handlers = useInteractionManagerStore.getState().handlers;
      expect(handlers).toHaveLength(1);
      expect(handlers[0].eventType).toBe("contextmenu");
    });

    it("should register multiple handlers with different IDs", () => {
      const store = useInteractionManagerStore.getState();
      store.registerHandler(createHandler({ id: "h1" }));
      store.registerHandler(createHandler({ id: "h2" }));
      store.registerHandler(createHandler({ id: "h3" }));

      expect(useInteractionManagerStore.getState().handlers).toHaveLength(3);
    });
  });

  describe("unregisterHandler", () => {
    it("should remove a handler by ID", () => {
      const store = useInteractionManagerStore.getState();
      store.registerHandler(createHandler({ id: "h1" }));
      store.registerHandler(createHandler({ id: "h2" }));

      useInteractionManagerStore.getState().unregisterHandler("h1");

      const handlers = useInteractionManagerStore.getState().handlers;
      expect(handlers).toHaveLength(1);
      expect(handlers[0].id).toBe("h2");
    });

    it("should handle removing non-existent handler gracefully", () => {
      useInteractionManagerStore.getState().registerHandler(createHandler({ id: "h1" }));

      expect(() => {
        useInteractionManagerStore.getState().unregisterHandler("non-existent");
      }).not.toThrow();

      expect(useInteractionManagerStore.getState().handlers).toHaveLength(1);
    });

    it("should result in empty array when last handler is removed", () => {
      useInteractionManagerStore.getState().registerHandler(createHandler({ id: "h1" }));
      useInteractionManagerStore.getState().unregisterHandler("h1");

      expect(useInteractionManagerStore.getState().handlers).toEqual([]);
    });
  });

  describe("getHandlers", () => {
    it("should return all handlers when no eventType filter specified", () => {
      const store = useInteractionManagerStore.getState();
      store.registerHandler(createHandler({ id: "click", eventType: "singleclick" }));
      store.registerHandler(createHandler({ id: "ctx", eventType: "contextmenu" }));
      store.registerHandler(createHandler({ id: "dbl", eventType: "dblclick" }));

      const allHandlers = useInteractionManagerStore.getState().getHandlers();
      expect(allHandlers).toHaveLength(3);
    });

    it("should filter handlers by eventType", () => {
      const store = useInteractionManagerStore.getState();
      store.registerHandler(createHandler({ id: "click1", eventType: "singleclick" }));
      store.registerHandler(createHandler({ id: "click2", eventType: "singleclick" }));
      store.registerHandler(createHandler({ id: "ctx", eventType: "contextmenu" }));

      const clickHandlers = useInteractionManagerStore.getState().getHandlers("singleclick");
      expect(clickHandlers).toHaveLength(2);
      expect(clickHandlers.every((h) => h.eventType === "singleclick")).toBe(true);
    });

    it("should return empty array when no handlers match eventType", () => {
      useInteractionManagerStore.getState().registerHandler(
        createHandler({ id: "click", eventType: "singleclick" }),
      );

      const result = useInteractionManagerStore.getState().getHandlers("dblclick");
      expect(result).toEqual([]);
    });

    it("should return handlers in priority order", () => {
      const store = useInteractionManagerStore.getState();
      store.registerHandler(createHandler({ id: "low", eventType: "singleclick", priority: 200 }));
      store.registerHandler(createHandler({ id: "high", eventType: "singleclick", priority: 5 }));

      const handlers = useInteractionManagerStore.getState().getHandlers("singleclick");
      expect(handlers[0].id).toBe("high");
      expect(handlers[1].id).toBe("low");
    });
  });

  describe("Handler Conditions", () => {
    it("should store conditions on registered handler", () => {
      const checkDisableFlags = vi.fn(() => false);
      const handler = createHandler({
        id: "h1",
        conditions: {
          maxScale: 20000,
          checkDisableFlags,
        },
      });

      useInteractionManagerStore.getState().registerHandler(handler);

      const registered = useInteractionManagerStore.getState().handlers[0];
      expect(registered.conditions?.maxScale).toBe(20000);
      expect(registered.conditions?.checkDisableFlags).toBeDefined();
      expect(registered.conditions?.checkDisableFlags!()).toBe(false);
    });

    it("should store handler without conditions", () => {
      const handler = createHandler({ id: "h1" });
      useInteractionManagerStore.getState().registerHandler(handler);

      const registered = useInteractionManagerStore.getState().handlers[0];
      expect(registered.conditions).toBeUndefined();
    });
  });

  describe("Event Type Support", () => {
    const eventTypes: InteractionEventType[] = ["singleclick", "contextmenu", "pointermove", "dblclick"];

    eventTypes.forEach((eventType) => {
      it(`should support ${eventType} event type`, () => {
        useInteractionManagerStore.getState().registerHandler(
          createHandler({ id: `${eventType}-handler`, eventType }),
        );

        const handlers = useInteractionManagerStore.getState().getHandlers(eventType);
        expect(handlers).toHaveLength(1);
        expect(handlers[0].eventType).toBe(eventType);
      });
    });
  });
});
