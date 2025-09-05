import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import MyMaps from "../MyMaps";
import { useMyMapsStore } from "@/stores/myMapsStore";
import type { MyMapsItem } from "@/types/myMaps";

// Mock all the child components
vi.mock("../ButtonBar", () => ({
  default: ({ isEditing }: { isEditing: boolean }) => (
    <div data-testid="button-bar" data-editing={isEditing}>
      ButtonBar
    </div>
  ),
}));

vi.mock("../ColorBar", () => ({
  default: ({ isEditing }: { isEditing: boolean }) => (
    <div data-testid="color-bar" data-editing={isEditing}>
      ColorBar
    </div>
  ),
}));

vi.mock("../MyMapsItems", () => ({
  default: ({
    onLabelChange,
    onItemDelete,
    onShowItemOptions,
    onHoverStart,
    onHoverEnd,
    isEditing,
  }: {
    onLabelChange: (id: string, label: string) => void;
    onItemDelete: (id: string) => void;
    onShowItemOptions: (item: unknown, event: unknown) => void;
    onHoverStart?: (item: unknown) => void;
    onHoverEnd?: (item: unknown) => void;
    isEditing: boolean;
  }) => (
    <div data-testid="mymaps-items" data-editing={isEditing}>
      <button data-testid="test-label-change" onClick={() => onLabelChange("test-id", "new-label")}>
        Change Label
      </button>
      <button data-testid="test-item-delete" onClick={() => onItemDelete("test-id")}>
        Delete Item
      </button>
      <button
        data-testid="test-show-options"
        onClick={() =>
          onShowItemOptions(
            {
              id: "test-id",
              label: "Test Item",
              featureGeoJSON: '{"type":"Point","coordinates":[0,0]}',
              drawType: "Point",
              geometryType: "Point",
              visible: true,
              labelVisible: true,
            },
            { clientX: 100, clientY: 200 }
          )
        }
      >
        Show Options
      </button>
      <button data-testid="test-hover-start" onClick={() => onHoverStart?.({ id: "test-id" })}>
        Hover Start
      </button>
      <button data-testid="test-hover-end" onClick={() => onHoverEnd?.({ id: "test-id" })}>
        Hover End
      </button>
    </div>
  ),
}));

vi.mock("../MyMapsAdvanced", () => ({
  default: ({
    onEditFeatures,
    onDeleteAllClick,
    onMyMapsImport,
    onAdditionalToolsAction,
    hasItems,
  }: {
    onEditFeatures: (editing: boolean, mode: string) => void;
    onDeleteAllClick: () => void;
    onMyMapsImport: (data: { id: string; json: string }) => void;
    onAdditionalToolsAction: (action: string) => void;
    hasItems: boolean;
  }) => (
    <div data-testid="mymaps-advanced" data-has-items={hasItems}>
      <button data-testid="test-edit-features" onClick={() => onEditFeatures(true, "vertices")}>
        Edit Features
      </button>
      <button data-testid="test-delete-all" onClick={() => onDeleteAllClick()}>
        Delete All
      </button>
      <button data-testid="test-import" onClick={() => onMyMapsImport({ id: "test-id", json: "{}" })}>
        Import
      </button>
      <button data-testid="test-additional-tools" onClick={() => onAdditionalToolsAction("show-all")}>
        Additional Tools
      </button>
    </div>
  ),
}));

vi.mock("../MyMapsItemPopup", () => ({
  default: ({
    item,
    position,
    isOpen,
    onClose,
    onBuffer,
    onSymbolize,
    onZoomTo,
    onDelete,
    onShowGeometry,
    onExport,
    onIdentify,
    onReportProblem,
  }: {
    item: unknown;
    position: { x: number; y: number };
    isOpen: boolean;
    onClose: () => void;
    onBuffer?: (item: unknown) => void;
    onSymbolize?: (item: unknown) => void;
    onZoomTo?: (item: unknown) => void;
    onDelete?: (item: unknown) => void;
    onShowGeometry?: (item: unknown) => void;
    onExport?: (item: unknown, format: string) => void;
    onIdentify?: (item: unknown) => void;
    onReportProblem?: (item: unknown) => void;
  }) => (
    <>
      {isOpen && item && (
        <div data-testid="mymaps-popup" style={{ left: position.x, top: position.y }}>
          <div data-testid="popup-item-id">{(item as { id: string }).id}</div>
          <button data-testid="popup-close" onClick={onClose}>
            Close
          </button>
          <button data-testid="popup-buffer" onClick={() => onBuffer?.(item)}>
            Buffer
          </button>
          <button data-testid="popup-symbolize" onClick={() => onSymbolize?.(item)}>
            Symbolize
          </button>
          <button data-testid="popup-zoom-to" onClick={() => onZoomTo?.(item)}>
            Zoom To
          </button>
          <button data-testid="popup-delete" onClick={() => onDelete?.(item)}>
            Delete
          </button>
          <button data-testid="popup-show-geometry" onClick={() => onShowGeometry?.(item)}>
            Show Geometry
          </button>
          <button data-testid="popup-export" onClick={() => onExport?.(item, "geojson")}>
            Export
          </button>
          <button data-testid="popup-identify" onClick={() => onIdentify?.(item)}>
            Identify
          </button>
          <button data-testid="popup-report-problem" onClick={() => onReportProblem?.(item)}>
            Report Problem
          </button>
        </div>
      )}
    </>
  ),
}));

// Mock URL.revokeObjectURL
Object.defineProperty(window.URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});

// Mock document.createElement for download links
const mockCreateElement = vi.fn((tagName: string) => {
  if (tagName === "a") {
    return {
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLElement;
  }
  return document.createElement(tagName);
});
vi.spyOn(document, "createElement").mockImplementation(mockCreateElement);

// Mock stores
const mockMyMapsStore = {
  drawType: "Cancel",
  drawColor: "#e809e5",
  isEditing: false,
  items: [] as MyMapsItem[],
  setDrawType: vi.fn(),
  updateItemLabel: vi.fn(),
  removeItem: vi.fn(),
  setEditMode: vi.fn(),
  toolTipId: "tooltip-id",
  toolTipClass: "tooltip-class",
  importItems: vi.fn(),
  hasItems: vi.fn(() => false),
  clearAllItems: vi.fn(),
};

const mockEventStore = {
  emit: vi.fn(),
};

vi.mock("@/stores/myMapsStore", () => ({
  useMyMapsStore: vi.fn(() => mockMyMapsStore),
}));

vi.mock("@/stores/eventStore", () => ({
  useEventStore: vi.fn(() => mockEventStore),
}));

describe("MyMaps Component", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMyMapsStore.drawType = "Cancel";
    mockMyMapsStore.drawColor = "#e809e5";
    mockMyMapsStore.isEditing = false;
    mockMyMapsStore.items = [];
    mockMyMapsStore.hasItems.mockReturnValue(false);
  });

  describe("Rendering", () => {
    it("should render all child components when visible", () => {
      render(<MyMaps visible={true} />);

      expect(screen.getByTestId("button-bar")).toBeInTheDocument();
      expect(screen.getByTestId("color-bar")).toBeInTheDocument();
      expect(screen.getByTestId("mymaps-items")).toBeInTheDocument();
      expect(screen.getByTestId("mymaps-advanced")).toBeInTheDocument();
    });

    it("should not render when visible is false", () => {
      render(<MyMaps visible={false} />);

      expect(screen.queryByTestId("button-bar")).not.toBeInTheDocument();
    });

    it("should pass correct props to child components", () => {
      mockMyMapsStore.isEditing = true;
      mockMyMapsStore.hasItems.mockReturnValue(true);

      render(<MyMaps visible={true} />);

      expect(screen.getByTestId("button-bar")).toHaveAttribute("data-editing", "true");
      expect(screen.getByTestId("color-bar")).toHaveAttribute("data-editing", "true");
      expect(screen.getByTestId("mymaps-items")).toHaveAttribute("data-editing", "true");
      expect(screen.getByTestId("mymaps-advanced")).toHaveAttribute("data-has-items", "true");
    });

    it("should render status info with current draw type and color", () => {
      mockMyMapsStore.drawType = "Point";
      mockMyMapsStore.drawColor = "#ff0000";

      render(<MyMaps />);

      expect(screen.getByText("Active Tool:")).toBeInTheDocument();
      expect(screen.getByText("Point")).toBeInTheDocument();
      expect(screen.getByText("Color:")).toBeInTheDocument();
    });

    it("should render tooltip element with correct id and class", () => {
      mockMyMapsStore.toolTipId = "custom-tooltip-id";
      mockMyMapsStore.toolTipClass = "custom-tooltip-class";

      render(<MyMaps />);

      const tooltip = document.getElementById("custom-tooltip-id");
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveClass("custom-tooltip-class");
    });
  });

  describe("Item Operations", () => {
    it("should handle label changes", async () => {
      render(<MyMaps />);

      await user.click(screen.getByTestId("test-label-change"));

      expect(mockMyMapsStore.updateItemLabel).toHaveBeenCalledWith("test-id", "new-label");
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-item-updated", { id: "test-id", label: "new-label" });
    });

    it("should handle item deletion", async () => {
      render(<MyMaps />);

      await user.click(screen.getByTestId("test-item-delete"));

      expect(mockMyMapsStore.removeItem).toHaveBeenCalledWith("test-id");
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-item-deleted", { id: "test-id" });
    });

    it("should handle item hover start", async () => {
      render(<MyMaps />);

      await user.click(screen.getByTestId("test-hover-start"));

      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-item-hover-start", { item: { id: "test-id" } });
    });

    it("should handle item hover end", async () => {
      render(<MyMaps />);

      await user.click(screen.getByTestId("test-hover-end"));

      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-item-hover-end", { item: { id: "test-id" } });
    });
  });

  describe("Popup Functionality", () => {
    it("should show popup when show item options is called", async () => {
      // Mock window dimensions
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });
      Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 768 });

      render(<MyMaps />);

      await user.click(screen.getByTestId("test-show-options"));

      expect(screen.getByTestId("mymaps-popup")).toBeInTheDocument();
      expect(screen.getByTestId("popup-item-id")).toHaveTextContent("test-id");
    });

    it("should adjust popup position to stay within viewport", async () => {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 200 });
      Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 200 });

      render(<MyMaps />);

      await user.click(screen.getByTestId("test-show-options"));

      const popup = screen.getByTestId("mymaps-popup");
      expect(popup).toBeInTheDocument();

      const style = popup.style;
      expect(parseFloat(style.left)).toBeLessThan(200);
      expect(parseFloat(style.top)).toBeLessThan(200);
    });

    it("should close popup when close button is clicked", async () => {
      render(<MyMaps />);

      await user.click(screen.getByTestId("test-show-options"));
      expect(screen.getByTestId("mymaps-popup")).toBeInTheDocument();

      await user.click(screen.getByTestId("popup-close"));
      expect(screen.queryByTestId("mymaps-popup")).not.toBeInTheDocument();
    });

    it("should handle all popup actions", async () => {
      const testItem = {
        id: "test-id",
        label: "Test Item",
        featureGeoJSON: '{"type":"Point","coordinates":[0,0]}',
        drawType: "Point",
        geometryType: "Point",
        visible: true,
        labelVisible: true,
      };

      render(<MyMaps />);

      await user.click(screen.getByTestId("test-show-options"));

      // Test buffer action
      await user.click(screen.getByTestId("popup-buffer"));
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-buffer", { item: testItem });

      await user.click(screen.getByTestId("test-show-options"));

      // Test symbolize action
      await user.click(screen.getByTestId("popup-symbolize"));
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-symbolize", { item: testItem });

      await user.click(screen.getByTestId("test-show-options"));

      // Test zoom to action
      await user.click(screen.getByTestId("popup-zoom-to"));
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-zoom-to", { item: testItem });

      await user.click(screen.getByTestId("test-show-options"));

      // Test delete action
      await user.click(screen.getByTestId("popup-delete"));
      expect(mockMyMapsStore.removeItem).toHaveBeenCalledWith("test-id");
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-item-deleted", { id: "test-id" });

      await user.click(screen.getByTestId("test-show-options"));

      // Test show geometry action
      await user.click(screen.getByTestId("popup-show-geometry"));
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-show-geometry", { item: testItem });

      await user.click(screen.getByTestId("test-show-options"));

      // Test identify action
      await user.click(screen.getByTestId("popup-identify"));
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-identify", { item: testItem });

      await user.click(screen.getByTestId("test-show-options"));

      // Test report problem action
      await user.click(screen.getByTestId("popup-report-problem"));
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-report-problem", { item: testItem });
    });
  });

  describe("Export Functionality", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should export feature as GeoJSON", async () => {
      // Mock document.createElement specifically for this test
      const originalCreateElement = document.createElement;
      const mockLink = {
        href: "",
        download: "",
        click: vi.fn(),
      };
      const createElementSpy = vi.fn((tagName: string) => {
        if (tagName === "a") {
          return mockLink as unknown as HTMLAnchorElement;
        }
        return originalCreateElement.call(document, tagName);
      });

      document.createElement = createElementSpy;

      render(<MyMaps />);

      await user.click(screen.getByTestId("test-show-options"));
      await user.click(screen.getByTestId("popup-export"));

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-export-feature", {
        item: {
          id: "test-id",
          label: "Test Item",
          featureGeoJSON: '{"type":"Point","coordinates":[0,0]}',
          drawType: "Point",
          geometryType: "Point",
          visible: true,
          labelVisible: true,
        },
        format: "geojson",
      });

      // Restore original createElement
      document.createElement = originalCreateElement;
    });

    it("should handle export errors gracefully", async () => {
      // Mock JSON.parse to throw an error only for our specific GeoJSON string
      const originalJSONParse = JSON.parse;
      vi.spyOn(JSON, "parse").mockImplementation((text: string) => {
        if (text === '{"type":"Point","coordinates":[0,0]}') {
          throw new Error("Invalid JSON");
        }
        return originalJSONParse(text);
      });

      render(<MyMaps />);

      await user.click(screen.getByTestId("test-show-options"));
      await user.click(screen.getByTestId("popup-export"));

      // Should emit event even with error because emit happens outside try-catch
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-export-feature", {
        item: {
          id: "test-id",
          label: "Test Item",
          featureGeoJSON: '{"type":"Point","coordinates":[0,0]}',
          drawType: "Point",
          geometryType: "Point",
          visible: true,
          labelVisible: true,
        },
        format: "geojson",
      });

      // Restore original JSON.parse
      vi.restoreAllMocks();
    });
  });

  describe("Advanced Panel Integration", () => {
    it("should handle edit features toggle", async () => {
      render(<MyMaps />);

      await user.click(screen.getByTestId("test-edit-features"));

      expect(mockMyMapsStore.setEditMode).toHaveBeenCalledWith(true, "vertices");
      expect(mockMyMapsStore.setDrawType).toHaveBeenCalledWith("Cancel");
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-edit-mode-changed", { editing: true, mode: "vertices" });
    });

    it("should handle delete all", async () => {
      // Mock the store getState method
      const mockClearAllItems = vi.fn();
      const mockGetState = vi.fn(() => ({ clearAllItems: mockClearAllItems }));
      mockMyMapsStore.clearAllItems = mockClearAllItems;
      vi.mocked(useMyMapsStore).mockReturnValue({
        ...mockMyMapsStore,
        getState: mockGetState,
      } as ReturnType<typeof useMyMapsStore>);
      // Mock getState as a static method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useMyMapsStore as any).getState = mockGetState;

      render(<MyMaps />);

      await user.click(screen.getByTestId("test-delete-all"));

      expect(mockClearAllItems).toHaveBeenCalled();
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-all-items-deleted", {});
    });

    it("should handle import", async () => {
      render(<MyMaps />);

      await user.click(screen.getByTestId("test-import"));

      expect(mockMyMapsStore.importItems).toHaveBeenCalledWith("{}");
    });

    it("should handle additional tools actions", async () => {
      // Mock additional store methods
      const mockToggleAllVisibility = vi.fn();
      const mockDeleteSelected = vi.fn();
      const mockShowByType = vi.fn();
      const mockZoomToSelected = vi.fn();
      const mockMergePolygons = vi.fn(() => ({ success: true }));

      const mockGetState = vi.fn(() => ({
        toggleAllVisibility: mockToggleAllVisibility,
        deleteSelected: mockDeleteSelected,
        showByType: mockShowByType,
        zoomToSelected: mockZoomToSelected,
        mergePolygons: mockMergePolygons,
        exportToFile: vi.fn(() => ({ success: true, count: 1 })),
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useMyMapsStore as any).getState = mockGetState;

      // Mock window.confirm
      vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<MyMaps />);

      await user.click(screen.getByTestId("test-additional-tools"));

      expect(mockToggleAllVisibility).toHaveBeenCalledWith(true);
      expect(mockEventStore.emit).toHaveBeenCalledWith("mymap-additional-tool-action", { action: "show-all" });
    });
  });
});
