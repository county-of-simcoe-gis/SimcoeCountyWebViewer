import React, { Component } from "react";
import mainConfig from "../config.json";
import * as helpers from "../helpers/helpers";
import "./PropertyReportClick.css";
import InfoRow from "../helpers/InfoRow.jsx";
import * as turf from "@turf/turf";
import { CopyToClipboard } from "react-copy-to-clipboard";
import GeoJSON from "ol/format/GeoJSON.js";
import { Vector as VectorLayer } from "ol/layer.js";
import { Vector as VectorSource } from "ol/source.js";
import { Stroke, Style } from "ol/style.js";
import { transform } from "ol/proj.js";

// https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Assessment%20Parcel&outputFormat=application/json&cql_filter=INTERSECTS(shape,%20POINT%20(-8874151.72%205583068.78))
const parcelURLTemplate = (mainURL, x, y) => `${mainURL}&cql_filter=INTERSECTS(shape,%20POINT%20(${x}%20${y}))`;

let parcelLayer = new VectorLayer({
  style: new Style({
    stroke: new Stroke({
      color: "#E78080",
      width: 3
    })
  })
});
parcelLayer.setZIndex(500);

class PropertyReportClick extends Component {
  constructor(props) {
    super(props);
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    this.onMapLoad = this.onMapLoad.bind(this);

    this.state = {
      propInfo: null,
      feature: null
    };
  }

  onMapLoad() {
    window.map.addLayer(parcelLayer);

    // HANDLE URL PARAMETERS
    const urlARN = helpers.getURLParameter("ARN");
    if (urlARN !== null) {
      const parcelURLARNTemplate = (mainURL, arn) => `${mainURL}&cql_filter=arn='${arn}'`;
      const parcelARNURL = parcelURLARNTemplate(mainConfig.parcelLayer.url, urlARN);
      this.showPropertyWindow(parcelARNURL);
    }

    // LISTEN FOR MAP CLICK
    window.map.on("singleclick", evt => {
      // SCALE
      if (helpers.getMapScale() > 20000) return;

      //GLOBAL DISABLE
      let disable = window.disableParcelClick;
      if (disable) return;

      // CHECK FOR ANY OTHER LAYERS THAT SHOULD DISABLE
      window.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        if (layer === null) return;

        if (layer.get("disableParcelClick") !== undefined && layer.get("disableParcelClick") === true) {
          console.log("OTHER FEATURE, DISABLED");
          disable = true;
          return;
        }
      });

      if (disable) return;

      const parcelURL = parcelURLTemplate(mainConfig.parcelLayer.url, evt.coordinate[0], evt.coordinate[1]);
      this.showPropertyWindow(parcelURL, evt);

      helpers.addAppStat("Property click", "Click");
    });

    // LISTEN FOR CALLS
    window.emitter.addListener("showPropertyReport", coords => this.onPropertyEmitter(coords));
  }

  onPropertyEmitter = coords => {
    const parcelURL = parcelURLTemplate(mainConfig.parcelLayer.url, coords[0], coords[1]);
    this.showPropertyWindow(parcelURL);
  };

  addToMyMaps = value => {
    // ADD MYMAPS
    window.emitter.emit("addMyMapsFeature", this.state.feature, this.state.feature.get("arn"));
  };

  getShareURL = arn => {
    //GET URL
    var url = window.location.href;

    //ADD LOCATIONID
    if (url.indexOf("?") > 0) url = url + "&ARN=" + arn;
    else url = url + "?ARN=" + arn;

    return url;
  };

  onShareClick = evt => {
    helpers.showMessage("Share", "Link has been copied to your clipboard.", "green", 2000);
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
  };

  // BUILDS POPUP CONTENT
  getPopupContent = propInfo => {
    const arn = propInfo.ARN;
    const address = propInfo.Address;
    const assessedValue = propInfo.AssessedValue;
    const garbageDay = propInfo.WasteCollection.GarbageDay;
    const coords = propInfo.pointCoordinates;

    let rows = [];
    rows.push(<InfoRow key={helpers.getUID()} label={"Address"} value={address} />);
    rows.push(<InfoRow key={helpers.getUID()} label={"Roll Number"} value={arn} />);

    rows.push(
      <InfoRow key={helpers.getUID()} label={"Assessed Value"}>
        <img src={"data:image/png;base64," + assessedValue} alt="assessment" />
        <div style={{ fontSize: "9px", color: "#555", paddingBottom: "4px !important" }}>(may not reflect current market value)</div>
      </InfoRow>
    );

    rows.push(<InfoRow key={helpers.getUID()} label={"Waste Collection Day"} value={garbageDay} />);

    rows.push(
      <InfoRow className="sc-no-select" key={helpers.getUID()} label={"Tools"}>
        <span className="sc-fakeLink" onClick={this.addToMyMaps} onMouseUp={helpers.convertMouseUpToClick}>
          [Add to My Maps]&nbsp;
        </span>
        <CopyToClipboard key={helpers.getUID()} text={this.state.shareURL}>
          <span className="sc-fakeLink" onClick={this.onShareClick} onMouseUp={helpers.convertMouseUpToClick}>
            [Share]
          </span>
        </CopyToClipboard>
        &nbsp;
        <span className="sc-fakeLink" onClick={() => helpers.showURLWindow("https://maps.simcoe.ca/terms.html", false, "full")} onMouseUp={helpers.convertMouseUpToClick}>
          [Terms]
        </span>
      </InfoRow>
    );

    rows.push(<InfoRow key={helpers.getUID()} label={"Pointer Coordinates"} value={"Lat: " + Math.round(coords[1] * 10000) / 10000 + "  Long: " + Math.round(coords[0] * 10000) / 10000} />);

    rows.push(
      <button key={helpers.getUID()} id={helpers.getUID()} className="sc-button sc-property-report-click-more-info" onClick={this.onMoreInfoClick} onMouseUp={helpers.convertMouseUpToClick}>
        More Information
      </button>
    );
    rows.push(
      <button key={helpers.getUID()} id={helpers.getUID()} className="sc-button sc-property-report-click-close" onClick={this.onCloseClick} onMouseUp={helpers.convertMouseUpToClick}>
        Close
      </button>
    );
    return rows;
  };

  showPropertyWindow = (wmsURL, clickEvt = null) => {
    helpers.getJSON(wmsURL, result => {
      if (result.features.length === 0) return;

      const geoJSON = new GeoJSON().readFeatures(result);
      var vectorSource = new VectorSource({ features: geoJSON });
      parcelLayer.setSource(vectorSource);

      const feature = geoJSON[0];
      const arn = result.features[0].properties.arn;
      console.log(feature);
      this.setState({ shareURL: this.getShareURL(arn), feature: feature });

      // GET CENTER COORDS
      var latLongCoords = null;
      var pointerPoint = null;
      if (clickEvt === null) {
        const center = turf.centroid(result);
        pointerPoint = center.geometry.coordinates;
        latLongCoords = transform(center.geometry.coordinates, "EPSG:3857", "EPSG:4326");
        window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize());
      } else {
        latLongCoords = transform(clickEvt.coordinate, "EPSG:3857", "EPSG:4326");
        pointerPoint = clickEvt.coordinate;
      }

      // GET FULL INFO
      if (feature !== undefined) {
        const infoURL = "https://maps.simcoe.ca/giswebapi/api/propertyreport?arn=" + arn;
        helpers.getJSON(infoURL, result => {
          result.pointCoordinates = latLongCoords;
          result.shareURL = this.getShareURL(arn);
          this.setState({ propInfo: result });
          window.popup.show(pointerPoint, this.getPopupContent(result), "Property Information", () => {
            parcelLayer.getSource().clear();
          });
        });
      }
    });
  };

  render() {
    return null;
  }
}

export default PropertyReportClick;

class PropertyReport extends React.Component {
  render() {
    const info = this.props.propInfo;
    console.log(info);
    return (
      <div className="sc-property-report-container">
        <div className="sc-property-report-html-title">
          <div className="sc-property-report-html-title-address">{info.Address}</div>
          <div className="sc-property-report-html-title-button-container">
            <button className="sc-button sc-button-orange" style={{ width: "45%" }} onClick={this.props.onZoomClick}>
              Zoom
            </button>
            <a rel="noopener noreferrer" href={info.ReportURL} target="_blank" style={{ paddingLeft: "10px" }}>
              <button className="sc-button sc-button-blue" style={{ width: "45%" }}>
                Download
              </button>
            </a>
          </div>
        </div>
        <div className="sc-property-report-info-container">
          {/* GENERAL INFO */}
          <div className="sc-property-report-html-heading icon general">General Information</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Roll Number: </div>
                <div className="sc-property-report-html-value">{info.ARN}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Property Type: </div>
                <div className="sc-property-report-html-value">{info.PropertyType}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Address: </div>
                <div className="sc-property-report-html-value">{info.Address}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Assessed Value: </div>
                <div className="sc-property-report-html-value">
                  <img src={"data:image/png;base64," + info.AssessedValue} alt="assessed" />
                </div>
                <div className="sc-property-report-html-market">(may not reflect current market value)</div>
              </div>
            </div>
          </div>

          {/* EMERGENCY  */}
          <div className="sc-property-report-html-heading icon general">Emergency Service</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Police Station: </div>
                <div className="sc-property-report-html-value">{info.EmergencyService.PoliceStation}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Closest Firehall: </div>
                <div className="sc-property-report-html-value">{info.EmergencyService.FireStation}</div>
              </div>
            </div>
          </div>

          {/* WASTE COLLECTION */}
          <div className="sc-property-report-html-heading icon general">WASTE COLLECTION</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Garbage/Recycling Collection Day: </div>
                <div className="sc-property-report-html-value">{info.WasteCollection.GarbageDay}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Bag Tag Locations: </div>
                <div className="sc-property-report-html-value">{info.WasteCollection.BagTagleLocation1}</div>
                <div className="sc-property-report-html-value">{info.WasteCollection.BagTagleLocation2}</div>
                <div className="sc-property-report-html-value">{info.WasteCollection.BagTagleLocation3}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Waste Management Facility: </div>
                <div className="sc-property-report-html-value">General Waste</div>
                <div className="sc-property-report-html-value sub">{info.WasteCollection.LandfillLocation_General}</div>
                <div className="sc-property-report-html-value">Hazardous Waste</div>
                <div className="sc-property-report-html-value sub">{info.WasteCollection.LandfillLocation_Hazardous}</div>
              </div>
            </div>
          </div>

          {/* SCHOOLS */}
          <div className="sc-property-report-html-heading icon general">SCHOOLS</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Catholic Elementary: </div>
                <div className="sc-property-report-html-value">{info.Schools.CatholicElementry}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Catholic Secondary: </div>
                <div className="sc-property-report-html-value">{info.Schools.CatholicSecondary}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Catholic School Board Website: </div>
                <div className="sc-property-report-html-value">
                  <a rel="noopener noreferrer" href={info.Schools.CatholicBoardWebsiteURL} target="_blank">
                    {info.Schools.CatholicBoardWebsiteURL}
                  </a>
                </div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Public Elementary: </div>
                <div className="sc-property-report-html-value">{info.Schools.PublicElementry}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Public Secondary: </div>
                <div className="sc-property-report-html-value">{info.Schools.PublicSecondary}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Public School Board Website: </div>
                <div className="sc-property-report-html-value">
                  <a rel="noopener noreferrer" href={info.Schools.PublicBoardWebsiteURL} target="_blank">
                    {info.Schools.PublicBoardWebsiteURL}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* OTHER */}
          <div className="sc-property-report-html-heading icon general">OTHER</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Library: </div>
                <div className="sc-property-report-html-value">{info.Other.Library}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Closest Fire Hydrant: </div>
                <div className="sc-property-report-html-value">{info.Other.ClosestFireHydrant}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Municipal Admin Centre: </div>
                <div className="sc-property-report-html-value">{info.Other.MunicipalAdminCentre}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Closest Hospital: </div>
                <div className="sc-property-report-html-value">{info.Other.ClosestHospital}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
