import React, { Component } from "react";
import * as helpers from "../helpers/helpers";
import Autocomplete from "react-autocomplete";
import "./Search.css";
import Highlighter from "react-highlight-words";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source.js";
import WKT from "ol/format/WKT.js";
import { Fill, Icon, Stroke, Style, Circle as CircleStyle } from "ol/style.js";
import { transform } from "ol/proj.js";
import { CopyToClipboard } from "react-copy-to-clipboard";

// URLS
const searchURL = searchText => `https://maps.simcoe.ca/giswebapi/api/search/?query=${searchText}`;
const searchInfoURL = locationID => `https://maps.simcoe.ca/giswebapi/api/search/?locationID=${locationID}`;
const googleDirectionsURL = (lat, long) => `https://www.google.com/maps?saddr=My+Location&daddr=${lat},${long}`;

// VECTOR LAYERS
let searchGeoLayer = null;
let searchIconLayer = null;

// LOCATION ID (FROM SEARCH)
const locationId = helpers.getURLParameter("LOCATIONID", false);

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}

// STYLES
const styles = {
  poly: new Style({
    stroke: new Stroke({
      width: 4,
      color: [255, 0, 0, 0.8]
    })
  }),
  point: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: images["map-marker.png"]
    })
  }),
  geocode: new Style({
    image: new CircleStyle({
      opacity: 0.5,
      radius: 7,
      fill: new Fill({ color: [236, 156, 155, 0.7] })
    })
  })
};

class Search extends Component {
  constructor(props) {
    super(props);

    // BIND THIS TO THE CLICK FUNCTION
    this.removeMarkersClick = this.removeMarkersClick.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }
  state = {
    value: "",
    searchResults: [],
    hover: false,
    iconInitialClass: "sc-search-icon-initial",
    iconActiveClass: "sc-search-icon-active-hidden"
  };

  requestTimer = null;

  componentDidMount() {
    // HANDLE URL PARAMETER
    if (locationId !== null) {
      // CALL API TO GET LOCATION DETAILS
      helpers.getJSON(searchInfoURL(locationId), result => this.jsonCallback(result));
    }
  }

  removeMarkersClick() {
    this.cleanup();
  }

  myMapsClick = evt => {
    const result = this.state.searchResults[0];

    // ADD MYMAPS
    window.emitter.emit("addMyMapsFeature", searchGeoLayer.getSource().getFeatures()[0], result.Name);

    // CLEAN UP
    this.cleanup();
  };

  directionsClick(evt) {
    // GET CURRENT FEATURE
    var coords = searchIconLayer
      .getSource()
      .getFeatures()[0]
      .getGeometry()
      .getCoordinates();

    // CONVER TO LAT LONG
    var latLongCoords = transform(coords, "EPSG:3857", "EPSG:4326");

    // OPEN GOOGLE DIRECTIONS
    var url = googleDirectionsURL(latLongCoords[1], latLongCoords[0]);
    window.open(url, "_blank");
  }

  // INIT SEARCH LAYERS
  initsearchLayers() {
    if (window.map != null && searchGeoLayer == null) {
      // HOLDS LINES AND POLYS
      searchGeoLayer = new VectorLayer({
        source: new VectorSource({
          features: []
        })
      });
      searchGeoLayer.set("name", "sc-search-geo");
      window.map.addLayer(searchGeoLayer);

      // HOLDS CENTROID (CLICKABLE)
      searchIconLayer = new VectorLayer({
        source: new VectorSource({
          features: []
        })
      });
      searchIconLayer.setStyle(styles["point"]);
      searchIconLayer.set("name", "sc-search-icon");
      searchIconLayer.set("disableParcelClick", true);
      window.map.addLayer(searchIconLayer);

      window.map.on("singleclick", evt => {
        var feature = window.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
          if (layer === null) return;

          if (layer.get("name") !== undefined && layer.get("name") === "sc-search-icon") return feature;
        });

        if (feature !== undefined) {
          window.popup.show(
            evt.coordinate,
            <PopupContent
              key={helpers.getUID()}
              removeMarkersClick={this.removeMarkersClick}
              myMapsClick={this.myMapsClick}
              shareLocationId={this.state.searchResults[0].LocationID}
              directionsClick={evt => this.directionsClick(evt)}
            />,
            "Actions"
          );
        }
      });
    }
  }

  getWKTFeature(wktString) {
    if (wktString === undefined) return;

    // READ WKT
    var wkt = new WKT();
    var feature = wkt.readFeature(wktString, {
      dataProjection: "EPSG:3857",
      featureProjection: "EPSG:3857"
    });
    return feature;
  }

  jsonCallback(result) {
    // SOME FEATURES HAVEN"T BEEN PROCESSED YET
    if (result.WKTShape === undefined || result.WKTShape === "" || result.WKTShape === null) {
      console.log("WKT Shape is empty.");
      return;
    }

    this.initsearchLayers();

    // SET STATE CURRENT ITEM
    this.setState({ searchResults: [result] });

    // READ WKT
    const wktShape = this.getWKTFeature(result.WKTShape);
    const wktPoint = this.getWKTFeature(result.WKTPoint);

    // SET SOURCE
    searchGeoLayer.getSource().addFeature(wktShape);
    searchIconLayer.getSource().addFeature(wktPoint);

    searchGeoLayer.setZIndex(100);
    searchIconLayer.setZIndex(100);
    // SET STYLE AND ZOOM
    if (result.WKTShape.indexOf("POINT") !== -1) {
      searchGeoLayer.setStyle(styles["point"]);
      window.map.getView().fit(wktShape.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
      window.map.getView().setZoom(18);
    } else if (result.WKTShape.indexOf("LINESTRING") !== -1 || result.WKTShape.indexOf("MULTILINESTRING") !== -1) {
      searchGeoLayer.setStyle(styles["poly"]);
      window.map.getView().fit(wktShape.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
      window.map.getView().setZoom(window.map.getView().getZoom() - 1);
    } else {
      searchGeoLayer.setStyle(styles["poly"]);
      window.map.getView().fit(wktShape.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
      window.map.getView().setZoom(window.map.getView().getZoom() - 2);
    }
  }

  // WHEN USER SELECTS ITEM
  onItemSelect(value, item) {
    // CLEAR PREVIOUS SOURCE
    searchGeoLayer.getSource().clear();

    // SET STATE CURRENT ITEM
    this.setState({ value, searchResults: [item] });
    if (item.LocationID == null) {
      // HANDLES GEOCODE RESULT

      // READ WKT
      const feature = this.getWKTFeature(item.WKTShape);

      // SET SOURCE
      searchGeoLayer.getSource().addFeature(feature);

      // SET STYLE
      searchGeoLayer.setStyle(styles["geocode"]);

      // ZOOM AND FLASH POINT
      //helpers.flashPoint(feature.getGeometry().getCoordinates(), 18);
      window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
      window.map.getView().setZoom(18);
    } else {
      // CALL API TO GET LOCATION DETAILS
      helpers.getJSON(searchInfoURL(item.LocationID), result => this.jsonCallback(result));
    }
  }

  cleanup() {
    // REMOVE FEATURES
    searchGeoLayer.getSource().clear();
    searchIconLayer.getSource().clear();

    // HIDE POPUP
    window.popup.hide();

    this.setState({ value: "" });
  }

  render() {
    // INIT LAYER
    this.initsearchLayers();

    return (
      <div>
        <Autocomplete
          tabIndex="1"
          inputProps={{ id: "sc-search-textbox", placeholder: "Search...", name: "sc-search-textbox" }}
          className="sc-search-textbox"
          wrapperStyle={{
            position: "relative",
            display: "inline-block",
            width: "100%",
            zIndex: "100000"
          }}
          value={this.state.value}
          items={this.state.searchResults}
          getItemValue={item => item.Name}
          onSelect={(value, item) => {
            this.onItemSelect(value, item);
          }}
          onChange={(event, value) => {
            this.setState({ value });
            if (value !== "") {
              this.setState({ iconInitialClass: "sc-search-icon-initial-hidden" });
              this.setState({ iconActiveClass: "sc-search-icon-active" });

              helpers.getJSON(searchURL(value), responseJson => this.setState({ searchResults: responseJson }));
            } else {
              this.setState({ iconInitialClass: "sc-search-icon-initial" });
              this.setState({ iconActiveClass: "sc-search-icon-active-hidden" });

              this.setState({ searchResults: [] });
            }
          }}
          renderMenu={children => <div className="sc-search-menu">{children}</div>}
          renderItem={(item, isHighlighted) => (
            <div className={isHighlighted ? "sc-search-item-highlighted" : "sc-search-item"} key={helpers.getUID()}>
              <div className="sc-search-item-left">
                <img src={require("./images/map-marker-light-blue.png")} alt="blue pin" />
              </div>
              <div className="sc-search-item-content">
                <Highlighter highlightClassName="sc-search-highlight-words" searchWords={[this.state.value]} textToHighlight={item.Name} />

                <div className="sc-search-item-sub-content">{" - " + item.Muni + " (" + item.Type + ")"}</div>
              </div>
            </div>
          )}
        />
        <img className={this.state.iconInitialClass} src={images["magnify.png"]} alt="search" />
        <img className={this.state.iconActiveClass} src={images["clear.png"]} alt="clear" onClick={this.cleanup} />
      </div>
    );
  }
}

export default Search;

class PopupContent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      copied: false,
      shareURL: this.getShareURL()
    };
  }

  getShareURL = value => {
    console.log(this.props.shareLocationId);
    //GET URL
    var url = window.location.href;

    //ADD LOCATIONID
    if (url.indexOf("?") > 0) url = url + "&LOCATIONID=" + this.props.shareLocationId;
    else url = url + "?LOCATIONID=" + this.props.shareLocationId;

    return url;
  };

  onShareClick = event => {
    this.setState({ copied: true });
    helpers.showMessage("Share", "Link has been copied to your clipboard.", "green", 2000);
  };

  render() {
    return (
      <div>
        <button className="sc-button sc-search-popup-content-button" onMouseUp={helpers.convertMouseUpToClick} onClick={this.props.removeMarkersClick}>
          Remove Markers
        </button>
        <button className="sc-button sc-search-popup-content-button" onMouseUp={helpers.convertMouseUpToClick} onClick={this.props.myMapsClick}>
          Add to My Maps
        </button>
        <CopyToClipboard text={this.state.shareURL}>
          <button className="sc-button sc-search-popup-content-button" onMouseUp={helpers.convertMouseUpToClick} onClick={this.onShareClick}>
            Share this Location
          </button>
        </CopyToClipboard>
        <button className="sc-button sc-search-popup-content-button" onMouseUp={helpers.convertMouseUpToClick} onClick={this.props.directionsClick}>
          Directions to Here
        </button>
      </div>
    );
  }
}
