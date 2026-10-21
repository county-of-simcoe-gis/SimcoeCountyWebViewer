import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { EsriJSON } from "ol/format";
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import type Feature from "ol/Feature";
import type { Projection } from "ol/proj";
import type { Extent } from "ol/extent";
import { buildEsriStyleFunction, type EsriRenderer } from "@/utils/esriSymbology";
import { buildQueryUrl, queryJSON, resolveToken, timeWhereClause } from "@/utils/openlayers/arcgisQuery";
import { TIME_VALUE_APPLIER_PROPERTY, type TimeValueApplier } from "@/utils/timeDimension";

const EPSG_3857 = "EPSG:3857";

export interface ArcGISFeatureLayerOptions {
  renderer?: EsriRenderer;
  // Omit to read the object id field, renderer and time field from the layer's metadata.
  objectIdField?: string;
  timeField?: string;
  // ISO timestamp of the time slice to load; undefined loads all features.
  timeValue?: string;
}

export interface ArcGISFeatureLayerInfo {
  objectIdField: string;
  renderer?: EsriRenderer;
  timeField?: string;
}

export async function fetchFeatureLayerInfo(layerUrl: string, secured: boolean): Promise<ArcGISFeatureLayerInfo> {
  const token = await resolveToken(layerUrl, secured);
  const query = new URLSearchParams({ f: "json" });
  if (token) query.set("token", token);
  const response = await fetch(`${layerUrl.split("?")[0]}?${query.toString()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  const data = (await response.json()) as {
    objectIdField?: string;
    drawingInfo?: { renderer?: EsriRenderer };
    timeInfo?: { startTimeField?: string };
    error?: { message?: string };
  };
  if (data.error) throw new Error(data.error.message ?? "ArcGIS layer metadata request failed");
  return {
    objectIdField: data.objectIdField || "OBJECTID",
    renderer: data.drawingInfo?.renderer,
    timeField: data.timeInfo?.startTimeField || undefined,
  };
}

/** Fetches every feature intersecting the envelope (in `wkid`), paging by resultOffset. */
async function fetchFeaturesInExtent(layerUrl: string, secured: boolean, extent: Extent, wkid: string, objectIdField: string, where: string): Promise<Feature[]> {
  const token = await resolveToken(layerUrl, secured);
  const features: Feature[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const data = await queryJSON(
      buildQueryUrl(
        layerUrl,
        {
          where,
          outFields: "*",
          geometry: extent.join(","),
          geometryType: "esriGeometryEnvelope",
          inSR: wkid,
          spatialRel: "esriSpatialRelIntersects",
          outSR: "3857",
          orderByFields: objectIdField,
          resultOffset: String(offset),
        },
        token,
      ),
    );
    const rawCount = data.features?.length ?? 0;
    const page = new EsriJSON().readFeatures(data, { dataProjection: EPSG_3857, featureProjection: EPSG_3857 });
    features.push(...page);
    offset += rawCount;
    hasMore = data.exceededTransferLimit === true && rawCount > 0;
  }

  return features;
}

/**
 * Vector layer for a single ArcGIS feature layer. Features are re-queried for each map extent
 * (bbox strategy); ids come from the object id field so overlapping loads don't duplicate features.
 */
export function createArcGISFeatureLayer(layerUrl: string, secured: boolean, options: ArcGISFeatureLayerOptions = {}): VectorLayer<VectorSource> {
  const styleFor = (renderer?: EsriRenderer) => (renderer && (renderer.type === "simple" || renderer.type === "uniqueValue") ? buildEsriStyleFunction(renderer) : undefined);

  let infoPromise: Promise<ArcGISFeatureLayerInfo> | undefined;
  const getInfo = (): Promise<ArcGISFeatureLayerInfo> => {
    if (options.objectIdField !== undefined) return Promise.resolve({ objectIdField: options.objectIdField, renderer: options.renderer, timeField: options.timeField });
    infoPromise ??= fetchFeatureLayerInfo(layerUrl, secured)
      .then((info) => {
        if (!options.renderer) olLayer.setStyle(styleFor(info.renderer));
        return info;
      })
      .catch((error: unknown) => {
        infoPromise = undefined;
        throw error;
      });
    return infoPromise;
  };

  let activeTime = options.timeValue;
  const source = new VectorSource({
    strategy: bboxStrategy,
    loader: function (this: VectorSource, extent: Extent, _resolution: number, projection: Projection) {
      const wkid = projection.getCode().replace(/^EPSG:/, "");
      const requestedTime = activeTime;
      return getInfo()
        .then((info) => {
          const where = info.timeField && requestedTime ? timeWhereClause(info.timeField, requestedTime) : "1=1";
          return fetchFeaturesInExtent(layerUrl, secured, extent, wkid, info.objectIdField, where).then((features) => {
            // A time change during the request makes these features stale.
            if (requestedTime !== activeTime) return [];
            return features.filter((feature) => {
              const id = feature.get(info.objectIdField);
              if (id === undefined || id === null) return true;
              feature.setId(id);
              return !this.getFeatureById(id);
            });
          });
        })
        .catch((error: unknown) => {
          console.error("Error loading ArcGIS feature layer features:", error);
          throw error;
        });
    },
  });

  const olLayer = new VectorLayer({ source, style: styleFor(options.renderer) });
  // Refreshing the source makes the bbox strategy reload the new time slice.
  const applyTimeValue: TimeValueApplier = (value) => {
    activeTime = value;
    source.refresh();
  };
  olLayer.set(TIME_VALUE_APPLIER_PROPERTY, applyTimeValue);
  return olLayer;
}
