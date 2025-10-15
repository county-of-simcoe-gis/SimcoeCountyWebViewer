"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { LayerHelpers, OL_DATA_TYPES } from "@/utils/openlayers";
import { OLDataType } from "@/utils/openlayers/types";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import "@/components/BasemapSwitcher.css";
import { Layer } from "ol/layer";
import { FaCog } from "react-icons/fa";
import Image from "next/image";

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
  const urlParameters = useAppStore((state) => state.urlParameters);
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

  // Load basemap configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configModule = await import("@/components/basemapSwitcherConfig.json");
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
              const layerId = LayerManager.addLayer(newLayer, "BaseMap", `Imagery_${service.name}`, {
                index: 1 + currentIndex, // Start at 1, world imagery will be at higher index (below)
                visible: false,
                metadata: {
                  isImagery: true,
                  imageryIndex: currentIndex,
                  serviceName: service.name,
                },
              });

              // console.log(`🖼️ Added imagery layer "${service.name}" (index: ${currentIndex}, z-index position: ${1 + currentIndex}) with LayerManager ID: ${layerId}`);
            } else {
              console.warn(`Failed to create imagery layer for: ${service.name}`);
            }
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
        }
      );
    },
    [map]
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
      // console.log(`🙈 Hidden topo layer: ${managedLayer.name}`);
    });

    // Show world imagery (background)
    if (worldImageryLayerRef.current) {
      worldImageryLayerRef.current.setVisible(true);
      // console.log("🌍 World imagery set visible");
    } else {
      console.warn("⚠️ worldImageryLayerRef.current is null!");
    }

    // Show imagery layers
    // console.log(`🖼️ About to update imagery layers with slider value: ${imagerySliderValue}`);
    updateImageryLayers(imagerySliderValue);

    // Show streets if enabled
    if (streetsLayerRef.current) {
      streetsLayerRef.current.setVisible(streetsCheckbox);
      // console.log(`🛣️ Streets set visible: ${streetsCheckbox}`);
    }

    setActiveButton("imagery");

    // Debug: Log current layer order
    // console.log("🔍 enableImagery: Current layer order:");
    LayerManager.logLayerOrder();
  }, [imagerySliderValue, streetsCheckbox, updateImageryLayers]);

  const disableImagery = useCallback(() => {
    if (streetsLayerRef.current) {
      streetsLayerRef.current.setVisible(false);
    }
    if (worldImageryLayerRef.current) {
      worldImageryLayerRef.current.setVisible(false);
    }
    setImageryPanelOpen(false);
    updateImageryLayers(-1);
  }, [updateImageryLayers]);

  const enableTopo = useCallback(() => {
    setActiveButton("topo");
    disableImagery();

    // Show basemap layers using LayerManager
    const basemapLayers = LayerManager.getLayersByCategory("BaseMap");
    const topoLayers = basemapLayers.filter((managedLayer) => managedLayer.metadata?.isBasemap === true);
    topoLayers.forEach((managedLayer) => managedLayer.layer.setVisible(true));
  }, [disableImagery]);

  const onStreetsCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoadedRef.current) return;

    if (streetsLayerRef.current) {
      streetsLayerRef.current.setVisible(event.target.checked);
    }
    setStreetsCheckbox(event.target.checked);
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
  };

  const onImagerySelect = () => {
    setTopoPanelOpen(false);
    setActiveButton("imagery");
    enableImagery();
  };

  // Handle URL parameters for basemap configuration
  const handleURLParameters = useCallback(() => {
    if (!config || !isLoadedRef.current) return;

    const basemap = urlParameters.BASEMAP?.toUpperCase() || null;
    const name = urlParameters.NAME?.toUpperCase() || null;
    const imagerySliderOpen = urlParameters.SLIDER_OPEN?.toUpperCase() || null;

    if (basemap === "IMAGERY") {
      enableImagery();

      if (imagerySliderOpen === "TRUE") {
        setImageryPanelOpen(true);
      }

      if (name && config.imageryServices && config.imageryServices.length > 0) {
        for (let index = 0; index < config.imageryServices.length; index++) {
          const service = config.imageryServices[index];
          const serviceName = service.name.toUpperCase();
          if (serviceName === name) {
            updateImageryLayers(index);
            setImagerySliderValue(index);
            return;
          }
        }
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
  }, [config, urlParameters, isLoadedRef, enableImagery, enableTopo, updateImageryLayers, applyBasemap]);

  // Handle URL parameters after initialization
  useEffect(() => {
    if (config && isLoadedRef.current && Object.keys(urlParameters).length > 0) {
      // Add a small delay to ensure all layers are properly loaded
      setTimeout(() => {
        handleURLParameters();
      }, 200);
    }
  }, [config, urlParameters, handleURLParameters]);

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
      <div id="sc-basemap-main-container" className={!map ? "sc-hidden" : ""}>
        <div className="sc-basemap-image-container">
          <button className="sc-basemap-image-button" onClick={onBasemapImageClick} title={`Click to select ${getCurrentBasemapName()}`}>
            <Image src={getCurrentBasemapImage()} alt={getCurrentBasemapName()} width={48} height={48} className="sc-basemap-current-image" style={{ width: "48px", height: "48px" }} />
          </button>

          {/* Settings button overlaid on top of image for imagery */}
          {activeButton === "imagery" && (
            <button className="sc-basemap-settings-overlay" onClick={onSettingsClick} title="Imagery Settings">
              <FaCog size={8} />
            </button>
          )}
        </div>
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
        {/* Imagery Option */}
        <div className={`sc-basemap-topo-item-container${activeButton === "imagery" ? " active" : ""}`} onClick={onImagerySelect} title="Imagery">
          <div className="sc-basemap-topo-item-title">Imagery</div>
          <Image className="sc-basemap-topo-image" src="/images/imagery-basemap.png" alt="Imagery" width={80} height={60} />
        </div>

        {/* Topo Services */}
        {config &&
          config.topoServices.map((service) => (
            <div
              key={service.name}
              className={`sc-basemap-topo-item-container${selectedTopoService?.name === service.name && activeButton === "topo" ? " active" : ""}`}
              onClick={() => onTopoServiceSelect(service)}
              title={service.name}
            >
              <div className="sc-basemap-topo-item-title">{service.name}</div>
              <Image className="sc-basemap-topo-image" src={`/images/${service.image}`} alt={service.name} width={80} height={60} />
            </div>
          ))}
      </div>
    </>
  );
}
