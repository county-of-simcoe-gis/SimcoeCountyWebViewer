import { createContext, useState, useRef, useEffect } from "react";
import { LayerHelpers, OL_DATA_TYPES } from "../helpers/OLHelpers";
import { Group as LayerGroup } from "ol/layer.js";
import xml2js from "xml2js";
import * as helpers from "../helpers/helpers";
import BasemapConfig from "./basemapSwitcherConfig.json";
import { set } from "date-fns";

const BasemapSwitcherContext = createContext();
export function BasemapSwitcherProvider({ children }) {
  const [baseMapServicesOptions, setBaseMapServicesOptions] = useState(BasemapConfig);
  const streetsLayerRef = useRef(null);
  const bathymetryLayerRef = useRef(null);
  const worldImageryLayerRef = useRef(null);
  const imageryLayersRef = useRef([]);
  const topoLayersRef = useRef([]);

  useEffect(() => {
    helpers.waitForLoad(["map", "settings"], Date.now(), 30, () => {
      if (window.config.baseMapServices !== undefined) {
        let basemapConfig = helpers.mergeObj(window.config.baseMapServices, BasemapConfig, true);
        basemapConfig.topoServices = [...new Map(basemapConfig.topoServices.reverse().map((item) => [item["name"], item])).values()].reverse();
        basemapConfig.imageryServices = [...new Map(basemapConfig.imageryServices.reverse().map((item) => [item["name"], item])).values()].reverse();
        setBaseMapServicesOptions(basemapConfig);
      }
    });
  }, []);

  const loadImageryLayers = (basemapConfig) => {
    // LOAD IMAGERY LAYERS
    let layerList = [];
    let index = 0;

    basemapConfig.imageryServices.forEach((service) => {
      const serviceLayerType = service.type !== undefined ? service.type : OL_DATA_TYPES.TileImage;
      LayerHelpers.getLayer(
        {
          sourceType: serviceLayerType,
          source: "WMS",
          projection: "EPSG:4326",
          layerName: service.name,
          url: service.url,
          tiled: true,
          extent: service.fullExtent,
          name: service.name,
        },
        (newLayer) => {
          // LAYER PROPS
          newLayer.setProperties({ index: index, name: service.name });
          newLayer.setZIndex(index + 1);
          newLayer.setVisible(false);

          // SET MAIN LAYER VISIBLE
          if (basemapConfig.imageryServices.length - 1 === index) {
            newLayer.setVisible(true);
          }

          // ADD THE LAYER
          window.map.addLayer(newLayer);
          layerList.push(newLayer);
          index++;
          console.log("Loaded Imagery Layer: ", index, service.name, newLayer.getZIndex());
        }
      );
    });
    imageryLayersRef.current = layerList;
  };

  const loadTopoLayers = (basemapConfig) => {
    // LOAD TOPO LAYERS
    let index = 0;
    let basemapList = [];
    basemapConfig.topoServices.forEach((serviceGroup) => {
      index = 0;
      let serviceLayers = [];
      serviceGroup.layers.forEach((service) => {
        let layerName = service.name;
        if (layerName === undefined) layerName = helpers.getUID();
        if (service.type === "SIMCOE_TILED") {
          LayerHelpers.getLayer(
            {
              sourceType: OL_DATA_TYPES.TileImage,
              source: "WMS",
              layerName: layerName,
              url: service.url,
              extent: service.fullExtent,
              tiled: true,
              name: layerName,
            },
            (newLayer) => {
              newLayer.setProperties({
                index: index,
                name: layerName,
                excludePrint: service.excludePrint || false,
                isOverlay: service.isOverlay || false,
              });
              serviceLayers.push(newLayer);
              index++;
            }
          );
        } else if (service.type === "OSM") {
          LayerHelpers.getLayer(
            {
              sourceType: OL_DATA_TYPES.OSM,
              source: "WMS",
              layerName: layerName,
              tiled: true,
              name: layerName,
            },
            (newLayer) => {
              // LAYER PROPS
              newLayer.setProperties({
                index: index,
                name: layerName,
                excludePrint: service.excludePrint || false,

                isOverlay: service.isOverlay || false,
              });
              serviceLayers.push(newLayer);
              index++;
            }
          );
        } else if (service.type === "ESRI_TILED") {
          LayerHelpers.getLayer(
            {
              sourceType: OL_DATA_TYPES.XYZ,
              source: "WMS",
              layerName: layerName,
              url: service.url,
              tiled: true,
              name: layerName,
            },
            (newLayer) => {
              // LAYER PROPS
              newLayer.setProperties({
                index: index,
                name: layerName,
                excludePrint: service.excludePrint || false,
                isOverlay: service.isOverlay || false,
              });
              serviceLayers.push(newLayer);
              index++;
            }
          );
        } else if (service.type === "ESRI_VECTOR_TILED") {
          LayerHelpers.getLayer(
            {
              sourceType: OL_DATA_TYPES.VectorTile,
              source: "Vector",
              layerName: layerName,
              url: service.url,
              tiled: true,
              name: layerName,
              background: service.background,
              rootPath: service.rootPath,
              spritePath: service.spritePath,
              pngPath: service.pngPath,
              minZoom: service.minZoom,
              maxZoom: service.maxZoom,
            },
            (newLayer) => {
              // LAYER PROPS
              newLayer.setProperties({
                index: index,
                name: layerName,
                excludePrint: service.excludePrint || false,

                isOverlay: service.isOverlay || false,
              });
              serviceLayers.push(newLayer);
              index++;
            }
          );
        }
      });

      const groupUrl = serviceGroup.groupUrl;
      if (groupUrl !== undefined) {
        const geoserverPath = window.config.geoserverPath;

        // GET XML
        helpers.httpGetText(groupUrl, (result) => {
          var parser = new xml2js.Parser();

          // PARSE TO JSON
          parser.parseString(result, (err, result) => {
            const groupLayerList = result.WMS_Capabilities.Capability[0].Layer[0].Layer[0].Layer;

            index = groupLayerList.length + index;
            let overlayIndex = index;
            //index++;

            groupLayerList.forEach((layerInfo) => {
              const keywords = layerInfo.KeywordList[0].Keyword;
              const opacity = getOpacity(keywords);
              const layerNameOnly = layerInfo.Name[0].split(":")[1];
              const serverUrl = groupUrl.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}`;

              let groupLayer = helpers.getImageWMSLayer(serverUrl + "/wms", layerInfo.Name[0]);
              groupLayer.setVisible(true);
              groupLayer.setOpacity(opacity);
              groupLayer.setZIndex(overlayIndex);
              groupLayer.setProperties({
                index: overlayIndex,
                name: layerNameOnly,
                excludePrint: false,
                isOverlay: true,
              });
              serviceLayers.push(groupLayer);
              overlayIndex--;
            });

            // USING LAYER GROUPS FOR TOPO
            let layerGroup = new LayerGroup({
              layers: serviceLayers,
              visible: false,
            });
            layerGroup.setProperties({
              index: serviceGroup.index,
              name: serviceGroup.name,
            });
            window.map.addLayer(layerGroup);
            basemapList.push(layerGroup);
            index++;
            console.log("Loaded Topo Layer", index, serviceGroup.name, layerGroup.getZIndex());
          });
        });
      } else {
        // USING LAYER GROUPS FOR TOPO
        let layerGroup = new LayerGroup({
          layers: serviceLayers,
          visible: false,
        });
        layerGroup.setProperties({
          index: serviceGroup.index,
          name: serviceGroup.name,
        });
        layerGroup.setZIndex(serviceGroup.index);
        window.map.addLayer(layerGroup);
        basemapList.push(layerGroup);
        index++;
        console.log("Loaded Topo Layer", index, serviceGroup.name, layerGroup.getZIndex());

        //basemapIndex++;
      }
    });

    console.log("basemap layers loaded");
    topoLayersRef.current = basemapList;
  };
  const loadWorldImagery = (basemapConfig) => {
    // LOAD WORLD IMAGERY LAYER
    if (basemapConfig.worldImageryService !== undefined) {
      LayerHelpers.getLayer(
        {
          sourceType: OL_DATA_TYPES.XYZ,
          source: "WMS",
          layerName: "worldImageryServiceBasemap",
          url: basemapConfig.worldImageryService,
          tiled: true,
          name: "worldImageryServiceBasemap",
        },
        (newLayer) => {
          newLayer.setZIndex(0);
          console.log("Add world imagery layer", newLayer.getZIndex());
          window.map.addLayer(newLayer);
          worldImageryLayerRef.current = newLayer;
        }
      );
    }
  };
  const loadBathymetry = (basemapConfig) => {
    // LOAD BATHYMETRY LAYER
    if (basemapConfig.bathymetryService.url !== undefined) {
      LayerHelpers.getLayer(
        {
          sourceType: OL_DATA_TYPES.TileImage,
          source: "WMS",
          layerName: "bathymetryServiceBasemap",
          url: basemapConfig.bathymetryService.url,
          tiled: true,
          name: "bathymetryServiceBasemap",
        },
        (newLayer) => {
          newLayer.setZIndex(0);
          if (basemapConfig.bathymetryService.fullExtent) {
            newLayer.setExtent(basemapConfig.bathymetryService.fullExtent);
          }
          console.log("Add bathymetry layer", newLayer.getZIndex());
          window.map.addLayer(newLayer);
          bathymetryLayerRef.current = newLayer;
        }
      );
    }
  };
  const loadStreets = (basemapConfig) => {
    // LOAD STREETS LAYER
    if (basemapConfig.streetService.url !== undefined) {
      LayerHelpers.getLayer(
        {
          sourceType: OL_DATA_TYPES.TileImage,
          source: "WMS",
          layerName: "streetServiceBasemap",
          url: basemapConfig.streetService.url,
          tiled: true,
          name: "streetServiceBasemap",
        },
        (newLayer) => {
          newLayer.setOpacity(0.75);
          newLayer.setZIndex(basemapConfig.imageryServices.length + 1);
          if (basemapConfig.streetService.fullExtent) {
            newLayer.setExtent(basemapConfig.streetService.fullExtent);
          }
          console.log("Add streets layer", newLayer.getZIndex());
          window.map.addLayer(newLayer);
          streetsLayerRef.current = newLayer;
        }
      );
    }
  };
  const getOpacity = (keywords) => {
    if (keywords === undefined) return 1;
    const opacityKeyword = keywords.find(function (item) {
      return item.indexOf("OPACITY") !== -1;
    });
    if (opacityKeyword !== undefined) {
      const val = opacityKeyword.split("=")[1];
      return parseFloat(val);
    } else return 1;
  };

  return (
    <BasemapSwitcherContext.Provider
      value={{
        loadImageryLayers,
        loadTopoLayers,
        loadWorldImagery,
        loadBathymetry,
        loadStreets,
        baseMapServicesOptions,
        streetsLayerRef,
        bathymetryLayerRef,
        worldImageryLayerRef,
        imageryLayersRef,
        topoLayersRef,
      }}
    >
      {children}
    </BasemapSwitcherContext.Provider>
  );
}

export default BasemapSwitcherContext;
