import React, { Component } from "react";
import "./PanelComponent.css";

class PanelComponent extends Component {
  state = {};

  componentDidMount() {
    // LISTEN FOR CLOSE FROM OTHER COMPONENTS (e.g. MENU BUTTON)
    window.emitter.addListener("closeToolsOrThemes", type => {
      if (type === this.props.type) this.props.onClose();
    });
  }

  onSidebarVisibility = () => {
    console.log("click");
    // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
    window.emitter.emit("setSidebarVisiblity", "CLOSE");

    if (this.props.onSidebarVisibility !== undefined) this.props.onSidebarVisibility();
  };

  render() {
    return (
      <React.Fragment>
        <div id="sc-panel-component-header">
          <div id="sc-panel-component-title">
            <div id="sc-panel-component-title-container">
              <div id="sc-panel-component-tool-icon">
                <img src={images["tools-icon.png"]} alt="Theme"></img>
              </div>
              <div id="sc-panel-component-tool-text" className={this.props.name.length < 25 ? "sc-panel-component-tool-text" : "sc-panel-component-tool-text small"}>
                {this.props.name}
              </div>
              <div id="sc-panel-component-tool-controls">
                <img id="sc-panel-component-tool-img" src={images["tab-close-24x24.png"]} alt="Close Tab" onClick={this.onSidebarVisibility}></img>
                <img id="sc-panel-component-tool-close" src={images["close-x-24x24.png"]} alt="Close Tool" onClick={this.props.onClose}></img>
              </div>
            </div>
          </div>
        </div>
        <div id="sc-panel-component-content">{this.props.children}</div>
      </React.Fragment>
    );
  }
}

export default PanelComponent;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
