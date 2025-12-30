import { Circle as CircleStyle, Fill, Stroke, Style, RegularShape } from "ol/style.js";
import { asArray } from "ol/color";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import LineString from "ol/geom/LineString.js";
import Point from "ol/geom/Point.js";
import * as helpers from "./helpers";

// GET LAYER BY NAME FROM LAYER
export function getLayerByName(layerName) {
  const layers = window.map.getLayers();
  let returnLayer = undefined;
  if (layers.array_.length > 0) {
    layers.forEach((layer) => {
      if (returnLayer === undefined) {
        if (layerName === layer.getProperties().name) returnLayer = layer;
      }
    });
  }
  return returnLayer;
}

// GET LAYER BY NAME FROM LAYER
export function getFeatureByLayerNameAndId(layerName, id) {
  let feature = null;
  window.map.getLayers().forEach((layer) => {
    if (layer.getProperties().name === layerName) {
      layer
        .getSource()
        .getFeatures()
        .forEach((feat) => {
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
  window.map.getLayers().forEach((layer) => {
    if (layer.getProperties().name === drawingLayerName) {
      layer
        .getSource()
        .getFeatures()
        .forEach((feat) => {
          if (feat.get("id") === id) feature = feat;
          return;
        });
    }
  });

  return feature;
}

export function getStyleFromJSON(styleJSON, pointType) {
  if (styleJSON === undefined || styleJSON === null) return getDefaultDrawStyle({ drawColor: "#e809e5" });

  // FILL
  let fill = null;
  if (styleJSON.fill_ !== null) {
    fill = new Fill({
      color: styleJSON.fill_.color_,
    });
  }

  // STROKE
  let stroke = null;
  if (styleJSON.stroke_ !== null) {
    stroke = new Stroke({
      color: styleJSON.stroke_.color_,
      lineDash: styleJSON.stroke_.lineDash_,
      width: styleJSON.stroke_.width_,
    });
  }

  // IMAGE / CIRCLESTYLE
  let image = null;
  if (styleJSON.image_ !== null) {
    const imageFill = new Fill({
      color: styleJSON.image_.fill_ === undefined ? [255, 0, 0, 1] : styleJSON.image_.fill_.color_,
    });
    const imageStroke = new Stroke({
      color: styleJSON.image_.stroke_ === undefined ? [255, 0, 0, 0.7] : styleJSON.image_.stroke_.color_,
      width: styleJSON.image_.stroke_ === undefined ? 1 : styleJSON.image_.stroke_.width_,
      lineDash: styleJSON.image_.stroke_ === undefined ? null : styleJSON.image_.stroke_.lineDash_,
    });

    if (pointType === undefined || pointType === "circle") {
      image = new CircleStyle({
        radius: styleJSON.image_.radius_,
        stroke: imageStroke,
        fill: imageFill,
      });
    } else if (pointType === "square") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 4,
        radius: styleJSON.image_.radius_,
        angle: Math.PI / 4,
        rotation: styleJSON.image_.rotation_,
      });
    } else if (pointType === "triangle") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 3,
        radius: styleJSON.image_.radius_,
        //rotation: Math.PI / 4,
        rotation: styleJSON.image_.rotation_,
        angle: 0,
      });
    } else if (pointType === "star") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 5,
        radius: styleJSON.image_.radius_,
        radius2: 4,
        angle: 0,
        rotation: styleJSON.image_.rotation_,
      });
    } else if (pointType === "cross") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 4,
        radius: styleJSON.image_.radius_,
        radius2: 0,
        angle: 0,
        rotation: styleJSON.image_.rotation_,
      });
    } else if (pointType === "x") {
      image = new RegularShape({
        fill: imageFill,
        stroke: imageStroke,
        points: 4,
        radius: styleJSON.image_.radius_,
        radius2: 0,
        angle: Math.PI / 4,
        rotation: styleJSON.image_.rotation_,
      });
    }
  }

  // CREATE NEW STYLE FROM PROPS
  let style = new Style({
    fill: fill,
    stroke: stroke,
    image: image,
  });

  return style;
}

export function getDefaultDrawStyle(opts) {
  //{drawColor, isText = false, strokeWidth = 3, pointType = "circle", geometryType) {
  let { drawColor, strokeColor, strokeOpacity, fillColor, fillOpacity, strokeWidth, pointType, geometryType, isText } = opts;
  let hexColor = "#e809e5";
  if (drawColor) hexColor = asArray(drawColor);
  if (isText === undefined) isText = false;
  if (strokeWidth === undefined) strokeWidth = 3;
  if (pointType === undefined) pointType = "circle";
  if (strokeColor === undefined) strokeColor = hexColor.slice();
  else strokeColor = asArray(strokeColor).slice();
  if (fillColor === undefined) fillColor = hexColor.slice();
  else fillColor = asArray(fillColor).slice();
  if (strokeOpacity === undefined) strokeOpacity = 0.8;
  if (fillOpacity === undefined) fillOpacity = 0.4;

  fillColor[3] = isText ? 0 : fillOpacity; // change the alpha of the color
  strokeColor[3] = isText ? 0 : strokeOpacity; // change the alpha of the color

  let drawStyle = new Style({
    fill: new Fill({
      color: fillColor, // USE OPACITY
    }),
    stroke: new Stroke({
      color: geometryType === "Polygon" || geometryType === "Circle" ? [0, 0, 0, 0.8] : strokeColor,
      width: strokeWidth,
    }),
    image: new CircleStyle({
      radius: 4,
      stroke: new Stroke({
        color: isText ? strokeColor : [0, 0, 0, strokeOpacity],
        width: strokeWidth,
      }),
      fill: new Fill({
        color: fillColor,
      }),
    }),
  });

  return drawStyle;
}

export function getDrawStyle(options = {}) {
  let { geometryType, drawColor, opacity, isText, pointType, strokeWidth } = options;
  if (opacity === undefined) opacity = 0;
  if (!pointType) pointType = "circle";
  if (isText === undefined) isText = false;
  if (strokeWidth === undefined) strokeWidth = 3;

  // UPDATE FILL COLOR OPACITY

  var color = asArray(drawColor);
  color = color.slice();
  color[3] = isText ? 0 : opacity; // change the alpha of the color

  let drawStyle = new Style({
    fill: new Fill({
      color: color, // USE OPACITY
    }),
    stroke: new Stroke({
      color: geometryType === "Polygon" || geometryType === "Circle" ? [0, 0, 0, 0.8] : color,
      width: strokeWidth,
    }),
    image: new CircleStyle({
      radius: 4,
      stroke: new Stroke({
        color: isText ? color : [0, 0, 0, opacity],
        width: strokeWidth,
      }),
      fill: new Fill({
        color: color,
      }),
    }),
  });

  return drawStyle;
}

export function getPointStyle(pointType = "circle", radius = 5, strokeColor = "black", strokeWidth = 2, fillColor = "red", rotation = 0, strokeType = "normal") {
  const fill = new Fill({ color: fillColor });

  let stroke = new Stroke({ color: strokeColor, width: strokeWidth });
  if (strokeType === "dash") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [10],
    });
  } else if (strokeType === "dot") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [1, 5],
    });
  }

  // CIRCLE STYLE
  if (pointType === "circle") {
    return new Style({
      image: new CircleStyle({
        radius: radius,
        stroke: stroke,
        fill: fill,
      }),
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
        rotation: rotation,
      }),
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
        angle: 0,
      }),
    });
  } else if (pointType === "star") {
    let radius2 = 0;
    if (radius < 15) radius2 = 4;
    else if (radius > 15 && radius < 40) radius2 = 8;
    else if (radius > 40 && radius < 70) radius2 = 16;
    else radius2 = 22;
    style = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 5,
        radius: radius,
        radius2: radius2,
        angle: 0,
        rotation: rotation,
      }),
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
        rotation: rotation,
      }),
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
        rotation: rotation,
      }),
    });
  }

  return style;
}

export function getLineStringStyle(strokeColor = "black", strokeWidth = 2, strokeType = "normal") {
  let stroke = new Stroke({ color: strokeColor, width: strokeWidth });
  if (strokeType === "dash") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [10],
    });
  } else if (strokeType === "dot") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [1, 5],
    });
  }

  let style = new Style({
    stroke: stroke,
  });

  return style;
}

export function getPolygonStyle(strokeColor = "black", strokeWidth = 2, fillColor = "red", strokeType = "normal") {
  const fill = new Fill({ color: fillColor });

  let stroke = new Stroke({ color: strokeColor, width: strokeWidth });
  if (strokeType === "dash") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [10],
    });
  } else if (strokeType === "dot") {
    stroke = new Stroke({
      color: strokeColor,
      width: strokeWidth,
      lineDash: [1, 5],
    });
  }

  let style = new Style({
    fill: fill,
    stroke: stroke,
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

// GET DEFAULT LABEL STYLE based on draw type
export function getDefaultLabelStyle(drawType) {
  const isCallout = drawType === "Callout";
  return {
    textColor: isCallout ? "#000000" : "#ffffff",
    textSize: "14px",
    outlineColor: "#000000",
    outlineWidth: isCallout ? 1 : 2,
    // Callout-specific properties
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#333333",
    lineColor: "#333333",
    anchorColor: "#333333",
  };
}

// HANDLE LABELS
export function setFeatureLabel(itemInfo) {
  let feature = getFeatureById(itemInfo.id);
  let style = feature.getStyle();

  if (itemInfo.labelVisible) {
    // Get label style from itemInfo or use defaults
    const labelStyle = itemInfo.labelStyle || getDefaultLabelStyle(itemInfo.drawType);
    const isCallout = itemInfo.drawType === "Callout";

    // Extract label style properties
    const textColor = labelStyle.textColor || (isCallout ? "#000000" : "#ffffff");
    const textSize = labelStyle.textSize || "14px";
    const outlineColor = labelStyle.outlineColor || "#000000";
    const outlineWidth = labelStyle.outlineWidth !== undefined ? labelStyle.outlineWidth : (isCallout ? 1 : 2);
    
    // Callout-specific properties
    const backgroundColor = labelStyle.backgroundColor || "rgba(255, 255, 255, 0.95)";
    const borderColor = labelStyle.borderColor || "#333333";
    const lineColor = labelStyle.lineColor || "#333333";
    const anchorColor = labelStyle.anchorColor || "#333333";

    const textStyle = helpers.createTextStyle(
      feature,
      "label",
      undefined, // maxScale
      undefined, // align
      undefined, // baseline
      textSize, // size - from labelStyle
      undefined, // offsetX
      isCallout ? 0 : -8, // offsetY
      "bold", // weight
      undefined, // placement
      undefined, // maxAngleDegrees
      true, // overflow
      itemInfo.labelRotation, // rotation
      undefined, // font
      textColor, // fillColor - from labelStyle
      outlineColor, // outlineColor - from labelStyle
      outlineWidth, // outlineWidth - from labelStyle
      // Background styling for callouts
      isCallout ? backgroundColor : null,
      isCallout ? borderColor : null,
      isCallout ? 2 : 2,
      isCallout ? [5, 8, 5, 8] : null
    );

    if (isCallout) {
      // Parse line and anchor colors
      const lineColorArray = asArray(lineColor);
      const anchorColorArray = asArray(anchorColor);

      // For callouts, we need to create a style function that positions the text at the end of the line
      const calloutStyleFunction = (feature) => {
        const geometry = feature.getGeometry();
        const coordinates = geometry.getCoordinates();
        const startPoint = coordinates[0];
        const endPoint = coordinates[coordinates.length - 1];

        // Style for the tail line - use lineColor from labelStyle
        const lineStyle = new Style({
          stroke: new Stroke({
            color: [lineColorArray[0], lineColorArray[1], lineColorArray[2], 0.8],
            width: 2,
          }),
        });

        // Style for the anchor circle at the start point - use anchorColor from labelStyle
        const anchorStyle = new Style({
          geometry: new Point(startPoint),
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: [anchorColorArray[0], anchorColorArray[1], anchorColorArray[2], 0.8] }),
            stroke: new Stroke({ color: [anchorColorArray[0], anchorColorArray[1], anchorColorArray[2], 1], width: 1 }),
          }),
        });

        // Style for the text box at the end point
        const textBoxStyle = new Style({
          geometry: new Point(endPoint),
          text: textStyle,
        });

        return [lineStyle, anchorStyle, textBoxStyle];
      };

      feature.setStyle(calloutStyleFunction);
    } else {
      style.setText(textStyle);
      feature.setStyle(style);
    }

    feature.setProperties({ labelVisible: true });
  } else {
    feature.setProperties({ labelVisible: false });

    if (style !== null) {
      if (itemInfo.drawType === "Callout") {
        // Reset to base callout style without text - use labelStyle colors if available
        const labelStyle = itemInfo.labelStyle || getDefaultLabelStyle(itemInfo.drawType);
        feature.setStyle(getCalloutStyle({ 
          lineColor: labelStyle.lineColor, 
          anchorColor: labelStyle.anchorColor 
        }));
      } else {
        style.setText(null);
        feature.setStyle(style);
      }
    }
  }
}

// GET CALLOUT STYLE - Returns a style function for line with circle at anchor point
export function getCalloutStyle(opts = {}) {
  const { drawColor = "#333333", lineColor, anchorColor } = opts;
  
  // Use specific colors if provided, otherwise fall back to drawColor
  const lineColorArray = asArray(lineColor || drawColor);
  const anchorColorArray = asArray(anchorColor || drawColor);

  // Return a style function that positions anchor circle at start of line
  return (feature) => {
    const geometry = feature.getGeometry();
    const coordinates = geometry.getCoordinates();
    const startPoint = coordinates[0];

    // Style for the tail line
    const lineStyle = new Style({
      stroke: new Stroke({
        color: [lineColorArray[0], lineColorArray[1], lineColorArray[2], 0.8],
        width: 2,
      }),
    });

    // Style for the anchor circle at the start point
    const anchorStyle = new Style({
      geometry: new Point(startPoint),
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({ color: [anchorColorArray[0], anchorColorArray[1], anchorColorArray[2], 0.8] }),
        stroke: new Stroke({ color: [anchorColorArray[0], anchorColorArray[1], anchorColorArray[2], 1], width: 1 }),
      }),
    });

    return [lineStyle, anchorStyle];
  };
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
  helpers.waitForLoad("settings", Date.now(), 30, () => {
    helpers.getJSON(`${window.config.apiUrl}public/map/mymaps/${id}`, (result) => {
      callback2(result);
    });
  });
}

export function exportMyMaps(callback2, id = null) {
  helpers.waitForLoad("settings", Date.now(), 30, () => {
    const storage = localStorage.getItem(window.config.storageKeys.Draw);
    if (storage === null) return [];
    const data = JSON.parse(storage);
    let item = null;
    if (id !== null) {
      item = data.items.filter((item) => {
        return item.id === id;
      })[0];

      item.label = "Feedback: " + item.label;
      if (item !== null) {
        data.items = [item];
      }
    } else {
      data.items = data.items.map((item) => {
        if ((item.hasChanged || false) === false) return item;
        const oldId = item.id;
        const newId = helpers.getUID();
        item.id = newId;
        item.hasChanged = false;
        item.featureGeoJSON = item.featureGeoJSON.replace(oldId, newId);
        return item;
      });
    }
    helpers.postJSON(window.config.apiUrl + "public/map/mymaps/", data, (result) => {
      callback2(result);
    });
  });
}

export function _radians(n) {
  return n * (Math.PI / 180);
}
export function _degrees(n) {
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
