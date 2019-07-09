import React, { Component } from "react";
import "./MyMapsItems.css";

class MyMapsItems extends Component {
  state = {};

  render() {
    return (
      <div className="sc-container sc-mymaps-item-container">
        <div className="sc-mymaps-items-container-header">
          <img src={images["myItemsIcon.png"]} alt="My Maps Icon" />
        </div>
        <div className={this.props.children.props.children.length === 0 ? "sc-mymaps-items-no-data" : "sc-hidden"}>
          There are currently no items to display. Please use the drawing tools above to create your own personal map item.
        </div>
        <div>{this.props.children}</div>
      </div>
    );
  }
}

export default MyMapsItems;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
