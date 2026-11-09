import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQueryByAttribute = vi.fn();
vi.mock("@/utils/geoServerClient", () => ({
  queryFeaturesByAttribute: (...args: unknown[]) => mockQueryByAttribute(...args),
}));

let mockComponentConfig: Record<string, unknown> | undefined;
vi.mock("@/utils/config", () => ({
  getComponentConfig: vi.fn(() => mockComponentConfig),
}));

import { isPrecinct, getZoningLabels, fetchZoneTypeByArn, PRECINCT_LABELS, ZONING_LABELS } from "../zoningType";

describe("zoningType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComponentConfig = undefined;
  });

  it("detects PRECINCT case-insensitively", () => {
    expect(isPrecinct("PRECINCT")).toBe(true);
    expect(isPrecinct(" precinct ")).toBe(true);
    expect(isPrecinct("ZONING")).toBe(false);
    expect(isPrecinct(undefined)).toBe(false);
  });

  it("returns labels by zone type", () => {
    expect(getZoningLabels("PRECINCT")).toBe(PRECINCT_LABELS);
    expect(getZoningLabels("ZONING")).toBe(ZONING_LABELS);
    expect(getZoningLabels(undefined)).toBe(ZONING_LABELS);
  });

  it("fetches zone_type by ARN", async () => {
    mockQueryByAttribute.mockResolvedValue({ features: [{ properties: { zone_type: "PRECINCT" } }] });
    await expect(fetchZoneTypeByArn("123")).resolves.toBe("PRECINCT");
    expect(mockQueryByAttribute).toHaveBeenCalledWith(expect.objectContaining({ attributeName: "arn", attributeValue: "123", maxFeatures: 1 }));
  });

  it("uses the map-level layer override", async () => {
    mockComponentConfig = { config: JSON.stringify({ queryLayers: [{ layerName: "simcoe:zoning_prod" }] }) };
    mockQueryByAttribute.mockResolvedValue({ features: [] });
    await fetchZoneTypeByArn("123");
    expect(mockQueryByAttribute).toHaveBeenCalledWith(expect.objectContaining({ layerName: "simcoe:zoning_prod" }));
  });

  it("returns undefined on error", async () => {
    mockQueryByAttribute.mockRejectedValue(new Error("boom"));
    await expect(fetchZoneTypeByArn("123")).resolves.toBeUndefined();
  });
});
