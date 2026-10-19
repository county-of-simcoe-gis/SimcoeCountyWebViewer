import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LayerItem from "@/components/TOC/LayerItem";
import { useTOCStore, MY_FAVOURITES_VALUE, type TOCLayer, type TOCLayerGroup } from "@/stores/tocStore";

vi.mock("@/lib/appStats", () => ({ trackLayer: vi.fn(), trackGroup: vi.fn() }));
vi.mock("@/utils/openlayers/LayerManager", () => ({ LayerManager: { setLayerVisibility: vi.fn() } }));

function makeLayer(overrides: Partial<TOCLayer> & { id: string; name: string }): TOCLayer {
  return {
    displayName: overrides.name,
    tocDisplayName: overrides.name,
    styleUrl: "",
    height: 0,
    drawIndex: 0,
    index: 0,
    initialDrawIndex: 0,
    showLegend: false,
    legendHeight: 0,
    legendImage: null,
    legendObj: null,
    visible: true,
    defaultVisible: true,
    layer: null,
    managedLayerId: `managed_${overrides.name}`,
    metadataUrl: null,
    opacity: 1,
    minScale: 0,
    maxScale: 0,
    liveLayer: false,
    groupName: "Parcels",
    group: "parcels",
    userLayer: false,
    secured: false,
    ...overrides,
  };
}

function makeGroup(value: string, layers: TOCLayer[]): TOCLayerGroup {
  return { value, label: value, defaultGroup: false, url: "", prefix: "", visibleLayers: [], wmsGroupUrl: "", customRestUrl: "", layers, primary: false };
}

describe("LayerItem - My Favourites star", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    localStorage.clear();
    const layer = makeLayer({ id: "parcel_a", name: "Assessment Parcel" });
    useTOCStore.setState({
      tocType: "FOLDER",
      allLayers: [layer],
      layerListGroups: [],
      layerFolderGroups: [makeGroup("parcels", [layer])],
      selectedGroup: null,
      favouriteLayers: [],
    });
  });

  it("adds the layer to My Favourites when the star is clicked", () => {
    const layer = useTOCStore.getState().allLayers[0];
    render(<LayerItem layerInfo={layer} group={makeGroup("parcels", [layer])} searchText="" onLayerChange={vi.fn()} onLegendToggle={vi.fn()} onLayerOptionsClick={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add to My Favourites" }));

    expect(useTOCStore.getState().favouriteLayers).toEqual([{ name: "Assessment Parcel", visible: true }]);
  });

  it("hides the star for user-added layers", () => {
    const userLayer = makeLayer({ id: "user_1", name: "My Own Layer", userLayer: true });
    render(<LayerItem layerInfo={userLayer} group={makeGroup("parcels", [userLayer])} searchText="" onLayerChange={vi.fn()} onLegendToggle={vi.fn()} onLayerOptionsClick={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /My Favourites/ })).toBeNull();
  });

  it("keeps the source checkbox enabled while the layer is favourited", () => {
    useTOCStore.setState({ favouriteLayers: [{ name: "Assessment Parcel", visible: true }] });
    const layer = useTOCStore.getState().allLayers[0];
    render(<LayerItem layerInfo={layer} group={makeGroup("parcels", [layer])} searchText="" onLayerChange={vi.fn()} onLegendToggle={vi.fn()} onLayerOptionsClick={vi.fn()} />);

    expect(screen.getByRole("checkbox")).toBeEnabled();
  });

  it("keeps the favourites entry's checkbox enabled", () => {
    useTOCStore.setState({ favouriteLayers: [{ name: "Assessment Parcel", visible: true }] });
    const favEntry = makeLayer({ id: "fav_parcel_a", name: "Assessment Parcel", group: MY_FAVOURITES_VALUE, groupName: "My Favourites" });
    render(<LayerItem layerInfo={favEntry} group={makeGroup(MY_FAVOURITES_VALUE, [favEntry])} searchText="" onLayerChange={vi.fn()} onLegendToggle={vi.fn()} onLayerOptionsClick={vi.fn()} />);

    expect(screen.getByRole("checkbox")).toBeEnabled();
  });
});

describe("LayerItem - recent layers", () => {
  beforeEach(() => {
    localStorage.clear();
    useTOCStore.setState({ recentLayers: [] });
  });

  it("records the layer when the user turns it on", () => {
    const layer = makeLayer({ id: "parcel_a", name: "Assessment Parcel", visible: false });
    useTOCStore.setState({ allLayers: [layer] });
    render(<LayerItem layerInfo={layer} group={makeGroup("parcels", [layer])} searchText="" onLayerChange={vi.fn()} onLegendToggle={vi.fn()} onLayerOptionsClick={vi.fn()} />);

    fireEvent.click(screen.getByRole("checkbox"));

    expect(useTOCStore.getState().recentLayers).toEqual(["Assessment Parcel"]);
  });

  it("does not record when the user turns the layer off", () => {
    const layer = makeLayer({ id: "parcel_a", name: "Assessment Parcel", visible: true });
    useTOCStore.setState({ allLayers: [layer] });
    render(<LayerItem layerInfo={layer} group={makeGroup("parcels", [layer])} searchText="" onLayerChange={vi.fn()} onLegendToggle={vi.fn()} onLayerOptionsClick={vi.fn()} />);

    fireEvent.click(screen.getByRole("checkbox"));

    expect(useTOCStore.getState().recentLayers).toEqual([]);
  });
});
