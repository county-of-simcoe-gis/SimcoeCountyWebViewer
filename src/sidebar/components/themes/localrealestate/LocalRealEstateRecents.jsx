import React, { Component } from "react";
import "./LocalRealEstateRecents.css";
import * as helpers from "../../../../helpers/helpers";
import InfoRow from "../../../../helpers/InfoRow.jsx";
import { CSSTransition, TransitionGroup } from "react-transition-group";

class LocalRealEstateRecents extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div>
        <div className="sc-title">
          MY RECENTLY VIEWED ITEMS
          <label className="sc-fakeLink sc-theme-real-estate-remove-all" onClick={this.props.onRemoveAll}>
            remove all
          </label>
        </div>
        <div className={this.props.viewedItems.length !== 0 ? "sc-hidden" : "sc-container"}>There are currently no recently viewed items.</div>
        <div className="sc-theme-real-estate-recent-container">
          <TransitionGroup>
            {this.props.viewedItems.map((geoJson) => {
              const feature = helpers.getFeatureFromGeoJSON(geoJson);
              return (
                <CSSTransition key={feature.get("_mlsno")} classNames="sc-theme-real-estate-recent-item-container" timeout={200}>
                  <div className="sc-container sc-theme-real-estate-recent-item-container">
                    <div>
                      <img
                        className="sc-theme-real-estate-recent-image"
                        src={feature.get("_thumburl")}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = images["noPhoto.png"];
                        }}
                        alt="not found"
                      />
                    </div>
                    <div className="sc-theme-real-estate-recent-info">
                      <InfoRow key={helpers.getUID()} label={"Address"} value={feature.get("Address")} />
                      <InfoRow key={helpers.getUID()} label={"Municipality"} value={feature.get("Municipality")} />
                      <div className="sc-theme-real-estate-button-container">
                        <button
                          className="sc-button sc-theme-real-estate-recent-button"
                          onClick={() => {
                            this.props.onItemRemove(feature);
                          }}
                        >
                          Remove
                        </button>
                        <button
                          className="sc-button sc-theme-real-estate-recent-button"
                          style={{ marginLeft: "5px" }}
                          onClick={() => {
                            helpers.zoomToFeature(feature);
                          }}
                        >
                          Zoom
                        </button>
                      </div>
                    </div>
                  </div>
                </CSSTransition>
              );
            })}
          </TransitionGroup>
        </div>
      </div>
    );
  }
}

export default LocalRealEstateRecents;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
