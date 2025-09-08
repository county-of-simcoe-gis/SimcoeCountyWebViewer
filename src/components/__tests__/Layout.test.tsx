import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import Layout from "@/components/Layout";

// Mock MapContainer to avoid OpenLayers complexity
vi.mock("@/components/MapContainer", () => ({
  default: () => <div id="map" role="presentation" />,
}));

// Mock Search component to avoid HTTP requests and infinite loops
vi.mock("@/components/Search", () => ({
  default: () => <div data-testid="search-component" />,
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
    }
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
vi.mock("@/stores/appStore", () => ({
  useAppStore: Object.assign(
    vi.fn(() => ({
      isAnyLoading: () => false,
      setConfig: vi.fn(),
      setConfigLoading: vi.fn(),
      setConfigError: vi.fn(),
      setHeaderLoading: vi.fn(),
      setSidebarLoading: vi.fn(),
      setMapLoading: vi.fn(),
    })),
    {
      getState: vi.fn(() => ({
        isAnyLoading: () => false,
        setConfig: vi.fn(),
        setConfigLoading: vi.fn(),
        setConfigError: vi.fn(),
        setHeaderLoading: vi.fn(),
        setSidebarLoading: vi.fn(),
        setMapLoading: vi.fn(),
      })),
    }
  ),
}));

vi.mock("@/stores/sidebarStore", () => ({
  useSidebarStore: Object.assign(
    vi.fn(() => ({
      isOpen: false,
      tools: [],
      themes: [],
      activeItem: null,
      loadFromConfig: vi.fn(),
      setEventEmitter: vi.fn(),
      setIsOpen: vi.fn(),
      setActiveItem: vi.fn(),
    })),
    {
      getState: vi.fn(() => ({
        isOpen: false,
        tools: [],
        themes: [],
        activeItem: null,
        loadFromConfig: vi.fn(),
        setEventEmitter: vi.fn(),
        setIsOpen: vi.fn(),
        setActiveItem: vi.fn(),
      })),
    }
  ),
}));

// Create a mock eventStore that includes getState
const mockEventStore = {
  addListener: vi.fn(() => "listener-id"),
  removeListener: vi.fn(),
  emit: vi.fn(),
  emitSidebarChanged: vi.fn(),
  emitHeaderLoaded: vi.fn(),
  emitSidebarLoaded: vi.fn(),
  emitMapLoaded: vi.fn(),
};

vi.mock("@/stores/eventStore", () => ({
  useEventStore: Object.assign(
    vi.fn(() => mockEventStore),
    {
      getState: vi.fn(() => mockEventStore),
    }
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
