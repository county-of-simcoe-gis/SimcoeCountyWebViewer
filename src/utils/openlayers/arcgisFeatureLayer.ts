import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { EsriJSON } from "ol/format";
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import type Feature from "ol/Feature";
import type { Projection } from "ol/proj";
import type { Extent } from "ol/extent";
import { Style, Fill, Stroke, Text } from "ol/style";
import type { FeatureLike } from "ol/Feature";
import type { StyleFunction } from "ol/style/Style";
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
  // Attribute drawn as text on each feature; omit for no labels.
  labelField?: string;
}

export interface ArcGISFeatureLayerInfo {
  objectIdField: string;
  renderer?: EsriRenderer;
  timeField?: string;
  fieldNames?: string[];
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
    fields?: Array<{ name?: string }>;
    error?: { message?: string };
  };
  if (data.error) throw new Error(data.error.message ?? "ArcGIS layer metadata request failed");
  return {
    objectIdField: data.objectIdField || "OBJECTID",
    renderer: data.drawingInfo?.renderer,
    timeField: data.timeInfo?.startTimeField || undefined,
    fieldNames: data.fields?.map((field) => field.name ?? ""),
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

type StyleResult = Style | Style[] | void;

const LABEL_FONT = "12px sans-serif";

function toStyleArray(result: StyleResult): Style[] {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

const TEMPLATE_PLACEHOLDER = /\[([^\]]+)\]/g;

/** Field names used by a label setting: "[A] km/h [B]" gives ["A", "B"]; a bare name gives itself. */
function getLabelFields(labelField: string): string[] {
  if (!labelField.includes("[")) return [labelField.trim()];
  return [...labelField.matchAll(TEMPLATE_PLACEHOLDER)].map((match) => match[1].trim());
}

function attributeText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function formatLabel(labelField: string, feature: FeatureLike): string {
  if (!labelField.includes("[")) return attributeText(feature.get(labelField));
  return labelField.replace(TEMPLATE_PLACEHOLDER, (_placeholder: string, name: string) => attributeText(feature.get(name.trim())));
}

function buildLabelStyleFunction(labelField: string): StyleFunction {
  return (feature: FeatureLike) => {
    const text = formatLabel(labelField, feature).trim();
    if (!text) return undefined;
    return new Style({
      text: new Text({
        text,
        font: LABEL_FONT,
        fill: new Fill({ color: "#000000" }),
        stroke: new Stroke({ color: "#ffffff", width: 3 }),
        offsetY: -12,
      }),
    });
  };
}

/** Draws the renderer symbol and the label text as one style array. */
function combineStyles(rendererStyle: StyleFunction | undefined, labelStyle: StyleFunction | undefined): StyleFunction | undefined {
  if (!labelStyle) return rendererStyle;
  return (feature, resolution) => [...toStyleArray(rendererStyle?.(feature, resolution)), ...toStyleArray(labelStyle(feature, resolution))];
}

/**
 * Vector layer for a single ArcGIS feature layer. Features are re-queried for each map extent
 * (bbox strategy); ids come from the object id field so overlapping loads don't duplicate features.
 */
export function createArcGISFeatureLayer(layerUrl: string, secured: boolean, options: ArcGISFeatureLayerOptions = {}): VectorLayer<VectorSource> {
  const labelStyle = options.labelField ? buildLabelStyleFunction(options.labelField) : undefined;
  const styleFor = (renderer?: EsriRenderer) =>
    combineStyles(renderer && (renderer.type === "simple" || renderer.type === "uniqueValue" || renderer.type === "classBreaks") ? buildEsriStyleFunction(renderer) : undefined, labelStyle);

  let infoPromise: Promise<ArcGISFeatureLayerInfo> | undefined;
  const getInfo = (): Promise<ArcGISFeatureLayerInfo> => {
    if (options.objectIdField !== undefined) return Promise.resolve({ objectIdField: options.objectIdField, renderer: options.renderer, timeField: options.timeField });
    infoPromise ??= fetchFeatureLayerInfo(layerUrl, secured)
      .then((info) => {
        if (!options.renderer) olLayer.setStyle(styleFor(info.renderer));
        if (options.labelField && info.fieldNames) {
          const missing = getLabelFields(options.labelField).filter((name) => !info.fieldNames?.includes(name));
          if (missing.length > 0) console.warn(`[arcgisFeatureLayer] labelField references missing field(s) ${missing.join(", ")} in ${layerUrl}`);
        }
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
