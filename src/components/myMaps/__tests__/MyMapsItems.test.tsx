import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import MyMapsItems from "@/components/myMaps/MyMapsItems";
import type { MyMapsItem } from "@/types/myMaps";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height }: any) => <img src={src} alt={alt} width={width} height={height} />,
}));

// Mock MyMapsItem component
vi.mock("@/components/myMaps/MyMapsItem", () => ({
  default: ({ item, onLabelChange, onDelete, onShowOptions, onHoverStart, onHoverEnd, isEditing }: any) => (
    <div data-testid={`mymaps-item-${item.id}`} data-editing={isEditing}>
      <span>{item.label}</span>
      <button data-testid={`label-change-${item.id}`} onClick={() => onLabelChange(item.id, "Changed Label")}>
        Change Label
      </button>
      <button data-testid={`delete-${item.id}`} onClick={() => onDelete(item.id)}>
        Delete
      </button>
      <button data-testid={`show-options-${item.id}`} onClick={() => onShowOptions?.(item, { clientX: 100, clientY: 200 })}>
        Show Options
      </button>
      <button data-testid={`hover-start-${item.id}`} onClick={() => onHoverStart?.(item)}>
        Hover Start
      </button>
      <button data-testid={`hover-end-${item.id}`} onClick={() => onHoverEnd?.(item)}>
        Hover End
      </button>
    </div>
  ),
}));

// Mock store
const mockMyMapsStore = {
  items: [] as MyMapsItem[],
};

vi.mock("@/stores/myMapsStore", () => ({
  useMyMapsStore: vi.fn(() => mockMyMapsStore),
}));

describe("MyMapsItems Component", () => {
  const user = userEvent.setup();
  const mockOnLabelChange = vi.fn();
  const mockOnItemDelete = vi.fn();
  const mockOnShowItemOptions = vi.fn();
  const mockOnHoverStart = vi.fn();
  const mockOnHoverEnd = vi.fn();

  const defaultProps = {
    onLabelChange: mockOnLabelChange,
    onItemDelete: mockOnItemDelete,
    onShowItemOptions: mockOnShowItemOptions,
    onHoverStart: mockOnHoverStart,
    onHoverEnd: mockOnHoverEnd,
    isEditing: false,
  };

  const mockItems: MyMapsItem[] = [
    {
      id: "item-1",
      label: "Test Point",
      labelVisible: true,
      labelRotation: 0,
      drawType: "Point",
      geometryType: "Point",
      visible: true,
      featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
      style: { fill: { color: "#e809e5" } },
    },
    {
      id: "item-2",
      label: "Test Line",
      labelVisible: false,
      labelRotation: 0,
      drawType: "LineString",
      geometryType: "LineString",
      visible: false,
      featureGeoJSON: '{"type":"Feature","geometry":{"type":"LineString","coordinates":[[0,0],[1,1]]}}',
      style: { stroke: { color: "#ff0000", width: 2 } },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockMyMapsStore.items = [];
  });

  describe("Header Rendering", () => {
    it("should render header with icon and title", () => {
      render(<MyMapsItems {...defaultProps} />);

      expect(screen.getByRole("img", { name: /my maps icon/i })).toBeInTheDocument();
      expect(screen.getByText("My Items")).toBeInTheDocument();
    });

    it("should show editing mode indicator when editing", () => {
      render(<MyMapsItems {...defaultProps} isEditing={true} />);

      expect(screen.getByText("Editing Mode On")).toBeInTheDocument();
    });

    it("should not show editing mode indicator when not editing", () => {
      render(<MyMapsItems {...defaultProps} isEditing={false} />);

      expect(screen.queryByText("Editing Mode On")).not.toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show no data message when items array is empty", () => {
      mockMyMapsStore.items = [];

      render(<MyMapsItems {...defaultProps} />);

      expect(screen.getByText(/there are currently no items to display/i)).toBeInTheDocument();
      expect(screen.getByText(/please use the drawing tools above/i)).toBeInTheDocument();
    });

    it("should not show items list when empty", () => {
      mockMyMapsStore.items = [];

      render(<MyMapsItems {...defaultProps} />);

      expect(screen.queryByTestId("mymaps-item-item-1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("mymaps-item-item-2")).not.toBeInTheDocument();
    });
  });

  describe("Items Rendering", () => {
    it("should render all items from store", () => {
      mockMyMapsStore.items = mockItems;

      render(<MyMapsItems {...defaultProps} />);

      expect(screen.getByTestId("mymaps-item-item-1")).toBeInTheDocument();
      expect(screen.getByTestId("mymaps-item-item-2")).toBeInTheDocument();
      expect(screen.getByText("Test Point")).toBeInTheDocument();
      expect(screen.getByText("Test Line")).toBeInTheDocument();
    });

    it("should not show no data message when items exist", () => {
      mockMyMapsStore.items = mockItems;

      render(<MyMapsItems {...defaultProps} />);

      expect(screen.queryByText(/there are currently no items to display/i)).not.toBeInTheDocument();
    });

    it("should wrap each item in a wrapper div", () => {
      mockMyMapsStore.items = mockItems;

      render(<MyMapsItems {...defaultProps} />);

      const wrappers = document.querySelectorAll('[data-testid="mymaps-item-wrapper"]');
      expect(wrappers).toHaveLength(2);
    });

    it("should pass correct props to MyMapsItem components", () => {
      mockMyMapsStore.items = mockItems;

      render(<MyMapsItems {...defaultProps} isEditing={true} />);

      expect(screen.getByTestId("mymaps-item-item-1")).toHaveAttribute("data-editing", "true");
      expect(screen.getByTestId("mymaps-item-item-2")).toHaveAttribute("data-editing", "true");
    });
  });

  describe("Event Handling", () => {
    beforeEach(() => {
      mockMyMapsStore.items = mockItems;
    });

    it("should handle label change events", async () => {
      render(<MyMapsItems {...defaultProps} />);

      await user.click(screen.getByTestId("label-change-item-1"));

      expect(mockOnLabelChange).toHaveBeenCalledWith("item-1", "Changed Label");
    });

    it("should handle delete events", async () => {
      render(<MyMapsItems {...defaultProps} />);

      await user.click(screen.getByTestId("delete-item-1"));

      expect(mockOnItemDelete).toHaveBeenCalledWith("item-1");
    });

    it("should handle show options events", async () => {
      render(<MyMapsItems {...defaultProps} />);

      await user.click(screen.getByTestId("show-options-item-1"));

      expect(mockOnShowItemOptions).toHaveBeenCalledWith(mockItems[0], { clientX: 100, clientY: 200 });
    });

    it("should handle hover start events when callback is provided", async () => {
      render(<MyMapsItems {...defaultProps} />);

      await user.click(screen.getByTestId("hover-start-item-1"));

      expect(mockOnHoverStart).toHaveBeenCalledWith(mockItems[0]);
    });

    it("should handle hover end events when callback is provided", async () => {
      render(<MyMapsItems {...defaultProps} />);

      await user.click(screen.getByTestId("hover-end-item-1"));

      expect(mockOnHoverEnd).toHaveBeenCalledWith(mockItems[0]);
    });

    it("should not throw when optional callbacks are not provided", async () => {
      const propsWithoutOptionalCallbacks = {
        onLabelChange: mockOnLabelChange,
        onItemDelete: mockOnItemDelete,
        // onShowItemOptions, onHoverStart, onHoverEnd are optional
      };

      render(<MyMapsItems {...propsWithoutOptionalCallbacks} />);

      // These clicks should not throw errors even without callbacks
      await user.click(screen.getByTestId("show-options-item-1"));
      await user.click(screen.getByTestId("hover-start-item-1"));
      await user.click(screen.getByTestId("hover-end-item-1"));

      // The mock functions should not have been called since they weren't provided
      expect(mockOnShowItemOptions).not.toHaveBeenCalled();
      expect(mockOnHoverStart).not.toHaveBeenCalled();
      expect(mockOnHoverEnd).not.toHaveBeenCalled();
    });
  });

  describe("Different Item Types", () => {
    it("should render different geometry types", () => {
      const diverseItems: MyMapsItem[] = [
        {
          id: "point-1",
          label: "Point Feature",
          labelVisible: true,
          labelRotation: 0,
          drawType: "Point",
          geometryType: "Point",
          visible: true,
          featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        },
        {
          id: "line-1",
          label: "Line Feature",
          labelVisible: true,
          labelRotation: 0,
          drawType: "LineString",
          geometryType: "LineString",
          visible: true,
          featureGeoJSON: '{"type":"Feature","geometry":{"type":"LineString","coordinates":[[0,0],[1,1]]}}',
        },
        {
          id: "polygon-1",
          label: "Polygon Feature",
          labelVisible: true,
          labelRotation: 0,
          drawType: "Polygon",
          geometryType: "Polygon",
          visible: true,
          featureGeoJSON: '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}}',
        },
      ];

      mockMyMapsStore.items = diverseItems;

      render(<MyMapsItems {...defaultProps} />);

      expect(screen.getByTestId("mymaps-item-point-1")).toBeInTheDocument();
      expect(screen.getByTestId("mymaps-item-line-1")).toBeInTheDocument();
      expect(screen.getByTestId("mymaps-item-polygon-1")).toBeInTheDocument();
      expect(screen.getByText("Point Feature")).toBeInTheDocument();
      expect(screen.getByText("Line Feature")).toBeInTheDocument();
      expect(screen.getByText("Polygon Feature")).toBeInTheDocument();
    });

    it("should render special draw types", () => {
      const specialItems: MyMapsItem[] = [
        {
          id: "text-1",
          label: "Text Feature",
          labelVisible: true,
          labelRotation: 0,
          drawType: "Text",
          geometryType: "Point",
          visible: true,
          featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        },
        {
          id: "bearing-1",
          label: "Bearing: 45Â°",
          labelVisible: true,
          labelRotation: 0,
          drawType: "Bearing",
          geometryType: "LineString",
          visible: true,
          featureGeoJSON: '{"type":"Feature","geometry":{"type":"LineString","coordinates":[[0,0],[1,1]]}}',
        },
        {
          id: "measure-1",
          label: "100m",
          labelVisible: true,
          labelRotation: 0,
          drawType: "Measure",
          geometryType: "LineString",
          visible: true,
          featureGeoJSON: '{"type":"Feature","geometry":{"type":"LineString","coordinates":[[0,0],[1,0]]}}',
        },
      ];

      mockMyMapsStore.items = specialItems;

      render(<MyMapsItems {...defaultProps} />);

      expect(screen.getByText("Text Feature")).toBeInTheDocument();
      expect(screen.getByText("Bearing: 45Â°")).toBeInTheDocument();
      expect(screen.getByText("100m")).toBeInTheDocument();
    });
  });

  describe("Dynamic Updates", () => {
    it("should update when items are added to store", () => {
      // Start with empty items
      mockMyMapsStore.items = [];
      const { rerender } = render(<MyMapsItems {...defaultProps} />);

      expect(screen.getByText(/there are currently no items to display/i)).toBeInTheDocument();

      // Add items
      mockMyMapsStore.items = mockItems;
      rerender(<MyMapsItems {...defaultProps} />);

      expect(screen.queryByText(/there are currently no items to display/i)).not.toBeInTheDocument();
      expect(screen.getByTestId("mymaps-item-item-1")).toBeInTheDocument();
      expect(screen.getByTestId("mymaps-item-item-2")).toBeInTheDocument();
    });

    it("should update when items are removed from store", () => {
      // Start with items
      mockMyMapsStore.items = mockItems;
      const { rerender } = render(<MyMapsItems {...defaultProps} />);

      expect(screen.getByTestId("mymaps-item-item-1")).toBeInTheDocument();

      // Remove items
      mockMyMapsStore.items = [];
      rerender(<MyMapsItems {...defaultProps} />);

      expect(screen.queryByTestId("mymaps-item-item-1")).not.toBeInTheDocument();
      expect(screen.getByText(/there are currently no items to display/i)).toBeInTheDocument();
    });

    it("should update editing state for all items", () => {
      mockMyMapsStore.items = mockItems;
      const { rerender } = render(<MyMapsItems {...defaultProps} isEditing={false} />);

      expect(screen.getByTestId("mymaps-item-item-1")).toHaveAttribute("data-editing", "false");

      // Enable editing
      rerender(<MyMapsItems {...defaultProps} isEditing={true} />);

      expect(screen.getByTestId("mymaps-item-item-1")).toHaveAttribute("data-editing", "true");
      expect(screen.getByTestId("mymaps-item-item-2")).toHaveAttribute("data-editing", "true");
      expect(screen.getByText("Editing Mode On")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper container structure", () => {
      render(<MyMapsItems {...defaultProps} />);

      const container = screen.getByTestId("mymaps-item-container");
      expect(container).toBeInTheDocument();
    });

    it("should have identifiable header", () => {
      render(<MyMapsItems {...defaultProps} />);

      const header = screen.getByTestId("mymaps-items-header");
      expect(header).toBeInTheDocument();
      expect(header).toContainElement(screen.getByRole("img", { name: /my maps icon/i }));
    });

    it("should have proper list structure for items", () => {
      mockMyMapsStore.items = mockItems;

      render(<MyMapsItems {...defaultProps} />);

      const list = screen.getByTestId("mymaps-items-list");
      expect(list).toBeInTheDocument();

      const wrappers = document.querySelectorAll('[data-testid="mymaps-item-wrapper"]');
      expect(wrappers).toHaveLength(2);
    });
  });

  describe("Performance", () => {
    it("should render efficiently with many items", () => {
      const manyItems = Array.from({ length: 100 }, (_, index) => ({
        id: `item-${index}`,
        label: `Item ${index}`,
        labelVisible: true,
        labelRotation: 0,
        drawType: "Point" as const,
        geometryType: "Point" as const,
        visible: true,
        featureGeoJSON: `{"type":"Feature","geometry":{"type":"Point","coordinates":[${index},${index}]}}`,
      }));

      mockMyMapsStore.items = manyItems;

      const { container } = render(<MyMapsItems {...defaultProps} />);

      expect(container.querySelectorAll('[data-testid="mymaps-item-wrapper"]')).toHaveLength(100);
      expect(screen.getByText("Item 0")).toBeInTheDocument();
      expect(screen.getByText("Item 99")).toBeInTheDocument();
    });
  });
});

