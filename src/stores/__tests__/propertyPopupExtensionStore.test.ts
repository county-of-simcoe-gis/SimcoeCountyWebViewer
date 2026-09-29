import { describe, it, expect, beforeEach } from "vitest";
import { usePropertyPopupExtensionStore, PropertyPopupExtensionItem } from "@/stores/propertyPopupExtensionStore";
import React from "react";

function makeItem(id: string, order: number, isVisible?: () => boolean): PropertyPopupExtensionItem {
  return {
    id,
    label: `Item ${id}`,
    order,
    render: () => React.createElement("span", null, id),
    isVisible,
  };
}

describe("propertyPopupExtensionStore", () => {
  beforeEach(() => {
    usePropertyPopupExtensionStore.setState({ items: [] });
  });

  it("starts with empty items", () => {
    expect(usePropertyPopupExtensionStore.getState().items).toEqual([]);
  });

  it("registerItems adds new items", () => {
    usePropertyPopupExtensionStore.getState().registerItems([makeItem("a", 1), makeItem("b", 2)]);
    expect(usePropertyPopupExtensionStore.getState().items).toHaveLength(2);
  });

  it("registerItems skips duplicates", () => {
    usePropertyPopupExtensionStore.getState().registerItems([makeItem("a", 1)]);
    usePropertyPopupExtensionStore.getState().registerItems([makeItem("a", 1), makeItem("b", 2)]);
    expect(usePropertyPopupExtensionStore.getState().items).toHaveLength(2);
  });

  it("unregisterItems removes by id", () => {
    usePropertyPopupExtensionStore.getState().registerItems([makeItem("a", 1), makeItem("b", 2)]);
    usePropertyPopupExtensionStore.getState().unregisterItems(["a"]);
    const items = usePropertyPopupExtensionStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("b");
  });

  it("getVisibleItems returns sorted visible items", () => {
    usePropertyPopupExtensionStore.getState().registerItems([makeItem("c", 3), makeItem("a", 1), makeItem("b", 2)]);
    const visible = usePropertyPopupExtensionStore.getState().getVisibleItems();
    expect(visible.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("getVisibleItems filters out hidden items", () => {
    usePropertyPopupExtensionStore.getState().registerItems([makeItem("a", 1, () => true), makeItem("b", 2, () => false)]);
    const visible = usePropertyPopupExtensionStore.getState().getVisibleItems();
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("a");
  });

  it("clearAll removes all items", () => {
    usePropertyPopupExtensionStore.getState().registerItems([makeItem("a", 1)]);
    usePropertyPopupExtensionStore.getState().clearAll();
    expect(usePropertyPopupExtensionStore.getState().items).toEqual([]);
  });
});
