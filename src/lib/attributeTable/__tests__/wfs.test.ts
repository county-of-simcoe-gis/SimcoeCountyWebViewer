import { describe, it, expect } from "vitest";
import { parseFeatureTypeSchema, pickImplicitSortField, WfsPrimaryKeyError, fetchWfsCount } from "@/lib/attributeTable/wfs";

const SAMPLE_XSD = `<?xml version="1.0" encoding="UTF-8"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:gml="http://www.opengis.net/gml/3.2" elementFormDefault="qualified" targetNamespace="http://opengis.simcoe.ca">
  <xsd:complexType name="parcelsType">
    <xsd:complexContent>
      <xsd:extension base="gml:AbstractFeatureType">
        <xsd:sequence>
          <xsd:element maxOccurs="1" minOccurs="0" name="geom" nillable="true" type="gml:MultiPolygonPropertyType"/>
          <xsd:element maxOccurs="1" minOccurs="0" name="ARN" nillable="false" type="xsd:string"/>
          <xsd:element maxOccurs="1" minOccurs="0" name="AREA_SQM" nillable="true" type="xsd:double"/>
          <xsd:element maxOccurs="1" minOccurs="0" name="OBJECTID" nillable="false" type="xsd:int"/>
          <xsd:element maxOccurs="1" minOccurs="0" name="CREATED" nillable="true" type="xsd:dateTime"/>
          <xsd:element maxOccurs="1" minOccurs="0" name="ACTIVE" nillable="true" type="xsd:boolean"/>
        </xsd:sequence>
      </xsd:extension>
    </xsd:complexContent>
  </xsd:complexType>
</xsd:schema>`;

describe("parseFeatureTypeSchema", () => {
  it("parses XSD types correctly", () => {
    const fields = parseFeatureTypeSchema(SAMPLE_XSD);
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));

    expect(byName.geom.isGeometry).toBe(true);
    expect(byName.ARN).toMatchObject({ type: "string", nillable: false, isGeometry: false });
    expect(byName.AREA_SQM).toMatchObject({ type: "number", nillable: true });
    expect(byName.OBJECTID).toMatchObject({ type: "number", nillable: false });
    expect(byName.CREATED).toMatchObject({ type: "date", nillable: true });
    expect(byName.ACTIVE).toMatchObject({ type: "boolean", nillable: true });
  });
});

describe("pickImplicitSortField", () => {
  it("prefers an id-like non-nullable attribute", () => {
    const fields = parseFeatureTypeSchema(SAMPLE_XSD);
    expect(pickImplicitSortField(fields)).toBe("OBJECTID");
  });

  it("returns null when no PK-like column exists (layer must be fetched unpaged)", () => {
    const xml = SAMPLE_XSD.replace('name="OBJECTID"', 'name="FOOBAR"');
    const fields = parseFeatureTypeSchema(xml);
    expect(pickImplicitSortField(fields)).toBeNull();
  });

  it("returns null for a geometry-only feature type", () => {
    const xml = `<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:gml="http://www.opengis.net/gml/3.2">
      <xsd:element name="geom" type="gml:PointPropertyType"/>
    </xsd:schema>`;
    const fields = parseFeatureTypeSchema(xml);
    expect(pickImplicitSortField(fields)).toBeNull();
  });
});

describe("PK error detection", () => {
  it("surfaces WfsPrimaryKeyError from a GeoServer exception report", async () => {
    const exceptionXml = `<?xml version="1.0" encoding="UTF-8"?>
<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows/1.1" version="2.0.0">
  <ows:Exception exceptionCode="NoApplicableCode">
    <ows:ExceptionText>java.lang.RuntimeExceptionCannot do natural order without a primary key, please add it or specify a manual sort over existing attributes</ows:ExceptionText>
  </ows:Exception>
</ows:ExceptionReport>`;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(exceptionXml, {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      })) as typeof fetch;

    try {
      await expect(
        fetchWfsCount({
          wfsUrl: "https://example.com/geoserver/wfs",
          layerName: "simcoe:parcels",
        }),
      ).rejects.toBeInstanceOf(WfsPrimaryKeyError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
