import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTOCStore, MY_FAVOURITES_VALUE, type TOCLayer, type TOCLayerGroup } from "@/stores/tocStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";

vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    setLayerVisibility: vi.fn(),
  },
}));

const FAVOURITES_KEY = "Layers_Favourites";

// The mock records every managed layer, so read the latest call for one layer only.
function lastVisibilityFor(managedId: string): boolean | undefined {
  const calls = vi.mocked(LayerManager.setLayerVisibility).mock.calls.filter(([id]) => id === managedId);
  return calls.at(-1)?.[1];
}

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
    visible: false,
    defaultVisible: false,
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
  return {
    value,
    label: value,
    defaultGroup: false,
    url: "",
    prefix: "",
    visibleLayers: [],
    wmsGroupUrl: "",
    customRestUrl: "",
    layers,
    primary: false,
  };
}

function loadSourceGroups(): void {
  const parcels = makeGroup("parcels", [makeLayer({ id: "parcel_a", name: "Assessment Parcel", visible: true }), makeLayer({ id: "parcel_b", name: "Zoning", visible: false })]);
  const trails = makeGroup("trails", [makeLayer({ id: "trail_a", name: "Bruce Trail", group: "trails", groupName: "Trails" })]);
  useTOCStore.getState().setLayerGroups("LIST", [parcels, trails]);
  useTOCStore.getState().setLayerGroups("FOLDER", [parcels, trails]);
}

function favouriteGroup(view: "LIST" | "FOLDER"): TOCLayerGroup | undefined {
  const state = useTOCStore.getState();
  const groups = view === "LIST" ? state.layerListGroups : state.layerFolderGroups;
  return groups.find((group) => group.value === MY_FAVOURITES_VALUE);
}

describe("tocStore - My Favourites", () => {
  beforeEach(() => {
    localStorage.clear();
    useTOCStore.setState({
      tocType: "FOLDER",
      layerListGroups: [],
      layerFolderGroups: [],
      allLayers: [],
      selectedGroup: null,
      defaultGroup: null,
      searchText: "",
      sortAlpha: false,
      isLoading: false,
      hasInitialized: false,
      layerCount: 0,
      helpLink: "",
      sources: [],
      favouriteLayers: [],
    });
    vi.mocked(LayerManager.setLayerVisibility).mockClear();
    loadSourceGroups();
  });

  it("places an empty favourites folder first in both views", () => {
    expect(useTOCStore.getState().layerFolderGroups[0].value).toBe(MY_FAVOURITES_VALUE);
    expect(useTOCStore.getState().layerListGroups[0].value).toBe(MY_FAVOURITES_VALUE);
    expect(favouriteGroup("FOLDER")?.layers).toHaveLength(0);
  });

  it("adds a layer to the favourites folder in both views without changing layerCount", () => {
    const countBefore = useTOCStore.getState().layerCount;

    useTOCStore.getState().toggleFavourite("Assessment Parcel");

    expect(useTOCStore.getState().favouriteLayers).toEqual([{ name: "Assessment Parcel", visible: true }]);
    expect(favouriteGroup("FOLDER")?.layers.map((l) => l.name)).toEqual(["Assessment Parcel"]);
    expect(favouriteGroup("LIST")?.layers.map((l) => l.name)).toEqual(["Assessment Parcel"]);
    expect(useTOCStore.getState().layerCount).toBe(countBefore);
  });

  it("gives the favourites entry its own id so visibility is not mirrored by id", () => {
    useTOCStore.getState().toggleFavourite("Assessment Parcel");

    const entry = favouriteGroup("FOLDER")?.layers[0];
    expect(entry?.id).not.toBe("parcel_a");
    expect(entry?.managedLayerId).toBe("managed_Assessment Parcel");
  });

  it("removes a layer from the favourites folder when toggled again", () => {
    useTOCStore.getState().toggleFavourite("Assessment Parcel");
    useTOCStore.getState().toggleFavourite("Assessment Parcel");

    expect(useTOCStore.getState().favouriteLayers).toEqual([]);
    expect(favouriteGroup("FOLDER")?.layers).toHaveLength(0);
  });

  it("does not favourite user-added layers", () => {
    useTOCStore.setState((state) => {
      state.allLayers.push(makeLayer({ id: "user_1", name: "My Own Layer", userLayer: true }));
    });

    useTOCStore.getState().toggleFavourite("My Own Layer");

    expect(useTOCStore.getState().favouriteLayers).toEqual([]);
  });

  it("persists favourites under the Layers_Favourites key", () => {
    useTOCStore.getState().toggleFavourite("Assessment Parcel");

    expect(JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? "[]")).toEqual([{ name: "Assessment Parcel", visible: true }]);
  });

  it("restores favourites from storage on load", () => {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify([{ name: "Bruce Trail", visible: false }]));

    useTOCStore.getState().loadFavourites();

    expect(useTOCStore.getState().favouriteLayers).toEqual([{ name: "Bruce Trail", visible: false }]);
    expect(favouriteGroup("FOLDER")?.layers.map((l) => l.name)).toEqual(["Bruce Trail"]);
  });

  it("ignores malformed stored favourites", () => {
    localStorage.setItem(FAVOURITES_KEY, "{not json");

    useTOCStore.getState().loadFavourites();

    expect(useTOCStore.getState().favouriteLayers).toEqual([]);
  });

  it("toggling the source leaves the favourite's visibility unchanged", () => {
    useTOCStore.getState().toggleFavourite("Assessment Parcel");

    useTOCStore.getState().updateLayerVisibilityById("parcel_a", false);

    expect(useTOCStore.getState().favouriteLayers).toEqual([{ name: "Assessment Parcel", visible: true }]);
    expect(favouriteGroup("FOLDER")?.layers[0].visible).toBe(true);
    expect(useTOCStore.getState().allLayers.find((l) => l.id === "parcel_a")?.visible).toBe(false);
    expect(lastVisibilityFor("managed_Assessment Parcel")).toBe(true);
  });

  it("toggling the favourite leaves the source's visibility unchanged", () => {
    useTOCStore.getState().toggleFavourite("Assessment Parcel");
    const entry = favouriteGroup("FOLDER")!.layers[0];

    useTOCStore.getState().updateLayerVisibilityById(entry.id, false);

    expect(useTOCStore.getState().allLayers.find((l) => l.id === "parcel_a")?.visible).toBe(true);
    expect(lastVisibilityFor("managed_Assessment Parcel")).toBe(true);
  });

  it("adding a favourite does not change the source's visibility", () => {
    useTOCStore.getState().toggleFavourite("Assessment Parcel");

    expect(useTOCStore.getState().allLayers.find((l) => l.id === "parcel_a")?.visible).toBe(true);
  });

  it("favourite on then original on keeps the map on when the original starts off", () => {
    useTOCStore.getState().updateLayerVisibilityById("parcel_a", false);
    useTOCStore.getState().toggleFavourite("Assessment Parcel");
    const entry = favouriteGroup("FOLDER")!.layers[0];

    useTOCStore.getState().updateLayerVisibilityById(entry.id, true);
    useTOCStore.getState().updateLayerVisibilityById("parcel_a", true);

    expect(useTOCStore.getState().favouriteLayers).toEqual([{ name: "Assessment Parcel", visible: true }]);
    expect(lastVisibilityFor("managed_Assessment Parcel")).toBe(true);
  });

  it("favourite on then original on keeps the map on when the original starts on", () => {
    useTOCStore.getState().toggleFavourite("Assessment Parcel");
    const entry = favouriteGroup("FOLDER")!.layers[0];
    useTOCStore.getState().updateLayerVisibilityById(entry.id, false);

    useTOCStore.getState().updateLayerVisibilityById(entry.id, true);

    expect(lastVisibilityFor("managed_Assessment Parcel")).toBe(true);
  });

  it("turns the map off only when the favourite and the original are both off", () => {
    useTOCStore.getState().toggleFavourite("Assessment Parcel");
    const entry = favouriteGroup("FOLDER")!.layers[0];
    useTOCStore.getState().updateLayerVisibilityById("parcel_a", false);

    useTOCStore.getState().updateLayerVisibilityById(entry.id, false);

    expect(useTOCStore.getState().favouriteLayers).toEqual([{ name: "Assessment Parcel", visible: false }]);
    expect(lastVisibilityFor("managed_Assessment Parcel")).toBe(false);
  });

  it("turns favourites off with setAllLayersVisibility and persists the change", () => {
    useTOCStore.getState().toggleFavourite("Assessment Parcel");

    useTOCStore.getState().setAllLayersVisibility(false);

    expect(useTOCStore.getState().favouriteLayers).toEqual([{ name: "Assessment Parcel", visible: false }]);
    expect(lastVisibilityFor("managed_Assessment Parcel")).toBe(false);
  });

  it("keeps the favourite's stored visibility when switching LIST groups", () => {
    useTOCStore.setState({ tocType: "LIST" });
    useTOCStore
      .getState()
      .setLayerGroups("LIST", [
        makeGroup("parcels", [makeLayer({ id: "parcel_a", name: "Assessment Parcel", visible: true })]),
        makeGroup("trails", [makeLayer({ id: "trail_a", name: "Bruce Trail", group: "trails", groupName: "Trails" })]),
      ]);
    useTOCStore.getState().toggleFavourite("Assessment Parcel");

    const trails = useTOCStore.getState().layerListGroups.find((g) => g.value === "trails")!;
    useTOCStore.getState().switchToGroup(trails);

    expect(useTOCStore.getState().favouriteLayers).toEqual([{ name: "Assessment Parcel", visible: true }]);
  });
});
