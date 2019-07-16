import React, { Component } from "react";
import ReactDOM from "react-dom";
import "./MyMapsItem.css";
import * as helpers from "../../../helpers/helpers";
import * as turf from "@turf/turf";
import GeoJSON from "ol/format/GeoJSON.js";
import MyMapsPopup from "./MyMapsPopup.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import Menu, { SubMenu, Item as MenuItem, Divider } from "rc-menu";
import Portal from "../../../helpers/Portal.jsx";

class MyMapsItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      label: props.info.label,
      checked: props.info.visible
    };
  }

  // LABEL INPUT
  onLabelTextChange = evt => {
    this.setState({ label: evt.target.value });
    this.props.onLabelChange(this.props.info, evt.target.value);
  };

  // DELETE BUTTON
  onItemDelete = evt => {
    this.props.onItemDelete(this.props.info.id);
  };

  // VISIBILITY CHECKBOX
  onItemCheckbox = evt => {
    this.setState({ checked: evt.target.checked });
    this.props.onItemCheckboxChange(this.props.info, evt.target.checked);
  };

  // THIS IS REQUIRED WHEN CHANGING LABEL FROM POPUP OR SHOW/HIDE ALL FROM PARENT
  componentWillReceiveProps(nextProps) {
    if (nextProps.info.label !== this.state.label) this.setState({ label: nextProps.info.label });
    if (nextProps.info.visible !== this.state.checked) this.setState({ checked: nextProps.info.visible });
  }

  onToolboxClick = evt => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu key={helpers.getUID()} buttonEvent={evtClone} item={this.props.info} onMenuItemClick={this.onMenuItemClick}>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-buffer">
            <FloatingMenuItem imageName={"buffer.png"} label="Buffer" />
          </MenuItem>
          <SubMenu className="sc-floating-menu-toolbox-submenu" title={<FloatingMenuItem imageName={"edit.png"} label="Edit Tools" />} key="1">
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-edit-all">
              {<FloatingMenuItem imageName={"edit-all.png"} label="Enable All Edit Tools" />}
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-edit-vertices">
              {<FloatingMenuItem imageName={"edit-vertices.png"} label="Vertices Only" />}
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-edit-move">
              {<FloatingMenuItem imageName={"edit-move.png"} label="Move Only" />}
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-edit-rotate">
              {<FloatingMenuItem imageName={"edit-rotate.png"} label="Rotate" />}
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-edit-scale">
              {<FloatingMenuItem imageName={"edit-scale.png"} label="Scale" />}
            </MenuItem>
          </SubMenu>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onMenuItemClick = action => {
    // GET FEATURE AND CENTER
    const feature = helpers.getFeatureFromGeoJSON(this.props.info.featureGeoJSON);
    const geo = new GeoJSON().writeFeatureObject(feature);
    var feature2 = new GeoJSON().readFeature(turf.centroid(geo));
    let center = feature2.getGeometry().flatCoordinates;

    // SHOW POPUP
    window.popup.show(
      center,
      <MyMapsPopup
        onRef={ref => (this.popupRef = ref)}
        item={this.props.info}
        onLabelChange={this.props.onLabelChange}
        onLabelVisibilityChange={this.props.onLabelVisibilityChange}
        onLabelRotationChange={this.props.onLabelRotationChange}
        onDeleteButtonClick={() => this.props.onItemDelete(this.props.info.id)}
      />,
      "Drawing Options",
      () => {
        this.popupRef = undefined;
      }
    );
  };

  render() {
    return (
      <div className="sc-mymaps-item-container">
        <div className="sc-mymaps-item-container-item">
          <div>
            <input type="checkbox" style={{ verticalAlign: "middle" }} checked={this.state.checked} onChange={this.onItemCheckbox} />
            <button className="sc-button" onClick={this.onItemDelete}>
              <img src={images["eraser.png"]} alt="eraser" />
            </button>
          </div>
          <div>
            <input className="sc-mymaps-item-container-item-text-input" value={this.state.label} onChange={this.onLabelTextChange} />
          </div>
          <div className="right">
            <button className="sc-button" style={{ marginLeft: "15px" }}>
              <img src={images["color-picker.png"]} alt="colorpicker" />
            </button>
            <button className="sc-button" style={{ marginLeft: "5px" }} onClick={this.onToolboxClick}>
              <img src={images["toolbox.png"]} alt="toolbox" />
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default MyMapsItem;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
