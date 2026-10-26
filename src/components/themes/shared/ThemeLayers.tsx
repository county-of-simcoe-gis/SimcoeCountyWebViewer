"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type OLMap from "ol/Map";
import { Layer } from "ol/layer";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { LayerHelpers, OL_DATA_TYPES } from "@/utils/openlayers";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { getURLParameter } from "@/utils/helpersUrl";
import { queryFeaturesByAttribute, getFeatureExtent, getFeatureCenter } from "@/utils/geoServerClient";
import ThemePopupContent from "./ThemePopupContent";
import { FaInfoCircle } from "react-icons/fa";

interface ToggleLayerConfig {
  displayName: string;
  serverUrl: string;
  layerName: string;
  visible: boolean;
  zIndex?: number;
  clickable?: boolean;
  moreInfoUrlFieldName?: string;
  displayFieldName?: string;
  legendStyleName?: string;
  description?: string;
  /** Maps a URL parameter (e.g. BAGTAG=<arn>) to a feature attribute to zoom to. */
  UrlParameter?: { parameterName: string; fieldName: string };
}

// Module scope so a URL parameter zooms once per page load, not on every theme mount.
const handledUrlParameters = new Set<string>();

async function zoomToUrlParameterFeature(
  map: OLMap,
  layerConfig: ToggleLayerConfig,
  serverUrl: string,
  fieldName: string,
  value: string,
  popupLogoImage?: string,
) {
  try {
    const result = await queryFeaturesByAttribute({
      serviceUrl: `${serverUrl}wfs`,
      layerName: layerConfig.layerName,
      attributeName: fieldName,
      attributeValue: value,
      maxFeatures: 1,
    });
    const feature = result.features?.[0];
    if (!result.success || !feature) return;

    const extent = getFeatureExtent(feature);
    if (extent) {
      map.getView().fit(extent, { size: map.getSize(), duration: 1000, padding: [20, 20, 20, 20], minResolution: 1 });
    }

    const center = getFeatureCenter(feature);
    if (center) {
      usePopupStore
        .getState()
        .show(
          center,
          <ThemePopupContent properties={feature.properties ?? {}} moreInfoUrlFieldName={layerConfig.moreInfoUrlFieldName} popupLogoImage={popupLogoImage} />,
          layerConfig.displayName,
          layerConfig.layerName,
        );
    }
  } catch (error) {
    console.error(`Error zooming to ${layerConfig.layerName} feature:`, error);
  }
}

interface ThemeLayersProps {
  layers: ToggleLayerConfig[];
  themeId: string;
  popupLogoImage?: string;
  onVisibilityChange?: (layerStates: Record<string, boolean>) => void;
  /**
   * When true, every layer registered by this component sets `suppressParcelClick`,
   * so the parcel/property-report click is suppressed only when the user clicks on
   * a feature of one of these theme layers. Clicks elsewhere on the map still trigger
   * the property report. Replaces the legacy `useDisableParcelClick(true)` pattern.
   */
  suppressParcelClick?: boolean;
}

export default function ThemeLayers({ layers, themeId, popupLogoImage, onVisibilityChange, suppressParcelClick }: ThemeLayersProps) {
  const map = useMapStore((state) => state.map);
  const [layerStates, setLayerStates] = useState<Record<string, boolean>>({});
  const [featureCounts, setFeatureCounts] = useState<Record<string, number | null>>({});
  const [legendUrls, setLegendUrls] = useState<Record<string, string>>({});
  const [expandedInfoPanels, setExpandedInfoPanels] = useState<Record<string, boolean>>({});
  const layerRefsMap = useRef<Record<string, string>>({});
  const effectIdRef = useRef(0);

  useEffect(() => {
    const effectId = ++effectIdRef.current;
    layerRefsMap.current = {};

    // Initialize layer states
    const initialStates: Record<string, boolean> = {};
    layers.forEach((layer) => {
      initialStates[layer.layerName] = layer.visible;
    });
    setLayerStates(initialStates);

    // Initialize legend URLs
    const urls: Record<string, string> = {};
    layers.forEach((layer) => {
      const serverUrl = layer.serverUrl.endsWith("/") ? layer.serverUrl : layer.serverUrl + "/";
      const styleName = layer.legendStyleName || "";
      urls[layer.layerName] = `${serverUrl}wms?REQUEST=GetLegendGraphic&VERSION=1.1&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layer.layerName}&STYLE=${styleName}&transparent=true`;
    });
    setLegendUrls(urls);

    // Load all layers
    loadLayers(effectId);

    // Fetch feature counts
    fetchAllFeatureCounts();

    return () => {
      // Cleanup on unmount — remove all layers tracked by this effect
      Object.values(layerRefsMap.current).forEach((layerId) => {
        LayerManager.removeLayer(layerId);
      });
      layerRefsMap.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLayers = async (effectId: number) => {
    for (const layerConfig of layers) {
      try {
        const serverUrl = layerConfig.serverUrl.endsWith("/") ? layerConfig.serverUrl : layerConfig.serverUrl + "/";

        await new Promise<void>((resolve) => {
          LayerHelpers.getLayer(
            {
              sourceType: OL_DATA_TYPES.ImageWMS,
              url: `${serverUrl}wms?layers=${layerConfig.layerName}`,
              layerName: layerConfig.layerName,
              name: layerConfig.displayName,
              tiled: false,
            },
            (layer: unknown) => {
              if (layer) {
                const olLayer = layer as Layer;

                // Set WFS URL for popup interactions if clickable
                if (layerConfig.clickable) {
                  const wfsUrl = `${serverUrl}wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerConfig.layerName}&outputFormat=application/json&cql_filter=`;
                  olLayer.setProperties({
                    wfsUrl: wfsUrl,
                    clickable: true,
                    displayFieldName: layerConfig.displayFieldName,
                    moreInfoUrlFieldName: layerConfig.moreInfoUrlFieldName,
                  });
                }

                // Add layer via LayerManager - prepend (index: 0) so toggle layers are on top of base layers
                const layerId = LayerManager.addLayer(olLayer, "Themes", layerConfig.displayName, {
                  visible: layerConfig.visible,
                  index: 0,
                  clickable: layerConfig.clickable ?? false,
                  suppressParcelClick: suppressParcelClick,
                  metadata: {
                    themeId: themeId,
                    layerType: "toggle",
                    popupLogoImage: popupLogoImage,
                  },
                });

                if (layerId) {
                  if (effectId !== effectIdRef.current) {
                    // Stale effect — callback fired after a re-mount or unmount; remove immediately
                    LayerManager.removeLayer(layerId);
                  } else {
                    layerRefsMap.current[layerConfig.layerName] = layerId;
                  }
                }
              }
              resolve();
            },
          );
        });
      } catch (error) {
        console.error(`Error loading toggle layer ${layerConfig.layerName}:`, error);
      }
    }
  };

  // Fetch feature counts for all layers
  const fetchAllFeatureCounts = useCallback(async () => {
    const counts: Record<string, number | null> = {};

    for (const layerConfig of layers) {
      try {
        const serverUrl = layerConfig.serverUrl.endsWith("/") ? layerConfig.serverUrl : layerConfig.serverUrl + "/";

        // Use WFS GetFeature with resultType=hits to get just the count
        const wfsUrl = `${serverUrl}wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerConfig.layerName}&resultType=hits`;

        const response = await fetch(wfsUrl);
        const text = await response.text();

        // Parse the numberOfFeatures from the XML response
        const match = text.match(/numberOfFeatures="(\d+)"/);
        if (match) {
          counts[layerConfig.layerName] = parseInt(match[1], 10);
        } else {
          counts[layerConfig.layerName] = null;
        }
      } catch (error) {
        console.error(`Error fetching feature count for ${layerConfig.layerName}:`, error);
        counts[layerConfig.layerName] = null;
      }
    }

    setFeatureCounts(counts);
  }, [layers]);

  // Re-fetch feature counts when map extent changes (optional: could be enabled)
  useEffect(() => {
    if (!map) return;

    // Initial fetch already done in mount effect
    // Add map moveend listener if you want counts to update with map extent
    // const handleMoveEnd = () => fetchAllFeatureCounts();
    // map.on("moveend", handleMoveEnd);
    // return () => map.un("moveend", handleMoveEnd);
  }, [map, fetchAllFeatureCounts]);

  // Zoom to features named by URL parameters configured via UrlParameter on a toggle layer
  useEffect(() => {
    if (!map) return;
    layers.forEach((layerConfig) => {
      if (!layerConfig.UrlParameter) return;
      const { parameterName, fieldName } = layerConfig.UrlParameter;
      const value = getURLParameter(parameterName);
      const key = `${layerConfig.layerName}:${parameterName}`;
      if (!value || handledUrlParameters.has(key)) return;
      handledUrlParameters.add(key);
      const serverUrl = layerConfig.serverUrl.endsWith("/") ? layerConfig.serverUrl : layerConfig.serverUrl + "/";
      void zoomToUrlParameterFeature(map, layerConfig, serverUrl, fieldName, value, popupLogoImage);
    });
  }, [map, layers, popupLogoImage]);

  const handleToggle = (layerName: string, checked: boolean) => {
    const newStates = { ...layerStates, [layerName]: checked };
    setLayerStates(newStates);

    const layerId = layerRefsMap.current[layerName];
    if (layerId) {
      LayerManager.setLayerVisibility(layerId, checked);
    }

    // Notify parent of visibility change
    if (onVisibilityChange) {
      onVisibilityChange(newStates);
    }
  };

  const handleShowAll = () => {
    const allVisible: Record<string, boolean> = {};
    layers.forEach((layer) => {
      allVisible[layer.layerName] = true;
      const layerId = layerRefsMap.current[layer.layerName];
      if (layerId) {
        LayerManager.setLayerVisibility(layerId, true);
      }
    });
    setLayerStates(allVisible);
    if (onVisibilityChange) {
      onVisibilityChange(allVisible);
    }
  };

  const handleHideAll = () => {
    const allHidden: Record<string, boolean> = {};
    layers.forEach((layer) => {
      allHidden[layer.layerName] = false;
      const layerId = layerRefsMap.current[layer.layerName];
      if (layerId) {
        LayerManager.setLayerVisibility(layerId, false);
      }
    });
    setLayerStates(allHidden);
    if (onVisibilityChange) {
      onVisibilityChange(allHidden);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={handleShowAll} className="btn btn-xs btn-outline flex-1">
          Show All
        </button>
        <button onClick={handleHideAll} className="btn btn-xs btn-outline flex-1">
          Hide All
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {layers.map((layer) => (
          <div key={layer.layerName} className="flex flex-col">
            <label className="label cursor-pointer justify-start gap-2 p-0 min-h-0">
              {/* Legend symbol - dynamically fetched from WMS GetLegendGraphic */}
              {legendUrls[layer.layerName] ? (
                <img src={legendUrls[layer.layerName]} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
              ) : null}

              <input type="checkbox" className="checkbox checkbox-sm" checked={layerStates[layer.layerName] || false} onChange={(e) => handleToggle(layer.layerName, e.target.checked)} />
              <span className="label-text flex-1">{layer.displayName}</span>

              {/* Feature count */}
              {featureCounts[layer.layerName] !== undefined && featureCounts[layer.layerName] !== null && <span className="text-xs text-base-content/70">({featureCounts[layer.layerName]})</span>}

              {/* Info button - only shown when layer has a description */}
              {layer.description && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-circle"
                  title="Show Details"
                  onClick={(e) => {
                    e.preventDefault();
                    setExpandedInfoPanels((prev) => ({ ...prev, [layer.layerName]: !prev[layer.layerName] }));
                  }}
                >
                  <FaInfoCircle className={`w-4 h-4 ${expandedInfoPanels[layer.layerName] ? "text-info" : "text-base-content/70"}`} />
                </button>
              )}
            </label>

            {/* Collapsible description panel */}
            {layer.description && expandedInfoPanels[layer.layerName] && <div className="ml-7 mt-1 mb-1 p-2 text-xs text-base-content/70 bg-base-200 rounded">{layer.description}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
