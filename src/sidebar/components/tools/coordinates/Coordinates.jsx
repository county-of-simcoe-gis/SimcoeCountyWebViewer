import React, { Component } from "react";
import "./Coordinates.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import { CustomCoordinates, MapExtent, LiveCoordinates } from "./CoordinatesSubComponents.jsx";
import { transform } from "ol/proj.js";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import Projection from "ol/proj/Projection.js";
import { Vector as VectorLayer } from "ol/layer";
import { Fill, Style, Circle as CircleStyle, Icon } from "ol/style.js";
import { Vector as VectorSource } from "ol/source.js";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { unByKey } from "ol/Observable.js";

class Coordinates extends Component {
  constructor(props) {
    super(props);
    this.state = {
      liveWebMercatorCoords: null,
      liveLatLongCoords: null,
      inputWebMercatorXValue: null,
      inputWebMercatorYValue: null,
      inputLatLongXValue: null,
      inputLatLongYValue: null,
      inputNad83XValue: null,
      inputNad83YValue: null,
      inputNad27XValue: null,
      inputNad27YValue: null,
      extentMinX: null,
      extentMinY: null,
      extentMaxX: null,
      extentMaxY: null,
      mapScale: helpers.getMapScale(),
    };

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

    // UTM NAD 83
    this.nad83Proj = new Projection({
      code: "EPSG:26917",
      extent: [194772.8107, 2657478.7094, 805227.1893, 9217519.4415],
    });

    // UTM NAD 27
    this.nad27Proj = new Projection({
      code: "EPSG:26717",
      extent: [169252.3099, 885447.906, 830747.6901, 9217404.5493],
    });
  }

  componentDidMount() {
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    // DISABLE PROPERTY CLICK
    window.disableParcelClick = true;

    // REGISTER MAP EVENTS
    this.onPointerMoveEvent = window.map.on("pointermove", this.onPointerMoveHandler);
    this.onMapClickEvent = window.map.on("click", this.onMapClick);
    this.onMapMoveEvent = window.map.on("moveend", this.onMapMoveEnd);

    // REGISTER CUSTOM PROJECTIONS
    proj4.defs([["EPSG:26917", "+proj=utm +zone=17 +ellps=GRS80 +datum=NAD83 +units=m +no_defs "], ["EPSG:26717", "+proj=utm +zone=17 +ellps=clrk66 +datum=NAD27 +units=m +no_defs "]]);
    register(proj4);

    // INITIAL EXTENT
    this.updateExtent();

    window.isCoordinateToolOpen = true;
  }

  // WHEN MAP EXTENT CHANGES
  updateExtent = () => {
    const extent = window.map.getView().calculateExtent(window.map.getSize());
    this.setState({ extentMinX: extent[0], extentMinY: extent[1], extentMaxX: extent[2], extentMaxY: extent[3], mapScale: helpers.getMapScale() });
  };

  onMyMapsClick = (x, y) => {
    if (x === null) return;

    // ADD MYMAPS
    window.emitter.emit("addMyMapsFeature", this.vectorLayer.getSource().getFeatures()[0], "X:" + x + ", Y:" + y);
  };

  onMapMoveEnd = (evt) => {
    this.updateExtent();
  };

  onMapClick = (evt) => {
    const webMercatorCoords = evt.coordinate;
    const latLongCoords = transform(webMercatorCoords, "EPSG:3857", "EPSG:4326");
    const utmNad83Coords = transform(webMercatorCoords, "EPSG:3857", this.nad83Proj);
    const utmNad27Coords = transform(webMercatorCoords, "EPSG:3857", this.nad27Proj);

    this.setState({
      inputWebMercatorXValue: webMercatorCoords[0],
      inputWebMercatorYValue: webMercatorCoords[1],
      inputLatLongXValue: latLongCoords[0],
      inputLatLongYValue: latLongCoords[1],
      inputNad83XValue: utmNad83Coords[0],
      inputNad83YValue: utmNad83Coords[1],
      inputNad27XValue: utmNad27Coords[0],
      inputNad27YValue: utmNad27Coords[1],
    });

    this.glowContainers();

    this.createPoint(webMercatorCoords, false);
  };

  createPoint = (webMercatorCoords, zoom = false) => {
    // CREATE POINT
    this.vectorLayer.getSource().clear();
    const pointFeature = new Feature({
      geometry: new Point(webMercatorCoords),
    });
    this.vectorLayer.getSource().addFeature(pointFeature);

    // ZOOM TO IT
    if (zoom) window.map.getView().animate({ center: webMercatorCoords, zoom: 18 });
  };

  glowContainers() {
    helpers.glowContainer("sc-coordinate-webmercator-x", "green");
    helpers.glowContainer("sc-coordinate-webmercator-y", "green");
    helpers.glowContainer("sc-coordinate-latlong-x", "green");
    helpers.glowContainer("sc-coordinate-latlong-y", "green");
    helpers.glowContainer("sc-coordinate-nad83-x", "green");
    helpers.glowContainer("sc-coordinate-nad83-y", "green");
    helpers.glowContainer("sc-coordinate-nad27-x", "green");
    helpers.glowContainer("sc-coordinate-nad27-y", "green");
  }

  // POINTER MOVE HANDLER
  onPointerMoveHandler = (evt) => {
    const webMercatorCoords = evt.coordinate;
    const latLongCoords = transform(webMercatorCoords, "EPSG:3857", "EPSG:4326");

    this.setState({
      liveWebMercatorCoords: webMercatorCoords,
      liveLatLongCoords: latLongCoords,
    });
  };

  componentWillUnmount() {
    // UNREGISTER EVENTS
    unByKey(this.onPointerMoveEvent);
    unByKey(this.onMapClickEvent);

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

  onZoomClick = (proj, x, y) => {
    x = parseFloat(x);
    y = parseFloat(y);

    if (isNaN(x) || isNaN(y)) return;

    let webMercatorCoords = null;
    if (proj === "webmercator") {
      webMercatorCoords = [x, y];
    } else if (proj === "latlong") {
      webMercatorCoords = transform([x, y], "EPSG:4326", "EPSG:3857");
    } else if (proj === "nad83") {
      webMercatorCoords = transform([x, y], this.nad83Proj, "EPSG:3857");
    } else if (proj === "nad27") {
      webMercatorCoords = transform([x, y], this.nad27Proj, "EPSG:3857");
    } else return;

    this.createPoint(webMercatorCoords, true);
  };

  render() {
    return (
      <PanelComponent onClose={this.props.onClose} name={this.props.name} type="tools">
        <div className="sc-coordinates-container">
          <LiveCoordinates key={helpers.getUID()} liveWebMercatorCoords={this.state.liveWebMercatorCoords} liveLatLongCoords={this.state.liveLatLongCoords} />

          <div className="sc-title sc-coordinates-title">Selected/Custom Coordinates</div>

          <div className="sc-description">
            Capture points in a variety of different coordinate systems or enter your own locations and zoom to its location. Simply click on the map to capture locations.
          </div>

          <div className="sc-container">
            <CustomCoordinates
              title="Map Coordinates (Web Mercator - Meters)"
              valueX={this.state.inputWebMercatorXValue}
              valueY={this.state.inputWebMercatorYValue}
              onChangeX={(evt) => {
                this.setState({ inputWebMercatorXValue: evt.target.value });
              }}
              onChangeY={(evt) => {
                this.setState({ inputWebMercatorYValue: evt.target.value });
              }}
              onZoomClick={() => {
                this.onZoomClick("webmercator", this.state.inputWebMercatorXValue, this.state.inputWebMercatorYValue);
              }}
              onMyMapsClick={() => {
                this.onMyMapsClick(this.state.inputWebMercatorXValue, this.state.inputWebMercatorYValue);
              }}
              inputIdX="sc-coordinate-webmercator-x"
              inputIdY="sc-coordinate-webmercator-y"
              onEnterKey={() => {
                this.onZoomClick("webmercator", this.state.inputWebMercatorXValue, this.state.inputWebMercatorYValue);
              }}
            />

            <div className="sc-coordinates-divider">&nbsp;</div>

            <CustomCoordinates
              title="Latitude/Longitude (WGS84 - Degrees)"
              valueX={this.state.inputLatLongXValue}
              valueY={this.state.inputLatLongYValue}
              onChangeX={(evt) => {
                this.setState({ inputLatLongXValue: evt.target.value });
              }}
              onChangeY={(evt) => {
                this.setState({ inputLatLongYValue: evt.target.value });
              }}
              onZoomClick={() => {
                this.onZoomClick("latlong", this.state.inputLatLongXValue, this.state.inputLatLongYValue);
              }}
              onMyMapsClick={() => {
                this.onMyMapsClick(this.state.inputLatLongXValue, this.state.inputLatLongYValue);
              }}
              inputIdX="sc-coordinate-latlong-x"
              inputIdY="sc-coordinate-latlong-y"
              onEnterKey={() => {
                this.onZoomClick("latlong", this.state.inputLatLongXValue, this.state.inputLatLongYValue);
              }}
            />

            <div className="sc-coordinates-divider">&nbsp;</div>

            <CustomCoordinates
              title="North American Datum (NAD) 83 - Zone 17 (meters)"
              valueX={this.state.inputNad83XValue}
              valueY={this.state.inputNad83YValue}
              onChangeX={(evt) => {
                this.setState({ inputNad83XValue: evt.target.value });
              }}
              onChangeY={(evt) => {
                this.setState({ inputNad83YValue: evt.target.value });
              }}
              onZoomClick={() => {
                this.onZoomClick("nad83", this.state.inputNad83XValue, this.state.inputNad83YValue);
              }}
              onMyMapsClick={() => {
                this.onMyMapsClick(this.state.inputNad83XValue, this.state.inputNad83YValue);
              }}
              inputIdX="sc-coordinate-nad83-x"
              inputIdY="sc-coordinate-nad83-y"
              onEnterKey={() => {
                this.onZoomClick("nad83", this.state.inputNad83XValue, this.state.inputNad83YValue);
              }}
            />

            <div className="sc-coordinates-divider">&nbsp;</div>

            <CustomCoordinates
              title="North American Datum (NAD) 27 - Zone 17 (meters)"
              valueX={this.state.inputNad27XValue}
              valueY={this.state.inputNad27YValue}
              onChangeX={(evt) => {
                this.setState({ inputNad27XValue: evt.target.value });
              }}
              onChangeY={(evt) => {
                this.setState({ inputNad27YValue: evt.target.value });
              }}
              onZoomClick={() => {
                this.onZoomClick("nad27", this.state.inputNad27XValue, this.state.inputNad27YValue);
              }}
              onMyMapsClick={() => {
                this.onMyMapsClick(this.state.inputNad27XValue, this.state.inputNad27YValue);
              }}
              inputIdX="sc-coordinate-nad27-x"
              inputIdY="sc-coordinate-nad27-y"
              onEnterKey={() => {
                this.onZoomClick("nad27", this.state.inputNad27XValue, this.state.inputNad27YValue);
              }}
            />
          </div>

          <div className="sc-title sc-coordinates-title">Map Extent</div>

          <MapExtent key={helpers.getUID()} extentMinX={this.state.extentMinX} extentMinY={this.state.extentMinY} extentMaxX={this.state.extentMaxX} extentMaxY={this.state.extentMaxY} />

          <div className="sc-title sc-coordinates-title">Map Scale</div>
          <div className="sc-container">
            <div className="sc-coordinates-row sc-arrow">
              <label>Scale</label>
              <span>{"1:" + this.state.mapScale}</span>
            </div>
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default Coordinates;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
