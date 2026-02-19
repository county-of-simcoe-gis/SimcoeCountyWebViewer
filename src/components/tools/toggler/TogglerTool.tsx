"use client";

/**
 * Toggler Tool Component
 * Migrated from SimcoeCountyWebViewerSecure Toggler.jsx
 * Allows users to toggle database values by shift+clicking features on the map
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaSignInAlt, FaSpinner, FaLock, FaInfoCircle } from "react-icons/fa";
import { useSession } from "next-auth/react";
import axios from "axios";
import PanelComponent from "@/components/PanelComponent";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTogglerStore, type TogglerLayer } from "@/stores/useTogglerStore";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import ResultsPopup, { createIdentifyResult } from "@/components/ResultsPopup";
import togglerConfig from "./config.json";
import { unByKey } from "ol/Observable";
import { GeoJSON } from "ol/format";
import ImageLayer from "ol/layer/Image";
import ImageWMS from "ol/source/ImageWMS";
import type { EventsKey } from "ol/events";
import type { MapBrowserEvent } from "ol";

// Toggler security roles
const TOGGLER_ROLES = ["toggler_solid_waste", "toggler_customer_service", "toggler_forestry", "toggler_planning"];

function getPropertyValueCaseInsensitive(properties: Record<string, unknown> | undefined, key: string): unknown {
  if (!properties) return undefined;

  if (Object.prototype.hasOwnProperty.call(properties, key)) {
    return properties[key];
  }

  const target = key.trim().toLowerCase();
  const matchedKey = Object.keys(properties).find((propKey) => {
    const normalized = propKey.toLowerCase();
    if (normalized === target) return true;
    const suffix = normalized.split(":").pop();
    return suffix === target;
  });

  return matchedKey ? properties[matchedKey] : undefined;
}

function getTypeNameFromWfsSource(wfsSource: string): string | null {
  try {
    const url = new URL(wfsSource);
    const typeName = url.searchParams.get("typeNames") ?? url.searchParams.get("typeName");
    if (!typeName) return null;
    return decodeURIComponent(typeName);
  } catch {
    return null;
  }
}

interface TogglerToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

export default function TogglerTool({ name = "Toggler", helpLink, hideHeader = false, onClose, onSidebarVisibility }: TogglerToolProps) {
  // Authentication
  const { data: session } = useSession();
  const {
    isLoading: authLoading,
    isAuthenticated,
    hasAccess,
    promptLogin,
  } = useRequireAuth({
    requiredRoles: TOGGLER_ROLES,
  });

  const accessToken = (session as { accessToken?: string })?.accessToken || (session?.user as { accessToken?: string })?.accessToken;

  // Stores
  const { toggleOn, selectedLayer, isLoading, error, layerUpdateTime, setToggleOn, setSelectedLayer, setLoading, setError, setLayerId, refreshLayer, reset } = useTogglerStore();

  const { map, setActiveToolId, isDrawingOrEditing } = useMapStore();
  const { show: showPopup } = usePopupStore();

  // Local state
  const [layers] = useState<TogglerLayer[]>(togglerConfig.layers);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [layerVisible, setLayerVisible] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [initialLayerLoading, setInitialLayerLoading] = useState(false);

  // Refs
  const mapClickEventRef = useRef<EventsKey | null>(null);
  const currentLayerIdRef = useRef<string | null>(null);
  const wmsLayerRef = useRef<ImageLayer<ImageWMS> | null>(null);
  const wmsSourceRef = useRef<ImageWMS | null>(null);
  const accessTokenRef = useRef<string | undefined>(accessToken);
  const initialLayerLoadedOnceRef = useRef(false);
  const wmsLoadEventsRef = useRef<EventsKey[]>([]);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  /**
   * Initialize component - select first layer by default
   */
  useEffect(() => {
    if (hasAccess && layers.length > 0 && !selectedLayer) {
      setSelectedLayer(layers[0]);
    }
  }, [hasAccess, layers, selectedLayer, setSelectedLayer]);

  /**
   * Add/update WMS layer when selected layer changes
   */
  useEffect(() => {
    if (!map || !selectedLayer) return;

    // Remove existing layer if any (use sync ref, don't trigger state update in cleanup)
    if (currentLayerIdRef.current) {
      LayerManager.removeLayer(currentLayerIdRef.current);
      currentLayerIdRef.current = null;
    }

    wmsLayerRef.current = null;
    wmsSourceRef.current = null;

    // Initial layer load can be slow; only show this once per tool session
    if (!initialLayerLoadedOnceRef.current) {
      setInitialLayerLoading(true);
    }

    // Create WMS source
    const wmsSource = new ImageWMS({
      url: `${selectedLayer.serverUrl}/wms`,
      params: {
        LAYERS: selectedLayer.layerName,
        TILED: true,
      },
      serverType: "geoserver",
      crossOrigin: "anonymous",
      imageLoadFunction: (image, src) => {
        const img = image.getImage() as HTMLImageElement;
        img.onerror = () => {
          console.warn(`[Toggler] Failed to load WMS image: ${src}`);
        };

        const token = accessTokenRef.current;
        if (!token) {
          img.src = src;
          return;
        }

        // Proxy through NextJS API to avoid CORS
        const proxyUrl = `/api/proxy/wms?url=${encodeURIComponent(src)}`;

        fetch(proxyUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`WMS proxy request failed: ${response.status}`);
            }
            return response.blob();
          })
          .then((blob) => {
            const objectUrl = URL.createObjectURL(blob);
            img.onload = () => URL.revokeObjectURL(objectUrl);
            img.src = objectUrl;
          })
          .catch((fetchError) => {
            console.warn("[Toggler] WMS fetch error:", fetchError);
          });
      },
    });

    // Create WMS layer
    const wmsLayer = new ImageLayer({
      source: wmsSource,
      opacity: 0.7,
      visible: true,
      zIndex: selectedLayer.zIndex,
    });

    // Add to map using LayerManager
    const newLayerId = LayerManager.addLayer(wmsLayer, "Tools", `Toggler - ${selectedLayer.label}`, {
      visible: true,
      opacity: 0.7,
      metadata: { source: "Toggler Tool" },
    });

    if (newLayerId) {
      currentLayerIdRef.current = newLayerId;
      // Use setTimeout to defer state update until after render commit
      setTimeout(() => setLayerId(newLayerId), 0);
    }

    wmsLayerRef.current = wmsLayer;
    wmsSourceRef.current = wmsSource;

    // Track initial WMS image load (first successful draw only)
    wmsLoadEventsRef.current.forEach((key) => unByKey(key));
    wmsLoadEventsRef.current = [];
    if (!initialLayerLoadedOnceRef.current) {
      wmsLoadEventsRef.current.push(
        wmsSource.on("imageloadstart", () => {
          if (!initialLayerLoadedOnceRef.current) {
            setInitialLayerLoading(true);
          }
        }),
      );
      wmsLoadEventsRef.current.push(
        wmsSource.on("imageloadend", () => {
          if (!initialLayerLoadedOnceRef.current) {
            initialLayerLoadedOnceRef.current = true;
            setInitialLayerLoading(false);
          }
        }),
      );
      wmsLoadEventsRef.current.push(
        wmsSource.on("imageloaderror", () => {
          if (!initialLayerLoadedOnceRef.current) {
            setInitialLayerLoading(false);
          }
        }),
      );
    }

    // Fetch record count
    fetchRecordCount(selectedLayer);

    return () => {
      wmsLoadEventsRef.current.forEach((key) => unByKey(key));
      wmsLoadEventsRef.current = [];
      // Only remove layer, don't trigger state updates during cleanup
      if (currentLayerIdRef.current) {
        LayerManager.removeLayer(currentLayerIdRef.current);
        currentLayerIdRef.current = null;
      }
      wmsLayerRef.current = null;
      wmsSourceRef.current = null;
    };
  }, [map, selectedLayer, setLayerId]);

  /**
   * Refresh WMS layer params without recreating the layer
   */
  useEffect(() => {
    if (!wmsSourceRef.current) return;
    wmsSourceRef.current.updateParams({ TIME: layerUpdateTime });
    // Update record count after toggle
    if (selectedLayer) {
      fetchRecordCount(selectedLayer);
    }
  }, [layerUpdateTime, selectedLayer]);

  /**
   * Fetch WFS record count for the selected layer
   */
  const fetchRecordCount = async (layer: TogglerLayer) => {
    try {
      const countUrl = `${layer.serverUrl}/wfs?REQUEST=GetFeature&VERSION=1.1&typeName=${layer.layerName}&RESULTTYPE=hits`;
      const proxyUrl = `/api/proxy/wfs?url=${encodeURIComponent(countUrl)}`;
      const response = await axios.get(proxyUrl);

      // Parse XML response to get numberOfFeatures
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, "text/xml");
      const featureCollection = xmlDoc.getElementsByTagName("wfs:FeatureCollection")[0];
      const count = featureCollection?.getAttribute("numberOfFeatures");
      setRecordCount(count ? parseInt(count) : 0);
    } catch (error) {
      console.warn("[Toggler] Failed to fetch record count:", error);
      setRecordCount(0);
    }
  };

  /**
   * Show feature information popup using WMS GetFeatureInfo
   */
  const showFeaturePopup = useCallback(
    async (coordinate: number[]) => {
      if (!selectedLayer || !map) return;

      try {
        // Use WMS GetFeatureInfo instead of WFS to avoid long URLs
        const wmsSource = wmsSourceRef.current;
        if (!wmsSource) return;

        const viewResolution = map.getView().getResolution();
        if (!viewResolution) return;

        // Get GetFeatureInfo URL from WMS source
        const featureInfoUrl = wmsSource.getFeatureInfoUrl(coordinate, viewResolution, "EPSG:3857", {
          INFO_FORMAT: "application/json",
        });

        if (!featureInfoUrl) return;

        // Proxy through NextJS API to avoid CORS
        const proxyUrl = `/api/proxy/wms?url=${encodeURIComponent(featureInfoUrl)}`;

        // Fetch features from WMS GetFeatureInfo
        const response = await axios.get(proxyUrl);

        if (!response.data || !response.data.features || response.data.features.length === 0) {
          return; // No feature found, don't show popup
        }

        // Parse features
        const geoJSONFormat = new GeoJSON();
        const features = geoJSONFormat.readFeatures(response.data);

        if (features.length === 0) return;

        // Get properties from first feature
        const feature = features[0];
        const properties = feature.getProperties();

        // Remove geometry from attributes display
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { geometry, ...attributes } = properties;

        // Create identify result
        const featureId = getPropertyValueCaseInsensitive(attributes, selectedLayer.keyField) ?? "unknown";
        const result = createIdentifyResult(selectedLayer.label, String(featureId), attributes, feature);

        // Show popup
        showPopup(coordinate, <ResultsPopup results={[result]} onClose={() => {}} isLoadingResults={false} resultsError={null} />, selectedLayer.label);
      } catch (err) {
        console.error("[Toggler] Error showing feature popup:", err);
      }
    },
    [selectedLayer, map, showPopup],
  );

  /**
   * Toggle feature at the given coordinate using WFS spatial query against the reference layer
   * (matches legacy behaviour: always queries wfsSource directly to obtain the keyField value)
   */
  const toggleFeature = useCallback(
    async (coordinate: number[]) => {
      if (!selectedLayer || !map) return;

      // Clear prior UI messages, then enable loading. Note: setError() also resets isLoading in the store.
      setError(null);
      setSuccessMessage(null);
      setLoading(true);

      try {
        // ── Step 1: Query the REFERENCE layer (parcel / road) to get the key ──
        // The legacy app always queries wfsSource directly to obtain the keyField
        // value – it never reads it from the toggler WMS layer.  We replicate that
        // behaviour here using a small WFS GetFeature + CQL spatial filter.
        // Road segments use DWITHIN with a 2 m buffer so clicks near (not exactly
        // on) a line still match.
        const geoJSONFormat = new GeoJSON();
        const referenceTypeName = getTypeNameFromWfsSource(selectedLayer.wfsSource);
        let referenceFeature: ReturnType<GeoJSON["readFeatures"]>[number] | null = null;

        if (referenceTypeName) {
          const refUrl = new URL(selectedLayer.wfsSource);
          refUrl.searchParams.set("service", "WFS");
          refUrl.searchParams.set("version", "2.0.0");
          refUrl.searchParams.set("request", "GetFeature");
          refUrl.searchParams.set("typeNames", referenceTypeName);
          refUrl.searchParams.set("outputFormat", "application/json");
          refUrl.searchParams.set("srsName", "EPSG:3857");
          refUrl.searchParams.set("count", "1");

          // DWITHIN with 2 m buffer (matches legacy) – works for both polygons and lines
          const cqlFilter = `DWITHIN(geom,POINT(${coordinate[0]} ${coordinate[1]}),2,meters)`;
          refUrl.searchParams.set("cql_filter", cqlFilter);

          const refProxyUrl = `/api/proxy/wfs?url=${encodeURIComponent(refUrl.toString())}`;
          const refResponse = await axios.get(refProxyUrl);
          const refData = typeof refResponse.data === "string" ? JSON.parse(refResponse.data) : refResponse.data;
          const refFeatures = refData ? geoJSONFormat.readFeatures(refData) : [];
          referenceFeature = refFeatures[0] ?? null;
        }

        if (!referenceFeature) {
          setError("No feature found at that location");
          setTimeout(() => setError(null), 3000);
          return;
        }

        // The feature we toggle is always the reference feature (it carries the key)
        const featureToToggle = referenceFeature;

        if (!featureToToggle) {
          setError("No feature found at that location");
          setTimeout(() => setError(null), 3000);
          return;
        }

        const properties = featureToToggle.getProperties();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { geometry, ...attributes } = properties;

        const keyValue = getPropertyValueCaseInsensitive(attributes, selectedLayer.keyField);
        if (keyValue === undefined || keyValue === null || String(keyValue).trim() === "") {
          console.warn("[Toggler] Key field not found in feature", {
            keyField: selectedLayer.keyField,
            availableFields: Object.keys(attributes),
          });
          setError(`Key field '${selectedLayer.keyField}' not found in feature`);
          setTimeout(() => setError(null), 3000);
          return;
        }

        const key = String(keyValue);

        // Get username from session
        const userName = session?.user?.name || "unknown";

        // Call toggle API
        const apiUrl = `/api/secure/toggler/${encodeURIComponent(selectedLayer.sourceTable)}/${encodeURIComponent(key)}/${encodeURIComponent(userName)}`;
        const toggleResponse = await axios.get(apiUrl);

        if (toggleResponse.data.status === "SUCCESS") {
          setSuccessMessage("Feature toggled successfully");
          setTimeout(() => setSuccessMessage(null), 3000);

          // Refresh the layer by updating the time parameter
          refreshLayer();
        }
      } catch (err) {
        console.error("Toggle error:", err);
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            setError("Authentication required");
          } else if (err.response?.status === 403) {
            setError("Insufficient permissions");
          } else {
            setError(err.response?.data?.error || "Failed to toggle feature");
          }
        } else {
          setError("An unexpected error occurred");
        }
        setTimeout(() => setError(null), 5000);
      } finally {
        setLoading(false);
      }
    },
    [selectedLayer, map, session, setLoading, setError, refreshLayer],
  );

  /**
   * Handle map click for toggling features or showing popup
   */
  const handleMapClick = useCallback(
    async (evt: MapBrowserEvent<PointerEvent>) => {
      const shiftKeyPressed = evt.originalEvent.shiftKey;

      // Don't proceed if drawing/editing
      if (isDrawingOrEditing || !selectedLayer) {
        return;
      }

      // When toggling is ON: shift+click toggles the feature
      if (toggleOn && shiftKeyPressed) {
        await toggleFeature(evt.coordinate);
        return;
      }

      // When toggling is OFF and shift is pressed, warn the user
      if (!toggleOn && shiftKeyPressed) {
        setError("Toggling switch is OFF.");
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Regular click (no shift): show popup with feature info
      if (!shiftKeyPressed) {
        await showFeaturePopup(evt.coordinate);
        return;
      }
    },
    [toggleOn, isDrawingOrEditing, selectedLayer, toggleFeature, showFeaturePopup, setError],
  );

  /**
   * Setup/cleanup map click listener
   */
  useEffect(() => {
    if (!map) return;

    // Remove existing listener
    if (mapClickEventRef.current) {
      unByKey(mapClickEventRef.current);
      mapClickEventRef.current = null;
    }

    // Add click listener - cast to avoid TypeScript overload issue with async handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapClickEventRef.current = map.on("click", handleMapClick as any);

    return () => {
      if (mapClickEventRef.current) {
        unByKey(mapClickEventRef.current);
        mapClickEventRef.current = null;
      }
    };
  }, [map, handleMapClick]);

  /**
   * Manage parcel click interaction state
   */
  useEffect(() => {
    if (toggleOn) {
      setActiveToolId("toggler");
    }

    return () => {
      setActiveToolId(null);
    };
  }, [toggleOn, setActiveToolId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (currentLayerIdRef.current) {
        LayerManager.removeLayer(currentLayerIdRef.current);
        currentLayerIdRef.current = null;
      }
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handle toggle switch change
   */
  const handleToggleChange = (checked: boolean) => {
    setToggleOn(checked);
    setError(null);
    setSuccessMessage(null);
  };

  /**
   * Handle layer selection change
   */
  const handleLayerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const layer = layers.find((l) => l.value === event.target.value);
    if (layer) {
      setSelectedLayer(layer);
      setError(null);
      setSuccessMessage(null);
      setRecordCount(0);
    }
  };

  /**
   * Handle layer visibility checkbox
   */
  const handleLayerVisibilityChange = () => {
    const newVisible = !layerVisible;
    setLayerVisible(newVisible);
    if (wmsLayerRef.current) {
      wmsLayerRef.current.setVisible(newVisible);
    }
  };

  /**
   * Toggle legend display
   */
  const toggleLegend = () => {
    setLegendOpen(!legendOpen);
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    if (currentLayerIdRef.current) {
      LayerManager.removeLayer(currentLayerIdRef.current);
      currentLayerIdRef.current = null;
    }
    reset();
    onClose();
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
        <div className="flex flex-col items-center justify-center p-8 text-gray-600">
          <FaSpinner size={32} className="animate-spin mb-4" />
          <p>Checking authentication...</p>
        </div>
      </PanelComponent>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FaSignInAlt size={48} className="text-blue-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-6">Please sign in to access the Toggler tool.</p>
          <button onClick={promptLogin} className="btn btn-primary">
            <FaSignInAlt className="mr-2" />
            Sign In
          </button>
        </div>
      </PanelComponent>
    );
  }

  // Show access denied if user doesn't have required roles
  if (!hasAccess) {
    return (
      <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FaLock size={48} className="text-red-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You are not authorized to view this tool.</p>
          <p className="text-sm text-gray-500">
            If you need access, please{" "}
            <a href="mailto:sim-gis@simcoe.ca?subject=Secure Access to opengis.simcoe.ca" className="link link-primary">
              contact us
            </a>
            .
          </p>
        </div>
      </PanelComponent>
    );
  }

  // Main tool UI
  if (initialLayerLoading) {
    return (
      <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
        <div className="flex flex-col items-center justify-center p-8 text-gray-700">
          <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin text-primary mb-4"></div>
          <p className="text-sm">Layer Loading...</p>
        </div>
      </PanelComponent>
    );
  }

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="p-1">
        {/* Toggle Switch - Right Aligned */}
        <div className="mb-1 pr-1" style={{ marginTop: "5px", textAlign: "right" }}>
          <label className="cursor-pointer" style={{ display: "inline-flex", alignItems: "center", width: "275px", gap: "5px", justifyContent: "flex-end" }}>
            <span className={`text-sm ${toggleOn ? "font-bold" : "font-normal"}`} style={{ lineHeight: "20px" }}>
              Toggling Enabled
            </span>
            <input
              type="checkbox"
              className="sc-toggle-switch"
              checked={toggleOn}
              onChange={(e) => handleToggleChange(e.target.checked)}
              style={{ position: "relative", top: "0px", marginLeft: "5px" }}
            />
          </label>
        </div>
        <div className="text-xs italic font-bold text-right pr-1 mb-2" style={{ fontSize: "12px", marginTop: "5px" }}>
          * Shift Click to toggle in the map
        </div>

        {/* LAYERS Section */}
        <div className="sc-title">Layers</div>

        {/* Layer Dropdown */}
        <div className="px-1 mb-2">
          <select
            className="select select-bordered select-sm w-full text-sm border border-gray-300 focus:border-gray-400 focus:outline-none"
            value={selectedLayer?.value || ""}
            onChange={handleLayerChange}
            style={{ height: "30px", minHeight: "30px", fontSize: "13px", width: "300px" }}
          >
            {layers.map((layer) => (
              <option key={layer.value} value={layer.value}>
                {layer.label}
              </option>
            ))}
          </select>
        </div>

        {/* Layer Item with Checkbox, Count, and Info Icon */}
        {selectedLayer && (
          <div>
            <div className="border-t border-gray-300" style={{ height: "30px", position: "relative" }}>
              <div style={{ margin: 0, position: "absolute", top: "70%", transform: "translateY(-50%)", width: "328px" }}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={layerVisible}
                  onChange={handleLayerVisibilityChange}
                  style={{ position: "relative", bottom: "6px", left: "3px", cursor: "pointer" }}
                />
                <label className="text-sm cursor-pointer" onClick={handleLayerVisibilityChange} style={{ position: "relative", bottom: "7px", left: "8px" }}>
                  {selectedLayer.label}
                </label>
                <span className="text-xs text-gray-400" style={{ position: "relative", bottom: "8px", left: "8px", fontSize: "9pt" }}>
                  ({recordCount})
                </span>
                <button
                  onClick={toggleLegend}
                  className="btn btn-ghost btn-xs p-0"
                  title="Show Details"
                  style={{ position: "relative", float: "right", bottom: "3px", cursor: "pointer", minHeight: 0, height: "auto", border: "none" }}
                >
                  <FaInfoCircle className="text-blue-500" size={16} />
                </button>
              </div>
            </div>

            {/* Legend - Collapsible with smooth transition */}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out ml-3"
              style={{
                maxHeight: legendOpen ? "200px" : "0",
                opacity: legendOpen ? 1 : 0,
              }}
            >
              <div className="space-y-1 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-orange-400 border border-gray-400"></div>
                  <span className="text-sm">Off</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-green-500 border border-gray-400"></div>
                  <span className="text-sm">On</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="alert alert-info alert-sm mt-2 mx-1">
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
            <span className="text-sm">Toggling feature, please wait</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success alert-sm mt-2 mx-1">
            <span className="text-sm">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error alert-sm mt-2 mx-1">
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    </PanelComponent>
  );
}
