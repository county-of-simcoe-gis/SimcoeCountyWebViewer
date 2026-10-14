import { describe, it, expect } from "vitest";
import { formatTimeValue, getTimeCount, getTimeValueAt, parseTimeDimension } from "@/utils/timeDimension";

const NOW = Date.parse("2026-10-14T12:00:00.000Z");

describe("parseTimeDimension", () => {
  it("parses a discrete list and defaults to the last value at or before now", () => {
    const dimension = parseTimeDimension({ values: "2026-10-14T10:00:00.000Z,2026-10-14T11:00:00.000Z,2026-10-14T13:00:00.000Z", default: "current" }, NOW);
    expect(dimension).toEqual({
      kind: "list",
      values: ["2026-10-14T10:00:00.000Z", "2026-10-14T11:00:00.000Z", "2026-10-14T13:00:00.000Z"],
      defaultIndex: 1,
    });
  });

  it("uses an explicit ISO default to pick the index", () => {
    const dimension = parseTimeDimension({ values: "2026-10-13T00:00:00.000Z,2026-10-13T03:00:00.000Z,2026-10-13T06:00:00.000Z", default: "2026-10-13T03:00:00.000Z" }, NOW);
    expect(dimension).toMatchObject({ kind: "list", defaultIndex: 1 });
  });

  it("parses a minute-period range", () => {
    const dimension = parseTimeDimension({ values: "2026-10-07T12:28:00.000Z/2026-10-07T12:38:00.000Z/PT1M", default: "current" }, NOW);
    expect(dimension).toMatchObject({ kind: "range", periodMs: 60_000, count: 11 });
  });

  it("parses an hour-period range", () => {
    const dimension = parseTimeDimension({ values: "2026-10-13T03:00:00.000Z/2026-10-14T12:00:00.000Z/PT3H", default: "current" }, NOW);
    expect(dimension).toMatchObject({ kind: "range", periodMs: 3 * 3_600_000, count: 12 });
  });

  it("parses a day-period range", () => {
    const dimension = parseTimeDimension({ values: "2026-10-01T00:00:00.000Z/2026-10-14T00:00:00.000Z/P1D" }, NOW);
    expect(dimension).toMatchObject({ kind: "range", periodMs: 86_400_000, count: 14 });
  });

  it("clamps a range default to the last step", () => {
    const dimension = parseTimeDimension({ values: "2026-10-13T03:00:00.000Z/2026-10-14T12:00:00.000Z/PT3H", default: "current" }, Date.parse("2026-12-01T00:00:00.000Z"));
    expect(dimension).toMatchObject({ defaultIndex: 11 });
  });

  it("returns undefined for empty, malformed, or zero-period values", () => {
    expect(parseTimeDimension({ values: "" }, NOW)).toBeUndefined();
    expect(parseTimeDimension(undefined, NOW)).toBeUndefined();
    expect(parseTimeDimension({ values: "2026-10-13T03:00:00.000Z/2026-10-14T12:00:00.000Z/PT" }, NOW)).toBeUndefined();
    expect(parseTimeDimension({ values: "2026-10-13T03:00:00.000Z/2026-10-14T12:00:00.000Z/P0D" }, NOW)).toBeUndefined();
    expect(parseTimeDimension({ values: "2026-10-14T12:00:00.000Z/2026-10-13T03:00:00.000Z/PT3H" }, NOW)).toBeUndefined();
  });
});

describe("time index helpers", () => {
  it("returns the ISO value for a range index", () => {
    const dimension = parseTimeDimension({ values: "2026-10-13T03:00:00.000Z/2026-10-13T09:00:00.000Z/PT3H" }, NOW);
    expect(dimension && getTimeCount(dimension)).toBe(3);
    expect(dimension && getTimeValueAt(dimension, 2)).toBe("2026-10-13T09:00:00.000Z");
  });

  it("returns the list value for a list index", () => {
    const dimension = parseTimeDimension({ values: "a,b,c" }, NOW);
    expect(dimension && getTimeValueAt(dimension, 1)).toBe("b");
  });

  it("returns the raw value when it is not a parseable date", () => {
    expect(formatTimeValue("not-a-date")).toBe("not-a-date");
  });
});
