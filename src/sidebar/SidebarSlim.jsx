import React from 'react';
import "./SidebarSlim.css";
import MenuButton from './MenuButton.jsx';
import * as helpers from '../helpers/helpers'

const feedbackTemplate = (xmin, xmax, ymin, ymax, centerx, centery, scale) => `https://opengis.simcoe.ca/feedback/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}`;

const onFeedbackClick = () => {
  // APP STATS
  helpers.addAppStat("Feedback", "Click (Footer)");

  const scale = helpers.getMapScale();
  const extent = window.map.getView().calculateExtent(window.map.getSize());
  const xmin = extent[0];
  const xmax = extent[1];
  const ymin = extent[2];
  const ymax = extent[3];
  const center = window.map.getView().getCenter();

  const feedbackUrl = feedbackTemplate(xmin,xmax,ymin,ymax, center[0], center[1], scale);

  helpers.showURLWindow(feedbackUrl, false, "full")
}

const SidebarSlim = (props) => {
  return (
  <div className={window.sidebarOpen ? "sc-hidden" :"sc-sidebar-slim-container"}>
    <div className="sc-sidebar-slim-button-container" onClick={() => props.onClick("layers")}>
      <button className="sc-sidebar-slim-button">
        <img src={images['legend-32x32.png']}></img><br></br><span>Layers</span>
      </button>
    </div>
    <div className="sc-sidebar-slim-button-container"  onClick={() => props.onClick("tools")}>
      <span className={props.toolActive ? "sc-tab-button-dot-tools":"sc-hidden"}></span>
      <button className="sc-sidebar-slim-button">
        <img src={images['tools-32x32.png']}></img><br></br><span>Tools</span>
      </button>
    </div>
    <div className="sc-sidebar-slim-button-container"  onClick={() => props.onClick("mymaps")}>
      <button className="sc-sidebar-slim-button">
        <img src={images['map-32x32.png']}></img><br></br><span>My Maps</span>
      </button>
    </div>
    <div className="sc-sidebar-slim-button-container" onClick={() => props.onClick("themes")}>
      <span className={props.themeActive ? "sc-tab-button-dot-themes":"sc-hidden"}></span>
      <button className="sc-sidebar-slim-button">
        <img src={images['theme-32x32.png']}></img><br></br><span>Themes</span>
      </button>
    </div>
    <div className="sc-sidebar-slim-button-container" onClick={() => props.onClick("reports")}>
      <button className="sc-sidebar-slim-button">
        <img src={images['report-32x32.png']}></img><br></br><span>Reports</span>
      </button>
    </div>
    <div className="sc-sidebar-slim-footer-container">
      <button className="sc-sidebar-slim-footer-button" onClick={onFeedbackClick}>Feedback</button>
      <button className="sc-sidebar-slim-footer-button" onClick={() => helpers.showMessage("Legend", "Coming Soon")}>Legend</button>
      <MenuButton></MenuButton>
    </div>  
  </div>
  )
  
}

export default SidebarSlim;

// IMPORT ALL IMAGES
const images = importAllImages(require.context('./images', false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
    let images = {};
    r.keys().map((item, index) => images[item.replace('./', '')] = r(item));
    return images;
  }