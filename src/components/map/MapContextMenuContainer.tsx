"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { MapContextMenu, ContextMenuItem } from "./MapContextMenu";
import { useMapStore } from "@/stores/mapStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useReportsStore } from "@/stores/reportsStore";
import { usePopupStore } from "@/stores/popupStore";
import { useMyMapsStore, createMyMapsItem } from "@/stores/myMapsStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { useInteractionManager } from "@/components/map/MapContainer";
import { useAppStore } from "@/stores/appStore";
import { toLonLat } from "ol/proj";
import { FaFileAlt, FaMapMarkerAlt, FaExclamationTriangle, FaInfoCircle, FaGoogle, FaEllipsisH, FaCompressArrowsAlt } from "react-icons/fa";
import { FaMapLocationDot } from "react-icons/fa6";
import { Vector as VectorLayer } from "ol/layer";
import { getPublicPath } from "@/utils/getPublicPath";
import { Vector as VectorSource } from "ol/source";
import { Point } from "ol/geom";
import { Feature } from "ol";
import { Style, Icon, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import { showFeedbackWindow } from "@/utils/mapHelpers";
import { featureToGeoJSON, styleToJSON } from "@/utils/myMapsHelpers";
import { setStorageItem } from "@/utils/storage";
import { useEventStore } from "@/stores/eventStore";
import { useToastStore } from "@/hooks/useToast";
import { activateTab } from "@/utils/helpersUI";
import Identify from "@/components/Identify/Identify";

export const MapContextMenuContainer: React.FC = () => {
  const map = useMapStore((s) => s.map);
  const config = useAppStore((state) => state.config);
  const openSidebar = useSidebarStore((s) => s.openSidebar);
  const setActiveTabByName = useSidebarStore((s) => s.setActiveTabByName);
  const closeSidebar = useSidebarStore((s) => s.closeSidebar);
  const setReport = useReportsStore((s) => s.setReport);
  const addItem = useMyMapsStore((s) => s.addItem);
  const drawColor = useMyMapsStore((s) => s.drawColor);
  const { registerHandler, unregisterHandler } = useInteractionManager();
  const [menuState, setMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    coordinate: number[];
  } | null>(null);

  const coordinateRef = useRef<number[]>([0, 0]);
  const identifyIconLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const identifyIconLayerIdRef = useRef<string | null>(null);

  // Handle context menu actions
  const handlePropertyReport = useCallback(() => {
    // Delegate to PropertyReportClick via the popup store (no scale constraint)
    usePopupStore.getState().requestPropertyReport(coordinateRef.current, true);
  }, []);

  const handleAddMarker = useCallback(() => {
    if (!map) return;

    const coordinate = coordinateRef.current;

    // Convert coordinates to lat/lon for the label
    const lonLat = toLonLat(coordinate);
    const label = `${lonLat[1].toFixed(6)}, ${lonLat[0].toFixed(6)}`;

    // Create a point feature at the clicked location
    const point = new Point(coordinate);
    const feature = new Feature(point);

    // Create a proper circle style using the current drawing color
    const color = drawColor || "#e809e5";
    const pointStyle = new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({
          color: color,
        }),
        stroke: new Stroke({
          color: "#ffffff",
          width: 2,
        }),
      }),
    });

    feature.setStyle(pointStyle);

    // Create MyMaps item using the helper function
    const myMapsItem = createMyMapsItem(feature, "Point", label, styleToJSON(pointStyle));

    // Set the featureGeoJSON from the actual feature
    myMapsItem.featureGeoJSON = featureToGeoJSON(feature);

    // Add item to MyMaps store
    addItem(myMapsItem);

    // Notify MyMaps drawing layer and open the MyMaps panel
    useEventStore.getState().emit("mymap-item-created", { item: myMapsItem });
    activateTab("mymaps");
    useToastStore.getState().addToast("Marker added to My Maps", "success");
  }, [map, addItem, drawColor]);

  const handleReportProblem = useCallback(() => {
    const feedbackUrl = config?.feedbackUrl || "https://opengis.simcoe.ca/feedback";
    showFeedbackWindow(map, feedbackUrl, { title: "Report a Problem", reportProblem: true });
  }, [map, config?.feedbackUrl]);

  const handleIdentify = useCallback(() => {
    if (!map || !identifyIconLayerRef.current) return;

    const coordinate = coordinateRef.current;

    // Clear and remove the icon layer
    const source = identifyIconLayerRef.current.getSource();
    if (source) {
      source.clear();
    }

    // Create a point feature at the clicked location
    const point = new Point(coordinate);
    const feature = new Feature(point);

    // Add the feature to the layer
    if (source) {
      source.addFeature(feature);
    }

    // Remove the layer after 3 seconds
    setTimeout(() => {
      if (identifyIconLayerRef.current) {
        const source = identifyIconLayerRef.current.getSource();
        if (source) {
          source.clear();
        }
      }
    }, 3000);

    // Generate report content
    const reportId = `identify-${Date.now()}`;
    setReport({
      id: reportId,
      title: "Identify Results",
      content: <Identify geometry={point} />,
      createdAt: new Date(),
    });

    // Open sidebar and switch to reports tab
    openSidebar();
    setActiveTabByName("reports");
  }, [map, setReport, openSidebar, setActiveTabByName]);


  const handleGoogleMaps = useCallback(() => {
    const lonLat = toLonLat(coordinateRef.current);
    const url = `https://www.google.com/maps?q=${lonLat[1]},${lonLat[0]}`;
    window.open(url, "_blank");
  }, []);

  const handleMore = useCallback(() => {
    // Close sidebar and open More menu anchored to the slim sidebar button
    closeSidebar();
    const { isMoreMenuOpen, toggleMoreMenuFromSidebar } = useSidebarStore.getState();
    if (!isMoreMenuOpen) toggleMoreMenuFromSidebar();
  }, [closeSidebar]);

  const handleSwitchToBasic = useCallback(() => {
    closeSidebar();
  }, [closeSidebar]);

  const handleSaveMapExtent = useCallback(() => {
    if (!map) return;
    const view = map.getView();
    const extent = view.calculateExtent(map.getSize());
    try {
      setStorageItem("Map Extent", JSON.stringify(extent));
    } catch {
      /* ignore */
    }
  }, [map]);

  // Get menu items based on config
  const getMenuItems = useCallback((): ContextMenuItem[] => {
    const visibility = config?.rightClickMenuVisibility || {};

    // Check if user is on mobile
    const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    return [
      {
        id: "sc-floating-menu-basic-mode",
        label: "Switch To Basic",
        icon: <FaCompressArrowsAlt />,
        visible: !isMobile && visibility["sc-floating-menu-basic-mode"] !== false,
        onClick: handleSwitchToBasic,
      },
      {
        id: "sc-floating-menu-property-click",
        label: "Property Report",
        icon: <FaFileAlt />,
        visible: visibility["sc-floating-menu-property-click"] !== false,
        onClick: handlePropertyReport,
      },
      {
        id: "sc-floating-menu-add-mymaps",
        label: "Add Marker Point",
        icon: <FaMapMarkerAlt />,
        visible: visibility["sc-floating-menu-add-mymaps"] !== false,
        onClick: handleAddMarker,
      },
      {
        id: "sc-floating-menu-report-problem",
        label: "Report a problem",
        icon: <FaExclamationTriangle />,
        visible: visibility["sc-floating-menu-report-problem"] !== false,
        onClick: handleReportProblem,
      },
      {
        id: "sc-floating-menu-identify",
        label: "Identify",
        icon: <FaInfoCircle />,
        visible: visibility["sc-floating-menu-identify"] !== false,
        onClick: handleIdentify,
      },
      {
        id: "sc-floating-menu-google-maps",
        label: "View in Google Maps",
        icon: <FaGoogle />,
        visible: visibility["sc-floating-menu-google-maps"] === true,
        onClick: handleGoogleMaps,
      },
      {
        id: "sc-floating-menu-save-map-extent",
        label: "Save as Default Extent",
        icon: <FaMapLocationDot />,
        visible: visibility["sc-floating-menu-save-map-extent"] !== false,
        onClick: handleSaveMapExtent,
      },
      {
        id: "sc-floating-menu-more",
        label: "More...",
        icon: <FaEllipsisH />,
        visible: visibility["sc-floating-menu-more"] !== false,
        onClick: handleMore,
      },
    ];
  }, [config, handlePropertyReport, handleAddMarker, handleReportProblem, handleIdentify, handleGoogleMaps, handleSaveMapExtent, handleMore, handleSwitchToBasic]);

  // Handle context menu display
  const handleContextMenu = useCallback(
    (coordinate: number[], _pixel: number[], event: unknown) => {
      // Check if right-click menu is disabled via config
      if (config?.disableRightClickMenu) return;

      coordinateRef.current = coordinate;

      // Get the page coordinates from the original event
      const mapEvent = event as { originalEvent?: MouseEvent };
      const originalEvent = mapEvent.originalEvent;

      setMenuState({
        visible: true,
        x: originalEvent.pageX,
        y: originalEvent.pageY,
        coordinate,
      });
    },
    [config?.disableRightClickMenu],
  );

  // Close menu
  const handleCloseMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  // Check if context menu should be disabled
  const checkDisableFlags = useCallback(() => {
    return useMapStore.getState().isToolActive();
  }, []);

  // Initialize identify icon layer
  useEffect(() => {
    if (!map || identifyIconLayerRef.current) return;

    // Create a style for the identify icon
    const identifyStyle = new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: getPublicPath("/images/map-marker.png"),
        scale: 1,
      }),
    });

    // Create the identify icon layer
    const identifyIconLayer = new VectorLayer({
      source: new VectorSource(),
      style: identifyStyle,
    });

    // Add layer to map using LayerManager
    const layerId = LayerManager.addLayer(identifyIconLayer, "Graphics", "Identify Icon", {
      index: 999,
      metadata: {
        isIdentifyLayer: true,
      },
    });

    identifyIconLayerRef.current = identifyIconLayer;
    identifyIconLayerIdRef.current = layerId;

    return () => {
      if (identifyIconLayerIdRef.current) {
        LayerManager.removeLayer(identifyIconLayerIdRef.current);
        identifyIconLayerIdRef.current = null;
      }
      identifyIconLayerRef.current = null;
    };
  }, [map]);

  // Register context menu handler using new system
  useEffect(() => {
    if (!map) return;

    // Register handler with MapContainer
    registerHandler({
      id: "context-menu",
      eventType: "contextmenu",
      priority: 100, // Standard priority
      conditions: {
        checkDisableFlags,
      },
      handler: async (coordinate, pixel, event) => {
        // Handle context menu display
        handleContextMenu(coordinate, pixel, event);
        // Note: This handler shows its own menu for now
      },
    });

    return () => {
      unregisterHandler("context-menu");
    };
  }, [map, handleContextMenu, checkDisableFlags, registerHandler, unregisterHandler]);

  if (!menuState?.visible) {
    return null;
  }

  return <MapContextMenu x={menuState.x} y={menuState.y} items={getMenuItems()} onClose={handleCloseMenu} showHeader={config?.showFloatingMenuHeader || false} title="Map Menu" />;
};
