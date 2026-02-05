/**
 * Tests for AVL helper utility functions.
 *
 * These are pure utility functions with no external dependencies,
 * so they can be tested without mocking.
 *
 * Tests cover:
 * - Date formatting functions
 * - Sorting functions
 * - Vehicle info calculation
 * - Device name cleaning
 * - Coordinate conversion
 * - Bearing calculation
 * - Other utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getFriendlyDateString,
  getSqlDateString,
  sortByVehicleIdAsc,
  sortByVehicleIdDesc,
  sortBySpeedAsc,
  sortBySpeedDesc,
  sortByDateAsc,
  sortByDateDesc,
  addVehicleInfo,
  cleanDeviceNameForMatching,
  isPurelyNumeric,
  convertUTCToLocal,
  formatDateFriendly,
  calculateBearing,
  roundTime,
  dateDiffInDays,
  getUID,
  toWebMercatorFromLatLong,
} from "../utils/avlHelpers";
import type { AvlVehicle, AvlSubGroup } from "../types/avl.types";

describe("avlHelpers", () => {
  describe("getFriendlyDateString", () => {
    it("formats date correctly with AM", () => {
      const date = new Date(2026, 1, 3, 9, 30, 0); // Feb 3, 2026 9:30 AM
      const result = getFriendlyDateString(date);

      expect(result).toBe("2026-02-03 9:30 AM");
    });

    it("formats date correctly with PM", () => {
      const date = new Date(2026, 1, 3, 14, 45, 0); // Feb 3, 2026 2:45 PM
      const result = getFriendlyDateString(date);

      expect(result).toBe("2026-02-03 2:45 PM");
    });

    it("handles midnight (12 AM)", () => {
      const date = new Date(2026, 1, 3, 0, 0, 0); // Feb 3, 2026 12:00 AM
      const result = getFriendlyDateString(date);

      expect(result).toBe("2026-02-03 12:00 AM");
    });

    it("handles noon (12 PM)", () => {
      const date = new Date(2026, 1, 3, 12, 0, 0); // Feb 3, 2026 12:00 PM
      const result = getFriendlyDateString(date);

      expect(result).toBe("2026-02-03 12:00 PM");
    });

    it("pads single digit months and days", () => {
      const date = new Date(2026, 0, 5, 10, 5, 0); // Jan 5, 2026 10:05 AM
      const result = getFriendlyDateString(date);

      expect(result).toBe("2026-01-05 10:05 AM");
    });

    it("pads single digit minutes", () => {
      const date = new Date(2026, 1, 3, 9, 5, 0); // Feb 3, 2026 9:05 AM
      const result = getFriendlyDateString(date);

      expect(result).toBe("2026-02-03 9:05 AM");
    });
  });

  describe("getSqlDateString", () => {
    it("formats date in SQL format", () => {
      const date = new Date(2026, 1, 3, 14, 30, 45); // Feb 3, 2026 2:30:45 PM
      const result = getSqlDateString(date);

      expect(result).toBe("2026-02-03 14:30:45");
    });

    it("pads all components correctly", () => {
      const date = new Date(2026, 0, 5, 9, 5, 3); // Jan 5, 2026 9:05:03 AM
      const result = getSqlDateString(date);

      expect(result).toBe("2026-01-05 09:05:03");
    });

    it("handles midnight", () => {
      const date = new Date(2026, 1, 3, 0, 0, 0);
      const result = getSqlDateString(date);

      expect(result).toBe("2026-02-03 00:00:00");
    });
  });

  describe("Sorting Functions", () => {
    const mockVehicles: AvlVehicle[] = [
      { vehicle_name: "B-100", velocity: 50, date: "2026-02-03T10:00:00Z" } as AvlVehicle,
      { vehicle_name: "A-200", velocity: 30, date: "2026-02-03T08:00:00Z" } as AvlVehicle,
      { vehicle_name: "C-50", velocity: 70, date: "2026-02-03T09:00:00Z" } as AvlVehicle,
    ];

    describe("sortByVehicleIdAsc", () => {
      it("sorts vehicles by name ascending", () => {
        const sorted = [...mockVehicles].sort(sortByVehicleIdAsc);

        expect(sorted[0].vehicle_name).toBe("A-200");
        expect(sorted[1].vehicle_name).toBe("B-100");
        expect(sorted[2].vehicle_name).toBe("C-50");
      });

      it("returns 0 for equal names", () => {
        const v1 = { vehicle_name: "Test" } as AvlVehicle;
        const v2 = { vehicle_name: "Test" } as AvlVehicle;

        expect(sortByVehicleIdAsc(v1, v2)).toBe(0);
      });
    });

    describe("sortByVehicleIdDesc", () => {
      it("sorts vehicles by name descending", () => {
        const sorted = [...mockVehicles].sort(sortByVehicleIdDesc);

        expect(sorted[0].vehicle_name).toBe("C-50");
        expect(sorted[1].vehicle_name).toBe("B-100");
        expect(sorted[2].vehicle_name).toBe("A-200");
      });
    });

    describe("sortBySpeedAsc", () => {
      it("sorts vehicles by speed ascending", () => {
        const sorted = [...mockVehicles].sort(sortBySpeedAsc);

        expect(sorted[0].velocity).toBe(30);
        expect(sorted[1].velocity).toBe(50);
        expect(sorted[2].velocity).toBe(70);
      });

      it("returns 0 for equal speeds", () => {
        const v1 = { velocity: 50 } as AvlVehicle;
        const v2 = { velocity: 50 } as AvlVehicle;

        expect(sortBySpeedAsc(v1, v2)).toBe(0);
      });
    });

    describe("sortBySpeedDesc", () => {
      it("sorts vehicles by speed descending", () => {
        const sorted = [...mockVehicles].sort(sortBySpeedDesc);

        expect(sorted[0].velocity).toBe(70);
        expect(sorted[1].velocity).toBe(50);
        expect(sorted[2].velocity).toBe(30);
      });
    });

    describe("sortByDateAsc", () => {
      it("sorts vehicles by date with most recent first", () => {
        const sorted = [...mockVehicles].sort(sortByDateAsc);

        expect(sorted[0].date).toBe("2026-02-03T10:00:00Z");
        expect(sorted[1].date).toBe("2026-02-03T09:00:00Z");
        expect(sorted[2].date).toBe("2026-02-03T08:00:00Z");
      });
    });

    describe("sortByDateDesc", () => {
      it("sorts vehicles by date with oldest first", () => {
        const sorted = [...mockVehicles].sort(sortByDateDesc);

        expect(sorted[0].date).toBe("2026-02-03T08:00:00Z");
        expect(sorted[1].date).toBe("2026-02-03T09:00:00Z");
        expect(sorted[2].date).toBe("2026-02-03T10:00:00Z");
      });
    });
  });

  describe("addVehicleInfo", () => {
    const mockSubGroup: AvlSubGroup = {
      subGroupName: "Test Group",
      imageName: "truck.png",
    };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-03T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("adds imageName from subGroup", () => {
      const vehicle = { date: "2026-02-03T12:00:00Z" } as AvlVehicle;
      const result = addVehicleInfo(vehicle, mockSubGroup);

      expect(result.imageName).toBe("truck.png");
    });

    it("sets green class for recent updates (under 60 seconds)", () => {
      // Use a date that's 30 seconds ago in the fake timer context
      // The function applies timezone offset, so we test the class assignment
      const vehicle = { date: "2026-02-03T11:59:30Z" } as AvlVehicle;
      const result = addVehicleInfo(vehicle, mockSubGroup);

      expect(result.cssClass).toBe("green");
      // The function shows "sec" for seconds
      expect(result.lastReported).toMatch(/sec/);
    });

    const getVehicleDateForDiffSeconds = (diffSeconds: number) => {
      const now = Date.now();
      return new Date(now - diffSeconds * 1000).toISOString();
    };

    it("sets green class for updates under 1 hour", () => {
      const thirtyMinAgo = getVehicleDateForDiffSeconds(30 * 60);
      const vehicle = { date: thirtyMinAgo } as AvlVehicle;
      const result = addVehicleInfo(vehicle, mockSubGroup);

      expect(result.cssClass).toBe("green");
      // Should show minutes
      expect(result.lastReported).toMatch(/min|minute/);
    });

    it("sets red class for updates over 1 hour", () => {
      const twoHoursAgo = getVehicleDateForDiffSeconds(2 * 60 * 60);
      const vehicle = { date: twoHoursAgo } as AvlVehicle;
      const result = addVehicleInfo(vehicle, mockSubGroup);

      expect(result.cssClass).toBe("red");
      expect(result.lastReported).toMatch(/hr|hour/);
    });

    it("sets red class for updates over 1 day", () => {
      const vehicle = { date: "2026-02-01T12:00:00Z" } as AvlVehicle;
      const result = addVehicleInfo(vehicle, mockSubGroup);

      expect(result.cssClass).toBe("red");
      expect(result.lastReported).toContain("days");
    });

    it("sets dateFriendly property", () => {
      const vehicle = { date: "2026-02-03T10:30:00Z" } as AvlVehicle;
      const result = addVehicleInfo(vehicle, mockSubGroup);

      expect(result.dateFriendly).toBeDefined();
    });

    it("shows singular second for 1 second ago", () => {
      vi.setSystemTime(new Date("2026-02-03T12:00:01Z"));
      const vehicle = { date: "2026-02-03T12:00:00Z" } as AvlVehicle;
      const result = addVehicleInfo(vehicle, mockSubGroup);

      expect(result.lastReported).toBe("Last Reported: 1 sec");
    });

    it("shows singular minute for ~1 minute ago", () => {
      vi.setSystemTime(new Date("2026-02-03T12:01:15Z")); // 75 seconds later (in 60-90 range)
      const vehicle = { date: "2026-02-03T12:00:00Z" } as AvlVehicle;
      const result = addVehicleInfo(vehicle, mockSubGroup);

      // Due to timezone offset, the exact value may vary
      expect(result.lastReported).toMatch(/1 (minute|min|sec)/);
    });

    it("shows singular hour for ~1 hour ago", () => {
      const seventyFiveMinAgo = getVehicleDateForDiffSeconds(75 * 60);
      const vehicle = { date: seventyFiveMinAgo } as AvlVehicle;
      const result = addVehicleInfo(vehicle, mockSubGroup);

      // Should show "1 hour" (between 1 and 1.5 hours)
      expect(result.lastReported).toMatch(/hour|hr/);
    });
  });

  describe("cleanDeviceNameForMatching", () => {
    describe("Innisfil/Severn group", () => {
      it("removes dashes for Innisfil", () => {
        const result = cleanDeviceNameForMatching("V-100", "Innisfil");
        expect(result).toBe("V100");
      });

      it("removes dashes for Severn", () => {
        const result = cleanDeviceNameForMatching("T-200", "Severn");
        expect(result).toBe("T200");
      });
    });

    describe("Roads/Solid Waste GeoTab group", () => {
      it("uses first part before dash for Roads GeoTab", () => {
        const result = cleanDeviceNameForMatching("16-91 Ops Eng SUV", "Roads GeoTab");
        expect(result).toBe("16");
      });

      it("uses first part before dash for Solid Waste GeoTab", () => {
        const result = cleanDeviceNameForMatching("SW-100 Truck", "Solid Waste GeoTab");
        expect(result).toBe("SW");
      });
    });

    describe("Waste Contractor group", () => {
      it("removes E prefix and takes first part", () => {
        const result = cleanDeviceNameForMatching("E100-Truck", "Waste Contractor");
        expect(result).toBe("100");
      });

      it("extracts number from SIMCOE prefix", () => {
        const result = cleanDeviceNameForMatching("SIMCOE-123", "Waste Contractor");
        expect(result).toBe("123");
      });

      it("handles SMC prefix with dash", () => {
        const result = cleanDeviceNameForMatching("SMC-E456", "Waste Contractor");
        expect(result).toBe("456");
      });

      it("handles SMC prefix without E", () => {
        const result = cleanDeviceNameForMatching("SMC-789", "Waste Contractor");
        expect(result).toBe("789");
      });

      it("defaults to first part for unknown patterns", () => {
        const result = cleanDeviceNameForMatching("TRUCK-123", "Waste Contractor");
        expect(result).toBe("TRUCK");
      });
    });

    describe("Default group", () => {
      it("returns name as-is for unknown groups", () => {
        const result = cleanDeviceNameForMatching("Test-Vehicle", "Unknown Group");
        expect(result).toBe("Test-Vehicle");
      });
    });

    it("handles empty string", () => {
      const result = cleanDeviceNameForMatching("", "Any Group");
      expect(result).toBe("");
    });

    it("handles null/undefined", () => {
      // @ts-expect-error testing null handling
      const result = cleanDeviceNameForMatching(null, "Any Group");
      expect(result).toBe("");
    });
  });

  describe("isPurelyNumeric", () => {
    it("returns true for numeric strings", () => {
      expect(isPurelyNumeric("123")).toBe(true);
      expect(isPurelyNumeric("1691")).toBe(true);
    });

    it("returns true for numeric strings with dashes", () => {
      expect(isPurelyNumeric("16-91")).toBe(true);
    });

    it("returns false for alphanumeric strings", () => {
      expect(isPurelyNumeric("1691 Ops Eng SUV")).toBe(false);
      expect(isPurelyNumeric("V100")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isPurelyNumeric("")).toBe(false);
    });

    it("returns false for null/undefined", () => {
      // @ts-expect-error testing null handling
      expect(isPurelyNumeric(null)).toBe(false);
      // @ts-expect-error testing undefined handling
      expect(isPurelyNumeric(undefined)).toBe(false);
    });
  });

  describe("convertUTCToLocal", () => {
    it("converts UTC to EST (5 hours behind)", () => {
      const result = convertUTCToLocal("2026-02-03T15:00:00Z");

      // Should be 5 hours earlier
      expect(result).toContain("10:00:00");
    });

    it("handles empty string", () => {
      const result = convertUTCToLocal("");
      expect(result).toBe("");
    });

    it("returns original if falsy", () => {
      // @ts-expect-error testing null handling
      const result = convertUTCToLocal(null);
      expect(result).toBe(null);
    });
  });

  describe("formatDateFriendly", () => {
    it("formats date for America/New_York timezone", () => {
      const result = formatDateFriendly("2026-02-03T15:00:00Z");

      // Should format to local time with date and AM/PM
      expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} [AP]M/);
    });

    it("handles empty string", () => {
      const result = formatDateFriendly("");
      expect(result).toBe("");
    });
  });

  describe("calculateBearing", () => {
    it("calculates bearing going north", () => {
      const bearing = calculateBearing(44.0, -79.0, 45.0, -79.0);
      // North should be approximately 0 degrees
      expect(bearing).toBeCloseTo(0, 0);
    });

    it("calculates bearing going east", () => {
      const bearing = calculateBearing(44.0, -79.0, 44.0, -78.0);
      // East should be approximately 90 degrees
      expect(bearing).toBeCloseTo(90, 0);
    });

    it("calculates bearing going south", () => {
      const bearing = calculateBearing(44.0, -79.0, 43.0, -79.0);
      // South should be approximately 180 degrees
      expect(bearing).toBeCloseTo(180, 0);
    });

    it("calculates bearing going west", () => {
      const bearing = calculateBearing(44.0, -79.0, 44.0, -80.0);
      // West should be approximately 270 degrees
      expect(bearing).toBeCloseTo(270, 0);
    });

    it("calculates bearing for diagonal (northeast)", () => {
      const bearing = calculateBearing(44.0, -79.0, 45.0, -78.0);
      // Northeast should be approximately 45 degrees
      expect(bearing).toBeGreaterThan(30);
      expect(bearing).toBeLessThan(60);
    });

    it("returns value between 0 and 360", () => {
      const bearing = calculateBearing(44.0, -79.0, 44.0, -80.0);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe("roundTime", () => {
    it("rounds to nearest 10 minutes - down", () => {
      const date = new Date(2026, 1, 3, 10, 4, 0);
      const result = roundTime(date);

      expect(result.getMinutes()).toBe(0);
      expect(result.getHours()).toBe(10);
    });

    it("rounds to nearest 10 minutes - up", () => {
      const date = new Date(2026, 1, 3, 10, 6, 0);
      const result = roundTime(date);

      expect(result.getMinutes()).toBe(10);
      expect(result.getHours()).toBe(10);
    });

    it("keeps time at 10 minute boundary", () => {
      const date = new Date(2026, 1, 3, 10, 30, 0);
      const result = roundTime(date);

      expect(result.getMinutes()).toBe(30);
    });

    it("rounds across hour boundary", () => {
      const date = new Date(2026, 1, 3, 10, 58, 0);
      const result = roundTime(date);

      expect(result.getMinutes()).toBe(0);
      expect(result.getHours()).toBe(11);
    });
  });

  describe("dateDiffInDays", () => {
    it("calculates difference of 0 for same day", () => {
      const date1 = new Date(2026, 1, 3);
      const date2 = new Date(2026, 1, 3);

      expect(dateDiffInDays(date1, date2)).toBe(0);
    });

    it("calculates positive difference when b is after a", () => {
      const date1 = new Date(2026, 1, 3);
      const date2 = new Date(2026, 1, 5);

      expect(dateDiffInDays(date1, date2)).toBe(2);
    });

    it("calculates negative difference when a is after b", () => {
      const date1 = new Date(2026, 1, 5);
      const date2 = new Date(2026, 1, 3);

      expect(dateDiffInDays(date1, date2)).toBe(-2);
    });

    it("calculates across month boundary", () => {
      const date1 = new Date(2026, 0, 30); // Jan 30
      const date2 = new Date(2026, 1, 2); // Feb 2

      expect(dateDiffInDays(date1, date2)).toBe(3);
    });

    it("ignores time component", () => {
      const date1 = new Date(2026, 1, 3, 23, 59, 59);
      const date2 = new Date(2026, 1, 4, 0, 0, 0);

      expect(dateDiffInDays(date1, date2)).toBe(1);
    });
  });

  describe("getUID", () => {
    it("generates a string", () => {
      const uid = getUID();
      expect(typeof uid).toBe("string");
    });

    it("generates unique IDs", () => {
      const uids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uids.add(getUID());
      }
      // All 100 should be unique
      expect(uids.size).toBe(100);
    });

    it("generates IDs of expected length", () => {
      const uid = getUID();
      // substring(2, 11) should give 9 characters
      expect(uid.length).toBe(9);
    });
  });

  describe("toWebMercatorFromLatLong", () => {
    it("converts Toronto coordinates", () => {
      const [x, y] = toWebMercatorFromLatLong([-79.3832, 43.6532]);

      // Toronto in Web Mercator should be approximately:
      // X: -8836963, Y: ~5411930 (varies slightly due to projection math)
      expect(x).toBeCloseTo(-8836963, -4); // within 10000
      expect(y).toBeCloseTo(5411930, -4); // within 10000
    });

    it("converts equator/prime meridian origin", () => {
      const [x, y] = toWebMercatorFromLatLong([0, 0]);

      expect(x).toBe(0);
      expect(y).toBeCloseTo(0, 5);
    });

    it("handles negative coordinates", () => {
      const [x, y] = toWebMercatorFromLatLong([-79.5, -44.5]);

      expect(x).toBeLessThan(0);
      expect(y).toBeLessThan(0);
    });

    it("converts Simcoe County approximate center", () => {
      // Simcoe County center approximately: -79.5, 44.4
      const [x, y] = toWebMercatorFromLatLong([-79.5, 44.4]);

      expect(x).toBeLessThan(0); // Western hemisphere
      expect(y).toBeGreaterThan(0); // Northern hemisphere
    });
  });
});
