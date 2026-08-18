import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Five11 from "../Five11";
import { five11Config } from "../config";

// Mock PanelComponent
vi.mock("@/components/PanelComponent", () => ({
  default: ({ children, name, onClose }: { children: React.ReactNode; name: string; onClose: () => void }) => (
    <div data-testid="panel-component">
      <h1>{name}</h1>
      <button onClick={onClose} aria-label="close">
        Close
      </button>
      {children}
    </div>
  ),
}));

// Mock Five11LayerToggler
vi.mock("../Five11LayerToggler", () => ({
  default: ({ layer, visible, onVisibilityChange }: { layer: { layerName: string; displayName: string }; visible: boolean; onVisibilityChange: (name: string, visible: boolean) => void }) => (
    <div data-testid={`layer-toggler-${layer.layerName}`}>
      <input type="checkbox" data-testid={`checkbox-${layer.layerName}`} checked={visible} onChange={() => onVisibilityChange(layer.layerName, !visible)} />
      <span>{layer.displayName}</span>
    </div>
  ),
}));

// Mock mapStore
const mockMap = {
  forEachFeatureAtPixel: vi.fn(),
  getView: () => ({
    calculateExtent: () => [0, 0, 100, 100],
  }),
  getSize: () => [800, 600],
  on: vi.fn(),
  un: vi.fn(),
};

vi.mock("@/stores/mapStore", () => ({
  useMapStore: Object.assign(
    vi.fn((selector?: (state: any) => any) => {
      const state = {
        map: mockMap,
        activeToolId: null,
        isToolActive: () => false,
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: vi.fn(() => ({
        map: mockMap,
        activeToolId: null,
        isToolActive: () => false,
      })),
      setState: vi.fn(),
      subscribe: vi.fn(),
    },
  ),
}));

// Mock interactionManagerStore
const mockRegisterHandler = vi.fn();
const mockUnregisterHandler = vi.fn();

vi.mock("@/stores/interactionManagerStore", () => ({
  useInteractionManagerStore: vi.fn(() => ({
    registerHandler: mockRegisterHandler,
    unregisterHandler: mockUnregisterHandler,
  })),
}));

// Mock LayerManager
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "mock-layer-id"),
    removeLayer: vi.fn(),
    setLayerVisibility: vi.fn(),
  },
}));

// Mock Five11CameraPopup, Five11WazePopupContent, Five11MtoPopupContent
vi.mock("../Five11CameraPopup", () => ({
  default: () => <div data-testid="camera-popup">Camera</div>,
}));
vi.mock("../Five11WazePopupContent", () => ({
  default: () => <div data-testid="waze-popup">Waze</div>,
}));
vi.mock("../Five11MtoPopupContent", () => ({
  default: () => <div data-testid="mto-popup">MTO</div>,
}));

describe("Five11", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the panel with default title", () => {
    render(<Five11 onClose={mockOnClose} />);
    expect(screen.getByText("511 Live Feeds")).toBeInTheDocument();
  });

  it("renders with custom name prop", () => {
    render(<Five11 onClose={mockOnClose} name="Custom 511" />);
    expect(screen.getByText("Custom 511")).toBeInTheDocument();
  });

  it("renders WAZE LIVE DATA section header", () => {
    render(<Five11 onClose={mockOnClose} />);
    expect(screen.getByText("WAZE LIVE DATA")).toBeInTheDocument();
  });

  it("renders MTO LIVE DATA section header", () => {
    render(<Five11 onClose={mockOnClose} />);
    expect(screen.getByText("MTO LIVE DATA")).toBeInTheDocument();
  });

  it("renders all Waze layer togglers", () => {
    render(<Five11 onClose={mockOnClose} />);
    for (const layer of five11Config.wazeToggleLayers) {
      expect(screen.getByTestId(`layer-toggler-${layer.layerName}`)).toBeInTheDocument();
    }
  });

  it("renders all MTO layer togglers", () => {
    render(<Five11 onClose={mockOnClose} />);
    for (const layer of five11Config.mtoToggleLayers) {
      expect(screen.getByTestId(`layer-toggler-${layer.layerName}`)).toBeInTheDocument();
    }
  });

  it("renders Waze attribution link", () => {
    render(<Five11 onClose={mockOnClose} />);
    const link = screen.getByText("Data Provided by Waze");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://www.waze.com/");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders MTO data attribution text", () => {
    render(<Five11 onClose={mockOnClose} />);
    expect(screen.getByText("Data from multiple agencies")).toBeInTheDocument();
  });

  it("shows Show All button when all layers start hidden", () => {
    render(<Five11 onClose={mockOnClose} />);
    // All layers start hidden per config
    const buttons = screen.getAllByText("Show All");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("toggles all Waze layers when Show All is clicked", () => {
    render(<Five11 onClose={mockOnClose} />);
    // Both sections initially show "Show All" since all layers start hidden
    const showAllButtons = screen.getAllByText("Show All");
    // Click the first Show All (Waze section)
    fireEvent.click(showAllButtons[0]);

    // After toggling all on, the Waze section should show "Hide All"
    expect(screen.getByText("Hide All")).toBeInTheDocument();
  });

  it("toggles all MTO layers when Show All is clicked", () => {
    render(<Five11 onClose={mockOnClose} />);
    const showAllButtons = screen.getAllByText("Show All");
    // Click the second Show All (MTO section)
    fireEvent.click(showAllButtons[1]);

    // After toggling all MTO on, there should be a "Hide All" in the MTO section
    expect(screen.getByText("Hide All")).toBeInTheDocument();
  });

  it("toggles individual Waze layer visibility", () => {
    render(<Five11 onClose={mockOnClose} />);
    const hiddenWazeLayer = five11Config.wazeToggleLayers.find((l) => !l.visible)!;
    const checkbox = screen.getByTestId(`checkbox-${hiddenWazeLayer.layerName}`);

    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("toggles individual MTO layer visibility", () => {
    render(<Five11 onClose={mockOnClose} />);
    const hiddenMtoLayer = five11Config.mtoToggleLayers.find((l) => !l.visible)!;
    const checkbox = screen.getByTestId(`checkbox-${hiddenMtoLayer.layerName}`);

    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("registers map click handler on mount", () => {
    render(<Five11 onClose={mockOnClose} />);
    expect(mockRegisterHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "511-identify",
        eventType: "singleclick",
        priority: 50,
      }),
    );
  });

  it("unregisters map click handler on unmount", () => {
    const { unmount } = render(<Five11 onClose={mockOnClose} />);
    unmount();
    expect(mockUnregisterHandler).toHaveBeenCalledWith("511-identify");
  });

  it("has a divider between Waze and MTO sections", () => {
    const { container } = render(<Five11 onClose={mockOnClose} />);
    const dividers = container.querySelectorAll(".divider");
    expect(dividers.length).toBeGreaterThanOrEqual(1);
  });

  describe("click handler", () => {
    it("registers handler with disable flag check", () => {
      render(<Five11 onClose={mockOnClose} />);

      const handlerConfig = mockRegisterHandler.mock.calls[0][0];
      expect(handlerConfig.conditions).toBeDefined();
      expect(handlerConfig.conditions.checkDisableFlags).toBeInstanceOf(Function);
    });

    it("disable flag check returns false when no flags are set", () => {
      render(<Five11 onClose={mockOnClose} />);

      const handlerConfig = mockRegisterHandler.mock.calls[0][0];
      const isDisabled = handlerConfig.conditions.checkDisableFlags();
      expect(isDisabled).toBe(false);
    });

    it("handler returns empty array when no 511 features found at pixel", async () => {
      mockMap.forEachFeatureAtPixel.mockImplementation(() => {
        // No features found — callback never called
      });

      render(<Five11 onClose={mockOnClose} />);

      const handlerConfig = mockRegisterHandler.mock.calls[0][0];
      const results = await handlerConfig.handler([0, 0], [100, 100]);
      expect(results).toEqual([]);
    });

    it("handler returns results for Waze features at pixel", async () => {
      const mockFeature = {
        getId: () => "waze-1",
        get: (key: string) => {
          if (key === "uuid") return "waze-uuid-1";
          return undefined;
        },
        getProperties: () => ({ type: "ACCIDENT", street: "Main St", uuid: "waze-uuid-1" }),
      };
      const mockLayer = {
        get: (key: string) => {
          if (key === "name") return "511-waze-accident";
          if (key === "tocDisplayName") return "Accidents";
          return undefined;
        },
        getVisible: () => true,
      };

      mockMap.forEachFeatureAtPixel.mockImplementation((pixel: any, callback: any, options: any) => {
        // Simulate the layer filter check
        if (options.layerFilter(mockLayer)) {
          callback(mockFeature, mockLayer);
        }
      });

      render(<Five11 onClose={mockOnClose} />);

      const handlerConfig = mockRegisterHandler.mock.calls[0][0];
      const results = await handlerConfig.handler([0, 0], [100, 100]);

      expect(results.length).toBe(1);
      expect(results[0].type).toBe("layer");
      expect(results[0].displayName).toBe("Accidents");
      expect(results[0].data.layerName).toBe("Accidents");
    });

    it("handler returns results for MTO features at pixel", async () => {
      const mockFeature = {
        getId: () => "mto-1",
        get: (key: string) => {
          if (key === "uuid") return undefined;
          if (key === "id") return "mto-event-1";
          return undefined;
        },
        getProperties: () => ({ EventType: "CONSTRUCTION", Description: "Road work" }),
      };
      const mockLayer = {
        get: (key: string) => {
          if (key === "name") return "511-mto-construction";
          if (key === "tocDisplayName") return "Construction";
          return undefined;
        },
        getVisible: () => true,
      };

      mockMap.forEachFeatureAtPixel.mockImplementation((pixel: any, callback: any, options: any) => {
        if (options.layerFilter(mockLayer)) {
          callback(mockFeature, mockLayer);
        }
      });

      render(<Five11 onClose={mockOnClose} />);

      const handlerConfig = mockRegisterHandler.mock.calls[0][0];
      const results = await handlerConfig.handler([0, 0], [100, 100]);

      expect(results.length).toBe(1);
      expect(results[0].displayName).toBe("Construction");
    });

    it("handler deduplicates features with same key", async () => {
      const mockFeature = {
        getId: () => "dup-1",
        get: (key: string) => {
          if (key === "uuid") return "same-uuid";
          return undefined;
        },
        getProperties: () => ({ type: "HAZARD" }),
      };
      const mockLayer = {
        get: (key: string) => {
          if (key === "name") return "511-waze-hazard";
          if (key === "tocDisplayName") return "Hazards";
          return undefined;
        },
        getVisible: () => true,
      };

      mockMap.forEachFeatureAtPixel.mockImplementation((pixel: any, callback: any, options: any) => {
        if (options.layerFilter(mockLayer)) {
          // Call callback twice with same feature — should be deduplicated
          callback(mockFeature, mockLayer);
          callback(mockFeature, mockLayer);
        }
      });

      render(<Five11 onClose={mockOnClose} />);

      const handlerConfig = mockRegisterHandler.mock.calls[0][0];
      const results = await handlerConfig.handler([0, 0], [100, 100]);

      expect(results.length).toBe(1);
    });

    it("layer filter only matches 511 layers", async () => {
      render(<Five11 onClose={mockOnClose} />);

      const handlerConfig = mockRegisterHandler.mock.calls[0][0];
      // Extract the layerFilter from forEachFeatureAtPixel options
      mockMap.forEachFeatureAtPixel.mockImplementation((pixel: any, callback: any, options: any) => {
        // Test the layer filter with a non-511 layer
        const nonFive11Layer = {
          get: (key: string) => (key === "name" ? "some-other-layer" : undefined),
          getVisible: () => true,
        };
        const five11Layer = {
          get: (key: string) => (key === "name" ? "511-waze-accident" : undefined),
          getVisible: () => true,
        };

        expect(options.layerFilter(nonFive11Layer)).toBe(false);
        expect(options.layerFilter(five11Layer)).toBe(true);
      });

      await handlerConfig.handler([0, 0], [100, 100]);
      expect(mockMap.forEachFeatureAtPixel).toHaveBeenCalled();
    });

    it("layer filter excludes hidden layers", async () => {
      render(<Five11 onClose={mockOnClose} />);

      const handlerConfig = mockRegisterHandler.mock.calls[0][0];

      mockMap.forEachFeatureAtPixel.mockImplementation((pixel: any, callback: any, options: any) => {
        const hiddenLayer = {
          get: (key: string) => (key === "name" ? "511-waze-hazard" : undefined),
          getVisible: () => false,
        };
        expect(options.layerFilter(hiddenLayer)).toBe(false);
      });

      await handlerConfig.handler([0, 0], [100, 100]);
    });
  });
});
