import { describe, it, expect } from "vitest";
import { normalizeRefreshInterval, MIN_REFRESH_INTERVAL_SECONDS } from "@/utils/refreshInterval";

describe("normalizeRefreshInterval", () => {
  it("returns 0 for missing or invalid values", () => {
    expect(normalizeRefreshInterval(undefined)).toBe(0);
    expect(normalizeRefreshInterval("")).toBe(0);
    expect(normalizeRefreshInterval("abc")).toBe(0);
    expect(normalizeRefreshInterval("0")).toBe(0);
    expect(normalizeRefreshInterval(-5)).toBe(0);
  });

  it("clamps values below the minimum", () => {
    expect(normalizeRefreshInterval("2")).toBe(MIN_REFRESH_INTERVAL_SECONDS);
  });

  it("returns valid values in seconds", () => {
    expect(normalizeRefreshInterval("300")).toBe(300);
    expect(normalizeRefreshInterval(30)).toBe(30);
  });
});
