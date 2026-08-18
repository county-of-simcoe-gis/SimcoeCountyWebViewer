import { describe, it, expect } from "vitest";
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_COLORS,
  getTypes,
  getBuildingSpaceFromItems,
  getBuildingSpaceToItems,
  getLandSizeFromItems,
  getLandSizeToItems,
  getPriceFromItems,
  getPriceToItems,
} from "../creObjects";

describe("creObjects", () => {
  describe("PROPERTY_TYPES", () => {
    it("contains all expected property types", () => {
      expect(PROPERTY_TYPES).toEqual(["Vacant Land", "Commercial", "Farm", "Industrial", "Institutional"]);
    });

    it("is a readonly tuple", () => {
      expect(PROPERTY_TYPES.length).toBe(5);
    });
  });

  describe("PROPERTY_TYPE_COLORS", () => {
    it("has a color for every property type", () => {
      PROPERTY_TYPES.forEach((pt) => {
        expect(PROPERTY_TYPE_COLORS[pt]).toBeDefined();
        expect(PROPERTY_TYPE_COLORS[pt]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe("getTypes", () => {
    it("returns sale type options", () => {
      const types = getTypes();
      expect(types.length).toBe(3);
      expect(types[0]).toEqual({ label: "For Sale or Lease", value: "For Sale or Lease" });
    });

    it("includes For Sale and For Lease options", () => {
      const types = getTypes();
      const values = types.map((t) => t.value);
      expect(values).toContain("For Sale");
      expect(values).toContain("For Lease");
    });
  });

  describe("getBuildingSpaceFromItems", () => {
    it("starts at 0", () => {
      const items = getBuildingSpaceFromItems();
      expect(items[0]).toEqual({ label: "0", value: 0 });
    });

    it("returns items in ascending order", () => {
      const items = getBuildingSpaceFromItems();
      for (let i = 1; i < items.length; i++) {
        expect(items[i].value).toBeGreaterThan(items[i - 1].value);
      }
    });
  });

  describe("getBuildingSpaceToItems", () => {
    it("starts with Any Size sentinel", () => {
      const items = getBuildingSpaceToItems();
      expect(items[0].label).toBe("Any Size");
      expect(items[0].value).toBe(99999999999);
    });
  });

  describe("getLandSizeFromItems", () => {
    it("starts at 0 acres", () => {
      const items = getLandSizeFromItems();
      expect(items[0]).toEqual({ label: "0.0 acres", value: 0 });
    });

    it("returns items in ascending order", () => {
      const items = getLandSizeFromItems();
      for (let i = 1; i < items.length; i++) {
        expect(items[i].value).toBeGreaterThan(items[i - 1].value);
      }
    });
  });

  describe("getLandSizeToItems", () => {
    it("starts with Any Size sentinel", () => {
      const items = getLandSizeToItems();
      expect(items[0].label).toBe("Any Size");
      expect(items[0].value).toBe(9999999999);
    });
  });

  describe("getPriceFromItems", () => {
    it("starts at $0.00", () => {
      const items = getPriceFromItems();
      expect(items[0]).toEqual({ label: "$0.00", value: 0 });
    });

    it("returns items in ascending order", () => {
      const items = getPriceFromItems();
      for (let i = 1; i < items.length; i++) {
        expect(items[i].value).toBeGreaterThan(items[i - 1].value);
      }
    });
  });

  describe("getPriceToItems", () => {
    it("starts with $Unlimited sentinel", () => {
      const items = getPriceToItems();
      expect(items[0].label).toBe("$Unlimited");
      expect(items[0].value).toBe(99999999999999);
    });
  });
});
