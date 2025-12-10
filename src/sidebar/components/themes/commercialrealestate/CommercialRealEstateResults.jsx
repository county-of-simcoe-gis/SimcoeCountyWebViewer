import React from "react";
import InfoRow from "../../../../helpers/InfoRow.jsx";
import * as helpers from "../../../../helpers/helpers";

const CommercialRealEstateResults = (props) => {
  return (
    <div>
      <div>
        <img className="sc-theme-commercial-realestate-search-back-to-search-icon" src={images["arrow-left.png"]} alt="Back To Search" />
        <label className="sc-fakeLink" onClick={() => props.onTabSelect(0)}>
          Back to Search
        </label>
      </div>
      <div className="sc-theme-commercial-real-estate-results-container">
        {props.results.map((result) => {
          return <Result key={helpers.getUID()} result={result} />;
        })}
      </div>
      <div className="sc-theme-commercial-real-estate-results-footer">
        Didn't find what you're looking for? Contact our{" "}
        <a href="https://edo.simcoe.ca/contact" target="_blank" rel="noopener noreferrer">
          economic development department
        </a>{" "}
        for a custom search.
      </div>
    </div>
  );
};

export default CommercialRealEstateResults;

const Result = (props) => {
  const { result } = props;
  return (
    <div className="sc-list-item">
      <img className={result.get("Incentive") === "Yes" ? "sc-theme-commercial-real-estate-result-incentive-image" : "sc-hidden"} src={images["incentive-area.png"]} alt="incentive" />
      <div className="sc-list-item-container sc-theme-commercial-real-estate-result-item-container">
        <div className="sc-theme-commercial-real-estate-result-image-container">
          <img
            className="sc-theme-commercial-real-estate-result-image"
            src={result.get("_imageurl") === null ? images["noPhoto.png"] : result.get("_imageurl")}
            alt={result.get("Address")}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = images["noPhoto.png"];
            }}
          />
          <label>{result.get("_listprice") <= 1 ? "Price Not Defined" : "$" + result.get("_listprice")}</label>
        </div>
        <div className="sc-theme-commercial-real-estate-result-details-container">
          <InfoRow key={helpers.getUID()} label={"Address"} value={result.get("Address")} />
          <InfoRow key={helpers.getUID()} label={"Property Type"} value={result.get("Property Type")} />
          <InfoRow key={helpers.getUID()} label={"Square Feet"} value={result.get("_squarefeet") === 0 ? "Unknown" : result.get("_squarefeet")} />
        </div>
        <div className="sc-list-item-action-bar" style={{ maxHeight: "14px" }}>
          <div className="sc-theme-commercial-real-estate-action-bar-buttons">
            <label
              className="sc-fakeLink"
              onClick={() => {
                const mlsNumber = result.get("MLS Number");
                const url = `https://opengis.simcoe.ca/EconomicDevelopmentReport/${mlsNumber}/?header=false`;
                helpers.showURLWindow(url, false, undefined, undefined, false);
              }}
            >
              View Details
            </label>
            <label
              className="sc-fakeLink"
              style={{ paddingLeft: "10px" }}
              onClick={() => {
                helpers.zoomToFeature(result, true);
              }}
            >
              Zoom
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// IMPORT ALL IMAGES
import { createImagesObject } from "../../../../helpers/imageHelper";
const images = createImagesObject(
  import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
);
