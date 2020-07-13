import React, { Component } from "react";
import "./SidebarSlim.css";
import MenuButton from "./MenuButton.jsx";
import * as helpers from "../helpers/helpers";

class SidebarSlim extends Component {
  state ={
    };

  onButtonClick = (button) => {
    this.props.onClick(button);
  }

  render() {
    return (
      <div className={window.sidebarOpen ? "sc-hidden" : "sc-sidebar-slim-container"}>
        <SlimButton title="Layers" image="legend-32x32.png" onClick={() => {window.emitter.emit("activateTab", "layers");}} isSelected={this.props.tabIndex === 0}/>
        <SlimButton title="Tools" image="tools-32x32.png" onClick={() => {window.emitter.emit("activateTab", "tools");}} isSelected={this.props.tabIndex === 1}/>
        <SlimButton title="My Maps" image="map-32x32.png" onClick={() => {window.emitter.emit("activateTab", "mymaps");}} isSelected={ this.props.tabIndex === 2}/>
        <SlimButton title="Themes" image="theme-32x32.png" onClick={() => {window.emitter.emit("activateTab", "themes");}} isSelected={ this.props.tabIndex === 3}/>
        <SlimButton title="Reports" image="report-32x32.png" onClick={() => {window.emitter.emit("activateTab", "reports");}} isSelected={this.props.tabIndex === 4}/>
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
        <div key={helpers.getUID()} className={"sc-sidebar-slim-button-container" + (this.props.isSelected?" active": "")} onClick={this.props.onClick}>
          
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
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
