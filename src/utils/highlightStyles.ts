/**
 * Utility to build OpenLayers highlight styles from AppConfig.featureHighlitStyles
 * with hardcoded defaults as fallback.
 */
import { Fill, Stroke, Style, Circle as CircleStyle } from "ol/style";
import { useAppStore } from "@/stores/appStore";

interface HighlightStyles {
  point: Style;
  polygon: Style;
  parcel: Style;
  zoomFactor: number;
}

/**
 * Build OL highlight styles from the merged app config.
 * Falls back to sensible defaults when the config doesn't override.
 */
export function getHighlightStyles(): HighlightStyles {
  const config = useAppStore.getState().config;
  const hs = config?.featureHighlitStyles;

  const circleRadius = hs?.circleRadius ?? 7;
  const circleStroke = hs?.circleStroke ?? "rgba(0,0,0,1)";
  const circleStrokeWidth = hs?.circleStrokeWidth ?? 2;
  const circleFill = hs?.circleFill ?? "rgba(250,40,255,1)";
  const stroke = hs?.stroke ?? "rgba(255,0,0,0.8)";
  const strokeWidth = hs?.strokeWidth ?? 4;
  const fill = hs?.fill ?? "rgba(255,0,0,0)";
  const zoomFactor = hs?.zoomFactor ?? 1;

  const point = new Style({
    image: new CircleStyle({
      radius: circleRadius,
      stroke: new Stroke({ color: circleStroke, width: circleStrokeWidth }),
      fill: new Fill({ color: circleFill }),
    }),
  });

  const polygon = new Style({
    stroke: new Stroke({ width: strokeWidth, color: stroke }),
    fill: new Fill({ color: fill }),
  });

  // Parcel highlight uses a slightly different default (semi-transparent red border)
  const parcelStroke = hs?.stroke ?? "rgba(231,128,128,0.8)";
  const parcelStrokeWidth = hs?.strokeWidth ?? 3;
  const parcelFill = hs?.fill ?? "rgba(0,0,0,0)";

  const parcel = new Style({
    stroke: new Stroke({ width: parcelStrokeWidth, color: parcelStroke }),
    fill: new Fill({ color: parcelFill }),
  });

  return { point, polygon, parcel, zoomFactor };
}
