import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import MyMapsItemPopup from "@/components/myMaps/MyMapsItemPopup";
import type { MyMapsItem } from "@/types/myMaps";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height }: any) => <img src={src} alt={alt} width={width} height={height} role="img" />,
}));

// Mock keyboard event listeners
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

describe("MyMapsItemPopup Component", () => {
  const user = userEvent.setup();

  const mockItem: MyMapsItem = {
    id: "test-item-1",
    label: "Test Feature",
    labelVisible: true,
    labelRotation: 0,
    drawType: "Point",
    geometryType: "Point",
    visible: true,
    featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
    style: { fill: { color: "#e809e5" } },
  };

  const mockPosition = { x: 100, y: 200 };

  const mockCallbacks = {
    onClose: vi.fn(),
    onBuffer: vi.fn(),
    onSymbolize: vi.fn(),
    onZoomTo: vi.fn(),
    onDelete: vi.fn(),
    onShowGeometry: vi.fn(),
    onExport: vi.fn(),
    onIdentify: vi.fn(),
    onReportProblem: vi.fn(),
  };

  const defaultProps = {
    item: mockItem,
    position: mockPosition,
    isOpen: true,
    ...mockCallbacks,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document event listeners
    Object.defineProperty(document, "addEventListener", {
      value: mockAddEventListener,
      writable: true,
    });
    Object.defineProperty(document, "removeEventListener", {
      value: mockRemoveEventListener,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering and Visibility", () => {
    it("should render when open with valid item", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      expect(screen.getByRole("img", { name: /buffer/i })).toBeInTheDocument();
      expect(screen.getByText("Buffer")).toBeInTheDocument();
      expect(screen.getByText("Symbolize")).toBeInTheDocument();
      expect(screen.getByText("Zoom To")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.getByText("Show Geometry")).toBeInTheDocument();
      expect(screen.getByText("Export to ...")).toBeInTheDocument();
      expect(screen.getByText("Identify")).toBeInTheDocument();
      expect(screen.getByText("Report a Problem")).toBeInTheDocument();
    });

    it("should not render when not open", () => {
      render(<MyMapsItemPopup {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Buffer")).not.toBeInTheDocument();
      expect(screen.queryByText("Symbolize")).not.toBeInTheDocument();
    });

    it("should not render when item is null", () => {
      render(<MyMapsItemPopup {...defaultProps} item={null} />);

      expect(screen.queryByText("Buffer")).not.toBeInTheDocument();
      expect(screen.queryByText("Symbolize")).not.toBeInTheDocument();
    });

    it("should render backdrop when open", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const backdrop = document.querySelector('[class*="fixed"][class*="inset-0"]');
      expect(backdrop).toBeInTheDocument();
    });

    it("should position popup correctly", () => {
      render(<MyMapsItemPopup {...defaultProps} position={{ x: 150, y: 250 }} />);

      const popup = document.querySelector(".popup-container");
      expect(popup).toHaveStyle({
        left: "150px",
        top: "250px",
      });
    });
  });

  describe("Menu Actions", () => {
    it("should call onBuffer when Buffer is clicked", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      await user.click(screen.getByText("Buffer"));

      expect(mockCallbacks.onBuffer).toHaveBeenCalledWith(mockItem);
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should call onSymbolize when Symbolize is clicked", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      await user.click(screen.getByText("Symbolize"));

      expect(mockCallbacks.onSymbolize).toHaveBeenCalledWith(mockItem);
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should call onZoomTo when Zoom To is clicked", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      await user.click(screen.getByText("Zoom To"));

      expect(mockCallbacks.onZoomTo).toHaveBeenCalledWith(mockItem);
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should call onDelete when Delete is clicked", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      await user.click(screen.getByText("Delete"));

      expect(mockCallbacks.onDelete).toHaveBeenCalledWith(mockItem);
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should call onShowGeometry when Show Geometry is clicked", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      await user.click(screen.getByText("Show Geometry"));

      expect(mockCallbacks.onShowGeometry).toHaveBeenCalledWith(mockItem);
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should call onIdentify when Identify is clicked", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      await user.click(screen.getByText("Identify"));

      expect(mockCallbacks.onIdentify).toHaveBeenCalledWith(mockItem);
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should call onReportProblem when Report a Problem is clicked", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      await user.click(screen.getByText("Report a Problem"));

      expect(mockCallbacks.onReportProblem).toHaveBeenCalledWith(mockItem);
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });
  });

  describe("Export Submenu", () => {
    it("should show export submenu on hover", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const exportButton = screen.getByText("Export to ...");
      const exportContainer = exportButton.closest(".popup-menu-item-parent");

      await user.hover(exportContainer!);

      expect(screen.getByText("GeoJSON")).toBeInTheDocument();
      expect(screen.getByText("KML")).toBeInTheDocument();
      expect(screen.getByText("EsriJSON")).toBeInTheDocument();
    });

    it("should hide export submenu when mouse leaves", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const exportButton = screen.getByText("Export to ...");
      const exportContainer = exportButton.closest(".popup-menu-item-parent");

      await user.hover(exportContainer!);

      expect(screen.getByText("GeoJSON")).toBeInTheDocument();

      await user.unhover(exportContainer!);

      expect(screen.queryByText("GeoJSON")).not.toBeInTheDocument();
    });

    it("should call onExport with correct format for GeoJSON", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const exportButton = screen.getByText("Export to ...");
      const exportContainer = exportButton.closest(".popup-menu-item-parent");

      // Use fireEvent for more direct control
      fireEvent.mouseEnter(exportContainer!);

      // Wait for submenu to appear
      await waitFor(() => {
        expect(screen.getByText("GeoJSON")).toBeInTheDocument();
      });

      const geojsonButton = screen.getByText("GeoJSON");
      await user.click(geojsonButton);

      expect(mockCallbacks.onExport).toHaveBeenCalledWith(mockItem, "geojson");
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should call onExport with correct format for KML", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const exportButton = screen.getByText("Export to ...");
      const exportContainer = exportButton.closest(".popup-menu-item-parent");

      // Use fireEvent for more direct control
      fireEvent.mouseEnter(exportContainer!);

      // Wait for submenu to appear
      await waitFor(() => {
        expect(screen.getByText("KML")).toBeInTheDocument();
      });

      const kmlButton = screen.getByText("KML");
      await user.click(kmlButton);

      expect(mockCallbacks.onExport).toHaveBeenCalledWith(mockItem, "kml");
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should call onExport with correct format for EsriJSON", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const exportButton = screen.getByText("Export to ...");
      const exportContainer = exportButton.closest(".popup-menu-item-parent");

      // Use fireEvent for more direct control
      fireEvent.mouseEnter(exportContainer!);

      // Wait for submenu to appear
      await waitFor(() => {
        expect(screen.getByText("EsriJSON")).toBeInTheDocument();
      });

      const esriJsonButton = screen.getByText("EsriJSON");
      await user.click(esriJsonButton);

      expect(mockCallbacks.onExport).toHaveBeenCalledWith(mockItem, "esrijson");
      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should show arrow indicator for submenu", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const exportButton = screen.getByText("Export to ...");
      const arrow = exportButton.parentElement?.querySelector('[class*="ml-auto"]');

      expect(arrow).toBeInTheDocument();
      expect(arrow).toHaveTextContent("▶");
    });
  });

  describe("Optional Callbacks", () => {
    it("should not render actions when callbacks are not provided", () => {
      const propsWithoutCallbacks = {
        item: mockItem,
        position: mockPosition,
        isOpen: true,
        onClose: mockCallbacks.onClose,
        // All other callbacks omitted
      };

      render(<MyMapsItemPopup {...propsWithoutCallbacks} />);

      expect(screen.queryByText("Buffer")).not.toBeInTheDocument();
      expect(screen.queryByText("Symbolize")).not.toBeInTheDocument();
      expect(screen.queryByText("Zoom To")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
      expect(screen.queryByText("Show Geometry")).not.toBeInTheDocument();
      expect(screen.queryByText("Export to ...")).not.toBeInTheDocument();
      expect(screen.queryByText("Identify")).not.toBeInTheDocument();
      expect(screen.queryByText("Report a Problem")).not.toBeInTheDocument();
    });

    it("should render only actions with provided callbacks", () => {
      const partialProps = {
        item: mockItem,
        position: mockPosition,
        isOpen: true,
        onClose: mockCallbacks.onClose,
        onBuffer: mockCallbacks.onBuffer,
        onZoomTo: mockCallbacks.onZoomTo,
        // Other callbacks omitted
      };

      render(<MyMapsItemPopup {...partialProps} />);

      expect(screen.getByText("Buffer")).toBeInTheDocument();
      expect(screen.getByText("Zoom To")).toBeInTheDocument();
      expect(screen.queryByText("Symbolize")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });

  describe("Event Listeners and Cleanup", () => {
    it("should add event listeners when opened", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      expect(mockAddEventListener).toHaveBeenCalledWith("mousedown", expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    });

    it("should not add event listeners when not opened", () => {
      render(<MyMapsItemPopup {...defaultProps} isOpen={false} />);

      expect(mockAddEventListener).not.toHaveBeenCalled();
    });

    it("should remove event listeners on unmount", () => {
      const { unmount } = render(<MyMapsItemPopup {...defaultProps} />);

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith("mousedown", expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    });

    it("should remove event listeners when closed", () => {
      const { rerender } = render(<MyMapsItemPopup {...defaultProps} />);

      // Close popup
      rerender(<MyMapsItemPopup {...defaultProps} isOpen={false} />);

      expect(mockRemoveEventListener).toHaveBeenCalledWith("mousedown", expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    });
  });

  describe("Click Outside Handling", () => {
    it("should call onClose when clicking outside popup", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      // Get the mousedown event listener
      const mousedownListener = mockAddEventListener.mock.calls.find((call) => call[0] === "mousedown")?.[1];

      expect(mousedownListener).toBeDefined();

      // Create a mock event for clicking outside
      const outsideElement = document.createElement("div");
      document.body.appendChild(outsideElement);

      const mockEvent = {
        target: outsideElement,
      };

      mousedownListener(mockEvent);

      expect(mockCallbacks.onClose).toHaveBeenCalled();

      document.body.removeChild(outsideElement);
    });

    it("should not call onClose when clicking inside popup", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const popup = document.querySelector(".popup-container");
      const mousedownListener = mockAddEventListener.mock.calls.find((call) => call[0] === "mousedown")?.[1];

      expect(mousedownListener).toBeDefined();

      // Create a mock event for clicking inside
      const mockEvent = {
        target: popup,
      };

      mousedownListener(mockEvent);

      expect(mockCallbacks.onClose).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Handling", () => {
    it("should close popup when Escape key is pressed", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const keydownListener = mockAddEventListener.mock.calls.find((call) => call[0] === "keydown")?.[1];

      expect(keydownListener).toBeDefined();

      const mockEvent = {
        key: "Escape",
      };

      keydownListener(mockEvent);

      expect(mockCallbacks.onClose).toHaveBeenCalled();
    });

    it("should not close popup for other keys", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const keydownListener = mockAddEventListener.mock.calls.find((call) => call[0] === "keydown")?.[1];

      expect(keydownListener).toBeDefined();

      const mockEvents = [{ key: "Enter" }, { key: " " }, { key: "Tab" }, { key: "ArrowUp" }, { key: "a" }];

      mockEvents.forEach((mockEvent) => {
        keydownListener(mockEvent);
      });

      expect(mockCallbacks.onClose).not.toHaveBeenCalled();
    });
  });

  describe("Menu Item Tooltips", () => {
    it("should have proper title attributes for all menu items", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const menuItems = [
        { text: "Buffer", title: "Create buffer around feature" },
        { text: "Symbolize", title: "Change feature symbolization" },
        { text: "Zoom To", title: "Zoom map to this feature" },
        { text: "Delete", title: "Delete this feature" },
        { text: "Show Geometry", title: "Show geometry details" },
        { text: "Export to ...", title: "Export this feature" },
        { text: "Identify", title: "Identify feature properties" },
        { text: "Report a Problem", title: "Report a problem with this feature" },
      ];

      menuItems.forEach(({ text, title }) => {
        const element = screen.getByText(text);
        const menuItem = element.closest(".popup-menu-item") || element.closest(".popup-menu-item-danger") || element.closest(".popup-menu-item-parent");
        expect(menuItem).toHaveAttribute("title", title);
      });
    });
  });

  describe("Styling and CSS Classes", () => {
    it("should apply correct CSS classes to menu items", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const bufferItem = screen.getByText("Buffer").closest(".popup-menu-item");
      const deleteItem = screen.getByText("Delete").closest(".popup-menu-item-danger");

      expect(bufferItem).toHaveClass("popup-menu-item");
      expect(deleteItem).toHaveClass("popup-menu-item-danger");
    });

    it("should have proper submenu classes", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const exportButton = screen.getByText("Export to ...");
      const exportItem = exportButton.closest(".popup-menu-item-parent");

      expect(exportItem).toHaveClass("popup-menu-item-parent");

      await user.hover(exportButton);

      const submenu = document.querySelector(".popup-submenu-container");
      expect(submenu).toBeInTheDocument();

      const submenuItems = document.querySelectorAll(".popup-submenu-item");
      expect(submenuItems).toHaveLength(3); // GeoJSON, KML, EsriJSON
    });

    it("should have proper separator styling", () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      const separator = document.querySelector('[class*="h-px"]');
      expect(separator).toBeInTheDocument();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle item with missing properties gracefully", () => {
      const incompleteItem = {
        id: "incomplete-item",
        // Missing other required properties
      } as any;

      const props = {
        ...defaultProps,
        item: incompleteItem,
      };

      expect(() => render(<MyMapsItemPopup {...props} />)).not.toThrow();

      // Actions should still work with incomplete item
      expect(screen.getByText("Buffer")).toBeInTheDocument();
    });

    it("should handle rapid menu interactions", async () => {
      render(<MyMapsItemPopup {...defaultProps} />);

      // Rapidly click multiple items
      await user.click(screen.getByText("Buffer"));
      await user.click(screen.getByText("Symbolize"));
      await user.click(screen.getByText("Zoom To"));

      // Only the last action should matter since popup closes after each
      expect(mockCallbacks.onBuffer).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onSymbolize).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onZoomTo).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onClose).toHaveBeenCalledTimes(3);
    });

    it("should handle extreme positions gracefully", () => {
      const extremePositions = [
        { x: -1000, y: -1000 },
        { x: 10000, y: 10000 },
        { x: 0, y: 0 },
      ];

      extremePositions.forEach((position) => {
        const { unmount } = render(<MyMapsItemPopup {...defaultProps} position={position} />);

        const popup = document.querySelector(".popup-container");
        expect(popup).toHaveStyle({
          left: `${position.x}px`,
          top: `${position.y}px`,
        });

        unmount();
      });
    });
  });
});
