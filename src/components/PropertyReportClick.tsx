"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { useAppStore } from "@/stores/appStore";
import { Feature } from "ol";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Stroke, Fill } from "ol/style";
import { GeoJSON } from "ol/format";
import { getArea } from "ol/sphere";
import { getAxiosClient } from "@/lib/axiosInstance";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { InteractionManager } from "@/utils/openlayers/InteractionManager";
import ResultsPopup, { createPropertyResult, createCondoResult, type Result } from "@/components/ResultsPopup";
import { getAxiosClient as getAxiosClientUtil } from "@/lib/axiosInstance";
import { useInteractionManager } from "@/components/map/MapContainer";

// Parcel URL template for WFS queries
const parcelURLTemplate = (mainURL: string, x: number, y: number) => `${mainURL}&cql_filter=INTERSECTS(geom,%20POINT%20(${x}%20${y}))`;

// Parcel layer style
const parcelLayerStyle = new Style({
  fill: new Fill({
    color: [0, 0, 0, 0.0], // Transparent fill
  }),
  stroke: new Stroke({
    color: [231, 128, 128, 0.8], // Red stroke
    width: 3,
  }),
});

interface PropertyInfo {
  ARN: string;
  Address?: string;
  Municipality?: string;
  AssessedValue?: string; // Base64 encoded PNG image (data:image/png;base64,...)
  HasZoning?: boolean;
  WasteCollection?: {
    GarbageDay?: string;
  };
  Other?: {
    BroadbandSpeed?: string;
  };
  pointCoordinates?: number[];
  pointerCoordinates?: number[];
  shareURL?: string;
  area?: number;
  [key: string]: unknown;
}

interface ParcelFeatureProperties {
  arn: string;
  [key: string]: unknown;
}

interface WFSResponse {
  features: Array<{
    properties: ParcelFeatureProperties;
    geometry: unknown;
  }>;
}

interface CondoUnit {
  ARN: string;
  UnitNumber?: string;
  Address?: string;
}

type ClickResult = Result & {
  loadDetails?: () => Promise<void>;
  clearParcelLayer?: () => void;
};

export default function PropertyReportClick() {
  const map = useMapStore((s) => s.map);
  const checkGlobalDisable = useMapStore((s) => s.isToolActive);
  const showPopup = usePopupStore((s) => s.show);
  const hidePopup = usePopupStore((s) => s.hide);
  const urlParameters = useAppStore((state) => state.urlParameters);
  const config = useAppStore((state) => state.config);
  const { registerHandler, unregisterHandler } = useInteractionManager();

  const parcelLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const parcelLayerIdRef = useRef<string | null>(null);

  // Initialize parcel layer
  useEffect(() => {
    if (!map || parcelLayerRef.current) return;

    const parcelLayer = new VectorLayer({
      style: parcelLayerStyle,
      source: new VectorSource(),
    });

    const parcelLayerId = LayerManager.addLayer(parcelLayer, "Graphics", "Parcel Highlight", {
      index: 500,
      metadata: {
        isParcelLayer: true,
      },
    });

    parcelLayerRef.current = parcelLayer;
    parcelLayerIdRef.current = parcelLayerId;

    return () => {
      if (parcelLayerIdRef.current) {
        LayerManager.removeLayer(parcelLayerIdRef.current);
        parcelLayerIdRef.current = null;
      }
      parcelLayerRef.current = null;
    };
  }, [map]);

  // Get share URL with ARN parameter
  const getShareURL = useCallback((arn: string) => {
    let url = window.location.href.replace("#", "");

    if (url.indexOf("?") > 0) {
      // Remove existing ARN parameter if present
      const urlObj = new URL(url);
      urlObj.searchParams.delete("ARN");
      urlObj.searchParams.set("ARN", arn);
      url = urlObj.toString();
    } else {
      url = `${url}?ARN=${arn}`;
    }

    return url;
  }, []);

  // Fetch property information
  const fetchPropertyInfo = useCallback(
    async (arn: string, feature: Feature | null, pointerPoint: number[], latLongCoords: number[]): Promise<PropertyInfo> => {
      const propertyReportUrl = config?.propertyReportUrl;
      if (!propertyReportUrl) {
        // Return basic info if no property report URL configured
        return {
          ARN: arn,
          pointCoordinates: latLongCoords,
          pointerCoordinates: pointerPoint,
          shareURL: getShareURL(arn),
          area: feature?.getGeometry() ? getArea(feature.getGeometry()!) : 0,
        };
      }

      const infoURL = `${propertyReportUrl}${arn}`;
      const axiosClient = getAxiosClient(infoURL);
      // For internal API routes, the axiosInstance already has baseURL set to /api, so we need to use the path without /api
      const requestPath = infoURL.startsWith("/api/") ? infoURL.replace("/api", "") : infoURL;

      try {
        const response = await axiosClient.get<PropertyInfo>(requestPath);
        const result = response.data;

        return {
          ...result,
          pointerCoordinates: pointerPoint,
          pointCoordinates: latLongCoords,
          shareURL: getShareURL(arn),
          area: feature?.getGeometry() ? getArea(feature.getGeometry()!) : 0,
        };
      } catch (error) {
        console.error("Error fetching property info:", error);
        return {
          ARN: arn,
          pointCoordinates: latLongCoords,
          pointerCoordinates: pointerPoint,
          shareURL: getShareURL(arn),
          area: feature?.getGeometry() ? getArea(feature.getGeometry()!) : 0,
        };
      }
    },
    [config, getShareURL],
  );

  // Convert Web Mercator to Lat/Long
  const toLatLongFromWebMercator = useCallback((coords: number[]) => {
    const lon = (coords[0] * 180) / 20037508.34;
    const lat = (Math.atan(Math.exp((coords[1] * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
    return [lon, lat];
  }, []);

  // Show property window for URL parameter (ARN)
  const showPropertyWindowForARN = useCallback(
    async (wfsURL: string, shouldZoomToFeature: boolean) => {
      try {
        const axiosClient = getAxiosClient(wfsURL);
        const response = await axiosClient.get<WFSResponse>(wfsURL);
        const result = response.data;

        if (!result.features || result.features.length === 0) return;

        const geoJSON = new GeoJSON().readFeatures(result);
        const vectorSource = new VectorSource({ features: geoJSON });

        parcelLayerRef.current?.setSource(vectorSource);

        const feature = geoJSON[0];
        feature.setStyle(parcelLayerStyle);

        const arn = result.features[0].properties.arn;
        feature.setProperties({ arn });

        // Get coordinates from feature center
        const extent = feature.getGeometry()?.getExtent();
        if (!extent) return;

        const centerX = (extent[0] + extent[2]) / 2;
        const centerY = (extent[1] + extent[3]) / 2;
        const pointerPoint = [centerX, centerY];
        const latLongCoords = toLatLongFromWebMercator(pointerPoint);

        // Zoom to feature if requested
        if (shouldZoomToFeature) {
          map?.getView().fit(extent, { size: map.getSize() });
        }

        // Build results using the same logic as fetchParcelResults
        const results: ClickResult[] = [];
        const clearParcelLayer = () => {
          parcelLayerRef.current?.getSource()?.clear();
        };

        if (arn.length === 20) {
          // Condo parent - fetch all children
          try {
            const apiUrl = `/api/public/reports/condo-children/${arn}`;
            const client = getAxiosClientUtil(apiUrl);
            const requestPath = apiUrl.startsWith("/api/") ? apiUrl.replace("/api", "") : apiUrl;
            const condoResponse = await client.get(requestPath);

            if (Array.isArray(condoResponse.data) && condoResponse.data.length > 0) {
              condoResponse.data.forEach((unit: CondoUnit) => {
                const condoResult: ClickResult = createCondoResult(unit.ARN, unit.UnitNumber, unit.Address, feature);

                // Attach lazy-loading function for property info
                condoResult.loadDetails = async () => {
                  if (!condoResult.data.propInfo) {
                    const propInfo = await fetchPropertyInfo(unit.ARN, feature, pointerPoint, latLongCoords);
                    condoResult.data.propInfo = propInfo;
                    condoResult.data.feature = feature;
                  }
                };

                condoResult.clearParcelLayer = clearParcelLayer;
                results.push(condoResult);
              });
            }
          } catch (error) {
            console.error("Error fetching condo children:", error);
          }
        } else {
          // Regular property
          const propInfo = await fetchPropertyInfo(arn, feature, pointerPoint, latLongCoords);
          const propertyResult: ClickResult = createPropertyResult(arn, propInfo.Address || "", feature, propInfo);
          propertyResult.clearParcelLayer = clearParcelLayer;
          results.push(propertyResult);
        }

        // Show unified popup
        const handleClose = () => {
          clearParcelLayer();
          hidePopup();
        };

        const handleSelectResult = async (result: Result) => {
          const extended = result as ClickResult;
          if (extended.loadDetails) {
            await extended.loadDetails();
          }
        };

        showPopup(
          pointerPoint,
          <ResultsPopup results={results} onClose={handleClose} onSelectResult={handleSelectResult} onClearParcelLayer={clearParcelLayer} />,
          results.length > 1 ? `Results (${results.length})` : "Property Information",
          "Parcel",
        );
      } catch (error) {
        console.error("Error fetching parcel data:", error);
      }
    },
    [map, toLatLongFromWebMercator, fetchPropertyInfo, showPopup, hidePopup],
  );

  // Fetch parcel data and return results (for interaction handler)
  const fetchParcelResults = useCallback(
    async (coordinate: number[]) => {
      try {
        const parcelLayerUrl = config?.parcelLayer?.url;
        if (!parcelLayerUrl) {
          console.warn("Parcel layer URL not configured");
          return [];
        }

        const parcelURL = parcelURLTemplate(parcelLayerUrl, coordinate[0], coordinate[1]);
        const axiosClient = getAxiosClient(parcelURL);
        const response = await axiosClient.get<WFSResponse>(parcelURL);
        const result = response.data;

        if (!result.features || result.features.length === 0) return [];

        const geoJSON = new GeoJSON().readFeatures(result);
        const vectorSource = new VectorSource({ features: geoJSON });
        parcelLayerRef.current?.setSource(vectorSource);

        const feature = geoJSON[0];
        feature.setStyle(parcelLayerStyle);

        const arn = result.features[0].properties.arn;
        feature.setProperties({ arn });

        const pointerPoint = coordinate;
        const latLongCoords = toLatLongFromWebMercator(coordinate);

        const results: ClickResult[] = [];

        // Function to clear parcel layer
        const clearParcelLayer = () => {
          parcelLayerRef.current?.getSource()?.clear();
        };

        // Check if this is a condo parent ARN (20 characters)
        if (arn.length === 20) {
          // Fetch all condo children
          try {
            const apiUrl = `/api/public/reports/condo-children/${arn}`;
            const client = getAxiosClientUtil(apiUrl);
            const requestPath = apiUrl.startsWith("/api/") ? apiUrl.replace("/api", "") : apiUrl;
            const condoResponse = await client.get(requestPath);

            if (Array.isArray(condoResponse.data) && condoResponse.data.length > 0) {
              // Add each condo unit as a result (without property info - will be lazy-loaded)
              condoResponse.data.forEach((unit: CondoUnit) => {
                const condoResult: ClickResult = createCondoResult(unit.ARN, unit.UnitNumber, unit.Address, feature);

                // Attach lazy-loading function for property info
                condoResult.loadDetails = async () => {
                  if (!condoResult.data.propInfo) {
                    const propInfo = await fetchPropertyInfo(unit.ARN, feature, pointerPoint, latLongCoords);
                    condoResult.data.propInfo = propInfo;
                    condoResult.data.feature = feature;
                  }
                };

                // Attach parcel layer clearing function
                condoResult.clearParcelLayer = clearParcelLayer;

                results.push(condoResult);
              });
            }
          } catch (error) {
            console.error("Error fetching condo children:", error);
          }
        } else {
          // Regular property - fetch property information
          const propInfo = await fetchPropertyInfo(arn, feature, pointerPoint, latLongCoords);
          const propertyResult: ClickResult = createPropertyResult(arn, propInfo.Address || "", feature, propInfo);

          // Attach parcel layer clearing function
          propertyResult.clearParcelLayer = clearParcelLayer;

          results.push(propertyResult);
        }

        return results;
      } catch (error) {
        console.error("Error fetching parcel data:", error);
        return [];
      }
    },
    [config, toLatLongFromWebMercator, fetchPropertyInfo],
  );

  // Register handler for parcel clicks using new system
  useEffect(() => {
    if (!map) return;

    // Register handler with MapContainer
    registerHandler({
      id: "property-report-click",
      eventType: "singleclick",
      priority: 10, // Lower priority to run before other handlers
      conditions: {
        maxScale: 20000,
        checkDisableFlags: checkGlobalDisable,
        checkLayerFilters: InteractionManager.checkLayersForDisable,
      },
      handler: async (coordinate) => {
        // Fetch parcel data and return results for aggregation
        const results = await fetchParcelResults(coordinate);
        return results;
      },
    });

    return () => {
      unregisterHandler("property-report-click");
    };
  }, [map, checkGlobalDisable, fetchParcelResults, registerHandler, unregisterHandler]);

  // Handle ARN URL parameter
  useEffect(() => {
    if (!map) return;

    const urlARN = urlParameters.ARN;
    if (urlARN) {
      const parcelLayerUrl = config?.parcelLayer?.url;
      if (!parcelLayerUrl) {
        console.warn("Parcel layer URL not configured");
        return;
      }

      const parcelURLARNTemplate = (mainURL: string, arn: string) => `${mainURL}&cql_filter=arn='${arn}'`;
      const parcelARNURL = parcelURLARNTemplate(parcelLayerUrl, urlARN);

      // Small delay to ensure map is fully loaded
      const timer = setTimeout(() => {
        showPropertyWindowForARN(parcelARNURL, true);
      }, 500);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, urlParameters, showPropertyWindowForARN]);

  // Handle pending property report requests from other components (e.g. AppTrackPopup)
  const pendingPropertyLookup = usePopupStore((s) => s.pendingPropertyLookup);
  useEffect(() => {
    if (!pendingPropertyLookup || !map) return;

    const { coordinates: coords, zoomToFeature } = pendingPropertyLookup;
    usePopupStore.getState().clearPendingPropertyLookup();

    const parcelLayerUrl = config?.parcelLayer?.url;
    if (!parcelLayerUrl) {
      console.warn("Parcel layer URL not configured");
      return;
    }

    const parcelURL = parcelURLTemplate(parcelLayerUrl, coords[0], coords[1]);
    showPropertyWindowForARN(parcelURL, zoomToFeature);
  }, [pendingPropertyLookup, map, config, showPropertyWindowForARN]);

  return null; // This component doesn't render anything directly
}
