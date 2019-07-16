// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import Menu, { SubMenu, Item as MenuItem, Divider } from "rc-menu";

// CUSTOM
import "./MyMaps.css";
import * as helpers from "../../../helpers/helpers";
import ColorBar from "./ColorBar.jsx";
import ButtonBar from "./ButtonBar.jsx";
import MyMapsItem from "./MyMapsItem";
import MyMapsItems from "./MyMapsItems";
import * as myMapsHelpers from "./myMapsHelpers";
import MyMapsPopup from "./MyMapsPopup.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import Portal from "../../../helpers/Portal.jsx";

// OPEN LAYERS
import Draw, { createBox } from "ol/interaction/Draw.js";
import { Vector as VectorSource } from "ol/source.js";
import { Circle as CircleStyle, Fill, Stroke, Style, Icon } from "ol/style.js";
import { Vector as VectorLayer } from "ol/layer.js";
import Collection from "ol/Collection";
import GeoJSON from "ol/format/GeoJSON.js";
import { fromCircle } from "ol/geom/Polygon.js";
import * as turf from "@turf/turf";

class MyMaps extends Component {
  constructor(props) {
    super(props);

    // PROPS
    this.storageKey = "myMaps";
    this.vectorSource = null;
    this.vectorLayer = null;
    this.draw = null;
    this.popupRef = undefined;

    this.state = {
      drawType: "Cancel",
      drawColor: "#e809e5",
      drawStyle: null,
      items: []
    };

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    // LISTEN FOR OTHER COMPONENTS ADDING A FEATURE
    window.emitter.addListener("addMyMapsFeature", (feature, labelText) => this.addNewItem(feature, labelText, true));
  }

  componentDidMount() {
    // GET ITEMS FROM STORAGE
    const data = myMapsHelpers.getItemsFromStorage(this.storageKey);
    this.setState(data, () => {
      this.updateStyle();
      this.importGeometries();
    });
  }

  onMapLoad = () => {
    this.updateStyle();
    this.vectorSource = new VectorSource();
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      zIndex: 1000,
      style: this.drawStyle
    });

    // PROPERTY CLICK WILL IGNORE THIS LAYER
    this.vectorLayer.setProperties({ disableParcelClick: true, name: "myMaps" });

    window.map.addLayer(this.vectorLayer);

    window.map.on("singleclick", evt => {
      if (this.draw !== null) return;

      window.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (layer === null) return;

        if (layer.get("name") !== undefined && layer.get("name") === "myMaps") {
          this.showDrawingOptionsPopup(feature, evt);
          return;
        }
      });
    });
  };

  // BUTTON BAR CLICK
  onButtonBarClick = type => {
    this.setState({ drawType: type }, () => {
      this.setDrawControl();
    });
  };

  // COLORBAR CLICK
  onColorBarClick = color => {
    this.setState({ drawColor: color }, () => {
      this.updateStyle();
    });
  };

  // DRAW START
  onDrawStart = evt => {
    // ENABLE PARCEL CLICK
    window.disableParcelClick = true;
    this.drawActive = true;

    // ADD DRAWN FEATURE TO MAIN SOURCE
    this.vectorSource.addFeature(evt.feature);
  };

  // DRAW END
  onDrawEnd = evt => {
    // CANCEL DRAW
    window.map.removeInteraction(this.draw);

    // BUG https://github.com/openlayers/openlayers/issues/3610
    //Call to double click zoom control function to deactivate zoom event
    myMapsHelpers.controlDoubleClickZoom(false);
    setTimeout(() => {
      myMapsHelpers.controlDoubleClickZoom(true);

      // RE-ENABLE PARCEL CLICK
      window.disableParcelClick = false;
    }, 251);

    // ADD NEW ITEM
    this.addNewItem(evt.feature);

    // WAIT A BIT TO AVOID MAP CLICK EVENT
    setTimeout(() => {
      this.draw = null;
    }, 1000);
  };

  addNewItem = (feature, labelText = null, fromEmmiter = false) => {
    // UID FOR FEATURE
    const featureId = helpers.getUID();

    // NEW NAME OF FEATURE
    if (labelText === null) labelText = "Drawing " + (this.state.items.length + 1);

    // GIVE TEXT A CUSTOM MESSAGE
    if (this.state.drawType === "Text") labelText = "Enter Custom Text";

    let customStyle = null;
    if (this.state.drawType === "Arrow") {
      // CONVERT LINE TO ARROW
      const arrow = myMapsHelpers.convertLineToArrow(feature.getGeometry());
      feature.setGeometry(arrow);

      // GIVE IT A BIGGER STROKE BY DEFAULT
      customStyle = myMapsHelpers.getDrawStyle(this.state.drawColor, false, 6);
      feature.setStyle(customStyle);
    } else if (this.state.drawType === "Text") {
      labelText = "Enter Custom Text";
      customStyle = myMapsHelpers.getDrawStyle(this.state.drawColor, true);
      feature.setStyle(customStyle);
    } else {
      feature.setStyle(this.state.drawStyle);
    }

    feature.setProperties({ id: featureId, label: labelText, labelVisible: false, drawType: this.state.drawType });

    // CONVERT CIRCLE TO POLYGON (GEOJSON DOESNT SUPPORT CIRCLES)
    if (feature.getGeometry() !== undefined && feature.getGeometry().getType() === "Circle") {
      var polygon = fromCircle(feature.getGeometry());
      feature.setGeometry(polygon);
    }

    // CREATE NEW ITEM
    const itemInfo = {
      id: featureId,
      label: labelText,
      labelVisible: this.state.drawType === "Text" ? true : false,
      labelStyle: null,
      labelRotation: 0,
      featureGeoJSON: new GeoJSON({ dataProjection: "EPSG:3857", featureProjection: "EPSG:3857" }).writeFeature(feature, {
        dataProjection: "EPSG:3857",
        featureProjection: "EPSG:3857"
      }),
      style: customStyle === null ? this.state.drawStyle : customStyle,
      visible: true,
      drawType: this.state.drawType
    };

    // ADD NEW FEATURE TO STATE
    this.setState(
      prevState => ({
        items: [itemInfo, ...prevState.items],
        drawType: "Cancel"
      }),
      () => {
        // UPDATE FEATURE LABEL
        myMapsHelpers.setFeatureLabel(itemInfo);

        // UPDATE STORAGE
        this.saveStateToStorage();
        this.importGeometries();
      }
    );

    if (fromEmmiter) {
      window.emitter.emit("setSidebarVisiblity", "OPEN");
      window.emitter.emit("activateTab", "mymaps");
      helpers.showMessage("My Maps", "Feature Added to MyMaps");

      // ADD FEATURE TO MAIN SOURCE
      this.vectorSource.addFeature(feature);
    }
  };

  updateFeatureGeoJSON = (feature, callback) => {
    const featureGeoJSON = new GeoJSON({ dataProjection: "EPSG:3857", featureProjection: "EPSG:3857" }).writeFeature(feature, {
      dataProjection: "EPSG:3857",
      featureProjection: "EPSG:3857"
    });

    this.setState(
      {
        // UPDATE LABEL
        items: this.state.items.map(item => (item.id === feature.get("id") ? Object.assign({}, item, { featureGeoJSON: featureGeoJSON }) : item))
      },
      () => {
        callback();
      }
    );
  };
  // LABEL TEXTBOX
  onLabelChange = (itemInfo, label) => {
    // IF WE HAVE A REF TO A POPUP, SEND THE UPDATE
    if (this.popupRef !== undefined) {
      this.popupRef.parentLabelChanged(itemInfo, label);
    }

    this.setState(
      {
        // UPDATE LABEL
        items: this.state.items.map(item => (item.id === itemInfo.id ? Object.assign({}, item, { label }) : item))
      },
      () => {
        // UPDATE FEATURE ATTRIBUTE
        let feature = myMapsHelpers.getFeatureById(itemInfo.id);
        feature.set("label", label);

        this.updateFeatureGeoJSON(feature, () => {
          // UPDATE FEATURE LABEL
          myMapsHelpers.setFeatureLabel(itemInfo);

          // SAVE TO STORAGE
          this.saveStateToStorage();
        });
      }
    );
  };

  // LABEL TEXTBOX
  onLabelRotationChange = (itemInfo, rotation) => {
    this.setState(
      {
        items: this.state.items.map(item => (item.id === itemInfo.id ? Object.assign({}, item, { labelRotation: rotation }) : item))
      },
      () => {
        const item = this.state.items.filter(item => {
          return item.id === itemInfo.id;
        })[0];

        if (this.popupRef !== undefined) {
          this.popupRef.props.item.labelVisible = item.labelVisible;
          this.popupRef.forceUpdate();
        }

        myMapsHelpers.setFeatureLabel(item);
        this.saveStateToStorage();
        this.forceUpdate();
      }
    );
  };

  // DELETE CLICK
  onItemDelete = itemInfo => {
    this.setState(
      {
        items: this.state.items.filter(function(item) {
          return item.id !== itemInfo.id;
        })
      },
      () => {
        // UPDATE STORAGE
        this.saveStateToStorage();

        // REMOVE ITEM FROM SOURCE
        this.removeItemFromVectorSource(itemInfo);
      }
    );
  };

  // ITEM VISIBILITY CHECKBOX
  onItemCheckboxChange = (itemInfo, visible) => {
    this.setState(
      {
        items: this.state.items.map(item => (item.id === itemInfo.id ? Object.assign({}, item, { visible: visible }) : item))
      },
      () => {
        this.saveStateToStorage();
        this.updateItemVisibility(itemInfo, visible);
      }
    );
  };

  // LABEL VISIBILITY CHECKBOX FROM POPUP
  onLabelVisibilityChange = (itemId, visible) => {
    this.setState(
      {
        items: this.state.items.map(item => (item.id === itemId ? Object.assign({}, item, { labelVisible: visible }) : item))
      },
      () => {
        const item = this.state.items.filter(item => {
          return item.id === itemId;
        })[0];

        myMapsHelpers.setFeatureLabel(item);
        this.saveStateToStorage();
      }
    );
  };

  // IMPORT SAVED ITEMS FROM STORAGE
  importGeometries = () => {
    this.vectorLayer.getSource().clear();
    this.state.items.forEach(item => {
      const style = myMapsHelpers.getStyleFromJSON(item.style);
      let feature = helpers.getFeatureFromGeoJSON(item.featureGeoJSON);

      // VISIBILITY
      if (item.visible) feature.setStyle(style);
      else feature.setStyle(new Style({}));

      this.vectorLayer.getSource().addFeature(feature);

      // LABELS
      if (item.labelVisible) myMapsHelpers.setFeatureLabel(item);
    });
  };

  updateStyle = () => {
    const drawStyle = myMapsHelpers.getDrawStyle(this.state.drawColor);
    this.setState({ drawStyle: drawStyle }, () => {
      // UPDATE THE DRAW TO PICK UP NEW STYLE
      this.setDrawControl();

      // SAVE STATE TO STORAGE
      this.saveStateToStorage();
    });
  };

  showDrawingOptionsPopup = (feature, evt = null) => {
    // GET FEATURE AND CENTER
    var featureId = feature.getProperties().id;
    var item = this.state.items.filter(item => {
      return item.id === featureId;
    })[0];
    let center = null;
    if (evt === null) {
      const geo = new GeoJSON().writeFeatureObject(feature);
      var feature = new GeoJSON().readFeature(turf.centroid(geo));
      center = feature.getGeometry().flatCoordinates;
    } else {
      center = evt.coordinate;
    }

    // SHOW POPUP
    window.popup.show(
      center,
      <MyMapsPopup
        onRef={ref => (this.popupRef = ref)}
        item={item}
        onLabelChange={this.onLabelChange}
        onLabelVisibilityChange={this.onLabelVisibilityChange}
        onLabelRotationChange={this.onLabelRotationChange}
        onToolsButtonClick={this.onToolsButtonClick}
        onDeleteButtonClick={this.onItemDelete}
      />,
      "Drawing Options",
      () => {
        //this.popupRef = undefined;
      }
    );
  };

  onToolsButtonClick = (evt, item) => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          item={this.props.info}
          onMenuItemClick={this.onMenuItemClick}
          classNamesToIgnore={["sc-mymaps-popup-footer-button", "sc-mymaps-footer-buttons-img"]}
        >
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

  onMenuItemClick = action => {};

  saveStateToStorage = () => {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  };

  setDrawControl = () => {
    // REMOVE THE LAST DRAW
    if (this.draw !== null) window.map.removeInteraction(this.draw);

    // DO NOTHING IF ITS CANCEL
    if (this.state.drawType === "Cancel") {
      return;
    }

    // GET DRAW TYPE
    let drawType = this.state.drawType;
    if (drawType === "Rectangle") drawType = "Circle";
    else if (drawType === "Arrow") drawType = "LineString";
    else if (drawType === "Text") drawType = "Point";

    // CREATE A NEW DRAW
    this.draw = new Draw({
      features: new Collection([]),
      type: drawType,
      geometryFunction: this.state.drawType === "Rectangle" ? createBox() : undefined,
      style: this.state.drawStyle
    });

    // END DRAWING
    this.draw.on("drawend", event => {
      this.onDrawEnd(event);
    });

    // START DRAWING
    this.draw.on("drawstart", event => {
      this.onDrawStart(event);
    });

    //ADD DRAW INTERACTION TO MAP
    window.map.addInteraction(this.draw);
  };

  removeItemFromVectorSource = itemInfo => {
    this.vectorSource.getFeatures().forEach(feature => {
      const id = feature.getProperties().id;
      if (id === itemInfo.id) this.vectorSource.removeFeature(feature);
      return;
    });
  };

  updateItemVisibility = (itemInfo, visible) => {
    this.vectorSource.getFeatures().forEach(feature => {
      const id = feature.getProperties().id;
      if (id === itemInfo.id) {
        if (visible) {
          feature.setStyle(myMapsHelpers.getStyleFromJSON(itemInfo.style));
          myMapsHelpers.setFeatureLabel(itemInfo);
        } else feature.setStyle(new Style({}));

        return;
      }
    });
  };

  updateLabelVisibility = (itemInfo, visible) => {
    this.vectorSource.getFeatures().forEach(feature => {
      const id = feature.getProperties().id;
      if (id === itemInfo.id) {
        if (visible) feature.setStyle(myMapsHelpers.getStyleFromJSON(itemInfo.style));
        else feature.setStyle(new Style({}));

        return;
      }
    });
  };

  render() {
    return (
      <div id={"sc-mymaps-container"} className="sc-mymaps-container">
        <ButtonBar onClick={this.onButtonBarClick} activeButton={this.state.drawType} />
        <ColorBar onClick={this.onColorBarClick} activeColor={this.state.drawColor} />
        <MyMapsItems>
          <TransitionGroup>
            {this.state.items.map(myMapsItem => (
              <CSSTransition key={myMapsItem.id} timeout={500} classNames="sc-mymaps-item">
                <MyMapsItem
                  key={myMapsItem.id}
                  info={myMapsItem}
                  onLabelChange={this.onLabelChange}
                  onItemDelete={this.onItemDelete}
                  onItemCheckboxChange={this.onItemCheckboxChange}
                  onLabelVisibilityChange={this.onLabelVisibilityChange}
                  onLabelRotationChange={this.onLabelRotationChange}
                />
              </CSSTransition>
            ))}
          </TransitionGroup>
        </MyMapsItems>
      </div>
    );
  }
}

export default MyMaps;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
