import React, { Component } from "react";
import Select from "react-select";
import "./SearchAddresses.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import Autocomplete from "react-autocomplete";
import Highlighter from "react-highlight-words";
import { Vector as VectorSource } from "ol/source.js";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Icon, Fill, Stroke, Style } from "ol/style.js";

const searchStreetsURL = searchText => `https://opengis.simcoe.ca/api/getStreetNames/${searchText}`;

class SearchAddresses extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedMuni: munis[0],
      streetValue: "",
      addressNumber: "",
      streetItems: [],
      features: []
    };

    this.createPointLayer();
  }

  // POINT LAYER TO STORE SEARCH RESULTS
  createPointLayer = () => {
    var shadowStyle = new Style({
      image: new CircleStyle({
        radius: 10,
        stroke: new Stroke({
          color: [0, 255, 255, 0.3],
          width: 6
        }),
        fill: new Fill({
          color: [0, 255, 255, 0.3]
        })
      }),
      zIndex: 100000
    });

    var iconStyle = new Style({
      image: new Icon({
        src: images["map-marker-icon.png"]
      })
    });

    const layer = new VectorLayer({
      zIndex: 10000,
      source: new VectorSource({
        features: []
      }),
      style: iconStyle
    });

    window.map.addLayer(layer);
    this.vectorLayer = layer;

    this.vectorLayerShadow = new VectorLayer({
      source: new VectorSource({
        features: []
      }),
      zIndex: 100000,
      style: shadowStyle
    });
    window.map.addLayer(this.vectorLayerShadow);
  };

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)
    window.map.removeLayer(this.vectorLayer);
    window.map.removeLayer(this.vectorLayerShadow);

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  onMuniChange = selectedOption => {
    this.setState({ selectedMuni: selectedOption });
  };

  onStreetItemSelect = (value, item) => {
    // SET STATE CURRENT ITEM
    this.setState({ streetValue: value, streetItems: [item] });
  };

  onSearchClick = () => {
    let sql = "";
    if (this.state.selectedMuni.value !== "SEARCH ALL") sql += "muni = '" + this.state.selectedMuni.value + "'";

    if (this.state.addressNumber.length !== 0) {
      if (sql === "") sql += "stnum = " + this.state.addressNumber;
      else sql += " AND stnum = " + this.state.addressNumber + " ";
    }

    const streetValue = document.getElementById("sc-tool-search-addresses-street-search").value;
    if (streetValue !== "") {
      if (sql === "") sql += "fullname ILIKE '%25" + streetValue + "%25'";
      else sql += " AND fullname ILIKE '%25" + streetValue + "%25'";
    }

    helpers.getWFSGeoJSON(
      "https://opengis.simcoe.ca/geoserver/",
      "simcoe:Address Number",
      result => {
        this.updateFeatures(result);
      },
      "stnum,fullname",
      null,
      sql,
      1000
    );
  };

  updateFeatures = features => {
    console.log(features);
    this.setState({ features });
    this.vectorLayer.getSource().clear();

    if (features.length === 0) return;

    this.vectorLayer.getSource().addFeatures(features);
    const extent = this.vectorLayer.getSource().getExtent();
    window.map.getView().fit(extent, window.map.getSize(), { duration: 500 });
  };

  onAddressNumberClick = evt => {
    this.setState({ addressNumber: evt.target.value });
  };

  onAddressNumberChange = evt => {
    this.setState({ addressNumber: evt.target.value });
  };

  onMouseEnter = feature => {
    this.vectorLayerShadow.getSource().clear();
    this.vectorLayerShadow.getSource().addFeature(feature);
  };

  onMouseLeave = feature => {
    this.vectorLayerShadow.getSource().clear();
  };

  onFeatureClick = feature => {
    window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize(), { duration: 500 });
  };

  onClearClick = () => {
    this.setState({ features: [] });
    this.vectorLayer.getSource().clear();
  };

  render() {
    const muniSelectStyle = {
      control: provided => ({
        ...provided,
        minHeight: "30px"
      }),
      indicatorsContainer: provided => ({
        ...provided,
        height: "30px"
      }),
      clearIndicator: provided => ({
        ...provided,
        padding: "5px"
      }),
      dropdownIndicator: provided => ({
        ...provided,
        padding: "5px"
      })
    };

    return (
      <PanelComponent onClose={this.onClose} name={this.props.name} type="tools">
        <div className="sc-tool-search-addresses-container">
          <div className="sc-tool-search-addresses-header">Locate civic addresses within the County using the form below.</div>
          <div className="sc-container sc-theme-search-addresses-controls">
            <div className="sc-theme-search-addresses-control-row">
              <label className="sc-theme-search-addresses-control label">Municipality:</label>
              <div className="sc-theme-search-addresses-control input">
                <Select styles={muniSelectStyle} isSearchable={false} onChange={this.onMuniChange} options={munis} value={this.state.selectedMuni} />
              </div>
            </div>
            <div className="sc-theme-search-addresses-control-row">
              <label className="sc-theme-search-addresses-control label">Address Number:</label>
              <div className="sc-theme-search-addresses-control input">
                <input
                  className="sc-theme-search-addresses-number"
                  type="text"
                  placeholder="Enter Address Number"
                  onClick={this.onAddressNumberClick}
                  onChange={this.onAddressNumberChange}
                />
              </div>
            </div>
            <div className="sc-theme-search-addresses-control-row">
              <label className="sc-theme-search-addresses-control label">Street Name:</label>
              <div className="sc-theme-search-addresses-control input">
                <Autocomplete
                  tabIndex="1"
                  inputProps={{ id: "sc-tool-search-addresses-street-search", placeholder: "Enter Street Name", name: "sc-tool-search-addresses-street-search" }}
                  className="sc-tool-search-addresses-street-search"
                  wrapperStyle={{
                    position: "relative",
                    display: "inline-block",
                    width: "100%"
                  }}
                  value={this.state.streetValue}
                  items={this.state.streetItems}
                  getItemValue={item => item.streetname}
                  onSelect={(value, item) => {
                    this.onStreetItemSelect(value, item);
                  }}
                  onChange={(event, value) => {
                    this.setState({ streetValue: value });
                    if (value !== "") {
                      this.setState({ iconInitialClass: "sc-search-icon-initial-hidden" });
                      this.setState({ iconActiveClass: "sc-search-icon-active" });

                      helpers.getJSON(searchStreetsURL(value), responseJson => {
                        console.log(responseJson);
                        this.setState({ streetItems: responseJson });
                      });
                    } else {
                      this.setState({ iconInitialClass: "sc-search-icon-initial" });
                      this.setState({ iconActiveClass: "sc-search-icon-active-hidden" });

                      this.setState({ searchResults: [] });
                    }
                  }}
                  renderMenu={children => <div className="sc-tool-search-addresses-street-search-menu">{children}</div>}
                  renderItem={(item, isHighlighted) => (
                    <div className={isHighlighted ? "sc-tool-search-addresses-street-search-highlighted" : "sc-tool-search-addresses-street-search-item"} key={helpers.getUID()}>
                      <div className="sc-search-item-left">
                        <img src={require("./images/map-marker-light-blue.png")} alt="blue pin" />
                      </div>
                      <div className="sc-search-item-content">
                        <Highlighter highlightClassName="sc-search-highlight-words" searchWords={[this.state.streetValue]} textToHighlight={item.streetname} />

                        <div className="sc-search-item-sub-content">{" - " + item.muni}</div>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="sc-theme-search-addresses-control-row sc-theme-search-addresses-button-container">
              <button className="sc-button sc-theme-search-addresses-button" onClick={this.onSearchClick}>
                Search
              </button>
              <button className="sc-button sc-theme-search-addresses-button" style={{ marginLeft: "5px" }} onClick={this.onClearClick}>
                Clear
              </button>
            </div>
          </div>
          <div className={this.state.features.length === 0 ? "sc-container sc-tool-search-addresses-no-results" : "sc-hidden"}>
            Please enter an Address in the textboxes above then click SEARCH button.
          </div>
          <div className="sc-tool-search-addresses-results">
            {this.state.features.map(feature => {
              return <Results key={helpers.getUID()} feature={feature} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFeatureClick={this.onFeatureClick} />;
            })}
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default SearchAddresses;

const Results = props => {
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
      <img src={images["map-marker-icon.png"]} style={{ marginBottom: "8px" }} />
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
    label: "SEARCH ALL"
  },
  {
    value: "ADJALA-TOSORONTIO",
    label: "ADJALA-TOSORONTIO"
  },
  {
    value: "BRADFORD WEST GWILLIMBURY",
    label: "BRADFORD WEST GWILLIMBURY"
  },
  {
    value: "CLEARVIEW",
    label: "CLEARVIEW"
  },
  {
    value: "COLLINGWOOD",
    label: "COLLINGWOOD"
  },
  {
    value: "ESSA",
    label: "ESSA"
  },
  {
    value: "INNISFIL",
    label: "INNISFIL"
  },
  {
    value: "MIDLAND",
    label: "MIDLAND"
  },
  {
    value: "NEW TECUMSETH",
    label: "NEW TECUMSETH"
  },
  {
    value: "ORO-MEDONTE",
    label: "ORO-MEDONTE"
  },
  {
    value: "PENETANGUISHENE",
    label: "PENETANGUISHENE"
  },
  {
    value: "RAMARA",
    label: "RAMARA"
  },
  {
    value: "SEVERN",
    label: "SEVERN"
  },
  {
    value: "SPRINGWATER",
    label: "SPRINGWATER"
  },
  {
    value: "TAY",
    label: "TAY"
  },
  {
    value: "TINY",
    label: "TINY"
  },
  {
    value: "WASAGA BEACH",
    label: "WASAGA BEACH"
  }
];

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
