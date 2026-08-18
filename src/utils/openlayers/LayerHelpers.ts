import { Layer } from "ol/layer";
import { Source } from "ol/source";
import Map from "ol/Map";

// Global window interface for map access
declare global {
  interface Window {
    map?: Map;
  }
}
import { Image as ImageLayer, Tile as TileLayer, Vector as VectorLayer, Group as LayerGroup, VectorTile as VectorTileLayer } from "ol/layer";
import WebGLTileLayer from "ol/layer/WebGLTile";
import { ImageWMS, OSM, TileArcGISRest, ImageArcGISRest, TileWMS, TileImage, Vector, XYZ, ImageStatic, GeoTIFF } from "ol/source";
import WMTS, { optionsFromCapabilities } from "ol/source/WMTS";
import WMTSCapabilities from "ol/format/WMTSCapabilities";
import VectorTileSource from "ol/source/VectorTile";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";

// Register common Canadian projections for WMTS support
proj4.defs("EPSG:3978", "+proj=lcc +lat_0=49 +lon_0=-95 +lat_1=49 +lat_2=77 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
proj4.defs("EPSG:3979", "+proj=lcc +lat_0=49 +lon_0=-95 +lat_1=49 +lat_2=77 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);
import { GeoJSON, GPX, KML, EsriJSON, TopoJSON, IGC, Polyline, WKT } from "ol/format";
import GML2 from "ol/format/GML2";
import GML3 from "ol/format/GML3";
import { all as LoadingStrategyAll } from "ol/loadingstrategy";
import { Extent } from "ol/extent";
import { Projection } from "ol/proj";
import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { createXYZ } from "ol/tilegrid";
import TileGrid from "ol/tilegrid/TileGrid";
import { getTopLeft } from "ol/extent";
import { applyStyle } from "ol-mapbox-style";

import { OL_LAYER_TYPES, OL_DATA_TYPES, OLLayerType, OLDataType, LayerOptions, RebuildParams, GroupedLayerOptions } from "@/utils/openlayers/types";
import { FeatureHelpers } from "@/utils/openlayers/FeatureHelpers";
import { getAxiosClient } from "@/lib/axiosInstance";
import { getAccessToken, isSecuredUrl } from "@/utils/auth";

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
  static getGroupedLayer(options: GroupedLayerOptions, callback: (layer: LayerGroup) => void): void {
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
              }),
            );
          }
        },
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
      secured = false,
      background = null,
      rootPath = null,
      minZoom = null,
      maxZoom = null,
    }: LayerOptions,
    callback: (layer: Layer) => void,
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
    let vectorFileLoader: ((extent: unknown, resolution: unknown, proj: unknown) => void) | undefined = undefined;

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
            }),
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
            }),
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
                try {
                  const vectorData = evt.target?.result as string;
                  if (featureParser && "readFeatures" in featureParser && vectorData) {
                    // Auto-detect projection from file data (important for KML which uses EPSG:4326)
                    let dataProjection = projection;
                    if ("readProjection" in featureParser) {
                      const detectedProjection = featureParser.readProjection(vectorData);
                      if (detectedProjection) {
                        dataProjection = detectedProjection.getCode();
                      }
                    }

                    const features = featureParser.readFeatures(vectorData, {
                      dataProjection: dataProjection,
                      featureProjection: mapProjection,
                    });

                    if (features.length === 0) {
                      console.warn("No features found in file");
                      return;
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (this as any).addFeatures(features);

                    // Zoom to extent of loaded features if map is available
                    if (features.length > 0 && window.map) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const vectorSource = this as any as Vector;
                      const extent = vectorSource.getExtent();
                      if (extent && extent.some((val) => isFinite(val))) {
                        window.map.getView().fit(extent, {
                          padding: [50, 50, 50, 50],
                          maxZoom: 18,
                          duration: 500,
                        });
                      }
                    }
                  }
                } catch (error) {
                  console.error("Error parsing file data:", error);
                }
              };

              fr.onerror = (error) => {
                console.error("Error reading file:", error);
              };

              fr.readAsText(file);
            } catch (error) {
              console.error("Error loading file:", error);
            }
          };
        }
        break;

      case "wfs":
        const type = sourceType === OL_DATA_TYPES.GeoJSON ? "application/json" : sourceType;
        finalUrl = /^((http)|(https))(:\/\/)/.test(finalUrl as string) ? (finalUrl as string) : "https://" + finalUrl;
        finalUrl = /\?/.test(finalUrl as string) ? (finalUrl as string) + "&" : (finalUrl as string) + "?";
        finalUrl = finalUrl + "SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=" + layerName + "&SRSNAME=" + projection + "&OUTPUTFORMAT=" + type;
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
          }),
        );
        break;

      case OL_DATA_TYPES.OSM:
        callback(
          new TileLayer({
            properties: { rebuildParams, name: finalName },
            source: new OSM(),
          }),
        );
        break;

      case OL_DATA_TYPES.ImageWMS:
        {
          // Determine if this layer needs auth (explicitly secured or URL-based detection)
          const wmsNeedsAuth = secured || isSecuredUrl(finalUrl as string);

          // Debug log for troubleshooting auth detection
          // if (wmsNeedsAuth) {
          //   console.debug(`[LayerHelpers] ImageWMS layer "${layerName}" using auth:`, {
          //     explicitlySecured: secured,
          //     urlDetectedSecured: isSecuredUrl(finalUrl as string),
          //     url: finalUrl,
          //   });
          // }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const imageWMSOptions: Record<string, any> = {
            url: finalUrl as string,
            params: {
              LAYERS: layerName,
              VERSION: "1.3.0",
              FORMAT: "image/png",
              SRS: "EPSG:3857",
              TRANSPARENT: true,
            },
            ratio: 1,
            crossOrigin: "anonymous", // Enable CORS for print functionality
          };

          if (wmsNeedsAuth) {
            imageWMSOptions.imageLoadFunction = (image: { getImage: () => HTMLImageElement }, src: string) => {
              const img = image.getImage();
              img.onerror = () => {
                console.warn(`[LayerHelpers] Failed to load secured WMS image: ${src.substring(0, 120)}...`);
              };

              getAccessToken().then((token) => {
                if (!token) {
                  // No token available — fall back to direct src (will likely 401)
                  img.src = src;
                  return;
                }

                fetch(src, { headers: { Authorization: `Bearer ${token}` } })
                  .then((response) => {
                    if (!response.ok) throw new Error(`WMS request failed: ${response.status}`);

                    // Check if response is actually an image (WMS errors return XML)
                    const contentType = response.headers.get("content-type") || "";
                    if (!contentType.startsWith("image/")) {
                      // WMS likely returned an error (XML ServiceException)
                      return response.text().then((text) => {
                        console.warn(`[LayerHelpers] WMS returned non-image content for ${layerName}:`, text.substring(0, 200));
                        throw new Error("WMS returned non-image content");
                      });
                    }

                    return response.blob();
                  })
                  .then((blob) => {
                    if (blob instanceof Blob) {
                      const objectUrl = URL.createObjectURL(blob);
                      img.onload = () => URL.revokeObjectURL(objectUrl);
                      img.src = objectUrl;
                    }
                  })
                  .catch((err) => {
                    console.warn("[LayerHelpers] Secured WMS fetch error:", err);
                  });
              });
            };
          }

          const imageWMSSource = new ImageWMS(imageWMSOptions);

          // Add error handling for WMS source with detailed diagnostics
          imageWMSSource.on("imageloaderror", (event) => {
            // Attempt to get the failed URL for debugging
            const image = event.image;
            const failedUrl = image?.getImage?.()?.src || "unknown URL";
            console.error(`❌ WMS image load error for ${layerName}:`, {
              layerName,
              url: failedUrl.substring(0, 200) + (failedUrl.length > 200 ? "..." : ""),
              event,
            });
          });

          callback(
            new ImageLayer({
              properties: { rebuildParams, name: finalName, secured: !!wmsNeedsAuth },
              source: imageWMSSource,
            }),
          );
        }
        break;

      case OL_DATA_TYPES.TileWMS:
        {
          const tileWmsNeedsAuth = secured || isSecuredUrl(finalUrl as string);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tileWmsOptions: Record<string, any> = {
            url: finalUrl as string,
            params: {
              LAYERS: layerName,
              TILED: tiled,
            },
            crossOrigin: "anonymous",
          };

          if (tileWmsNeedsAuth) {
            // Debug log for troubleshooting auth detection
            console.debug(`[LayerHelpers] TileWMS layer "${layerName}" using auth:`, {
              explicitlySecured: secured,
              urlDetectedSecured: isSecuredUrl(finalUrl as string),
              url: finalUrl,
            });

            tileWmsOptions.tileLoadFunction = (tile: { getImage: () => HTMLImageElement }, src: string) => {
              const img = tile.getImage();

              getAccessToken().then((token) => {
                if (!token) {
                  img.src = src;
                  return;
                }

                fetch(src, { headers: { Authorization: `Bearer ${token}` } })
                  .then((response) => {
                    if (!response.ok) throw new Error(`TileWMS request failed: ${response.status}`);

                    // Check if response is actually an image (WMS errors return XML)
                    const contentType = response.headers.get("content-type") || "";
                    if (!contentType.startsWith("image/")) {
                      return response.text().then((text) => {
                        console.warn(`[LayerHelpers] TileWMS returned non-image content for ${layerName}:`, text.substring(0, 200));
                        throw new Error("TileWMS returned non-image content");
                      });
                    }

                    return response.blob();
                  })
                  .then((blob) => {
                    if (blob instanceof Blob) {
                      const objectUrl = URL.createObjectURL(blob);
                      img.onload = () => URL.revokeObjectURL(objectUrl);
                      img.src = objectUrl;
                    }
                  })
                  .catch((err) => {
                    console.warn("[LayerHelpers] Secured TileWMS fetch error:", err);
                  });
              });
            };
          }

          callback(
            new TileLayer({
              properties: { rebuildParams, name: finalName, secured: !!tileWmsNeedsAuth },
              source: new TileWMS(tileWmsOptions),
            }),
          );
        }
        break;

      case OL_DATA_TYPES.TileArcGISRest:
        callback(
          new TileLayer({
            properties: { rebuildParams, name: finalName },
            source: new TileArcGISRest({
              url: finalUrl as string,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.ImageArcGISRest:
        {
          // Parse the URL to extract sublayer ID and optional token
          // e.g. "MapServer/3?token=abc" → baseUrl="MapServer", sublayerId="3", token="abc"
          const arcUrl = finalUrl as string;
          const [arcPath, arcQuery] = arcUrl.split("?");
          const arcParts = arcPath.split("/");
          const sublayerId = arcParts[arcParts.length - 1];
          const arcBaseUrl = arcParts.slice(0, -1).join("/");

          // Extract token from query string if present
          let arcToken: string | undefined;
          if (arcQuery) {
            const tokenMatch = arcQuery.match(/token=([^&]+)/);
            if (tokenMatch) arcToken = tokenMatch[1];
          }

          // Fall back to the arcgisTokenStore when the layer is secured but has no token in URL
          if (!arcToken && secured) {
            try {
              // Dynamic import to avoid circular dependencies at module load
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const { useArcGISTokenStore } = require("@/stores/arcgisTokenStore");
              arcToken = useArcGISTokenStore.getState().token ?? undefined;
            } catch {
              // Store unavailable (SSR or first load) — continue without token
            }
          }

          // Build source params
          const arcParams: Record<string, string> = { LAYERS: `SHOW:${sublayerId}` };
          if (arcToken) arcParams["TOKEN"] = arcToken;

          const arcSourceOpts: Record<string, unknown> = {
            url: arcBaseUrl,
            params: arcParams,
            ratio: 1,
            crossOrigin: "anonymous",
            imageLoadFunction: (image: { getImage: () => HTMLImageElement }, src: string) => {
              // Fix DPI for consistent rendering
              let newSrc = src.replace(/DPI=\d+/i, "DPI=96");

              // For secured layers, always inject the latest token from the store
              // This ensures image requests use a fresh token even after refresh
              if (secured) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  const { useArcGISTokenStore } = require("@/stores/arcgisTokenStore");
                  const freshToken = useArcGISTokenStore.getState().token;
                  if (freshToken) {
                    // Replace existing TOKEN param or append it
                    if (/TOKEN=[^&]*/i.test(newSrc)) {
                      newSrc = newSrc.replace(/TOKEN=[^&]*/i, `TOKEN=${freshToken}`);
                    } else {
                      newSrc += `&TOKEN=${freshToken}`;
                    }
                  }
                } catch {
                  // Continue with existing URL
                }
              }

              image.getImage().src = newSrc;
            },
          };

          const arcLayer = new ImageLayer({
            properties: { rebuildParams, name: finalName, isArcGIS: true, secured: !!secured },
            source: new ImageArcGISRest(arcSourceOpts),
          });

          callback(arcLayer);
        }
        break;

      case OL_DATA_TYPES.WMTS:
        {
          // WMTS requires fetching capabilities to get tile matrix set
          const wmtsCapabilitiesUrl = finalUrl as string;
          const capUrl = wmtsCapabilitiesUrl.includes("GetCapabilities")
            ? wmtsCapabilitiesUrl
            : `${wmtsCapabilitiesUrl}${wmtsCapabilitiesUrl.includes("?") ? "&" : "?"}service=WMTS&version=1.0.0&request=GetCapabilities`;

          fetch(capUrl)
            .then((response) => response.text())
            .then((text) => {
              const parser = new WMTSCapabilities();
              const capabilities = parser.read(text);

              // Get available matrix sets from capabilities
              const availableMatrixSets: string[] = capabilities?.Contents?.TileMatrixSet?.map((t: { Identifier: string }) => t.Identifier) || [];

              // Try common matrix sets first, then fall back to available ones
              const matrixSetNames = [
                projection || "EPSG:3857",
                "EPSG:3857",
                "GoogleMapsCompatible",
                "WebMercatorQuad",
                "EPSG:900913",
                "EPSG:4326",
                ...availableMatrixSets, // Add all available matrix sets as fallback
              ];

              // Remove duplicates
              const uniqueMatrixSets = [...new Set(matrixSetNames)];

              let wmtsOptions = null;
              for (const matrixSet of uniqueMatrixSets) {
                try {
                  wmtsOptions = optionsFromCapabilities(capabilities, {
                    layer: layerName,
                    matrixSet: matrixSet,
                  });
                  if (wmtsOptions) {
                    console.log(`✅ WMTS: Found matching matrix set: ${matrixSet} for layer: ${layerName}`);
                    break;
                  }
                } catch (e) {
                  // Try next matrix set - this can happen if the projection isn't registered
                  console.debug(`WMTS: Matrix set ${matrixSet} not compatible:`, e);
                }
              }

              // If still no options, try without specifying matrixSet (let it auto-detect)
              if (!wmtsOptions) {
                try {
                  wmtsOptions = optionsFromCapabilities(capabilities, {
                    layer: layerName,
                  });
                  if (wmtsOptions) {
                    console.log(`✅ WMTS: Auto-detected matrix set for layer: ${layerName}`);
                  }
                } catch (e) {
                  console.error("❌ WMTS: Failed to auto-detect matrix set:", e);
                }
              }

              if (wmtsOptions) {
                wmtsOptions.crossOrigin = "anonymous";
                callback(
                  new TileLayer({
                    properties: { rebuildParams, name: finalName },
                    source: new WMTS(wmtsOptions),
                  }),
                );
              } else {
                console.error("❌ WMTS: Could not create options from capabilities for layer:", layerName);
                console.error(
                  "❌ WMTS: Available layers:",
                  capabilities?.Contents?.Layer?.map((l: { Identifier: string }) => l.Identifier),
                );
                console.error("❌ WMTS: Available matrix sets:", availableMatrixSets);
                callback(null as unknown as Layer);
              }
            })
            .catch((error) => {
              console.error("❌ WMTS: Error fetching capabilities:", error);
              callback(null as unknown as Layer);
            });
        }
        break;

      case OL_DATA_TYPES.SimcoeTiled:
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
          }),
        );
        break;

      case OL_DATA_TYPES.TileImage:
        const resolutions = [
          305.74811314055756, 152.87405657041106, 76.43702828507324, 38.21851414253662, 19.10925707126831, 9.554628535634155, 4.77731426794937, 2.388657133974685, 1.1943285668550503,
          0.5971642835598172, 0.29858214164761665, 0.1492252984505969,
        ];

        let projExtent_ti;
        try {
          projExtent_ti = window.map?.getView()?.getProjection()?.getExtent();
        } catch {
          // Map not available yet, use default Web Mercator extent
          projExtent_ti = [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244];
        }

        const customTileGrid = new TileGrid({
          resolutions: resolutions,
          tileSize: [256, 256],
          origin: projExtent_ti ? getTopLeft(projExtent_ti) : [-20037508.342789244, 20037508.342789244],
        });
        // Use XYZ source with custom tile grid instead of TileImage
        // This ensures proper coordinate handling

        const xyzSource = new XYZ({
          url: finalUrl as string,
          tileGrid: customTileGrid,
          crossOrigin: "anonymous",
        });
        callback(
          new TileLayer({
            properties: { rebuildParams, name: finalName },
            source: xyzSource,
          }),
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

            const axiosClient = getAxiosClient(styleUrl);
            axiosClient
              .get(styleUrl)
              .then((response) => {
                const glStyle = response.data;
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
          }),
        );
        break;

      case OL_DATA_TYPES.KML:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new KML({
                extractStyles: true,
                showPointNames: false,
              }),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.GPX:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new GPX(),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.GML3:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new GML3({ srsName: projection }),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.GML2:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new GML2({ srsName: projection }),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.EsriJSON:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new EsriJSON(),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.TopoJSON:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new TopoJSON(),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.IGC:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new IGC(),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.Polyline:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new Polyline(),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.WKT:
        callback(
          new VectorLayer({
            properties: { rebuildParams, name: finalName },
            source: new Vector({
              format: new WKT(),
              url: finalUrl as string,
              strategy: LoadingStrategyAll,
              loader: vectorFileLoader,
            }),
          }),
        );
        break;

      case OL_DATA_TYPES.LayerGroup:
        this.getGroupedLayer(rebuildParams as unknown as GroupedLayerOptions, callback as unknown as (layer: LayerGroup) => void);
        break;

      default:
        console.warn("LayerHelpers: Unsupported layer type requested:", sourceType);
        console.warn("LayerHelpers: Available types:", Object.values(OL_DATA_TYPES));
        callback(null as unknown as Layer); // Call callback with null to prevent hanging
        return;
    }
  }
}
