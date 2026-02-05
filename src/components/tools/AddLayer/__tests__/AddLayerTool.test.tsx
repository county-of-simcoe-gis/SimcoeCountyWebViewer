import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AddLayerTool from "../AddLayerTool";

// Mock stores
vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn(() => ({
    map: {
      getView: () => ({
        getProjection: () => ({
          getCode: () => "EPSG:3857",
        }),
      }),
    },
  })),
}));

vi.mock("@/stores/tocStore", () => ({
  useTOCStore: vi.fn(() => ({
    layerListGroups: [
      { value: "group1", label: "Group 1", layers: [] },
      { value: "group2", label: "Group 2", layers: [] },
    ],
    layerFolderGroups: [],
    tocType: "LIST",
    addCustomLayer: vi.fn(),
  })),
  TOCLayer: {},
}));

// Mock LayerHelpers
vi.mock("@/utils/openlayers", () => ({
  LayerHelpers: {
    getLayer: vi.fn((options, callback) => {
      const mockLayer = {
        setVisible: vi.fn(),
        setOpacity: vi.fn(),
        setProperties: vi.fn(),
      };
      callback(mockLayer);
    }),
  },
  OL_DATA_TYPES: {
    ImageWMS: "ImageWMS",
    XYZ: "XYZ",
    GeoJSON: "GeoJSON",
    KML: "KML",
    GPX: "GPX",
    GeoTIFF: "GeoTIFF",
  },
}));

// Mock tocHelpers
vi.mock("@/utils/tocHelpers", () => ({
  fetchWMSCapabilities: vi.fn(async () => ({
    Capability: {
      Layer: {
        Layer: [
          { Name: "layer1", Title: "Test Layer 1" },
          { Name: "layer2", Title: "Test Layer 2" },
        ],
      },
    },
  })),
}));

// Mock helpersCore
vi.mock("@/utils/helpersCore", () => ({
  getUID: () => `test-uid-${Math.random()}`,
}));

// Mock helpersUI
vi.mock("@/utils/helpersUI", () => ({
  showMessage: vi.fn(),
}));

describe("AddLayerTool", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the tool component", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    expect(screen.getByText("Table of Contents")).toBeTruthy();
    expect(screen.getByText("Source")).toBeTruthy();
  });

  it("displays all three tabs", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    expect(screen.getByText("Services")).toBeTruthy();
    expect(screen.getByText("URL")).toBeTruthy();
    expect(screen.getByText("File")).toBeTruthy();
  });

  it("shows group selection dropdown", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    expect(screen.getByText("Add to Group:")).toBeTruthy();
  });

  it("shows layer name input", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    expect(screen.getByText("Layer Name:")).toBeTruthy();
    const input = screen.getByDisplayValue("New Layer");
    expect(input).toBeTruthy();
  });

  it("allows changing layer name", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    const input = screen.getByDisplayValue("New Layer") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "My Custom Layer" } });

    expect(input.value).toBe("My Custom Layer");
  });

  it("shows cancel and add layer buttons", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.getByText("Add Layer")).toBeTruthy();
  });

  it("calls onClose when cancel is clicked", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows supported file types in file tab", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    // Click on File tab
    const fileTab = screen.getByText("File");
    fireEvent.click(fileTab);

    // Check for supported extensions
    expect(screen.getByText(/Supported:/)).toBeTruthy();
  });

  it("shows URL type dropdown in URL tab", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    // Click on URL tab
    const urlTab = screen.getByText("URL");
    fireEvent.click(urlTab);

    expect(screen.getByText("URL Type:")).toBeTruthy();
  });

  it("shows service dropdown in services tab", () => {
    render(<AddLayerTool onClose={mockOnClose} />);

    // Services is the default tab
    expect(screen.getByText("Service:")).toBeTruthy();
  });
});
