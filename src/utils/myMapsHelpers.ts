/**
 * Utility functions for MyMaps functionality
 */

import { Style, Fill, Stroke, Circle as CircleStyle, Text, RegularShape } from "ol/style";
import { Feature } from "ol";
import type { FeatureLike } from "ol/Feature";
import { Point, LineString, Polygon, Circle } from "ol/geom";
import { asArray } from "ol/color";
import { fromCircle } from "ol/geom/Polygon";
import { getLength, getArea } from "ol/sphere";
import { transform } from "ol/proj";
import GeoJSON from "ol/format/GeoJSON";
import { FeatureHelpers } from "@/utils/openlayers/FeatureHelpers";
import type { OLDataType } from "@/utils/openlayers/types";
import { OL_DATA_TYPES } from "@/utils/openlayers/types";
import type { MyMapsItem, FeatureStyleOptions, ValidationResult, StyleJSON } from "@/types/myMaps";

// Generate unique identifier
export const generateUID = (): string => {
  return "mymaps_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
};

// Convert degrees to radians
export const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

// Convert radians to degrees
export const radiansToDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

// Convert Web Mercator coordinates to Lat/Long
export const toLatLongFromWebMercator = (coords: number[]): number[] => {
  return transform(coords, "EPSG:3857", "EPSG:4326");
};

// Convert Lat/Long coordinates to Web Mercator
export const toWebMercatorFromLatLong = (coords: number[]): number[] => {
  return transform(coords, "EPSG:4326", "EPSG:3857");
};

// Calculate geographic bearing between two points (like original app)
export const getBearing = (fromPoint: number[], toPoint: number[]): number => {
  const fromPointLL = toLatLongFromWebMercator(fromPoint);
  const toPointLL = toLatLongFromWebMercator(toPoint);

  const startLat = degreesToRadians(fromPointLL[1]);
  const startLong = degreesToRadians(fromPointLL[0]);
  const endLat = degreesToRadians(toPointLL[1]);
  const endLong = degreesToRadians(toPointLL[0]);

  let dLong = endLong - startLong;

  const dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));
  if (Math.abs(dLong) > Math.PI) {
    if (dLong > 0.0) dLong = -(2.0 * Math.PI - dLong);
    else dLong = 2.0 * Math.PI + dLong;
  }

  const deg = (radiansToDegrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
  const degRounded = Math.round(deg * 100) / 100;
  return degRounded;
};

// Legacy function name for backward compatibility
export const calculateBearing = getBearing;

// Format length output
export const formatLength = (line: LineString): string => {
  const length = getLength(line);
  let output: string;

  if (length > 1000) {
    output = Math.round((length / 1000) * 100) / 100 + " km";
  } else {
    output = Math.round(length * 100) / 100 + " m";
  }

  return output;
};

// Format area output
export const formatArea = (polygon: Polygon): string => {
  const area = getArea(polygon);
  let output: string;

  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + " km²";
  } else {
    output = Math.round(area * 100) / 100 + " m²";
  }

  return output;
};

// Create default drawing style
export const createDefaultDrawStyle = (options: FeatureStyleOptions = {}): Style => {
  const { drawColor = "#e809e5", strokeWidth = 2, fillOpacity = 0.3, strokeOpacity = 0.8, pointRadius = 8, isText = false, geometryType = "Point" } = options;

  const fillColor = `${drawColor}${Math.round(fillOpacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
  const strokeColor = `${drawColor}${Math.round(strokeOpacity * 255)
    .toString(16)
    .padStart(2, "0")}`;

  const styleConfig: {
    fill?: Fill;
    stroke?: Stroke;
    image?: CircleStyle;
    text?: Text;
  } = {
    fill: new Fill({
      color: fillColor,
    }),
    stroke: new Stroke({
      color: strokeColor,
      width: strokeWidth,
    }),
  };

  // Add point style for points and text
  if (geometryType === "Point" || isText) {
    styleConfig.image = new CircleStyle({
      radius: pointRadius,
      fill: new Fill({
        color: fillColor,
      }),
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth,
      }),
    });
  }

  // Add text style for text features
  if (isText) {
    styleConfig.text = new Text({
      text: "Text",
      font: "12px Arial",
      fill: new Fill({
        color: drawColor,
      }),
      stroke: new Stroke({
        color: "#ffffff",
        width: 2,
      }),
    });
  }

  return new Style(styleConfig);
};

// Convert OpenLayers style to JSON representation
export const styleToJSON = (style: Style): StyleJSON => {
  if (!style) return {} as StyleJSON;

  const styleObj: Partial<StyleJSON> = {};

  const fill = style.getFill();
  if (fill) {
    const color = fill.getColor();
    if (color) {
      styleObj.fill = {
        color: typeof color === "string" ? color : (color as number[]),
      };
    }
  }

  const stroke = style.getStroke();
  if (stroke) {
    const color = stroke.getColor();
    if (color) {
      styleObj.stroke = {
        color: typeof color === "string" ? color : (color as number[]),
        width: stroke.getWidth(),
        lineDash: stroke.getLineDash() || undefined,
      };
    }
  }

  const image = style.getImage();
  if (image instanceof CircleStyle) {
    const imageFill = image.getFill();
    const imageStroke = image.getStroke();

    styleObj.image = {
      type: "circle" as const,
      radius: image.getRadius(),
      fill: imageFill ? { color: imageFill.getColor() as string } : undefined,
      stroke: imageStroke
        ? {
            color: imageStroke.getColor() as string,
            width: imageStroke.getWidth(),
            lineDash: imageStroke.getLineDash() || undefined,
          }
        : undefined,
    };
  } else if (image instanceof RegularShape) {
    const imageFill = image.getFill();
    const imageStroke = image.getStroke();

    styleObj.image = {
      type: "regularShape" as const,
      radius: image.getRadius(),
      radius2: image.getRadius2(),
      points: image.getPoints(),
      angle: image.getAngle(),
      rotation: image.getRotation(), // This is what the Angle slider controls!
      fill: imageFill ? { color: imageFill.getColor() as string } : undefined,
      stroke: imageStroke
        ? {
            color: imageStroke.getColor() as string,
            width: imageStroke.getWidth(),
            lineDash: imageStroke.getLineDash() || undefined,
          }
        : undefined,
    };
  }

  const text = style.getText();
  if (text) {
    const textFill = text.getFill();
    const textStroke = text.getStroke();

    const textContent = text.getText();
    const textString = Array.isArray(textContent) ? textContent.join(" ") : textContent || "";

    styleObj.text = {
      text: textString,
      font: text.getFont(),
      fill: textFill
        ? {
            color: typeof textFill.getColor() === "string" ? (textFill.getColor() as string) : (textFill.getColor() as number[]),
          }
        : undefined,
      stroke: textStroke
        ? {
            color: typeof textStroke.getColor() === "string" ? (textStroke.getColor() as string) : (textStroke.getColor() as number[]),
            width: textStroke.getWidth(),
          }
        : undefined,
    };
  }

  return styleObj as StyleJSON;
};

// Convert JSON representation back to OpenLayers style
export const styleFromJSON = (styleJSON: StyleJSON): Style => {
  if (!styleJSON) return new Style();

  const styleConfig: {
    fill?: Fill;
    stroke?: Stroke;
    image?: CircleStyle | RegularShape;
    text?: Text;
  } = {};

  if (styleJSON.fill) {
    styleConfig.fill = new Fill({
      color: styleJSON.fill.color,
    });
  }

  if (styleJSON.stroke) {
    styleConfig.stroke = new Stroke({
      color: styleJSON.stroke.color,
      width: styleJSON.stroke.width,
      lineDash: styleJSON.stroke.lineDash,
    });
  }

  if (styleJSON.image) {
    if (styleJSON.image.type === "circle") {
      const imageConfig: {
        radius: number;
        fill?: Fill;
        stroke?: Stroke;
      } = {
        radius: styleJSON.image.radius || 8,
      };

      if (styleJSON.image.fill) {
        imageConfig.fill = new Fill({
          color: styleJSON.image.fill.color,
        });
      }

      if (styleJSON.image.stroke) {
        imageConfig.stroke = new Stroke({
          color: styleJSON.image.stroke.color,
          width: styleJSON.image.stroke.width,
          lineDash: styleJSON.image.stroke.lineDash,
        });
      }

      styleConfig.image = new CircleStyle(imageConfig);
    } else if (styleJSON.image.type === "regularShape") {
      const regularShapeConfig: {
        points: number;
        radius: number;
        radius2?: number;
        angle?: number;
        rotation?: number;
        fill?: Fill;
        stroke?: Stroke;
      } = {
        points: styleJSON.image.points || 4,
        radius: styleJSON.image.radius || 8,
        radius2: styleJSON.image.radius2,
        angle: styleJSON.image.angle || 0,
        rotation: styleJSON.image.rotation || 0,
      };

      if (styleJSON.image.fill) {
        regularShapeConfig.fill = new Fill({
          color: styleJSON.image.fill.color,
        });
      }

      if (styleJSON.image.stroke) {
        regularShapeConfig.stroke = new Stroke({
          color: styleJSON.image.stroke.color,
          width: styleJSON.image.stroke.width,
          lineDash: styleJSON.image.stroke.lineDash,
        });
      }

      styleConfig.image = new RegularShape(regularShapeConfig);
    }
  }

  if (styleJSON.text) {
    const textConfig: {
      text: string;
      font?: string;
      fill?: Fill;
      stroke?: Stroke;
    } = {
      text: styleJSON.text.text,
      font: styleJSON.text.font,
    };

    if (styleJSON.text.fill) {
      textConfig.fill = new Fill({
        color: styleJSON.text.fill.color,
      });
    }

    if (styleJSON.text.stroke) {
      textConfig.stroke = new Stroke({
        color: styleJSON.text.stroke.color,
        width: styleJSON.text.stroke.width,
      });
    }

    styleConfig.text = new Text(textConfig);
  }

  return new Style(styleConfig);
};

// Convert feature to GeoJSON string
export const featureToGeoJSON = (feature: Feature): string => {
  const geoJSONFormat = new GeoJSON({
    dataProjection: "EPSG:3857",
    featureProjection: "EPSG:3857",
  });

  return geoJSONFormat.writeFeature(feature, {
    dataProjection: "EPSG:3857",
    featureProjection: "EPSG:3857",
  });
};

// Convert GeoJSON string to feature
export const featureFromGeoJSON = (geoJSONString: string): Feature => {
  const geoJSONFormat = new GeoJSON({
    dataProjection: "EPSG:3857",
    featureProjection: "EPSG:3857",
  });

  const result = geoJSONFormat.readFeature(geoJSONString, {
    dataProjection: "EPSG:3857",
    featureProjection: "EPSG:3857",
  });

  // readFeature can return Feature | Feature[], ensure we get a Feature
  return Array.isArray(result) ? result[0] : result;
};

// Convert circle to polygon (for GeoJSON compatibility)
export const convertCircleToPolygon = (feature: Feature): Feature => {
  const geometry = feature.getGeometry();

  if (geometry instanceof Circle) {
    const polygon = fromCircle(geometry, 64); // 64 sides for smooth circle
    const newFeature = feature.clone();
    newFeature.setGeometry(polygon);
    return newFeature;
  }

  return feature;
};

// Convert LineString to arrow (keeps as LineString with arrowhead at end)
export const convertLineToArrow = (geometry: LineString): LineString => {
  // GET 10% OF THE END OF LINE TO USE AS ARROW (like original app)
  const start = geometry.getCoordinateAt(0.8);
  const end = geometry.getCoordinateAt(1);

  // RIGHT OF LINE - create arrow wing
  const lineStr1 = new LineString([start, end]);
  lineStr1.rotate(0.7853981634, end); // 45 degrees in radians

  // LEFT OF LINE - create arrow wing
  const lineStr2 = new LineString([start, end]);
  lineStr2.rotate(-0.7853981634, end); // -45 degrees in radians

  // Clone original line and append arrowhead coordinates
  const clone = geometry.clone();
  clone.appendCoordinate(lineStr1.getFirstCoordinate());
  clone.appendCoordinate(lineStr2.getFirstCoordinate());
  clone.appendCoordinate(end);

  return clone;
};

// Validate MyMaps item
export const validateMyMapsItem = (item: Partial<MyMapsItem>): ValidationResult => {
  const errors: string[] = [];

  if (!item.id) errors.push("ID is required");
  if (!item.label || typeof item.label !== "string") errors.push("Label must be a non-empty string");
  if (!item.featureGeoJSON) errors.push("Feature GeoJSON is required");
  if (!item.drawType) errors.push("Draw type is required");
  if (!item.geometryType) errors.push("Geometry type is required");
  if (typeof item.visible !== "boolean") errors.push("Visible must be a boolean");
  if (typeof item.labelVisible !== "boolean") errors.push("Label visible must be a boolean");
  if (typeof item.labelRotation !== "number") errors.push("Label rotation must be a number");

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Export features to different formats
// Format string to OL_DATA_TYPES mapping
const FORMAT_MAP: Record<string, OLDataType> = {
  kml: OL_DATA_TYPES.KML,
  geojson: OL_DATA_TYPES.GeoJSON,
  esrijson: OL_DATA_TYPES.EsriJSON,
  KML: OL_DATA_TYPES.KML,
  GeoJSON: OL_DATA_TYPES.GeoJSON,
  EsriJSON: OL_DATA_TYPES.EsriJSON,
};

/**
 * Export features to a file — matches old React app's onDownloadFeatures pattern.
 * Reads OL features from MyMapsItems, clones them, strips extra properties,
 * converts Circle → Polygon, then uses FeatureHelpers.setFeatures for format conversion
 * (with proper projection handling via OL's built-in defaults).
 */
export const exportFeatures = (items: MyMapsItem[], format: string): void => {
  const dataType = FORMAT_MAP[format];
  if (!dataType) {
    console.error(`Unsupported export format: ${format}`);
    return;
  }

  const visibleFeatures: Feature[] = [];
  items.forEach((item) => {
    if (item.featureGeoJSON) {
      try {
        const feature = featureFromGeoJSON(item.featureGeoJSON).clone();

        // Re-apply style to feature before export (needed for KML export to include styles)
        if (item.style) {
          const featureStyle = item.style instanceof Style ? item.style : styleFromJSON(item.style as StyleJSON);
          feature.setStyle(featureStyle);
        }

        const showCoordinates = feature.get("is_open_data");
        if (showCoordinates || showCoordinates === undefined) {
          // Set label from item
          const label = item.label || "Unnamed Feature";
          feature.set("name", label);
          feature.set("label", label);
          feature.set("description", label);

          // Convert Circle geometry to Polygon (GeoJSON/KML don't support Circle)
          const geom = feature.getGeometry();
          if (geom && geom.getType() === "Circle") {
            feature.setGeometry(fromCircle(geom as Circle, 64));
          }

          visibleFeatures.push(feature);
        }
      } catch (error) {
        console.warn(`Failed to convert feature ${item.id} for export:`, error);
      }
    }
  });

  if (visibleFeatures.length > 0) {
    const content = FeatureHelpers.setFeatures(visibleFeatures.concat([]), dataType);
    if (content !== undefined) {
      downloadFile(content, `features.${dataType.toLowerCase()}`, "text/plain");
    }
  }
};

// Get geometry center for popup positioning
export const getGeometryCenter = (geometry: Point | LineString | Polygon | Circle): number[] => {
  if (geometry instanceof Point) {
    return geometry.getCoordinates();
  } else if (geometry instanceof LineString) {
    const coords = geometry.getCoordinates();
    const midIndex = Math.floor(coords.length / 2);
    return coords[midIndex];
  } else if (geometry instanceof Polygon || geometry instanceof Circle) {
    return geometry.getExtent() ? [(geometry.getExtent()[0] + geometry.getExtent()[2]) / 2, (geometry.getExtent()[1] + geometry.getExtent()[3]) / 2] : [0, 0];
  }

  return [0, 0];
};

// Generate file download
export const downloadFile = (content: string, filename: string, mimeType: string = "text/plain"): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// Copy to clipboard utility
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

// Debounce function for performance
export const debounce = <T extends (...args: unknown[]) => unknown>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Label style interface for callouts and other label styling
export interface LabelStyle {
  textColor: string;
  textSize: string;
  outlineColor: string;
  outlineWidth: number;
  backgroundColor: string;
  borderColor: string;
  lineColor: string;
  anchorColor: string;
}

// Get default label style based on draw type (matching original app)
export const getDefaultLabelStyle = (): LabelStyle => {
  return {
    textColor: "#ffffff",
    textSize: "14px",
    outlineColor: "#000000",
    outlineWidth: 2,
    // Callout-specific properties
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#333333",
    lineColor: "#333333",
    anchorColor: "#333333",
  };
};

// Options for callout style
export interface CalloutStyleOptions {
  drawColor?: string;
  lineColor?: string;
  anchorColor?: string;
}

// Get callout style - Returns a style function for line with circle at anchor point
// Matching original app implementation exactly
export const getCalloutStyle = (opts: CalloutStyleOptions = {}): ((feature: FeatureLike) => Style[]) => {
  const { drawColor = "#333333", lineColor, anchorColor } = opts;

  // Use specific colors if provided, otherwise fall back to drawColor
  const lineColorArray = asArray(lineColor || drawColor);
  const anchorColorArray = asArray(anchorColor || drawColor);

  // Return a style function that positions anchor circle at start of line
  return (feature: FeatureLike): Style[] => {
    if (!(feature instanceof Feature)) return [];
    const geometry = feature.getGeometry();
    if (!geometry || geometry.getType() !== "LineString") {
      return [];
    }

    const lineGeometry = geometry as LineString;
    const coordinates = lineGeometry.getCoordinates();
    const startPoint = coordinates[0];

    // Style for the tail line
    const lineStyle = new Style({
      stroke: new Stroke({
        color: [lineColorArray[0], lineColorArray[1], lineColorArray[2], 0.8],
        width: 2,
      }),
    });

    // Style for the anchor circle at the start point
    const anchorStyle = new Style({
      geometry: new Point(startPoint),
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({ color: [anchorColorArray[0], anchorColorArray[1], anchorColorArray[2], 0.8] }),
        stroke: new Stroke({ color: [anchorColorArray[0], anchorColorArray[1], anchorColorArray[2], 1], width: 1 }),
      }),
    });

    return [lineStyle, anchorStyle];
  };
};
