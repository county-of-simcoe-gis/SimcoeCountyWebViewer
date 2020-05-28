import React, { Component } from "react";
import "./UrlWindow.css";
import * as helpers from "./helpers";

class URLWindow extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hide: false
    };

    this.storageKeyWhatsNew = "sc_dontshowagain";
  }

  onCloseClick = value => {
    this.setState({ hide: true });
  };

  onPopoutClick = () => {
    window.open(this.props.url, "_blank");
  };
  componentDidMount() {
    if (this.props.honorDontShow) {
      const saved = this.getStorage();
      if (saved.includes(this.props.url)) this.setState({ hide: true });
    }

    document.addEventListener("keydown", this.escFunction, false);

    // LISTEN FOR SIDEPANEL CHANGES
    window.emitter.addListener("sidebarChanged", isSidebarOpen => this.sidebarChanged(isSidebarOpen));
  }

  sidebarChanged = isSidebarOpen => {
    this.forceUpdate();
  };

  escFunction = event => {
    if (event.keyCode === 27) {
      this.setState({ hide: true });
    }
  };

  onDontShowThisAgain = () => {
    this.saveToStorage();
  };


  saveToStorage = () => {
    helpers.appendToStorage(this.storageKeyWhatsNew,this.props.url);
    this.setState({ hide: true });
    
  };

 
  render() {
    //className={this.state.hide ? "sc-hidden" :"sc-url-window-map-container"}
    let className = "";
    if (this.state.hide) className = "sc-hidden";
    else if (this.props.mode === "full") className = "full";
    else if (!window.sidebarOpen) className = "full";
    //const className = this.state.hide ? "sc-hidden" : this.props.mode === "full" ? "full" : ""
    return (
      <div id="sc-url-window-container" className={className}>
        <div className="sc-url-window-header">
          <div className="sc-url-window-header-title">Information</div>
          <div className="sc-url-window-header-popout-button" title="Open New Window">
            <button className="sc-button sc-button-blue sc-url-window-header-button" onClick={this.onPopoutClick}>
              <img src={images["new-window.png"]} alt="new window" />
            </button>
          </div>
          <div className="sc-url-window-header-close-button" title="Close Window">
            <button style={{ fontWeight: "bolder" }} className="sc-button sc-button-blue sc-url-window-header-button" onClick={this.onCloseClick}>
              X
            </button>
          </div>
        </div>
        <div id="sc-url-window-content" className={this.props.showFooter ? "sc-url-window-content with-footer" : "sc-url-window-content"}>
          <iframe className="sc-url-window-iframe" src={this.props.url} frameBorder="0" title="Information" />
        </div>
        <div className={this.props.showFooter ? "sc-url-window-footer" : "sc-hidden"}>
          <button className="sc-button" onClick={this.onCloseClick}>
            Close Window
          </button>
          <button id="sc-url-window-dont-show-this-again" className="sc-button" onClick={this.onDontShowThisAgain}>
            Don't Show this Again
          </button>
        </div>
      </div>
    );
  }
}

export default URLWindow;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
