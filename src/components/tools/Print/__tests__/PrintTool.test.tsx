import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrintTool from "../PrintTool";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock PanelComponent
vi.mock("@/components/PanelComponent", () => ({
  default: ({ children, name }: { children: React.ReactNode; name: string }) => (
    <div data-testid="panel-component" data-name={name}>
      {children}
    </div>
  ),
}));

// Mock printRequest
vi.mock("../printRequest", () => ({
  buildPrintRequest: vi.fn().mockResolvedValue({
    layout: "letter_portrait",
    outputFormat: "pdf",
    attributes: {},
  }),
}));

// Mock printUtils
vi.mock("../printUtils", () => ({
  getBaseUrl: vi.fn().mockReturnValue("https://print.example.com"),
}));

// Mock mapHelpers
vi.mock("@/utils/mapHelpers", () => ({
  getMapScale: vi.fn().mockReturnValue(50000),
}));

// Create mock map
const createMockMap = () => ({
  getSize: vi.fn().mockReturnValue([800, 600]),
  getLayers: vi.fn().mockReturnValue({
    forEach: vi.fn((callback) => {
      // Simulate a visible layer
      callback({
        getVisible: () => true,
        getProperties: () => ({ print: true }),
        get: (key: string) => (key === "secured" ? false : undefined),
      });
    }),
  }),
  getView: vi.fn().mockReturnValue({
    getProjection: vi.fn().mockReturnValue({ getCode: () => "EPSG:3857" }),
    getCenter: vi.fn().mockReturnValue([0, 0]),
    calculateExtent: vi.fn().mockReturnValue([-1000, -1000, 1000, 1000]),
  }),
});

describe("PrintTool", () => {
  const mockOnClose = vi.fn();
  const _mockOnSidebarVisibility = vi.fn();
  let mockMap: ReturnType<typeof createMockMap>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMap = createMockMap();

    // Reset stores
    useMapStore.setState({ map: null });
    useAppStore.setState({ config: { printUrl: "" } });
    
    // Mock window.alert to prevent JSDOM errors
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the print tool with default name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Print");
    });

    it("renders with custom name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      
      render(<PrintTool name="Custom Print" onClose={mockOnClose} />);
      
      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Custom Print");
    });

    it("renders map title input with default value", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const titleInput = screen.getByPlaceholderText("Enter map title");
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveValue("County of Simcoe - Web Map");
    });

    it("renders paper size dropdown", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      
      render(<PrintTool onClose={mockOnClose} />);
      
      expect(screen.getByText("Select Paper Size:")).toBeInTheDocument();
      expect(screen.getByText("8X11 Portrait (Letter)")).toBeInTheDocument();
    });

    it("renders output format dropdown", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      
      render(<PrintTool onClose={mockOnClose} />);
      
      expect(screen.getByText("Select Output Format:")).toBeInTheDocument();
      expect(screen.getByText("PDF")).toBeInTheDocument();
    });

    it("renders print button", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const printButton = screen.getByRole("button", { name: /print/i });
      expect(printButton).toBeInTheDocument();
      expect(printButton).not.toBeDisabled();
    });

    it("renders advanced options collapsible", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      
      render(<PrintTool onClose={mockOnClose} />);
      
      expect(screen.getByText("Advanced Print Options")).toBeInTheDocument();
    });
  });

  describe("Warning Messages", () => {
    it("shows warning when print server is not configured", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      useAppStore.setState({ config: { printUrl: "" } });
      
      render(<PrintTool onClose={mockOnClose} />);
      
      expect(screen.getByText(/Print server not configured/i)).toBeInTheDocument();
    });

    it("does not show warning when print server is configured", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      useAppStore.setState({ config: { printUrl: "https://print.example.com" } });
      
      render(<PrintTool onClose={mockOnClose} />);
      
      expect(screen.queryByText(/Print server not configured/i)).not.toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("updates map title when input changes", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const titleInput = screen.getByPlaceholderText("Enter map title");
      await user.clear(titleInput);
      await user.type(titleInput, "My Custom Map");
      
      expect(titleInput).toHaveValue("My Custom Map");
    });

    it("changes paper size selection", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const paperSizeSelect = screen.getAllByRole("combobox")[0];
      await user.selectOptions(paperSizeSelect, "11X8 Landscape");
      
      expect(paperSizeSelect).toHaveValue("11X8 Landscape");
    });

    it("changes output format selection", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const formatSelect = screen.getAllByRole("combobox")[1];
      await user.selectOptions(formatSelect, "png");
      
      expect(formatSelect).toHaveValue("png");
    });

    it("toggles advanced options", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const advancedToggle = screen.getByText("Advanced Print Options");
      
      // Initially closed - advanced content should not be visible
      expect(screen.queryByText("Map Scale/Extent:")).not.toBeInTheDocument();
      
      // Click to open
      await user.click(advancedToggle);
      
      // Now should be visible
      expect(screen.getByText("Map Scale/Extent:")).toBeInTheDocument();
      expect(screen.getByText("Map Output Resolution:")).toBeInTheDocument();
    });

    it("changes map scale option in advanced settings", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();
      
      render(<PrintTool onClose={mockOnClose} />);
      
      // Open advanced options
      await user.click(screen.getByText("Advanced Print Options"));
      
      // Select "Preserve Map Extent"
      const preserveExtentRadio = screen.getByLabelText("Preserve Map Extent");
      await user.click(preserveExtentRadio);
      
      expect(preserveExtentRadio).toBeChecked();
    });

    it("changes resolution option in advanced settings", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();
      
      render(<PrintTool onClose={mockOnClose} />);
      
      // Open advanced options
      await user.click(screen.getByText("Advanced Print Options"));
      
      // Select "Very High" resolution
      const veryHighRadio = screen.getByLabelText("Very High - 300 dpi");
      await user.click(veryHighRadio);
      
      expect(veryHighRadio).toBeChecked();
    });
  });

  describe("Print Functionality", () => {
    it("shows alert when print server is not configured and print is clicked", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      useAppStore.setState({ config: { printUrl: "" } });
      const user = userEvent.setup();
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const printButton = screen.getByRole("button", { name: /print/i });
      await user.click(printButton);
      
      expect(window.alert).toHaveBeenCalledWith("Print server not configured. Please contact the site administrator.");
    });

    it("shows alert when map is not available", async () => {
      useMapStore.setState({ map: null });
      useAppStore.setState({ config: { printUrl: "https://print.example.com" } });
      const user = userEvent.setup();
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const printButton = screen.getByRole("button", { name: /print/i });
      await user.click(printButton);
      
      expect(window.alert).toHaveBeenCalledWith("Map is not available");
    });

    it("print button is enabled when map and print server are available", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      useAppStore.setState({ config: { printUrl: "https://print.example.com" } });
      
      render(<PrintTool onClose={mockOnClose} />);
      
      const printButton = screen.getByRole("button", { name: /print/i });
      expect(printButton).not.toBeDisabled();
    });
  });

  describe("Configuration Overrides", () => {
    it("applies custom config values", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      
      render(
        <PrintTool
          onClose={mockOnClose}
          config={{
            mapTitle: "Custom Title",
            termsOfUse: "Custom Terms",
          }}
        />
      );
      
      const titleInput = screen.getByPlaceholderText("Enter map title");
      expect(titleInput).toHaveValue("Custom Title");
    });
  });
});
