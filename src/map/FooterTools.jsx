/*jshint loopfunc:true */
import React, { Component } from "react";
import "./FooterTools.css";
import mainConfig from "../config.json";
import * as helpers from "../helpers/helpers";

const feedbackTemplate = (xmin, xmax, ymin, ymax, centerx, centery, scale) =>
  `${mainConfig.feedbackUrl}?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}`;

class FooterTools extends Component {
  constructor(props) {
    super(props);
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    this.onMapLoad = this.onMapLoad.bind(this);
    this.state = {
      scale: "",
      basemapType: "IMAGERY"
    };

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("basemapChanged", type => {
      console.log(type);
      this.setState({ basemapType: type });
    });
  }

  onMapLoad() {
    window.map.on("moveend", () => {
      const scale = helpers.getMapScale();
      this.setState({ scale: scale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") });
    });
  }

  onPrintClick = () => {
    helpers.showMessage("Print", "Coming Soon");

    // APP STATS
    helpers.addAppStat("Print", "Click (Footer)");
  };

  onLegendClick = () => {
    helpers.showMessage("Legend", "Coming Soon");
    // APP STATS
    helpers.addAppStat("Legend", "Click (Footer)");
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

  onTermsClick = () => {
    helpers.showURLWindow(mainConfig.tosUrl, false, "full");
    // APP STATS
    helpers.addAppStat("Terms", "Click (Footer)");
  };

  render() {
    const col = document.getElementsByClassName("ol-scale-line-inner");
    if (col.length > 0) {
      const olScaleBar = col[0];
      let scScaleBar = document.getElementById("sc-scale-bar-text");
      scScaleBar.setAttribute("style", "width: " + olScaleBar.style.width);
    }

    return (
      <div id="sc-scale-bar-text" className={this.state.basemapType === "IMAGERY" ? "sc-map-footer-scale-only imagery" : "sc-map-footer-scale-only topo"}>
        {"Scale: 1:" + this.state.scale}
      </div>
    );
  }
}

export default FooterTools;
