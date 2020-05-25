/*jshint loopfunc:true */
import React, { Component } from "react";
import "./FooterTools.css";
import * as helpers from "../helpers/helpers";
import mainConfig from "../config.json";

const feedbackTemplate = (xmin, xmax, ymin, ymax, centerx, centery, scale) =>
  `${mainConfig.feedbackUrl}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}`;

class FooterTools extends Component {
  constructor(props) {
    super(props);
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    this.onMapLoad = this.onMapLoad.bind(this);
    this.state = {
      scale: "",
      basemapType: "TOPO",
      showScale:true,
      currentScale:0
    };
    this.mapScales = [
                {label:"1:100", value:100},
                {label:"1:250", value:250},
                {label:"1:500", value:500},
                {label:"1:1,000", value:1000},
                {label:"1:2,500", value:2500},
                {label:"1:10,000", value:10000},
                {label:"1:25,000", value:25000},
                {label:"1:50,000", value:50000}
              ];
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("basemapChanged", type => {
      this.setState({ basemapType: type });
    });
  }

  componentDidMount(){
    this.setState({showScale:window.mapControls.scale});
  }

  onMapLoad() {
    window.map.on("moveend", () => {
      const scale = helpers.getMapScale();
     
      this.setState({ scale: scale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),currentScale:scale});
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
    helpers.showURLWindow(mainConfig.termsUrl, false, "full");
    // APP STATS
    helpers.addAppStat("Terms", "Click (Footer)");
  };

  onScaleClick = (value) => {
    helpers.setMapScale(value);
  }

  render() {
    
    setTimeout(function(){
      const col = document.getElementsByClassName("ol-scale-line-inner");
      if (col.length > 0) {
        const olScaleBar = col[0];
        let scScaleBar = document.getElementById("sc-scale-bar-text") ;
        scScaleBar.setAttribute("style", "width: " + olScaleBar.style.width);
      }
    }, 10);
    

    return (
     
      <div className={"sc-map-footer-scale-only ol-scale-line ol-unselectable" + (!this.state.showScale? " sc-hidden":"")} >
         <div id="sc-scale-bar-text" className="ol-scale-line-inner">Scale:&nbsp;
            <select id="sc-scale-bar-select" onChange={(evt) => {this.onScaleClick(evt.target.value);}} value={this.state.currentScale}>
              <option key={helpers.getUID()} value={this.state.currentScale}>{"1:" + this.state.scale}</option>
              {
                  this.mapScales.map(item => {
                    return <option key={helpers.getUID()} value={item.value}>{item.label}</option>;
                  })
              }
            </select>
          </div>
      </div>
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
