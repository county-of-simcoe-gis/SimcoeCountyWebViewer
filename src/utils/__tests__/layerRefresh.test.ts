import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { TOCLayer } from "@/stores/tocStore";
import { useLayerRefreshStore } from "@/stores/layerRefreshStore";
import { useLayerTimeStore } from "@/stores/layerTimeStore";
import { TIME_VALUE_APPLIER_PROPERTY } from "@/utils/timeDimension";
import { canRefreshLayer, startLayerRefresh, toggleLayerRefresh, startGroupRefresh, stopGroupRefresh, handleTOCVisibilityChange, setTimeIndex } from "@/utils/openlayers/LayerRefresh";

const mockState = vi.hoisted(() => ({
  allLayers: [] as TOCLayer[],
  olLayers: new Map<string, unknown>(),
}));

vi.mock("@/stores/tocStore", () => ({
  useTOCStore: {
    getState: () => ({ allLayers: mockState.allLayers }),
    subscribe: vi.fn(),
  },
}));

vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    getLayer: (layerId: string) => {
      const layer = mockState.olLayers.get(layerId);
      return layer ? { layer } : null;
    },
  },
}));

function makeTOCLayer(overrides: Partial<TOCLayer>): TOCLayer {
  return {
    id: "layer-1",
    name: "roads",
    refreshInterval: 10,
    visible: true,
    managedLayerId: "managed-1",
    ...overrides,
  } as TOCLayer;
}

function addOLLayer(managedLayerId: string) {
  const state = { visible: true };
  const updateParams = vi.fn();
  const olLayer = {
    getVisible: () => state.visible,
    getSource: () => ({ updateParams }),
  };
  mockState.olLayers.set(managedLayerId, olLayer);
  return { updateParams, state };
}

function setLayers(...layers: TOCLayer[]) {
  mockState.allLayers = layers;
}

beforeEach(() => {
  vi.useFakeTimers();
  mockState.olLayers.clear();
  setLayers();
  useLayerRefreshStore.setState({ playing: {} });
  useLayerTimeStore.setState({ indexes: {} });
});

afterEach(() => {
  stopGroupRefresh(mockState.allLayers);
  vi.useRealTimers();
});

describe("canRefreshLayer", () => {
  it("returns false when no refresh interval is set", () => {
    addOLLayer("managed-1");
    expect(canRefreshLayer(makeTOCLayer({ refreshInterval: 0 }))).toBe(false);
  });

  it("returns false when the managed layer is missing", () => {
    expect(canRefreshLayer(makeTOCLayer({}))).toBe(false);
  });

  it("returns false when the source cannot update params", () => {
    mockState.olLayers.set("managed-1", { getVisible: () => true, getSource: () => ({}) });
    expect(canRefreshLayer(makeTOCLayer({}))).toBe(false);
  });

  it("returns true for a refreshable WMS source", () => {
    addOLLayer("managed-1");
    expect(canRefreshLayer(makeTOCLayer({}))).toBe(true);
  });
});

describe("timed refresh engine", () => {
  it("re-requests the current data on each interval while playing", () => {
    const { updateParams } = addOLLayer("managed-1");
    setLayers(makeTOCLayer({}));

    startLayerRefresh("layer-1");
    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(true);

    vi.advanceTimersByTime(10_000);
    expect(updateParams).toHaveBeenCalledTimes(1);
    expect(updateParams).toHaveBeenCalledWith({ _refresh: expect.any(Number) });
  });

  it("steps TIME through the values and wraps to the first", () => {
    const { updateParams } = addOLLayer("managed-1");
    setLayers(makeTOCLayer({ timeDimension: { kind: "list", values: ["t1", "t2"], defaultIndex: 0 } }));

    startLayerRefresh("layer-1");
    vi.advanceTimersByTime(30_000);

    expect(updateParams.mock.calls).toEqual([[{ TIME: "t2" }], [{ TIME: "t1" }], [{ TIME: "t2" }]]);
  });

  it("continues stepping from the index chosen with the time slider", () => {
    const { updateParams } = addOLLayer("managed-1");
    setLayers(makeTOCLayer({ timeDimension: { kind: "list", values: ["t1", "t2", "t3"], defaultIndex: 0 } }));

    setTimeIndex("layer-1", 1);
    startLayerRefresh("layer-1");
    vi.advanceTimersByTime(10_000);

    expect(updateParams.mock.calls).toEqual([[{ TIME: "t2" }], [{ TIME: "t3" }]]);
    expect(useLayerTimeStore.getState().indexes["layer-1"]).toBe(2);
  });

  it("wraps a slider index outside the range", () => {
    const { updateParams } = addOLLayer("managed-1");
    setLayers(makeTOCLayer({ timeDimension: { kind: "list", values: ["t1", "t2"], defaultIndex: 0 } }));

    setTimeIndex("layer-1", -1);

    expect(updateParams).toHaveBeenCalledWith({ TIME: "t2" });
  });

  it("steps a vector time layer through the applier attached to the OpenLayers layer", () => {
    const applyTimeValue = vi.fn();
    mockState.olLayers.set("managed-1", {
      getVisible: () => true,
      getSource: () => ({}),
      get: (key: string) => (key === TIME_VALUE_APPLIER_PROPERTY ? applyTimeValue : undefined),
    });
    const layer = makeTOCLayer({ timeDimension: { kind: "list", values: ["t1", "t2"], defaultIndex: 0 } });
    setLayers(layer);

    expect(canRefreshLayer(layer)).toBe(true);
    startLayerRefresh("layer-1");
    vi.advanceTimersByTime(10_000);

    expect(applyTimeValue).toHaveBeenCalledWith("t2");
  });

  it("steps time layers every 5 seconds when no refresh interval is set", () => {
    const { updateParams } = addOLLayer("managed-1");
    setLayers(makeTOCLayer({ refreshInterval: 0, timeDimension: { kind: "list", values: ["t1", "t2"], defaultIndex: 0 } }));

    startLayerRefresh("layer-1");
    vi.advanceTimersByTime(5_000);

    expect(updateParams).toHaveBeenCalledWith({ TIME: "t2" });
  });

  it("does not start a hidden layer", () => {
    const { updateParams } = addOLLayer("managed-1");
    setLayers(makeTOCLayer({ visible: false }));

    startLayerRefresh("layer-1");
    vi.advanceTimersByTime(10_000);

    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBeFalsy();
    expect(updateParams).not.toHaveBeenCalled();
  });

  it("does not create a second timer when started twice", () => {
    const { updateParams } = addOLLayer("managed-1");
    setLayers(makeTOCLayer({}));

    startLayerRefresh("layer-1");
    startLayerRefresh("layer-1");
    vi.advanceTimersByTime(10_000);

    expect(updateParams).toHaveBeenCalledTimes(1);
  });

  it("pauses a playing layer when toggled", () => {
    const { updateParams } = addOLLayer("managed-1");
    setLayers(makeTOCLayer({}));

    toggleLayerRefresh("layer-1");
    toggleLayerRefresh("layer-1");
    vi.advanceTimersByTime(10_000);

    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(false);
    expect(updateParams).not.toHaveBeenCalled();
  });

  it("stops and resets to paused when the layer is hidden", () => {
    const { updateParams, state } = addOLLayer("managed-1");
    setLayers(makeTOCLayer({}));

    startLayerRefresh("layer-1");
    state.visible = false;
    vi.advanceTimersByTime(10_000);

    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(false);
    expect(updateParams).not.toHaveBeenCalled();
  });

  it("stops when the managed layer is removed", () => {
    addOLLayer("managed-1");
    setLayers(makeTOCLayer({}));

    startLayerRefresh("layer-1");
    mockState.olLayers.delete("managed-1");
    vi.advanceTimersByTime(10_000);

    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(false);
  });

  it("group start skips hidden layers and group stop pauses the playing ones", () => {
    addOLLayer("managed-1");
    addOLLayer("managed-2");
    const visibleLayer = makeTOCLayer({ id: "layer-1", managedLayerId: "managed-1" });
    const hiddenLayer = makeTOCLayer({ id: "layer-2", managedLayerId: "managed-2", visible: false });
    setLayers(visibleLayer, hiddenLayer);

    startGroupRefresh([visibleLayer, hiddenLayer]);
    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(true);
    expect(useLayerRefreshStore.getState().playing["layer-2"]).toBeFalsy();

    stopGroupRefresh([visibleLayer, hiddenLayer]);
    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(false);
  });
});

describe("visibility transitions", () => {
  it("starts a refreshable layer when it is turned on", () => {
    addOLLayer("managed-1");
    const layer = makeTOCLayer({});
    setLayers(layer);

    handleTOCVisibilityChange({ allLayers: [layer] }, { allLayers: [makeTOCLayer({ visible: false })] });

    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(true);
  });

  it("stops a playing layer when it is turned off", () => {
    addOLLayer("managed-1");
    const layer = makeTOCLayer({});
    setLayers(layer);
    startLayerRefresh("layer-1");

    handleTOCVisibilityChange({ allLayers: [makeTOCLayer({ visible: false })] }, { allLayers: [layer] });

    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(false);
  });

  it("does not start layers that were already visible on load", () => {
    addOLLayer("managed-1");
    const layer = makeTOCLayer({});
    setLayers(layer);

    handleTOCVisibilityChange({ allLayers: [layer] }, { allLayers: [] });

    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBeFalsy();
  });

  it("starts before the map layer visibility is applied and refreshes once it is visible", () => {
    const { updateParams, state } = addOLLayer("managed-1");
    state.visible = false;
    const layer = makeTOCLayer({});
    setLayers(layer);

    handleTOCVisibilityChange({ allLayers: [layer] }, { allLayers: [makeTOCLayer({ visible: false })] });
    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(true);

    state.visible = true;
    vi.advanceTimersByTime(10_000);
    expect(updateParams).toHaveBeenCalledTimes(1);
  });
});
