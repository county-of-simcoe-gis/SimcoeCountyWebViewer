import React, { Component } from "react";
import "./CoordinatesMTO.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import { CustomCoordinates, ProjectedCoordinates, CopyCoordinates } from "./CoordinatesSubComponentsMTO.jsx";
import { transform } from "ol/proj.js";
import proj4 from "proj4";
import Select from "react-select";
import { register } from "ol/proj/proj4";
import { Vector as VectorLayer } from "ol/layer";
import { Style, Icon } from "ol/style.js";
import { Vector as VectorSource } from "ol/source.js";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { unByKey } from "ol/Observable.js";
import { default as coordinateConfig } from "./config.json";

class CoordinatesMTO extends Component {
  constructor(props) {
    super(props);
    this.state = {
      liveWebMercatorCoords: null,
      liveLatLongCoords: null,
      liveCoords: null,
      inputWebMercatorXValue: null,
      inputWebMercatorYValue: null,
      inputLatLongXValue: null,
      inputLatLongYValue: null,
      inputLatLongCoords: null,
      inputProjectionTitle: null,
      inputProjection: "EPSG:4326",
      inputPrecision: 2,
      inputXValue: null,
      inputYValue: null,
      extentMinX: null,
      extentMinY: null,
      extentMaxX: null,
      extentMaxY: null,
      mapScale: helpers.getMapScale(),
      selectProjectionOptions: [],
      selectProjectionOption: undefined,
      selectProjectionZoneOptions: [],
      selectProjectionZoneOption: undefined,
      liveProjectionZoneOption: undefined,
      hideZone: false,
      selectCopyOptions: [],
      selectCopyOption: undefined,
    };
    this.currentPrecision = 2;
    this.calculatedZone = undefined;
    this.currentProjection = "EPSG:4326";
    this.vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      style: new Style({
        image: new Icon({
          // anchor: [0.5, 0.5],
          // anchorXUnits: "fraction",
          // anchorYUnits: "pixels",
          src: images["cross-hair.png"],
        }),
      }),
    });
    // this.vectorLayer = new VectorLayer({
    //   source: new VectorSource({
    //     features: []
    //   }),
    //   style: new Style({
    //     image: new CircleStyle({
    //       opacity: 0.5,
    //       radius: 5,
    //       fill: new Fill({ color: "#EE2E2E" })
    //     })
    //   })
    // });
    this.vectorLayer.setZIndex(500);
    window.map.addLayer(this.vectorLayer);
  }

  componentDidMount() {
    //wait for map to load
    helpers.waitForLoad("map", Date.now(), 30, () => {
      // DISABLE PROPERTY CLICK
      window.disableParcelClick = true;

      // REGISTER MAP EVENTS
      this.onPointerMoveEvent = window.map.on("pointermove", this.onPointerMoveHandler);
      this.onMapClickEvent = window.map.on("click", this.onMapClick);
      this.onMapMoveEvent = window.map.on("moveend", this.onMapMoveEnd);
      this._getSelectProjections();
      this._getSelectCopyFormats();
      // REGISTER CUSTOM PROJECTIONS
      const proj4defs = this._getProj4Defs();
      if (proj4defs !== undefined && proj4defs.length > 0) {
        proj4.defs(proj4defs);
        register(proj4);
      }

      // INITIAL EXTENT
      this.updateExtent();

      window.isCoordinateToolOpen = true;
      //CREATE INITIAL POINT
      const webMercatorCoords = window.map.getView().getCenter();
      this.updateCoordinates(webMercatorCoords);
      this.createPoint(webMercatorCoords, false, true);
    });
  }

  _getSelectCopyFormats = () => {
    let defs = [];
    coordinateConfig.copyFormat.forEach((item) => {
      defs.push({ label: item.title, value: item.template });
    });
    this.setState({ selectCopyOptions: defs, selectCopyOption: defs[0] });
  };

  _getSelectProjections = () => {
    let defs = [];
    coordinateConfig.coordinate_systems.forEach((proj) => {
      if (proj.projection !== undefined && proj.projection !== null && proj.projection !== "")
        defs.push({
          label: proj.projection,
          value: proj.projection + proj.precision,
        });
    });
    this.currentPrecision = this._getPrecision(defs[0]);
    this.setState({ selectProjectionOptions: defs, selectProjectionOption: defs[0] }, () => {
      this._getSelectProjectionZones(defs[0]);
    });
  };
  _getPrecision = (item) => {
    let precision = item.value.replace(item.label, "");
    return parseInt(precision);
  };
  _getSelectProjectionZones = (selected) => {
    let defs = [{ label: " ", value: "auto" }];
    coordinateConfig.coordinate_systems.forEach((proj) => {
      if (proj.projection === selected.label && proj.zones !== undefined) {
        proj.zones.forEach((zone) => {
          defs.push({ label: zone.zone, value: zone.code });
        });
      }
    });
    let currentZone = defs[0];
    if (this.state.inputLatLongXValue !== null && this.state.inputLatLongYValue != null) {
      this._calculateZone(this.state.inputLatLongXValue, this.state.inputLatLongYValue);
    } else {
      this.calculatedZone = undefined;
    }
    const hide = defs.length <= 2 ? true : false;
    if (this.calculatedZone !== undefined) currentZone = this.calculatedZone;
    this.setState({
      selectProjectionZoneOptions: defs,
      liveProjectionZoneOption: currentZone,
      selectProjectionZoneOption: currentZone,
      hideZone: hide,
    });
  };

  _getProj4Defs = () => {
    let defs = [];
    coordinateConfig.coordinate_systems.forEach((proj) => {
      if (proj.def !== undefined && proj.def !== null && proj.def !== "") {
        defs.push(proj.def);
      }
      if (proj.zones !== undefined) {
        proj.zones.forEach((zone) => {
          if (zone.def !== undefined && zone.def !== null && zone.def !== "") {
            defs.push(zone.def);
          }
        });
      }
    });
    return defs;
  };

  _calculateZone = (x, y) => {
    let currentProj = this.state.selectProjectionOption;
    if (currentProj === undefined || currentProj === null) return;
    this.calculatedZone = undefined;
    coordinateConfig.coordinate_systems.forEach((proj) => {
      if (currentProj.label === proj.projection) {
        proj.zones.forEach((zone) => {
          if (zone.boundary !== undefined && zone.boundary !== null && zone.boundary !== "") {
            if (Array.isArray(zone.boundary[0])) {
              zone.boundary.forEach((bound) => {
                if (bound[0] > x && bound[2] < x && bound[1] < y && bound[3] > y) {
                  this.currentProjection = zone.code;
                  this.calculatedZone = { label: zone.zone, value: zone.code };
                }
              });
            } else {
              if (zone.boundary[0] > x && zone.boundary[2] < x && zone.boundary[1] < y && zone.boundary[3] > y) {
                this.currentProjection = zone.code;
                this.calculatedZone = { label: zone.zone, value: zone.code };
              }
            }
          }
        });
      }
    });
  };
  // WHEN MAP EXTENT CHANGES
  updateExtent = () => {
    const extent = window.map.getView().calculateExtent(window.map.getSize());
    this.setState({
      extentMinX: extent[0],
      extentMinY: extent[1],
      extentMaxX: extent[2],
      extentMaxY: extent[3],
      mapScale: helpers.getMapScale(),
    });
  };

  onMyMapsClick = (proj, x, y) => {
    x = parseFloat(x);
    y = parseFloat(y);

    if (isNaN(x) || isNaN(y)) return;

    let webMercatorCoords = null;
    if (proj === "webmercator") {
      webMercatorCoords = [x, y];
    } else if (proj === "latlong") {
      webMercatorCoords = transform([x, y], "EPSG:4326", "EPSG:3857");
    } else {
      webMercatorCoords = transform([x, y], proj, "EPSG:3857");
    }

    // ADD MYMAPS
    window.emitter.emit("addMyMapsFeature", this.vectorLayer.getSource().getFeatures()[0], "X:" + webMercatorCoords[0] + ", Y:" + webMercatorCoords[1]);
  };

  onMapMoveEnd = (evt) => {
    this.updateExtent();
  };

  updateCoordinates = (webMercatorCoords) => {
    const latLongCoords = transform(webMercatorCoords, "EPSG:3857", "EPSG:4326");
    const selectedCoords = transform(webMercatorCoords, "EPSG:3857", this.currentProjection);
    this.recalcInputCoordinates(webMercatorCoords);
    const inputTitle =
      this.state.selectProjectionOption === undefined
        ? ""
        : this.state.selectProjectionOption.label +
          (this.state.selectProjectionZoneOption === undefined || this.state.selectProjectionZoneOption.label.trim() === "" ? "" : " - " + this.state.selectProjectionZoneOption.label);
    const inputProjection = this.currentProjection;
    const precision = this.state.selectProjectionOption !== undefined ? this._getPrecision(this.state.selectProjectionOption) : 7;
    this.setState({
      inputWebMercatorXValue: webMercatorCoords[0],
      inputWebMercatorYValue: webMercatorCoords[1],
      inputLatLongXValue: latLongCoords[0],
      inputLatLongYValue: latLongCoords[1],
      inputLatLongCoords: latLongCoords,
      inputXValue: selectedCoords[0].toFixed(precision),
      inputYValue: selectedCoords[1].toFixed(precision),
      inputProjectionTitle: inputTitle,
      inputProjection: inputProjection,
    });

    this.glowContainers();
  };

  onMapClick = (evt) => {
    const webMercatorCoords = evt.coordinate;
    this.updateCoordinates(webMercatorCoords);
    this.createPoint(webMercatorCoords, false);
  };

  createPoint = (webMercatorCoords, zoom = false, pan = false) => {
    // CREATE POINT
    this.vectorLayer.getSource().clear();
    const pointFeature = new Feature({
      geometry: new Point(webMercatorCoords),
    });
    this.vectorLayer.getSource().addFeature(pointFeature);

    // ZOOM TO IT
    if (zoom) window.map.getView().animate({ center: webMercatorCoords, zoom: 18 }, { duration: 750 });
    // PAN TO IT
    if (pan) window.map.getView().animate({ center: webMercatorCoords }, { duration: 250 });
  };

  glowContainers() {
    helpers.glowContainer("sc-coordinate-x");
    helpers.glowContainer("sc-coordinate-y");
  }
  recalcInputCoordinates = (webMercatorCoords = undefined) => {
    if (webMercatorCoords === undefined) webMercatorCoords = [this.state.inputWebMercatorXValue, this.state.inputWebMercatorYValue];
    if (webMercatorCoords === null) return;
    const latLongCoords = transform(webMercatorCoords, "EPSG:3857", "EPSG:4326");
    this._calculateZone(latLongCoords[0], latLongCoords[1]);
    this.currentProjection = this.calculatedZone !== undefined ? this.calculatedZone.value : "EPSG:4326";
    if (this.calculatedZone === undefined) this.calculatedZone = { label: " ", value: "auto" };

    this.setState({
      selectProjectionZoneOption: this.calculatedZone,
    });
  };
  recalcLiveCoordinates = (webMercatorCoords = undefined) => {
    if (webMercatorCoords === undefined) webMercatorCoords = this.state.liveWebMercatorCoords;
    if (webMercatorCoords === null) return;
    const latLongCoords = transform(webMercatorCoords, "EPSG:3857", "EPSG:4326");
    this._calculateZone(latLongCoords[0], latLongCoords[1]);
    this.currentProjection = this.calculatedZone !== undefined ? this.calculatedZone.value : "EPSG:4326";
    if (this.calculatedZone === undefined) this.calculatedZone = { label: " ", value: "auto" };

    const liveCoords = transform(webMercatorCoords, "EPSG:3857", this.currentProjection);
    this.setState({
      liveProjectionZoneOption: this.calculatedZone,
      liveCoords: liveCoords,
      liveWebMercatorCoords: webMercatorCoords,
      liveLatLongCoords: latLongCoords,
    });
  };
  // POINTER MOVE HANDLER
  onPointerMoveHandler = (evt) => {
    const webMercatorCoords = evt.coordinate;
    this.recalcLiveCoordinates(webMercatorCoords);
  };

  componentWillUnmount() {
    // UNREGISTER EVENTS
    unByKey(this.onPointerMoveEvent);
    unByKey(this.onMapClickEvent);
    unByKey(this.onMapMoveEvent);

    // ENABLE PROPERTY CLICK
    window.disableParcelClick = false;

    // REMOVE THE LAYER
    window.map.removeLayer(this.vectorLayer);

    window.isCoordinateToolOpen = false;
  }

  onClose() {
    // CALL PARENT WITH CLOSE
    this.props.onClose();
  }

  onChangeProjectionSelect = (selection) => {
    const webMercatorCoords = [this.state.inputWebMercatorXValue, this.state.inputWebMercatorYValue];
    this.currentPrecision = this._getPrecision(selection);
    this.setState(
      {
        selectProjectionOption: selection,
        inputPrecision: this.currentPrecision,
        inputProjection: "EPSG:3857",
      },
      () => {
        this._getSelectProjectionZones(selection);
        this.recalcInputCoordinates();
        this.recalcLiveCoordinates();
        this.updateCoordinates(webMercatorCoords);
        this.createPoint(webMercatorCoords, false);
      }
    );
  };

  onChangeProjectionZoneSelect = (selection) => {
    if (selection.value !== "auto") {
      this.currentProjection = selection.value;
      const inputTitle =
        this.state.selectProjectionOption === undefined ? "" : this.state.selectProjectionOption.label + (selection === undefined || selection.label.trim() === "" ? "" : " - " + selection.label);
      this.setState(
        {
          selectProjectionZoneOption: selection,
          inputProjection: this.currentProjection,
          inputProjectionTitle: inputTitle,
        },
        () => {
          this.onPointUpdate(this.state.inputProjection, this.state.inputXValue, this.state.inputYValue);
          //this.recalcInputCoordinates();
        }
      );
    } else {
      this.setState({ selectProjectionZoneOption: selection }, () => {
        this.recalcInputCoordinates();
      });
    }
  };

  onPointUpdate = (proj, x, y) => {
    x = parseFloat(x);
    y = parseFloat(y);

    if (isNaN(x) || isNaN(y)) return;

    let webMercatorCoords = null;
    if (proj === "webmercator") {
      webMercatorCoords = [x, y];
    } else if (proj === "latlong") {
      webMercatorCoords = transform([x, y], "EPSG:4326", "EPSG:3857");
    } else {
      webMercatorCoords = transform([x, y], proj, "EPSG:3857");
    }

    this.createPoint(webMercatorCoords, false, true);
  };
  onPanClick = (proj, x, y) => {
    x = parseFloat(x);
    y = parseFloat(y);

    if (isNaN(x) || isNaN(y)) return;

    let webMercatorCoords = null;
    if (proj === "webmercator") {
      webMercatorCoords = [x, y];
    } else if (proj === "latlong") {
      webMercatorCoords = transform([x, y], "EPSG:4326", "EPSG:3857");
    } else {
      webMercatorCoords = transform([x, y], proj, "EPSG:3857");
    }

    this.createPoint(webMercatorCoords, false, true);
  };

  onZoomClick = (proj, x, y) => {
    x = parseFloat(x);
    y = parseFloat(y);

    if (isNaN(x) || isNaN(y)) return;

    let webMercatorCoords = null;
    if (proj === "webmercator") {
      webMercatorCoords = [x, y];
    } else if (proj === "latlong") {
      webMercatorCoords = transform([x, y], "EPSG:4326", "EPSG:3857");
    } else {
      webMercatorCoords = transform([x, y], proj, "EPSG:3857");
    }

    this.createPoint(webMercatorCoords, true);
  };

  render() {
    return (
      <PanelComponent onClose={this.props.onClose} name={this.props.name} helpLink={this.props.helpLink} hideHeader={this.props.hideHeader} type="tools">
        <div className="sc-coordinates-container">
          <div className="sc-container">
            <div className="sc-description">
              Capture points in a variety of different coordinate systems or enter your own locations and zoom to its location.
              <ul>
                <li>Click on the map to capture locations</li>
                <li>--------- or ---------</li>
                <li>Enter known coordinates below to see them on the map</li>
              </ul>
            </div>
            <div className="sc-coordinates-table">
              <div className="sc-coordinates-row sc-coordinates-heading ">
                <div className="sc-coordinates-cell" width="70%">
                  <span>Coordinate System</span>
                </div>
              </div>
              <div className="sc-coordinates-row">
                <div className="sc-coordinates-cell">
                  <Select id="sc-coordinate-select" onChange={this.onChangeProjectionSelect} options={this.state.selectProjectionOptions} value={this.state.selectProjectionOption} />
                </div>
              </div>
            </div>
            <div className="sc-coordinates-divider" />
            <div className="sc-title sc-coordinates-title">CAPTURED / SELECTED</div>

            <div className="sc-container">
              <div className={this.state.hideZone ? "sc-hidden" : "sc-coordinates-row sc-arrow"}>
                <label>Zone:</label>
                <span>
                  <Select
                    id="sc-zone-select"
                    onChange={this.onChangeProjectionZoneSelect}
                    className={this.state.hideZone ? "sc-hidden" : ""}
                    options={this.state.selectProjectionZoneOptions}
                    value={this.state.selectProjectionZoneOption}
                  />
                </span>
              </div>
              <CustomCoordinates
                title={""}
                valueX={this.state.inputXValue}
                valueY={this.state.inputYValue}
                precision={this.state.inputPrecision}
                onChangeX={(evt) => {
                  this.setState({ inputXValue: evt.target.value }, () => {
                    this.onPointUpdate(this.state.inputProjection, this.state.inputXValue, this.state.inputYValue);
                  });
                }}
                onChangeY={(evt) => {
                  this.setState({ inputYValue: evt.target.value }, () => {
                    this.onPointUpdate(this.state.inputProjection, this.state.inputXValue, this.state.inputYValue);
                  });
                }}
                onZoomClick={() => {
                  this.onZoomClick(this.state.inputProjection, this.state.inputXValue, this.state.inputYValue);
                }}
                onPanClick={() => {
                  this.onPanClick(this.state.inputProjection, this.state.inputXValue, this.state.inputYValue);
                }}
                onMyMapsClick={() => {
                  this.onMyMapsClick(this.state.inputProjection, this.state.inputXValue, this.state.inputYValue);
                }}
                inputIdX="sc-coordinate-x"
                inputIdY="sc-coordinate-y"
                onEnterKey={() => {
                  this.onPanClick(this.state.inputProjection, this.state.inputXValue, this.state.inputYValue);
                }}
              />
            </div>
          </div>

          <div className="sc-container sc-coordinates-floatbottom">
            <div className="sc-title sc-coordinates-title">COPY COORDINATES</div>
            <CopyCoordinates
              inputId="sc-coordinate-copy"
              copyFormats={this.state.selectCopyOptions}
              copyFormat={this.state.selectCopyOption}
              onFormatChange={(selection) => {
                this.setState({ selectCopyOption: selection });
              }}
              title={this.state.inputProjectionTitle}
              valueX={this.state.inputXValue}
              valueY={this.state.inputYValue}
              onCopy={() => {
                var copyText = document.getElementById("sc-coordinate-copy");
                copyText.select();
                copyText.setSelectionRange(0, 99999);
                document.execCommand("copy");
              }}
            />
            <div className="sc-coordinates-divider" />
            <ProjectedCoordinates
              key={helpers.getUID()}
              coords={this.state.liveCoords}
              precision={this.currentPrecision}
              projection={this.state.selectProjectionOption}
              zone={this.state.liveProjectionZoneOption}
            />
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default CoordinatesMTO;
// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
