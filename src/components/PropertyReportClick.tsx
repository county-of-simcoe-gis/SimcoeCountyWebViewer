"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { useAppStore } from "@/stores/appStore";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Stroke, Fill } from "ol/style";
import { GeoJSON } from "ol/format";
import { getArea } from "ol/sphere";
import { getAxiosClient } from "@/lib/axiosInstance";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { ParcelClickInteraction } from "@/utils/openlayers/ParcelClickInteraction";
import PropertyPopup from "@/components/PropertyPopup";
import config from "@/config.json";

// Parcel URL template for WFS queries
const parcelURLTemplate = (mainURL: string, x: number, y: number) => `${mainURL}&cql_filter=INTERSECTS(geom,%20POINT%20(${x}%20${y}))`;

// Parcel layer style
const parcelLayerStyle = new Style({
  fill: new Fill({
    color: [0, 0, 0, 0.0], // Transparent fill
  }),
  stroke: new Stroke({
    color: [231, 128, 128, 0.8], // Red stroke
    width: 3,
  }),
});

interface PropertyInfo {
  ARN: string;
  Address?: string;
  AssessedValue?: string; // Base64 encoded PNG image (data:image/png;base64,...)
  HasZoning?: boolean;
  WasteCollection?: {
    GarbageDay?: string;
  };
  Other?: {
    BroadbandSpeed?: string;
  };
  pointCoordinates?: number[];
  pointerCoordinates?: number[];
  shareURL?: string;
  area?: number;
  [key: string]: unknown;
}

interface ParcelFeatureProperties {
  arn: string;
  [key: string]: unknown;
}

interface WFSResponse {
  features: Array<{
    properties: ParcelFeatureProperties;
    geometry: unknown;
  }>;
}

export default function PropertyReportClick() {
  const { map, disableParcelClick, isDrawingOrEditing, isCoordinateToolOpen, isMeasuring } = useMapStore();
  const { show: showPopup, hide: hidePopup } = usePopupStore();
  const urlParameters = useAppStore((state) => state.urlParameters);

  const parcelLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const parcelLayerIdRef = useRef<string | null>(null);
  const parcelInteractionRef = useRef<ParcelClickInteraction | null>(null);

  // Check if parcel click should be disabled
  const checkDisableFlags = useCallback(() => {
    return disableParcelClick || isDrawingOrEditing || isCoordinateToolOpen || isMeasuring;
  }, [disableParcelClick, isDrawingOrEditing, isCoordinateToolOpen, isMeasuring]);

  // Initialize parcel layer
  useEffect(() => {
    if (!map || parcelLayerRef.current) return;

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

  // Get share URL with ARN parameter
  const getShareURL = useCallback((arn: string) => {
    let url = window.location.href.replace("#", "");

    if (url.indexOf("?") > 0) {
      // Remove existing ARN parameter if present
      const urlObj = new URL(url);
      urlObj.searchParams.delete("ARN");
      urlObj.searchParams.set("ARN", arn);
      url = urlObj.toString();
    } else {
      url = `${url}?ARN=${arn}`;
    }

    return url;
  }, []);

  // Fetch property information
  const fetchPropertyInfo = useCallback(
    async (arn: string, feature: any, pointerPoint: number[], latLongCoords: number[]): Promise<PropertyInfo> => {
      const propertyReportUrl = (config as any).propertyReportUrl;
      if (!propertyReportUrl) {
        // Return basic info if no property report URL configured
        return {
          ARN: arn,
          pointCoordinates: latLongCoords,
          pointerCoordinates: pointerPoint,
          shareURL: getShareURL(arn),
          area: feature ? getArea(feature.getGeometry()) : 0,
        };
      }

      const infoURL = `${propertyReportUrl}${arn}`;
      const axiosClient = getAxiosClient(infoURL);
      // For internal API routes, the axiosInstance already has baseURL set to /api, so we need to use the path without /api
      const requestPath = infoURL.startsWith("/api/") ? infoURL.replace("/api", "") : infoURL;

      try {
        const response = await axiosClient.get<PropertyInfo>(requestPath);
        const result = response.data;

        return {
          ...result,
          pointerCoordinates: pointerPoint,
          pointCoordinates: latLongCoords,
          shareURL: getShareURL(arn),
          area: feature ? getArea(feature.getGeometry()) : 0,
        };
      } catch (error) {
        console.error("Error fetching property info:", error);
        return {
          ARN: arn,
          pointCoordinates: latLongCoords,
          pointerCoordinates: pointerPoint,
          shareURL: getShareURL(arn),
          area: feature ? getArea(feature.getGeometry()) : 0,
        };
      }
    },
    [getShareURL]
  );

  // Convert Web Mercator to Lat/Long
  const toLatLongFromWebMercator = useCallback((coords: number[]) => {
    const lon = (coords[0] * 180) / 20037508.34;
    const lat = (Math.atan(Math.exp((coords[1] * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
    return [lon, lat];
  }, []);

  // Show property window
  const showPropertyWindow = useCallback(
    async (wfsURL: string, clickEvt: { coordinate: number[]; zoomToFeature?: boolean } | null = null) => {
      try {
        const axiosClient = getAxiosClient(wfsURL);
        const response = await axiosClient.get<WFSResponse>(wfsURL);
        const result = response.data;

        if (!result.features || result.features.length === 0) return;

        const geoJSON = new GeoJSON().readFeatures(result);
        const vectorSource = new VectorSource({ features: geoJSON });

        parcelLayerRef.current?.setSource(vectorSource);

        const feature = geoJSON[0];
        feature.setStyle(parcelLayerStyle);

        const arn = result.features[0].properties.arn;
        feature.setProperties({ arn });

        // Get coordinates
        let pointerPoint: number[];
        let latLongCoords: number[];

        if (clickEvt === null || clickEvt.zoomToFeature) {
          // From URL parameter - zoom to feature
          const extent = feature.getGeometry()?.getExtent();
          if (extent) {
            const centerX = (extent[0] + extent[2]) / 2;
            const centerY = (extent[1] + extent[3]) / 2;
            pointerPoint = [centerX, centerY];
            latLongCoords = toLatLongFromWebMercator(pointerPoint);
            map?.getView().fit(extent, { size: map.getSize() });
          } else {
            return;
          }
        } else {
          pointerPoint = clickEvt.coordinate;
          latLongCoords = toLatLongFromWebMercator(clickEvt.coordinate);
        }

        // Fetch full property information
        const propInfo = await fetchPropertyInfo(arn, feature, pointerPoint, latLongCoords);

        // Show popup with property information
        const handleClose = () => {
          parcelLayerRef.current?.getSource()?.clear();
          hidePopup();
        };

        showPopup(
          pointerPoint,
          <PropertyPopup propInfo={propInfo} feature={feature} onClose={handleClose} onClearParcelLayer={() => parcelLayerRef.current?.getSource()?.clear()} />,
          "Property Information"
        );
      } catch (error) {
        console.error("Error fetching parcel data:", error);
      }
    },
    [map, toLatLongFromWebMercator, fetchPropertyInfo, showPopup, hidePopup]
  );

  // Handle parcel click from interaction
  const handleParcelClick = useCallback(
    (coordinate: number[]) => {
      // Get parcel layer URL from config
      const parcelLayerUrl = (config as any).parcelLayer?.url;
      if (!parcelLayerUrl) {
        console.warn("Parcel layer URL not configured");
        return;
      }

      const parcelURL = parcelURLTemplate(parcelLayerUrl, coordinate[0], coordinate[1]);
      showPropertyWindow(parcelURL, { coordinate });
    },
    [showPropertyWindow]
  );

  // Initialize and manage parcel click interaction
  useEffect(() => {
    if (!map || parcelInteractionRef.current) return;

    // Create parcel click interaction
    const parcelInteraction = new ParcelClickInteraction({
      maxScale: 20000,
      checkDisableFlags,
      checkLayerFilters: ParcelClickInteraction.checkLayersForDisable,
      onParcelClick: (coordinate) => {
        handleParcelClick(coordinate);
      },
    });

    // Add interaction to map
    map.addInteraction(parcelInteraction);
    parcelInteractionRef.current = parcelInteraction;

    return () => {
      if (parcelInteractionRef.current) {
        map.removeInteraction(parcelInteractionRef.current);
        parcelInteractionRef.current = null;
      }
    };
  }, [map, checkDisableFlags, handleParcelClick]);

  // Update interaction callbacks when dependencies change
  useEffect(() => {
    if (!parcelInteractionRef.current) return;

    parcelInteractionRef.current.setDisableFlagsChecker(checkDisableFlags);
    parcelInteractionRef.current.setParcelClickCallback((coordinate) => {
      handleParcelClick(coordinate);
    });
  }, [checkDisableFlags, handleParcelClick]);

  // Handle ARN URL parameter
  useEffect(() => {
    if (!map) return;

    const urlARN = urlParameters.ARN;
    if (urlARN) {
      const parcelLayerUrl = (config as any).parcelLayer?.url;
      if (!parcelLayerUrl) {
        console.warn("Parcel layer URL not configured");
        return;
      }

      const parcelURLARNTemplate = (mainURL: string, arn: string) => `${mainURL}&cql_filter=arn='${arn}'`;
      const parcelARNURL = parcelURLARNTemplate(parcelLayerUrl, urlARN);

      // Small delay to ensure map is fully loaded
      const timer = setTimeout(() => {
        showPropertyWindow(parcelARNURL, { coordinate: [0, 0], zoomToFeature: true });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [map, urlParameters, showPropertyWindow]);

  return null; // This component doesn't render anything directly
}
