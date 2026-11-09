import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFeatureReportFilter, fetchFeatureReport, isFeatureReportType } from "@/utils/featureReports";
import { queryFeature } from "@/utils/geoServerClient";

vi.mock("@/utils/geoServerClient", () => ({ queryFeature: vi.fn() }));

describe("isFeatureReportType", () => {
  it("accepts only the known types", () => {
    expect(isFeatureReportType("REALESTATE")).toBe(true);
    expect(isFeatureReportType("FORESTRY")).toBe(true);
    expect(isFeatureReportType("CHILDCARE")).toBe(true);
    expect(isFeatureReportType("realestate")).toBe(false);
    expect(isFeatureReportType("toString")).toBe(false);
    expect(isFeatureReportType(null)).toBe(false);
  });
});

describe("buildFeatureReportFilter", () => {
  it("uses an unquoted numeric filter for real estate", () => {
    expect(buildFeatureReportFilter("REALESTATE", "30739961")).toBe("mlsno=30739961");
  });

  it("rejects non-numeric real estate IDs", () => {
    expect(buildFeatureReportFilter("REALESTATE", "1 OR 1=1")).toBeNull();
  });

  it("quotes and escapes text IDs", () => {
    expect(buildFeatureReportFilter("FORESTRY", "COPELAND")).toBe("Tract='COPELAND'");
    expect(buildFeatureReportFilter("CHILDCARE", "O'Brien's Daycare")).toBe("name='O''Brien''s Daycare'");
  });
});

describe("fetchFeatureReport", () => {
  beforeEach(() => vi.mocked(queryFeature).mockReset());

  it("queries the layer for the type and returns the feature properties", async () => {
    vi.mocked(queryFeature).mockResolvedValue({ success: true, count: 1, feature: { type: "Feature", geometry: { type: "Point" }, properties: { Tract: "COPELAND" } } });

    await expect(fetchFeatureReport("FORESTRY", "COPELAND")).resolves.toEqual({ Tract: "COPELAND" });
    expect(queryFeature).toHaveBeenCalledWith(expect.objectContaining({ layerName: "simcoe:Forest_Tracts_Feature_Reports", cqlFilter: "Tract='COPELAND'" }));
  });

  it("returns null without querying when the ID is invalid", async () => {
    await expect(fetchFeatureReport("REALESTATE", "abc")).resolves.toBeNull();
    expect(queryFeature).not.toHaveBeenCalled();
  });

  it("returns null when no feature matches", async () => {
    vi.mocked(queryFeature).mockResolvedValue({ success: false, count: 0, error: "No features found" });
    await expect(fetchFeatureReport("CHILDCARE", "Nope")).resolves.toBeNull();
  });
});
