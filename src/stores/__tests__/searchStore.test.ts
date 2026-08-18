import { describe, it, expect, beforeEach } from "vitest";
import { useSearchStore } from "@/stores/searchStore";
import type { SearchResult } from "@/types/searchResult";

describe("searchStore", () => {
  beforeEach(() => {
    useSearchStore.setState({ lastResult: null });
  });

  it("has null lastResult initially", () => {
    expect(useSearchStore.getState().lastResult).toBeNull();
  });

  it("setLastResult stores the result", () => {
    const result = { id: "123", name: "Test" } as SearchResult;
    useSearchStore.getState().setLastResult(result);
    expect(useSearchStore.getState().lastResult).toEqual(result);
  });

  it("setLastResult accepts null", () => {
    useSearchStore.getState().setLastResult({ id: "123" } as SearchResult);
    useSearchStore.getState().setLastResult(null);
    expect(useSearchStore.getState().lastResult).toBeNull();
  });

  it("clearLastResult resets to null", () => {
    useSearchStore.getState().setLastResult({ id: "456" } as SearchResult);
    useSearchStore.getState().clearLastResult();
    expect(useSearchStore.getState().lastResult).toBeNull();
  });
});
