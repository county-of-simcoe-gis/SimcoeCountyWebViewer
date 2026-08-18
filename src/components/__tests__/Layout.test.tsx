import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import Layout from "@/components/Layout";

// Mock Header to avoid next-auth dependency in ProfileButton
vi.mock("@/components/Header", () => ({
  default: () => <div role="button" aria-label="Toggle sidebar" />,
}));

// Mock MapContainer to avoid OpenLayers complexity
vi.mock("@/components/map/MapContainer", () => ({
  default: () => <div id="map" role="presentation" />,
}));

// Mock Search component to avoid HTTP requests and infinite loops
vi.mock("@/components/Search", () => ({
  default: () => <div data-testid="search-component" />,
}));

// Mock other heavy/visual components to avoid pulling in CSS files
vi.mock("@/components/Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));

vi.mock("@/components/SidebarSlim", () => ({
  default: () => <div data-testid="sidebar-slim" />,
}));

vi.mock("@/components/myMaps/MyMapsService", () => ({
  default: () => <div data-testid="mymaps-service" />,
}));

vi.mock("@/components/myMaps/GlobalDrawingOptionsPopup", () => ({
  default: () => <div data-testid="global-drawing-options" />,
}));

vi.mock("@/components/LayerInfo/LayerInfoModal", () => ({
  default: () => <div data-testid="layer-info-modal" />,
}));

vi.mock("@/components/Legend/LegendModal", () => ({
  default: () => <div data-testid="legend-modal" />,
}));

vi.mock("@/components/AttributeTable/AttributeTablePanel", () => ({
  default: () => <div data-testid="attribute-table" />,
}));

vi.mock("@/components/MoreMenu", () => ({
  default: () => <div data-testid="more-menu" />,
}));

vi.mock("@/components/common/GlobalURLModal", () => ({
  default: () => <div data-testid="global-url-modal" />,
}));

vi.mock("@/components/GoogleAnalytics", () => ({
  default: () => <div data-testid="google-analytics" />,
}));

vi.mock("@/stores/myMapsStore", () => ({
  useMyMapsStore: Object.assign(
    vi.fn(() => ({
      drawType: "Cancel",
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      loadFromStorage: vi.fn(),
    })),
    {
      getState: vi.fn(() => ({
        drawType: "Cancel",
        items: [],
        addItem: vi.fn(),
        removeItem: vi.fn(),
        loadFromStorage: vi.fn(),
      })),
      subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
    },
  ),
  createMyMapsItem: vi.fn(),
}));

// Mock the useConfig hook to provide test config
vi.mock("@/hooks/useConfig", () => ({
  useConfig: vi.fn(() => ({
    config: {
      mapId: "test-map",
      sidebarToolComponents: [],
      sidebarThemeComponents: [],
    },
    loading: false,
    error: null,
  })),
}));

// Mock the stores to avoid infinite loops
const mockAppStoreState = {
  isAnyLoading: () => false,
  mapLoading: false,
  sidebarLoading: false,
  headerLoading: false,
  configLoading: false,
  layersLoading: false,
  config: null as any,
  urlParameters: {} as Record<string, string>,
  setConfig: vi.fn(),
  setConfigLoading: vi.fn(),
  setConfigError: vi.fn(),
  setHeaderLoading: vi.fn(),
  setSidebarLoading: vi.fn(),
  setMapLoading: vi.fn(),
  setLayersLoading: vi.fn(),
  setUserName: vi.fn(),
  // Permissions API helpers used by usePermissions
  setPermissionState: vi.fn(),
  permissions: {},
};

vi.mock("@/stores/appStore", () => ({
  useAppStore: Object.assign(
    vi.fn((selector?: any) => (typeof selector === "function" ? selector(mockAppStoreState) : mockAppStoreState)),
    {
      getState: vi.fn(() => mockAppStoreState),
    },
  ),
}));

const mockSidebarStoreState = {
  isOpen: false,
  tools: [],
  themes: [],
  activeItem: null,
  activeTheme: null,
  activeTool: null,
  activeTab: 0,
  hideLayers: false,
  hideTools: false,
  hideMyMaps: false,
  hideThemes: false,
  hideReports: false,
  loadFromConfig: vi.fn(),
  activateDefaultItems: vi.fn(),
  setIsOpen: vi.fn(),
  setActiveItem: vi.fn(),
  setActiveTab: vi.fn(),
  activateSidebarItem: vi.fn(),
  openSidebar: vi.fn(),
};

vi.mock("@/stores/sidebarStore", () => ({
  useSidebarStore: Object.assign(
    vi.fn((selector?: any) => (typeof selector === "function" ? selector(mockSidebarStoreState) : mockSidebarStoreState)),
    {
      getState: vi.fn(() => mockSidebarStoreState),
    },
  ),
}));

// Create a mock eventStore that includes getState
const mockEventStore = {
  addListener: vi.fn(() => "listener-id"),
  removeListener: vi.fn(),
  emit: vi.fn(),
};

vi.mock("@/stores/eventStore", () => ({
  useEventStore: Object.assign(
    vi.fn((selector?: any) => (typeof selector === "function" ? selector(mockEventStore) : mockEventStore)),
    {
      getState: vi.fn(() => mockEventStore),
    },
  ),
}));

describe("Layout", () => {
  it("renders header and map container once config loads", async () => {
    render(<Layout />);
    await waitFor(() => {
      // Header burger button, map div
      expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument();
      expect(document.getElementById("map")).toBeInTheDocument();
    });
  });
});
