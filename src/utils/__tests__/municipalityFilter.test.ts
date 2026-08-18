import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore } from "@/stores/appStore";

vi.mock("@/stores/appStore", () => ({
  useAppStore: {
    getState: vi.fn(),
  },
}));

import { getActiveMunicipality, isPropertyInMunicipality, hasMunicipalityFilter, isCountyUser, getUserMunicipality } from "@/utils/municipalityFilter";

describe("municipalityFilter", () => {
  beforeEach(() => {
    vi.mocked(useAppStore.getState).mockReset();
  });

  describe("getActiveMunicipality", () => {
    it("returns config municipality when set", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: { municipality: "Barrie" },
        urlParameters: {},
      } as never);
      expect(getActiveMunicipality()).toBe("Barrie");
    });

    it("falls back to MUNI URL parameter", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: {},
        urlParameters: { MUNI: "Orillia" },
      } as never);
      expect(getActiveMunicipality()).toBe("Orillia");
    });

    it("returns null when no filter is configured", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: {},
        urlParameters: {},
      } as never);
      expect(getActiveMunicipality()).toBeNull();
    });
  });

  describe("isPropertyInMunicipality", () => {
    it("returns true when no filter is active", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: {},
        urlParameters: {},
      } as never);
      expect(isPropertyInMunicipality("AnyTown")).toBe(true);
    });

    it("returns true when property matches filter (case-insensitive)", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: { municipality: "Barrie" },
        urlParameters: {},
      } as never);
      expect(isPropertyInMunicipality("barrie")).toBe(true);
      expect(isPropertyInMunicipality("BARRIE")).toBe(true);
    });

    it("returns false when property does not match filter", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: { municipality: "Barrie" },
        urlParameters: {},
      } as never);
      expect(isPropertyInMunicipality("Orillia")).toBe(false);
    });

    it("returns false when property municipality is null/undefined", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: { municipality: "Barrie" },
        urlParameters: {},
      } as never);
      expect(isPropertyInMunicipality(null)).toBe(false);
      expect(isPropertyInMunicipality(undefined)).toBe(false);
    });
  });

  describe("hasMunicipalityFilter", () => {
    it("returns true when filter is active", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: { municipality: "Barrie" },
        urlParameters: {},
      } as never);
      expect(hasMunicipalityFilter()).toBe(true);
    });

    it("returns false when no filter", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: {},
        urlParameters: {},
      } as never);
      expect(hasMunicipalityFilter()).toBe(false);
    });
  });

  describe("isCountyUser", () => {
    it("returns true when locations include COUNTY OF SIMCOE (case-insensitive)", () => {
      expect(isCountyUser({ locations: ["County of Simcoe"] })).toBe(true);
      expect(isCountyUser({ locations: ["COUNTY OF SIMCOE", "Town of Innisfil"] })).toBe(true);
    });

    it("returns false when locations do not include COUNTY OF SIMCOE", () => {
      expect(isCountyUser({ locations: ["Town of Innisfil"] })).toBe(false);
      expect(isCountyUser({ locations: [] })).toBe(false);
      expect(isCountyUser({})).toBe(false);
    });
  });

  describe("getUserMunicipality", () => {
    it("prefers the active municipality filter over user locations", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: { municipality: "Barrie" },
        urlParameters: {},
      } as never);
      expect(getUserMunicipality({ locations: ["Town of Innisfil"] })).toBe("Barrie");
    });

    it("falls back to the first non-county location when no active filter", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: {},
        urlParameters: {},
      } as never);
      expect(getUserMunicipality({ locations: ["Town of Innisfil"] })).toBe("Town of Innisfil");
      expect(getUserMunicipality({ locations: ["COUNTY OF SIMCOE", "Town of Innisfil"] })).toBe("Town of Innisfil");
    });

    it("returns null for County users when no active filter", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: {},
        urlParameters: {},
      } as never);
      expect(getUserMunicipality({ locations: ["COUNTY OF SIMCOE"] })).toBeNull();
    });

    it("returns null when no filter and no locations", () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        config: {},
        urlParameters: {},
      } as never);
      expect(getUserMunicipality({ locations: [] })).toBeNull();
      expect(getUserMunicipality({})).toBeNull();
    });
  });
});
