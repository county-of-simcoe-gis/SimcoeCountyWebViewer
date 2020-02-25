import React, { Component } from "react";
import Select from "react-select";
import "./LotAndConcession.css";
import * as helpers from "../../../../helpers/helpers";
import mainConfig from "../../../../config.json";
import PanelComponent from "../../../PanelComponent";
import { extend } from "ol/extent.js";
import { Fill, Stroke, Style } from "ol/style.js";
import { Vector as VectorSource } from "ol/source.js";
import VectorLayer from "ol/layer/Vector";

const serverUrl = mainConfig.geoserverUrl + "wms/";

class ToolComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      lotNumber: "",
      concessionNumber: "",
      selectedMuni: munis[0],
      features: []
    };
    this.layer = null;
    this.layerName = "simcoe:Lot And Concession - Tool";
    this.createShadowLayer();
  }

  createShadowLayer = () => {
    const shadowStyle = new Style({
      stroke: new Stroke({
        color: [0, 255, 255, 0.3],
        width: 6
      }),
      fill: new Fill({
        color: [0, 255, 255, 0.3]
      }),
      zIndex: 100000
    });

    this.vectorLayerShadow = new VectorLayer({
      source: new VectorSource({
        features: []
      }),
      zIndex: 100000,
      style: shadowStyle
    });
    window.map.addLayer(this.vectorLayerShadow);
  };
  componentDidMount() {}

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)
    window.map.removeLayer(this.layer);
    window.map.removeLayer(this.vectorLayerShadow);

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  onSearchClick = () => {
    if (this.state.lotNumber === "" && this.state.concessionNumber === "") {
      helpers.showMessage("Lot And Con", "Please enter a LOT and/or CON.", "orange");
      return;
    }

    if (this.layer !== null) window.map.removeLayer(this.layer);
    let sql = "description <> 'Road Allowance'";
    if (this.state.selectedMuni.value !== "SEARCH ALL") sql += " AND geog_twp = '" + this.state.selectedMuni.value + "'";
    if (this.state.lotNumber.length !== 0) {
      sql += " AND lot = '" + this.state.lotNumber + "' ";
    }
    if (this.state.concessionNumber.length !== 0) {
      sql += " AND con = '" + this.state.concessionNumber + "' ";
    }

    // if (sql === "") sql = "lot <> ' ' AND con <> ' '";
    // " this.layer = helpers.getImageWMSLayer(serverUrl, this.layerName, null, null, 50);
    // else this.layer = helpers.getImageWMSLayer(serverUrl, this.layerName, null, sql, 50);

    this.layer = helpers.getImageWMSLayer(serverUrl, this.layerName, null, sql, 50);
    this.layer.setVisible(true);
    window.map.addLayer(this.layer);

    helpers.getWFSGeoJSON(
      mainConfig.geoserverUrl,
      this.layerName,
      result => {
        this.updateFeatures(result);
      },
      "lot,con",
      null,
      sql,
      1000
    );
  };

  updateFeatures = features => {
    console.log(features);
    this.setState({ features });

    let extent = features[0]
      .getGeometry()
      .getExtent()
      .slice(0);
    features.forEach(feature => {
      extend(extent, feature.getGeometry().getExtent());
    });
    window.map.getView().fit(extent, window.map.getSize(), { duration: 500 });
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
    window.map.removeLayer(this.layer);
    window.map.removeLayer(this.vectorLayerShadow);
  };

  onLotNumberChange = evt => {
    this.setState({ lotNumber: evt.target.value });
  };

  onConcessionNumberChange = evt => {
    this.setState({ concessionNumber: evt.target.value });
  };

  onMuniChange = selectedOption => {
    this.setState({ selectedMuni: selectedOption });
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
        <div className="sc-tool-lot-and-concession-container">
          <div className="sc-tool-lot-and-concession-header">Locate civic addresses within the County using the form below.</div>
          <div className="sc-container sc-tool-lot-and-concession-controls">
            <div className="sc-tool-lot-and-concession-control-row">
              <label className="sc-tool-lot-and-concession-control label">Lot Number:</label>
              <div className="sc-tool-lot-and-concession-control input">
                <input className="sc-tool-lot-and-concession-number" type="text" placeholder="Enter Lot Number" onChange={this.onLotNumberChange} />
              </div>
            </div>
            <div className="sc-tool-lot-and-concession-control-row">
              <label className="sc-tool-lot-and-concession-control label">Concession Number:</label>
              <div className="sc-tool-lot-and-concession-control input">
                <input className="sc-tool-lot-and-concession-number" type="text" placeholder="Concession Number" onChange={this.onConcessionNumberChange} />
              </div>
            </div>
            <div className="sc-tool-lot-and-concession-control-row">
              <label className="sc-tool-lot-and-concession-control label">Geographic Township:</label>
              <div className="sc-tool-lot-and-concession-control input">
                <Select styles={muniSelectStyle} isSearchable={false} onChange={this.onMuniChange} options={munis} value={this.state.selectedMuni} />
              </div>
            </div>
            <div className="sc-tool-lot-and-concession-control-row sc-tool-lot-and-concession-button-container">
              <button className="sc-button sc-tool-lot-and-concession-button" onClick={this.onSearchClick}>
                Search
              </button>
              <button className="sc-button sc-tool-lot-and-concession-button" style={{ marginLeft: "5px" }} onClick={this.onClearClick}>
                Clear
              </button>
            </div>
          </div>
          <div className={this.state.features.length === 0 ? "sc-container sc-tool-lot-and-concession-no-results" : "sc-hidden"}>
            Please enter a LOT and/or CONCESSION in the textboxes above then click SEARCH button.
          </div>
          <div className="sc-tool-lot-and-concession-results">
            {this.state.features.map(feature => {
              return <Results key={helpers.getUID()} feature={feature} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFeatureClick={this.onFeatureClick} />;
            })}
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default ToolComponent;

const Results = props => {
  const lot = props.feature.get("lot");
  const con = props.feature.get("con");
  const muni = props.feature.get("geog_twp");
  return (
    <div
      className="sc-container sc-tool-lot-and-concession-item"
      title="Click to Zoom"
      onMouseLeave={() => {
        props.onMouseLeave(props.feature);
      }}
      onMouseEnter={() => {
        props.onMouseEnter(props.feature);
      }}
      onClick={() => props.onFeatureClick(props.feature)}
    >
      <div className="sc-tool-lot-and-concession-item-right">
        <label>{"Lot: " + lot}</label>
        <br></br>
        <label>{"Concession: " + con}</label>
        <label style={{ display: "block", fontSize: "12px" }}>{"Township: " + muni}</label>
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
    value: "ADJALA",
    label: "ADJALA"
  },
  {
    value: "ESSA",
    label: "ESSA"
  },
  {
    value: "FLOS",
    label: "FLOS"
  },
  {
    value: "INNISFIL",
    label: "INNISFIL"
  },
  {
    value: "MARA",
    label: "MARA"
  },
  {
    value: "MATCHEDASH",
    label: "MATCHEDASH"
  },
  {
    value: "MEDONTE",
    label: "MEDONTE"
  },
  {
    value: "MORRISON",
    label: "MORRISON"
  },
  {
    value: "NOTTAWASAGA",
    label: "NOTTAWASAGA"
  },
  {
    value: "ORILLIA",
    label: "ORILLIA"
  },
  {
    value: "ORO",
    label: "ORO"
  },
  {
    value: "MARA",
    label: "MARA"
  },
  {
    value: "SUNNIDALE",
    label: "SUNNIDALE"
  },
  {
    value: "TAY",
    label: "TAY"
  },
  {
    value: "TECUMSETH",
    label: "TECUMSETH"
  },
  {
    value: "TINY",
    label: "TINY"
  },
  {
    value: "TOSORONTIO",
    label: "TOSORONTIO"
  },
  {
    value: "VESPRA",
    label: "VESPRA"
  },
  {
    value: "WEST GWILLIMBURY",
    label: "WEST GWILLIMBURY"
  }
];
