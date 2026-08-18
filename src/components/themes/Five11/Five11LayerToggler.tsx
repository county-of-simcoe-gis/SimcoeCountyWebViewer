"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Icon, Stroke } from "ol/style";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { useMapStore } from "@/stores/mapStore";
import type { Five11LayerConfig } from "./types";
import { getPublicPath } from "@/utils/getPublicPath";
import type { FeatureCollection } from "geojson";

interface Five11LayerTogglerProps {
  layer: Five11LayerConfig;
  visible: boolean;
  onVisibilityChange: (layerName: string, visible: boolean) => void;
  onLayerIdChange: (layerName: string, layerId: string | null) => void;
}

export default function Five11LayerToggler({ layer, visible, onVisibilityChange, onLayerIdChange }: Five11LayerTogglerProps) {
  const map = useMapStore((state) => state.map);
  const [recordCount, setRecordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const layerIdRef = useRef<string | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const pendingVisibleRef = useRef<boolean>(visible);
  const initCounterRef = useRef(0);

  // Create style based on layer type
  const getLayerStyle = useCallback(() => {
    if (layer.geometryType === "LineString") {
      // Line style for jam and irregularity layers
      return new Style({
        stroke: new Stroke({
          color: "#ff0000",
          width: 4,
        }),
      });
    } else {
      // Icon style for point layers
      return new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: getPublicPath(`/images/five11/${layer.imageName}`),
        }),
      });
    }
  }, [layer.imageName, layer.geometryType]);

  // Initialize layer
  useEffect(() => {
    if (!map) return;

    mountedRef.current = true;
    const abortController = new AbortController();
    const initId = ++initCounterRef.current;

    const initLayer = async () => {
      try {
        setIsLoading(true);

        // Ensure we don't leave an old layer behind (prevents duplicates)
        if (layerIdRef.current) {
          LayerManager.removeLayer(layerIdRef.current);
          layerIdRef.current = null;
          vectorLayerRef.current = null;
          initializedRef.current = false;
        }

        // Fetch GeoJSON data - layer.apiUrl is like "/api/public/map/theme/511/..."
        // publicAxiosInstance baseURL includes /api, so strip /api prefix
        const apiPath = layer.apiUrl.replace(/^\/api/, "");
        const response = await axiosInstance.get<FeatureCollection>(apiPath, { signal: abortController.signal });

        const data = response.data;

        // Discard if this init was superseded or component unmounted
        if (initId !== initCounterRef.current || !mountedRef.current) return;

        // Check if we got valid data
        if (!data || Array.isArray(data) || !data.features) {
          console.warn(`[511] Invalid data structure for ${layer.displayName}`);
          setRecordCount(0);
          setIsLoading(false);
          return;
        }

        // Create vector source
        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(data, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          }),
        });

        // Create vector layer
        const vectorLayer = new VectorLayer({
          source: vectorSource,
          style: getLayerStyle(),
          visible: pendingVisibleRef.current,
        });

        // Set layer properties for identification
        vectorLayer.set("name", layer.layerName);
        vectorLayer.set("tocDisplayName", layer.displayName);
        vectorLayer.set("disableParcelClick", true);
        vectorLayer.set("queryable", true);

        // Add to map via LayerManager
        const layerId = LayerManager.addLayer(vectorLayer, "Themes", layer.displayName, {
          visible: visible,
        });

        // Bail out if LayerManager returned null (map not ready)
        if (!layerId) {
          console.warn(`[511] LayerManager.addLayer returned null for ${layer.displayName}`);
          setRecordCount(0);
          setIsLoading(false);
          return;
        }

        // Discard if this init was superseded or component unmounted during addLayer
        if (initId !== initCounterRef.current || !mountedRef.current) {
          LayerManager.removeLayer(layerId);
          return;
        }

        layerIdRef.current = layerId;
        vectorLayerRef.current = vectorLayer;
        initializedRef.current = true;

        // Apply latest visibility in case it changed during initialization
        LayerManager.setLayerVisibility(layerId, pendingVisibleRef.current);
        vectorLayer.setVisible(pendingVisibleRef.current);

        const actualFeatureCount = vectorSource.getFeatures().length;
        setRecordCount(actualFeatureCount);
        onLayerIdChange(layer.layerName, layerId);
      } catch (error) {
        // Ignore abort/cancel errors (expected on cleanup)
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (axios.isCancel(error)) return;
        console.error(`Error loading 511 layer ${layer.layerName}:`, error);
        setRecordCount(0);
      } finally {
        if (mountedRef.current && initId === initCounterRef.current) {
          setIsLoading(false);
        }
      }
    };

    initLayer();

    // Cleanup
    return () => {
      mountedRef.current = false;
      abortController.abort();
      initializedRef.current = false;
      if (layerIdRef.current) {
        LayerManager.removeLayer(layerIdRef.current);
        onLayerIdChange(layer.layerName, null);
        layerIdRef.current = null;
        vectorLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, layer.apiUrl, layer.layerName, layer.displayName, getLayerStyle, onLayerIdChange]);

  // Update visibility when prop changes
  useEffect(() => {
    pendingVisibleRef.current = visible;

    if (!initializedRef.current || !layerIdRef.current) {
      return;
    }

    LayerManager.setLayerVisibility(layerIdRef.current, visible);

    if (vectorLayerRef.current) {
      vectorLayerRef.current.setVisible(visible);
    }
  }, [visible]);

  const handleToggle = () => {
    onVisibilityChange(layer.layerName, !visible);
  };

  // Determine if this is a line layer (different styling)
  const isLineLayer = layer.geometryType === "LineString";

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex items-center gap-2 flex-1">
        {/* Layer icon */}
        <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${isLineLayer ? "" : ""}`}>
          {isLineLayer ? (
            <div className="w-6 h-1.5 bg-red-500 rounded"></div>
          ) : (
            <Image src={`/images/five11/${layer.imageName}`} alt={layer.displayName} width={32} height={32} className="object-contain" />
          )}
        </div>

        {/* Checkbox */}
        <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={visible} onChange={handleToggle} disabled={isLoading} />

        {/* Label with count */}
        <label className="label-text cursor-pointer flex-1 text-sm" onClick={handleToggle}>
          {layer.displayName} {!isLoading && recordCount > 0 && <span className="text-xs text-base-content/60">({recordCount})</span>}
        </label>

        {/* Loading indicator */}
        {isLoading && <span className="loading loading-spinner loading-xs"></span>}
      </div>
    </div>
  );
}
