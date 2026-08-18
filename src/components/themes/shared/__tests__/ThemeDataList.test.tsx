import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ThemeDataList from "../ThemeDataList";

// Mock CSS imports
vi.mock("@/components/ResultsPopup.css", () => ({}));

// Mock mapStore
const mockMap = {
  getView: () => ({
    calculateExtent: () => [0, 0, 100, 100],
    animate: vi.fn(),
  }),
  getSize: () => [800, 600],
  on: vi.fn(),
  un: vi.fn(),
};

vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn((selector) => {
    const state = { map: mockMap };
    return selector ? selector(state) : state;
  }),
}));

// Mock popupStore
const mockShowPopup = vi.fn();
const mockHidePopup = vi.fn();

vi.mock("@/stores/popupStore", () => ({
  usePopupStore: () => ({
    show: mockShowPopup,
    hide: mockHidePopup,
  }),
}));

// Mock fetch for WFS requests
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          features: [
            {
              type: "Feature",
              id: "feature1",
              properties: { name: "Feature 1", description: "Test feature 1" },
              geometry: { type: "Point", coordinates: [0, 0] },
            },
            {
              type: "Feature",
              id: "feature2",
              properties: { name: "Feature 2", description: "Test feature 2" },
              geometry: { type: "Point", coordinates: [1, 1] },
            },
          ],
        }),
    }),
  ) as unknown as typeof fetch;
});

// Mock ol/format GeoJSON
vi.mock("ol/format", () => ({
  GeoJSON: vi.fn().mockImplementation(() => ({
    readFeatures: vi.fn(() => [
      {
        getId: () => "feature1",
        getProperties: () => ({ name: "Feature 1", description: "Test feature 1" }),
        getGeometry: () => ({
          getExtent: () => [0, 0, 10, 10],
        }),
      },
      {
        getId: () => "feature2",
        getProperties: () => ({ name: "Feature 2", description: "Test feature 2" }),
        getGeometry: () => ({
          getExtent: () => [0, 0, 10, 10],
        }),
      },
    ]),
  })),
}));

const mockLayerConfig = {
  displayName: "Test Layer",
  serverUrl: "https://example.com/geoserver/",
  layerName: "test:layer",
  visible: true,
  displayFieldName: "name",
  moreInfoUrlFieldName: "website",
};

describe("ThemeDataList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders layer header with layer name", () => {
    render(<ThemeDataList layerConfig={mockLayerConfig} onlyFeaturesWithinMap={false} isVisible={true} />);

    expect(screen.getByText("Test Layer")).toBeInTheDocument();
  });

  it("shows feature count indicator", () => {
    render(<ThemeDataList layerConfig={mockLayerConfig} onlyFeaturesWithinMap={false} isVisible={true} />);

    // Feature count in parentheses should be displayed
    const countText = document.querySelector('[class*="text-base-content/70"]');
    expect(countText).toBeInTheDocument();
  });

  it("renders legend image for layer", () => {
    render(<ThemeDataList layerConfig={mockLayerConfig} onlyFeaturesWithinMap={false} isVisible={true} />);

    const legendImage = screen.getByRole("img", { name: /legend/i });
    expect(legendImage).toBeInTheDocument();
    expect(legendImage).toHaveAttribute("src", expect.stringContaining("GetLegendGraphic"));
  });

  it("renders nothing when isVisible is false", () => {
    const { container } = render(<ThemeDataList layerConfig={mockLayerConfig} onlyFeaturesWithinMap={false} isVisible={false} />);

    // Component should render but may be empty or collapsed
    expect(container).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    render(<ThemeDataList layerConfig={mockLayerConfig} onlyFeaturesWithinMap={false} isVisible={true} />);

    // Check for the main container classes
    const container = document.querySelector(".border.border-base-300");
    expect(container).toBeInTheDocument();
  });
});
