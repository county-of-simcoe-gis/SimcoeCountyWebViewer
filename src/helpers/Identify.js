import { LayerHelpers, OL_LAYER_TYPES, OL_DATA_TYPES } from "./OLHelpers";
import * as helpers from "./helpers";
import { get } from "./api";

import { GeoJSON, EsriJSON } from "ol/format.js";
import Feature from "ol/Feature";

export class Identify {
  static QueryLayers(geometry, layerFilter = undefined, callback = undefined) {
    let layers = window.map.getLayers().getArray();
    layers = layers.filter((item) => item.get("queryable") === true);
    if (layerFilter) layers = layers.filter((item) => item.get("displayName") === layerFilter);
    else layers = layers.filter((item) => item.getVisible());

    let layerList = [];
    let allPromises = [];

    layers.forEach((layer) => {
      const name = layer.get("name");
      let displayName = "";
      let type = layer.get("tocDisplayName");
      let wfsUrl = layer.get("wfsUrl");
      let attachmentUrl = layer.get("attachmentUrl");
      const secured = layer.get("secured");
      const minScale = layer.get("minScale");
      const hasAttachments = layer.get("hasAttachments");
      if (LayerHelpers.getLayerType(layer) !== OL_LAYER_TYPES.Vector) {
        const params = {};
        params["headers"] = {};
        if (secured) {
          params["useBearerToken"] = true;
          params["mode"] = "cors";
        }
        const isArcGISLayer = LayerHelpers.getLayerSourceType(layer.getSource()) === OL_DATA_TYPES.ImageArcGISRest;
        if (isArcGISLayer) {
          wfsUrl = this.ComposeWFSQuery(wfsUrl, geometry, "arcgis");
        } else {
          wfsUrl = this.ComposeWFSQuery(wfsUrl, geometry, "geoserver");
        }
        if (wfsUrl.length > 8000) {
          helpers.showMessage("Geometry too complex", "The geometry you are trying to use is too complex to identify.", helpers.messageColors.red);
        } else {
          const promise = new Promise((resolve, reject) => {
            get(wfsUrl, params, (result) => {
              const featureList = isArcGISLayer ? LayerHelpers.parseESRIIdentify(result) : new GeoJSON().readFeatures(result);
              if (featureList.length > 0) {
                if (displayName === "" || displayName === undefined) displayName = this.FindDisplayNameFromFeature(featureList[0]);
                let features = [];
                featureList.forEach((feature) => {
                  const keys = feature.getKeys();
                  const objectId = feature.get(keys.filter((item) => item.indexOf("OBJECTID") !== -1)[0]);
                  if (hasAttachments) feature.values_["attachmentUrl"] = attachmentUrl.replace("#OBJECTID#", objectId);
                  features.push(feature);
                });
                if (features.length > 0)
                  layerList.push({
                    name: name,
                    features: features,
                    displayName: displayName,
                    type: type,
                    minScale: minScale,
                  });
              }
              resolve();
            });
          });
          allPromises.push(promise);
        }
      } else {
        let featureList = [];
        let pixel = window.map.getPixelFromCoordinate(geometry.flatCoordinates);
        window.map.forEachFeatureAtPixel(pixel, (feature, layer) => {
          if (layer.get("name") !== undefined && layer.get("name") === name) featureList.push(feature);
        });

        if (featureList.length > 0) {
          if (displayName === "" || displayName === undefined) displayName = this.FindDisplayNameFromFeature(featureList[0]);
          let features = [];
          featureList.forEach((feature) => {
            features.push(feature);
          });
          if (features.length > 0)
            layerList.push({
              name: name,
              features: features,
              displayName: displayName,
              type: type,
              minScale: minScale,
            });
        }
      }
    });

    if (allPromises.length > 0)
      Promise.all(allPromises).then(() => {
        if (callback) callback(layerList);
        else return layerList;
      });
    else {
      if (callback) callback(layerList);
      else return layerList;
    }
  }
  static ComposeWFSQuery(wfsUrl, geometry, type) {
    switch (type) {
      case "arcgis":
        var esri = new EsriJSON();
        const esriFeature = esri.writeGeometry(geometry);
        const arcgisResolution = `${window.map.getSize()[0]},${window.map.getSize()[1]},96`;
        const extent = window.map.getView().calculateExtent();
        wfsUrl = wfsUrl
          .replace("#GEOMETRY#", encodeURIComponent(esriFeature))
          .replace("#GEOMETRYTYPE#", geometry.getType() !== "Point" ? "esriGeometryPolygon" : "esriGeometryPoint")
          .replace("#TOLERANCE#", 3)
          .replace("#EXTENT#", extent.join(","))
          .replace("#RESOLUTION#", arcgisResolution);
        break;
      case "geoserver":
        const targetFeature = new Feature(geometry);
        const wktString = helpers.getWKTStringFromFeature(targetFeature);
        if (geometry.getType() === "MultiPolygon") {
          let intersectQuery = [];
          geometry.getPolygons().forEach((poly) => {
            const tmpFeature = new Feature(poly);
            const tmpWKTString = helpers.getWKTStringFromFeature(tmpFeature);
            intersectQuery.push("INTERSECTS(geom," + tmpWKTString + ")");
          });
          wfsUrl += intersectQuery.join(" OR ");
        } else {
          wfsUrl += "INTERSECTS(geom," + wktString + ")";
        }
        break;
      default:
        break;
    }
    return wfsUrl;
  }

  static FindDisplayNameFromFeature(feature) {
    // LOOK FOR EXISTING FIELDS
    const nameFields = ["name", "display_name", "Name", "Display Name"];
    let displayName = "";
    const displayFieldName = feature.get("displayFieldName");
    if (displayFieldName !== undefined && displayFieldName !== null) nameFields.push(displayFieldName);
    nameFields.forEach((fieldName) => {
      if (fieldName.substring(0, 1) !== "_") {
        const name = feature.get(fieldName);
        if (name !== undefined) {
          displayName = fieldName;
          return displayName;
        }
      }
    });

    // FIND FIRST STRING FIELD
    if (displayName === "") {
      for (const [fieldName, value] of Object.entries(feature.values_)) {
        if (fieldName.substring(0, 1) !== "_") {
          if (typeof value === "string" || value instanceof String) {
            displayName = fieldName;
            return displayName;
          }
        }
      }
    }

    //console.log(displayName);
    // STILL NOTHING, SO TAKE FIRST FIELD
    if (displayName === "") displayName = Object.keys(feature.values_)[0];

    return displayName;
  }
}
