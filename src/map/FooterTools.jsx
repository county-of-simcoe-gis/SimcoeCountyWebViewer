/*jshint loopfunc:true */
import React, { Component } from "react";
import "./FooterTools.css";
import * as helpers from "../helpers/helpers";

const feedbackTemplate = (xmin, xmax, ymin, ymax, centerx, centery, scale) => `https://opengis.simcoe.ca/feedback/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}`;

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
    helpers.showURLWindow("https://maps.simcoe.ca/terms.html", false, "full");
    // APP STATS
    helpers.addAppStat("Terms", "Click (Footer)");
  };

  render() {
    console.log(this.state.basemapType);
    return (
      <div className={this.state.basemapType === "IMAGERY" ? "sc-map-footer-scale-only imagery" : "sc-map-footer-scale-only topo"}>{"Scale: 1:" + this.state.scale}</div>
      //   <div className="sc-map-footer-tools-button-bar sc-no-select ">
      //     <div id="sc-map-footer-tools-title-label" className="sc-map-footer-tools-button-bar-title"></div>
      //       <div className="sc-map-footer-tools-button-bar-icons">
      //           <a id="sc-map-footer-tools-print-link" title="Print this map" onClick={this.onPrintClick} >
      //               <div><img src={images["print.png"]} alt="print" /></div>
      //               <div className="sc-map-footer-tools-link-text">Print</div>
      //           </a>
      //           <a id="sc-map-footer-tools-legend-link" title="View Map Legend"  onClick={this.onLegendClick}>
      //               <div><img src={images["legend-footer.png"]} alt="legend" /></div>
      //               <div className="sc-map-footer-tools-link-text">Legend</div>
      //           </a>
      //           <a id="sc-map-footer-tools-feedback-link" title="Send us your feedback"  onClick={this.onFeedbackClick}>
      //               <div><img src={images["feedback-footer.png"]} alt="feedback" /></div>
      //               <div className="sc-map-footer-tools-link-text">Feedback</div>
      //           </a>
      //           <a id="sc-map-footer-tools-terms-link" title="View Terms and Conditions"  onClick={this.onTermsClick} >
      //               <div><img src={images["terms-footer.png"]} alt="terms"/></div>
      //               <div className="sc-map-footer-tools-link-text">Terms</div>
      //           </a>
      //       </div>
      //     <div className="sc-map-footer-scale">{"Scale: 1:" + this.state.scale}</div>
      // </div>
    );
  }
}

export default FooterTools;
