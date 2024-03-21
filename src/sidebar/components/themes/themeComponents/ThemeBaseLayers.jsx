import React, { useState, useRef, useEffect } from "react";
import "./ThemeBaseLayers.css";
import * as helpers from "../../../../helpers/helpers";
import { getAppAccessToken } from "../../../../helpers/esriHelpers";
import { get } from "../../../../helpers/api.js";
import { LayerHelpers, OL_DATA_TYPES } from "../../../../helpers/OLHelpers";
import ThemePopupContent from "./ThemePopupContent.jsx";
import Slider from "rc-slider";
import GeoJSON from "ol/format/GeoJSON.js";
import { unByKey } from "ol/Observable.js";

const ThemeBaseLayers = (props) => {
  // const [layers, setLayers] = useState([]);
  const layersRef = useRef([]);
  const [token, setToken] = useState("");
  const [visible, setVisible] = useState(props.config.baseLayers.defaultVisibility);
  const [sliderValue, setSliderValue] = useState(props.config.baseLayers.opacity);
  const [sliderMin, setSliderMin] = useState(0);
  const [sliderMax, setSliderMax] = useState(1);
  const [legendImageName, setLegendImageName] = useState(props.config.baseLayers.legendImageName);
  const [zIndex, setZIndex] = useState(props.config.baseLayers.zIndex);
  const marks = {
    0: {
      style: {
        fontSize: "7pt",
      },
      label: <div>0</div>,
    },
    1: {
      style: {
        fontSize: "7pt",
      },
      label: <div>100</div>,
    },
  };
  useEffect(() => {
    if (props.config.excludeBaseLayers) return;
    getLayers();
    const mapClickEvent = window.map.on("click", (evt) => {
      if (window.isDrawingOrEditing || !visible || window.isCoordinateToolOpen || window.isMeasuring) return;

      var viewResolution = window.map.getView().getResolution();
      layersRef.current.forEach((layer) => {
        if (!layer.getProperties().clickable) return;

        var url = layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
          INFO_FORMAT: "application/json",
        });
        if (url) {
          const secured = layer.getProperties().secured || false;
          get(url, { useBearerToken: secured }, (result) => {
            const features = result.features;
            if (features.length === 0) {
              return;
            }

            const geoJSON = new GeoJSON().readFeatures(result);
            const feature = geoJSON[0];

            const entries = Object.entries(feature.getProperties());
            const layerName = layer.getProperties().name;
            const layerConfig = getLayerConfigByName(layerName);
            window.popup.show(
              evt.coordinate,
              <ThemePopupContent key={helpers.getUID()} values={entries} popupLogoImage={props.config.popupLogoImage} layerConfig={layerConfig} />,
              layer.getProperties().name
            );
          });
        }
      });
    });
    return () => {
      layersRef.current.forEach((layer) => {
        window.map.removeLayer(layer);
      });

      // REMOVE EVENT
      unByKey(mapClickEvent);
    };
  }, []);
  const addLayer = (layer, options, callback) => {
    layer.setVisible(visible);
    layer.setOpacity(sliderValue);
    layer.setZIndex(zIndex);
    setZIndex(zIndex + 1);
    layer.setProperties({
      name: options.displayName,
      tocDisplayName: options.displayName,
      clickable: options.clickable,
      disableParcelClick: options.clickable,
      queryable: true,
    });
    window.map.addLayer(layer);
    callback(layer);
  };
  const getLayers = () => {
    let tmpLayers = [];
    props.config.baseLayers.layers.forEach((layerObj) => {
      let layer = {};
      if (layerObj.type === "arcgis")
        if (layerObj.secure)
          getAppAccessToken(layerObj.serverUrl, (accessToken) => {
            setToken(accessToken);
            LayerHelpers.getCapabilities({ root_url: layerObj.serverUrl, type: "rest", secured: layerObj.secured, token: accessToken.access_token }, (returnLayers) => {
              console.log(returnLayers);
              LayerHelpers.createArcGISRestLayersFromService(returnLayers, { returnLayers: layerObj.returnLayers }, (newLayers) => {
                if (layerObj.returnLayers) {
                  layerObj.returnLayers.forEach((layerId) => {
                    const newLayer = newLayers.filter((item) => item.get("layerId") == layerId)[0];
                    if (newLayer)
                      addLayer(newLayer, { displayName: newLayer.get("displayName"), clickable: newLayer.get("clickable") }, (retLayer) => {
                        tmpLayers.push(retLayer);
                      });
                  });
                } else
                  newLayers.forEach((item) => {
                    addLayer(item, { displayName: item.displayName, clickable: item.clickable }, (retLayer) => {
                      tmpLayers.push(retLayer);
                    });
                  });
              });
            });
          });
        else
          LayerHelpers.getCapabilities({ root_url: layerObj.serverUrl, type: "rest" }, (returnLayers) => {
            LayerHelpers.createArcGISRestLayersFromService(returnLayers, { returnLayers: layerObj.returnLayers }, (newLayers) => {
              if (layerObj.returnLayers) {
                layerObj.returnLayers.forEach((layerId) => {
                  const newLayer = newLayers.filter((item) => item.get("layerId") == layerId)[0];
                  if (newLayer)
                    addLayer(newLayer, { displayName: newLayer.get("displayName"), clickable: newLayer.get("clickable") }, (retLayer) => {
                      tmpLayers.push(retLayer);
                    });
                });
              } else
                newLayers.forEach((item) => {
                  addLayer(item, { displayName: item.displayName, clickable: item.clickable }, (retLayer) => {
                    tmpLayers.push(retLayer);
                  });
                });
            });
          });
      else {
        LayerHelpers.getLayer(
          {
            sourceType: OL_DATA_TYPES.ImageWMS,
            source: "WMS",
            layerName: layerObj.layerName,
            url: `${layerObj.serverUrl}wms?layers=${layerObj.layerName}`,
            tiled: false,
            name: layerObj.layerName,
            secured: layerObj.secure || false,
          },
          (layer) => {
            const wfsUrlTemplate = (rootUrl, layer) => `${rootUrl}wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layer}&outputFormat=application/json&cql_filter=`;
            const wfsUrl = wfsUrlTemplate(layerObj.serverUrl, layer.Name);

            layer.setProperties({
              wfsUrl: wfsUrl,
            });
            addLayer(layer, { displayName: layerObj.displayName, clickable: layerObj.clickable }, (retLayer) => {
              tmpLayers.push(retLayer);
            });
          }
        );
      }
    });
    // setLayers(tmpLayers);
    layersRef.current = tmpLayers;
  };
  const getLayerConfigByName = (name) => {
    let config = {};
    props.config.baseLayers.layers.forEach((layerConfig) => {
      if (layerConfig.displayName === name) {
        config = layerConfig;
        return;
      }
    });
    return config;
  };
  const onCheckboxChange = (evt) => {
    setVisible(evt.target.checked);
    layersRef.current.forEach((layer) => {
      layer.setVisible(evt.target.checked);
    });
  };

  // SLIDER CHANGE EVENT
  const onSliderChange = (value) => {
    layersRef.current.forEach((layer) => {
      layer.setOpacity(value);
    });
    setSliderValue(value);
  };
  return (
    <div className={props.className || (props.config.baseLayers.layers.length > 0 || props.config.excludeBaseLayers ? "sc-base-layers-container" : "sc-hidden")}>
      <div className="sc-title sc-underline" style={{ marginLeft: "7px" }}>
        BASE DATA
      </div>
      <div className="sc-base-layers-controls">
        <label className="sc-base-layers-label">
          <input type="checkbox" checked={visible} style={{ verticalAlign: "middle" }} onChange={onCheckboxChange} />
          Turn on/off theme base data
        </label>
        <div className="sc-base-layers-slider-container">
          <Slider
            included={false}
            //style={sliderWrapperStyle}
            marks={marks}
            vertical={false}
            max={sliderMax}
            min={sliderMin}
            step={0.01}
            defaultValue={sliderValue}
            onChange={onSliderChange}
            value={sliderValue}
          />
          <span className="sc-base-layers-transparency">Transparency</span>
        </div>
      </div>
      <div className={legendImageName === undefined ? "sc-hidden" : "sc-base-layers-legend sc-container"}>
        <img className="sc-base-layers-legend-img" src={images[legendImageName]} alt="legend" />
      </div>
    </div>
  );
};

export default ThemeBaseLayers;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
