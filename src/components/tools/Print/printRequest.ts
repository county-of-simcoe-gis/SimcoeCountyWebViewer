/**
 * Print Request Builder for MapFish Print Server
 * Ported from SimcoeCountyWebViewer printRequest/printRequest.js
 */

import { Feature } from "ol";
import { Geometry, Point, LineString, Polygon, MultiPolygon } from "ol/geom";
import { Style, Fill, Stroke, Text, Circle as CircleStyle, Icon, RegularShape } from "ol/style";
import { asArray } from "ol/color";
import { Vector as VectorLayer, Tile as TileLayer, Image as ImageLayer, Group as LayerGroup } from "ol/layer";
import { Layer } from "ol/layer";
import type ImageSource from "ol/source/Image";
import Map from "ol/Map";

import { printConfig, PrintSize, PrintFormat } from "./printConfig";
import { rgbToHex, xmlToJson, extractServiceName, computeDimension, computeExtent, radiansToDegrees } from "./printUtils";
import { FeatureHelpers } from "@/utils/openlayers/FeatureHelpers";
import { LayerHelpers } from "@/utils/openlayers/LayerHelpers";
import { OL_DATA_TYPES } from "@/utils/openlayers/types";
import { getMapScale } from "@/utils/mapHelpers";

// =============================================================================
// Types
// =============================================================================

export interface PrintState {
  mapTitle: string;
  printSizeSelectedOption: PrintSize;
  printFormatSelectedOption: PrintFormat;
  mapScaleOption: "preserveMapScale" | "preserveMapExtent" | "forceScale";
  forceScale: string;
  mapOnlyWidth: string;
  mapOnlyHeight: string;
  mapResolutionOption: string;
  termsOfUse: string;
  options?: {
    parameters?: Array<{ name: string; value: string }>;
  };
}

interface MapFishSymbolizer {
  type: string;
  [key: string]: unknown;
}

interface MapFishStyle {
  version: string;
  "*"?: {
    symbolizers: MapFishSymbolizer[];
  };
  [key: string]: unknown;
}

interface MapFishGeoJsonLayer {
  type: "geojson";
  geoJson:
    | {
        type: "FeatureCollection";
        features: Array<{
          type: "Feature";
          geometry: {
            type: string;
            coordinates: unknown;
          };
          properties: Record<string, unknown>;
        }>;
      }
    | Array<{
        type: "Feature";
        geometry: {
          type: string;
          coordinates: unknown;
        };
        properties: Record<string, unknown>;
      }>;
  name: string;
  style: MapFishStyle;
}

interface MapFishWMTSLayer {
  type: "WMTS";
  baseURL: string;
  layer: string;
  opacity: number;
  imageFormat: string;
  style: string;
  version: string;
  dimensions: string[];
  dimensionParams: Record<string, unknown>;
  requestEncoding: string;
  customParams: {
    TRANSPARENT: string;
    zIndex: number | null;
  };
  matrixSet: string;
  matrices: TileMatrix[];
}

interface MapFishOSMLayer {
  type: "OSM";
  baseURL: string;
  imageExtension: string;
  customParams: {
    zIndex: number;
  };
}

interface MapFishImageLayer {
  type: "image";
  baseURL: string | URL;
  opacity: number;
  imageFormat: string;
  extent: number[];
  name: string;
}

interface MapFishWMSLayer {
  type: "wms";
  baseURL: string;
  serverType?: string;
  opacity: number;
  layers: string[];
  imageFormat: string;
  customParams: {
    TRANSPARENT: string;
    zIndex: number;
  };
  version: string;
}

type MapFishLayer = MapFishGeoJsonLayer | MapFishWMTSLayer | MapFishOSMLayer | MapFishImageLayer | MapFishWMSLayer;

interface TileMatrix {
  identifier: string;
  scaleDenominator: number;
  topLeftCorner: number[];
  tileSize: number[];
  matrixSize: number[];
}

interface PrintRequestAttributes {
  title: string;
  description: string;
  map: {
    projection?: string;
    longitudeFirst?: boolean;
    rotation?: number;
    dpi?: number;
    scale?: number;
    center?: number[];
    bbox?: number[];
    height?: number;
    width?: number;
    layers?: MapFishLayer[];
  };
  scalebar: {
    geodetic: number;
  };
  scale: string;
  overviewMap?: {
    projection: string;
    center: number[];
    scale: number;
    longitudeFirst: boolean;
    rotation: number;
    dpi: number;
    layers?: MapFishLayer[];
  };
  imageName?: string;
  [key: string]: unknown;
}

interface PrintRequestObject {
  layout: string;
  outputFormat: string;
  dpi: number;
  compressed: boolean;
  parameters: Array<{ name: string; value: string }>;
  attributes: PrintRequestAttributes;
}

// =============================================================================
// Style Conversion Helpers
// =============================================================================

/**
 * Look up font in config, return default if not found
 */
function lookupFont(font: string | undefined): string {
  if (!font) return printConfig.fonts[0];
  const foundFont = printConfig.fonts.find((item) => font.toLowerCase() === item.toLowerCase());
  return foundFont || printConfig.fonts[0];
}

/**
 * Convert OpenLayers color to hex format
 */
function colorToHex(color: unknown): string | null {
  if (!color) return null;
  if (Array.isArray(color)) {
    return rgbToHex(color[0], color[1], color[2], color[3]);
  }
  // Handle string colors - convert rgba/rgb strings to hex
  const colorStr = String(color);
  if (colorStr.startsWith("rgba(") || colorStr.startsWith("rgb(")) {
    try {
      const arr = asArray(colorStr);
      return rgbToHex(arr[0], arr[1], arr[2], arr[3]);
    } catch {
      return colorStr;
    }
  }
  return colorStr;
}

/**
 * Get opacity from OpenLayers color
 */
function colorToOpacity(color: unknown): number {
  if (!color) return 1;
  if (Array.isArray(color)) {
    return color[3] !== undefined ? color[3] : 1;
  }
  try {
    return asArray(color as string)[3] ?? 1;
  } catch {
    return 1;
  }
}

/**
 * Extract visual components from OpenLayers style
 */
function extractVisualComponents(
  feature: Feature<Geometry>,
  featureStyle: Style | Style[] | ((feature: Feature<Geometry>) => Style | Style[]) | null,
  layerStyle: Style | null,
): Array<{
  geometry: Geometry;
  style: Style;
  type: string;
  isCustomGeometry: boolean;
}> {
  const components: Array<{
    geometry: Geometry;
    style: Style;
    type: string;
    isCustomGeometry: boolean;
  }> = [];
  const featureGeometry = feature.getGeometry();

  if (!featureGeometry) return components;

  // Resolve style function if needed
  let resolvedStyles: Style[] = [];
  if (typeof featureStyle === "function") {
    const result = featureStyle(feature);
    resolvedStyles = Array.isArray(result) ? result : result ? [result] : [];
  } else if (featureStyle) {
    resolvedStyles = Array.isArray(featureStyle) ? featureStyle : [featureStyle];
  } else if (layerStyle) {
    resolvedStyles = [layerStyle];
  }

  // Process each style in the array
  resolvedStyles.forEach((style) => {
    if (!style) return;

    // Determine geometry for this style component
    let geometry: Geometry = featureGeometry;
    const styleGeom = style.getGeometry?.();
    if (styleGeom) {
      if (typeof styleGeom === "function") {
        const customGeom = styleGeom(feature);
        if (customGeom) geometry = customGeom;
      } else {
        geometry = styleGeom;
      }
    }

    // Determine visual type
    let visualType = "shape";
    if (style.getText?.()?.getText?.()) {
      visualType = "text";
    } else if (style.getImage?.() && geometry !== featureGeometry) {
      visualType = "marker";
    }

    components.push({
      geometry,
      style,
      type: visualType,
      isCustomGeometry: geometry !== featureGeometry,
    });
  });

  return components;
}

/**
 * Convert OpenLayers Fill to MapFish symbolizer properties
 */
function fillToSymbolizer(olFill: Fill | null): Record<string, unknown> {
  if (!olFill) return {};
  const color = olFill.getColor?.();
  if (!color) return {};
  return {
    fillColor: colorToHex(color),
    fillOpacity: colorToOpacity(color),
  };
}

/**
 * Convert OpenLayers Stroke to MapFish symbolizer properties
 */
function strokeToSymbolizer(olStroke: Stroke | null): Record<string, unknown> {
  if (!olStroke) return {};
  const color = olStroke.getColor?.();
  const width = olStroke.getWidth?.();
  const lineDash = olStroke.getLineDash?.();

  const result: Record<string, unknown> = {};
  if (color) {
    result.strokeColor = colorToHex(color);
    result.strokeOpacity = colorToOpacity(color);
  }
  if (width !== null && width !== undefined) {
    result.strokeWidth = width;
  }
  if (lineDash) {
    result.strokeDashstyle = lineDash[0] === 1 ? "dot" : "dash";
    result.strokeLinejoin = "round";
    result.strokeLinecap = "round";
  }
  return result;
}

/**
 * Convert OpenLayers Text to MapFish text symbolizer
 */
function textToSymbolizer(olText: Text | null, options: { skipHalo?: boolean; drawType?: string; featureLabelRotation?: number } = {}): MapFishSymbolizer | null {
  if (!olText?.getText?.()) return null;

  const fontString = olText.getFont?.() || "normal 12px Arial";
  const font = fontString.split(" ");
  const textFill = olText.getFill?.();
  const textStroke = olText.getStroke?.();
  const textAlign = olText.getTextAlign?.() || "center";
  const textBaseline = olText.getTextBaseline?.() || "middle";

  let textFillColor = textFill?.getColor ? colorToHex(textFill.getColor()) : "#000000";
  const strokeColor = textStroke?.getColor ? colorToHex(textStroke.getColor()) : "#000000";

  // Handle white/light text for print readability
  let useStrokeAsFill = false;
  if (textFillColor) {
    const colorStr = String(textFillColor).toLowerCase();
    if (colorStr === "#ffffff" || colorStr === "#fff" || colorStr === "white") {
      useStrokeAsFill = true;
      textFillColor = strokeColor || "#000000";
    }
  }

  // Scale font size for print
  let fontSize = font.length >= 2 ? font[1] : "12px";
  const fontSizeMatch = String(fontSize).match(/^(\d+(?:\.\d+)?)(px|pt)?$/i);
  if (fontSizeMatch) {
    const sizeValue = parseFloat(fontSizeMatch[1]);
    const unit = (fontSizeMatch[2] || "px").toLowerCase();
    const scaleFactor = 0.6;
    const scaledSize = unit === "px" ? Math.round(sizeValue * scaleFactor) : sizeValue;
    fontSize = `${scaledSize}px`;
  }

  // Get the label rotation - use text style rotation, or fallback to feature's labelRotation
  const textStyleRotation = olText.getRotation?.() || 0;
  const hasStyleRotation = textStyleRotation !== 0;
  const hasFeatureRotation = options.featureLabelRotation !== undefined && options.featureLabelRotation !== null;
  let labelRotationDegrees = hasStyleRotation ? radiansToDegrees(textStyleRotation) : Number(options.featureLabelRotation || 0);

  // Bearing/Measure features store the raw bearing in featureLabelRotation.
  // Prefer that value to avoid ambiguity with potentially pre-adjusted style rotation.
  if ((options.drawType === "Bearing" || options.drawType === "Measure") && hasFeatureRotation) {
    labelRotationDegrees = Number(options.featureLabelRotation || 0);
  }

  // Apply bearing rotation adjustment for Bearing and Measure tools
  if (options.drawType === "Bearing" || options.drawType === "Measure") {
    labelRotationDegrees = labelRotationDegrees > 180 ? labelRotationDegrees + 90 : labelRotationDegrees - 90;
  }

  const symbolizer: MapFishSymbolizer = {
    type: "text",
    fontFamily: font.length >= 3 ? lookupFont(font[2]) : "Arial",
    fontSize: fontSize,
    fontStyle: "normal",
    fontWeight: font.length >= 1 ? font[0] : "normal",
    label: olText.getText(),
    fontColor: textFillColor,
    labelAlign: `${(textAlign || "center").substring(0, 1)}${(textBaseline || "middle").substring(0, 1)}`,
    labelRotation: labelRotationDegrees,
    labelXOffset: (olText.getOffsetX?.() || 0) * -1,
    labelYOffset: (olText.getOffsetY?.() || 0) * -1,
    goodnessOfFit: 0,
  };

  // Add halo for readability
  if (useStrokeAsFill) {
    symbolizer.haloColor = "#ffffff";
    symbolizer.haloOpacity = 0.9;
    symbolizer.haloRadius = 2;
  } else if (textStroke?.getWidth?.() && textStroke.getWidth()! > 1 && !options.skipHalo) {
    symbolizer.haloColor = strokeColor;
    symbolizer.haloOpacity = 0.4;
    symbolizer.haloRadius = Math.min(1.5, Number(textStroke.getWidth()) * 0.3);
  }

  return symbolizer;
}

/**
 * Convert OpenLayers Circle image to MapFish point symbolizer
 */
function circleImageToSymbolizer(olImage: CircleStyle | null): MapFishSymbolizer | null {
  if (!olImage) return null;

  const symbolizer: MapFishSymbolizer = {
    type: "point",
    graphicName: "circle",
  };

  if (olImage.getRadius) {
    symbolizer.pointRadius = olImage.getRadius();
  }

  const fill = olImage.getFill?.();
  const stroke = olImage.getStroke?.();

  if (fill?.getColor) {
    const color = fill.getColor();
    symbolizer.fillColor = colorToHex(color);
    symbolizer.fillOpacity = colorToOpacity(color);
  }

  if (stroke?.getColor) {
    const color = stroke.getColor();
    symbolizer.strokeColor = colorToHex(color);
    symbolizer.strokeWidth = stroke.getWidth?.() || 1;
    symbolizer.strokeOpacity = colorToOpacity(color);
  }

  return symbolizer;
}

/**
 * Convert OpenLayers Icon to MapFish symbolizer
 */
function iconImageToSymbolizer(olImage: Icon | null): MapFishSymbolizer | null {
  if (!olImage?.getSrc) return null;

  const iconSrc = olImage.getSrc();
  if (!iconSrc) return null;

  return {
    type: "point",
    rotation: (olImage.getRotation?.() || 0) * (180 / Math.PI),
    externalGraphic: iconSrc,
    graphicName: "icon",
    graphicOpacity: olImage.getOpacity?.() ?? 1,
  };
}

/**
 * Map OpenLayers RegularShape points to MapFish graphicName
 */
function getGraphicNameFromPoints(points: number, radius2?: number): string {
  // MapFish Print supports: circle, square, triangle, star, cross, x
  if (points === 4 && (radius2 === 0 || radius2 === undefined)) {
    return "cross"; // 4 points with radius2=0 is a cross
  }
  if (points === 4) {
    return "square"; // 4 points with radius2 is a square
  }
  if (points === 3) {
    return "triangle";
  }
  if (points === 5) {
    return "star"; // 5 points is a star
  }
  // Default to circle for unknown shapes
  return "circle";
}

/**
 * Convert OpenLayers RegularShape to MapFish point symbolizer
 */
function regularShapeImageToSymbolizer(olImage: RegularShape | null): MapFishSymbolizer | null {
  if (!olImage) return null;

  const points = olImage.getPoints?.() || 4;
  const radius = olImage.getRadius?.() || 10;
  const radius2 = olImage.getRadius2?.();
  const rotation = olImage.getRotation?.() || 0;
  const angle = olImage.getAngle?.() || 0;

  const symbolizer: MapFishSymbolizer = {
    type: "point",
    graphicName: getGraphicNameFromPoints(points, radius2),
    pointRadius: radius,
    rotation: radiansToDegrees(rotation + angle),
  };

  const fill = olImage.getFill?.();
  const stroke = olImage.getStroke?.();

  if (fill?.getColor) {
    const color = fill.getColor();
    symbolizer.fillColor = colorToHex(color);
    symbolizer.fillOpacity = colorToOpacity(color);
  }

  if (stroke?.getColor) {
    const color = stroke.getColor();
    symbolizer.strokeColor = colorToHex(color);
    symbolizer.strokeWidth = stroke.getWidth?.() || 1;
    symbolizer.strokeOpacity = colorToOpacity(color);
  }

  return symbolizer;
}

/**
 * Create MapFish GeoJSON layer
 */
function createGeoJsonLayer(layerName: string, featureId: string, geometry: Geometry, symbolizers: MapFishSymbolizer[], properties: Record<string, unknown> = {}): MapFishGeoJsonLayer {
  const geojsonType = geometry.getType();
  const coordinates = (geometry as Point | LineString | Polygon | MultiPolygon).getCoordinates();

  const styleObj: MapFishStyle = { version: "2" };
  styleObj["*"] = { symbolizers };

  return {
    type: "geojson",
    geoJson: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: geojsonType,
            coordinates,
          },
          properties,
        },
      ],
    },
    name: `${layerName}-${featureId}`,
    style: styleObj,
  };
}

/**
 * Create text background box layer
 */
function createTextBackgroundLayer(
  layerName: string,
  featureId: string,
  centerPoint: number[],
  textContent: string,
  textStyle: Text,
  map: Map,
  drawType?: string,
  featureLabelRotation?: number,
): MapFishGeoJsonLayer | null {
  const bgFill = textStyle.getBackgroundFill?.();
  if (!bgFill) return null;

  const fontString = textStyle.getFont?.() || "14px Arial";
  const fontSizeMatch = fontString.match(/(\d+)px/);
  const fontSizeNum = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 14;

  const scaleFactor = 0.6;
  const scaledFontSize = Math.round(fontSizeNum * scaleFactor);

  // Calculate box dimensions
  const charWidth = scaledFontSize * 0.65;
  const textWidthPx = textContent.length * charWidth;
  const textHeightPx = scaledFontSize * 1.4;
  const paddingPx = 20;
  const boxWidthPx = textWidthPx + paddingPx * 2;
  const boxHeightPx = textHeightPx + paddingPx;

  // Convert pixels to meters
  const resolution = map.getView().getResolution() || 1;
  const boxWidthMeters = boxWidthPx * resolution;
  const boxHeightMeters = boxHeightPx * resolution;

  const halfW = boxWidthMeters / 2;
  const halfH = boxHeightMeters / 2;

  // Get rotation from text style (in radians) or from feature's labelRotation (in degrees)
  // Use feature's labelRotation as fallback since style functions may not preserve rotation
  const textStyleRotation = textStyle.getRotation?.() || 0;
  const hasStyleRotation = textStyleRotation !== 0;
  const hasFeatureRotation = featureLabelRotation !== undefined && featureLabelRotation !== null;
  let rotationDegrees = hasStyleRotation ? radiansToDegrees(textStyleRotation) : Number(featureLabelRotation || 0);

  // Bearing/Measure features store the raw bearing in featureLabelRotation.
  // Prefer that value to avoid ambiguity with potentially pre-adjusted style rotation.
  if ((drawType === "Bearing" || drawType === "Measure") && hasFeatureRotation) {
    rotationDegrees = Number(featureLabelRotation || 0);
  }

  // Apply bearing rotation adjustment for Bearing and Measure tools (same as textToSymbolizer)
  if (drawType === "Bearing" || drawType === "Measure") {
    rotationDegrees = rotationDegrees > 180 ? rotationDegrees + 90 : rotationDegrees - 90;
  }

  // Callout labels render with opposite polygon rotation direction from text in MapFish.
  // Flip the background box rotation so it matches the text orientation.
  if (drawType === "Callout") {
    rotationDegrees = -rotationDegrees;
  }

  // Convert to radians for the rotation calculation
  const rotation = rotationDegrees * (Math.PI / 180);

  // Helper function to rotate a point around center
  const rotatePoint = (x: number, y: number, cx: number, cy: number, angle: number): [number, number] => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = x - cx;
    const dy = y - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  };

  // Create box corners (unrotated)
  const corners: [number, number][] = [
    [centerPoint[0] - halfW, centerPoint[1] - halfH],
    [centerPoint[0] + halfW, centerPoint[1] - halfH],
    [centerPoint[0] + halfW, centerPoint[1] + halfH],
    [centerPoint[0] - halfW, centerPoint[1] + halfH],
  ];

  // Apply rotation to each corner
  const rotatedCorners = corners.map(([x, y]) => rotatePoint(x, y, centerPoint[0], centerPoint[1], rotation));

  // Close the polygon
  const boxCoords = [...rotatedCorners, rotatedCorners[0]];

  const bgStroke = textStyle.getBackgroundStroke?.();
  const bgFillColor = bgFill?.getColor ? colorToHex(bgFill.getColor()) : "#ffffff";
  const bgFillOpacity = bgFill?.getColor ? colorToOpacity(bgFill.getColor()) : 0.95;
  const bgStrokeColor = bgStroke?.getColor ? colorToHex(bgStroke.getColor()) : "#333333";
  const bgStrokeOpacity = bgStroke?.getColor ? colorToOpacity(bgStroke.getColor()) : 1;

  const styleObj: MapFishStyle = { version: "2" };
  styleObj["*"] = {
    symbolizers: [
      {
        type: "polygon",
        fillColor: bgFillColor,
        fillOpacity: bgFillOpacity,
        strokeColor: bgStrokeColor,
        strokeWidth: bgStroke?.getWidth?.() || 1,
        strokeOpacity: bgStrokeOpacity,
      },
    ],
  };

  return {
    type: "geojson",
    geoJson: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [boxCoords],
          },
          properties: {},
        },
      ],
    },
    name: `${layerName}-${featureId}-bg`,
    style: styleObj,
  };
}

// =============================================================================
// Layer Configuration Functions
// =============================================================================

/**
 * Load tile matrix from WMTS capabilities
 */
export async function loadTileMatrix(url: string): Promise<TileMatrix[]> {
  const response = await fetch(url);
  const data = await response.text();
  const xml = new DOMParser().parseFromString(data, "text/xml");
  const json = xmlToJson(xml) as Record<string, unknown>;

  const capabilities = json.Capabilities as Record<string, unknown>;
  const contents = capabilities?.Contents as Record<string, unknown>;
  let tileMatrixSet = contents?.TileMatrixSet as Record<string, unknown> | Record<string, unknown>[];

  if (Array.isArray(tileMatrixSet)) {
    tileMatrixSet = tileMatrixSet[0];
  }

  const flatTileMatrix = (tileMatrixSet?.TileMatrix || []) as Array<Record<string, Record<string, string>>>;

  return flatTileMatrix.map((m) => ({
    identifier: m["ows:Identifier"]?.["#text"] || "",
    scaleDenominator: Number(m["ScaleDenominator"]?.["#text"] || 0),
    topLeftCorner: (m["TopLeftCorner"]?.["#text"] || "0 0").split(" ").map(Number),
    tileSize: [256, 256],
    matrixSize: [Number(m["MatrixWidth"]?.["#text"] || 1), Number(m["MatrixHeight"]?.["#text"] || 1)],
  }));
}

/**
 * Load WMTS configuration for layer
 */
export async function loadWMTSConfig(url: string, opacity: number): Promise<MapFishWMTSLayer> {
  const matrices = await loadTileMatrix(url + "/WMTS/1.0.0/WMTSCapabilities.xml");

  return {
    type: "WMTS",
    imageFormat: "image/png",
    opacity,
    style: "Default Style",
    version: "1.0.0",
    dimensions: [],
    dimensionParams: {},
    requestEncoding: "REST",
    customParams: {
      TRANSPARENT: "true",
      zIndex: null,
    },
    matrixSet: "EPSG:3857",
    baseURL: url + "/tile/{TileMatrix}/{TileRow}/{TileCol}",
    layer: extractServiceName(url),
    matrices,
  };
}

/**
 * Build vector layer for MapFish Print
 */
function buildVectorLayer(layer: VectorLayer, map: Map): MapFishGeoJsonLayer[] | undefined {
  const returnLayers: MapFishGeoJsonLayer[] = [];
  const olFeatures: Feature<Geometry>[] = [];
  const extent = map.getView().calculateExtent(map.getSize());

  layer.getSource()?.forEachFeatureInExtent(extent, (feature) => {
    olFeatures.push(feature);
  });

  const olLayerStyle = layer.getStyle() as Style | null;
  const layerName = layer.get("name") || "vector";

  olFeatures.forEach((feature) => {
    const featureId = (feature as unknown as { ol_uid: string }).ol_uid;
    const featureStyle = feature.getStyle() as Style | Style[] | ((f: Feature<Geometry>) => Style | Style[]) | null;
    const featureGeometry = feature.getGeometry();
    const drawType = feature.get("drawType") as string | undefined;
    const labelText = (feature.get("label") || "") as string;

    if (!featureGeometry) return;

    const components = extractVisualComponents(feature, featureStyle, olLayerStyle);

    if (components.length === 0) return;

    const featureLayers: MapFishGeoJsonLayer[] = [];

    components.forEach((component, index) => {
      const { geometry, style, isCustomGeometry } = component;
      const symbolizers: MapFishSymbolizer[] = [];
      const suffix = isCustomGeometry ? `-${component.type}-${index}` : "";

      const olFill = style.getFill?.();
      const olStroke = style.getStroke?.();
      const olText = style.getText?.();
      const olImage = style.getImage?.();

      const geomType = geometry.getType();
      const mapfishType = printConfig.drawTypes[drawType || ""] || printConfig.drawTypes[geomType] || "Polygon";

      // Build shape symbolizer
      if (olFill || olStroke || olImage) {
        const shapeSymbolizer: MapFishSymbolizer = { type: mapfishType.toLowerCase() };

        if (olFill) {
          Object.assign(shapeSymbolizer, fillToSymbolizer(olFill));
        }

        if (olStroke) {
          Object.assign(shapeSymbolizer, strokeToSymbolizer(olStroke));
        }

        // For line geometries, prioritize stroke symbolizer over image symbolizer
        // The image property is often just for cursor/drawing feedback, not the actual line style
        const isLineGeometry = geomType === "LineString" || geomType === "MultiLineString";

        // For non-line shapes that only have an image, use the image symbolizer
        if (olImage && !isLineGeometry && geomType === "Point") {
          // Handle circle/marker images (for custom geometry points like anchors)
          // Check for RegularShape first (it also has getRadius)
          if ("getPoints" in olImage) {
            // RegularShape (triangles, stars, crosses, etc.)
            const regularShapeSymbolizer = regularShapeImageToSymbolizer(olImage as RegularShape);
            if (regularShapeSymbolizer) {
              symbolizers.push(regularShapeSymbolizer);
            }
          } else if ("getRadius" in olImage) {
            // CircleStyle
            const circleSymbolizer = circleImageToSymbolizer(olImage as CircleStyle);
            if (circleSymbolizer) {
              symbolizers.push(circleSymbolizer);
            }
          }
          // Handle icon images
          else if ("getSrc" in olImage) {
            const iconSymbolizer = iconImageToSymbolizer(olImage as Icon);
            if (iconSymbolizer) {
              symbolizers.push(iconSymbolizer);
            }
          }
        }
        // For lines, polygons, or shapes with fill/stroke, use the shape symbolizer
        else if (olFill || olStroke) {
          // For Text drawType, use invisible point marker
          if (drawType === "Text") {
            symbolizers.push({
              type: "point",
              graphicName: "circle",
              pointRadius: 1,
              fillColor: "#000000",
              fillOpacity: 0,
              strokeOpacity: 0,
            });
          } else {
            symbolizers.push(shapeSymbolizer);
          }
        }
      }

      // Handle text with background
      if (olText?.getText?.()) {
        // Get labelRotation from feature for cases where style function doesn't preserve rotation
        const featureLabelRotation = feature.get("labelRotation") as number | undefined;
        const textSymbolizer = textToSymbolizer(olText, { skipHalo: !!olText.getBackgroundFill?.(), drawType, featureLabelRotation });
        if (textSymbolizer) {
          if (olText.getBackgroundFill?.()) {
            const textPoint = geometry.getType() === "Point" ? (geometry as Point).getCoordinates() : ((geometry as LineString | Polygon).getCoordinates().slice(-1)[0] as number[]);

            const bgLayer = createTextBackgroundLayer(layerName, featureId, textPoint, olText.getText() as string, olText, map, drawType, featureLabelRotation);
            if (bgLayer) {
              featureLayers.push(bgLayer);
            }

            const textStyleObj: MapFishStyle = { version: "2" };
            textStyleObj["*"] = {
              symbolizers: [{ type: "point", graphicName: "circle", pointRadius: 1, fillOpacity: 0, strokeOpacity: 0 }, textSymbolizer],
            };

            featureLayers.push({
              type: "geojson",
              geoJson: {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: textPoint },
                    properties: { label: olText.getText() },
                  },
                ],
              },
              name: `${layerName}-${featureId}-text`,
              style: textStyleObj,
            });
          } else {
            symbolizers.push(textSymbolizer);
          }
        }
      }

      // Create layer for this component
      if (symbolizers.length > 0) {
        if (isCustomGeometry) {
          const componentLayer = createGeoJsonLayer(layerName, `${featureId}${suffix}`, geometry, symbolizers, { label: labelText });
          featureLayers.push(componentLayer);
        } else {
          const styles: MapFishStyle = { version: "2" };
          styles["*"] = { symbolizers };

          const itemLayer: MapFishGeoJsonLayer = {
            type: "geojson",
            geoJson: [],
            name: `${layerName}-${featureId}`,
            style: styles,
          };

          const geoJsonString = FeatureHelpers.setFeatures([feature], OL_DATA_TYPES.GeoJSON, "EPSG:3857", null);
          if (geoJsonString) {
            const geoJsonFeature = JSON.parse(geoJsonString);
            itemLayer.geoJson = geoJsonFeature.features.map((f: { properties: unknown }) => {
              if (f.properties === null) f.properties = {};
              return f;
            });
            featureLayers.push(itemLayer);
          }
        }
      }
    });

    // Reverse layer order for MapFish
    returnLayers.push(...featureLayers.reverse());
  });

  return returnLayers.length > 0 ? returnLayers : undefined;
}

/**
 * Configure tile layer for MapFish
 */
async function configureTileLayer(layer: TileLayer): Promise<MapFishWMTSLayer | MapFishOSMLayer> {
  const layerSource = layer.getSource();
  if (!layerSource) {
    throw new Error("Layer source not found");
  }

  const urls = (layerSource as { getUrls?: () => string[] }).getUrls?.();
  if (!urls || urls.length === 0) {
    throw new Error("Layer URLs not found");
  }

  const rawTileUrl = urls[0];

  // Check for OpenStreetMap
  const sourceKey = (layerSource as { key_?: string }).key_ || "";
  if (sourceKey.includes("openstreetmap.org")) {
    return {
      type: "OSM",
      baseURL: sourceKey.split("\n")[0],
      imageExtension: "png",
      customParams: {
        zIndex: 1,
      },
    };
  }

  // Determine if this is a simple XYZ tile source (e.g. imagery layers) vs a
  // WMTS-capable ArcGIS MapServer.  XYZ sources have {z}/{y}/{x} or {TileMatrix}
  // placeholders in their URL template.
  const isXyzPattern = /\{[zZ]\}/.test(rawTileUrl) || /\{TileMatrix\}/.test(rawTileUrl);

  // Strip the tile URL template down to the service base URL
  let tileUrl = rawTileUrl;
  tileUrl = tileUrl.includes("/MapServer/WMTS/") ? tileUrl.split("/WMTS/")[0] : tileUrl.split("/tile/")[0];

  // Try WMTS capabilities first; if that fails for XYZ-type sources, fall back
  // to an OSM-type layer definition that MapFish can render from the XYZ URL.
  try {
    const retLayer = await loadWMTSConfig(tileUrl, layer.getOpacity());
    const layerIndex = layer.getZIndex() || 0;
    const printIndex = layer.get("printIndex") || 0;
    retLayer.customParams.zIndex = layerIndex + printIndex;
    return retLayer;
  } catch (wmtsError) {
    if (!isXyzPattern) {
      // Not an XYZ source and WMTS failed — nothing we can do
      throw wmtsError;
    }

    // Fallback: convert XYZ tile URL to an OSM-type layer for MapFish.
    // MapFish's OSM layer type can render any {z}/{x}/{y} tile endpoint.
    console.warn(`[Print] WMTS capabilities unavailable for "${layer.get("name") || tileUrl}", using XYZ/OSM fallback`);

    // Normalise the URL to the pattern MapFish expects:
    // {z}/{x}/{y} (MapFish OSM type uses these internally)
    const normalizedUrl = rawTileUrl.replace(/\{z\}/gi, "{z}").replace(/\{y\}/gi, "{y}").replace(/\{x\}/gi, "{x}");

    // Derive the base URL (everything before /{z}) and the extension
    const zIndex = normalizedUrl.indexOf("/{z}");
    const baseURL = zIndex >= 0 ? normalizedUrl.substring(0, zIndex) : normalizedUrl;
    const layerIndex = layer.getZIndex() || 0;
    const printIndex = layer.get("printIndex") || 0;

    return {
      type: "OSM",
      baseURL: baseURL + "/{z}/{x}/{y}",
      imageExtension: "png",
      customParams: {
        zIndex: layerIndex + printIndex,
      },
    };
  }
}

/**
 * Configure image layer for MapFish
 */
function configureImageLayer(layer: ImageLayer<ImageSource>, options: PrintRequestAttributes, map: Map): MapFishImageLayer {
  const source = layer.getSource() as {
    image_?: { src_: string };
    getUrl?: () => string | undefined;
    getParams?: () => Record<string, string>;
  };

  // Prefer the cached rendered image URL, but fall back to building one from
  // the source's public API (getUrl/getParams) when the layer hasn't rendered yet.
  const imageSrc = source?.image_?.src_;

  if (!imageSrc) {
    const baseUrl = source?.getUrl?.();
    if (baseUrl) {
      const params = source?.getParams?.() || {};
      const fallbackUrl = new URL(`${baseUrl}/export`);
      for (const [k, v] of Object.entries(params)) {
        fallbackUrl.searchParams.set(k, v);
      }
      // Set sensible defaults so the URL parsing below works
      fallbackUrl.searchParams.set("F", "image");
      fallbackUrl.searchParams.set("FORMAT", "PNG32");
      fallbackUrl.searchParams.set("TRANSPARENT", "true");
      const mapSize = map.getSize() || [800, 600];
      const printSize = !options.map.height || !options.map.width ? mapSize : [parseInt(String(options.map.height)), parseInt(String(options.map.width))];
      const extent = options.map.bbox ? options.map.bbox : computeExtent(printSize[0], printSize[1], 72, options.map.scale || 1, options.map.center || [0, 0]);

      // Match old-app output sizing logic: scale from current view size/bbox to requested print extent + DPI.
      const viewExtent = map.getView().calculateExtent(mapSize);
      const viewDPI = 96;
      let outputDPI = options.map.dpi || 96;
      let outputSize = [
        parseInt(String((mapSize[0] / ((viewExtent[0] - viewExtent[2]) / (extent[0] - extent[2]))) * (outputDPI / viewDPI))),
        parseInt(String((mapSize[1] / ((viewExtent[1] - viewExtent[3]) / (extent[1] - extent[3]))) * (outputDPI / viewDPI))),
      ];

      // Defensive fallback when the extent math yields invalid dimensions.
      if (!Number.isFinite(outputSize[0]) || !Number.isFinite(outputSize[1]) || outputSize[0] <= 0 || outputSize[1] <= 0) {
        outputSize = [printSize[0], printSize[1]];
      }

      if (outputSize[0] > 4096 || outputSize[1] > 4096) {
        const outputScaler = 4096 / Math.max(outputSize[0], outputSize[1]);
        outputDPI = parseInt(String(outputDPI * outputScaler));
        outputSize = [parseInt(String(outputSize[0] * outputScaler)), parseInt(String(outputSize[1] * outputScaler))];
      }

      fallbackUrl.searchParams.set("F", "image");
      fallbackUrl.searchParams.set("FORMAT", "PNG32");
      fallbackUrl.searchParams.set("TRANSPARENT", "true");
      fallbackUrl.searchParams.set("SIZE", outputSize.join(","));
      fallbackUrl.searchParams.set("DPI", String(outputDPI));
      fallbackUrl.searchParams.set("BBOX", extent.join(","));
      fallbackUrl.searchParams.set("BBOXSR", "3857");
      fallbackUrl.searchParams.set("IMAGESR", "3857");

      return {
        type: "image",
        baseURL: fallbackUrl,
        opacity: layer.getOpacity(),
        imageFormat: "image/png",
        extent: extent,
        name: "image",
      };
    }

    throw new Error("Image source not found");
  }

  const url = new URL(imageSrc);
  const urlParams = new URLSearchParams(url.searchParams);
  const urlDPI = parseInt(urlParams.get("DPI") || "96");
  const urlSIZE = (urlParams.get("SIZE") || "800,600").split(",");
  const urlBBOX = (urlParams.get("BBOX") || "0,0,0,0").split(",");

  const mapSize = map.getSize() || [800, 600];
  const printSize = !options.map.height || !options.map.width ? mapSize : [parseInt(String(options.map.height)), parseInt(String(options.map.width))];

  const extent = options.map.bbox ? options.map.bbox : computeExtent(printSize[0], printSize[1], 72, options.map.scale || 1, options.map.center || [0, 0]);

  let outputDPI = options.map.dpi || 96;
  let outputSize = [
    parseInt(String((parseInt(urlSIZE[0]) / ((parseFloat(urlBBOX[0]) - parseFloat(urlBBOX[2])) / (extent[0] - extent[2]))) * (outputDPI / urlDPI))),
    parseInt(String((parseInt(urlSIZE[1]) / ((parseFloat(urlBBOX[1]) - parseFloat(urlBBOX[3])) / (extent[1] - extent[3]))) * (outputDPI / urlDPI))),
  ];

  if (outputSize[0] > 4096 || outputSize[1] > 4096) {
    const outputScaler = 4096 / Math.max(outputSize[0], outputSize[1]);
    outputDPI = parseInt(String(outputDPI * outputScaler));
    outputSize = [parseInt(String(outputSize[0] * outputScaler)), parseInt(String(outputSize[1] * outputScaler))];
  }

  url.searchParams.set("SIZE", outputSize.join(","));
  url.searchParams.set("DPI", String(outputDPI));
  url.searchParams.set("BBOX", extent.join(","));
  url.searchParams.set("BBOXSR", "3857");
  url.searchParams.set("IMAGESR", "3857");

  return {
    type: "image",
    baseURL: url,
    opacity: layer.getOpacity(),
    imageFormat: "image/png",
    extent: extent,
    name: "image",
  };
}

/**
 * Configure WMS image layer for MapFish
 */
function configureWMSImageLayer(layer: ImageLayer<ImageSource>): MapFishWMSLayer {
  const source = layer.getSource() as {
    url_?: string;
    serverType_?: string;
    params_?: { LAYERS: string };
  };

  const baseURL = source?.url_?.split("?")[0] || "";

  return {
    type: "wms",
    baseURL,
    serverType: source?.serverType_ || (baseURL.includes("geoserver") ? "geoserver" : undefined),
    opacity: layer.getOpacity(),
    layers: [source?.params_?.LAYERS || ""],
    imageFormat: "image/png",
    customParams: {
      TRANSPARENT: "true",
      zIndex: (layer.getZIndex() || 0) + (layer.get("printIndex") || 0),
    },
    version: "1.3.0",
  };
}

/**
 * Get layer by type for MapFish
 */
async function getLayerByType(layer: Layer, printOptions: PrintRequestAttributes, map: Map): Promise<MapFishLayer | MapFishLayer[] | undefined> {
  const layerName = layer.get("name") || "unknown";

  if (layer instanceof VectorLayer) {
    try {
      return buildVectorLayer(layer as VectorLayer, map);
    } catch (error) {
      console.warn(`[Print] Failed to build vector layer "${layerName}":`, error);
      return undefined;
    }
  } else if (layer instanceof ImageLayer) {
    try {
      const sourceType = LayerHelpers.getLayerSourceType(layer.getSource()!);
      if (sourceType === OL_DATA_TYPES.ImageArcGISRest) {
        return configureImageLayer(layer, printOptions, map);
      } else {
        return configureWMSImageLayer(layer);
      }
    } catch (error) {
      console.warn(`[Print] Failed to build image layer "${layerName}":`, error);
      return undefined;
    }
  } else if (layer instanceof TileLayer) {
    try {
      return await configureTileLayer(layer);
    } catch (error) {
      console.warn(`[Print] Failed to build tile layer "${layerName}":`, error);
      return undefined;
    }
  } else if (layer instanceof LayerGroup) {
    const layers: MapFishLayer[] = [];
    const groupLayers = layer.getLayers().getArray();

    for (const item of groupLayers) {
      if (item.getProperties().print === false) continue;

      try {
        const retLayers = await getLayerByType(item, printOptions, map);
        if (retLayers) {
          if (Array.isArray(retLayers)) {
            layers.push(...retLayers);
          } else {
            layers.push(retLayers);
          }
        }
      } catch (error) {
        const itemName = item.get("name") || "unknown";
        console.warn(`[Print] Skipping group child "${itemName}" due to error:`, error);
      }
    }

    return layers.length > 0 ? layers : undefined;
  }

  console.warn("[Print] Unsupported Layer Type", layer);
  return undefined;
}

/**
 * Sort layers by zIndex (descending — MapFish renders first layer on top)
 */
function sortLayers(layers: MapFishLayer[]): MapFishLayer[] {
  return layers.sort((a, b) => {
    const indexA = (a as MapFishWMTSLayer | MapFishOSMLayer | MapFishWMSLayer).customParams?.zIndex ?? 99999999;
    const indexB = (b as MapFishWMTSLayer | MapFishOSMLayer | MapFishWMSLayer).customParams?.zIndex ?? 99999999;

    if (indexA > indexB) return -1;
    if (indexA < indexB) return 1;
    return 0;
  });
}

/**
 * Check if layer is overview layer
 */
function isOverviewLayer(layerName: string): boolean {
  return printConfig.overviewMapLayers.includes(layerName);
}

/**
 * Switch templates based on options
 */
function switchTemplates(options: PrintState, map: Map): PrintRequestAttributes {
  const mapProjection = map.getView().getProjection().getCode();
  const longitudeFirst = true;
  const currentMapViewCenter = map.getView().getCenter() || [0, 0];
  const mapExtent = map.getView().calculateExtent();
  const currentMapScale = getMapScale(map);
  const overviewMapScale = 2990000;
  const rotation = 0;
  const dpi = parseInt(options.mapResolutionOption);

  let printSize = !options.printSizeSelectedOption.size || options.printSizeSelectedOption.size.length === 0 ? map.getSize() || [800, 600] : options.printSizeSelectedOption.size;

  const parameters = options.options?.parameters || [];

  const attributes: PrintRequestAttributes = {
    title: options.mapTitle,
    description: options.termsOfUse,
    map: {},
    scalebar: {
      geodetic: currentMapScale,
    },
    scale: "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  };

  // Add custom parameters
  parameters.forEach((item) => {
    attributes[item.name] = item.value;
  });

  attributes.map.projection = mapProjection;
  attributes.map.longitudeFirst = longitudeFirst;
  attributes.map.rotation = rotation;
  attributes.map.dpi = dpi;

  if (options.printSizeSelectedOption.size.length === 0) {
    if (options.mapOnlyHeight) attributes.map.height = parseInt(options.mapOnlyHeight);
    if (options.mapOnlyWidth) attributes.map.width = parseInt(options.mapOnlyWidth);
    printSize = [parseInt(options.mapOnlyWidth), parseInt(options.mapOnlyHeight)];
  }

  switch (options.mapScaleOption) {
    case "forceScale":
      attributes.scalebar.geodetic = parseInt(options.forceScale);
      attributes.map.scale = parseInt(options.forceScale);
      attributes.scale = "1 : " + options.forceScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      attributes.map.center = currentMapViewCenter;
      break;

    case "preserveMapExtent":
      const dims = computeDimension(printSize[0], printSize[1], mapExtent);
      attributes.map.height = dims.newHeight;
      attributes.map.width = dims.newWidth;
      attributes.map.bbox = mapExtent;
      break;

    default: // preserveMapScale
      attributes.map.scale = currentMapScale;
      attributes.map.center = currentMapViewCenter;
      break;
  }

  if (options.printSizeSelectedOption.overview) {
    attributes.overviewMap = {
      projection: mapProjection,
      center: currentMapViewCenter,
      scale: overviewMapScale,
      longitudeFirst,
      rotation,
      dpi,
    };
  }

  return attributes;
}

// =============================================================================
// Main Print Request Function
// =============================================================================

/**
 * Build print request for MapFish Print server
 */
export async function buildPrintRequest(mapLayers: Layer[], printSelectedOption: PrintState, map: Map, printLogo?: string): Promise<PrintRequestObject> {
  // Initialize print request object
  const printRequest: PrintRequestObject = {
    layout: "",
    outputFormat: "",
    dpi: parseInt(printSelectedOption.mapResolutionOption),
    compressed: true,
    parameters: printSelectedOption.options?.parameters || [],
    attributes: switchTemplates(printSelectedOption, map),
  };

  printRequest.outputFormat = printSelectedOption.printFormatSelectedOption.value;
  printRequest.layout = printSelectedOption.printSizeSelectedOption.layout;

  const mainMap: MapFishLayer[] = [];
  const overviewMap: MapFishLayer[] = [];

  // Set print index by zIndex ranking so highest zIndex gets lowest printIndex.
  const orderedLayers: Layer[] = [];
  mapLayers.forEach((layer) => {
    if (layer instanceof LayerGroup) {
      layer.getLayers().forEach((item) => {
        orderedLayers.push(item as unknown as Layer);
      });
    } else {
      orderedLayers.push(layer);
    }
  });

  orderedLayers
    .sort((a, b) => (b.getZIndex() || 0) - (a.getZIndex() || 0))
    .forEach((layer, index) => {
      layer.setProperties({ printIndex: index + 1 });
    });

  // Process each layer
  // Note: Layers with print=false are skipped
  // Layers with display=false are NOT visible on map but ARE included in print
  for (const layer of mapLayers) {
    if (layer.getProperties().print === false) continue;

    try {
      const retLayers = await getLayerByType(layer, printRequest.attributes, map);
      if (retLayers) {
        if (Array.isArray(retLayers)) {
          mainMap.push(...retLayers);
          retLayers.forEach((item) => {
            const layerItem = item as MapFishWMTSLayer;
            if (layerItem.layer && isOverviewLayer(layerItem.layer)) {
              overviewMap.push(item);
            }
          });
        } else {
          mainMap.push(retLayers);
          const layerItem = retLayers as MapFishWMTSLayer;
          if (layerItem.layer && isOverviewLayer(layerItem.layer)) {
            overviewMap.push(retLayers);
          }
        }
      }
    } catch (error) {
      const layerName = layer.get("name") || "unknown";
      console.warn(`[Print] Skipping layer "${layerName}" due to error:`, error);
    }
  }

  // Sort and assign layers
  printRequest.attributes.map.layers = sortLayers(mainMap);

  if (printRequest.attributes.overviewMap) {
    printRequest.attributes.overviewMap.layers = sortLayers(overviewMap);
  }

  // Add logo if specified
  if (printLogo) {
    printRequest.attributes.imageName = printSelectedOption.printSizeSelectedOption.imageName || printLogo;
  }

  return printRequest;
}

const printRequestModule = {
  buildPrintRequest,
  loadTileMatrix,
  loadWMTSConfig,
};

export default printRequestModule;
