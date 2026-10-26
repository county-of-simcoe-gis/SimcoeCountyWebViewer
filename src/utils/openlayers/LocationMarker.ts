import { Feature } from "ol";
import { Circle, LineString, Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { LayerManager } from "@/utils/openlayers/LayerManager";

export const TEMPORARY_MARKER_MS = 5000;
const MARKER_LAYER_ID = "locationFollow::graphics";

export interface LocationFix {
  lonLat: [number, number];
  accuracy: number;
}

const accuracyFeature = new Feature();
accuracyFeature.setStyle(
  new Style({
    fill: new Fill({ color: "rgba(51, 153, 255, 0.15)" }),
    stroke: new Stroke({ color: "rgba(51, 153, 255, 0.6)", width: 1 }),
  }),
);

const positionFeature = new Feature();
positionFeature.setStyle(
  new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: "#3399ff" }),
      stroke: new Stroke({ color: "#ffffff", width: 2 }),
    }),
  }),
);

const trackFeature = new Feature();
trackFeature.setStyle(new Style({ stroke: new Stroke({ color: "#e809e5", width: 3 }) }));

let markerLayerId: string | null = null;
let markerTimeoutId: ReturnType<typeof setTimeout> | null = null;

const ensureMarkerLayer = (): void => {
  if (markerLayerId) return;
  const layer = new VectorLayer({
    source: new VectorSource({ features: [accuracyFeature, positionFeature, trackFeature] }),
  });
  markerLayerId = LayerManager.addLayer(layer, "Graphics", "Location Follow", { id: MARKER_LAYER_ID });
};

export function setMarkerPosition(fix: LocationFix, coordinate: number[], trackCoords: number[][] | null): void {
  ensureMarkerLayer();
  positionFeature.setGeometry(new Point(coordinate));
  const latitudeRadians = (fix.lonLat[1] * Math.PI) / 180;
  accuracyFeature.setGeometry(fix.accuracy > 0 ? new Circle(coordinate, fix.accuracy / Math.cos(latitudeRadians)) : undefined);
  trackFeature.setGeometry(trackCoords && trackCoords.length > 1 ? new LineString(trackCoords) : undefined);
}

export function showTemporaryMarker(fix: LocationFix): void {
  cancelTemporaryMarker();
  setMarkerPosition(fix, fromLonLat(fix.lonLat), null);
  markerTimeoutId = setTimeout(() => {
    markerTimeoutId = null;
    removeMarker();
  }, TEMPORARY_MARKER_MS);
}

export function cancelTemporaryMarker(): void {
  if (markerTimeoutId === null) return;
  clearTimeout(markerTimeoutId);
  markerTimeoutId = null;
}

export function removeMarker(): void {
  cancelTemporaryMarker();
  if (markerLayerId) LayerManager.removeLayer(markerLayerId);
  markerLayerId = null;
}
