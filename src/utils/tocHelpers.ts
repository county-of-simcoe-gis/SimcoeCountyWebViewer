import { WMSCapabilities } from "ol/format.js";
import { TOCLayerGroup, TOCLayer, TOCSource } from "@/stores/tocStore";
import { getAxiosClient } from "@/lib/axiosInstance";
import { LayerHelpers } from "@/utils/openlayers/LayerHelpers";
import { OL_DATA_TYPES, LayerOptions } from "@/utils/openlayers/types";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import type { Layer as OpenLayersLayer } from "ol/layer";

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
  const liveLayer = allKeywords["LIVE_LAYER"] || false;
  const canDownload = allKeywords["DOWNLOAD"] || false;
  let displayName = (allKeywords["DISPLAY_NAME"] as string) || layerTitle;
  const opacity = (allKeywords["OPACITY"] as number) || 1;
  const disclaimerTitle = (allKeywords["DISCLAIMER_TITLE"] as string) || "";
  const disclaimerUrl = (allKeywords["DISCLAIMER_URL"] as string) || "";
  const warningMsg = (allKeywords["WARNING"] as string) || "";

  // Add group prefix if configured
  if (group.prefix) {
    displayName = group.prefix !== "" ? `${group.prefix} - ${displayName}` : displayName;
  }

  // Build disclaimer object
  let disclaimer: string | undefined;
  if (disclaimerUrl !== "" || disclaimerTitle !== "" || warningMsg !== "") {
    disclaimer = JSON.stringify({ title: disclaimerTitle, url: disclaimerUrl, warning: warningMsg });
  }

  // Scale denominators
  const minScale = wmsLayer.MinScaleDenominator || 0;
  const maxScale = wmsLayer.MaxScaleDenominator || 100000000000;

  // Check if layer should be visible
  const visibleLayers = group.visibleLayers || [];
  const layerVisible = visibleLayers.includes(layerNameOnly);

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
    tocDisplayName: layerTitle,
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
    layer: null, // Will be populated when map integration is added
    metadataUrl,
    opacity: typeof opacity === "number" ? opacity : 1,
    minScale,
    maxScale,
    liveLayer: Boolean(liveLayer) || false,
    groupName: group.label || "",
    group: group.value || "",
    userLayer: false,
    secured: group.secure || false,
    canDownload: Boolean(canDownload) || false,
    hasAttachments: false, // GeoServer layers don't typically have attachments
    disclaimer,
  };
}

/**
 * Fetch and parse WMS GetCapabilities
 */
export async function fetchWMSCapabilities(url: string, secured: boolean = false): Promise<WMSCapabilitiesResponse> {
  // TODO: Use secured parameter for authentication when needed
  console.debug("Fetching WMS capabilities", { url, secured });

  try {
    const axiosClient = getAxiosClient(url);
    const response = await axiosClient.get(url, {
      responseType: "text",
      headers: {
        "Content-Type": "application/text",
      },
    });

    const parser = new WMSCapabilities();
    return parser.read(response.data) as WMSCapabilitiesResponse;
  } catch (error) {
    console.error("Error fetching WMS capabilities:", error);
    throw error;
  }
}

/**
 * Build layer groups from GeoServer WMS capabilities
 */
export async function getGroupsFromGeoServer(source: TOCSource, config: Config): Promise<TOCLayerGroup[]> {
  try {
    const resultObj = await fetchWMSCapabilities(source.layerUrl, source.secure);

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

        // Override with source configuration
        if (source.group?.visibleLayers) {
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
 * Fetch and parse ArcGIS REST service
 */
export async function fetchArcGISService(url: string, secured: boolean = false): Promise<Record<string, unknown>> {
  const serviceUrl = url.endsWith("?f=json") ? url : `${url}?f=json`;
  // TODO: Use secured parameter for authentication when needed
  console.debug("Fetching ArcGIS service", { url, secured });

  try {
    const axiosClient = getAxiosClient(serviceUrl);
    const response = await axiosClient.get<Record<string, unknown>>(serviceUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching ArcGIS service:", error);
    throw error;
  }
}

/**
 * Build layer groups from ArcGIS REST service
 */
export async function getGroupsFromArcGIS(source: TOCSource): Promise<TOCLayerGroup[]> {
  try {
    const serviceInfo = await fetchArcGISService(source.layerUrl, source.secure);

    // For now, create a basic group structure
    // This would need to be expanded based on the actual ArcGIS service structure
    const groupName = source.group?.name || "ArcGIS_Group";
    const groupDisplayName = source.group?.displayName || (serviceInfo.mapName as string) || "ArcGIS Layers";

    const group: TOCLayerGroup = {
      value: groupName,
      label: groupDisplayName,
      url: source.layerUrl,
      prefix: "",
      defaultGroup: source.primary || false,
      visibleLayers: source.group?.visibleLayers || [],
      wmsGroupUrl: source.layerUrl,
      customRestUrl: source.layerUrl,
      layers: [], // Would need to parse service.layers and build TOCLayer objects
    };

    return [group];
  } catch (error) {
    console.error("Error loading ArcGIS groups:", error);
    throw error;
  }
}

/**
 * Merges groups together, handling duplicate layers with priority logic
 */
export function mergeGroupsTogether(targetGroup: TOCLayerGroup, sourceGroups: TOCLayerGroup[], alphaSort = true): TOCLayerGroup {
  sourceGroups.forEach((sourceGroup) => {
    sourceGroup.layers.forEach((sourceLayer) => {
      const newLayer = {
        ...sourceLayer,
        group: targetGroup.value,
        groupName: targetGroup.label,
      };

      let isDuplicateLayer = false;
      targetGroup.layers = targetGroup.layers.map((existingLayer) => {
        if (newLayer.tocDisplayName === existingLayer.tocDisplayName) {
          isDuplicateLayer = true;
          // Priority logic: prefer secured/primary layers over non-primary groups
          if ((newLayer.secured || sourceGroup.primary) && !targetGroup.primary) {
            return newLayer;
          } else {
            return existingLayer;
          }
        } else {
          return existingLayer;
        }
      });

      if (!isDuplicateLayer) {
        targetGroup.layers.push(newLayer);
      }
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
 * Merges multiple groups together, handling duplicates with priority logic
 */
export function mergeGroups(originalGroups: TOCLayerGroup[], newGroups: TOCLayerGroup[], alphaSort = true): TOCLayerGroup[] {
  let mergedGroups = [...originalGroups];

  newGroups.forEach((newGroup) => {
    let isDuplicateGroup = false;

    mergedGroups = mergedGroups.map((existingGroup) => {
      if (newGroup.label === existingGroup.label) {
        isDuplicateGroup = true;

        newGroup.layers.forEach((sourceLayer) => {
          let isDuplicateLayer = false;

          existingGroup.layers = existingGroup.layers.map((existingLayer) => {
            if (sourceLayer.tocDisplayName === existingLayer.tocDisplayName) {
              isDuplicateLayer = true;
              // Priority logic: prefer secured/primary layers
              if ((sourceLayer.secured || newGroup.primary) && !existingGroup.primary) {
                const updatedLayer = {
                  ...sourceLayer,
                  group: existingGroup.value,
                  groupName: existingGroup.label,
                };
                return updatedLayer;
              } else {
                return existingLayer;
              }
            } else {
              return existingLayer;
            }
          });

          if (!isDuplicateLayer) {
            const newLayer = {
              ...sourceLayer,
              group: existingGroup.value,
              groupName: existingGroup.label,
            };
            existingGroup.layers.push(newLayer);
          }
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
 * Main function to load layer groups from all sources with proper merging
 */
export async function loadLayerGroupsFromSources(sources: TOCSource[], config: Config): Promise<{ groups: TOCLayerGroup[]; defaultGroupName: string }> {
  let mergedGroups: TOCLayerGroup[] = [];
  let defaultGroupName = config.toc.default_group || "";

  // Process sources in order, with primary sources first for priority
  const sortedSources = [...sources].sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return 0;
  });
  console.log("sortedSources", sortedSources);
  for (const source of sortedSources) {
    try {
      let groups: TOCLayerGroup[] = [];
      const type = source.type || "geoserver";

      switch (type.toLowerCase()) {
        case "geoserver":
          groups = await getGroupsFromGeoServer(source, config);
          break;
        case "arcgis":
          groups = await getGroupsFromArcGIS(source);
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
      // Continue with other sources even if one fails
    }
  }

  return {
    groups: mergedGroups,
    defaultGroupName,
  };
}

/**
 * Parse ESRI layer description for metadata
 */
interface ESRILayerOptions {
  isGroupOn: string;
  isLiveLayer: boolean;
  isVisible: boolean;
  isOpen: boolean;
  sar: boolean;
  description: string;
  refreshInterval: string;
  modalURL: string;
  categories: string[];
}

export function parseESRIDescription(description: string): ESRILayerOptions {
  const descriptionParts = description.replace(/(<([^>]+)>)/gi, "").split("#");
  const returnObj: ESRILayerOptions = {
    isGroupOn: "",
    isLiveLayer: false,
    isVisible: false,
    isOpen: false,
    sar: false,
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
interface BuildESRILayerOptions {
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
  let displayName = layer.options.displayName;
  if (displayName === "" || displayName === undefined) displayName = layerTitle;

  if (group.prefix !== undefined && group.prefix !== "") {
    displayName = `${group.prefix} - ${displayName}`;
  }

  // TOC DISPLAY NAME
  const tocDisplayName = layerTitle;
  // HAS ATTACHMENTS
  const hasAttachments = layer.hasAttachments || false;
  // OPACITY
  const opacity = layer.options.opacity || 1;

  // DISCLAIMER
  const disclaimerTitle = layer.options.disclaimerTitle;
  const disclaimerUrl = layer.options.disclaimerUrl;
  let disclaimer: { title: string; url: string } | undefined = undefined;
  if (disclaimerUrl !== "" || disclaimerTitle !== "") {
    disclaimer = { title: disclaimerTitle || "", url: disclaimerUrl || "" };
  }

  const minScale = layer.options.minScale || 0;
  const maxScale = layer.options.maxScale || 0;

  // SET VISIBILITY
  const layerVisible = layer.visible || visibleLayers.includes(layerNameOnly);

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

      // Handle token authentication
      try {
        const url = new URL(rootInfoUrl);
        const urlParams = new URLSearchParams(url.searchParams);
        const url_token = urlParams.get("token");
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
      });

      // Add to map using LayerManager for proper categorization and z-index management
      const managedLayerId = LayerManager.addLayer(olLayer as OpenLayersLayer, "TOC", layerNameOnly, {
        index: layerIndex, // Use layerIndex for proper z-ordering
        metadata: {
          groupName: group.label,
          groupUrl: group.url,
          secured: secured,
          drawIndex: layerIndex,
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
        disclaimer: disclaimer ? disclaimer.title : undefined,
      };

      callback(returnLayer);
    });
  } catch (error) {
    console.error("Error building ESRI layer:", error);
  }
}
