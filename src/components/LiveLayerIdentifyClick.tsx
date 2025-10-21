/**
 * LiveLayerIdentifyClick Component
 *
 * This component handles single-click interactions on the map to identify features
 * from visible "live layers" (layers with liveLayer=true in TOC).
 *
 * Features:
 * - Listens for single-click events on the map
 * - Checks if drawing/editing/measuring tools are active and skips if so
 * - Queries all visible TOC layers that have liveLayer=true
 * - Supports both WMS (GetFeatureInfo) and ArcGIS REST (identify) services
 * - Displays results in a popup with feature attributes
 * - Multiple results can be viewed in the Reports panel
 *
 * Based on the old application's live layer identify functionality.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { useTOCStore } from "@/stores/tocStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { GeoJSON } from "ol/format";
import { getAxiosClient } from "@/lib/axiosInstance";
import type { MapBrowserEvent } from "ol";
import type TileWMS from "ol/source/TileWMS";
import type ImageWMS from "ol/source/ImageWMS";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";

interface IdentifyClickOptions {
  checkDisableFlags?: () => boolean;
}

/**
 * Custom interaction for identifying features on visible live layers
 */
class LiveLayerIdentifyInteraction {
  private map: any;
  private checkDisableFlags?: () => boolean;
  private onIdentify?: (coordinate: number[], event: MapBrowserEvent<UIEvent>) => void;
  private lastClickTime: number = 0;
  private clickHandler?: (event: MapBrowserEvent<UIEvent>) => void;

  constructor(map: any, options: IdentifyClickOptions = {}) {
    this.map = map;
    this.checkDisableFlags = options.checkDisableFlags;
  }

  /**
   * Handle single click events
   */
  private handleClick = (event: MapBrowserEvent<UIEvent>) => {
    // Prevent double clicks
    if (this.shouldCancelDoubleClick(event.originalEvent.timeStamp)) {
      return;
    }

    // Check disable flags
    if (this.checkDisableFlags && this.checkDisableFlags()) {
      return;
    }

    // Check if shift key is pressed
    if (event.originalEvent.shiftKey) {
      return;
    }

    // Trigger identify callback
    if (this.onIdentify) {
      this.onIdentify(event.coordinate, event);
    }
  };

  /**
   * Prevent double clicks by checking timestamp
   */
  private shouldCancelDoubleClick(timestamp: number): boolean {
    const timeDiff = timestamp - this.lastClickTime;
    if (timeDiff < 300) {
      return true;
    }
    this.lastClickTime = timestamp;
    return false;
  }

  /**
   * Set the identify callback
   */
  public setIdentifyCallback(callback: (coordinate: number[], event: MapBrowserEvent<UIEvent>) => void): void {
    this.onIdentify = callback;
  }

  /**
   * Set the disable flags checker
   */
  public setDisableFlagsChecker(checker: () => boolean): void {
    this.checkDisableFlags = checker;
  }

  /**
   * Enable the interaction
   */
  public enable(): void {
    if (!this.clickHandler) {
      this.clickHandler = this.handleClick;
      this.map.on("singleclick", this.clickHandler);
    }
  }

  /**
   * Disable the interaction
   */
  public disable(): void {
    if (this.clickHandler) {
      this.map.un("singleclick", this.clickHandler);
      this.clickHandler = undefined;
    }
  }
}

/**
 * Parse ESRI identify response
 */
function parseESRIIdentify(response: any): Feature<Geometry>[] {
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
      let geoJsonGeometry: any;
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

export default function LiveLayerIdentifyClick() {
  const { map, disableIdentifyClick, isDrawingOrEditing, isCoordinateToolOpen, isMeasuring } = useMapStore();
  const { show: showPopup } = usePopupStore();
  const allLayers = useTOCStore((state) => state.allLayers);
  const { setReport } = useReportsStore();
  const { openSidebar, setActiveTab } = useSidebarStore();

  const identifyInteractionRef = useRef<LiveLayerIdentifyInteraction | null>(null);

  // Check if identify should be disabled
  const checkDisableFlags = useCallback(() => {
    return disableIdentifyClick || isDrawingOrEditing || isCoordinateToolOpen || isMeasuring;
  }, [disableIdentifyClick, isDrawingOrEditing, isCoordinateToolOpen, isMeasuring]);

  /**
   * Identify features on a single layer
   */
  const identifyLayerFeatures = useCallback(
    async (layer: any, coordinate: number[]): Promise<Feature<Geometry> | undefined> => {
      if (!map) return undefined;

      const viewResolution = map.getView().getResolution();
      const source = layer.getSource() as TileWMS | ImageWMS;
      const isArcGISLayer = layer.get("isArcGIS") || false;

      // Get layer properties
      const secured = layer.get("secured");
      const hasAttachments = layer.get("hasAttachments");
      const attachmentUrl = layer.get("attachmentUrl");
      const displayName = layer.get("tocDisplayName") || layer.get("displayName") || layer.get("name");

      const params: Record<string, unknown> = {};
      if (secured) {
        params["useBearerToken"] = true;
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
        const response = await axiosClient.get(url, { ...params });
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
    [map]
  );

  /**
   * Handle identify click event
   */
  const handleIdentifyClick = useCallback(
    async (coordinate: number[]) => {
      if (!map) return;

      console.log("LiveLayerIdentify: Click at", coordinate);

      // Filter for visible live layers
      const visibleLiveLayers = allLayers.filter((tocLayer) => {
        if (!tocLayer.layer || !tocLayer.visible || !tocLayer.liveLayer) {
          return false;
        }
        return true;
      });

      console.log(`LiveLayerIdentify: Found ${visibleLiveLayers.length} visible live layers`);

      if (visibleLiveLayers.length === 0) {
        return;
      }

      // Collect all identify promises
      const identifyPromises = visibleLiveLayers.map((tocLayer) => {
        return identifyLayerFeatures(tocLayer.layer, coordinate);
      });

      // Wait for all identify requests to complete
      const results = await Promise.all(identifyPromises);

      // Filter out undefined results
      const features = results.filter((f) => f !== undefined) as Feature<Geometry>[];

      console.log(`LiveLayerIdentify: Found ${features.length} features`);

      if (features.length === 0) {
        return;
      }

      // Show the first feature in a popup
      const feature = features[0];
      const layerDisplayName = feature.get("layerDisplayName") || "Feature";

      // Create simple popup content
      const properties = feature.getProperties();
      const content = (
        <div style={{ maxWidth: "400px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Object.keys(properties)
                .filter((key) => !key.startsWith("_") && key !== "geometry" && key !== "layerDisplayName")
                .map((key) => {
                  const value = properties[key];
                  if (value === null || value === undefined) return null;

                  return (
                    <tr key={key} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "8px", fontWeight: "bold", verticalAlign: "top" }}>{key}:</td>
                      <td style={{ padding: "8px", wordBreak: "break-word" }}>{String(value)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {features.length > 1 && (
            <div style={{ marginTop: "10px", padding: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px", fontSize: "12px" }}>
              <strong>Note:</strong> {features.length - 1} more feature{features.length - 1 > 1 ? "s" : ""} found at this location. Click "View All Results" to see them.
            </div>
          )}
          {features.length > 1 && (
            <button
              onClick={() => {
                // Show all results in the reports panel
                setReport({
                  id: `identify-livelayers-${Date.now()}`,
                  title: "Identify Results",
                  content: (
                    <div>
                      {features.map((f, idx) => {
                        const props = f.getProperties();
                        const name = f.get("layerDisplayName") || `Feature ${idx + 1}`;
                        return (
                          <div key={idx} style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}>
                            <h4 style={{ marginTop: 0, marginBottom: "10px" }}>{name}</h4>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <tbody>
                                {Object.keys(props)
                                  .filter((key) => !key.startsWith("_") && key !== "geometry" && key !== "layerDisplayName")
                                  .map((key) => {
                                    const value = props[key];
                                    if (value === null || value === undefined) return null;

                                    return (
                                      <tr key={key} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "6px", fontWeight: "bold", verticalAlign: "top" }}>{key}:</td>
                                        <td style={{ padding: "6px", wordBreak: "break-word" }}>{String(value)}</td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  ),
                  createdAt: new Date(),
                });

                // Open sidebar and switch to reports tab
                openSidebar();
                setActiveTab(4);
              }}
              style={{
                marginTop: "10px",
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              View All Results ({features.length})
            </button>
          )}
        </div>
      );

      showPopup(coordinate, content, layerDisplayName);
    },
    [map, allLayers, identifyLayerFeatures, showPopup, setReport, openSidebar, setActiveTab]
  );

  // Initialize interaction
  useEffect(() => {
    if (!map || identifyInteractionRef.current) return;

    const interaction = new LiveLayerIdentifyInteraction(map, {
      checkDisableFlags,
    });

    interaction.setIdentifyCallback((coordinate) => {
      handleIdentifyClick(coordinate);
    });

    interaction.enable();
    identifyInteractionRef.current = interaction;

    return () => {
      if (identifyInteractionRef.current) {
        identifyInteractionRef.current.disable();
        identifyInteractionRef.current = null;
      }
    };
  }, [map, checkDisableFlags, handleIdentifyClick]);

  // Update interaction callbacks when dependencies change
  useEffect(() => {
    if (!identifyInteractionRef.current) return;

    identifyInteractionRef.current.setDisableFlagsChecker(checkDisableFlags);
    identifyInteractionRef.current.setIdentifyCallback((coordinate) => {
      handleIdentifyClick(coordinate);
    });
  }, [checkDisableFlags, handleIdentifyClick]);

  return null; // This component doesn't render anything directly
}
