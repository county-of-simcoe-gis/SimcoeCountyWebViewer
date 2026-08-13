import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCqlFilterForType, numberWithCommas, fetchAllResults } from "../creHelpers";
import { useCREStore } from "../stores/creStore";
import * as helpersUI from "@/utils/helpersUI";
import { getAxiosClient } from "@/lib/axiosInstance";

// Mock showMessage to avoid UI side effects
vi.mock("@/utils/helpersUI", () => ({
  showMessage: vi.fn(),
  showURLWindow: vi.fn(),
}));

// Mock axios
vi.mock("@/lib/axiosInstance", () => ({
  getAxiosClient: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({ data: { type: "FeatureCollection", features: [] } }),
  })),
}));

describe("creHelpers", () => {
  beforeEach(() => {
    useCREStore.getState().reset();
  });

  describe("numberWithCommas", () => {
    it("formats integers with commas", () => {
      expect(numberWithCommas(1000)).toBe("1,000");
      expect(numberWithCommas(1000000)).toBe("1,000,000");
      expect(numberWithCommas(999)).toBe("999");
    });

    it("handles string input", () => {
      expect(numberWithCommas("25000")).toBe("25,000");
    });

    it("returns '0' for null/undefined", () => {
      expect(numberWithCommas(null)).toBe("0");
      expect(numberWithCommas(undefined)).toBe("0");
    });

    it("handles zero", () => {
      expect(numberWithCommas(0)).toBe("0");
    });
  });

  describe("buildCqlFilterForType", () => {
    it("builds a basic filter for a property type", () => {
      const cql = buildCqlFilterForType("Commercial");
      expect(cql).toBe("_proptype = 'Commercial'");
    });

    it("adds sale type filter when not default", () => {
      useCREStore.getState().setSelectedType({ label: "For Sale", value: "For Sale" });
      const cql = buildCqlFilterForType("Commercial");
      expect(cql).toContain("_proptype = 'Commercial'");
      expect(cql).toContain("_saletype = 'For Sale'");
    });

    it("does not add sale type filter for default value", () => {
      // Default is "For Sale or Lease"
      const cql = buildCqlFilterForType("Farm");
      expect(cql).not.toContain("_saletype");
    });

    it("adds incentive filter when checked", () => {
      useCREStore.getState().setIncentiveChecked(true);
      const cql = buildCqlFilterForType("Industrial");
      expect(cql).toContain("Incentive = 'Yes'");
    });

    it("does not add incentive filter when unchecked", () => {
      useCREStore.getState().setIncentiveChecked(false);
      const cql = buildCqlFilterForType("Industrial");
      expect(cql).not.toContain("Incentive");
    });

    it("adds building space filter in BuildingSize mode with non-default values", () => {
      useCREStore.getState().setSearchMode("BuildingSize");
      useCREStore.getState().setBuildingSpaceFrom({ label: "1,000 sq ft", value: 1000 });
      useCREStore.getState().setBuildingSpaceTo({ label: "5,000 sq ft", value: 5000 });
      const cql = buildCqlFilterForType("Commercial");
      expect(cql).toContain("_squarefeet >= 1000");
      expect(cql).toContain("_squarefeet <= 5000");
    });

    it("does not add building space filter in LandSize mode", () => {
      useCREStore.getState().setSearchMode("LandSize");
      useCREStore.getState().setBuildingSpaceFrom({ label: "1,000 sq ft", value: 1000 });
      const cql = buildCqlFilterForType("Commercial");
      expect(cql).not.toContain("_squarefeet");
    });

    it("adds land size filter in LandSize mode with non-default values", () => {
      useCREStore.getState().setSearchMode("LandSize");
      useCREStore.getState().setLandSizeFrom({ label: "5 acres", value: 5 });
      useCREStore.getState().setLandSizeTo({ label: "50 acres", value: 50 });
      const cql = buildCqlFilterForType("Vacant Land");
      expect(cql).toContain("Acres >= 5");
      expect(cql).toContain("Acres <= 50");
    });

    it("does not add land size filter in BuildingSize mode", () => {
      useCREStore.getState().setSearchMode("BuildingSize");
      useCREStore.getState().setLandSizeFrom({ label: "5 acres", value: 5 });
      const cql = buildCqlFilterForType("Vacant Land");
      expect(cql).not.toContain("Acres");
    });

    it("adds price filter with non-default values", () => {
      useCREStore.getState().setPriceFrom({ label: "$100,000", value: 100000 });
      useCREStore.getState().setPriceTo({ label: "$500,000", value: 500000 });
      const cql = buildCqlFilterForType("Commercial");
      expect(cql).toContain("_listprice >= 100000");
      expect(cql).toContain("_listprice <= 500000");
    });

    it("does not add price filter when using defaults", () => {
      // Default from=0, to=99999999999999
      const cql = buildCqlFilterForType("Commercial");
      expect(cql).not.toContain("_listprice");
    });

    it("shows warning for invalid building space range", () => {
      useCREStore.getState().setSearchMode("BuildingSize");
      useCREStore.getState().setBuildingSpaceFrom({ label: "5,000 sq ft", value: 5000 });
      useCREStore.getState().setBuildingSpaceTo({ label: "1,000 sq ft", value: 1000 });
      buildCqlFilterForType("Commercial");
      expect(helpersUI.showMessage).toHaveBeenCalledWith("Building Space", expect.any(String), "warning");
    });

    it("shows warning for invalid price range", () => {
      useCREStore.getState().setPriceFrom({ label: "$500,000", value: 500000 });
      useCREStore.getState().setPriceTo({ label: "$100,000", value: 100000 });
      buildCqlFilterForType("Commercial");
      expect(helpersUI.showMessage).toHaveBeenCalledWith("Price", expect.any(String), "warning");
    });

    it("combines multiple filters correctly", () => {
      useCREStore.getState().setSelectedType({ label: "For Lease", value: "For Lease" });
      useCREStore.getState().setIncentiveChecked(true);
      useCREStore.getState().setPriceFrom({ label: "$50,000", value: 50000 });
      useCREStore.getState().setPriceTo({ label: "$200,000", value: 200000 });

      const cql = buildCqlFilterForType("Commercial");
      expect(cql).toContain("_proptype = 'Commercial'");
      expect(cql).toContain("_saletype = 'For Lease'");
      expect(cql).toContain("Incentive = 'Yes'");
      expect(cql).toContain("_listprice >= 50000");
      expect(cql).toContain("_listprice <= 200000");
    });
  });

  describe("fetchAllResults", () => {
    it("skips invisible property types when fetching results", async () => {
      // Hide "Farm" and "Industrial"
      useCREStore.getState().setPropertyLayerVisible("Farm", false);
      useCREStore.getState().setPropertyLayerVisible("Industrial", false);

      const mockGet = vi.fn().mockResolvedValue({ data: { type: "FeatureCollection", features: [] } });
      vi.mocked(getAxiosClient).mockReturnValue({ get: mockGet } as ReturnType<typeof getAxiosClient>);

      await fetchAllResults(null);

      // Should have been called 3 times (Vacant Land, Commercial, Institutional) — not 5
      expect(mockGet).toHaveBeenCalledTimes(3);

      // Verify none of the calls were for Farm or Industrial
      const urls = mockGet.mock.calls.map((call: [string]) => call[0]);
      urls.forEach((url: string) => {
        expect(url).not.toContain("Farm");
        expect(url).not.toContain("Industrial");
      });
    });

    it("fetches all property types when all are visible", async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { type: "FeatureCollection", features: [] } });
      vi.mocked(getAxiosClient).mockReturnValue({ get: mockGet } as ReturnType<typeof getAxiosClient>);

      await fetchAllResults(null);

      // All 5 property types should be fetched
      expect(mockGet).toHaveBeenCalledTimes(5);
    });
  });
});
