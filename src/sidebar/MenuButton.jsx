import React, { Component } from "react";
import "./MenuButton.css";
import * as helpers from "../helpers/helpers";
import mainConfig from "../config.json";
import * as htmlToImage from "html-to-image";
import { saveAs } from "file-saver";

const feedbackTemplate = (xmin, xmax, ymin, ymax, centerx, centery, scale) =>
  `${mainConfig.feedbackUrl}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}`;

class MenuButton extends Component {
  state = {
    isOpen: false
  };

  componentDidMount() {
    // CLICK ANYWHERE ELSE WILL CLOSE MENU
    document.body.addEventListener(
      "click",
      evt => {
        if (typeof evt.target.className === "string" && evt.target.className.indexOf("sc-menu-") > -1) return;

        if (this.state.isOpen) this.setState({ isOpen: !this.state.isOpen });
      },
      true
    );

    // LISTEN FOR MORE BUTTON
    window.emitter.addListener("openMoreMenu", () => this.setState({ isOpen: true }));
  }

  // LOAD TOOLS FROM CONFIG
  getTools = () => {
    let itemList = [];
    itemList.push(<MenuItem onClick={this.onScreenshotClick} key={helpers.getUID()} name={"Take a Screenshot"} iconClass={"sc-menu-screenshot-icon"} />);
    mainConfig.sidebarToolComponents.forEach(tool => {
      itemList.push(<MenuItem onClick={() => this.itemClick(tool.name, "tools")} key={helpers.getUID()} name={tool.name} iconClass={"sc-menu-tools-icon"} />);
    });

    return itemList;
  };

  // LOAD THEMES FROM CONFIG
  getThemes = () => {
    let itemList = [];
    mainConfig.sidebarThemeComponents.forEach(tool => {
      itemList.push(<MenuItem onClick={() => this.itemClick(tool.name, "themes")} key={helpers.getUID()} name={tool.name} iconClass={"sc-menu-theme-icon"} />);
    });

    return itemList;
  };

  // CUSTOM ENTRIES, COMMENT OUT IF YOU DON"T WANT IT
  getOthers = () => {
    let itemList = [];
    itemList.push(<MenuItem onClick={() => helpers.showURLWindow(mainConfig.whatsNewUrl, true, "full", false, true)} key={helpers.getUID()} name={"What's New"} iconClass={"sc-menu-terms-icon"} />);
    itemList.push(<MenuItem key={helpers.getUID()} name={"Feedback"} iconClass={"sc-menu-feedback-icon"} onClick={this.onFeedbackClick} />);
    itemList.push(<MenuItem onClick={this.onScreenshotClick} key={helpers.getUID()} name={"Take a Screenshot"} iconClass={"sc-menu-screenshot-icon"} />);
    itemList.push(<MenuItem key={helpers.getUID()} name={"Map Legend"} iconClass={"sc-menu-legend-icon"} onClick={() => window.emitter.emit("openLegend", null)} />);
    itemList.push(<MenuItem onClick={() => helpers.showURLWindow(mainConfig.helpUrl, false, "full", false, true)} key={helpers.getUID()} name={"Help"} iconClass={"sc-menu-help-icon"} />);
    itemList.push(<MenuItem onClick={() => helpers.showURLWindow(mainConfig.termsUrl, false, "full", false, true)} key={helpers.getUID()} name={"Terms and Conditions"} iconClass={"sc-menu-terms-icon"} />);
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

  onMenuButtonClick = value => {
    this.setState({ isOpen: !this.state.isOpen });
    helpers.addAppStat("Menu", "Click");
  };

  getMenuClassName = () => {
    if (!this.state.isOpen) return "sc-hidden";
    else if (window.sidebarOpen) return "sc-menu-button-list-container sideBarOpen";
    else return "sc-menu-button-list-container";
  };

  onScreenshotClick = () => {
    window.map.once("rendercomplete", function() {
      htmlToImage.toBlob(window.map.getTargetElement())
      .then(function(blob) {
        window.saveAs(blob, "map.png");
      });
    });

    window.map.renderSync();

    this.setState({ isOpen: false });

    // APP STATS
    helpers.addAppStat("Screenshot", "Menu Button");
  };

  onFeedbackClick = () => {
    // APP STATS
    helpers.addAppStat("Feedback", "Click (Footer)");

    const scale = helpers.getMapScale();
    const extent = window.map.getView().calculateExtent(window.map.getSize());
    const xmin = extent[0];
    const xmax = extent[1];
    const ymin = extent[2];
    const ymax = extent[3];
    const center = window.map.getView().getCenter();

    const feedbackUrl = feedbackTemplate(xmin, xmax, ymin, ymax, center[0], center[1], scale);

    helpers.showURLWindow(feedbackUrl, false, "full");
  };

  render() {
    const menuListClassName = this.getMenuClassName();
    return (
      <div className={"sc-menu-button-main-container" + (this.props.hidden? " sc-hidden" : "") + ((this.props.className !== undefined && this.props.className!== "")? " " +this.props.className:""  ) } alt="More Options" title="More Options">
        <div className="sc-menu-button-container" style={{ cursor: "pointer" }} onClick={this.onMenuButtonClick}>
          <button className="sc-menu-more-button">
            <img src={images["more.png"]} style={{ pointerEvents: "none" }} alt="More Options" title="More Options" />
            {(this.props.showLabel!==undefined&&!this.props.showLabel)?<span style={{ display: "none" }}>&nbsp;</span> : <span style={{ pointerEvents: "none" }}>More</span>}
          </button>
        </div>
        <div id="sc-menu-button-list-container" className={menuListClassName}>
          <div className="sc-menu-list-item-heading" style={{ paddingTop: "0px" }}>
            MAP THEMES
          </div>
          {this.getThemes()}
          <div className="sc-menu-list-item-heading">MAP TOOLS</div>
          {this.getTools()}
          <div className="sc-menu-list-item-heading">OTHER</div>
          {this.getOthers()}
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
