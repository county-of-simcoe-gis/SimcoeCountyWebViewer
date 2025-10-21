"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./Identify.css";
import { GeoJSON, WKT, EsriJSON } from "ol/format";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import MultiPolygon from "ol/geom/MultiPolygon";
import { useMapStore } from "@/stores/mapStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { useReportsStore } from "@/stores/reportsStore";
import { getAxiosClient } from "@/lib/axiosInstance";
import IdentifyLayer from "@/components/Identify/IdentifyLayer";
import Point from "ol/geom/Point";
import { getCenter } from "ol/extent";
import type TileWMS from "ol/source/TileWMS";
import type ImageWMS from "ol/source/ImageWMS";

export interface IdentifyProps {
  geometry: Geometry;
  layerFilter?: string;
}

export interface IdentifyFeature {
  feature: Feature<Geometry>;
  displayName: string;
  html_url?: string;
}

export interface IdentifyResult {
  name: string;
  displayName: string;
  type: string;
  features: IdentifyFeature[];
  minScale?: number;
  html_url?: string;
}

const Identify: React.FC<IdentifyProps> = ({ geometry, layerFilter }) => {
  const { map } = useMapStore();
  const { getAllLayers } = useLayerManagerStore();
  const [layers, setLayers] = useState<IdentifyResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const hasLoadedRef = React.useRef<boolean>(false);
  const lastGeometryRef = React.useRef<Geometry | null>(null); // Track geometry changes

  // Filter to display name field from a feature
  const getDisplayNameFromFeature = useCallback((feature: Feature<Geometry>): string => {
    // Look for existing fields
    const nameFields = ["name", "display_name", "Name", "Display Name"];
    let displayName = "";

    const displayFieldName = feature.get("displayFieldName");
    if (displayFieldName !== undefined && displayFieldName !== null) {
      nameFields.push(displayFieldName);
    }

    // Try known name fields
    for (const fieldName of nameFields) {
      if (fieldName.substring(0, 1) !== "_") {
        const name = feature.get(fieldName);
        if (name !== undefined) {
          return fieldName;
        }
      }
    }

    // Find first string field
    if (displayName === "") {
      for (const [fieldName, value] of Object.entries(feature.getProperties())) {
        if (fieldName.substring(0, 1) !== "_") {
          if (typeof value === "string" || value instanceof String) {
            return fieldName;
          }
        }
      }
    }

    // Still nothing, so take first field
    if (displayName === "") {
      displayName = Object.keys(feature.getProperties())[0];
    }

    return displayName;
  }, []);

  // Convert any geometry to a Point for querying (used for WMS GetFeatureInfo)
  const queryPoint = useMemo(() => {
    if (geometry instanceof Point) {
      return geometry;
    }
    // For non-point geometries, use the center of the extent as the query point
    const extent = geometry.getExtent();
    const center = getCenter(extent);
    return new Point(center);
  }, [geometry]);

  // Generate WKT string for WFS queries
  const generateWKT = useCallback((geom: Geometry): string => {
    const wktFormat = new WKT();
    return wktFormat.writeGeometry(geom);
  }, []);

  // Generate ESRI JSON for ArcGIS queries
  const generateEsriJSON = useCallback((geom: Geometry): string => {
    const esriFormat = new EsriJSON();
    return JSON.stringify(esriFormat.writeGeometry(geom));
  }, []);

  // Query layers for features
  const refreshLayers = useCallback(async () => {
    if (!map) {
      console.log("Identify: No map available");
      return;
    }

    console.log("Identify: Starting layer refresh");
    setLayers([]);
    setIsLoading(true);

    const allManagedLayers = getAllLayers();
    console.log("Identify: Total managed layers:", allManagedLayers.length);

    let olLayers = allManagedLayers
      .filter((ml) => ml.category === "TOC") // Only query TOC layers
      .map((ml) => ml.layer);

    console.log("Identify: TOC layers found:", olLayers.length);

    // Filter by specific layer if provided
    if (layerFilter) {
      olLayers = olLayers.filter((layer) => layer.get("displayName") === layerFilter);
      console.log("Identify: Layers after filter:", olLayers.length);
    }

    const layerList: IdentifyResult[] = [];
    let queriedCount = 0;

    for (const layer of olLayers) {
      const layerName = layer.get("name");
      const isVisible = layer.getVisible();
      const queryable = layer.get("queryable");

      console.log(`Identify: Checking layer "${layerName}": visible=${isVisible}, queryable=${queryable}`);

      // Only query visible or filtered layers
      if (!isVisible && !layerFilter) {
        console.log(`Identify: Skipping "${layerName}" - not visible`);
        continue;
      }

      // Only skip if explicitly set to false (queryable === false means disabled)
      // By default, all WMS layers support GetFeatureInfo
      if (queryable === false) {
        console.log(`Identify: Skipping "${layerName}" - explicitly disabled (queryable=false)`);
        continue;
      }

      const name = layer.get("name");
      const displayName = layer.get("tocDisplayName") || name;
      const secured = layer.get("secured");
      const minScale = layer.get("minScale");

      const params: Record<string, unknown> = {};
      if (secured) params["useBearerToken"] = secured;

      // Check if this is a non-Point geometry and try WFS query
      let wfsUrl = layer.get("wfsUrl");
      const isArcGISLayer = layer.get("isArcGIS") || false;
      const useGeometryQuery = geometry.getType() !== "Point" || isArcGISLayer;

      // If no explicit WFS URL, try to derive it from the WMS URL
      const source = layer.getSource() as TileWMS | ImageWMS;
      if (!wfsUrl && source && useGeometryQuery) {
        let wmsUrl: string | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sourceAny = source as any;
        if (typeof sourceAny.getUrls === "function") {
          wmsUrl = sourceAny.getUrls()?.[0];
        } else if (typeof sourceAny.getUrl === "function") {
          wmsUrl = sourceAny.getUrl();
        }
        if (wmsUrl && wmsUrl.includes("/wms")) {
          wfsUrl = wmsUrl.replace("/wms", "/wfs");
        }
      }

      // Try WFS query for non-Point geometries
      if (wfsUrl && useGeometryQuery) {
        try {
          queriedCount++;
          let queryUrl = wfsUrl;

          if (isArcGISLayer) {
            // Use ESRI JSON for ArcGIS layers
            const esriGeometry = generateEsriJSON(geometry);
            const mapSize = map.getSize() || [0, 0];
            const resolution = `${mapSize[0]},${mapSize[1]},96`;
            const extent = map.getView().calculateExtent();
            const geometryType = geometry.getType() !== "Point" ? "esriGeometryPolygon" : "esriGeometryPoint";

            queryUrl = queryUrl
              .replace("#GEOMETRY#", encodeURIComponent(esriGeometry))
              .replace("#GEOMETRYTYPE#", geometryType)
              .replace("#TOLERANCE#", "3")
              .replace("#EXTENT#", extent.join(","))
              .replace("#RESOLUTION#", resolution);
          } else {
            // Build proper WFS GetFeature request with CQL filter
            const baseUrl = wfsUrl.split("?")[0];

            // Build CQL filter for geometry intersection
            let cqlFilter: string;
            if (geometry instanceof MultiPolygon) {
              // For MultiPolygon, create OR query for each polygon
              const polygons = geometry.getPolygons();
              const intersectQueries = polygons.map((poly) => {
                const wkt = generateWKT(poly);
                return `INTERSECTS(geom,${wkt})`;
              });
              cqlFilter = intersectQueries.join(" OR ");
            } else {
              const wkt = generateWKT(geometry);
              cqlFilter = `INTERSECTS(geom,${wkt})`;
            }

            // Build WFS GetFeature URL with proper parameters
            const params = new URLSearchParams({
              service: "wfs",
              version: "2.0.0",
              request: "GetFeature",
              typeNames: name, // Use the layer name from the layer
              outputFormat: "application/json",
              cql_filter: cqlFilter,
            });

            queryUrl = `${baseUrl}?${params.toString()}`;
          }

          console.log(`Identify: Querying "${layerName}" with WFS at URL:`, queryUrl);

          const axiosClient = getAxiosClient(queryUrl);
          const response = await axiosClient.get(queryUrl, { ...params });

          console.log(`Identify: WFS Response from "${layerName}":`, response.data);

          let result = response.data;

          // Try to parse if it's a string
          if (typeof result === "string") {
            try {
              result = JSON.parse(result);
            } catch {
              console.log(`Identify: Failed to parse WFS response from "${layerName}"`);
            }
          }

          // Parse GeoJSON features
          if (result) {
            const featureList = new GeoJSON().readFeatures(result);

            console.log(`Identify: Found ${featureList.length} features in "${layerName}" via WFS`);

            if (featureList.length > 0) {
              const displayNameField = getDisplayNameFromFeature(featureList[0]);
              const features: IdentifyFeature[] = featureList.map((feature) => ({
                feature,
                displayName: displayNameField,
              }));

              layerList.push({
                name,
                displayName,
                type: displayName,
                features,
                minScale,
              });
              continue; // Skip WMS query if WFS succeeded
            }
          }
        } catch (error) {
          console.warn(`Identify: WFS query failed for "${layerName}", falling back to WMS:`, error);
          // Fall through to WMS query
        }
      }

      // Fallback to WMS GetFeatureInfo query
      if (!source) {
        console.log(`Identify: Skipping "${layerName}" - no source`);
        continue;
      }

      if (!source.getFeatureInfoUrl || typeof source.getFeatureInfoUrl !== "function") {
        console.log(`Identify: Skipping "${layerName}" - source doesn't have getFeatureInfoUrl method`);
        continue;
      }

      try {
        queriedCount++;
        const infoFormat = layer.get("INFO_FORMAT") || "application/json";
        const getInfoOption = { INFO_FORMAT: infoFormat };

        const url = source.getFeatureInfoUrl(queryPoint.getCoordinates(), map.getView().getResolution()!, "EPSG:3857", getInfoOption);

        if (!url) {
          console.log(`Identify: No URL generated for "${layerName}"`);
          continue;
        }

        const fullUrl = `${url}&feature_count=1000000`;
        console.log(`Identify: Querying "${layerName}" with WMS at URL:`, fullUrl);

        const axiosClient = getAxiosClient(fullUrl);
        const response = await axiosClient.get(fullUrl, { ...params });

        console.log(`Identify: Response from "${layerName}":`, response.data);

        let result = response.data;

        // Try to parse if it's a string
        if (typeof result === "string") {
          try {
            result = JSON.parse(result);
          } catch {
            console.log(`Identify: Failed to parse response from "${layerName}"`);
            continue;
          }
        }

        // Parse GeoJSON features
        const featureList = new GeoJSON().readFeatures(result);

        console.log(`Identify: Found ${featureList.length} features in "${layerName}"`);

        if (featureList.length === 0) continue;

        const displayNameField = getDisplayNameFromFeature(featureList[0]);
        const features: IdentifyFeature[] = featureList.map((feature) => ({
          feature,
          displayName: displayNameField,
        }));

        layerList.push({
          name,
          displayName,
          type: displayName,
          features,
          minScale,
        });
      } catch (error) {
        console.error(`Identify: Error querying layer ${name}:`, error);
      }
    }

    console.log(`Identify: Queried ${queriedCount} layers, found results in ${layerList.length} layers`);
    setLayers(layerList);
    setIsLoading(false);
  }, [map, geometry, queryPoint, layerFilter, getAllLayers, getDisplayNameFromFeature, generateWKT, generateEsriJSON]);

  // Refresh layers when component mounts or geometry changes
  useEffect(() => {
    // Check if this is a new geometry (or first load)
    const isNewGeometry = lastGeometryRef.current !== geometry;

    // Only fetch once per geometry
    if (!hasLoadedRef.current || isNewGeometry) {
      hasLoadedRef.current = true;
      lastGeometryRef.current = geometry;
      refreshLayers();
    }
  }, [geometry, refreshLayers]);

  const clearIdentify = useCallback(() => {
    useReportsStore.getState().clearReport();
  }, []);

  // Get debug info
  const debugInfo = useMemo(() => {
    if (!map) return null;
    const allManagedLayers = getAllLayers();
    const tocLayers = allManagedLayers.filter((ml) => ml.category === "TOC");
    const visibleLayers = tocLayers.filter((ml) => ml.layer.getVisible());
    // Count layers that are NOT explicitly disabled (queryable !== false)
    const queryableLayers = visibleLayers.filter((ml) => ml.layer.get("queryable") !== false);

    return {
      total: tocLayers.length,
      visible: visibleLayers.length,
      queryable: queryableLayers.length,
    };
  }, [map, getAllLayers]);

  return (
    <div className="sc-identify-container-wrapper">
      <button className="sc-button sc-identify-clear-button" onClick={clearIdentify}>
        Clear Results
      </button>

      {/* Debug Info */}
      {debugInfo && (
        <div className="sc-identify-debug-info">
          <div>
            <strong>Layers:</strong> {debugInfo.total} total, {debugInfo.visible} visible, {debugInfo.queryable} queryable
          </div>
          {debugInfo.visible === 0 && <div style={{ color: "#ff6b6b", marginTop: "5px", fontSize: "11px" }}>⚠️ No visible layers found. Turn on some layers to use identify.</div>}
        </div>
      )}

      <div className={layers.length === 0 && !isLoading ? "sc-identify-loading" : "sc-hidden"}>No features were selected. Please try again.</div>
      <div className={isLoading ? "sc-identify-loading" : "sc-hidden"}>
        <div className="sc-identify-spinner" />
        <div>Loading...</div>
      </div>
      <div className={layers.length === 0 ? "sc-hidden" : "sc-identify-container"}>
        {layers.map((layer, idx) => (
          <IdentifyLayer key={`${layer.name}-${idx}`} layer={layer} expanded={layers.length <= 5} />
        ))}
      </div>
    </div>
  );
};

export default Identify;
