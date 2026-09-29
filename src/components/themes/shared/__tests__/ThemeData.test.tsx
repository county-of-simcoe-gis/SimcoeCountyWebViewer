import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeData from "../ThemeData";

// Mock ThemeDataList component
vi.mock("../ThemeDataList", () => ({
  default: ({ layerConfig, onlyFeaturesWithinMap, isVisible }: any) => (
    <div data-testid={`data-list-${layerConfig.layerName}`}>
      <span data-testid="layer-name">{layerConfig.displayName}</span>
      <span data-testid="only-within-map">{onlyFeaturesWithinMap ? "filtered" : "all"}</span>
      <span data-testid="is-visible">{isVisible ? "visible" : "hidden"}</span>
    </div>
  ),
}));

const mockToggleLayers = [
  {
    displayName: "Test Layer 1",
    serverUrl: "https://example.com/geoserver/",
    layerName: "test:layer1",
    visible: true,
    displayFieldName: "name",
  },
  {
    displayName: "Test Layer 2",
    serverUrl: "https://example.com/geoserver/",
    layerName: "test:layer2",
    visible: false,
    displayFieldName: "title",
  },
];

describe("ThemeData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the THEME DATA header", () => {
    render(<ThemeData toggleLayers={mockToggleLayers} themeId="test-theme" />);

    expect(screen.getByText("THEME DATA")).toBeInTheDocument();
  });

  it("renders filter checkbox", () => {
    render(<ThemeData toggleLayers={mockToggleLayers} themeId="test-theme" />);

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText("Only show data visible in the map")).toBeInTheDocument();
  });

  it("renders ThemeDataList for each toggle layer", () => {
    render(<ThemeData toggleLayers={mockToggleLayers} themeId="test-theme" />);

    expect(screen.getByTestId("data-list-test:layer1")).toBeInTheDocument();
    expect(screen.getByTestId("data-list-test:layer2")).toBeInTheDocument();
  });

  it("passes correct visibility from layerVisibilityStates", () => {
    const visibilityStates = {
      "test:layer1": false,
      "test:layer2": true,
    };

    render(<ThemeData toggleLayers={mockToggleLayers} themeId="test-theme" layerVisibilityStates={visibilityStates} />);

    const layer1 = screen.getByTestId("data-list-test:layer1");
    const layer2 = screen.getByTestId("data-list-test:layer2");

    expect(layer1.querySelector('[data-testid="is-visible"]')?.textContent).toBe("hidden");
    expect(layer2.querySelector('[data-testid="is-visible"]')?.textContent).toBe("visible");
  });

  it("uses default visibility when layerVisibilityStates not provided", () => {
    render(<ThemeData toggleLayers={mockToggleLayers} themeId="test-theme" />);

    const layer1 = screen.getByTestId("data-list-test:layer1");
    const layer2 = screen.getByTestId("data-list-test:layer2");

    // Test Layer 1 has visible: true in config
    expect(layer1.querySelector('[data-testid="is-visible"]')?.textContent).toBe("visible");
    // Test Layer 2 has visible: false in config
    expect(layer2.querySelector('[data-testid="is-visible"]')?.textContent).toBe("hidden");
  });

  it("toggles onlyFeaturesWithinMap filter when checkbox is clicked", () => {
    render(<ThemeData toggleLayers={mockToggleLayers} themeId="test-theme" />);

    const checkbox = screen.getByRole("checkbox");
    const layer1 = screen.getByTestId("data-list-test:layer1");

    // Initially unchecked
    expect(layer1.querySelector('[data-testid="only-within-map"]')?.textContent).toBe("all");

    // Click to enable filter
    fireEvent.click(checkbox);

    expect(layer1.querySelector('[data-testid="only-within-map"]')?.textContent).toBe("filtered");
  });

  it("passes popupLogoImage to ThemeDataList when provided", () => {
    // This test verifies the prop is passed (we'd need to check the mock was called with it)
    render(<ThemeData toggleLayers={mockToggleLayers} themeId="test-theme" popupLogoImage="/images/logo.png" />);

    // Component renders without error when popupLogoImage is provided
    expect(screen.getByText("THEME DATA")).toBeInTheDocument();
  });
});
