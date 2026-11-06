import { queryFeaturesByAttribute } from "@/utils/geoServerClient";
import { getComponentConfig } from "@/utils/config";
import localConfig from "./config.json";

export const ZONING_LABELS = {
  title: "Zoning",
  resultsHeading: "Zoning Results",
  emptyMessage: "Perform a search to see zoning results.",
  bylawLink: "Zoning Bylaw",
  hasRow: "Has Zoning",
  viewAction: "View Zoning",
  reportPrefix: "Zoning",
};

export const PRECINCT_LABELS = {
  title: "Precinct",
  resultsHeading: "Precinct Results",
  emptyMessage: "Perform a search to see precinct results.",
  bylawLink: "Precinct By-law",
  hasRow: "Has Precinct",
  viewAction: "View Precinct",
  reportPrefix: "Precinct",
};

export function isPrecinct(zoneType: unknown): boolean {
  return typeof zoneType === "string" && zoneType.trim().toUpperCase() === "PRECINCT";
}

export function getZoningLabels(zoneType: unknown) {
  return isPrecinct(zoneType) ? PRECINCT_LABELS : ZONING_LABELS;
}

/** Looks up the zone_type of the zoning feature for a parcel; undefined when not found or on error. */
export async function fetchZoneTypeByArn(arn: string): Promise<string | undefined> {
  const base = localConfig.queryLayers[0];
  let serviceUrl: string = base.serviceUrl;
  let layerName: string = base.layerName;

  const entry = getComponentConfig("themes", "Zoning");
  if (entry?.config) {
    try {
      const overrides = typeof entry.config === "string" ? JSON.parse(entry.config) : entry.config;
      const first = Array.isArray(overrides?.queryLayers) ? overrides.queryLayers[0] : undefined;
      if (first?.serviceUrl) serviceUrl = first.serviceUrl;
      if (first?.layerName) layerName = first.layerName;
    } catch {
      /* use defaults */
    }
  }

  try {
    const result = await queryFeaturesByAttribute({ serviceUrl, layerName, attributeName: "arn", attributeValue: arn, maxFeatures: 1 });
    const value = result.features?.[0]?.properties?.zone_type;
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}
