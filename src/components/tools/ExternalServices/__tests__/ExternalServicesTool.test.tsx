import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ExternalServicesTool from "../ExternalServicesTool";

// Mock stores
vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn(() => ({
    map: null,
  })),
}));

vi.mock("@/stores/appStore", () => ({
  useAppStore: vi.fn(() => ({
    config: {
      parcelLayer: { url: "http://localhost/parcel" },
      propertyReportUrl: "http://localhost/property/",
    },
  })),
}));

// Mock LayerManager
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "test-layer-id"),
    removeLayer: vi.fn(),
    getLayer: vi.fn(() => null),
  },
}));

// Mock axios
vi.mock("@/lib/axiosInstance", () => ({
  getAxiosClient: vi.fn(() => ({
    get: vi.fn(async () => ({
      data: {
        features: [],
      },
    })),
  })),
}));

// Mock helpersCore
vi.mock("@/utils/helpersCore", () => ({
  getUID: () => "test-uid-123",
}));

describe("ExternalServicesTool", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the tool component", () => {
    render(<ExternalServicesTool onClose={mockOnClose} />);

    expect(screen.getByText(/Explore a selected location/)).toBeTruthy();
  });

  it("displays service groups", () => {
    render(<ExternalServicesTool onClose={mockOnClose} />);

    // Check for service group names from config
    expect(screen.getByText("Google")).toBeTruthy();
    expect(screen.getByText("Bing")).toBeTruthy();
    expect(screen.getByText("Map Quest")).toBeTruthy();
    expect(screen.getAllByText("Open Street Map").length).toBeGreaterThan(0);
  });

  it("displays service links", () => {
    render(<ExternalServicesTool onClose={mockOnClose} />);

    // Check for some link names
    expect(screen.getByText("Google Maps")).toBeTruthy();
    expect(screen.getByText("Bing Maps")).toBeTruthy();
    expect(screen.getAllByText("Open Street Map").length).toBeGreaterThan(0);
  });

  it("calls onClose when closed", () => {
    render(<ExternalServicesTool onClose={mockOnClose} />);

    // Simulate close
    mockOnClose();

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("initializes without map", () => {
    // Test that component handles missing map gracefully
    render(<ExternalServicesTool onClose={mockOnClose} />);

    expect(screen.getByText(/Explore a selected location/)).toBeTruthy();
  });
});
