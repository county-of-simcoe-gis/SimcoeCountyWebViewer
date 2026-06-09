import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MeasureTool from "../MeasureTool";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";

// Mock LayerManager
const mockAddLayer = vi.fn().mockReturnValue("mock-layer-id");
const mockRemoveLayer = vi.fn().mockReturnValue(true);
const mockAddOverlay = vi.fn();
const mockRemoveOverlay = vi.fn();
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: (...args: unknown[]) => mockAddLayer(...args),
    removeLayer: (...args: unknown[]) => mockRemoveLayer(...args),
    addOverlay: (...args: unknown[]) => mockAddOverlay(...args),
    removeOverlay: (...args: unknown[]) => mockRemoveOverlay(...args),
  },
}));

// Mock react-icons
vi.mock("react-icons/fa", () => ({
  FaRulerHorizontal: () => <div data-testid="icon-line" />,
  FaDrawPolygon: () => <div data-testid="icon-polygon" />,
  FaRegCircle: () => <div data-testid="icon-circle" />,
  FaRegSquare: () => <div data-testid="icon-rectangle" />,
  FaCompass: () => <div data-testid="icon-compass" />,
  FaTrash: () => <div data-testid="icon-trash" />,
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

// Mock helpersCore
vi.mock("@/utils/helpersCore", () => ({
  getUID: () => "test-uid-123",
}));

// Mock helpersUI
vi.mock("@/utils/helpersUI", () => ({
  showMessage: vi.fn(),
}));

// Mock myMapsHelpers
vi.mock("@/utils/myMapsHelpers", () => ({
  getBearing: () => 45,
}));

// Mock all OpenLayers modules to prevent actual OL code from running
vi.mock("ol/interaction/Draw", () => ({
  default: class MockDraw {
    on() {}
    setActive() {}
  },
  createBox: () => () => {},
}));

vi.mock("ol/interaction", () => ({
  Snap: class MockSnap {},
}));

vi.mock("ol/source", () => ({
  Vector: class MockVectorSource {
    clear() {}
    getFeatures() {
      return [];
    }
    addFeature() {}
  },
}));

vi.mock("ol/style", () => ({
  Circle: class MockCircle {},
  Fill: class MockFill {},
  Stroke: class MockStroke {},
  Style: class MockStyle {},
}));

vi.mock("ol/geom", () => ({
  LineString: class MockLineString {},
  Polygon: class MockPolygon {},
  Circle: class MockCircle {},
}));

vi.mock("ol/sphere", () => ({
  getArea: () => 1000,
  getLength: () => 100,
}));

vi.mock("ol/geom/Polygon", () => ({
  fromCircle: () => ({}),
}));

vi.mock("ol/Observable", () => ({
  unByKey: () => {},
}));

vi.mock("ol/Overlay", () => ({
  default: class MockOverlay {
    setPosition() {}
  },
}));

vi.mock("ol/layer", () => ({
  Vector: class MockVectorLayer {
    getSource() {
      return {
        clear: () => {},
        getFeatures: () => [],
      };
    }
  },
}));

// Create mock viewport that persists
const mockViewport = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Create mock map
const createMockMap = () => ({
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  addInteraction: vi.fn(),
  removeInteraction: vi.fn(),
  addOverlay: vi.fn(),
  removeOverlay: vi.fn(),
  on: vi.fn().mockReturnValue("event-key"),
  getViewport: vi.fn().mockReturnValue(mockViewport),
  getLayers: vi.fn().mockReturnValue({
    getArray: vi.fn().mockReturnValue([]),
  }),
  getView: vi.fn().mockReturnValue({
    getProjection: vi.fn().mockReturnValue({ getCode: () => "EPSG:3857" }),
  }),
});

describe("MeasureTool", () => {
  const mockOnClose = vi.fn();
  let mockMap: ReturnType<typeof createMockMap>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMap = createMockMap();

    // Reset stores
    useMapStore.setState({
      map: null,
      activeToolId: null,
      setActiveToolId: vi.fn(),
    });
    usePopupStore.setState({
      hide: vi.fn(),
    });

    // Mock document.getElementById for tooltip elements
    vi.spyOn(document, "getElementById").mockReturnValue(document.createElement("div"));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the measure tool with default name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Measure");
    });

    it("renders with custom name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool name="Custom Measure" onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Custom Measure");
    });

    it("renders introduction text", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(screen.getByText(/Please select the type of measurements/i)).toBeInTheDocument();
    });

    it("renders all measure tool buttons", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(screen.getByTestId("icon-line")).toBeInTheDocument();
      expect(screen.getByTestId("icon-polygon")).toBeInTheDocument();
      expect(screen.getByTestId("icon-circle")).toBeInTheDocument();
      expect(screen.getByTestId("icon-rectangle")).toBeInTheDocument();
      expect(screen.getByTestId("icon-compass")).toBeInTheDocument();
      expect(screen.getByTestId("icon-trash")).toBeInTheDocument();
    });

    it("renders section titles", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(screen.getByText("Measure Tools")).toBeInTheDocument();
      expect(screen.getByText("Measure Results")).toBeInTheDocument();
    });

    it("renders snapping checkbox", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(screen.getByText("Snapping")).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "Snapping" })).toBeInTheDocument();
    });

    it("renders hide tooltips checkbox", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(screen.getByText("Hide Tooltips")).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "Hide Tooltips" })).toBeInTheDocument();
    });

    it("shows intro message when no tool is selected", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(screen.getByText(/There are currently no measurements to display/i)).toBeInTheDocument();
    });
  });

  describe("Tool Button Interactions", () => {
    it("has all tool buttons with correct titles", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(screen.getByTitle("Draw a single line on the map")).toBeInTheDocument();
      expect(screen.getByTitle("Draw a polygon on the map")).toBeInTheDocument();
      expect(screen.getByTitle("Draw a circle on the map")).toBeInTheDocument();
      expect(screen.getByTitle("Draw a rectangle on the map")).toBeInTheDocument();
      expect(screen.getByTitle("Draw a Bearing Line on the map")).toBeInTheDocument();
      expect(screen.getByTitle("Clear Drawing")).toBeInTheDocument();
    });

    it("tool buttons have correct initial state (ghost style)", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      const buttons = [
        screen.getByTitle("Draw a single line on the map"),
        screen.getByTitle("Draw a polygon on the map"),
        screen.getByTitle("Draw a circle on the map"),
        screen.getByTitle("Draw a rectangle on the map"),
        screen.getByTitle("Draw a Bearing Line on the map"),
        screen.getByTitle("Clear Drawing"),
      ];

      buttons.forEach((button) => {
        expect(button).toHaveClass("btn-ghost");
      });
    });

    it("selects clear tool when clicked", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<MeasureTool onClose={mockOnClose} />);

      const clearButton = screen.getByTitle("Clear Drawing");
      await user.click(clearButton);

      expect(clearButton).toHaveClass("btn-primary");
    });
  });

  describe("Checkbox Interactions", () => {
    it("toggles snapping checkbox", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<MeasureTool onClose={mockOnClose} />);

      const snappingCheckbox = screen.getByRole("checkbox", { name: "Snapping" });

      expect(snappingCheckbox).not.toBeChecked();
      await user.click(snappingCheckbox);
      expect(snappingCheckbox).toBeChecked();
    });

    it("toggles hide tooltips checkbox", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<MeasureTool onClose={mockOnClose} />);

      const hideTooltipsCheckbox = screen.getByRole("checkbox", { name: "Hide Tooltips" });

      expect(hideTooltipsCheckbox).not.toBeChecked();
      await user.click(hideTooltipsCheckbox);
      expect(hideTooltipsCheckbox).toBeChecked();
    });
  });

  describe("Results Display", () => {
    it("shows intro message by default", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(screen.getByText(/There are currently no measurements to display/i)).toBeInTheDocument();
    });

    it("results container exists but is hidden initially", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      // The results container should have 'hidden' class initially
      const resultsContainer = screen.getByText("Kilometer").parentElement?.parentElement?.parentElement?.parentElement;
      expect(resultsContainer).toHaveClass("hidden");
    });

    it("has all unit types available in the component", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      // These are present in the DOM but hidden
      expect(screen.getByText("Kilometer")).toBeInTheDocument();
      expect(screen.getByText("Miles")).toBeInTheDocument();
      expect(screen.getByText("Meter")).toBeInTheDocument();
      expect(screen.getByText("Feet")).toBeInTheDocument();
    });
  });

  describe("Close Functionality", () => {
    it("calls onClose when close button is clicked", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<MeasureTool onClose={mockOnClose} />);

      const closeButton = screen.getByTestId("close-button");
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Store Integration", () => {
    it("calls setActiveToolId(null) when clear is clicked", async () => {
      const setActiveToolId = vi.fn();
      useMapStore.setState({
        map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"],
        activeToolId: "measure",
        setActiveToolId,
      });
      const user = userEvent.setup();

      render(<MeasureTool onClose={mockOnClose} />);

      const clearButton = screen.getByTitle("Clear Drawing");
      await user.click(clearButton);

      expect(setActiveToolId).toHaveBeenCalledWith(null);
    });

    it("accesses mapStore state correctly", () => {
      const setActiveToolId = vi.fn();
      useMapStore.setState({
        map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"],
        setActiveToolId,
      });

      render(<MeasureTool onClose={mockOnClose} />);

      // Component should render without errors when store functions are available
      expect(screen.getByTestId("panel-component")).toBeInTheDocument();
    });
  });

  describe("Map Layer Integration", () => {
    it("adds vector layer to map on mount", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(mockAddLayer).toHaveBeenCalled();
    });

    it("adds overlays via LayerManager for tooltips", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<MeasureTool onClose={mockOnClose} />);

      expect(mockAddOverlay).toHaveBeenCalled();
    });
  });
});
