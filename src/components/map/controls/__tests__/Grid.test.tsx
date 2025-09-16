import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Grid from "../Grid";
import type Map from "ol/Map";
import Graticule from "ol/layer/Graticule";

// Mock OpenLayers Graticule
const mockGraticule = {
  setMap: vi.fn(),
};
//clear render mocks
vi.clearAllMocks();
vi.mock("ol/layer/Graticule", () => ({
  default: vi.fn(() => mockGraticule),
}));

vi.mock("ol/style", () => ({
  Stroke: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

const mockMap = {
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  getLayers: vi.fn(),
} as unknown as Map;

const mockLayers = {
  getArray: vi.fn().mockReturnValue([]),
};

describe("Grid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getLayers = vi.fn().mockReturnValue(mockLayers);
    mockLayers.getArray.mockReturnValue([]);
  });

  it("renders grid toggle button", () => {
    render(<Grid map={mockMap} />);

    expect(screen.getByTitle("Show map grid")).toBeInTheDocument();
  });

  it("shows grid on icon when grid is hidden", () => {
    render(<Grid map={mockMap} />);

    const button = screen.getByTitle("Show map grid");
    expect(button).toBeInTheDocument();
  });

  it("toggles grid when button is clicked", () => {
    render(<Grid map={mockMap} />);

    const button = screen.getByTitle("Show map grid");
    fireEvent.click(button);

    expect(mockMap.addLayer).toHaveBeenCalledWith(mockGraticule);
    expect(screen.getByTitle("Hide map grid")).toBeInTheDocument();
  });

  it("removes grid when toggled off", () => {
    render(<Grid map={mockMap} />);

    const button = screen.getByTitle("Show map grid");

    // Turn on grid
    fireEvent.click(button);
    expect(mockMap.addLayer).toHaveBeenCalledWith(mockGraticule);

    // Turn off grid
    const hideButton = screen.getByTitle("Hide map grid");
    fireEvent.click(hideButton);
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockGraticule);
  });

  it("creates graticule with correct styling", () => {
    render(<Grid map={mockMap} />);

    expect(Graticule).toHaveBeenCalledWith({
      strokeStyle: expect.any(Object),
      showLabels: true,
      wrapX: false,
      zIndex: 10000,
    });
  });

  it("cleans up layer on unmount when grid is active", () => {
    const { unmount } = render(<Grid map={mockMap} />);

    // Turn on grid
    const button = screen.getByTitle("Show map grid");
    fireEvent.click(button);

    // Mock that the layer exists in the map
    mockLayers.getArray.mockReturnValue([mockGraticule]);

    unmount();

    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockGraticule);
  });

  it("does not call removeLayer when layer is not in map on unmount", () => {
    // Reset all mocks specifically for this test
    vi.clearAllMocks();
    mockMap.getLayers = vi.fn().mockReturnValue(mockLayers);
    mockLayers.getArray.mockReturnValue([]); // Empty array means layer not in map

    const { unmount } = render(<Grid map={mockMap} />);

    // Reset the call count after initial render to focus on unmount behavior
    mockMap.removeLayer.mockClear();

    unmount();

    // Since the layer is not in the map (empty array), removeLayer should not be called
    expect(mockMap.removeLayer).toHaveBeenCalledTimes(0);
  });

  it("handles missing map gracefully", () => {
    render(<Grid />);

    const button = screen.getByTitle("Show map grid");
    fireEvent.click(button);

    // Should not throw error and should still show the button
    expect(button).toBeInTheDocument();
  });

  it("has correct button styling", () => {
    render(<Grid map={mockMap} />);

    const button = screen.getByTitle("Show map grid");
    expect(button).toHaveClass("w-[38px]", "h-[38px]", "bg-gradient-to-b");
  });

  it("updates button appearance when grid state changes", () => {
    render(<Grid map={mockMap} />);

    // Initially shows "Show" title
    expect(screen.getByTitle("Show map grid")).toBeInTheDocument();

    // Click to show grid
    const button = screen.getByTitle("Show map grid");
    fireEvent.click(button);

    // Now shows "Hide" title
    expect(screen.getByTitle("Hide map grid")).toBeInTheDocument();
  });
});
