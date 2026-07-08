"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useSearchStore } from "@/stores/searchStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Icon, Style } from "ol/style";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { transform, toLonLat } from "ol/proj";
import { GeoJSON } from "ol/format";
import { getPublicPath } from "@/utils/getPublicPath";
import { getHighlightStyles } from "@/utils/highlightStyles";
import { usePopupStore } from "@/stores/popupStore";
import { useMyMapsStore, createMyMapsItem } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import { featureToGeoJSON } from "@/utils/myMapsHelpers";
import { useToastStore } from "@/hooks/useToast";
import { activateTab } from "@/utils/helpersUI";
import { InteractionManager } from "@/utils/openlayers/InteractionManager";
import { createIdentifyResult, type IdentifyResult } from "@/components/ResultsPopup";

interface SearchResult {
  name: string;
  type: string;
  location_id?: string;
  place_id?: string;
  x?: number;
  y?: number;
  geojson?: string;
  geojson_point?: string;
}

export const SearchZoom: React.FC = () => {
  // Use selectors to prevent re-renders from unrelated store changes
  const map = useMapStore((state) => state.map);

  const setLastResult = useSearchStore((state) => state.setLastResult);
  const searchGeoLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const searchIconLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const geoLayerIdRef = useRef<string | null>(null);
  const iconLayerIdRef = useRef<string | null>(null);
  // Store the current search feature so the map click handler can show the popup
  const currentSearchFeatureRef = useRef<{ feature: Feature; name: string } | null>(null);

  // Initialize search layers
  const initSearchLayers = useCallback(() => {
    if (map && !searchGeoLayerRef.current) {
      // Layer for geometry (lines, polygons)
      const geoLayer = new VectorLayer({
        source: new VectorSource(),
      });
      geoLayer.set("name", "sc-search-geo");

      const geoLayerId = LayerManager.addLayer(geoLayer, "Overlay", "Search Geometry", {
        index: 10,
        metadata: {
          isSearch: true,
          searchLayerType: "geometry",
        },
      });

      searchGeoLayerRef.current = geoLayer;
      geoLayerIdRef.current = geoLayerId;

      // Layer for point icons
      const iconLayer = new VectorLayer({
        source: new VectorSource(),
      });

      const pointStyle = new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: getPublicPath("/images/map-marker.png"),
        }),
      });

      iconLayer.setStyle(pointStyle);
      iconLayer.set("name", "sc-search-icon");

      const iconLayerId = LayerManager.addLayer(iconLayer, "Overlay", "Search Icon", {
        index: 11,
        metadata: {
          isSearch: true,
          searchLayerType: "icon",
        },
      });

      searchIconLayerRef.current = iconLayer;
      iconLayerIdRef.current = iconLayerId;
    } else if (!map) {
      console.warn("SearchZoom: No map available for layer initialization");
    }
  }, [map]);

  // Keep a ref to the clear function so popup content can call it
  const clearSearchLayersRef = useRef<() => void>(() => {});

  // Build an IdentifyResult with custom renderContent for the search popup buttons
  const buildSearchResult = useCallback((feature: Feature, coordinates: number[], resultName: string): IdentifyResult => {
    const result = createIdentifyResult("Search Result", `search-${Date.now()}`, { name: resultName }, feature, 99999);

    result.renderContent = () => {
      const handleRemoveMarkers = () => {
        clearSearchLayersRef.current();
        usePopupStore.getState().hide();
      };

      const handleAddToMyMaps = () => {
        const geom = feature.getGeometry();
        const geomType = geom?.getType() || "Point";
        const drawType = geomType === "LineString" || geomType === "Polygon" || geomType === "Point" ? (geomType as "Point" | "LineString" | "Polygon") : ("Polygon" as const);
        const myMapsItem = createMyMapsItem(feature, drawType, resultName);
        myMapsItem.featureGeoJSON = featureToGeoJSON(feature);
        useMyMapsStore.getState().addItem(myMapsItem);
        useEventStore.getState().emit("mymap-item-created", { item: myMapsItem });
        activateTab("mymaps");
        useToastStore.getState().addToast("Feature added to MyMaps", "success");
      };

      const handleDirections = () => {
        const lonLat = toLonLat(coordinates);
        const url = `https://www.google.com/maps?saddr=Current+Location&daddr=${lonLat[1]},${lonLat[0]}`;
        window.open(url, "_blank");
      };

      return (
        <div className="flex flex-col gap-1">
          <button className="btn btn-sm btn-outline btn-primary w-full" onClick={handleRemoveMarkers}>
            Remove Markers
          </button>
          <button className="btn btn-sm btn-outline btn-primary w-full" onClick={handleAddToMyMaps}>
            Add to My Maps
          </button>
          <button className="btn btn-sm btn-outline btn-primary w-full" onClick={handleDirections}>
            Directions to Here
          </button>
        </div>
      );
    };

    return result;
  }, []);

  // Clear search layers
  const clearSearchLayers = useCallback(() => {
    if (searchGeoLayerRef.current) {
      searchGeoLayerRef.current.getSource()?.clear();
    }
    if (searchIconLayerRef.current) {
      searchIconLayerRef.current.getSource()?.clear();
    }
  }, []);

  // Keep clearSearchLayersRef in sync
  clearSearchLayersRef.current = clearSearchLayers;

  // Convert coordinates from lat/long to web mercator
  const toWebMercator = (coords: [number, number]): [number, number] => {
    const transformed = transform(coords, "EPSG:4326", "EPSG:3857");
    return [transformed[0], transformed[1]];
  };

  // Handle location-based search result with GeoJSON
  const handleLocationResult = useCallback(
    async (result: SearchResult) => {
      if (!map || !result.geojson) {
        console.error("SearchZoom: Missing map or geojson", { hasMap: !!map, hasGeojson: !!result.geojson });
        return;
      }

      initSearchLayers();
      clearSearchLayers();

      try {
        const geojsonFormat = new GeoJSON();
        const mapProjection = map.getView().getProjection();

        // Try parsing GeoJSON - the coordinates appear to already be in Web Mercator
        let features;
        try {
          // First try: assume the GeoJSON is already in the correct projection
          features = geojsonFormat.readFeatures(result.geojson);
        } catch {
          // Fallback: try with projection transformation
          features = geojsonFormat.readFeatures(result.geojson, {
            featureProjection: mapProjection,
          });
        }

        if (features.length === 0) {
          console.warn("SearchZoom: No features found in GeoJSON");
          return;
        }

        const fullFeature = features[0];

        // Also try to manually calculate extent from the original GeoJSON as backup
        let manualExtent;
        try {
          const geoJsonObj = JSON.parse(result.geojson);
          if (geoJsonObj.coordinates) {
            if (geoJsonObj.type === "Point") {
              // For Point: coordinates are [x, y]
              const [x, y] = geoJsonObj.coordinates;
              if (!isNaN(x) && !isNaN(y)) {
                manualExtent = [x, y, x, y]; // Point extent is [x, y, x, y]
              }
            } else if (geoJsonObj.coordinates[0]) {
              // For Polygon/LineString: coordinates are array of arrays
              const coords = geoJsonObj.coordinates[0]; // Get the outer ring for polygon
              const xCoords = coords.map((coord: number[]) => coord[0]).filter((x: number) => !isNaN(x));
              const yCoords = coords.map((coord: number[]) => coord[1]).filter((y: number) => !isNaN(y));

              if (xCoords.length > 0 && yCoords.length > 0) {
                manualExtent = [
                  Math.min(...xCoords), // minX
                  Math.min(...yCoords), // minY
                  Math.max(...xCoords), // maxX
                  Math.max(...yCoords), // maxY
                ];
              }
            }
          }
        } catch (extentError) {
          console.warn("SearchZoom: Could not manually calculate extent:", extentError);
        }

        // Handle point features if available
        let pointFeature = fullFeature;
        if (result.geojson_point) {
          try {
            const pointFeatures = geojsonFormat.readFeatures(result.geojson_point, {
              featureProjection: map.getView().getProjection(),
            });
            if (pointFeatures.length > 0) {
              pointFeature = pointFeatures[0];
            }
          } catch (error) {
            console.warn("Could not parse geojson_point:", error);
          }
        }

        // Set properties
        fullFeature.setProperties({
          label: result.name,
          name: result.name,
        });
        pointFeature.setProperties({
          label: result.name,
          name: result.name,
        });

        // Add to layers
        if (searchGeoLayerRef.current && searchIconLayerRef.current) {
          searchGeoLayerRef.current.getSource()?.addFeature(fullFeature);
          searchIconLayerRef.current.getSource()?.addFeature(pointFeature);

          // Style and zoom based on geometry type
          const geometry = fullFeature.getGeometry();
          if (geometry) {
            const geometryType = geometry.getType();
            let extent = geometry.getExtent();

            // Check if we should use manual extent instead
            const isOLExtentValid = extent && extent.length === 4 && extent.every((val) => typeof val === "number" && !isNaN(val) && isFinite(val));
            if (!isOLExtentValid && manualExtent) {
              extent = manualExtent;
            }

            // Validate extent before using it - ensure it has proper dimensions
            const isValidExtent =
              extent &&
              extent.length === 4 &&
              extent.every((val) => typeof val === "number" && !isNaN(val) && isFinite(val)) &&
              (geometryType === "Point" || (extent[2] > extent[0] && extent[3] > extent[1])); // For points, width/height can be 0

            if (!isValidExtent) {
              console.error("SearchZoom: Invalid extent, trying fallback approach", { extent, isValidExtent });

              // Fallback: manually calculate center from extent bounds
              try {
                if (extent && extent.length === 4) {
                  const [minX, minY, maxX, maxY] = extent;
                  const centerX = (minX + maxX) / 2;
                  const centerY = (minY + maxY) / 2;
                  map.getView().setCenter([centerX, centerY]);
                  map.getView().setZoom(16);
                } else {
                  console.error("SearchZoom: Could not calculate center from extent");
                }
              } catch (fallbackError) {
                console.error("SearchZoom: Fallback approach failed:", fallbackError);
              }
              return;
            }

            if (geometryType === "Point") {
              // Style for points (configurable via featureHighlitStyles)
              const { point: pointStyle } = getHighlightStyles();
              fullFeature.setStyle(pointStyle);

              // For points, use setCenter instead of fit for more reliable zooming
              const center = [extent[0], extent[1]]; // Point coordinates
              try {
                map.getView().animate({
                  center: center,
                  zoom: 18,
                  duration: 1000,
                });
              } catch (error) {
                console.error("SearchZoom: Error zooming to point center:", error);
              }
            } else {
              // Style for lines and polygons (configurable via featureHighlitStyles)
              const { polygon: polyStyle } = getHighlightStyles();
              fullFeature.setStyle(polyStyle);

              try {
                map.getView().fit(extent, { duration: 1000 });
                // Slightly zoom out for better context
                setTimeout(() => {
                  const currentZoom = map.getView().getZoom();
                  if (currentZoom && currentZoom > 1) {
                    map.getView().setZoom(currentZoom - 1);
                  }
                }, 1000);
              } catch (error) {
                console.error("SearchZoom: Error fitting to polygon extent:", error);
              }
            }
          }
        }

        // Store the feature so the map click handler can show the popup
        currentSearchFeatureRef.current = { feature: fullFeature, name: result.name };

        setLastResult(result);
      } catch (error) {
        console.error("Error handling location result:", error);
      }
    },
    [map, initSearchLayers, clearSearchLayers, setLastResult],
  );

  // Handle geocoded result (coordinates only)
  const handleGeocodedResult = useCallback(
    (result: SearchResult) => {
      if (!map || result.x === undefined || result.y === undefined) {
        console.error("SearchZoom: Missing map or coordinates", {
          hasMap: !!map,
          x: result.x,
          y: result.y,
        });
        return;
      }

      initSearchLayers();
      clearSearchLayers();

      try {
        let coords: [number, number];

        if (result.place_id !== undefined) {
          // OpenStreetMap result - convert from lat/long
          const latLongCoords: [number, number] = [result.x, Math.abs(result.y)];
          coords = toWebMercator(latLongCoords);
        } else {
          // Already in map projection
          coords = [result.x, result.y];
        }

        const feature = new Feature(new Point(coords));
        feature.setProperties({
          isPlaceOrGeocode: true,
          label: result.name,
          name: result.name,
        });

        // Add to icon layer
        if (searchIconLayerRef.current) {
          searchIconLayerRef.current.getSource()?.addFeature(feature);

          // Zoom to the point
          const geometry = feature.getGeometry();
          if (geometry) {
            const extent = geometry.getExtent();
            map.getView().fit(extent, { duration: 1000 });
            map.getView().setZoom(18);
          }
        }

        // Store the feature so the map click handler can show the popup
        currentSearchFeatureRef.current = { feature, name: result.name };

        setLastResult(result);
      } catch (error) {
        console.error("Error handling geocoded result:", error);
      }
    },
    [map, initSearchLayers, clearSearchLayers, setLastResult],
  );

  // Register a search-feature click handler in the InteractionManager so it
  // participates in the aggregation pipeline (preventing the empty-result hide).
  useEffect(() => {
    if (!map) return;

    InteractionManager.registerHandler({
      id: "search-feature-click",
      eventType: "singleclick",
      priority: 5, // Higher priority than property-report-click (10) — lower number = higher priority
      handler: async (_coordinate, pixel) => {
        // Check if the click hit a feature on one of the search layers
        let hitSearchFeature = false;
        map.forEachFeatureAtPixel(pixel, (_feature, layer) => {
          if (layer === searchGeoLayerRef.current || layer === searchIconLayerRef.current) {
            hitSearchFeature = true;
          }
        });

        if (hitSearchFeature && currentSearchFeatureRef.current) {
          const { feature, name } = currentSearchFeatureRef.current;
          const result = buildSearchResult(feature, Array.from(_coordinate), name);
          return [result];
        }

        return [];
      },
    });

    return () => {
      InteractionManager.unregisterHandler("search-feature-click");
    };
  }, [map, buildSearchResult]);

  // Initialize layers when map is available
  // Use a ref to track if we've initialized to handle React StrictMode double-mount
  const initializedRef = useRef(false);

  useEffect(() => {
    if (map && !initializedRef.current) {
      initializedRef.current = true;
      initSearchLayers();
    }

    // Cleanup only on actual unmount, not on StrictMode re-runs
    // We check if layers exist before removing to avoid unnecessary state updates
    return () => {
      // Only cleanup if we actually have layer IDs and this is a real unmount
      // The refs will be null if cleanup already ran or layers were never created
      const geoId = geoLayerIdRef.current;
      const iconId = iconLayerIdRef.current;

      if (geoId) {
        geoLayerIdRef.current = null;
        // Use setTimeout to defer the state update and break the render cycle
        setTimeout(() => {
          LayerManager.removeLayer(geoId);
        }, 0);
      }
      if (iconId) {
        iconLayerIdRef.current = null;
        setTimeout(() => {
          LayerManager.removeLayer(iconId);
        }, 0);
      }
      searchGeoLayerRef.current = null;
      searchIconLayerRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Expose the handler functions through the window object
  useEffect(() => {
    (window as unknown as Record<string, unknown>).searchZoomHandlers = {
      handleLocationResult,
      handleGeocodedResult,
      clearSearchLayers,
    };
  }, [handleLocationResult, handleGeocodedResult, clearSearchLayers, map]);

  return null; // This is a utility component with no UI
};

export default SearchZoom;
