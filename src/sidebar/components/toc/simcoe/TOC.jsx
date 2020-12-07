// REACT
import React, { Component } from "react";
import * as helpers from "../../../../helpers/helpers";
import TOCFolderView from "./toc-folder-view/TOCFolderView.jsx";
import TOCListView from "./toc-list-view/TOCListView.jsx";

class TOC extends Component {
  constructor(props) {
    super(props);
    this.state = {
      type: this.props.type,
    };
    // LISTEN FOR MAP TO MOUNT
    // window.emitter.addListener("mapLoaded", () => this.onMapLoad());
  }

  componentWillMount() {
    const tocParam = helpers.getURLParameter("TOCTYPE");
    if (tocParam !== null) this.setState({ type: tocParam });
  }

  onTypeChange = (type) => {
    this.setState({ type });
  };

  render() {
    return (
      <div>
        <TOCFolderView key="sc-toc-folder" visible={this.state.type === "FOLDER"} onTypeChange={this.onTypeChange} />
        <TOCListView key="sc-toc-list" visible={this.state.type === "LIST"} onTypeChange={this.onTypeChange} />
      </div>
    );
  }
}

export default TOC;

// IMPORT ALL IMAGES
// const images = importAllImages(require.context("../images", false, /\.(png|jpe?g|svg|gif)$/));
// function importAllImages(r) {
//   let images = {};
//   r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
//   return images;
// }
