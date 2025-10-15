import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttributionControl from "@/components/map/controls/AttributionControl";
import type Map from "ol/Map";

// Mock OpenLayers
const mockMap = {
  getLayers: vi.fn(),
  on: vi.fn(),
  un: vi.fn(),
} as unknown as Map;

const mockLayer = {
  getVisible: vi.fn(),
  getSource: vi.fn(),
};

const mockSource = {
  getAttributions: vi.fn(),
};

const mockLayerCollection = {
  on: vi.fn(),
  un: vi.fn(),
  forEach: vi.fn(),
};

describe("AttributionControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getLayers = vi.fn().mockReturnValue(mockLayerCollection);
  });

  it("renders nothing when no attributions are available", () => {
    mockLayerCollection.forEach.mockImplementation(() => {
      // No layers to iterate over
    });

    const { container } = render(<AttributionControl map={mockMap} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when map is not provided", () => {
    const { container } = render(<AttributionControl />);
    expect(container.firstChild).toBeNull();
  });

  it("displays attributions from visible layers", () => {
    const testAttributions = ["© Test Attribution 1", "© Test Attribution 2"];

    mockLayerCollection.forEach.mockImplementation((callback) => {
      callback(mockLayer);
    });

    mockLayer.getVisible.mockReturnValue(true);
    mockLayer.getSource.mockReturnValue(mockSource);
    mockSource.getAttributions.mockReturnValue(testAttributions);

    render(<AttributionControl map={mockMap} />);

    expect(screen.getByText("© Test Attribution 1")).toBeInTheDocument();
    expect(screen.getByText("© Test Attribution 2")).toBeInTheDocument();
  });

  it("filters out empty attributions", () => {
    const testAttributions = ["© Valid Attribution", "", null, undefined];

    mockLayerCollection.forEach.mockImplementation((callback) => {
      callback(mockLayer);
    });

    mockLayer.getVisible.mockReturnValue(true);
    mockLayer.getSource.mockReturnValue(mockSource);
    mockSource.getAttributions.mockReturnValue(testAttributions);

    const { container } = render(<AttributionControl map={mockMap} />);

    expect(screen.getByText("© Valid Attribution")).toBeInTheDocument();
    // Should only render one div for the valid attribution
    const attributionDivs = container.querySelectorAll(".leading-tight");
    expect(attributionDivs).toHaveLength(1);
  });

  it("removes HTML tags from attributions", () => {
    const testAttributions = ['<a href="#">© Attribution with HTML</a>'];

    mockLayerCollection.forEach.mockImplementation((callback) => {
      callback(mockLayer);
    });

    mockLayer.getVisible.mockReturnValue(true);
    mockLayer.getSource.mockReturnValue(mockSource);
    mockSource.getAttributions.mockReturnValue(testAttributions);

    render(<AttributionControl map={mockMap} />);

    expect(screen.getByText("© Attribution with HTML")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("ignores invisible layers", () => {
    const testAttributions = ["© Hidden Attribution"];

    mockLayerCollection.forEach.mockImplementation((callback) => {
      callback(mockLayer);
    });

    mockLayer.getVisible.mockReturnValue(false);
    mockLayer.getSource.mockReturnValue(mockSource);
    mockSource.getAttributions.mockReturnValue(testAttributions);

    const { container } = render(<AttributionControl map={mockMap} />);

    expect(container.firstChild).toBeNull();
  });

  it("sets up and cleans up event listeners", () => {
    render(<AttributionControl map={mockMap} />);

    expect(mockLayerCollection.on).toHaveBeenCalledWith("add", expect.any(Function));
    expect(mockLayerCollection.on).toHaveBeenCalledWith("remove", expect.any(Function));
    expect(mockMap.on).toHaveBeenCalledWith("moveend", expect.any(Function));
  });
});
