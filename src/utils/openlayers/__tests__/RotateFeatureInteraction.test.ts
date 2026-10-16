import { describe, it, expect, vi } from "vitest";
import { Feature } from "ol";
import { LineString, Point } from "ol/geom";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import type BaseLayer from "ol/layer/Base";
import type OLMap from "ol/Map";
import { RotateFeatureInteraction } from "@/utils/openlayers/RotateFeatureInteraction";

const pointerEvent = (coordinate: number[]) =>
  ({
    coordinate,
    pixel: [0, 0],
    originalEvent: { pointerId: 1, button: 0, buttons: 1, isPrimary: true, pointerType: "mouse" },
  }) as unknown as MapBrowserEvent<PointerEvent>;

const createInteraction = (features: Feature[]) => {
  const layer = {} as BaseLayer;
  const onRotateEnd = vi.fn();
  const interaction = new RotateFeatureInteraction({ layer, onRotateEnd });
  const viewport = document.createElement("div");
  const map = {
    getViewport: () => viewport,
    forEachFeatureAtPixel: (_pixel: number[], callback: (feature: Feature) => Feature | undefined) => {
      for (const feature of features) {
        const hit = callback(feature);
        if (hit) return hit;
      }
      return undefined;
    },
  };
  vi.spyOn(interaction, "getMap").mockReturnValue(map as unknown as OLMap);
  return { interaction, onRotateEnd, viewport };
};

describe("RotateFeatureInteraction", () => {
  it("rotates a line around its extent center to follow the pointer", () => {
    const feature = new Feature({
      geometry: new LineString([
        [-1, 0],
        [1, 0],
      ]),
    });
    const { interaction } = createInteraction([feature]);

    expect(interaction.handleDownEvent(pointerEvent([1, 0]))).toBe(true);
    interaction.handleDragEvent(pointerEvent([0, 1]));

    const coords = (feature.getGeometry() as LineString).getCoordinates();
    expect(coords[1][0]).toBeCloseTo(0, 6);
    expect(coords[1][1]).toBeCloseTo(1, 6);
    expect(coords[0][1]).toBeCloseTo(-1, 6);
  });

  it("takes the shortest path when the pointer crosses the ±π boundary", () => {
    const feature = new Feature({
      geometry: new LineString([
        [-1, 0],
        [1, 0],
      ]),
    });
    const { interaction } = createInteraction([feature]);

    interaction.handleDownEvent(pointerEvent([-1, 0.01]));
    interaction.handleDragEvent(pointerEvent([-1, -0.01]));

    const coords = (feature.getGeometry() as LineString).getCoordinates();
    expect(coords[1][1]).toBeCloseTo(0.02, 2);
  });

  it("reports the rotated feature on pointer up", () => {
    const feature = new Feature({
      geometry: new LineString([
        [-1, 0],
        [1, 0],
      ]),
    });
    const { interaction, onRotateEnd } = createInteraction([feature]);

    interaction.handleDownEvent(pointerEvent([1, 0]));
    interaction.handleDragEvent(pointerEvent([0, 1]));
    interaction.handleUpEvent();

    expect(onRotateEnd).toHaveBeenCalledWith(feature);
  });

  it("does not report a click without movement", () => {
    const feature = new Feature({
      geometry: new LineString([
        [-1, 0],
        [1, 0],
      ]),
    });
    const { interaction, onRotateEnd } = createInteraction([feature]);

    interaction.handleDownEvent(pointerEvent([1, 0]));
    interaction.handleUpEvent();

    expect(onRotateEnd).not.toHaveBeenCalled();
  });

  it("shows a grab cursor over a rotatable feature", () => {
    const feature = new Feature({
      geometry: new LineString([
        [-1, 0],
        [1, 0],
      ]),
    });
    const { interaction, viewport } = createInteraction([feature]);

    interaction.handleMoveEvent(pointerEvent([1, 0]));

    expect(viewport.style.cursor).toBe("grab");
  });

  it("clears the cursor when hovering empty space", () => {
    const { interaction, viewport } = createInteraction([]);
    viewport.style.cursor = "grab";

    interaction.handleMoveEvent(pointerEvent([5, 5]));

    expect(viewport.style.cursor).toBe("");
  });

  it("shows a grabbing cursor while rotating and restores it on release", () => {
    const feature = new Feature({
      geometry: new LineString([
        [-1, 0],
        [1, 0],
      ]),
    });
    const { interaction, viewport } = createInteraction([feature]);

    interaction.handleDownEvent(pointerEvent([1, 0]));
    expect(viewport.style.cursor).toBe("grabbing");

    interaction.handleUpEvent();
    expect(viewport.style.cursor).toBe("");
  });

  it("ignores point features", () => {
    const { interaction } = createInteraction([new Feature({ geometry: new Point([0, 0]) })]);

    expect(interaction.handleDownEvent(pointerEvent([0, 0]))).toBe(false);
  });

  it("ignores bearing and measure features", () => {
    const bearing = new Feature({
      geometry: new LineString([
        [0, 0],
        [1, 1],
      ]),
      drawType: "Bearing",
    });
    const { interaction } = createInteraction([bearing]);

    expect(interaction.handleDownEvent(pointerEvent([1, 1]))).toBe(false);
  });
});
