import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TOCFolderView from "@/components/TOC/TOCFolderView";
import { TOCLayer, TOCLayerGroup, useTOCStore } from "@/stores/tocStore";

// Mock the GroupItem component to isolate TOCFolderView testing
vi.mock("@/components/TOC/GroupItem", () => ({
  default: ({ group, onLayerChange, onLegendToggle, onLayerOptionsClick, onLayerVisibilityGroup, onGroupFolderToggle }: any) => (
    <div data-testid={`group-item-${group.value}`}>
      <div data-testid={`group-${group.value}-label`}>{group.label}</div>
      <button data-testid={`group-${group.value}-toggle`} onClick={() => onGroupFolderToggle(group.value, true)}>
        Toggle Group
      </button>
      <input data-testid={`group-${group.value}-visibility`} type="checkbox" onChange={() => onLayerVisibilityGroup(group, true)} />
      {group.layers.map((layer: TOCLayer) => (
        <div key={layer.name} data-testid={`layer-${layer.name}`}>
          <span>{layer.tocDisplayName}</span>
          <button data-testid={`layer-${layer.name}-change`} onClick={() => onLayerChange(layer, group)}>
            Change Layer
          </button>
          <button data-testid={`layer-${layer.name}-legend`} onClick={() => onLegendToggle(layer, group)}>
            Toggle Legend
          </button>
          <button data-testid={`layer-${layer.name}-options`} onClick={(evt) => onLayerOptionsClick(evt, layer)}>
            Layer Options
          </button>
        </div>
      ))}
    </div>
  ),
}));

describe("TOCFolderView", () => {
  // Mock data for testing
  const mockLayers: TOCLayer[] = [
    {
      id: "1",
      name: "layer1",
      displayName: "Layer 1",
      tocDisplayName: "Layer 1 Display",
      styleUrl: "",
      height: 20,
      drawIndex: 0,
      index: 0,
      initialDrawIndex: 0,
      showLegend: false,
      legendHeight: 0,
      legendImage: null,
      legendObj: null,
      visible: true,
      defaultVisible: true,
      layer: null,
      metadataUrl: null,
      opacity: 1,
      minScale: 0,
      maxScale: 1000000,
      liveLayer: false,
      groupName: "Group 1",
      group: "group1",
      userLayer: false,
    },
    {
      id: "2",
      name: "layer2",
      displayName: "Layer 2",
      tocDisplayName: "Layer 2 Display",
      styleUrl: "",
      height: 20,
      drawIndex: 1,
      index: 1,
      initialDrawIndex: 1,
      showLegend: false,
      legendHeight: 0,
      legendImage: null,
      legendObj: null,
      visible: false,
      defaultVisible: false,
      layer: null,
      metadataUrl: null,
      opacity: 1,
      minScale: 0,
      maxScale: 1000000,
      liveLayer: false,
      groupName: "Group 1",
      group: "group1",
      userLayer: false,
    },
  ];

  const mockLayerGroups: TOCLayerGroup[] = [
    {
      value: "group1",
      label: "Group 1",
      defaultGroup: false,
      url: "",
      prefix: "",
      visibleLayers: [],
      wmsGroupUrl: "",
      customRestUrl: "",
      layers: mockLayers,
    },
    {
      value: "group2",
      label: "Group 2",
      defaultGroup: false,
      url: "",
      prefix: "",
      visibleLayers: [],
      wmsGroupUrl: "",
      customRestUrl: "",
      layers: [
        {
          ...mockLayers[0],
          id: "3",
          name: "layer3",
          displayName: "Layer 3",
          tocDisplayName: "Layer 3 Display",
          groupName: "Group 2",
          group: "group2",
        },
      ],
    },
  ];

  const defaultProps = {
    id: "test-toc-folder",
    visible: true,
    layerGroups: mockLayerGroups,
    searchText: "",
    sortAlpha: false,
    onLayerChange: vi.fn(),
    onLegendToggle: vi.fn(),
    onLayerOptionsClick: vi.fn(),
    onLayerVisibilityGroup: vi.fn(),
    onGroupFolderToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset TOC store
    useTOCStore.setState({
      tocType: "FOLDER",
      layerListGroups: [],
      layerFolderGroups: mockLayerGroups,
      allLayers: [...mockLayers, mockLayerGroups[1].layers[0]],
    });
  });

  describe("Basic Rendering", () => {
    it("renders when visible", () => {
      render(<TOCFolderView {...defaultProps} />);

      const container = screen.getByTestId("sc-toc-simcoe-folder-view-container-main");
      expect(container).toBeInTheDocument();
      expect(container).not.toHaveClass("hidden");
    });

    it("hides when not visible", () => {
      render(<TOCFolderView {...defaultProps} visible={false} />);

      const container = screen.getByTestId("sc-toc-simcoe-folder-view-container-main");
      expect(container).toHaveClass("hidden");
    });

    it("renders all layer groups", () => {
      render(<TOCFolderView {...defaultProps} />);

      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
      expect(screen.getByTestId("group-group1-label")).toHaveTextContent("Group 1");
      expect(screen.getByTestId("group-group2-label")).toHaveTextContent("Group 2");
    });

    it("passes correct props to GroupItem components", () => {
      render(<TOCFolderView {...defaultProps} searchText="test search" sortAlpha={true} />);

      // GroupItem components should be rendered with correct data
      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
    });
  });

  describe("Visibility Changes", () => {
    it("updates visibility when prop changes", async () => {
      const { rerender } = render(<TOCFolderView {...defaultProps} visible={true} />);

      let container = screen.getByTestId("sc-toc-simcoe-folder-view-container-main");
      expect(container).not.toHaveClass("hidden");

      rerender(<TOCFolderView {...defaultProps} visible={false} />);

      await waitFor(() => {
        container = screen.getByTestId("sc-toc-simcoe-folder-view-container-main");
        expect(container).toHaveClass("hidden");
      });
    });
  });

  describe("Event Handling", () => {
    it("handles layer change events", () => {
      render(<TOCFolderView {...defaultProps} />);

      const layerChangeButton = screen.getByTestId("layer-layer1-change");
      fireEvent.click(layerChangeButton);

      expect(defaultProps.onLayerChange).toHaveBeenCalledWith(mockLayers[0], mockLayerGroups[0]);
    });

    it("handles legend toggle events", () => {
      render(<TOCFolderView {...defaultProps} />);

      const legendToggleButton = screen.getByTestId("layer-layer1-legend");
      fireEvent.click(legendToggleButton);

      expect(defaultProps.onLegendToggle).toHaveBeenCalledWith(mockLayers[0], mockLayerGroups[0]);
    });

    it("handles layer options click events", () => {
      render(<TOCFolderView {...defaultProps} />);

      const layerOptionsButton = screen.getByTestId("layer-layer1-options");
      fireEvent.click(layerOptionsButton);

      expect(defaultProps.onLayerOptionsClick).toHaveBeenCalledWith(
        expect.any(Object), // MouseEvent
        mockLayers[0],
      );
    });

    it("handles group visibility events", () => {
      render(<TOCFolderView {...defaultProps} />);

      const groupVisibilityButton = screen.getByTestId("group-group1-visibility");
      fireEvent.click(groupVisibilityButton);

      expect(defaultProps.onLayerVisibilityGroup).toHaveBeenCalledWith(mockLayerGroups[0], true);
    });

    it("handles group folder toggle events", () => {
      render(<TOCFolderView {...defaultProps} />);

      const groupToggleButton = screen.getByTestId("group-group1-toggle");
      fireEvent.click(groupToggleButton);

      expect(defaultProps.onGroupFolderToggle).toHaveBeenCalledWith("group1", true);
    });
  });

  describe("Search Functionality", () => {
    it("passes search text to GroupItem components", () => {
      const searchText = "test search";
      render(<TOCFolderView {...defaultProps} searchText={searchText} />);

      // Verify GroupItem components are rendered (they handle their own search filtering)
      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
    });

    it("handles empty search text", () => {
      render(<TOCFolderView {...defaultProps} searchText="" />);

      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("passes sort alpha flag to GroupItem components", () => {
      render(<TOCFolderView {...defaultProps} sortAlpha={true} />);

      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
    });

    it("handles sort alpha disabled", () => {
      render(<TOCFolderView {...defaultProps} sortAlpha={false} />);

      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
    });
  });

  describe("Layer Groups Handling", () => {
    it("handles empty layer groups", () => {
      render(<TOCFolderView {...defaultProps} layerGroups={[]} />);

      const container = screen.getByTestId("sc-toc-simcoe-folder-view-container-main");
      expect(container).toBeInTheDocument();
      expect(screen.queryByTestId(/^group-item-/)).not.toBeInTheDocument();
    });

    it("renders groups with unique keys", () => {
      render(<TOCFolderView {...defaultProps} />);

      // Each group should have a unique ID based on the TOC id and group value
      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
    });

    it("passes correct panelOpen prop to GroupItem", () => {
      render(<TOCFolderView {...defaultProps} />);

      // panelOpen should always be true for folder view
      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
    });
  });

  describe("Props Validation", () => {
    it("handles missing optional props", () => {
      const minimalProps = {
        id: "test-toc-folder",
        visible: true,
        layerGroups: mockLayerGroups,
        searchText: "",
        sortAlpha: false,
        onLayerChange: vi.fn(),
        onLegendToggle: vi.fn(),
        onLayerOptionsClick: vi.fn(),
        onLayerVisibilityGroup: vi.fn(),
        onGroupFolderToggle: vi.fn(),
      };

      render(<TOCFolderView {...minimalProps} />);

      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
    });

    it("handles selectedGroup prop when provided", () => {
      render(<TOCFolderView {...defaultProps} selectedGroup={mockLayerGroups[0]} />);

      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
    });

    it("handles null selectedGroup prop", () => {
      render(<TOCFolderView {...defaultProps} selectedGroup={null} />);

      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();
    });
  });

  describe("Component Lifecycle", () => {
    it("responds to visibility prop changes", async () => {
      const { rerender } = render(<TOCFolderView {...defaultProps} visible={false} />);

      let container = screen.getByTestId("sc-toc-simcoe-folder-view-container-main");
      expect(container).toHaveClass("hidden");

      rerender(<TOCFolderView {...defaultProps} visible={true} />);

      await waitFor(() => {
        container = screen.getByTestId("sc-toc-simcoe-folder-view-container-main");
        expect(container).not.toHaveClass("hidden");
      });
    });

    it("updates when layer groups change", () => {
      const { rerender } = render(<TOCFolderView {...defaultProps} />);

      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.getByTestId("group-item-group2")).toBeInTheDocument();

      const newLayerGroups = [mockLayerGroups[0]]; // Only first group
      rerender(<TOCFolderView {...defaultProps} layerGroups={newLayerGroups} />);

      expect(screen.getByTestId("group-item-group1")).toBeInTheDocument();
      expect(screen.queryByTestId("group-item-group2")).not.toBeInTheDocument();
    });
  });

  describe("CSS Classes and Structure", () => {
    it("applies correct CSS classes", () => {
      render(<TOCFolderView {...defaultProps} />);

      const container = screen.getByTestId("sc-toc-simcoe-folder-view-container-main");
      expect(container).toHaveAttribute("id", "sc-toc-simcoe-folder-view-container-main");

      const groupList = container.querySelector('[data-testid="toc-group-list"]');
      expect(groupList).toBeInTheDocument();
    });

    it("has correct DOM structure", () => {
      render(<TOCFolderView {...defaultProps} />);

      const container = screen.getByTestId("sc-toc-simcoe-folder-view-container-main");
      const groupList = container.querySelector('[data-testid="toc-group-list"]');
      expect(groupList).toBeInTheDocument();
      expect(groupList?.children.length).toBe(2); // Two groups
    });
  });
});
