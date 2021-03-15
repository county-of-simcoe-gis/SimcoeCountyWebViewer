import React, { Component } from "react";
import "./SearchHistory.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
const storageKey = "searchHistory";
class ToolComponent extends Component {
   
  constructor(props) {
    super(props);

    this.state = {items: []}
  }

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  componentDidMount() {
    this.getStorage();

    // LISTEN FOR SEARCHS
    window.emitter.addListener("searchComplete", () => this.getStorage());
  }

  // GET STORAGE
  getStorage() {
    const data = helpers.getItemsFromStorage(storageKey)
    if (data !== undefined) this.setState({ items: data });
  }

  saveStateToStorage = item => {
    helpers.saveToStorage(storageKey, this.state.items);
  };

  onMoreInfoClick = (item) => {
    window.open(item.ReportURL, "_blank");
  };


  onReplayClick = item => {
      window.emitter.emit("searchHistorySelect", item);
  };
  onZoomClick = item => {
    helpers.zoomToFeature(helpers.getFeatureFromGeoJSON(item.geojson));
  };

  onRemoveClick = (item) => {
    this.setState(
      {
        items: this.state.items.filter(function(itemInfo) {
          return itemInfo.id !== item.id;
        })
      },
      () => {
        // UPDATE STORAGE
        this.saveStateToStorage();
      }
    );
  };

  onDeleteAll = () => {
    this.setState({ items: [] }, () => {
      this.saveStateToStorage();
    });
  };

  render() {
    return (
      <PanelComponent onClose={this.onClose} name={this.props.name} helpLink={this.props.helpLink} type="tools">
        <div className="sc-tool-search-history-main-container">
          <div style={{ fontSize: "9pt" }}>Below is a list of your most recent searched items. These items will be added automatically after each search you do for future reference.</div>
          <div className={this.state.items.length === 0 ? "sc-tool-search-history-no-results" : "sc-hidden"}>Your search history is currently empty. Once you search an item, it will appear here.</div>
          <div className={this.state.items.length > 0 ? "sc-tool-search-history-results" : "sc-hidden"}>
            {this.state.items.map((item) => {
              return <SearchItem key={helpers.getUID()} item={item} onMoreInfoClick={this.onMoreInfoClick} onReplayClick={this.onReplayClick} onRemoveClick={this.onRemoveClick} onZoomClick={this.onZoomClick}></SearchItem>;
            })}
          </div>
          <div className={this.state.items.length === 0 ? "sc-hidden" : "sc-tool-search-history-footer"}>
            <button className="sc-button" style={{ width: "200px", marginTop: "4px" }} onClick={this.onDeleteAll}>
              {"Clear History - (" + this.state.items.length + " of 25)"}
            </button>
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default ToolComponent;

const SearchItem = (props) => {
  return (
    <div className="sc-container sc-tool-search-history-item-container">
      <div className="sc-tool-search-history-image">
        <img src={images["map-marker-light-blue.png"]} alt="Map Marker" />
      </div>
      <div className="sc-tool-search-history-details-name">{props.item.name}</div>
      <div className="sc-tool-search-history-details-muni">{"- (" + props.item.type + ")"}</div>
      <div className="sc-tool-search-history-details-date">{"Added: " + props.item.dateAdded}</div>
      {/* <div className="sc-tool-search-history-divider"></div> */}
      <div className="sc-tool-search-history-background" />
      <div
        className={props.item.Type === "Address" || props.item.Type === "Assessment Parcel" ? "sc-fakeLink sc-tool-search-history-button-info" : "sc-hidden"}
        onClick={() => props.onMoreInfoClick(props.item)}
      >
        More Information
      </div>
      <div className="sc-fakeLink sc-tool-search-history-button-replay" onClick={() => props.onReplayClick(props.item)}>
        Replay Search
      </div>
      <div className="sc-fakeLink sc-tool-search-history-button-remove" onClick={() => props.onRemoveClick(props.item)}>
        Remove
      </div>
      <div className="sc-fakeLink sc-tool-search-history-button-zoom" onClick={() => props.onZoomClick(props.item)}>
        Zoom
      </div>
      
    </div>
  );
};

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
