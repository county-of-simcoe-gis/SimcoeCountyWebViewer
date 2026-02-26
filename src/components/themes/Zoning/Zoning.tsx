"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import PanelComponent from "@/components/PanelComponent";
import SpatialQueryResults, { FeatureSection } from "../shared/SpatialQueryResults";
import { useSearchStore } from "@/stores/searchStore";
import { useMapStore } from "@/stores/mapStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { FeatureHelpers } from "@/utils/openlayers/FeatureHelpers";
import { OL_DATA_TYPES } from "@/utils/openlayers/types";
import { queryFeaturesByGeometry, queryFeaturesByAttribute } from "@/utils/geoServerClient";
import { Vector as VectorSource } from "ol/source";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { GeoJSON } from "ol/format";
import config from "./config.json";

// ── Props ────────────────────────────────────────────────────────────────────

interface ZoningProps {
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

export default function Zoning({ name = "Zoning", helpLink, hideHeader, onClose, onSidebarVisibility }: ZoningProps) {
  const lastResult = useSearchStore((s) => s.lastResult);
  const map = useMapStore((s) => s.map);

  const [sections, setSections] = useState<FeatureSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Highlight layer
  const highlightSourceRef = useRef<VectorSource>(new VectorSource());
  const layerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const layer = new VectorLayer({ source: highlightSourceRef.current, style: HIGHLIGHT_STYLE });
    const id = LayerManager.addLayer(layer, "Themes", "zoning-highlight");
    layerIdRef.current = id;

    return () => {
      if (layerIdRef.current) LayerManager.removeLayer(layerIdRef.current);
    };
  }, []);

  // React to search results
  const loadReport = useCallback(async (geojson: string, searchType: string, searchName: string) => {
    setIsLoading(true);
    setSections([]);

    const geoJsonFormat = new GeoJSON();
    const isAssessmentParcel = searchType === "Assessment Parcel";

    // For spatial queries we need WKT of the search geometry
    let wkt: string | undefined;
    if (!isAssessmentParcel) {
      try {
        // GeoJSON from the search store is already in EPSG:3857 — do NOT reproject
        const features = geoJsonFormat.readFeatures(geojson);
        const olFeature = features[0];
        if (olFeature) {
          wkt = FeatureHelpers.setGeometry(olFeature.getGeometry()!, OL_DATA_TYPES.WKT);
        }
      } catch {
        /* fall through */
      }

      if (!wkt) {
        setIsLoading(false);
        return;
      }
    }

    const results: FeatureSection[] = [];

    for (const layer of config.queryLayers) {
      try {
        let result;

        if (isAssessmentParcel) {
          // Query by ARN attribute
          result = await queryFeaturesByAttribute({
            serviceUrl: layer.serviceUrl,
            layerName: layer.layerName,
            attributeName: "arn",
            attributeValue: searchName,
          });
        } else {
          // Spatial INTERSECTS query
          result = await queryFeaturesByGeometry({
            serviceUrl: layer.serviceUrl,
            layerName: layer.layerName,
            geometryField: layer.geometryField,
            wkt: wkt!,
          });
        }

        const olFeatures = result.features
          ? geoJsonFormat.readFeatures(JSON.stringify({ type: "FeatureCollection", features: result.features }), {
              dataProjection: "EPSG:3857",
              featureProjection: "EPSG:3857",
            })
          : [];

        results.push({ title: layer.title, features: olFeatures, featureTitleColumn: layer.featureTitleColumn });
      } catch (err) {
        console.error(`[Zoning] Error querying layer ${layer.layerName}:`, err);
        results.push({ title: layer.title, features: [], featureTitleColumn: layer.featureTitleColumn });
      }
    }

    setSections(results);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (lastResult?.geojson) {
      loadReport(lastResult.geojson, lastResult.type, lastResult.name);
    }
  }, [lastResult, loadReport]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-3 pt-3 pb-2 font-semibold text-sm">Zoning Results</div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : (
            <SpatialQueryResults sections={sections} highlightSource={highlightSourceRef.current} emptyMessage="Perform a search to see zoning results." />
          )}
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-base-300 text-xs">
          {config.termsUrl && (
            <a href={config.termsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-ghost">
              Terms
            </a>
          )}
          {config.byLawUrl && (
            <a href={config.byLawUrl} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-ghost">
              Zoning Bylaw
            </a>
          )}
          {config.contactUsEmail && (
            <a href={`mailto:${config.contactUsEmail}`} className="btn btn-xs btn-ghost">
              Contact Us
            </a>
          )}
        </div>
      </div>
    </PanelComponent>
  );
}
