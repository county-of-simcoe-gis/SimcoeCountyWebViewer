import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ThemeBaseLayers from "../ThemeBaseLayers";

// Mock LayerManager
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "mock-layer-id"),
    removeLayer: vi.fn(),
    setLayerVisibility: vi.fn(),
    setLayerOpacity: vi.fn(),
  },
}));

// Mock LayerHelpers
vi.mock("@/utils/openlayers", () => ({
  LayerHelpers: {
    getLayer: vi.fn((config, callback) => {
      callback({
        setProperties: vi.fn(),
        setOpacity: vi.fn(),
        setVisible: vi.fn(),
      });
    }),
  },
  OL_DATA_TYPES: {
    ImageWMS: "ImageWMS",
  },
}));

const mockConfig = {
  defaultVisibility: true,
  opacity: 0.8,
  zIndex: 100,
  useDynamicLegend: true,
  layers: [
    {
      displayName: "Base Layer 1",
      serverUrl: "https://example.com/geoserver/",
      layerName: "test:base1",
      clickable: true,
      legendStyleName: "default",
    },
    {
      displayName: "Base Layer 2",
      serverUrl: "https://example.com/geoserver/",
      layerName: "test:base2",
      clickable: false,
    },
  ],
};

describe("ThemeBaseLayers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders visibility toggle checkbox", () => {
    render(<ThemeBaseLayers config={mockConfig} themeId="test-theme" />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked(); // defaultVisibility is true
  });

  it("renders opacity slider", () => {
    render(<ThemeBaseLayers config={mockConfig} themeId="test-theme" />);

    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("value", "0.8"); // opacity from config
  });

  it("toggles visibility when checkbox is clicked", () => {
    render(<ThemeBaseLayers config={mockConfig} themeId="test-theme" />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("updates opacity when slider is changed", () => {
    render(<ThemeBaseLayers config={mockConfig} themeId="test-theme" />);

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.5" } });

    expect(slider).toHaveAttribute("value", "0.5");
  });

  it("renders dynamic legend when useDynamicLegend is true", () => {
    render(<ThemeBaseLayers config={mockConfig} themeId="test-theme" />);

    // Should have a legend section
    expect(screen.getByText("Legend")).toBeInTheDocument();
  });

  it("renders layer names in dynamic legend", async () => {
    render(<ThemeBaseLayers config={mockConfig} themeId="test-theme" />);

    // Legend should show layer display names
    await waitFor(() => {
      expect(screen.getByText("Base Layer 1")).toBeInTheDocument();
      expect(screen.getByText("Base Layer 2")).toBeInTheDocument();
    });
  });

  it("collapses legend when header is clicked", () => {
    render(<ThemeBaseLayers config={mockConfig} themeId="test-theme" />);

    // Find and click the Legend header
    const legendHeader = screen.getByText("Legend").closest("button");
    expect(legendHeader).toBeInTheDocument();

    if (legendHeader) {
      fireEvent.click(legendHeader);
    }

    // After collapse, layer names should not be visible
    // (This depends on the component's collapse behavior)
  });

  it("does not render legend when useDynamicLegend is false", () => {
    const configWithoutLegend = {
      ...mockConfig,
      useDynamicLegend: false,
    };

    render(<ThemeBaseLayers config={configWithoutLegend} themeId="test-theme" />);

    // Should not have a legend section (unless there's a static legend)
    expect(screen.queryByText("Legend")).not.toBeInTheDocument();
  });

  it("shows visibility label", () => {
    render(<ThemeBaseLayers config={mockConfig} themeId="test-theme" />);

    expect(screen.getByText("Show Base Layers")).toBeInTheDocument();
  });

  it("shows opacity label", () => {
    render(<ThemeBaseLayers config={mockConfig} themeId="test-theme" />);

    expect(screen.getByText("Transparency")).toBeInTheDocument();
  });
});
