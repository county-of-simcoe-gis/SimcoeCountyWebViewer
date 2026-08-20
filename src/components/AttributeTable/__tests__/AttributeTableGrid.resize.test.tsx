import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AttributeTableGrid from "@/components/AttributeTable/AttributeTableGrid";
import { useAttributeTableStore } from "@/stores/attributeTableStore";
import { ColumnarStore, type ColumnSchema } from "@/lib/attributeTable/columnarStore";
import type { TOCLayer } from "@/stores/tocStore";

// Map integration fires WFS requests via effects — stub it out so the grid
// renders without any network I/O.
vi.mock("@/lib/attributeTable/mapIntegration", () => ({
  syncHighlight: vi.fn().mockResolvedValue(undefined),
  zoomToFeature: vi.fn().mockResolvedValue(undefined),
  setHoverFeature: vi.fn(),
  clearHover: vi.fn(),
}));

// The attachments dialog pulls in modal/attachment machinery we don't need
// for column-resize assertions.
vi.mock("@/components/AttributeTable/AttributeTableAttachmentsDialog", () => ({
  default: () => null,
}));

// @tanstack/react-virtual needs ResizeObserver. The vi.fn()-based mock in
// src/test/setup.ts loses its implementation because vitest.config.ts sets
// `mockReset: true` — install a plain class here so resets can't touch it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

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
    // TOCLayer.defaultVisible is required; re-narrow after the Partial spread.
    defaultVisible: overrides.defaultVisible ?? true,
  };
}

const SCHEMA: ColumnSchema[] = [
  { name: "name", type: "string" },
  { name: "value", type: "number" },
];

function seedTabWithData(layer: TOCLayer): void {
  useAttributeTableStore.getState().openForLayer(layer);
  const store = new ColumnarStore(SCHEMA);
  store.appendPage([
    { id: "1", properties: { name: "alpha", value: 1 } },
    { id: "2", properties: { name: "beta", value: 2 } },
  ]);
  useAttributeTableStore.getState().replaceData(layer.id, {
    schema: SCHEMA,
    fields: [
      { name: "name", type: "string", nillable: true, isGeometry: false, isIdLike: false },
      { name: "value", type: "number", nillable: true, isGeometry: false, isIdLike: false },
    ],
    implicitSortField: "name",
    store,
    totalCount: 2,
    capReached: false,
  });
}

/** Subscribes to the store so the grid always receives a fresh tab object. */
function GridHarness({ layerId }: { layerId: string }) {
  const tab = useAttributeTableStore((s) => s.tabs.find((t) => t.layerId === layerId));
  if (!tab) return null;
  return <AttributeTableGrid tab={tab} onLoadMore={() => {}} />;
}

function getTab(layerId: string) {
  const tab = useAttributeTableStore.getState().tabs.find((t) => t.layerId === layerId);
  if (!tab) throw new Error(`tab ${layerId} not found`);
  return tab;
}

describe("attributeTableStore column sizes", () => {
  beforeEach(() => {
    useAttributeTableStore.getState().closeAll();
  });

  it("tabs start with empty column sizes", () => {
    seedTabWithData(makeLayer());
    expect(getTab("layer-1").columnSizes).toEqual({});
  });

  it("setColumnSizes replaces the width map for the matching tab only", () => {
    seedTabWithData(makeLayer());
    useAttributeTableStore.getState().openForLayer(makeLayer({ id: "layer-2" }));

    useAttributeTableStore.getState().setColumnSizes("layer-1", { name: 240 });

    expect(getTab("layer-1").columnSizes).toEqual({ name: 240 });
    expect(getTab("layer-2").columnSizes).toEqual({});
  });

  it("closing the tab discards its column sizes", () => {
    seedTabWithData(makeLayer());
    useAttributeTableStore.getState().setColumnSizes("layer-1", { name: 240 });
    useAttributeTableStore.getState().closeTab("layer-1");

    useAttributeTableStore.getState().openForLayer(makeLayer());
    expect(getTab("layer-1").columnSizes).toEqual({});
  });
});

describe("AttributeTableGrid column resizing", () => {
  beforeEach(() => {
    useAttributeTableStore.getState().closeAll();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a resize handle on data columns only (utility columns are locked)", () => {
    seedTabWithData(makeLayer());
    render(<GridHarness layerId="layer-1" />);

    expect(screen.getByLabelText("Resize name column")).toBeInTheDocument();
    expect(screen.getByLabelText("Resize value column")).toBeInTheDocument();
    // Exactly the two data columns — select/actions columns have no handle.
    expect(screen.getAllByRole("separator")).toHaveLength(2);
  });

  it("data columns render at the default 160px width", () => {
    seedTabWithData(makeLayer());
    render(<GridHarness layerId="layer-1" />);

    const handle = screen.getByLabelText("Resize name column");
    expect(handle.parentElement).toHaveStyle({ width: "160px" });
  });

  it("dragging a handle updates column sizes in the store", () => {
    seedTabWithData(makeLayer());
    render(<GridHarness layerId="layer-1" />);

    const handle = screen.getByLabelText("Resize name column");
    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 160 });
    fireEvent.mouseUp(document, { clientX: 160 });

    expect(getTab("layer-1").columnSizes.name).toBe(220);
    expect(handle.parentElement).toHaveStyle({ width: "220px" });
  });

  it("dragging below the minimum clamps to 60px", () => {
    seedTabWithData(makeLayer());
    render(<GridHarness layerId="layer-1" />);

    const handle = screen.getByLabelText("Resize name column");
    fireEvent.mouseDown(handle, { clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 100 });
    fireEvent.mouseUp(document, { clientX: 100 });

    expect(getTab("layer-1").columnSizes.name).toBe(60);
  });

  it("double-clicking a handle resets the column to the default width", () => {
    seedTabWithData(makeLayer());
    render(<GridHarness layerId="layer-1" />);

    const handle = screen.getByLabelText("Resize name column");
    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 160 });
    fireEvent.mouseUp(document, { clientX: 160 });
    expect(getTab("layer-1").columnSizes.name).toBe(220);

    fireEvent.doubleClick(handle);

    expect(getTab("layer-1").columnSizes.name).toBeUndefined();
    expect(handle.parentElement).toHaveStyle({ width: "160px" });
  });
});
