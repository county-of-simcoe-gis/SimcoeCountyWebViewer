import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/testServer";
import { parseArcgisFieldsMetadata, getArcgisFieldMetadata, resolveFieldAlias, resolveDomainName, clearArcgisFieldMetadataCache } from "@/utils/arcgisFieldMetadata";

const LAYER_URL = "https://gis.example.com/arcgis/rest/services/TestService/MapServer/7";

// Sample layer JSON with qualified (joined) field names from two tables.
const sampleFields = [
  { name: "DBO.TestWidget.OBJECTID", type: "esriFieldTypeOID", alias: "OBJECTID", domain: null },
  { name: "DBO.TestWidget.FACILITYID", type: "esriFieldTypeString", alias: "Asset ID", domain: null },
  {
    name: "DBO.TestWidget.MATERIAL",
    type: "esriFieldTypeString",
    alias: "Material",
    domain: {
      type: "codedValue",
      codedValues: [
        { name: "Alpha Material", code: "AAA" },
        { name: "Beta Material", code: "BBB" },
      ],
    },
  },
  {
    name: "DBO.TestWidget.GAUGE",
    type: "esriFieldTypeDouble",
    alias: "Gauge (mm)",
    domain: {
      type: "codedValue",
      codedValues: [
        { name: "Unknown", code: 0 },
        { name: "200", code: 200 },
        { name: "37.5", code: 37.5 },
      ],
    },
  },
  {
    name: "DBO.TestWidget.ENABLED",
    type: "esriFieldTypeSmallInteger",
    alias: "Enabled",
    domain: {
      type: "codedValue",
      codedValues: [
        { name: "False", code: 0 },
        { name: "True", code: 1 },
      ],
    },
  },
  {
    name: "DBO.TestWidget.STATUS",
    type: "esriFieldTypeString",
    alias: "Status",
    domain: {
      type: "codedValue",
      codedValues: [{ name: "Active - Fictional status for tests.", code: "Active" }],
    },
  },
  {
    name: "DBO.TestWidget.COMMENTS",
    type: "esriFieldTypeString",
    alias: "Comments",
    domain: { type: "range", min: 0, max: 100 }, // range domains are ignored
  },
  { name: "DBO.TestWidgetDefects.DEFECTS", type: "esriFieldTypeString", alias: "DEFECTS", domain: null },
  { name: "DBO.TestWidgetDefects.FACILITYID", type: "esriFieldTypeString", alias: "FACILITYID", domain: null },
];

const metadata = parseArcgisFieldsMetadata(sampleFields);

describe("parseArcgisFieldsMetadata", () => {
  it("parses aliases and coded-value domains", () => {
    expect(metadata.aliases["dbo.testwidget.facilityid"]).toBe("Asset ID");
    expect(metadata.domains["dbo.testwidget.material"]).toEqual([
      { code: "AAA", name: "Alpha Material" },
      { code: "BBB", name: "Beta Material" },
    ]);
  });

  it("indexes by last segment for qualified names", () => {
    expect(metadata.aliases["facilityid"]).toBe("Asset ID");
    expect(metadata.domains["gauge"]).toBeDefined();
  });

  it("ignores range domains", () => {
    expect(metadata.domains["dbo.testwidget.comments"]).toBeUndefined();
  });

  it("returns empty metadata for invalid input", () => {
    expect(parseArcgisFieldsMetadata(undefined)).toEqual({ aliases: {}, domains: {} });
    expect(parseArcgisFieldsMetadata("nope")).toEqual({ aliases: {}, domains: {} });
  });
});

describe("resolveFieldAlias", () => {
  it("resolves alias by exact qualified name", () => {
    expect(resolveFieldAlias(metadata, "DBO.TestWidget.FACILITYID")).toBe("Asset ID");
  });

  it("resolves alias case-insensitively", () => {
    expect(resolveFieldAlias(metadata, "dbo.testwidget.facilityid")).toBe("Asset ID");
  });

  it("resolves alias by last segment for unqualified names", () => {
    expect(resolveFieldAlias(metadata, "GAUGE")).toBe("Gauge (mm)");
  });

  it("returns alias even when it only differs from the last segment by casing", () => {
    // "OBJECTID"/"FACILITYID" aliases are verbatim improvements over the
    // qualified raw names (which formatFieldName would mangle after ".").
    expect(resolveFieldAlias(metadata, "DBO.TestWidget.OBJECTID")).toBe("OBJECTID");
    expect(resolveFieldAlias(metadata, "DBO.TestWidgetDefects.FACILITYID")).toBe("FACILITYID");
  });

  it("returns undefined for unknown fields or missing metadata", () => {
    expect(resolveFieldAlias(metadata, "NOPE")).toBeUndefined();
    expect(resolveFieldAlias(null, "GAUGE")).toBeUndefined();
  });
});

describe("resolveDomainName", () => {
  it("resolves string codes", () => {
    expect(resolveDomainName(metadata, "DBO.TestWidget.MATERIAL", "AAA")).toBe("Alpha Material");
  });

  it("resolves numeric codes regardless of value type", () => {
    expect(resolveDomainName(metadata, "DBO.TestWidget.GAUGE", 200)).toBe("200");
    expect(resolveDomainName(metadata, "DBO.TestWidget.GAUGE", "200")).toBe("200");
    expect(resolveDomainName(metadata, "DBO.TestWidget.GAUGE", 37.5)).toBe("37.5");
    expect(resolveDomainName(metadata, "DBO.TestWidget.ENABLED", 1)).toBe("True");
    expect(resolveDomainName(metadata, "DBO.TestWidget.ENABLED", 0)).toBe("False");
  });

  it("resolves by last segment", () => {
    expect(resolveDomainName(metadata, "MATERIAL", "BBB")).toBe("Beta Material");
  });

  it("returns undefined for values with no matching code", () => {
    expect(resolveDomainName(metadata, "DBO.TestWidget.MATERIAL", "UNOBTAINIUM")).toBeUndefined();
    expect(resolveDomainName(metadata, "DBO.TestWidget.GAUGE", 99999)).toBeUndefined();
  });

  it("returns undefined for fields without a domain", () => {
    expect(resolveDomainName(metadata, "DBO.TestWidget.FACILITYID", "WID-123")).toBeUndefined();
  });

  it("returns undefined for null/undefined/object values", () => {
    expect(resolveDomainName(metadata, "DBO.TestWidget.MATERIAL", null)).toBeUndefined();
    expect(resolveDomainName(metadata, "DBO.TestWidget.MATERIAL", undefined)).toBeUndefined();
    expect(resolveDomainName(metadata, "DBO.TestWidget.MATERIAL", { code: "AAA" })).toBeUndefined();
  });
});

describe("getArcgisFieldMetadata", () => {
  beforeEach(() => {
    clearArcgisFieldMetadataCache();
  });

  it("fetches and parses layer JSON", async () => {
    server.use(http.get(LAYER_URL, () => HttpResponse.json({ fields: sampleFields })));

    const result = await getArcgisFieldMetadata(LAYER_URL);
    expect(result).not.toBeNull();
    expect(result!.aliases["dbo.testwidget.material"]).toBe("Material");
  });

  it("caches per layer URL (single network request)", async () => {
    let hits = 0;
    server.use(
      http.get(LAYER_URL, () => {
        hits++;
        return HttpResponse.json({ fields: sampleFields });
      }),
    );

    const [a, b] = await Promise.all([getArcgisFieldMetadata(LAYER_URL), getArcgisFieldMetadata(LAYER_URL)]);
    await getArcgisFieldMetadata(LAYER_URL);
    expect(hits).toBe(1);
    expect(a).toBe(b);
  });

  it("returns and caches null on HTTP failure", async () => {
    let hits = 0;
    server.use(
      http.get(LAYER_URL, () => {
        hits++;
        return new HttpResponse(null, { status: 500 });
      }),
    );

    expect(await getArcgisFieldMetadata(LAYER_URL)).toBeNull();
    expect(await getArcgisFieldMetadata(LAYER_URL)).toBeNull();
    expect(hits).toBe(1);
  });

  it("returns null on network error", async () => {
    server.use(http.get(LAYER_URL, () => HttpResponse.error()));
    expect(await getArcgisFieldMetadata(LAYER_URL)).toBeNull();
  });

  it("ignores query string when caching", async () => {
    server.use(http.get(LAYER_URL, () => HttpResponse.json({ fields: sampleFields })));
    const a = await getArcgisFieldMetadata(`${LAYER_URL}?f=json`);
    const b = await getArcgisFieldMetadata(LAYER_URL);
    expect(a).toBe(b);
  });
});
