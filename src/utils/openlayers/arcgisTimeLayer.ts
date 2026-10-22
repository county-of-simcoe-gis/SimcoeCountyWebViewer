import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { EsriJSON } from "ol/format";
import { Fill, Style } from "ol/style";
import type Feature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import { TIME_VALUE_APPLIER_PROPERTY, type TimeValueApplier } from "@/utils/timeDimension";
import { buildQueryUrl, queryJSON, resolveToken, timeWhereClause } from "@/utils/openlayers/arcgisQuery";

export interface ArcGISClassBreakInfo {
  classMaxValue: number;
  symbol?: { type?: string; color?: number[] };
}

export interface ArcGISDrawingInfo {
  renderer?: { type?: string; field?: string; classBreakInfos?: ArcGISClassBreakInfo[] };
}

export interface ArcGISVectorTimeInfo {
  timeField: string;
  objectIdField: string;
  drawingInfo?: ArcGISDrawingInfo;
}

const EPSG_3857 = "EPSG:3857";
const DEFAULT_FILL = "rgba(255, 153, 0, 0.5)";

/** Distinct time values as ISO strings, ascending. */
export async function fetchArcGISTimeValues(layerUrl: string, timeField: string, secured: boolean): Promise<string[]> {
  const token = await resolveToken(layerUrl, secured);
  const data = await queryJSON(buildQueryUrl(layerUrl, { where: "1=1", outFields: timeField, returnDistinctValues: "true", returnGeometry: "false", orderByFields: timeField }, token));
  return (data.features ?? [])
    .map((feature) => Number(feature.attributes?.[timeField]))
    .filter(Number.isFinite)
    .map((epochMs) => new Date(epochMs).toISOString());
}

async function fetchFeaturesAt(layerUrl: string, timeInfo: ArcGISVectorTimeInfo, isoValue: string, secured: boolean): Promise<Feature[]> {
  const token = await resolveToken(layerUrl, secured);
  const where = timeWhereClause(timeInfo.timeField, isoValue);
  const features: Feature[] = [];
  let hasMore = true;

  while (hasMore) {
    const data = await queryJSON(buildQueryUrl(layerUrl, { where, outFields: "*", outSR: "3857", orderByFields: timeInfo.objectIdField, resultOffset: String(features.length) }, token));
    const page = new EsriJSON().readFeatures(data, { dataProjection: EPSG_3857, featureProjection: EPSG_3857 });
    features.push(...page);
    hasMore = data.exceededTransferLimit === true && page.length > 0;
  }

  return features;
}

function createClassBreakStyle(drawingInfo?: ArcGISDrawingInfo): (feature: FeatureLike) => Style | undefined {
  const renderer = drawingInfo?.renderer;
  const field = renderer?.field;
  const breaks = [...(renderer?.classBreakInfos ?? [])].sort((a, b) => a.classMaxValue - b.classMaxValue);
  const styles = breaks.map((classBreak) => {
    const [red = 0, green = 0, blue = 0, alpha = 255] = classBreak.symbol?.color ?? [];
    return new Style({ fill: new Fill({ color: `rgba(${red}, ${green}, ${blue}, ${alpha / 255})` }) });
  });
  const fallback = new Style({ fill: new Fill({ color: DEFAULT_FILL }) });

  return (feature) => {
    if (!field || breaks.length === 0) return fallback;
    const value = Number(feature.get(field));
    const index = breaks.findIndex((classBreak) => value <= classBreak.classMaxValue);
    return index === -1 ? undefined : styles[index];
  };
}

/**
 * Vector layer whose features are re-queried per time value. Exposes the applier via TIME_VALUE_APPLIER_PROPERTY.
 */
export function createArcGISTimeLayer(layerUrl: string, secured: boolean, timeInfo: ArcGISVectorTimeInfo): VectorLayer<VectorSource> {
  const source = new VectorSource();
  const olLayer = new VectorLayer({ source, style: createClassBreakStyle(timeInfo.drawingInfo) });
  const cache = new Map<string, Feature[]>();
  let requestedValue = "";

  const showFeatures = (features: Feature[]) => {
    source.clear();
    source.addFeatures(features);
  };

  const applyTimeValue: TimeValueApplier = (value) => {
    requestedValue = value;
    const cached = cache.get(value);
    if (cached) {
      showFeatures(cached);
      return;
    }
    fetchFeaturesAt(layerUrl, timeInfo, value, secured)
      .then((features) => {
        cache.set(value, features);
        if (requestedValue === value) showFeatures(features);
      })
      .catch((error: unknown) => console.error("Error loading ArcGIS time layer features:", error));
  };

  olLayer.set(TIME_VALUE_APPLIER_PROPERTY, applyTimeValue);
  return olLayer;
}
