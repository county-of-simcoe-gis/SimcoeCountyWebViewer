import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MapBrowserEvent } from "ol";
import { InteractionManager } from "@/utils/openlayers/InteractionManager";
import { useInteractionManagerStore } from "@/stores/interactionManagerStore";
import { useMapStore } from "@/stores/mapStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";

vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    hasRightClickSuppressLayer: vi.fn(() => false),
    hasAlwaysSuppressLayer: vi.fn(() => false),
  },
}));

function createContextMenuEvent() {
  const preventDefault = vi.fn();
  const event = {
    type: "contextmenu",
    originalEvent: { preventDefault },
    coordinate: [1, 2],
    pixel: [3, 4],
  } as unknown as MapBrowserEvent<PointerEvent>;
  return { event, preventDefault };
}

describe("InteractionManager contextmenu dispatch", () => {
  let manager: InteractionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new InteractionManager();
    useInteractionManagerStore.setState({ handlers: [] });
    useMapStore.setState({ activeToolId: null });
    // Mirrors MapContainer's filter: handlers with checkDisableFlags returning true are skipped
    InteractionManager.setHandlerFilter((h) => !h.conditions?.checkDisableFlags?.());
    vi.mocked(LayerManager.hasRightClickSuppressLayer).mockReturnValue(false);
  });

  it("prevents the browser menu when no handler is registered", () => {
    const { event, preventDefault } = createContextMenuEvent();

    manager.handleEvent(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("prevents the browser menu when the context menu handler is filtered out by a tool", () => {
    useMapStore.setState({ activeToolId: "toggler" });
    const handler = vi.fn();
    useInteractionManagerStore.getState().registerHandler({
      id: "context-menu",
      eventType: "contextmenu",
      conditions: { checkDisableFlags: () => useMapStore.getState().isToolActive() },
      handler,
    });
    const { event, preventDefault } = createContextMenuEvent();

    manager.handleEvent(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the context menu handler while a tool is active", () => {
    useMapStore.setState({ activeToolId: "toggler" });
    const handler = vi.fn();
    useInteractionManagerStore.getState().registerHandler({
      id: "context-menu",
      eventType: "contextmenu",
      handler,
    });
    const { event, preventDefault } = createContextMenuEvent();

    manager.handleEvent(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith([1, 2], [3, 4], event);
  });

  it("suppresses the handler when a layer requests right-click suppression", () => {
    vi.mocked(LayerManager.hasRightClickSuppressLayer).mockReturnValue(true);
    const handler = vi.fn();
    useInteractionManagerStore.getState().registerHandler({
      id: "context-menu",
      eventType: "contextmenu",
      handler,
    });
    const { event, preventDefault } = createContextMenuEvent();

    const result = manager.handleEvent(event);

    expect(result).toBe(false);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });
});
