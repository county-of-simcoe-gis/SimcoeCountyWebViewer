import React, { Component } from "react";
import "./App.css";
import * as layerInfoHelpers from "./helpers";
import * as helpers from "../helpers/helpers";
import { get } from "../helpers/api";
import mainConfig from "./config.json";
import ReactGA from "react-ga4";

const enableAnalytics = helpers.getURLParameter("ANALYTICS") !== "off";
if (mainConfig.googleAnalyticsID !== undefined && mainConfig.googleAnalyticsID !== "" && enableAnalytics) {
  ReactGA.initialize(mainConfig.googleAnalyticsID);
  ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
}

// THIS APP ACCEPTS A FULL URL TO GEOSERVER LAYER
// E.G.  https://opengis.simcoe.ca/geoserver/rest/workspaces/simcoe/datastores/paradise/featuretypes/Railway.json

const url = new URL(window.location.href);
const downloadTemplate = (serverUrl, workspace, layerName) => `${serverUrl}wfs?service=wfs&version=1.1.0&request=GetFeature&typeNames=${workspace}:${layerName}&outputFormat=SHAPE-ZIP`;
const serverUrl = (layerURL) => layerURL.split("rest/")[0];

class LayerInfoApp extends Component {
  constructor(props) {
    super(props);

    this.state = {
      layerInfo: undefined,
      termsAccepted: false,
      hideNewWindow: false,
      hideShare: false,
      hidePrint: false,
      layerURL: decodeURIComponent(url.searchParams.get("URL")),
      showDownload: url.searchParams.get("SHOW_DOWNLOAD"),
      requestHeader: undefined,
      params: {},
    };
  }
  componentDidMount() {
    if (this.props.layerURL !== undefined) {
      let layerURL = this.props.layerURL;
      let showDownload = this.state.showDownload;
      let params = {};
      if (this.props.showDownload !== undefined) showDownload = this.props.showDownload;
      if (this.props.params !== undefined) params = this.props.params;
      this.setState(
        {
          layerURL: layerURL,
          showDownload: showDownload,
          params: params,
          hideNewWindow: true,
          hideShare: true,
          requestHeader: this.props.requestHeader,
        },
        () => {
          this.getInfo();
        }
      );
    } else {
      this.getInfo();
    }
  }
  // GET LAYER INFO FROM URL
  async getInfo() {
    if (this.state.layerURL && this.state.layerURL != "null" && this.state.layerURL !== "")
      get(this.state.layerURL, { ...this.state.params, useBearerToken: this.props.secure || false }, (response) => {
        if (response.coverage !== undefined) {
          this.setState({ layerInfo: response.coverage });
        } else if (response.featureType === undefined) {
          response["featureType"] = this.parseArcGisFeature(response, (result) => {
            this.setState({ layerInfo: result });
          });
        } else {
          this.setState({ layerInfo: response.featureType });
        }
      });
  }

  parseFeatureCoverage = (featureInfo, callback) => {
    let featureType = {};
    featureType = featureInfo;
    featureType["attributes"] = {};

    callback(featureType);
  };
  parseArcGisFeature = (featureInfo, callback) => {
    try {
      let featureType = {};
      featureType["nativeCRS"] = {};
      featureType.nativeCRS["@class"] = "Projected";
      let spatialReference = featureInfo.sourceSpatialReference || featureInfo.extent.spatialReference;
      if (spatialReference.wkt === undefined) {
        featureType.nativeCRS["$"] = ` "EPSG:${spatialReference.latestWkid}`;
      } else {
        if (spatialReference.wkt.indexOf("GEOGCS") !== -1) featureType.nativeCRS["@class"] = "Geographic";
        featureType.nativeCRS["$"] = spatialReference.wkt;
      }

      featureType["title"] = featureInfo.name;
      featureType["name"] = featureInfo.name;
      featureType["nativeBoundingBox"] = {};
      featureType.nativeBoundingBox["minx"] = featureInfo.extent.xmin;
      featureType.nativeBoundingBox["maxx"] = featureInfo.extent.xmax;
      featureType.nativeBoundingBox["miny"] = featureInfo.extent.ymin;
      featureType.nativeBoundingBox["maxy"] = featureInfo.extent.ymax;
      let nativeBoundingBoxCrs = {};
      nativeBoundingBoxCrs["@class"] = "projected";
      nativeBoundingBoxCrs["$"] = `EPSG:${featureInfo.extent.spatialReference.latestWkid}`;
      featureType.nativeBoundingBox["crs"] = nativeBoundingBoxCrs;
      const descriptionObj = layerInfoHelpers.parseESRIDescription(featureInfo.description);
      featureType["abstract"] = descriptionObj.description;
      featureType["attributes"] = {};
      if (!featureInfo.fields) featureInfo.fields = [];
      featureType.attributes["attribute"] = featureInfo.fields.map((item) => {
        return {
          name: item.name,
          binding: item.type.replace("esriFieldType", ""),
        };
      });
      const epsgUrl = (wkt) => `https://epsg.io/${wkt}.wkt`;
      if (spatialReference.latestWkid === undefined) callback(featureType);
      else
        get(epsgUrl(spatialReference.latestWkid), { type: "text" }, (projection) => {
          if (projection !== "ERROR") featureType.nativeCRS["$"] = projection;
          callback(featureType);
        });
    } catch (e) {
      console.log(e, featureInfo);
    }
  };
  // CLEAN UP THE PROJECTION STRING
  getFormattedProjection = () => {
    let projClass = "";
    if (this.state.layerInfo.nativeCRS["@class"] === undefined) {
      if (this.state.layerInfo.nativeCRS.indexOf("GEOGCS") !== -1) projClass = "Geographic";
      else projClass = "Projected";
    } else {
      projClass = this.state.layerInfo.nativeCRS["@class"];
    }

    let proj = "Undefined";
    if (this.state.layerInfo.nativeCRS["$"] === undefined) {
      let projArray = this.state.layerInfo.nativeCRS.split('"');
      proj = helpers.toTitleCase(projClass) + " - " + projArray[1];
    } else {
      let projArray = this.state.layerInfo.nativeCRS["$"].split('"');
      proj = helpers.toTitleCase(projClass) + " - " + projArray[1];
    }

    //console.log(proj);
    return proj;
  };

  // FORMAT DATE FOR FOOTER
  formatDate() {
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    var date = new Date();
    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return monthNames[monthIndex] + " " + day + ", " + year;
  }

  onShareClick = () => {
    var mailToSubject = "Layer Metdata for " + this.state.layerInfo.title;
    var mailToBody = window.location.href;
    var mailTo = "mailto:?subject=" + mailToSubject + "&body=" + mailToBody;
    window.location.href = mailTo;
  };

  onTermsChange = (evt) => {
    this.setState({ termsAccepted: evt.target.checked });
  };

  onDownloadClick = (evt) => {
    const workspace = this.state.layerInfo.namespace.name;
    const layerName = this.state.layerInfo.name;
    if (this.state.layerURL.indexOf(mainConfig.geoserverURL) !== -1) {
      get(downloadTemplate(serverUrl(this.state.layerURL), workspace, layerName), { useBearerToken: true, type: "blob" }, (result) => {
        helpers.download(result, layerName, { isBlob: true });
      });
    } else {
      window.open(downloadTemplate(serverUrl(this.state.layerURL), workspace, layerName), "_blank");
    }
  };
  render() {
    if (this.state.layerInfo === undefined || this.state.layerInfo.nativeCRS === undefined)
      return <h3 className={this.state.layerURL == "null" ? "gli-main-error" : "gli-main-error hidden"}>Error: Layer Not Found or no URL Parameter provided.</h3>;

    const proj = this.getFormattedProjection();
    let fields = [];
    if (this.state.layerInfo.attributes) fields = this.state.layerInfo.attributes.attribute;
    if (!Array.isArray(fields)) fields = [fields];

    const crs = this.state.layerInfo.nativeCRS["$"];
    const boundingBox = this.state.layerInfo.nativeBoundingBox;

    //console.log(showDownload);
    return (
      <div className="sc-layerInfo-main-container">
        <h1 className={this.state.layerURL == "null" ? "sc-layerInfo-gli-main-error" : "sc-layerInfo-gli-main-error hidden"}>Error: Layer Not Found</h1>
        <div className="sc-layerInfo-header">
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td className="sc-layerInfo-title">{this.state.layerInfo.title}</td>
                <td style={{ width: "60px" }} className={this.state.hideShare ? "hidden" : ""}>
                  <img onClick={this.onShareClick} title="Share this page through E-Mail" className={"sc-layerInfo-headerButton"} src={images["share-icon.png"]} alt="Share" />
                </td>

                <td style={{ width: "60px" }}>
                  <img
                    onClick={() => {
                      window.print();
                    }}
                    title="Print this page"
                    className="sc-layerInfo-headerButton"
                    src={images["print-icon.png"]}
                    alt="Print"
                  />
                </td>
                <td style={{ width: "60px" }} className={this.state.hideNewWindow ? "hidden" : ""}>
                  <img
                    onClick={() => {
                      window.open(window.location.href, "_blank");
                    }}
                    title="Open this page in a new window"
                    className={"sc-layerInfo-headerButton"}
                    src={images["new-window-icon.png"]}
                    alt="New Window"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={this.state.showDownload == 1 && this.state.layerInfo.name !== "Assessment Parcel" ? "sc-layerInfo-item-container" : "hidden"}>
          <fieldset>
            <legend>Download</legend>
            <div className="sc-layerInfo-item-content">
              <button className={this.state.termsAccepted ? "" : "disabled"} onClick={this.onDownloadClick}>
                Download
              </button>
              <div className="sc-layerInfo-download-container">
                <label>
                  <input type="checkbox" onChange={this.onTermsChange}></input>
                  By downloading this information you accept the terms of the Open Government License - Simcoe County.
                </label>
                &nbsp;
                <a href="http://maps.simcoe.ca/openlicense.html" target="_blank" rel="noopener noreferrer">
                  View License
                </a>
              </div>
            </div>
          </fieldset>
        </div>

        <div className="sc-layerInfo-item-container">
          <fieldset>
            <legend>Abstract</legend>
            <div className="sc-layerInfo-item-content">{this.state.layerInfo.abstract}</div>
          </fieldset>
        </div>

        <div className="sc-layerInfo-item-container">
          <fieldset>
            <legend>Projection</legend>
            <div className="sc-layerInfo-item-content">{proj}</div>
          </fieldset>
        </div>

        <div className={fields.length > 0 ? "sc-layerInfo-item-container" : "hidden"}>
          <fieldset>
            <legend>Attribute Fields</legend>
            <div className="sc-layerInfo-item-content-fields">
              {fields.map((fieldInfo) => (
                <FieldItem key={helpers.getUID()} fieldInfo={fieldInfo} />
              ))}
            </div>
          </fieldset>
        </div>

        <div className="sc-layerInfo-footer">
          <div style={{ float: "left" }}>
            <div>
              <a href={window.config.openLicenseUrl} target="_blank" rel="noopener noreferrer">
                View Terms of Use
              </a>
            </div>
            <br />
            <div>
              Layer info page generated using{" "}
              <a href={window.config.originUrl} target="_blank" rel="noopener noreferrer">
                {window.config.originUrl.split("//")[1]}
              </a>{" "}
              interactive mapping.
              <br />
            </div>
          </div>
          <div style={{ float: "right" }}>{"Generated on: " + this.formatDate()}</div>
        </div>
      </div>
    );
  }
}

export default LayerInfoApp;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => {
    images[item.replace("./", "")] = r(item);
  });
  return images;
}

function FieldItem(props) {
  const fieldInfo = props.fieldInfo;
  const name = fieldInfo.name;
  const dataTypeArray = fieldInfo.binding.split(".");
  const dataType = dataTypeArray[dataTypeArray.length - 1];

  return (
    <div style={{ margin: "5px" }}>
      <b>{name}</b>
      {" ( " + dataType + " )"}
    </div>
  );
}
