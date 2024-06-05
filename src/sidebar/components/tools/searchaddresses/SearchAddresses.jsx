import React, { useState, useRef, useEffect } from "react";
import Select from "react-select";
import "./SearchAddresses.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import Highlighter from "react-highlight-words";
import { Vector as VectorSource } from "ol/source.js";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Icon, Fill, Stroke, Style } from "ol/style.js";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

import searchAddressConfig from "./config.json";
const SearchAddresses = (props) => {
  const [selectedMuni, setSelectedMuni] = useState(munis[0]);
  const [streetValue, setStreetValue] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [streetItems, setStreetItems] = useState([]);
  const [features, setFeatures] = useState([]);

  const vectorLayerRef = useRef(null);
  const vectorLayerShadowRef = useRef(null);
  let apiUrlRef = useRef(null);
  const muniSelectStyle = {
    control: (provided) => ({
      ...provided,
      minHeight: "30px",
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: "30px",
    }),
    clearIndicator: (provided) => ({
      ...provided,
      padding: "5px",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "5px",
    }),
  };
  const searchStreetsURL = (apiUrl, searchText) => `${apiUrl}public/search/street/${searchText}`;
  useEffect(() => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      apiUrlRef.current = window.config.apiUrl;
    });
    createPointLayer();
  }, []);

  // POINT LAYER TO STORE SEARCH RESULTS
  const createPointLayer = () => {
    var shadowStyle = new Style({
      image: new CircleStyle({
        radius: 10,
        stroke: new Stroke({
          color: [0, 255, 255, 0.3],
          width: 6,
        }),
        fill: new Fill({
          color: [0, 255, 255, 0.3],
        }),
      }),
      zIndex: 100000,
    });

    var iconStyle = new Style({
      image: new Icon({
        src: images["map-marker-icon.png"],
      }),
    });

    const layer = new VectorLayer({
      zIndex: 10000,
      source: new VectorSource({
        features: [],
      }),
      style: iconStyle,
    });

    window.map.addLayer(layer);
    vectorLayerRef.current = layer;

    vectorLayerShadowRef.current = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      zIndex: 100000,
      style: shadowStyle,
    });
    window.map.addLayer(vectorLayerShadowRef.current);
  };

  const onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)
    window.map.removeLayer(vectorLayerRef.current);
    window.map.removeLayer(vectorLayerShadowRef.current);

    // CALL PARENT WITH CLOSE
    if (props.onClose) props.onClose();
  };

  const onMuniChange = (selectedOption) => {
    setSelectedMuni(selectedOption);
  };

  const onStreetItemSelect = (value, item) => {
    // SET STATE CURRENT ITEM
    setStreetValue(value);
    setStreetItems([item]);
  };

  const onSearchClick = () => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      let sql = "";
      if (selectedMuni.value !== "SEARCH ALL") sql += "muni = '" + selectedMuni.value + "'";
      else
        sql += `muni IN (${munis
          .filter((m) => m.value !== "SEARCH ALL")
          .map((m) => `'${m.value}'`)
          .join(",")})`;
      if (addressNumber.length !== 0) {
        if (sql === "") sql += "stnum = " + addressNumber;
        else sql += " AND stnum = " + addressNumber + " ";
      }

      const streetValue = document.getElementById("sc-tool-search-addresses-street-search").value;
      if (streetValue !== "") {
        if (sql === "") sql += "fullname ILIKE '%25" + streetValue + "%25'";
        else sql += " AND fullname ILIKE '%25" + streetValue + "%25'";
      }

      helpers.getWFSGeoJSON(
        {
          serverUrl: searchAddressConfig.serverUrl,
          layerName: searchAddressConfig.layerName,
          sortField: "stnum,fullname",
          cqlFilter: sql,
          count: 1000,
        },
        (result) => {
          updateFeatures(result);
        }
      );
    });
  };

  const updateFeatures = (features) => {
    setFeatures(features);
    vectorLayerRef.current.getSource().clear();

    if (features.length === 0) return;

    vectorLayerRef.current.getSource().addFeatures(features);
    const extent = vectorLayerRef.current.getSource().getExtent();
    window.map.getView().fit(extent, window.map.getSize(), { duration: 500 });
  };

  const onAddressNumberClick = (evt) => {
    setAddressNumber(evt.target.value);
  };

  const onAddressNumberChange = (evt) => {
    setAddressNumber(evt.target.value);
  };

  const onMouseEnter = (feature) => {
    vectorLayerShadowRef.current.getSource().clear();
    vectorLayerShadowRef.current.getSource().addFeature(feature);
  };

  const onMouseLeave = (feature) => {
    vectorLayerShadowRef.current.getSource().clear();
  };

  const onFeatureClick = (feature) => {
    window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize(), {
      duration: 500,
    });
  };

  const onClearClick = () => {
    setFeatures([]);
    vectorLayerRef.current.getSource().clear();
  };
  useEffect(() => {
    onStreetSelect(streetValue);
  }, [streetValue]);

  const onStreetSelect = (value) => {
    setStreetValue(value);
    if (value !== "") {
      helpers.getJSON(searchStreetsURL(apiUrlRef.current, value), (responseJson) => {
        if (responseJson.error === undefined) {
          let filteredItems = responseJson.filter((item) => {
            if (selectedMuni.value === "SEARCH ALL")
              return munis
                .filter((m) => m.value !== "SEARCH ALL")
                .map((m) => m.value)
                .includes(item.muni);
            else return item.muni === selectedMuni.value;
          });
          setStreetItems(filteredItems);
        } else {
          setStreetItems([]);
        }
      });
    }
  };

  return (
    <PanelComponent onClose={onClose} name={props.name} helpLink={props.helpLink} hideHeader={props.hideHeader} type="tools">
      <div className="sc-tool-search-addresses-container">
        <div className="sc-tool-search-addresses-header">Locate civic addresses within the County using the form below.</div>
        <div className="sc-container sc-tool-search-addresses-controls">
          <div className="sc-tool-search-addresses-control-row">
            <label className="sc-tool-search-addresses-control label">Municipality:</label>
            <div className="sc-tool-search-addresses-control input">
              <Select id="sc-tool-search-addresses-muni" styles={muniSelectStyle} isSearchable={false} onChange={onMuniChange} options={munis} value={selectedMuni} />
            </div>
          </div>
          <div className="sc-tool-search-addresses-control-row">
            <label className="sc-tool-search-addresses-control label">Address Number:</label>
            <div className="sc-tool-search-addresses-control input">
              <input className="sc-tool-search-addresses-number" type="text" placeholder="Enter Address Number" onClick={onAddressNumberClick} onChange={onAddressNumberChange} />
            </div>
          </div>
          <div className="sc-tool-search-addresses-control-row">
            <label className="sc-tool-search-addresses-control label">Street Name:</label>
            <div className="sc-tool-search-addresses-control input">
              <Autocomplete
                id="sc-tool-search-addresses-street-search"
                freeSolo
                fullWidth
                options={streetItems}
                renderInput={(params) => (
                  <TextField
                    classes={{ root: "sc-tool-search-addresses-street-search-input" }}
                    hiddenLabel
                    placeholder="Enter Street Name"
                    {...params}
                    InputProps={{
                      ...params.InputProps,
                      type: "search",
                    }}
                  />
                )}
                value={streetValue}
                inputValue={streetValue}
                onInputChange={(event, value) => {
                  // console.log("onInputChange", event, value);
                  setStreetValue(value);
                }}
                getOptionLabel={(item) => {
                  return typeof item !== "object" ? item : `${item.streetname} - ${item.muni}`;
                }}
                onChange={(e, selectedOption, reason) => {
                  switch (reason) {
                    case "selectOption":
                      // console.log("onChange", reason, e, selectedOption);
                      onStreetItemSelect(selectedOption.streetname, selectedOption);
                      // onStreetSelect(selectedOption);
                      break;
                    case "clear":
                      console.log("onChange", reason, e, selectedOption);
                      setStreetValue("");
                      setStreetItems([]);
                      break;
                    case "removeOption":
                      // console.log("onChange", reason, e, selectedOption);
                      break;
                    case "createOption":
                      // console.log("onChange", reason, e, selectedOption);
                      break;
                    case "blur":
                      // console.log("onChange", reason, e, selectedOption);
                      break;
                    case "input":
                      // console.log("onChange", reason, e, selectedOption);

                      break;
                    default:
                      break;
                  }
                }}
                renderOption={(props, item) => {
                  return (
                    <li {...props} key={helpers.getUID()} className="sc-tool-search-addresses-street-search-item">
                      <div className="sc-search-item-left">
                        <img src={require("./images/map-marker-light-blue.png")} alt="blue pin" />
                      </div>
                      <div className="sc-search-item-content">
                        <Highlighter highlightClassName="sc-search-highlight-words" searchWords={[streetValue]} textToHighlight={item.streetname} />
                        <div className="sc-search-item-sub-content">{" - " + item.muni}</div>
                      </div>
                    </li>
                  );
                }}
              />

              {/* 
              <Autocomplete 
              tabIndex="1"
                inputProps={{
                  id: "sc-tool-search-addresses-street-search",
                  placeholder: "Enter Street Name",
                  name: "sc-tool-search-addresses-street-search",
                }}
                className="sc-tool-search-addresses-street-search"
                wrapperStyle={{
                  position: "relative",
                  display: "inline-block",
                  width: "100%",
                }}
                value={streetValue}
                items={streetItems}
                getItemValue={(item) => item.streetname}
                onSelect={(value, item) => {
                  onStreetItemSelect(value, item);
                }}
                onChange={(event, value) => {
                  setStreetValue(value);
                  if (value !== "") {
                    helpers.getJSON(searchStreetsURL(apiUrlRef.current, value), (responseJson) => {
                      if (responseJson.error === undefined) {
                        let filteredItems = responseJson.filter((item) => {
                          if (selectedMuni.value === "SEARCH ALL")
                            return munis
                              .filter((m) => m.value !== "SEARCH ALL")
                              .map((m) => m.value)
                              .includes(item.muni);
                          else return item.muni === selectedMuni.value;
                        });
                        setStreetItems(filteredItems);
                      } else {
                        setStreetItems([]);
                      }
                    });
                  }
                }}
                renderMenu={(children) => <div className="sc-tool-search-addresses-street-search-menu">{children}</div>}
                renderItem={(item, isHighlighted) => (
                  <div className={isHighlighted ? "sc-tool-search-addresses-street-search-highlighted" : "sc-tool-search-addresses-street-search-item"} key={helpers.getUID()}>
                    <div className="sc-search-item-left">
                      <img src={require("./images/map-marker-light-blue.png")} alt="blue pin" />
                    </div>
                    <div className="sc-search-item-content">
                      <Highlighter highlightClassName="sc-search-highlight-words" searchWords={[streetValue]} textToHighlight={item.streetname} />

                      <div className="sc-search-item-sub-content">{" - " + item.muni}</div>
                    </div>
                  </div>
                )}
              /> */}
            </div>
          </div>
          <div className="sc-tool-search-addresses-control-row sc-tool-search-addresses-button-container">
            <button className="sc-button sc-tool-search-addresses-button" onClick={onSearchClick}>
              Search
            </button>
            <button className="sc-button sc-tool-search-addresses-button" style={{ marginLeft: "5px" }} onClick={onClearClick}>
              Clear
            </button>
          </div>
        </div>
        <div className={features.length === 0 ? "sc-container sc-tool-search-addresses-no-results" : "sc-hidden"}>Please enter an Address in the textboxes above then click SEARCH button.</div>
        <div className="sc-tool-search-addresses-results">
          {features.map((feature) => {
            return <Results key={helpers.getUID()} feature={feature} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onFeatureClick={onFeatureClick} />;
          })}
        </div>
      </div>
    </PanelComponent>
  );
};

export default SearchAddresses;

const Results = (props) => {
  const fullAddress = props.feature.get("full_address");
  const muni = props.feature.get("muni");
  return (
    <div
      className="sc-container sc-tool-search-addresses-item"
      title="Click to Zoom"
      onMouseLeave={() => {
        props.onMouseLeave(props.feature);
      }}
      onMouseEnter={() => {
        props.onMouseEnter(props.feature);
      }}
      onClick={() => props.onFeatureClick(props.feature)}
    >
      <img src={images["map-marker-icon.png"]} style={{ marginBottom: "8px" }} alt="marker icon" />
      <div className="sc-tool-search-addresses-item-right">
        <label>{fullAddress}</label>
        <label style={{ display: "block", fontSize: "12px" }}>{muni}</label>
      </div>
    </div>
  );
};

const munis = [
  {
    value: "SEARCH ALL",
    label: "SEARCH ALL",
  },
  {
    value: "ADJALA-TOSORONTIO",
    label: "ADJALA-TOSORONTIO",
  },
  {
    value: "BRADFORD WEST GWILLIMBURY",
    label: "BRADFORD WEST GWILLIMBURY",
  },
  {
    value: "CLEARVIEW",
    label: "CLEARVIEW",
  },
  {
    value: "COLLINGWOOD",
    label: "COLLINGWOOD",
  },
  {
    value: "ESSA",
    label: "ESSA",
  },
  {
    value: "INNISFIL",
    label: "INNISFIL",
  },
  {
    value: "MIDLAND",
    label: "MIDLAND",
  },
  {
    value: "NEW TECUMSETH",
    label: "NEW TECUMSETH",
  },
  {
    value: "ORO-MEDONTE",
    label: "ORO-MEDONTE",
  },
  {
    value: "PENETANGUISHENE",
    label: "PENETANGUISHENE",
  },
  {
    value: "RAMARA",
    label: "RAMARA",
  },
  {
    value: "SEVERN",
    label: "SEVERN",
  },
  {
    value: "SPRINGWATER",
    label: "SPRINGWATER",
  },
  {
    value: "TAY",
    label: "TAY",
  },
  {
    value: "TINY",
    label: "TINY",
  },
  {
    value: "WASAGA BEACH",
    label: "WASAGA BEACH",
  },
];

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
