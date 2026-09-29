import { describe, it, expect, beforeEach } from "vitest";
import { getURLParameter, removeURLParameter, getAllURLParameters } from "@/utils/helpersUrl";

describe("helpersUrl", () => {
  beforeEach(() => {
    const url = new URL("http://localhost/?Foo=bar&Baz=qux");
    // @ts-expect-error jsdom url override
    delete (window as Window & typeof globalThis).location;
    // @ts-expect-error jsdom url override
    window.location = { ...url, search: url.search } as Location;
  });

  it("getURLParameter supports case sensitivity", () => {
    expect(getURLParameter("foo", true, false)).toBe("bar");
    expect(getURLParameter("Foo", true, true)).toBe("bar");
    expect(getURLParameter("notfound")).toBeNull();
  });

  it("removeURLParameter removes key", () => {
    const result = removeURLParameter("http://localhost/?a=1&b=2&c=3", "b");
    expect(result).toBe("http://localhost/?a=1&c=3");
  });

  it("getAllURLParameters gets all parameters", () => {
    const params = getAllURLParameters();
    expect(params).toEqual({ Foo: "bar", Baz: "qux" });
  });

  it("getAllURLParameters supports disabling decoding", () => {
    // @ts-expect-error jsdom url override
    window.location = { search: "?name=John%20Doe&city=New%20York" } as Location;
    const params = getAllURLParameters(false);
    expect(params).toEqual({ name: "John%20Doe", city: "New%20York" });
  });
});
