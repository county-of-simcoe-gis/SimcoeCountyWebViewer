"use client";

import { useEffect, useCallback, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useEventStore } from "@/stores/eventStore";
import { useSearchStore } from "@/stores/searchStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Icon, Style } from "ol/style";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { transform } from "ol/proj";
import { GeoJSON } from "ol/format";
import { getPublicPath } from "@/utils/getPublicPath";
import { getHighlightStyles } from "@/utils/highlightStyles";

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
  const emit = useEventStore((state) => state.emit);
  const setLastResult = useSearchStore((state) => state.setLastResult);
  const searchGeoLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const searchIconLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const geoLayerIdRef = useRef<string | null>(null);
  const iconLayerIdRef = useRef<string | null>(null);

  // Initialize search layers
  const initSearchLayers = useCallback(() => {
    // console.log("SearchZoom: initSearchLayers called", {
    //   hasMap: !!map,
    //   hasGeoLayer: !!searchGeoLayerRef.current,
    //   hasIconLayer: !!searchIconLayerRef.current,
    // });

    if (map && !searchGeoLayerRef.current) {
      // console.log("SearchZoom: Creating search layers");

      // Layer for geometry (lines, polygons)
      const geoLayer = new VectorLayer({
        source: new VectorSource(),
      });
      geoLayer.set("name", "sc-search-geo");

      const geoLayerId = LayerManager.addLayer(geoLayer, "Graphics", "Search Geometry", {
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

      const iconLayerId = LayerManager.addLayer(iconLayer, "Graphics", "Search Icon", {
        index: 11,
        metadata: {
          isSearch: true,
          searchLayerType: "icon",
        },
      });

      searchIconLayerRef.current = iconLayer;
      iconLayerIdRef.current = iconLayerId;

      // console.log("SearchZoom: Search layers created and added to map");
    } else if (!map) {
      console.warn("SearchZoom: No map available for layer initialization");
    } else {
      console.log("SearchZoom: Search layers already exist");
    }
  }, [map]);

  // Clear search layers
  const clearSearchLayers = useCallback(() => {
    console.log("SearchZoom: clearSearchLayers called");
    if (searchGeoLayerRef.current) {
      const geoSource = searchGeoLayerRef.current.getSource();
      const beforeCount = geoSource?.getFeatures().length || 0;
      geoSource?.clear();
      console.log("SearchZoom: Cleared geo layer", { beforeCount, afterCount: geoSource?.getFeatures().length || 0 });
    }
    if (searchIconLayerRef.current) {
      const iconSource = searchIconLayerRef.current.getSource();
      const beforeCount = iconSource?.getFeatures().length || 0;
      iconSource?.clear();
      console.log("SearchZoom: Cleared icon layer", { beforeCount, afterCount: iconSource?.getFeatures().length || 0 });
    }
  }, []);

  // Convert coordinates from lat/long to web mercator
  const toWebMercator = (coords: [number, number]): [number, number] => {
    const transformed = transform(coords, "EPSG:4326", "EPSG:3857");
    return [transformed[0], transformed[1]];
  };

  // Handle location-based search result with GeoJSON
  const handleLocationResult = useCallback(
    async (result: SearchResult) => {
      console.log("SearchZoom: handleLocationResult starting", {
        hasMap: !!map,
        hasGeojson: !!result.geojson,
        result,
      });

      if (!map || !result.geojson) {
        console.error("SearchZoom: Missing map or geojson", { hasMap: !!map, hasGeojson: !!result.geojson });
        return;
      }

      initSearchLayers();
      clearSearchLayers();

      try {
        console.log("SearchZoom: Parsing GeoJSON", result.geojson);
        const geojsonFormat = new GeoJSON();
        const mapProjection = map.getView().getProjection();
        console.log("SearchZoom: Map projection", mapProjection?.getCode());

        // Try parsing GeoJSON - the coordinates appear to already be in Web Mercator
        let features;
        try {
          // First try: assume the GeoJSON is already in the correct projection
          features = geojsonFormat.readFeatures(result.geojson);
          console.log("SearchZoom: Parsed without projection transform");
        } catch (error) {
          console.log("SearchZoom: Failed without projection, trying with transform:", error);
          // Fallback: try with projection transformation
          features = geojsonFormat.readFeatures(result.geojson, {
            featureProjection: mapProjection,
          });
        }

        console.log("SearchZoom: Parsed features", features.length);
        if (features.length === 0) {
          console.warn("SearchZoom: No features found in GeoJSON");
          return;
        }

        const fullFeature = features[0];
        console.log("SearchZoom: Main feature geometry type", fullFeature.getGeometry()?.getType());

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
                console.log("SearchZoom: Manual extent calculation for Point", {
                  manualExtent,
                  point: [x, y],
                });
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
                console.log("SearchZoom: Manual extent calculation for Polygon/Line", {
                  manualExtent,
                  width: manualExtent[2] - manualExtent[0],
                  height: manualExtent[3] - manualExtent[1],
                });
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
          console.log("SearchZoom: Adding features to layers");
          searchGeoLayerRef.current.getSource()?.addFeature(fullFeature);
          searchIconLayerRef.current.getSource()?.addFeature(pointFeature);

          searchGeoLayerRef.current.setZIndex(300);
          searchIconLayerRef.current.setZIndex(300);

          console.log("SearchZoom: Features added, feature counts:", {
            geoLayerFeatures: searchGeoLayerRef.current.getSource()?.getFeatures().length,
            iconLayerFeatures: searchIconLayerRef.current.getSource()?.getFeatures().length,
          });

          // Debug: Check if there are multiple features that might affect zooming
          const allGeoFeatures = searchGeoLayerRef.current.getSource()?.getFeatures() || [];
          const allIconFeatures = searchIconLayerRef.current.getSource()?.getFeatures() || [];
          console.log(
            "SearchZoom: All geo features:",
            allGeoFeatures.map((f) => f.getGeometry()?.getExtent()),
          );
          console.log(
            "SearchZoom: All icon features:",
            allIconFeatures.map((f) => f.getGeometry()?.getExtent()),
          );

          // Style and zoom based on geometry type
          const geometry = fullFeature.getGeometry();
          if (geometry) {
            const geometryType = geometry.getType();
            let extent = geometry.getExtent();

            // Check if we should use manual extent instead
            const isOLExtentValid = extent && extent.length === 4 && extent.every((val) => typeof val === "number" && !isNaN(val) && isFinite(val));
            if (!isOLExtentValid && manualExtent) {
              console.log("SearchZoom: Using manual extent instead of OpenLayers extent");
              extent = manualExtent;
            }
            console.log("SearchZoom: Geometry details", {
              geometryType,
              extent,
              extentLength: extent?.length,
              extentValues: extent,
              extentAsString: extent?.map((val) => `${val} (${typeof val})`),
              isValidExtent: extent && extent.length === 4 && extent.every((val) => typeof val === "number" && !isNaN(val) && isFinite(val)),
            });

            // Validate extent before using it - ensure it has proper dimensions
            const isValidExtent =
              extent &&
              extent.length === 4 &&
              extent.every((val) => typeof val === "number" && !isNaN(val) && isFinite(val)) &&
              (geometryType === "Point" || (extent[2] > extent[0] && extent[3] > extent[1])); // For points, width/height can be 0

            console.log("SearchZoom: Extent validation", {
              hasExtent: !!extent,
              length: extent?.length,
              allNumbers: extent?.every((val) => typeof val === "number" && !isNaN(val) && isFinite(val)),
              hasWidth: extent && extent[2] > extent[0],
              hasHeight: extent && extent[3] > extent[1],
              extentWidth: extent && extent[2] - extent[0],
              extentHeight: extent && extent[3] - extent[1],
              isPoint: geometryType === "Point",
              isValidExtent,
            });

            if (!isValidExtent) {
              console.error("SearchZoom: Invalid extent, trying fallback approach", { extent, isValidExtent });

              // Fallback: manually calculate center from extent bounds
              try {
                if (extent && extent.length === 4) {
                  const [minX, minY, maxX, maxY] = extent;
                  const centerX = (minX + maxX) / 2;
                  const centerY = (minY + maxY) / 2;
                  console.log("SearchZoom: Using fallback center calculation", { centerX, centerY });
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
              const { point: pointStyle, zoomFactor } = getHighlightStyles();
              fullFeature.setStyle(pointStyle);

              // For points, use setCenter instead of fit for more reliable zooming
              const center = [extent[0], extent[1]]; // Point coordinates
              console.log("SearchZoom: Zooming to point with center:", center);
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
              const { polygon: polyStyle, zoomFactor } = getHighlightStyles();
              fullFeature.setStyle(polyStyle);

              console.log("SearchZoom: Zooming to polygon/line with extent:", extent);
              try {
                map.getView().fit(extent, { duration: 1000 });
                // Slightly zoom out for better context
                setTimeout(() => {
                  const currentZoom = map.getView().getZoom();
                  console.log("SearchZoom: Adjusting zoom after fit, current zoom:", currentZoom);
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

        // Emit search complete event
        emit("searchComplete", { result });
        setLastResult(result);
      } catch (error) {
        console.error("Error handling location result:", error);
      }
    },
    [map, initSearchLayers, clearSearchLayers, emit, setLastResult],
  );

  // Handle geocoded result (coordinates only)
  const handleGeocodedResult = useCallback(
    (result: SearchResult) => {
      console.log("SearchZoom: handleGeocodedResult starting", {
        hasMap: !!map,
        hasCoords: result.x !== undefined && result.y !== undefined,
        result,
      });

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
          searchIconLayerRef.current.setZIndex(100);

          // Zoom to the point
          const geometry = feature.getGeometry();
          if (geometry) {
            const extent = geometry.getExtent();
            map.getView().fit(extent, { duration: 1000 });
            map.getView().setZoom(18);
          }
        }

        // Emit search complete event
        emit("searchComplete", { result });
        setLastResult(result);
      } catch (error) {
        console.error("Error handling geocoded result:", error);
      }
    },
    [map, initSearchLayers, clearSearchLayers, emit, setLastResult],
  );

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
    // console.log("SearchZoom: Exposing handlers to window object", { map: !!map });
    (window as unknown as Record<string, unknown>).searchZoomHandlers = {
      handleLocationResult,
      handleGeocodedResult,
      clearSearchLayers,
    };

    // Also log when handlers are called
    const originalHandleLocationResult = handleLocationResult;
    const originalHandleGeocodedResult = handleGeocodedResult;

    (window as unknown as Record<string, unknown>).searchZoomHandlers = {
      handleLocationResult: async (result: SearchResult) => {
        console.log("SearchZoom: handleLocationResult called", result);
        return originalHandleLocationResult(result);
      },
      handleGeocodedResult: (result: SearchResult) => {
        console.log("SearchZoom: handleGeocodedResult called", result);
        return originalHandleGeocodedResult(result);
      },
      clearSearchLayers,
    };
  }, [handleLocationResult, handleGeocodedResult, clearSearchLayers, map]);

  return null; // This is a utility component with no UI
};

export default SearchZoom;
