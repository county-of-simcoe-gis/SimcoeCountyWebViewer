/**
 * LiveLayerIdentifyClick Component
 *
 * This component handles single-click interactions on the map to identify features
 * from visible "live layers" (layers with liveLayer=true in TOC).
 *
 * Features:
 * - Registers a handler with the InteractionManager for unified click handling
 * - Queries all visible TOC layers that have liveLayer=true
 * - Supports both WMS (GetFeatureInfo) and ArcGIS REST (identify) services
 * - Returns results for the unified popup system
 *
 * Based on the old application's live layer identify functionality.
 */

"use client";

import React, { useEffect, useCallback } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useTOCStore } from "@/stores/tocStore";
import { useInteractionManagerStore, type InteractionResult } from "@/stores/interactionManagerStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { GeoJSON } from "ol/format";
import { getAxiosClient } from "@/lib/axiosInstance";
import { getAccessToken } from "@/utils/auth";
import { filterPropertyKeys } from "@/utils/identifyHelpers";
import type TileWMS from "ol/source/TileWMS";
import type ImageWMS from "ol/source/ImageWMS";
import type BaseLayer from "ol/layer/Base";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";

interface ESRIResult {
  geometry?: Record<string, unknown>;
  geometryType?: string;
  attributes?: Record<string, unknown>;
}

interface ESRIIdentifyResponse {
  results?: ESRIResult[];
}

/**
 * Parse ESRI identify response
 */
function parseESRIIdentify(response: ESRIIdentifyResponse): Feature<Geometry>[] {
  if (!response || !response.results) return [];

  const geoJsonFormat = new GeoJSON();
  const features: Feature<Geometry>[] = [];

  for (const result of response.results) {
    try {
      // Convert ESRI geometry to GeoJSON
      const esriGeometry = result.geometry;
      const attributes = result.attributes;

      if (!esriGeometry) continue;

      // Simple conversion for point geometry
      let geoJsonGeometry: Record<string, unknown> | undefined;
      if (result.geometryType === "esriGeometryPoint") {
        geoJsonGeometry = {
          type: "Point",
          coordinates: [esriGeometry.x, esriGeometry.y],
        };
      } else if (result.geometryType === "esriGeometryPolygon") {
        geoJsonGeometry = {
          type: "Polygon",
          coordinates: esriGeometry.rings,
        };
      } else if (result.geometryType === "esriGeometryPolyline") {
        geoJsonGeometry = {
          type: "LineString",
          coordinates: esriGeometry.paths[0],
        };
      } else {
        continue;
      }

      const geoJson = {
        type: "Feature",
        geometry: geoJsonGeometry,
        properties: attributes,
      };

      const feature = geoJsonFormat.readFeature(geoJson, {
        dataProjection: "EPSG:3857",
        featureProjection: "EPSG:3857",
      });

      features.push(feature as Feature<Geometry>);
    } catch (error) {
      console.warn("Error parsing ESRI identify result:", error);
    }
  }

  return features;
}

/**
 * Popup content component for live layer features
 */
function LiveLayerPopupContent({ properties }: { properties: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: "400px", maxHeight: "300px", overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {filterPropertyKeys(properties)
            .filter((key) => key !== "layerDisplayName")
            .map((key) => {
              const value = properties[key];
              if (value === null || value === undefined) return null;

              return (
                <tr key={key} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "8px", fontWeight: "bold", verticalAlign: "top", whiteSpace: "nowrap" }}>{key}:</td>
                  <td style={{ padding: "8px", wordBreak: "break-word" }}>{String(value)}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

export default function LiveLayerIdentifyClick() {
  const map = useMapStore((s) => s.map);
  const checkGlobalDisable = useMapStore((s) => s.isToolActive);
  const allLayers = useTOCStore((state) => state.allLayers);
  const registerHandler = useInteractionManagerStore((s) => s.registerHandler);
  const unregisterHandler = useInteractionManagerStore((s) => s.unregisterHandler);

  /**
   * Identify features on a single layer
   */
  const identifyLayerFeatures = useCallback(
    async (layer: BaseLayer, coordinate: number[]): Promise<Feature<Geometry> | undefined> => {
      if (!map) return undefined;

      const viewResolution = map.getView().getResolution();
      const source = layer.getSource() as TileWMS | ImageWMS;
      const isArcGISLayer = layer.get("isArcGIS") || false;

      // Get layer properties
      const secured = layer.get("secured");
      const hasAttachments = layer.get("hasAttachments");
      const attachmentUrl = layer.get("attachmentUrl");
      const displayName = layer.get("tocDisplayName") || layer.get("displayName") || layer.get("name");

      // Build axios config with auth headers for secured GeoServer layers
      // ArcGIS layers use URL-based tokens instead of Bearer headers
      const axiosConfig: Record<string, unknown> = {};
      if (secured && !isArcGISLayer) {
        const token = await getAccessToken();
        if (token) {
          axiosConfig.headers = { Authorization: `Bearer ${token}` };
        }
      }

      let url: string | undefined;

      // Build URL based on layer type
      if (isArcGISLayer) {
        const wfsUrl = layer.get("wfsUrl");
        if (!wfsUrl) return undefined;

        const mapSize = map.getSize() || [0, 0];
        const arcgisResolution = `${mapSize[0]},${mapSize[1]},96`;
        const extent = map.getView().calculateExtent();
        const zoom = map.getView().getZoom() || 0;
        const tolerance = 20 - zoom;

        url = wfsUrl
          .replace("#GEOMETRY#", coordinate.join(","))
          .replace("#GEOMETRYTYPE#", "esriGeometryPoint")
          .replace("#TOLERANCE#", String(tolerance >= 10 ? tolerance : 10))
          .replace("#EXTENT#", extent.join(","))
          .replace("#RESOLUTION#", arcgisResolution);
      } else {
        // WMS GetFeatureInfo
        if (!source || !source.getFeatureInfoUrl) return undefined;

        url = source.getFeatureInfoUrl(coordinate, viewResolution!, "EPSG:3857", {
          INFO_FORMAT: "application/json",
        });
      }

      if (!url) return undefined;

      try {
        const axiosClient = getAxiosClient(url);
        const response = await axiosClient.get(url, { ...axiosConfig });
        let result = response.data;

        // Parse string responses
        if (typeof result === "string") {
          try {
            result = JSON.parse(result);
          } catch {
            return undefined;
          }
        }

        // Parse features based on layer type
        let features: Feature<Geometry>[];
        if (isArcGISLayer) {
          features = parseESRIIdentify(result);
        } else {
          features = new GeoJSON().readFeatures(result);
        }

        if (features.length === 0) return undefined;

        // Get first feature and add layer display name
        const feature = features[0];
        feature.setProperties({ layerDisplayName: displayName });

        // Add attachment URL if available
        if (hasAttachments && attachmentUrl) {
          const keys = feature.getKeys();
          const objectIdKey = keys.find((key) => key.toUpperCase().indexOf("OBJECTID") !== -1);
          if (objectIdKey) {
            const objectId = feature.get(objectIdKey);
            feature.set("attachmentUrl", attachmentUrl.replace("#OBJECTID#", objectId));
          }
        }

        return feature;
      } catch (error) {
        console.error(`Error identifying features on layer:`, error);
        return undefined;
      }
    },
    [map],
  );

  /**
   * Identify handler for the InteractionManager
   */
  const identifyHandler = useCallback(
    async (coordinate: number[]): Promise<InteractionResult[]> => {
      if (!map || checkGlobalDisable()) return [];

      // Filter for visible live layers
      const visibleLiveLayers = allLayers.filter((tocLayer) => {
        if (!tocLayer.layer || !tocLayer.visible || !tocLayer.liveLayer) {
          return false;
        }
        return true;
      });

      if (visibleLiveLayers.length === 0) {
        return [];
      }

      // Collect all identify promises
      const identifyPromises = visibleLiveLayers.map((tocLayer) => {
        return identifyLayerFeatures(tocLayer.layer, coordinate);
      });

      // Wait for all identify requests to complete
      const rawResults = await Promise.all(identifyPromises);

      // Filter out undefined results and convert to InteractionResults
      const results: InteractionResult[] = [];

      rawResults.forEach((feature, index) => {
        if (!feature) return;

        const layerDisplayName = feature.get("layerDisplayName") || "Feature";
        const properties = feature.getProperties();
        const featureId = feature.getId() || `live-${index}-${Date.now()}`;

        // Look up layer z-index from LayerManager for sorting
        const tocLayer = visibleLiveLayers[index];
        const managedLayerId = tocLayer?.managedLayerId;
        const managedLayer = managedLayerId ? useLayerManagerStore.getState().getLayer(managedLayerId) : null;
        const layerZIndex = managedLayer?.zIndex ?? 0;

        results.push({
          id: `livelayer-${featureId}`,
          type: "identify",
          displayName: layerDisplayName,
          layerZIndex,
          data: {
            layerName: layerDisplayName,
            featureId: String(featureId),
            attributes: properties,
            feature: feature,
            renderContent: () => <LiveLayerPopupContent properties={properties} />,
          },
        });
      });

      return results;
    },
    [map, allLayers, identifyLayerFeatures, checkGlobalDisable],
  );

  // Register handler with InteractionManager
  useEffect(() => {
    if (!map) return;

    const handlerId = "live-layer-identify";

    registerHandler({
      id: handlerId,
      eventType: "singleclick",
      priority: 80, // After 211 (50) but before property report (10 means runs earlier, so 80 runs after)
      handler: identifyHandler,
    });

    return () => {
      unregisterHandler(handlerId);
    };
  }, [map, registerHandler, unregisterHandler, identifyHandler]);

  return null; // This component doesn't render anything directly
}
