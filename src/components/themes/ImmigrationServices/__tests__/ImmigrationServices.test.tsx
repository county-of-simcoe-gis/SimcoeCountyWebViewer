import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ImmigrationServices from "../ImmigrationServices";

// Mock PanelComponent
vi.mock("@/components/PanelComponent", () => ({
  default: ({ children, name }: { children: React.ReactNode; name: string }) => (
    <div data-testid="panel-component">
      <h1>{name}</h1>
      {children}
    </div>
  ),
}));

// Mock mapStore
vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn((selector) => {
    const state = {
      map: {
        getView: () => ({
          calculateExtent: () => [0, 0, 100, 100],
        }),
        getSize: () => [800, 600],
        on: vi.fn(),
        un: vi.fn(),
      },
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock popupStore
vi.mock("@/stores/popupStore", () => ({
  usePopupStore: () => ({
    show: vi.fn(),
    hide: vi.fn(),
  }),
}));

// Mock LayerManager
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "mock-layer-id"),
    removeLayer: vi.fn(),
    setLayerVisibility: vi.fn(),
    setLayerOpacity: vi.fn(),
  },
}));

// Mock LayerHelpers
vi.mock("@/utils/openlayers", () => ({
  LayerHelpers: {
    getLayer: vi.fn((config, callback) => {
      callback({
        setProperties: vi.fn(),
        setOpacity: vi.fn(),
        setVisible: vi.fn(),
      });
    }),
  },
  OL_DATA_TYPES: {
    ImageWMS: "ImageWMS",
  },
}));

// Mock fetch for WFS calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve('<?xml version="1.0"?><wfs:FeatureCollection numberOfFeatures="5"/>'),
    json: () => Promise.resolve({ features: [] }),
  }),
) as unknown as typeof fetch;

describe("ImmigrationServices", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the panel with correct title", () => {
    render(<ImmigrationServices onClose={mockOnClose} />);

    expect(screen.getByText("Immigration Services")).toBeInTheDocument();
  });

  it("renders with custom name prop", () => {
    render(<ImmigrationServices onClose={mockOnClose} name="Custom Immigration" />);

    expect(screen.getByText("Custom Immigration")).toBeInTheDocument();
  });

  it("renders Services header", () => {
    render(<ImmigrationServices onClose={mockOnClose} />);

    expect(screen.getByText("Services")).toBeInTheDocument();
  });

  it("renders THEME DATA section", () => {
    render(<ImmigrationServices onClose={mockOnClose} />);

    expect(screen.getByText("THEME DATA")).toBeInTheDocument();
  });

  it("renders Show All and Hide All buttons", () => {
    render(<ImmigrationServices onClose={mockOnClose} />);

    expect(screen.getByText("Show All")).toBeInTheDocument();
    expect(screen.getByText("Hide All")).toBeInTheDocument();
  });

  it("renders layer checkboxes", () => {
    render(<ImmigrationServices onClose={mockOnClose} />);

    // ImmigrationServices has checkbox inputs for each layer
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("renders info alert with introduction", () => {
    render(<ImmigrationServices onClose={mockOnClose} />);

    // Check for the alert container
    const alert = document.querySelector(".alert-info");
    expect(alert).toBeInTheDocument();
  });

  it("has divider between sections", () => {
    render(<ImmigrationServices onClose={mockOnClose} />);

    const dividers = document.querySelectorAll(".divider");
    expect(dividers.length).toBeGreaterThan(0);
  });

  it("renders data filter checkbox", () => {
    render(<ImmigrationServices onClose={mockOnClose} />);

    expect(screen.getByText("Only show data visible in the map")).toBeInTheDocument();
  });
});
