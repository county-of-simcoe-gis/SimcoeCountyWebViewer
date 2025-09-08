"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useMapStore } from "@/stores/mapStore";
import { LayerHelpers, OL_DATA_TYPES } from "@/utils/openlayers";
import { OLDataType } from "@/utils/openlayers/types";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import "./BasemapSwitcher.css";
import { Layer } from "ol/layer";

interface BasemapLayer {
  url: string;
  type: string;
  isOverlay?: boolean;
  excludePrint?: boolean;
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

export default function BasemapSwitcher() {
  const { map } = useMapStore();
  const [config, setConfig] = useState<BasemapConfig | null>(null);
  const [activeButton, setActiveButton] = useState<string>("topo");

  // Imagery slider state
  const [imagerySliderValue, setImagerySliderValue] = useState(0);
  const [imagerySliderMax, setImagerySliderMax] = useState(0);
  const [imagerySliderMarks, setImagerySliderMarks] = useState<Record<number, string>>({});
  const [imageryPanelOpen, setImageryPanelOpen] = useState(false);
  const [streetsCheckbox, setStreetsCheckbox] = useState(true);
  const [containerCollapsed, setContainerCollapsed] = useState(false);

  // Topo panel state
  const [topoPanelOpen, setTopoPanelOpen] = useState(false);
  const [selectedTopoService, setSelectedTopoService] = useState<BasemapService | null>(null);

  // Layer references (simplified with LayerManager)
  const streetsLayerRef = useRef<Layer | null>(null);
  const worldImageryLayerRef = useRef<Layer | null>(null);
  const isLoadedRef = useRef(false);

  // Load basemap configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configModule = await import("./basemapSwitcherConfig.json");
        const data = configModule.default;
        setConfig(data);

        // Initialize imagery slider settings
        if (data.imageryServices && data.imageryServices.length > 0) {
          const maxValue = data.imageryServices.length - 1;
          const defaultValue = maxValue; // Default to newest imagery

          setImagerySliderMax(maxValue);
          setImagerySliderValue(defaultValue);

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

      let index = 0;

      basemapConfig.imageryServices.forEach((service) => {
        // Map service types to supported LayerHelpers types
        let sourceType: OLDataType;
        if (service.type === "TileImage") {
          sourceType = OL_DATA_TYPES.TileImage; // Use proper TileImage type with custom tile grid
        } else if (service.type === "XYZ") {
          sourceType = OL_DATA_TYPES.XYZ;
        } else {
          sourceType = OL_DATA_TYPES.XYZ; // Default fallback
        }

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

              // Add layer using LayerManager with TOC category for proper layer ordering
              LayerManager.addLayer(newLayer, "TOC", `Imagery_${service.name}`, {
                index: 5 + index, // Put imagery layers at bottom of TOC category (above BaseMap, below other TOC layers)
                visible: false,
                metadata: {
                  isImagery: true,
                  imageryIndex: index,
                  serviceName: service.name,
                },
              });

              // console.log(`🖼️ Added imagery layer "${service.name}" with LayerManager ID: ${layerId}`);
            } else {
              console.warn(`Failed to create imagery layer for: ${service.name}`);
            }
            index++;
          }
        );
      });
    },
    [map]
  );

  // Load streets layer
  const loadStreets = useCallback(
    (basemapConfig: BasemapConfig) => {
      if (!map || !basemapConfig.streetService) return;

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

            // Add streets layer using LayerManager with TOC category for proper layer ordering
            LayerManager.addLayer(newLayer, "TOC", "Streets_Overlay", {
              index: 20, // Put streets above imagery layers in TOC category
              visible: false,
              metadata: {
                isStreets: true,
                isOverlay: true,
              },
            });

            // console.log(`🛣️ Added streets layer with LayerManager ID: ${layerId}`);
            streetsLayerRef.current = newLayer;
          }
        }
      );
    },
    [map]
  );

  // Load world imagery
  const loadWorldImagery = useCallback(
    (basemapConfig: BasemapConfig) => {
      if (!map || !basemapConfig.worldImageryService) return;

      LayerHelpers.getLayer(
        {
          sourceType: OL_DATA_TYPES.XYZ,
          url: basemapConfig.worldImageryService,
          name: "World Imagery",
        },
        (newLayer) => {
          if (newLayer) {
            newLayer.setVisible(false);

            // Add world imagery using LayerManager with TOC category for proper layer ordering
            LayerManager.addLayer(newLayer, "TOC", "World_Imagery", {
              index: 0, // Put world imagery at bottom of TOC category (below individual imagery layers)
              visible: false,
              metadata: {
                isWorldImagery: true,
                isBackground: true,
              },
            });

            // console.log(`🌍 Added world imagery layer with LayerManager ID: ${layerId}`);
            worldImageryLayerRef.current = newLayer;
          }
        }
      );
    },
    [map]
  );

  // Update imagery layers with fade effect
  const updateImageryLayers = useCallback((value: number) => {
    // Use LayerManager to get imagery layers from TOC category
    const tocLayers = LayerManager.getLayersByCategory("TOC");
    const imageryLayers = tocLayers.filter((managedLayer) => managedLayer.metadata?.isImagery === true);

    // console.log(`🔍 updateImageryLayers: Found ${imageryLayers.length} imagery layers, slider value: ${value}`);

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

      // Clear existing basemap layers using LayerManager
      LayerManager.clearCategory("BaseMap");

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

                // Add layer using LayerManager for proper z-index management
                LayerManager.addLayer(layer, "BaseMap", `${basemapService.name}_${i}`, {
                  index: i,
                  opacity: opacity,
                  metadata: {
                    isBasemap: true,
                    excludePrint: layerConfig.excludePrint || false,
                    isOverlay: layerConfig.isOverlay || false,
                    basemapService: basemapService.name,
                    layerConfig: layerConfig,
                  },
                });

                // console.log(`🗺️ Added basemap layer "${basemapService.name}_${i}" with LayerManager ID: ${layerId}`);
              }
              resolve();
            }
          );
        });
      });

      await Promise.all(layerCreationPromises);

      // Layers are now added via LayerManager, so no need to add them directly to the map
      // console.log(`🎯 Basemap "${basemapService.name}" applied with proper z-index management`);
    },
    [map]
  );

  // Initialize layers when config loads
  useEffect(() => {
    if (config && map) {
      loadImageryLayers(config);
      loadStreets(config);
      loadWorldImagery(config);
      isLoadedRef.current = true;

      // Apply default basemap and ensure proper layer visibility
      if (config.topoServices.length > 0) {
        const defaultService = config.topoServices.find((service) => service.name === "Topographic") || config.topoServices[0];
        applyBasemap(defaultService);

        // Since topo is default, ensure all imagery is disabled
        // Use setTimeout to ensure layers are loaded before disabling
        setTimeout(() => {
          // Disable imagery layers directly
          updateImageryLayers(-1);
          if (streetsLayerRef.current) {
            streetsLayerRef.current.setVisible(false);
          }
          if (worldImageryLayerRef.current) {
            worldImageryLayerRef.current.setVisible(false);
          }

          // Debug: Log layer order after initialization
          // console.log("🔍 BasemapSwitcher: Logging layer order after initialization:");
          LayerManager.logLayerOrder();
        }, 100);
      }
    }
  }, [config, map, loadImageryLayers, loadStreets, loadWorldImagery, applyBasemap, updateImageryLayers]);

  // Event handlers
  const onSliderChange = (value: number | number[]) => {
    const sliderValue = Array.isArray(value) ? value[0] : value;
    updateImageryLayers(sliderValue);
    setImagerySliderValue(sliderValue);
  };

  const onImageryButtonClick = () => {
    if (!isLoadedRef.current) return;

    // Always close both panels when clicking main buttons
    setImageryPanelOpen(false);
    setTopoPanelOpen(false);

    // Always switch to imagery and ensure proper layer management
    disableTopo();
    enableImagery();
  };

  const onTopoButtonClick = () => {
    if (!isLoadedRef.current) return;

    // Always close both panels when clicking main buttons
    setImageryPanelOpen(false);
    setTopoPanelOpen(false);

    // Always switch to topo and ensure proper layer management
    enableTopo();
  };

  const onSettingsClick = () => {
    if (!isLoadedRef.current) return;

    if (activeButton === "imagery") {
      // Close topo panel if open
      if (topoPanelOpen) setTopoPanelOpen(false);
      // Toggle imagery panel
      setImageryPanelOpen(!imageryPanelOpen);
    } else if (activeButton === "topo") {
      // Close imagery panel if open
      if (imageryPanelOpen) setImageryPanelOpen(false);
      // Toggle topo panel
      setTopoPanelOpen(!topoPanelOpen);
    }
  };

  const enableImagery = () => {
    if (!isLoadedRef.current) return;

    // console.log("🖼️ enableImagery: Starting imagery mode");

    // Hide topo basemap layers first
    const basemapLayers = LayerManager.getLayersByCategory("BaseMap");
    const topoLayers = basemapLayers.filter((managedLayer) => managedLayer.metadata?.isBasemap === true);
    topoLayers.forEach((managedLayer) => {
      managedLayer.layer.setVisible(false);
      // console.log(`🙈 Hidden topo layer: ${managedLayer.name}`);
    });

    // Show world imagery (background)
    if (worldImageryLayerRef.current) {
      worldImageryLayerRef.current.setVisible(true);
      // console.log("🌍 World imagery set visible");
    }

    // Show imagery layers
    updateImageryLayers(imagerySliderValue);
    // console.log(`🖼️ Updated imagery layers with slider value: ${imagerySliderValue}`);

    // Show streets if enabled
    if (streetsLayerRef.current) {
      streetsLayerRef.current.setVisible(streetsCheckbox);
      // console.log(`🛣️ Streets set visible: ${streetsCheckbox}`);
    }

    setActiveButton("imagery");

    // Debug: Log current layer order
    // console.log("🔍 enableImagery: Current layer order:");
    LayerManager.logLayerOrder();
  };

  const disableImagery = () => {
    if (streetsLayerRef.current) {
      streetsLayerRef.current.setVisible(false);
    }
    if (worldImageryLayerRef.current) {
      worldImageryLayerRef.current.setVisible(false);
    }
    setImageryPanelOpen(false);
    updateImageryLayers(-1);
  };

  const enableTopo = () => {
    setActiveButton("topo");
    disableImagery();

    // Show basemap layers using LayerManager
    const basemapLayers = LayerManager.getLayersByCategory("BaseMap");
    const topoLayers = basemapLayers.filter((managedLayer) => managedLayer.metadata?.isBasemap === true);
    topoLayers.forEach((managedLayer) => managedLayer.layer.setVisible(true));
  };

  const disableTopo = () => {
    // Hide basemap layers using LayerManager
    const basemapLayers = LayerManager.getLayersByCategory("BaseMap");
    const topoLayers = basemapLayers.filter((managedLayer) => managedLayer.metadata?.isBasemap === true);
    topoLayers.forEach((managedLayer) => managedLayer.layer.setVisible(false));
  };

  const onStreetsCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoadedRef.current) return;

    if (streetsLayerRef.current) {
      streetsLayerRef.current.setVisible(event.target.checked);
    }
    setStreetsCheckbox(event.target.checked);
  };

  const onCollapsedClick = () => {
    if (!containerCollapsed) {
      setImageryPanelOpen(false);
      setTopoPanelOpen(false);
    }
    setContainerCollapsed(!containerCollapsed);
  };

  const onTopoServiceSelect = (service: BasemapService) => {
    setSelectedTopoService(service);
    applyBasemap(service);
    setTopoPanelOpen(false);
  };

  if (!config || !map) {
    return null;
  }

  const sliderWrapperStyle = {
    width: 4,
    marginLeft: 15,
    height: 225,
    marginTop: 8,
    marginBottom: 15,
  };

  return (
    <>
      <div className={`sc-basemap-main-container${!map ? " sc-hidden" : ""}`}>
        <div className={`sc-basemap-collapse-button ${containerCollapsed ? "closed" : "open"}`} onClick={onCollapsedClick} />

        {!containerCollapsed && (
          <>
            <div className="sc-basemap-buttons-row">
              <div className="sc-basemap-imagery">
                <button className={`sc-basemap-imagery-button${activeButton === "imagery" ? " active" : ""}`} onClick={onImageryButtonClick}>
                  Imagery
                </button>
              </div>

              <div className="sc-basemap-topo">
                <button className={`sc-basemap-topo-button${activeButton === "topo" ? " active" : ""}`} onClick={onTopoButtonClick}>
                  Topo
                </button>
              </div>
            </div>

            <div className="sc-basemap-settings-row">
              <button className="sc-basemap-settings-button" onClick={onSettingsClick}>
                <Image src="/images/settings.png" alt="Settings" width={20} height={20} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Imagery Slider Panel */}
      <div className={`sc-basemap-imagery-slider-container${!imageryPanelOpen ? " sc-hidden" : ""}`}>
        <label className="sc-basemap-streets-label">
          <input className="sc-basemap-streets-checkbox" type="checkbox" checked={streetsCheckbox} onChange={onStreetsCheckbox} />
          &nbsp;Streets
        </label>

        <Slider vertical included={false} style={sliderWrapperStyle} marks={imagerySliderMarks} max={imagerySliderMax} min={0} step={0.01} value={imagerySliderValue} onChange={onSliderChange} />
      </div>

      {/* Topo Options Panel */}
      <div className={`sc-basemap-topo-options-container${!topoPanelOpen ? " sc-hidden" : ""}`}>
        {config &&
          config.topoServices.map((service) => (
            <button key={service.name} className={`sc-basemap-topo-option${selectedTopoService?.name === service.name ? " active" : ""}`} onClick={() => onTopoServiceSelect(service)}>
              {service.name}
            </button>
          ))}
      </div>
    </>
  );
}
