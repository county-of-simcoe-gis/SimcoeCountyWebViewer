"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { MapContextMenu, ContextMenuItem } from "./MapContextMenu";
import { useMapStore } from "@/stores/mapStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useReportsStore } from "@/stores/reportsStore";
import { usePopupStore } from "@/stores/popupStore";
import { useMyMapsStore, createMyMapsItem } from "@/stores/myMapsStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { useInteractionManager } from "@/components/MapContainer";
import { useAppStore } from "@/stores/appStore";
import { toLonLat } from "ol/proj";
import { FaFileAlt, FaMapMarkerAlt, FaExclamationTriangle, FaInfoCircle, FaGoogle, FaEllipsisH, FaCompressArrowsAlt } from "react-icons/fa";
import { Vector as VectorLayer } from "ol/layer";
import { getPublicPath } from "@/utils/getPublicPath";
import { Vector as VectorSource } from "ol/source";
import { Point } from "ol/geom";
import { Feature } from "ol";
import { Style, Icon, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import { GeoJSON } from "ol/format";
import { getArea } from "ol/sphere";
import { getAxiosClient } from "@/lib/axiosInstance";
import { showFeedbackWindow } from "@/utils/mapHelpers";
import { featureToGeoJSON } from "@/utils/myMapsHelpers";
import { getHighlightStyles } from "@/utils/highlightStyles";
import Identify from "@/components/Identify/Identify";
import ResultsPopup, { Result, createPropertyResult, createCondoResult } from "@/components/ResultsPopup";
import { getAxiosClient as getAxiosClientUtil } from "@/lib/axiosInstance";

export const MapContextMenuContainer: React.FC = () => {
  const map = useMapStore((s) => s.map);
  const config = useAppStore((state) => state.config);
  const openSidebar = useSidebarStore((s) => s.openSidebar);
  const setActiveTabByName = useSidebarStore((s) => s.setActiveTabByName);
  const closeSidebar = useSidebarStore((s) => s.closeSidebar);
  const setReport = useReportsStore((s) => s.setReport);
  const showPopup = usePopupStore((s) => s.show);
  const hidePopup = usePopupStore((s) => s.hide);
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
  const parcelLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const parcelLayerIdRef = useRef<string | null>(null);

  // Handle context menu actions
  const handlePropertyReport = useCallback(async () => {
    console.log("Property Report clicked at:", coordinateRef.current);

    const coordinate = coordinateRef.current;
    const parcelLayerUrl = config?.parcelLayer?.url;

    if (!parcelLayerUrl) {
      console.warn("Parcel layer URL not configured");
      return;
    }

    // Parcel layer style (configurable via featureHighlitStyles)
    const { parcel: parcelLayerStyle } = getHighlightStyles();

    try {
      // Build WFS query URL
      const parcelURL = `${parcelLayerUrl}&cql_filter=INTERSECTS(geom,%20POINT%20(${coordinate[0]}%20${coordinate[1]}))`;

      const axiosClient = getAxiosClient(parcelURL);
      const response = await axiosClient.get(parcelURL);
      const result = response.data;

      if (!result.features || result.features.length === 0) {
        console.log("No parcel found at this location");
        return;
      }

      // Parse the GeoJSON features
      const geoJSON = new GeoJSON().readFeatures(result);
      const vectorSource = new VectorSource({ features: geoJSON });
      parcelLayerRef.current?.setSource(vectorSource);

      const feature = geoJSON[0];
      feature.setStyle(parcelLayerStyle);

      const arn = result.features[0].properties.arn;
      feature.setProperties({ arn });

      // Convert Web Mercator to Lat/Long
      const toLatLongFromWebMercator = (coords: number[]) => {
        const lon = (coords[0] * 180) / 20037508.34;
        const lat = (Math.atan(Math.exp((coords[1] * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
        return [lon, lat];
      };

      const latLongCoords = toLatLongFromWebMercator(coordinate);

      // Get share URL with ARN parameter
      const getShareURL = (arn: string) => {
        let url = window.location.href.replace("#", "");
        if (url.indexOf("?") > 0) {
          const urlObj = new URL(url);
          urlObj.searchParams.delete("ARN");
          urlObj.searchParams.set("ARN", arn);
          url = urlObj.toString();
        } else {
          url = `${url}?ARN=${arn}`;
        }
        return url;
      };

      // Fetch property information
      let propInfo: Record<string, unknown> = {
        ARN: arn,
        pointCoordinates: latLongCoords,
        pointerCoordinates: coordinate,
        shareURL: getShareURL(arn),
        area: feature && feature.getGeometry() ? getArea(feature.getGeometry()!) : 0,
      };

      const propertyReportUrl = config?.propertyReportUrl;
      if (propertyReportUrl) {
        const infoURL = `${propertyReportUrl}${arn}`;
        const infoClient = getAxiosClient(infoURL);
        const requestPath = infoURL.startsWith("/api/") ? infoURL.replace("/api", "") : infoURL;

        try {
          const infoResponse = await infoClient.get(requestPath);
          propInfo = {
            ...infoResponse.data,
            pointerCoordinates: coordinate,
            pointCoordinates: latLongCoords,
            shareURL: getShareURL(arn),
            area: feature && feature.getGeometry() ? getArea(feature.getGeometry()!) : 0,
          };
        } catch (error) {
          console.error("Error fetching property info:", error);
        }
      }

      // Collect all results for unified popup
      const results: Result[] = [];

      const handleClose = () => {
        parcelLayerRef.current?.getSource()?.clear();
        hidePopup();
      };

      // Helper function to fetch property info for a given ARN
      const fetchPropInfo = async (childArn: string) => {
        let childPropInfo: Record<string, unknown> = {
          ARN: childArn,
          pointCoordinates: latLongCoords,
          pointerCoordinates: coordinate,
          shareURL: getShareURL(childArn),
          area: feature && feature.getGeometry() ? getArea(feature.getGeometry()!) : 0,
        };

        const propertyReportUrl = config?.propertyReportUrl;
        if (propertyReportUrl) {
          const infoURL = `${propertyReportUrl}${childArn}`;
          const infoClient = getAxiosClient(infoURL);
          const requestPath = infoURL.startsWith("/api/") ? infoURL.replace("/api", "") : infoURL;

          try {
            const infoResponse = await infoClient.get(requestPath);
            childPropInfo = {
              ...infoResponse.data,
              pointerCoordinates: coordinate,
              pointCoordinates: latLongCoords,
              shareURL: getShareURL(childArn),
              area: feature && feature.getGeometry() ? getArea(feature.getGeometry()!) : 0,
            };
          } catch (error) {
            console.error("Error fetching child property info:", error);
          }
        }

        return childPropInfo;
      };

      // Check if this is a condo parent ARN (20 characters)
      if (arn.length === 20) {
        // Fetch all condo children
        try {
          const apiUrl = `/api/public/reports/condo-children/${arn}`;
          const client = getAxiosClientUtil(apiUrl);
          const requestPath = apiUrl.startsWith("/api/") ? apiUrl.replace("/api", "") : apiUrl;
          const condoResponse = await client.get(requestPath);

          if (Array.isArray(condoResponse.data) && condoResponse.data.length > 0) {
            // Add each condo unit as a result
            condoResponse.data.forEach((unit: { ARN: string; UnitNumber: string; Address: string }) => {
              results.push(createCondoResult(unit.ARN, unit.UnitNumber, unit.Address, feature));
            });
          }
        } catch (error) {
          console.error("Error fetching condo children:", error);
        }
      } else {
        // Regular property
        results.push(createPropertyResult(arn, propInfo.Address || "", feature, propInfo));
      }

      // Show unified popup with all results
      if (results.length > 0) {
        showPopup(
          coordinate,
          <ResultsPopup
            results={results}
            onClose={handleClose}
            onClearParcelLayer={() => parcelLayerRef.current?.getSource()?.clear()}
            onSelectResult={async (result) => {
              // Lazy load property info for condo units
              if (result.type === "condo" && !result.data.propInfo) {
                const propInfo = await fetchPropInfo(result.data.ARN);
                result.data.propInfo = propInfo;
                result.data.feature = feature;
              }
            }}
          />,
          results.length > 1 ? `Results (${results.length})` : "Property Information",
          "Parcel",
        );
      }
    } catch (error) {
      console.error("Error fetching parcel data:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPopup, hidePopup]);

  const handleAddMarker = useCallback(() => {
    console.log("Add Marker clicked at:", coordinateRef.current);

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
    const myMapsItem = createMyMapsItem(feature, "Point", label, undefined);

    // Set the featureGeoJSON from the actual feature
    myMapsItem.featureGeoJSON = featureToGeoJSON(feature);

    // Set the style directly as a Style object for proper rendering
    myMapsItem.style = pointStyle;

    // Add item to MyMaps store
    addItem(myMapsItem);

    console.log("Point marker added to MyMaps at:", coordinate, "with label:", label);
  }, [map, addItem, drawColor]);

  const handleReportProblem = useCallback(() => {
    const feedbackUrl = config?.feedbackUrl || "https://opengis.simcoe.ca/feedback";
    showFeedbackWindow(map, feedbackUrl, { title: "Report a Problem", reportProblem: true });
  }, [map, config?.feedbackUrl]);

  const handleIdentify = useCallback(() => {
    if (!map || !identifyIconLayerRef.current) return;

    const coordinate = coordinateRef.current;
    console.log("Identify clicked at:", coordinate);

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
    console.log("More options clicked at:", coordinateRef.current);
    // Close sidebar and open More menu
    closeSidebar();
    const { openMoreMenu } = useSidebarStore.getState();
    openMoreMenu();
  }, [closeSidebar]);

  const handleSwitchToBasic = useCallback(() => {
    console.log("Switch to basic mode - collapsing sidebar");
    closeSidebar();
  }, [closeSidebar]);

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
        id: "sc-floating-menu-more",
        label: "More...",
        icon: <FaEllipsisH />,
        visible: visibility["sc-floating-menu-more"] !== false,
        onClick: handleMore,
      },
    ];
  }, [config, handlePropertyReport, handleAddMarker, handleReportProblem, handleIdentify, handleGoogleMaps, handleMore, handleSwitchToBasic]);

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
    return useMapStore.getState().checkGlobalDisable();
  }, []);

  // Initialize parcel layer
  useEffect(() => {
    if (!map || parcelLayerRef.current) return;

    const parcelLayerStyle = new Style({
      fill: new Fill({
        color: [0, 0, 0, 0.0],
      }),
      stroke: new Stroke({
        color: [231, 128, 128, 0.8],
        width: 3,
      }),
    });

    const parcelLayer = new VectorLayer({
      style: parcelLayerStyle,
      source: new VectorSource(),
    });

    const parcelLayerId = LayerManager.addLayer(parcelLayer, "Graphics", "Parcel Highlight", {
      index: 500,
      metadata: {
        isParcelLayer: true,
      },
    });

    parcelLayerRef.current = parcelLayer;
    parcelLayerIdRef.current = parcelLayerId;

    return () => {
      if (parcelLayerIdRef.current) {
        LayerManager.removeLayer(parcelLayerIdRef.current);
        parcelLayerIdRef.current = null;
      }
      parcelLayerRef.current = null;
    };
  }, [map]);

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
