// THIS FILE CONTAINS STYLE FOR VECTOR TILES

//import {Fill, Stroke, Style} from 'ol/style.js';
import { Stroke, Style } from "ol/style.js";
import * as helpers from "../../../../../helpers/helpers";

const vtLayers = [
  { name: "simcoe:teranet_dapf", function: getTeranetDapf },
  { name: "simcoe:teranet_dapf_labels", function: getTeranetDapfLabels },
  { name: "simcoe:ssview_sc_2008contours2m", function: getContours },
];

export function getVectorTileStyle(name, feature) {
  const obj = helpers.searchArrayByKey(name, vtLayers);
  if (obj === undefined) return null;

  return obj.function(feature);
}

function getTeranetDapf(feature) {
  // SCALE RANGE
  if (helpers.getMapScale() > 20000) return undefined;

  return new Style({
    stroke: new Stroke({
      color: "#A9A8A6",
      width: 1,
    }),
  });
}

function getTeranetDapfLabels(feature) {
  // SCALE RANGE
  if (helpers.getMapScale() > 20000) return undefined;

  let textStyle = helpers.createTextStyle(
    feature,
    "arn",
    18000,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    "#ffffff",
    3
  );
  //let textStyle = createTextStyle(feature, 'arn', 18000,undefined,undefined);
  let text = feature.get("arn");
  text = text.substring(text.length - 8, text.length - 5) + "-" + text.substring(text.length - 5, text.length);
  textStyle.setText(text);
  return new Style({
    text: textStyle,
  });
}

function getContours(feature) {
  // SCALE RANGE
  if (helpers.getMapScale() > 25000) return undefined;

  return new Style({
    stroke: new Stroke({
      color: "#ceb881",
      width: 0.8,
    }),
    text: helpers.createTextStyle(feature, "label", 18000),
  });
}
