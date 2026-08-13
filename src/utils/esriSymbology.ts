/**
 * Converts Esri REST "drawingInfo.renderer" JSON (from an ArcGIS FeatureServer/MapServer layer)
 * into an OpenLayers style, so client-side vector layers (rendered from GeoJSON, e.g. for
 * editing/selection) reflect the symbology actually configured on the FeatureServer instead of a
 * hardcoded client-side color. Unlike the TOC/theme ArcGIS layers (which render server-side via
 * ImageArcGISRest/TileArcGISRest and never need this)
 *
 * Legend swatches are ALSO derived from this same renderer JSON (`buildEsriLegendItems`) rather
 * than the ArcGIS `/legend` endpoint used by TOC/ThemeServiceToggler: some secured editing
 * FeatureServers sit behind a gateway that only allow-lists a small set of routes
 * (query/addFeatures/updateFeatures/deleteFeatures/layer-info), and `/legend` isn't one of them
 * (returns a generic "Invalid URL" error regardless of token). Deriving the legend from the
 * renderer we already fetch for styling also guarantees the swatch visually matches what's
 * actually drawn on the map.
 *
 * Supports the renderer/symbol shapes returned by secured editing FeatureServer layers
 * (simple + uniqueValue renderers; esriSLS line symbols and esriPMS picture-marker symbols), plus
 * a best-effort fallback for esriSMS/esriSFS. Scale-dependent sizing (`visualVariables` of type
 * "sizeInfo") is approximated by converting the OL render resolution to an Esri map scale
 * (96 DPI assumption) and linearly interpolating between the configured stops.
 */
import { Style, Stroke, Fill, Icon, Circle as CircleStyle } from "ol/style";
import type { FeatureLike } from "ol/Feature";
import type { StyleFunction } from "ol/style/Style";
import { fetchArcGISService } from "@/utils/tocHelpers";

type EsriColor = number[]; // [r, g, b, a?] (a is 0-255)

export interface EsriSimpleLineSymbol {
  type: "esriSLS";
  style?: string;
  color: EsriColor;
  width: number;
}

export interface EsriSimpleFillSymbol {
  type: "esriSFS";
  color: EsriColor;
  outline?: EsriSimpleLineSymbol;
}

export interface EsriSimpleMarkerSymbol {
  type: "esriSMS";
  style?: string;
  color: EsriColor;
  size: number;
  outline?: { color: EsriColor; width: number };
}

export interface EsriPictureMarkerSymbol {
  type: "esriPMS";
  imageData: string;
  contentType?: string;
  width: number;
  height: number;
  angle?: number;
  xoffset?: number;
  yoffset?: number;
}

export type EsriSymbol = EsriSimpleLineSymbol | EsriSimpleFillSymbol | EsriSimpleMarkerSymbol | EsriPictureMarkerSymbol;

interface EsriSizeStop {
  size: number;
  value: number;
}

interface EsriSizeInfoVisualVariable {
  type: "sizeInfo";
  stops: EsriSizeStop[];
}

type EsriVisualVariable = EsriSizeInfoVisualVariable | { type: string };

export interface EsriSimpleRenderer {
  type: "simple";
  symbol: EsriSymbol;
  visualVariables?: EsriVisualVariable[];
}

export interface EsriUniqueValueInfo {
  value: string;
  label?: string;
  symbol: EsriSymbol;
}

export interface EsriUniqueValueRenderer {
  type: "uniqueValue";
  field1: string;
  field2?: string;
  field3?: string;
  fieldDelimiter?: string;
  uniqueValueInfos: EsriUniqueValueInfo[];
  defaultSymbol?: EsriSymbol;
  visualVariables?: EsriVisualVariable[];
}

export type EsriRenderer = EsriSimpleRenderer | EsriUniqueValueRenderer;

export interface EsriValueOption {
  value: string;
  label: string;
}

/** Extracts the valid value/label pairs for `field` from a "uniqueValue" renderer's
 * `uniqueValueInfos` — the only place this FeatureServer defines domain-like values for a field
 * (all `fields[].domain` entries in the service schema are null; no true ArcGIS coded-value
 * domains exist). Returns `[]` for a "simple" renderer or when `field` doesn't match the
 * renderer's `field1`, so callers can fall back to a hardcoded option list. */
export function getUniqueValueOptions(renderer: EsriRenderer | null | undefined, field: string): EsriValueOption[] {
  if (!renderer || renderer.type !== "uniqueValue" || renderer.field1 !== field) return [];
  return renderer.uniqueValueInfos.map((info) => ({ value: info.value, label: info.label || info.value }));
}

export function esriColorToRgba(color?: EsriColor): string {
  if (!color || color.length < 3) return "rgba(255,0,0,1)";
  const [r, g, b, a = 255] = color;
  return `rgba(${r},${g},${b},${a / 255})`;
}

export function esriLineDash(style?: string, width = 1): number[] | undefined {
  switch (style) {
    case "esriSLSDash":
      return [6 * width, 5 * width];
    case "esriSLSDashDot":
      return [4 * width, 2 * width, 1, 2 * width];
    case "esriSLSDot":
      return [1, 2 * width];
    case "esriSLSDashDotDot":
      return [4 * width, 2 * width, 1, 2 * width, 1, 2 * width];
    default:
      return undefined;
  }
}

const DPI = 96;
const INCHES_PER_METER = 39.3701;

/** Converts an OL render resolution (map units/px, meters for EPSG:3857) to an Esri map scale. */
function resolutionToEsriScale(resolution: number): number {
  return resolution * DPI * INCHES_PER_METER;
}

function getSizeInfo(visualVariables?: EsriVisualVariable[]): EsriSizeInfoVisualVariable | undefined {
  return visualVariables?.find((v): v is EsriSizeInfoVisualVariable => v.type === "sizeInfo" && Array.isArray((v as EsriSizeInfoVisualVariable).stops));
}

function interpolateSize(stops: EsriSizeStop[], scale: number): number {
  const sorted = [...stops].sort((a, b) => a.value - b.value);
  if (sorted.length === 0) return 1;
  if (scale <= sorted[0].value) return sorted[0].size;
  const last = sorted[sorted.length - 1];
  if (scale >= last.value) return last.size;

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    if (scale >= cur.value && scale <= next.value) {
      const t = (scale - cur.value) / (next.value - cur.value);
      return cur.size + t * (next.size - cur.size);
    }
  }
  return last.size;
}

/** Resolves the scaled "size" (px) for a symbol at the given resolution, or undefined if the
 * renderer has no sizeInfo visual variable (caller should fall back to the symbol's own size). */
function resolveScaledSize(visualVariables: EsriVisualVariable[] | undefined, resolution: number): number | undefined {
  const sizeInfo = getSizeInfo(visualVariables);
  if (!sizeInfo) return undefined;
  const scale = resolutionToEsriScale(resolution);
  return interpolateSize(sizeInfo.stops, scale);
}

function buildStyleForSymbol(symbol: EsriSymbol | undefined, visualVariables: EsriVisualVariable[] | undefined, resolution: number): Style {
  if (!symbol) return new Style({ stroke: new Stroke({ color: "rgba(255,0,0,1)", width: 2 }) });

  switch (symbol.type) {
    case "esriSLS": {
      const width = resolveScaledSize(visualVariables, resolution) ?? symbol.width;
      return new Style({
        stroke: new Stroke({
          color: esriColorToRgba(symbol.color),
          width,
          lineDash: esriLineDash(symbol.style, 1),
        }),
      });
    }
    case "esriSFS": {
      const outline = symbol.outline;
      return new Style({
        fill: new Fill({ color: esriColorToRgba(symbol.color) }),
        stroke: outline
          ? new Stroke({
              color: esriColorToRgba(outline.color),
              width: outline.width,
              lineDash: esriLineDash(outline.style, 1),
            })
          : undefined,
      });
    }
    case "esriSMS": {
      const radius = (resolveScaledSize(visualVariables, resolution) ?? symbol.size) / 2;
      return new Style({
        image: new CircleStyle({
          radius,
          fill: new Fill({ color: esriColorToRgba(symbol.color) }),
          stroke: symbol.outline ? new Stroke({ color: esriColorToRgba(symbol.outline.color), width: symbol.outline.width }) : undefined,
        }),
      });
    }
    case "esriPMS": {
      const targetHeight = resolveScaledSize(visualVariables, resolution) ?? symbol.height;
      const scale = symbol.height ? targetHeight / symbol.height : 1;
      return new Style({
        image: new Icon({
          src: `data:${symbol.contentType ?? "image/png"};base64,${symbol.imageData}`,
          rotation: symbol.angle ? (symbol.angle * Math.PI) / 180 : 0,
          scale,
        }),
      });
    }
    default:
      return new Style({ stroke: new Stroke({ color: "rgba(255,0,0,1)", width: 2 }) });
  }
}

/** Builds an OL style function from an Esri renderer, supporting "simple" and "uniqueValue" types. */
export function buildEsriStyleFunction(renderer: EsriRenderer): StyleFunction {
  if (renderer.type === "simple") {
    const { symbol, visualVariables } = renderer;
    return (_feature: FeatureLike, resolution: number) => buildStyleForSymbol(symbol, visualVariables, resolution);
  }

  // uniqueValue
  const { field1, uniqueValueInfos, defaultSymbol, visualVariables } = renderer;
  const symbolByValue = new Map<string, EsriSymbol>();
  uniqueValueInfos.forEach((info) => symbolByValue.set(info.value, info.symbol));

  return (feature: FeatureLike, resolution: number) => {
    const value = String(feature.get(field1) ?? "");
    const symbol = symbolByValue.get(value) ?? defaultSymbol ?? uniqueValueInfos[0]?.symbol;
    return buildStyleForSymbol(symbol, visualVariables, resolution);
  };
}

/** Fetches `drawingInfo.renderer` for a single FeatureServer/MapServer layer, reusing the shared
 * `fetchArcGISService` helper (same query-param token convention as the rest of the app's ArcGIS
 * reads). */
export async function fetchEsriRenderer(serverUrl: string, layerId: number, token?: string): Promise<EsriRenderer | null> {
  const base = serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl;

  try {
    const json = await fetchArcGISService(`${base}/${layerId}`, !!token, token);
    const drawingInfo = json?.drawingInfo as { renderer?: EsriRenderer } | undefined;
    return drawingInfo?.renderer ?? null;
  } catch (error) {
    console.error(`[esriSymbology] Error fetching renderer for layer ${layerId} from ${base}:`, error);
    return null;
  }
}

interface EsriCodedValue {
  code: string;
  name: string;
}

interface EsriFieldDomain {
  type: string;
  codedValues?: EsriCodedValue[];
}

interface EsriLayerField {
  name: string;
  domain?: EsriFieldDomain | null;
}

/** Fetches the layer's `fields[].domain.codedValues` for every field that has a true ArcGIS
 * coded-value domain (as opposed to values only implied by a "uniqueValue" renderer, see
 * `getUniqueValueOptions` above), keyed by the field's (lowercase) name. Reuses the same
 * `fetchArcGISService` layer-JSON call as `fetchEsriRenderer`. Returns `{}` on fetch failure so
 * callers can fall back to hardcoded option lists. */
export async function fetchEsriFieldDomains(serverUrl: string, layerId: number, token?: string): Promise<Record<string, EsriValueOption[]>> {
  const base = serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl;

  try {
    const json = await fetchArcGISService(`${base}/${layerId}`, !!token, token);
    const fields = (json?.fields as EsriLayerField[] | undefined) ?? [];
    const domainsByField: Record<string, EsriValueOption[]> = {};

    fields.forEach((field) => {
      if (field.domain?.type === "codedValue" && Array.isArray(field.domain.codedValues)) {
        domainsByField[field.name] = field.domain.codedValues.map((codedValue) => ({ value: codedValue.code, label: codedValue.name }));
      }
    });

    return domainsByField;
  } catch (error) {
    console.error(`[esriSymbology] Error fetching field domains for layer ${layerId} from ${base}:`, error);
    return {};
  }
}

export interface EsriLegendItem {
  label: string;
  imageDataUrl: string;
}

/** Renders a single Esri symbol to a small swatch image. Picture markers already ARE an image
 * (their raw imageData is returned as-is); line/fill/marker symbols are drawn onto a canvas using
 * the exact color/width/dash the map style itself uses (see buildStyleForSymbol above), so the
 * swatch always matches what's actually rendered on the map. */
function renderEsriSymbolSwatch(symbol: EsriSymbol | undefined, size = 20): string {
  if (!symbol) return "";
  if (symbol.type === "esriPMS") {
    return `data:${symbol.contentType ?? "image/png"};base64,${symbol.imageData}`;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  if (symbol.type === "esriSLS") {
    ctx.strokeStyle = esriColorToRgba(symbol.color);
    ctx.lineWidth = Math.min(symbol.width, 6) || 2;
    const dash = esriLineDash(symbol.style, 1);
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(2, size / 2);
    ctx.lineTo(size - 2, size / 2);
    ctx.stroke();
  } else if (symbol.type === "esriSFS") {
    ctx.fillStyle = esriColorToRgba(symbol.color);
    ctx.fillRect(2, 2, size - 4, size - 4);
    if (symbol.outline) {
      ctx.strokeStyle = esriColorToRgba(symbol.outline.color);
      ctx.lineWidth = symbol.outline.width || 1;
      ctx.strokeRect(2, 2, size - 4, size - 4);
    }
  } else if (symbol.type === "esriSMS") {
    const radius = Math.min(symbol.size, size - 4) / 2 || 4;
    ctx.fillStyle = esriColorToRgba(symbol.color);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.fill();
    if (symbol.outline) {
      ctx.strokeStyle = esriColorToRgba(symbol.outline.color);
      ctx.lineWidth = symbol.outline.width || 1;
      ctx.stroke();
    }
  }

  return canvas.toDataURL("image/png");
}

/** Builds legend swatches directly from the renderer JSON: one entry for a "simple" renderer, or
 * one entry per uniqueValueInfo for a "uniqueValue" renderer. */
export function buildEsriLegendItems(renderer: EsriRenderer, size = 20): EsriLegendItem[] {
  if (renderer.type === "simple") {
    return [{ label: "", imageDataUrl: renderEsriSymbolSwatch(renderer.symbol, size) }];
  }

  return renderer.uniqueValueInfos.map((info) => ({
    label: info.label || info.value,
    imageDataUrl: renderEsriSymbolSwatch(info.symbol, size),
  }));
}
