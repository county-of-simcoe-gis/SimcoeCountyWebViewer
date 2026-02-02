import * as helpers from "../../../../../helpers/helpers";
import printConfig from "../config.json";
import utils from "./utils";
import { asArray } from "ol/color";
import { FeatureHelpers, LayerHelpers, OL_DATA_TYPES } from "../../../../../helpers/OLHelpers";
import * as drawingHelpers from "../../../../../helpers/drawingHelpers";
import { Vector as VectorLayer, Tile as TileLayer, Image as ImageLayer, Group as LayerGroup } from "ol/layer.js";

// =============================================================================
// GENERIC STYLE-TO-MAPFISH CONVERSION HELPERS
// These functions provide a generic way to convert OpenLayers styles to MapFish
// Print format without requiring special cases for each feature type.
// =============================================================================

/**
 * Looks up a font name in the print config, returns default if not found
 */
const lookupFont = (font) => {
  if (!font) return printConfig.fonts[0];
  const foundFont = printConfig.fonts.find((item) => font.toLowerCase() === item.toLowerCase());
  return foundFont || printConfig.fonts[0];
};

/**
 * Converts an OpenLayers color (array or string) to hex format
 */
const colorToHex = (color) => {
  if (!color) return null;
  if (Array.isArray(color)) return utils.rgbToHex(...color);
  return color;
};

/**
 * Gets opacity from an OpenLayers color
 */
const colorToOpacity = (color) => {
  if (!color) return 1;
  if (Array.isArray(color)) return color[3] !== undefined ? color[3] : 1;
  return asArray(color)[3];
};

/**
 * Extracts all visual components from an OpenLayers style or style function.
 * Returns an array of { geometry, style, type } objects representing each
 * distinct visual element that needs to be rendered.
 *
 * @param {Feature} feature - The OpenLayers feature
 * @param {Style|Function|null} featureStyle - The feature's style
 * @param {Style|null} layerStyle - Fallback layer style
 * @returns {Array<{geometry: Geometry, style: Style, type: string}>}
 */
const extractVisualComponents = (feature, featureStyle, layerStyle) => {
  const components = [];
  const featureGeometry = feature.getGeometry();

  // Resolve style function if needed
  let resolvedStyles = [];
  if (typeof featureStyle === "function") {
    const result = featureStyle(feature);
    resolvedStyles = Array.isArray(result) ? result : result ? [result] : [];
  } else if (featureStyle) {
    resolvedStyles = [featureStyle];
  } else if (layerStyle) {
    resolvedStyles = [layerStyle];
  }

  // Process each style in the array
  resolvedStyles.forEach((style, index) => {
    if (!style) return;

    // Determine the geometry for this style component
    // Some styles have custom geometries (e.g., anchor points at specific locations)
    let geometry = featureGeometry;
    if (style.getGeometry && typeof style.getGeometry === "function") {
      const customGeom = style.getGeometry();
      if (customGeom && typeof customGeom === "function") {
        geometry = customGeom(feature);
      } else if (customGeom) {
        geometry = customGeom;
      }
    }

    // Determine what type of visual this style represents
    let visualType = "shape"; // default
    if (style.getText && style.getText()) {
      visualType = "text";
    } else if (style.getImage && style.getImage() && geometry !== featureGeometry) {
      visualType = "marker"; // Point marker with custom geometry (like callout anchor)
    }

    components.push({
      geometry,
      style,
      type: visualType,
      isCustomGeometry: geometry !== featureGeometry,
    });
  });

  return components;
};

/**
 * Converts an OpenLayers Fill to MapFish symbolizer properties
 */
const fillToSymbolizer = (olFill) => {
  if (!olFill) return {};
  const color = olFill.getColor ? olFill.getColor() : null;
  if (!color) return {};
  return {
    fillColor: colorToHex(color),
    fillOpacity: colorToOpacity(color),
  };
};

/**
 * Converts an OpenLayers Stroke to MapFish symbolizer properties
 */
const strokeToSymbolizer = (olStroke) => {
  if (!olStroke) return {};
  const color = olStroke.getColor ? olStroke.getColor() : null;
  const width = olStroke.getWidth ? olStroke.getWidth() : null;
  const lineDash = olStroke.getLineDash ? olStroke.getLineDash() : null;

  const result = {};
  if (color) {
    result.strokeColor = colorToHex(color);
    result.strokeOpacity = colorToOpacity(color);
  }
  if (width !== null) {
    result.strokeWidth = width;
  }
  if (lineDash) {
    result.strokeDashstyle = lineDash[0] === 1 ? "dot" : "dash";
    result.strokeLinejoin = "round";
    result.strokeLinecap = "round";
  }
  return result;
};

/**
 * Converts an OpenLayers Text style to MapFish text symbolizer
 */
const textToSymbolizer = (olText, options = {}) => {
  if (!olText || !olText.getText || !olText.getText()) return null;

  const fontString = olText.getFont ? olText.getFont() : "normal 12px Arial";
  const font = (fontString || "normal 12px Arial").split(" ");
  const textFill = olText.getFill ? olText.getFill() : null;
  const textStroke = olText.getStroke ? olText.getStroke() : null;
  const textAlign = olText.getTextAlign ? olText.getTextAlign() : "center";
  const textBaseline = olText.getTextBaseline ? olText.getTextBaseline() : "middle";

  let textFillColor = textFill && textFill.getColor ? colorToHex(textFill.getColor()) : "#000000";
  let strokeColor = textStroke && textStroke.getColor ? colorToHex(textStroke.getColor()) : "#000000";

  // Handle white/light text for print readability
  let useStrokeAsFill = false;
  if (textFillColor) {
    const colorStr = String(textFillColor).toLowerCase();
    if (colorStr === "#ffffff" || colorStr === "#fff" || colorStr === "white") {
      useStrokeAsFill = true;
      textFillColor = strokeColor || "#000000";
    }
  }

  // Scale font size for print - convert pixels to smaller print-appropriate size
  // Screen is typically 96 DPI, print is higher, so we scale down
  let fontSize = font.length >= 2 ? font[1] : "12px";
  const fontSizeMatch = String(fontSize).match(/^(\d+(?:\.\d+)?)(px|pt)?$/i);
  if (fontSizeMatch) {
    const sizeValue = parseFloat(fontSizeMatch[1]);
    const unit = (fontSizeMatch[2] || "px").toLowerCase();
    // Scale factor to make print text similar size to screen
    const scaleFactor = 0.6;
    const scaledSize = unit === "px" ? Math.round(sizeValue * scaleFactor) : sizeValue;
    fontSize = `${scaledSize}px`;
  }

  const symbolizer = {
    type: "text",
    fontFamily: font.length >= 3 ? lookupFont(font[2]) : "Arial",
    fontSize: fontSize,
    fontStyle: "normal",
    fontWeight: font.length >= 1 ? font[0] : "normal",
    label: olText.getText(),
    fontColor: textFillColor,
    labelAlign: `${(textAlign || "center").substring(0, 1)}${(textBaseline || "middle").substring(0, 1)}`,
    labelRotation: drawingHelpers._degrees(olText.getRotation ? olText.getRotation() || 0 : 0),
    labelXOffset: (olText.getOffsetX ? olText.getOffsetX() || 0 : 0) * -1,
    labelYOffset: (olText.getOffsetY ? olText.getOffsetY() || 0 : 0) * -1,
    goodnessOfFit: 0,
  };

  // Add halo for readability
  if (useStrokeAsFill) {
    symbolizer.haloColor = "#ffffff";
    symbolizer.haloOpacity = 0.9;
    symbolizer.haloRadius = 2;
  } else if (textStroke && textStroke.getWidth && textStroke.getWidth() > 1 && !options.skipHalo) {
    symbolizer.haloColor = strokeColor;
    symbolizer.haloOpacity = 0.4;
    symbolizer.haloRadius = Math.min(1.5, Number(textStroke.getWidth()) * 0.3);
  }

  return symbolizer;
};

/**
 * Converts an OpenLayers Circle/RegularShape image to MapFish point symbolizer
 */
const circleImageToSymbolizer = (olImage) => {
  if (!olImage) return null;

  const symbolizer = {
    type: "point",
    graphicName: "circle",
  };

  if (olImage.getRadius) {
    symbolizer.pointRadius = olImage.getRadius();
  }

  const fill = olImage.getFill ? olImage.getFill() : null;
  const stroke = olImage.getStroke ? olImage.getStroke() : null;

  if (fill && fill.getColor) {
    const color = fill.getColor();
    symbolizer.fillColor = colorToHex(color);
    symbolizer.fillOpacity = colorToOpacity(color);
  }

  if (stroke && stroke.getColor) {
    const color = stroke.getColor();
    symbolizer.strokeColor = colorToHex(color);
    symbolizer.strokeWidth = stroke.getWidth ? stroke.getWidth() : 1;
    symbolizer.strokeOpacity = colorToOpacity(color);
  }

  return symbolizer;
};

/**
 * Converts an OpenLayers Icon image to MapFish symbolizer
 */
const iconImageToSymbolizer = (olImage) => {
  if (!olImage || !olImage.getSrc) return null;

  const iconSrc = olImage.getSrc();
  if (!iconSrc) return null;

  return {
    type: "point",
    rotation: parseFloat(olImage.getRotation ? olImage.getRotation() : 0) * (180 / Math.PI),
    externalGraphic: iconSrc,
    graphicName: "icon",
    graphicOpacity: olImage.getOpacity ? olImage.getOpacity() : 1,
  };
};

/**
 * Creates a MapFish GeoJSON layer from geometry, symbolizers, and properties
 */
const createGeoJsonLayer = (layerName, featureId, geometry, symbolizers, properties = {}) => {
  const geojsonType = geometry.getType();
  let coordinates;

  // Convert OL geometry to GeoJSON coordinates
  if (geojsonType === "Point") {
    coordinates = geometry.getCoordinates();
  } else if (geojsonType === "LineString") {
    coordinates = geometry.getCoordinates();
  } else if (geojsonType === "Polygon") {
    coordinates = geometry.getCoordinates();
  } else if (geojsonType === "MultiPoint") {
    coordinates = geometry.getCoordinates();
  } else if (geojsonType === "MultiLineString") {
    coordinates = geometry.getCoordinates();
  } else if (geojsonType === "MultiPolygon") {
    coordinates = geometry.getCoordinates();
  } else {
    // Fallback for other types
    coordinates = geometry.getCoordinates();
  }

  const styleObj = { version: "2" };
  styleObj["*"] = { symbolizers };

  return {
    type: "geojson",
    geoJson: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: geojsonType,
            coordinates,
          },
          properties,
        },
      ],
    },
    name: `${layerName}-${featureId}`,
    style: styleObj,
  };
};

/**
 * Creates a text background box layer (for labels with backgrounds)
 */
const createTextBackgroundLayer = (layerName, featureId, centerPoint, textContent, textStyle) => {
  if (!textStyle) return null;

  const bgFill = textStyle.getBackgroundFill ? textStyle.getBackgroundFill() : null;
  const bgStroke = textStyle.getBackgroundStroke ? textStyle.getBackgroundStroke() : null;

  // Only create background if there's a background fill
  if (!bgFill) return null;

  const fontString = textStyle.getFont ? textStyle.getFont() : "14px Arial";
  const fontSizeMatch = fontString.match(/(\d+)px/);
  let fontSizeNum = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 14;

  // Apply same scaling factor as text (must match textToSymbolizer scaleFactor)
  const scaleFactor = 0.6;
  const scaledFontSize = Math.round(fontSizeNum * scaleFactor);

  // Calculate box dimensions - use wider character width for bold text
  const charWidth = scaledFontSize * 0.65;
  const textWidthPx = textContent.length * charWidth;
  const textHeightPx = scaledFontSize * 1.4;
  const paddingPx = 20;
  const boxWidthPx = textWidthPx + paddingPx * 2;
  const boxHeightPx = textHeightPx + paddingPx;

  // Convert pixels to meters (EPSG:3857)
  const resolution = window.map ? window.map.getView().getResolution() : 1;
  const boxWidthMeters = boxWidthPx * resolution;
  const boxHeightMeters = boxHeightPx * resolution;

  const halfW = boxWidthMeters / 2;
  const halfH = boxHeightMeters / 2;
  const boxCoords = [
    [centerPoint[0] - halfW, centerPoint[1] - halfH],
    [centerPoint[0] + halfW, centerPoint[1] - halfH],
    [centerPoint[0] + halfW, centerPoint[1] + halfH],
    [centerPoint[0] - halfW, centerPoint[1] + halfH],
    [centerPoint[0] - halfW, centerPoint[1] - halfH],
  ];

  const bgFillColor = bgFill && bgFill.getColor ? colorToHex(bgFill.getColor()) : "#ffffff";
  const bgStrokeColor = bgStroke && bgStroke.getColor ? colorToHex(bgStroke.getColor()) : "#333333";

  const styleObj = { version: "2" };
  styleObj["*"] = {
    symbolizers: [
      {
        type: "polygon",
        fillColor: bgFillColor,
        fillOpacity: 0.95,
        strokeColor: bgStrokeColor,
        strokeWidth: 1,
        strokeOpacity: 1,
      },
    ],
  };

  return {
    type: "geojson",
    geoJson: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [boxCoords],
          },
          properties: {},
        },
      ],
    },
    name: `${layerName}-${featureId}-bg`,
    style: styleObj,
  };
};

// ..........................................................................
// Load Tile matrix and build out WMTS Object
// ..........................................................................

//pulls in tile matrix from each basemap tilelayer capabilities
export async function loadTileMatrix(url) {
  let response = await fetch(url);
  let data = await response.text();
  let xml = new window.DOMParser().parseFromString(data, "text/xml");
  let json = utils.xmlToJson(xml);
  let flatTileMatrix = json.Capabilities.Contents.TileMatrixSet.TileMatrix || json.Capabilities.Contents.TileMatrixSet[0].TileMatrix;
  let tileMatrix = flatTileMatrix.map((m) => {
    return {
      identifier: m["ows:Identifier"]["#text"],
      scaleDenominator: Number(m["ScaleDenominator"]["#text"]),
      topLeftCorner: [Number(m["TopLeftCorner"]["#text"].split(" ")[0]), Number(m["TopLeftCorner"]["#text"].split(" ")[1])],
      tileSize: [256, 256],
      matrixSize: [Number(m["MatrixWidth"]["#text"]), Number(m["MatrixHeight"]["#text"])],
    };
  });
  return tileMatrix;
}

//build and loads wmts config for each layer
export async function loadWMTSConfig(url, opacity) {
  let wmtsCongif = {};

  wmtsCongif.type = "WMTS";
  wmtsCongif.imageFormat = "image/png";
  wmtsCongif.opacity = opacity;
  wmtsCongif.style = "Default Style";
  wmtsCongif.version = "1.0.0";
  wmtsCongif.dimensions = [];
  wmtsCongif.dimensionParams = {};
  wmtsCongif.requestEncoding = "REST";
  wmtsCongif.customParams = {
    TRANSPARENT: "true",
    zIndex: null,
  };
  wmtsCongif.matrixSet = "EPSG:3857";
  wmtsCongif.baseURL = url + "/tile/{TileMatrix}/{TileRow}/{TileCol}";
  wmtsCongif.layer = utils.extractServiceName(url);
  wmtsCongif.matrices = await loadTileMatrix(url + "/WMTS/1.0.0/WMTSCapabilities.xml");

  return wmtsCongif;
}
/**
 * Build vector layer for MapFish Print - GENERIC APPROACH
 * This function processes ALL feature types uniformly by:
 * 1. Extracting visual components from style (including style functions)
 * 2. Converting each component to MapFish symbolizers using generic helpers
 * 3. Creating separate layers for components with custom geometries
 *
 * NOTE: MapFish renders layers in REVERSE order from OpenLayers
 * (MapFish: first = top, last = bottom; OpenLayers: first = bottom, last = top)
 * So we reverse the feature layers at the end to maintain correct z-order.
 */
const buildVectorLayer = (layer, callback = undefined) => {
  let returnLayers = [];
  let olFeatures = [];
  var extent = window.map.getView().calculateExtent(window.map.getSize());
  layer.getSource().forEachFeatureInExtent(extent, function (feature) {
    olFeatures.push(feature);
  });
  const olLayerStyle = layer.getStyle();
  const layerName = layer.get("name") || "vector";

  olFeatures.forEach((feature) => {
    const featureId = feature.ol_uid;
    const featureStyle = feature.getStyle();
    const featureGeometry = feature.getGeometry();
    const drawType = feature.get("drawType");
    const labelText = feature.get("label") || "";

    if (!featureGeometry) return;

    // Extract all visual components from the style (handles style functions automatically)
    const components = extractVisualComponents(feature, featureStyle, olLayerStyle);

    if (components.length === 0) {
      // No visible components - skip this feature
      return;
    }

    // Collect layers for this feature in OpenLayers order (bottom to top)
    const featureLayers = [];

    // Process each visual component generically
    components.forEach((component, index) => {
      const { geometry, style, type, isCustomGeometry } = component;
      const symbolizers = [];
      const suffix = isCustomGeometry ? `-${type}-${index}` : "";

      // Extract fill/stroke from style
      const olFill = style.getFill ? style.getFill() : null;
      const olStroke = style.getStroke ? style.getStroke() : null;
      const olText = style.getText ? style.getText() : null;
      const olImage = style.getImage ? style.getImage() : null;

      // Determine geometry type for MapFish
      const geomType = geometry.getType();
      let mapfishType = printConfig.drawTypes[drawType] || printConfig.drawTypes[geomType] || "Polygon";

      // Build shape symbolizer (fill/stroke)
      if (olFill || olStroke || olImage) {
        const shapeSymbolizer = { type: mapfishType.toLowerCase() };

        // Add fill properties
        if (olFill) {
          Object.assign(shapeSymbolizer, fillToSymbolizer(olFill));
        }

        // Add stroke properties
        if (olStroke) {
          Object.assign(shapeSymbolizer, strokeToSymbolizer(olStroke));
        }

        // For line geometries, prioritize stroke symbolizer over image symbolizer
        // The image property is often just for cursor/drawing feedback, not the actual line style
        const isLineGeometry = geomType === "LineString" || geomType === "MultiLineString";
        
        // For non-line shapes that only have an image, use the image symbolizer
        if (olImage && !isLineGeometry && geomType === "Point") {
          // Handle circle/marker images (for custom geometry points like anchors)
          if (olImage.getRadius) {
            const circleSymbolizer = circleImageToSymbolizer(olImage);
            if (circleSymbolizer) {
              symbolizers.push(circleSymbolizer);
            }
          }
          // Handle icon images
          else if (olImage.getSrc) {
            const iconSymbolizer = iconImageToSymbolizer(olImage);
            if (iconSymbolizer) {
              symbolizers.push(iconSymbolizer);
            }
          }
        }
        // For lines, polygons, or shapes with fill/stroke, use the shape symbolizer
        else if (olFill || olStroke) {
          // For Text drawType, use invisible point marker
          if (drawType === "Text") {
            symbolizers.push({
              type: "point",
              graphicName: "circle",
              pointRadius: 1,
              fillColor: "#000000",
              fillOpacity: 0,
              strokeOpacity: 0,
            });
          } else {
            symbolizers.push(shapeSymbolizer);
          }
        }
      }

      // Handle text with background
      if (olText && olText.getText && olText.getText()) {
        const textSymbolizer = textToSymbolizer(olText, { skipHalo: !!olText.getBackgroundFill });
        if (textSymbolizer) {
          // If text has a background, create separate layers for background box and text
          if (olText.getBackgroundFill && olText.getBackgroundFill()) {
            const textPoint = geometry.getType() === "Point" ? geometry.getCoordinates() : geometry.getCoordinates()[geometry.getCoordinates().length - 1];

            // Create background box layer (pushed first, will be below text after processing)
            const bgLayer = createTextBackgroundLayer(layerName, featureId, textPoint, olText.getText(), olText);
            if (bgLayer) {
              featureLayers.push(bgLayer);
            }

            // Create text layer at the same point (pushed after bg, will be above after processing)
            const textStyleObj = { version: "2" };
            textStyleObj["*"] = {
              symbolizers: [{ type: "point", graphicName: "circle", pointRadius: 1, fillOpacity: 0, strokeOpacity: 0 }, textSymbolizer],
            };

            featureLayers.push({
              type: "geojson",
              geoJson: {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: textPoint },
                    properties: { label: olText.getText() },
                  },
                ],
              },
              name: `${layerName}-${featureId}-text`,
              style: textStyleObj,
            });
          } else {
            // Regular text without background - add to symbolizers
            symbolizers.push(textSymbolizer);
          }
        }
      }

      // Create layer for this component if it has symbolizers
      if (symbolizers.length > 0) {
        if (isCustomGeometry) {
          const componentLayer = createGeoJsonLayer(layerName, `${featureId}${suffix}`, geometry, symbolizers, { label: labelText });
          featureLayers.push(componentLayer);
        } else {
          const styles = { version: "2" };
          styles["*"] = { symbolizers };

          let itemLayer = {
            type: "geojson",
            geoJson: {},
            name: `${layerName}-${featureId}`,
            style: styles,
          };

          let geoJsonFeature = FeatureHelpers.setFeatures([feature], OL_DATA_TYPES.GeoJSON, "EPSG:4326", "EPSG:4326");
          if (geoJsonFeature !== undefined) {
            geoJsonFeature = JSON.parse(geoJsonFeature);
            itemLayer.geoJson = geoJsonFeature.features.map((f) => {
              if (f.properties === null) f.properties = {};
              return f;
            });
            featureLayers.push(itemLayer);
          }
        }
      }
    });

    // Reverse layer order for MapFish (renders first = top, last = bottom)
    // OpenLayers style arrays are ordered bottom-to-top, so we reverse for MapFish
    returnLayers.push(...featureLayers.reverse());
  });

  if (returnLayers.length === 0) returnLayers = undefined;
  if (callback !== undefined) callback(returnLayers);
  else return returnLayers;
};

let configureTileLayer = async (l) => {
  let tileUrl = null;
  const layerSource = l.getSource();
  tileUrl = layerSource.getUrls();
  tileUrl = tileUrl[0].indexOf("/MapServer/WMTS/") !== -1 ? `${tileUrl[0].split("/WMTS/")[0]}` : `${tileUrl[0].split("/tile/")[0]}`;
  let retLayer = {};
  if (l.values_.source.key_.includes("openstreetmap.org")) {
    retLayer = {
      baseURL: l.values_.source.key_.split("\n")[0],
      type: "OSM",
      imageExtension: "png",
      customParams: {
        zIndex: 1,
      },
    };
    return retLayer;
  } else {
    retLayer = await loadWMTSConfig(tileUrl, l.values_.opacity);
    const layerIndex = l.getZIndex();
    const printIndex = l.get("printIndex");
    retLayer.customParams.zIndex = layerIndex ? layerIndex + printIndex : 0 + printIndex ? printIndex : 0;
    return retLayer;
  }
};

const configureImageLayer = (l, options) => {
  var url = new URL(l.values_.source.image_.src_);
  //  console.log("original:", url.href);
  let urlParams = new URLSearchParams(url.searchParams);
  let urlDPI = parseInt(urlParams.get("DPI"));
  let urlSIZE = urlParams.get("SIZE").split(",");
  let urlBBOX = urlParams.get("BBOX").split(",");
  let printSize = !options.map.height ? window.map.getSize() : [parseInt(options.map.height), parseInt(options.map.width)];
  var extent = options.map.bbox ? options.map.bbox : utils.computeExtent(...printSize, 72, options.map.scale, options.map.center);
  let outputDPI = options.map.dpi;
  let outputSize = [
    parseInt((parseInt(urlSIZE[0]) / ((parseFloat(urlBBOX[0]) - parseFloat(urlBBOX[2])) / (parseFloat(extent[0]) - parseFloat(extent[2])))) * (outputDPI / urlDPI)),
    parseInt((parseInt(urlSIZE[1]) / ((parseFloat(urlBBOX[1]) - parseFloat(urlBBOX[3])) / (parseFloat(extent[1]) - parseFloat(extent[3])))) * (outputDPI / urlDPI)),
  ];
  if (outputSize[0] > 4096 || outputSize[1] > 4096) {
    let outputScaler = 4096 / (outputSize[0] >= outputSize[1] ? outputSize[0] : outputSize[1]);
    outputDPI = parseInt(outputDPI * outputScaler);
    outputSize = [parseInt(outputSize[0] * outputScaler), parseInt(outputSize[1] * outputScaler)];
  }
  url.searchParams.set("SIZE", outputSize.join(","));
  url.searchParams.set("DPI", outputDPI);
  url.searchParams.set("BBOX", extent.join(","));
  url.searchParams.set("BBOXSR", "3857");
  url.searchParams.set("IMAGESR", "3857");
  // console.log("calculated:", url.href);
  return {
    type: "image",
    baseURL: url,
    opacity: l.values_.opacity,
    imageFormat: "image/png",
    extent: extent,
    name: "image",
  };
};

const configureWMSImageLayer = (l) => {
  return {
    type: "wms",
    baseURL: l.values_.source.url_.split("?")[0],
    serverType: l.values_.source.serverType_,
    opacity: l.values_.opacity,
    layers: [l.values_.source.params_.LAYERS],
    imageFormat: "image/png",
    customParams: {
      TRANSPARENT: "true",
      zIndex: l.getZIndex() + l.get("printIndex"),
    },
    version: "1.3.0",
  };
};

const getLayerByType = async (layer, printoptions, callback = undefined) => {
  if (layer instanceof VectorLayer) {
    //let retLayer = configureVectorMyMapsLayer(layer);
    let retLayer = buildVectorLayer(layer);

    if (callback !== undefined) callback(retLayer);
    else return retLayer;
  } else if (layer instanceof ImageLayer) {
    let retLayer = undefined;
    if (LayerHelpers.getLayerSourceType(layer.getSource()) === OL_DATA_TYPES.ImageArcGISRest) {
      retLayer = configureImageLayer(layer, printoptions);
    } else {
      retLayer = configureWMSImageLayer(layer);
    }
    if (callback !== undefined) callback(retLayer);
    else return retLayer;
  } else if (layer instanceof TileLayer) {
    let retLayer = await configureTileLayer(layer);
    if (callback !== undefined) callback(retLayer);
    else return retLayer;
  } else if (layer instanceof LayerGroup) {
    let layers = [];
    let groupLayers = layer.getLayers().getArray();
    if (groupLayers !== undefined) {
      let layersPromise = groupLayers
        .filter((item) => item.getProperties().excludePrint !== true)
        .map((item) =>
          getLayerByType(item, printoptions, (retLayers) => {
            if (retLayers !== undefined) {
              if (Array.isArray(retLayers)) layers = layers.concat(retLayers);
              else layers.push(retLayers);
            }
          })
        );
      //wait for list of layer promises to be resolved
      await Promise.all(layersPromise);
    }

    //let layers = await configureLayerGroup(layer);
    if (callback !== undefined) callback(layers);
    else return layers;
  } else {
    console.warn("Unsupported Layer Type", layer);
    if (callback !== undefined) callback();
    else return;
  }
};
const sortLayers = (layers, callback = undefined) => {
  let sorted = layers.sort((a, b) => {
    let indexA = a.customParams === undefined ? 99999999 : a.customParams.zIndex;
    let indexB = b.customParams === undefined ? 99999999 : b.customParams.zIndex;

    if (indexA > indexB) {
      return -1;
    }
    if (indexA < indexB) {
      return 1;
    }
    return 0;
  });
  if (callback !== undefined) callback(sorted);
  else return sorted;
};

const isOverviewLayer = (layerName) => {
  return printConfig.overviewMapLayers.includes(layerName);
};

// ..........................................................................
// Print Request Template Switcher
// ..........................................................................
const switchTemplates = (options, callback = undefined) => {
  //shared print request properties
  const mapProjection = window.map.getView().getProjection().code_;
  const longitudeFirst = true;
  const currentMapViewCenter = window.map.getView().values_.center;
  const mapExtent = window.map.getView().calculateExtent();
  const currentMapScale = helpers.getMapScale();
  const mapScale = 2990000;
  const rotation = 0;
  const dpi = parseInt(options.mapResolutionOption);
  let printSize = !options.printSizeSelectedOption.size || options.printSizeSelectedOption.size.length === 0 ? window.map.getSize() : options.printSizeSelectedOption.size;
  const parameters = options.options.parameters || [];

  const attributes = {
    title: options.mapTitle,
    description: options.termsOfUse,
    map: {},
    scalebar: {
      geodetic: currentMapScale,
    },
    scale: "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  };
  if (parameters !== undefined) {
    parameters.forEach((item) => {
      attributes[item.name] = item.value;
    });
  }
  attributes.map.projection = mapProjection;
  attributes.map.longitudeFirst = longitudeFirst;
  attributes.map.rotation = rotation;
  attributes.map.dpi = dpi;

  if (options.printSizeSelectedOption.size.length === 0) {
    if (options.mapOnlyHeight) attributes.map.height = options.mapOnlyHeight;
    if (options.mapOnlyWidth) attributes.map.width = options.mapOnlyWidth;
    printSize = [options.mapOnlyWidth, options.mapOnlyHeight];
  }
  switch (options.mapScaleOption) {
    case "forceScale":
      attributes.scalebar.geodetic = parseInt(options.forceScale);
      attributes.map.scale = parseInt(options.forceScale);
      attributes.scale = "1 : " + options.forceScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      attributes.map.center = currentMapViewCenter;

      break;
    case "preserveMapExtent":
      attributes.map.height = utils.computeDimension(...printSize, mapExtent).newHeight;
      attributes.map.width = utils.computeDimension(...printSize, mapExtent).newWidth;
      attributes.map.bbox = mapExtent;
      break;
    default:
      attributes.map.scale = currentMapScale;
      attributes.map.center = currentMapViewCenter;

      break;
  }

  if (options.printSizeSelectedOption.overview) {
    const overviewMap = {
      projection: mapProjection,
      center: currentMapViewCenter,
      scale: mapScale,
      longitudeFirst: longitudeFirst,
      rotation: rotation,
      dpi: dpi,
    };
    attributes["overviewMap"] = overviewMap;
  }
  if (window.config.printLogo !== undefined) attributes["imageName"] = options.printSizeSelectedOption.imageName || window.config.printLogo;
  if (callback !== undefined) callback(attributes);
  else return attributes;
};
// ..........................................................................
// Building pring request According to mapfish v3 config standards
// ..........................................................................
export async function printRequest(mapLayers, printSelectedOption) {
  //alternative osm layer used from maptiler:api.maptiler.com due to osm user agent user restriction policy
  //"https://api.maptiler.com/maps/streets/256/{z}/{x}/{y}.png?key=6vlppHmCcPoEbI6f1RBX";

  // init print request object
  let printRequest = {
    layout: "",
    outputFormat: "",
    dpi: parseInt(printSelectedOption.mapResolutionOption),
    compressed: true,
  };
  printRequest["parameters"] = printSelectedOption.options.parameters || [];

  printRequest.outputFormat = printSelectedOption.printFormatSelectedOption.value;
  //ensures that template configuration is executed before print request object is sent
  printRequest.attributes = switchTemplates(printSelectedOption);
  printRequest.layout = printSelectedOption.printSizeSelectedOption.layout;

  let mainMap = [];
  let overviewMap = [];
  let sortedMainMap = [];
  let sortedOverviewMap = [];
  //iterate through each map layer passed in the window.map
  let layerOrder = 0;
  mapLayers.forEach((layer) => {
    if (layer instanceof LayerGroup) {
      layer.getLayers().forEach((item) => {
        layerOrder++;
        item.setProperties({ printIndex: layerOrder });
      });
    } else {
      layerOrder++;
      layer.setProperties({ printIndex: layerOrder });
    }
  });
  let mapLayerPromises = mapLayers
    .filter((layer) => layer.getProperties().excludePrint !== true)
    .map((layer) =>
      getLayerByType(layer, printRequest.attributes, (retLayers) => {
        if (retLayers !== undefined) {
          if (Array.isArray(retLayers)) mainMap = mainMap.concat(retLayers);
          else mainMap.push(retLayers);
          if (Array.isArray(retLayers)) {
            retLayers.forEach((item) => {
              if (isOverviewLayer(item.layer)) overviewMap.push(item);
            });
          } else {
            if (isOverviewLayer(retLayers.layer)) overviewMap.push(retLayers);
          }
        }
      })
    );

  //wait for list of layer promises to be resolved
  await Promise.all(mapLayerPromises);

  //ensures that the sorted layers executes after the intitial mapLayerList is resolved
  sortedMainMap = sortLayers(mainMap);
  printRequest.attributes.map["layers"] = sortedMainMap;
  if (printRequest.attributes.overviewMap !== undefined) {
    sortedOverviewMap = sortLayers(overviewMap);
    printRequest.attributes.overviewMap["layers"] = sortedOverviewMap;
  }
  return printRequest;
}
