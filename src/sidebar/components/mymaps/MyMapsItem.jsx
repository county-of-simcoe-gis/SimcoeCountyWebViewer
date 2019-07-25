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
import * as myMapsHelpers from "./myMapsHelpers";
import Feature from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import { Vector as VectorSource } from "ol/source.js";
import { fromExtent } from "ol/geom/Polygon.js";
import { Stroke, Style, Fill, Circle as CircleStyle } from "ol/style";

class MyMapsItem extends Component {
  constructor(props) {
    super(props);

    this.vectorLayer = null;

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

    if (this.vectorLayer !== null) {
      window.map.removeLayer(this.vectorLayer);
      this.vectorLayer = null;
    }
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
    // const feature = myMapsHelpers.getFeatureById(this.props.info.id);
    // this.props.showDrawingOptionsPopup(feature, null, "symbolizer");
    // GET FEATURE AND CENTER
    // const feature = helpers.getFeatureFromGeoJSON(this.props.info.featureGeoJSON);
    // const geo = new GeoJSON().writeFeatureObject(feature);
    // var feature2 = new GeoJSON().readFeature(turf.centroid(geo));
    // let center = feature2.getGeometry().flatCoordinates;
    // // SHOW POPUP
    // window.popup.show(
    //   center,
    //   <MyMapsPopup
    //     onRef={ref => (this.popupRef = ref)}
    //     item={this.props.info}
    //     onLabelChange={this.props.onLabelChange}
    //     onLabelVisibilityChange={this.props.onLabelVisibilityChange}
    //     onLabelRotationChange={this.props.onLabelRotationChange}
    //     onDeleteButtonClick={() => this.props.onItemDelete(this.props.info.id)}
    //   />,
    //   "Drawing Options",
    //   () => {
    //     this.popupRef = undefined;
    //   }
    // );
  };

  onSymbolizerClick = evt => {
    const feature = myMapsHelpers.getFeatureById(this.props.info.id);
    this.props.showDrawingOptionsPopup(feature, null, "symbolizer");
  };

  onMouseOver = evt => {
    // LAYER FOR HIGHLIGHTING
    if (this.vectorLayer === null) {
      var shadowStyle = new Style({
        stroke: new Stroke({
          color: [0, 0, 127, 0.3],
          width: 6
        }),
        image: new CircleStyle({
          radius: 10,
          stroke: new Stroke({
            color: [0, 0, 127, 0.3],
            width: 6
          }),
          fill: new Fill({
            color: [0, 0, 127, 0.3]
          })
        }),
        zIndex: 100000
      });

      var feature = new Feature({
        geometry: myMapsHelpers.getFeatureById(this.props.info.id).getGeometry()
      });

      this.vectorLayer = new VectorLayer({
        source: new VectorSource({
          features: [feature]
        }),
        zIndex: 100000,
        style: shadowStyle
      });
      window.map.addLayer(this.vectorLayer);
    }

    //var feature2 = new GeoJSON().readFeature(turf.centroid(geo));
    // GET FEATURE AND CENTER
    //const feature = helpers.getFeatureFromGeoJSON(this.props.info.featureGeoJSON);
    // const feature = myMapsHelpers.getFeatureById(this.props.info.id);
    // const geo = new GeoJSON().writeFeatureObject(feature);
    // console.log(geo);
    // var feature2 = new GeoJSON().readFeature(turf.buffer(geo, 0.01, { units: "kilometers" }));
    // console.log(feature2);

    // const extent = myMapsHelpers
    //   .getFeatureById(this.props.info.id)
    //   .getGeometry()
    //   .getExtent();
    // var feature = new Feature({
    //   geometry: fromExtent(extent)
    // });

    // // LAYER FOR HIGHLIGHTING
    // if (this.vectorLayer === null) {
    //   this.vectorLayer = new VectorLayer({
    //     source: new VectorSource({
    //       features: [feature]
    //     }),
    //     zIndex: 100000
    //   });
    //   window.map.addLayer(this.vectorLayer);
    // }
  };

  onMouseOut = evt => {
    window.map.removeLayer(this.vectorLayer);
    this.vectorLayer = null;
  };

  render() {
    return (
      <div className="sc-mymaps-item-container" onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
        <div className="sc-mymaps-item-container-item">
          <div>
            <input type="checkbox" style={{ verticalAlign: "middle" }} checked={this.state.checked} onChange={this.onItemCheckbox} />
            <button className="sc-button" onClick={this.onItemDelete}>
              <img src={images["eraser.png"]} alt="eraser" />
            </button>
          </div>
          <div className={this.state.checked ? "" : "sc-disabled"}>
            <input className="sc-mymaps-item-container-item-text-input" value={this.state.label} onChange={this.onLabelTextChange} />
          </div>
          <div className={this.state.checked ? "right" : "right disabled"}>
            <button className="sc-button" style={{ marginLeft: "15px" }} onClick={this.onSymbolizerClick}>
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
