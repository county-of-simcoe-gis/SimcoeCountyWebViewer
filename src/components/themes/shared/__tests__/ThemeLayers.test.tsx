import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ThemeLayers from "../ThemeLayers";

// Mock CSS imports
vi.mock("../ThemeLayers.css", () => ({}));

// Mock LayerManager
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "mock-layer-id"),
    removeLayer: vi.fn(),
    setLayerVisibility: vi.fn(),
  },
}));

// Mock LayerHelpers
vi.mock("@/utils/openlayers", () => ({
  LayerHelpers: {
    getLayer: vi.fn((config, callback) => {
      callback({
        setProperties: vi.fn(),
      });
    }),
  },
  OL_DATA_TYPES: {
    ImageWMS: "ImageWMS",
  },
}));

// Mock mapStore
vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn((selector) => {
    const state = {
      map: {
        getView: () => ({
          calculateExtent: () => [0, 0, 100, 100],
        }),
        getSize: () => [800, 600],
        on: vi.fn(),
        un: vi.fn(),
      },
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock fetch for feature counts
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      text: () => Promise.resolve('<?xml version="1.0"?><wfs:FeatureCollection numberOfFeatures="42"/>'),
    }),
  ) as unknown as typeof fetch;
});

const mockLayers = [
  {
    displayName: "Test Layer 1",
    serverUrl: "https://example.com/geoserver/",
    layerName: "test:layer1",
    visible: true,
  },
  {
    displayName: "Test Layer 2",
    serverUrl: "https://example.com/geoserver/",
    layerName: "test:layer2",
    visible: false,
  },
];

describe("ThemeLayers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all layers with checkboxes", async () => {
    render(<ThemeLayers layers={mockLayers} themeId="test-theme" />);

    expect(screen.getByText("Test Layer 1")).toBeInTheDocument();
    expect(screen.getByText("Test Layer 2")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
  });

  it("renders Show All and Hide All buttons", () => {
    render(<ThemeLayers layers={mockLayers} themeId="test-theme" />);

    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hide all/i })).toBeInTheDocument();
  });

  it("initializes checkboxes based on layer visibility config", () => {
    render(<ThemeLayers layers={mockLayers} themeId="test-theme" />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked(); // Test Layer 1 visible: true
    expect(checkboxes[1]).not.toBeChecked(); // Test Layer 2 visible: false
  });

  it("toggles layer visibility when checkbox is clicked", async () => {
    const onVisibilityChange = vi.fn();
    render(<ThemeLayers layers={mockLayers} themeId="test-theme" onVisibilityChange={onVisibilityChange} />);

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Toggle Test Layer 1 off

    await waitFor(() => {
      expect(onVisibilityChange).toHaveBeenCalledWith(
        expect.objectContaining({
          "test:layer1": false,
        }),
      );
    });
  });

  it("shows all layers when Show All is clicked", async () => {
    const onVisibilityChange = vi.fn();
    render(<ThemeLayers layers={mockLayers} themeId="test-theme" onVisibilityChange={onVisibilityChange} />);

    fireEvent.click(screen.getByRole("button", { name: /show all/i }));

    await waitFor(() => {
      expect(onVisibilityChange).toHaveBeenCalledWith(
        expect.objectContaining({
          "test:layer1": true,
          "test:layer2": true,
        }),
      );
    });
  });

  it("hides all layers when Hide All is clicked", async () => {
    const onVisibilityChange = vi.fn();
    render(<ThemeLayers layers={mockLayers} themeId="test-theme" onVisibilityChange={onVisibilityChange} />);

    fireEvent.click(screen.getByRole("button", { name: /hide all/i }));

    await waitFor(() => {
      expect(onVisibilityChange).toHaveBeenCalledWith(
        expect.objectContaining({
          "test:layer1": false,
          "test:layer2": false,
        }),
      );
    });
  });

  it("renders legend images from WMS GetLegendGraphic", () => {
    render(<ThemeLayers layers={mockLayers} themeId="test-theme" />);

    // Check that legend images are rendered via GetLegendGraphic URLs
    const legendImages = document.querySelectorAll('img[src*="GetLegendGraphic"]');
    expect(legendImages.length).toBeGreaterThan(0);
  });

  it("renders layer display names", () => {
    render(<ThemeLayers layers={mockLayers} themeId="test-theme" />);

    expect(screen.getByText("Test Layer 1")).toBeInTheDocument();
    expect(screen.getByText("Test Layer 2")).toBeInTheDocument();
  });
});
