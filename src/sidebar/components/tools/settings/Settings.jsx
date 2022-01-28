import React, { Component } from "react";
import "./Settings.css";
import { ClearLocalStorageButton, ClearLocalStorageButtonGrouped } from "./SettingsComponents.jsx";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import settingsConfig from "./config.json";

class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      controlRotate: true,
      controlFullScreen: true,
      controlZoomInOut: true,
      controlCurrentLocation: true,
      controlZoomExtent: true,
      controlScale: true,
      controlScaleLine: true,
      controlBasemap: true,
    };
    this.storageKey = "Settings";
    this.storageKeyMapControls = "Map Control Settings";
  }

  componentDidMount() {
    //wait for map to load
    helpers.waitForLoad("map", Date.now(), 30, () => this.onMapLoad());

    if (window.mapControls !== undefined) {
      this.setState({
        controlRotate: window.mapControls.rotate,
        controlFullScreen: window.mapControls.fullScreen,
        controlZoomInOut: window.mapControls.zoomInOut,
        controlCurrentLocation: window.mapControls.currentLocation,
        controlZoomExtent: window.mapControls.zoomExtent,
        controlScale: window.mapControls.scale,
        controlScaleLine: window.mapControls.scaleLine,
        controlBasemap: window.mapControls.basemap,
      });
    }
  }

  onMapLoad() {
    this.setState({
      controlRotate: window.mapControls.rotate,
      controlFullScreen: window.mapControls.fullScreen,
      controlZoomInOut: window.mapControls.zoomInOut,
      controlCurrentLocation: window.mapControls.currentLocation,
      controlZoomExtent: window.mapControls.zoomExtent,
      controlScale: window.mapControls.scale,
      controlScaleLine: window.mapControls.scaleLine,
      controlBasemap: window.mapControls.basemap,
    });
  }

  glowContainers(container) {
    helpers.glowContainer(container);
  }

  onClose() {
    // CALL PARENT WITH CLOSE
    this.props.onClose();
  }

  applyControlSettings = () => {
    let map = window.map;
    if (this.state.controlRotate) {
      helpers.addMapControl(map, "rotate");
    } else {
      helpers.removeMapControl(map, "rotate");
    }
    if (this.state.controlFullScreen) {
      helpers.addMapControl(map, "fullscreen");
    } else {
      helpers.removeMapControl(map, "fullscreen");
    }
    if (this.state.controlZoomInOut) {
      helpers.addMapControl(map, "zoom");
    } else {
      helpers.removeMapControl(map, "zoom");
    }
    if (this.state.controlScaleLine) {
      helpers.addMapControl(map, "scaleLine");
    } else {
      helpers.removeMapControl(map, "scaleLine");
    }

    //EMIT CHANGE NOTICE FOR ITEMS IN THE NAVIGATION PANEL
    window.emitter.emit("mapControlsChanged", "fullExtent", this.state.controlZoomExtent);
    window.emitter.emit("mapControlsChanged", "zoomToCurrentLocation", this.state.controlCurrentLocation);
    //EMIT CHANGE NOTICE FOR ITEMS IN THE FOOTER PANEL
    window.emitter.emit("mapControlsChanged", "scale", this.state.controlScale);
    //EMIT CHANGE NOTICE FOR BASEMAP SWITCHER
    window.emitter.emit("mapControlsChanged", "basemap", this.state.controlBasemap);
    //EMIT CHANGE NOTICE FOR ADDITIONAL ITEMS
    window.emitter.emit("mapControlsChanged", "fullscreen", this.state.controlFullScreen);
    helpers.saveToStorage(this.storageKeyMapControls, window.mapControls);
  };

  clearLocalData = (key) => {
    if (key === "ALL") {
      localStorage.clear();
      helpers.showMessage("Local Data Cleared", "Your local data has been cleared. Page will now reload.");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      localStorage.removeItem(key);
      helpers.showMessage("Local Data Removed", "Your local data has been cleared. You may need to reload your page to see any changes.");
    }
  };

  render() {
    return (
      <PanelComponent onClose={this.props.onClose} name={this.props.name} helpLink={this.props.helpLink} hideHeader={this.props.hideHeader} type="tools">
        <div className="sc-settings-container">
          <div className="sc-container">
            <div className="sc-description">Set your personal preferences.</div>
            <div className="sc-settings-divider" />
            <div className={settingsConfig.showControlSettings ? "" : "sc-hidden"}>
              <div className="sc-title sc-settings-title">VISIBLE CONTROLS</div>
              <div className="sc-container">
                <div className="sc-settings-row sc-arrow">
                  <label>Rotate:</label>
                  <span>
                    <input
                      name="controlRotate"
                      type="checkbox"
                      className="sc-settings-checkbox"
                      checked={this.state.controlRotate}
                      onChange={() => {
                        this.setState({ controlRotate: !this.state.controlRotate }, () => {
                          window.mapControls.rotate = this.state.controlRotate;
                        });
                      }}
                    />
                  </span>
                </div>
                <div className="sc-settings-row sc-arrow">
                  <label>Full Screen:</label>
                  <span>
                    <input
                      name="controlFullScreen"
                      type="checkbox"
                      className="sc-settings-checkbox"
                      checked={this.state.controlFullScreen}
                      onChange={() => {
                        this.setState({ controlFullScreen: !this.state.controlFullScreen }, () => {
                          window.mapControls.fullScreen = this.state.controlFullScreen;
                        });
                      }}
                    />
                  </span>
                </div>
                <div className="sc-settings-row sc-arrow">
                  <label>Zoom In/Out:</label>
                  <span>
                    <input
                      name="controlZoomInOut"
                      type="checkbox"
                      className="sc-settings-checkbox"
                      checked={this.state.controlZoomInOut}
                      onChange={() => {
                        this.setState({ controlZoomInOut: !this.state.controlZoomInOut }, () => {
                          window.mapControls.zoomInOut = this.state.controlZoomInOut;
                        });
                      }}
                    />
                  </span>
                </div>
                <div className="sc-settings-row sc-arrow">
                  <label>Current Location:</label>
                  <span>
                    <input
                      name="controlCurrentLocation"
                      type="checkbox"
                      className="sc-settings-checkbox"
                      checked={this.state.controlCurrentLocation}
                      onChange={() => {
                        this.setState(
                          {
                            controlCurrentLocation: !this.state.controlCurrentLocation,
                          },
                          () => {
                            window.mapControls.currentLocation = this.state.controlCurrentLocation;
                          }
                        );
                      }}
                    />
                  </span>
                </div>
                <div className="sc-settings-row sc-arrow">
                  <label>Zoom to Extent:</label>
                  <span>
                    <input
                      name="controlZoomExtent"
                      type="checkbox"
                      className="sc-settings-checkbox"
                      checked={this.state.controlZoomExtent}
                      onChange={() => {
                        this.setState({ controlZoomExtent: !this.state.controlZoomExtent }, () => {
                          window.mapControls.zoomExtent = this.state.controlZoomExtent;
                        });
                      }}
                    />
                  </span>
                </div>
                <div className="sc-settings-row sc-arrow">
                  <label>Scale Text/Changer:</label>
                  <span>
                    <input
                      name="controlScale"
                      type="checkbox"
                      className="sc-settings-checkbox"
                      checked={this.state.controlScale}
                      onChange={() => {
                        this.setState({ controlScale: !this.state.controlScale }, () => {
                          window.mapControls.scale = this.state.controlScale;
                        });
                      }}
                    />
                  </span>
                </div>
                <div className="sc-settings-row sc-arrow">
                  <label>Scale Line:</label>
                  <span>
                    <input
                      name="controlScaleLine"
                      type="checkbox"
                      className="sc-settings-checkbox"
                      checked={this.state.controlScaleLine}
                      onChange={() => {
                        this.setState({ controlScaleLine: !this.state.controlScaleLine }, () => {
                          window.mapControls.scaleLine = this.state.controlScaleLine;
                        });
                      }}
                    />
                  </span>
                </div>
                <div className="sc-settings-row sc-arrow">
                  <label>Basemap Changer:</label>
                  <span>
                    <input
                      name="controlBasemap"
                      type="checkbox"
                      className="sc-settings-checkbox"
                      checked={this.state.controlBasemap}
                      onChange={() => {
                        this.setState({ controlBasemap: !this.state.controlBasemap }, () => {
                          window.mapControls.basemap = this.state.controlBasemap;
                        });
                      }}
                    />
                  </span>
                </div>
                <div className="sc-float-right">
                  <button name="applyControlSettings" className="sc-button" onClick={this.applyControlSettings}>
                    Save/Apply
                  </button>
                </div>
              </div>
            </div>

            <div className="sc-settings-divider" />
            <div className="sc-title sc-settings-title">LOCAL STORAGE</div>
            <div className="sc-container">
              <div className="sc-settings-row sc-arrow">
                <button name="clearLocalStorage" title="Clear all cached settings and reload the page." className="sc-button" onClick={() => this.clearLocalData("ALL")}>
                  Clear All Saved Data
                </button>
              </div>
              <div className="sc-settings-divider" />
              {Object.keys(localStorage)
                .filter((key) => {
                  return key.indexOf("login.microsoftonline.com") === -1;
                })
                .map((key) => (
                  <ClearLocalStorageButton key={helpers.getUID()} storageKey={key} clearLocalData={this.clearLocalData} />
                ))}

              <ClearLocalStorageButtonGrouped
                key={helpers.getUID()}
                name={"Login Info"}
                storageKeys={Object.keys(localStorage).filter((key) => {
                  return key.indexOf("login.microsoftonline.com") !== -1;
                })}
                clearLocalData={this.clearLocalData}
              />
            </div>

            <div className="sc-container sc-settings-floatbottom" />
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default Settings;
