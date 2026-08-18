"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import PanelComponent from "@/components/PanelComponent";
import { FaPalette } from "react-icons/fa";
import SpatialQueryResults, { FeatureSection } from "../shared/SpatialQueryResults";
import { useSearchStore } from "@/stores/searchStore";

import { LayerManager } from "@/utils/openlayers/LayerManager";
import { FeatureHelpers } from "@/utils/openlayers/FeatureHelpers";
import { OL_DATA_TYPES } from "@/utils/openlayers/types";
import { queryFeaturesByGeometry } from "@/utils/geoServerClient";
import { Vector as VectorSource } from "ol/source";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { GeoJSON } from "ol/format";
import { showURLWindow } from "@/utils/helpersUI";
import config from "./config.json";

// ── Props ────────────────────────────────────────────────────────────────────

interface BroadbandProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

// ── Highlight style (cyan) ───────────────────────────────────────────────────

const HIGHLIGHT_STYLE = new Style({
  stroke: new Stroke({ color: [0, 255, 255, 0.3], width: 6 }),
  fill: new Fill({ color: [0, 255, 255, 0.3] }),
  image: new CircleStyle({
    radius: 10,
    stroke: new Stroke({ color: [0, 255, 255, 0.3], width: 6 }),
    fill: new Fill({ color: [0, 255, 255, 0.3] }),
  }),
});

// ── Component ────────────────────────────────────────────────────────────────

export default function Broadband({ name = "Broadband", helpLink, hideHeader, onClose, onSidebarVisibility }: BroadbandProps) {
  const lastResult = useSearchStore((s) => s.lastResult);

  const [sections, setSections] = useState<FeatureSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Highlight layer – created once, managed via LayerManager
  const highlightSourceRef = useRef<VectorSource>(new VectorSource());
  const layerIdRef = useRef<string | null>(null);

  // Register highlight layer on mount, remove on unmount
  useEffect(() => {
    const layer = new VectorLayer({ source: highlightSourceRef.current, style: HIGHLIGHT_STYLE });
    const id = LayerManager.addLayer(layer, "Themes", "broadband-highlight");
    layerIdRef.current = id;

    return () => {
      if (layerIdRef.current) LayerManager.removeLayer(layerIdRef.current);
    };
  }, []);

  // React to search results
  const loadReport = useCallback(async (geojson: string) => {
    setIsLoading(true);
    setSections([]);

    const geoJsonFormat = new GeoJSON();
    let olFeature;
    try {
      // GeoJSON from the search store is already in EPSG:3857 — do NOT reproject
      const features = geoJsonFormat.readFeatures(geojson);
      olFeature = features[0];
    } catch {
      setIsLoading(false);
      return;
    }

    if (!olFeature) {
      setIsLoading(false);
      return;
    }

    const wkt = FeatureHelpers.setGeometry(olFeature.getGeometry()!, OL_DATA_TYPES.WKT);
    if (!wkt) {
      setIsLoading(false);
      return;
    }

    const results: FeatureSection[] = [];

    for (const layer of config.queryLayers) {
      try {
        const result = await queryFeaturesByGeometry({
          serviceUrl: layer.serviceUrl,
          layerName: layer.layerName,
          geometryField: layer.geometryField,
          wkt,
          buffer: -1,
        });

        const olFeatures = result.features
          ? geoJsonFormat.readFeatures(JSON.stringify({ type: "FeatureCollection", features: result.features }), {
              dataProjection: "EPSG:3857",
              featureProjection: "EPSG:3857",
            })
          : [];

        results.push({ title: layer.title, features: olFeatures, featureTitleColumn: layer.featureTitleColumn });
      } catch (err) {
        console.error(`[Broadband] Error querying layer ${layer.layerName}:`, err);
        results.push({ title: layer.title, features: [], featureTitleColumn: layer.featureTitleColumn });
      }
    }

    setSections(results);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (lastResult?.geojson) {
      loadReport(lastResult.geojson);
    }
  }, [lastResult, loadReport]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PanelComponent icon={<FaPalette size={20} className="text-neutral/70" />} name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-3 pt-3 pb-1 font-semibold text-sm">Broadband Results</div>
        <div className="px-3 pb-2 text-xs text-base-content/70">
          Broadband information on this page has been provided by external sources. The County of Simcoe is not responsible for the accuracy, reliability or currency of the information supplied by
          external sources. For further information please refer to the about the data section.
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : (
            <SpatialQueryResults sections={sections} highlightSource={highlightSourceRef.current} emptyMessage="Perform a search to see broadband results." stackedLayout />
          )}
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap justify-center gap-2 px-3 py-2 border-t border-base-300 bg-base-200">
          {config.termsUrl && (
            <button className="btn btn-md btn-neutral flex-1" onClick={() => showURLWindow(config.termsUrl, false, "normal", false, false, "Terms")}>
              <span>Terms</span>
            </button>
          )}
          {config.aboutUrl && (
            <a href={config.aboutUrl} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-neutral flex-1">
              <span>About the Data</span>
            </a>
          )}
          {config.contactUsEmail && (
            <a href={`mailto:${config.contactUsEmail}`} className="btn btn-md btn-neutral flex-1">
              <span>Contact Us</span>
            </a>
          )}
        </div>
      </div>
    </PanelComponent>
  );
}
