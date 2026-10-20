import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getGroupsFromArcGIS } from "@/utils/tocHelpers";

vi.mock("@/utils/openlayers/LayerHelpers", () => ({
  LayerHelpers: {
    getLayer: (_options: unknown, callback: (layer: unknown) => void) => {
      callback({
        setVisible: vi.fn(),
        setOpacity: vi.fn(),
        setProperties: vi.fn(),
        setZIndex: vi.fn(),
      });
    },
  },
}));

vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "managed-layer-id"),
  },
}));

const ROOT_URL = "https://example.com/arcgis/rest/services/Test/MapServer";

type ServiceLayer = {
  id: number;
  name: string;
  type: string;
  parentLayerId?: number;
  subLayerIds?: number[] | null;
  parentLayer?: { id: number; name: string } | null;
  subLayers?: { id: number; name: string }[];
  defaultVisibility?: boolean;
  description?: string;
};

const serviceLayers: ServiceLayer[] = [
  { id: 0, name: "Road_Network", type: "Group Layer", parentLayerId: -1, subLayerIds: [1, 2] },
  { id: 1, name: "Centreline", type: "Feature Layer", parentLayerId: 0, subLayerIds: null, description: "" },
  { id: 2, name: "Tagged Layer", type: "Feature Layer", parentLayerId: 0, subLayerIds: null, description: "#Category=Emergency_Services" },
  { id: 3, name: "Ungrouped", type: "Feature Layer", parentLayerId: -1, subLayerIds: null, description: "" },
];

function stubArcGISService(layers: ServiceLayer[]) {
  const fetchMock = vi.fn(async (url: string) => {
    const data = url.includes("/legend") ? { layers: [] } : { layers };
    return { ok: true, json: async () => data } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
}

function loadGroups(descriptionOverride?: string) {
  return getGroupsFromArcGIS({
    layerUrl: ROOT_URL,
    secure: false,
    descriptionOverride,
  } as unknown as Parameters<typeof getGroupsFromArcGIS>[0]);
}

function layerNamesByGroup(groups: Awaited<ReturnType<typeof loadGroups>>) {
  return Object.fromEntries(groups.map((group) => [group.label, group.layers.map((layer) => layer.name)]));
}

describe("getGroupsFromArcGIS grouping fallback", () => {
  beforeEach(() => {
    stubArcGISService(serviceLayers);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the parent Group Layer name for untagged layers and keeps CATEGORY tags first", async () => {
    const groups = layerNamesByGroup(await loadGroups());

    expect(groups["Road Network"]).toEqual(["Centreline"]);
    expect(groups["Emergency Services"]).toEqual(["Tagged Layer"]);
    expect(groups["Uncategorized"]).toEqual(["Ungrouped"]);
  });

  it("groups untagged children of Group Layers with the service's own shape", async () => {
    stubArcGISService([
      { id: 0, name: "Water", type: "Group Layer", parentLayerId: -1, defaultVisibility: false, subLayerIds: [76, 72, 95] },
      { id: 76, name: "Water Hydrants", type: "Feature Layer", parentLayerId: 0, defaultVisibility: true, subLayerIds: null },
      { id: 72, name: "Water Fittings", type: "Feature Layer", parentLayerId: 0, defaultVisibility: true, subLayerIds: null },
      { id: 95, name: "GIS_PROD.DBO.wStructures", type: "Feature Layer", parentLayerId: 0, defaultVisibility: true, subLayerIds: null },
      { id: 96, name: "Sanitary", type: "Group Layer", parentLayerId: -1, defaultVisibility: false, subLayerIds: [92] },
      { id: 92, name: "Sanitary Valve", type: "Feature Layer", parentLayerId: 96, defaultVisibility: true, subLayerIds: null },
    ]);

    const groups = layerNamesByGroup(await loadGroups());

    expect(groups).toEqual({
      Water: ["Water Hydrants", "Water Fittings", "GIS_PROD.DBO.wStructures"],
      Sanitary: ["Sanitary Valve"],
    });
  });

  it("resolves Group Layer membership from subLayerIds when parentLayerId is -1", async () => {
    stubArcGISService([
      { id: 0, name: "Water", type: "Group Layer", parentLayerId: -1, subLayerIds: [76] },
      { id: 76, name: "Water Hydrants", type: "Feature Layer", parentLayerId: -1, subLayerIds: null },
    ]);

    const groups = layerNamesByGroup(await loadGroups());

    expect(groups).toEqual({ Water: ["Water Hydrants"] });
  });

  it("reads membership from parentLayer and subLayers when parentLayerId and subLayerIds are absent", async () => {
    stubArcGISService([
      { id: 0, name: "Water", type: "Group Layer", subLayers: [{ id: 76, name: "Water Hydrants" }] },
      { id: 76, name: "Water Hydrants", type: "Feature Layer", parentLayer: { id: 0, name: "Water" }, subLayers: [] },
    ]);

    const groups = layerNamesByGroup(await loadGroups());

    expect(groups).toEqual({ Water: ["Water Hydrants"] });
  });

  it("applies a map config CATEGORY override to every layer", async () => {
    const groups = layerNamesByGroup(await loadGroups("#Category=Override_Group"));

    expect(groups["Override Group"]).toEqual(["Centreline", "Tagged Layer", "Ungrouped"]);
    expect(groups["Road Network"]).toBeUndefined();
  });

  it("uses the layer CATEGORY when the map config override has none", async () => {
    const groups = layerNamesByGroup(await loadGroups("#Description=Override only"));

    expect(groups["Emergency Services"]).toEqual(["Tagged Layer"]);
    expect(groups["Road Network"]).toEqual(["Centreline"]);
    expect(groups["Uncategorized"]).toEqual(["Ungrouped"]);
  });
});
