"use client";

import { useEffect, useRef, useMemo, useCallback, Suspense, lazy, createContext, useContext, useState } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { usePopupStore } from "@/stores/popupStore";
import { useInteractionManagerStore, type InteractionHandler as StoreInteractionHandler } from "@/stores/interactionManagerStore";
import { useSession } from "next-auth/react";
import type { Interaction as OLInteraction } from "ol/interaction";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { InteractionManager } from "@/utils/openlayers/InteractionManager";
import { useUrlParameterContextOptional } from "@/contexts/UrlParameterContext";
import { getPublicPath } from "@/utils/getPublicPath";
import { getStorageItem } from "@/utils/storage";
import { isMobile } from "@/utils/helpersBrowser";

// OpenLayers imports
import "ol/ol.css";
import "@/components/map/controls/MapControls.css";
import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultInteractions, MouseWheelZoom, PinchRotate, DragRotate, Interaction } from "ol/interaction";
import { ScaleLine, Attribution } from "ol/control";
import { Feature } from "ol";
import { Point, Geometry } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Icon, Circle as CircleStyle, Fill, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";
import { getVectorContext } from "ol/render";
import { unByKey } from "ol/Observable";
import { easeOut } from "ol/easing";
// Import zone-based control system
import { createZoneControlsFromConfig, ControlConfig } from "@/components/map/controls/MapControlZones";

// Control components will be dynamically imported

// Import basemap components
import BasemapSwitcher from "@/components/BasemapSwitcher";

// Import property report click functionality
import PropertyReportClick from "@/components/PropertyReportClick";
import LiveLayerClick from "@/components/LiveLayerClick";
import MapPopup from "@/components/map/MapPopup";
import { MapContextMenuContainer } from "@/components/map/MapContextMenuContainer";
import ResultsPopup, { type Result } from "@/components/ResultsPopup";
import ReportsFeatureList from "@/components/ReportsFeatureList";
import { useReportsStore } from "@/stores/reportsStore";
import { activateTab } from "@/utils/helpersUI";


// Extended Result type with optional methods that may be added at runtime
interface ResultWithMethods extends Result {
  clearParcelLayer?: () => void;
  loadDetails?: () => Promise<void>;
}

// Import static config as fallback
import staticConfig from "@/config.json";

// Import utilities
import { getAxiosClient } from "@/lib/axiosInstance";

// ─── HMR-resilient map registry ─────────────────────────────────────────────
// Stores the OL Map instance on window so it survives Fast Refresh module
// re-execution.  When MapContainer remounts after HMR it re-targets the
// existing map instead of tearing everything down and rebuilding from scratch.
interface HmrMapRegistry {
  map: Map | null;
  identifyIconLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  identifyIconLayerId: string | null;
  unifiedInteraction: Interaction | null;
}
const _hmrRegistry: HmrMapRegistry =
  typeof window !== "undefined"
    ? (((window as unknown as Record<string, unknown>).__hmrMapRegistry ??= {
        map: null,
        identifyIconLayer: null,
        identifyIconLayerId: null,
        unifiedInteraction: null,
      } as HmrMapRegistry) as HmrMapRegistry)
    : { map: null, identifyIconLayer: null, identifyIconLayerId: null, unifiedInteraction: null };

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
  MoreMenuButton: () => import("@/components/map/controls/MoreMenuButton").then((m) => ({ default: m.MoreMenuButton })),
  ShareMap: () => import("@/components/map/controls/ShareMap").then((m) => ({ default: m.ShareMap })),
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
const LazyMoreMenuButton = lazy(dynamicControlImports.MoreMenuButton);
const LazyShareMap = lazy(dynamicControlImports.ShareMap);

// Loading placeholder component
const ControlLoadingPlaceholder = () => <div className="w-8 h-8 bg-base-200 rounded" />;

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
  registerInteraction: (id: string, interaction: OLInteraction, owner?: string) => void;
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
  const isOpen = useSidebarStore((s) => s.isOpen);
  const { data: session } = useSession();

  // IMPORTANT: Use individual selectors for Zustand stores to prevent
  // unnecessary re-renders that cause React 19 "Cannot commit the same tree"
  // errors when store state changes during effect execution.
  const map = useMapStore((s) => s.map);
  const setMap = useMapStore((s) => s.setMap);
  const addLoadedItem = useMapStore((s) => s.addLoadedItem);
  const setMapControls = useMapStore((s) => s.setMapControls);
  const setCurrentExtent = useMapStore((s) => s.setCurrentExtent);
  const setCurrentZoom = useMapStore((s) => s.setCurrentZoom);
  const setCurrentCenter = useMapStore((s) => s.setCurrentCenter);
  const initExtentHistory = useMapStore((s) => s.initExtentHistory);
  const saveCurrentExtentToHistory = useMapStore((s) => s.saveCurrentExtentToHistory);
  const controlVisibility = useMapStore((s) => s.controlVisibility);
  const initControlVisibility = useMapStore((s) => s.initControlVisibility);

  const setMapLoading = useAppStore((s) => s.setMapLoading);

  // Only extract the stable action functions from popupStore — NOT reactive state.
  // Subscribing to the full store (isVisible, features, etc.) would cause MapContainer
  // to re-render whenever the popup opens or closes, which triggers a synchronous
  // useSyncExternalStore notification during effect execution and crashes React 19.
  const showPopup = usePopupStore((s) => s.show);
  const hidePopup = usePopupStore((s) => s.hide);
  const setOnClose = usePopupStore((s) => s.setOnClose);

  const urlParameters = useAppStore((state) => state.urlParameters);

  // URL Parameter context for registering map readiness
  const urlParamContext = useUrlParameterContextOptional();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const identifyIconLayerRef = useRef<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null);
  const identifyIconLayerIdRef = useRef<string | null>(null);
  const hasAppliedApiConfigRef = useRef(false);
  const initialViewRef = useRef<{ center: number[]; zoom: number } | null>(null);

  // Handler-based system - use individual selectors
  const storeRegisterHandler = useInteractionManagerStore((s) => s.registerHandler);
  const storeUnregisterHandler = useInteractionManagerStore((s) => s.unregisterHandler);
  const storeRegisterInteraction = useInteractionManagerStore((s) => s.registerInteraction);
  const storeUnregisterInteraction = useInteractionManagerStore((s) => s.unregisterInteraction);
  const unifiedInteractionRef = useRef<Interaction | null>(null);
  const shouldExecuteHandlerRef = useRef<((handler: InteractionHandler, event: MapBrowserEvent<OLUIEvent>) => boolean) | null>(null);
  const termsShownRef = useRef(false);

  // State for aggregated results
  const [aggregatedResults, setAggregatedResults] = useState<Result[]>([]);
  const [resultsCoordinate, setResultsCoordinate] = useState<number[] | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Generation counter to prevent stale cleanup callbacks from clearing new click results.
  // Each new click increments the counter; cleanup callbacks captured from a previous
  // generation become no-ops, avoiding a race where hidePopup()'s onCloseCallback
  // clears the results that the current click just set.
  const clickGenerationRef = useRef(0);

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
    [map, calculateMapScale],
  );

  // Update ref whenever shouldExecuteHandler changes
  useEffect(() => {
    shouldExecuteHandlerRef.current = shouldExecuteHandler;
    // Publish to the InteractionManager so its dispatcher can consult the
    // up-to-date condition checker (which depends on map zoom/scale).
    InteractionManager.setHandlerFilter(shouldExecuteHandler as Parameters<typeof InteractionManager.setHandlerFilter>[0]);
  }, [shouldExecuteHandler]);

  // Wire up the aggregation callbacks once. The setters/refs they reference
  // are stable across renders; the InteractionManager calls them on every
  // singleclick to drive the React-side popup state machine.
  useEffect(() => {
    InteractionManager.setAggregationCallbacks({
      onClickStart: (coordinate) => {
        clickGenerationRef.current += 1;
        const generation = clickGenerationRef.current;
        setIsLoadingResults(true);
        setResultsCoordinate(coordinate);
        setAggregatedResults([]);

        // On mobile the popup is a fixed bottom sheet that doesn't follow the
        // map, so center the view on the tapped feature for context.
        if (isMobile()) {
          const map = useMapStore.getState().map;
          if (map) {
            map.getView().animate({ center: coordinate, duration: 300 });
          }
        }

        return generation;
      },
      onClickResults: (results, generation) => {
        if (clickGenerationRef.current !== generation) return;
        setAggregatedResults(results);
        setIsLoadingResults(false);
      },
      onClickError: (generation) => {
        if (clickGenerationRef.current !== generation) return;
        setIsLoadingResults(false);
      },
    });
  }, []);

  // Handler registration - delegate to store
  const registerHandler = useCallback(
    (handler: InteractionHandler) => {
      storeRegisterHandler(handler as StoreInteractionHandler);
    },
    [storeRegisterHandler],
  );

  const unregisterHandler = useCallback(
    (handlerId: string) => {
      storeUnregisterHandler(handlerId);
    },
    [storeUnregisterHandler],
  );

  // OL Interaction registration — delegates to centralized store
  const registerInteraction = useCallback(
    (id: string, interaction: OLInteraction, owner?: string) => {
      storeRegisterInteraction(id, interaction, owner);
    },
    [storeRegisterInteraction],
  );

  const unregisterInteraction = useCallback(
    (id: string) => {
      storeUnregisterInteraction(id);
    },
    [storeUnregisterInteraction],
  );

  const interactionManager = useMemo(
    () => ({
      registerHandler,
      unregisterHandler,
      registerInteraction,
      unregisterInteraction,
    }),
    [registerHandler, unregisterHandler, registerInteraction, unregisterInteraction],
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // ─── HMR fast-path: reuse existing map after Fast Refresh ───────────
    if (_hmrRegistry.map) {
      const existingMap = _hmrRegistry.map;
      existingMap.setTarget(mapRef.current);
      mapInstanceRef.current = existingMap;
      setMap(existingMap);

      // Restore refs from registry
      identifyIconLayerRef.current = _hmrRegistry.identifyIconLayer;
      identifyIconLayerIdRef.current = _hmrRegistry.identifyIconLayerId;
      unifiedInteractionRef.current = _hmrRegistry.unifiedInteraction;

      // Only block the deferred config effect if the API config has already been
      // loaded and applied.  During React StrictMode double-mount the config is
      // still loading (null in the store), so we must let the deferred effect run
      // later when it arrives.  During a real HMR (dev code save) the config was
      // applied long ago and we don't want to re-animate to it.
      hasAppliedApiConfigRef.current = !!useAppStore.getState().config;
      // Capture current view so navigation guard works if effect somehow fires
      const view = existingMap.getView();
      initialViewRef.current = {
        center: view.getCenter() ? [...view.getCenter()!] : [0, 0],
        zoom: view.getZoom() ?? 0,
      };

      // Re-set window refs
      if (typeof window !== "undefined") {
        const dynamicConfig = useAppStore.getState().config;
        const activeConfig = dynamicConfig || staticConfig;
        (window as unknown as { map: Map | null; config: typeof activeConfig | null }).map = existingMap;
        (window as unknown as { map: Map | null; config: typeof activeConfig | null }).config = activeConfig;
      }

      // Mark loaded (in case loading screen is showing)
      addLoadedItem("map");
      setMapLoading(false);

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setTarget(undefined);
          mapInstanceRef.current = null;
        }
        // Keep _hmrRegistry populated so next remount can reuse
      };
    }
    // ─── End HMR fast-path ──────────────────────────────────────────────

    // Create scale line control
    const scaleLineControl = new ScaleLine({
      minWidth: 80,
    });

    // Use dynamic config from app store if available, otherwise fall back to static import
    const dynamicConfig = useAppStore.getState().config;
    const activeConfig = dynamicConfig || staticConfig;

    // Get stored extent or use defaults
    const storageExtentKey = "Map Extent";
    const storedExtent = getStorageItem(storageExtentKey);
    let extent = null;
    const centerCoords = Array.isArray(activeConfig.centerCoords) && activeConfig.centerCoords.length >= 2 ? activeConfig.centerCoords : [-8878504.68, 5543492.45];
    const defaultZoom = activeConfig.defaultZoom || 10;

    // Store initial view state so we can detect user navigation later
    initialViewRef.current = { center: [...centerCoords], zoom: defaultZoom };

    // Check if URL has coordinate parameters - if so, don't apply stored extent
    // This matches legacy behavior where URL params take precedence
    const urlParams = new URLSearchParams(window.location.search);
    const hasCoordParams = urlParams.has("X") || urlParams.has("x") || urlParams.has("XMIN") || urlParams.has("xmin");

    if (storedExtent && !hasCoordParams) {
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
        maxZoom: activeConfig.maxZoom || 20,
        constrainResolution: true,
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

    // Initialize control visibility from config and localStorage
    initControlVisibility(activeConfig);

    // Configure map controls based on config (for backward compatibility)
    const mapControls: Record<string, boolean> = {
      rotate: activeConfig.controls?.rotate ?? true,
      fullScreen: activeConfig.controls?.fullScreen ?? true,
      zoomInOut: activeConfig.controls?.zoomInOut ?? true,
      currentLocation: activeConfig.controls?.currentLocation ?? true,
      zoomExtent: activeConfig.controls?.zoomExtent ?? true,
      scale: activeConfig.controls?.scale ?? true,
      scaleLine: activeConfig.controls?.scaleLine ?? true,
      basemap: activeConfig.controls?.basemap ?? true,
      gitHubButton: activeConfig.controls?.gitHubButton ?? true,
      scaleSelector: activeConfig.controls?.scaleSelector ?? false,
      grid: activeConfig.controls?.showGrid ?? true,
      extentHistory: activeConfig.controls?.extentHistory ?? false,
      attribution: activeConfig.controls?.attribution ?? true,
      attributeTable: activeConfig.controls?.attributeTable ?? true,
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
      (window as unknown as { map: Map | null; config: typeof activeConfig | null }).map = mapInstance;
      (window as unknown as { map: Map | null; config: typeof activeConfig | null }).config = activeConfig;
    }

    // Attach the singleton InteractionManager — owns handler dispatch,
    // tool-active gating, post-aggregation parcel-click suppression, and OL
    // interaction lifecycle. This replaces the former inline UnifiedInteraction.
    const unifiedInteraction = InteractionManager.attach(mapInstance);
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

    // Persist to HMR registry so the map survives Fast Refresh
    _hmrRegistry.map = mapInstance;
    _hmrRegistry.identifyIconLayer = identifyIconLayer;
    _hmrRegistry.identifyIconLayerId = identifyLayerId;
    _hmrRegistry.unifiedInteraction = unifiedInteraction;

    // Mark map as loaded
    addLoadedItem("map");
    setMapLoading(false);

    // Show terms popup on startup (matches old app behaviour) — only once
    if (activeConfig.termsUrl && activeConfig.showTermsOnStartup && !termsShownRef.current) {
      termsShownRef.current = true;
      import("@/utils/helpersUI").then(({ showURLWindow }) => {
        showURLWindow(activeConfig.termsUrl!, true, "full", true, true, "Terms and Conditions");
      });
    }

    // Register map as ready for URL parameter processing
    // Use 'dataLoaded' because the map is now fully initialized and interactive
    if (urlParamContext?.registerComponentReady) {
      urlParamContext.registerComponentReady("map", { readinessType: "dataLoaded" });
    }

    // Cleanup function — preserve map for HMR, only untarget
    return () => {
      // Untarget the map from the DOM but keep the OL Map instance alive
      // so that Fast Refresh can re-target it instead of rebuilding everything.
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
      // Don't remove interactions, layers, or clear window refs —
      // they stay on the map instance which lives in _hmrRegistry.
      // If the page actually navigates away, the whole window is discarded anyway.
    };
  }, [setMap, setMapControls, addLoadedItem, setMapLoading, setCurrentExtent, setCurrentZoom, setCurrentCenter, initExtentHistory, saveCurrentExtentToHistory, initControlVisibility, urlParamContext]);

  // Utility functions for URL parameter handling
  const flashPoint = useCallback(
    (coords: number[], duration = 5000) => {
      if (!map) return;

      // Create marker feature with white dot and blue outline (matching legacy app)
      const marker = new Feature(new Point(coords));
      const markerStyle = new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({
            color: "#fff",
          }),
          stroke: new Stroke({
            color: "blue",
            width: 2,
          }),
        }),
        zIndex: 100,
      });
      marker.setStyle(markerStyle);

      // Create a dedicated vector layer for the flash animation
      const flashLayer = new VectorLayer({
        zIndex: 1000,
        source: new VectorSource({
          features: [marker],
        }),
      });
      map.addLayer(flashLayer);

      // Pulsating animation - matching legacy app behavior
      const start = Date.now();

      const animationKey = flashLayer.on("postrender", (event) => {
        const vectorContext = getVectorContext(event);
        const frameState = event.frameState;
        if (!frameState) return;

        const flashGeom = marker.getGeometry()?.clone();
        if (!flashGeom) return;

        const elapsed = frameState.time - start;
        const elapsedRatio = elapsed / duration;
        const radius = easeOut(elapsedRatio) * 35 + 5;
        // Clamp opacity values to valid range (0-1) to prevent invalid rgba colors
        const opacity = Math.max(0, easeOut(1 - elapsedRatio));
        const fillOpacity = Math.max(0, easeOut(0.5 - elapsedRatio));

        // Draw the expanding pulsating circle
        vectorContext.setStyle(
          new Style({
            image: new CircleStyle({
              radius: radius,
              fill: new Fill({
                color: `rgba(119, 170, 203, ${fillOpacity})`,
              }),
              stroke: new Stroke({
                color: `rgba(119, 170, 203, ${opacity})`,
                width: 2 + opacity,
              }),
            }),
          }),
        );
        vectorContext.drawGeometry(flashGeom);

        // Redraw the marker on top
        vectorContext.setStyle(markerStyle);
        vectorContext.drawGeometry(flashGeom);

        // End animation after duration
        if (elapsed > duration) {
          unByKey(animationKey);
          map.removeLayer(flashLayer);
          return;
        }

        // Request next frame
        map.render();
      });
    },
    [map],
  );

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
    [map],
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
    const z = urlParameters.Z || urlParameters.ZOOM; // Support both Z and ZOOM
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
                src: getPublicPath("/images/map-marker-light-blue.png"), // Using a fallback icon
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
      const currentConfig = useAppStore.getState().config;
      if (id === "true" || (currentConfig as Record<string, unknown>)?.onCoordinateZoomID) {
        const iconFeature = new Feature({
          geometry: new Point(coords),
        });

        const iconStyle = new Style({
          image: new Icon({
            anchor: [0.5, 1],
            src: getPublicPath("/images/identify-marker.png"),
          }),
        });

        iconFeature.setStyle(iconStyle);
        identifyIconLayerRef.current.getSource()?.clear();
        identifyIconLayerRef.current.getSource()?.addFeature(iconFeature);
      }

      // Center map on coordinates - use Z/ZOOM parameter if provided, otherwise use default
      const zoomLevel = z ? parseInt(z, 10) : currentConfig?.defaultZoom || 17;
      map.getView().setCenter(coords);
      map.getView().setZoom(zoomLevel);

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
  const appStoreConfig = useAppStore((state) => state.config);
  const centerCoords = useMemo(() => {
    const coords = appStoreConfig?.centerCoords || staticConfig.centerCoords;
    return Array.isArray(coords) && coords.length >= 2 ? coords : [-8878504.68, 5543492.45];
  }, [appStoreConfig]);
  const defaultZoom = useMemo(() => appStoreConfig?.defaultZoom || staticConfig.defaultZoom || 10, [appStoreConfig]);

  // Apply API config zoom/center/maxZoom when it first loads (after map is already initialized with static defaults)
  useEffect(() => {
    if (!map || !appStoreConfig || hasAppliedApiConfigRef.current) return;

    hasAppliedApiConfigRef.current = true;

    // Don't override if URL has coordinate params (URL params take precedence)
    const urlParams = new URLSearchParams(window.location.search);
    const hasCoordParams = urlParams.has("X") || urlParams.has("x") || urlParams.has("XMIN") || urlParams.has("xmin");
    if (hasCoordParams) return;

    // Don't override if there's a stored extent from a previous session
    const storedExtent = getStorageItem("Map Extent");
    if (storedExtent) return;

    // Don't override if the user has already navigated away from the initial view
    // (race condition: API config may arrive after user has zoomed/panned)
    if (initialViewRef.current) {
      const currentZoom = map.getView().getZoom() ?? 0;
      const currentCenter = map.getView().getCenter();
      const { center: initCenter, zoom: initZoom } = initialViewRef.current;
      if (currentCenter && (Math.abs(currentZoom - initZoom) > 0.1 || Math.abs(currentCenter[0] - initCenter[0]) > 1 || Math.abs(currentCenter[1] - initCenter[1]) > 1)) {
        return;
      }
    }

    const configCenter = Array.isArray(appStoreConfig.centerCoords) && appStoreConfig.centerCoords.length >= 2 ? appStoreConfig.centerCoords : undefined;
    const configZoom = appStoreConfig.defaultZoom;
    const configMaxZoom = appStoreConfig.maxZoom;

    // Update maxZoom on the view if the API config specifies a different one
    if (configMaxZoom && configMaxZoom !== map.getView().getMaxZoom()) {
      map.getView().setMaxZoom(configMaxZoom);
    }

    // Apply center and zoom if they differ from current (i.e., API config overrides static defaults)
    if (configCenter || configZoom) {
      map.getView().animate({
        center: configCenter || map.getView().getCenter(),
        zoom: configZoom || map.getView().getZoom(),
        duration: 0,
      });
    }
  }, [map, appStoreConfig]);

  // Control wrapper components that handle props and lazy loading (memoized to prevent recreation)
  const ZoomToExtentWrapper = useCallback(
    ({ map }: { map: Map }) => {
      return (
        <Suspense fallback={<ControlLoadingPlaceholder />}>
          <LazyZoomToExtentButton map={map} centerCoords={centerCoords} defaultZoom={defaultZoom} />
        </Suspense>
      );
    },
    [centerCoords, defaultZoom],
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

  const MoreMenuButtonWrapper = useCallback((_props: { map: Map }) => {
    void _props;
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyMoreMenuButton />
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

  const ShareMapWrapper = useCallback(({ map }: { map: Map }) => {
    return (
      <Suspense fallback={<ControlLoadingPlaceholder />}>
        <LazyShareMap map={map} />
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
        enabled: controlVisibility.gitHubButton,
      },
      moreMenu: {
        component: MoreMenuButtonWrapper,
        zone: "top-left",
        order: 2,
        enabled: true,
      },
      zoomControls: {
        component: ZoomControlsWrapper,
        zone: "top-left",
        order: 3,
        enabled: controlVisibility.zoomInOut,
      },

      extentHistory: {
        component: ExtentHistoryWrapper,
        zone: "top-left",
        order: 4,
        enabled: controlVisibility.extentHistory,
      },
      zoomExtent: {
        component: ZoomToExtentWrapper,
        zone: "top-left",
        order: 5,
        enabled: controlVisibility.zoomExtent,
      },
      currentLocation: {
        component: CurrentLocationWrapper,
        zone: "top-left",
        order: 6,
        enabled: controlVisibility.currentLocation,
      },
      grid: {
        component: GridWrapper,
        zone: "top-left",
        order: 7,
        enabled: controlVisibility.grid,
      },
      shareMap: {
        component: ShareMapWrapper,
        zone: "top-left",
        order: 8,
        enabled: controlVisibility.shareMap,
      },

      // gitHubButton: {
      //   component: GitHubButtonWrapper,
      //   zone: "top-right",
      //   order: 1,
      //   enabled: controlVisibility.gitHubButton,
      // },
      basemap: {
        component: BasemapSwitcher,
        zone: "top-right",
        order: 1,
        enabled: controlVisibility.basemap,
      },

      fullScreen: {
        component: FullscreenControlWrapper,
        zone: "bottom-left",
        order: 1,
        enabled: controlVisibility.fullScreen,
      },
      rotate: {
        component: RotateControlWrapper,
        zone: "bottom-left",
        order: 2,
        enabled: controlVisibility.rotate,
      },

      scaleSelector: {
        component: ScaleSelectorWrapper,
        zone: "bottom-right",
        order: 2,
        enabled: controlVisibility.scaleSelector,
      },
      scale: {
        component: ScaleDisplayWrapper,
        zone: "bottom-right",
        order: 1,
        enabled: controlVisibility.scale,
      },
      attribution: {
        component: AttributionControlWrapper,
        zone: "bottom-right",
        order: 3,
        enabled: controlVisibility.attribution,
      },
    }),
    [
      controlVisibility,
      ZoomControlsWrapper,
      MoreMenuButtonWrapper,
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
      ShareMapWrapper,
    ],
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

  // Handle ScaleLine control visibility
  useEffect(() => {
    if (!map) return;

    const scaleLineControl = new ScaleLine();

    if (controlVisibility.scaleLine) {
      // Check if ScaleLine is already added
      const controls = map.getControls().getArray();
      const hasScaleLine = controls.some((c) => c instanceof ScaleLine);

      if (!hasScaleLine) {
        map.addControl(scaleLineControl);
      }
    } else {
      // Remove ScaleLine if it exists
      const controls = map.getControls().getArray();
      const existingScaleLine = controls.find((c) => c instanceof ScaleLine);

      if (existingScaleLine) {
        map.removeControl(existingScaleLine);
      }
    }

    return () => {
      // Cleanup on unmount
      const controls = map.getControls().getArray();
      const existingScaleLine = controls.find((c) => c instanceof ScaleLine);
      if (existingScaleLine) {
        map.removeControl(existingScaleLine);
      }
    };
  }, [map, controlVisibility.scaleLine]);

  // Handle Attribution control visibility
  useEffect(() => {
    if (!map) return;

    if (controlVisibility.attribution) {
      // Check if Attribution is already added
      const controls = map.getControls().getArray();
      const hasAttribution = controls.some((c) => c instanceof Attribution);

      if (!hasAttribution) {
        const attributionControl = new Attribution({
          collapsible: false,
        });
        map.addControl(attributionControl);
      }
    } else {
      // Remove Attribution if it exists
      const controls = map.getControls().getArray();
      const existingAttribution = controls.find((c) => c instanceof Attribution);

      if (existingAttribution) {
        map.removeControl(existingAttribution);
      }
    }

    return () => {
      // Cleanup on unmount
      const controls = map.getControls().getArray();
      const existingAttribution = controls.find((c) => c instanceof Attribution);
      if (existingAttribution) {
        map.removeControl(existingAttribution);
      }
    };
  }, [map, controlVisibility.attribution]);

  // Handle rotate interactions visibility — managed via centralized interaction store
  useEffect(() => {
    if (!map) return;

    if (controlVisibility.rotate) {
      // Add rotate interactions if they don't already exist in the store
      const existingPinch = useInteractionManagerStore.getState().getInteraction("rotation-pinch");
      const existingDrag = useInteractionManagerStore.getState().getInteraction("rotation-drag");

      if (!existingPinch) {
        storeRegisterInteraction("rotation-pinch", new PinchRotate(), "rotation");
      }
      if (!existingDrag) {
        storeRegisterInteraction("rotation-drag", new DragRotate(), "rotation");
      }
    } else {
      // Remove rotate interactions without resetting rotation
      storeUnregisterInteraction("rotation-pinch");
      storeUnregisterInteraction("rotation-drag");
    }
  }, [map, controlVisibility.rotate, storeRegisterInteraction, storeUnregisterInteraction]);

  // Show unified popup when results are available
  useEffect(() => {
    // If no results but we have a coordinate, hide the popup (user clicked on empty area)
    if (aggregatedResults.length === 0 && resultsCoordinate && !isLoadingResults) {
      // Defer store mutation to avoid synchronous useSyncExternalStore
      // notification during React's commit phase ("Cannot commit the same tree").
      queueMicrotask(() => hidePopup());
      setResultsCoordinate(null);
      return;
    }

    if (aggregatedResults.length > 0 && resultsCoordinate) {
      // Capture the current generation so this cleanup only fires if still current
      const cleanupGeneration = clickGenerationRef.current;

      const cleanupResults = () => {
        // Only clear state if no newer click has superseded this one
        if (clickGenerationRef.current !== cleanupGeneration) {
          return;
        }

        // Clear parcel layers from any results that have the clear function
        aggregatedResults.forEach((result) => {
          const resultWithMethods = result as ResultWithMethods;
          if (resultWithMethods.clearParcelLayer) {
            resultWithMethods.clearParcelLayer();
          }
        });

        setAggregatedResults([]);
        setResultsCoordinate(null);
      };

      const handleClose = () => {
        cleanupResults();
        hidePopup();
      };

      const handleSelectResult = async (result: Result) => {
        // Call lazy-loading function if it exists on the result
        const resultWithMethods = result as ResultWithMethods;
        if (resultWithMethods.loadDetails) {
          await resultWithMethods.loadDetails();
        }
      };

      const handleClearParcelLayer = () => {
        // Clear parcel layers from any results that have the clear function
        aggregatedResults.forEach((result) => {
          const resultWithMethods = result as ResultWithMethods;
          if (resultWithMethods.clearParcelLayer) {
            resultWithMethods.clearParcelLayer();
          }
        });
      };

      // Hide any existing popup first, then register the new cleanup callback.
      // Order matters: hidePopup() invokes (and clears) the previous onCloseCallback,
      // so setOnClose must come AFTER to ensure the new callback survives.
      //
      // Invoke the old close callback directly (bypassing hidePopup's set()) so
      // we avoid a synchronous Zustand store mutation during React's commit phase.
      // The generation check inside the callback prevents stale cleanups.
      const previousCallback = usePopupStore.getState().onCloseCallback;
      if (previousCallback) {
        previousCallback();
      }

      // If the user opted to always send popup content to the Reports tab,
      // bypass the map overlay entirely and route to the sidebar.
      if (usePopupStore.getState().alwaysUseReportsTab) {
        const title = aggregatedResults.length > 1 ? `${aggregatedResults.length} Features` : "Result";
        useReportsStore.getState().setReport({
          id: `popup-auto-${Date.now()}`,
          title,
          content: <ReportsFeatureList results={aggregatedResults} onClose={handleClose} onClearParcelLayer={handleClearParcelLayer} />,
          createdAt: new Date(),
          source: "popupPopOut",
        });
        activateTab("reports");
        return;
      }

      // Defer ALL popup store mutations to a microtask so they don't fire
      // synchronously during React's commit phase ("Cannot commit the same tree").
      // queueMicrotask runs before the next paint — no visible delay.
      const coord = resultsCoordinate;
      const title = aggregatedResults.length > 1 ? `Results (${aggregatedResults.length})` : "Result";
      const popupContent = (
        <ResultsPopup results={aggregatedResults} onClose={handleClose} isLoadingResults={isLoadingResults} onSelectResult={handleSelectResult} onClearParcelLayer={handleClearParcelLayer} />
      );
      queueMicrotask(() => {
        usePopupStore.getState().setOnClose(null);
        setOnClose(cleanupResults);
        usePopupStore.getState().setRawResults(aggregatedResults as unknown[]);
        showPopup(coord, popupContent, title);
      });
    }
  }, [aggregatedResults, resultsCoordinate, isLoadingResults, showPopup, hidePopup, setOnClose]);

  return (
    <InteractionManagerContext.Provider value={interactionManager}>
      <div ref={mapRef} id="map" className={`app-map ${!isOpen ? "sidebar-closed" : ""} ${!controlVisibility.scaleLine ? "no-scale-line" : ""}`} />
      <PropertyReportClick />
      <LiveLayerClick />
      <MapPopup />
      <MapContextMenuContainer />
    </InteractionManagerContext.Provider>
  );
}
