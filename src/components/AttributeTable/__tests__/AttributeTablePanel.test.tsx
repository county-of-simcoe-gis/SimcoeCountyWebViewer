import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import AttributeTablePanel from "@/components/AttributeTable/AttributeTablePanel";
import { useAttributeTableStore } from "@/stores/attributeTableStore";
import { ColumnarStore } from "@/lib/attributeTable/columnarStore";
import type { TOCLayer } from "@/stores/tocStore";

// The loader issues WFS requests via effects — stub it out so the panel
// renders synchronously without any network I/O.
vi.mock("@/hooks/useAttributeTableLoader", () => ({
  useAttributeTableLoader: () => ({
    loadMore: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
  }),
}));

// The grid pulls in OpenLayers + @tanstack/react-virtual which need layout.
// For the panel-level tests we only care about the chrome (toolbar, minimize
// bar), so stub the grid to a trivial marker component.
vi.mock("@/components/AttributeTable/AttributeTableGrid", () => ({
  default: () => <div data-testid="attr-grid" />,
}));

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

function seedTabWithData(layer: TOCLayer): void {
  useAttributeTableStore.getState().openForLayer(layer);
  const schema = [{ name: "x", type: "number" as const }];
  const store = new ColumnarStore(schema);
  store.appendPage([{ id: "1", properties: { x: 1 } }]);
  useAttributeTableStore.getState().replaceData(layer.id, {
    schema,
    fields: [{ name: "x", type: "number", nillable: false, isGeometry: false, isIdLike: false }],
    implicitSortField: "x",
    store,
    totalCount: 1,
    capReached: false,
  });
}

describe("AttributeTablePanel", () => {
  beforeEach(() => {
    useAttributeTableStore.getState().closeAll();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("does not render when closed", () => {
    const { container } = render(<AttributeTablePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the full panel when open and not minimized", () => {
    seedTabWithData(makeLayer());
    render(<AttributeTablePanel />);
    expect(screen.getByRole("region", { name: /attribute table$/i })).toBeInTheDocument();
    expect(screen.getByTestId("attr-grid")).toBeInTheDocument();
  });

  it("minimize button collapses to the restore bar, showing the active layer name", () => {
    seedTabWithData(makeLayer());
    render(<AttributeTablePanel />);

    fireEvent.click(screen.getByLabelText(/minimize attribute table/i));
    expect(useAttributeTableStore.getState().minimized).toBe(true);

    const bar = screen.getByRole("region", { name: /attribute table \(minimized\)/i });
    expect(within(bar).getByText("Attribute Table")).toBeInTheDocument();
    expect(within(bar).getByText(/parcels/i)).toBeInTheDocument();
    expect(screen.queryByTestId("attr-grid")).not.toBeInTheDocument();
  });

  it("restore button on the minimized bar expands the panel again", () => {
    seedTabWithData(makeLayer());
    useAttributeTableStore.getState().setMinimized(true);
    render(<AttributeTablePanel />);

    fireEvent.click(screen.getByLabelText(/restore attribute table/i));
    expect(useAttributeTableStore.getState().minimized).toBe(false);
    expect(screen.getByTestId("attr-grid")).toBeInTheDocument();
  });

  it("close button on the minimized bar closes the table entirely", () => {
    seedTabWithData(makeLayer());
    useAttributeTableStore.getState().setMinimized(true);
    render(<AttributeTablePanel />);

    fireEvent.click(screen.getByLabelText(/close attribute table/i));
    const s = useAttributeTableStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.tabs).toHaveLength(0);
  });

  it("Actions menu is disabled when no rows are selected and enabled when rows are selected", () => {
    const layer = makeLayer();
    seedTabWithData(layer);
    render(<AttributeTablePanel />);

    const actionsSummary = screen.getByLabelText(/actions menu/i);
    expect(actionsSummary.className).toMatch(/btn-disabled/);

    act(() => {
      useAttributeTableStore.getState().setSelection(layer.id, ["1"]);
    });

    const actionsSummaryEnabled = screen.getByLabelText(/actions menu/i);
    expect(actionsSummaryEnabled.className).not.toMatch(/btn-disabled/);
    // The selection count is rendered in the summary.
    expect(actionsSummaryEnabled.textContent).toMatch(/1/);
  });
});
