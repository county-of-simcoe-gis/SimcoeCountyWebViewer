/**
 * InkmapHelper - Utility functions for converting OpenLayers layers to inkmap format
 *
 * This is a client-side alternative to MapFish Print (server-side Java application).
 *
 * SUPPORTED:
 * - WMS layers (both TileWMS and ImageWMS) - automatically reproject to map projection
 * - XYZ tile layers (imagery, streets) - must match map projection (EPSG:3857)
 * - OSM layers
 * - Basic GeoJSON/Vector layers (without complex styling)
 * - BingMaps (if API key available)
 * - Layer ordering by zIndex
 * - excludePrint metadata flag
 *
 * NOT SUPPORTED (vs MapFish Print):
 * - WMTS layers (require tile matrix definitions from WMTSCapabilities.xml)
 * - Vector layers with complex OpenLayers styling (fills, strokes, text labels, icons)
 * - ImageArcGISRest layers (would need SIZE/DPI/BBOX recalculation)
 * - Layer groups (recursive processing)
 * - Overview maps
 * - Custom fonts and advanced text styling
 *
 * LIMITATIONS:
 * - All layers must use the same projection (EPSG:3857 recommended)
 * - XYZ tile layers cannot be reprojected (pre-rendered tiles)
 * - WMS layers rely on server-side reprojection capability
 * - Vector styling is basic/default only
 *
 * For full MapFish Print capabilities, consider using a MapFish Print server.
 */

import { useLayerManagerStore, ManagedLayer } from "@/stores/layerManagerStore";
import { useMapStore } from "@/stores/mapStore";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import ImageLayer from "ol/layer/Image";
import VectorTileLayer from "ol/layer/VectorTile";
import { TileWMS, XYZ, OSM, BingMaps, WMTS } from "ol/source";
import ImageWMS from "ol/source/ImageWMS";
import VectorSource from "ol/source/Vector";
import { GeoJSON } from "ol/format";
import type { Layer } from "ol/layer";
import type { PrintSpec, LayerSpec } from "@camptocamp/inkmap";

/**
 * Result of layer categorization for hybrid printing
 */
export interface CategorizedLayers {
  /** Layers that inkmap can render (WMS, XYZ, OSM, basic vector) */
  supported: {
    spec: LayerSpec;
    managedLayer: ManagedLayer;
  }[];
  /** Layers that inkmap cannot render (WMTS, VectorTile, complex styling) */
  unsupported: ManagedLayer[];
  /** Layers excluded from printing (excludePrint metadata, Popup, Graphics) */
  excluded: ManagedLayer[];
}

/**
 * Converts an OpenLayers layer to inkmap layer specification
 */
export function convertLayerToInkmapSpec(layer: Layer): LayerSpec | null {
  const opacity = layer.getOpacity();

  console.log(`Converting layer of type: ${layer.constructor.name}, opacity: ${opacity}`);

  // Handle Tile layers
  if (layer instanceof TileLayer) {
    const source = layer.getSource();
    console.log(`  TileLayer source type: ${source?.constructor.name}`);

    // WMS Tile layers
    if (source instanceof TileWMS) {
      const params = source.getParams();
      const urls = source.getUrls();
      const url = urls?.[0] || "";

      // Clean the URL - remove any existing WMS parameters
      let cleanUrl = url;
      try {
        const urlObj = new URL(url);
        cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
      } catch (e) {
        console.warn("Failed to parse WMS URL, using as-is:", e);
      }

      // Build custom parameters (exclude standard WMS params)
      const customParams: Record<string, string | number | boolean> = {};
      Object.keys(params).forEach((key) => {
        if (!["LAYERS", "STYLES", "FORMAT", "VERSION", "REQUEST", "SRS", "CRS", "BBOX", "WIDTH", "HEIGHT", "TRANSPARENT"].includes(key.toUpperCase())) {
          customParams[key] = params[key];
        }
      });

      console.log(`  Converting TileWMS layer`);
      const wmsSpec: LayerSpec = {
        type: "WMS",
        url: cleanUrl,
        layer: params.LAYERS || "",
        version: params.VERSION || "1.3.0",
        opacity: opacity,
      };

      if (Object.keys(customParams).length > 0) {
        wmsSpec.customParams = customParams;
      }

      return wmsSpec;
    }

    // WMTS Tile layers
    if (source instanceof WMTS) {
      console.log(`  WMTS layer detected - inkmap does not support WMTS (requires tile matrix), skipping`);
      // WMTS requires tile matrix definitions which inkmap doesn't support
      // Similar to how MapFish Print required loadTileMatrix() and loadWMTSConfig()
      // We would need to load and parse WMTSCapabilities.xml
      return null;
    }

    // XYZ Tile layers (also catches OSM since OSM extends XYZ)
    if (source instanceof XYZ) {
      // Check if it's specifically an OSM layer
      if (source instanceof OSM) {
        console.log(`  Converting OSM layer`);
        return {
          type: "OSM",
          opacity: opacity,
        };
      }

      // Generic XYZ layer
      const url = source.getUrls()?.[0];
      if (url) {
        console.log(`  Converting XYZ layer with URL: ${url}`);
        return {
          type: "XYZ",
          url: url,
          opacity: opacity,
        };
      } else {
        console.warn(`  XYZ layer has no URL`);
      }
    }

    // Bing Maps
    if (source instanceof BingMaps) {
      return {
        type: "BingMaps",
        key: (source as unknown as { getApiKey?: () => string }).getApiKey?.() || "",
        imagerySet: (source as unknown as { getImagerySet?: () => string }).getImagerySet?.() || "Aerial",
        opacity: opacity,
      };
    }

    // If we get here, it's an unsupported TileLayer source
    console.warn(`  Unsupported TileLayer source type: ${source?.constructor.name}`);
  }

  // Handle Image layers (WMS)
  if (layer instanceof ImageLayer) {
    const source = layer.getSource();

    if (source instanceof ImageWMS) {
      const params = source.getParams();
      const url = source.getUrl();

      if (!url) {
        console.warn("WMS layer has no URL");
        return null;
      }

      // Clean the URL - remove any existing WMS parameters (like GetCapabilities)
      // inkmap needs just the base OWS/WMS endpoint
      let cleanUrl = url;
      try {
        const urlObj = new URL(url);
        // Remove all query parameters - inkmap will add GetMap params
        cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
      } catch (e) {
        console.warn("Failed to parse WMS URL, using as-is:", e);
      }

      console.log("WMS layer for inkmap:", {
        original: url,
        cleaned: cleanUrl,
        layer: params.LAYERS,
      });

      // Build custom parameters (exclude standard WMS params)
      const customParams: Record<string, string | number | boolean> = {};
      Object.keys(params).forEach((key) => {
        // Skip standard WMS parameters that inkmap will add
        if (!["LAYERS", "STYLES", "FORMAT", "VERSION", "REQUEST", "SRS", "CRS", "BBOX", "WIDTH", "HEIGHT", "TRANSPARENT"].includes(key.toUpperCase())) {
          customParams[key] = params[key];
        }
      });

      const wmsSpec: LayerSpec = {
        type: "WMS",
        url: cleanUrl,
        layer: params.LAYERS || "",
        version: params.VERSION || "1.3.0",
        opacity: opacity,
      };

      if (Object.keys(customParams).length > 0) {
        wmsSpec.customParams = customParams;
      }

      console.log("WMS Layer spec for inkmap:", wmsSpec);
      return wmsSpec;
    }
  }

  // Handle Vector layers
  if (layer instanceof VectorLayer) {
    const source = layer.getSource();

    if (source instanceof VectorSource) {
      try {
        const features = source.getFeatures();

        // Skip empty vector layers
        if (features.length === 0) {
          console.log(`  Vector layer is empty, skipping`);
          return null;
        }

        console.log(`  Converting Vector layer with ${features.length} features`);

        const format = new GeoJSON();
        const geojson = format.writeFeaturesObject(features, {
          featureProjection: "EPSG:3857",
          dataProjection: "EPSG:3857", // Keep in 3857 to match map projection
        });

        // inkmap supports GeoJSON with basic styling
        // However, complex OpenLayers styles with functions cannot be serialized
        // Similar to MapFish Print's buildVectorLayer, we would need to extract
        // fill, stroke, text, and image properties from each feature's style
        // For now, return basic GeoJSON and let inkmap use default styling
        console.log(`  Vector layer converted to GeoJSON (${geojson.features.length} features)`);

        return {
          type: "GeoJSON",
          geojson: geojson,
          opacity: opacity,
        };
      } catch (error) {
        console.warn("Failed to convert vector layer to GeoJSON:", error);
        return null;
      }
    }
  }

  // Handle Vector Tile layers (skip them as they're not directly supported by inkmap)
  if (layer instanceof VectorTileLayer) {
    console.log("Skipping VectorTileLayer (not supported by inkmap)");
    return null;
  }

  console.warn("Unsupported layer type for inkmap:", layer.constructor.name);
  return null;
}

/**
 * Collects all visible layers from the layer manager and converts them to inkmap format
 */
export function collectVisibleLayers(options: { skipVectorLayers?: boolean } = {}): LayerSpec[] {
  const layerManagerState = useLayerManagerStore.getState();
  const allLayers = layerManagerState.getAllLayers();

  console.log(`Total layers in layer manager: ${allLayers.length}`);

  // Log all layers for debugging
  allLayers.forEach((managedLayer) => {
    console.log(
      `Layer: ${managedLayer.name}, Category: ${managedLayer.category}, Visible: ${managedLayer.visible}, LayerVisible: ${managedLayer.layer.getVisible()}, Type: ${
        managedLayer.layer.constructor.name
      }, zIndex: ${managedLayer.zIndex}`
    );
  });

  // Filter visible layers - only check actual layer visibility (layer.getVisible())
  // The managedLayer.visible flag may be used for different purposes (like UI state)
  // Background layers often have managedLayer.visible=false but layer.getVisible()=true
  // Sort by zIndex (LOWEST first) - inkmap renders layers in array order (first = bottom)
  const visibleLayers = allLayers.filter((managedLayer) => managedLayer.layer.getVisible()).sort((a, b) => a.zIndex - b.zIndex);

  console.log(`Visible layers (by layer.getVisible()): ${visibleLayers.length}`);

  const inkmapLayers: LayerSpec[] = [];

  for (const managedLayer of visibleLayers) {
    // Skip layers marked with excludePrint metadata (e.g., ESRI vector tiles)
    if (managedLayer.metadata?.excludePrint === true) {
      console.log(`Skipping layer marked excludePrint: ${managedLayer.name}`);
      continue;
    }

    // Skip popup and graphics layers as they're typically not needed in prints
    // Similar to MapFish Print which filtered these out
    if (managedLayer.category === "Popup" || managedLayer.category === "Graphics") {
      console.log(`Skipping ${managedLayer.category} layer: ${managedLayer.name}`);
      continue;
    }

    // Always skip VectorTileLayers as they're not supported by inkmap
    // Similar to how MapFish Print would skip unsupported layer types
    if (managedLayer.layer instanceof VectorTileLayer) {
      console.log(`Skipping vector tile layer: ${managedLayer.name} (not supported by inkmap)`);
      continue;
    }

    // Skip vector layers if requested (they can cause serialization issues)
    // This is similar to the optional vector layer handling in MapFish
    if (options.skipVectorLayers && managedLayer.layer instanceof VectorLayer) {
      console.log(`Skipping vector layer: ${managedLayer.name} (skipVectorLayers=true)`);
      continue;
    }

    try {
      const layerSpec = convertLayerToInkmapSpec(managedLayer.layer);
      if (layerSpec) {
        console.log(`✓ Added layer to print: ${managedLayer.name} (${managedLayer.category}, zIndex: ${managedLayer.zIndex}, type: ${layerSpec.type})`);
        inkmapLayers.push(layerSpec);
      } else {
        console.log(`✗ Could not convert layer: ${managedLayer.name} (${managedLayer.category}, layerType: ${managedLayer.layer.constructor.name})`);
      }
    } catch (error) {
      console.warn(`Failed to convert layer ${managedLayer.name}:`, error);
    }
  }

  console.log(`Collected ${inkmapLayers.length} layers for print (ordered by zIndex: lowest=bottom, highest=top)`);
  return inkmapLayers;
}

/**
 * Gets the current map view information for inkmap
 */
export function getMapViewInfo() {
  const map = useMapStore.getState().map;
  if (!map) {
    throw new Error("Map instance not available");
  }

  const view = map.getView();
  const center = view.getCenter();
  const projection = view.getProjection();
  const resolution = view.getResolution();

  // Calculate scale
  const units = projection.getUnits();
  const dpi = 96;
  const mpu = units === "degrees" ? 111194.87428468118 : 1;
  const scale = resolution ? Math.round(resolution * mpu * 39.37 * dpi) : 0;
  console.log("getMapViewInfo", resolution, mpu, units, dpi, view.calculateExtent(map.getSize()));
  return {
    center: center || [0, 0],
    projection: projection.getCode(),
    scale: scale,
    extent: view.calculateExtent(map.getSize()),
  };
}

/**
 * Creates a complete inkmap print specification
 */
export function createInkmapSpec(options: { size: [number, number]; dpi: number; scale?: number; preserveExtent?: boolean; skipVectorLayers?: boolean }): PrintSpec {
  const layers = collectVisibleLayers({
    skipVectorLayers: options.skipVectorLayers,
  });
  const mapView = getMapViewInfo();

  if (layers.length === 0) {
    console.warn("No layers available for printing!");
  }

  const scale = options.scale || mapView.scale;
  const center = mapView.center as [number, number];
  const size: [number, number] = options.size;

  // Use the map's native projection (EPSG:3857)
  // - XYZ tile layers need EPSG:3857 to work correctly
  // - WMS layers will automatically reproject server-side
  console.log("Creating inkmap spec:", {
    size: size,
    dpi: options.dpi,
    scale: scale,
    center: center,
    projection: mapView.projection,
    layersCount: layers.length,
  });

  // Log each layer spec for debugging
  layers.forEach((layer, index) => {
    console.log(`Layer ${index}:`, layer);
  });

  const spec: PrintSpec = {
    layers: layers,
    size: size,
    center: center,
    scale: scale,
    dpi: options.dpi,
    projection: mapView.projection,
  };

  console.log("Complete inkmap spec:", JSON.stringify(spec, null, 2));

  return spec;
}

/**
 * Categorizes visible layers into inkmap-supported and unsupported groups
 * for hybrid printing approach.
 *
 * This allows using inkmap for layers it can handle while using canvas
 * capture for layers that inkmap cannot render (WMTS, VectorTile, etc.)
 */
export function categorizeLayersForHybrid(options: { skipVectorLayers?: boolean } = {}): CategorizedLayers {
  const layerManagerState = useLayerManagerStore.getState();
  const allLayers = layerManagerState.getAllLayers();

  console.log(`[Hybrid] Total layers in layer manager: ${allLayers.length}`);

  // Filter visible layers and sort by zIndex (LOWEST first)
  const visibleLayers = allLayers.filter((managedLayer) => managedLayer.layer.getVisible()).sort((a, b) => a.zIndex - b.zIndex);

  console.log(`[Hybrid] Visible layers: ${visibleLayers.length}`);

  const result: CategorizedLayers = {
    supported: [],
    unsupported: [],
    excluded: [],
  };

  for (const managedLayer of visibleLayers) {
    // Check for exclusions first
    if (managedLayer.metadata?.excludePrint === true) {
      console.log(`[Hybrid] Excluded (excludePrint): ${managedLayer.name}`);
      result.excluded.push(managedLayer);
      continue;
    }

    if (managedLayer.category === "Popup" || managedLayer.category === "Graphics") {
      console.log(`[Hybrid] Excluded (${managedLayer.category}): ${managedLayer.name}`);
      result.excluded.push(managedLayer);
      continue;
    }

    // Skip vector layers if requested
    if (options.skipVectorLayers && managedLayer.layer instanceof VectorLayer) {
      console.log(`[Hybrid] Excluded (skipVectorLayers): ${managedLayer.name}`);
      result.excluded.push(managedLayer);
      continue;
    }

    // Try to convert to inkmap spec
    try {
      const layerSpec = convertLayerToInkmapSpec(managedLayer.layer);
      if (layerSpec) {
        console.log(`[Hybrid] Supported: ${managedLayer.name} (type: ${layerSpec.type}, zIndex: ${managedLayer.zIndex})`);
        result.supported.push({
          spec: layerSpec,
          managedLayer: managedLayer,
        });
      } else {
        console.log(`[Hybrid] Unsupported: ${managedLayer.name} (${managedLayer.layer.constructor.name}, zIndex: ${managedLayer.zIndex})`);
        result.unsupported.push(managedLayer);
      }
    } catch (error) {
      console.warn(`[Hybrid] Error converting ${managedLayer.name}, treating as unsupported:`, error);
      result.unsupported.push(managedLayer);
    }
  }

  console.log(`[Hybrid] Summary: ${result.supported.length} supported, ${result.unsupported.length} unsupported, ${result.excluded.length} excluded`);

  return result;
}

/**
 * Creates an inkmap spec from categorized supported layers only
 */
export function createInkmapSpecFromCategorized(
  categorized: CategorizedLayers,
  options: { size: [number, number]; dpi: number; scale?: number }
): PrintSpec {
  const mapView = getMapViewInfo();
  const layers = categorized.supported.map((item) => item.spec);

  const scale = options.scale || mapView.scale;
  const center = mapView.center as [number, number];

  console.log("[Hybrid] Creating inkmap spec for supported layers:", {
    size: options.size,
    dpi: options.dpi,
    scale: scale,
    center: center,
    projection: mapView.projection,
    layersCount: layers.length,
  });

  return {
    layers: layers,
    size: options.size,
    center: center,
    scale: scale,
    dpi: options.dpi,
    projection: mapView.projection,
  };
}
