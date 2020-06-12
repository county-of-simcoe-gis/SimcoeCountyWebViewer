import React, { Component } from "react";
import * as helpers from "../helpers/helpers";
import * as drawingHelpers from "../helpers/drawingHelpers";
import mainConfig from "../config.json";
import Autocomplete from "react-autocomplete";
import "./Search.css";
import Highlighter from "react-highlight-words";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source.js";
import { Fill, Icon, Stroke, Style, Circle as CircleStyle } from "ol/style.js";
import { transform } from "ol/proj.js";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Select from "react-select";


// URLS
const apiUrl = mainConfig.apiUrl;
const googleDirectionsURL = (lat, long) => `https://www.google.com/maps?saddr=My+Location&daddr=${lat},${long}`;
const searchURL = (apiUrl, searchText, type, limit) => `${apiUrl}async/search/?q=${searchText}&type=${type}&limit=${limit}`;
const searchInfoURL = (apiUrl, id) => `${apiUrl}searchById/${id}`;
const searchTypesURL = apiUrl => `${apiUrl}getSearchTypes`;

console.log(searchTypesURL(apiUrl));
// DEFAULT SEARCH LIMIT
const defaultSearchLimit = 10;

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
    this.storageKey = "Search History";
    // LISTEN FOR SEARCH FROM HISTORY
    window.emitter.addListener("searchHistorySelect", (item) => this.onHistoryItemSelect(item));
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());
this._isMounted = false;
    this.state = {
      value: "",
      searchResults: [],
      hover: false,
      iconInitialClass: "sc-search-icon-initial",
      iconActiveClass: "sc-search-icon-active-hidden",
      showMore: false,
      searchTypes: [],
      selectedType: ""
    };
  }

  requestTimer = null;

  onHistoryItemSelect = (item) => {
    let searchResults = [item];
    if (this.state.searchResults.length > 0) searchResults.push(this.state.searchResults);
    let value = (item.name.length > 25 ? item.name.substring(0, 25) : item.name);
    this.setState({ value:value, searchResults: searchResults},()=> {this.onItemSelect(item.value, item);});
  }
  onMapLoad = () => {
    // HANDLE URL PARAMETER
    if (locationId !== null) {
      // CALL API TO GET LOCATION DETAILS
      setTimeout(() => {
        helpers.getJSON(searchInfoURL(apiUrl, locationId), result => this.jsonCallback(result));
      }, 500);
    }
  };

  componentDidMount() {
    helpers.getJSON(searchTypesURL(apiUrl), result => {
      let items = [];
      items.push({ label: "All", value: "All" });
      result.forEach(type => {
        const obj = { label: type, value: type };
        items.push(obj);
      });
      items.push({ label: "Open Street Map", value: "Open Street Map" });
      items.push({ label: "Map Layer", value: "Map Layer" });
      items.push({ label: "Tool", value: "Tool" });
     
      this.setState({ searchTypes: items, selectedType: items[0] });
    });

    // PATCH TO CLOSE MENU WHEN MAP IS CLICKED
    this.clickEvent = document.body.addEventListener(
      "click",
      evt => {
        if (document.activeElement.id !== "sc-search-textbox") return;

        if (typeof evt.target.className === "string") {
          evt.target.className.split(" ").forEach(className => {
            if (className === "ol-overlaycontainer-stopevent") {
              document.getElementById("map").focus();
            }
          });
        }
      },
      true
    );
  }

  onTypeDropDownChange = selectedType => {
    this.setState({ selectedType: selectedType }, async () => {
      let limit = defaultSearchLimit;
      if (this.state.showMore) limit = 50;
      await helpers.getJSONWait(searchURL(apiUrl, this.state.value, this.state.selectedType.value, limit), responseJson => {
        if (responseJson !== undefined) this.setState({ searchResults: responseJson });
        else this.setState({ searchResults: [] });
      });
    });

    helpers.addAppStat("Search Type DropDown", selectedType.value);
  };

  removeMarkersClick() {
    this.cleanup();
  }

  myMapsClick = evt => {
    const result = this.state.searchResults[0];
    if (searchIconLayer.getSource().getFeatures()[0] === undefined) return;
    // ADD MYMAPS
    if (searchGeoLayer.getSource().getFeatures().length === 0) window.emitter.emit("addMyMapsFeature", searchIconLayer.getSource().getFeatures()[0], result.Name);
    else window.emitter.emit("addMyMapsFeature", searchGeoLayer.getSource().getFeatures()[0], result.Name);

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
        }),
        zIndex: 100000
      });
      searchGeoLayer.set("name", "sc-search-geo");
      window.map.addLayer(searchGeoLayer);

      // HOLDS CENTROID (CLICKABLE)
      searchIconLayer = new VectorLayer({
        source: new VectorSource({
          features: []
        }),
        zIndex: 100000
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
              feature={feature}
              removeMarkersClick={this.removeMarkersClick}
              myMapsClick={this.myMapsClick}
              shareLocationId={this.state.searchResults[0].id}
              directionsClick={evt => this.directionsClick(evt)}
            />,
            "Actions"
          );
        }
      });
    }
  }

  jsonCallback(result) {
    helpers.appendToStorage(this.storageKey, result, 25);
    //this.saveStateToStorage(result);

    // EMTI SEARCH COMPLETE
    window.emitter.emit("searchComplete", result);

    this.initsearchLayers();

    // SET STATE CURRENT ITEM
    //this.setState({ searchResults: [result] });

    //CHECK FOR ASSOCIATED LAYERS
    if (result.layers !== undefined && result.layers !== null){
      let assocLayers = result.layers.toLowerCase().split(",");
      if (assocLayers.length>0){
        Object.entries(window.allLayers).forEach(row => {
          const layerItems = row[1];
          const currentLayers = layerItems.filter(layer => {return assocLayers.includes(layer.name.toLowerCase())});
          if(currentLayers !== undefined && currentLayers.length > 0) {
            window.emitter.emit("activeTocLayerGroup", currentLayers[0].group, () => {
              currentLayers.forEach(layer =>{
                  window.emitter.emit("activeTocLayer", { fullName:layer.name, name:layer.displayName,isVisible: layer.layer.getVisible(),layerGroupName:layer.groupName , layerGroup: layer.group, index: layer.index });
              });
            });
          }
        });
      }
    }

    // GET GEOJSON VALUES
    const fullFeature = helpers.getFeatureFromGeoJSON(result.geojson);
    let pointFeature = helpers.getFeatureFromGeoJSON(result.geojson_point);
    pointFeature.setProperties({ isPlaceOrGeocode: false });

    // SET SOURCE
    searchGeoLayer.getSource().addFeature(fullFeature);
    searchIconLayer.getSource().addFeature(pointFeature);

    //searchGeoLayer.setZIndex(100);
    //searchIconLayer.setZIndex(100);

    // SET STYLE AND ZOOM
    if (result.geojson.indexOf("Point") !== -1) {
      searchGeoLayer.setStyle(styles["point"]);
      window.map.getView().fit(fullFeature.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
      window.map.getView().setZoom(18);
    } else if (result.geojson.indexOf("Line") !== -1) {
      searchGeoLayer.setStyle(styles["poly"]);
      window.map.getView().fit(fullFeature.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
      window.map.getView().setZoom(window.map.getView().getZoom() - 2);
    } else {
      searchGeoLayer.setStyle(styles["poly"]);
      window.map.getView().fit(fullFeature.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
      window.map.getView().setZoom(window.map.getView().getZoom() - 2);
    }

    if (result.geojson.indexOf("Point") !== -1) {
      const pointStyle = new Style({
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: [0, 0, 0, 1],
            width: 2
          }),
          fill: new Fill({
            color: [250, 40, 255, 1]
          })
        })
      });

      fullFeature.setStyle(pointStyle);
    } else {
      let defaultStyle = drawingHelpers.getDefaultDrawStyle([102, 255, 102, 0.3], false, 6, fullFeature.getGeometry().getType());
      defaultStyle.setFill(new Fill({ color: [102, 255, 102, 0.3] }));
      fullFeature.setStyle(defaultStyle);
    }
  }

  // WHEN USER SELECTS ITEM
  onItemSelect(value, item) {
    if (item.type === "Map Layer") {
      if(item.isVisible){
        window.emitter.emit("deactiveTocLayer", Object.assign({}, item, { isVisible:  !item.isVisible }),(isActive)=>{
          if (isActive) return;
          item.isVisible = isActive;
          item.imageName =  "layers.png";
          item.title = "Click to Activate";
          item.className = undefined;
          window.emitter.emit("updateActiveTocLayers", item.layerGroup);
        });
       
      }else{
        window.emitter.emit("activeTocLayer",  Object.assign({}, item, { isVisible:  !item.isVisible }), (isActive)=>{
          if (!isActive) return;
          item.isVisible = isActive;
          item.imageName =  "layers-visible.png";
          item.title = "Click to Deactivate";
          item.className = 'sc-search-layer-deactivate';
          window.emitter.emit("updateActiveTocLayers", item.layerGroup);
          window.emitter.emit("activeTocLayerGroup", item.layerGroup, () => {});
        });
      }
      
      return;
    }
    

    if (item.type === "Tool") {
      window.emitter.emit("activateTab", "tools");
      window.emitter.emit("activateSidebarItem", item.name, "tools");
      return;
    }

   

    // CLEAR PREVIOUS SOURCE
    searchGeoLayer.getSource().clear();

    // SET STATE CURRENT ITEM
    //this.setState({ value, searchResults: [item] });
    if (item.place_id !== undefined || item.id === null) {
      this.initsearchLayers();

      // SET STATE CURRENT ITEM
      //this.setState({ searchResults: [item] });

      // HANDLE OSM RESULT
      let coords = [];
      let feature = null;
      if (item.place_id !== undefined) {
        coords = helpers.toWebMercatorFromLatLong([item.x, Math.abs(item.y)]);
        feature = new Feature(new Point(coords));
      } else feature = new Feature(new Point([item.x, item.y]));

      feature.setProperties({ isPlaceOrGeocode: true });

      // SET SOURCE
      searchIconLayer.getSource().addFeature(feature);

    // searchGeoLayer.setZIndex(100);
    // searchIconLayer.setZIndex(100);

      // SET STYLE AND ZOOM
      searchGeoLayer.setStyle(styles["point"]);
      window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
      window.map.getView().setZoom(18);
    } else {
      // CALL API TO GET LOCATION DETAILS
      helpers.getJSON(searchInfoURL(apiUrl, item.id), result => this.jsonCallback(result));
    }
  }

  cleanup() {
    // REMOVE FEATURES
    searchGeoLayer.getSource().clear();
    searchIconLayer.getSource().clear();

    // HIDE POPUP
    window.popup.hide();

    this.setState({ value: "", searchResults:[] });
  }

  onMoreOptionsClick = evt => {
    this.setState(
      prevState => ({
        showMore: !prevState.showMore
      }),
      async () => {
        let limit = defaultSearchLimit;
        if (this.state.showMore) limit = 50;
        await helpers.getJSONWait(searchURL(apiUrl, this.state.value, this.state.selectedType.value, limit), responseJson => {
          if (responseJson !== undefined) this.searchResultsHandler(responseJson, limit);
          else this.searchResultsHandler(responseJson, limit);
        });
      }
    );

    helpers.addAppStat("Search More Button", "Click");
  };

  searchLayers = () => {};

  searchResultsHandler = (results, limit) => {
    let newResults = Object.assign([], results);
    if (this.state.value.length < 2) {
      this.setState({ searchResults: [] });
      return;
    }
    const selectedType = this.state.selectedType.value;

    // SET IMAGE NAME
    newResults.forEach(layer => {
      layer.imageName = "map-marker-light-blue.png";
    });

    // SEARCH LAYERS
    if (selectedType === "All" || selectedType === "Map Layer") {
      let layers = [];
      // eslint-disable-next-line
      Object.entries(window.allLayers).map(row => {
        const layerItems = row[1];
        layerItems.forEach(layer => {
          if (layer.displayName.toUpperCase().indexOf(this.state.value.toUpperCase()) >= 0 || layer.groupName.toUpperCase().indexOf(this.state.value.toUpperCase()) >= 0) {
            //console.log(layer);
            let currentLayer = { fullName:layer.name, name:layer.displayName,title: "Click to Activate",isVisible: layer.layer.getVisible(), type: "Map Layer", layerGroupName:layer.groupName , layerGroup: layer.group, imageName: "layers.png", index: layer.index };
            if (currentLayer.isVisible) {
              currentLayer.imageName =  "layers-visible.png"
              currentLayer.title = "Click to Deactivate";
            }
          
            layers.push(currentLayer);
          }
        });
      });
      newResults = layers.concat(newResults);
    }

    // TOOLS
    if (selectedType === "All" || selectedType === "Tool") {
      let tools = [];
      // eslint-disable-next-line
      mainConfig.sidebarToolComponents.forEach(tool => {
        if (tool.name.toUpperCase().indexOf(this.state.value.toUpperCase()) >= 0) {
          tools.push({ name: helpers.replaceAllInString(tool.name, "_", " "), type: "Tool", imageName: "tools.png" });
        }
      });
      newResults = tools.concat(newResults);
    }

    this.setState({ searchResults: newResults });
  };

  

  render() {
    // INIT LAYER
    this.initsearchLayers();

    let dropDownWidth = 50;
    if (this.state.selectedType !== "") dropDownWidth = dropDownWidth + this.state.selectedType.label.length * 9;

    if (this.autoCompleteRef !== undefined) {
      const el = document.getElementById("sc-search-textbox");
      el.setAttribute("style", "padding-left: " + (dropDownWidth + 5) + "px");
    }

    const groupsDropDownStyles = {
      control: provided => ({
        ...provided,
        minHeight: "38px",
        // width: "150px"
        width: dropDownWidth + "px",
        borderRadius: "unset",
        borderBottom: "none"
      }),
      indicatorsContainer: provided => ({
        ...provided,
        height: "38px"
      }),
      clearIndicator: provided => ({
        ...provided,
        padding: "5px"
      }),
      dropdownIndicator: provided => ({
        ...provided,
        padding: "5px"
      }),
      menu: provided => ({
        ...provided,
        width: "200px"
      }),
      container: provided => ({
        ...provided,
        width: "100%"
      })
    };

    return (
      <div>
        <div className="sc-search-types-container" tabIndex="-1">
          <Select tabIndex="-1" styles={groupsDropDownStyles} isSearchable={false} onChange={this.onTypeDropDownChange} options={this.state.searchTypes} value={this.state.selectedType} />
        </div>

        <Autocomplete
          ref={el => (this.autoCompleteRef = el)}
          inputProps={{
            id: "sc-search-textbox",
            tabIndex: "1",
            placeholder: "Search...",
            name: "sc-search-textbox",
            onFocus: result => {
              helpers.disableKeyboardEvents(true);
            },
            onBlur: result => {
              helpers.disableKeyboardEvents(false);
            }
          }}
          className="sc-search-textbox"
          wrapperStyle={{
            position: "relative",
            display: "inline-block",
            width: "100%",
            zIndex: "100000"
          }}
          value={this.state.value}
          items={this.state.searchResults}
          getItemValue={item => item.name}
          onSelect={(value, item) => {
            this.onItemSelect(value, item);
          }}
          onChange={async (event, value) => {

            if (value !== "") {
              this.setState({value, iconInitialClass: "sc-search-icon-initial-hidden",iconActiveClass: "sc-search-icon-active" });

              let limit = defaultSearchLimit;
              if (this.state.showMore) limit = 50;
              await helpers.getJSONWait(searchURL(apiUrl, value, this.state.selectedType.value, limit), responseJson => {
                if (responseJson !== undefined) this.searchResultsHandler(responseJson, defaultSearchLimit);
              });
            } else {
              this.setState({value, iconInitialClass: "sc-search-icon-initial",iconActiveClass: "sc-search-icon-active-hidden",searchResults: [] });
            }
          }}
          renderMenu={children => (
            <div>
              <div className={this.state.showMore && this.state.searchResults.length > 9 ? "sc-search-menu sc-search-menu-scrollable" : "sc-search-menu"}>{children}</div>
              <MoreOptions numResults={this.state.searchResults.length} onMoreOptionsClick={this.onMoreOptionsClick} showMore={this.state.showMore}></MoreOptions>
            </div>
          )}
          renderItem={(item, isHighlighted) => {
            let itemName = item.name !== undefined? item.name:"";
            let descriptionText = (item.description !== undefined && item.description !== null && item.description !== "" )?item.description:"";
            let typeText = "Unknown";
            if (item.type === "Map Layer"){
              typeText = item.type  + ' - ' + item.layerGroupName ;
              if (item.isVisible) item.className = 'sc-search-layer-deactivate';
            } 
            else if (item.type === "Tool" ) typeText = item.type;
            else typeText = " (" + item.type + ")";
            return (
              <div className={(isHighlighted ? "sc-search-item-highlighted" : "sc-search-item") + (item.className !== undefined?" " + item.className:"")} key={helpers.getUID()} title={item.title}>
                <div className="sc-search-item-left">
                  <img src={item.imageName === undefined ? images["map-marker-light-blue.png"] : images[item.imageName]} alt="blue pin" />
                </div>
                <div className="sc-search-item-content">
                  <Highlighter highlightClassName="sc-search-highlight-words" searchWords={[this.state.value]} textToHighlight={itemName} />
                  <div className="sc-search-item-sub-content">{descriptionText  + typeText }</div>
                </div>
              </div>
            );
          }}
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

    this.isPlaceOrGeocode = this.props.feature.get("isPlaceOrGeocode");
  }

  getShareURL = value => {
    //GET URL
    var url = window.location.href;

    //ADD LOCATIONID
    if (url.indexOf("?") > 0) url = url + "&LOCATIONID=" + this.props.shareLocationId;
    else url = url + "?LOCATIONID=" + this.props.shareLocationId;

    return url;
  };

  onShareClick = event => {
    this.setState({ copied: true });
    helpers.showMessage("Share", "Link has been copied to your clipboard.", helpers.messageColors.green, 2000);
  };

  render() {
    return (
      <div>
        <button className="sc-button sc-search-popup-content-button" onClick={this.props.removeMarkersClick}>
          Remove Markers
        </button>
        <button className="sc-button sc-search-popup-content-button" onClick={this.props.myMapsClick}>
          Add to My Maps
        </button>
        <CopyToClipboard text={this.state.shareURL}>
          <button className={this.isPlaceOrGeocode ? "sc-hidden" : "sc-button sc-search-popup-content-button"} onClick={this.onShareClick}>
            Share this Location
          </button>
        </CopyToClipboard>
        <button className="sc-button sc-search-popup-content-button" onClick={this.props.directionsClick}>
          Directions to Here
        </button>
      </div>
    );
  }
}

const MoreOptions = props => {
  return (
    <div className={props.numResults > 9 ? "sc-search-menu-options" : "sc-hidden"}>
      <button className="sc-button sc-search-more-options-button" onClick={props.onMoreOptionsClick}>
        {props.showMore ? "Show Less" : "Show More"}
      </button>
    </div>
  );
};
