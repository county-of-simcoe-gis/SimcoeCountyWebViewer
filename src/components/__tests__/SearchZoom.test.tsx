import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { transform } from "ol/proj";
import SearchZoom from "@/components/SearchZoom";
import { useMapStore } from "@/stores/mapStore";

vi.mock("ol/layer", () => ({
  Vector: class {
    set = vi.fn();
    setStyle = vi.fn();
    getSource = vi.fn(() => ({ addFeature: vi.fn(), clear: vi.fn() }));
  },
}));

vi.mock("ol/source", () => ({
  Vector: class {},
}));

vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "layer-id"),
    removeLayer: vi.fn(),
  },
}));

vi.mock("@/utils/openlayers/InteractionManager", () => ({
  InteractionManager: {
    registerHandler: vi.fn(),
    unregisterHandler: vi.fn(),
  },
}));

vi.mock("@/components/ResultsPopup", () => ({
  createIdentifyResult: vi.fn(() => ({})),
}));

const mockView = {
  cancelAnimations: vi.fn(),
  animate: vi.fn(),
  fit: vi.fn(),
  setZoom: vi.fn(),
  setCenter: vi.fn(),
};
const mockMap = { getView: () => mockView };

const osmResult = { name: "Barrie, Ontario", type: "Open Street Map", x: -79.69, y: 44.39, place_id: "123" };

function getGeocodedHandler() {
  return (window as unknown as { searchZoomHandlers: { handleGeocodedResult: (r: unknown) => void } }).searchZoomHandlers.handleGeocodedResult;
}

describe("SearchZoom handleGeocodedResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMapStore.setState({ map: mockMap as never });
    render(<SearchZoom />);
  });

  afterEach(() => {
    cleanup();
    useMapStore.setState({ map: null });
  });

  it("animates an OSM result to its web mercator center at zoom 18", () => {
    getGeocodedHandler()(osmResult);

    const expectedCenter = transform([-79.69, 44.39], "EPSG:4326", "EPSG:3857");
    expect(mockView.animate).toHaveBeenCalledWith({ center: expectedCenter, zoom: 18, duration: 1000 });
  });

  it("does not use fit or setZoom, which would drop the center move", () => {
    getGeocodedHandler()(osmResult);

    expect(mockView.fit).not.toHaveBeenCalled();
    expect(mockView.setZoom).not.toHaveBeenCalled();
  });

  it("cancels the previous animation before animating to the next result", () => {
    getGeocodedHandler()(osmResult);
    getGeocodedHandler()({ ...osmResult, name: "Orillia", x: -79.42, y: 44.6, place_id: "456" });

    expect(mockView.cancelAnimations).toHaveBeenCalledTimes(2);
    expect(mockView.animate).toHaveBeenCalledTimes(2);
    expect(mockView.cancelAnimations.mock.invocationCallOrder[1]).toBeLessThan(mockView.animate.mock.invocationCallOrder[1]);
  });
});
