import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore } from "@/stores/appStore";

vi.mock("@/stores/appStore", () => ({
  useAppStore: {
    getState: vi.fn(),
  },
}));

import { getActiveMunicipality, isPropertyInMunicipality, hasMunicipalityFilter } from "@/utils/municipalityFilter";

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
});
