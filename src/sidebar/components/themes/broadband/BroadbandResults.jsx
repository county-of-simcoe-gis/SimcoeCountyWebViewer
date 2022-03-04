import React, { useState } from "react";
import "./Broadband.css";
import * as helpers from "../../../../helpers/helpers";
import Collapsible from "react-collapsible";

const SectionPanel = (props) => {
  const [open, setOpen] = useState(true);

  const { section } = props;
  const onZoomClick = (feature) => {
    helpers.zoomToFeature(feature);
  };
  return (
    <div id="sc-identify-layer-container">
      <Collapsible trigger={section.section} open={open}>
        <div className="sc-identify-layer-content-container">
          {section.features.length === 0 ? <div className="sc-theme-broadband-no-results">No Results</div> : ``}
          {section.features.map((feature) => (
            <FeatureItem
              key={helpers.getUID()}
              feature={feature}
              featureTitleColumn={section.featureTitleColumn}
              onZoomClick={onZoomClick}
              onMouseEnter={props.onMouseEnter}
              onMouseLeave={props.onMouseLeave}
            />
          ))}
        </div>
      </Collapsible>
    </div>
  );
};

const FeatureItem = (props) => {
  const [open, setOpen] = useState(false);
  let { feature } = props;

  const featureProps = feature.getProperties();
  return (
    <div>
      <div className="sc-identify-feature-header" onMouseEnter={() => props.onMouseEnter(feature)} onMouseLeave={props.onMouseLeave}>
        <div className="sc-fakeLink sc-identify-feature-header-label" onClick={() => setOpen(!open)}>
          {`${featureProps[props.featureTitleColumn]}`}
        </div>
        <img className="sc-identify-feature-header-img" src={images["zoom-in.png"]} onClick={() => props.onZoomClick(feature)} title="Zoom In" alt="Zoom In" />
      </div>
      <div className={open ? "sc-identify-feature-content" : "sc-hidden"}>{helpers.FeatureContent({ feature: feature })}</div>
    </div>
  );
};

export default SectionPanel;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
