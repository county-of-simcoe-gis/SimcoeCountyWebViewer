import React, { useEffect, useState, useRef } from "react";
import * as helpers from "../helpers/helpers";
import * as drawingHelpers from "../helpers/drawingHelpers";
import TextField from "@mui/material/TextField";

import { Autocomplete as MUIAutocomplete } from "@mui/material";
import { MdCancel } from "react-icons/md";
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
// import { set } from "ol/transform";

// URLS
const googleDirectionsURL = (lat, long) => `https://www.google.com/maps?saddr=Current+Location&daddr=${lat},${long}`;
const searchURL = (apiUrl, searchText, type, muni, limit) => `${apiUrl}public/search?q=${searchText}&type=${type}&muni=${muni}&limit=${limit}`;
const searchInfoURL = (apiUrl, locationID) => `${apiUrl}public/search/${locationID}`;
const searchTypesURL = (apiUrl) => `${apiUrl}public/search/types`;

// DEFAULT SEARCH LIMIT
const defaultSearchLimit = 10;

// LOCATION ID (FROM SEARCH)
const locationId = helpers.getURLParameter("LOCATIONID", false, true);

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}

const Search = (props) => {
  // const autoCompleteRef = useRef();
  const [value, setValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [iconInitialClass, setIconInitialClass] = useState("sc-search-icon-initial");
  const [iconActiveClass, setIconActiveClass] = useState("sc-search-icon-active-hidden");
  const [showMore, setShowMore] = useState(false);
  const [searchTypes, setSearchTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [municipality, setMunicipality] = useState(undefined);
  const [placeHolderText, setPlaceHolderText] = useState("Search...");
  const [hideTypeDropDown, setHideTypeDropDown] = useState(false);
  const searchResultsRef = useRef([]);
  // VECTOR LAYERS
  const searchGeoLayerRef = useRef(null);
  const searchIconLayerRef = useRef(null);
  const groupsDropDownStyles = useRef({
    control: (provided) => ({
      ...provided,
      minHeight: "38px",
      // width: "150px"
      width: "50px",
      border: "none",
      boxShadow: "none",
      background: "transparent",
      backgroundColor: "unset",
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: "38px",
    }),
    clearIndicator: (provided) => ({
      ...provided,
      padding: "5px",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "5px",
    }),
    menu: (provided) => ({
      ...provided,
      width: "200px",
    }),
    container: (provided) => ({
      ...provided,
      width: "100%",
    }),
  });
  const styles = {
    poly: new Style({
      stroke: new Stroke({
        width: 4,
        color: [255, 0, 0, 0.8],
      }),
    }),
    point: new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: images["map-marker.png"],
      }),
    }),
    geocode: new Style({
      image: new CircleStyle({
        opacity: 0.5,
        radius: 7,
        fill: new Fill({ color: [236, 156, 155, 0.7] }),
      }),
    }),
  };
  const apiUrlRef = useRef(window.config.apiUrl);
  const [storageKey, setStorageKey] = useState("");
  useEffect(() => {
    if (searchResults.length > 0) {
      searchResultsRef.current = searchResults;
    }
  }, [searchResults]);
  useEffect(() => {
    // LISTEN FOR MAP TO MOUNT
    const mapParametersCompleteListener = () => onMapLoad();
    window.emitter.addListener("mapParametersComplete", mapParametersCompleteListener);
    // LISTEN FOR SEARCH FROM HISTORY
    const searchHistorySelectListener = (item) => onHistoryItemSelect(item);
    window.emitter.addListener("searchHistorySelect", searchHistorySelectListener);
    // LISTEN FOR INITIAL SEARCH
    const tocLoadedListener = () => onInitialSearch();
    window.emitter.addListener("tocLoaded", tocLoadedListener);
    // LISTEN FOR EXTERNAL COMPONENT SEARCH
    const searchItemListener = (searchType, searchText, hidden = false, timeout = undefined) => onSearch(searchType, searchText, hidden, timeout);
    window.emitter.addListener("searchItem", searchItemListener);
    // PATCH TO CLOSE MENU WHEN MAP IS CLICKED
    const clickEvent = document.body.addEventListener(
      "click",
      (evt) => {
        if (document.activeElement.id !== "sc-search-textbox") return;

        if (typeof evt.target.className === "string") {
          evt.target.className.split(" ").forEach((className) => {
            if (className === "ol-overlaycontainer-stopevent") {
              document.getElementById("map").focus();
            }
          });
        }
      },
      true
    );
    helpers.waitForLoad(["map", "settings"], Date.now(), 30, () => {
      let muni = window.config.municipality;
      if (!muni) {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        muni = urlParams.get("MUNI");
      }
      if (muni) setMunicipality(muni);
      apiUrlRef.current = window.config.apiUrl;
      setStorageKey(window.config.storageKeys.SearchHistory);
      if (window.config.search) {
        if (window.config.search.placeHolder !== undefined) setPlaceHolderText(window.config.search.placeHolder);
        if (window.config.search.hideTypes !== undefined) setHideTypeDropDown(window.config.search.hideTypes);
      }
      helpers.getJSON(searchTypesURL(apiUrlRef.current), (result) => {
        let items = [];
        items.push({ label: "All", value: "All" });
        result.forEach((type) => {
          const obj = { label: type, value: type };
          items.push(obj);
        });
        items.push({ label: "Open Street Map", value: "Open Street Map" });
        items.push({ label: "Map Layer", value: "Map Layer" });
        items.push({ label: "Tool", value: "Tool" });
        items.push({ label: "Theme", value: "Theme" });
        setSearchTypes(items);
        setSelectedType(items[0]);
      });
    });
    return () => {
      document.body.removeEventListener("click", clickEvent);
      window.emitter.removeListener("mapParametersComplete", mapParametersCompleteListener);
      window.emitter.removeListener("searchHistorySelect", searchHistorySelectListener);
      window.emitter.removeListener("tocLoaded", tocLoadedListener);
      window.emitter.removeListener("searchItem", searchItemListener);

      // mapParametersCompleteListener.remove();
      // searchHistorySelectListener.remove();
      // tocLoadedListener.remove();
      // searchItemListener.remove();
    };
  }, []);

  const onMapLoad = () => {
    helpers.waitForLoad(["map", "settings"], Date.now(), 30, () => {
      // HANDLE URL PARAMETER
      if (locationId !== null) {
        // CALL API TO GET LOCATION DETAILS
        helpers.getJSON(searchInfoURL(apiUrlRef.current, locationId), (result) => jsonCallback(result));
      }
    });
  };

  const onHistoryItemSelect = (item) => {
    let searchResultsHistory = [item];
    if (searchResults.length > 0) searchResultsHistory.push(searchResults);
    let currentValue = item.name.length > 25 ? item.name.substring(0, 25) : item.name;
    setValue(currentValue);
    setSearchResults(searchResultsHistory);
    onItemSelect(currentValue, item);
  };

  const onInitialSearch = (search_type = undefined, search = undefined) => {
    // GET SEARCH URL PARAMETERS
    if (!search) search = helpers.getURLParameter("q", true, true);
    if (!search_type) search_type = helpers.getURLParameter("qt", true, true);
    if (!search && search === null) return;
    if (!search_type && search_type === null) {
      search_type = "All";
    }
    onSearch(search_type, search);
  };

  const onSearch = (search_type = undefined, search = undefined, hidden = false, timeout = undefined) => {
    if (!search && search === null) return;
    if (!search_type && search_type === null) {
      search_type = "All";
    }
    if (!hidden) {
      setValue(search);
      setSelectedType({ label: search_type, value: search_type });
    }
    helpers.waitForLoad(["map", "settings"], Date.now(), 30, () => {
      helpers.getJSON(encodeURI(searchURL(apiUrlRef.current, search, search_type, municipality, 1)), (responseJson) => {
        if (responseJson[0] !== undefined && responseJson[0].location_id !== null && responseJson[0].location_id !== undefined) {
          helpers.getJSON(searchInfoURL(apiUrlRef.current, responseJson[0].location_id), (result) => jsonCallback(result, hidden, timeout));
        }
      });
    });
  };
  useEffect(() => {
    let limit = 100;

    // let limit = defaultSearchLimit;
    // if (showMore) limit = 50;
    helpers.waitForLoad(["map", "settings"], Date.now(), 30, () => {
      helpers.getJSON(searchURL(apiUrlRef.current, value, selectedType.value, municipality, limit), (responseJson) => {
        if (responseJson !== undefined) searchResultsHandler(responseJson, limit);
        // if (responseJson !== undefined) setSearchResults(responseJson);
        // else setSearchResults([]);
      });
    });
  }, [selectedType]);

  const onTypeDropDownChange = (selectedType) => {
    setSelectedType(selectedType);
    helpers.addAppStat("Search Type DropDown", selectedType.value);
  };

  const removeMarkersClick = () => {
    cleanup();
  };

  const myMapsClick = (evt) => {
    helpers.waitForLoad("map", Date.now(), 30, () => {
      const result = searchResultsRef.current[0];
      if (searchIconLayerRef.current.getSource().getFeatures()[0] === undefined) return;
      // ADD MYMAPS
      if (searchGeoLayerRef.current.getSource().getFeatures().length === 0) window.emitter.emit("addMyMapsFeature", searchIconLayerRef.current.getSource().getFeatures()[0], result.name);
      else window.emitter.emit("addMyMapsFeature", searchGeoLayerRef.current.getSource().getFeatures()[0], result.name);

      // CLEAN UP
      cleanup();
    });
  };

  const directionsClick = (evt) => {
    // GET CURRENT FEATURE
    var coords = undefined;

    if (searchIconLayerRef.current.getSource().getFeatures()[0] === undefined) return;
    if (searchGeoLayerRef.current.getSource().getFeatures()[0]) coords = searchIconLayerRef.current.getSource().getFeatures()[0].getGeometry().getCoordinates();

    // CONVER TO LAT LONG
    var latLongCoords = transform(coords, "EPSG:3857", "EPSG:4326");

    // OPEN GOOGLE DIRECTIONS
    var url = googleDirectionsURL(latLongCoords[1], latLongCoords[0]);
    window.open(url, "_blank");
  };

  // INIT SEARCH LAYERS
  const initsearchLayers = () => {
    if (window.map != null && searchGeoLayerRef.current == null) {
      // HOLDS LINES AND POLYS
      searchGeoLayerRef.current = new VectorLayer({
        source: new VectorSource({
          features: [],
        }),
        zIndex: 1000,
      });
      searchGeoLayerRef.current.set("name", "sc-search-geo");
      window.map.addLayer(searchGeoLayerRef.current);

      // HOLDS CENTROID (CLICKABLE)
      searchIconLayerRef.current = new VectorLayer({
        source: new VectorSource({
          features: [],
        }),
        zIndex: 1000,
      });
      searchIconLayerRef.current.setStyle(styles["point"]);
      searchIconLayerRef.current.set("name", "sc-search-icon");
      searchIconLayerRef.current.set("disableParcelClick", true);
      window.map.addLayer(searchIconLayerRef.current);

      window.map.on("singleclick", (evt) => {
        var feature = window.map.forEachFeatureAtPixel(
          evt.pixel,
          function (feature, layer) {
            return feature;
          },
          {
            layerFilter: function (layer) {
              return layer.get("name") === "sc-search-icon";
            },
          }
        );

        if (feature !== undefined) {
          window.popup.show(
            evt.coordinate,
            <PopupContent
              key={helpers.getUID()}
              feature={feature}
              removeMarkersClick={removeMarkersClick}
              myMapsClick={myMapsClick}
              shareLocationId={searchResultsRef.current[0].location_id}
              directionsClick={(evt) => directionsClick(evt)}
            />,
            "Actions"
          );
        }
      });
    }
  };

  const jsonCallback = (result, hidden = false, timeout = undefined) => {
    if (!hidden) {
      const savedResult = Object.assign({}, result);
      delete savedResult["geojson"];
      helpers.appendToStorage(storageKey, savedResult, 25);
    }

    // EMTI SEARCH COMPLETE
    window.emitter.emit("searchComplete", result);

    initsearchLayers();
    // CLEAR PREVIOUS SOURCE
    searchGeoLayerRef.current.getSource().clear();
    searchIconLayerRef.current.getSource().clear();
    // SET STATE CURRENT ITEM - this item is not needed for either Option for searchBarValueChangeOnClick
    // if (!hidden) this.setState({ searchResults: [result] });

    //CHECK FOR ASSOCIATED LAYERS
    if (result.assoc_layers !== undefined && result.assoc_layers !== null && window.config.searchResultLayerActivate === true) {
      let assocLayers = result.assoc_layers.split(",");
      //console.log (assocLayers);
      if (assocLayers.length > 0) {
        assocLayers.forEach((assocLayer) => {
          if (assocLayer.split("@")[0] !== undefined && assocLayer.split("@")[0] !== null && assocLayer.split("@")[1] !== undefined && assocLayer.split("@")[1] !== null) {
            let item = { fullName: assocLayer.split("@")[0], layerGroup: assocLayer.split("@")[1], itemAction: "Activate" };
            //console.log ( assocLayer.split("@")[0])
            let emmiting = false;
            window.emitter.emit("activeTocLayerGroup", item.layerGroup, () => {
              if (!emmiting) window.emitter.emit("activeTocLayer", item);
              emmiting = true;
            });
          }
        });
      }
    }
    // GET GEOJSON VALUES
    const fullFeature = helpers.getFeatureFromGeoJSON(result.geojson);
    let pointFeature = helpers.getFeatureFromGeoJSON(result.geojson_point);
    pointFeature.setProperties({ isPlaceOrGeocode: false });

    if (!hidden) {
      // SET SOURCE
      fullFeature.setProperties({
        label: result.alias ? result.alias : result.name,
        name: result.name,
        is_open_data: result.is_open_data !== undefined && result.is_open_data !== null ? result.is_open_data : true,
      });
      pointFeature.setProperties({
        label: result.alias ? result.alias : result.name,
        name: result.name,
        is_open_data: result.is_open_data !== undefined && result.is_open_data !== null ? result.is_open_data : true,
      });

      searchGeoLayerRef.current.getSource().addFeature(fullFeature);
      searchIconLayerRef.current.getSource().addFeature(pointFeature);

      searchGeoLayerRef.current.setZIndex(300);
      searchIconLayerRef.current.setZIndex(300);
    } else if (hidden && timeout) {
      // SET SOURCE
      fullFeature.setProperties({
        label: result.alias ? result.alias : result.name,
        name: result.name,
        is_open_data: result.is_open_data !== undefined && result.is_open_data !== null ? result.is_open_data : true,
      });
      searchGeoLayerRef.current.getSource().addFeature(fullFeature);
      searchGeoLayerRef.current.setZIndex(300);
      setTimeout(() => {
        searchGeoLayerRef.current.getSource().clear();
      }, timeout);
    }

    const zoomFactor = window.config.featureHighlitStyles && window.config.featureHighlitStyles["zoomFactor"] >= 0 ? window.config.featureHighlitStyles["zoomFactor"] : 1;
    if (result.geojson.indexOf("Point") !== -1) {
      searchGeoLayerRef.current.setStyle(styles["point"]);
      window.map.getView().fit(fullFeature.getGeometry().getExtent(), window.map.getSize(), {
        duration: 1000,
      });
      window.map.getView().setZoom(19 - zoomFactor);
    } else if (result.geojson.indexOf("Line") !== -1) {
      searchGeoLayerRef.current.setStyle(styles["poly"]);
      window.map.getView().fit(fullFeature.getGeometry().getExtent(), window.map.getSize(), {
        duration: 1000,
      });
      window.map.getView().setZoom(window.map.getView().getZoom() - zoomFactor);
    } else {
      searchGeoLayerRef.current.setStyle(styles["poly"]);
      window.map.getView().fit(fullFeature.getGeometry().getExtent(), window.map.getSize(), {
        duration: 1000,
      });
      window.map.getView().setZoom(window.map.getView().getZoom() - zoomFactor);
    }

    if (result.geojson.indexOf("Point") !== -1) {
      const pointStyle = new Style({
        image: new CircleStyle({
          radius:
            window.config.featureHighlitStyles && window.config.featureHighlitStyles["circleRadius"] !== null && window.config.featureHighlitStyles["circleRadius"] !== undefined
              ? window.config.featureHighlitStyles["circleRadius"]
              : 5,
          stroke: new Stroke({
            color:
              window.config.featureHighlitStyles && window.config.featureHighlitStyles["circleStroke"] !== null && window.config.featureHighlitStyles["circleStroke"] !== undefined
                ? window.config.featureHighlitStyles["circleStroke"]
                : [0, 0, 0, 1],
            width:
              window.config.featureHighlitStyles && window.config.featureHighlitStyles["circleStrokeWidth"] !== null && window.config.featureHighlitStyles["circleStrokeWidth"] !== undefined
                ? window.config.featureHighlitStyles["circleStrokeWidth"]
                : 2,
          }),
          fill: new Fill({
            color:
              window.config.featureHighlitStyles && window.config.featureHighlitStyles["circleFill"] !== null && window.config.featureHighlitStyles["circleFill"] !== undefined
                ? window.config.featureHighlitStyles["circleFill"]
                : [250, 40, 255, 1],
          }),
        }),
      });

      fullFeature.setStyle(pointStyle);
    } else {
      let defaultStyle = drawingHelpers.getDefaultDrawStyle({
        drawColor:
          window.config.featureHighlitStyles && window.config.featureHighlitStyles["stroke"] !== null && window.config.featureHighlitStyles["stroke"] !== undefined
            ? window.config.featureHighlitStyles["stroke"]
            : [255, 0, 0, 0.8],
        isText: false,
        strokeWidth: window.config.featureHighlitStyles && window.config.featureHighlitStyles["strokeWidth"] ? window.config.featureHighlitStyles["strokeWidth"] : 2,
        pointType: fullFeature.getGeometry().getType(),
      });
      defaultStyle.setFill(
        new Fill({
          color:
            window.config.featureHighlitStyles && window.config.featureHighlitStyles["fill"] !== null && window.config.featureHighlitStyles["fill"] !== undefined
              ? window.config.featureHighlitStyles["fill"]
              : [255, 0, 0, 0],
        })
      );
      fullFeature.setStyle(defaultStyle);
    }
  };

  // WHEN USER SELECTS ITEM
  const onItemSelect = (selectedValue, item) => {
    // console.log("onItemSelect", selectedValue, item);
    if (item.type === "Map Layer") {
      let emmiting = false;
      window.emitter.emit("activeTocLayerGroup", item.layerGroup, () => {
        if (!emmiting) window.emitter.emit("activeTocLayer", item);
        emmiting = true;
      });
      return;
    }

    if (item.type === "Tool") {
      window.emitter.emit("activateTab", "tools");
      window.emitter.emit("activateSidebarItem", item.name, "tools");
      return;
    }

    if (item.type === "Theme") {
      window.emitter.emit("activateTab", "themes");
      window.emitter.emit("activateSidebarItem", item.name, "themes");
      return;
    }

    // CLEAR PREVIOUS SOURCE
    searchGeoLayerRef.current.getSource().clear();
    searchIconLayerRef.current.getSource().clear();

    // SET STATE CURRENT ITEM
    const searchBarValueChangeOnClick = window.config.searchBarValueChangeOnClick;

    if (searchBarValueChangeOnClick !== false) {
      setValue(selectedValue);
      setSearchResults([item]);
    }

    if (item.place_id !== undefined || item.location_id == null) {
      initsearchLayers();

      // SET STATE CURRENT ITEM
      setSearchResults([item]);

      // HANDLE OSM RESULT
      let coords = [];
      let feature = null;
      if (item.place_id !== undefined) {
        coords = helpers.toWebMercatorFromLatLong([item.x, Math.abs(item.y)]);
        feature = new Feature(new Point(coords));
      } else feature = new Feature(new Point([item.x, item.y]));

      feature.setProperties({ isPlaceOrGeocode: true });

      // SET SOURCE
      searchIconLayerRef.current.getSource().addFeature(feature);

      searchGeoLayerRef.current.setZIndex(100);
      searchIconLayerRef.current.setZIndex(100);

      // SET STYLE AND ZOOM
      searchGeoLayerRef.current.setStyle(styles["point"]);
      window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize(), {
        duration: 1000,
      });
      window.map.getView().setZoom(18);
    } else {
      // CALL API TO GET LOCATION DETAILS
      helpers.getJSON(searchInfoURL(apiUrlRef.current, item.location_id), (result) => jsonCallback(result));
    }
  };

  const cleanup = () => {
    // REMOVE FEATURES
    searchGeoLayerRef.current.getSource().clear();
    searchIconLayerRef.current.getSource().clear();

    // HIDE POPUP
    window.popup.hide();

    setValue("");
  };

  useEffect(() => {
    let limit = defaultSearchLimit;
    if (showMore) limit = 50;
    helpers.waitForLoad(["map", "settings"], Date.now(), 30, () => {
      helpers.getJSON(searchURL(apiUrlRef.current, value, selectedType.value, municipality, limit), (responseJson) => {
        if (responseJson !== undefined) searchResultsHandler(responseJson, limit);
      });
    });
  }, [showMore]);

  const onMoreOptionsClick = (evt) => {
    setShowMore(!showMore);
    helpers.addAppStat("Search More Button", "Click");
  };

  const searchLayers = () => {};

  const searchResultsHandler = (results, limit) => {
    let newResults = Object.assign([], results);
    //get a distinct item based on location_id
    newResults = [...new Map(newResults.map((item) => [item["location_id"], item])).values()];
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    const selectedTypeValue = selectedType.value;

    // SET IMAGE NAME
    newResults.forEach((layer) => {
      layer.imageName = "map-marker-light-blue.png";
    });

    // SEARCH LAYERS
    if (selectedTypeValue === "All" || selectedTypeValue === "Map Layer") {
      let layers = [];
      const searchResultTOC_Actions = window.config.searchResultTOC_Actions !== undefined ? window.config.searchResultTOC_Actions.toLowerCase() : "Default";
      // eslint-disable-next-line
      window.emitter.emit("getLayerList", (groups) => {
        Object.entries(groups).forEach((row) => {
          const layerItems = row[1];
          layerItems.forEach((layer) => {
            if (layer.tocDisplayName !== undefined) {
              if (layer.tocDisplayName.toUpperCase().indexOf(value.toUpperCase()) >= 0) {
                //console.log(layer);
                layers.push({
                  fullName: layer.name,
                  name: layer.tocDisplayName,
                  type: "Map Layer",
                  layerGroupName: layer.groupName,
                  layerGroup: layer.group,
                  imageName: searchResultTOC_Actions === "advanced" && layer.visible ? "layers-visible.png" : "layers.png",
                  index: layer.index,
                });
              }
            }
          });
        });
      });
      newResults = layers.concat(newResults);
    }
    // console.log("searchResultsHandler", window.config);

    // TOOLS
    if (!(window.config.mainSidebarItems && window.config.mainSidebarItems["hideTools"] !== true))
      if ((selectedTypeValue === "All" || selectedTypeValue === "Tool") && window.config.sidebarToolComponents !== undefined) {
        let tools = [];
        // eslint-disable-next-line
        window.config.sidebarToolComponents.forEach((tool) => {
          if (tool.name.toUpperCase().indexOf(value.toUpperCase()) >= 0 && (tool.enabled === undefined || tool.enabled)) {
            tools.push({
              name: helpers.replaceAllInString(tool.name, "_", " "),
              type: "Tool",
              imageName: "tools.png",
            });
          }
        });
        newResults = tools.concat(newResults);
      }

    // THEMES
    if (!(window.config.mainSidebarItems && window.config.mainSidebarItems["hideThemes"] !== true))
      if ((selectedTypeValue === "All" || selectedTypeValue === "Theme") && window.config.sidebarThemeComponents !== undefined) {
        let themes = [];
        window.config.sidebarThemeComponents.forEach((theme) => {
          if (theme.name && theme.name.toUpperCase().indexOf(value.toUpperCase()) >= 0 && (theme.enabled === undefined || theme.enabled)) {
            themes.push({
              name: helpers.replaceAllInString(theme.name, "_", " "),
              type: "Theme",
              imageName: "themes.png",
            });
          }
        });
        newResults = themes.concat(newResults);
      }

    setSearchResults(newResults);
  };

  useEffect(() => {
    // INIT LAYER
    let currentDropDownWidth = 50;
    initsearchLayers();
    if (selectedType !== "") currentDropDownWidth = currentDropDownWidth + selectedType.label.length * 9;
    // if (autoCompleteRef.current !== undefined) {
    const el = document.getElementById("sc-search-textbox-mui");
    if (!hideTypeDropDown) el.setAttribute("style", "padding-left: " + (currentDropDownWidth + 5) + "px");
    else el.setAttribute("style", "padding-left: 5px");
    // }
    groupsDropDownStyles.current = {
      control: (provided) => ({
        ...provided,
        minHeight: "38px",
        // width: "150px"
        width: currentDropDownWidth + "px",
        border: "none",
        boxShadow: "none",
        background: "transparent",
        backgroundColor: "unset",
      }),
      indicatorsContainer: (provided) => ({
        ...provided,
        height: "38px",
      }),
      clearIndicator: (provided) => ({
        ...provided,
        padding: "5px",
      }),
      dropdownIndicator: (provided) => ({
        ...provided,
        padding: "5px",
      }),
      menu: (provided) => ({
        ...provided,
        width: "200px",
      }),
      container: (provided) => ({
        ...provided,
        width: "100%",
      }),
    };
  });

  const onChange = (event, value) => {
    // console.log("onChange", value);
    // CHECK FOR ILLEGAL CHARS
    if (value.indexOf("\\") !== -1) {
      return;
    }

    setValue(value);
  };

  useEffect(() => {
    if (value !== "") {
      setIconInitialClass("sc-search-icon-initial-hidden");
      setIconActiveClass("sc-search-icon-active");
      let limit = 100;
      // let limit = defaultSearchLimit;
      // if (showMore) limit = 50;
      helpers.waitForLoad(["map", "settings"], Date.now(), 30, () => {
        helpers.getJSON(searchURL(apiUrlRef.current, value, selectedType.value, municipality, limit), (responseJson) => {
          if (responseJson !== undefined) searchResultsHandler(responseJson, limit);

          // if (responseJson !== undefined) searchResultsHandler(responseJson, defaultSearchLimit);
        });
      });
    } else {
      setIconInitialClass("sc-search-icon-initial");
      setIconActiveClass("sc-search-icon-active-hidden");
      setSearchResults([]);
    }
  }, [value]);
  const handleRenderMenu = (children) => {
    return (
      <div>
        <div className={showMore && searchResults.length > 9 ? "sc-search-menu sc-search-menu-scrollable" : "sc-search-menu"}>{children}</div>
        <MoreOptions numResults={searchResults.length} onMoreOptionsClick={onMoreOptionsClick} showMore={showMore} />
      </div>
    );
  };
  const handleRenderItem = (item, isHighlighted) => {
    let type = "Unknown";
    if (item.type === "Map Layer") type = item.layerGroupName;
    else if (item.type === "Tool" || item.type === "Theme") type = "";
    else type = item.municipality;
    return (
      <div className={isHighlighted ? "sc-search-item-highlighted" : "sc-search-item"} key={helpers.getUID()}>
        <div className="sc-search-item-left">
          <img src={item.imageName === undefined ? images["map-marker-light-blue.png"] : images[item.imageName]} alt="blue pin" />
        </div>
        <div className="sc-search-item-content">
          <Highlighter highlightClassName="sc-search-highlight-words" searchWords={[value]} textToHighlight={item.name} />
          <div className="sc-search-item-sub-content">{type === "" ? item.type : " - " + type + " (" + item.type + ")"}</div>
        </div>
      </div>
    );
  };
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <div className={hideTypeDropDown ? "sc-hidden" : "sc-search-types-container"} tabIndex="-1">
        <Select tabIndex="-1" styles={groupsDropDownStyles.current} isSearchable={false} onChange={onTypeDropDownChange} options={searchTypes} value={selectedType} />
      </div>

      <MUIAutocomplete
        id={"sc-search-textbox-mui"}
        filterOptions={(options) => {
          // console.log("filterOptions", options);

          return options.filter((option) => {
            return option.name.toLowerCase().indexOf(value.toLowerCase()) > -1;
          });
        }}
        disableClearable={true}
        classes={{ root: "sc-search-textbox-mui" }}
        noOptionsText={"No results found"}
        loading={loading}
        loadingText={"Searching..."}
        value={value}
        autoComplete={false}
        autoHighlight={false}
        autoSelect={false}
        selectOnFocus={false}
        freeSolo={true}
        fullWidth={true}
        disabled={props.disabled || false}
        inputValue={value}
        onInputChange={(e, value) => {
          setValue(value);
        }}
        onChange={(e, selectedOption, reason) => {
          switch (reason) {
            case "selectOption":
              // console.log("onChange", reason, e, selectedOption);
              onItemSelect(selectedOption.name, selectedOption);
              break;
            case "clear":
              // console.log("onChange", reason, e, selectedOption);
              cleanup();
              break;
            case "removeOption":
              // console.log("onChange", e, selectedOption, reason);
              break;
            case "createOption":
              // console.log("onChange", e, selectedOption, reason);
              break;
            case "blur":
              // console.log("onChange", e, selectedOption, reason);
              break;
            case "input":
              // console.log("onChange", e, selectedOption, reason);
              break;
            default:
              break;
          }
        }}
        options={searchResults}
        // isOptionEqualToValue={(option, value) => {
        //   console.log("isOptionEqualToValue", option, value, option.name.indexOf(value) > -1);
        //   return option.name === value;
        // }}
        getOptionLabel={(item) => {
          let type = "Unknown";
          if (item.type === "Map Layer") type = item.layerGroupName;
          else if (item.type === "Tool" || item.type === "Theme") type = "";
          else type = item.municipality;

          return typeof item !== "object" ? item : `${item.name} ${type === "" ? item.type : ` - ${type}  (${item.type})`}`;
        }}
        renderOption={(props, item) => {
          // console.log("renderOption", props, item);
          let type = "Unknown";
          if (item.type === "Map Layer") type = item.layerGroupName;
          else if (item.type === "Tool" || item.type === "Theme") type = "";
          else type = item.municipality;
          return (
            <div key={helpers.getUID()} className={"sc-search-item-mui"} {...props}>
              <div className="sc-search-item-left">
                <img src={item.imageName === undefined ? images["map-marker-light-blue.png"] : images[item.imageName]} alt="blue pin" />
              </div>
              <div className="sc-search-item-content">
                <Highlighter highlightClassName="sc-search-highlight-words" searchWords={[value]} textToHighlight={item.name} />
                <div className="sc-search-item-sub-content">{type === "" ? item.type : " - " + type + " (" + item.type + ")"}</div>
              </div>
            </div>
          );
        }}
        renderInput={(params) => {
          // console.log("renderInput", params);
          return (
            <TextField
              classes={{ root: "sc-search-textbox-input-mui" }}
              hiddenLabel
              {...params}
              InputProps={{
                ...params.InputProps,
                type: "search",
              }}
            />
          );
        }}
      />
      <img className={iconActiveClass} src={images["clear.png"]} alt="clear" onClick={cleanup} />
      <img className={iconInitialClass} src={images["magnify.png"]} alt="search" />
    </div>
  );
};

export default Search;

const PopupContent = (props) => {
  const getShareURL = (value) => {
    //GET URL
    var url = window.location.href;

    //ADD LOCATIONID
    if (url.indexOf("?") > 0) {
      let newUrl = helpers.removeURLParameter(url, "LOCATIONID");
      if (newUrl.indexOf("?") > 0) {
        url = newUrl + "&LOCATIONID=" + props.shareLocationId;
      } else {
        url = newUrl + "?LOCATIONID=" + props.shareLocationId;
      }
    } else {
      url = url + "?LOCATIONID=" + props.shareLocationId;
    }

    return url;
  };
  const [copied, setCopied] = useState(false);
  const [shareURL, setShareURL] = useState(getShareURL());
  const isPlaceOrGeocode = props.feature.get("isPlaceOrGeocode");

  const onShareClick = (event) => {
    setCopied(true);
    helpers.showMessage("Share", "Link has been copied to your clipboard.", "green", 2000);
  };

  return (
    <div>
      <button className="sc-button sc-search-popup-content-button" onClick={props.removeMarkersClick}>
        Remove Markers
      </button>
      <button className="sc-button sc-search-popup-content-button" onClick={props.myMapsClick}>
        Add to My Maps
      </button>
      <CopyToClipboard text={shareURL}>
        <button className={isPlaceOrGeocode ? "sc-hidden" : "sc-button sc-search-popup-content-button"} onClick={onShareClick}>
          Share this Location
        </button>
      </CopyToClipboard>
      <button className="sc-button sc-search-popup-content-button" onClick={props.directionsClick}>
        Directions to Here
      </button>
    </div>
  );
};

const MoreOptions = (props) => {
  return (
    <div className={props.numResults > 9 ? "sc-search-menu-options" : "sc-hidden"}>
      <button className="sc-button sc-search-more-options-button" onClick={props.onMoreOptionsClick}>
        {props.showMore ? "Show Less" : "Show More"}
      </button>
    </div>
  );
};
