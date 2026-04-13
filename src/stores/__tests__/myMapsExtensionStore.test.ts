import { describe, it, expect, beforeEach } from "vitest";
import { useMyMapsExtensionStore, MyMapsExtensionItem } from "@/stores/myMapsExtensionStore";

function makeItem(id: string, order?: number, isVisible?: () => boolean): MyMapsExtensionItem {
  return {
    id,
    label: `Item ${id}`,
    order,
    onClick: () => {},
    isVisible,
  };
}

describe("myMapsExtensionStore", () => {
  beforeEach(() => {
    useMyMapsExtensionStore.setState({ items: new Map() });
  });

  it("starts with empty items Map", () => {
    expect(useMyMapsExtensionStore.getState().items.size).toBe(0);
  });

  it("registerItems adds items to the Map", () => {
    useMyMapsExtensionStore.getState().registerItems([makeItem("a"), makeItem("b")]);
    expect(useMyMapsExtensionStore.getState().items.size).toBe(2);
  });

  it("registerItems overwrites existing items with same id", () => {
    useMyMapsExtensionStore.getState().registerItems([makeItem("a", 1)]);
    useMyMapsExtensionStore.getState().registerItems([makeItem("a", 2)]);
    const item = useMyMapsExtensionStore.getState().items.get("a");
    expect(item?.order).toBe(2);
    expect(useMyMapsExtensionStore.getState().items.size).toBe(1);
  });

  it("unregisterItems removes by id", () => {
    useMyMapsExtensionStore.getState().registerItems([makeItem("a"), makeItem("b")]);
    useMyMapsExtensionStore.getState().unregisterItems(["a"]);
    expect(useMyMapsExtensionStore.getState().items.size).toBe(1);
    expect(useMyMapsExtensionStore.getState().items.has("b")).toBe(true);
  });

  it("getVisibleItems returns sorted visible items", () => {
    useMyMapsExtensionStore.getState().registerItems([makeItem("c", 30), makeItem("a", 10), makeItem("b", 20)]);
    const visible = useMyMapsExtensionStore.getState().getVisibleItems();
    expect(visible.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("getVisibleItems uses default order 50 when undefined", () => {
    useMyMapsExtensionStore.getState().registerItems([makeItem("a", undefined), makeItem("b", 10)]);
    const visible = useMyMapsExtensionStore.getState().getVisibleItems();
    expect(visible[0].id).toBe("b");
    expect(visible[1].id).toBe("a");
  });

  it("getVisibleItems filters hidden items", () => {
    useMyMapsExtensionStore.getState().registerItems([makeItem("a", 1, () => true), makeItem("b", 2, () => false)]);
    const visible = useMyMapsExtensionStore.getState().getVisibleItems();
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("a");
  });

  it("clearAll empties the Map", () => {
    useMyMapsExtensionStore.getState().registerItems([makeItem("a")]);
    useMyMapsExtensionStore.getState().clearAll();
    expect(useMyMapsExtensionStore.getState().items.size).toBe(0);
  });
});
