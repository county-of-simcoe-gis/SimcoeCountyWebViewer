"use client";

import { useEffect, useCallback } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useTOCStore } from "@/stores/tocStore";
import { GeoJSON } from "ol/format";
import { getAxiosClient } from "@/lib/axiosInstance";
import { getAccessToken } from "@/utils/auth";
import { useInteractionManager } from "@/components/MapContainer";
import { createIdentifyResult } from "@/components/ResultsPopup";
import type { IdentifyResult } from "@/components/ResultsPopup";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import ThemePopupContent from "@/components/themes/shared/ThemePopupContent";
import type TileWMS from "ol/source/TileWMS";
import type ImageWMS from "ol/source/ImageWMS";
import type BaseLayer from "ol/layer/Base";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";

interface ESRIResult {
  geometry?: Record<string, unknown>;
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
      if (esriGeometry.x !== undefined && esriGeometry.y !== undefined) {
        // Point geometry
        geoJsonGeometry = {
          type: "Point",
          coordinates: [esriGeometry.x, esriGeometry.y],
        };
      } else if (esriGeometry.paths) {
        // Line geometry
        geoJsonGeometry = {
          type: "MultiLineString",
          coordinates: esriGeometry.paths,
        };
      } else if (esriGeometry.rings) {
        // Polygon geometry
        geoJsonGeometry = {
          type: "Polygon",
          coordinates: esriGeometry.rings,
        };
      } else {
        continue;
      }

      // Create GeoJSON feature
      const geoJsonFeature = {
        type: "Feature",
        geometry: geoJsonGeometry,
        properties: attributes || {},
      };

      // Parse to OpenLayers feature
      const parsedFeature = geoJsonFormat.readFeature(geoJsonFeature, {
        dataProjection: "EPSG:3857",
        featureProjection: "EPSG:3857",
      });

      // readFeature can return a single feature or array
      if (Array.isArray(parsedFeature)) {
        features.push(...parsedFeature);
      } else {
        features.push(parsedFeature);
      }
    } catch (error) {
      console.error("Error parsing ESRI feature:", error);
    }
  }

  return features;
}

export interface LiveLayerResult {
  layerName: string;
  featureId: string;
  attributes: Record<string, unknown>;
  feature: Feature<Geometry>;
  layerZIndex?: number;
  layerId?: string;
  displayName?: string;
  /** True when this result comes from a theme layer (uses ThemePopupContent) */
  isThemeLayer?: boolean;
  /** Optional theme-specific popup metadata */
  moreInfoUrlFieldName?: string;
  popupLogoImage?: string;
}

export default function LiveLayerClick() {
  const map = useMapStore((s) => s.map);
  const isToolActive = useMapStore((s) => s.isToolActive);
  const allLayers = useTOCStore((s) => s.allLayers);
  const { registerHandler, unregisterHandler } = useInteractionManager();

  // Query a single live layer for features at coordinate
  const queryLiveLayer = useCallback(
    async (layer: BaseLayer, coordinate: number[]): Promise<Feature<Geometry>[]> => {
      const displayName = layer.get("tocDisplayName") || layer.get("displayName") || layer.get("name");
      console.log(`LiveLayerClick: Starting query for "${displayName}" at coordinate:`, coordinate);

      if (!map) {
        console.log(`LiveLayerClick: No map available for "${displayName}"`);
        return [];
      }

      const viewResolution = map.getView().getResolution();
      const source = layer.getSource() as TileWMS | ImageWMS;
      const isArcGISLayer = layer.get("isArcGIS") || false;

      console.log(`LiveLayerClick: "${displayName}" - isArcGIS: ${isArcGISLayer}, hasSource: ${!!source}`);

      // Get layer properties
      const secured = layer.get("secured");

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
        console.log(`LiveLayerClick: "${displayName}" - wfsUrl template:`, wfsUrl);

        if (!wfsUrl) {
          console.log(`LiveLayerClick: "${displayName}" - No wfsUrl configured`);
          return [];
        }

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

        console.log(`LiveLayerClick: "${displayName}" - Built ArcGIS URL:`, url);
      } else {
        // WMS GetFeatureInfo
        if (!source || !source.getFeatureInfoUrl) {
          console.log(`LiveLayerClick: "${displayName}" - No source or getFeatureInfoUrl method`);
          return [];
        }

        url = source.getFeatureInfoUrl(coordinate, viewResolution!, "EPSG:3857", {
          INFO_FORMAT: "application/json",
          FEATURE_COUNT: 50,
        });

        console.log(`LiveLayerClick: "${displayName}" - Built WMS URL:`, url);
      }

      if (!url) {
        console.log(`LiveLayerClick: "${displayName}" - URL generation failed`);
        return [];
      }

      try {
        console.log(`LiveLayerClick: "${displayName}" - Making request...`);
        const axiosClient = getAxiosClient(url);
        const response = await axiosClient.get(url, { ...axiosConfig });
        let result = response.data;

        console.log(`LiveLayerClick: "${displayName}" - Response received, type:`, typeof result);

        // Parse string responses
        if (typeof result === "string") {
          try {
            result = JSON.parse(result);
            console.log(`LiveLayerClick: "${displayName}" - Parsed string response`);
          } catch {
            console.log(`LiveLayerClick: "${displayName}" - Failed to parse string response`);
            return [];
          }
        }

        // Parse features based on layer type
        let features: Feature<Geometry>[];
        if (isArcGISLayer) {
          console.log(`LiveLayerClick: "${displayName}" - Parsing as ArcGIS identify`);
          features = parseESRIIdentify(result);
        } else {
          console.log(`LiveLayerClick: "${displayName}" - Parsing as GeoJSON`);
          features = new GeoJSON().readFeatures(result);
        }

        console.log(`LiveLayerClick: "${displayName}" - Found ${features.length} features`);

        if (features.length === 0) {
          console.log(`LiveLayerClick: "${displayName}" - No features found`);
          return [];
        }

        // Add layer display name and per-feature attachment URL to ALL features
        const hasAttachments = layer.get("hasAttachments");
        const layerAttachmentUrl = layer.get("attachmentUrl");

        for (const feature of features) {
          feature.setProperties({ layerDisplayName: displayName });

          // Inject attachmentUrl onto the feature when the layer has attachments
          // (matches the Identify panel behavior so InfoRow renders the Attachments component).
          if (hasAttachments && layerAttachmentUrl) {
            const keys = feature.getKeys();
            const objectIdKey = keys.find((k) => k.toUpperCase().includes("OBJECTID"));
            const objectId = objectIdKey ? feature.get(objectIdKey) : null;
            if (objectId != null) {
              feature.set("attachmentUrl", String(layerAttachmentUrl).replace("#OBJECTID#", String(objectId)));
            }
          }
        }

        console.log(`LiveLayerClick: "${displayName}" - Returning ${features.length} feature(s)`);
        return features;
      } catch (error) {
        console.error(`LiveLayerClick: "${displayName}" - Error identifying features:`, error);
        return [];
      }
    },
    [map],
  );

  // Query all visible live layers at coordinate
  const queryAllLiveLayers = useCallback(
    async (coordinate: number[]): Promise<LiveLayerResult[]> => {
      console.log(`LiveLayerClick: Total TOC layers: ${allLayers.length}`);

      const visibleLiveLayers = allLayers.filter((tocLayer) => {
        const hasLayer = !!tocLayer.layer;
        const isVisible = tocLayer.visible;
        const isLiveLayer = tocLayer.liveLayer;
        // Also check the clickable property from LayerManager (central click gating)
        const managedLayer = tocLayer.managedLayerId ? useLayerManagerStore.getState().getLayer(tocLayer.managedLayerId) : null;
        const isClickable = managedLayer ? managedLayer.clickable : true; // default true if not in LayerManager
        // Per-layer log commented out — floods console with 180+ lines per click
        // console.log(`LiveLayerClick: Layer ${tocLayer.displayName}, hasLayer: ${hasLayer}, visible: ${isVisible}, liveLayer: ${isLiveLayer}, clickable: ${isClickable}`);
        return hasLayer && isVisible && isLiveLayer && isClickable;
      });

      console.log(`LiveLayerClick: Found ${visibleLiveLayers.length} visible live layers to query`);
      if (visibleLiveLayers.length > 0) {
        console.log(
          "LiveLayerClick: Live layers to query:",
          visibleLiveLayers.map((l) => l.displayName),
        );
      }

      // Query all layers in parallel
      const results: LiveLayerResult[] = [];
      const identifyPromises = visibleLiveLayers.map(async (tocLayer) => {
        // Per-layer query logs commented out to reduce console noise
        // console.log(`LiveLayerClick: Querying layer ${index + 1}/${visibleLiveLayers.length}: ${tocLayer.displayName}`);
        try {
          const identifyFeatures = await queryLiveLayer(tocLayer.layer, coordinate);

          if (identifyFeatures.length > 0) {
            // Look up layer z-index from LayerManager for sorting
            const managedLayerId = tocLayer.managedLayerId;
            const managedLayer = managedLayerId ? useLayerManagerStore.getState().getLayer(managedLayerId) : null;
            const layerZIndex = managedLayer?.zIndex ?? 0;
            const displayFieldName = tocLayer.layer?.get("displayFieldName");

            for (let fi = 0; fi < identifyFeatures.length; fi++) {
              const identifyFeature = identifyFeatures[fi];
              const layerName = identifyFeature.get("layerDisplayName") || tocLayer.displayName || "Feature";
              const properties = identifyFeature.getProperties();

              // Get a unique ID for this feature
              // Prefer explicit ID fields, then OL's feature ID (GeoServer fid), then index-based fallback
              let featureId = properties.OBJECTID || properties.objectid || properties.id || properties.ID || identifyFeature.getId();
              if (!featureId) {
                featureId = `${layerName}_${fi}`;
              }

              // Clean up properties (remove geometry, layerDisplayName, etc.)
              const cleanAttributes: Record<string, unknown> = {};
              Object.entries(properties).forEach(([key, value]) => {
                if (key !== "geometry" && key !== "layerDisplayName" && key !== "bbox" && typeof value !== "object") {
                  cleanAttributes[key] = value;
                }
              });

              results.push({
                layerName,
                featureId: String(featureId),
                attributes: cleanAttributes,
                feature: identifyFeature,
                layerZIndex,
                layerId: managedLayerId || undefined,
                displayName: displayFieldName ? cleanAttributes[String(displayFieldName)] as string | undefined : undefined,
              });
            }
          }
        } catch (error) {
          console.error(`LiveLayerClick: Error querying live layer ${tocLayer.displayName}:`, error);
        }
      });

      // Wait for all identify results
      await Promise.all(identifyPromises);

      // Also query clickable theme layers from LayerManager (not in TOC store)
      const clickableThemeLayers = useLayerManagerStore
        .getState()
        .getLayersByCategory("Themes")
        .filter((ml) => ml.clickable && ml.visible);

      if (clickableThemeLayers.length > 0) {
        console.log(
          `LiveLayerClick: Found ${clickableThemeLayers.length} clickable theme layers:`,
          clickableThemeLayers.map((l) => l.name),
        );

        const themePromises = clickableThemeLayers.map(async (managedLayer) => {
          try {
            const identifyFeatures = await queryLiveLayer(managedLayer.layer, coordinate);
            const displayFieldName = managedLayer.layer.get("displayFieldName");
            for (let fi = 0; fi < identifyFeatures.length; fi++) {
              const identifyFeature = identifyFeatures[fi];
              const layerName = identifyFeature.get("layerDisplayName") || managedLayer.name || "Feature";
              const properties = identifyFeature.getProperties();

              // Prefer explicit ID fields, then OL's feature ID (GeoServer fid), then index-based fallback
              let featureId = properties.OBJECTID || properties.objectid || properties.id || properties.ID || identifyFeature.getId();
              if (!featureId) {
                featureId = `${managedLayer.name}_${fi}`;
              }

              const cleanAttributes: Record<string, unknown> = {};
              Object.entries(properties).forEach(([key, value]) => {
                if (key !== "geometry" && key !== "layerDisplayName" && key !== "bbox" && typeof value !== "object") {
                  cleanAttributes[key] = value;
                }
              });

              results.push({
                layerName,
                featureId: String(featureId),
                attributes: cleanAttributes,
                feature: identifyFeature,
                layerZIndex: managedLayer.zIndex,
                layerId: managedLayer.id,
                displayName: displayFieldName ? cleanAttributes[String(displayFieldName)] as string | undefined : undefined,
                isThemeLayer: true,
                moreInfoUrlFieldName: managedLayer.layer.get("moreInfoUrlFieldName") || undefined,
                popupLogoImage: (managedLayer.metadata?.popupLogoImage as string) || undefined,
              });
            }
          } catch (error) {
            console.error(`LiveLayerClick: Error querying theme layer ${managedLayer.name}:`, error);
          }
        });

        await Promise.all(themePromises);
      }

      console.log(`LiveLayerClick: Finished querying all layers, found ${results.length} results`);

      return results;
    },
    [allLayers, queryLiveLayer],
  );

  // Register handler for live layer clicks using new system
  useEffect(() => {
    if (!map) return;

    // Register handler with MapContainer
    // Priority 20 - runs after property report (priority 10) but still early
    // No maxScale, so it works at any zoom level
    registerHandler({
      id: "live-layer-click",
      eventType: "singleclick",
      priority: 20,
      conditions: {
        // Only disable when an active tool (measure, draw, etc.) is engaged.
        // Do NOT use checkGlobalDisable here — that also checks disableParcelClick,
        // which themes set to suppress parcel lookups while still allowing
        // their own clickable layers to be identified.
        checkDisableFlags: isToolActive,
      },
      handler: async (coordinate) => {
        console.log("LiveLayerClick: Handler triggered at coordinate:", coordinate);

        // Query all live layers
        const liveLayerResults = await queryAllLiveLayers(coordinate);

        if (liveLayerResults.length > 0) {
          console.log(`LiveLayerClick: Found ${liveLayerResults.length} live layer results`);

          // Convert to InteractionResult format, passing through layer z-index for sorting
          const results = liveLayerResults.map((result) => {
            const identifyResult = createIdentifyResult(result.layerName, result.featureId, result.attributes, result.feature, result.layerZIndex, {
              layerId: result.layerId,
              displayName: result.displayName,
            });

            // Attach themed popup rendering for theme layers
            if (result.isThemeLayer) {
              (identifyResult as IdentifyResult).renderContent = () => (
                <ThemePopupContent properties={result.attributes} moreInfoUrlFieldName={result.moreInfoUrlFieldName} popupLogoImage={result.popupLogoImage} />
              );
            }

            return identifyResult;
          });

          return results;
        } else {
          console.log("LiveLayerClick: No live layer results found");
          return [];
        }
      },
    });

    return () => {
      unregisterHandler("live-layer-click");
    };
  }, [map, isToolActive, queryAllLiveLayers, registerHandler, unregisterHandler]);

  return null; // This component doesn't render anything directly
}
