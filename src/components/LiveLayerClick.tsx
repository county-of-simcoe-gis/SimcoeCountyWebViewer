"use client";

import { useEffect, useCallback } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useTOCStore } from "@/stores/tocStore";
import { GeoJSON } from "ol/format";
import { getAxiosClient } from "@/lib/axiosInstance";
import { getAccessToken } from "@/utils/auth";
import { useInteractionManager } from "@/components/map/MapContainer";
import { createIdentifyResult } from "@/components/ResultsPopup";
import type { IdentifyResult } from "@/components/ResultsPopup";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import ThemePopupContent from "@/components/themes/shared/ThemePopupContent";
import type TileWMS from "ol/source/TileWMS";
import type ImageWMS from "ol/source/ImageWMS";
import VectorSource from "ol/source/Vector";
import type Layer from "ol/layer/Layer";
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
    async (layer: Layer, coordinate: number[]): Promise<Feature<Geometry>[]> => {
      const displayName = layer.get("tocDisplayName") || layer.get("displayName") || layer.get("name");

      if (!map) {
        return [];
      }

      const viewResolution = map.getView().getResolution();
      const source = layer.getSource();
      const isArcGISLayer = layer.get("isArcGIS") || false;

      // Vector layers with already-loaded features (e.g. Road Closures' Blocks/Closures/Detours
      // layers, populated once from ArcGIS GeoJSON — see RoadClosuresLayers.tsx) have no
      // server-side identify endpoint to call; hit-test the already-loaded features at the
      // clicked pixel locally instead of making a network request.
      if (source instanceof VectorSource) {
        const pixel = map.getPixelFromCoordinate(coordinate);
        if (!pixel) return [];

        const hitFeatures: Feature<Geometry>[] = [];
        map.forEachFeatureAtPixel(
          pixel,
          (feature) => {
            hitFeatures.push(feature as Feature<Geometry>);
          },
          { layerFilter: (candidateLayer) => candidateLayer === layer, hitTolerance: 6 },
        );

        hitFeatures.forEach((feature) => feature.setProperties({ layerDisplayName: displayName }));
        return hitFeatures;
      }

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

        if (!wfsUrl) {
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
      } else {
        // WMS GetFeatureInfo
        const wmsSource = source as TileWMS | ImageWMS;
        if (!wmsSource || !wmsSource.getFeatureInfoUrl) {
          return [];
        }

        url = wmsSource.getFeatureInfoUrl(coordinate, viewResolution!, "EPSG:3857", {
          INFO_FORMAT: "application/json",
          FEATURE_COUNT: 50,
        });
      }

      if (!url) {
        return [];
      }

      try {
        const axiosClient = getAxiosClient(url);
        const response = await axiosClient.get(url, { ...axiosConfig });
        let result = response.data;

        // Parse string responses
        if (typeof result === "string") {
          try {
            result = JSON.parse(result);
          } catch {
            return [];
          }
        }

        // Parse features based on layer type
        let features: Feature<Geometry>[];
        if (isArcGISLayer) {
          features = parseESRIIdentify(result);
        } else {
          features = new GeoJSON().readFeatures(result);
        }

        if (features.length === 0) {
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
      type IdentifyCandidate = {
        name: string;
        layer: Layer;
        layerId?: string;
        layerZIndex: number;
        isThemeLayer?: boolean;
        displayFieldName?: string;
        moreInfoUrlFieldName?: string;
        popupLogoImage?: string;
      };

      const layerManagerState = useLayerManagerStore.getState();
      const managedLayersById = new Map(layerManagerState.getAllLayers().map((layer) => [layer.id, layer]));

      const liveLayerCandidates: IdentifyCandidate[] = allLayers
        .filter((tocLayer) => tocLayer.layer && tocLayer.visible && tocLayer.liveLayer)
        .flatMap((tocLayer) => {
          const managedLayer = tocLayer.managedLayerId ? managedLayersById.get(tocLayer.managedLayerId) : null;

          // Keep TOC live-layer behavior but use LayerManager clickability when available.
          if (managedLayer) {
            if (!managedLayer.visible || !managedLayer.clickable) {
              return [];
            }

            return [
              {
                name: tocLayer.displayName || managedLayer.name,
                layer: managedLayer.layer as Layer,
                layerId: managedLayer.id,
                layerZIndex: managedLayer.zIndex,
                displayFieldName: String(managedLayer.layer.get("displayFieldName") || "") || undefined,
              },
            ];
          }

          return [
            {
              name: tocLayer.displayName,
              layer: tocLayer.layer as Layer,
              layerZIndex: Number((tocLayer.layer as Layer).getZIndex?.() ?? 0),
              displayFieldName: String((tocLayer.layer as Layer).get("displayFieldName") || "") || undefined,
            },
          ];
        });

      const themeLayerCandidates: IdentifyCandidate[] = layerManagerState
        .getLayersByCategory("Themes")
        .filter((managedLayer) => managedLayer.visible && managedLayer.clickable)
        .map((managedLayer) => ({
          name: managedLayer.name,
          layer: managedLayer.layer as Layer,
          layerId: managedLayer.id,
          layerZIndex: managedLayer.zIndex,
          isThemeLayer: true,
          displayFieldName: String(managedLayer.layer.get("displayFieldName") || "") || undefined,
          moreInfoUrlFieldName: String(managedLayer.layer.get("moreInfoUrlFieldName") || "") || undefined,
          popupLogoImage: typeof managedLayer.metadata?.popupLogoImage === "string" ? managedLayer.metadata.popupLogoImage : undefined,
        }));

      // Non-theme tool-added layers (e.g. Road Closures' Blocks/Closures/Detours/Road Network,
      // see RoadClosuresLayers.tsx) that explicitly opt in via `clickable: true`. Deliberately NOT
      // marked isThemeLayer so they render through the generic InfoRow popup instead of
      // ThemePopupContent.
      const toolLayerCandidates: IdentifyCandidate[] = layerManagerState
        .getLayersByCategory("Tools")
        .filter((managedLayer) => managedLayer.visible && managedLayer.clickable)
        .map((managedLayer) => ({
          name: managedLayer.name,
          layer: managedLayer.layer as Layer,
          layerId: managedLayer.id,
          layerZIndex: managedLayer.zIndex,
          displayFieldName: String(managedLayer.layer.get("displayFieldName") || "") || undefined,
        }));

      const identifyCandidates = [...liveLayerCandidates, ...themeLayerCandidates, ...toolLayerCandidates];

      // Query all candidates in parallel.
      const results: LiveLayerResult[] = [];
      const identifyPromises = identifyCandidates.map(async (candidate) => {
        try {
          const identifyFeatures = await queryLiveLayer(candidate.layer, coordinate);
          if (identifyFeatures.length === 0) return;

          for (let fi = 0; fi < identifyFeatures.length; fi++) {
            const identifyFeature = identifyFeatures[fi];
            const layerName = identifyFeature.get("layerDisplayName") || candidate.name || "Feature";
            const properties = identifyFeature.getProperties();

            // Prefer explicit ID fields, then OL's feature ID (GeoServer fid), then index-based fallback.
            let featureId = properties.OBJECTID || properties.objectid || properties.id || properties.ID || identifyFeature.getId();
            if (!featureId) {
              featureId = `${candidate.name}_${fi}`;
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
              layerZIndex: candidate.layerZIndex,
              layerId: candidate.layerId,
              displayName: candidate.displayFieldName ? (cleanAttributes[String(candidate.displayFieldName)] as string | undefined) : undefined,
              isThemeLayer: candidate.isThemeLayer,
              moreInfoUrlFieldName: candidate.moreInfoUrlFieldName,
              popupLogoImage: candidate.popupLogoImage,
            });
          }
        } catch (error) {
          console.error(`LiveLayerClick: Error querying layer ${candidate.name}:`, error);
        }
      });

      await Promise.all(identifyPromises);

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
        // Query all live layers
        const liveLayerResults = await queryAllLiveLayers(coordinate);

        if (liveLayerResults.length > 0) {
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
