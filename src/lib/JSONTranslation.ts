/* eslint-disable @typescript-eslint/no-explicit-any */
import { SettingsType } from "@/types/SettingsType";

/**
 * Interface for mapping configuration that defines how to translate between
 * raw JSON and typed settings objects.
 * Each mapping can specify a source key path, default value, transform function,
 * reverse transform function, and nested child mappings.
 */
interface Mapping {
  sourceKey?: string; // Dot‑notation path (ex: "controls.rotate")
  default?: unknown;
  transform?: (src: unknown) => unknown; // Transform from JSON to settings
  reverse?: (value: unknown) => unknown; // Transform from settings back to JSON
  children?: { [key: string]: Mapping };
}

/**
 * Translation table that defines how to map between raw JSON configuration and typed settings.
 * Each section corresponds to a major feature area of the application.
 * - General: Basic app configuration like title, controls, and default behaviors
 * - Layers: Layer management and table of contents settings
 * - Search: Search functionality configuration
 * - Tools: Available tools and their default settings
 * - MyMaps: User-created content and related features
 * - Themes: Theme management and default themes
 * - Reports: Report generation settings
 * - Basemaps: Base layer configuration
 */
const translationTable: { [section: string]: Mapping } = {
  General: {
    children: {
      favicon: { sourceKey: "favicon" },
      title: {
        transform: (src: unknown) => {
          const rawConfig = src as Record<string, unknown>;
          // Try General.title first (for sectioned payloads)
          if (rawConfig.General && typeof rawConfig.General === "object") {
            const general = rawConfig.General as { title?: string; name?: string };
            if (general.title) return general.title;
            if (general.name) return general.name;
          }
          // Fall back to root-level title/name (for flat payloads)
          if (rawConfig.title) return rawConfig.title;
          if (rawConfig.name) return rawConfig.name;
          return undefined;
        },
        reverse: (value: unknown) => value,
      },
      allowIdentifyExport: { sourceKey: "allowIdentifyExport" },
      headerLogoImageName: { sourceKey: "headerLogoImageName" },
      viewerMode: { sourceKey: "viewerMode" },
      showWhatsNewPopupOnStartup: { sourceKey: "showWhatsNewPopupOnStartup" },
      whatsNewUrl: { sourceKey: "whatsNewUrl" },
      showTermsOnStartup: { sourceKey: "showTermsOnStartup" },
      termsUrl: { sourceKey: "termsUrl" },
      showFeedbackMessageOnStartup: { sourceKey: "showFeedbackMessageOnStartup" },
      leftClickIdentify: { sourceKey: "leftClickIdentify" },
      allowIdentityExport: { sourceKey: "allowIdentityExport" },
      showFloatingMenuHeader: { sourceKey: "showFloatingMenuHeader" },
      disableRightClickMenu: { sourceKey: "disableRightClickMenu" },
      defaultZoom: {
        transform: (src: unknown) => (src as { zoom_level?: number; defaultZoom?: number }).zoom_level || (src as { zoom_level?: number; defaultZoom?: number }).defaultZoom,
        reverse: (value: unknown) => value,
      },
      showHelpButtonInsteadOfFeedback: { sourceKey: "showHelpButtonInsteadOfFeedback" },
      helpUrl: { sourceKey: "helpUrl" },
      feedback_contact: { sourceKey: "feedback_contact" },
      feedbackUrl: { sourceKey: "feedbackUrl" },
      centerCoords: {
        transform: (src: unknown) => {
          const typedSrc = src as { centerCoords?: number[]; center?: string };
          const coords = typedSrc.centerCoords || (typeof typedSrc.center === "string" && typedSrc.center.split(","));
          return Array.isArray(coords) ? coords.map(Number).filter((n) => !isNaN(n)) : [];
        },
        reverse: (value: unknown) => value,
      },
      maxZoom: { sourceKey: "maxZoom" },
      printLogo: { sourceKey: "printLogo" },
      baseMapType: { sourceKey: "baseMapType" },
      featureHighlitStyles: { sourceKey: "featureHighlitStyles" },
      sidebarShortcutParams: { sourceKey: "sidebarShortcutParams" },
      controls: {
        sourceKey: "controls",
        children: {
          rotate: { sourceKey: "controls.rotate", default: false },
          fullScreen: { sourceKey: "controls.fullScreen", default: true },
          zoomInOut: { sourceKey: "controls.zoomInOut", default: true },
          currentLocation: { sourceKey: "controls.currentLocation", default: true },
          zoomExtent: { sourceKey: "controls.zoomExtent", default: true },
          scale: { sourceKey: "controls.scale", default: true },
          scaleLine: { sourceKey: "controls.scaleLine", default: true },
          basemap: { sourceKey: "controls.basemap", default: true },
          gitHubButton: { sourceKey: "controls.gitHubButton", default: true },
          scaleSelector: { sourceKey: "controls.scaleSelector", default: false },
          showGrid: { sourceKey: "controls.showGrid", default: true },
          extentHistory: { sourceKey: "controls.extentHistory", default: true },
        },
      },
      rightClickMenuVisibility: {
        sourceKey: "rightClickMenuVisibility",
        children: {
          basic_mode: { sourceKey: "rightClickMenuVisibility.basic_mode", default: true },
          property_click: { sourceKey: "rightClickMenuVisibility.property_click", default: true },
          add_mymaps: { sourceKey: "rightClickMenuVisibility.add_mymaps", default: true },
          save_map_extent: { sourceKey: "rightClickMenuVisibility.save_map_extent", default: true },
          report_problem: { sourceKey: "rightClickMenuVisibility.report_problem", default: true },
          identify: { sourceKey: "rightClickMenuVisibility.identify", default: true },
          google_maps: { sourceKey: "rightClickMenuVisibility.google_maps", default: true },
          more: { sourceKey: "rightClickMenuVisibility.more", default: true },
        },
      },
    },
  },
  Layers: {
    children: {
      hideLayers: { sourceKey: "mainSidebarItems.hideLayers" },
      tocType: { sourceKey: "default_toc_style" },
      defaultGroup: { sourceKey: "default_group" },
      sources: { sourceKey: "sources" },
      helpLink: { sourceKey: "toc.helpLink" },
    },
  },
  Search: {
    children: {
      hideSearch: { sourceKey: "hideSearch" },
      municipality: { sourceKey: "municipality" },
      placeHolder: { sourceKey: "search.placeHolder", default: "" },
      hideTypes: { sourceKey: "search.hideTypes", default: false },
      defaultSearchType: {
        sourceKey: "search.defaultSearchType",
      },
    },
  },
  Tools: {
    children: {
      title: { sourceKey: "mainSidebarItems.tools.title", default: "" },
      hideTools: { sourceKey: "mainSidebarItems.hideTools" },
      default_tool: {
        sourceKey: "default_tool",
        default: "",
      },
      sidebarToolComponents: {
        sourceKey: "sidebarToolComponents",
        transform: (src) => {
          const typedSrc = src as {
            sidebarToolComponents?: Array<{
              id: number;
              componentName: string;
              disable: boolean;
              config: Record<string, unknown>;
            }>;
          };
          return typedSrc.sidebarToolComponents || [];
        },
        reverse: (value) => {
          // Ensure id is preserved during reverse transformation
          return (
            value as Array<{
              id: number;
              componentName: string;
              disable: boolean;
              enabled: boolean;
              config: Record<string, unknown>;
            }>
          ).map((comp) => ({
            id: comp.id,
            componentName: comp.componentName,
            disable: comp.disable,
            enabled: !comp.disable,
            config: comp.config,
          }));
        },
      },
    },
  },
  MyMaps: {
    children: {
      hideMyMaps: {
        sourceKey: "mainSidebarItems.hideMyMaps",
        reverse: (value: unknown) => value,
      },
      mailingLabelUsePartnerData: {
        sourceKey: "mailingLabelUsePartnerData",
        reverse: (value: unknown) => value,
      },
      drawingOptionsToolsMenuVisibility: {
        sourceKey: "drawingOptionsToolsMenuVisibility",
        transform: (src) => {
          const typedSrc = src as { mainSidebarItems?: { drawingOptionsToolsMenuVisibility?: Record<string, boolean> } };
          return (
            typedSrc.mainSidebarItems?.drawingOptionsToolsMenuVisibility || {
              "sc-floating-menu-feature-report": false,
              "sc-floating-menu-buffer": true,
              "sc-floating-menu-measure": true,
              "sc-floating-menu-symbolizer": true,
              "sc-floating-menu-zoomto": true,
              "sc-floating-menu-delete": true,
              "sc-floating-menu-geometry": true,
              "sc-floating-menu-export": true,
              "sc-floating-menu-export-to-kml": true,
              "sc-floating-menu-export-to-esrijson": true,
              "sc-floating-menu-export-to-geojson": true,
              "sc-floating-menu-report-problem": true,
              "sc-floating-menu-identify": true,
            }
          );
        },
        reverse: (value: unknown) => value,
      },
    },
    // Add a reverse function for the entire MyMaps section
    reverse: (value: unknown) => {
      const typedValue = value as {
        hideMyMaps?: boolean;
        mailingLabelUsePartnerData?: boolean;
        drawingOptionsToolsMenuVisibility?: Record<string, boolean>;
      };

      // Create a new object with the correct structure
      const result: any = {};

      // Add mainSidebarItems structure
      result.mainSidebarItems = {};

      // Handle hideMyMaps
      if (typedValue.hideMyMaps !== undefined) {
        result.mainSidebarItems.hideMyMaps = typedValue.hideMyMaps;
      }

      // Handle drawingOptionsToolsMenuVisibility
      if (typedValue.drawingOptionsToolsMenuVisibility) {
        result.drawingOptionsToolsMenuVisibility = { ...typedValue.drawingOptionsToolsMenuVisibility };
      }

      // Handle mailingLabelUsePartnerData (outside of mainSidebarItems)
      if (typedValue.mailingLabelUsePartnerData !== undefined) {
        result.mailingLabelUsePartnerData = typedValue.mailingLabelUsePartnerData;
      }
      return result;
    },
  },
  Themes: {
    children: {
      title: { sourceKey: "mainSidebarItems.themes.title", default: "" },
      hideThemes: { sourceKey: "mainSidebarItems.hideThemes" },
      default_theme: { sourceKey: "default_theme", default: "" },
      sidebarThemeComponents: {
        sourceKey: "sidebarThemeComponents",
        transform: (src) => {
          const typedSrc = src as {
            sidebarThemeComponents?: Array<{
              id: number;
              componentName: string;
              disable: boolean;
              config: Record<string, unknown>;
            }>;
          };
          return typedSrc.sidebarThemeComponents || [];
        },
        reverse: (value) => {
          // Ensure id is preserved during reverse transformation
          return (
            value as Array<{
              id: number;
              componentName: string;
              disable: boolean;
              enabled: boolean;
              config: Record<string, unknown>;
            }>
          ).map((comp) => ({
            id: comp.id,
            componentName: comp.componentName,
            disable: comp.disable,
            enabled: !comp.disable,
            config: comp.config,
          }));
        },
      },
    },
  },
  Reports: {
    children: {
      hideReports: { sourceKey: "mainSidebarItems.hideReports" },
    },
  },
  Basemaps: {
    children: {
      defaultButton: { sourceKey: "defaultButton" },
      imageryServices: { sourceKey: "baseMapServices.imageryServices", default: [] },
      topoServices: { sourceKey: "baseMapServices.topoServices", default: [] },
    },
  },
  // Property Report settings (passed through directly)
  propertyReport: {
    sourceKey: "propertyReport",
  },
};

/**
 * Collects all source keys and transformed keys from the translation table into a flat array
 */
function getAllHandledKeys(mapping: { [section: string]: Mapping }): Set<string> {
  const keys = new Set<string>();

  function collectKeys(map: Mapping) {
    // Add sourceKey if present
    if (map.sourceKey) {
      keys.add(map.sourceKey.split(".")[0]); // Add top-level key
    }

    // Add keys that are handled by transforms
    if (map.transform) {
      // Add known transformed keys
      keys.add("name");
      keys.add("title");
      keys.add("zoom_level");
      keys.add("defaultZoom");
      keys.add("center");
      keys.add("centerCoords");
    }

    // Recursively process children
    if (map.children) {
      Object.values(map.children).forEach(collectKeys);
    }
  }

  Object.values(mapping).forEach(collectKeys);
  return keys;
}

/**
 * Deep merge utility that combines two objects recursively.
 * Arrays are replaced rather than merged.
 * Used primarily for combining mainSidebarItems from different sections.
 */
function mapSourceToObject(src: unknown, mapping: Mapping): unknown {
  // If a transform function exists, use it:
  if (mapping.transform) {
    return mapping.transform(src);
  }

  // If there are children, build a nested object:
  if (mapping.children) {
    const obj: Record<string, unknown> = {};
    for (const key in mapping.children) {
      obj[key] = mapSourceToObject(src, mapping.children[key]);
    }
    return obj;
  }

  // Extract value from sourceKey first, if defined:
  if (mapping.sourceKey) {
    const parts = mapping.sourceKey.split(".");
    let value = src;

    for (const part of parts) {
      value = value ? (value as Record<string, unknown>)[part] : undefined;
    }
    return value !== undefined ? value : mapping.default;
  }
  // Fallback
  return mapping.default;
}

/**
 * Sets a value in an object using a dot-notation path.
 * Example: setValueAtPath(obj, "a.b.c", value) sets obj.a.b.c = value
 * Creates intermediate objects if they don't exist.
 */
export function JSONToSettings(src: Record<string, unknown>): SettingsType & Record<string, unknown> {
  const result = {} as {
    [K in keyof SettingsType]: SettingsType[K];
  } & Record<string, unknown>;

  const handledKeys = getAllHandledKeys(translationTable);

  // First, copy all source properties that aren't handled by any mapping
  for (const key in src) {
    if (!handledKeys.has(key) && !(key in translationTable)) {
      result[key] = src[key];
    }
  }

  // Then process the translation table mappings
  for (const section in translationTable) {
    const key = section as keyof SettingsType;
    result[key] = mapSourceToObject(src, translationTable[section]) as any;
  }

  return result;
}

// --- Helper functions ---

/**
 * Sets a value in an object using dot notation path.
 * Creates intermediate objects if they don't exist.
 * Example: setValueAtPath(obj, "a.b.c", 123) creates obj.a.b.c = 123
 */
function setValueAtPath(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  let current = obj;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
    } else {
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }
  });
}

/**
 * Recursively merges two objects, with arrays being replaced rather than merged.
 * Used primarily for combining mainSidebarItems from different sections.
 * @param target The object being merged into
 * @param source The object being merged from
 */
function deepMerge(target: any, source: any): any {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

/**
 * Keys whose values should be preserved as-is during cleanup.
 * This prevents source config arrays (with empty visibleLayers, etc.) from being stripped.
 */
const PRESERVE_KEYS = new Set(["sources", "visibleLayers", "centerCoords"]);

/**
 * Recursively removes empty values from an object:
 * - Empty strings
 * - null/undefined values
 * - Empty arrays
 * - Objects with no properties (after cleaning)
 * This helps keep the final JSON output clean and minimal.
 * Keys listed in PRESERVE_KEYS are kept as-is (even when empty).
 */
function removeEmptyValues(obj: any, currentKey?: string): any {
  // Never strip values under preserved keys
  if (currentKey && PRESERVE_KEYS.has(currentKey)) {
    return obj;
  }

  if (Array.isArray(obj)) {
    const cleanedArray = obj
      .map((item) => removeEmptyValues(item))
      .filter((item) => {
        if (item === "" || item === null || item === undefined) return false;
        if (typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 0) return false;
        if (Array.isArray(item) && item.length === 0) return false;
        return true;
      });
    return cleanedArray.length === 0 ? undefined : cleanedArray;
  } else if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const cleanedValue = removeEmptyValues(obj[key], key);
        if (
          cleanedValue === "" ||
          cleanedValue === null ||
          cleanedValue === undefined ||
          (typeof cleanedValue === "object" && !Array.isArray(cleanedValue) && Object.keys(cleanedValue).length === 0)
        ) {
          delete obj[key];
        } else {
          obj[key] = cleanedValue;
        }
      }
    }
    return Object.keys(obj).length === 0 ? undefined : obj;
  }
  return obj;
}

// --- Reverse-mapping functions ---

/**
 * Recursively builds the output JSON object from the settings object
 * using the provided mapping definition.
 *
 * @param obj The value from the settings object for the current node.
 * @param mapping The mapping definition for this node.
 * @param parentKey (Optional) The key name of the parent node.
 */
function mapObjectToSource(obj: any, mapping: Mapping, parentKey?: string): any {
  if (mapping.reverse) {
    return mapping.reverse(obj);
  }
  if (mapping.children) {
    const out: any = {};
    for (const key in mapping.children) {
      const childMapping = mapping.children[key];
      const childValue = mapObjectToSource(obj ? obj[key] : undefined, childMapping, key);
      if (childMapping.sourceKey) {
        // Use the dot‑notation path from the mapping to assign the value.
        setValueAtPath(out, childMapping.sourceKey, childValue);
      } else {
        out[key] = childValue;
      }
    }
    // If this node only produced one property that matches the parent key, unwrap it.
    if (parentKey && Object.keys(out).length === 1 && out[parentKey] !== undefined) {
      return out[parentKey];
    }
    return out;
  }
  // Leaf node: simply return its value.
  return obj;
}

/**
 * Converts a settings object back to raw JSON format.
 * Special handling is applied for:
 * - mainSidebarItems are merged into a shared top-level container
 * - Themes and Tools sections are unwrapped (no top-level keys)
 * - Empty values are removed from the final output
 * @param settings The settings object to convert
 * @returns A cleaned JSON configuration object
 */
export function SettingsToJSON(settings: any): any {
  let output: any = {};
  output.mainSidebarItems = {};

  // First, copy all properties that aren't in the translation table
  for (const key in settings) {
    if (!(key in translationTable)) {
      output[key] = settings[key];
    }
  }

  // Process each top-level section defined in the translation table
  for (const section in translationTable) {
    const sectionOutput = mapObjectToSource(settings[section], translationTable[section], section);

    // For Themes and Tools, we don't want a top-level key; merge their values directly
    if (section === "Themes" || section === "Tools") {
      if (sectionOutput && typeof sectionOutput === "object") {
        for (const key in sectionOutput) {
          if (key === "mainSidebarItems") {
            output.mainSidebarItems = deepMerge(output.mainSidebarItems, sectionOutput[key]);
          } else {
            output[key] = sectionOutput[key];
          }
        }
      }
    } else {
      // For all other sections, merge keys normally
      if (sectionOutput && typeof sectionOutput === "object") {
        for (const key in sectionOutput) {
          if (key === "mainSidebarItems") {
            output.mainSidebarItems = deepMerge(output.mainSidebarItems, sectionOutput[key]);
          } else {
            output[key] = sectionOutput[key];
          }
        }
      }
    }
  }

  // If the shared mainSidebarItems container is empty after merging, remove it
  if (Object.keys(output.mainSidebarItems).length === 0) {
    delete output.mainSidebarItems;
  }

  // Clean the final output
  output = removeEmptyValues(output) || {};
  return output;
}
