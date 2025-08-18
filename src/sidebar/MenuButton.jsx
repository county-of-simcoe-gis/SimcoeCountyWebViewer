import React, { Component } from "react";
import "./MenuButton.css";
import * as helpers from "../helpers/helpers";
import { createObjectURL } from "../helpers/api";

import * as htmlToImage from "html-to-image";
import { transformWithProjections } from "ol/proj";
import { ImMenu3, ImMenu4 } from "react-icons/im";
const feedbackTemplate = (url, xmin, xmax, ymin, ymax, centerx, centery, scale) => `${url}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}`;

class MenuButton extends Component {
  state = {
    isOpen: false,
    controlsVisible: true,
    gitHubButtonVisible: true,
  };

  componentDidMount() {
    // CLICK ANYWHERE ELSE WILL CLOSE MENU
    document.body.addEventListener(
      "click",
      (evt) => {
        if (typeof evt.target.className === "string" && evt.target.className.indexOf("sc-menu-") > -1) return;

        if (this.state.isOpen) this.setState({ isOpen: !this.state.isOpen });
      },
      true
    );

    // LISTEN FOR MORE BUTTON
    if (window.emitter.listeners("openMoreMenu").length === 0) window.emitter.addListener("openMoreMenu", () => this.setState({ isOpen: true }));
    //LISTEN FOR SCREENSHOT EVENT
    if (window.emitter.listeners("takeScreenshot").length === 0) window.emitter.addListener("takeScreenshot", () => this.onScreenshotClick());

    helpers.waitForLoad(["settings", "security"], Date.now(), 30, () => {
      this.themes = this.getThemes();
      this.others = this.getOthers();
      this.tools = this.getTools();
      this.setState({ controlsVisible: this.controlsVisible(), gitHubButtonVisible: this.gitHubButtonVisible() });
    });
  }

  // LOAD TOOLS FROM CONFIG
  getTools = () => {
    let itemList = [];
    itemList.push(<MenuItem onClick={this.onScreenshotClick} key={helpers.getUID()} name={"Take a Screenshot"} iconClass={"sc-menu-screenshot-icon"} />);
    window.config.sidebarToolComponents.forEach((tool) => {
      if (
        (tool.enabled || tool.enabled === undefined) &&
        (tool.disable === false || tool.disable === undefined) &&
        (tool.secure === undefined || tool.secure === false || (tool.secure && tool.securityKeywords && tool.securityKeywords.some((keyword) => window.security.includes(keyword))))
      )
        itemList.push(<MenuItem onClick={() => this.itemClick(tool.name, "tools")} key={helpers.getUID()} name={tool.name} iconClass={"sc-menu-tools-icon"} />);
    });

    return itemList;
  };

  // LOAD THEMES FROM CONFIG
  getThemes = () => {
    let itemList = [];
    window.config.sidebarThemeComponents.forEach((theme) => {
      if (
        (theme.enabled || theme.enabled === undefined) &&
        (theme.disable === false || theme.disable === undefined) &&
        (theme.secure === undefined || theme.secure === false || (theme.secure && theme.securityKeywords && theme.securityKeywords.some((keyword) => window.security.includes(keyword))))
      )
        itemList.push(<MenuItem onClick={() => this.itemClick(theme.name, "themes")} key={helpers.getUID()} name={theme.name} iconClass={"sc-menu-theme-icon"} />);
    });
    if (itemList === 0 || (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideThemes"])) {
      return;
    } else {
      return itemList;
    }
  };

  // CUSTOM ENTRIES, COMMENT OUT IF YOU DON"T WANT IT
  getOthers = () => {
    let itemList = [];
    itemList.push(<MenuItem onClick={() => helpers.showURLWindow(window.config.whatsNewUrl, true, "full", false, true)} key={helpers.getUID()} name={"What's New"} iconClass={"sc-menu-terms-icon"} />);
    {
      if (!window.config.showHelpButtonInsteadOfFeedback) itemList.push(<MenuItem key={helpers.getUID()} name={"Feedback"} iconClass={"sc-menu-feedback-icon"} onClick={this.onFeedbackClick} />);
    }
    itemList.push(<MenuItem onClick={this.onScreenshotClick} key={helpers.getUID()} name={"Take a Screenshot"} iconClass={"sc-menu-screenshot-icon"} />);
    itemList.push(<MenuItem key={helpers.getUID()} name={"Map Legend"} iconClass={"sc-menu-legend-icon"} onClick={() => window.emitter.emit("openLegend", null)} />);
    itemList.push(<MenuItem onClick={() => helpers.showURLWindow(window.config.helpUrl, false, "full", false, true)} key={helpers.getUID()} name={"Help"} iconClass={"sc-menu-help-icon"} />);
    itemList.push(
      <MenuItem onClick={() => helpers.showURLWindow(window.config.termsUrl, false, "full", false, true)} key={helpers.getUID()} name={"Terms and Conditions"} iconClass={"sc-menu-terms-icon"} />
    );
    return itemList;
  };

  getMyMaps = () => {
    return <MenuItem onClick={() => this.itemClick("mymaps", "mymaps")} key={helpers.getUID()} name={"My Maps"} iconClass={"sc-menu-mymaps-icon"} />;
  };

  itemClick = (name, type) => {
    window.emitter.emit("activateSidebarItem", name, type);
    window.emitter.emit("setSidebarVisiblity", "OPEN");
    this.setState({ isOpen: !this.state.isOpen });
  };

  onMenuButtonClick = (value) => {
    this.setState({ isOpen: !this.state.isOpen });
    helpers.addAppStat("Menu", "Click");
  };

  getMenuClassName = () => {
    if (!this.state.isOpen) return "sc-hidden";
    else if (window.sidebarOpen) return "sc-menu-button-list-container sideBarOpen";
    else return "sc-menu-button-list-container";
  };

  controlsVisible = () => {
    let controls = {
      zoomInOut: window.mapControls.zoomInOut !== undefined ? window.mapControls.zoomInOut : true,
      currentLocation: window.mapControls.currentLocation !== undefined ? window.mapControls.currentLocation : true,
      zoomExtent: window.mapControls.zoomExtent !== undefined ? window.mapControls.zoomExtent : true,
      extentHistory: window.mapControls.extentHistory !== undefined ? window.mapControls.extentHistory : false,
      showGrid: window.mapControls.showGrid !== undefined ? window.mapControls.showGrid : false,
    };
    return (
      controls.gitHubButton === true ||
      controls.zoomInOut === true ||
      controls.currentLocation === true ||
      controls.zoomExtent === true ||
      controls.extentHistory === true ||
      controls.showGrid === true
    );
  };

  gitHubButtonVisible = () => {
    return window.mapControls.gitHubButton !== undefined ? window.mapControls.gitHubButton : true;
  };
  getIconToggleState = () => {
    let currentState = true;
    if (!this.state.isOpen && window.sidebarOpen) currentState = true;
    else if (this.state.isOpen && window.sidebarOpen) currentState = false;
    else if (!this.state.isOpen && !window.sidebarOpen) currentState = false;
    else if (this.state.isOpen && !window.sidebarOpen) currentState = true;
    else currentState = true;
    return currentState;
  };

  onScreenshotClick = () => {
    //https://openlayers.org/en/latest/examples/export-map.html
    window.map.once("rendercomplete", function (event) {
      const mapCanvas = document.createElement("canvas");
      const size = window.map.getSize();
      mapCanvas.width = size[0];
      mapCanvas.height = size[1];
      const mapContext = mapCanvas.getContext("2d");
      Array.prototype.forEach.call(window.map.getViewport().querySelectorAll(".ol-layer canvas, canvas.ol-layer"), function (canvas) {
        if (canvas.width > 0) {
          const opacity = canvas.parentNode.style.opacity || canvas.style.opacity;
          mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
          let matrix;
          const transform = canvas.style.transform;
          if (transform) {
            // Get the transform parameters from the style's transform matrix
            matrix = transform
              .match(/^matrix\(([^\(]*)\)$/)[1]
              .split(",")
              .map(Number);
          } else {
            matrix = [parseFloat(canvas.style.width) / canvas.width, 0, 0, parseFloat(canvas.style.height) / canvas.height, 0, 0];
          }
          // Apply the transform to the export map context
          CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
          const backgroundColor = canvas.parentNode.style.backgroundColor;
          if (backgroundColor) {
            mapContext.fillStyle = backgroundColor;
            mapContext.fillRect(0, 0, canvas.width, canvas.height);
          }
          mapContext.drawImage(canvas, 0, 0);
        }
      });
      mapContext.globalAlpha = 1;
      mapContext.setTransform(1, 0, 0, 1, 0, 0);
      const link = document.createElement("a");
      link.download = "map.png";
      link.href = mapCanvas.toDataURL();
      link.click();
    });

    window.map.renderSync();

    this.setState({ isOpen: false });

    // APP STATS
    helpers.addAppStat("Screenshot", "Menu Button");
  };

  onFeedbackClick = () => {
    // APP STATS
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      helpers.addAppStat("Feedback", "Click (Footer)");

      const scale = helpers.getMapScale();
      const extent = window.map.getView().calculateExtent(window.map.getSize());
      const xmin = extent[0];
      const xmax = extent[1];
      const ymin = extent[2];
      const ymax = extent[3];
      const center = window.map.getView().getCenter();

      let feedbackUrl = feedbackTemplate(window.config.feedbackUrl, xmin, xmax, ymin, ymax, center[0], center[1], scale);
      if (window.config.mapId !== null && window.config.mapId !== undefined && window.config.mapId.trim() !== "") feedbackUrl += "&MAP_ID=" + window.config.mapId;

      helpers.showURLWindow(feedbackUrl, false, "full");
    });
  };

  render() {
    const menuListClassName = this.getMenuClassName();
    const iconToggleState = this.getIconToggleState();
    return (
      <div
        className={
          "sc-menu-button-main-container" +
          (this.props.hidden ? " sc-hidden" : "") +
          (this.props.className !== undefined && this.props.className !== "" ? " " + this.props.className : "") +
          (this.state.controlsVisible ? "" : " no-controls") +
          (this.state.gitHubButtonVisible ? "" : " no-github-button")
        }
        alt="More Options"
        title="More Options"
      >
        <div className="sc-menu-button-container" style={{ cursor: "pointer" }} onClick={this.onMenuButtonClick}>
          <button className="sc-menu-more-button" alt="More Options" title="More Options" style={{ pointerEvents: "none" }}>
            {iconToggleState ? <ImMenu3 size={24} /> : <ImMenu4 size={24} />}
            {this.props.showLabel !== undefined && !this.props.showLabel ? <span style={{ display: "none" }}>&nbsp;</span> : <span style={{ pointerEvents: "none" }}>More</span>}
          </button>
        </div>
        <div id="sc-menu-button-list-container" className={menuListClassName}>
          {window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideThemes"] ? (
            <div></div>
          ) : (
            <div className="sc-menu-list-item-heading" style={{ paddingTop: "0px" }}>
              MAP THEMES
            </div>
          )}
          {this.themes}
          <div className="sc-menu-list-item-heading">MAP TOOLS</div>
          {this.tools}
          <div className="sc-menu-list-item-heading">OTHER</div>
          {this.others}
        </div>
      </div>
    );
  }
}

export default MenuButton;

class MenuItem extends Component {
  state = {};
  render() {
    return (
      <div className="sc-menu-list-item" onClick={this.props.onClick}>
        <div className={"sc-menu-list-item-label " + this.props.iconClass}>{this.props.name}</div>
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
