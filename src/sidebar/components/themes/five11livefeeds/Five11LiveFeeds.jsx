import React, { Component } from "react";
import "./Five11LiveFeeds.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import * as config from "./config.json";
import Five11LayerToggler from "./Five11LayerToggler.jsx";
import { InfoRow } from "../../../../helpers/InfoRow.jsx";

class ThemeComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { wazeLayers: config.default.wazeToggleLayers, mtoLayers: config.default.mtoToggleLayers };
  }

  componentDidMount() {
    // MAP CLICK FOR POPUP INFO
    this.mapClickEvent = window.map.on("singleclick", (evt) => {
      console.log("click");
      if (window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring) return;
      var results = window.map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        if (layer === null || !layer.getVisible()) return;

        if (layer.get("name") !== undefined && layer.get("name").indexOf("511") !== -1) {
          console.log(layer);
          return [feature, layer.get("name"), layer.get("tocDisplayName")];
        }
      });
      if (results !== undefined) {
        var feature = results[0];
        var layerName = results[1];
        var displayName = results[2];

        const entries = Object.entries(feature.getProperties());
        console.log(entries);
        let propsToShow = [];
        entries.forEach((prop) => {
          const val = prop[0];
          if (layerName.indexOf("waze") !== -1) {
            if (val === "type" || val === "subtype" || val === "reportDescription" || val === "date" || val === "street") {
              propsToShow.push(prop);
            }
          } else {
            if (val === "DirectionOfTravel" || val === "Description" || val === "LanesAffected" || val === "EventType" || val === "IsFullClosure" || val === "Comment") {
              propsToShow.push(prop);
            }
          }
        });

        if (layerName === "511-mto-cameras") {
          console.log(entries);
          window.popup.show(evt.coordinate, <MtoCameraPopup key={helpers.getUID()} entries={entries} />, "MTO Camera");
        } else {
          console.log("in reg");
          window.popup.show(evt.coordinate, <WazePopup key={helpers.getUID()} values={propsToShow} />, displayName);
        }
      }
    });
  }
  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  onToggleAllWazeOff = () => {
    console.log(this.state.wazeLayers);
    var newLayers = JSON.parse(JSON.stringify(this.state.wazeLayers));
    newLayers.forEach((newLayer) => {
      newLayer.visible = !newLayer.visible;
    });
    this.setState({ wazeLayers: newLayers });
  };

  onToggleAllMtoOff = () => {
    var newLayers = JSON.parse(JSON.stringify(this.state.mtoLayers));
    newLayers.forEach((newLayer) => {
      newLayer.visible = !newLayer.visible;
    });
    this.setState({ mtoLayers: newLayers });
  };

  render() {
    return (
      <PanelComponent onClose={this.onClose} name={this.props.name} helpLink={this.props.helpLink} hideHeader={this.props.hideHeader} type="themes">
        <div className="sc-511-main-container">
          <div className="sc-title sc-underline" style={{ marginLeft: "7px" }}>
            WAZE LIVE DATA
          </div>
          <div className="sc-511-layers-container">
            {this.state.wazeLayers.map((layer) => {
              return <Five11LayerToggler key={helpers.getUID()} layer={layer} />;
            })}
            <div>
              <button className="sc-button" style={{ width: "100px" }} onClick={this.onToggleAllWazeOff}>
                Toggle All Off
              </button>
              <span style={{ paddingLeft: "40px", fontSize: "11pt" }}>
                <a href="https://www.waze.com/" rel="noopener noreferrer" target="_blank">
                  Data Provided by Waze
                </a>
              </span>
            </div>
          </div>
          <div className="sc-underline" style={{ marginTop: "5px" }}></div>
          <div className="sc-title sc-underline" style={{ marginLeft: "7px" }}>
            MTO LIVE DATA
          </div>
          <div className="sc-511-layers-container">
            {this.state.mtoLayers.map((layer) => {
              return <Five11LayerToggler key={helpers.getUID()} layer={layer} />;
            })}
            <div style={{ display: "flex" }}>
              <div>
                <button className="sc-button" style={{ width: "100px" }} onClick={this.onToggleAllMtoOff}>
                  Toggle All Off
                </button>
              </div>

              <div style={{ paddingLeft: "40px", fontSize: "11pt" }}>Data in this panel is sourced from multiple agencies.</div>
            </div>
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default ThemeComponent;

const WazePopup = (props) => {
  return (
    <div>
      {props.values.map((row) => {
        if (row[0] !== "geometry" && row[0].substring(0, 1) !== "_") {
          return <InfoRow key={helpers.getUID()} value={row[1]} label={row[0]} />;
        } else return null;
      })}
    </div>
  );
};

const MtoCameraPopup = (props) => {
  var Url = "";
  props.entries.forEach((prop) => {
    const val = prop[0];
    if (val === "Url") {
      Url = prop[1];
    }
  });

  return (
    <div>
      <a href={Url} alt="ImageUrl" target="_blank" rel="noopener noreferrer">
        <img src={Url} alt="imageUrl" style={{ maxWidth: "260px" }}></img>
      </a>
    </div>
  );
};
