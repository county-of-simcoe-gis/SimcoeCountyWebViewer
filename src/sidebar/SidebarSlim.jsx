import React, { Component } from "react";
import "./SidebarSlim.css";
import MenuButton from "./MenuButton.jsx";
import * as helpers from "../helpers/helpers";

class SidebarSlim extends Component {
  state = {};

  onButtonClick = (button) => {
    this.props.onClick(button);
  };

  render() {
    return (
      <div className={window.sidebarOpen ? "sc-hidden" : "sc-sidebar-slim-container"}>
        <SlimButton
          title={this.props.layers.title}
          image={this.props.layers.icon}
          onClick={() => {
            window.emitter.emit("activateTab", "layers");
          }}
          isSelected={this.props.tabIndex === 0}
          isActive={false}
          hidden={this.props.hideLayers}
        />
        <SlimButton
          title={this.props.tools.title}
          image={this.props.tools.icon}
          onClick={() => {
            window.emitter.emit("activateTab", "tools");
          }}
          isSelected={this.props.tabIndex === 1}
          isActive={this.props.toolActive}
          hidden={this.props.hideTools}
        />
        <SlimButton
          title={this.props.myMaps.title}
          image={this.props.myMaps.icon}
          onClick={() => {
            window.emitter.emit("activateTab", "mymaps");
          }}
          isSelected={this.props.tabIndex === 2}
          isActive={this.props.isMyMapsEditing}
          hidden={this.props.hideMyMaps}
        />
        <SlimButton
          title={this.props.themes.title}
          image={this.props.themes.icon}
          onClick={() => {
            window.emitter.emit("activateTab", "themes");
          }}
          isSelected={this.props.tabIndex === 3}
          isActive={this.props.themeActive}
          hidden={this.props.hideThemes}
        />
        <SlimButton
          title={this.props.reports.title}
          image={this.props.reports.icon}
          onClick={() => {
            window.emitter.emit("activateTab", "reports");
          }}
          isSelected={this.props.tabIndex === 4}
          isActive={false}
          hidden={this.props.hideReports}
        />
        <div className="sc-sidebar-slim-footer-container">
          <MenuButton />
        </div>
      </div>
    );
  }
}
export default SidebarSlim;

class SlimButton extends Component {
  state = {};

  render() {
    return (
      <div key={helpers.getUID()} className={"sc-sidebar-slim-button-container" + (this.props.isSelected ? " active" : "") + (this.props.hidden ? " sc-hidden" : "")} onClick={this.props.onClick}>
        <span className={this.props.isActive ? "sc-sidebar-slim-button-dot" : "sc-hidden"} />
        <button className="sc-sidebar-slim-button">
          <img src={images[this.props.image]} alt={this.props.title} />
          <br />
          <span>{this.props.title}</span>
        </button>
      </div>
    );
  }
}

// IMPORT ALL IMAGES
import { createImagesObject } from "../helpers/imageHelper";
const images = createImagesObject(
  import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
);
