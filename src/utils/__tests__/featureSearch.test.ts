import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeFeatureType, fetchWfsPage } from "@/lib/attributeTable/wfs";
import { ArcgisPaginationNotSupportedError, describeArcgisLayer, fetchArcgisPage } from "@/lib/attributeTable/arcgis";
import type { ManagedLayer } from "@/stores/layerManagerStore";
import { getAccessToken } from "@/utils/auth";
import { buildArcgisContainsWhere, buildCqlContainsFilter, getFeatureSearchTargets, sanitizeSearchTerm, searchActiveLayerFeatures } from "@/utils/featureSearch";

vi.mock("@/utils/auth", () => ({
  getAccessToken: vi.fn(async () => "token"),
}));

vi.mock("@/lib/attributeTable/wfs", () => ({
  describeFeatureType: vi.fn(),
  fetchWfsPage: vi.fn(),
  extractWfsBase: (url: string) => url.split("?")[0],
}));

vi.mock("@/lib/attributeTable/arcgis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/attributeTable/arcgis")>();
  return { ...actual, describeArcgisLayer: vi.fn(), fetchArcgisPage: vi.fn() };
});

const WFS_URL = "https://gis.example.com/geoserver/wfs";
const ARCGIS_URL = "https://gis.example.com/arcgis/rest/services/Zoning/MapServer/identify?geometry=#GEOMETRY#&layers=visible%3A4";

interface FakeLayerOptions {
  id?: string;
  category?: string;
  visible?: boolean;
  props?: Record<string, unknown>;
}

function fakeManaged(options: FakeLayerOptions = {}): ManagedLayer {
  const props = options.props ?? {};
  const layer = {
    getVisible: () => options.visible ?? true,
    get: (key: string) => props[key],
    getSource: () => null,
  };
  return {
    id: options.id ?? "layer-1",
    name: String(props.name ?? "layer"),
    category: options.category ?? "TOC",
    layer,
  } as unknown as ManagedLayer;
}

const wfsProps = (typeName: string, title = "Parcels") => ({ name: typeName, wfsUrl: WFS_URL, tocDisplayName: title });
const arcgisProps = (title = "Zoning") => ({ name: "Zoning", wfsUrl: ARCGIS_URL, tocDisplayName: title, isArcGIS: true });

const wfsFields = [
  { name: "ADDRESS", type: "string" as const, nillable: true, isGeometry: false, isIdLike: false },
  { name: "OWNER", type: "string" as const, nillable: true, isGeometry: false, isIdLike: false },
  { name: "AREA", type: "number" as const, nillable: true, isGeometry: false, isIdLike: false },
  { name: "geom", type: "string" as const, nillable: true, isGeometry: true, isIdLike: false },
];

const pointGeometry = { type: "Point", coordinates: [-8000000, 5500000] };

describe("sanitizeSearchTerm", () => {
  it("strips LIKE wildcards and trims", () => {
    expect(sanitizeSearchTerm("  50%_off ")).toBe("50off");
  });
});

describe("buildCqlContainsFilter", () => {
  it("ORs case-insensitive contains clauses across safe fields", () => {
    expect(buildCqlContainsFilter(["ADDRESS", "OWNER"], "Main")).toBe("strToLowerCase(ADDRESS) LIKE '%main%' OR strToLowerCase(OWNER) LIKE '%main%'");
  });

  it("doubles single quotes in the term", () => {
    expect(buildCqlContainsFilter(["OWNER"], "O'Brien")).toBe("strToLowerCase(OWNER) LIKE '%o''brien%'");
  });

  it("skips field names that are not plain identifiers", () => {
    expect(buildCqlContainsFilter(["bad-field", "OWNER"], "x")).toBe("strToLowerCase(OWNER) LIKE '%x%'");
  });

  it("double-quotes field names that contain spaces", () => {
    expect(buildCqlContainsFilter(["Phone Number"], "705")).toBe("strToLowerCase(\"Phone Number\") LIKE '%705%'");
  });

  it("returns null when there is nothing to search", () => {
    expect(buildCqlContainsFilter([], "main")).toBeNull();
    expect(buildCqlContainsFilter(["OWNER"], "%_")).toBeNull();
  });
});

describe("buildArcgisContainsWhere", () => {
  it("uses UPPER contains clauses with escaped quotes", () => {
    expect(buildArcgisContainsWhere(["ADDRESS"], "o'brien")).toBe("UPPER(ADDRESS) LIKE '%O''BRIEN%'");
  });

  it("double-quotes field names that contain spaces", () => {
    expect(buildArcgisContainsWhere(["Phone Number", "Name"], "705")).toBe("UPPER(\"Phone Number\") LIKE '%705%' OR UPPER(Name) LIKE '%705%'");
  });
});

describe("getFeatureSearchTargets", () => {
  it("keeps only visible, queryable TOC or theme layers with an endpoint", () => {
    const targets = getFeatureSearchTargets([
      fakeManaged({ id: "ok", props: wfsProps("simcoe:Parcels_a") }),
      fakeManaged({ id: "hidden", visible: false, props: wfsProps("simcoe:Hidden") }),
      fakeManaged({ id: "not-queryable", props: { ...wfsProps("simcoe:NoQuery"), queryable: false } }),
      fakeManaged({ id: "tools", category: "Tools", props: wfsProps("simcoe:Tool") }),
      fakeManaged({ id: "no-url", props: { name: "simcoe:NoUrl" } }),
      fakeManaged({ id: "arcgis", props: arcgisProps() }),
    ]);

    expect(targets.map((t) => t.id)).toEqual(["arcgis", "ok"]);
  });

  it("caps the number of searched layers", () => {
    const many = Array.from({ length: 20 }, (_, i) => fakeManaged({ id: `l${i}`, props: wfsProps(`simcoe:Layer_${i}`) }));
    expect(getFeatureSearchTargets(many)).toHaveLength(15);
  });
});

describe("searchActiveLayerFeatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(describeFeatureType).mockResolvedValue(wfsFields);
    vi.mocked(fetchWfsPage).mockResolvedValue({
      features: [{ id: "Parcels.1", properties: { ADDRESS: "12 Main St", OWNER: "Smith" }, geometry: pointGeometry }],
      numberReturned: 1,
    });
    vi.mocked(describeArcgisLayer).mockResolvedValue({
      fields: [
        { name: "ZONE_NAME", type: "string", isGeometry: false, isIdLike: false, nillable: true },
        { name: "AREA", type: "number", nillable: true, isGeometry: false, isIdLike: false },
      ],
      objectIdField: "OBJECTID",
      maxRecordCount: 1000,
      supportsPagination: true,
      domains: {},
      relationships: [],
    });
  });

  it("does not query when the term is shorter than the minimum", async () => {
    const results = await searchActiveLayerFeatures("ma", [fakeManaged({ props: wfsProps("simcoe:Short") })]);
    expect(results).toEqual([]);
    expect(fetchWfsPage).not.toHaveBeenCalled();
  });

  it("returns WFS matches as Feature results with GeoJSON geometry", async () => {
    const results = await searchActiveLayerFeatures("main", [fakeManaged({ id: "parcels", props: wfsProps("simcoe:Wfs_Main") })]);

    expect(fetchWfsPage).toHaveBeenCalledWith(
      expect.objectContaining({
        wfsUrl: WFS_URL,
        layerName: "simcoe:Wfs_Main",
        cqlFilter: "strToLowerCase(ADDRESS) LIKE '%main%' OR strToLowerCase(OWNER) LIKE '%main%'",
        includeGeometry: true,
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: "12 Main St", type: "Feature", layerName: "Parcels", featureKey: "parcels:Parcels.1" });
    expect(JSON.parse(results[0].geojson ?? "null")).toEqual({ type: "Feature", geometry: pointGeometry, properties: {} });
  });

  it("skips features without geometry", async () => {
    vi.mocked(fetchWfsPage).mockResolvedValueOnce({
      features: [{ id: "Parcels.2", properties: { ADDRESS: "No Geom" }, geometry: null }],
      numberReturned: 1,
    });
    const results = await searchActiveLayerFeatures("geom", [fakeManaged({ props: wfsProps("simcoe:Wfs_NoGeom") })]);
    expect(results).toEqual([]);
  });

  it("queries ArcGIS layers with an UPPER contains where clause", async () => {
    vi.mocked(fetchArcgisPage).mockResolvedValueOnce({
      features: [{ id: "7", properties: { ZONE_NAME: "Residential Low" }, geometry: pointGeometry }],
      numberReturned: 1,
    });

    const results = await searchActiveLayerFeatures("residential", [fakeManaged({ id: "zoning", props: arcgisProps("Zoning Map") })]);

    expect(fetchArcgisPage).toHaveBeenCalledWith(expect.objectContaining({ where: "UPPER(ZONE_NAME) LIKE '%RESIDENTIAL%'", objectIdField: "OBJECTID", includeGeometry: true }));
    expect(results[0]).toMatchObject({ name: "Residential Low", layerName: "Zoning Map", featureKey: "zoning:7" });
  });

  it("retries an ArcGIS layer without pagination when the server refuses it", async () => {
    vi.mocked(fetchArcgisPage)
      .mockRejectedValueOnce(new ArcgisPaginationNotSupportedError())
      .mockResolvedValueOnce({ features: [{ id: "3", properties: { ZONE_NAME: "Commercial" }, geometry: pointGeometry }], numberReturned: 1 });

    const results = await searchActiveLayerFeatures("commercial", [fakeManaged({ props: arcgisProps("Zoning Fallback") })]);

    expect(fetchArcgisPage).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchArcgisPage).mock.calls[1][0]).toMatchObject({ supportsPagination: false });
    expect(results).toHaveLength(1);
  });

  it("skips a failing layer and keeps results from the others", async () => {
    vi.mocked(describeFeatureType).mockImplementation(async (_url, typeName) => {
      if (typeName === "simcoe:Wfs_Broken") throw new Error("boom");
      return wfsFields;
    });

    const results = await searchActiveLayerFeatures("main", [fakeManaged({ id: "broken", props: wfsProps("simcoe:Wfs_Broken") }), fakeManaged({ id: "good", props: wfsProps("simcoe:Wfs_Good") })]);

    expect(results).toHaveLength(1);
    expect(results[0].featureKey).toBe("good:Parcels.1");
  });

  it("gives up on a layer that exceeds the request timeout", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(fetchWfsPage).mockImplementation(
      (opts) =>
        new Promise((_resolve, reject) => {
          opts.signal?.addEventListener("abort", () => reject(opts.signal?.reason));
        }),
    );

    const pending = searchActiveLayerFeatures("main", [fakeManaged({ id: "slow", props: wfsProps("simcoe:Wfs_Slow", "Water Wells") })]);
    await vi.advanceTimersByTimeAsync(5000);

    await expect(pending).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Water Wells"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no response within 5000 ms"));
    warn.mockRestore();
    vi.useRealTimers();
  });

  it("skips secured WFS layers when there is no session", async () => {
    vi.mocked(getAccessToken).mockResolvedValueOnce(undefined);
    const results = await searchActiveLayerFeatures("main", [fakeManaged({ props: { ...wfsProps("simcoe:Wfs_Secure_Anon"), secured: true } })]);
    expect(results).toEqual([]);
    expect(fetchWfsPage).not.toHaveBeenCalled();
  });

  it("queries secured WFS layers when a session exists", async () => {
    vi.mocked(getAccessToken).mockResolvedValueOnce("token");
    const results = await searchActiveLayerFeatures("main", [fakeManaged({ props: { ...wfsProps("simcoe:Wfs_Secure_Auth"), secured: true } })]);
    expect(results).toHaveLength(1);
  });

  it("includes quoted string fields with spaces in the WFS filter", async () => {
    vi.mocked(describeFeatureType).mockResolvedValueOnce([{ name: "Phone Number", type: "string", nillable: true, isGeometry: false, isIdLike: false }]);
    await searchActiveLayerFeatures("705", [fakeManaged({ props: wfsProps("simcoe:Wfs_Phone") })]);
    expect(fetchWfsPage).toHaveBeenCalledWith(expect.objectContaining({ cqlFilter: "strToLowerCase(\"Phone Number\") LIKE '%705%'" }));
  });

  it("skips layers with no string fields without requesting features", async () => {
    vi.mocked(describeFeatureType).mockResolvedValueOnce([{ name: "AREA", type: "number", nillable: true, isGeometry: false, isIdLike: false }]);
    const results = await searchActiveLayerFeatures("main", [fakeManaged({ props: wfsProps("simcoe:Wfs_Numeric") })]);
    expect(results).toEqual([]);
    expect(fetchWfsPage).not.toHaveBeenCalled();
  });
});
