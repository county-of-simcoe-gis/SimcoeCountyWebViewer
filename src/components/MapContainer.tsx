"use client";

import { useEffect, useRef, useMemo, useCallback, Suspense, lazy, createContext, useContext, useState } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { usePopupStore } from "@/stores/popupStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";

// OpenLayers imports
import "ol/ol.css";
import "@/components/MapContainer.css";
import "@/components/map/controls/MapControls.css";
import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultInteractions, MouseWheelZoom, PinchRotate, DragRotate, Interaction } from "ol/interaction";
import { ScaleLine, Attribution } from "ol/control";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Icon } from "ol/style";
import { fromLonLat } from "ol/proj";
// Import zone-based control system
import { createZoneControlsFromConfig, ControlConfig } from "@/components/map/controls/MapControlZones";

// Control components will be dynamically imported

// Import basemap components
import BasemapSwitcher from "@/components/BasemapSwitcher";

// Import property report click functionality
import PropertyReportClick from "@/components/PropertyReportClick";
import LiveLayerClick from "@/components/LiveLayerClick";
import MapPopup from "@/components/MapPopup";
import { MapContextMenuContainer } from "@/components/MapContextMenuContainer";
import ResultsPopup, { type Result } from "@/components/ResultsPopup";

// Import config
import config from "@/config.json";

// Import utilities
import { getAxiosClient } from "@/lib/axiosInstance";

// Define dynamic imports for control components
const dynamicControlImports = {
  CurrentLocationButton: () => import("@/components/map/controls/CurrentLocation").then((m) => ({ default: m.CurrentLocationButton })),
  ExtentHistoryButtons: () => import("@/components/map/controls/ExtentHistory").then((m) => ({ default: m.ExtentHistoryButtons })),
  ZoomToExtentButton: () => import("@/components/map/controls/ZoomToExtent").then((m) => ({ default: m.ZoomToExtentButton })),
  GridButton: () => import("@/components/map/controls/Grid"),
  GitHubButtonDisplay: () => import("@/components/map/controls/GithubButton").then((m) => ({ default: m.GitHubButtonDisplay })),
  ScaleDisplay: () => import("@/components/map/controls/Scale").then((m) => ({ default: m.ScaleDisplay })),
  ScaleSelector: () => import("@/components/map/controls/ScaleSelector").then((m) => ({ default: m.ScaleSelector })),
  ZoomControls: () => import("@/components/map/controls/ZoomControls").then((m) => ({ default: m.ZoomControls })),
  RotateControl: () => import("@/components/map/controls/RotateControl").then((m) => ({ default: m.RotateControl })),
  FullscreenControl: () => import("@/components/map/controls/FullscreenControl").then((m) => ({ default: m.FullscreenControl })),
  AttributionControl: () => import("@/components/map/controls/AttributionControl").then((m) => ({ default: m.AttributionControl })),
};

// Create lazy components
const LazyCurrentLocationButton = lazy(dynamicControlImports.CurrentLocationButton);
const LazyExtentHistoryButtons = lazy(dynamicControlImports.ExtentHistoryButtons);
const LazyZoomToExtentButton = lazy(dynamicControlImports.ZoomToExtentButton);
const LazyGridButton = lazy(dynamicControlImports.GridButton);
const LazyGitHubButtonDisplay = lazy(dynamicControlImports.GitHubButtonDisplay);
const LazyScaleDisplay = lazy(dynamicControlImports.ScaleDisplay);
const LazyScaleSelector = lazy(dynamicControlImports.ScaleSelector);
const LazyZoomControls = lazy(dynamicControlImports.ZoomControls);
const LazyRotateControl = lazy(dynamicControlImports.RotateControl);
const LazyFullscreenControl = lazy(dynamicControlImports.FullscreenControl);
const LazyAttributionControl = lazy(dynamicControlImports.AttributionControl);

// Loading placeholder component
const ControlLoadingPlaceholder = () => <div className="control-loading-placeholder" style={{ width: "32px", height: "32px", backgroundColor: "#f0f0f0", borderRadius: "4px" }} />;

// Unified Interaction Handler System
import type { MapBrowserEvent } from "ol";

export type InteractionEventType = "singleclick" | "contextmenu" | "pointermove" | "dblclick";

// OpenLayers uses this type for browser events
type OLUIEvent = PointerEvent;

export interface InteractionHandlerConditions {
  maxZoom?: number; // Handler only works when zoom is less than this
  minZoom?: number; // Handler only works when zoom is greater than this
  maxScale?: number; // Handler only works when scale is less than this (for parcel clicks)
  checkDisableFlags?: () => boolean; // Function that returns true if handler should be disabled
  checkLayerFilters?: (event: MapBrowserEvent<OLUIEvent>) => boolean; // Returns true if handler should be disabled based on layers
}

// InteractionResult is an alias for Result for consistency
export type InteractionResult = Result;

export interface InteractionHandler {
  id: string; // Unique ID for this handler
  eventType: InteractionEventType;
  priority?: number; // Lower numbers execute first (default: 100)
  conditions?: InteractionHandlerConditions;
  handler: (coordinate: number[], pixel: number[], event: MapBrowserEvent<OLUIEvent>) => Promise<InteractionResult[]> | InteractionResult[] | Promise<void> | void;
}

interface InteractionManagerContextType {
  registerHandler: (handler: InteractionHandler) => void;
  unregisterHandler: (handlerId: string) => void;
  // Legacy support - will be removed
  registerInteraction: (id: string, interaction: Interaction) => void;
  unregisterInteraction: (id: string) => void;
}

const InteractionManagerContext = createContext<InteractionManagerContextType | null>(null);

export const useInteractionManager = () => {
  const context = useContext(InteractionManagerContext);
  if (!context) {
    throw new Error("useInteractionManager must be used within MapContainer");
  }
  return context;
};

export default function MapContainer() {
  const { isOpen } = useSidebarStore();
  const { emitMapLoaded } = useEventStore();
  const { map, setMap, addLoadedItem, setMapControls, setCurrentExtent, setCurrentZoom, setCurrentCenter, initExtentHistory, saveCurrentExtentToHistory } = useMapStore();
  const { setMapLoading } = useAppStore();
  const { show: showPopup, hide: hidePopup } = usePopupStore();
  const urlParameters = useAppStore((state) => state.urlParameters);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const identifyIconLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const identifyIconLayerIdRef = useRef<string | null>(null);

  // Handler-based system
  const handlersRef = useRef<InteractionHandler[]>([]);
  const unifiedInteractionRef = useRef<Interaction | null>(null);
  const shouldExecuteHandlerRef = useRef<((handler: InteractionHandler, event: MapBrowserEvent<OLUIEvent>) => boolean) | null>(null);

  // Legacy interaction system (for backward compatibility)
  const registeredInteractionsRef = useRef<globalThis.Map<string, Interaction>>(new globalThis.Map());

  // State for aggregated results
  const [aggregatedResults, setAggregatedResults] = useState<Result[]>([]);
  const [resultsCoordinate, setResultsCoordinate] = useState<number[] | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Helper: Calculate map scale
  const calculateMapScale = useCallback(() => {
    if (!map) return 0;
    const view = map.getView();
    const resolution = view.getResolution();
    const units = view.getProjection().getUnits();
    const dpi = 25.4 / 0.28;
    const mpu = units === "degrees" ? 111194.87428468118 : 1;
    return resolution ? resolution * mpu * 39.37 * dpi : 0;
  }, [map]);

  // Helper: Check if handler should execute based on conditions
  const shouldExecuteHandler = useCallback(
    (handler: InteractionHandler, event: MapBrowserEvent<OLUIEvent>): boolean => {
      if (!handler.conditions) return true;

      const conditions = handler.conditions;

      // Check zoom level
      if (map) {
        const currentZoom = map.getView().getZoom() || 0;
        if (conditions.maxZoom !== undefined && currentZoom > conditions.maxZoom) {
          return false;
        }
        if (conditions.minZoom !== undefined && currentZoom < conditions.minZoom) {
          return false;
        }
      }

      // Check scale
      if (conditions.maxScale !== undefined) {
        const scale = calculateMapScale();
        if (scale > conditions.maxScale) {
          return false;
        }
      }

      // Check disable flags
      if (conditions.checkDisableFlags && conditions.checkDisableFlags()) {
        return false;
      }

      // Check layer filters
      if (conditions.checkLayerFilters && conditions.checkLayerFilters(event)) {
        return false;
      }

      return true;
    },
    [map, calculateMapScale]
  );

  // Update ref whenever shouldExecuteHandler changes
  useEffect(() => {
    shouldExecuteHandlerRef.current = shouldExecuteHandler;
  }, [shouldExecuteHandler]);

  // Handler registration
  const registerHandler = useCallback((handler: InteractionHandler) => {
    // Remove existing handler with same ID if it exists
    handlersRef.current = handlersRef.current.filter((h) => h.id !== handler.id);

    // Add new handler
    handlersRef.current.push(handler);

    // Sort by priority
    handlersRef.current.sort((a, b) => (a.priority || 100) - (b.priority || 100));

    // console.log(`MapContainer: Registered handler "${handler.id}" for event "${handler.eventType}"`);
  }, []);

  const unregisterHandler = useCallback((handlerId: string) => {
    const initialLength = handlersRef.current.length;
    handlersRef.current = handlersRef.current.filter((h) => h.id !== handlerId);

    if (handlersRef.current.length < initialLength) {
      // console.log(`MapContainer: Unregistered handler "${handlerId}"`);
    }
  }, []);

  // Legacy interaction callbacks (for backward compatibility)
  const registerInteraction = useCallback(
    (id: string, interaction: Interaction) => {
      if (registeredInteractionsRef.current.has(id)) {
        const existingInteraction = registeredInteractionsRef.current.get(id);
        if (existingInteraction && map) {
          map.removeInteraction(existingInteraction);
        }
      }

      if (map) {
        map.addInteraction(interaction);
        registeredInteractionsRef.current.set(id, interaction);
        console.log(`MapContainer: Registered legacy interaction "${id}"`);
      }
    },
    [map]
  );

  const unregisterInteraction = useCallback(
    (id: string) => {
      const interaction = registeredInteractionsRef.current.get(id);
      if (interaction && map) {
        map.removeInteraction(interaction);
        registeredInteractionsRef.current.delete(id);
        console.log(`MapContainer: Unregistered legacy interaction "${id}"`);
      }
    },
    [map]
  );

  const interactionManager = useMemo(
    () => ({
      registerHandler,
      unregisterHandler,
      registerInteraction,
      unregisterInteraction,
    }),
    [registerHandler, unregisterHandler, registerInteraction, unregisterInteraction]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create scale line control
    const scaleLineControl = new ScaleLine({
      minWidth: 80,
    });

    // Get stored extent or use defaults
    const storageExtentKey = "Map Extent";
    const storedExtent = sessionStorage.getItem(storageExtentKey);
    let extent = null;
    // const centerCoords = [-8873031.186926253, 5524904.429248115];
    // const defaultZoom = 17;
    const centerCoords = config.centerCoords || [-8878504.68, 5543492.45];
    const defaultZoom = config.defaultZoom || 10;

    if (storedExtent) {
      try {
        extent = JSON.parse(storedExtent);
      } catch (error) {
        console.warn("Failed to parse stored extent:", error);
      }
    }

    // Create OpenLayers map
    const mapInstance = new Map({
      target: mapRef.current,
      controls: [], // We'll manage all controls via the zone system
      layers: [], // We'll add basemap layers via the basemap switcher
      view: new View({
        center: centerCoords,
        zoom: defaultZoom,
        maxZoom: config.maxZoom || 20,
      }),
      interactions: defaultInteractions({
        keyboard: true,
        mouseWheelZoom: false,
      }).extend([
        new MouseWheelZoom({
          duration: 0,
          constrainResolution: true,
        }),
      ]),
      keyboardEventTarget: document,
    });

    // Configure map controls based on config
    const mapControls: Record<string, boolean> = {
      rotate: config.controls?.rotate ?? true,
      fullScreen: config.controls?.fullScreen ?? true,
      zoomInOut: config.controls?.zoomInOut ?? true,
      currentLocation: config.controls?.currentLocation ?? true,
      zoomExtent: config.controls?.zoomExtent ?? true,
      scale: config.controls?.scale ?? true,
      scaleLine: config.controls?.scaleLine ?? true,
      basemap: config.controls?.basemap ?? true,
      gitHubButton: config.controls?.gitHubButton ?? true,
      scaleSelector: config.controls?.scaleSelector ?? false,
      grid: config.controls?.showGrid ?? false,
      extentHistory: config.controls?.extentHistory ?? false,
      attribution: config.controls?.attribution ?? true,
    };

    // Add OpenLayers built-in controls based on configuration
    if (mapControls.scaleLine) {
      mapInstance.addControl(scaleLineControl);
    }

    if (mapControls.attribution) {
      const attributionControl = new Attribution({
        collapsible: false,
      });
      mapInstance.addControl(attributionControl);
    }

    // All other controls are managed via the zone system

    // Disable rotate interactions if configured
    if (!mapControls.rotate) {
      const interactions = mapInstance.getInteractions().getArray();
      const pinchRotate = interactions.find((i) => i instanceof PinchRotate);
      const dragRotate = interactions.find((i) => i instanceof DragRotate);

      if (pinchRotate) mapInstance.removeInteraction(pinchRotate);
      if (dragRotate) mapInstance.removeInteraction(dragRotate);
    }

    // Initialize extent history with initial map state
    const initialZoom = mapInstance.getView().getZoom();
    const initialCenter = mapInstance.getView().getCenter();
    if (initialCenter && initialZoom !== undefined) {
      initExtentHistory(initialCenter, initialZoom);
    }

    // Set up map event listeners
    mapInstance.on("moveend", () => {
      const view = mapInstance.getView();
      const center = view.getCenter();
      const zoom = view.getZoom();

      setCurrentExtent(view.calculateExtent());
      setCurrentZoom(zoom || 0);
      setCurrentCenter(center || [0, 0]);

      // Save current extent to history (only if changed)
      saveCurrentExtentToHistory();
    });

    // Apply stored extent if available
    if (extent) {
      mapInstance.getView().fit(extent, { size: mapInstance.getSize() });
    }

    // Store map instance and configuration FIRST (before adding layers)
    mapInstanceRef.current = mapInstance;
    setMap(mapInstance);
    setMapControls(mapControls);

    // Set map on window for backward compatibility with legacy code
    if (typeof window !== "undefined") {
      (window as unknown as { map: Map | null; config: typeof config | null }).map = mapInstance;
      (window as unknown as { map: Map | null; config: typeof config | null }).config = config;
    }

    // Create unified interaction to handle all registered handlers
    class UnifiedInteraction extends Interaction {
      handleEvent(event: MapBrowserEvent<OLUIEvent>): boolean {
        const eventType = event.type as InteractionEventType;

        // Get handlers for this event type - use ref to get current version
        const checkHandler = shouldExecuteHandlerRef.current || (() => true);
        const applicableHandlers = handlersRef.current.filter((h) => h.eventType === eventType && checkHandler(h, event));

        if (applicableHandlers.length === 0) {
          return true; // Allow event to propagate
        }

        // Prevent double clicks for singleclick events
        if (eventType === "singleclick") {
          const now = event.originalEvent.timeStamp;
          const lastClickTime = (this as unknown as { lastClickTime?: number }).lastClickTime;
          if (lastClickTime && now - lastClickTime < 300) {
            return false; // Ignore double click
          }
          (this as unknown as { lastClickTime: number }).lastClickTime = now;
        }

        // Prevent default for contextmenu
        if (eventType === "contextmenu") {
          event.originalEvent.preventDefault();
        }

        // For click events, aggregate results and show unified popup
        if (eventType === "singleclick") {
          // Set loading state
          setIsLoadingResults(true);
          setResultsCoordinate(event.coordinate);
          setAggregatedResults([]);

          // Execute all applicable handlers
          const handlerPromises = applicableHandlers.map(async (handler) => {
            try {
              return await Promise.resolve(handler.handler(event.coordinate, event.pixel, event));
            } catch (error) {
              console.error(`Error executing handler "${handler.id}":`, error);
              return null;
            }
          });

          // Collect all results and show unified popup
          Promise.all(handlerPromises)
            .then((allResults) => {
              // Filter out null/undefined and flatten results
              const flatResults: Result[] = [];
              allResults.forEach((result) => {
                if (result) {
                  if (Array.isArray(result)) {
                    flatResults.push(...result);
                  }
                }
              });

              console.log(`UnifiedInteraction: ${eventType} - ${applicableHandlers.length} handlers executed, ${flatResults.length} results collected`);

              // Update state with results
              setAggregatedResults(flatResults);
              setIsLoadingResults(false);
            })
            .catch((error) => {
              console.error("Error collecting interaction results:", error);
              setIsLoadingResults(false);
            });

          // Stop event propagation for handled events
          return false;
        }

        // For other events (contextmenu, etc.), execute handlers without aggregation
        applicableHandlers.forEach((handler) => {
          try {
            handler.handler(event.coordinate, event.pixel, event);
          } catch (error) {
            console.error(`Error executing handler "${handler.id}":`, error);
          }
        });

        // Stop event propagation for handled events
        return false;
      }
    }

    const unifiedInteraction = new UnifiedInteraction();
    mapInstance.addInteraction(unifiedInteraction);
    unifiedInteractionRef.current = unifiedInteraction;

    // Create identify icon layer
    const identifyIconLayer = new VectorLayer({
      source: new VectorSource(),
      style: undefined, // Style will be set per feature
    });

    const identifyLayerId = LayerManager.addLayer(identifyIconLayer, "Graphics", "Identify Icon", {
      index: 50, // High index to ensure it appears on top
      metadata: {
        isIdentifyIcon: true,
      },
    });

    identifyIconLayerRef.current = identifyIconLayer;
    identifyIconLayerIdRef.current = identifyLayerId;

    // Mark map as loaded
    addLoadedItem("map");
    setMapLoading(false);
    emitMapLoaded();

    // Cleanup function
    return () => {
      // Remove unified interaction
      if (unifiedInteractionRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeInteraction(unifiedInteractionRef.current);
        unifiedInteractionRef.current = null;
      }

      if (identifyIconLayerIdRef.current) {
        LayerManager.removeLayer(identifyIconLayerIdRef.current);
        identifyIconLayerIdRef.current = null;
      }
      identifyIconLayerRef.current = null;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }

      // Clean up window references
      if (typeof window !== "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).map;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).config;
      }
    };
  }, [setMap, setMapControls, addLoadedItem, setMapLoading, emitMapLoaded, setCurrentExtent, setCurrentZoom, setCurrentCenter, initExtentHistory, saveCurrentExtentToHistory]);

  // Utility functions for URL parameter handling
  const flashPoint = useCallback((coords: number[]) => {
    // Simple flash animation by temporarily adding a feature with animation
    // This is a simplified version - in the original it might use more complex animations
    const flashFeature = new Feature({
      geometry: new Point(coords),
    });

    const flashStyle = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        src: "/images/map-marker-light-blue.png", // Fallback to a basic marker
        scale: 1.5,
      }),
    });

    flashFeature.setStyle(flashStyle);

    if (identifyIconLayerRef.current) {
      identifyIconLayerRef.current.getSource()?.addFeature(flashFeature);

      // Remove flash feature after animation
      setTimeout(() => {
        identifyIconLayerRef.current?.getSource()?.removeFeature(flashFeature);
      }, 1000);
    }
  }, []);

  const zoomToFeature = useCallback(
    (feature: Feature) => {
      if (!map) return;

      const geometry = feature.getGeometry();
      if (geometry) {
        map.getView().fit(geometry.getExtent(), {
          size: map.getSize(),
          duration: 1000,
          padding: [20, 20, 20, 20],
        });
      }
    },
    [map]
  );

  const getFeatureFromGeoJSON = useCallback((geoJsonFeature: { geometry: { coordinates: number[] }; properties?: Record<string, unknown> }) => {
    const coordinates = geoJsonFeature.geometry.coordinates;
    const feature = new Feature({
      geometry: new Point(coordinates),
      properties: geoJsonFeature.properties,
    });
    return feature;
  }, []);

  // Handle URL parameters for zooming and positioning
  const handleURLParameters = useCallback(() => {
    if (!map || !identifyIconLayerRef.current) return;

    // Get URL parameters
    const x = urlParameters.X;
    const y = urlParameters.Y;
    const sr = urlParameters.SR || "WEB";
    const id = urlParameters.ID;

    // Get extent parameters
    const xmin = urlParameters.XMIN;
    const ymin = urlParameters.YMIN;
    const xmax = urlParameters.XMAX;
    const ymax = urlParameters.YMAX;

    // Get NG911ID parameter
    const urlNG911ID = urlParameters.NG911ID;

    // Handle NG911ID lookup
    if (urlNG911ID) {
      const ng911UrlTemplate = (mainURL: string, id: string) => `${mainURL}&cql_filter=NGUID='${id}'`;
      const ng911Url = "https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Civic_Address_Point_Lookup&outputFormat=application/json";
      const ng911IDUrl = ng911UrlTemplate(ng911Url, urlNG911ID);

      const axiosClient = getAxiosClient(ng911IDUrl);
      axiosClient
        .get<{ features?: Array<{ geometry: { coordinates: number[] }; properties?: Record<string, unknown> }> }>(ng911IDUrl)
        .then((response) => {
          const result = response.data;
          if (result?.features?.[0]) {
            const feature = getFeatureFromGeoJSON(result.features[0]);
            const iconStyle = new Style({
              image: new Icon({
                anchor: [0.5, 1],
                src: "/images/map-marker-light-blue.png", // Using a fallback icon
              }),
            });

            feature.setStyle(iconStyle);
            identifyIconLayerRef.current?.getSource()?.clear();
            identifyIconLayerRef.current?.getSource()?.addFeature(feature);
            zoomToFeature(feature);
          }
        })
        .catch((error) => {
          console.error("Error fetching NG911ID data:", error);
        });

      return; // Exit early for NG911ID handling
    }

    // Handle coordinate zoom (X, Y)
    if (x && y) {
      let coords = [parseFloat(x), parseFloat(y)];

      // Handle coordinate system transformation
      if (sr && sr.toUpperCase() === "WGS84") {
        coords = fromLonLat([Math.round(parseFloat(x) * 100000) / 100000, Math.round(parseFloat(y) * 100000) / 100000]);
      }

      // Add marker if ID is specified or onCoordinateZoomID is configured
      if (id === "true" || (config as Record<string, unknown>).onCoordinateZoomID) {
        const iconFeature = new Feature({
          geometry: new Point(coords),
        });

        const iconStyle = new Style({
          image: new Icon({
            anchor: [0.5, 1],
            src: "/images/map-marker-light-blue.png", // Using a fallback icon
          }),
        });

        iconFeature.setStyle(iconStyle);
        identifyIconLayerRef.current.getSource()?.clear();
        identifyIconLayerRef.current.getSource()?.addFeature(iconFeature);
      }

      // Center map on coordinates
      map.getView().setCenter(coords);
      map.getView().setZoom(config.defaultZoom || 17);

      // Flash the point after a delay
      setTimeout(() => {
        flashPoint(coords);
      }, 1000);

      // Handle extent zoom (XMIN, YMIN, XMAX, YMAX)
    } else if (xmin && ymin && xmax && ymax) {
      const extent = [parseFloat(xmin), parseFloat(ymin), parseFloat(xmax), parseFloat(ymax)];

      map.getView().fit(extent, {
        size: map.getSize(),
        duration: 1000,
      });
    }

    // Emit map parameters complete event
    // emitMapLoaded(); // This might be redundant since we already emit this
  }, [map, urlParameters, flashPoint, zoomToFeature, getFeatureFromGeoJSON]);

  // Handle URL parameters after map is loaded
  useEffect(() => {
    if (map && Object.keys(urlParameters).length > 0) {
      // Add a small delay to ensure map is fully initialized
      setTimeout(() => {
        handleURLParameters();
      }, 100);
    }
  }, [map, urlParameters, handleURLParameters]);

  // Update map size when sidebar state changes
  useEffect(() => {
    if (map) {
      // Small delay to allow CSS transition to complete
      const timer = setTimeout(() => {
        map.updateSize();
      }, 350); // Slightly longer than the 0.3s CSS transition

      return () => clearTimeout(timer);
    }
  }, [isOpen, map]);

  // Get center coordinates and default zoom from config (memoized)
  const centerCoords = useMemo(() => config.centerCoords || [-8878504.68, 5543492.45], []);
  const defaultZoom = useMemo(() => config.defaultZoom || 10, []);

  // Control wrapper components that handle props and lazy loading (memoized to prevent recreation)
  const ZoomToExtentWrapper = useCallback(
    ({ map }: { map: Map }) => {
      return (
        <Suspense fallback={<ControlLoadingPlaceholder />}>
          <LazyZoomToExtentButton map={map} centerCoords={centerCoords} defaultZoom={defaultZoom} />
        </Suspense>
      );
    },
    [centerCoords, defaultZoom]
  );

  const GitHubButtonWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyGitHubButtonDisplay map={map} href="https://github.com/county-of-simcoe-gis">
          View on GitHub
        </LazyGitHubButtonDisplay>
      </Suspense>
    );
  }, []);

  // Additional wrapper components for other controls
  const CurrentLocationWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyCurrentLocationButton map={map} />
      </Suspense>
    );
  }, []);

  const ExtentHistoryWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyExtentHistoryButtons map={map} />
      </Suspense>
    );
  }, []);

  const GridWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyGridButton map={map} />
      </Suspense>
    );
  }, []);

  const ScaleDisplayWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyScaleDisplay map={map} />
      </Suspense>
    );
  }, []);

  const ScaleSelectorWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyScaleSelector map={map} />
      </Suspense>
    );
  }, []);

  const ZoomControlsWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyZoomControls map={map} />
      </Suspense>
    );
  }, []);

  const RotateControlWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyRotateControl map={map} />
      </Suspense>
    );
  }, []);

  const FullscreenControlWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyFullscreenControl map={map} />
      </Suspense>
    );
  }, []);

  const AttributionControlWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyAttributionControl map={map} />
      </Suspense>
    );
  }, []);

  // Define control configuration - memoized to prevent recreation on every render
  const controlsConfig: Record<string, ControlConfig> = useMemo(
    () => ({
      gitHubButton: {
        component: GitHubButtonWrapper,
        zone: "top-left",
        order: 1,
        enabled: config.controls?.gitHubButton ?? true,
      },
      zoomControls: {
        component: ZoomControlsWrapper,
        zone: "top-left",
        order: 1,
        enabled: config.controls?.zoomInOut ?? true,
      },
      currentLocation: {
        component: CurrentLocationWrapper,
        zone: "top-left",
        order: 2,
        enabled: config.controls?.currentLocation ?? true,
      },
      extentHistory: {
        component: ExtentHistoryWrapper,
        zone: "top-left",
        order: 3,
        enabled: config.controls?.extentHistory ?? false,
      },
      zoomExtent: {
        component: ZoomToExtentWrapper,
        zone: "top-left",
        order: 4,
        enabled: config.controls?.zoomExtent ?? true,
      },
      grid: {
        component: GridWrapper,
        zone: "top-left",
        order: 5,
        enabled: config.controls?.showGrid ?? false,
      },

      // gitHubButton: {
      //   component: GitHubButtonWrapper,
      //   zone: "top-right",
      //   order: 1,
      //   enabled: config.controls?.gitHubButton ?? true,
      // },
      basemap: {
        component: BasemapSwitcher,
        zone: "top-right",
        order: 1,
        enabled: config.controls?.basemap ?? true,
      },

      fullScreen: {
        component: FullscreenControlWrapper,
        zone: "bottom-left",
        order: 1,
        enabled: config.controls?.fullScreen ?? true,
      },
      rotate: {
        component: RotateControlWrapper,
        zone: "bottom-left",
        order: 2,
        enabled: config.controls?.rotate ?? true,
      },

      scaleSelector: {
        component: ScaleSelectorWrapper,
        zone: "bottom-right",
        order: 2,
        enabled: config.controls?.scaleSelector ?? false,
      },
      scale: {
        component: ScaleDisplayWrapper,
        zone: "bottom-right",
        order: 1,
        enabled: config.controls?.scale ?? true,
      },
      attribution: {
        component: AttributionControlWrapper,
        zone: "bottom-right",
        order: 3,
        enabled: config.controls?.attribution ?? true,
      },
    }),
    [
      ZoomControlsWrapper,
      CurrentLocationWrapper,
      ExtentHistoryWrapper,
      ZoomToExtentWrapper,
      GridWrapper,
      GitHubButtonWrapper,
      FullscreenControlWrapper,
      RotateControlWrapper,
      ScaleDisplayWrapper,
      ScaleSelectorWrapper,
      AttributionControlWrapper,
    ]
  );

  // Get zone controls based on configuration (memoized)
  const zoneControls = useMemo(() => createZoneControlsFromConfig(map, controlsConfig), [map, controlsConfig]);

  // Add zone controls to the map
  useEffect(() => {
    if (map && zoneControls.length > 0) {
      zoneControls.forEach((control) => {
        map.addControl(control);
      });

      // Cleanup function to remove controls when component unmounts or controls change
      return () => {
        zoneControls.forEach((control) => {
          map.removeControl(control);
        });
      };
    }
  }, [map, zoneControls]);

  // Show unified popup when results are available
  useEffect(() => {
    if (aggregatedResults.length > 0 && resultsCoordinate) {
      const handleClose = () => {
        // Clear parcel layers from any results that have the clear function
        aggregatedResults.forEach((result) => {
          if ((result as any).clearParcelLayer) {
            (result as any).clearParcelLayer();
          }
        });

        setAggregatedResults([]);
        setResultsCoordinate(null);
        hidePopup();
      };

      const handleSelectResult = async (result: Result) => {
        // Call lazy-loading function if it exists on the result
        if ((result as any).loadDetails) {
          await (result as any).loadDetails();
        }
      };

      const handleClearParcelLayer = () => {
        // Clear parcel layers from any results that have the clear function
        aggregatedResults.forEach((result) => {
          if ((result as any).clearParcelLayer) {
            (result as any).clearParcelLayer();
          }
        });
      };

      showPopup(
        resultsCoordinate,
        <ResultsPopup results={aggregatedResults} onClose={handleClose} isLoadingResults={isLoadingResults} onSelectResult={handleSelectResult} onClearParcelLayer={handleClearParcelLayer} />,
        aggregatedResults.length > 1 ? `Results (${aggregatedResults.length})` : "Result"
      );
    }
  }, [aggregatedResults, resultsCoordinate, isLoadingResults, showPopup, hidePopup]);

  return (
    <InteractionManagerContext.Provider value={interactionManager}>
      <div ref={mapRef} id="map" className={`sc-map ${!isOpen ? "sidebar-closed" : ""}`} />
      <PropertyReportClick />
      <LiveLayerClick />
      <MapPopup />
      <MapContextMenuContainer />
    </InteractionManagerContext.Provider>
  );
}
