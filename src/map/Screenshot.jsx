import React, { Component } from 'react';
import ReactTooltip from 'react-tooltip';
import { saveAs } from 'file-saver';
import './Screenshot.css';
import * as helpers from "../helpers/helpers";

class Screenshot extends Component {

  constructor(props) {
      super(props); 
      
      this.state = {
        containerClassName: "sc-screenshot-container slidein",
      }

      // LISTEN FOR SIDEPANEL CHANGES
      window.emitter.addListener('sidebarChanged', (isSidebarOpen) => this.sidebarChanged(isSidebarOpen));

  }

  onScreenshotClick = () => {
    window.map.once('rendercomplete', function(event) {
      var canvas = event.context.canvas;
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(canvas.msToBlob(), 'map.png');
      } else {
        canvas.toBlob(function(blob) {
          saveAs(blob, 'map.png');
        });
      }
    });
    window.map.renderSync();

    // APP STATS
    helpers.addAppStat("Screenshot", "Click");
  }

  // HANDLE SIDEBAR CHANGES
  sidebarChanged(isSidebarOpen){
    //  SIDEBAR IN AND OUT
    if (isSidebarOpen){
        this.setState({containerClassName: "sc-screenshot-container slideout"});
    }  
    else{
        this.setState({containerClassName: "sc-screenshot-container slidein"});
    };
}

  render() { 
    return(
      <div className={this.state.containerClassName} data-tip="Take Screenshot" data-for='sc-screenshot-tooltip' onClick={this.onScreenshotClick}>
        <ReactTooltip id="sc-screenshot-tooltip"  className="sc-screenshot-tooltip" multiline={false} place="right" type="dark" effect="solid" style={{width: "1000px"}}/>
        <img src={images["capture.png"]} style={{width: "26px"}} alt="Take Screenshot"></img>
      </div>
    )
  }
}

export default Screenshot;

// IMPORT ALL IMAGES
const images = importAllImages(require.context('./images', false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
    let images = {};
    r.keys().map((item, index) => images[item.replace('./', '')] = r(item));
    return images;
  }