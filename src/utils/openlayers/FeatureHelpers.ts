import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { Projection } from "ol/proj";
import VectorTileSource from "ol/source/VectorTile";
import { GeoTIFF } from "ol/source";
import Map from "ol/Map";

// Global window interface for map access
declare global {
  interface Window {
    map?: Map;
  }
}
import { GML, GPX, KML, EsriJSON, GeoJSON, TopoJSON, IGC, Polyline, WKT, MVT } from "ol/format";

import { OL_DATA_TYPES, OLDataType } from "@/utils/openlayers/types";

export class FeatureHelpers {
  /**
   * Get vector format instance for the specified format type
   * @param format - The format type
   * @param projection - The projection (default: EPSG:3857)
   * @returns Format instance or undefined
   */
  static getVectorFormat(format: OLDataType, projection = "EPSG:3857") {
    switch (format) {
      case OL_DATA_TYPES.GML3:
        return new GML({ srsName: projection });
      case OL_DATA_TYPES.GML2:
        return new GML({ srsName: projection });
      case OL_DATA_TYPES.GPX:
        return new GPX();
      case OL_DATA_TYPES.KML:
        return new KML({ extractStyles: true, showPointNames: true });
      case OL_DATA_TYPES.OSMXML:
        // OSMXML format is deprecated in newer OpenLayers versions
        return undefined;
      case OL_DATA_TYPES.EsriJSON:
        return new EsriJSON();
      case OL_DATA_TYPES.GeoJSON:
        return new GeoJSON();
      case OL_DATA_TYPES.TopoJSON:
        return new TopoJSON();
      case OL_DATA_TYPES.IGC:
        return new IGC();
      case OL_DATA_TYPES.Polyline:
        return new Polyline();
      case OL_DATA_TYPES.WKT:
        return new WKT();
      case OL_DATA_TYPES.MVT:
        return new MVT();
      case OL_DATA_TYPES.VectorTile:
        return new VectorTileSource({ format: new MVT() });
      case OL_DATA_TYPES.GeoTIFF:
        return new GeoTIFF({ sources: [] });
      default:
        return undefined;
    }
  }

  /**
   * Convert features to specified format
   * @param features - Array of features to convert
   * @param targetFormat - Target format type
   * @param dataProjection - Data projection
   * @param featureProjection - Feature projection
   * @returns Converted features string or undefined
   */
  static setFeatures(
    features: Feature<Geometry>[],
    targetFormat: OLDataType = OL_DATA_TYPES.GeoJSON,
    dataProjection: Projection | string | null = null,
    featureProjection: Projection | string | null = null,
  ): string | undefined {
    if (features.length === 0) return undefined;

    // Get map projection from global map instance (matches old app's OLHelpers)
    const mapProjection = featureProjection || window.map?.getView().getProjection();
    const parser = this.getVectorFormat(targetFormat);

    if (!parser || !("writeFeatures" in parser)) {
      console.error("Invalid format parser for writing features");
      return undefined;
    }

    let output: string | undefined;
    try {
      // Only include dataProjection when explicitly provided.
      // Otherwise, omit it so OL's adaptOptions uses the format's built-in default
      // (e.g. KML defaults to EPSG:4326, GeoJSON defaults to EPSG:4326).
      // NOTE: passing null/undefined OVERWRITES the default via Object.assign,
      // so we must omit the key entirely.
      const writeOptions: Record<string, unknown> = {
        featureProjection: mapProjection,
      };
      if (dataProjection) {
        writeOptions.dataProjection = dataProjection;
      }

      const result = parser.writeFeatures(features, writeOptions);
      output = typeof result === "string" ? result : undefined;
    } catch (err) {
      console.error("Error converting features:", err);
      // Note: showMessage function would need to be imported from helpers
      // helpers.showMessage("Error", "Unsupported Feature.", helpers.messageColors.red);
    }
    return output;
  }

  /**
   * Parse features from specified format
   * @param featuresData - Features data to parse
   * @param sourceFormat - Source format type
   * @param projection - Source projection
   * @returns Array of parsed features or undefined
   */
  static getFeatures(featuresData: string, sourceFormat: OLDataType = OL_DATA_TYPES.GeoJSON, projection = "EPSG:3857"): Feature<Geometry>[] | undefined {
    if (!featuresData || featuresData.length === 0) return undefined;

    // Get map projection: prefer map instance, then default EPSG:3857
    const mapProjection = window.map?.getView().getProjection() || "EPSG:3857";
    const parser = this.getVectorFormat(sourceFormat, projection);

    if (!parser || !("readFeatures" in parser)) {
      console.error("Invalid format parser for reading features");
      return undefined;
    }

    let output: Feature<Geometry>[] | undefined;
    try {
      output = parser.readFeatures(featuresData as unknown as ArrayBuffer, {
        dataProjection: projection,
        featureProjection: mapProjection,
      }) as Feature<Geometry>[];
    } catch (err) {
      console.error("Error parsing features:", err);
      // Note: showMessage function would need to be imported from helpers
      // helpers.showMessage("Error", "Unsupported Feature.", helpers.messageColors.red);
    }
    return output;
  }

  /**
   * Convert geometry to specified format
   * @param sourceGeometry - Source geometry
   * @param targetFormat - Target format type
   * @returns Converted geometry string or undefined
   */
  static setGeometry(sourceGeometry: Geometry, targetFormat: OLDataType = OL_DATA_TYPES.GeoJSON): string | undefined {
    const parser = this.getVectorFormat(targetFormat);

    if (!parser || !("writeGeometry" in parser)) {
      console.error("Invalid format parser for writing geometry");
      return undefined;
    }

    let output: string | undefined;
    try {
      output = parser.writeGeometry(sourceGeometry) as string;
    } catch (err) {
      console.error("Error converting geometry:", err);
      // Note: showMessage function would need to be imported from helpers
      // helpers.showMessage("Error", "Unsupported Geometry.", helpers.messageColors.red);
    }
    return output;
  }

  /**
   * Parse geometry from specified format
   * @param geometryData - Geometry data to parse
   * @param sourceFormat - Source format type
   * @returns Parsed geometry or undefined
   */
  static getGeometry(geometryData: string, sourceFormat: OLDataType = OL_DATA_TYPES.GeoJSON): Geometry | undefined {
    const parser = this.getVectorFormat(sourceFormat);

    if (!parser || !("readGeometry" in parser)) {
      console.error("Invalid format parser for reading geometry");
      return undefined;
    }

    let output: Geometry | undefined;
    try {
      output = parser.readGeometry(geometryData);
    } catch (err) {
      console.error("Error parsing geometry:", err);
      // Note: showMessage function would need to be imported from helpers
      // helpers.showMessage("Error", "Unsupported Geometry.", helpers.messageColors.red);
    }
    return output;
  }
}
