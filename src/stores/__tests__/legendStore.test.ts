import { describe, it, expect, beforeEach } from "vitest";
import { useLegendStore } from "@/stores/legendStore";

describe("legendStore", () => {
  beforeEach(() => {
    useLegendStore.setState({ isOpen: false, allGroups: [], selectedGroups: [] });
  });

  it("starts closed with empty groups", () => {
    const state = useLegendStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.allGroups).toEqual([]);
    expect(state.selectedGroups).toEqual([]);
  });

  it("openLegend sets isOpen and populates groups", () => {
    const groups = [{ label: "Group A", value: "a", layers: [] }];
    useLegendStore.getState().openLegend(groups);
    const state = useLegendStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.allGroups).toEqual(groups);
    expect(state.selectedGroups).toEqual(groups);
  });

  it("openLegend accepts explicit selectedGroups", () => {
    const all = [
      { label: "Group A", value: "a", layers: [] },
      { label: "Group B", value: "b", layers: [] },
    ];
    const selected = [all[0]];
    useLegendStore.getState().openLegend(all, selected);
    expect(useLegendStore.getState().selectedGroups).toEqual(selected);
  });

  it("closeLegend resets everything", () => {
    useLegendStore.getState().openLegend([{ label: "G", value: "g", layers: [] }]);
    useLegendStore.getState().closeLegend();
    const state = useLegendStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.allGroups).toEqual([]);
    expect(state.selectedGroups).toEqual([]);
  });

  it("setSelectedGroups updates only selectedGroups", () => {
    const groups = [{ label: "G", value: "g", layers: [] }];
    useLegendStore.getState().openLegend(groups);
    useLegendStore.getState().setSelectedGroups([]);
    expect(useLegendStore.getState().selectedGroups).toEqual([]);
    expect(useLegendStore.getState().allGroups).toEqual(groups);
  });
});
