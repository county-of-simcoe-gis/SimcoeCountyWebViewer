import React, { Component } from "react";
import * as helpers from "./helpers";
import "./FloatingImageSlider.css";
import { Resizable } from "re-resizable";
import InfoRow from "../helpers/InfoRow.jsx";
import { GeoJSON } from "ol/format.js";
import Feature from "ol/Feature";
import { fromExtent } from "ol/geom/Polygon";
import { buffer } from "ol/extent";

class FloatingImageSlider extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      panelOpen: true,
      width: 250,
      height: 310,
      features: [],
      featureIndex: -1,
      currentFeature: null,
      callerObj: null,
      imageHeight: "55%",
    };

    // LISTEN FOR OPEN
    window.emitter.addListener("showImageSlider", (obj, onFeatureChange) => this.onLoad(obj, onFeatureChange));
    window.emitter.addListener("hideImageSlider", () => {
      this.setState({ visible: false });
    });
  }

  onClose = () => {};

  checkImageExists(imageUrl, callBack) {
    var imageData = new Image();
    imageData.onload = function () {
      callBack(true);
    };
    imageData.onerror = function () {
      callBack(false);
    };
    imageData.src = imageUrl;
  }

  onLoad = (obj, onFeatureChange) => {
    helpers.getJSON(obj.wfsUrl, (result) => {
      const geoJSON = new GeoJSON().readFeatures(result);
      if (geoJSON.length === 0) return;

      // let geoJSONValid = geoJSON.filter((item) => {
      //   this.checkImageExists(item.get("_imageurl"), (exists) => {

      //   });
      // });
      // console.log(geoJSONValid);
      //   console.log(geoJSON[0].get(obj.imageUrlField));
      let panelOpen = true;
      if (obj.panelOpen !== undefined) panelOpen = obj.panelOpen;
      this.setState({
        visible: true,
        features: geoJSON,
        featureIndex: 0,
        currentFeature: geoJSON[0],
        callerObj: obj,
        panelOpen: panelOpen,
      });
    });
    this.onFeatureChange = onFeatureChange;
  };

  onCloseClick = (evt) => {
    this.setState((prevState) => ({
      panelOpen: !prevState.panelOpen,
    }));
  };

  onNextFeature = (zoom = false) => {
    let nextIndex = this.state.featureIndex + 1;
    if (nextIndex > this.state.features.length - 1) nextIndex = 0;
    const currentFeature = this.state.features[nextIndex];
    const geom = currentFeature.getGeometry();
    if (geom)
      this.setState(
        {
          featureIndex: nextIndex,
          currentFeature,
        },
        () => {
          var feature = new Feature({
            geometry: fromExtent(buffer(geom.getExtent(), 100)),
          });
          if (zoom) helpers.zoomToFeature(feature, false);

          this.onFeatureChange(currentFeature);
        }
      );
  };

  onPreviousFeature = (zoom = false) => {
    let previousIndex = this.state.featureIndex - 1;
    if (previousIndex < 0) previousIndex = this.state.features.length - 1;
    const currentFeature = this.state.features[previousIndex];
    const geom = currentFeature.getGeometry();
    if (geom)
      this.setState(
        {
          featureIndex: previousIndex,
          currentFeature,
        },
        () => {
          var feature = new Feature({
            geometry: fromExtent(buffer(geom.getExtent(), 100)),
          });
          helpers.zoomToFeature(feature, false);
          this.onFeatureChange(currentFeature);
        }
      );
  };

  onResize = (e, direction, ref, d) => {
    // window.emitter.emit("attributeTableResize", ref.offsetHeight);
    // this.setState({ height: ref.offsetHeight });
    // const img = document.getElementById("sc-floating-image-slider-image");
    let imageHeight = this.state.imageHeight;
    if (ref.offsetHeight > 375) imageHeight = "60%";
    if (ref.offsetHeight > 400) imageHeight = "64%";
    if (ref.offsetHeight > 500) imageHeight = "72%";

    this.setState({ imageHeight: imageHeight });
  };

  onZoomClick = () => {
    helpers.zoomToFeature(this.state.currentFeature);
  };

  onViewDetailsClick = () => {
    //https://maps.simcoe.ca/EconomicDevelopmentReport/?header=false&MLSNUMBER=SC436401001658800
    const mlsNumber = this.state.currentFeature.get("MLS Number");
    const url = `https://opengis.simcoe.ca/EconomicDevelopmentReport/${mlsNumber}/?header=false`;
    helpers.showURLWindow(url, false, undefined, undefined, false);
  };
  render() {
    if (this.state.currentFeature === null || this.state.currentFeature === undefined) return <div />;
    return (
      <div className={this.state.visible ? "" : "sc-hidden"}>
        <div className={this.state.panelOpen ? "sc-floating-image-slider-container" : "sc-hidden"}>
          <Resizable
            defaultSize={{
              width: this.state.width,
              height: this.state.height,
            }}
            minHeight={this.state.height}
            minWidth={200}
            onResize={this.onResize}
            // lockAspectRatioExtraHeight={500}
          >
            <div>
              <div className="sc-floating-image-slider-header">
                {/* <img className="sc-floating-image-slider-star" src={images["yellow-star.png"]} alt="featured" /> */}
                <label style={{ paddingRight: "10px" }}>Featured Properties</label>
                <img className="sc-floating-image-slider-close-icon" src={images["close-tab.png"]} alt="featured" onClick={this.onCloseClick} />
              </div>

              <div className="sc-floating-image-slider-image-and-details-container">
                <div className="sc-floating-image-slider-image-container" style={{ height: this.state.imageHeight }}>
                  <div className="sc-floating-image-slider-image-left-arrow" onClick={this.onPreviousFeature}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="50" viewBox="0 0 512 512">
                      <title>Next Image</title>
                      <polyline
                        points="328 112 184 256 328 400"
                        style={{
                          fill: "none",
                          stroke: "#000",
                          strokeLinecap: "round",
                          strokeLineJoin: "round",
                          strokeWidth: "68px",
                        }}
                      />
                      <polyline
                        points="328 112 184 256 328 400"
                        style={{
                          fill: "none",
                          stroke: "#f0f9ff",
                          strokeLinecap: "round",
                          strokeLineJoin: "round",
                          strokeWidth: "48px",
                        }}
                      />
                    </svg>
                  </div>
                  <div className="sc-floating-image-slider-image-right-arrow" onClick={this.onNextFeature}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="50" viewBox="0 0 512 512">
                      <title>Next Image</title>
                      <polyline
                        points="184 112 328 256 184 400"
                        style={{
                          fill: "none",
                          stroke: "#000",
                          strokeLinecap: "round",
                          strokeLineJoin: "round",
                          strokeWidth: "68px",
                        }}
                      />
                      <polyline
                        points="184 112 328 256 184 400"
                        style={{
                          fill: "none",
                          stroke: "#f0f9ff",
                          strokeLinecap: "round",
                          strokeLineJoin: "round",
                          strokeWidth: "48px",
                        }}
                      />
                    </svg>
                  </div>
                  <img
                    id="sc-floating-image-slider-image"
                    className="sc-floating-image-slider-image"
                    src={this.state.currentFeature.get(this.state.callerObj.imageUrlField)}
                    alt="property"
                    onError={(e) => {
                      // console.log("auto next");
                      // this.onNextFeature(false);
                      e.target.onerror = null;
                      e.target.src = images["noPhoto.png"];
                    }}
                  />
                </div>

                <div className="sc-floating-image-slider-details">
                  {this.state.callerObj.detailFields.map((fieldName) => {
                    return <InfoRow key={helpers.getUID()} label={fieldName} value={this.state.currentFeature.get(fieldName)} />;
                  })}
                  <div style={{ fontSize: "10pt" }}>
                    <span className="sc-fakeLink" onClick={this.onViewDetailsClick}>
                      View Details
                    </span>
                    <span className="sc-fakeLink" style={{ paddingLeft: "5px" }} onClick={this.onZoomClick}>
                      Zoom
                    </span>
                  </div>
                </div>
                {/* <div className={this.state.panelOpen ? "sc-floating-image-slider-closer" : "sc-floating-image-slider-closer closed"} onClick={this.onCloseClick}>
                    <img src={images["close-arrow-right.png"]} alt="Close" className={this.state.panelOpen ? "" : "sc-hidden"} />
                  </div> */}
              </div>
            </div>
          </Resizable>
        </div>
        <div className="sc-floating-image-slider-opener" title="Show Image" onClick={this.onCloseClick}>
          <img src={images["close-arrow-left.png"]} alt="Close" className={this.state.panelOpen ? "sc-hidden" : "sc-floating-image-slider-arrow-left"} />
          <img src={images["star-symbol.png"]} alt="Close" className={this.state.panelOpen ? "sc-hidden" : ""} />
        </div>
      </div>
    );
  }
}

export default FloatingImageSlider;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
