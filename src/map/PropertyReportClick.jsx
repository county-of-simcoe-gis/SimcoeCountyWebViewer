import React, { Component } from "react";
import mainConfig from "../config.json";
import * as helpers from "../helpers/helpers";
import "./PropertyReportClick.css";
import InfoRow from "../helpers/InfoRow.jsx";
import { CopyToClipboard } from "react-copy-to-clipboard";
import GeoJSON from "ol/format/GeoJSON.js";
import { Vector as VectorLayer } from "ol/layer.js";
import { Vector as VectorSource } from "ol/source.js";
import { Stroke, Style } from "ol/style.js";
import PropertyReport from "./PropertyReport";
import copy from "copy-to-clipboard";
import { Image as ImageLayer } from "ol/layer.js";

// https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Assessment%20Parcel&outputFormat=application/json&cql_filter=INTERSECTS(geom,%20POINT%20(-8874151.72%205583068.78))
const parcelURLTemplate = (mainURL, x, y) => `${mainURL}&cql_filter=INTERSECTS(geom,%20POINT%20(${x}%20${y}))`;

let parcelLayer = new VectorLayer({
  style: new Style({
    stroke: new Stroke({
      color: "#E78080",
      width: 3,
    }),
  }),
  source: new VectorSource(),
});
parcelLayer.setZIndex(500);

class PropertyReportClick extends Component {
  constructor(props) {
    super(props);
    // LISTEN FOR MAP TO MOUNT
    //window.emitter.addListener("mapParametersComplete", () => this.onMapLoad());
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded",() => this.onMapLoad());
    window.emitter.addListener("tocLoaded", () => this.setState({ tocLoaded: true }));

    this.onMapLoad = this.onMapLoad.bind(this);

    this.state = {
      propInfo: null,
      feature: null,
      tocLoaded:false
    };
  }

  onMapLoad() {
    //wait for toc to finish loading
    if (!this.state.tocLoaded){
      setTimeout(() => {
        this.onMapLoad();
      }, 100);
      return;
    }


    window.map.addLayer(parcelLayer);

    // HANDLE URL PARAMETERS
    const urlARN = helpers.getURLParameter("ARN");
    if (urlARN !== null) {
      const parcelURLARNTemplate = (mainURL, arn) => `${mainURL}&cql_filter=arn='${arn}'`;
      const parcelARNURL = parcelURLARNTemplate(mainConfig.parcelLayer.url, urlARN);
      this.showPropertyWindow(parcelARNURL);
    }

    // LISTEN FOR MAP CLICK
    window.map.on("singleclick", async (evt) => {
      // SCALE
      if (helpers.getMapScale() > 20000) return;

      // DISABLE POPUPS
      let disable = window.disableParcelClick || window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring ;
      if (disable) return;

      // VECTOR LAYERS
      // CHECK FOR ANY OTHER LAYERS THAT SHOULD DISABLE
      window.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        if (layer === null) return;
        if (layer.get("disableParcelClick") !== undefined && layer.get("disableParcelClick") === true) {
          disable = true;
          return;
        }
      });

      // IMAGE LAYERS
      // CHECK FOR ANY OTHER LAYERS THAT SHOULD DISABLE
      var viewResolution = window.map.getView().getResolution();
      const layers = window.map.getLayers().getArray();
      for (let index = 0; index < layers.length; index++) {
        if (disable) break;
        const layer = layers[index];
        if (layer.get("disableParcelClick") && layer.getVisible() && layer instanceof ImageLayer) {
          var url = layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", { INFO_FORMAT: "application/json" });
          if (url) {
            // eslint-disable-next-line
            await helpers.getJSONWait(url, (result) => {
              const features = result.features;
              if (features.length > 0) {
                disable = true;
                return;
              }
            });
          }
        }
      }

      if (disable) return;
      const parcelURL = parcelURLTemplate(mainConfig.parcelLayer.url, evt.coordinate[0], evt.coordinate[1]);
      this.showPropertyWindow(parcelURL, evt);

      helpers.addAppStat("Property Click", "Click");
    });

    // LISTEN FOR CALLS
    window.emitter.addListener("showPropertyReport", (coords) => this.onPropertyEmitter(coords));
  }

  onPropertyEmitter = (coords) => {
    const parcelURL = parcelURLTemplate(mainConfig.parcelLayer.url, coords[0], coords[1]);
    this.showPropertyWindow(parcelURL);
  };

  addToMyMaps = (value) => {
    // ADD MYMAPS
    window.emitter.emit("addMyMapsFeature", this.state.feature, this.state.feature.get("arn"));
  };

  getShareURL = (arn) => {
    //GET URL
    var url = window.location.href;

    //ADD LOCATIONID
    if (url.indexOf("?") > 0) {
      let newUrl = helpers.removeURLParameter(url, "ARN");
      if (newUrl.indexOf("?") > 0) {
        url = newUrl + "&ARN=" + arn;
      } else {
        url = newUrl + "?ARN=" + arn;
      }
    } else {
      url = url + "?ARN=" + arn;
    }

    return url;
  };

  onShareClick = (evt) => {
    helpers.showMessage("Share", "Link has been copied to your clipboard.", helpers.messageColors.green, 2000);
    helpers.addAppStat("Property Click Share", "click");
  };

  onCloseClick = () => {
    parcelLayer.getSource().clear();
    window.popup.hide();
  };

  onZoomClick = () => {
    window.map.getView().fit(this.state.feature.getGeometry().getExtent(), window.map.getSize());
  };

  onMoreInfoClick = () => {
    window.emitter.emit("loadReport", <PropertyReport propInfo={this.state.propInfo} onZoomClick={this.onZoomClick} />);
    helpers.addAppStat("Property Click More Info", "click");
  };

  //copy(result.id);
  // BUILDS POPUP CONTENT
  getPopupContent = (propInfo) => {
    const arn = propInfo.ARN;
    const address = propInfo.Address;
    const assessedValue = propInfo.AssessedValue;
    const garbageDay = propInfo.WasteCollection.GarbageDay;
    const coords = propInfo.pointCoordinates;

    let rows = [];
    rows.push(<InfoRow key={helpers.getUID()} label={"Address"} value={address} />);
    rows.push(
      <InfoRow key={helpers.getUID()} label={"Roll Number"} value={arn}>
        <img
          src={images["copy16.png"]}
          alt="copy"
          title="Copy to Clipboard"
          style={{ marginBottom: "-3px", marginLeft: "5px", cursor: "pointer" }}
          onClick={() => {
            copy(arn);
            helpers.showMessage("Copy", "Roll Number copied to clipboard.");
            helpers.addAppStat("Copy ARN", "click");
          }}
        />
      </InfoRow>
    );

    rows.push(
      <InfoRow key={helpers.getUID()} label={"Assessed Value"}>
        <img src={"data:image/png;base64," + assessedValue} alt="assessment" />
        <div style={{ fontSize: "9px", color: "#555", paddingBottom: "4px !important" }}>(may not reflect current market value)</div>
      </InfoRow>
    );

    rows.push(<InfoRow key={helpers.getUID()} label={"Waste Collection Day"} value={garbageDay} />);

    rows.push(
      <InfoRow className="sc-no-select" key={helpers.getUID()} label={"Tools"}>
        <span className="sc-fakeLink" onClick={this.addToMyMaps}>
          [Add to My Maps]&nbsp;
        </span>
        <CopyToClipboard key={helpers.getUID()} text={this.state.shareURL}>
          <span className="sc-fakeLink" onClick={this.onShareClick}>
            [Share]
          </span>
        </CopyToClipboard>
        &nbsp;
        <span
          className="sc-fakeLink"
          onClick={() => {
            helpers.showURLWindow(mainConfig.termsUrl, true, "full", true, true, true);
            helpers.addAppStat("Property Click Terms", "click");
          }}
        >
          [Terms]
        </span>
      </InfoRow>
    );

    rows.push(<InfoRow key={helpers.getUID()} label={"Pointer Coordinates"} value={"Lat: " + Math.round(coords[1] * 10000) / 10000 + "  Long: " + Math.round(coords[0] * 10000) / 10000} />);

    const PropertyReportContent = (props) => {
      return (
        <div>
          <div className="sc-property-report-top-container">{rows}</div>

          <button key={helpers.getUID()} id={helpers.getUID()} className="sc-button sc-property-report-click-more-info" onClick={this.onMoreInfoClick}>
            More Information
          </button>

          <button key={helpers.getUID()} id={helpers.getUID()} className="sc-button sc-property-report-click-close" onClick={this.onCloseClick}>
            Close
          </button>
        </div>
      );
    };

    return <PropertyReportContent />;
  };

  showPropertyWindow = (wmsURL, clickEvt = null) => {
    helpers.getJSON(wmsURL, (result) => {
      if (result.features.length === 0) return;

      const geoJSON = new GeoJSON().readFeatures(result);
      var vectorSource = new VectorSource({ features: geoJSON });
      parcelLayer.setSource(vectorSource);

      const feature = geoJSON[0];
      const arn = result.features[0].properties.arn;
      feature.setProperties({ arn: arn });
      this.setState({ shareURL: this.getShareURL(arn), feature: feature });

      // GET CENTER COORDS
      var latLongCoords = null;
      var pointerPoint = null;
      if (clickEvt === null) {
        console.log("in");
        helpers.getGeometryCenter(feature.getGeometry(), (center) => {
          pointerPoint = center.flatCoordinates;
          latLongCoords = helpers.toLatLongFromWebMercator(pointerPoint);
          console.log(latLongCoords);
          window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize());

          // GET FULL INFO
          if (feature !== undefined) {
            const infoURL = mainConfig.propertyReportUrl + "?arn=" + arn;
            helpers.getJSON(infoURL, (result) => {
              result.pointCoordinates = latLongCoords;
              result.shareURL = this.getShareURL(arn);
              this.setState({ propInfo: result });
              window.popup.show(pointerPoint, this.getPopupContent(result), "Property Information", () => {
                parcelLayer.getSource().clear();
              });
            });
          }
        });
      } else {
        latLongCoords = helpers.toLatLongFromWebMercator(clickEvt.coordinate);
        pointerPoint = clickEvt.coordinate;

        // GET FULL INFO
        if (feature !== undefined) {
          const infoURL = mainConfig.propertyReportUrl + "?arn=" + arn;
          helpers.getJSON(infoURL, (result) => {
            result.pointCoordinates = latLongCoords;
            result.shareURL = this.getShareURL(arn);
            this.setState({ propInfo: result });
            window.popup.show(pointerPoint, this.getPopupContent(result), "Property Information", () => {
              parcelLayer.getSource().clear();
            });
          });
        }
      }
    });
  };

  render() {
    return null;
  }
}

export default PropertyReportClick;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
