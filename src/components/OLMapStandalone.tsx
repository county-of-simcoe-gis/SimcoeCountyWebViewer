"use client";

import { useEffect, useRef } from "react";

/**
 * Stand-alone OpenLayers map that demonstrates a working ESRI vector-tile style
 * (Canada Topographic). Placed below the main MapContainer for troubleshooting.
 */
export default function OLMapStandalone() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    async function init() {
      const { apply } = await import("ol-mapbox-style");

      const styleResponse = await fetch("/basemap/ESRI_Canada_Topographic.json");
      const styleJson = await styleResponse.json();

      // Ensure the ArcGIS source has full tile template
      const esriSrc = styleJson.sources?.esri as { url?: string; tiles?: string[] } | undefined;
      if (esriSrc && esriSrc.url && !esriSrc.tiles) {
        esriSrc.tiles = [`${esriSrc.url.replace(/\/?$/, "")}/tile/{z}/{y}/{x}.pbf`];
      }

      map = await apply(containerRef.current as HTMLElement, styleJson);
    }

    init();

    return () => {
      if (map) {
        map.setTarget(undefined);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "50vh" }} />;
}
