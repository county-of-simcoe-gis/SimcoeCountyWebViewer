import React from "react";
const BasicBasemapSwitcherItem = (props) => {
  if (props.service === undefined) return <div></div>;
  return (
    <div
      className={(props.className !== undefined ? props.className + " " : "") + "sc-basic-basemap-topo-item-container"}
      onClick={() => {
        props.onTopoItemClick(props.index);
      }}
      title={"Switch basemap to " + props.service.name}
    >
      <div className="sc-basic-basemap-topo-item-title">{props.showLabel === true ? props.service.name : ""}</div>
      <img className={"sc-basic-basemap-topo-image"} src={images[props.service.image]} alt={props.service.image}></img>
    </div>
  );
};
export default BasicBasemapSwitcherItem;
// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
