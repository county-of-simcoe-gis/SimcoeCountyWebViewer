import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Grid from "@/components/map/controls/Grid";
import type Map from "ol/Map";
import Graticule from "ol/layer/Graticule";
import { LayerManager } from "@/utils/openlayers/LayerManager";

// Mock LayerManager
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn().mockReturnValue("grid-layer-id"),
    removeLayer: vi.fn().mockReturnValue(true),
  },
}));

// Mock OpenLayers Graticule
vi.mock("ol/layer/Graticule", () => {
  return {
    default: vi.fn(function () {
      return {
        setMap: vi.fn(),
      };
    }),
  };
});

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
    // Re-set mock return values after clearing
    vi.mocked(LayerManager.addLayer).mockReturnValue("grid-layer-id");
    vi.mocked(LayerManager.removeLayer).mockReturnValue(true);
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

  it("toggles grid when button is clicked", async () => {
    render(<Grid map={mockMap} />);

    const button = screen.getByTitle("Show map grid");

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByTitle("Hide map grid")).toBeInTheDocument();
    });

    expect(LayerManager.addLayer).toHaveBeenCalled();
    expect(LayerManager.addLayer).toHaveBeenCalledWith(expect.any(Object), "Overlay", "Grid Graticule", {
      index: 0,
      metadata: {
        isGrid: true,
        isOverlay: true,
      },
    });
  });

  it("removes grid when toggled off", async () => {
    render(<Grid map={mockMap} />);

    const button = screen.getByTitle("Show map grid");

    // Turn on grid
    await act(async () => {
      fireEvent.click(button);
    });

    // Verify that addLayer was called and the grid state updated
    await waitFor(() => {
      expect(screen.getByTitle("Hide map grid")).toBeInTheDocument();
    });

    // Check that addLayer was called
    expect(LayerManager.addLayer).toHaveBeenCalled();
    expect(LayerManager.addLayer).toHaveBeenCalledWith(expect.any(Object), "Overlay", "Grid Graticule", {
      index: 0,
      metadata: {
        isGrid: true,
        isOverlay: true,
      },
    });

    // Turn off grid - query for the updated button title
    await waitFor(() => {
      expect(screen.getByTitle("Hide map grid")).toBeInTheDocument();
    });

    const hideButton = screen.getByTitle("Hide map grid");
    await act(async () => {
      fireEvent.click(hideButton);
    });

    // Wait for state to update back to "Show"
    await waitFor(() => {
      expect(screen.getByTitle("Show map grid")).toBeInTheDocument();
    });

    // Verify removeLayer was called at some point (check all calls, not after clearing)
    expect(LayerManager.removeLayer).toHaveBeenCalled();
    expect(LayerManager.removeLayer).toHaveBeenCalledWith("grid-layer-id");
  });

  it("creates graticule with correct styling", () => {
    render(<Grid map={mockMap} />);

    expect(Graticule).toHaveBeenCalledWith({
      strokeStyle: expect.any(Object),
      showLabels: true,
      wrapX: false,
    });
  });

  it("cleans up layer on unmount when grid is active", async () => {
    const { unmount } = render(<Grid map={mockMap} />);

    // Turn on grid
    const button = screen.getByTitle("Show map grid");
    await act(async () => {
      fireEvent.click(button);
    });

    // Clear the mock to focus on unmount behavior
    vi.mocked(LayerManager.removeLayer).mockClear();

    unmount();

    // Should be called once on unmount cleanup
    await waitFor(() => {
      expect(LayerManager.removeLayer).toHaveBeenCalledTimes(1);
    });
    expect(LayerManager.removeLayer).toHaveBeenCalledWith("grid-layer-id");
  });

  it("does not call removeLayer when layer is not in map on unmount", () => {
    // Reset all mocks specifically for this test
    vi.clearAllMocks();

    const { unmount } = render(<Grid map={mockMap} />);

    // Don't turn on grid - it should remain off
    // Reset the call count after initial render to focus on unmount behavior
    vi.mocked(LayerManager.removeLayer).mockClear();

    unmount();

    // Since the grid was never turned on, removeLayer should not be called
    expect(LayerManager.removeLayer).toHaveBeenCalledTimes(0);
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
