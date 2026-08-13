import { describe, it, expect, beforeEach } from "vitest";
import { useCREStore } from "../stores/creStore";

describe("creStore", () => {
  beforeEach(() => {
    useCREStore.getState().reset();
  });

  describe("initial state", () => {
    it("has default selectedType as 'For Sale or Lease'", () => {
      expect(useCREStore.getState().selectedType.value).toBe("For Sale or Lease");
    });

    it("has incentiveChecked as false", () => {
      expect(useCREStore.getState().incentiveChecked).toBe(false);
    });

    it("has onlyInMapChecked as false", () => {
      expect(useCREStore.getState().onlyInMapChecked).toBe(false);
    });

    it("has searchMode as BuildingSize", () => {
      expect(useCREStore.getState().searchMode).toBe("BuildingSize");
    });

    it("has empty results", () => {
      expect(useCREStore.getState().allResults).toEqual([]);
      expect(useCREStore.getState().numRecords).toBe(0);
    });

    it("has isLoading as false", () => {
      expect(useCREStore.getState().isLoading).toBe(false);
    });

    it("has activeTab as 0", () => {
      expect(useCREStore.getState().activeTab).toBe(0);
    });

    it("has property layers for all types", () => {
      const layers = useCREStore.getState().propertyLayers;
      expect(layers["Vacant Land"]).toBeDefined();
      expect(layers["Commercial"]).toBeDefined();
      expect(layers["Farm"]).toBeDefined();
      expect(layers["Industrial"]).toBeDefined();
      expect(layers["Institutional"]).toBeDefined();
    });

    it("has all property layers visible by default", () => {
      const layers = useCREStore.getState().propertyLayers;
      Object.values(layers).forEach((layer) => {
        expect(layer.visible).toBe(true);
      });
    });
  });

  describe("actions", () => {
    it("setSelectedType updates selected type", () => {
      useCREStore.getState().setSelectedType({ label: "For Sale", value: "For Sale" });
      expect(useCREStore.getState().selectedType.value).toBe("For Sale");
    });

    it("setIncentiveChecked toggles incentive", () => {
      useCREStore.getState().setIncentiveChecked(true);
      expect(useCREStore.getState().incentiveChecked).toBe(true);
      useCREStore.getState().setIncentiveChecked(false);
      expect(useCREStore.getState().incentiveChecked).toBe(false);
    });

    it("setOnlyInMapChecked toggles map filter", () => {
      useCREStore.getState().setOnlyInMapChecked(true);
      expect(useCREStore.getState().onlyInMapChecked).toBe(true);
    });

    it("setSearchMode switches search mode", () => {
      useCREStore.getState().setSearchMode("LandSize");
      expect(useCREStore.getState().searchMode).toBe("LandSize");
      useCREStore.getState().setSearchMode("BuildingSize");
      expect(useCREStore.getState().searchMode).toBe("BuildingSize");
    });

    it("setBuildingSpaceFrom updates building space from", () => {
      useCREStore.getState().setBuildingSpaceFrom({ label: "5,000 sq ft", value: 5000 });
      expect(useCREStore.getState().selectedBuildingSpaceFrom.value).toBe(5000);
    });

    it("setBuildingSpaceTo updates building space to", () => {
      useCREStore.getState().setBuildingSpaceTo({ label: "10,000 sq ft", value: 10000 });
      expect(useCREStore.getState().selectedBuildingSpaceTo.value).toBe(10000);
    });

    it("setLandSizeFrom updates land size from", () => {
      useCREStore.getState().setLandSizeFrom({ label: "10 acres", value: 10 });
      expect(useCREStore.getState().selectedLandSizeFrom.value).toBe(10);
    });

    it("setLandSizeTo updates land size to", () => {
      useCREStore.getState().setLandSizeTo({ label: "50 acres", value: 50 });
      expect(useCREStore.getState().selectedLandSizeTo.value).toBe(50);
    });

    it("setPriceFrom updates price from", () => {
      useCREStore.getState().setPriceFrom({ label: "$100,000", value: 100000 });
      expect(useCREStore.getState().selectedPriceFrom.value).toBe(100000);
    });

    it("setPriceTo updates price to", () => {
      useCREStore.getState().setPriceTo({ label: "$500,000", value: 500000 });
      expect(useCREStore.getState().selectedPriceTo.value).toBe(500000);
    });

    it("setPropertyLayerVisible toggles layer visibility", () => {
      useCREStore.getState().setPropertyLayerVisible("Commercial", false);
      expect(useCREStore.getState().propertyLayers["Commercial"].visible).toBe(false);
      useCREStore.getState().setPropertyLayerVisible("Commercial", true);
      expect(useCREStore.getState().propertyLayers["Commercial"].visible).toBe(true);
    });

    it("setIsLoading updates loading state", () => {
      useCREStore.getState().setIsLoading(true);
      expect(useCREStore.getState().isLoading).toBe(true);
      useCREStore.getState().setIsLoading(false);
      expect(useCREStore.getState().isLoading).toBe(false);
    });

    it("setActiveTab updates active tab", () => {
      useCREStore.getState().setActiveTab(1);
      expect(useCREStore.getState().activeTab).toBe(1);
      useCREStore.getState().setActiveTab(0);
      expect(useCREStore.getState().activeTab).toBe(0);
    });

    it("clearResults empties results and resets count", () => {
      useCREStore.getState().setResults([] as any, 5);
      expect(useCREStore.getState().numRecords).toBe(5);
      useCREStore.getState().clearResults();
      expect(useCREStore.getState().allResults).toEqual([]);
      expect(useCREStore.getState().numRecords).toBe(0);
    });

    it("appendResults adds features and updates count", () => {
      const mockFeature1 = { id: 1 } as any;
      const mockFeature2 = { id: 2 } as any;

      useCREStore.getState().appendResults([mockFeature1]);
      expect(useCREStore.getState().allResults).toHaveLength(1);
      expect(useCREStore.getState().numRecords).toBe(1);

      useCREStore.getState().appendResults([mockFeature2]);
      expect(useCREStore.getState().allResults).toHaveLength(2);
      expect(useCREStore.getState().numRecords).toBe(2);
    });

    it("reset restores all state to defaults", () => {
      // Modify multiple pieces of state
      useCREStore.getState().setSelectedType({ label: "For Lease", value: "For Lease" });
      useCREStore.getState().setIncentiveChecked(true);
      useCREStore.getState().setSearchMode("LandSize");
      useCREStore.getState().setActiveTab(1);
      useCREStore.getState().setIsLoading(true);

      // Reset
      useCREStore.getState().reset();

      // Verify defaults
      expect(useCREStore.getState().selectedType.value).toBe("For Sale or Lease");
      expect(useCREStore.getState().incentiveChecked).toBe(false);
      expect(useCREStore.getState().searchMode).toBe("BuildingSize");
      expect(useCREStore.getState().activeTab).toBe(0);
      expect(useCREStore.getState().isLoading).toBe(false);
      expect(useCREStore.getState().allResults).toEqual([]);
      expect(useCREStore.getState().numRecords).toBe(0);
    });
  });
});
