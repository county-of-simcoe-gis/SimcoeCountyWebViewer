import { describe, it, expect, beforeEach } from "vitest";
import { useAttributeTableStore } from "@/stores/attributeTableStore";
import { ColumnarStore } from "@/lib/attributeTable/columnarStore";
import type { TOCLayer } from "@/stores/tocStore";

function makeLayer(overrides: Partial<TOCLayer> = {}): TOCLayer {
  return {
    id: "layer-1",
    name: "simcoe:parcels",
    displayName: "Parcels",
    tocDisplayName: "Parcels",
    styleUrl: "",
    height: 0,
    drawIndex: 0,
    index: 0,
    initialDrawIndex: 0,
    showLegend: true,
    legendHeight: 0,
    legendImage: null,
    legendObj: null,
    visible: true,
    layer: null,
    metadataUrl: null,
    opacity: 1,
    minScale: 0,
    maxScale: 0,
    liveLayer: true,
    groupName: "g",
    group: "g",
    userLayer: false,
    wfsUrl: "https://example.com/geoserver/wfs",
    ...overrides,
  };
}

describe("attributeTableStore", () => {
  beforeEach(() => {
    useAttributeTableStore.getState().closeAll();
  });

  it("opens a tab for a layer and activates it", () => {
    const layer = makeLayer();
    useAttributeTableStore.getState().openForLayer(layer);
    const s = useAttributeTableStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.tabs).toHaveLength(1);
    expect(s.activeLayerId).toBe(layer.id);
    expect(s.tabs[0].layerName).toBe("Parcels");
    expect(s.tabs[0].typeName).toBe("simcoe:parcels");
  });

  it("does not duplicate tabs for the same layer", () => {
    const layer = makeLayer();
    useAttributeTableStore.getState().openForLayer(layer);
    useAttributeTableStore.getState().openForLayer(layer);
    expect(useAttributeTableStore.getState().tabs).toHaveLength(1);
  });

  it("closing a tab disposes its store and aborts fetch", () => {
    const layer = makeLayer();
    useAttributeTableStore.getState().openForLayer(layer);
    const store = new ColumnarStore([{ name: "x", type: "number" }]);
    store.appendPage([{ id: "1", properties: { x: 1 } }]);
    useAttributeTableStore.getState().replaceData(layer.id, {
      schema: [{ name: "x", type: "number" }],
      fields: [{ name: "x", type: "number", nillable: false, isGeometry: false, isIdLike: false }],
      implicitSortField: "x",
      store,
      totalCount: 1,
      capReached: false,
    });

    const ctrl = new AbortController();
    useAttributeTableStore.getState().setAbortController(layer.id, ctrl);
    useAttributeTableStore.getState().closeTab(layer.id);

    expect(ctrl.signal.aborted).toBe(true);
    expect(store.length).toBe(0);
    expect(useAttributeTableStore.getState().isOpen).toBe(false);
  });

  it("toggles selection with additive flag", () => {
    const layer = makeLayer();
    const s = useAttributeTableStore.getState();
    s.openForLayer(layer);
    s.toggleSelection(layer.id, "a", true);
    s.toggleSelection(layer.id, "b", true);
    expect(useAttributeTableStore.getState().tabs[0].selection.size).toBe(2);
    s.toggleSelection(layer.id, "a", true);
    expect(useAttributeTableStore.getState().tabs[0].selection.has("a")).toBe(false);
  });

  it("replaceData resets selection on reload", () => {
    const layer = makeLayer();
    const s = useAttributeTableStore.getState();
    s.openForLayer(layer);
    s.toggleSelection(layer.id, "x", true);
    expect(useAttributeTableStore.getState().tabs[0].selection.size).toBe(1);

    const store = new ColumnarStore([{ name: "x", type: "number" }]);
    s.replaceData(layer.id, {
      schema: [{ name: "x", type: "number" }],
      fields: [{ name: "x", type: "number", nillable: false, isGeometry: false, isIdLike: false }],
      implicitSortField: "x",
      store,
      totalCount: 0,
      capReached: false,
    });
    expect(useAttributeTableStore.getState().tabs[0].selection.size).toBe(0);
  });

  it("setSelection and clearSelection set/reset the full selection set", () => {
    const layer = makeLayer();
    const s = useAttributeTableStore.getState();
    s.openForLayer(layer);
    s.setSelection(layer.id, ["a", "b", "c"]);
    expect(useAttributeTableStore.getState().tabs[0].selection.size).toBe(3);
    expect(useAttributeTableStore.getState().tabs[0].selection.has("b")).toBe(true);
    s.clearSelection(layer.id);
    expect(useAttributeTableStore.getState().tabs[0].selection.size).toBe(0);
  });

  it("toggleSelection without additive replaces the selection", () => {
    const layer = makeLayer();
    const s = useAttributeTableStore.getState();
    s.openForLayer(layer);
    s.setSelection(layer.id, ["a", "b"]);
    s.toggleSelection(layer.id, "c", false);
    const sel = useAttributeTableStore.getState().tabs[0].selection;
    expect(sel.size).toBe(1);
    expect(sel.has("c")).toBe(true);
    expect(sel.has("a")).toBe(false);
  });

  it("minimize: toggleMinimized flips the flag, openForLayer clears it", () => {
    const layer = makeLayer();
    const s = useAttributeTableStore.getState();
    s.openForLayer(layer);
    expect(useAttributeTableStore.getState().minimized).toBe(false);

    s.toggleMinimized();
    expect(useAttributeTableStore.getState().minimized).toBe(true);

    s.setMinimized(true);
    expect(useAttributeTableStore.getState().minimized).toBe(true);

    // Opening a (possibly different) layer should restore the panel.
    s.openForLayer(makeLayer({ id: "layer-2", name: "simcoe:roads", displayName: "Roads", tocDisplayName: "Roads" }));
    expect(useAttributeTableStore.getState().minimized).toBe(false);
  });

  it("closeAll resets minimized and isOpen", () => {
    const layer = makeLayer();
    const s = useAttributeTableStore.getState();
    s.openForLayer(layer);
    s.setMinimized(true);
    s.closeAll();
    const st = useAttributeTableStore.getState();
    expect(st.isOpen).toBe(false);
    expect(st.minimized).toBe(false);
    expect(st.tabs).toHaveLength(0);
  });
});
