import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import IdentifyFeatureItem from "@/components/Identify/IdentifyFeatureItem";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import type { IdentifyFeature } from "@/components/Identify/Identify";

// Mock the mapStore
vi.mock("@/stores/mapStore", () => ({
  useMapStore: Object.assign((selector: (s: Record<string, unknown>) => unknown) => selector({ map: null }), {
    getState: () => ({ map: null }),
  }),
}));

// Mock Attachments
vi.mock("@/components/common/Attachments", () => ({
  default: () => <div data-testid="attachments" />,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} alt={(props.alt as string) ?? ""} />,
}));

function createFeatureItem(props: Record<string, unknown> = {}, displayName = "Name"): IdentifyFeature {
  const feature = new Feature({
    geometry: new Point([0, 0]),
    Name: "Test Feature",
    Address: "123 Main St",
    ...props,
  });
  return { feature, displayName };
}

describe("IdentifyFeatureItem", () => {
  it("renders the display name and value in header", () => {
    const item = createFeatureItem();
    render(<IdentifyFeatureItem featureItem={item} layerName="TestLayer" />);
    // "Name: Test Feature" appears in collapsed header
    expect(screen.getAllByText(/Test Feature/).length).toBeGreaterThanOrEqual(1);
  });

  it("expands on click to show attributes", () => {
    const item = createFeatureItem();
    render(<IdentifyFeatureItem featureItem={item} layerName="TestLayer" />);
    // Click the header area to expand
    const header = screen.getAllByText(/Test Feature/)[0];
    fireEvent.click(header);
    // Should now show attribute values
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("formats field names to title case with spaces", () => {
    const item = createFeatureItem({ zip_code: "L3V 1A1" });
    render(<IdentifyFeatureItem featureItem={item} layerName="TestLayer" />);
    fireEvent.click(screen.getAllByText(/Test Feature/)[0]);
    expect(screen.getByText("Zip Code:")).toBeInTheDocument();
  });

  it("filters out system keys from display", () => {
    const item = createFeatureItem({ objectid: 1, _internal: "hidden" });
    render(<IdentifyFeatureItem featureItem={item} layerName="TestLayer" />);
    fireEvent.click(screen.getAllByText(/Test Feature/)[0]);
    // objectid and _internal should be filtered by identifyHelpers
    expect(screen.queryByText("objectid")).not.toBeInTheDocument();
  });

  it("shows N/A for null/undefined values", () => {
    const item = createFeatureItem({ empty_field: null });
    render(<IdentifyFeatureItem featureItem={item} layerName="TestLayer" />);
    fireEvent.click(screen.getAllByText(/Test Feature/)[0]);
    // null values should show "N/A"
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  describe("geometry-only features (attribute-less WMS GetFeatureInfo)", () => {
    it("renders 'N/A' header without crashing when displayName resolves to geometry", () => {
      // Mirrors GeoServer WMS responses with "properties": {} — the OL Feature's
      // only property is its geometry. displayName may be "geometry" (old bug) or "".
      const feature = new Feature(new Point([0, 0]));
      render(<IdentifyFeatureItem featureItem={{ feature, displayName: "geometry" }} layerName="Crown Land" />);
      expect(screen.getByText(/N\/A/)).toBeInTheDocument();
    });

    it("falls back to the layer name label when displayName is empty", () => {
      const feature = new Feature(new Point([0, 0]));
      render(<IdentifyFeatureItem featureItem={{ feature, displayName: "" }} layerName="Crown Land" />);
      expect(screen.getByText(/Crown Land: N\/A/)).toBeInTheDocument();
    });

    it("shows 'No attributes found' body for geometry-only features", () => {
      const feature = new Feature(new Point([0, 0]));
      render(<IdentifyFeatureItem featureItem={{ feature, displayName: "" }} layerName="Crown Land" />);
      fireEvent.click(screen.getByText(/Crown Land: N\/A/));
      expect(screen.getByText("No attributes found")).toBeInTheDocument();
    });
  });

  describe("ArcGIS field metadata (aliases + domains)", () => {
    const fieldMetadata = {
      aliases: {
        "dbo.testwidget.facilityid": "Asset ID",
        facilityid: "Asset ID",
        material: "Material",
      },
      domains: {
        material: [
          { code: "AAA", name: "Alpha Material" },
          { code: "BBB", name: "Beta Material" },
        ],
      },
    };

    it("renders field aliases and domain display names", () => {
      const item = createFeatureItem({ FACILITYID: "WID-123", MATERIAL: "AAA" });
      render(<IdentifyFeatureItem featureItem={item} layerName="TestLayer" fieldMetadata={fieldMetadata} />);
      fireEvent.click(screen.getAllByText(/Test Feature/)[0]);

      expect(screen.getByText("Asset ID:")).toBeInTheDocument();
      expect(screen.getByText("Material:")).toBeInTheDocument();
      expect(screen.getByText("Alpha Material")).toBeInTheDocument();
      // Raw code should not be displayed when a domain name resolves
      expect(screen.queryByText("AAA")).not.toBeInTheDocument();
    });

    it("falls back to raw values when a value has no matching domain code", () => {
      const item = createFeatureItem({ MATERIAL: "UNOBTAINIUM" });
      render(<IdentifyFeatureItem featureItem={item} layerName="TestLayer" fieldMetadata={fieldMetadata} />);
      fireEvent.click(screen.getAllByText(/Test Feature/)[0]);

      expect(screen.getByText("Material:")).toBeInTheDocument();
      expect(screen.getByText("UNOBTAINIUM")).toBeInTheDocument();
    });

    it("falls back to raw names/values when no metadata is provided", () => {
      const item = createFeatureItem({ MATERIAL: "AAA" });
      render(<IdentifyFeatureItem featureItem={item} layerName="TestLayer" />);
      fireEvent.click(screen.getAllByText(/Test Feature/)[0]);

      expect(screen.getByText("MATERIAL:")).toBeInTheDocument();
      expect(screen.getByText("AAA")).toBeInTheDocument();
    });
  });
});
