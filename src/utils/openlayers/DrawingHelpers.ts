"use client";

import { Circle as CircleStyle, Fill, Stroke, Style, RegularShape } from "ol/style";

export function getPointStyle(
  pointType: string = "circle", 
  radius: number = 5, 
  strokeColor: string | [number, number, number, number] = "black", 
  strokeWidth: number = 2, 
  fillColor: string | [number, number, number, number] = "red", 
  rotation: number = 0, 
  strokeType: string = "normal"
): Style {
  const fill = new Fill({ color: fillColor });

  let stroke = new Stroke({ color: strokeColor, width: strokeWidth });
  if (strokeType === "dash") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [10],
    });
  } else if (strokeType === "dot") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [1, 5],
    });
  }

  // CIRCLE STYLE
  if (pointType === "circle") {
    return new Style({
      image: new CircleStyle({
        radius: radius,
        stroke: stroke,
        fill: fill,
      }),
    });
  }

  let style: Style | null = null;
  if (pointType === "square") {
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 4,
        radius: radius,
        angle: Math.PI / 4,
        rotation: rotation,
      }),
    });
  } else if (pointType === "triangle") {
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 3,
        radius: radius,
        rotation: rotation,
        angle: 0,
      }),
    });
  } else if (pointType === "star") {
    let radius2 = 0;
    if (radius < 15) radius2 = 4;
    else if (radius > 15 && radius < 40) radius2 = 8;
    else if (radius > 40 && radius < 70) radius2 = 16;
    else radius2 = 22;
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 5,
        radius: radius,
        radius2: radius2,
        angle: 0,
        rotation: rotation,
      }),
    });
  } else if (pointType === "cross") {
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 4,
        radius: radius,
        radius2: 0,
        angle: 0,
        rotation: rotation,
      }),
    });
  } else if (pointType === "x") {
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 4,
        radius: radius,
        radius2: 0,
        angle: Math.PI / 4,
        rotation: rotation,
      }),
    });
  }

  return style || new Style();
}

export function getLineStringStyle(
  strokeColor: string | [number, number, number, number] = "black", 
  strokeWidth: number = 2, 
  strokeType: string = "normal"
): Style {
  let stroke = new Stroke({ color: strokeColor, width: strokeWidth });
  if (strokeType === "dash") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [10],
    });
  } else if (strokeType === "dot") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [1, 5],
    });
  }

  return new Style({
    stroke: stroke,
  });
}

export function getPolygonStyle(
  strokeColor: string | [number, number, number, number] = "black", 
  strokeWidth: number = 2, 
  fillColor: string | [number, number, number, number] = "red", 
  strokeType: string = "normal"
): Style {
  const fill = new Fill({ color: fillColor });

  let stroke = new Stroke({ color: strokeColor, width: strokeWidth });
  if (strokeType === "dash") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [10],
    });
  } else if (strokeType === "dot") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [1, 5],
    });
  }

  return new Style({
    fill: fill,
    stroke: stroke,
  });
}
