/**
 * Hook that manages a dedicated OpenLayers VectorLayer for highlighting
 * features on hover in identify results, live layer results, etc.
 *
 * Uses the LayerManager to register a "Graphics" layer so it renders
 * above all other content and is cleaned up properly on unmount.
 */

import { useEffect, useRef, useCallback } from "react";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style, Stroke, Fill, Circle as CircleStyle } from "ol/style";
import type Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import { useMapStore } from "@/stores/mapStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";

const HIGHLIGHT_MANAGED_ID = "featureHighlight::hover";

const highlightStyle = new Style({
  stroke: new Stroke({ color: "rgba(0, 255, 255, 0.7)", width: 6 }),
  fill: new Fill({ color: "rgba(0, 255, 255, 0.3)" }),
  image: new CircleStyle({
    radius: 10,
    stroke: new Stroke({ color: "rgba(0, 255, 255, 0.7)", width: 6 }),
    fill: new Fill({ color: "rgba(0, 255, 255, 0.3)" }),
  }),
});

let sharedLayer: VectorLayer<VectorSource> | null = null;
let refCount = 0;

function getOrCreateLayer(): VectorLayer<VectorSource> {
  if (sharedLayer) return sharedLayer;

  const layer = new VectorLayer({
    source: new VectorSource(),
    style: highlightStyle,
  });

  LayerManager.addLayer(layer, "Graphics", "Feature Hover Highlight", {
    id: HIGHLIGHT_MANAGED_ID,
  });

  sharedLayer = layer;
  return layer;
}

function releaseLayer() {
  if (sharedLayer) {
    LayerManager.removeLayer(HIGHLIGHT_MANAGED_ID);
    sharedLayer = null;
  }
}

/**
 * Returns `highlightFeature` and `clearHighlight` callbacks that add/remove
 * a feature from a shared highlight vector layer on the map.
 */
export function useFeatureHighlight() {
  const map = useMapStore((s) => s.map);
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Acquire / release the shared layer via ref-counting so multiple
  // consumers (Identify panel + ResultsPopup) can coexist.
  useEffect(() => {
    if (!map) return;

    refCount++;
    layerRef.current = getOrCreateLayer();

    return () => {
      refCount--;
      if (refCount <= 0) {
        releaseLayer();
        refCount = 0;
      }
      layerRef.current = null;
    };
  }, [map]);

  const highlightFeature = useCallback((feature: Feature<Geometry>) => {
    const layer = layerRef.current;
    if (!layer) return;

    const geom = feature.getGeometry();
    if (!geom) return;

    const source = layer.getSource();
    if (!source) return;

    source.clear();
    source.addFeature(feature);
  }, []);

  const clearHighlight = useCallback(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const source = layer.getSource();
    if (!source) return;

    source.clear();
  }, []);

  return { highlightFeature, clearHighlight };
}
