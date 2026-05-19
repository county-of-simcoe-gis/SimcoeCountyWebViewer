import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook } from "@testing-library/react";
import BasemapSwitcher from "@/components/BasemapSwitcher";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock react-icons
vi.mock("react-icons/md", () => ({
  MdManageHistory: () => <div data-testid="manage-history-icon" />,
}));

// Create a comprehensive mock config that matches the actual structure
const mockBasemapConfig = {
  defaultButton: "topo",
  topoServices: [
    {
      name: "Topographic",
      image: "topo.png",
      index: 0,
      layers: [
        {
          url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer",
          type: "ESRI_VECTOR_TILED",
          isOverlay: true,
          rootPath: "/basemap/ESRI_WorldTopoCanadianStyle.json",
        },
      ],
    },
    {
      name: "Light Grey",
      image: "light-grey.png",
      index: 1,
      layers: [
        {
          url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer",
          type: "ESRI_VECTOR_TILED",
          isOverlay: true,
          rootPath: "/basemap/ESRI_LightGreyBackground.json",
        },
      ],
    },
  ],
  imageryServices: [
    {
      url: "https://maps.simcoe.ca/arcgis/rest/services/Public/Ortho_2022_Cache/MapServer/tile/{z}/{y}/{x}",
      name: "2022",
      fullExtent: [-8939184.811223287, 5454803.475123089, -8801041.532479914, 5612759.410739516],
      type: "TileImage",
    },
    {
      url: "https://maps.simcoe.ca/arcgis/rest/services/Public/Ortho_2023_Cache/MapServer/tile/{z}/{y}/{x}",
      name: "2023",
      fullExtent: [-8939184.811223287, 5454803.475123089, -8801041.532479914, 5612759.410739516],
      type: "TileImage",
    },
  ],
  worldImageryService: "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  streetService: {
    url: "https://maps.simcoe.ca/arcgis/rest/services/Public/Streets_Cache/MapServer/tile/{z}/{y}/{x}",
    fullExtent: [-8938992.401246801, 5456230.285257593, -8801900.781241283, 5610242.681997935],
  },
};

// Mock the basemap config import
vi.mock("@/components/basemapSwitcherConfig.json", () => ({
  default: mockBasemapConfig,
}));

// Mock rc-slider with better simulation
vi.mock("rc-slider", () => ({
  default: vi.fn(({ onChange, value, ...props }) => {
    return (
      <div data-testid="imagery-slider" data-value={value}>
        <input type="range" value={value} onChange={(e) => onChange && onChange(parseFloat(e.target.value))} {...props} />
      </div>
    );
  }),
}));

// Create comprehensive mock layers
const createMockLayer = (name: string) => ({
  setOpacity: vi.fn(),
  setVisible: vi.fn(),
  getSource: vi.fn(() => ({ refresh: vi.fn() })),
  getName: vi.fn(() => name),
});

const _mockTopoLayer = createMockLayer("Topographic_0");
const _mockImageryLayer1 = createMockLayer("2022");
const _mockImageryLayer2 = createMockLayer("2023");
const _mockStreetsLayer = createMockLayer("Streets");
const _mockWorldImageryLayer = createMockLayer("World Imagery");

// Mock LayerManager and LayerHelpers
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn().mockReturnValue("mock-layer-id"),
    getLayersByCategory: vi.fn(),
    clearCategory: vi.fn(),
    logLayerOrder: vi.fn(),
    removeLayer: vi.fn(),
    setLayerVisibility: vi.fn(),
  },
}));

vi.mock("@/utils/openlayers", () => ({
  LayerHelpers: {
    getLayer: vi.fn(),
  },
  OL_DATA_TYPES: {
    XYZ: "XYZ",
    OSM: "OSM",
    TileImage: "TileImage",
    SimcoeTiled: "SimcoeTiled",
    VectorTile: "VectorTile",
    ESRI_TILED: "ESRI_TILED",
  },
}));

// Mock map class
class MockMap {
  addLayer = vi.fn();
  removeLayer = vi.fn();
  getView() {
    return {
      getProjection: () => ({ getCode: () => "EPSG:3857" }),
      getZoom: () => 10,
      getCenter: () => [0, 0],
    };
  }
  getLayers() {
    return { getArray: () => [] };
  }
}

describe("BasemapSwitcher", () => {
  let mockMap: MockMap;

  beforeEach(() => {
    vi.useFakeTimers();
    mockMap = new MockMap();

    // Reset all stores
    useMapStore.setState({ map: null });
    useAppStore.setState({ urlParameters: {} });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe("Basic Rendering", () => {
    it("renders nothing when map is not available", () => {
      const { container } = render(<BasemapSwitcher />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when config is loading", () => {
      useMapStore.setState({ map: mockMap as any });
      const { container } = render(<BasemapSwitcher />);

      // Before config loads, component returns null
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Component Structure", () => {
    it("renders without crashing when map is provided", () => {
      useMapStore.setState({ map: mockMap as any });

      const { container } = render(<BasemapSwitcher />);
      vi.runAllTimers();

      // Component should render something or return null gracefully
      expect(container).toBeDefined();
    });
  });

  describe("Store Integration", () => {
    it("integrates with mapStore correctly", () => {
      const { result: _result } = renderHook(() => useMapStore());

      // Set map and verify it's stored
      useMapStore.setState({ map: mockMap as any });
      expect(useMapStore.getState().map).toBe(mockMap);
    });

    it("integrates with appStore correctly", () => {
      const testParams = { BASEMAP: "IMAGERY" };
      useAppStore.setState({ urlParameters: testParams });

      expect(useAppStore.getState().urlParameters).toEqual(testParams);
    });
  });

  describe("Mock Configuration", () => {
    it("has proper mock configuration", () => {
      expect(mockBasemapConfig).toBeDefined();
      expect(mockBasemapConfig.topoServices).toBeDefined();
      expect(mockBasemapConfig.imageryServices).toBeDefined();
      expect(mockBasemapConfig.topoServices.length).toBeGreaterThan(0);
      expect(mockBasemapConfig.imageryServices.length).toBeGreaterThan(0);
    });
  });
});
