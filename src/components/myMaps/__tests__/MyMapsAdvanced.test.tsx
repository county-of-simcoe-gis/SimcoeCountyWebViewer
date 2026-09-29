import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import MyMapsAdvanced from "@/components/myMaps/MyMapsAdvanced";
import { useToastStore } from "@/hooks/useToast";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    <div data-testid="mocked-image" data-src={src} data-alt={alt} data-width={width} data-height={height} className={className} />
  ),
}));

// Mock react-switch
vi.mock("react-switch", () => ({
  default: ({ checked, onChange, ...props }: { checked: boolean; onChange: (checked: boolean) => void; [key: string]: unknown }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid="switch" {...props} />
  ),
}));

// Mock createPortal
vi.mock("react-dom", () => ({
  createPortal: (children: React.ReactNode) => children,
}));

// Mock stores
const mockMyMapsStore = {
  isEditing: false,
  editMode: "vertices",
  importText: "",
  setImportText: vi.fn(),
  saveToApi: vi.fn(),
  importFromApi: vi.fn(),
  fetchUserMaps: vi.fn(),
  userMaps: [],
  getHistory: vi.fn(() => []),
};

vi.mock("@/stores/myMapsStore", () => ({
  useMyMapsStore: vi.fn(() => mockMyMapsStore),
}));

// Mock window methods
const mockConfirm = vi.fn();
const mockClipboardWriteText = vi.fn();

// Mock window location
Object.defineProperty(window, "location", {
  value: { href: "http://localhost:3000/test", search: "", pathname: "/test" },
  writable: true,
});

describe("MyMapsAdvanced Component", () => {
  const user = userEvent.setup();
  const mockOnEditFeatures = vi.fn();
  const mockOnDeleteAllClick = vi.fn();
  const mockOnMyMapsImport = vi.fn();
  const mockOnAdditionalToolsAction = vi.fn();

  const defaultProps = {
    onEditFeatures: mockOnEditFeatures,
    onDeleteAllClick: mockOnDeleteAllClick,
    onMyMapsImport: mockOnMyMapsImport,
    onAdditionalToolsAction: mockOnAdditionalToolsAction,
    hasItems: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-establish window method stubs (needed because global test setup calls vi.restoreAllMocks())
    vi.stubGlobal("confirm", mockConfirm);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockClipboardWriteText },
      configurable: true,
    });

    mockMyMapsStore.isEditing = false;
    mockMyMapsStore.editMode = "vertices";
    mockMyMapsStore.importText = "";
    mockMyMapsStore.saveToApi.mockResolvedValue({ success: true, id: "test-id-123", message: "Saved successfully" });
    mockMyMapsStore.importFromApi.mockResolvedValue({ success: true, message: "Imported successfully", data: { id: "test-id", json: "{}" } });
    mockMyMapsStore.fetchUserMaps.mockResolvedValue(undefined);
    mockMyMapsStore.userMaps = [];
    mockMyMapsStore.getHistory.mockReturnValue([]);

    // Reset window method mocks
    mockConfirm.mockClear();
    mockConfirm.mockReturnValue(true);
    mockClipboardWriteText.mockClear();
    mockClipboardWriteText.mockResolvedValue(undefined);

    // Clear toast store before each test
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render collapsed by default", () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      expect(screen.getByText("Advanced Options")).toBeInTheDocument();

      // Content should be hidden initially
      const content = screen.getByTestId("mymaps-advanced-content");
      expect(content).toHaveAttribute("data-state", "closed");
    });

    it("should expand when trigger button is clicked", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const content = screen.getByTestId("mymaps-advanced-content");
      expect(content).toHaveAttribute("data-state", "open");
    });

    it("should show editing switch and options when expanded", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      expect(screen.getByText("Edit Features")).toBeInTheDocument();
      expect(screen.getByTestId("switch")).toBeInTheDocument();
      expect(screen.getByDisplayValue("vertices")).toBeInTheDocument();
      expect(screen.getByDisplayValue("translate")).toBeInTheDocument();
    });

    it("should show import/save controls when expanded", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      expect(screen.getByPlaceholderText("Enter ID here")).toBeInTheDocument();
      expect(screen.getByText("Import")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Share")).toBeInTheDocument();
    });

    it("should show footer buttons when expanded", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      expect(screen.getByText("Delete All")).toBeInTheDocument();
      expect(screen.getByText("Additional Tools")).toBeInTheDocument();
    });

    it("should disable Save button when hasItems is false", async () => {
      render(<MyMapsAdvanced {...defaultProps} hasItems={false} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const saveButton = screen.getByText("Save");
      expect(saveButton).toBeDisabled();
    });

    it("should disable Delete All button when hasItems is false", async () => {
      render(<MyMapsAdvanced {...defaultProps} hasItems={false} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const deleteButton = screen.getByText("Delete All");
      expect(deleteButton).toBeDisabled();
    });
  });

  describe("Edit Mode Management", () => {
    it("should sync switch state with store isEditing", () => {
      mockMyMapsStore.isEditing = true;
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      fireEvent.click(trigger);

      const switchElement = screen.getByTestId("switch");
      expect(switchElement).toBeChecked();
    });

    it("should call onEditFeatures when switch is toggled", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const switchElement = screen.getByTestId("switch");
      await user.click(switchElement);

      expect(mockOnEditFeatures).toHaveBeenCalledWith(true, "vertices");
    });

    it("should change edit option when radio button is selected", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const translateRadio = screen.getByDisplayValue("translate");
      await user.click(translateRadio);

      expect(mockOnEditFeatures).toHaveBeenCalledWith(false, "translate");
    });

    it("should sync edit mode with store", () => {
      mockMyMapsStore.editMode = "translate";
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      fireEvent.click(trigger);

      const translateRadio = screen.getByDisplayValue("translate");
      expect(translateRadio).toBeChecked();
    });
  });

  describe("Import/Save/Share Operations", () => {
    it("should update input text and call setImportText on input change", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const input = screen.getByPlaceholderText("Enter ID here");
      await user.type(input, "test-id-123");

      expect(mockMyMapsStore.setImportText).toHaveBeenCalledWith("test-id-123");
    });

    it("should sync input value with store importText", () => {
      mockMyMapsStore.importText = "stored-id";
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      fireEvent.click(trigger);

      const input = screen.getByPlaceholderText("Enter ID here");
      expect(input).toHaveValue("stored-id");
    });

    it("should handle successful save operation", async () => {
      render(<MyMapsAdvanced {...defaultProps} hasItems={true} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const saveButton = screen.getByText("Save");
      await user.click(saveButton);

      expect(mockMyMapsStore.saveToApi).toHaveBeenCalled();
      await waitFor(() => {
        expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Saved successfully", type: "success" }));
      });
      expect(mockMyMapsStore.setImportText).toHaveBeenCalledWith("test-id-123");
    });

    it("should handle save failure", async () => {
      mockMyMapsStore.saveToApi.mockResolvedValue({ success: false, message: "Save failed" });

      render(<MyMapsAdvanced {...defaultProps} hasItems={true} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const saveButton = screen.getByText("Save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Save failed", type: "error" }));
      });
    });

    it("should disable save button when hasItems is false", async () => {
      render(<MyMapsAdvanced {...defaultProps} hasItems={false} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const saveButton = screen.getByText("Save");
      expect(saveButton).toBeDisabled();
    });

    it("should handle successful import operation", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const input = screen.getByPlaceholderText("Enter ID here");
      await user.type(input, "import-id-123");

      const importButton = screen.getByText("Import");
      await user.click(importButton);

      expect(mockMyMapsStore.importFromApi).toHaveBeenCalledWith("import-id-123");
      await waitFor(() => {
        expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Imported successfully", type: "success" }));
      });
      expect(mockOnMyMapsImport).toHaveBeenCalledWith({ id: "test-id", json: "{}" });
    });

    it("should handle import failure", async () => {
      mockMyMapsStore.importFromApi.mockResolvedValue({ success: false, message: "Import failed" });

      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const input = screen.getByPlaceholderText("Enter ID here");
      await user.type(input, "invalid-id");

      const importButton = screen.getByText("Import");
      await user.click(importButton);

      await waitFor(() => {
        expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Import failed", type: "error" }));
      });
    });

    it("should show toast when trying to import without ID", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const importButton = screen.getByText("Import");
      await user.click(importButton);

      expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Please enter a MyMaps ID to import.", type: "warning" }));
    });

    it("should handle share operation", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const input = screen.getByPlaceholderText("Enter ID here");
      await user.type(input, "share-id-123");

      const shareButton = screen.getByText("Share");
      await user.click(shareButton);

      await waitFor(() => {
        expect(mockClipboardWriteText).toHaveBeenCalledWith("http://localhost:3000/test?MY_MAPS_ID=share-id-123");
      });
      expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "MyMaps link has been saved to clipboard.", type: "success" }));
    });

    it("should show toast when trying to share without ID", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const shareButton = screen.getByText("Share");
      await user.click(shareButton);

      expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Please save your MyMaps first to get an ID to share.", type: "warning" }));
    });
  });

  describe("Delete All Operation", () => {
    it("should confirm before deleting all items", async () => {
      render(<MyMapsAdvanced {...defaultProps} hasItems={true} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const deleteButton = screen.getByText("Delete All");
      await user.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith("Delete all items? This action cannot be undone.");
      expect(mockOnDeleteAllClick).toHaveBeenCalled();
    });

    it("should not delete if user cancels confirmation", async () => {
      mockConfirm.mockReturnValue(false);

      render(<MyMapsAdvanced {...defaultProps} hasItems={true} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const deleteButton = screen.getByText("Delete All");
      await user.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockOnDeleteAllClick).not.toHaveBeenCalled();
    });
  });

  describe("Additional Tools Menu", () => {
    it("should show additional tools menu when button is clicked", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const toolsButton = screen.getByText("Additional Tools");
      await user.click(toolsButton);

      expect(screen.getByText("Show All")).toBeInTheDocument();
      expect(screen.getByText("Hide All")).toBeInTheDocument();
      expect(screen.getByText("Delete Selected")).toBeInTheDocument();
      expect(screen.getByText("Delete Unselected")).toBeInTheDocument();
      expect(screen.getByText("Merge Polygons")).toBeInTheDocument();
      expect(screen.getByText("Export to ...")).toBeInTheDocument();
    });

    it("should call onAdditionalToolsAction when menu items are clicked", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const toolsButton = screen.getByText("Additional Tools");
      await user.click(toolsButton);

      const showAllButton = screen.getByText("Show All");
      await user.click(showAllButton);

      expect(mockOnAdditionalToolsAction).toHaveBeenCalledWith("show-all");
    });

    it("should show export submenu on hover", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const toolsButton = screen.getByText("Additional Tools");
      await user.click(toolsButton);

      const exportButton = screen.getByText("Export to ...");
      await user.hover(exportButton);

      expect(screen.getByText("KML")).toBeInTheDocument();
      expect(screen.getByText("ESRIJson")).toBeInTheDocument();
      expect(screen.getByText("GeoJSON")).toBeInTheDocument();
    });

    it("should call onAdditionalToolsAction for export formats", async () => {
      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const toolsButton = screen.getByText("Additional Tools");
      await user.click(toolsButton);

      const exportButton = screen.getByText("Export to ...");
      await user.hover(exportButton);

      const kmlButton = screen.getByText("KML");
      await user.click(kmlButton);

      expect(mockOnAdditionalToolsAction).toHaveBeenCalledWith("export-kml");
    });
  });

  describe("Error Handling", () => {
    it("should handle save API error", async () => {
      mockMyMapsStore.saveToApi.mockRejectedValue(new Error("Network error"));

      render(<MyMapsAdvanced {...defaultProps} hasItems={true} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const saveButton = screen.getByText("Save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "An error occurred while saving. Please try again.", type: "error" }));
      });
    });

    it("should handle import API error", async () => {
      mockMyMapsStore.importFromApi.mockRejectedValue(new Error("Network error"));

      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const input = screen.getByPlaceholderText("Enter ID here");
      await user.type(input, "test-id");

      const importButton = screen.getByText("Import");
      await user.click(importButton);

      await waitFor(() => {
        expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "An error occurred while importing. Please try again.", type: "error" }));
      });
    });
  });

  describe("Input Focus/Blur Events", () => {
    it("should log focus and blur events for input", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      render(<MyMapsAdvanced {...defaultProps} />);

      const trigger = screen.getByText("Advanced Options");
      await user.click(trigger);

      const input = screen.getByPlaceholderText("Enter ID here");

      await user.click(input);
      expect(consoleSpy).toHaveBeenCalledWith("MyMaps: Input focused, disabling keyboard events");

      await user.tab();
      expect(consoleSpy).toHaveBeenCalledWith("MyMaps: Input blurred, enabling keyboard events");

      consoleSpy.mockRestore();
    });
  });
});
