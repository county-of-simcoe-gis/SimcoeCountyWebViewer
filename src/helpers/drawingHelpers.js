import { Circle as CircleStyle, Fill, Stroke, Style, RegularShape } from "ol/style.js";
import { asArray } from "ol/color";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import LineString from "ol/geom/LineString.js";
import * as helpers from "./helpers";
import mainConfig from "../config.json";


// GET LAYER BY NAME FROM LAYER
export function getLayerByName(layerName) {
  const layers =  window.map.getLayers();
  let returnLayer = undefined;
  if (layers.array_.length > 0) {
    layers.forEach(layer => {
      if (returnLayer === undefined){
        if (layerName === layer.getProperties().name) returnLayer = layer;
      }
    });
  }
  return returnLayer;
}


// GET LAYER BY NAME FROM LAYER
export function getFeatureByLayerNameAndId(layerName, id) {
  let feature = null;
  window.map.getLayers().forEach(layer => {
    if (layer.getProperties().name === layerName) {
      layer
        .getSource()
        .getFeatures()
        .forEach(feat => {
          if (feat.getProperties().id === id) feature = feat;
          return;
        });
    }
  });

  return feature;
}


// GET FEATURE FROM MYMAPS LAYER
export function getFeatureById(id) {
  const drawingLayerName = "local:myMaps";
  let feature = null;
  window.map.getLayers().forEach(layer => {
    if (layer.getProperties().name === drawingLayerName) {
      layer
        .getSource()
        .getFeatures()
        .forEach(feat => {
          if (feat.getProperties().id === id) feature = feat;
          return;
        });
    }
  });

  return feature;
}

export function getStyleFromJSON(styleJSON, pointType) {
  if (styleJSON === undefined || styleJSON === null) return getDefaultDrawStyle("#e809e5");

  // FILL
  let fill = null;
  if (styleJSON.fill_ !== null) {
    fill = new Fill({
      color: styleJSON.fill_.color_
    });
  }

  // STROKE
  let stroke = null;
  if (styleJSON.stroke_ !== null) {
    stroke = new Stroke({
      color: styleJSON.stroke_.color_,
      lineDash: styleJSON.stroke_.lineDash_,
      width: styleJSON.stroke_.width_
    });
  }

  // IMAGE / CIRCLESTYLE
  let image = null;
  if (styleJSON.image_ !== null) {
    const imageFill = new Fill({ color: styleJSON.image_.fill_ === undefined ? [255, 0, 0, 1] : styleJSON.image_.fill_.color_ });
    const imageStroke = new Stroke({
      color: styleJSON.image_.stroke_ === undefined ? [255, 0, 0, 0.7] : styleJSON.image_.stroke_.color_,
      width: styleJSON.image_.stroke_ === undefined ? 1 : styleJSON.image_.stroke_.width_,
      lineDash: styleJSON.image_.stroke_ === undefined ? null : styleJSON.image_.stroke_.lineDash_
    });

    if (pointType === undefined || pointType === "circle") {
      image = new CircleStyle({
        radius: styleJSON.image_.radius_,
        stroke: imageStroke,
        fill: imageFill
      });
    } else if (pointType === "square") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 4,
        radius: styleJSON.image_.radius_,
        angle: Math.PI / 4,
        rotation: styleJSON.image_.rotation_
      });
    } else if (pointType === "triangle") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 3,
        radius: styleJSON.image_.radius_,
        //rotation: Math.PI / 4,
        rotation: styleJSON.image_.rotation_,
        angle: 0
      });
    } else if (pointType === "star") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 5,
        radius: styleJSON.image_.radius_,
        radius2: 4,
        angle: 0,
        rotation: styleJSON.image_.rotation_
      });
    } else if (pointType === "cross") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 4,
        radius: styleJSON.image_.radius_,
        radius2: 0,
        angle: 0,
        rotation: styleJSON.image_.rotation_
      });
    } else if (pointType === "x") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 4,
        radius: styleJSON.image_.radius_,
        radius2: 0,
        angle: Math.PI / 4,
        rotation: styleJSON.image_.rotation_
      });
    }
  }

  // CREATE NEW STYLE FROM PROPS
  let style = new Style({
    fill: fill,
    stroke: stroke,
    image: image
  });

  return style;
}

export function getDefaultDrawStyle(drawColor, isText = false, strokeWidth = 3, pointType = "circle", geometryType) {
  if (isText === undefined) isText = false;
  if (strokeWidth === undefined) strokeWidth = 3;

  // UPDATE FILL COLOR OPACITY
  var initialOpacity = 0.8;
  var hexColor = drawColor;
  var color = asArray(hexColor);
  color = color.slice();
  color[3] = isText ? 0 : initialOpacity; // change the alpha of the color

  let drawStyle = new Style({
    fill: new Fill({
      color: color // USE OPACITY
    }),
    stroke: new Stroke({
      color: geometryType === "Polygon" || geometryType === "Circle" ? [0, 0, 0, 0.8] : color,
      width: strokeWidth
    }),
    image: new CircleStyle({
      radius: 1,
      stroke: new Stroke({
        color: isText ? color : [0, 0, 0, initialOpacity],
        width: strokeWidth
      }),
      fill: new Fill({
        color: color
      })
    })
  });

  return drawStyle;
}

export function getPointStyle(pointType = "circle", radius = 5, strokeColor = "black", strokeWidth = 2, fillColor = "red", rotation = 0, strokeType = "normal") {
  const fill = new Fill({ color: fillColor });

  let stroke = new Stroke({ color: strokeColor, width: strokeWidth });
  if (strokeType === "dash") {
    stroke = new Stroke({ color: strokeColor, width: strokeWidth, lineDash: [10] });
  } else if (strokeType === "dot") {
    stroke = new Stroke({ color: strokeColor, width: strokeWidth, lineDash: [1, 5] });
  }

  // CIRCLE STYLE
  if (pointType === "circle") {
    return new Style({
      image: new CircleStyle({
        radius: radius,
        stroke: stroke,
        fill: fill
      })
    });
  }

  let style = null;
  if (pointType === "square") {
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 4,
        radius: radius,
        angle: Math.PI / 4,
        rotation: rotation
      })
    });
  } else if (pointType === "triangle") {
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 3,
        radius: radius,
        //rotation: Math.PI / 4,
        rotation: rotation,
        angle: 0
      })
    });
  } else if (pointType === "star") {
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 5,
        radius: radius,
        radius2: 4,
        angle: 0,
        rotation: rotation
      })
    });
  } else if (pointType === "cross") {
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 4,
        radius: radius,
        radius2: 0,
        angle: 0,
        rotation: rotation
      })
    });
  } else if (pointType === "x") {
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 4,
        radius: radius,
        radius2: 0,
        angle: Math.PI / 4,
        rotation: rotation
      })
    });
  }

  return style;
}

export function getLineStringStyle(strokeColor = "black", strokeWidth = 2, strokeType = "normal") {
  let stroke = new Stroke({ color: strokeColor, width: strokeWidth });
  if (strokeType === "dash") {
    stroke = new Stroke({ color: strokeColor, width: strokeWidth, lineDash: [10] });
  } else if (strokeType === "dot") {
    stroke = new Stroke({ color: strokeColor, width: strokeWidth, lineDash: [1, 5] });
  }

  let style = new Style({
    stroke: stroke
  });

  return style;
}

export function getPolygonStyle(strokeColor = "black", strokeWidth = 2, fillColor = "red", strokeType = "normal") {
  const fill = new Fill({ color: fillColor });

  let stroke = new Stroke({ color: strokeColor, width: strokeWidth });
  if (strokeType === "dash") {
    stroke = new Stroke({ color: strokeColor, width: strokeWidth, lineDash: [10] });
  } else if (strokeType === "dot") {
    stroke = new Stroke({ color: strokeColor, width: strokeWidth, lineDash: [1, 5] });
  }

  let style = new Style({
    fill: fill,
    stroke: stroke
  });

  return style;
}

// DETERMINE POINT STYLE
// export function getPointStyleType(style){
//   if (style.image_.points_ !== undefined && style.image_.points_ === 4 && )
// }


// BUG https://github.com/openlayers/openlayers/issues/3610
//Control active state of double click zoom interaction
export function controlDoubleClickZoom(active) {
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

  if (itemInfo.labelVisible) {
    const textStyle = helpers.createTextStyle(
      feature,
      "label",
      undefined,
      undefined,
      undefined,
      "15px",
      undefined,
      -8,
      "bold",
      undefined,
      undefined,
      true,
      itemInfo.labelRotation,
      undefined,
      undefined,
      "#ffffff",
      0.4
    );

    style.setText(textStyle);
    feature.setProperties({ labelVisible: true });
    feature.setStyle(style);
  } else {
    feature.setProperties({ labelVisible: false });

    if (style !== null) {
      style.setText(null);
      feature.setStyle(style);
    }
  }
}

export function convertLineToArrow(geometry) {
  // GET 10% OF THE END OF LINE TO USE AS ARROW
  const start = geometry.getCoordinateAt(0.8);
  const end = geometry.getCoordinateAt(1);

  // RIGHT OF LINE
  var lineStr1 = new LineString([start, end]);
  lineStr1.rotate(0.7853981634, end);

  // LEFT OF LINE
  var lineStr2 = new LineString([start, end]);
  lineStr2.rotate(-0.7853981634, end);

  var clone = geometry.clone();
  clone.appendCoordinate(lineStr1.getFirstCoordinate());
  clone.appendCoordinate(lineStr2.getFirstCoordinate());
  clone.appendCoordinate(end);

  return clone;
}

export function importMyMaps(id, callback2) {
  helpers.getJSON(`${mainConfig.apiUrl}getMyMaps/${id}`, result => {
    //helpers.getJSON(`http://localhost:8085/getMyMaps/${id}`, result => {
    console.log(result);
    callback2(result);
  });
}

export function exportMyMaps(callback2, id = null) {
  const storage = localStorage.getItem("myMaps");
  if (storage === null) return [];
  const data = JSON.parse(storage);

  let item = null;
  if (id !== null) {
    item = data.items.filter(item => {
      return item.id === id;
    })[0];

    item.label = "Feedback: " + item.label;
    if (item !== null) {
      data.items = [item];
    }
  }

  helpers.postJSON(mainConfig.apiUrl + "postMyMaps/", data, result => {
    callback2(result);
  });
}

function _radians(n) {
  return n * (Math.PI / 180);
}
function _degrees(n) {
  return n * (180 / Math.PI);
}

export function getBearing(fromPoint, toPoint) {
  const fromPointLL = helpers.toLatLongFromWebMercator(fromPoint);
  const toPointLL = helpers.toLatLongFromWebMercator(toPoint);

  var startLat = _radians(fromPointLL[1]);
  var startLong = _radians(fromPointLL[0]);
  var endLat = _radians(toPointLL[1]);
  var endLong = _radians(toPointLL[0]);

  var dLong = endLong - startLong;

  var dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));
  if (Math.abs(dLong) > Math.PI) {
    if (dLong > 0.0) dLong = -(2.0 * Math.PI - dLong);
    else dLong = 2.0 * Math.PI + dLong;
  }

  const deg = (_degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
  const degRounded = Math.round(deg * 100) / 100;
  return degRounded;
}
