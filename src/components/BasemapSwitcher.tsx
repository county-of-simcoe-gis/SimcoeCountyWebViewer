"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { LayerHelpers, OL_DATA_TYPES } from "@/utils/openlayers";
import { OLDataType } from "@/utils/openlayers/types";
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

  // Layer references
  const imageryLayersRef = useRef<Layer[]>([]);
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

      const layerList: Layer[] = [];
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
              // LAYER PROPS
              newLayer.setProperties({ index: index, name: service.name });
              // Set z-index to 100+ so local imagery is above world imagery (z-index 0)
              newLayer.setZIndex(100 + index);
              // All imagery layers start as invisible - they'll be managed by enableImagery/disableImagery
              newLayer.setVisible(false);

              // ADD THE LAYER
              map.addLayer(newLayer);
              layerList.push(newLayer);
            } else {
              console.warn(`Failed to create imagery layer for: ${service.name}`);
            }
            index++;
          }
        );
      });
      imageryLayersRef.current = layerList;
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
            newLayer.setProperties({ name: "Streets" });
            // Streets overlay should be on top of everything
            newLayer.setZIndex(200);
            newLayer.setVisible(false);
            map.addLayer(newLayer);
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
            newLayer.setProperties({ name: "World Imagery" });
            // World imagery should be at the bottom
            newLayer.setZIndex(0);
            newLayer.setVisible(false);
            map.addLayer(newLayer);
            worldImageryLayerRef.current = newLayer;
          }
        }
      );
    },
    [map]
  );

  // Update imagery layers with fade effect
  const updateImageryLayers = useCallback((value: number) => {
    imageryLayersRef.current.forEach((layer) => {
      if (value === -1) {
        layer.setVisible(false);
      } else {
        const layerIndex = layer.getProperties().index;
        const indexRatio = 1 - Math.abs(layerIndex - value);

        if (layerIndex === value) {
          layer.setOpacity(1);
          layer.setVisible(true);
        } else if (indexRatio <= 0) {
          layer.setOpacity(0);
          layer.setVisible(false);
        } else {
          layer.setOpacity(indexRatio);
          layer.setVisible(true);
        }
      }
    });
  }, []);

  // Apply basemap layers to the map
  const applyBasemap = useCallback(
    async (basemapService: BasemapService) => {
      if (!map) return;

      console.log("BasemapSwitcher: Applying basemap:", basemapService.name);

      // Remove existing basemap layers
      const layersToRemove = map
        .getLayers()
        .getArray()
        .filter((layer) => layer.get("isBasemap"));

      layersToRemove.forEach((layer) => map.removeLayer(layer));

      // Create and add new basemap layers
      const createdLayers: Layer[] = [];
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
                layer.setProperties({
                  name: `${basemapService.name}_${i}`,
                  isBasemap: true,
                  index: i,
                  excludePrint: layerConfig.excludePrint || false,
                  isOverlay: layerConfig.isOverlay || false,
                });

                const zIndex = i * 1000;
                layer.setZIndex(zIndex);

                // Set opacity for overlay layers
                if (layerConfig.isOverlay && layerConfig.type === "ESRI_VECTOR_TILED") {
                  if (layerConfig.url.includes("Hillshade")) {
                    layer.setOpacity(0.3);
                  } else if (layerConfig.url.includes("Topographic") || layerConfig.url.includes("Labels")) {
                    layer.setOpacity(0.8);
                  } else if (layerConfig.url.includes("World_Basemap_v2")) {
                    if (basemapService.name === "Light Grey") {
                      layer.setOpacity(1.0);
                    } else {
                      layer.setOpacity(0.7);
                    }
                  } else {
                    layer.setOpacity(0.8);
                  }
                } else if (layerConfig.isOverlay && layerConfig.type === "ESRI_TILED") {
                  if (layerConfig.url.includes("Hillshade")) {
                    layer.setOpacity(0.3);
                  } else {
                    layer.setOpacity(0.8);
                  }
                }

                createdLayers.push(layer);
              }
              resolve();
            }
          );
        });
      });

      await Promise.all(layerCreationPromises);

      createdLayers.forEach((layer) => {
        map.addLayer(layer);
      });
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

    // Disable topo
    disableTopo();

    // Close panel if already open
    if (imageryPanelOpen) {
      setImageryPanelOpen(false);
    }

    enableImagery();
  };

  const onImageryArrowClick = () => {
    if (!isLoadedRef.current) return;

    // Disable topo
    disableTopo();

    // Toggle imagery panel
    setImageryPanelOpen(!imageryPanelOpen);
    setActiveButton("imagery");

    enableImagery();
  };

  const onTopoButtonClick = () => {
    if (imageryPanelOpen) setImageryPanelOpen(false);
    enableTopo();
  };

  const enableImagery = () => {
    if (!isLoadedRef.current) return;

    updateImageryLayers(imagerySliderValue);
    setActiveButton("imagery");

    if (streetsLayerRef.current) {
      streetsLayerRef.current.setVisible(streetsCheckbox);
    }
    if (worldImageryLayerRef.current) {
      worldImageryLayerRef.current.setVisible(true);
    }

    // Hide topo layers
    const basemapLayers = map
      ?.getLayers()
      .getArray()
      .filter((layer) => layer.get("isBasemap"));
    basemapLayers?.forEach((layer) => layer.setVisible(false));
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

    // Show basemap layers
    const basemapLayers = map
      ?.getLayers()
      .getArray()
      .filter((layer) => layer.get("isBasemap"));
    basemapLayers?.forEach((layer) => layer.setVisible(true));
  };

  const disableTopo = () => {
    const basemapLayers = map
      ?.getLayers()
      .getArray()
      .filter((layer) => layer.get("isBasemap"));
    basemapLayers?.forEach((layer) => layer.setVisible(false));
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
    }
    setContainerCollapsed(!containerCollapsed);
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
            <div className="sc-basemap-imagery">
              <button className={`sc-basemap-imagery-button${activeButton === "imagery" ? " active" : ""}`} onClick={onImageryButtonClick}>
                Imagery
              </button>
              <button className="sc-basemap-arrow" onClick={onImageryArrowClick} />
            </div>

            <div className="sc-basemap-topo">
              <button className={`sc-basemap-topo-button${activeButton === "topo" ? " active" : ""}`} onClick={onTopoButtonClick}>
                Topo
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
    </>
  );
}
