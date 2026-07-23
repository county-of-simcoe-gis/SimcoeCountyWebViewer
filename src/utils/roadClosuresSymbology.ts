import { Style, RegularShape, Fill } from "ol/style";
import type { FeatureLike } from "ol/Feature";
import type { StyleFunction } from "ol/style/Style";
import type { LineString } from "ol/geom";
import Point from "ol/geom/Point";
import { buildEsriStyleFunction, buildEsriLegendItems, esriColorToRgba, esriLineDash } from "@/utils/esriSymbology";
import type { EsriRenderer, EsriUniqueValueRenderer, EsriSimpleLineSymbol, EsriLegendItem } from "@/utils/esriSymbology";

const CLOSURE_DIRECTION_FIELD = "direction";
const ONE_DIRECTION = "One Direction";
const BOTH_DIRECTIONS = "Both Directions";
const LINE_STRING_GEOMETRY_TYPE = "LineString";

export interface ArrowEndpointConfig {
  /** Attribute field that determines how many arrowheads to draw. */
  directionField?: string;
  /** Values that should result in one or two arrowheads. */
  oneDirectionValues?: string[];
  bothDirectionsValues?: string[];
  /** Size of the arrowhead relative to the line stroke width. */
  sizeScale?: number;
  /** Minimum arrowhead radius in pixels. */
  minSize?: number;
}

function defaultConfig(config?: ArrowEndpointConfig): Required<ArrowEndpointConfig> {
  return {
    directionField: config?.directionField ?? CLOSURE_DIRECTION_FIELD,
    oneDirectionValues: config?.oneDirectionValues ?? [ONE_DIRECTION],
    bothDirectionsValues: config?.bothDirectionsValues ?? [BOTH_DIRECTIONS],
    sizeScale: config?.sizeScale ?? 1.1,
    minSize: config?.minSize ?? 8,
  };
}

function isLineString(feature: FeatureLike): boolean {
  return feature.getGeometry()?.getType() === LINE_STRING_GEOMETRY_TYPE;
}

function getDirection(feature: FeatureLike, field: string): string {
  return String(feature.get(field) ?? "");
}

/**
 * Returns the rotation (in radians) to apply to a `RegularShape` (whose default, unrotated
 * orientation points up/north) so that it points along the line segment that ends at the given
 * coordinate index. The bearing is taken from the previous coordinate to the coordinate at
 * `index`, using `atan2(dx, dy)` (arguments swapped relative to the usual `atan2(dy, dx)`)
 * because OpenLayers image rotation is applied clockwise in screen space (y-down) while the
 * line's coordinates are in map space (y-up).
 */
function getLineAngle(line: LineString, index: number): number {
  const coords = line.getCoordinates();
  if (coords.length < 2) return 0;

  const safeIndex = Math.max(1, Math.min(index, coords.length - 1));
  const prev = coords[safeIndex - 1];
  const curr = coords[safeIndex];
  return Math.atan2(curr[0] - prev[0], curr[1] - prev[1]);
}

function createArrowheadStyle(color: string, radius: number, rotation: number, atStart: boolean): Style {
  return new Style({
    geometry: (feature) => {
      const geometry = feature.getGeometry();
      if (!geometry || geometry.getType() !== LINE_STRING_GEOMETRY_TYPE) return geometry;
      const line = geometry as LineString;
      const coord = atStart ? line.getFirstCoordinate() : line.getLastCoordinate();
      return new Point(coord);
    },
    image: new RegularShape({
      fill: new Fill({ color }),
      points: 3,
      radius,
      // Default RegularShape triangle has one vertex pointing up (north). `rotation` (computed
      // via getLineAngle's atan2(dx, dy)) rotates that vertex to align with the line direction.
      angle: 0,
      // At the start of the line, rotate by an extra π so the arrowhead points outward rather
      // than inward along the first segment.
      rotation: atStart ? rotation + Math.PI : rotation,
    }),
  });
}

function buildArrowheadStyles(feature: FeatureLike, baseStyle: Style, config: Required<ArrowEndpointConfig>): Style[] {
  if (!isLineString(feature)) return [baseStyle];

  const direction = getDirection(feature, config.directionField);
  const oneDirection = config.oneDirectionValues.includes(direction);
  const bothDirections = config.bothDirectionsValues.includes(direction);
  if (!oneDirection && !bothDirections) return [baseStyle];

  const stroke = baseStyle.getStroke();
  const color = stroke?.getColor() ?? "rgba(255,0,0,1)";
  const width = stroke?.getWidth() ?? 2;
  const radius = Math.max(width * config.sizeScale, config.minSize);

  const line = feature.getGeometry() as LineString;
  const styles: Style[] = [baseStyle];

  if (oneDirection || bothDirections) {
    styles.push(createArrowheadStyle(typeof color === "string" ? color : "rgba(255,0,0,1)", radius, getLineAngle(line, line.getCoordinates().length - 1), false));
  }

  if (bothDirections) {
    styles.push(createArrowheadStyle(typeof color === "string" ? color : "rgba(255,0,0,1)", radius, getLineAngle(line, 1), true));
  }

  return styles;
}

/**
 * Wraps a base OpenLayers style function with arrowhead rendering for line features whose
 * `direction` attribute indicates one-way or two-way closure direction. The original geometry is
 * not modified — arrowheads are drawn as separate point styles at the line ends, so editing,
 * snapping, and ArcGIS save/update operations continue to work on the real line geometry.
 */
export function withArrowEndpoints(baseStyleFn: StyleFunction, config?: ArrowEndpointConfig): StyleFunction {
  const resolved = defaultConfig(config);
  return (feature: FeatureLike, resolution: number) => {
    const base = baseStyleFn(feature, resolution);
    const baseStyle = Array.isArray(base) ? base[0] : base;
    if (!baseStyle) return base;
    return buildArrowheadStyles(feature, baseStyle, resolved);
  };
}

function isClosureDirectionRenderer(renderer: EsriRenderer): renderer is EsriUniqueValueRenderer {
  return renderer.type === "uniqueValue" && renderer.field1 === CLOSURE_DIRECTION_FIELD;
}

/**
 * Builds a style function for the Road Closures layer. If the renderer is a uniqueValue renderer
 * keyed on the `direction` field, arrowhead endpoint styles are added on top of the base Esri
 * line symbol. Other renderers (Detours, Blocks) fall back to the generic Esri conversion.
 */
export function buildClosureStyleFunction(renderer: EsriRenderer): StyleFunction {
  const base = buildEsriStyleFunction(renderer);
  if (!isClosureDirectionRenderer(renderer)) return base;
  return withArrowEndpoints(base);
}

/** Draws a 20x20 swatch with a line and matching arrowheads for closure direction values. */
function renderClosureLegendSwatch(symbol: EsriSimpleLineSymbol, direction: string, size = 20): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const color = esriColorToRgba(symbol.color);
  const width = Math.min(symbol.width, 6) || 2;
  const lineY = size / 2;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  const dash = esriLineDash(symbol.style, 1);
  if (dash) ctx.setLineDash(dash);

  // Main horizontal line, inset to leave room for arrowheads
  ctx.beginPath();
  ctx.moveTo(4, lineY);
  ctx.lineTo(size - 4, lineY);
  ctx.stroke();
  ctx.setLineDash([]);

  const arrowSize = Math.max(width * 1.5, 5);

  const drawTriangle = (x: number, y: number, angle: number): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(arrowSize, 0);
    ctx.lineTo(-arrowSize / 2, -arrowSize / 2);
    ctx.lineTo(-arrowSize / 2, arrowSize / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  if (direction === ONE_DIRECTION || direction === BOTH_DIRECTIONS) {
    drawTriangle(size - 4, lineY, 0);
  }
  if (direction === BOTH_DIRECTIONS) {
    drawTriangle(4, lineY, Math.PI);
  }

  return canvas.toDataURL("image/png");
}

/**
 * Builds legend items for the Road Closures layer. If the renderer is a uniqueValue renderer
 * keyed on `direction`, each unique value gets a swatch showing the line plus arrowheads.
 * Other renderers fall back to the generic Esri legend builder.
 */
export function buildClosureLegendItems(renderer: EsriRenderer, size = 20): EsriLegendItem[] {
  if (!isClosureDirectionRenderer(renderer)) return buildEsriLegendItems(renderer, size);

  return renderer.uniqueValueInfos.map((info) => {
    const symbol = info.symbol;
    if (symbol.type !== "esriSLS") {
      // Should not happen for the Closures layer, but fall back safely.
      return { label: info.label || info.value, imageDataUrl: "" };
    }
    return {
      label: info.label || info.value,
      imageDataUrl: renderClosureLegendSwatch(symbol, info.value, size),
    };
  });
}
