"use client";

import { useEffect, useRef } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";

// OpenLayers imports
import "ol/ol.css";
import "./MapContainer.css";
import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultInteractions, MouseWheelZoom, PinchRotate, DragRotate } from "ol/interaction";
import { defaults as defaultControls, ScaleLine, FullScreen, Rotate } from "ol/control";

// Import basemap components
import BasemapSwitcher from "./BasemapSwitcher";

// Import config
import config from "@/config.json";

interface MapContainerProps {
  className?: string;
}

export default function MapContainer({ className = "" }: MapContainerProps) {
  const { isOpen } = useSidebarStore();
  const { emitMapLoaded } = useEventStore();
  const { map, setMap, addLoadedItem, setMapControls, setCurrentExtent, setCurrentZoom, setCurrentCenter } = useMapStore();
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
    const centerCoords = [-8873031.186926253, 5524904.429248115];
    const defaultZoom = 17;
    // const centerCoords = config.centerCoords || [-8878504.68, 5543492.45];
    // const defaultZoom = config.defaultZoom || 10;

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
      controls: defaultControls(),
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
    };

    // Add/remove controls based on configuration
    if (mapControls.scaleLine) {
      mapInstance.addControl(scaleLineControl);
    }

    if (mapControls.fullScreen) {
      mapInstance.addControl(new FullScreen());
    }

    if (mapControls.rotate) {
      mapInstance.addControl(new Rotate());
    }

    // Disable rotate interactions if configured
    if (!mapControls.rotate) {
      const interactions = mapInstance.getInteractions().getArray();
      const pinchRotate = interactions.find((i) => i instanceof PinchRotate);
      const dragRotate = interactions.find((i) => i instanceof DragRotate);

      if (pinchRotate) mapInstance.removeInteraction(pinchRotate);
      if (dragRotate) mapInstance.removeInteraction(dragRotate);
    }

    // Remove zoom control if disabled
    if (!mapControls.zoomInOut) {
      const controls = mapInstance.getControls().getArray();
      const zoomControl = controls.find((c) => c.constructor.name === "Zoom");
      if (zoomControl) mapInstance.removeControl(zoomControl);
    }

    // Remove rotate control if disabled
    if (!mapControls.rotate) {
      const controls = mapInstance.getControls().getArray();
      const rotateControl = controls.find((c) => c instanceof Rotate);
      if (rotateControl) mapInstance.removeControl(rotateControl);
    }

    // Set up map event listeners
    mapInstance.on("moveend", () => {
      const view = mapInstance.getView();
      setCurrentExtent(view.calculateExtent());
      setCurrentZoom(view.getZoom() || 0);
      setCurrentCenter(view.getCenter() || [0, 0]);
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
  }, [setMap, setMapControls, addLoadedItem, setMapLoading, emitMapLoaded, setCurrentExtent, setCurrentZoom, setCurrentCenter]);

  // Debug logging for render
  const shouldShowBasemap = config.controls?.basemap !== false && !!map;

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapRef} id="map" className={`sc-map w-full h-full ${!isOpen ? "sidebar-closed" : ""}`} style={{ minHeight: "400px" }} />

      {/* Basemap Switcher */}
      {shouldShowBasemap && (
        <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 9999, background: "red", padding: "5px" }}>
          <BasemapSwitcher />
        </div>
      )}
    </div>
  );
}
