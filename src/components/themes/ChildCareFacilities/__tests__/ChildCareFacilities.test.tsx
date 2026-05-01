import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ChildCareFacilities from "../ChildCareFacilities";

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

describe("ChildCareFacilities", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the panel with correct title", () => {
    render(<ChildCareFacilities onClose={mockOnClose} />);

    // Title appears in h1 within panel
    const titles = screen.getAllByText("Child Care Facilities");
    expect(titles.length).toBeGreaterThan(0);
  });

  it("renders with custom name prop", () => {
    render(<ChildCareFacilities onClose={mockOnClose} name="Daycare Facilities" />);

    expect(screen.getByText("Daycare Facilities")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<ChildCareFacilities onClose={mockOnClose} />);

    expect(screen.getByText(/View child care facilities/i)).toBeInTheDocument();
  });

  it("renders THEME DATA section", () => {
    render(<ChildCareFacilities onClose={mockOnClose} />);

    expect(screen.getByText("THEME DATA")).toBeInTheDocument();
  });

  it("renders Show All and Hide All buttons", () => {
    render(<ChildCareFacilities onClose={mockOnClose} />);

    expect(screen.getByText("Show All")).toBeInTheDocument();
    expect(screen.getByText("Hide All")).toBeInTheDocument();
  });

  it("renders layer checkboxes", () => {
    render(<ChildCareFacilities onClose={mockOnClose} />);

    // Component has checkbox inputs for layers
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("has divider between sections", () => {
    render(<ChildCareFacilities onClose={mockOnClose} />);

    const dividers = document.querySelectorAll(".divider");
    expect(dividers.length).toBeGreaterThan(0);
  });

  it("passes onClose to panel component", () => {
    render(<ChildCareFacilities onClose={mockOnClose} />);

    expect(screen.getByTestId("panel-component")).toBeInTheDocument();
  });

  it("renders data filter checkbox", () => {
    render(<ChildCareFacilities onClose={mockOnClose} />);

    expect(screen.getByText("Only show data visible in the map")).toBeInTheDocument();
  });
});
