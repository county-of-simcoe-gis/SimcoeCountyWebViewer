import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import ThemeLayers from "../ThemeLayers";
import { getURLParameter } from "@/utils/helpersUrl";
import { queryFeaturesByAttribute } from "@/utils/geoServerClient";

const { mockFit, mockShow } = vi.hoisted(() => ({ mockFit: vi.fn(), mockShow: vi.fn() }));

vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "mock-layer-id"),
    removeLayer: vi.fn(),
    setLayerVisibility: vi.fn(),
  },
}));

vi.mock("@/utils/openlayers", () => ({
  LayerHelpers: {
    getLayer: vi.fn((config, callback) => callback({ setProperties: vi.fn() })),
  },
  OL_DATA_TYPES: { ImageWMS: "ImageWMS" },
}));

vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn((selector) => {
    const state = {
      map: {
        getView: () => ({ fit: mockFit }),
        getSize: () => [800, 600],
      },
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/stores/popupStore", () => ({
  usePopupStore: { getState: () => ({ show: mockShow }) },
}));

vi.mock("@/utils/helpersUrl", () => ({
  getURLParameter: vi.fn(() => null),
}));

vi.mock("@/utils/geoServerClient", () => ({
  queryFeaturesByAttribute: vi.fn(),
  getFeatureExtent: vi.fn(() => [1, 2, 3, 4]),
  getFeatureCenter: vi.fn(() => [2, 3]),
}));

const bagTagFeature = { type: "Feature", geometry: { type: "Point", coordinates: [2, 3] }, properties: { name: "Bag Tag Site" } };

const bagTagLayer = {
  displayName: "Bag Tag Locations",
  serverUrl: "https://example.com/geoserver",
  layerName: "simcoe:Bag Tag Locations Theme",
  visible: true,
  UrlParameter: { parameterName: "BAGTAG", fieldName: "arn" },
};

describe("ThemeLayers UrlParameter zoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve({ text: () => Promise.resolve("") })) as unknown as typeof fetch;
  });

  it("does not query when no layer has a UrlParameter", () => {
    vi.mocked(getURLParameter).mockReturnValue("123");
    render(<ThemeLayers layers={[{ ...bagTagLayer, UrlParameter: undefined, layerName: "test:none" }]} themeId="test-theme" />);

    expect(queryFeaturesByAttribute).not.toHaveBeenCalled();
  });

  it("does not query when the URL parameter is absent", () => {
    vi.mocked(getURLParameter).mockReturnValue(null);
    render(<ThemeLayers layers={[{ ...bagTagLayer, layerName: "test:absent" }]} themeId="test-theme" />);

    expect(queryFeaturesByAttribute).not.toHaveBeenCalled();
  });

  it("queries by the configured field, zooms to the feature and shows a popup", async () => {
    vi.mocked(getURLParameter).mockImplementation((name) => (name === "BAGTAG" ? "435304000626200" : null));
    vi.mocked(queryFeaturesByAttribute).mockResolvedValue({ success: true, count: 1, feature: bagTagFeature, features: [bagTagFeature] } as never);

    render(<ThemeLayers layers={[bagTagLayer]} themeId="solidwastefacilities" />);

    await waitFor(() => {
      expect(queryFeaturesByAttribute).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceUrl: "https://example.com/geoserver/wfs",
          layerName: "simcoe:Bag Tag Locations Theme",
          attributeName: "arn",
          attributeValue: "435304000626200",
        }),
      );
      expect(mockFit).toHaveBeenCalled();
      expect(mockShow).toHaveBeenCalledWith([2, 3], expect.anything(), "Bag Tag Locations", "simcoe:Bag Tag Locations Theme");
    });
  });

  it("does not zoom or show a popup when no feature matches", async () => {
    vi.mocked(getURLParameter).mockImplementation((name) => (name === "BAGTAG" ? "000" : null));
    vi.mocked(queryFeaturesByAttribute).mockResolvedValue({ success: false, error: "No features found", count: 0 } as never);

    render(<ThemeLayers layers={[{ ...bagTagLayer, layerName: "test:nomatch" }]} themeId="solidwastefacilities" />);

    await waitFor(() => {
      expect(queryFeaturesByAttribute).toHaveBeenCalled();
    });
    expect(mockFit).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("zooms only once per page load when the theme is mounted again", async () => {
    vi.mocked(getURLParameter).mockImplementation((name) => (name === "BAGTAG" ? "435304000626200" : null));
    vi.mocked(queryFeaturesByAttribute).mockResolvedValue({ success: true, count: 1, feature: bagTagFeature, features: [bagTagFeature] } as never);
    const layers = [{ ...bagTagLayer, layerName: "test:oneshot" }];

    const first = render(<ThemeLayers layers={layers} themeId="solidwastefacilities" />);
    await waitFor(() => expect(queryFeaturesByAttribute).toHaveBeenCalledTimes(1));
    first.unmount();

    render(<ThemeLayers layers={layers} themeId="solidwastefacilities" />);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(queryFeaturesByAttribute).toHaveBeenCalledTimes(1);
  });
});
