import PointerInteraction from "ol/interaction/Pointer";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import type BaseLayer from "ol/layer/Base";
import type { FeatureLike } from "ol/Feature";
import type { Feature } from "ol";
import type { Coordinate } from "ol/coordinate";
import { getCenter } from "ol/extent";
import { primaryAction } from "ol/events/condition";

const NON_ROTATABLE_DRAW_TYPES = ["Bearing", "Measure"];

const isRotatable = (feature: FeatureLike): boolean => {
  const geometryType = feature.getGeometry()?.getType();
  if (!geometryType || geometryType === "Point" || geometryType === "MultiPoint") return false;
  return !NON_ROTATABLE_DRAW_TYPES.includes(feature.get("drawType"));
};

const angleFrom = (pivot: Coordinate, point: Coordinate): number => Math.atan2(point[1] - pivot[1], point[0] - pivot[0]);

interface RotateFeatureInteractionOptions {
  layer: BaseLayer;
  onRotateEnd: (feature: Feature) => void;
}

// Drags a line or polygon around the center of its extent. Angles use map coordinates, so map rotation does not skew them.
export class RotateFeatureInteraction extends PointerInteraction {
  private readonly layer: BaseLayer;
  private readonly onRotateEnd: (feature: Feature) => void;
  private feature: Feature | null = null;
  private pivot: Coordinate | null = null;
  private lastAngle = 0;
  private rotated = false;

  constructor(options: RotateFeatureInteractionOptions) {
    super();
    this.layer = options.layer;
    this.onRotateEnd = options.onRotateEnd;
  }

  handleDownEvent(event: MapBrowserEvent<PointerEvent>): boolean {
    if (!primaryAction(event)) return false;

    const feature = this.findRotatableFeature(event.pixel);
    const geometry = feature?.getGeometry();
    if (!feature || !geometry) return false;

    this.feature = feature;
    this.pivot = getCenter(geometry.getExtent());
    this.lastAngle = angleFrom(this.pivot, event.coordinate);
    this.rotated = false;
    this.setCursor("grabbing");
    return true;
  }

  handleDragEvent(event: MapBrowserEvent<PointerEvent>): void {
    if (!this.feature || !this.pivot) return;

    const angle = angleFrom(this.pivot, event.coordinate);
    let delta = angle - this.lastAngle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    this.lastAngle = angle;
    if (delta === 0) return;

    this.feature.getGeometry()?.rotate(delta, this.pivot);
    this.rotated = true;
  }

  handleMoveEvent(event: MapBrowserEvent<PointerEvent>): void {
    this.setCursor(this.findRotatableFeature(event.pixel) ? "grab" : "");
  }

  handleUpEvent(): boolean {
    const feature = this.feature;
    const wasRotated = this.rotated;
    this.feature = null;
    this.pivot = null;
    this.rotated = false;
    this.setCursor("");

    if (feature && wasRotated) this.onRotateEnd(feature);
    return false;
  }

  private setCursor(cursor: string) {
    const viewport = this.getMap()?.getViewport();
    if (viewport) viewport.style.cursor = cursor;
  }

  private findRotatableFeature(pixel: number[]): Feature | null {
    const map = this.getMap();
    if (!map) return null;

    const found = map.forEachFeatureAtPixel(pixel, (feature) => (isRotatable(feature) ? (feature as Feature) : undefined), {
      layerFilter: (layer) => layer === this.layer,
      hitTolerance: 5,
    });
    return found ?? null;
  }
}
