import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import IdentifyLayer from "@/components/Identify/IdentifyLayer";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import type { IdentifyResult, IdentifyFeature } from "@/components/Identify/Identify";

// Mock dependencies
vi.mock("@/stores/appStore", () => ({
  useAppStore: Object.assign((selector: (s: Record<string, unknown>) => unknown) => selector({ config: { allowIdentifyExport: true } }), {
    getState: () => ({ config: { allowIdentifyExport: true } }),
  }),
}));

vi.mock("@/utils/helpersBrowser", () => ({
  downloadFile: vi.fn(),
}));

vi.mock("@/components/Identify/IdentifyFeatureItem", () => ({
  default: ({ featureItem }: { featureItem: IdentifyFeature }) => <div data-testid="feature-item">{featureItem.displayName}</div>,
}));

function createMockLayer(featureCount: number): IdentifyResult {
  const features: IdentifyFeature[] = Array.from({ length: featureCount }, (_, i) => {
    const feature = new Feature({
      geometry: new Point([0, 0]),
      Name: `Feature ${i}`,
      Address: `${i} Main St`,
    });
    return { feature, displayName: "Name" };
  });

  return {
    name: "TestLayer",
    displayName: "Test Layer",
    type: "Test Layer",
    features,
  };
}

describe("IdentifyLayer", () => {
  it("renders layer type and feature count", () => {
    const layer = createMockLayer(3);
    render(<IdentifyLayer layer={layer} expanded={false} />);
    expect(screen.getByText("Test Layer")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows features when expanded", () => {
    const layer = createMockLayer(2);
    render(<IdentifyLayer layer={layer} expanded={true} />);
    const featureItems = screen.getAllByTestId("feature-item");
    expect(featureItems).toHaveLength(2);
  });

  it("toggles visibility on header click", () => {
    const layer = createMockLayer(1);
    render(<IdentifyLayer layer={layer} expanded={false} />);
    // Initially collapsed — feature items are hidden
    const header = screen.getByText("Test Layer");
    fireEvent.click(header);
    // After click, should show
    expect(screen.getByTestId("feature-item")).toBeInTheDocument();
  });

  it("shows export link when allowExport is true and multiple features", () => {
    const layer = createMockLayer(3);
    render(<IdentifyLayer layer={layer} expanded={true} />);
    expect(screen.getByText("Export to csv")).toBeInTheDocument();
  });

  it("does not show export link for single feature", () => {
    const layer = createMockLayer(1);
    render(<IdentifyLayer layer={layer} expanded={true} />);
    expect(screen.queryByText("Export to csv")).not.toBeInTheDocument();
  });
});
