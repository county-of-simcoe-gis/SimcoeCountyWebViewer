"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { GeoJSON, WKT } from "ol/format";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import { geometryToEsriJSON, getEsriGeometryType } from "@/utils/identifyGeometry";
import MultiPolygon from "ol/geom/MultiPolygon";
import { useMapStore } from "@/stores/mapStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";
import { getAxiosClient } from "@/lib/axiosInstance";
import { getAccessToken } from "@/utils/auth";
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
  const map = useMapStore((s) => s.map);
  const getAllLayers = useLayerManagerStore((s) => s.getAllLayers);
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

  // Query layers for features
  const refreshLayers = useCallback(async () => {
    if (!map) {
      return;
    }

    setLayers([]);
    setIsLoading(true);

    const allManagedLayers = getAllLayers();

    let olLayers = allManagedLayers
      .filter((ml) => ml.category === "TOC" || ml.category === "Themes") // Query TOC and Theme layers
      .map((ml) => ml.layer);

    // Filter by specific layer if provided
    if (layerFilter) {
      olLayers = olLayers.filter((layer) => layer.get("displayName") === layerFilter);
    }

    const layerList: IdentifyResult[] = [];

    for (const layer of olLayers) {
      const layerName = layer.get("name");
      const isVisible = layer.getVisible();
      const queryable = layer.get("queryable");

      // Only query visible or filtered layers
      if (!isVisible && !layerFilter) {
        continue;
      }

      // Only skip if explicitly set to false (queryable === false means disabled)
      // By default, all WMS layers support GetFeatureInfo
      if (queryable === false) {
        continue;
      }

      const name = layer.get("name");
      const displayName = layer.get("tocDisplayName") || name;
      const secured = layer.get("secured");
      const minScale = layer.get("minScale");
      const isArcGISLayer = layer.get("isArcGIS") || false;

      // Build axios config with auth headers for secured GeoServer layers
      // ArcGIS layers use URL-based tokens instead of Bearer headers
      const axiosConfig: Record<string, unknown> = {};
      if (secured && !isArcGISLayer) {
        const token = await getAccessToken();
        if (token) {
          axiosConfig.headers = { Authorization: `Bearer ${token}` };
        }
      }

      // Check if this is a non-Point geometry and try WFS query
      let wfsUrl = layer.get("wfsUrl");
      const useGeometryQuery = geometry.getType() !== "Point" || isArcGISLayer;

      // If no explicit WFS URL, try to derive it from the WMS URL
      const source = layer.getSource() as TileWMS | ImageWMS;
      if (!wfsUrl && source && useGeometryQuery) {
        let wmsUrl: string | undefined;
        const sourceAny = source as unknown as { getUrls?: () => string[] | undefined; getUrl?: () => string | undefined };
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
          let queryUrl = wfsUrl;

          if (isArcGISLayer) {
            // Use ESRI JSON for ArcGIS layers
            const esriGeometry = geometryToEsriJSON(geometry);
            const mapSize = map.getSize() || [0, 0];
            const resolution = `${mapSize[0]},${mapSize[1]},96`;
            const extent = map.getView().calculateExtent();
            const geometryType = getEsriGeometryType(geometry);

            queryUrl = queryUrl
              .replace("#GEOMETRY#", encodeURIComponent(esriGeometry))
              .replace("#GEOMETRYTYPE#", geometryType)
              .replace("#TOLERANCE#", "3")
              .replace("#EXTENT#", extent.join(","))
              .replace("#RESOLUTION#", resolution);

            // For secured ArcGIS layers, ensure the identify URL has a fresh token
            if (secured) {
              const freshToken = useArcGISTokenStore.getState().token;
              if (freshToken) {
                if (/[?&]token=[^&]*/i.test(queryUrl)) {
                  queryUrl = queryUrl.replace(/([?&])token=[^&]*/i, `$1token=${freshToken}`);
                } else {
                  queryUrl += `&token=${freshToken}`;
                }
              }
            }
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

          const axiosClient = getAxiosClient(queryUrl);
          const response = await axiosClient.get(queryUrl, { ...axiosConfig });

          let result = response.data;

          // Try to parse if it's a string
          if (typeof result === "string") {
            try {
              result = JSON.parse(result);
            } catch {
              console.warn(`Identify: Failed to parse WFS response from "${layerName}"`);
            }
          }

          // Parse features from response
          if (result) {
            let featureList: Feature<Geometry>[];

            if (isArcGISLayer && result.results) {
              // ArcGIS Identify returns { results: [...] } — convert to OL features
              featureList = [];
              for (const esriResult of result.results) {
                try {
                  const esriGeom = esriResult.geometry;
                  const attrs = esriResult.attributes;
                  if (!esriGeom) continue;

                  let geoJsonGeom: Record<string, unknown> | undefined;
                  if (esriResult.geometryType === "esriGeometryPoint") {
                    geoJsonGeom = { type: "Point", coordinates: [esriGeom.x, esriGeom.y] };
                  } else if (esriResult.geometryType === "esriGeometryPolygon") {
                    geoJsonGeom = { type: "Polygon", coordinates: esriGeom.rings };
                  } else if (esriResult.geometryType === "esriGeometryPolyline") {
                    geoJsonGeom = { type: "MultiLineString", coordinates: esriGeom.paths };
                  } else {
                    continue;
                  }

                  const geoJsonFeature = { type: "Feature", geometry: geoJsonGeom, properties: attrs || {} };
                  const parsed = new GeoJSON().readFeature(geoJsonFeature, {
                    dataProjection: "EPSG:3857",
                    featureProjection: "EPSG:3857",
                  });
                  featureList.push(parsed as Feature<Geometry>);
                } catch (parseErr) {
                  console.warn("Identify: Error parsing ArcGIS result:", parseErr);
                }
              }
            } else {
              // Standard GeoJSON (WFS)
              featureList = new GeoJSON().readFeatures(result);
            }

            if (featureList.length > 0) {
              // Inject attachmentUrl onto each feature (matching old app behavior)
              const hasAttachments = layer.get("hasAttachments");
              const layerAttachmentUrl = layer.get("attachmentUrl");
              if (hasAttachments && layerAttachmentUrl) {
                featureList.forEach((f) => {
                  const keys = f.getKeys();
                  const objectIdKey = keys.find((k) => k.toUpperCase().includes("OBJECTID"));
                  const objectId = objectIdKey ? f.get(objectIdKey) : null;
                  if (objectId != null) {
                    f.set("attachmentUrl", layerAttachmentUrl.replace("#OBJECTID#", String(objectId)));
                  }
                });
              }

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
        continue;
      }

      if (!source.getFeatureInfoUrl || typeof source.getFeatureInfoUrl !== "function") {
        continue;
      }

      try {
        const infoFormat = layer.get("INFO_FORMAT") || "application/json";
        const getInfoOption = { INFO_FORMAT: infoFormat };

        const url = source.getFeatureInfoUrl(queryPoint.getCoordinates(), map.getView().getResolution()!, "EPSG:3857", getInfoOption);

        if (!url) {
          continue;
        }

        const fullUrl = `${url}&feature_count=1000000`;

        const axiosClient = getAxiosClient(fullUrl);
        const response = await axiosClient.get(fullUrl, { ...axiosConfig });

        let result = response.data;

        // Try to parse if it's a string
        if (typeof result === "string") {
          try {
            result = JSON.parse(result);
          } catch {
            console.warn(`Identify: Failed to parse response from "${layerName}"`);
            continue;
          }
        }

        // Parse GeoJSON features
        const featureList = new GeoJSON().readFeatures(result);

        if (featureList.length === 0) continue;

        // Inject attachmentUrl onto each feature (matching old app behavior)
        const hasAttachments = layer.get("hasAttachments");
        const layerAttachmentUrl = layer.get("attachmentUrl");
        if (hasAttachments && layerAttachmentUrl) {
          featureList.forEach((f) => {
            const keys = f.getKeys();
            const objectIdKey = keys.find((k) => k.toUpperCase().includes("OBJECTID"));
            const objectId = objectIdKey ? f.get(objectIdKey) : null;
            if (objectId != null) {
              f.set("attachmentUrl", layerAttachmentUrl.replace("#OBJECTID#", String(objectId)));
            }
          });
        }

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

    setLayers(layerList);
    setIsLoading(false);
  }, [map, geometry, queryPoint, layerFilter, getAllLayers, getDisplayNameFromFeature, generateWKT]);

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
    <div className="p-2.5 text-xs h-full overflow-y-auto">
      <button className="mb-2.5 w-full py-2 bg-[#007bff] text-white border-none rounded cursor-pointer text-xs hover:bg-[#0056b3]" onClick={clearIdentify}>
        Clear Results
      </button>

      {/* Debug Info */}
      {debugInfo && (
        <div className="mb-2.5 p-2 bg-[#f8f9fa] border border-[#dee2e6] rounded text-[11px] text-[#495057]">
          <div>
            <strong>Layers:</strong> {debugInfo.total} total, {debugInfo.visible} visible, {debugInfo.queryable} queryable
          </div>
          {debugInfo.visible === 0 && <div className="text-[#ff6b6b] mt-[5px] text-[11px]">⚠️ No visible layers found. Turn on some layers to use identify.</div>}
        </div>
      )}

      <div className={layers.length === 0 && !isLoading ? "flex flex-col items-center justify-center p-5 text-[#666] text-xs" : "hidden"}>No features were selected. Please try again.</div>
      <div className={isLoading ? "flex flex-col items-center justify-center p-5 text-[#666] text-xs" : "hidden"}>
        <div className="border-[3px] border-[#f3f3f3] border-t-[#007bff] rounded-full w-[30px] h-[30px] animate-spin mb-2.5" />
        <div>Loading...</div>
      </div>
      <div className={layers.length === 0 ? "hidden" : "mt-2.5"}>
        {layers.map((layer, idx) => (
          <IdentifyLayer key={`${layer.name}-${idx}`} layer={layer} expanded={layers.length <= 5} />
        ))}
      </div>
    </div>
  );
};

export default Identify;
