import { describe, it, expect, vi, afterEach } from "vitest";
import { loadLayerGroupsFromSources } from "@/utils/tocHelpers";
import type { TOCSource } from "@/stores/tocStore";

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

const PRIMARY_A = "https://primary-a.example.com/arcgis/rest/services/A/MapServer";
const PRIMARY_B = "https://primary-b.example.com/arcgis/rest/services/B/MapServer";
const PUBLIC = "https://public.example.com/arcgis/rest/services/C/MapServer";

type ServiceLayer = {
  id: number;
  name: string;
  type: string;
  parentLayerId?: number;
  subLayerIds?: number[] | null;
  description?: string;
};

// Each entry is [groupName, childLayerName]; one Group Layer per entry.
function groupedService(groups: Array<[string, string]>): ServiceLayer[] {
  return groups.flatMap(([groupName, childName], index) => [
    { id: index * 2, name: groupName, type: "Group Layer", parentLayerId: -1, subLayerIds: [index * 2 + 1] },
    { id: index * 2 + 1, name: childName, type: "Feature Layer", parentLayerId: index * 2, subLayerIds: null, description: "" },
  ]);
}

function stubServices(services: Record<string, ServiceLayer[]>) {
  const fetchMock = vi.fn(async (url: string) => {
    const root = Object.keys(services).find((serviceUrl) => url.startsWith(serviceUrl));
    const data = url.includes("/legend") || !root ? { layers: [] } : { layers: services[root] };
    return { ok: true, json: async () => data } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
}

function arcgisSource(layerUrl: string, primary: boolean): TOCSource {
  return { type: "arcgis", layerUrl, secure: false, primary, urlType: "" } as unknown as TOCSource;
}

const config = { toc: { keywords: {}, default_group: "" }, geoserverPath: "geoserver" } as unknown as Parameters<typeof loadLayerGroupsFromSources>[1];

describe("loadLayerGroupsFromSources primary group ordering", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps all primary-source groups before non-primary groups", async () => {
    stubServices({
      [PRIMARY_A]: groupedService([["Zulu", "Zulu Layer"]]),
      [PRIMARY_B]: groupedService([["Beta", "Beta Layer"]]),
      [PUBLIC]: groupedService([["Charlie", "Charlie Layer"]]),
    });

    const { groups } = await loadLayerGroupsFromSources([arcgisSource(PUBLIC, false), arcgisSource(PRIMARY_A, true), arcgisSource(PRIMARY_B, true)], config);

    expect(groups.map((group) => group.label)).toEqual(["Beta", "Zulu", "Charlie"]);
    expect(groups.map((group) => group.primary)).toEqual([true, true, false]);
  });

  it("merges same-named groups into the primary group and keeps it primary", async () => {
    stubServices({
      [PRIMARY_A]: groupedService([["Shared", "Primary Layer"]]),
      [PUBLIC]: groupedService([
        ["Shared", "Public Layer"],
        ["Other", "Other Layer"],
      ]),
    });

    const { groups } = await loadLayerGroupsFromSources([arcgisSource(PUBLIC, false), arcgisSource(PRIMARY_A, true)], config);

    expect(groups.map((group) => group.label)).toEqual(["Shared", "Other"]);
    const shared = groups.find((group) => group.label === "Shared");
    expect(shared?.primary).toBe(true);
    expect(shared?.layers).toHaveLength(2);
  });
});
