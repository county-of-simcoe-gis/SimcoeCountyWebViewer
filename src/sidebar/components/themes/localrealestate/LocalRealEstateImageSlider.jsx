import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import React, { Component } from "react";
import "./LocalRealEstateImageSlider.css";
import * as helpers from "../../../../helpers/helpers";
import { Vector as VectorSource } from "ol/source.js";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import LineString from "ol/geom/LineString.js";
import { Stroke, Style } from "ol/style.js";

class LocalRealEstateImageSlider extends Component {
  constructor(props) {
    super(props);

    this.vectorSource = null;
    this.features = null;
    this.maxFeatures = 30;
    this.imageSliderId = "sc-theme-real-estate-photo-slider";
    this.vectorLayer = null;
    this.mouseIn = false;
    this.state = {
      images: [],
    };

    // LISTEN FOR SIDEPANEL CHANGES
    window.emitter.addListener("sidebarChanged", (isSidebarOpen) => this.onSidebarChange());

    this.createLineLayer();
  }

  // LINE USED WHEN HOVERING OVER IMAGE RIBBON
  createLineLayer = () => {
    const layer = new VectorLayer({
      zIndex: 1000,
      source: new VectorSource({
        features: [],
      }),
      style: new Style({
        stroke: new Stroke({
          color: "#E78080",
          width: 3,
        }),
      }),
    });
    window.map.addLayer(layer);
    this.vectorLayer = layer;
  };

  onSidebarChange = () => {
    if (document.getElementById(this.imageSliderId) !== null) {
      if (window.sidebarOpen) document.getElementById(this.imageSliderId).classList.remove("in");
      else document.getElementById(this.imageSliderId).classList.add("in");
    }
  };

  componentDidMount() {
    this.initLayer();

    this.onMapMoveEvent = window.map.on("moveend", this.onMapMoveEnd);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.updateFeatures(nextProps);
  }

  onMapMoveEnd = (evt) => {
    this.updateFeatures();
  };

  updateFeatures = (props) => {
    if (props === undefined) props = this.props;

    if (this.vectorSource === null || props.visibleLayers === null) return;

    const extent = window.map.getView().calculateExtent(window.map.getSize());
    let images = [];
    let index = 0;
    this.vectorSource.forEachFeatureIntersectingExtent(extent, (result) => {
      if (index === this.maxFeatures) return;

      if (props.visibleLayers.includes(result.get("_prop_type"))) {
        images.push({
          url: result.get("_thumburl"),
          address: result.get("Address"),
          mlsno: result.get("_mlsno"),
          feature: result,
        });
        index++;
      }
    });

    this.setState({ images });

    if (document.getElementById(this.imageSliderId) !== null) {
      if (images.length > 0) document.getElementById(this.imageSliderId).classList.remove("sc-hidden");
      else document.getElementById(this.imageSliderId).classList.add("sc-hidden");
    }
  };

  initLayer = () => {
    this.props.config.layers.forEach((layer) => {
      if (layer.displayName === "All") {
        helpers.getWFSGeoJSON({ serverUrl: layer.serverUrl, layerName: layer.layerName }, (result) => {
          if (result.length === 0) return;

          this.vectorSource = new VectorSource({
            features: result,
          });
          this.updateFeatures();
        });
      }
    });
  };

  getNumSlidesToShow = () => {
    const width = window.innerWidth;
    if (window.sidebarOpen) {
      if (width < 1000) return 3;
      else if (width >= 1000 && width <= 1100) return 4;
      else if (width >= 1100 && width <= 1200) return 5;
      else if (width >= 1200 && width <= 1300) return 6;
      else if (width >= 1300 && width <= 1400) return 6;
      else if (width >= 1400 && width <= 1500) return 7;
      else if (width >= 1500 && width <= 1600) return 7;
      else if (width >= 1600 && width <= 1700) return 8;
      else if (width >= 1700 && width <= 1800) return 8;
      else if (width >= 1800 && width <= 1900) return 8;
      else if (width >= 1900 && width <= 2000) return 8;
      else return 10;
    } else {
      if (width < 1000) return 5;
      else if (width >= 1000 && width <= 1100) return 6;
      else if (width >= 1100 && width <= 1200) return 7;
      else if (width >= 1200 && width <= 1300) return 8;
      else if (width >= 1300 && width <= 1400) return 8;
      else if (width >= 1400 && width <= 1500) return 9;
      else if (width >= 1500 && width <= 1600) return 9;
      else if (width >= 1600 && width <= 1700) return 10;
      else if (width >= 1700 && width <= 1800) return 10;
      else if (width >= 1800 && width <= 1900) return 10;
      else if (width >= 1900 && width <= 2000) return 10;
      else return 11;
    }
  };

  onImageMouseOver = (evt, feature) => {
    this.mouseIn = true;
    var screenCoords = this.getPos(evt.target);
    const startCoords = window.map.getCoordinateFromPixel(screenCoords);
    var line = new LineString([startCoords, feature.getGeometry().getCoordinates()]);
    for (let index = 0.1; index < 1; index += 0.1) {
      ((index) => {
        setTimeout(() => {
          if (!this.mouseIn) {
            this.vectorLayer.getSource().clear();
            return;
          }
          var pointInterval = line.getCoordinateAt(index);
          var linePart = new LineString([startCoords, pointInterval]);
          var fea = new Feature(linePart);
          this.vectorLayer.getSource().clear();
          this.vectorLayer.getSource().addFeature(fea);
        }, index * 200);
      })(index);
    }
  };

  onImageMouseOut = (evt, feature) => {
    this.mouseIn = false;
    this.vectorLayer.getSource().clear();
  };

  getPos(el) {
    var rect = el.getBoundingClientRect();
    if (window.sidebarOpen) return [rect.left - 300, rect.top - 65];
    else return [rect.left + 5, rect.top - 65];
  }

  render() {
    const imageSliderSettings = {
      className: "slides",
      dots: false,
      infinite: true,
      speed: 500,
      slidesToShow: this.getNumSlidesToShow(),
      slidesToScroll: 3,
      arrows: true,
    };

    return (
      <div>
        <Slider {...imageSliderSettings}>
          {this.state.images.map((image) => {
            return (
              <div key={helpers.getUID()} className="sc-theme-real-estate-photo-slider-item">
                <label className="sc-theme-real-estate-photo-slider-label">{image.address}</label>
                <img
                  onMouseOver={(evt) => this.onImageMouseOver(evt, image.feature)}
                  onMouseOut={(evt) => this.onImageMouseOut(evt, image.feature)}
                  onClick={(evt) => this.props.onImageSliderClick(image.feature)}
                  className="sc-theme-real-estate-photo-slider-image"
                  src={image.url}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = images["noPhoto.png"];
                  }}
                  alt="not found"
                />
              </div>
            );
          })}
        </Slider>
      </div>
    );
  }
}

export default LocalRealEstateImageSlider;

// IMPORT ALL IMAGES
import { createImagesObject } from "../../../../helpers/imageHelper";
const images = createImagesObject(
  import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
);
