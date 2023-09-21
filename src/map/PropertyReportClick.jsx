import React, { Component } from "react";
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
import { LayerHelpers } from "../helpers/OLHelpers";

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
    //wait for toc and map to load
    helpers.waitForLoad(["map", "toc"], Date.now(), 30, () => this.onMapLoad());

    helpers.waitForLoad(["settings"], Date.now(), 30, () => {
      this.parcelLayer = window.config.parcelLayer;
      this.termsUrl = window.config.termsUrl;
      this.propertyReportUrl = window.config.propertyReportUrl;
    });
    // LISTEN FOR CALLS
    window.emitter.addListener("showPropertyReport", (coords) => {
      helpers.waitForLoad(["map", "toc"], Date.now(), 30, () => {
        this.onPropertyEmitter(coords);
      });
    });
    this.state = {
      propInfo: null,
      feature: null,
    };
  }

  onMapLoad() {
    window.map.addLayer(parcelLayer);

    // HANDLE URL PARAMETERS
    const urlARN = helpers.getURLParameter("ARN");
    if (urlARN !== null) {
      const parcelURLARNTemplate = (mainURL, arn) => `${mainURL}&cql_filter=arn='${arn}'`;
      const parcelARNURL = parcelURLARNTemplate(this.parcelLayer.url, urlARN);
      this.showPropertyWindow(parcelARNURL);
    }

    // LISTEN FOR MAP CLICK
    window.map.on("singleclick", async (evt) => {
      // SCALE
      if (helpers.getMapScale() > 20000) return;

      // DISABLE POPUPS
      let disable = window.disableParcelClick || window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring;
      if (disable) return;

      // VECTOR LAYERS
      // CHECK FOR ANY OTHER LAYERS THAT SHOULD DISABLE
      window.map.forEachFeatureAtPixel(
        evt.pixel,
        function (feature, layer) {
          if (!layer) return;
          if (layer.get("disableParcelClick") !== undefined && layer.get("disableParcelClick") === true) {
            disable = true;
            return;
          }
        },
        {
          layerFilter: function (layer) {
            return layer.get("disableParcelClick") !== true && layer.getVisible() && layer instanceof VectorLayer;
          },
        }
      );

      // IMAGE LAYERS
      // CHECK FOR ANY OTHER LAYERS THAT SHOULD DISABLE
      const layers = window.map.getLayers().getArray();
      for (let index = 0; index < layers.length; index++) {
        if (disable) break;
        const layer = layers[index];
        if (layer.get("disableParcelClick") && layer.getVisible() && layer instanceof ImageLayer) {
          await LayerHelpers.identifyFeaturesWait(layer, evt.coordinate, (feature) => {
            if (feature !== undefined) {
              disable = true;
              return;
            }
          });
        }
      }

      if (disable) return;
      const parcelURL = parcelURLTemplate(this.parcelLayer.url, evt.coordinate[0], evt.coordinate[1]);
      this.showPropertyWindow(parcelURL, evt);

      helpers.addAppStat("Property Click", "Click");
    });
  }

  onPropertyEmitter = (coords) => {
    const parcelURL = parcelURLTemplate(this.parcelLayer.url, coords[0], coords[1]);
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
    const garbageDay = propInfo.WasteCollection && propInfo.WasteCollection.GarbageDay ? propInfo.WasteCollection.GarbageDay : undefined;
    const broadbandSpeeds = propInfo.Other && propInfo.Other.BroadbandSpeed ? propInfo.Other.BroadbandSpeed : undefined;
    const coords = propInfo.pointCoordinates;
    const hasZoning = propInfo.HasZoning;
    let rows = [];
    if (address) rows.push(<InfoRow key={helpers.getUID()} label={"Address"} value={address} />);
    if (arn)
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
    if (hasZoning !== undefined)
      rows.push(
        <InfoRow key={helpers.getUID()} label={"Has Zoning"} value={hasZoning ? "Yes" : "No"}>
          {hasZoning ? (
            <img
              src={images["information.png"]}
              alt="View Zoning"
              title="View Zoning"
              style={{ marginBottom: "-3px", marginLeft: "5px", cursor: "pointer" }}
              onClick={() => {
                window.emitter.emit("activateTab", "themes");
                window.emitter.emit("activateSidebarItem", "Zoning", "themes");
                window.emitter.emit("searchItem", "All", arn, true);
                helpers.addAppStat("View Zoning Click", "click");
              }}
            />
          ) : (
            ""
          )}
        </InfoRow>
      );

    if (assessedValue && arn.substring(0, 4) !== "4342")
      rows.push(
        <InfoRow key={helpers.getUID()} label={"Assessed Value"}>
          <img src={assessedValue} alt="assessment" />
          <div
            style={{
              fontSize: "9px",
              color: "#555",
              paddingBottom: "4px !important",
            }}
          >
            (may not reflect current market value)
          </div>
        </InfoRow>
      );

    if (garbageDay) rows.push(<InfoRow key={helpers.getUID()} label={"Waste Collection Day"} value={garbageDay} />);
    if (broadbandSpeeds) rows.push(<InfoRow key={helpers.getUID()} label={"Potential Broadband Coverage"} value={broadbandSpeeds} />);

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
            helpers.showURLWindow(this.termsUrl, false, "full", false, true, true);
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
        helpers.getGeometryCenter(feature.getGeometry(), (center) => {
          pointerPoint = center.flatCoordinates;
          latLongCoords = helpers.toLatLongFromWebMercator(pointerPoint);
          console.log(latLongCoords);
          window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize());

          // GET FULL INFO
          if (feature !== undefined) {
            const infoURL = this.propertyReportUrl + arn;
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
          const infoURL = this.propertyReportUrl + arn;
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
