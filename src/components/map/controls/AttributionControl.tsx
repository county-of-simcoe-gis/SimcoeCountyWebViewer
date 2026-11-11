import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Map from "ol/Map";
import type { ViewStateLayerStateExtent } from "ol/View";
import { unByKey } from "ol/Observable";
import { EventsKey } from "ol/events";
import { htmlToText } from "@/utils/helpersCore";

interface AttributionControlProps {
  map?: Map;
}

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : value ? [value] : []);

// Source.getAttributions() returns a function of the frame state, not the credits themselves.
function collectAttributions(map: Map): string[] {
  const view = map.getView();
  const frameState = {
    extent: view.calculateExtent(map.getSize()),
    viewState: view.getState(),
  } as unknown as ViewStateLayerStateExtent;

  const result = new Set<string>();

  map.getAllLayers().forEach((layer) => {
    if (!layer.getVisible() || layer.getOpacity() <= 0) return;

    try {
      if (!layer.isVisible(view)) return;
    } catch {
      // View not ready yet; fall back to the visible flag
    }

    const getAttributions = layer.getSource()?.getAttributions();
    if (!getAttributions) return;

    let raw: unknown;
    try {
      raw = typeof getAttributions === "function" ? getAttributions(frameState) : getAttributions;
    } catch {
      return;
    }

    toArray(raw).forEach((attribution) => {
      if (typeof attribution !== "string") return;
      // DOMParser-based; strips markup so attribution text is rendered as plain text
      const text = htmlToText(attribution).trim();
      if (text) result.add(text);
    });
  });

  return Array.from(result);
}

export const AttributionControl = React.memo(({ map }: AttributionControlProps) => {
  const [attributions, setAttributions] = useState<string[]>([]);
  const target = map?.getTargetElement();

  // Lets CSS lift the scale line and bottom-right controls above the attribution line
  useEffect(() => {
    if (!target || attributions.length === 0) return;
    target.setAttribute("data-has-attribution", "");
    return () => target.removeAttribute("data-has-attribution");
  }, [target, attributions.length]);

  useEffect(() => {
    if (!map) return;

    let layerKeys: EventsKey[] = [];

    const update = () => {
      let next: string[];
      try {
        next = collectAttributions(map);
      } catch {
        next = [];
      }
      setAttributions((prev) => (prev.length === next.length && prev.every((value, i) => value === next[i]) ? prev : next));
    };

    const bindLayers = () => {
      unByKey(layerKeys);
      layerKeys = [];
      map.getAllLayers().forEach((layer) => {
        layerKeys.push(...layer.on(["change:visible", "change:opacity", "change:source"], update));
      });
      update();
    };

    bindLayers();

    const layers = map.getLayers();
    layers.on("add", bindLayers);
    layers.on("remove", bindLayers);
    // Layer min/max zoom limits change what is visible without any layer event
    map.on("moveend", update);

    return () => {
      layers.un("add", bindLayers);
      layers.un("remove", bindLayers);
      map.un("moveend", update);
      unByKey(layerKeys);
    };
  }, [map]);

  if (attributions.length === 0) {
    return null;
  }

  const text = attributions.join(" | ");
  const line = (
    <div className="absolute bottom-0 right-0 z-10 max-w-full truncate whitespace-nowrap bg-base-100/80 text-base-content/70 text-[10px] leading-4 px-1" title={text} data-testid="map-attribution">
      {text}
    </div>
  );

  // Portal to the map element so the line sits in the map's very bottom-right corner, outside the control zones
  return target ? createPortal(line, target) : line;
});

AttributionControl.displayName = "AttributionControl";

// Default export is now just the React component
export default AttributionControl;
