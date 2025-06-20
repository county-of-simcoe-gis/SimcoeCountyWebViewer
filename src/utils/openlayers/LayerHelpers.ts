import { Layer } from "ol/layer";
import { Source } from "ol/source";
import Map from "ol/Map";

// Global window interface for map access
declare global {
  interface Window {
    map?: Map;
  }
}
import {
  Image as ImageLayer,
  Tile as TileLayer,
  Vector as VectorLayer,
  Group as LayerGroup,
  VectorTile as VectorTileLayer,
} from "ol/layer";
import WebGLTileLayer from "ol/layer/WebGLTile";
import {
  ImageWMS,
  OSM,
  TileArcGISRest,
  ImageArcGISRest,
  TileWMS,
  TileImage,
  Vector,
  XYZ,
  ImageStatic,
  GeoTIFF,
} from "ol/source";
import WMTS from "ol/source/WMTS";
import VectorTileSource from "ol/source/VectorTile";
import { GeoJSON } from "ol/format";
import { all as LoadingStrategyAll } from "ol/loadingstrategy";
import { Extent } from "ol/extent";
import { Projection } from "ol/proj";
import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { createXYZ } from "ol/tilegrid";
import TileGrid from "ol/tilegrid/TileGrid";
import { getTopLeft } from "ol/extent";
import { applyStyle } from "ol-mapbox-style";

import {
  OL_LAYER_TYPES,
  OL_DATA_TYPES,
  OLLayerType,
  OLDataType,
  LayerOptions,
  RebuildParams,
  GroupedLayerOptions,
} from "./types";
import { FeatureHelpers } from "./FeatureHelpers";

export class LayerHelpers {
  /**
   * Get the layer type from a layer instance
   * @param layer - OpenLayers layer instance
   * @returns Layer type string
   */
  static getLayerType(layer: Layer): OLLayerType | "unknown" {
    if (layer instanceof TileLayer) return OL_LAYER_TYPES.Tile;
    if (layer instanceof ImageLayer) return OL_LAYER_TYPES.Image;
    if (layer instanceof VectorLayer) return OL_LAYER_TYPES.Vector;
    if (layer instanceof LayerGroup) return OL_LAYER_TYPES.Group;
    return "unknown";
  }

  /**
   * Get the source type from a source instance
   * @param source - OpenLayers source instance
   * @returns Source type string
   */
  static getLayerSourceType(source: Source): OLDataType | "unknown" {
    if (source instanceof XYZ) return OL_DATA_TYPES.XYZ;
    if (source instanceof OSM) return OL_DATA_TYPES.OSM;
    if (source instanceof Vector) return OL_DATA_TYPES.Vector;
    if (source instanceof ImageWMS) return OL_DATA_TYPES.ImageWMS;
    if (source instanceof TileArcGISRest) return OL_DATA_TYPES.TileArcGISRest;
    if (source instanceof ImageArcGISRest) return OL_DATA_TYPES.ImageArcGISRest;
    if (source instanceof TileImage) return OL_DATA_TYPES.TileImage;
    // Note: Stamen support removed from newer OpenLayers versions
    // if (source instanceof Stamen) return OL_DATA_TYPES.Stamen;
    if (source instanceof ImageStatic) return OL_DATA_TYPES.ImageStatic;
    if (source instanceof WMTS) return OL_DATA_TYPES.WMTS;
    if (source instanceof TileWMS) return OL_DATA_TYPES.TileWMS;
    if (source instanceof VectorTileSource) return OL_DATA_TYPES.VectorTile;
    if (source instanceof GeoTIFF) return OL_DATA_TYPES.GeoTIFF;
    return "unknown";
  }

  /**
   * Create a grouped layer from options
   * @param options - Grouped layer options
   * @param callback - Callback function with created layer group
   */
  static getGroupedLayer(
    options: GroupedLayerOptions,
    callback: (layer: LayerGroup) => void
  ): void {
    const layerOptions = options.layers;
    const name = options.name || "";
    const layers: Layer[] = [];
    
    const rebuildParams = {
      sourceType: OL_DATA_TYPES.LayerGroup,
      name: name,
      layers: layerOptions,
    };

    let completedLayers = 0;
    
    layerOptions.forEach((layerOption) => {
      this.getLayer(
        {
          sourceType: layerOption.sourceType,
          source: "rest",
          layerName: layerOption.layerName,
          url: layerOption.url,
          tiled: false,
          extent: layerOption.extent,
          name: layerOption.name,
        },
        (layer) => {
          layers.push(layer);
          completedLayers++;
          
          if (completedLayers >= layerOptions.length) {
            callback(
              new LayerGroup({
                properties: {
                  name: name,
                  rebuildParams: rebuildParams,
                },
                layers: layers,
              })
            );
          }
        }
      );
    });
  }

  /**
   * Create a layer from options - Main layer factory method
   * @param options - Layer creation options
   * @param callback - Callback function with created layer
   */
  static getLayer(
    {
      sourceType,
      source = "rest",
      projection = "EPSG:3857",
      layerName = "",
      url = "",
      tiled = false,
      file,
      extent = [],
      name = "",
      background = null,
      rootPath = null,
      minZoom = null,
      maxZoom = null,
    }: LayerOptions,
    callback: (layer: Layer) => void
  ): void {
    const rebuildParams: RebuildParams = {
      sourceType,
      source,
      projection,
      layerName,
      url,
      tiled,
      file: file !== undefined ? (typeof file === "string" ? file : "STORED FEATURES") : undefined,
      extent,
      name,
      background,
    };

    let finalName = name;
    let finalUrl: string | ((extent: Extent, resolution: number, proj: Projection) => string) = url;
    let vectorFileLoader: ((extent: unknown, resolution: unknown, proj: unknown) => void) | undefined =
      undefined;

    // Handle different source types
    switch (source) {
      case "file":
        if (!file) {
          console.error("Missing File for Vector layer.");
          return;
        }

        if (file === "STORED FEATURES") {
          callback(
            new VectorLayer({
              properties: { rebuildParams },
              source: new Vector(),
            })
          );
          return;
        }

        if (typeof file !== "string" && file.type === "image/tiff") {
          const imageUrl = URL.createObjectURL(file);
          callback(
            new WebGLTileLayer({
              properties: { rebuildParams },
              source: new GeoTIFF({
                sources: [{ url: imageUrl }],
              }),
            })
          );
          return;
        }

        // Handle vector file loading
        if (typeof file !== "string") {
          if (finalName.length < 1) finalName = file.name;
          finalUrl = "";
          const featureParser = FeatureHelpers.getVectorFormat(sourceType, projection);

          vectorFileLoader = function (this: { addFeatures: (features: Feature<Geometry>[]) => void }) {
            try {
              const mapProjection = window.map?.getView().getProjection();
              const fr = new FileReader();

              fr.onload = (evt) => {
                const vectorData = evt.target?.result as ArrayBuffer;
                if (featureParser && "readFeatures" in featureParser && vectorData) {
                  const features = featureParser.readFeatures(vectorData, {
                    dataProjection: projection,
                    featureProjection: mapProjection,
                  });
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (this as any).addFeatures(features);
                }
              };

              fr.readAsArrayBuffer(file);
            } catch (error) {
              console.error("Error loading file:", error);
            }
          };
        }
        break;

      case "wfs":
        // eslint-disable-next-line no-case-declarations
        const type = sourceType === OL_DATA_TYPES.GeoJSON ? "application/json" : sourceType;
        finalUrl = /^((http)|(https))(:\/\/)/.test(finalUrl as string)
          ? (finalUrl as string)
          : "https://" + finalUrl;
        finalUrl = /\?/.test(finalUrl as string) ? (finalUrl as string) + "&" : (finalUrl as string) + "?";
        finalUrl =
          finalUrl +
          "SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=" +
          layerName +
          "&SRSNAME=" +
          projection +
          "&OUTPUTFORMAT=" +
          type;
        break;
    }

    // Main switch for creating layers based on sourceType
    switch (sourceType) {
      case OL_DATA_TYPES.XYZ:
        callback(
          new TileLayer({
            properties: { rebuildParams, name: finalName },
            source: new XYZ({
              url: finalUrl as string,
              crossOrigin: "anonymous",
            }),
            minZoom: minZoom || undefined,
            maxZoom: maxZoom || undefined,
          })
        );
        break;

      case OL_DATA_TYPES.OSM:
        callback(
          new TileLayer({
            properties: { rebuildParams, name: finalName },
            source: new OSM(),
          })
        );
        break;

      case OL_DATA_TYPES.ImageWMS:
        callback(
          new ImageLayer({
            properties: { rebuildParams, name: finalName },
            source: new ImageWMS({
              url: finalUrl as string,
              params: { LAYERS: layerName },
              ratio: 1,
            }),
          })
        );
        break;

      case OL_DATA_TYPES.TileWMS:
        callback(
          new TileLayer({
            properties: { rebuildParams, name: finalName },
            source: new TileWMS({
              url: finalUrl as string,
              params: {
                LAYERS: layerName,
                TILED: tiled,
              },
            }),
          })
        );
        break;

      case OL_DATA_TYPES.TileArcGISRest:
        callback(
          new TileLayer({
            properties: { rebuildParams, name: finalName },
            source: new TileArcGISRest({
              url: finalUrl as string,
            }),
          })
        );
        break;

      case OL_DATA_TYPES.SimcoeTiled:
        // eslint-disable-next-line no-case-declarations
        const tileGrid = createXYZ({
          extent: extent,
        });
        callback(
          new TileLayer({
            properties: { rebuildParams, name: finalName },
            source: new XYZ({
              url: finalUrl as string,
              crossOrigin: "anonymous",
              tileGrid: tileGrid,
            }),
          })
        );
        break;

      case OL_DATA_TYPES.TileImage:
        // eslint-disable-next-line no-case-declarations
        const resolutions = [
          305.74811314055756, 152.87405657041106, 76.43702828507324, 38.21851414253662, 19.10925707126831, 
          9.554628535634155, 4.77731426794937, 2.388657133974685, 1.1943285668550503,
          0.5971642835598172, 0.29858214164761665, 0.1492252984505969,
        ];
        // eslint-disable-next-line no-case-declarations
        let projExtent_ti;
        try {
          projExtent_ti = window.map?.getView()?.getProjection()?.getExtent();
        } catch {
          // Map not available yet, use default Web Mercator extent
          projExtent_ti = [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244];
        }
        // eslint-disable-next-line no-case-declarations
        const customTileGrid = new TileGrid({
          resolutions: resolutions,
          tileSize: [256, 256],
          origin: projExtent_ti ? getTopLeft(projExtent_ti) : [-20037508.342789244, 20037508.342789244],
        });
        // Use XYZ source with custom tile grid instead of TileImage
        // This ensures proper coordinate handling
        // eslint-disable-next-line no-case-declarations
        const xyzSource = new XYZ({
          url: finalUrl as string,
          tileGrid: customTileGrid,
          crossOrigin: "anonymous",
        });
        callback(
          new TileLayer({
            properties: { rebuildParams, name: finalName },
            source: xyzSource,
          })
        );
        break;

      case OL_DATA_TYPES.VectorTile:
        {
          // Create layer without source; applyStyle will create the correct source & style
          const vtLayer = new VectorTileLayer({
            properties: { rebuildParams, name: finalName },
            renderMode: "hybrid",
            declutter: true,
          });

          if (rootPath) {
            const styleUrl = rootPath.startsWith("/") ? rootPath : "/" + rootPath;

            fetch(styleUrl)
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
              })
              .then((glStyle) => {
                // Patch Esri VectorTileServer styles: add "tiles" template when only "url" provided
                if (glStyle.sources) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  Object.values(glStyle.sources).forEach((src: any) => {
                    if (src && src.url && !src.tiles) {
                      src.tiles = [`${src.url.replace(/\/?$/, "")}/tile/{z}/{y}/{x}.pbf`];
                    }
                  });
                }

                // Use applyStyle which handles source creation, sprite + glyph loading
                applyStyle(vtLayer, glStyle, "esri")
                  .then(() => {
                    callback(vtLayer);
                  })
                  .catch((err) => {
                    console.error("applyStyle failed", err);
                    callback(vtLayer);
                  });
              })
              .catch((error) => {
                console.error("VectorTile: Error loading vector tile style from", styleUrl, ":", error);
                callback(vtLayer);
              });
          } else {
            callback(vtLayer);
          }
        }
        break;

      case OL_DATA_TYPES.GeoJSON:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new GeoJSON(),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          })
        );
        break;

      case OL_DATA_TYPES.LayerGroup:
        this.getGroupedLayer(
          rebuildParams as unknown as GroupedLayerOptions,
          callback as unknown as (layer: LayerGroup) => void
        );
        break;

      default:
        console.warn("LayerHelpers: Unsupported layer type requested:", sourceType);
        console.warn("LayerHelpers: Available types:", Object.values(OL_DATA_TYPES));
        callback(null as unknown as Layer); // Call callback with null to prevent hanging
        return;
    }
  }
} 