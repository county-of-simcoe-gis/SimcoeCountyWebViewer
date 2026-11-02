import { queryFeature } from "@/utils/geoServerClient";

export type FeatureReportType = "REALESTATE" | "FORESTRY" | "CHILDCARE";

export type FeatureReportProps = Record<string, string | number | null | undefined>;

// Public GeoServer WFS endpoint used by the legacy feature reports app.
export const FEATURE_REPORT_WFS_URL = "https://opengis.simcoe.ca/geoserver/wfs";

const FEATURE_REPORT_LAYERS: Record<FeatureReportType, { layerName: string; idField: string; numericId: boolean }> = {
  REALESTATE: { layerName: "simcoe:Local_Real_Estate_Points_Feature_Reports", idField: "mlsno", numericId: true },
  FORESTRY: { layerName: "simcoe:Forest_Tracts_Feature_Reports", idField: "Tract", numericId: false },
  CHILDCARE: { layerName: "simcoe:Child_Care_Facilities_Feature_Reports", idField: "name", numericId: false },
};

export function isFeatureReportType(value: string | null): value is FeatureReportType {
  return value !== null && Object.prototype.hasOwnProperty.call(FEATURE_REPORT_LAYERS, value);
}

/** Returns null when the ID is not valid for the report type. */
export function buildFeatureReportFilter(type: FeatureReportType, id: string): string | null {
  const { idField, numericId } = FEATURE_REPORT_LAYERS[type];
  if (numericId) {
    return /^\d+$/.test(id) ? `${idField}=${id}` : null;
  }
  return `${idField}='${id.replace(/'/g, "''")}'`;
}

/** Returns the feature properties, or null when no feature matches. */
export async function fetchFeatureReport(type: FeatureReportType, id: string): Promise<FeatureReportProps | null> {
  const cqlFilter = buildFeatureReportFilter(type, id);
  if (!cqlFilter) return null;

  const result = await queryFeature({
    serviceUrl: FEATURE_REPORT_WFS_URL,
    layerName: FEATURE_REPORT_LAYERS[type].layerName,
    cqlFilter,
    maxFeatures: 1,
  });

  return (result.feature?.properties as FeatureReportProps | null | undefined) ?? null;
}
