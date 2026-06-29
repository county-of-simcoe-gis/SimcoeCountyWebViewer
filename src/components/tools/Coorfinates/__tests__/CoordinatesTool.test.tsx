import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoordinatesTool from "../CoordinatesTool";
import { useMapStore } from "@/stores/mapStore";
import { activateTab } from "@/utils/helpersUI";

const mockAddItem = vi.fn();
const mockCreateMyMapsItem = vi.fn(() => ({}));

// Mock LayerManager
const mockAddLayer = vi.fn().mockReturnValue("mock-layer-id");
const mockRemoveLayer = vi.fn().mockReturnValue(true);
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: (...args: unknown[]) => mockAddLayer(...args),
    removeLayer: (...args: unknown[]) => mockRemoveLayer(...args),
  },
}));

// Mock react-icons
vi.mock("react-icons/fa", () => ({
  FaCrosshairs: () => <div data-testid="icon-crosshairs" />,
  FaSearchPlus: () => <div data-testid="icon-zoom" />,
  FaMapMarkerAlt: () => <div data-testid="icon-marker" />,
  FaCopy: () => <div data-testid="icon-copy" />,
}));

// Mock PanelComponent
vi.mock("@/components/PanelComponent", () => ({
  default: ({ children, name, onClose }: { children: React.ReactNode; name: string; onClose: () => void }) => (
    <div data-testid="panel-component" data-name={name}>
      <button data-testid="close-button" onClick={onClose}>
        Close
      </button>
      {children}
    </div>
  ),
}));

// Mock mapHelpers - use a function that returns a value
vi.mock("@/utils/mapHelpers", () => ({
  getMapScale: () => 50000,
}));

// Mock helpersBrowser
vi.mock("@/utils/helpersBrowser", () => ({
  glowContainer: () => {},
}));

vi.mock("@/utils/helpersUI", () => ({
  activateTab: vi.fn(),
}));

vi.mock("@/stores/myMapsStore", () => ({
  useMyMapsStore: {
    getState: () => ({
      addItem: mockAddItem,
    }),
  },
  createMyMapsItem: (...args: unknown[]) => mockCreateMyMapsItem(...args),
}));

vi.mock("@/utils/myMapsHelpers", () => ({
  featureToGeoJSON: () => ({ type: "Feature", geometry: null, properties: {} }),
  styleToJSON: () => ({}),
}));

// Mock OpenLayers modules
vi.mock("ol/proj", () => ({
  transform: (coords: number[]) => coords,
}));

vi.mock("proj4", () => ({
  default: {
    defs: () => {},
  },
}));

vi.mock("ol/proj/proj4", () => ({
  register: () => {},
}));

vi.mock("ol/proj/Projection", () => ({
  default: class MockProjection {},
}));

vi.mock("ol/layer", () => ({
  Vector: class MockVectorLayer {
    getSource() {
      const mockFeature = {
        getStyle: () => null,
        getGeometry: () => null,
      };

      return {
        clear: () => {},
        getFeatures: () => [mockFeature],
        addFeature: () => {},
      };
    }
  },
}));

vi.mock("ol/style", () => ({
  Style: class MockStyle {},
  Icon: class MockIcon {},
}));

vi.mock("ol/source", () => ({
  Vector: class MockVectorSource {
    clear() {}
    getFeatures() {
      return [{ clone: () => ({}) }];
    }
    addFeature() {}
  },
}));

vi.mock("ol/Feature", () => ({
  default: class MockFeature {},
}));

vi.mock("ol/geom/Point", () => ({
  default: class MockPoint {},
}));

vi.mock("ol/Observable", () => ({
  unByKey: () => {},
}));

// Create mock map
const createMockMap = () => ({
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  on: vi.fn().mockReturnValue("event-key"),
  getSize: vi.fn().mockReturnValue([800, 600]),
  getView: vi.fn().mockReturnValue({
    getProjection: vi.fn().mockReturnValue({ getCode: () => "EPSG:3857" }),
    calculateExtent: vi.fn().mockReturnValue([-1000000, -500000, 1000000, 500000]),
    animate: vi.fn(),
  }),
});

// Mock navigator.clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
});

describe("CoordinatesTool", () => {
  const mockOnClose = vi.fn();
  let mockMap: ReturnType<typeof createMockMap>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMap = createMockMap();

    // Reset stores
    useMapStore.setState({
      map: null,
      setActiveToolId: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the coordinates tool with default name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Coordinates");
    });

    it("renders with custom name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool name="Custom Coords" onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Custom Coords");
    });

    it("renders live coordinates section", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(screen.getByText("Live Coordinates")).toBeInTheDocument();
      expect(screen.getByText(/Live coordinates of your current pointer/i)).toBeInTheDocument();
    });

    it("renders selected/custom coordinates section", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(screen.getByText("Selected/Custom Coordinates")).toBeInTheDocument();
    });

    it("renders all coordinate system sections", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(screen.getByText("Map Coordinates (Web Mercator - Meters)")).toBeInTheDocument();
      expect(screen.getByText("Latitude/Longitude (WGS84 - Degrees)")).toBeInTheDocument();
      expect(screen.getByText("NAD 83 - Zone 17 (meters)")).toBeInTheDocument();
      expect(screen.getByText("NAD 27 - Zone 17 (meters)")).toBeInTheDocument();
    });

    it("renders map extent section", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(screen.getByText("Map Extent")).toBeInTheDocument();
      expect(screen.getByText("Min X:")).toBeInTheDocument();
      expect(screen.getByText("Max X:")).toBeInTheDocument();
      expect(screen.getByText("Min Y:")).toBeInTheDocument();
      expect(screen.getByText("Max Y:")).toBeInTheDocument();
    });

    it("renders map scale section", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(screen.getByText("Map Scale")).toBeInTheDocument();
      expect(screen.getByText("Scale")).toBeInTheDocument();
    });
  });

  describe("Live Coordinates Display", () => {
    it("shows placeholder text when no coordinates are available", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      const placeholders = screen.getAllByText("(listening for input)");
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it("displays X and Y labels in live coordinates", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(screen.getByText("X (meters):")).toBeInTheDocument();
      expect(screen.getByText("Y (meters):")).toBeInTheDocument();
      expect(screen.getByText("Latitude:")).toBeInTheDocument();
      expect(screen.getByText("Longitude:")).toBeInTheDocument();
    });
  });

  describe("Custom Coordinates Input", () => {
    it("renders input fields for each coordinate system", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      const xLabels = screen.getAllByText("X Coordinate");
      const yLabels = screen.getAllByText("Y Coordinate");

      expect(xLabels.length).toBe(4);
      expect(yLabels.length).toBe(4);
    });

    it("allows input in coordinate fields", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<CoordinatesTool onClose={mockOnClose} />);

      const inputs = screen.getAllByPlaceholderText("(listening for input)");
      const firstInput = inputs[0];

      await user.type(firstInput, "12345");

      expect(firstInput).toHaveValue("12345");
    });

    it("renders zoom button for each coordinate system", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      const zoomButtons = screen.getAllByText("Zoom");
      expect(zoomButtons.length).toBe(4);
    });

    it("renders My Maps button for each coordinate system", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      const myMapsButtons = screen.getAllByText("My Maps");
      expect(myMapsButtons.length).toBe(4);
    });

    it("renders Copy button for each coordinate system", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      const copyButtons = screen.getAllByText("Copy");
      expect(copyButtons.length).toBe(4);
    });
  });

  describe("Button Actions", () => {
    it("zoom button has disabled styling when no coordinates entered", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      // The zoom button itself should have cursor-not-allowed class when disabled
      const zoomButtons = screen.getAllByTitle("Zoom to coordinates");
      expect(zoomButtons[0]).toHaveClass("cursor-not-allowed");
    });

    it("copy button is present and clickable", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      const copyButtons = screen.getAllByTitle("Copy coordinates");
      expect(copyButtons.length).toBe(4);
      expect(copyButtons[0]).toBeInTheDocument();
    });

    it("activates the My Maps tab after adding a feature", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<CoordinatesTool onClose={mockOnClose} />);

      const xInputs = screen.getAllByPlaceholderText("(listening for input)");
      await user.type(xInputs[0], "123");
      await user.type(xInputs[1], "456");

      const myMapsButtons = screen.getAllByTitle("Add to My Maps");
      await user.click(myMapsButtons[0]);

      expect(mockAddItem).toHaveBeenCalled();
      expect(activateTab).toHaveBeenCalledWith("mymaps");
    });
  });

  describe("Close Functionality", () => {
    it("calls onClose when close button is clicked", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<CoordinatesTool onClose={mockOnClose} />);

      const closeButton = screen.getByTestId("close-button");
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Store Integration", () => {
    it("calls setActiveToolId on mount", () => {
      const setActiveToolId = vi.fn();
      useMapStore.setState({
        map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"],
        setActiveToolId,
      });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(setActiveToolId).toHaveBeenCalledWith("coordinates");
    });
  });

  describe("Map Integration", () => {
    it("adds vector layer to map on mount", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(mockAddLayer).toHaveBeenCalled();
    });

    it("registers map events on mount", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(mockMap.on).toHaveBeenCalledWith("pointermove", expect.any(Function));
      expect(mockMap.on).toHaveBeenCalledWith("click", expect.any(Function));
      expect(mockMap.on).toHaveBeenCalledWith("moveend", expect.any(Function));
    });
  });

  describe("Keyboard Navigation", () => {
    it("triggers zoom on Enter key press in coordinate input", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<CoordinatesTool onClose={mockOnClose} />);

      const inputs = screen.getAllByPlaceholderText("(listening for input)");

      await user.type(inputs[0], "100");
      await user.type(inputs[1], "200");
      await user.type(inputs[1], "{Enter}");

      expect(mockMap.getView().animate).toHaveBeenCalled();
    });
  });

  describe("Map Extent Display", () => {
    it("displays extent values when map is available", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(screen.getByText("Map Extent")).toBeInTheDocument();
    });
  });

  describe("Map Scale Display", () => {
    it("displays scale value", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<CoordinatesTool onClose={mockOnClose} />);

      expect(screen.getByText(/1:50,000/)).toBeInTheDocument();
    });
  });
});
