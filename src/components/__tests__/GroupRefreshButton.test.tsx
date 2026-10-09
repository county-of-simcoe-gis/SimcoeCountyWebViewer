import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GroupRefreshButton from "@/components/TOC/GroupRefreshButton";
import type { TOCLayer } from "@/stores/tocStore";
import { useLayerRefreshStore } from "@/stores/layerRefreshStore";
import { stopGroupRefresh } from "@/utils/openlayers/LayerRefresh";

const mockState = vi.hoisted(() => ({
  allLayers: [] as TOCLayer[],
  olLayers: new Map<string, unknown>(),
}));

vi.mock("@/stores/tocStore", () => ({
  useTOCStore: Object.assign((selector: (s: { allLayers: TOCLayer[] }) => unknown) => selector({ allLayers: mockState.allLayers }), {
    getState: () => ({ allLayers: mockState.allLayers }),
    subscribe: vi.fn(),
  }),
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
  return { id: "layer-1", name: "roads", refreshInterval: 10, visible: true, managedLayerId: "managed-1", ...overrides } as TOCLayer;
}

function addOLLayer(managedLayerId: string) {
  mockState.olLayers.set(managedLayerId, {
    getVisible: () => true,
    getSource: () => ({ updateParams: vi.fn() }),
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockState.olLayers.clear();
  mockState.allLayers = [];
  useLayerRefreshStore.setState({ playing: {} });
});

afterEach(() => {
  stopGroupRefresh(mockState.allLayers);
  vi.useRealTimers();
});

describe("GroupRefreshButton", () => {
  it("renders nothing when no layer has a refresh interval", () => {
    const layers = [makeTOCLayer({ refreshInterval: 0 })];
    mockState.allLayers = layers;

    const { container } = render(<GroupRefreshButton layers={layers} />);
    expect(container.firstChild).toBeNull();
  });

  it("starts every visible refreshable layer and switches to pause", () => {
    addOLLayer("managed-1");
    const layers = [makeTOCLayer({})];
    mockState.allLayers = layers;

    render(<GroupRefreshButton layers={layers} />);
    fireEvent.click(screen.getByRole("button", { name: "Start timed refresh for this group" }));

    expect(useLayerRefreshStore.getState().playing["layer-1"]).toBe(true);
    expect(screen.getByRole("button", { name: "Pause timed refresh for this group" })).toBeTruthy();
  });

  it("is disabled when every refreshable layer is hidden", () => {
    addOLLayer("managed-1");
    const layers = [makeTOCLayer({ visible: false })];
    mockState.allLayers = layers;

    render(<GroupRefreshButton layers={layers} />);
    expect((screen.getByRole("button", { name: "Start timed refresh for this group" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
