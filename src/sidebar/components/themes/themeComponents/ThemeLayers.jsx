import React, { useState, useEffect } from "react";
import "./ThemeLayers.css";
import * as helpers from "../../../../helpers/helpers";
import ThemeLayerToggler from "./ThemeLayerToggler.jsx";
import ThemeServiceToggler from "./ThemeServiceToggler.jsx";

const ThemeLayers = (props) => {
  const [checked, setChecked] = useState(false);
  const [toggleServices, setToggleServices] = useState(props.config.toggleServices || []);
  const [toggleLayers, setToggleLayers] = useState(props.config.toggleLayers || []);

  useEffect(() => {
    setToggleServices(props.config.toggleServices || []);
  }, [props.config.toggleServices]);

  useEffect(() => {
    setToggleLayers(props.config.toggleLayers || []);
  }, [props.config.toggleLayers]);

  const onChangeVisibleAll = (checked) => {
    setChecked(checked);
  };

  if (props.config.excludeToggler) return <div />;

  return (
    <div key={`${props.config.toggleLayersKey}-layers-container`} className={props.className || "sc-theme-layers-container"}>
      <div className="sc-title sc-underline">{`${props.config.toggleLayersTitle ? props.config.toggleLayersTitle : "THEME LAYERS"}`}</div>

      <div className="sc-container">
        <div className={props.config.toggleLayersShowAll ? "sc-theme-layers-show-all" : "sc-hidden"}>
          <input type="checkbox" checked={checked} style={{ verticalAlign: "middle" }} onChange={(evt) => onChangeVisibleAll(evt.target.checked)} /> SHOW ALL
        </div>
        {toggleServices.map((serviceConfig) => (
          <ThemeServiceToggler
            key={props.config.toggleLayersKey ? `${props.config.toggleLayersKey}-${serviceConfig.serviceName}` : helpers.getUID()}
            serviceConfig={serviceConfig}
            config={props.config}
            onLayerVisiblityChange={props.onLayerVisiblityChange}
            onMapClick={props.onMapClick}
            visibleAll={checked}
          />
        ))}
        {toggleLayers.map((layerConfig) => (
          <ThemeLayerToggler
            key={props.config.toggleLayersKey ? `${props.config.toggleLayersKey}-${layerConfig.layerName}` : helpers.getUID()}
            layerConfig={layerConfig}
            config={props.config}
            onLayerVisiblityChange={props.onLayerVisiblityChange}
            onMapClick={props.onMapClick}
            visibleAll={checked}
          />
        ))}
      </div>
    </div>
  );
};

export default ThemeLayers;
