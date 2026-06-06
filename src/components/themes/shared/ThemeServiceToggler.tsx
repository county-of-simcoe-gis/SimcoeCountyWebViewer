"use client";

/**
 * ThemeServiceToggler Component
 *
 * Handles ArcGIS MapServer service layer toggling for themes.
 * Fetches capabilities from an ArcGIS MapServer REST endpoint,
 * creates OpenLayers layers for each sub-layer, stamps them with a themeKey,
 * and renders checkbox toggles with legend icons and feature counts.
 *
 * Migrated from SimcoeCountyWebViewerSecure ThemeServiceToggler.jsx
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import axiosInstance from "@/lib/axiosInstance";
import { Layer } from "ol/layer";
import { LayerHelpers, OL_DATA_TYPES } from "@/utils/openlayers";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { getUID } from "@/utils/helpersCore";

// ---------- Types ----------

/** Configuration for a single ArcGIS MapServer service */
export interface ToggleServiceConfig {
  serviceName: string;
  serviceUrl: string;
  secure: boolean;
  tokenType?: "app" | "user";
  type?: string;
  zIndex?: number;
  layers?: number[]; // Optional filter for specific layer IDs
  UrlParameter?: string;
}

/** Props passed to ThemeServiceToggler */
export interface ThemeServiceTogglerProps {
  serviceConfig: ToggleServiceConfig;
  toggleLayersKey?: string;
  toggleVisibleAll?: boolean;
  toggleLayersTitle?: string;
  toggleLayersShowAll?: boolean;
  onLayerVisibilityChange?: (layer: Layer) => void;
  onMapClick?: (evt: unknown) => void;
  /**
   * When true, layers added by this toggler will NOT be queried by LiveLayerClick.
   * Use this when the parent theme registers its own dedicated click handler
   * (e.g. AppTrack) to prevent a duplicate generic popup alongside the custom one.
   */
  suppressLiveLayerClick?: boolean;
}

/** A single layer entry from ArcGIS MapServer capabilities */
interface ArcGISLayerCapability {
  id: number;
  name: string;
  defaultVisibility: boolean;
  minScale: number;
  maxScale: number;
  hasAttachments: boolean;
  queryable?: boolean;
  opaque?: boolean;
  sourceSpatialReference?: { latestWkid?: number };
  extent?: number[];
  drawingInfo?: {
    renderer?: {
      symbol?: { contentType: string; imageData: string };
    };
  };
  grouped?: boolean;
  layers?: unknown[];
  // Enriched during processing
  rootUrl?: string;
  url?: string;
  legend?: {
    layerId: number;
    legend: ArcGISLegendEntry[];
  };
}

/** A single legend entry */
interface ArcGISLegendEntry {
  label: string;
  contentType: string;
  imageData: string;
  height?: number;
  width?: number;
}

/** Internal layer state for rendering */
interface ServiceLayerState {
  olLayer: Layer;
  config: ArcGISLayerCapability;
  visible: boolean;
  recordCount: number | null;
  legend: ArcGISLegendEntry[];
  styleUrl: string;
  layerId: string; // LayerManager ID
  uid: string;
}

// ---------- Component ----------

export default function ThemeServiceToggler({
  serviceConfig,
  toggleLayersKey,
  toggleVisibleAll = false,
  toggleLayersTitle = "LAYERS",
  toggleLayersShowAll = false,
  onLayerVisibilityChange,
  suppressLiveLayerClick = false,
}: ThemeServiceTogglerProps) {
  useSession(); // Ensure auth session is available for API calls
  const [layers, setLayers] = useState<ServiceLayerState[]>([]);
  const [showAll, setShowAll] = useState(toggleVisibleAll);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const layerManagerIdsRef = useRef<string[]>([]);

  // ---------- Token Acquisition ----------

  const fetchAppToken = useCallback(async (): Promise<string | null> => {
    if (!serviceConfig.secure) return null;

    try {
      const response = await axiosInstance.post("/secure/arcgis/token");
      return response.data?.access_token || null;
    } catch (err) {
      console.error("[ThemeServiceToggler] Error fetching ArcGIS token:", err);
      return null;
    }
  }, [serviceConfig.secure]);

  // ---------- Capabilities Fetch ----------

  const fetchCapabilities = useCallback(
    async (token: string | null): Promise<ArcGISLayerCapability[]> => {
      let layersUrl = `${serviceConfig.serviceUrl}/layers?f=json`;
      if (token) layersUrl += `&token=${token}`;

      const response = await fetch(layersUrl, { mode: "cors", cache: "no-cache" });
      const data = await response.json();

      if (!data.layers || !Array.isArray(data.layers)) {
        console.warn("[ThemeServiceToggler] No layers in capabilities response");
        return [];
      }

      // Fetch legends
      let legendsUrl = `${serviceConfig.serviceUrl}/legend?f=json`;
      if (token) legendsUrl += `&token=${token}`;

      const legends: Record<number, { layerId: number; legend: ArcGISLegendEntry[] }> = {};
      try {
        const legendResponse = await fetch(legendsUrl, { mode: "cors", cache: "no-cache" });
        const legendData = await legendResponse.json();
        if (legendData.layers) {
          legendData.layers.forEach((l: { layerId: number; legend: ArcGISLegendEntry[] }) => {
            legends[l.layerId] = l;
          });
        }
      } catch (err) {
        console.warn("[ThemeServiceToggler] Failed to fetch legends:", err);
      }

      // Filter to specific layer IDs if configured
      let filteredLayers: ArcGISLayerCapability[] = data.layers;
      if (serviceConfig.layers) {
        filteredLayers = filteredLayers.filter((layer: ArcGISLayerCapability) => serviceConfig.layers!.includes(layer.id));
      }

      // Enrich layer data
      return filteredLayers.map((layer: ArcGISLayerCapability) => ({
        ...layer,
        rootUrl: serviceConfig.serviceUrl,
        url: token ? `${serviceConfig.serviceUrl}/${layer.id}?token=${token}` : `${serviceConfig.serviceUrl}/${layer.id}`,
        legend: legends[layer.id] || undefined,
        queryable: layer.queryable !== undefined ? layer.queryable : true,
      }));
    },
    [serviceConfig.serviceUrl, serviceConfig.layers],
  );

  // ---------- Layer Creation ----------

  const createLayers = useCallback(
    async (capabilities: ArcGISLayerCapability[], token: string | null): Promise<ServiceLayerState[]> => {
      const layerStates: ServiceLayerState[] = [];
      let zIndex = serviceConfig.zIndex || 1000;

      for (const layerConfig of capabilities) {
        const layerOptions = {
          sourceType: OL_DATA_TYPES.ImageArcGISRest,
          source: "rest",
          projection: layerConfig.sourceSpatialReference?.latestWkid ? `${layerConfig.sourceSpatialReference.latestWkid}` : "3857",
          layerName: layerConfig.name,
          url: layerConfig.url || `${serviceConfig.serviceUrl}/${layerConfig.id}`,
          tiled: false,
          extent: layerConfig.extent,
          name: layerConfig.name,
        };

        // Create OL layer
        const olLayer = await new Promise<Layer | null>((resolve) => {
          LayerHelpers.getLayer(layerOptions, (layer: unknown) => {
            resolve(layer as Layer | null);
          });
        });

        if (!olLayer) {
          console.warn(`[ThemeServiceToggler] Failed to create layer: ${layerConfig.name}`);
          continue;
        }

        // Build query/identify URLs
        const identifyUrl = `${serviceConfig.serviceUrl}/identify?geometry=#GEOMETRY#&geometryType=#GEOMETRYTYPE#&layers=visible%3A${layerConfig.id}&sr=3857&tolerance=#TOLERANCE#&mapExtent=#EXTENT#&imageDisplay=#RESOLUTION#&maxAllowableOffset=10&returnGeometry=true&returnFieldName=false&f=json`;
        const recordCountUrl = `${serviceConfig.serviceUrl}/${layerConfig.id}/query?where=0%3D0&returnCountOnly=true&f=json`;
        const queryUrl = `${serviceConfig.serviceUrl}/${layerConfig.id}/query?where=#WHERE#&outFields=*&outSR=3857&returnCountOnly=false&f=geojson`;
        const attachmentUrl = layerConfig.hasAttachments ? `${serviceConfig.serviceUrl}/${layerConfig.id}/queryAttachments?objectIds=#OBJECTID#&returnUrl=true&f=json` : null;

        // Append token to URLs if available
        const tokenSuffix = token ? `&token=${token}` : "";

        zIndex++;
        olLayer.setVisible(layerConfig.defaultVisibility);
        olLayer.setZIndex(zIndex);
        olLayer.setProperties({
          name: layerConfig.name,
          displayName: layerConfig.name,
          tocDisplayName: layerConfig.name,
          wfsUrl: identifyUrl + tokenSuffix,
          rootInfoUrl: layerConfig.url,
          clickable: true,
          disableParcelClick: false,
          queryable: layerConfig.queryable ?? true,
          opaque: layerConfig.opaque ?? false,
          minScale: layerConfig.maxScale, // Reversed per old code
          maxScale: layerConfig.minScale, // Reversed per old code
          attachmentUrl: attachmentUrl ? attachmentUrl + tokenSuffix : null,
          hasAttachments: layerConfig.hasAttachments,
          recordCountUrl: recordCountUrl + tokenSuffix,
          featureQueryUrl: queryUrl + tokenSuffix,
          layerId: layerConfig.id,
          secured: serviceConfig.secure,
        });

        // Stamp with themeKey - CRITICAL for AppTrack's selectFeaturesById
        if (toggleLayersKey) {
          olLayer.setProperties({ themeKey: toggleLayersKey });
        }

        // Add to map via LayerManager
        const layerId = LayerManager.addLayer(olLayer, "Themes", layerConfig.name, {
          visible: layerConfig.defaultVisibility,
          index: 0,
          clickable: !suppressLiveLayerClick,
          metadata: {
            themeId: toggleLayersKey || "theme-service",
            layerType: "toggle",
            themeKey: toggleLayersKey,
          },
        });

        if (layerId) {
          layerManagerIdsRef.current.push(layerId);

          // Get legend info
          const legendEntries = layerConfig.legend?.legend || [];
          const styleUrl = legendEntries.length > 0 && legendEntries[0].imageData ? `data:${legendEntries[0].contentType};base64,${legendEntries[0].imageData}` : "";

          layerStates.push({
            olLayer,
            config: layerConfig,
            visible: layerConfig.defaultVisibility,
            recordCount: null,
            legend: legendEntries,
            styleUrl,
            layerId,
            uid: getUID(),
          });
        }
      }

      return layerStates;
    },
    [serviceConfig.serviceUrl, serviceConfig.zIndex, serviceConfig.secure, toggleLayersKey, suppressLiveLayerClick],
  );

  // ---------- Record Count Fetch ----------

  const fetchRecordCounts = useCallback(async (layerStates: ServiceLayerState[]) => {
    const updated = [...layerStates];

    await Promise.all(
      updated.map(async (state, idx) => {
        const url = state.olLayer.get("recordCountUrl");
        if (!url) return;

        try {
          const response = await fetch(url, { mode: "cors" });
          const result = await response.json();
          if (result.count !== undefined) {
            updated[idx] = { ...updated[idx], recordCount: result.count };
          }
        } catch (err) {
          console.warn(`[ThemeServiceToggler] Failed to fetch count for ${state.config.name}:`, err);
        }
      }),
    );

    return updated;
  }, []);

  // ---------- Initialization ----------

  useEffect(() => {
    // Local cancelled flag scoped to this effect invocation.
    // React StrictMode (default in Next.js) double-fires effects in dev:
    //   mount → cleanup → mount.  Using a shared ref (mountedRef) fails
    //   because the second mount resets it to true before the first init's
    //   awaits resolve, causing both inits to complete and creating duplicate
    //   layers.  A local variable ensures only the surviving invocation proceeds.
    let cancelled = false;

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Get token if needed
        const token = await fetchAppToken();
        if (cancelled) return;

        // 2. Fetch capabilities
        const capabilities = await fetchCapabilities(token);
        if (cancelled) return;

        if (capabilities.length === 0) {
          setError("No layers found in service");
          setIsLoading(false);
          return;
        }

        // 3. Create layers
        const layerStates = await createLayers(capabilities, token);
        if (cancelled) {
          // Clean up any layers that were already added before cancellation
          layerManagerIdsRef.current.forEach((id) => LayerManager.removeLayer(id));
          layerManagerIdsRef.current = [];
          return;
        }

        // 4. Fetch record counts (async, updates state later)
        const withCounts = await fetchRecordCounts(layerStates);
        if (cancelled) {
          layerManagerIdsRef.current.forEach((id) => LayerManager.removeLayer(id));
          layerManagerIdsRef.current = [];
          return;
        }

        // 5. If toggleVisibleAll is set, override all layers to visible on init
        if (toggleVisibleAll) {
          withCounts.forEach((state) => {
            state.olLayer.setVisible(true);
            LayerManager.setLayerVisibility(state.layerId, true);
            state.visible = true;
          });
        }

        setLayers(withCounts);
        setIsLoading(false);
      } catch (err) {
        console.error("[ThemeServiceToggler] Initialization error:", err);
        if (!cancelled) {
          setError("Failed to load layers");
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;

      // Cleanup: remove all layers from map
      layerManagerIdsRef.current.forEach((id) => {
        LayerManager.removeLayer(id);
      });
      layerManagerIdsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Show All / Hide All ----------

  const initializedRef = useRef(false);

  useEffect(() => {
    // Skip the first run (initial mount) — layers aren't loaded yet
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    if (isLoading || layers.length === 0) return;

    // Defer the state updates to avoid setState-during-render
    const timer = setTimeout(() => {
      layers.forEach((state) => {
        state.olLayer.setVisible(showAll);
        LayerManager.setLayerVisibility(state.layerId, showAll);
      });
      setLayers((prev) => prev.map((s) => ({ ...s, visible: showAll })));

      if (onLayerVisibilityChange) {
        layers.forEach((state) => onLayerVisibilityChange(state.olLayer));
      }
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  // ---------- Handlers ----------

  const handleToggle = useCallback(
    (uid: string, checked: boolean) => {
      setLayers((prev) =>
        prev.map((state) => {
          if (state.uid === uid) {
            // Update OL layer visibility directly
            state.olLayer.setVisible(checked);
            return { ...state, visible: checked };
          }
          return state;
        }),
      );
      // Defer LayerManager store updates to avoid setState-during-render
      setTimeout(() => {
        const layer = layers.find((s) => s.uid === uid);
        if (layer) {
          LayerManager.setLayerVisibility(layer.layerId, checked);
          if (onLayerVisibilityChange) onLayerVisibilityChange(layer.olLayer);
        }
      }, 0);
    },
    [layers, onLayerVisibilityChange],
  );

  const handleShowAll = useCallback(() => setShowAll(true), []);
  const handleHideAll = useCallback(() => setShowAll(false), []);

  // ---------- Render ----------

  if (isLoading) {
    return (
      <div className="p-2 text-sm text-base-content/60">
        <span className="loading loading-spinner loading-xs mr-2" />
        Loading layers...
      </div>
    );
  }

  if (error) {
    return <div className="p-2 text-sm text-error">{error}</div>;
  }

  if (layers.length === 0) return null;

  return (
    <div className="space-y-2 p-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-base-content/70 border-b border-base-300 pb-1">{toggleLayersTitle}</div>

      {toggleLayersShowAll && (
        <div className="flex gap-2">
          <button onClick={handleShowAll} className="btn btn-xs btn-outline flex-1">
            Show All
          </button>
          <button onClick={handleHideAll} className="btn btn-xs btn-outline flex-1">
            Hide All
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {layers.map((state) => (
          <ThemeServiceTogglerItem key={state.uid} state={state} onToggle={handleToggle} />
        ))}
      </div>
    </div>
  );
}

// ---------- Sub-components ----------

function ThemeServiceTogglerItem({ state, onToggle }: { state: ServiceLayerState; onToggle: (uid: string, checked: boolean) => void }) {
  const [showLegend, setShowLegend] = useState(false);
  const hasMultipleLegendEntries = state.legend.filter((e) => e.imageData).length > 1;

  return (
    <div className="flex flex-col">
      <label className="label cursor-pointer justify-start gap-2 p-0 min-h-0">
        {/* Legend icon / expand toggle */}
        {hasMultipleLegendEntries ? (
          <button
            className="btn btn-ghost btn-xs px-0 min-h-0 h-auto text-base-content/70"
            onClick={(e) => {
              e.preventDefault();
              setShowLegend(!showLegend);
            }}
            title="Toggle legend"
          >
            {showLegend ? "−" : "+"}
          </button>
        ) : state.styleUrl ? (
          <img src={state.styleUrl} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
        ) : (
          <span className="w-5 h-5 flex-shrink-0" />
        )}

        <input type="checkbox" className="checkbox checkbox-sm" checked={state.visible} onChange={(e) => onToggle(state.uid, e.target.checked)} />

        <span className="label-text flex-1 text-sm">{state.config.name}</span>

        {state.recordCount !== null && <span className="text-xs text-base-content/70">({state.recordCount})</span>}
      </label>

      {/* Expanded legend */}
      {showLegend && hasMultipleLegendEntries && (
        <div className="ml-6 mt-1 flex flex-col gap-1">
          {state.legend
            .filter((e) => e.imageData)
            .map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {}
                <img src={`data:${entry.contentType};base64,${entry.imageData}`} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                <span className="text-xs text-base-content/70">{entry.label}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
