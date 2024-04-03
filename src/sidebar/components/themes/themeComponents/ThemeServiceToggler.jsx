import React, { useState, useEffect, useRef, Fragment } from "react";
import "./ThemeServiceToggler.css";
import * as helpers from "../../../../helpers/helpers";
import { getAppAccessToken, getAccessToken } from "../../../../helpers/esriHelpers";

import { get } from "../../../../helpers/api";

import { LayerHelpers, OL_DATA_TYPES } from "../../../../helpers/OLHelpers";

import ThemePopupContent from "./ThemePopupContent.jsx";
import GeoJSON from "ol/format/GeoJSON.js";
import { unByKey } from "ol/Observable.js";

const ThemeServiceToggler = (props) => {
  const [layers, setLayers] = useState([]);
  const [token, setToken] = useState("");
  const [showAll, setShowAll] = useState(false);
  const idToIndexMap = new Map();
  props.serviceConfig.layers.forEach((id, index) => {
    idToIndexMap.set(id, index);
  });
  const processLayers = (capabilities) => {
    let layerArray = [];
    let zIndex = props.serviceConfig.zIndex || 1000;
    if (props.serviceConfig.layers) capabilities = capabilities.filter((layer) => props.serviceConfig.layers.includes(layer.id));
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
      if (props.config.toggleVisibleAll) layer.defaultVisibility = props.config.toggleVisibleAll;
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
          layerId: layer.id,
        });
        newLayer["layerConfig"] = layer;
        newLayer["key"] = helpers.getUID();
        layerArray.push(newLayer);
      });
    });

    layerArray = layerArray.sort((a, b) => {
      const indexA = idToIndexMap.get(a.get("layerId"));
      const indexB = idToIndexMap.get(b.get("layerId"));
      return indexA - indexB; // Ascending order (use `indexB - indexA` for descending order)
    });

    setLayers(layerArray);
  };
  useEffect(() => {
    setShowAll(props.visibleAll);
  }, [props.visibleAll]);

  useEffect(() => {
    if (props.serviceConfig.secure)
      if (props.serviceConfig.tokenType === "app")
        getAppAccessToken(props.serviceConfig.serviceUrl, (accessToken) => {
          setToken(accessToken);
          LayerHelpers.getCapabilities({ root_url: props.serviceConfig.serviceUrl, type: "rest", secured: props.serviceConfig.secured, token: accessToken.access_token }, (returnLayers) => {
            //console.log(returnLayers);
            processLayers(returnLayers);
          });
        });
      else if (props.serviceConfig.tokenType === "user")
        getAccessToken((token) => {
          setToken(token);
          LayerHelpers.getCapabilities({ root_url: props.serviceConfig.serviceUrl, type: "rest", secured: props.serviceConfig.secured, token: token }, (returnLayers) => {
            //console.log(returnLayers);
            processLayers(returnLayers);
          });
        });
      else
        LayerHelpers.getCapabilities({ root_url: props.serviceConfig.serviceUrl, type: "rest" }, (returnLayers) => {
          processLayers(returnLayers);
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

const ThemeServiceLegend = (props) => {
  const legends = props.legend.filter((item) => item.imageData !== undefined);
  if (legends.length === 1) {
    return <img src={`data:${legends[0].contentType};base64,${legends[0].imageData}`} alt="style" />;
  } else if (legends.length > 1) {
    return (
      <ul className="sc-theme-service-legend-container">
        {legends
          .filter((item) => item.imageData !== undefined)
          .map((legend) => (
            <li key={helpers.getUID()}>
              <img src={`data:${legend.contentType};base64,${legend.imageData}`} alt="style" />
              <label>{legend.label}</label>
            </li>
          ))}
      </ul>
    );
  } else {
    return null;
  }
};
const ThemeServiceTogglerItem = (props) => {
  const [visible, setVisible] = useState(true);
  // const [layer, setLayer] = useState(props.layer);
  const [recordCount, setRecordCount] = useState(0);
  const [styleUrl, setStyleUrl] = useState("");
  const [legend, setLegend] = useState([{}]);
  const [mapClickEvent, setMapClickEvent] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const layerRef = useRef(props.layer);
  const init = () => {
    setVisible(props.layerConfig.defaultVisibility);
    if (props.layerConfig.legend) setLegend(props.layerConfig.legend.legend);
    if (props.layerConfig.legend) setStyleUrl(`data:${props.layerConfig.legend.legend[0].contentType};base64,${props.layerConfig.legend.legend[0].imageData}`);
    getRecordCount();
    setupMapClick();
    if (props.config.toggleLayersKey) layerRef.current.setProperties({ themeKey: props.config.toggleLayersKey });
    window.map.addLayer(layerRef.current);
    setIsLoading(false);
  };

  const setupMapClick = () => {
    if (props.onMapClick) {
      setMapClickEvent(window.map.on("click", props.onMapClick));
    } else {
      const clickEvent = (evt) => {
        if (window.isDrawingOrEditing || !visible || window.isCoordinateToolOpen || window.isMeasuring || !layerRef.current) return;
        var viewResolution = window.map.getView().getResolution();
        console.log("setupMapClick", layerRef.current.getSource());
        var url = layerRef.current.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
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
    const url = layerRef.current.get("recordCountUrl");
    helpers.getJSON(url, (result) => {
      if (result.count) setRecordCount(result.count);
    });
  };
  const onCheckboxChange = (isChecked) => {
    setVisible(isChecked);
    layerRef.current.setVisible(isChecked);
    props.onLayerVisiblityChange(layerRef.current);
  };
  const cleanup = () => {
    window.map.removeLayer(layerRef.current);
    unByKey(mapClickEvent);
  };

  useEffect(() => {
    if (!isLoading) onCheckboxChange(props.showAll);
  }, [props.showAll]);
  useEffect(() => {
    layerRef.current = props.layer;
  }, [props.layer]);

  useEffect(() => {
    //  console.log(layer);
    init();
    return () => {
      cleanup();
    };
  }, []);

  const LegendToggle = (props) => {
    const legends = props.legend.filter((item) => item.imageData !== undefined);
    if (legends.length === 1) {
      return <img src={`data:${legends[0].contentType};base64,${legends[0].imageData}`} alt="style" />;
    } else if (legends.length > 1) {
      return (
        <div className="sc-theme-service-item-plus-minus-container" onClick={() => setShowLegend(!showLegend)}>
          {!showLegend ? "+" : "-"}
          <div className="sc-toc-item-plus-minus-sign" />
          <div className="sc-toc-item-lines-expanded" />
        </div>
      );
    } else {
      return null;
    }
  };
  return (
    <div className="sc-theme-service-container">
      <div className={"sc-theme-service-toggler-symbol"}>
        <LegendToggle legend={legend} key={helpers.getUID()} />
      </div>
      <div className={""}>
        <label className={"sc-theme-service-toggler-label"}>
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
        <label className={"sc-theme-service-toggler-count"}>{" (" + recordCount + ")"}</label>
      </div>

      <div className={showLegend ? "sc-theme-service-info-container" : "sc-hidden"}>
        <div className="sc-toc-item-layer-info-container-open-vertical-lines" />
        <div className="sc-toc-item-layer-info-container-open-horizontal-lines" />
        <ThemeServiceLegend legend={legend} key={helpers.getUID()} />
      </div>
      {/* <img src={styleUrl} alt="style" /> */}

      <div>{props.children}</div>
    </div>
  );
};

export default ThemeServiceToggler;
