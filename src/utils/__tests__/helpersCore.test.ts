import { describe, it, expect } from "vitest";
import { getUID, tryParseJSON } from "@/utils/helpersCore";

describe("helpersCore", () => {
  it("getUID returns a unique UUID v4 string", () => {
    const a = getUID();
    const b = getUID();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("tryParseJSON returns object or false", () => {
    expect(tryParseJSON('{"a":1}')).toEqual({ a: 1 });
    expect(tryParseJSON("not json")).toBe(false);
  });
});
