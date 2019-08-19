import React from "react";
import "./ThemePopupContent.css";
import * as helpers from "../../../../helpers/helpers";
import { InfoRow } from "../../../../helpers/InfoRow.jsx";

// CONTENT FOR POPUP
const ThemePopupContent = props => {
  console.log(props);

  // HANDLE URL FIELD AND PASS IT BACK AS PARAMETER TO CLICK
  let urlField = "";
  if (props.layerConfig.moreInfoUrlFieldName !== undefined) {
    props.values.forEach(row => {
      if (row[0] === props.layerConfig.moreInfoUrlFieldName) urlField = row[1];
    });
  }

  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <img className={props.popupLogoImage === undefined ? "sc-hidden" : ""} src={images[props.popupLogoImage]} alt="logo" />
      </div>
      {props.values.map(row => {
        if (row[0] !== "geometry" && row[0].substring(0, 1) !== "_") {
          return <InfoRow key={helpers.getUID()} value={row[1]} label={row[0]} />;
        } else return null;
      })}
      <div className={props.layerConfig.moreInfoUrlFieldName === undefined ? "sc-hidden" : ""}>
        <button className="sc-button sc-theme-popup-content-more-info" onClick={() => helpers.showURLWindow(urlField, false)} onMouseUp={helpers.convertMouseUpToClick}>
          More Information
        </button>
        <button
          className="sc-button sc-theme-popup-content-close"
          onClick={() => {
            window.popup.hide();
          }}
          onMouseUp={helpers.convertMouseUpToClick}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ThemePopupContent;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
