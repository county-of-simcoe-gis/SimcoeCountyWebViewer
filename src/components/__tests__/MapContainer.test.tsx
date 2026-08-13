import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import MapContainer from "@/components/map/MapContainer";
import { useAppStore } from "@/stores/appStore";

// Mock CSS imports
vi.mock("ol/ol.css", () => ({}));
vi.mock("@/components/MapContainer.css", () => ({}));
vi.mock("@/components/map/controls/MapControls.css", () => ({}));

// Mock config
vi.mock("@/config.json", () => ({
  default: {
    centerCoords: [-8878504.68, 5543492.45],
    defaultZoom: 10,
    maxZoom: 20,
    controls: {
      rotate: true,
      fullScreen: true,
      zoomInOut: true,
      currentLocation: true,
      zoomExtent: true,
      scale: true,
      scaleLine: true,
      basemap: true,
      gitHubButton: true,
      scaleSelector: false,
      showGrid: false,
      extentHistory: false,
      attribution: true,
    },
  },
}));

// Mock useAppStore
const mockAppStoreState = {
  setMapLoading: vi.fn(),
  // Permissions API helpers used by usePermissions
  setPermissionState: vi.fn(),
  permissions: {},
  urlParameters: {},
  config: {
    centerCoords: [-8878504.68, 5543492.45],
    defaultZoom: 10,
    maxZoom: 20,
    controls: {
      rotate: true,
      fullScreen: true,
      zoomInOut: true,
      currentLocation: true,
      zoomExtent: true,
      scale: true,
      scaleLine: true,
      basemap: true,
      gitHubButton: true,
      scaleSelector: false,
      showGrid: false,
      extentHistory: false,
      attribution: true,
    },
  },
};

vi.mock("@/stores/appStore", () => ({
  useAppStore: Object.assign(
    vi.fn((selector?: (state: typeof mockAppStoreState) => unknown) => {
      if (typeof selector === "function") return selector(mockAppStoreState);
      return mockAppStoreState;
    }),
    {
      getState: vi.fn(() => mockAppStoreState),
      setState: vi.fn(),
      subscribe: vi.fn(),
    },
  ),
}));

// Mock other required stores with proper state management
const mockMapStore: Record<string, any> = {
  map: null,
  setMap: vi.fn((newMap: unknown) => {
    mockMapStore.map = newMap;
  }),
  addLoadedItem: vi.fn(),
  setMapControls: vi.fn(),
  setCurrentExtent: vi.fn(),
  setCurrentZoom: vi.fn(),
  setCurrentCenter: vi.fn(),
  initExtentHistory: vi.fn(),
  saveCurrentExtentToHistory: vi.fn(),
  controlVisibility: {
    rotate: true,
    fullScreen: true,
    zoomInOut: true,
    currentLocation: true,
    zoomExtent: true,
    extentHistory: true,
    scale: true,
    scaleLine: true,
    basemap: true,
    grid: false,
    gitHubButton: true,
    scaleSelector: false,
  },
  setControlVisibility: vi.fn(),
  resetControlVisibilityToDefaults: vi.fn(),
  initControlVisibility: vi.fn(),
};

vi.mock("@/stores/mapStore", () => ({
  useMapStore: Object.assign(
    vi.fn((selector?: any) => (typeof selector === "function" ? selector(mockMapStore) : mockMapStore)),
    {
      getState: vi.fn(() => mockMapStore),
      setState: vi.fn(),
      subscribe: vi.fn(),
    },
  ),
}));

vi.mock("@/stores/eventStore", () => ({
  useEventStore: vi.fn((selector?: any) => {
    const state = {
      emit: vi.fn(),
      addListener: vi.fn(() => "listener-id"),
      removeListener: vi.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

const mockLayerManagerStoreState = {
  addLayer: vi.fn(() => "test-layer-id"),
  removeLayer: vi.fn(),
  getLayer: vi.fn(),
  getAllLayers: vi.fn(() => []),
};

vi.mock("@/stores/layerManagerStore", () => ({
  useLayerManagerStore: Object.assign(
    vi.fn((selector?: any) => (typeof selector === "function" ? selector(mockLayerManagerStoreState) : mockLayerManagerStoreState)),
    {
      getState: vi.fn(() => mockLayerManagerStoreState),
      setState: vi.fn(),
      subscribe: vi.fn(),
    },
  ),
}));

vi.mock("@/stores/sidebarStore", () => ({
  useSidebarStore: vi.fn((selector?: any) => {
    const state = {
      isOpen: false,
    };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

// Mock OpenLayers classes
const mockView = {
  on: vi.fn(),
  getZoom: vi.fn(() => 10),
  getCenter: vi.fn(() => [0, 0]),
  calculateExtent: vi.fn(() => [0, 0, 100, 100]),
  setCenter: vi.fn(),
  setZoom: vi.fn(),
  fit: vi.fn(),
};

const mockMapInstance = {
  setTarget: vi.fn(),
  on: vi.fn(),
  updateSize: vi.fn(),
  addControl: vi.fn(),
  removeControl: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  addOverlay: vi.fn(),
  removeOverlay: vi.fn(),
  getSize: vi.fn(() => [1024, 768]),
  getView: vi.fn(() => mockView),
  getInteractions: vi.fn(() => ({
    getArray: vi.fn(() => []),
  })),
  getLayers: vi.fn(() => ({
    getArray: vi.fn(() => []),
  })),
  addInteraction: vi.fn(),
  removeInteraction: vi.fn(),
};

vi.mock("ol/Map", () => ({
  default: vi.fn(function () {
    return mockMapInstance;
  }),
}));

vi.mock("ol/View", () => ({
  default: vi.fn(function () {
    return mockView;
  }),
}));

vi.mock("ol/interaction", () => ({
  defaults: vi.fn(() => ({
    extend: vi.fn(() => []),
  })),
  MouseWheelZoom: vi.fn(),
  PinchRotate: vi.fn(),
  DragRotate: vi.fn(),
  Interaction: class MockInteraction {
    setActive = vi.fn();
    getActive = vi.fn(() => true);
    getMap = vi.fn();
  },
}));

vi.mock("ol/control", () => ({
  ScaleLine: vi.fn(function () {}),
  Attribution: vi.fn(function () {}),
}));

const mockFeature = {
  getGeometry: vi.fn(() => ({
    getExtent: vi.fn(() => [0, 0, 100, 100]),
  })),
  setStyle: vi.fn(),
};

vi.mock("ol", () => ({
  Feature: vi.fn(function () {
    return mockFeature;
  }),
  Overlay: vi.fn(function () {
    return {
      setPosition: vi.fn(),
      getElement: vi.fn(),
      setElement: vi.fn(),
    };
  }),
}));

vi.mock("ol/geom", () => ({
  Point: vi.fn(function () {}),
}));

const mockVectorSource = {
  addFeature: vi.fn(),
  removeFeature: vi.fn(),
  clear: vi.fn(),
};

vi.mock("ol/layer", () => ({
  Vector: vi.fn(function () {
    return {
      getSource: vi.fn(() => mockVectorSource),
    };
  }),
}));

vi.mock("ol/source", () => ({
  Vector: vi.fn(function () {
    return mockVectorSource;
  }),
}));

vi.mock("ol/style", () => ({
  Style: vi.fn(function () {}),
  Icon: vi.fn(function () {}),
  Fill: vi.fn(function () {}),
  Stroke: vi.fn(function () {}),
  Circle: vi.fn(function () {}),
  Text: vi.fn(function () {}),
}));

vi.mock("ol/proj", () => ({
  fromLonLat: vi.fn((coords) => coords),
}));

// Mock BasemapSwitcher component
vi.mock("@/components/BasemapSwitcher", () => ({
  default: () => <div data-testid="basemap-switcher">BasemapSwitcher</div>,
}));

// Mock MapControlZones
vi.mock("@/components/map/controls/MapControlZones", () => ({
  createZoneControlsFromConfig: vi.fn(() => []),
}));

// Mock lazy-loaded components
vi.mock("@/components/map/controls/CurrentLocation", () => ({
  CurrentLocationButton: () => <div>CurrentLocationButton</div>,
}));

vi.mock("@/components/map/controls/ExtentHistory", () => ({
  ExtentHistoryButtons: () => <div>ExtentHistoryButtons</div>,
}));

vi.mock("@/components/map/controls/ZoomToExtent", () => ({
  ZoomToExtentButton: () => <div>ZoomToExtentButton</div>,
}));

vi.mock("@/components/map/controls/Grid", () => ({
  GridButton: () => <div>GridButton</div>,
}));

vi.mock("@/components/map/controls/GithubButton", () => ({
  GitHubButtonDisplay: () => <div>GitHubButtonDisplay</div>,
}));

vi.mock("@/components/map/controls/Scale", () => ({
  ScaleDisplay: () => <div>ScaleDisplay</div>,
}));

vi.mock("@/components/map/controls/ScaleSelector", () => ({
  ScaleSelector: () => <div>ScaleSelector</div>,
}));

vi.mock("@/components/map/controls/ZoomControls", () => ({
  ZoomControls: () => <div>ZoomControls</div>,
}));

vi.mock("@/components/map/controls/RotateControl", () => ({
  RotateControl: () => <div>RotateControl</div>,
}));

vi.mock("@/components/map/controls/FullscreenControl", () => ({
  FullscreenControl: () => <div>FullscreenControl</div>,
}));

vi.mock("@/components/map/controls/AttributionControl", () => ({
  AttributionControl: () => <div>AttributionControl</div>,
}));

// Mock other utilities
vi.mock("@/utils/helpersHttp", () => ({
  getJSON: vi.fn().mockResolvedValue({
    features: [
      {
        geometry: { coordinates: [0, 0] },
        properties: { test: "data" },
      },
    ],
  }),
}));

describe("MapContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Clear sessionStorage
    sessionStorage.clear();

    // Reset map store state
    mockMapStore.map = null;

    // Reset useAppStore mock
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockImplementation(((selector?: any) => {
      const state = {
        setMapLoading: vi.fn(),
        urlParameters: {},
      };
      return typeof selector === "function" ? selector(state) : state;
    }) as any);
  });

  it("renders without crashing", () => {
    const { container } = render(<MapContainer />);
    expect(container).toBeDefined();
    expect(container.querySelector("#map")).toBeInTheDocument();
  });

  it("handles URL parameters for coordinate positioning", () => {
    // Mock useAppStore with coordinate URL parameters
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockImplementation(((selector?: any) => {
      const state = {
        setMapLoading: vi.fn(),
        urlParameters: {
          X: "-8900000",
          Y: "5500000",
          SR: "WEB",
          ID: "true",
        },
      };
      return typeof selector === "function" ? selector(state) : state;
    }) as any);

    const { container } = render(<MapContainer />);

    // Test passes if component renders without crashing when URL parameters are present
    expect(container).toBeDefined();
    expect(mockUseAppStore).toHaveBeenCalled();
  });

  it("handles URL parameters for extent positioning", () => {
    // Mock useAppStore with extent URL parameters
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockImplementation(((selector?: any) => {
      const state = {
        setMapLoading: vi.fn(),
        urlParameters: {
          XMIN: "-9000000",
          YMIN: "5400000",
          XMAX: "-8800000",
          YMAX: "5600000",
        },
      };
      return typeof selector === "function" ? selector(state) : state;
    }) as any);

    const { container } = render(<MapContainer />);

    // Test passes if component renders without crashing when extent parameters are present
    expect(container).toBeDefined();
    expect(mockUseAppStore).toHaveBeenCalled();
  });

  it("handles URL parameters for NG911ID lookup", () => {
    // Mock useAppStore with NG911ID parameter
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockImplementation(((selector?: any) => {
      const state = {
        setMapLoading: vi.fn(),
        urlParameters: {
          NG911ID: "test-ng911-id",
        },
      };
      return typeof selector === "function" ? selector(state) : state;
    }) as any);

    const { container } = render(<MapContainer />);

    // Test passes if component renders without crashing when NG911ID parameter is present
    expect(container).toBeDefined();
    expect(mockUseAppStore).toHaveBeenCalled();
  });

  it("renders normally without URL parameters", () => {
    const { container } = render(<MapContainer />);

    // Test passes if component renders without crashing
    expect(container).toBeDefined();
    expect(container.querySelector("#map")).toBeInTheDocument();
  });
});
