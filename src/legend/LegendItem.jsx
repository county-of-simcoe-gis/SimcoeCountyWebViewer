import React, { useState } from "react";
import styles from "./LegendItem.module.css";
import * as helpers from "../helpers/helpers";
import { get, createObjectURL } from "../helpers/api";

import cx from "classnames";

function LegendItem(props) {
  const { layer } = props;
  const [legendImage, setLegendImage] = useState(layer.layer === undefined ? (layer.imageUrl === undefined ? layer.styleUrl : layer.imageUrl) : undefined);
  if (layer.imageUrl === undefined ? layer.styleUrl : layer.imageUrl) {
    const params = {};
    const secured = layer.layer !== undefined ? layer.layer.get("secured") : undefined;
    if (secured) {
      params["useBearerToken"] = true;
      get(layer.imageUrl === undefined ? layer.styleUrl : layer.imageUrl, { ...params, type: "blob" }, (results) => {
        var imageUrl = createObjectURL(results);
        setLegendImage(imageUrl);
      });
    } else {
      if (legendImage === undefined) setLegendImage(layer.imageUrl === undefined ? layer.styleUrl : layer.imageUrl);
    }
  }
  return (
    <div className={props.center ? cx(styles.container, styles.containerCenter) : styles.container}>
      <label className={styles.title}>{layer.tocDisplayName}</label>
      <Legend className={props.center ? cx(styles.image, styles.imageCenter) : styles.image} center={props.center} legendObj={layer.legendObj} legendImage={legendImage} />
    </div>
  );
}
const Legend = ({ legendImage, legendObj, center }) => {
  if (legendImage !== undefined && legendImage !== null && legendImage !== "") {
    return <img className={center ? cx(styles.image, styles.imageCenter) : styles.image} src={legendImage} alt="style" />;
  } else if (legendObj !== undefined) {
    if (legendObj.legend === undefined) return <div></div>;
    return (
      <ul className={styles.list}>
        {legendObj.legend.map((item) => {
          return <LegendRow key={helpers.getUID()} legend={item} />;
        })}
      </ul>
    );
  } else {
    return <div></div>;
  }
};
const LegendRow = ({ legend }) => {
  return (
    <li className={cx(styles.listItem, "sc-noselect")} id={helpers.getUID()} style={{ height: `${legend.height}px` }} title={legend.label}>
      <img style={{ height: `${legend.height}px`, width: `${legend.width}px` }} src={`data:${legend.contentType};base64,${legend.imageData}`} alt="style" />
      <div
        className={styles.legendLabel}
        style={{
          height: `${legend.height}px`,
          width: `${220 - legend.width}px`,
        }}
      >
        {legend.label.trim()}
      </div>
    </li>
  );
};

export default LegendItem;
