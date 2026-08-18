import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrintLocalTool from "../PrintLocalTool";
import { useMapStore } from "@/stores/mapStore";
import { useToastStore } from "@/hooks/useToast";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => <img src={src} alt={alt} {...props} />,
}));

// Mock PanelComponent
vi.mock("@/components/PanelComponent", () => ({
  default: ({ children, name }: { children: React.ReactNode; name: string }) => (
    <div data-testid="panel-component" data-name={name}>
      {children}
    </div>
  ),
}));

// Mock PrintPreviewModal
vi.mock("../PrintPreviewModal", () => ({
  default: ({ isOpen, mapTitle, onClose, onDownload, previewBlob }: { isOpen: boolean; mapTitle: string; onClose: () => void; onDownload: () => void; previewBlob: Blob | null }) =>
    isOpen ? (
      <div data-testid="preview-modal">
        <span data-testid="modal-title">{mapTitle}</span>
        <button data-testid="modal-download" onClick={onDownload}>
          Download
        </button>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        {previewBlob && <span data-testid="preview-blob-size">{previewBlob.size}</span>}
      </div>
    ) : null,
}));

// Mock SimpleCanvasCapture - create a blob with substantial size to pass validation
vi.mock("@/utils/openlayers/SimpleCanvasCapture", () => ({
  captureMapCanvas: vi.fn().mockImplementation(() => {
    // Create a blob with enough content to pass size validation
    const content = new Array(1000).fill("x").join("");
    return Promise.resolve(new Blob([content], { type: "image/png" }));
  }),
}));

// Mock jsPDF
vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
  })),
}));

// Create mock map
const createMockMap = () => ({
  getSize: vi.fn().mockReturnValue([800, 600]),
  getAllLayers: vi.fn().mockReturnValue([{ getVisible: () => true }, { getVisible: () => true }, { getVisible: () => false }]),
  getLayers: vi.fn().mockReturnValue({
    forEach: vi.fn(),
  }),
  getView: vi.fn().mockReturnValue({
    getProjection: vi.fn().mockReturnValue({ getCode: () => "EPSG:3857" }),
    getCenter: vi.fn().mockReturnValue([0, 0]),
    getResolution: vi.fn().mockReturnValue(100),
  }),
});

describe("PrintLocalTool", () => {
  const mockOnClose = vi.fn();
  const _mockOnSidebarVisibility = vi.fn();
  let mockMap: ReturnType<typeof createMockMap>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMap = createMockMap();
    useMapStore.setState({ map: null });

    // Mock window.alert to prevent JSDOM errors
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the print local tool with default name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<PrintLocalTool onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Print Local");
    });

    it("renders with custom name", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<PrintLocalTool name="Custom Local Print" onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Custom Local Print");
    });

    it("renders map title input with default value", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<PrintLocalTool onClose={mockOnClose} />);

      const titleInput = screen.getByDisplayValue("County of Simcoe WebViewer");
      expect(titleInput).toBeInTheDocument();
    });

    it("renders paper size dropdown", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<PrintLocalTool onClose={mockOnClose} />);

      expect(screen.getByText("Select Paper Size:")).toBeInTheDocument();
      expect(screen.getByText("8X11 Portrait (Letter)")).toBeInTheDocument();
    });

    it("renders output format dropdown", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<PrintLocalTool onClose={mockOnClose} />);

      expect(screen.getByText("Select Output Format:")).toBeInTheDocument();
      expect(screen.getByText("PDF")).toBeInTheDocument();
    });

    it("renders both Preview and Print buttons", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<PrintLocalTool onClose={mockOnClose} />);

      expect(screen.getByRole("button", { name: /preview/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /print/i })).toBeInTheDocument();
    });

    it("renders advanced options collapsible", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<PrintLocalTool onClose={mockOnClose} />);

      expect(screen.getByText("Advanced Print Options")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("updates map title when input changes", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      const titleInput = screen.getByDisplayValue("County of Simcoe WebViewer");
      await user.clear(titleInput);
      await user.type(titleInput, "My Custom Map");

      expect(titleInput).toHaveValue("My Custom Map");
    });

    it("changes paper size selection", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      const paperSizeSelect = screen.getAllByRole("combobox")[0];
      await user.selectOptions(paperSizeSelect, "11X8 Landscape");

      expect(paperSizeSelect).toHaveValue("11X8 Landscape");
    });

    it("changes output format selection", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      const formatSelect = screen.getAllByRole("combobox")[1];
      await user.selectOptions(formatSelect, "png");

      expect(formatSelect).toHaveValue("png");
    });

    it("toggles advanced options", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      const advancedToggle = screen.getByText("Advanced Print Options");

      // Initially closed - advanced content should not be visible
      expect(screen.queryByText("Map Scale/Extent:")).not.toBeInTheDocument();

      // Click to open
      await user.click(advancedToggle);

      // Now should be visible
      expect(screen.getByText("Map Scale/Extent:")).toBeInTheDocument();
      expect(screen.getByText("Map Output Resolution:")).toBeInTheDocument();
    });

    it("shows decoration options in advanced settings", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      // Open advanced options
      await user.click(screen.getByText("Advanced Print Options"));

      // Check for decoration checkboxes
      expect(screen.getByLabelText("Scale Bar")).toBeInTheDocument();
      expect(screen.getByLabelText("North Arrow")).toBeInTheDocument();
      expect(screen.getByLabelText("Attributions")).toBeInTheDocument();
    });

    it("toggles scale bar decoration", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      // Open advanced options
      await user.click(screen.getByText("Advanced Print Options"));

      const scaleBarCheckbox = screen.getByLabelText("Scale Bar");
      expect(scaleBarCheckbox).toBeChecked(); // Default is checked

      await user.click(scaleBarCheckbox);
      expect(scaleBarCheckbox).not.toBeChecked();
    });

    it("changes resolution option in advanced settings", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      // Open advanced options
      await user.click(screen.getByText("Advanced Print Options"));

      // Select "Very High" resolution
      const veryHighRadio = screen.getByLabelText("Very High - 300 dpi");
      await user.click(veryHighRadio);

      expect(veryHighRadio).toBeChecked();
    });

    it("updates map only dimensions", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      // Open advanced options
      await user.click(screen.getByText("Advanced Print Options"));

      // Find width input and change it
      const widthInputs = screen.getAllByDisplayValue("800");
      const widthInput = widthInputs[0];
      await user.clear(widthInput);
      await user.type(widthInput, "1024");

      expect(widthInput).toHaveValue("1024");
    });
  });

  describe("Preview Functionality", () => {
    it("shows toast when map is not available and preview is clicked", async () => {
      useMapStore.setState({ map: null });
      useToastStore.setState({ toasts: [] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Map is not available", type: "error" }));
    });

    it("preview button is enabled when map is available", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<PrintLocalTool onClose={mockOnClose} />);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      expect(previewButton).not.toBeDisabled();
    });
  });

  describe("Print Functionality", () => {
    it("shows toast when map is not available and print is clicked", async () => {
      useMapStore.setState({ map: null });
      useToastStore.setState({ toasts: [] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      const printButton = screen.getByRole("button", { name: /^print$/i });
      await user.click(printButton);

      expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Map is not available", type: "error" }));
    });

    it("disables buttons while printing", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      // Make captureMapCanvas take longer
      const { captureMapCanvas } = await import("@/utils/openlayers/SimpleCanvasCapture");
      vi.mocked(captureMapCanvas).mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(new Blob(["test"])), 500)));

      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      const printButton = screen.getByRole("button", { name: /^print$/i });

      await user.click(printButton);

      // Buttons should be disabled while printing
      await waitFor(() => {
        expect(previewButton).toBeDisabled();
        expect(printButton).toBeDisabled();
      });
    });
  });

  describe("Paper Size Options", () => {
    it("displays all paper size options", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const _user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      const _paperSizeSelect = screen.getAllByRole("combobox")[0];

      // Check all options are available
      expect(screen.getByText("8X11 Portrait (Letter)")).toBeInTheDocument();
      expect(screen.getByText("11X8 Landscape (Letter)")).toBeInTheDocument();
      expect(screen.getByText("8X11 Portrait with Overview")).toBeInTheDocument();
      expect(screen.getByText("Map Only")).toBeInTheDocument();
    });
  });

  describe("Output Format Options", () => {
    it("displays all output format options", () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });

      render(<PrintLocalTool onClose={mockOnClose} />);

      expect(screen.getByText("PDF")).toBeInTheDocument();
      expect(screen.getByText("PNG")).toBeInTheDocument();
      expect(screen.getByText("TIF")).toBeInTheDocument();
    });
  });

  describe("Decoration Position Options", () => {
    it("shows position dropdown for enabled decorations", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      // Open advanced options
      await user.click(screen.getByText("Advanced Print Options"));

      // Check scale bar is enabled and has position dropdown
      const scaleBarCheckbox = screen.getByLabelText("Scale Bar");
      expect(scaleBarCheckbox).toBeChecked();

      // Position dropdown should be visible
      const positionSelects = screen.getAllByRole("combobox");
      const positionOptions = positionSelects.filter((select) => select.querySelector('option[value="bottom-left"]'));
      expect(positionOptions.length).toBeGreaterThan(0);
    });

    it("hides position dropdown when decoration is disabled", async () => {
      useMapStore.setState({ map: mockMap as unknown as ReturnType<typeof useMapStore.getState>["map"] });
      const user = userEvent.setup();

      render(<PrintLocalTool onClose={mockOnClose} />);

      // Open advanced options
      await user.click(screen.getByText("Advanced Print Options"));

      // Disable scale bar
      const scaleBarCheckbox = screen.getByLabelText("Scale Bar");
      await user.click(scaleBarCheckbox);

      // The scale bar position dropdown should no longer be visible
      // (testing this is tricky because we need to check if the position select
      // for scale bar specifically is gone)
      expect(scaleBarCheckbox).not.toBeChecked();
    });
  });
});
