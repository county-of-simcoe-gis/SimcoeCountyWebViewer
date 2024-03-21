import React, { useState, useEffect } from "react";
import "./ThemeLayerToggler.css";
import * as helpers from "../../../../helpers/helpers";
import { getAppAccessToken } from "../../../../helpers/esriHelpers";

import { get } from "../../../../helpers/api";

import { LayerHelpers, OL_DATA_TYPES } from "../../../../helpers/OLHelpers";

import ThemePopupContent from "./ThemePopupContent.jsx";
import GeoJSON from "ol/format/GeoJSON.js";
import { unByKey } from "ol/Observable.js";

const ThemeServiceToggler = (props) => {
  const [layers, setLayers] = useState([]);
  const [token, setToken] = useState("");
  const [showAll, setShowAll] = useState(false);

  const processLayers = (capabilities) => {
    let layerArray = [];
    let zIndex = props.serviceConfig.zIndex || 1000;
    capabilities.forEach((layer) => {
      const hasAttachments = layer.hasAttachments;
      const layerOptions = {
        sourceType: OL_DATA_TYPES.ImageArcGISRest,
        source: "rest",
        projection: layer.sourceSpatialReference && layer.sourceSpatialReference.latestWkid ? `${layer.sourceSpatialReference.latestWkid}` : "3857",
        layerName: layer.name,
        url: layer.url,
        tiled: false,
        extent: layer.extent,
        name: layer.name,
      };
      if (layer.grouped) {
        layerOptions["layers"] = layer.layers;
        layerOptions.sourceType = OL_DATA_TYPES.LayerGroup;
      }
      LayerHelpers.getLayer(layerOptions, (newLayer) => {
        const identifyUrl = (options) =>
          `${options.url}/identify?geometry=${options.point}&geometryType=${options.geometryType}&layers=visible%3A${options.layerId}&sr=3857&datumTransformations=3857&tolerance=${options.tolerance}&mapExtent=${options.extent}&imageDisplay=${options.resolution}&maxAllowableOffset=10&returnGeometry=true&returnFieldName=false&f=json`;
        const getAttachmentUrl = (options) => `${options.url}/${options.layerId}/queryAttachments?objectIds=${options.objectId}&returnUrl=true&f=json`;
        const getRecordCountUrl = (options) => `${options.url}/${options.layerId}/query?where=0%3D0&returnCountOnly=true&f=json`;
        const getQueryUrl = (options) => `${options.url}/${options.layerId}/query?where=#WHERE#&outFields=*&outSR=3857&returnCountOnly=false&f=geojson`;

        const rootInfoUrl = layer.url;
        let attachmentUrl = getAttachmentUrl({
          url: layer.rootUrl,
          layerId: layer.id,
          objectId: "#OBJECTID#",
        });
        let queryUrl = getQueryUrl({
          url: layer.rootUrl,
          layerId: layer.id,
        });
        let wfsUrl = identifyUrl({
          url: layer.rootUrl,
          point: "#GEOMETRY#",
          layerId: layer.id,
          tolerance: "#TOLERANCE#",
          extent: "#EXTENT#",
          resolution: "#RESOLUTION#",
          geometryType: "#GEOMETRYTYPE#",
        });
        let recordCountUrl = getRecordCountUrl({
          url: layer.rootUrl,
          layerId: layer.id,
        });
        var url = new URL(rootInfoUrl);
        const urlParams = new URLSearchParams(url.searchParams);
        const url_token = urlParams.get("token");
        if (url_token) wfsUrl = `${wfsUrl}&token=${url_token}`;
        if (url_token && hasAttachments) attachmentUrl = `${attachmentUrl}&token=${url_token}`;
        if (url_token) recordCountUrl = `${recordCountUrl}&token=${url_token}`;
        if (url_token) queryUrl = `${queryUrl}&token=${url_token}`;

        zIndex++;
        newLayer.setVisible(layer.defaultVisibility);
        newLayer.setZIndex(zIndex);
        newLayer.setOpacity(layer.options ? layer.options.opacity || 1 : 1);
        newLayer.setProperties({
          name: layer.name,
          displayName: layer.name,
          tocDisplayName: layer.name,
          wfsUrl: wfsUrl,
          rootInfoUrl: rootInfoUrl,
          clickable: true,
          disableParcelClick: false,
          queryable: layer.queryable !== undefined ? layer.queryable : false,
          opaque: layer.opaque !== undefined ? layer.opaque : false,
          minScale: layer.minScale,
          maxScale: layer.maxScale,
          attachmentUrl: hasAttachments ? attachmentUrl : null,
          hasAttachments: hasAttachments,
          recordCountUrl: recordCountUrl,
          featureQueryUrl: queryUrl,
        });
        newLayer["layerConfig"] = layer;
        newLayer["key"] = helpers.getUID();
        layerArray.push(newLayer);
      });
    });
    setLayers(layerArray);
  };
  useEffect(() => {
    setShowAll(props.visibleAll);
  }, [props.visibleAll]);

  useEffect(() => {
    if (props.serviceConfig.secure)
      getAppAccessToken(props.serviceConfig.serviceUrl, (accessToken) => {
        setToken(accessToken);
        LayerHelpers.getCapabilities({ root_url: props.serviceConfig.serviceUrl, type: "rest", secured: props.serviceConfig.secured, token: accessToken.access_token }, (returnLayers) => {
          //console.log(returnLayers);
          processLayers(returnLayers);
        });
      });
    else
      LayerHelpers.getCapabilities({ root_url: props.serviceConfig.serviceUrl, type: "rest" }, (returnLayers) => {
        processLayers(returnLayers);
      });
  }, []);
  return (
    <>
      {layers.map((layer) => (
        <ThemeServiceTogglerItem
          key={layer.key}
          layer={layer}
          layerConfig={layer.layerConfig}
          onLayerVisiblityChange={props.onLayerVisiblityChange}
          showAll={showAll}
          urlParameter={props.serviceConfig.UrlParameter}
          config={props.config}
          onMapClick={props.onMapClick}
        />
      ))}
      <div>{props.children}</div>
    </>
  );
};

const ThemeServiceTogglerItem = (props) => {
  const [visible, setVisible] = useState(true);
  const [layer, setLayer] = useState(props.layer);
  const [recordCount, setRecordCount] = useState(0);
  const [styleUrl, setStyleUrl] = useState("");
  const [mapClickEvent, setMapClickEvent] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const init = () => {
    setVisible(props.layerConfig.defaultVisibility);
    setStyleUrl(`data:${props.layerConfig.legend.legend[0].contentType};base64,${props.layerConfig.legend.legend[0].imageData}`);
    getRecordCount();
    setupMapClick();
    if (props.config.toggleLayersKey) layer.setProperties({ themeKey: props.config.toggleLayersKey });
    window.map.addLayer(layer);
    setIsLoading(false);
  };

  const setupMapClick = () => {
    if (props.onMapClick) {
      setMapClickEvent(window.map.on("click", props.onMapClick));
    } else {
      const clickEvent = (evt) => {
        if (window.isDrawingOrEditing || !visible || window.isCoordinateToolOpen || window.isMeasuring) return;
        var viewResolution = window.map.getView().getResolution();
        var url = layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
          INFO_FORMAT: "application/json",
        });
        if (url) {
          get(url, { useBearerToken: this.props.layerConfig.secure || false }, (result) => {
            const features = result.features;
            if (!features) {
              return;
            }

            const geoJSON = new GeoJSON().readFeatures(result);
            const feature = geoJSON[0];

            const entries = Object.entries(feature.getProperties());
            window.popup.show(
              evt.coordinate,
              <ThemePopupContent key={helpers.getUID()} values={entries} popupLogoImage={this.props.config.popupLogoImage} layerConfig={this.props.layerConfig} />,
              this.props.layerConfig.displayName
            );
          });
        }
      };
      setMapClickEvent(window.map.on("click", clickEvent));
    }
  };
  const getRecordCount = () => {
    const url = layer.get("recordCountUrl");
    helpers.getJSON(url, (result) => {
      if (result.count) setRecordCount(result.count);
    });
  };
  const onCheckboxChange = (isChecked) => {
    setVisible(isChecked);
    layer.setVisible(isChecked);
    props.onLayerVisiblityChange(layer);
  };
  const cleanup = () => {
    window.map.removeLayer(layer);
    unByKey(mapClickEvent);
  };

  useEffect(() => {
    if (!isLoading) onCheckboxChange(props.showAll);
  }, [props.showAll]);

  useEffect(() => {
    //  console.log(layer);
    init();
    return () => {
      cleanup();
    };
  }, []);
  return (
    <div className="sc-theme-layer-container">
      <div className={"sc-theme-layer-toggler-symbol"}>
        <img src={styleUrl} alt="style" />
      </div>
      <div className={""}>
        <label className={"sc-theme-layer-toggler-label"}>
          <input
            type="checkbox"
            checked={visible}
            style={{ verticalAlign: "middle" }}
            onChange={(evt) => {
              onCheckboxChange(evt.target.checked);
            }}
          />
          {props.layerConfig.name}
        </label>
        <label className={"sc-theme-layer-toggler-count"}>{" (" + recordCount + ")"}</label>
      </div>

      <div>{props.children}</div>
    </div>
  );
};

export default ThemeServiceToggler;
