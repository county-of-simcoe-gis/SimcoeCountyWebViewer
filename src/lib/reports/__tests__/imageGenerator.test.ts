import { describe, it, expect, afterEach, vi } from "vitest";
import { getOrthoBasemap, getOrthoYear } from "@/lib/reports/imageGenerator";

describe("ortho basemap year", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to 2024", () => {
    vi.stubEnv("ORTHO_YEAR", "");
    expect(getOrthoYear()).toBe("2024");
  });

  it("ignores an invalid ORTHO_YEAR", () => {
    vi.stubEnv("ORTHO_YEAR", "../2025");
    expect(getOrthoYear()).toBe("2024");
  });

  it("builds the WMTS url and layer from ORTHO_YEAR", () => {
    vi.stubEnv("ORTHO_YEAR", "2025");
    const basemap = getOrthoBasemap();
    expect(basemap.layer).toBe("Ortho_2025_Cache");
    expect(basemap.baseURL).toContain("/Public/Ortho_2025_Cache/MapServer/tile/");
  });

  it("covers the whole world at every level", () => {
    const { matrices } = getOrthoBasemap("2024");
    expect(matrices).toHaveLength(12);
    expect(matrices[0].matrixSize).toEqual([512, 512]);
    expect(matrices[11].matrixSize).toEqual([512 * 2 ** 11, 512 * 2 ** 11]);
    expect(matrices[1].scaleDenominator).toBeCloseTo(545978.7734656851, 6);
  });
});
