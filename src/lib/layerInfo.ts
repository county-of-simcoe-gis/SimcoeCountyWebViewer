/**
 * Layer Info utility functions for fetching and parsing layer metadata
 */

import axios from "axios";
import type { LayerInfoData, LayerInfoResponse, ArcGISFeatureInfo, LayerInfoNativeCRS } from "@/types/layerInfo";

/**
 * Fetches layer information from a URL
 */
export async function fetchLayerInfo(url: string, params: Record<string, unknown> = {}, useBearerToken: boolean = false, _depth: number = 0): Promise<LayerInfoData | null> {
  try {
    // Prevent infinite loops - max 2 levels of resource fetching
    if (_depth > 2) {
      console.error("Maximum recursion depth reached when fetching layer info");
      return null;
    }

    const config: Record<string, unknown> = { ...params };

    if (useBearerToken) {
      // Add bearer token if needed - implement based on your auth system
      // config.headers = { Authorization: `Bearer ${token}` };
    }

    console.log(`Fetching layer info from: ${url} (depth: ${_depth})`);
    const response = await axios.get<LayerInfoResponse | ArcGISFeatureInfo>(url, config);

    // Check if it's a coverage response (GeoServer)
    if ("coverage" in response.data && response.data.coverage) {
      console.log("Found GeoServer coverage response");
      return response.data.coverage;
    }

    // Check if it's a featureType response (GeoServer)
    if ("featureType" in response.data && response.data.featureType) {
      console.log("Found GeoServer featureType response");
      return response.data.featureType;
    }

    // Check if it's a layer response (GeoServer REST API returns layer with resource)
    if ("layer" in response.data && response.data.layer) {
      const layerData = response.data.layer as { resource?: { href?: string } };
      if (layerData.resource && layerData.resource.href) {
        const resourceHref = layerData.resource.href;
        console.log(`Found layer with resource link: ${resourceHref}`);

        // Prevent circular references
        if (resourceHref === url) {
          console.error("Circular reference detected in layer resource");
          return null;
        }

        // Fetch the actual resource (featureType or coverage) - increment depth
        return fetchLayerInfo(resourceHref, params, useBearerToken, _depth + 1);
      }
    }

    // Check if it looks like ArcGIS format (has extent and fields)
    if ("extent" in response.data && response.data.extent && "spatialReference" in response.data.extent) {
      console.log("Found ArcGIS format response");
      return parseArcGISFeature(response.data as ArcGISFeatureInfo);
    }

    // If none of the above, log the response structure for debugging
    console.error("Unknown layer info format. Response keys:", Object.keys(response.data));
    console.error("Response data:", response.data);
    return null;
  } catch (error) {
    console.error("Error fetching layer info:", error);
    return null;
  }
}

/**
 * Parses ArcGIS feature info into LayerInfoData format
 */
export function parseArcGISFeature(featureInfo: ArcGISFeatureInfo): LayerInfoData {
  // Validate that we have the required properties
  if (!featureInfo.extent || !featureInfo.extent.spatialReference) {
    throw new Error("Invalid ArcGIS feature info: missing extent or spatial reference");
  }

  const spatialReference = featureInfo.sourceSpatialReference || featureInfo.extent.spatialReference;

  const nativeCRS: LayerInfoNativeCRS = {
    "@class": "Projected",
  };

  if (spatialReference.wkt === undefined && spatialReference.latestWkid) {
    nativeCRS.$ = `EPSG:${spatialReference.latestWkid}`;
  } else if (spatialReference.wkt) {
    if (spatialReference.wkt.indexOf("GEOGCS") !== -1) {
      nativeCRS["@class"] = "Geographic";
    }
    nativeCRS.$ = spatialReference.wkt;
  }

  const descriptionObj = parseESRIDescription(featureInfo.description || "");

  const layerInfo: LayerInfoData = {
    name: featureInfo.name,
    title: featureInfo.name,
    abstract: descriptionObj.description,
    nativeCRS: nativeCRS,
    nativeBoundingBox: {
      minx: featureInfo.extent.xmin,
      maxx: featureInfo.extent.xmax,
      miny: featureInfo.extent.ymin,
      maxy: featureInfo.extent.ymax,
      crs: {
        "@class": "projected",
        $: `EPSG:${featureInfo.extent.spatialReference.latestWkid}`,
      },
    },
    attributes: {
      attribute:
        featureInfo.fields?.map((field) => ({
          name: field.name,
          binding: field.type.replace("esriFieldType", ""),
        })) || [],
    },
  };

  return layerInfo;
}

/**
 * Parses ESRI description HTML
 */
export function parseESRIDescription(description: string): { description: string } {
  // Remove HTML tags
  const text = description.replace(/<[^>]*>/g, "");
  return { description: text };
}

/**
 * Formats the projection string for display
 */
export function getFormattedProjection(layerInfo: LayerInfoData): string {
  let projClass = "";

  if (typeof layerInfo.nativeCRS === "string") {
    projClass = layerInfo.nativeCRS.indexOf("GEOGCS") !== -1 ? "Geographic" : "Projected";
  } else {
    if (layerInfo.nativeCRS["@class"] === undefined) {
      const crsString = layerInfo.nativeCRS.$ || "";
      projClass = crsString.indexOf("GEOGCS") !== -1 ? "Geographic" : "Projected";
    } else {
      projClass = layerInfo.nativeCRS["@class"];
    }
  }

  let proj = "Undefined";
  if (typeof layerInfo.nativeCRS === "string") {
    const projArray = layerInfo.nativeCRS.split('"');
    proj = toTitleCase(projClass) + " - " + (projArray[1] || "Unknown");
  } else if (layerInfo.nativeCRS.$) {
    const projArray = layerInfo.nativeCRS.$.split('"');
    proj = toTitleCase(projClass) + " - " + (projArray[1] || "Unknown");
  }

  return proj;
}

/**
 * Converts string to title case
 */
function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Gets the download URL template for a layer
 */
export function getDownloadUrl(serverUrl: string, workspace: string, layerName: string): string {
  return `${serverUrl}wfs?service=wfs&version=1.1.0&request=GetFeature&typeNames=${workspace}:${layerName}&outputFormat=SHAPE-ZIP`;
}

/**
 * Extracts the server URL from a layer URL
 */
export function getServerUrl(layerURL: string): string {
  return layerURL.split("rest/")[0];
}

/**
 * Downloads a file from a URL
 */
export async function downloadLayerFile(url: string, fileName: string, useBearerToken: boolean = false): Promise<void> {
  try {
    const config: Record<string, unknown> = {
      responseType: "blob",
    };

    if (useBearerToken) {
      // Add bearer token if needed
      // config.headers = { Authorization: `Bearer ${token}` };
    }

    const response = await axios.get(url, config);
    const blob = new Blob([response.data]);
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `${fileName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}
