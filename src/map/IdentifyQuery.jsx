import React, { useState, useEffect } from "react";
import "./Identify.css";
import * as helpers from "../helpers/helpers";
import * as esriHelpers from "../helpers/esriHelpers";

import Collapsible from "react-collapsible";
import InfoRow from "../helpers/InfoRow.jsx";

function IdentifyQuery(props) {
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    let url = `${props.layerURL}/${props.layerId}/query?where=${props.where.replace("{arn}", props.arn)}&outFields=${props.fields.join(",")}&featureEncoding=esriDefault&f=json`;
    if (props.secured) {
      esriHelpers.getAccessToken((token) => {
        url = `${url}&token=${token}`;
        helpers.getJSON(url, (results) => {
          setFeatures(results.features ? results.features : []);
          setIsLoading(false);
        });
      });
    } else {
      helpers.getJSON(url, (results) => {
        setFeatures(results.features ? results.features : []);
        setIsLoading(false);
      });
    }
  }, [props]);
  return (
    <div>
      <div className={isLoading ? "sc-identify-loading" : "sc-hidden"}>
        <img src={images["loading.gif"]} alt="Loading" />
      </div>
      <div className={features.length === 0 ? "sc-hidden" : "sc-identify-container"}>
        {features.map((feature) => (
          <Feature key={helpers.getUID()} feature={feature} />
        ))}
      </div>
    </div>
  );
}

export default IdentifyQuery;

const Feature = (props) => {
  const [open, setOpen] = useState(true);
  const [keys, setKeys] = useState([]);
  const [feature, setfeature] = useState(props.feature);
  useEffect(() => {
    if (props.feature) {
      setKeys(Object.keys(props.feature.attributes));
    }
    setfeature(props.feature.attributes);
  }, [props.feature]);
  return (
    <div id="sc-identify-layer-container">
      <Collapsible trigger={"Data"} open={open}>
        <div className="sc-identify-layer-content-container sc-identify-feature-content">
          {keys.map((key) => (
            <InfoRow key={helpers.getUID()} label={key} value={feature[key]} />
          ))}
        </div>
      </Collapsible>
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
