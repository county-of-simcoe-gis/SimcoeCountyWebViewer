import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { vi } from "vitest";

// Mock data generators
export const createMockConfig = (overrides = {}) => ({
  useMapConfigApi: false,
  mapId: "default",
  headerLogoImageName: "logo.png",
  title: "Simcoe County Web Viewer",
  favicon: "favicon.ico",
  apiUrl: "https://api.example.com/",
  centerCoords: [-8878504.68, 5543492.45],
  defaultZoom: 10,
  maxZoom: 20,
  controls: {
    rotate: true,
    fullScreen: false,
    zoomInOut: true,
    currentLocation: false,
    zoomExtent: true,
    scale: true,
    scaleLine: true,
    basemap: false,
    gitHubButton: false,
    scaleSelector: false,
  },
  storageKeys: {
    SearchHistory: "SCWV_SearchHistory",
    Draw: "SCWV_Draw",
    URLDontShowAgain: "SCWV_URLDontShowAgain",
  },
  mapTheme: "light",
  showLoadingScreens: true,
  toc: {
    tocType: "LIST",
    geoserverLayerGroupsUrl: "http://example.com/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities",
    default_group: "All_Layers_Public",
    sources: [],
    keywords: {},
    loaderType: "DEFAULT",
  },
  sidebarToolComponents: [
    { id: 1, name: "Measure", componentName: "Measure", description: "Measure", imageName: "measure.png", enabled: true },
    { id: 2, name: "Print", componentName: "Print", description: "Print", imageName: "print.png", enabled: true },
    { id: 3, name: "Coordinates", componentName: "Coordinates", description: "Coordinates", imageName: "coordinates.png", enabled: true },
  ],
  sidebarThemeComponents: [{ id: 1, name: "Forestry", componentName: "Forestry", description: "Forestry", imageName: "forestry.png", enabled: true }],
  ...overrides,
});

export const createMockSearchResult = (overrides = {}) => ({
  name: "123 Test Street",
  type: "Address",
  municipality: "Test Municipality",
  location_id: "test_location_123",
  x: -8878504.68,
  y: 5543492.45,
  imageName: "map-marker-light-blue.png",
  ...overrides,
});

export const createMockLayer = (overrides = {}) => ({
  id: "test_layer",
  name: "Test Layer",
  displayName: "Test Layer Display",
  opacity: 1.0,
  visible: true,
  groupName: "Test Group",
  wmsName: "test:layer",
  legendUrl: "http://example.com/legend",
  ...overrides,
});

// Mock hooks
export const mockUseConfig = (config = createMockConfig()) => {
  return vi.fn(() => ({ config, isLoading: false, error: null }));
};

export const mockUseEventStore = () => {
  const mockEmit = vi.fn();
  const mockOn = vi.fn();
  const mockOff = vi.fn();

  return vi.fn(() => ({
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
  }));
};

// Mock stores
export const createMockAppStore = (overrides = {}) => ({
  isMapLoading: false,
  isSidebarLoading: false,
  isHeaderLoading: false,
  isConfigLoading: false,
  appInfo: {
    name: "Test App",
    version: "1.0.0",
    homepage: "",
  },
  setMapLoading: vi.fn(),
  setSidebarLoading: vi.fn(),
  setHeaderLoading: vi.fn(),
  setConfigLoading: vi.fn(),
  setAppInfo: vi.fn(),
  // Permissions API helpers used by usePermissions hook
  setPermissionState: vi.fn(),
  permissions: {},
  isAnyLoading: vi.fn(() => false),
  ...overrides,
});

export const createMockMapStore = (overrides = {}) => ({
  map: null,
  view: null,
  extent: null,
  zoom: 10,
  center: [-8878504.68, 5543492.45],
  setMap: vi.fn(),
  setView: vi.fn(),
  setExtent: vi.fn(),
  setZoom: vi.fn(),
  setCenter: vi.fn(),
  zoomToExtent: vi.fn(),
  ...overrides,
});

export const createMockSidebarStore = (overrides = {}) => ({
  isOpen: false,
  activeComponent: null,
  activeTheme: null,
  activeTool: null,
  setIsOpen: vi.fn(),
  setActiveComponent: vi.fn(),
  setActiveTheme: vi.fn(),
  setActiveTool: vi.fn(),
  openTool: vi.fn(),
  openTheme: vi.fn(),
  close: vi.fn(),
  ...overrides,
});

export const createMockTocStore = (overrides = {}) => ({
  layers: [],
  groups: [],
  selectedLayer: null,
  expandedGroups: new Set(),
  setLayers: vi.fn(),
  setGroups: vi.fn(),
  setSelectedLayer: vi.fn(),
  toggleGroup: vi.fn(),
  updateLayerVisibility: vi.fn(),
  updateLayerOpacity: vi.fn(),
  ...overrides,
});

// Test wrapper component
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return <>{children}</>;
};

// Custom render function
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };

// Common test helpers
export const waitForElement = async (getByTestId: (testId: string) => HTMLElement, testId: string, timeout = 3000) => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      try {
        const element = getByTestId(testId);
        resolve(element);
      } catch {
        if (Date.now() - start > timeout) {
          reject(new Error(`Element with testId "${testId}" not found within ${timeout}ms`));
        } else {
          setTimeout(check, 100);
        }
      }
    };
    check();
  });
};

export const createMockEvent = (type: string, properties = {}) => ({
  type,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  target: {},
  currentTarget: {},
  ...properties,
});

// Mock window methods
export const mockWindowLocation = (url = "http://localhost:3000") => {
  const mockLocation = new URL(url);

  Object.defineProperty(window, "location", {
    value: {
      href: mockLocation.href,
      search: mockLocation.search,
      pathname: mockLocation.pathname,
      hostname: mockLocation.hostname,
      port: mockLocation.port,
      protocol: mockLocation.protocol,
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
    writable: true,
  });
};

export const setupWindowSearchHandlers = () => {
  const mockHandleLocationResult = vi.fn();
  const mockHandleGeocodedResult = vi.fn();

  (window as Window & typeof globalThis & { searchZoomHandlers: Record<string, unknown> }).searchZoomHandlers = {
    handleLocationResult: mockHandleLocationResult,
    handleGeocodedResult: mockHandleGeocodedResult,
  };

  return {
    mockHandleLocationResult,
    mockHandleGeocodedResult,
  };
};
