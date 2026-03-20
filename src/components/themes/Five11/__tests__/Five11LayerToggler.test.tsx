import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Five11LayerToggler from "../Five11LayerToggler";
import type { Five11LayerConfig } from "../types";
import { LayerManager } from "@/utils/openlayers/LayerManager";

// Mock axiosInstance
const mockAxiosGet = vi.fn();
vi.mock("@/lib/axiosInstance", () => ({
  default: {
    get: (...args: unknown[]) => mockAxiosGet(...args),
  },
}));

// Mock mapStore
const mockMap = {
  getView: () => ({
    calculateExtent: () => [0, 0, 100, 100],
  }),
  getSize: () => [800, 600],
  on: vi.fn(),
  un: vi.fn(),
};

vi.mock("@/stores/mapStore", () => ({
  useMapStore: Object.assign(
    vi.fn((selector?: (state: any) => any) => {
      const state = { map: mockMap };
      return selector ? selector(state) : state;
    }),
    {
      getState: vi.fn(() => ({ map: mockMap })),
      setState: vi.fn(),
      subscribe: vi.fn(),
    },
  ),
}));

// Mock LayerManager
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "mock-layer-id"),
    removeLayer: vi.fn(),
    setLayerVisibility: vi.fn(),
  },
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

const pointLayer: Five11LayerConfig = {
  apiUrl: "/api/public/map/theme/511/waze/alerts/ACCIDENT",
  layerName: "511-waze-accident",
  displayName: "Accidents",
  imageName: "waze_accident.png",
  clickable: true,
  visible: true,
  zIndex: 2209,
  geometryType: "Point",
};

const lineLayer: Five11LayerConfig = {
  apiUrl: "/api/public/map/theme/511/waze/jams",
  layerName: "511-waze-jam-lines",
  displayName: "Traffic Jam (Lines)",
  imageName: "waze_traffic_jam_line.png",
  clickable: true,
  visible: true,
  zIndex: 2213,
  geometryType: "LineString",
};

function createGeoJsonResponse(featureCount: number) {
  const features = Array.from({ length: featureCount }, (_, i) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [-79.4, 44.3] },
    properties: { id: i + 1, name: `Feature ${i + 1}` },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

describe("Five11LayerToggler", () => {
  const mockOnVisibilityChange = vi.fn();
  const mockOnLayerIdChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosGet.mockReset();
  });

  it("renders the layer display name", () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(3) });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    expect(screen.getByText("Accidents")).toBeInTheDocument();
  });

  it("renders a checkbox", () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(3) });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("checkbox reflects visible=true prop", () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(3) });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("checkbox reflects visible=false prop", () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(3) });

    render(<Five11LayerToggler layer={pointLayer} visible={false} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("calls onVisibilityChange when checkbox is clicked", () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(3) });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(mockOnVisibilityChange).toHaveBeenCalledWith("511-waze-accident", false);
  });

  it("calls onVisibilityChange when label text is clicked", () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(3) });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    fireEvent.click(screen.getByText("Accidents"));
    expect(mockOnVisibilityChange).toHaveBeenCalledWith("511-waze-accident", false);
  });

  it("displays feature count after loading", async () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(5) });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    await waitFor(() => {
      expect(screen.getByText("(5)")).toBeInTheDocument();
    });
  });

  it("shows loading spinner initially", () => {
    mockAxiosGet.mockReturnValueOnce(new Promise(() => {})); // never resolves

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    expect(document.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("renders an image icon for point layers", () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(1) });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    const img = screen.getByAltText("Accidents");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/five11/waze_accident.png");
  });

  it("renders a line indicator for LineString layers", () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(1) });

    const { container } = render(<Five11LayerToggler layer={lineLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    // Line layers render a colored div instead of an Image
    const lineIndicator = container.querySelector(".bg-red-500");
    expect(lineIndicator).toBeInTheDocument();
  });

  it("adds layer to map via LayerManager on successful fetch", async () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(2) });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    await waitFor(() => {
      expect(LayerManager.addLayer).toHaveBeenCalledWith(expect.any(Object), "Themes", "Accidents", expect.objectContaining({ visible: true }));
    });
  });

  it("notifies parent of layer id after creation", async () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(2) });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    await waitFor(() => {
      expect(mockOnLayerIdChange).toHaveBeenCalledWith("511-waze-accident", "mock-layer-id");
    });
  });

  it("removes layer via LayerManager on unmount", async () => {
    mockAxiosGet.mockResolvedValueOnce({ data: createGeoJsonResponse(2) });

    const { unmount } = render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    await waitFor(() => {
      expect(LayerManager.addLayer).toHaveBeenCalled();
    });

    unmount();

    expect(LayerManager.removeLayer).toHaveBeenCalledWith("mock-layer-id");
  });

  it("handles failed API response gracefully", async () => {
    mockAxiosGet.mockRejectedValueOnce(new Error("Server Error"));

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    // Should not crash, and should show 0 count (no "(0)" text displayed when count is 0)
    await waitFor(() => {
      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  it("handles invalid data structure gracefully", async () => {
    mockAxiosGet.mockResolvedValueOnce({ data: [] });

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    // Should not crash
    await waitFor(() => {
      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  it("disables checkbox while loading", () => {
    mockAxiosGet.mockReturnValueOnce(new Promise(() => {})); // never resolves

    render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("updates LayerManager visibility when visible prop changes", async () => {
    mockAxiosGet.mockResolvedValue({ data: createGeoJsonResponse(2) });

    const { rerender } = render(<Five11LayerToggler layer={pointLayer} visible={true} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    await waitFor(() => {
      expect(LayerManager.addLayer).toHaveBeenCalled();
    });

    rerender(<Five11LayerToggler layer={pointLayer} visible={false} onVisibilityChange={mockOnVisibilityChange} onLayerIdChange={mockOnLayerIdChange} />);

    await waitFor(() => {
      expect(LayerManager.setLayerVisibility).toHaveBeenCalledWith("mock-layer-id", false);
    });
  });
});
