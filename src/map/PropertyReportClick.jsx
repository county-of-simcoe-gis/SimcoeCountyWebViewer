import React, { Component } from "react";
import mainConfig from "../config.json";
import * as helpers from "../helpers/helpers";
import "./PropertyReportClick.css";
import InfoRow from "../helpers/InfoRow.jsx";
import { CopyToClipboard } from "react-copy-to-clipboard";
import GeoJSON from "ol/format/GeoJSON.js";
import { Vector as VectorLayer } from "ol/layer.js";
import { Vector as VectorSource } from "ol/source.js";
import ImageLayer from 'ol/layer/Image';
import { Stroke, Style } from "ol/style.js";
import PropertyReport from "./PropertyReport";
import copy from "copy-to-clipboard";

// https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Assessment%20Parcel&outputFormat=application/json&cql_filter=INTERSECTS(geom,%20POINT%20(-8874151.72%205583068.78))
const parcelURLTemplate = (mainURL, x, y) => `${mainURL}&cql_filter=INTERSECTS(geom,%20POINT%20(${x}%20${y}))`;

let parcelLayer = new VectorLayer({
  style: new Style({
    stroke: new Stroke({
      color: "#E78080",
      width: 3
    })
  }),
  source: new VectorSource()
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
    window.map.on("singleclick", async evt => {
      console.log("PROPERTY REPORT CLICK");
      // SCALE
      console.log("Map Scale: ",helpers.getMapScale());
      if (helpers.getMapScale() > 200000) return;

      //GLOBAL DISABLE
      let disable = window.disableParcelClick;
      console.log("disable: ",disable);
      if (disable) return;

      // DISABLE POPUPS
      disable = window.isDrawingOrEditing;
      console.log("isDrawingOrEditing: ",disable);
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
      console.log("disable (after feature pixel): ",disable);
      // IMAGE LAYERS
      // CHECK FOR ANY OTHER LAYERS THAT SHOULD DISABLE
      var viewResolution = window.map.getView().getResolution();
      console.log("viewResolution: ",viewResolution);
      const layers = window.map.getLayers().getArray();
      console.log("layers: ",layers);
      var urlList = [];
      for (let index = 0; index < layers.length; index++) {
        if (disable) break;
        const layer = layers[index];
        console.log(layer.get("disableParcelClick") ,layer.getVisible() , (layer instanceof ImageLayer));
        if ((layer.get("disableParcelClick") === null || layer.get("disableParcelClick")) && layer.getVisible() && (layer instanceof ImageLayer)) {
          //var url = layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", { INFO_FORMAT: "application/json" });
          var url = layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", { INFO_FORMAT: "text/html" });
          console.log("url: ",url);
          if (url) {
            urlList.push(url);
            //helpers.showURLWindow(url, false);

            // eslint-disable-next-line
            //await helpers.getJSONWait(url, result => {
             // const features = result.features;
             // if (features.length > 0) {
             //   disable = true;
             //   return;
             // }
           // });
          }
        }
      }
      if (urlList.length > 0){
        var builtUrl = [];
        //https://intra.dev.regionalgis.mto.gov.on.ca/geoserver/ows?
        //SERVICE=WMS&
        //REQUEST=GetFeatureInfo&
        //FORMAT=image/png&
        //TRANSPARENT=TRUE&
        //STYLES=&
        //VERSION=1.3.0&
        //LAYERS=Contracts:contracts_linear_capital,Contracts:contracts_point_capital&
        //WIDTH=1072&
        //HEIGHT=897&
        //CRS=EPSG:3857&
        //BBOX=-9556015.25264963,5768887.277878936,-9228253.275362952,6043143.335366016&
        //INFO_FORMAT=text/html&
        //QUERY_LAYERS=Contracts:contracts_linear_capital,Contracts:contracts_point_capital&
        //FEATURE_COUNT=25&I=538&J=403
        let layers = "";
        for (let index = 0; index < urlList.length; index++) {
          builtUrl.push(helpers.getJsonFromUrl(urlList[index]));
          layers += (index>0 ? "," : "") + builtUrl[index].LAYERS;
        }
        console.log("JSON URL: ", builtUrl);
        let outputUrl = "https://intra.dev.regionalgis.mto.gov.on.ca/geoserver/ows?" 
                        + "SERVICE=WMS&"
                        + "REQUEST=GetFeatureInfo&"
                        + "FORMAT=image/png&"
                        + "TRANSPARENT=TRUE&"
                        + "STYLES=&"
                        + "VERSION=1.3.0&"
                        + "LAYERS=" +layers+"&"
                        + "WIDTH=" + builtUrl[0].WIDTH+ "&"
                        + "HEIGHT=" + builtUrl[0].HEIGHT+ "&"
                        + "CRS=" + builtUrl[0].CRS+ "&"
                        + "BBOX=" + builtUrl[0].BBOX+ "&"
                        + "INFO_FORMAT=text/html&"
                        + "QUERY_LAYERS=" +layers+"&"
                        + "FEATURE_COUNT=25&"
                        + "I=" + builtUrl[0].I + "&"
                        + "J=" + builtUrl[0].J ;
        console.log(outputUrl);
        helpers.showURLWindow(outputUrl, false);
        return;
      }else{return;}

      
     

      //if (disable) return;
      //const parcelURL = parcelURLTemplate(mainConfig.parcelLayer.url, evt.coordinate[0], evt.coordinate[1]);
      //this.showPropertyWindow(parcelURL, evt);

      //helpers.addAppStat("Property click", "Click");
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

  //copy(result.id);
  // BUILDS POPUP CONTENT
  getPopupContent = propInfo => {
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
          }}
        ></img>
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
        <span className="sc-fakeLink" onClick={() => helpers.showURLWindow(mainConfig.tosUrl, false, "full")}>
          [Terms]
        </span>
      </InfoRow>
    );

    rows.push(<InfoRow key={helpers.getUID()} label={"Pointer Coordinates"} value={"Lat: " + Math.round(coords[1] * 10000) / 10000 + "  Long: " + Math.round(coords[0] * 10000) / 10000} />);

    rows.push(
      <button key={helpers.getUID()} id={helpers.getUID()} className="sc-button sc-property-report-click-more-info" onClick={this.onMoreInfoClick}>
        More Information
      </button>
    );
    rows.push(
      <button key={helpers.getUID()} id={helpers.getUID()} className="sc-button sc-property-report-click-close" onClick={this.onCloseClick}>
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
      feature.setProperties({ arn: arn });
      this.setState({ shareURL: this.getShareURL(arn), feature: feature });

      // GET CENTER COORDS
      var latLongCoords = null;
      var pointerPoint = null;
      if (clickEvt === null) {
        console.log("in");
        helpers.getGeometryCenter(feature.getGeometry(), center => {
          pointerPoint = center.flatCoordinates;
          latLongCoords = helpers.toLatLongFromWebMercator(pointerPoint);
          console.log(latLongCoords);
          window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize());

          // GET FULL INFO
          if (feature !== undefined) {
            const infoURL = "${mainConfig.propertyReportUrl}?arn=" + arn;
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
      } else {
        latLongCoords = helpers.toLatLongFromWebMercator(clickEvt.coordinate);
        pointerPoint = clickEvt.coordinate;

        // GET FULL INFO
        if (feature !== undefined) {
          const infoURL = "${mainConfig.propertyReportUrl}?arn=" + arn;
          helpers.getJSON(infoURL, result => {
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
