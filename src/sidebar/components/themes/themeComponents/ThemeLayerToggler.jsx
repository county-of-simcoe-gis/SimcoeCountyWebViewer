import React, { useState, useEffect, useRef } from "react";
import "./ThemeLayerToggler.css";
import * as helpers from "../../../../helpers/helpers";
import { LayerHelpers, OL_DATA_TYPES } from "../../../../helpers/OLHelpers";

import { get, createObjectURL } from "../../../../helpers/api";
import ThemePopupContent from "./ThemePopupContent.jsx";
import GeoJSON from "ol/format/GeoJSON.js";
import { getCenter } from "ol/extent";
import { unByKey } from "ol/Observable.js";

// LOOK AT THEME CONFIG FOR EXAMPLE OBJECT BEING PASSED HERE
const ThemeLayerToggler = (props) => {
  const { onMapClick, config, onLayerVisiblityChange, visibleAll, children } = props;
  const styleUrlTemplate = (serverURL, layerName, styleName) =>
    `${serverURL}/wms?REQUEST=GetLegendGraphic&VERSION=1.1&FORMAT=image/png&WIDTH=20&HEIGHT=20&TRANSPARENT=true&LAYER=${layerName}&STYLE=${styleName === undefined ? "" : styleName}`;
  const [visible, setVisible] = useState(props.layerConfig.visible);
  const [styleImageUrl, setStyleImageUrl] = useState("");
  const [recordCount, setRecordCount] = useState(0);
  const [layerConfig, setLayerConfig] = useState(props.layerConfig);

  const layerRef = useRef(null);
  const mapClickEventRef = useRef(null);

  useEffect(() => {
    setLayerConfig(props.layerConfig);
  }, [props.layerConfig]);

  const initComponent = () => {
    // GET LAYER
    LayerHelpers.getLayer(
      {
        sourceType: OL_DATA_TYPES.ImageWMS,
        source: "WMS",
        layerName: layerConfig.layerName,
        url: `${layerConfig.serverUrl}wms?layers=${layerConfig.layerName}`,
        tiled: false,
        name: layerConfig.layerName,
        secured: layerConfig.secure || false,
      },
      (layer) => {
        layer.setProperties({
          name: layerConfig.layerName,
          tocDisplayName: layerConfig.displayName,
          clickable: layerConfig.clickable !== undefined ? layerConfig.clickable : true,
          disableParcelClick: layerConfig.clickable !== undefined ? layerConfig.clickable : true,
          queryable: true,
        });
        if (config.toggleLayersKey) layer.setProperties({ themeKey: config.toggleLayersKey });
        layer.setZIndex(layerConfig.zIndex);
        layer.setVisible(layerConfig.visible);
        window.map.addLayer(layer);
        layerRef.current = layer;

        addMapClickEvent();
      }
    );
  };
  const addMapClickEvent = () => {
    if (onMapClick) {
      mapClickEventRef.current = window.map.on("click", onMapClick);
    } else {
      mapClickEventRef.current = window.map.on("click", (evt) => {
        if (window.isDrawingOrEditing || !visible || window.isCoordinateToolOpen || window.isMeasuring) return;

        var viewResolution = window.map.getView().getResolution();
        var url = layerRef.current.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
          INFO_FORMAT: "application/json",
        });
        if (url) {
          get(url, { useBearerToken: layerConfig.secure || false }, (result) => {
            const features = result.features;
            if (!features || features.length === 0) {
              return;
            }

            const geoJSON = new GeoJSON().readFeatures(result);
            const feature = geoJSON[0];

            const entries = Object.entries(feature.getProperties());
            window.popup.show(evt.coordinate, <ThemePopupContent key={helpers.getUID()} values={entries} popupLogoImage={config.popupLogoImage} layerConfig={layerConfig} />, layerConfig.displayName);
          });
        }
      });
    }
  };

  useEffect(() => {
    initComponent();
    // GET LEGEND

    const styleUrl = styleUrlTemplate(layerConfig.serverUrl, layerConfig.layerName, layerConfig.legendStyleName);
    get(styleUrl, { useBearerToken: layerConfig.secure || false, type: "blob" }, (results) => {
      var imgData = createObjectURL(results);
      setStyleImageUrl(imgData);
    });

    helpers.getWFSLayerRecordCount({ serverUrl: layerConfig.serverUrl, layerName: layerConfig.layerName, secured: layerConfig.secure || false }, (currentCount) => {
      setRecordCount(currentCount);
    });
    // URL PARAMETERS
    handleUrlParameter();
    return () => {
      // CLEAN UP
      setStyleImageUrl(null);
      setRecordCount(null);
      window.map.removeLayer(layerRef.current);
      unByKey(mapClickEventRef.current);
    };
  }, []);

  const handleUrlParameter = () => {
    if (layerConfig.UrlParameter === undefined) return;

    const urlParam = helpers.getURLParameter(layerConfig.UrlParameter.parameterName);
    if (urlParam === null) return;

    const query = layerConfig.UrlParameter.fieldName + "=" + urlParam;
    helpers.getWFSGeoJSON({ serverUrl: layerConfig.serverUrl, layerName: layerConfig.layerName, cqlFilter: query, secured: layerConfig.secure }, (result) => {
      if (result.length === 0) return;

      const feature = result[0];
      const extent = feature.getGeometry().getExtent();
      const center = getCenter(extent);
      helpers.zoomToFeature(feature);
      const entries = Object.entries(feature.getProperties());
      window.popup.show(center, <ThemePopupContent key={helpers.getUID()} values={entries} popupLogoImage={config.popupLogoImage} layerConfig={layerConfig} />, layerConfig.displayName);
    });
  };

  const onCheckboxChange = (checked) => {
    setVisible(checked);
    layerRef.current.setVisible(checked);
    onLayerVisiblityChange(layerRef.current);
  };

  return (
    <div className="sc-theme-layer-container">
      <div className={layerConfig.boxStyle === undefined || !layerConfig.boxStyle ? "sc-theme-layer-toggler-symbol" : "sc-theme-layer-toggler-symbol-with-box"}>
        <img src={styleImageUrl} alt="style" />
      </div>
      <div className={layerConfig.boxStyle === undefined || !layerConfig.boxStyle ? "" : "sc-theme-layer-toggler-label-with-box-container"}>
        <label className={layerConfig.boxStyle === undefined || !layerConfig.boxStyle ? "sc-theme-layer-toggler-label" : "sc-theme-layer-toggler-label-with-box"}>
          <input
            type={"checkbox"}
            checked={visible}
            style={{ verticalAlign: "middle" }}
            onChange={(evt) => {
              onCheckboxChange(evt.target.checked);
            }}
          />
          {layerConfig.displayName}
        </label>
        <label className={layerConfig.boxStyle === undefined || !layerConfig.boxStyle ? "sc-theme-layer-toggler-count" : "sc-theme-layer-toggler-count-with-box"}>{` (${recordCount})`}</label>
      </div>

      <div>{children}</div>
    </div>
  );
};

export default ThemeLayerToggler;
