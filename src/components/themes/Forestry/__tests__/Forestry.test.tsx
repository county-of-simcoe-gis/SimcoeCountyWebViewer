import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Forestry from "../Forestry";

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

describe("Forestry", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the panel with correct title", () => {
    render(<Forestry onClose={mockOnClose} />);

    expect(screen.getByText("Forestry")).toBeInTheDocument();
  });

  it("renders with custom name prop", () => {
    render(<Forestry onClose={mockOnClose} name="County Forestry" />);

    expect(screen.getByText("County Forestry")).toBeInTheDocument();
  });

  it("renders Base Layers section header", () => {
    render(<Forestry onClose={mockOnClose} />);

    expect(screen.getByText("Base Layers")).toBeInTheDocument();
  });

  it("renders Toggle Layers section header", () => {
    render(<Forestry onClose={mockOnClose} />);

    expect(screen.getByText("Toggle Layers")).toBeInTheDocument();
  });

  it("renders THEME DATA section", () => {
    render(<Forestry onClose={mockOnClose} />);

    expect(screen.getByText("THEME DATA")).toBeInTheDocument();
  });

  it("renders Show All and Hide All buttons", () => {
    render(<Forestry onClose={mockOnClose} />);

    expect(screen.getByText("Show All")).toBeInTheDocument();
    expect(screen.getByText("Hide All")).toBeInTheDocument();
  });

  it("renders visibility checkbox for base layers", () => {
    render(<Forestry onClose={mockOnClose} />);

    expect(screen.getByText("Show Base Layers")).toBeInTheDocument();
  });

  it("renders opacity slider for base layers", () => {
    render(<Forestry onClose={mockOnClose} />);

    expect(screen.getByText("Transparency")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders Legend section", () => {
    render(<Forestry onClose={mockOnClose} />);

    expect(screen.getByText("Legend")).toBeInTheDocument();
  });

  it("has dividers between sections", () => {
    render(<Forestry onClose={mockOnClose} />);

    const dividers = document.querySelectorAll(".divider");
    expect(dividers.length).toBeGreaterThanOrEqual(2);
  });

  it("renders data filter checkbox", () => {
    render(<Forestry onClose={mockOnClose} />);

    expect(screen.getByText("Only show data visible in the map")).toBeInTheDocument();
  });
});
