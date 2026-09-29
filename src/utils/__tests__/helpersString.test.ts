import { describe, it, expect } from "vitest";
import { toTitleCase, formatTitleCase } from "@/utils/helpersString";

describe("helpersString", () => {
  it("toTitleCase converts words to title case", () => {
    expect(toTitleCase("hello world")).toBe("Hello World");
  });

  it("toTitleCase converts underscores to spaces and title-cases", () => {
    expect(toTitleCase("hello_world")).toBe("Hello World");
    expect(toTitleCase("some_multi_word_value")).toBe("Some Multi Word Value");
  });

  it("formatTitleCase limits length when provided", () => {
    expect(formatTitleCase("hello world", 5)).toBe("Hello...");
    expect(formatTitleCase("hello", 10)).toBe("Hello");
  });
});
