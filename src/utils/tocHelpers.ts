import { WMSCapabilities } from "ol/format.js";
import { TOCLayerGroup, TOCLayer, TOCSource, type LayerDisclaimer } from "@/stores/tocStore";
import { LayerHelpers } from "@/utils/openlayers/LayerHelpers";
import { OL_DATA_TYPES, LayerOptions } from "@/utils/openlayers/types";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import type { Layer as OpenLayersLayer } from "ol/layer";
import { buildAuthFetchOptions, getAccessToken } from "@/utils/auth";
import { apiUrl } from "@/lib/axiosInstance";
import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";

// Types for WMS Capabilities parsing
interface WMSLayer {
  Name: string;
  Title: string;
  Layer?: WMSLayer[];
  KeywordList?: string[];
  MinScaleDenominator?: number;
  MaxScaleDenominator?: number;
  queryable?: boolean;
  opaque?: boolean;
  Style?: Array<{
    LegendURL: Array<{
      OnlineResource: string;
      size?: [number, number];
    }>;
  }>;
}

interface WMSCapabilitiesResponse {
  Capability: {
    Layer: {
      Layer: Array<{
        Name: string;
        Title: string;
        Layer?: WMSLayer[];
        KeywordList?: string[];
      }>;
    };
  };
}

// Configuration types
interface ConfigKeyword {
  keyword: string;
  type: string;
  value: unknown;
  splitChar?: string;
  checkValue?: string;
  relatedKeys?: string[];
}

interface Config {
  toc: {
    keywords: Record<string, ConfigKeyword>;
    default_group?: string;
  };
  geoserverPath?: string;
}

// Layer index starting point
const LAYER_INDEX_START = 100;

/**
 * Parse GeoServer keywords into structured metadata
 */
export function parseGeoServerKeywords(keywords: string[], config: Config): Record<string, unknown> {
  const parseKeywords = Object.assign({}, config.toc.keywords);
  const returnKeywords: Record<string, unknown> = {};

  // Initialize with default values
  const keys = Object.keys(parseKeywords);
  keys.forEach((key) => (returnKeywords[key] = parseKeywords[key].value));

  const parseValue = (keywordObj: ConfigKeyword, value: string | undefined): unknown => {
    switch (keywordObj.type) {
      case "string":
        if (value === undefined) return keywordObj.value;
        if (keywordObj.splitChar) return value.split(keywordObj.splitChar).join("");
        else return value;
      case "bool":
        // For boolean keywords:
        // - If no value (just keyword present), return true
        // - If checkValue is specified, check if value matches
        // - Otherwise parse as boolean
        if (value === undefined) return true;
        if (keywordObj.checkValue) return value === keywordObj.checkValue;
        else return value === "true";
      case "int":
        return value ? parseInt(value) : keywordObj.value;
      case "float":
        return value ? parseFloat(value) : keywordObj.value;
      case "array":
        if (!value) return keywordObj.value;
        if (keywordObj.splitChar) return value.split(keywordObj.splitChar);
        else return [value];
      default:
        return keywordObj.value;
    }
  };

  keywords.forEach((keyword) => {
    const splitKeyword = keyword.split("=");
    const key = splitKeyword[0];
    splitKeyword.shift();
    const value = splitKeyword.length >= 1 ? splitKeyword.join("=") : undefined;

    // Process keyword if it exists in our configuration
    if (parseKeywords[key]) {
      returnKeywords[key] = parseValue(parseKeywords[key], value);
      if (parseKeywords[key].relatedKeys) {
        parseKeywords[key].relatedKeys.forEach((relation: string) => {
          returnKeywords[relation] = parseValue(parseKeywords[relation], value);
        });
      }
    }
  });

  return returnKeywords;
}

/**
 * Create a layer object from WMS layer data
 */
export function buildLayerFromWMS(group: Partial<TOCLayerGroup> & { secure?: boolean; primary?: boolean }, wmsLayer: WMSLayer, layerIndex: number, config: Config): TOCLayer {
  const layerNameOnly = wmsLayer.Name;
  let layerTitle = wmsLayer.Title;

  if (layerTitle === undefined) layerTitle = layerNameOnly;

  // Parse keywords for metadata
  const keywords = wmsLayer.KeywordList || [];
  const allKeywords = parseGeoServerKeywords(keywords, config);

  // Build style URL for legend
  let styleUrl = "";
  if (wmsLayer.Style && wmsLayer.Style[0] && wmsLayer.Style[0].LegendURL && wmsLayer.Style[0].LegendURL[0]) {
    styleUrl = wmsLayer.Style[0].LegendURL[0].OnlineResource.replace("http:", "https:");

    // Handle static image legend size override
    const legendSizeOverride = allKeywords["STATIC_IMAGE_LEGEND"];
    if (legendSizeOverride && styleUrl !== "") {
      const legendSize = wmsLayer.Style[0].LegendURL[0].size || [20, 20];
      styleUrl = styleUrl.replace("width=20", `width=${legendSize[0]}`).replace("height=20", `height=${legendSize[1]}`);
    }
  }

  // Extract metadata from keywords
  // Note: liveLayer is for special interactivity features (info icon in TOC)
  // Layers are queryable by default for identify functionality
  const liveLayer = allKeywords["LIVE_LAYER"] || false;
  const canDownload = allKeywords["DOWNLOAD"] || false;

  // Check if layer is queryable (from WMS capabilities)
  // Default to true unless explicitly disabled
  const isQueryable = wmsLayer.queryable !== false;
  let displayName = ((allKeywords["DISPLAY_NAME"] as string) || layerTitle).trim();
  const opacity = (allKeywords["OPACITY"] as number) || 1;
  const disclaimerTitle = (allKeywords["DISCLAIMER_TITLE"] as string) || "";
  const disclaimerUrl = (allKeywords["DISCLAIMER_URL"] as string) || "";
  const warningMsg = (allKeywords["WARNING"] as string) || "";

  // Add group prefix if configured
  if (group.prefix) {
    displayName = group.prefix !== "" ? `${group.prefix} - ${displayName}` : displayName;
  }

  // Build disclaimer object
  let disclaimer: LayerDisclaimer | undefined;
  if (disclaimerUrl !== "" || disclaimerTitle !== "" || warningMsg !== "") {
    disclaimer = { title: disclaimerTitle, url: disclaimerUrl, warning: warningMsg };
  }

  // Scale denominators
  const minScale = wmsLayer.MinScaleDenominator || 0;
  const maxScale = wmsLayer.MaxScaleDenominator || 100000000000;

  // Check if layer should be visible.
  // Match against both the full WMS name (e.g. "simcoe:Assessment Parcel")
  // and the name without the workspace prefix (e.g. "Assessment Parcel") to
  // handle config entries that may or may not include the namespace.
  const visibleLayers = group.visibleLayers || [];
  const nameWithoutPrefix = layerNameOnly.includes(":") ? layerNameOnly.split(":").slice(1).join(":") : layerNameOnly;
  const layerVisible = visibleLayers.some((v) => v === layerNameOnly || v === nameWithoutPrefix || (v.includes(":") ? v.split(":").slice(1).join(":") : v) === layerNameOnly);

  // Build server URLs
  const geoserverPath = config.geoserverPath || "geoserver";
  const serverUrl = group.wmsGroupUrl?.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}` || "";
  const metadataUrl = `${serverUrl}/rest/layers/${layerNameOnly.split(" ").join("%20")}.json`;

  // Generate unique ID for this layer
  const generateUniqueLayerId = (name: string, groupName: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
    const safeGroupName = groupName.replace(/[^a-zA-Z0-9]/g, "_");
    return `toc_layer_${safeGroupName}_${safeName}_${timestamp}_${random}`;
  };

  return {
    id: generateUniqueLayerId(layerNameOnly, group.label || ""),
    name: layerNameOnly,
    displayName,
    tocDisplayName: layerTitle.trim(),
    styleUrl,
    height: 30,
    drawIndex: layerIndex,
    index: layerIndex,
    initialDrawIndex: layerIndex, // Preserve initial sort order from server
    showLegend: false,
    legendHeight: -1,
    legendImage: null,
    legendObj: null,
    legendFetching: false,
    visible: layerVisible,
    defaultVisible: layerVisible,
    layer: null, // Will be populated when map integration is added
    metadataUrl,
    opacity: typeof opacity === "number" ? opacity : 1,
    minScale,
    maxScale,
    liveLayer: Boolean(liveLayer) || false,
    isQueryable, // Queryable by default for identify functionality
    groupName: group.label || "",
    group: group.value || "",
    userLayer: false,
    secured: group.secure || false,
    canDownload: Boolean(canDownload) || false,
    hasAttachments: false, // GeoServer layers don't typically have attachments
    disclaimer,
    extendedProperties: { keywords: { ...allKeywords } },
    wfsUrl: `${serverUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerNameOnly}&outputFormat=application/json&cql_filter=`,
    serverUrl: serverUrl + "/",
  };
}

/**
 * Fetch and parse WMS GetCapabilities
 *
 * @param url      WMS GetCapabilities URL
 * @param secured  Whether the endpoint requires authentication
 * @param token    Pre-fetched access token (avoids redundant getSession calls)
 */
export async function fetchWMSCapabilities(url: string, secured: boolean = false, token?: string): Promise<WMSCapabilitiesResponse> {
  try {
    const fetchOptions = await buildAuthFetchOptions(secured, token);
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    const parser = new WMSCapabilities();
    const parsed = parser.read(text) as WMSCapabilitiesResponse;

    return parsed;
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error(
        `[TOC] WMS capabilities fetch failed for ${url}.`,
        secured
          ? "This is a secured endpoint — verify the access token is valid and that GeoServer " + "allows CORS requests with Authorization headers (Access-Control-Allow-Headers)."
          : "The server may be unreachable or blocking cross-origin requests.",
      );
    } else {
      console.error("Error fetching WMS capabilities:", error);
    }
    throw error;
  }
}

/**
 * Build layer groups from GeoServer WMS capabilities
 */
export async function getGroupsFromGeoServer(source: TOCSource, config: Config, token?: string): Promise<TOCLayerGroup[]> {
  try {
    const resultObj = await fetchWMSCapabilities(source.layerUrl, source.secure, token);

    const urlType = source.urlType || "group";
    const groupLayerList = urlType === "root" ? [resultObj.Capability.Layer.Layer[0]] : urlType === "group" ? resultObj.Capability.Layer.Layer[0].Layer || [] : [resultObj.Capability.Layer.Layer[0]];

    const parentGroup = urlType === "root" ? resultObj.Capability.Layer.Layer[0] : urlType === "group" ? resultObj.Capability.Layer.Layer[0] : resultObj.Capability.Layer.Layer[0];

    // Parse parent keywords for global settings
    const parentKeywords = parentGroup.KeywordList || [];
    const allParentKeywords = parseGeoServerKeywords(parentKeywords, config);

    // Extract default settings
    const defaultGroupName = (allParentKeywords["DEFAULT_GROUP"] as string) || "";

    const geoserverPath = config.geoserverPath || "geoserver";
    const groups: TOCLayerGroup[] = [];

    // Remove underscore helper
    const removeUnderscore = (name: string) => name.replace(/_/g, " ");

    // Process each group
    for (const layerInfo of groupLayerList) {
      if (layerInfo.Layer !== undefined) {
        const groupName = layerInfo.Name;
        const isDefault = groupName.toUpperCase() === defaultGroupName.toUpperCase();
        const groupDisplayName = layerInfo.Title;
        const groupUrl = source.layerUrl.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}/` + groupName.replace(":", "/") + "/ows?service=wms&version=1.3.0&request=GetCapabilities";

        // Parse group keywords
        const keywords = layerInfo.KeywordList || [];
        const allGroupKeywords = parseGeoServerKeywords(keywords, config);

        let visibleLayers: string[] = [];
        const groupPrefix = (allGroupKeywords["GROUP_PREFIX"] as string) || "";
        const allLayersVisible = allGroupKeywords["All_VISIBLE_LAYERS"] || false;

        if (allLayersVisible) {
          visibleLayers = layerInfo.Layer.map((item: WMSLayer) => item.Name);
        } else {
          visibleLayers = (allGroupKeywords["VISIBLE_LAYERS"] as string[]) || [];
        }

        // Override with source configuration (only if config provides a non-empty array;
        // an empty array [] is truthy and would clobber GeoServer keyword visibility)
        if (source.group?.visibleLayers && source.group.visibleLayers.length > 0) {
          visibleLayers = source.group.visibleLayers;
        }

        // Build layers
        const layerList: TOCLayer[] = [];
        let layerIndex = layerInfo.Layer.length + LAYER_INDEX_START;

        const tmpGroupObj: Partial<TOCLayerGroup> & { secure?: boolean; primary?: boolean } = {
          value: source.group?.name || groupName,
          label: source.group?.displayName || removeUnderscore(groupDisplayName),
          url: groupUrl,
          secure: source.secure,
          primary: source.primary,
          prefix: groupPrefix,
          defaultGroup: isDefault,
          visibleLayers,
          wmsGroupUrl: groupUrl,
        };

        // Process layers recursively
        const buildLayers = (layers: WMSLayer[]) => {
          layers.forEach((currentLayer) => {
            if (!isDuplicate(layerList, currentLayer.Name)) {
              if (currentLayer.Layer === undefined) {
                // This is an actual layer (not a group)
                const layer = buildLayerFromWMS(tmpGroupObj, currentLayer, layerIndex, config);
                layerList.push(layer);
                layerIndex--;
              } else {
                // This is a nested group, process its layers
                buildLayers(currentLayer.Layer);
              }
            }
          });
        };

        buildLayers(layerInfo.Layer);

        // Create the final group object
        const groupObj: TOCLayerGroup = {
          value: source.group?.name || groupName,
          label: source.group?.displayName || removeUnderscore(groupDisplayName),
          url: groupUrl,
          prefix: groupPrefix,
          defaultGroup: isDefault,
          visibleLayers,
          wmsGroupUrl: groupUrl,
          customRestUrl: "",
          layers: layerList,
        };

        if (groupObj.layers.length >= 1) {
          groups.push(groupObj);
        }
      }
    }

    return groups;
  } catch (error) {
    console.error("Error loading GeoServer groups:", error);
    throw error;
  }
}

/**
 * Check if layer name already exists in the list
 */
function isDuplicate(layerList: TOCLayer[], newLayerName: string): boolean {
  return layerList.some((layer) => layer.name === newLayerName);
}

/**
 * Fetch and parse ArcGIS REST service.
 * For secured ArcGIS services, appends ?token= from the arcgisTokenStore
 * (NOT a Bearer header — ArcGIS REST uses query-param tokens).
 */
export async function fetchArcGISService(url: string, secured: boolean = false, tokenParam?: string): Promise<Record<string, unknown>> {
  let serviceUrl = url.endsWith("?f=json") ? url : `${url}?f=json`;
  console.debug("Fetching ArcGIS service", { url, secured });

  try {
    // Prefer an explicit tokenParam (app token) when provided; otherwise fall
    // back to the user token store when the endpoint is secured.
    if (tokenParam) {
      serviceUrl += `&token=${tokenParam}`;
    } else if (secured) {
      const token = await useArcGISTokenStore.getState().getValidToken();
      if (token) {
        serviceUrl += `&token=${token}`;
      } else {
        console.warn("ArcGIS: Secured service requested but no token available");
      }
    }

    const response = await fetch(serviceUrl, { method: "GET", mode: "cors" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching ArcGIS service:", error);
    throw error;
  }
}

/**
 * Fetch ArcGIS legend info from the /legend endpoint.
 */
async function fetchArcGISLegend(rootUrl: string, secured: boolean = false, tokenParam?: string): Promise<Record<number, ArcGISLegendEntry>> {
  let legendUrl = `${rootUrl}/legend?f=json`;
  if (tokenParam) {
    legendUrl += `&token=${tokenParam}`;
  } else if (secured) {
    const token = await useArcGISTokenStore.getState().getValidToken();
    if (token) legendUrl += `&token=${token}`;
  }

  try {
    const response = await fetch(legendUrl, { method: "GET", mode: "cors" });
    if (!response.ok) return {};

    const data = await response.json();
    const legendMap: Record<number, ArcGISLegendEntry> = {};
    if (data.layers) {
      for (const layer of data.layers) {
        legendMap[layer.layerId] = layer;
      }
    }
    return legendMap;
  } catch {
    console.warn("ArcGIS: Failed to fetch legend");
    return {};
  }
}

/** Single legend entry from ArcGIS /legend endpoint. */
interface ArcGISLegendEntry {
  layerId: number;
  layerName: string;
  layerType: string;
  legend: Array<{
    label: string;
    url: string;
    imageData: string;
    contentType: string;
    height: number;
    width: number;
  }>;
}

/**
 * Build layer groups from an ArcGIS REST MapServer service.
 *
 * This mirrors the old app's getGroupsESRI() flow:
 *  1. Fetch /layers?f=json for full layer metadata
 *  2. Fetch /legend?f=json for legend images
 *  3. Parse each leaf layer (no subLayerIds) through parseESRIDescription()
 *  4. Group layers by their CATEGORY tag from the description
 *  5. Build OpenLayers layers via buildESRILayer()
 */
export async function getGroupsFromArcGIS(source: TOCSource): Promise<TOCLayerGroup[]> {
  try {
    const secured = source.secure || false;
    const rootUrl = source.layerUrl;

    // Build the ArcGIS token query param once. Prefer server app token when
    // the source explicitly requests it (source.appToken). Otherwise fall
    // back to the user token store for secured services.
    let tokenParam = "";
    if ((source as { appToken?: boolean }).appToken) {
      try {
        const resp = await fetch(apiUrl("/api/secure/arcgis/token"), { method: "POST", credentials: "same-origin" });
        if (resp.ok) {
          const data = await resp.json();
          tokenParam = data?.access_token || data?.token || data?.accessToken || "";
          if (!tokenParam) console.warn("[TOC] App token endpoint returned no token");
        } else {
          console.warn("[TOC] Failed to fetch app token:", resp.status, resp.statusText);
        }
      } catch (err) {
        console.warn("[TOC] Error fetching app token:", err);
      }
    } else if (secured) {
      const token = await useArcGISTokenStore.getState().getValidToken();
      if (token) tokenParam = token;
    }

    // Fetch full layer list from the /layers endpoint
    let layersUrl = `${rootUrl}/layers?f=json`;
    if (tokenParam) layersUrl += `&token=${tokenParam}`;

    const layersResponse = await fetch(layersUrl, { method: "GET", mode: "cors" });
    if (!layersResponse.ok) {
      throw new Error(`HTTP ${layersResponse.status}: ${layersResponse.statusText}`);
    }
    const layersData = await layersResponse.json();
    const serviceLayers = layersData.layers || [];

    if (serviceLayers.length === 0) {
      console.warn("ArcGIS: No layers found in service", rootUrl);
      return [];
    }

    // Fetch legend data (pass tokenParam so legend endpoint uses app token when available)
    const legendMap = await fetchArcGISLegend(rootUrl, secured, tokenParam);

    // Parse each leaf layer and group by category
    const groupsObj: Record<string, TOCLayerGroup & { rawLayers: BuildESRILayerOptions["layer"][] }> = {};

    for (const item of serviceLayers) {
      // Skip group layers — check type, subLayerIds, and subLayers
      if (item.type === "Group Layer") continue;
      if (item.subLayerIds && item.subLayerIds.length > 0) continue;
      if (item.subLayers && item.subLayers.length > 0) continue;

      // Parse the description for config options (CATEGORY, VISIBLE, LIVELAYER, etc.)
      // Prefer a source-level `descriptionOverride` when provided in config.
      const layerOptions = parseESRIDescription(source.descriptionOverride || item.description || "");
      // Determine visibility: if visibleLayers is specified in config, use that
      // list. Otherwise fall back to the ArcGIS service's defaultVisibility.
      // A VISIBLE=TRUE flag in the ESRI description can also override.
      const visibleLayers = source.group?.visibleLayers || [];
      let visible = visibleLayers.length > 0 ? visibleLayers.includes(item.name) : (item.defaultVisibility ?? false);
      if (layerOptions.isVisible !== null) visible = layerOptions.isVisible;

      // Swap min/max scale (ArcGIS convention is inverted)
      const origMin = item.minScale || 0;
      const origMax = item.maxScale || 0;
      const minScale = origMax;
      const maxScale = origMin;

      // Build the layer URL with optional token
      const layerUrl = tokenParam ? `${rootUrl}/${item.id}?token=${tokenParam}` : `${rootUrl}/${item.id}`;

      // Build the layer object expected by buildESRILayer()
      const parsedLayer: BuildESRILayerOptions["layer"] = {
        name: item.name,
        url: layerUrl,
        rootUrl: rootUrl,
        id: item.id,
        options: {
          ...layerOptions,
          title: item.name,
          opacity: item.drawingInfo?.transparency != null ? 1 - item.drawingInfo.transparency / 100 : 1,
          minScale,
          maxScale,
          canDownload: false,
          identifyTitleColumn: item.displayField || "",
          displayName: item.name,
        },
        hasAttachments: item.hasAttachments ?? false,
        visible,
        queryable: true,
        opaque: false,
        legend: legendMap[item.id] || undefined,
        sourceSpatialReference: item.sourceSpatialReference,
        extent: item.extent ? [item.extent.xmin, item.extent.ymin, item.extent.xmax, item.extent.ymax] : undefined,
        // Use the extent's own spatialReference, NOT item.sourceSpatialReference - ArcGIS
        // services commonly report `extent` in Web Mercator even when the layer's native
        // storage SR (sourceSpatialReference) is something else (e.g. UTM 17N/26917).
        extentSpatialReference: item.extent?.spatialReference,
      };

      // Group by category
      for (const category of layerOptions.categories) {
        const cleanCategory = category.replaceAll("_", " ");
        const groupValue = cleanCategory === "All Layers" ? "opengis:all_layers" : cleanCategory;

        if (!groupsObj[groupValue]) {
          groupsObj[groupValue] = {
            value: groupValue,
            label: cleanCategory,
            url: rootUrl,
            prefix: "",
            defaultGroup: false,
            visibleLayers: [],
            wmsGroupUrl: rootUrl,
            customRestUrl: rootUrl,
            layers: [],
            secured,
            primary: source.primary || false,
            rawLayers: [],
          };
        }
        groupsObj[groupValue].rawLayers.push(parsedLayer);
      }
    }

    // Build OL layers for each group
    const groups: TOCLayerGroup[] = [];

    for (const groupValue of Object.keys(groupsObj)) {
      const groupDef = groupsObj[groupValue];
      const builtLayers: TOCLayer[] = [];
      let layerIndex = groupDef.rawLayers.length;

      for (const rawLayer of groupDef.rawLayers) {
        layerIndex--;
        await new Promise<void>((resolve) => {
          buildESRILayer(
            {
              group: groupDef,
              layer: rawLayer,
              layerIndex,
            },
            (builtLayer) => {
              builtLayers.push(builtLayer);
              resolve();
            },
          );
        });
      }

      if (builtLayers.length > 0) {
        // Strip the temporary rawLayers property before returning
        const { rawLayers: _unused, ...cleanGroup } = groupDef;
        void _unused;
        groups.push({
          ...cleanGroup,
          layers: builtLayers,
        });
      }
    }

    return groups;
  } catch (error) {
    console.error("Error loading ArcGIS groups:", error);
    throw error;
  }
}

/**
 * Merges groups together. Layers with the same name are kept as SEPARATE entries
 * (no dedup) — each TOC layer has a unique `id` and is addressable independently.
 */
export function mergeGroupsTogether(targetGroup: TOCLayerGroup, sourceGroups: TOCLayerGroup[], alphaSort = true): TOCLayerGroup {
  sourceGroups.forEach((sourceGroup) => {
    sourceGroup.layers.forEach((sourceLayer) => {
      const newLayer = {
        ...sourceLayer,
        group: targetGroup.value,
        groupName: targetGroup.label,
      };

      // Always append — never replace an existing layer based on name. Layers
      // with the same display name from different sources are intentionally
      // kept as independent entries.
      targetGroup.layers.push(newLayer);
    });
  });

  // First, set initialDrawIndex ONLY if not already set
  // This preserves the true initial order from the server (before any sorting)
  let initialIndex = targetGroup.layers.length;
  targetGroup.layers = targetGroup.layers.map((layer) => {
    initialIndex--;
    // Only set initialDrawIndex if it's not already set (preserve server order)
    if (layer.initialDrawIndex === undefined || layer.initialDrawIndex === null) {
      layer.initialDrawIndex = initialIndex;
    }
    return layer;
  });

  // Now apply alphabetical sorting if requested
  if (alphaSort) {
    targetGroup.layers = targetGroup.layers.sort((a, b) => {
      return a.tocDisplayName.localeCompare(b.tocDisplayName);
    });
  }

  // Update current index and drawIndex based on the (potentially sorted) order
  let index = targetGroup.layers.length;
  targetGroup.layers = targetGroup.layers.map((layer) => {
    index--;
    layer.index = index;
    layer.drawIndex = index;
    return layer;
  });

  return targetGroup;
}

/**
 * Merges multiple groups together. Same-named layers from different sources are
 * kept as SEPARATE entries (no dedup); each layer has a unique `id`.
 */
export function mergeGroups(originalGroups: TOCLayerGroup[], newGroups: TOCLayerGroup[], alphaSort = true): TOCLayerGroup[] {
  let mergedGroups = [...originalGroups];

  newGroups.forEach((newGroup) => {
    let isDuplicateGroup = false;

    mergedGroups = mergedGroups.map((existingGroup) => {
      if (newGroup.label === existingGroup.label) {
        isDuplicateGroup = true;

        newGroup.layers.forEach((sourceLayer) => {
          const newLayer = {
            ...sourceLayer,
            group: existingGroup.value,
            groupName: existingGroup.label,
          };
          // Always append — duplicates by name are allowed and tracked by id.
          existingGroup.layers.push(newLayer);
        });

        return existingGroup;
      } else {
        return existingGroup;
      }
    });

    if (!isDuplicateGroup) {
      mergedGroups.push(newGroup);
    }
  });

  if (alphaSort) {
    return mergedGroups.sort((a, b) => {
      return a.value.localeCompare(b.value);
    });
  } else {
    return mergedGroups;
  }
}

/**
 * Build TOC layer groups from a direct layer source config entry (type: "layer").
 * This handles individual layers specified directly in the config (e.g. WMTS, XYZ)
 * rather than being discovered from a WMS/ArcGIS service.
 */
function getGroupsFromDirectLayer(source: TOCSource): TOCLayerGroup[] {
  const layerName = (source.layerName || source.name || "Unnamed Layer").trim();
  const displayName = (source.name || layerName).trim();
  // If the config specifies "All Layers" (the virtual group), place the layer
  // into an "Uncategorized" group instead to avoid creating a duplicate.
  const groupNames = (source.groups || ["All Layers"]).map((g) => (g.toLowerCase() === "all layers" ? "Uncategorized" : g));

  const generateUniqueLayerId = (name: string, groupName: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
    const safeGroupName = groupName.replace(/[^a-zA-Z0-9]/g, "_");
    return `toc_layer_${safeGroupName}_${safeName}_${timestamp}_${random}`;
  };

  const groups: TOCLayerGroup[] = [];

  for (const groupName of groupNames) {
    const layer: TOCLayer = {
      id: generateUniqueLayerId(layerName, groupName),
      name: layerName,
      displayName,
      tocDisplayName: displayName,
      styleUrl: "",
      height: 30,
      drawIndex: source.index ?? 0,
      index: source.index ?? 0,
      initialDrawIndex: source.index ?? 0,
      showLegend: false,
      legendHeight: -1,
      legendImage: null,
      legendObj: null,
      legendFetching: false,
      visible: false,
      defaultVisible: false,
      layer: null,
      metadataUrl: null,
      opacity: 1,
      minScale: 0,
      maxScale: 100000000000,
      liveLayer: false,
      isQueryable: false,
      groupName,
      group: groupName,
      userLayer: false,
      secured: source.secure || false,
      canDownload: false,
      hasAttachments: false,
      // Store direct layer properties for OpenLayers initialization
      sourceType: source.sourceType || source.source,
      layerUrl: source.layerUrl,
      projection: source.projection || "EPSG:3857",
    };

    groups.push({
      value: groupName,
      label: groupName,
      defaultGroup: false,
      url: source.layerUrl,
      prefix: "",
      visibleLayers: [],
      wmsGroupUrl: "",
      customRestUrl: "",
      layers: [layer],
    });
  }

  return groups;
}

/**
 * Main function to load layer groups from all sources with proper merging
 */
export async function loadLayerGroupsFromSources(sources: TOCSource[], config: Config): Promise<{ groups: TOCLayerGroup[]; defaultGroupName: string; failedSources: string[] }> {
  let mergedGroups: TOCLayerGroup[] = [];
  let defaultGroupName = config.toc.default_group || "";
  const failedSources: string[] = [];

  // Pre-fetch the access token once so we can:
  //  1. Skip secured sources entirely when the user isn't authenticated
  //  2. Pass the token through to avoid redundant getSession() calls per source
  const hasSecuredSources = sources.some((s) => s.secure);
  let accessToken: string | undefined;
  if (hasSecuredSources) {
    accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn("[TOC] No access token available — skipping secured sources. " + "The user may not be signed in or the session may have expired.");
    }
  }

  // Process sources in order, with primary sources first for priority
  const sortedSources = [...sources].sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return 0;
  });
  // console.log("sortedSources", sortedSources);
  for (const source of sortedSources) {
    // Skip secured sources when the user isn't authenticated
    if (source.secure && !accessToken) {
      console.debug(`[TOC] Skipping secured source (no token): ${source.layerUrl}`);
      continue;
    }

    try {
      let groups: TOCLayerGroup[] = [];
      const type = source.type || "geoserver";

      switch (type.toLowerCase()) {
        case "geoserver":
          groups = await getGroupsFromGeoServer(source, config, accessToken);
          break;
        case "arcgis":
          groups = await getGroupsFromArcGIS(source);
          break;
        case "layer":
          groups = getGroupsFromDirectLayer(source);
          break;
        default:
          console.warn(`Unknown source type: ${source.type}`);
          continue;
      }

      // Mark groups with source properties
      groups = groups.map((group) => ({
        ...group,
        primary: source.primary,
        secured: source.secure,
        useRedFolder: source.useRedFolder || false,
        sourceOpen: source.open !== undefined ? source.open : undefined,
      }));

      // Find default group from primary source
      if (source.primary && !defaultGroupName) {
        const defaultGroup = groups.find((g) => g.defaultGroup);
        if (defaultGroup) {
          defaultGroupName = defaultGroup.label;
        }
      }

      // Merge with existing groups using sophisticated logic
      if (mergedGroups.length === 0) {
        mergedGroups = groups;
      } else {
        mergedGroups = mergeGroups(mergedGroups, groups, true);
      }
    } catch (error) {
      console.error(`Error loading source ${source.layerUrl}:`, error);
      failedSources.push(source.layerUrl);
      // Continue with other sources even if one fails
    }
  }

  return {
    groups: mergedGroups,
    defaultGroupName,
    failedSources,
  };
}

/**
 * Parse ESRI layer description for metadata
 */
interface ESRILayerOptions {
  isGroupOn: string;
  isLiveLayer: boolean | null;
  isVisible: boolean | null;
  isOpen: boolean | null;
  sar: boolean | null;
  description: string;
  refreshInterval: string;
  modalURL: string;
  categories: string[];
}

export function parseESRIDescription(description: string): ESRILayerOptions {
  const descriptionParts = description.replace(/(<([^>]+)>)/gi, "").split("#");
  const returnObj: ESRILayerOptions = {
    isGroupOn: "",
    isLiveLayer: null,
    isVisible: null,
    isOpen: null,
    sar: null,
    description: "",
    refreshInterval: "",
    modalURL: "",
    categories: [],
  };

  descriptionParts.forEach((descriptionPart) => {
    const parts = descriptionPart.split("=");
    const key = parts[0]?.trim();
    if (key != null && key.length !== 0) {
      // VALUE STRING
      const value = parts[1];
      if (value) {
        switch (key.toUpperCase()) {
          case "CATEGORY":
            value.split(",").forEach((item) => {
              returnObj.categories.push(item.trim());
            });
            break;
          case "LIVELAYER":
            returnObj.isLiveLayer = value.trim().toUpperCase() === "TRUE";
            break;
          case "GROUPON":
            returnObj.isGroupOn = value.trim().toUpperCase() === "TRUE" ? "true" : "false";
            break;
          case "VISIBLE":
            returnObj.isVisible = value.trim().toUpperCase() === "TRUE";
            break;
          case "OPEN":
            returnObj.isOpen = value.trim().toUpperCase() === "TRUE";
            break;
          case "SAR":
            returnObj.sar = value.trim().toUpperCase() === "TRUE";
            break;
          case "DESCRIPTION":
            returnObj.description = value;
            break;
          case "REFRESH":
            returnObj.refreshInterval = value;
            break;
          case "MODALURL":
            returnObj.modalURL = value;
            break;
          default:
            break;
        }
      }
    }
  });

  if (returnObj.categories.length === 0) {
    returnObj.categories.push("Uncategorized");
  }

  return returnObj;
}

/**
 * Sorting helper functions
 */
const sortByAlphaCompare = (a: TOCLayer, b: TOCLayer): number => {
  if (a.tocDisplayName < b.tocDisplayName) {
    return -1;
  } else if (a.tocDisplayName > b.tocDisplayName) {
    return 1;
  } else {
    return 0;
  }
};

const sortByIndexCompare = (a: TOCLayer, b: TOCLayer): number => {
  return b.drawIndex - a.drawIndex;
};

const sortGroupAlphaCompare = (a: TOCLayerGroup, b: TOCLayerGroup): number => {
  if (a.value < b.value) {
    return -1;
  } else if (a.value > b.value) {
    return 1;
  } else {
    return 0;
  }
};

const updateLayerIndex = (layers: TOCLayer[], preserveInitialOrder = false): TOCLayer[] => {
  let index = layers.length;
  return layers.map((layer) => {
    index--;
    return {
      ...layer,
      index: index,
      drawIndex: index,
      // Only update initialDrawIndex if we're setting initial order
      ...(preserveInitialOrder && { initialDrawIndex: index }),
    };
  });
};

const updateGroupLayerIndex = (groups: TOCLayerGroup[], callback?: (groups: TOCLayerGroup[]) => void): TOCLayerGroup[] => {
  const updatedGroups = groups.map((group) => ({
    ...group,
    layers: updateLayerIndex(group.layers),
  }));

  if (callback) {
    callback(updatedGroups);
  }
  return updatedGroups;
};

/**
 * Sort layers by alpha or index
 */
export function sortLayers(layers: TOCLayer[], sortAlpha = false): TOCLayer[] {
  const newLayers = [...layers];
  if (sortAlpha) {
    newLayers.sort(sortByAlphaCompare);
  } else {
    newLayers.sort(sortByIndexCompare);
  }

  return updateLayerIndex(newLayers);
}

/**
 * Sort groups with primary groups first
 */
export function sortGroups(groups: TOCLayerGroup[], callback?: (groups: TOCLayerGroup[]) => void): TOCLayerGroup[] {
  const primaryGroups = groups.filter((item) => item.primary);
  const nonPrimaryGroups = groups.filter((item) => !item.primary);

  primaryGroups.sort(sortGroupAlphaCompare);
  nonPrimaryGroups.sort(sortGroupAlphaCompare);

  const sortedGroups = [...primaryGroups, ...nonPrimaryGroups];

  if (callback) {
    callback(sortedGroups);
    return sortedGroups;
  } else {
    return sortedGroups;
  }
}

/**
 * Sort groups and their layers
 */
export function sortGroupsLayers(groups: TOCLayerGroup[], sortAlpha = false, callback?: (groups: TOCLayerGroup[]) => void): TOCLayerGroup[] {
  return sortGroups(groups, (sortedGroups) => {
    const newGroups = sortedGroups.map((group) => {
      const newGroup = { ...group };
      const newLayers = [...group.layers];
      if (sortAlpha) {
        newLayers.sort(sortByAlphaCompare);
      } else {
        newLayers.sort(sortByIndexCompare);
      }
      newGroup.layers = newLayers;
      return newGroup;
    });

    const indexedGroups = updateGroupLayerIndex(newGroups, callback);
    return indexedGroups;
  });
}

/**
 * Build ESRI layer with all metadata and properties
 */
export interface BuildESRILayerOptions {
  tocType?: "LIST" | "FOLDER";
  group: TOCLayerGroup;
  layer: {
    name: string;
    url: string;
    rootUrl?: string;
    id: number;
    options: ESRILayerOptions & {
      title?: string;
      opacity?: number;
      minScale?: number;
      maxScale?: number;
      canDownload?: boolean;
      identifyName?: string;
      displayName?: string;
      noAttributeTable?: boolean;
      identifyTitleColumn?: string;
      identifyIdColumn?: string;
      disclaimerTitle?: string;
      disclaimerUrl?: string;
      disclaimerWarning?: string;
    };
    hasAttachments?: boolean;
    visible?: boolean;
    queryable?: boolean;
    opaque?: boolean;
    legend?: {
      legend: Array<{ height: number }>;
    };
    layers?: unknown[];
    grouped?: boolean;
    extent?: number[];
    // The extent's own spatial reference, as reported by the ArcGIS service. This can differ
    // from `sourceSpatialReference` below (e.g. a layer's native storage SR is UTM 17N/26917,
    // but its reported `extent` is already in Web Mercator/102100) - always use this one to
    // reproject `extent`, never `sourceSpatialReference`.
    extentSpatialReference?: { wkid?: number; latestWkid?: number };
    sourceSpatialReference?: { latestWkid?: number };
  };
  layerIndex: number;
}

export async function buildESRILayer(options: BuildESRILayerOptions, callback: (layer: TOCLayer) => void): Promise<void> {
  const { group, layer, layerIndex } = options;
  const secured = group.secured || false;

  if (!layer) {
    console.error("Layer is undefined in buildESRILayer");
    return;
  }

  const visibleLayers = group.visibleLayers || [];
  const layerNameOnly = layer.name;
  let layerTitle = layer.options.title;
  const queryable = layer.queryable !== undefined ? layer.queryable : false;
  const opaque = layer.opaque !== undefined ? layer.opaque : false;
  if (layerTitle === undefined) layerTitle = layerNameOnly;

  const styleUrl = "";
  const metadataUrl = `${layer.url}${layer.url.indexOf("?") > 0 ? "&" : "?"}f=json`;

  // LIVE LAYER
  const liveLayer = layer.options.isLiveLayer || false;
  // DOWNLOAD
  const canDownload = layer.options.canDownload !== undefined ? layer.options.canDownload : false;
  // DISPLAY NAME
  let displayName = layer.options.displayName?.trim();
  if (displayName === "" || displayName === undefined) displayName = layerTitle.trim();

  if (group.prefix !== undefined && group.prefix !== "") {
    displayName = `${group.prefix} - ${displayName}`;
  }

  // TOC DISPLAY NAME
  const tocDisplayName = layerTitle.trim();
  // HAS ATTACHMENTS
  const hasAttachments = layer.hasAttachments || false;
  // OPACITY
  const opacity = layer.options.opacity || 1;

  // DISCLAIMER
  const disclaimerTitle = layer.options.disclaimerTitle || "";
  const disclaimerUrl = layer.options.disclaimerUrl || "";
  const disclaimerWarning = (layer.options as { disclaimerWarning?: string }).disclaimerWarning || "";
  let disclaimer: LayerDisclaimer | undefined = undefined;
  if (disclaimerUrl !== "" || disclaimerTitle !== "" || disclaimerWarning !== "") {
    disclaimer = { title: disclaimerTitle, url: disclaimerUrl, warning: disclaimerWarning };
  }

  const minScale = layer.options.minScale || 0;
  const maxScale = layer.options.maxScale || 0;

  // SET VISIBILITY — use the visibility already computed by getGroupsFromArcGIS.
  // Only fall back to visibleLayers if the caller didn't set layer.visible.
  const layerVisible = layer.visible === true || visibleLayers.includes(layerNameOnly);

  // LAYER PROPS
  const layerOptions = {
    sourceType: layer.grouped ? OL_DATA_TYPES.LayerGroup : OL_DATA_TYPES.ImageArcGISRest,
    source: "rest",
    projection: layer.sourceSpatialReference && layer.sourceSpatialReference.latestWkid ? `${layer.sourceSpatialReference.latestWkid}` : "3857",
    layerName: layer.name,
    url: layer.url,
    tiled: false,
    extent: layer.extent,
    name: layer.name,
    secured: secured,
    ...(layer.grouped &&
      layer.layers && {
        layers: layer.layers as LayerOptions[],
      }),
  };

  try {
    LayerHelpers.getLayer(layerOptions, (newLayer: unknown) => {
      // Type assertion for OpenLayers layer
      const olLayer = newLayer as {
        setVisible: (visible: boolean) => void;
        setOpacity: (opacity: number) => void;
        setProperties: (properties: Record<string, unknown>) => void;
        setZIndex: (index: number) => void;
      };

      const identifyUrl = (options: { url: string; point: string; layerId: number; tolerance: string; extent: string; resolution: string; geometryType: string }) =>
        `${options.url}/identify?geometry=${options.point}&geometryType=${options.geometryType}&layers=visible%3A${options.layerId}&sr=3857&datumTransformations=3857&tolerance=${options.tolerance}&mapExtent=${options.extent}&imageDisplay=${options.resolution}&maxAllowableOffset=10&returnGeometry=true&returnFieldName=false&f=json`;

      const getAttachmentUrl = (options: { url: string; layerId: number; objectId: string }) =>
        `${options.url}/${options.layerId}/queryAttachments?objectIds=${options.objectId}&returnUrl=true&f=json`;

      const rootInfoUrl = layer.url;

      let attachmentUrl = getAttachmentUrl({
        url: layer.rootUrl || layer.url,
        layerId: layer.id,
        objectId: "#OBJECTID#",
      });

      let wfsUrl = identifyUrl({
        url: layer.rootUrl || layer.url,
        point: "#GEOMETRY#",
        layerId: layer.id,
        tolerance: "#TOLERANCE#",
        extent: "#EXTENT#",
        resolution: "#RESOLUTION#",
        geometryType: "#GEOMETRYTYPE#",
      });

      // Handle token authentication — try URL first, then fall back to store
      try {
        const url = new URL(rootInfoUrl);
        const urlParams = new URLSearchParams(url.searchParams);
        let url_token = urlParams.get("token");

        // Fall back to the arcgisTokenStore if no token in the URL and layer is secured
        if (!url_token && secured) {
          url_token = useArcGISTokenStore.getState().token;
        }

        if (url_token) {
          wfsUrl = `${wfsUrl}&token=${url_token}`;
          if (hasAttachments) {
            attachmentUrl = `${attachmentUrl}&token=${url_token}`;
          }
        }
      } catch (error) {
        console.warn("Error parsing URL for token:", error);
      }

      olLayer.setVisible(layerVisible);
      olLayer.setOpacity(opacity);
      olLayer.setProperties({
        name: layerNameOnly,
        displayName: displayName,
        tocDisplayName: tocDisplayName,
        wfsUrl: wfsUrl,
        rootInfoUrl: rootInfoUrl,
        disableParcelClick: liveLayer,
        queryable: queryable,
        opaque: opaque,
        minScale: minScale,
        maxScale: maxScale,
        attachmentUrl: hasAttachments ? attachmentUrl : null,
        hasAttachments: hasAttachments,
        isArcGIS: true,
        secured: secured,
        group: group.label,
        extendedProperties: {
          keywords: {
            SAR: layer.options.sar || false,
            CATEGORY: layer.options.categories || [],
          },
        },
      });

      // Add to map using LayerManager for proper categorization and z-index management
      const managedLayerId = LayerManager.addLayer(olLayer as OpenLayersLayer, "TOC", layerNameOnly, {
        index: layerIndex, // Use layerIndex for proper z-ordering
        clickable: liveLayer || queryable, // Layers flagged as live or queryable participate in click identification
        metadata: {
          groupName: group.label,
          groupUrl: group.url,
          secured: secured,
          drawIndex: layerIndex,
          // ArcGIS-specific extent info so "Zoom to Layer" (getLayerExtent) can fit the real
          // bounding box instead of misfiring the WMS GetCapabilities path — ImageArcGISRest
          // sources also implement getParams()/getUrl(), which getLayerExtent otherwise treats
          // as a WMS signal.
          isArcGIS: true,
          extent: layer.extent,
          // Use the extent's own spatial reference (may differ from the layer's native/storage
          // sourceSpatialReference - e.g. extent reported in Web Mercator/102100 while the data
          // itself is stored in UTM 17N/26917). Falling back to sourceSpatialReference here was
          // the cause of "Zoom to Layer" reprojecting to bogus coordinates for such layers.
          extentWkid: layer.extentSpatialReference?.latestWkid ?? layer.extentSpatialReference?.wkid,
          arcgisMetadataUrl: metadataUrl,
        },
      });

      let legendHeight = -1;
      if (layer.legend !== undefined && layer.legend !== null) {
        legendHeight = 36;
        layer.legend.legend.forEach((legendItem) => {
          legendHeight += parseInt(legendItem.height.toString());
        });
      }

      // Generate unique ID for this layer
      const generateUniqueLayerId = (name: string, groupName: string): string => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
        const safeGroupName = groupName.replace(/[^a-zA-Z0-9]/g, "_");
        return `toc_layer_${safeGroupName}_${safeName}_${timestamp}_${random}`;
      };

      const returnLayer: TOCLayer = {
        id: generateUniqueLayerId(layerNameOnly, group.label || ""),
        name: layerNameOnly,
        height: 30,
        drawIndex: layerIndex,
        index: layerIndex,
        initialDrawIndex: layerIndex, // Preserve initial sort order from server
        styleUrl: styleUrl,
        showLegend: false,
        legendHeight: legendHeight,
        legendImage: null,
        legendObj: layer.legend || null,
        legendFetching: false,
        visible: layerVisible,
        defaultVisible: layerVisible,
        layer: olLayer,
        managedLayerId: managedLayerId || undefined, // Store the managed layer ID from LayerManager
        metadataUrl: metadataUrl,
        opacity: opacity,
        minScale: minScale,
        maxScale: maxScale,
        liveLayer: liveLayer,
        group: group.value,
        groupName: group.label,
        userLayer: false,
        secured: secured,
        canDownload: canDownload,
        displayName: displayName,
        tocDisplayName: tocDisplayName,
        hasAttachments: hasAttachments,
        disclaimer,
        extendedProperties: {
          keywords: {
            SAR: layer.options.sar || false,
            CATEGORY: layer.options.categories || [],
          },
        },
        wfsUrl: wfsUrl,
      };

      callback(returnLayer);
    });
  } catch (error) {
    console.error("Error building ESRI layer:", error);
  }
}
