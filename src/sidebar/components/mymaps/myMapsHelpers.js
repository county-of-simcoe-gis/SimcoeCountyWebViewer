import Draw, {createBox} from 'ol/interaction/Draw.js';
import {Vector as VectorSource} from 'ol/source.js';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import Collection from 'ol/Collection';
import {asArray} from 'ol/color';
import GeoJSON from 'ol/format/GeoJSON.js';
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom';
import * as helpers from "../../../helpers/helpers";

// GET FEATURE FROM MYMAPS LAYER
export function getFeatureById(id){
  let feature = null;
  window.map.getLayers().forEach(layer => {
    if (layer.getProperties().name === 'myMaps'){
      layer.getSource().getFeatures().forEach(feat => {
        if (feat.getProperties().id === id)
          feature = feat;
          return;
      });
    }    
  });

  return feature;
}

export function getStyleFromJSON(styleJSON){
  if (styleJSON === undefined)
    return getDrawStyle("#e809e5");

  // FILL
  const fill = new Fill({
    color: styleJSON.fill_ === undefined ? "#e809e5" : styleJSON.fill_.color_
  });

  // STROKE
  const stroke = new Stroke({
    color: styleJSON.stroke_.color_,
    lineDash: styleJSON.stroke_.lineDash_,
    width: styleJSON.stroke_.width_
  });

  // IMAGE / CIRCLESTYLE
  const image = new CircleStyle({
    radius: styleJSON.image_.radius_,
    stroke: new Stroke({
      color: styleJSON.image_.stroke_.color_
    }),
    fill: new Fill({
      color: styleJSON.image_.fill_.color_
    })
  });

  // CREATE NEW STYLE FROM PROPS
  let style = new Style({
    fill: fill,
    stroke: stroke,
    image: image
  });

  return style;
}

export function getDrawStyle(drawColor){
  // UPDATE FILL COLOR OPACITY
  var hexColor = drawColor;
  var color = asArray(hexColor);
  color = color.slice();
  color[3] = 0.2;  // change the alpha of the color

  let drawStyle = new Style({
    fill: new Fill({
      color: color // USE OPACITY
    }),
    stroke: new Stroke({
      color: drawColor,
      width: 3
    }),
    image: new CircleStyle({
      radius: 5,
      stroke: new Stroke({
        color: drawColor
      }),
      fill: new Fill({
        color: drawColor
      })
    })
  });

  return drawStyle;
}

// GET STORAGE AND PARSE
export function getItemsFromStorage(storageKey){
  const storage = localStorage.getItem(storageKey);
  if (storage === null)
    return [];

  const data = JSON.parse(storage);
  return data;
}

// BUG https://github.com/openlayers/openlayers/issues/3610
  //Control active state of double click zoom interaction
export function controlDoubleClickZoom(active){
    //Find double click interaction
    var interactions = window.map.getInteractions();
    for (var i = 0; i < interactions.getLength(); i++) {
        var interaction = interactions.item(i);                          
        if (interaction instanceof DoubleClickZoom) {
            interaction.setActive(active);
        }
    }
}

// HANDLE LABELS
export function setFeatureLabel(itemInfo) {
  let feature = getFeatureById(itemInfo.id);
  let style = feature.getStyle();
  if (itemInfo.labelVisible){
    const textStyle = helpers.createTextStyle(feature, "label",undefined,undefined,undefined,"15px",undefined,-8,'bold',undefined,undefined,true,itemInfo.labelRotation,undefined,undefined,'#ffffff', 0.1);
    style.setText(textStyle);
    feature.setStyle(style);
  } else {
    style.setText(null);
    feature.setStyle(style);
  }
}