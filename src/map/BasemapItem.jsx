import React from "react";

const BasemapItem = (props) => {
  return (
    <div
      className={props.topoActiveIndex === props.index ? "sc-basemap-topo-item-container active" : "sc-basemap-topo-item-container"}
      onClick={() => {
        props.onTopoItemClick(props.index, props.service.name);
      }}
    >
      {props.service.name}
      <img className="sc-basemap-topo-image" src={images[props.service.image]} alt={props.service.image} />
    </div>
  );
};

export default BasemapItem;
// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
