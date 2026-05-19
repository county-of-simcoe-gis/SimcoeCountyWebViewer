"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PanelComponent from "@/components/PanelComponent";
import { FaPalette } from "react-icons/fa";
import SpatialQueryResults, { FeatureSection } from "../shared/SpatialQueryResults";
import { useSearchStore } from "@/stores/searchStore";

import { LayerManager } from "@/utils/openlayers/LayerManager";
import { FeatureHelpers } from "@/utils/openlayers/FeatureHelpers";
import { OL_DATA_TYPES } from "@/utils/openlayers/types";
import { queryFeaturesByGeometry, queryFeaturesByAttribute } from "@/utils/geoServerClient";
import { getComponentConfig } from "@/utils/config";
import { showURLWindow } from "@/utils/helpersUI";
import { Vector as VectorSource } from "ol/source";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { GeoJSON } from "ol/format";
import localConfig from "./config.json";

// ── Props ────────────────────────────────────────────────────────────────────

interface ZoningProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  /** When provided, immediately query zoning by this ARN on mount. */
  initialArn?: string;
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

export default function Zoning({ name = "Zoning", helpLink, hideHeader, onClose, onSidebarVisibility, initialArn }: ZoningProps) {
  const lastResult = useSearchStore((s) => s.lastResult);

  // Merge local config with map-level overrides (termsUrl, byLawUrl, etc. vary per map)
  const config = useMemo(() => {
    const base = { ...localConfig } as Record<string, unknown>;
    const entry = getComponentConfig("themes", "Zoning");
    if (entry?.config) {
      try {
        const overrides = typeof entry.config === "string" ? JSON.parse(entry.config) : entry.config;
        Object.keys(overrides).forEach((key) => {
          if (overrides[key] !== undefined && overrides[key] !== "") {
            // Deep-merge queryLayers: keep the local list as the base, then
            // overlay matching API entries so local defaults (serviceUrl,
            // layerName, geometryField) are never lost. Match by layerName
            // when present, otherwise by position.  Append any extra API
            // entries that don't match an existing base entry.
            if (key === "queryLayers" && Array.isArray(overrides[key]) && Array.isArray(base[key])) {
              const baseLayers = base[key] as Record<string, unknown>[];
              const overrideLayers = overrides[key] as Record<string, unknown>[];
              const usedOverrideIndices = new Set<number>();

              // Pass 1 – merge onto each base entry
              base[key] = baseLayers.map((baseLayer, idx) => {
                // Try matching by layerName first, fall back to same index
                let matchIdx = overrideLayers.findIndex((o, i) => !usedOverrideIndices.has(i) && o.layerName && o.layerName === baseLayer.layerName);
                if (matchIdx === -1 && idx < overrideLayers.length && !usedOverrideIndices.has(idx)) {
                  matchIdx = idx;
                }
                if (matchIdx !== -1) {
                  usedOverrideIndices.add(matchIdx);
                  return { ...baseLayer, ...overrideLayers[matchIdx] };
                }
                return baseLayer;
              });

              // Pass 2 – append any unmatched override entries that have
              // at least a layerName (required for a valid query)
              overrideLayers.forEach((o, i) => {
                if (!usedOverrideIndices.has(i) && o.layerName) {
                  (base[key] as Record<string, unknown>[]).push(o);
                }
              });
            } else {
              base[key] = overrides[key];
            }
          }
        });
      } catch {
        /* ignore parse errors */
      }
    }

    // Safety net: ensure every queryLayer has the required fields.
    // Fill in a default serviceUrl from the local config when missing,
    // then drop entries that still lack serviceUrl or layerName.
    if (Array.isArray(base.queryLayers)) {
      const defaultServiceUrl = localConfig.queryLayers?.[0]?.serviceUrl;
      base.queryLayers = (base.queryLayers as Record<string, unknown>[])
        .map<Record<string, unknown>>((layer) => ({
          ...layer,
          serviceUrl: layer.serviceUrl || defaultServiceUrl,
        }))
        .filter((layer) => !!layer.serviceUrl && !!layer.layerName);
    }

    return base as typeof localConfig;
  }, []);

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
          // Spatial INTERSECTS query — use a small negative buffer on the
          // search geometry to avoid selecting adjacent features that share
          // a boundary edge.
          result = await queryFeaturesByGeometry({
            serviceUrl: layer.serviceUrl,
            layerName: layer.layerName,
            geometryField: layer.geometryField,
            wkt: wkt!,
            buffer: -5,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-query when initialArn is provided (e.g. from property popup)
  const initialArnLoadedRef = useRef(false);
  useEffect(() => {
    if (initialArn && !initialArnLoadedRef.current) {
      initialArnLoadedRef.current = true;
      loadReport("", "Assessment Parcel", initialArn);
    }
  }, [initialArn, loadReport]);

  // React to search results — but skip when component was opened with initialArn
  // to prevent stale lastResult from overwriting the intended ARN query.
  const lastResultRef = useRef(lastResult);
  useEffect(() => {
    // If opened with initialArn, ignore the lastResult that was already present on mount
    if (initialArn && lastResult === lastResultRef.current) return;
    lastResultRef.current = lastResult;

    if (lastResult?.geojson) {
      loadReport(lastResult.geojson, lastResult.type, lastResult.name);
    } else if (lastResult?.type === "Assessment Parcel" && lastResult?.name) {
      // Assessment Parcel queries use ARN directly — no geojson needed
      loadReport("", lastResult.type, lastResult.name);
    }
  }, [lastResult, loadReport, initialArn]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PanelComponent icon={<FaPalette size={20} className="text-neutral/70" />} name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
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
        <div className="flex flex-wrap justify-center gap-2 px-3 py-2 border-t border-base-300 bg-base-200">
          {config.termsUrl && (
            <button className="btn btn-sm btn-outline flex-1" onClick={() => showURLWindow(config.termsUrl)}>
              Terms
            </button>
          )}
          {config.byLawUrl && (
            <a href={config.byLawUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline flex-1">
              Zoning Bylaw
            </a>
          )}
          {config.contactUsEmail && (
            <a href={`mailto:${config.contactUsEmail}`} className="btn btn-sm btn-outline flex-1">
              Contact Us
            </a>
          )}
        </div>
      </div>
    </PanelComponent>
  );
}
