/**
 * Style creation functions for MyMaps features.
 * These functions create OpenLayers Style objects for different geometry types.
 */

import { Style, Stroke, Fill, Circle as CircleStyle, RegularShape } from "ol/style";

export type PointStyleType = "circle" | "cross" | "square" | "triangle" | "star" | "x";
export type StrokeStyleType = "normal" | "dash" | "dot";

/**
 * Creates an OpenLayers Style for point geometries.
 */
export const getPointStyle = (
  pointType: string,
  radius: number,
  strokeColor: [number, number, number, number],
  strokeWidth: number,
  fillColor: [number, number, number, number],
  rotation: number,
  strokeType: string,
): Style => {
  const strokeConfig: { color: [number, number, number, number]; width: number; lineDash?: number[] } = {
    color: strokeColor,
    width: strokeWidth,
  };

  // Add line dash for stroke types
  if (strokeType === "dash") {
    strokeConfig.lineDash = [10, 10];
  } else if (strokeType === "dot") {
    strokeConfig.lineDash = [2, 8];
  }

  let imageStyle;

  if (pointType === "circle") {
    imageStyle = new CircleStyle({
      radius: radius,
      fill: new Fill({ color: fillColor }),
      stroke: new Stroke(strokeConfig),
    });
  } else {
    // For other shapes, use RegularShape
    let points = 4;
    let radius2: number | undefined = undefined;
    let angle = rotation;

    switch (pointType) {
      case "square":
        points = 4;
        angle = Math.PI / 4; // Rotate to make it a square, not diamond
        break;
      case "triangle":
        points = 3;
        break;
      case "star":
        points = 5;
        radius2 = radius * 0.5;
        break;
      case "cross":
        points = 4;
        radius2 = 0;
        break;
      case "x":
        points = 4;
        radius2 = 0;
        angle = Math.PI / 4;
        break;
    }

    imageStyle = new RegularShape({
      points: points,
      radius: radius,
      radius2: radius2,
      angle: angle,
      rotation: rotation,
      fill: new Fill({ color: fillColor }),
      stroke: new Stroke(strokeConfig),
    });
  }

  return new Style({
    image: imageStyle,
  });
};

/**
 * Creates an OpenLayers Style for line string geometries.
 */
export const getLineStringStyle = (strokeColor: [number, number, number, number], strokeWidth: number, strokeType: string): Style => {
  const strokeConfig: { color: [number, number, number, number]; width: number; lineDash?: number[] } = {
    color: strokeColor,
    width: strokeWidth,
  };

  if (strokeType === "dash") {
    strokeConfig.lineDash = [10, 10];
  } else if (strokeType === "dot") {
    strokeConfig.lineDash = [2, 8];
  }

  return new Style({
    stroke: new Stroke(strokeConfig),
  });
};

/**
 * Creates an OpenLayers Style for polygon geometries.
 */
export const getPolygonStyle = (strokeColor: [number, number, number, number], strokeWidth: number, fillColor: [number, number, number, number], strokeType: string): Style => {
  const strokeConfig: { color: [number, number, number, number]; width: number; lineDash?: number[] } = {
    color: strokeColor,
    width: strokeWidth,
  };

  if (strokeType === "dash") {
    strokeConfig.lineDash = [10, 10];
  } else if (strokeType === "dot") {
    strokeConfig.lineDash = [2, 8];
  }

  return new Style({
    fill: new Fill({ color: fillColor }),
    stroke: new Stroke(strokeConfig),
  });
};

/**
 * Extracts point type from an OpenLayers RegularShape or CircleStyle.
 */
export const extractPointTypeFromStyle = (imageStyle: CircleStyle | RegularShape): PointStyleType => {
  if (imageStyle instanceof CircleStyle) {
    return "circle";
  }

  if (imageStyle instanceof RegularShape) {
    const points = imageStyle.getPoints();
    const radius2 = imageStyle.getRadius2();
    const angle = imageStyle.getAngle();

    if (points === 4 && radius2 === 0) {
      // Check angle to distinguish between cross and x
      if (Math.abs(angle - Math.PI / 4) < 0.1) {
        return "x";
      }
      return "cross";
    } else if (points === 4) {
      return "square";
    } else if (points === 3) {
      return "triangle";
    } else if (points === 5) {
      return "star";
    }
  }

  return "circle"; // Default fallback
};

/**
 * Default label style based on draw type.
 */
export interface LabelStyleOptions {
  textColor: string;
  textSize: string;
  outlineColor: string;
  outlineWidth: number;
  backgroundColor: string;
  borderColor: string;
  lineColor: string;
  anchorColor: string;
}

export const getDefaultLabelStyle = (): LabelStyleOptions => {
  return {
    textColor: "#ffffff",
    textSize: "14px",
    outlineColor: "#000000",
    outlineWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#333333",
    lineColor: "#333333",
    anchorColor: "#333333",
  };
};
