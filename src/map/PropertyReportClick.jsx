import React, { Component, Fragment } from "react";
import * as helpers from "../helpers/helpers";
import { get } from "../helpers/api";

import "./PropertyReportClick.css";
import InfoRow from "../helpers/InfoRow.jsx";
import { CopyToClipboard } from "react-copy-to-clipboard";
import GeoJSON from "ol/format/GeoJSON.js";
import Point from "ol/geom/Point";
import { Vector as VectorLayer } from "ol/layer.js";
import { Vector as VectorSource } from "ol/source.js";
import { Stroke, Fill, Style } from "ol/style.js";
import PropertyReport from "../reports/PropertyReport";
import copy from "copy-to-clipboard";
import { Image as ImageLayer } from "ol/layer.js";
import { LayerHelpers, OL_DATA_TYPES } from "../helpers/OLHelpers";
import Identify from "./Identify.jsx";
import IdentifyQuery from "./IdentifyQuery.jsx";
import { getArea } from "ol/sphere.js";
// https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Assessment%20Parcel&outputFormat=application/json&cql_filter=INTERSECTS(geom,%20POINT%20(-8874151.72%205583068.78))
const parcelURLTemplate = (mainURL, x, y) => `${mainURL}&cql_filter=INTERSECTS(geom,%20POINT%20(${x}%20${y}))`;
let parcelLayerStyle = new Style({
  fill: new Fill({
    color: [0, 0, 0, 0.0], // USE OPACITY
  }),
  stroke: new Stroke({
    color: [231, 128, 128, 0.8],
    width: 3,
  }),
});
let parcelLayer = new VectorLayer({
  style: parcelLayerStyle,
  source: new VectorSource(),
});
parcelLayer.setZIndex(500);

class PropertyReportClick extends Component {
  constructor(props) {
    super(props);
    //wait for toc and map to load
    this.extensions = this.props.extensions || [];
    helpers.waitForLoad(["map", "toc"], Date.now(), 30, () => this.onMapLoad());

    this.state = {
      propInfo: null,
      feature: null,
    };
  }

  componentDidMount() {
    this.extensions = this.props.extensions || [];
  }
  componentDidUpdate(prevProps) {
    if (this.extensions.length !== this.props.extensions.length) {
      this.extensions = this.props.extensions || [];
    }
  }
  onMapLoad() {
    window.map.addLayer(parcelLayer);

    // HANDLE URL PARAMETERS
    helpers.waitForLoad(["security", "sidebar", "toc", "settings"], Date.now(), 30, () => {
      const urlARN = helpers.getURLParameter("ARN");
      if (urlARN !== null) {
        const parcelURLARNTemplate = (mainURL, arn) => `${mainURL}&cql_filter=arn='${arn}'`;
        let parcelUrl = window.config.configSecured.assessmentParcelLayer ? window.config.configSecured.assessmentParcelLayer.url : window.config.parcelLayer.url;
        const parcelARNURL = parcelURLARNTemplate(parcelUrl || window.config.parcelLayer.url, urlARN);
        this.showPropertyWindow(parcelARNURL);
      }
    });

    // LISTEN FOR MAP CLICK
    window.map.on("singleclick", async (evt) => {
      this.setState({ userClickCoords: evt.coordinate });
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
      var viewResolution = window.map.getView().getResolution();
      const layers = window.map.getLayers().getArray();
      for (let index = 0; index < layers.length; index++) {
        if (disable) break;
        const layer = layers[index];
        if (layer.getProperties().disableParcelClick && layer.getVisible() && layer instanceof ImageLayer) {
          //console.log(layer);
          const isArcGISLayer = LayerHelpers.getLayerSourceType(layer.getSource()) === OL_DATA_TYPES.ImageArcGISRest;
          var rootInfoUrl = layer.get("rootInfoUrl");
          var url = isArcGISLayer
            ? layer.get("wfsUrl")
            : layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
                INFO_FORMAT: "application/json",
              });
          if (isArcGISLayer) {
            const checkAccessTokenUrl = new URL(rootInfoUrl);
            const token = checkAccessTokenUrl.searchParams.get("token");

            const arcgisResolution = `${window.map.getSize()[0]},${window.map.getSize()[1]},96`;
            const extent = window.map.getView().calculateExtent();
            const zoom = window.map.getView().getZoom();
            const tolerance = 20 - zoom;
            url = url
              .replace("#GEOMETRY#", evt.coordinate)
              .replace("#GEOMETRYTYPE#", "esriGeometryPoint")
              .replace("#TOLERANCE#", tolerance >= 10 ? tolerance : 10)
              .replace("#EXTENT#", extent.join(","))
              .replace("#RESOLUTION#", arcgisResolution);
            if (token) url += `&token=${token}`;
          }
          if (url) {
            const secured = layer.get("secured");
            const params = {};
            if (secured) params["useBearerToken"] = secured;
            await (async () => {
              return new Promise((resolve) =>
                get(url, params, (result) => {
                  if (result) {
                    let features = [];
                    const featureList = isArcGISLayer ? LayerHelpers.parseESRIIdentify(result) : new GeoJSON().readFeatures(result);
                    if (featureList.length > 0) {
                      featureList.forEach((feature) => {
                        features.push(feature);
                      });
                    }
                    if (!features) {
                      disable = true;
                      return;
                    }
                    resolve();
                  }
                })
              );
            });
          }
        }
      }

      if (disable || helpers.shouldCancelPopup(evt.coordinate, evt.originalEvent.timeStamp)) return;
      const parcelURL = parcelURLTemplate(window.config.parcelLayer.url, evt.coordinate[0], evt.coordinate[1]);
      this.showPropertyWindow(parcelURL, evt);

      helpers.addAppStat("Property Click", "Click");
    });

    // LISTEN FOR CALLS
    window.emitter.addListener("showPropertyReport", (coords, zoomToFeature = true) => this.onPropertyEmitter(coords, zoomToFeature));
  }

  onPropertyEmitter = (coords, zoomToFeature) => {
    const parcelURL = parcelURLTemplate(window.config.parcelLayer.url, coords[0], coords[1]);

    this.showPropertyWindow(parcelURL, zoomToFeature === true ? null : { coordinate: coords, originalEvent: { timeStamp: performance.now() } });
  };

  addToMyMaps = (value) => {
    // ADD MYMAPS
    window.emitter.emit("addMyMapsFeature", this.state.feature, value && value !== "(Not Available)" ? value : this.state.feature.get("arn"));
  };

  getShareURL = (arn) => {
    //GET URL
    var url = window.location.href.replace("#", "");

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

  identifyLayerFeature = (options) => {
    if (options.identifyType === "query") {
      window.emitter.emit(
        "loadReport",
        <IdentifyQuery
          identifyType={options.identifyType}
          title={options.title}
          layerURL={options.layerURL}
          layerId={options.layerId}
          where={options.where}
          fields={options.fields}
          secured={options.secured}
          type={options.type}
          arn={options.arn}
        />
      );
    } else {
      if (options.coords && options.layer) {
        const point = new Point(options.coords);
        window.emitter.emit("loadReport", <Identify geometry={point} layerFilter={options.layer} />);
      }
    }
  };

  //copy(result.id);
  // BUILDS POPUP CONTENT
  getPopupContent = (propInfo) => {
    const arn = propInfo.ARN;
    const address = propInfo.Address;
    const assessedValue = propInfo.AssessedValue;
    const garbageDay = propInfo.WasteCollection && propInfo.WasteCollection.GarbageDay ? propInfo.WasteCollection.GarbageDay : undefined;
    const garbageDayNew = propInfo.WasteCollection.GarbageDayNew ? propInfo.WasteCollection.GarbageDayNew : undefined;

    const broadbandSpeeds = propInfo.Other && propInfo.Other.BroadbandSpeed ? propInfo.Other.BroadbandSpeed : undefined;
    const coords = propInfo.pointCoordinates;
    const pointerCoords = propInfo.pointerCoordinates;
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

          {this.extensions.map((extension) => {
            return <Fragment key={helpers.getUID()}>{extension.arnExtension({ arn })}</Fragment>;
          })}
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
    if (assessedValue)
      rows.push(
        <InfoRow key={helpers.getUID()} label={"Assessed Value"}>
          <img src={assessedValue} alt="assessment" />
          <div style={{ fontSize: "9px", color: "#555", paddingBottom: "4px !important" }}>(may not reflect current market value)</div>
        </InfoRow>
      );

    if (garbageDay) rows.push(<InfoRow key={helpers.getUID()} label={"Waste Collection Day"} value={garbageDay} />);
    if (garbageDayNew) rows.push(<InfoRow key={helpers.getUID()} label={"Waste Collection Day - Dec 2023"} value={garbageDayNew} />);

    if (broadbandSpeeds) rows.push(<InfoRow key={helpers.getUID()} label={"Potential Broadband Coverage"} value={broadbandSpeeds} />);

    rows.push(
      <InfoRow className="sc-no-select" key={helpers.getUID()} label={"Tools"}>
        <span className="sc-fakeLink" onClick={() => this.addToMyMaps(address)}>
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
            helpers.showURLWindow(window.config.termsUrl, false, "full", false, true, true);
            helpers.addAppStat("Property Click Terms", "click");
          }}
        >
          [Terms]
        </span>
      </InfoRow>
    );

    rows.push(<InfoRow key={helpers.getUID()} label={"Pointer Coordinates"} value={"Lat: " + Math.round(coords[1] * 10000) / 10000 + "  Long: " + Math.round(coords[0] * 10000) / 10000} />);

    if (window.config.propertyReport && window.config.propertyReport.customIdentify) {
      window.config.propertyReport.customIdentify.forEach((item) => {
        rows.push(
          <InfoRow className="sc-no-select" key={helpers.getUID()} label={item.label}>
            <span
              className="sc-fakeLink"
              onClick={() =>
                this.identifyLayerFeature({
                  identifyType: item.identifyType,
                  coords: pointerCoords,
                  layer: item.layer,
                  title: item.layerName,
                  layerURL: item.layerURL,
                  layerId: item.layerId,
                  where: item.whereFormat,
                  fields: item.fields,
                  secured: item.secured,
                  type: item.type,
                  arn: arn,
                })
              }
            >
              {item.linkText}
            </span>
          </InfoRow>
        );
      });
    }
    this.extensions.forEach((extension) => {
      rows = extension.dataRows({ arn, rows, ...propInfo, geom: this.state.feature.getGeometry() });
    });

    const GetPropertyLink = () => {
      //SAMPLE
      //https://opengis2.simcoe.ca/secure/?ARN=431601002304614&PROPERTYLINK={"label":"Launch MOAR","link":"http://moar.innisfil.ca/propertyInformation/viewARN/{arn}"}
      const propertylink = helpers.getURLParameter("PROPERTYLINK", true, true);
      if (propertylink) {
        let propertylinkObj = helpers.tryParseJSON(propertylink);
        if (typeof propertylinkObj === "object") {
          if (!propertylinkObj.label) propertylinkObj["label"] = "Property Link";
          if (propertylinkObj.link) {
            propertylinkObj.link = propertylinkObj.link.replace("{arn}", arn);
            return (
              <a href={propertylinkObj.link} target="_blank" rel="noopener noreferrer">
                <button key={helpers.getUID()} id={helpers.getUID()} className={"sc-button sc-property-report-click-propertylink"}>
                  {propertylinkObj.label}
                </button>
              </a>
            );
          }
        }
      }
    };

    const PropertyReportContent = (props) => {
      const { extensions } = props;
      return (
        <div>
          <div className="sc-property-report-top-container">{rows}</div>

          <button key={helpers.getUID()} id={helpers.getUID()} className="sc-button sc-property-report-click-more-info" onClick={this.onMoreInfoClick}>
            More Information
          </button>

          <button key={helpers.getUID()} id={helpers.getUID()} className="sc-button sc-property-report-click-close" onClick={this.onCloseClick}>
            Close
          </button>

          {extensions.map((extension) => {
            return <React.Fragment key={helpers.getUID()}>{extension.content({ arn })}</React.Fragment>;
          })}
          {GetPropertyLink()}
        </div>
      );
    };

    return <PropertyReportContent extensions={this.extensions} />;
  };

  showPropertyWindow = (wmsURL, clickEvt = null) => {
    if (clickEvt !== null) {
      const shiftKeyPressed = clickEvt.originalEvent.shiftKey;
      if (shiftKeyPressed) return;
    }

    helpers.waitForLoad(["security", "sidebar", "toc"], Date.now(), 30, () => {
      helpers.getJSON(wmsURL, (result) => {
        if (result.features.length === 0) return;

        const geoJSON = new GeoJSON().readFeatures(result);

        var vectorSource = new VectorSource({ features: geoJSON });
        if (clickEvt !== null && helpers.shouldCancelPopup(clickEvt.coordinate, clickEvt.originalEvent.timeStamp)) return;
        else parcelLayer.setSource(vectorSource);

        const feature = geoJSON[0];
        feature.setStyle(parcelLayerStyle);
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
            window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize());

            // GET FULL INFO
            this.getData({ feature, arn, pointerPoint, latLongCoords }, (result) => {
              this.setState({ propInfo: result, userClickCoords: pointerPoint });
              window.popup.show(pointerPoint, this.getPopupContent(result), "Property Information", () => {});
            });
          });
        } else {
          latLongCoords = helpers.toLatLongFromWebMercator(clickEvt.coordinate);
          pointerPoint = clickEvt.coordinate;

          // GET FULL INFO
          this.getData({ feature, arn, pointerPoint, latLongCoords }, (result) => {
            this.setState({ propInfo: result, userClickCoords: pointerPoint });
            window.popup.show(pointerPoint, this.getPopupContent(result), "Property Information", () => {});
          });
        }
      });
    });
  };

  getData = (options, callback) => {
    const { feature, arn, pointerPoint, latLongCoords } = options;
    let allPromises = [];
    if (feature !== undefined) {
      const infoURL = window.config.propertyReportUrl + arn;
      allPromises.push(
        new Promise((resolve, reject) => {
          helpers.getJSON(infoURL, (result) => {
            result.pointerCoordinates = pointerPoint;
            result.pointCoordinates = latLongCoords;
            result.shareURL = this.getShareURL(arn);
            result.area = getArea(feature.getGeometry());
            resolve(result);
          });
        })
      );
      this.extensions.forEach((extension) => {
        allPromises.push(extension.fetchData({ ...options, data: {} }));
      });
    }
    Promise.all(allPromises).then((results) => {
      let allResults = {};
      results.forEach((result) => {
        allResults = { ...allResults, ...result };
      });
      if (callback) callback(allResults);
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
