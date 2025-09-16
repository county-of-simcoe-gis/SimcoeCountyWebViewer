"use client";

import { useEffect, useRef, useMemo, useCallback, Suspense, lazy } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";

// OpenLayers imports
import "ol/ol.css";
import "@/components/MapContainer.css";
import "@/components/map/controls/MapControls.css";
import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultInteractions, MouseWheelZoom, PinchRotate, DragRotate } from "ol/interaction";
import { ScaleLine, Attribution } from "ol/control";
// Import zone-based control system
import { createZoneControlsFromConfig, ControlConfig } from "@/components/map/controls/MapControlZones";

// Control components will be dynamically imported

// Import basemap components
import BasemapSwitcher from "@/components/BasemapSwitcher";

// Import config
import config from "@/config.json";

// Define dynamic imports for control components
const dynamicControlImports = {
  CurrentLocationButton: () => import("@/components/map/controls/CurrentLocation").then((m) => ({ default: m.CurrentLocationButton })),
  ExtentHistoryButtons: () => import("@/components/map/controls/ExtentHistory").then((m) => ({ default: m.ExtentHistoryButtons })),
  ZoomToExtentButton: () => import("@/components/map/controls/ZoomToExtent").then((m) => ({ default: m.ZoomToExtentButton })),
  GridButton: () => import("@/components/map/controls/Grid").then((m) => ({ default: m.GridButton })),
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

export default function MapContainer() {
  const { isOpen } = useSidebarStore();
  const { emitMapLoaded } = useEventStore();
  const { map, setMap, addLoadedItem, setMapControls, setCurrentExtent, setCurrentZoom, setCurrentCenter, initExtentHistory, saveCurrentExtentToHistory } = useMapStore();
  const { setMapLoading } = useAppStore();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);

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

    // Store map instance and configuration
    mapInstanceRef.current = mapInstance;
    setMap(mapInstance);
    setMapControls(mapControls);

    // Mark map as loaded
    addLoadedItem("map");
    setMapLoading(false);
    emitMapLoaded();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [setMap, setMapControls, addLoadedItem, setMapLoading, emitMapLoaded, setCurrentExtent, setCurrentZoom, setCurrentCenter, initExtentHistory, saveCurrentExtentToHistory]);

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

      gitHubButton: {
        component: GitHubButtonWrapper,
        zone: "top-right",
        order: 1,
        enabled: config.controls?.gitHubButton ?? true,
      },
      basemap: {
        component: BasemapSwitcher,
        zone: "top-right",
        order: 2,
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

  return <div ref={mapRef} id="map" className={`sc-map ${!isOpen ? "sidebar-closed" : ""}`} />;
}
