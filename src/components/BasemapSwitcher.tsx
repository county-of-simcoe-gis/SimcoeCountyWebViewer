"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSession } from "next-auth/react";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { LayerHelpers, OL_DATA_TYPES } from "@/utils/openlayers";
import { OLDataType } from "@/utils/openlayers/types";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import "@/styles/rc-slider-basemap.css";
import { Layer } from "ol/layer";
import { MdManageHistory, MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import { setStorageItem, getStorageItem } from "@/utils/storage";
import { setBasemapPrintOnlyDescriptors, type BasemapPrintOnlyDescriptor } from "@/components/basemapPrintOnlyRegistry";
import { trackBasemap } from "@/lib/appStats";
import Image from "next/image";

interface BasemapLayer {
  url: string;
  type: string;
  isOverlay?: boolean;
  display?: boolean;
  print?: boolean;
  fullExtent?: number[];
  minZoom?: number;
  maxZoom?: number;
  rootPath?: string;
  spritePath?: string;
  pngPath?: string;
}

interface BasemapService {
  name: string;
  image: string;
  index: number;
  layers: BasemapLayer[];
}

interface ImageryService {
  url: string;
  name: string;
  fullExtent?: number[];
  type: string;
}

interface BasemapConfig {
  defaultButton: string;
  topoServices: BasemapService[];
  imageryServices: ImageryService[];
  worldImageryService?: string;
  streetService?: {
    url: string;
    fullExtent?: number[];
  };
}

/**
 * Merge two arrays of services by `name`, replicating the old app's
 * concat → reverse → Map-dedup → reverse algorithm.
 *
 * 1. Concatenate: [...local, ...api]  (local items first)
 * 2. Reverse the combined array
 * 3. Build a Map keyed by `name` — last write wins, so because of the
 *    reverse the *first* occurrence from the original order survives
 *    (i.e. local entries beat API entries with the same name).
 * 4. Spread the Map values and reverse back to restore original order.
 *
 * This keeps local ordering intact (e.g. "Google" stays between year
 * entries where the local config placed it) and appends API-only entries
 * at the end.
 */
function mergeServicesByName<T extends { name: string }>(local: T[], api: T[]): T[] {
  const combined = [...local, ...api];

  // reverse → Map (last value per key wins) → values → reverse
  const deduped = [...new Map(combined.reverse().map((item) => [item.name, item])).values()].reverse();

  return deduped;
}

const BASEMAP_STORAGE_KEY = "Saved Basemap Options";

interface SavedBasemapOptions {
  activeButton: string;
  selectedTopoServiceName: string | null;
  imagerySliderValue: number;
  streetsCheckbox: boolean;
}

function saveBasemapOptions(options: SavedBasemapOptions): void {
  try {
    setStorageItem(BASEMAP_STORAGE_KEY, JSON.stringify(options));
  } catch {
    /* ignore */
  }
}

function loadBasemapOptions(): SavedBasemapOptions | null {
  try {
    const stored = getStorageItem(BASEMAP_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as SavedBasemapOptions;
  } catch {
    /* ignore */
  }
  return null;
}

export default function BasemapSwitcher() {
  const map = useMapStore((s) => s.map);
  const urlParameters = useAppStore((state) => state.urlParameters);
  const urlParametersLoaded = useAppStore((state) => state.urlParametersLoaded);
  const [config, setConfig] = useState<BasemapConfig | null>(null);
  const [activeButton, setActiveButton] = useState<string>("topo");

  // Imagery slider state
  const [imagerySliderValue, setImagerySliderValue] = useState(0);
  const [imagerySliderMax, setImagerySliderMax] = useState(0);
  const [imagerySliderMarks, setImagerySliderMarks] = useState<Record<number, string>>({});
  const [imageryPanelOpen, setImageryPanelOpen] = useState(false);
  const [streetsCheckbox, setStreetsCheckbox] = useState(true);

  // Topo panel state
  const [topoPanelOpen, setTopoPanelOpen] = useState(false);
  const [selectedTopoService, setSelectedTopoService] = useState<BasemapService | null>(null);

  // Layer references (simplified with LayerManager)
  const streetsLayerRef = useRef<Layer | null>(null);
  const worldImageryLayerRef = useRef<Layer | null>(null);
  const isLoadedRef = useRef(false);
  const hasProcessedUrlParamsRef = useRef(false);
  const hasSetDefaultSliderRef = useRef(false);

  // Load basemap configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Always start with local basemapSwitcherConfig.json as the base
        const configModule = await import("@/components/basemapSwitcherConfig.json");
        const data: BasemapConfig = { ...configModule.default };
        // console.log("BasemapSwitcher: Loaded local basemapSwitcherConfig.json as base");

        // Merge API-provided basemap config on top (only overrides fields that are present)
        const appConfig = useAppStore.getState().config;
        const apiBasemapServices = appConfig?.baseMapServices as Partial<BasemapConfig> | undefined;

        if (apiBasemapServices) {
          if (apiBasemapServices.defaultButton) {
            data.defaultButton = apiBasemapServices.defaultButton;
          }

          // Merge imagery services: API entries replace matching local entries (by name),
          // API-only entries are appended. Matches old app's mergeObj + dedup-by-name.
          if (Array.isArray(apiBasemapServices.imageryServices) && apiBasemapServices.imageryServices.length > 0) {
            data.imageryServices = mergeServicesByName(data.imageryServices || [], apiBasemapServices.imageryServices);
          }

          // Same merge logic for topo services
          if (Array.isArray(apiBasemapServices.topoServices) && apiBasemapServices.topoServices.length > 0) {
            data.topoServices = mergeServicesByName(data.topoServices || [], apiBasemapServices.topoServices);
          }

          if (apiBasemapServices.streetService) {
            data.streetService = apiBasemapServices.streetService;
          }
          if (apiBasemapServices.worldImageryService) {
            data.worldImageryService = apiBasemapServices.worldImageryService;
          }
          // console.log("BasemapSwitcher: Merged API basemap overrides", Object.keys(apiBasemapServices));
        }

        // Override defaultButton from baseMapType if available
        const baseMapType = appConfig?.baseMapType as string | undefined;
        if (baseMapType) {
          data.defaultButton = baseMapType;
        }

        // Exclude Google imagery when the user is not authenticated (unsecured map)
        const session = await getSession();
        if (!session && data.imageryServices) {
          data.imageryServices = data.imageryServices.filter((s) => s.name !== "Google");
        }

        setConfig(data);

        // Initialize imagery slider settings
        if (data.imageryServices && data.imageryServices.length > 0) {
          const maxValue = data.imageryServices.length - 1;

          setImagerySliderMax(maxValue);

          // Create marks for slider
          const marks: Record<number, string> = {};
          data.imageryServices.forEach((service, index) => {
            marks[index] = service.name;
          });
          setImagerySliderMarks(marks);
        }

        setActiveButton(data.defaultButton || "topo");

        // Initialize selected topo service
        if (data.topoServices && data.topoServices.length > 0) {
          const defaultService = data.topoServices.find((service) => service.name === "Topographic") || data.topoServices[0];
          setSelectedTopoService(defaultService);
        }

        // Restore saved basemap options from localStorage (overrides defaults)
        const saved = loadBasemapOptions();
        if (saved) {
          setActiveButton(saved.activeButton);
          setStreetsCheckbox(saved.streetsCheckbox);
          setImagerySliderValue(saved.imagerySliderValue);
          if (saved.selectedTopoServiceName && data.topoServices) {
            const savedService = data.topoServices.find((s) => s.name === saved.selectedTopoServiceName);
            if (savedService) setSelectedTopoService(savedService);
          }
        }
      } catch (error) {
        console.error("BasemapSwitcher: Failed to load config:", error);
      }
    };

    loadConfig();
  }, []);

  // Load imagery layers
  const loadImageryLayers = useCallback(
    (basemapConfig: BasemapConfig) => {
      if (!map || !basemapConfig.imageryServices) return;

      // Prevent duplicate imagery layers (e.g. from React StrictMode double-invocation)
      const existingImagery = LayerManager.getLayersByCategory("BaseMap").filter((ml) => ml.metadata?.isImagery);
      if (existingImagery.length > 0) return;

      basemapConfig.imageryServices.forEach((service, index) => {
        // Map service types to supported LayerHelpers types
        let sourceType: OLDataType;
        if (service.type === "TileImage") {
          sourceType = OL_DATA_TYPES.TileImage; // Use proper TileImage type with custom tile grid
        } else if (service.type === "XYZ") {
          sourceType = OL_DATA_TYPES.XYZ;
        } else {
          sourceType = OL_DATA_TYPES.XYZ; // Default fallback
        }

        // Capture the current index value for this iteration
        const currentIndex = index;

        LayerHelpers.getLayer(
          {
            sourceType: sourceType,
            source: "rest",
            projection: "EPSG:3857",
            layerName: service.name,
            url: service.url,
            tiled: true,
            extent: service.fullExtent,
            name: service.name,
          },
          (newLayer) => {
            if (newLayer) {
              // All imagery layers start as invisible - they'll be managed by enableImagery/disableImagery
              newLayer.setVisible(false);

              // Add layer using LayerManager with BaseMap category for proper layer ordering
              // Use low index values for high z-index (on top)
              LayerManager.addLayer(newLayer, "BaseMap", `Imagery_${service.name}`, {
                index: 1 + currentIndex, // Start at 1, world imagery will be at higher index (below)
                visible: false,
                metadata: {
                  isImagery: true,
                  imageryIndex: currentIndex,
                  serviceName: service.name,
                },
              });

              // console.log(`🖼️ Added imagery layer "${service.name}" (index: ${currentIndex}, z-index position: ${1 + currentIndex})`);
            } else {
              console.warn(`Failed to create imagery layer for: ${service.name}`);
            }
          },
        );
      });
    },
    [map],
  );

  // Load streets layer
  const loadStreets = useCallback(
    (basemapConfig: BasemapConfig) => {
      if (!map || !basemapConfig.streetService) return;

      // Prevent duplicate streets layers (e.g. from React StrictMode double-invocation)
      const existingStreets = LayerManager.getLayersByCategory("BaseMap").find((ml) => ml.metadata?.isStreets);
      if (existingStreets) {
        streetsLayerRef.current = existingStreets.layer;
        return;
      }

      LayerHelpers.getLayer(
        {
          sourceType: OL_DATA_TYPES.TileImage,
          url: basemapConfig.streetService.url,
          name: "Streets",
          extent: basemapConfig.streetService.fullExtent,
        },
        (newLayer) => {
          if (newLayer) {
            newLayer.setVisible(false);

            // Add streets layer using LayerManager with BaseMap category for proper layer ordering
            // Low index = high z-index (on top of imagery)
            LayerManager.addLayer(newLayer, "BaseMap", "Streets_Overlay", {
              index: 0, // Lowest index = highest z-index (streets on top of everything)
              visible: false,
              metadata: {
                isStreets: true,
                isOverlay: true,
              },
            });

            // console.log(`🛣️ Added streets layer (z-index position: 0 = top layer)`);
            streetsLayerRef.current = newLayer;
          }
        },
      );
    },
    [map],
  );

  // Load world imagery
  const loadWorldImagery = useCallback(
    (basemapConfig: BasemapConfig) => {
      if (!map || !basemapConfig.worldImageryService) return;

      // Prevent duplicate world imagery layers (e.g. from React StrictMode double-invocation)
      const existingWorldImagery = LayerManager.getLayersByCategory("BaseMap").find((ml) => ml.metadata?.isWorldImagery);
      if (existingWorldImagery) {
        worldImageryLayerRef.current = existingWorldImagery.layer;
        return;
      }

      LayerHelpers.getLayer(
        {
          sourceType: OL_DATA_TYPES.XYZ,
          url: basemapConfig.worldImageryService,
          name: "World Imagery",
        },
        (newLayer) => {
          if (newLayer) {
            newLayer.setVisible(false);

            // Add world imagery using LayerManager with BaseMap category for proper layer ordering
            // High index = low z-index (at bottom, behind yearly imagery)
            LayerManager.addLayer(newLayer, "BaseMap", "World_Imagery", {
              index: 50, // High index puts it at bottom (below yearly imagery layers which are at index 1-15)
              visible: false,
              metadata: {
                isWorldImagery: true,
                isBackground: true,
              },
            });

            worldImageryLayerRef.current = newLayer;
          }
        },
      );
    },
    [map],
  );

  // Update imagery layers with fade effect
  const updateImageryLayers = useCallback((value: number) => {
    // Use LayerManager to get imagery layers from BaseMap category
    const baseMapLayers = LayerManager.getLayersByCategory("BaseMap");
    const imageryLayers = baseMapLayers.filter((managedLayer) => managedLayer.metadata?.isImagery === true);

    imageryLayers.forEach((managedLayer) => {
      if (value === -1) {
        managedLayer.layer.setVisible(false);
      } else {
        const layerIndex = managedLayer.metadata?.imageryIndex as number;
        const indexRatio = 1 - Math.abs(layerIndex - value);

        if (layerIndex === value) {
          managedLayer.layer.setOpacity(1);
          managedLayer.layer.setVisible(true);
        } else if (indexRatio <= 0) {
          managedLayer.layer.setOpacity(0);
          managedLayer.layer.setVisible(false);
        } else {
          managedLayer.layer.setOpacity(indexRatio);
          managedLayer.layer.setVisible(true);
        }
      }
    });
  }, []);

  // Apply basemap layers to the map
  const applyBasemap = useCallback(
    async (basemapService: BasemapService) => {
      if (!map) return;

      // console.log("BasemapSwitcher: Applying basemap:", basemapService.name);

      // Clear only the basemap (topo) layers, not imagery/streets/world imagery layers
      const baseMapLayers = LayerManager.getLayersByCategory("BaseMap");
      const basemapLayersToRemove = baseMapLayers.filter((managedLayer) => managedLayer.metadata?.isBasemap === true);
      basemapLayersToRemove.forEach((managedLayer) => {
        LayerManager.removeLayer(managedLayer.id);
      });

      const printOnlyDescriptors: BasemapPrintOnlyDescriptor[] = [];

      // Create and add new basemap layers
      const layerCreationPromises = basemapService.layers.map((layerConfig, i) => {
        return new Promise<void>((resolve) => {
          let sourceType: string;
          switch (layerConfig.type) {
            case "OSM":
              sourceType = OL_DATA_TYPES.OSM;
              break;
            case "XYZ":
              sourceType = OL_DATA_TYPES.XYZ;
              break;
            case "ESRI_TILED":
              sourceType = OL_DATA_TYPES.XYZ;
              break;
            case "SIMCOE_TILED":
              sourceType = OL_DATA_TYPES.SimcoeTiled;
              break;
            case "TileImage":
              sourceType = OL_DATA_TYPES.TileImage;
              break;
            case "ESRI_VECTOR_TILED":
              sourceType = OL_DATA_TYPES.VectorTile;
              break;
            default:
              console.warn("BasemapSwitcher: Unknown layer type", layerConfig.type);
              resolve();
              return;
          }

          LayerHelpers.getLayer(
            {
              sourceType: sourceType as OLDataType,
              url: layerConfig.url,
              name: `${basemapService.name}_${i}`,
              extent: layerConfig.fullExtent,
              minZoom: layerConfig.minZoom,
              maxZoom: layerConfig.maxZoom,
              rootPath: layerConfig.rootPath,
              spritePath: layerConfig.spritePath,
              pngPath: layerConfig.pngPath,
            },
            (layer) => {
              if (layer) {
                // Set opacity for overlay layers
                let opacity = 1.0;
                if (layerConfig.isOverlay && layerConfig.type === "ESRI_VECTOR_TILED") {
                  if (layerConfig.url.includes("Hillshade")) {
                    opacity = 0.3;
                  } else if (layerConfig.url.includes("Topographic") || layerConfig.url.includes("Labels")) {
                    opacity = 0.8;
                  } else if (layerConfig.url.includes("World_Basemap_v2")) {
                    if (basemapService.name === "Light Grey") {
                      opacity = 1.0;
                    } else {
                      opacity = 0.7;
                    }
                  } else {
                    opacity = 0.8;
                  }
                } else if (layerConfig.isOverlay && layerConfig.type === "ESRI_TILED") {
                  if (layerConfig.url.includes("Hillshade")) {
                    opacity = 0.3;
                  } else {
                    opacity = 0.8;
                  }
                }

                // Use display/print flags (default to true if not specified)
                const shouldDisplay = layerConfig.display !== false;
                const shouldPrint = layerConfig.print !== false;

                // Set print property on the layer itself so print request builder can access it
                layer.set("print", shouldPrint);
                layer.set("display", shouldDisplay);

                // Print-only basemap layers are substituted during print-request assembly
                // and should never be added to the live map.
                if (!shouldDisplay && shouldPrint) {
                  const reversedIndex = basemapService.layers.length - 1 - i;
                  printOnlyDescriptors.push({
                    id: `${basemapService.name}_${i}`,
                    basemapServiceName: basemapService.name,
                    basemapLayerName: `${basemapService.name}_${i}`,
                    sourceType: sourceType as OLDataType,
                    url: layerConfig.url,
                    extent: layerConfig.fullExtent,
                    minZoom: layerConfig.minZoom,
                    maxZoom: layerConfig.maxZoom,
                    rootPath: layerConfig.rootPath,
                    spritePath: layerConfig.spritePath,
                    pngPath: layerConfig.pngPath,
                    opacity,
                    printOrder: reversedIndex,
                  });
                  resolve();
                  return;
                }

                // Live-map visibility is driven solely by the display flag.
                const isVisible = shouldDisplay;
                layer.setVisible(isVisible);

                // Add layer using LayerManager for proper z-index management
                // Reverse index so last layer in config array gets the highest z-index (renders on top)
                const reversedIndex = basemapService.layers.length - 1 - i;
                LayerManager.addLayer(layer, "BaseMap", `${basemapService.name}_${i}`, {
                  index: reversedIndex,
                  opacity: opacity,
                  visible: isVisible,
                  metadata: {
                    isBasemap: true,
                    display: shouldDisplay,
                    print: shouldPrint,
                    isOverlay: layerConfig.isOverlay || false,
                    basemapService: basemapService.name,
                    layerConfig: layerConfig,
                  },
                });

                // console.log(`🗺️ Added basemap layer "${basemapService.name}_${i}" with LayerManager ID: ${layerId}`);
              }
              resolve();
            },
          );
        });
      });

      await Promise.all(layerCreationPromises);

      // Replace print-only descriptors for the currently active basemap.
      setBasemapPrintOnlyDescriptors(printOnlyDescriptors);

      // Layers are now added via LayerManager, so no need to add them directly to the map
      // console.log(`🎯 Basemap "${basemapService.name}" applied with proper z-index management`);
    },
    [map],
  );

  // Initialize layers when config loads
  useEffect(() => {
    if (!config || !map) return;

    const initBasemap = async () => {
      loadImageryLayers(config);
      loadStreets(config);
      loadWorldImagery(config);
      isLoadedRef.current = true;

      // Always load the topo basemap layers (needed for switching later).
      // Await so layers are fully created before we toggle visibility.
      if (config.topoServices && config.topoServices.length > 0) {
        const defaultService = config.topoServices.find((service) => service.name === "Topographic") || config.topoServices[0];
        await applyBasemap(defaultService);
      }

      // Set proper visibility based on saved basemap options OR the configured default
      const saved = loadBasemapOptions();
      const effectiveButton = saved?.activeButton || config.defaultButton;

      if (effectiveButton === "imagery") {
        // Imagery mode — hide topo, show imagery
        // Use LayerManager to toggle ALL layers by metadata (avoids stale-ref issues)
        const baseMapLayers = LayerManager.getLayersByCategory("BaseMap");
        const streets = saved?.streetsCheckbox ?? streetsCheckbox;
        baseMapLayers.forEach((ml) => {
          if (ml.metadata?.isBasemap) ml.layer.setVisible(false);
          if (ml.metadata?.isWorldImagery) ml.layer.setVisible(true);
          if (ml.metadata?.isStreets) ml.layer.setVisible(streets);
        });

        const sliderValue = saved?.imagerySliderValue ?? (config.imageryServices?.length ? config.imageryServices.length - 1 : 0);
        updateImageryLayers(sliderValue);
        setImagerySliderValue(sliderValue);
        setStreetsCheckbox(streets);

        setActiveButton("imagery");
      } else {
        // Topo mode — disable all imagery layers, apply saved topo service
        // Use LayerManager to toggle ALL layers by metadata
        const baseMapLayers = LayerManager.getLayersByCategory("BaseMap");
        baseMapLayers.forEach((ml) => {
          if (ml.metadata?.isWorldImagery) ml.layer.setVisible(false);
          if (ml.metadata?.isStreets) ml.layer.setVisible(false);
        });
        updateImageryLayers(-1);

        // Apply saved topo service if different from the default
        if (saved?.selectedTopoServiceName && config.topoServices) {
          const savedService = config.topoServices.find((s) => s.name === saved.selectedTopoServiceName);
          if (savedService) {
            setSelectedTopoService(savedService);
            await applyBasemap(savedService);
          }
        }

        setActiveButton("topo");
      }
    };

    initBasemap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, map, loadImageryLayers, loadStreets, loadWorldImagery, applyBasemap, updateImageryLayers]);

  // Track the last slider value we already reported to avoid duplicate stats
  const lastTrackedSliderValueRef = useRef<number | null>(null);
  const sliderTrackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackSliderBasemap = useCallback(
    (sliderValue: number) => {
      const roundedValue = Math.round(sliderValue);
      if (roundedValue === lastTrackedSliderValueRef.current) return;
      lastTrackedSliderValueRef.current = roundedValue;

      const serviceName = config?.imageryServices?.[roundedValue]?.name;
      if (serviceName) {
        trackBasemap(`Imagery - ${serviceName}`);
      }
    },
    [config],
  );

  // Clean up any pending slider tracking timeout on unmount
  useEffect(() => {
    return () => {
      if (sliderTrackTimeoutRef.current) {
        clearTimeout(sliderTrackTimeoutRef.current);
      }
    };
  }, []);

  // Event handlers
  const onSliderChange = (value: number | number[]) => {
    const sliderValue = Array.isArray(value) ? value[0] : value;
    updateImageryLayers(sliderValue);
    setImagerySliderValue(sliderValue);

    // Fallback for rc-slider controlled-mode issue where onChangeComplete
    // may not fire: track the final basemap after the user stops moving.
    if (sliderTrackTimeoutRef.current) {
      clearTimeout(sliderTrackTimeoutRef.current);
    }
    sliderTrackTimeoutRef.current = setTimeout(() => {
      trackSliderBasemap(sliderValue);
    }, 400);
  };

  const onSliderAfterChange = (value: number | number[]) => {
    if (sliderTrackTimeoutRef.current) {
      clearTimeout(sliderTrackTimeoutRef.current);
      sliderTrackTimeoutRef.current = null;
    }
    const sliderValue = Array.isArray(value) ? value[0] : value;
    trackSliderBasemap(sliderValue);
  };

  const onBasemapImageClick = () => {
    if (!isLoadedRef.current) return;

    if (activeButton === "imagery") {
      // Close topo panel if open
      if (topoPanelOpen) setTopoPanelOpen(false);
      // Toggle topo panel
      setTopoPanelOpen(!topoPanelOpen);
    } else if (activeButton === "topo") {
      // Close imagery panel if open
      if (imageryPanelOpen) setImageryPanelOpen(false);
      // Toggle topo panel
      setTopoPanelOpen(!topoPanelOpen);
    }
  };

  const onSettingsClick = () => {
    if (!isLoadedRef.current) return;

    // Settings button only works for imagery
    if (activeButton === "imagery") {
      // Close topo panel if open
      if (topoPanelOpen) setTopoPanelOpen(false);
      // Toggle imagery panel
      setImageryPanelOpen(!imageryPanelOpen);
    }
  };

  // Helper function to get the current basemap image
  const getCurrentBasemapImage = () => {
    if (activeButton === "imagery") {
      return "/images/imagery-basemap.png";
    } else if (activeButton === "topo" && selectedTopoService) {
      return `/images/${selectedTopoService.image}`;
    }
    return "/images/topo.png"; // fallback
  };

  // Helper function to get the current basemap name
  const getCurrentBasemapName = () => {
    if (activeButton === "imagery") {
      return "Imagery";
    } else if (activeButton === "topo" && selectedTopoService) {
      return selectedTopoService.name;
    }
    return "Topographic"; // fallback
  };

  const enableImagery = useCallback(() => {
    if (!isLoadedRef.current) {
      console.warn("⚠️ enableImagery called but isLoadedRef is false");
      return;
    }

    // console.log("🖼️ enableImagery: Starting imagery mode");

    // Check what layers we have
    const basemapLayers = LayerManager.getLayersByCategory("BaseMap");
    // console.log(`🔍 Total BaseMap layers: ${basemapLayers.length}`);
    // console.log(`🔍 BaseMap layer breakdown:`, {
    //   imageryLayers: basemapLayers.filter((l) => l.metadata?.isImagery).length,
    //   topoLayers: basemapLayers.filter((l) => l.metadata?.isBasemap).length,
    //   worldImagery: basemapLayers.filter((l) => l.metadata?.isWorldImagery).length,
    //   streets: basemapLayers.filter((l) => l.metadata?.isStreets).length,
    // });

    // Hide topo basemap layers first
    const topoLayers = basemapLayers.filter((managedLayer) => managedLayer.metadata?.isBasemap === true);
    topoLayers.forEach((managedLayer) => {
      managedLayer.layer.setVisible(false);
    });

    // Show world imagery and streets via LayerManager
    // (ensures ALL instances are toggled, not just the ref)
    basemapLayers.forEach((ml) => {
      if (ml.metadata?.isWorldImagery) ml.layer.setVisible(true);
      if (ml.metadata?.isStreets) ml.layer.setVisible(streetsCheckbox);
    });

    // Show imagery layers
    updateImageryLayers(imagerySliderValue);

    setActiveButton("imagery");

    // Debug: Log current layer order
    // console.log("🔍 enableImagery: Current layer order:");
    // LayerManager.logLayerOrder();
  }, [imagerySliderValue, streetsCheckbox, updateImageryLayers]);

  const disableImagery = useCallback(() => {
    // Use LayerManager to hide ALL world imagery and streets layers
    // (refs may miss duplicates created by React StrictMode double-invocation)
    const baseMapLayers = LayerManager.getLayersByCategory("BaseMap");
    baseMapLayers.forEach((ml) => {
      if (ml.metadata?.isWorldImagery) ml.layer.setVisible(false);
      if (ml.metadata?.isStreets) ml.layer.setVisible(false);
    });
    setImageryPanelOpen(false);
    updateImageryLayers(-1);
  }, [updateImageryLayers]);

  const enableTopo = useCallback(() => {
    setActiveButton("topo");
    disableImagery();

    // Show basemap layers using LayerManager (only those with display: true)
    const basemapLayers = LayerManager.getLayersByCategory("BaseMap");
    const topoLayers = basemapLayers.filter((managedLayer) => managedLayer.metadata?.isBasemap === true);
    topoLayers.forEach((managedLayer) => {
      // Only show layers that have display: true
      const shouldShow = managedLayer.metadata?.display !== false;
      managedLayer.layer.setVisible(shouldShow);
    });
  }, [disableImagery]);

  const onStreetsCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoadedRef.current) return;

    if (streetsLayerRef.current) {
      streetsLayerRef.current.setVisible(event.target.checked);
    }
    setStreetsCheckbox(event.target.checked);
    saveBasemapOptions({
      activeButton,
      selectedTopoServiceName: selectedTopoService?.name ?? null,
      imagerySliderValue,
      streetsCheckbox: event.target.checked,
    });
  };

  const onTopoServiceSelect = (service: BasemapService) => {
    setSelectedTopoService(service);
    // Disable imagery layers first if switching from imagery
    if (activeButton === "imagery") {
      disableImagery();
    }
    applyBasemap(service);
    setTopoPanelOpen(false);
    setActiveButton("topo");
    trackBasemap(service.name);
    saveBasemapOptions({
      activeButton: "topo",
      selectedTopoServiceName: service.name,
      imagerySliderValue,
      streetsCheckbox,
    });
  };

  const onImagerySelect = () => {
    setTopoPanelOpen(false);
    setActiveButton("imagery");
    enableImagery();
    const currentImageryName = config?.imageryServices?.[imagerySliderValue]?.name;
    trackBasemap(currentImageryName ? `Imagery - ${currentImageryName}` : "Imagery");
    saveBasemapOptions({
      activeButton: "imagery",
      selectedTopoServiceName: selectedTopoService?.name ?? null,
      imagerySliderValue,
      streetsCheckbox,
    });
  };

  // Helper to get URL parameter value case-insensitively
  const getUrlParam = useCallback(
    (paramName: string): string | null => {
      // Try exact match first
      if (urlParameters[paramName] !== undefined) {
        return urlParameters[paramName];
      }
      // Try case-insensitive match
      const upperName = paramName.toUpperCase();
      const lowerName = paramName.toLowerCase();
      for (const key of Object.keys(urlParameters)) {
        if (key.toUpperCase() === upperName || key.toLowerCase() === lowerName) {
          return urlParameters[key];
        }
      }
      return null;
    },
    [urlParameters],
  );

  // Handle URL parameters for basemap configuration
  const handleURLParameters = useCallback(() => {
    if (!config || !isLoadedRef.current) return;

    const basemap = getUrlParam("BASEMAP")?.toUpperCase() || null;
    const name = getUrlParam("NAME")?.toUpperCase() || null;
    const imagerySliderOpen = getUrlParam("SLIDER_OPEN")?.toUpperCase() || null;

    // Only process if we have relevant URL parameters
    if (!basemap) return;

    // Mark that we've processed URL parameters
    hasProcessedUrlParamsRef.current = true;
    hasSetDefaultSliderRef.current = true;

    if (basemap === "IMAGERY") {
      // Determine the target imagery index from NAME parameter
      // Default to the newest imagery (max index) if no NAME match found
      let targetIndex = config.imageryServices.length - 1;

      if (name && config.imageryServices && config.imageryServices.length > 0) {
        for (let index = 0; index < config.imageryServices.length; index++) {
          const service = config.imageryServices[index];
          const serviceName = service.name.toUpperCase();
          if (serviceName === name) {
            targetIndex = index;
            break;
          }
        }
      }

      // Enable imagery mode (sets up visibility for world imagery, streets, etc.)
      // But temporarily handle layer visibility ourselves to avoid using stale state

      // Hide topo basemap layers first
      const baseMapLayers = LayerManager.getLayersByCategory("BaseMap");
      const topoLayers = baseMapLayers.filter((managedLayer) => managedLayer.metadata?.isBasemap === true);
      topoLayers.forEach((managedLayer) => {
        managedLayer.layer.setVisible(false);
      });

      // Show world imagery and streets via LayerManager
      baseMapLayers.forEach((ml) => {
        if (ml.metadata?.isWorldImagery) ml.layer.setVisible(true);
        if (ml.metadata?.isStreets) ml.layer.setVisible(streetsCheckbox);
      });

      // Show imagery layers with correct target index
      updateImageryLayers(targetIndex);

      setActiveButton("imagery");
      setImagerySliderValue(targetIndex);

      if (imagerySliderOpen === "TRUE") {
        setImageryPanelOpen(true);
      }
    } else if (basemap === "TOPO") {
      enableTopo();

      if (name && config.topoServices && config.topoServices.length > 0) {
        for (let index = 0; index < config.topoServices.length; index++) {
          const service = config.topoServices[index];
          const serviceName = service.name.toUpperCase();
          if (serviceName === name) {
            setSelectedTopoService(service);
            applyBasemap(service);
            return;
          }
        }
      }
    }
  }, [config, getUrlParam, streetsCheckbox, updateImageryLayers, enableTopo, applyBasemap]);

  // Handle URL parameters after initialization OR set defaults if no URL params
  useEffect(() => {
    // Only process once
    if (hasProcessedUrlParamsRef.current) return;
    // Wait for config, layers to be loaded, AND URL params to be loaded from the URL
    if (!config || !isLoadedRef.current || !urlParametersLoaded) return;

    // Check for BASEMAP param case-insensitively
    const hasBasemapParam = Boolean(getUrlParam("BASEMAP"));

    if (hasBasemapParam) {
      // Process URL params with a small delay to ensure layers are loaded
      setTimeout(() => {
        if (!hasProcessedUrlParamsRef.current) {
          handleURLParameters();
        }
      }, 200);
    } else {
      // No BASEMAP URL param, set defaults
      hasSetDefaultSliderRef.current = true;
      hasProcessedUrlParamsRef.current = true;
      const maxValue = config.imageryServices.length - 1;
      setImagerySliderValue(maxValue);
    }
  }, [config, urlParameters, urlParametersLoaded, getUrlParam, handleURLParameters]);

  if (!config || !map) {
    return null;
  }

  const sliderWrapperStyle = {
    width: 4,
    marginLeft: -9,
    height: 225,
    marginTop: 8,
    marginBottom: 15,
  };

  return (
    <>
      <div
        id="sc-basemap-main-container"
        className={`absolute right-[2px] top-0 w-[100px] bg-base-100 border border-base-300 p-[2px] opacity-90 rounded z-[2] outline-none hover:opacity-100${!map ? " hidden" : ""}`}
      >
        <div className="relative">
          <button
            className="border-none bg-transparent p-0 cursor-pointer outline-none block"
            style={{ width: "100%", height: "auto", borderRadius: 0, margin: 0 }}
            onClick={onBasemapImageClick}
            title={`Click to select ${getCurrentBasemapName()}`}
          >
            <Image src={getCurrentBasemapImage()} alt={getCurrentBasemapName()} width={70} height={49} className="block" style={{ width: "100%", height: "auto", borderRadius: 0 }} />
          </button>

          {/* Settings button overlaid on top of image for imagery */}
          {activeButton === "imagery" && (
            <button
              className="absolute bottom-0 left-0 right-0 bg-base-300 border border-base-content/50 rounded-sm cursor-pointer px-1 !flex flex-row items-center justify-center gap-0.5 text-base-content transition-all duration-200 h-6 max-h-6 overflow-hidden z-[3] hover:bg-base-200 hover:text-base-content hover:opacity-90"
              style={{ width: "100%", margin: 0 }}
              onClick={onSettingsClick}
              title="Select imagery year and settings"
            >
              <MdManageHistory size={20} />
              <span className="text-[9pt] font-bold">Imagery</span>
              {imageryPanelOpen ? <MdKeyboardArrowDown size={20} /> : <MdKeyboardArrowUp size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Imagery Slider Panel */}
      <div
        className={`basemap-slider-container absolute right-[2px] w-[88px] h-[280px] top-[70px] bg-base-100 rounded z-[2] border border-base-300 p-2 opacity-90 select-none transition-opacity duration-200 hover:opacity-100${!imageryPanelOpen ? " hidden" : ""}`}
      >
        <label className="block text-[8pt] ml-2.5 pb-[5px] pt-0">
          <input className="w-[13px] h-[13px] p-0 m-0 align-middle relative -top-px scale-110" type="checkbox" checked={streetsCheckbox} onChange={onStreetsCheckbox} />
          &nbsp;Streets
        </label>

        <Slider
          vertical
          included={false}
          style={sliderWrapperStyle}
          marks={imagerySliderMarks}
          max={imagerySliderMax}
          min={0}
          step={0.01}
          value={imagerySliderValue}
          onChange={onSliderChange}
          onChangeComplete={onSliderAfterChange}
        />
      </div>

      {/* Topo Options Panel */}
      <div
        className={`absolute right-[2px] w-[120px] top-[70px] bg-base-100 rounded z-[2] border border-base-300 p-1 opacity-90 select-none transition-opacity duration-200 flex flex-col gap-1.5 max-h-[400px] overflow-y-auto hover:opacity-100${!topoPanelOpen ? " hidden" : ""}`}
      >
        {/* Imagery Option */}
        <div
          className={`p-0 border border-base-300 rounded cursor-pointer bg-base-200 transition-all duration-200 flex flex-col items-center text-center min-h-[70px] hover:bg-primary/10 hover:border-primary/50 hover:shadow-[0_0_3px_rgba(0,123,255,0.3)]${activeButton === "imagery" ? " !bg-success/20 !border-success text-success-content shadow-[0_0_3px_rgba(40,167,69,0.3)]" : ""}`}
          onClick={onImagerySelect}
          title="Imagery"
        >
          <div className="text-[9px] font-bold mb-0 text-inherit whitespace-nowrap overflow-hidden text-ellipsis w-full">Imagery</div>
          <Image className="rounded-[3px] border border-base-300 object-cover max-w-[72px] max-h-[50px]" src="/images/imagery-basemap.png" alt="Imagery" width={80} height={60} />
        </div>

        {/* Topo Services */}
        {config &&
          config.topoServices?.map((service) => (
            <div
              key={service.name}
              className={`p-0 border border-base-300 rounded cursor-pointer bg-base-200 transition-all duration-200 flex flex-col items-center text-center min-h-[70px] hover:bg-primary/10 hover:border-primary/50 hover:shadow-[0_0_3px_rgba(0,123,255,0.3)]${selectedTopoService?.name === service.name && activeButton === "topo" ? " !bg-success/20 !border-success text-success-content shadow-[0_0_3px_rgba(40,167,69,0.3)]" : ""}`}
              onClick={() => onTopoServiceSelect(service)}
              title={service.name}
            >
              <div className="text-[9px] font-bold mb-0 text-inherit whitespace-nowrap overflow-hidden text-ellipsis w-full">{service.name}</div>
              <Image className="rounded-[3px] border border-base-300 object-cover max-w-[72px] max-h-[50px]" src={`/images/${service.image}`} alt={service.name} width={80} height={60} />
            </div>
          ))}
      </div>
    </>
  );
}
