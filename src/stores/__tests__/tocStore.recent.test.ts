import { describe, it, expect, beforeEach } from "vitest";
import { useTOCStore, MAX_RECENT_LAYERS } from "@/stores/tocStore";

const RECENT_KEY = "Layers_Recent";

describe("tocStore - recent layers", () => {
  beforeEach(() => {
    localStorage.clear();
    useTOCStore.setState({ recentLayers: [] });
  });

  it("keeps the newest layer first and moves repeats to the top", () => {
    const { recordRecentLayer } = useTOCStore.getState();
    recordRecentLayer("Zoning");
    recordRecentLayer("Bruce Trail");
    recordRecentLayer("Zoning");

    expect(useTOCStore.getState().recentLayers).toEqual(["Zoning", "Bruce Trail"]);
  });

  it("caps the list at MAX_RECENT_LAYERS", () => {
    const { recordRecentLayer } = useTOCStore.getState();
    for (let i = 0; i < MAX_RECENT_LAYERS + 2; i++) {
      recordRecentLayer(`Layer ${i}`);
    }

    const recent = useTOCStore.getState().recentLayers;
    expect(recent).toHaveLength(MAX_RECENT_LAYERS);
    expect(recent[0]).toBe(`Layer ${MAX_RECENT_LAYERS + 1}`);
  });

  it("persists the list under the Layers_Recent key", () => {
    useTOCStore.getState().recordRecentLayer("Zoning");

    expect(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "null")).toEqual(["Zoning"]);
  });

  it("restores saved names and drops invalid entries on load", () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(["Zoning", 3, "Bruce Trail"]));

    useTOCStore.getState().loadRecentLayers();

    expect(useTOCStore.getState().recentLayers).toEqual(["Zoning", "Bruce Trail"]);
  });

  it("treats malformed storage as an empty list", () => {
    localStorage.setItem(RECENT_KEY, "not json");

    useTOCStore.getState().loadRecentLayers();

    expect(useTOCStore.getState().recentLayers).toEqual([]);
  });
});
