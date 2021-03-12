import React, { Component } from "react";
import "./LocalRealEstate.css";
import PanelComponent from "../../../PanelComponent";
import config from "./config.json";
import LocalRealEstateLayerToggler from "./LocalRealEstateLayerToggler.jsx";
import * as helpers from "../../../../helpers/helpers";
import ReactDOM from "react-dom";
import LocalRealEstateImageSlider from "./LocalRealEstateImageSlider.jsx";
import LocalRealEstateRecents from "./LocalRealEstateRecents.jsx";
import LocalRealEstatePopupContent from "./LocalRealEstatePopupContent.jsx";
import { getCenter } from "ol/extent";

//disableParcelClick
class LocalRealEstate extends Component {
  constructor(props) {
    super(props);

    this.imageSliderSettings = {
      dots: false,
      infinite: true,
      speed: 500,
      slidesToShow: 50,
      slidesToScroll: 1
    };
    this.imageSlider = document.createElement("div");
    this.imageSlider.id = "sc-theme-real-estate-photo-slider";
    this.storageKey = "theme-real-estate";
    this.state = { visibleLayers: null, viewedItems: [] };
  }

  componentDidMount() {
    //window.disableParcelClick = true;
    // CREATE DIV FOR SLIDER
    document.body.appendChild(this.imageSlider);

    let visibleLayers = [];
    config.layers.forEach(layer => {
      if (layer.visible && layer.displayName !== "All") visibleLayers.push(layer.displayName);
    });
    this.setState({ visibleLayers: visibleLayers }, () => {
      this.renderImageSlider();
      this.getStorage();
    });
  }

  renderImageSlider = () => {
    ReactDOM.render(
      <LocalRealEstateImageSlider config={config} visibleLayers={this.state.visibleLayers} onImageSliderClick={this.onImageSliderClick} onViewed={this.onViewed} />,
      document.getElementById(this.imageSlider.id)
    );
  };
  componentWillUnmount() {
    //window.disableParcelClick = false;
    this.imageSlider.remove();
  }

  // IMAGE RIBBON CLICK
  onImageSliderClick = feature => {
    const extent = feature.getGeometry().getExtent();
    const center = getCenter(extent);
    window.popup.show(center, <LocalRealEstatePopupContent key={helpers.getUID()} feature={feature} photosUrl={config.photosUrl} onViewed={this.onViewed} />, "Real Estate");

    this.onViewed(feature);
  };

  onClose() {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  }

  onLayerVisiblityChange = (layerName, checked) => {
    if (this.state.visibleLayers === null) return;
    let visibleLayers = Object.assign([], this.state.visibleLayers);
    if (checked) visibleLayers.push(layerName);
    else {
      visibleLayers = visibleLayers.filter(function(value, index, arr) {
        return value !== layerName;
      });
    }
    this.setState({ visibleLayers }, () => {
      this.renderImageSlider();
    });
  };

  onViewed = feature => {
    // CHECK IF IT EXISTS
    const mlsno = feature.get("mlsno");
    const found = this.state.viewedItems.filter(function(value, index, arr) {
      const feature = helpers.getFeatureFromGeoJSON(value);
      return mlsno === feature.get("mlsno");
    });
    if (found.length !== 0) return;

    const geoJson = helpers.featureToGeoJson(feature);
    this.setState(
      prevState => ({
        viewedItems: [geoJson, ...prevState.viewedItems]
      }),
      () => {
        // UPDATE STORAGE
        this.saveStateToStorage();
        console.log(this.state.viewedItems);
      }
    );
  };

  saveStateToStorage = () => {
    const stateClone = Object.assign([], this.state.viewedItems);
    localStorage.setItem(this.storageKey, JSON.stringify(stateClone));
  };

  // GET STORAGE
  getStorage() {
    const storage = localStorage.getItem(this.storageKey);
    if (storage === null) return [];

    const data = JSON.parse(storage);
    this.setState({ viewedItems: data });
  }

  // REMOVE FROM RECENT LIST
  onItemRemove = feature => {
    this.setState(
      {
        viewedItems: this.state.viewedItems.filter(function(item) {
          const itemFeature = helpers.getFeatureFromGeoJSON(item);

          return feature.get("mlsno") !== itemFeature.get("mlsno");
        })
      },
      () => {
        // UPDATE STORAGE
        this.saveStateToStorage();
      }
    );
  };

  onRemoveAll = () => {
    this.setState(
      {
        viewedItems: []
      },
      () => {
        // UPDATE STORAGE
        this.saveStateToStorage();
      }
    );
  };

  render() {
    return (
      <PanelComponent onClose={this.props.onClose} name={this.props.name} helpLink={this.props.helpLink} type="themes">
        <div className="sc-theme-real-estate-main-container">
          <div className="sc-title sc-underline">THEME LAYERS</div>
          <div className="sc-container" style={{ marginBottom: "5px" }}>
            {// eslint-disable-next-line
            config.layers.map(layerConfig => {
              if (layerConfig.displayName !== "All")
                return (
                  <LocalRealEstateLayerToggler key={layerConfig.displayName} layerConfig={layerConfig} config={config} onLayerVisiblityChange={this.onLayerVisiblityChange} onViewed={this.onViewed} />
                );
            })}
          </div>
          <LocalRealEstateRecents viewedItems={this.state.viewedItems} onItemRemove={this.onItemRemove} onRemoveAll={this.onRemoveAll} />
        </div>
      </PanelComponent>
    );
  }
}

export default LocalRealEstate;
