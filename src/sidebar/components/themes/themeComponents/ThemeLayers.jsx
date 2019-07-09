import React from 'react';
import "./ThemeLayers.css";
import * as helpers from '../../../../helpers/helpers';
import ThemeLayerToggler from './ThemeLayerToggler.jsx'

const ThemeLayers = (props) => {
  return (
    <div className="sc-theme-layers-container">
      <div className="sc-title sc-underline">THEME LAYERS</div>
      <div className="sc-container">
        {props.config.toggleLayers.map(layerConfig => (
          <ThemeLayerToggler key={helpers.getUID()} layerConfig={layerConfig} config={props.config} onLayerVisiblityChange={props.onLayerVisiblityChange} />
        ))}
      </div>
    </div>
  );
}

export default ThemeLayers;

