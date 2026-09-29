import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LotAndConcessionTool from "../LotAndConcessionTool";
import { useMapStore } from "@/stores/mapStore";

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
  getUID: () => `test-uid-${Math.random()}`,
}));

// Mock helpersUI
vi.mock("@/utils/helpersUI", () => ({
  showMessage: vi.fn(),
}));

// Mock axiosInstance
vi.mock("@/lib/axiosInstance", () => ({
  getAxiosClient: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({ data: { features: [] } }),
  })),
}));

// Mock LayerManager
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => `mock-layer-id-${Math.random()}`),
    removeLayer: vi.fn(),
  },
}));

// Mock config.json
vi.mock("../config.json", () => ({
  default: {
    serverUrl: "https://mock-server.com/",
    layerName: "test:layer",
  },
}));

// Mock OpenLayers modules
vi.mock("ol/source", () => ({
  Vector: class MockVectorSource {
    clear() {}
    getFeatures() {
      return [];
    }
    addFeature() {}
  },
  ImageWMS: class MockImageWMS {
    constructor() {}
  },
}));

vi.mock("ol/layer", () => ({
  Vector: class MockVectorLayer {
    setVisible() {}
    getSource() {
      return {
        clear: vi.fn(),
        getFeatures: () => [],
        addFeature: vi.fn(),
      };
    }
  },
  Image: class MockImageLayer {
    setVisible() {}
    getSource() {
      return {};
    }
  },
}));

vi.mock("ol/style", () => ({
  Fill: class MockFill {},
  Stroke: class MockStroke {},
  Style: class MockStyle {},
}));

vi.mock("ol/extent", () => ({
  extend: vi.fn(),
}));

vi.mock("ol/format", () => ({
  GeoJSON: class MockGeoJSON {
    readFeatures() {
      return [];
    }
  },
}));

// Create mock map
const createMockMap = () => ({
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  getView: vi.fn().mockReturnValue({
    fit: vi.fn(),
    getZoom: vi.fn().mockReturnValue(10),
    setZoom: vi.fn(),
  }),
});

describe("LotAndConcessionTool", () => {
  const mockOnClose = vi.fn();
  let mockMap: ReturnType<typeof createMockMap>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMap = createMockMap();

    // Reset stores
    useMapStore.setState({
      map: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the tool with default name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Lot And Concession");
    });

    it("renders with custom name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool name="Custom Name" onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Custom Name");
    });

    it("renders header text", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      expect(screen.getByText(/Locate civic addresses within the County/i)).toBeInTheDocument();
    });

    it("renders lot number input", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      expect(screen.getByPlaceholderText("Enter Lot Number")).toBeInTheDocument();
    });

    it("renders concession number input", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      expect(screen.getByPlaceholderText("Concession Number")).toBeInTheDocument();
    });

    it("renders geographic township select", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      expect(screen.getByText("Township:")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders search and clear buttons", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
    });

    it("renders no results message initially", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      expect(screen.getByText(/Please enter a LOT and\/or CONCESSION/i)).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("updates lot number on input", async () => {
      const user = userEvent.setup();
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      const lotInput = screen.getByPlaceholderText("Enter Lot Number");
      await user.type(lotInput, "123");

      expect(lotInput).toHaveValue("123");
    });

    it("updates concession number on input", async () => {
      const user = userEvent.setup();
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      const conInput = screen.getByPlaceholderText("Concession Number");
      await user.type(conInput, "5");

      expect(conInput).toHaveValue("5");
    });

    it("updates township select on change", async () => {
      const user = userEvent.setup();
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "ESSA");

      expect(select).toHaveValue("ESSA");
    });

    it("clears all inputs on clear button click", async () => {
      const user = userEvent.setup();
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      const lotInput = screen.getByPlaceholderText("Enter Lot Number");
      const conInput = screen.getByPlaceholderText("Concession Number");
      const select = screen.getByRole("combobox");

      await user.type(lotInput, "123");
      await user.type(conInput, "5");
      await user.selectOptions(select, "ESSA");

      const clearButton = screen.getByRole("button", { name: /clear/i });
      await user.click(clearButton);

      expect(lotInput).toHaveValue("");
      expect(conInput).toHaveValue("");
      expect(select).toHaveValue("SEARCH ALL");
    });

    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      const closeButton = screen.getByTestId("close-button");
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Search Functionality", () => {
    it("shows warning when search is clicked with empty inputs", async () => {
      const user = userEvent.setup();
      const { showMessage } = await import("@/utils/helpersUI");
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      expect(showMessage).toHaveBeenCalledWith("Lot And Con", "Please enter a LOT and/or CON.", "warning");
    });
  });

  describe("Township Options", () => {
    it("contains all expected township options", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<LotAndConcessionTool onClose={mockOnClose} />);

      const expectedTownships = [
        "SEARCH ALL",
        "ADJALA",
        "ESSA",
        "FLOS",
        "INNISFIL",
        "MARA",
        "MATCHEDASH",
        "MEDONTE",
        "NOTTAWASAGA",
        "ORILLIA",
        "ORO",
        "RAMA",
        "SUNNIDALE",
        "TAY",
        "TECUMSETH",
        "TINY",
        "TOSORONTIO",
        "VESPRA",
        "WEST GWILLIMBURY",
      ];

      const select = screen.getByRole("combobox");
      const options = Array.from(select.querySelectorAll("option")).map((opt) => opt.value);

      expectedTownships.forEach((township) => {
        expect(options).toContain(township);
      });
    });
  });
});
