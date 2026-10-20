import { describe, it, expect } from "vitest";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { getImportedStyleJSON, readFeaturesFromText } from "@/utils/myMapsHelpers";

const geoJsonPoint = JSON.stringify({
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: { name: "Site" }, geometry: { type: "Point", coordinates: [-79.5, 44.5] } }],
});

const kmlLine = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Site A</name>
<Style><LineStyle><color>ff0000ff</color><width>3</width></LineStyle></Style>
<LineString><coordinates>-79.5,44.5,0 -79.4,44.6,0</coordinates></LineString>
</Placemark></Document></kml>`;

describe("readFeaturesFromText", () => {
  it("reads GeoJSON points as EPSG:3857 coordinates", () => {
    const features = readFeaturesFromText(geoJsonPoint, "GeoJSON");

    expect(features).toHaveLength(1);
    expect(features[0].get("name")).toBe("Site");
    const coords = (features[0].getGeometry() as Point).getCoordinates();
    const expected = fromLonLat([-79.5, 44.5]);
    expect(coords[0]).toBeCloseTo(expected[0], 3);
    expect(coords[1]).toBeCloseTo(expected[1], 3);
  });

  it("splits MultiLineString geometries into single-part features", () => {
    const multi = JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [-79.5, 44.5],
            [-79.4, 44.6],
          ],
          [
            [-79.3, 44.5],
            [-79.2, 44.6],
          ],
        ],
      },
    });

    const features = readFeaturesFromText(multi, "GeoJSON");

    expect(features).toHaveLength(2);
    features.forEach((feature) => expect(feature.getGeometry()?.getType()).toBe("LineString"));
  });

  it("reads KML placemarks with name and style", () => {
    const features = readFeaturesFromText(kmlLine, "KML");

    expect(features).toHaveLength(1);
    expect(features[0].get("name")).toBe("Site A");
    expect(features[0].getGeometry()?.getType()).toBe("LineString");
    expect(getImportedStyleJSON(features[0]).stroke?.width).toBe(3);
  });

  it("reads EsriJSON in the declared spatial reference", () => {
    const esri = JSON.stringify({
      spatialReference: { wkid: 102100 },
      features: [{ attributes: { name: "Pt" }, geometry: { x: 1000000, y: 5000000, spatialReference: { wkid: 102100 } } }],
    });

    const features = readFeaturesFromText(esri, "EsriJSON");

    expect(features).toHaveLength(1);
    const coords = (features[0].getGeometry() as Point).getCoordinates();
    expect(coords[0]).toBeCloseTo(1000000, 3);
    expect(coords[1]).toBeCloseTo(5000000, 3);
  });

  it("assumes EPSG:3857 for EsriJSON without a spatial reference", () => {
    const esri = JSON.stringify({
      features: [{ attributes: {}, geometry: { x: 1000000, y: 5000000 } }],
    });

    const features = readFeaturesFromText(esri, "EsriJSON");

    const coords = (features[0].getGeometry() as Point).getCoordinates();
    expect(coords[0]).toBeCloseTo(1000000, 3);
    expect(coords[1]).toBeCloseTo(5000000, 3);
  });
});

describe("getImportedStyleJSON", () => {
  it("falls back to a renderable default for unstyled points", () => {
    const [feature] = readFeaturesFromText(geoJsonPoint, "GeoJSON");

    const style = getImportedStyleJSON(feature);

    expect(style.image?.type).toBe("circle");
    expect(style.text).toBeUndefined();
  });
});
