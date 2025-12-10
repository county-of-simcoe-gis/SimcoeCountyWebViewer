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
import { createImagesObject } from "../helpers/imageHelper";
const images = createImagesObject(
  import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
);
