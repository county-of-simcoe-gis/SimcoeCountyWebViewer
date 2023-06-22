import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "./Header.css";
import Search from "./Search.jsx";
import * as helpers from "../helpers/helpers";
import FloatingMenu, { FloatingMenuItem } from "../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../helpers/Portal.jsx";

const feedbackTemplate = (url, xmin, xmax, ymin, ymax, centerx, centery, scale) => `${url}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}`;

const Header = (props) => {
  const [logoImage, setLogoImage] = useState("");

  window.emitter.addListener("feedback", () => onFeedbackClick());

  // ON LOGO IMAGE CHANGE
  useEffect(() => {
    window.emitter.emit("headerLoaded");
    helpers.addIsLoaded("header");
  }, [logoImage]);

  // ON LOAD
  useEffect(() => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      setLogoImage(window.config.headerLogoImageName);
    });
  }, []);

  // BURGER BUTTON HANDLER
  const burgerButtonHandler = () => {
    helpers.waitForLoad("map", Date.now(), 30, () => {
      // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
      if (window.sidebarOpen) window.emitter.emit("setSidebarVisiblity", "CLOSE");
      else window.emitter.emit("setSidebarVisiblity", "OPEN");

      helpers.addAppStat("Burger Button", "Click");
    });
  };

  // DOT MENU HANDLER
  const onDotMenuClick = (evt) => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu key={helpers.getUID()} buttonEvent={evtClone} item={props.info} onMenuItemClick={onMenuItemClick} styleMode="left">
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-login">
            <FloatingMenuItem imageName={"lock.png"} label="Login (Sample)" />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );
    ReactDOM.render(menu, document.getElementById("portal-root"));

    helpers.addAppStat("Header Dot Menu", "Click");
  };

  // DOT MENU ITEM CLICK
  const onMenuItemClick = (value) => {
    helpers.showMessage("Coming Soon", "Coming Soon...");
    helpers.addAppStat("Header Dot Menu", value);
  };

  // FEEDBACK CLICK
  const onFeedbackClick = () => {
    // APP STATS
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      helpers.addAppStat("Feedback", "Click (Header)");

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

  // RENDER
  return (
    <div className="header">
      <div
        id="sc-header-burger-button"
        onClick={burgerButtonHandler}
        tabIndex="2"
        onKeyPress={(evt) => {
          if (evt.key === "Enter") {
            burgerButtonHandler();
          }
        }}
      >
        <img src={require("./images/burger-button.png")} alt="Header Logo" />
      </div>

      <div id="sc-header-bar-button">
        <img src={require("./images/bar-button.png")} alt="Header Logo" />
      </div>
      <div id="sc-header-bar-logo">
        <img src={logoImage === "" || logoImage.toString().substring(0, 4).toUpperCase() === "HTTP" ? logoImage : require("./images/" + logoImage)} alt="Header Logo" />
      </div>
      <div id="sc-header-search-container">
        <Search options={props.options} />
      </div>
      {window.config.showHelpButtonInsteadOfFeedback ? (
        <div className="sc-header-help-container">
          <div className="sc-header-help-btn" onClick={() => helpers.showURLWindow(window.config.helpUrl, false, "full")}>
            ?
          </div>
        </div>
      ) : (
        <div className="sc-header-feedback-container" title="Feedback" onClick={onFeedbackClick}>
          <img style={{ marginTop: "5px" }} src={require("./images/feedback.png")} alt="feedback" />
          Feedback
        </div>
      )}

      {/* <div className="sc-header-dot-menu-container" onClick={onDotMenuClick}><img className="sc-header-dot-menu-img" src={require("./images/vertical-dot-menu.png")} alt="dots"></img></div> */}
    </div>
  );
};
export default Header;
