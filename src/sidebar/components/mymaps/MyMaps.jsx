// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { Item as MenuItem } from "rc-menu";

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
import Identify from "../../../map/Identify.jsx";
import mainConfig from "../../../config.json";

// OPEN LAYERS
import Draw, { createBox } from "ol/interaction/Draw.js";
import { Modify, Translate } from "ol/interaction.js";
import { Vector as VectorSource } from "ol/source.js";
import { Style } from "ol/style.js";
import { Vector as VectorLayer } from "ol/layer.js";
import Collection from "ol/Collection";
import GeoJSON from "ol/format/GeoJSON.js";
import { fromCircle } from "ol/geom/Polygon.js";
import MyMapsAdvanced from "./MyMapsAdvanced";
import Overlay from "ol/Overlay.js";
import { getLength } from "ol/sphere.js";
import * as shpWrite from "shp-write";

const feedbackTemplate = (xmin, xmax, ymin, ymax, centerx, centery, scale, myMapsId, featureId) =>
  `${mainConfig.feedbackUrl}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}&REPORT_PROBLEM=True&MY_MAPS_ID=${myMapsId}&MY_MAPS_FEATURE_ID=${featureId}`;

class MyMaps extends Component {
  constructor(props) {
    super(props);

    // PROPS
    this.storageKey = "myMaps";
    this.vectorSource = null;
    this.vectorLayer = null;
    this.draw = null;
    this.popupRef = undefined;
    this.modify = null;
    this.translate = null;
    this.tooltipElement = null;
    this.tooltip = null;
    this.bearing = null;
    this.length = null;
    this.currentDrawFeature = null;
    this.state = {
      drawType: "Cancel",
      drawColor: "#e809e5",
      drawStyle: null,
      items: [],
      isEditing: false,
      toolTipClass: "sc-hidden",
      toolTipId: helpers.getUID()
    };

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    // LISTEN FOR OTHER COMPONENTS ADDING A FEATURE
    window.emitter.addListener("addMyMapsFeature", (feature, labelText) => this.addNewItem(feature, labelText, true));
  }

  componentDidMount() {}

  onMapLoad = () => {
    //this.updateStyle();
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
      if (this.draw !== null || this.state.isEditing) return;

      window.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (layer === null) return;

        if (layer.get("name") !== undefined && layer.get("name") === "myMaps") {
          if (this.state.drawType === "Eraser") {
            // REMOVE ITEM FROM SOURCE
            this.onItemDelete(feature.get("id"));
            return;
          } else this.showDrawingOptionsPopup(feature, evt);

          return;
        }
      });
    });

    // GET ITEMS FROM STORAGE
    const data = helpers.getItemsFromStorage(this.storageKey);
    this.setState(data, () => {
      this.updateStyle();
      this.importGeometries();
    });

    // URL PARAMETER
    const myMapsId = helpers.getURLParameter("MY_MAPS_ID");
    if (myMapsId !== null) {
      myMapsHelpers.importMyMaps(myMapsId, result => {
        if (result.error !== undefined) helpers.showMessage("MyMaps Import", "That MyMaps ID was NOT found!", "red");
        else {
          helpers.showMessage("MyMaps Import", "Success!  MyMaps imported.");
          this.onMyMapsImport(result);

          const featureId = helpers.getURLParameter("MY_MAPS_FEATURE_ID");
          if (featureId !== null) {
            const item = this.state.items.filter(item => {
              return item.id === featureId;
            })[0];

            let feature = helpers.getFeatureFromGeoJSON(item.featureGeoJSON);
            helpers.zoomToFeature(feature);
          }
        }
      });
    }
  };

  // Format length output.
  formatLength = line => {
    var length = getLength(line);
    var output;
    if (length > 1000) {
      output = Math.round((length / 1000) * 100) / 100 + " km";
    } else {
      output = Math.round((length * 100) / 100) + " m";
    }
    return output;
  };

  // BUTTON BAR CLICK
  onButtonBarClick = type => {
    if (this.draw !== null) {
      window.emitter.emit("changeCursor","standard");
      window.map.removeInteraction(this.draw);

      if (this.currentDrawFeature !== null) {
        this.vectorSource.removeFeature(this.currentDrawFeature);
        this.currentDrawFeature = null;
      }
    }

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
    // DISABLE PARCEL CLICK
    window.disableParcelClick = true;
    // DISABLE IDENTIFY CLICK
    window.disableIdentifyClick = true;
    // DISABLE POPUPS
    window.isDrawingOrEditing = true;

    // ADD DRAWN FEATURE TO MAIN SOURCE
    this.currentDrawFeature = evt.feature;
    this.vectorSource.addFeature(evt.feature);
    var tooltipCoord = evt.coordinate;
    if (this.state.drawType === "Bearing") {
      this.sketch = evt.feature;
      this.listener = this.sketch.getGeometry().on("change", evt => {
        var geom = evt.target;
        this.bearing = myMapsHelpers.getBearing(geom.getFirstCoordinate(), geom.getLastCoordinate());
        tooltipCoord = geom.getLastCoordinate();
        this.tooltipElement.innerHTML = this.bearing;
        this.tooltip.setPosition(tooltipCoord);
        this.setState({ toolTipClass: "sc-mymaps-tooltip" });
      });
    }else if (this.state.drawType === "Measure"){
      this.sketch = evt.feature;
      this.listener = this.sketch.getGeometry().on("change", evt => {
        var geom = evt.target;
        this.length = this.formatLength(geom);
        this.bearing = myMapsHelpers.getBearing(geom.getFirstCoordinate(), geom.getLastCoordinate());
        tooltipCoord = geom.getLastCoordinate();
        this.tooltipElement.innerHTML = this.length;
        this.tooltip.setPosition(tooltipCoord);
        this.setState({ toolTipClass: "sc-mymaps-tooltip" });
      });
    }
  };

  // DRAW END
  onDrawEnd = evt => {
    
    console.log("ending");
    this.setState({ tooltipClass: "sc-hidden" });
    if (this.state.drawType === "Bearing" || this.state.drawType === "Measure") {
      this.tooltipElement.innerHTML = "";
    }

    // CANCEL DRAW
    window.emitter.emit("changeCursor","standard");
    window.map.removeInteraction(this.draw);

    // BUG https://github.com/openlayers/openlayers/issues/3610
    //Call to double click zoom control function to deactivate zoom event
    myMapsHelpers.controlDoubleClickZoom(false);
    setTimeout(() => {
      myMapsHelpers.controlDoubleClickZoom(true);

      // RE-ENABLE POPUPS
      window.isDrawingOrEditing = false;
    }, 1000);

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
    if (labelText === null && this.state.drawType !== "Bearing" && this.state.drawType !== "Measure") labelText = "Drawing " + (this.state.items.length + 1);

    if (this.state.drawType === "Bearing") labelText = "Bearing: " + this.bearing;
    if (this.state.drawType === "Measure") labelText = this.length;
    // GIVE TEXT A CUSTOM MESSAGE
    if (this.state.drawType === "Text") labelText = "Enter Custom Text";

    let customStyle = null;
    if (!fromEmmiter) {
      if (this.state.drawType === "Arrow") {
        // CONVERT LINE TO ARROW
        const arrow = myMapsHelpers.convertLineToArrow(feature.getGeometry());
        feature.setGeometry(arrow);

        // GIVE IT A BIGGER STROKE BY DEFAULT
        customStyle = myMapsHelpers.getDefaultDrawStyle(this.state.drawColor, false, 6, feature.getGeometry().getType());
        feature.setStyle(customStyle);
      } else if (this.state.drawType === "Text") {
        labelText = "Enter Custom Text";
        customStyle = myMapsHelpers.getDefaultDrawStyle(this.state.drawColor, true, undefined, undefined, feature.getGeometry().getType());
        feature.setStyle(customStyle);
      } else {
        customStyle = myMapsHelpers.getDefaultDrawStyle(this.state.drawColor, undefined, undefined, undefined, feature.getGeometry().getType());
        feature.setStyle(customStyle);
      }
    } else {
      customStyle = feature.getStyle();
    }

    feature.setProperties({ id: featureId, label: labelText, labelVisible: false, drawType: this.state.drawType, isParcel: false });

    // CONVERT CIRCLE TO POLYGON (GEOJSON DOESNT SUPPORT CIRCLES)
    if (feature.getGeometry() !== undefined && feature.getGeometry().getType() === "Circle") {
      var polygon = fromCircle(feature.getGeometry());
      feature.setGeometry(polygon);
    }

    // CREATE NEW ITEM
    const itemInfo = {
      id: featureId,
      label: labelText,
      labelVisible: this.state.drawType === "Text" || this.state.drawType === "Bearing" || this.state.drawType === "Measure" ? true : false,
      labelStyle: null,
      labelRotation: this.state.drawType === "Bearing" || this.state.drawType === "Measure" ? (this.bearing>180? this.bearing+90 : this.bearing-90): 0,
      featureGeoJSON: helpers.featureToGeoJson(feature),
      style: customStyle === null ? this.state.drawStyle : customStyle,
      visible: true,
      drawType: this.state.drawType,
      geometryType: feature.getGeometry().getType()
    };

    // ADD NEW FEATURE TO STATE
    this.setState(
      prevState => ({
        items: [itemInfo, ...prevState.items],
        drawType: "Cancel"
      }),
      () => {
        // UPDATE STORAGE
        this.saveStateToStorage();
        this.importGeometries();

        // UPDATE FEATURE LABEL
        myMapsHelpers.setFeatureLabel(itemInfo);

        // SHOW POPUP IF WE'RE ADDING TEXT
        if (itemInfo.drawType === "Text") this.showDrawingOptionsPopup(feature);
      }
    );

    if (fromEmmiter) {
      window.emitter.emit("setSidebarVisiblity", "OPEN");
      window.emitter.emit("activateTab", "mymaps");
      helpers.showMessage("My Maps", "Feature Added to MyMaps");

      // FLAG AS PARCEL
      if (feature.get("arn") !== undefined) {
        feature.setProperties({ isParcel: true });
      }

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
        if (callback !== undefined) callback();
      }
    );
  };
  // LABEL TEXTBOX
  onLabelChange = (itemId, label) => {
    console.log(itemId);
    const itemInfo = this.state.items.filter(item => {
      return item.id === itemId;
    })[0];

    // IF WE HAVE A REF TO A POPUP, SEND THE UPDATE
    if (this.popupRef !== undefined) {
      console.log(itemInfo);
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

  // LABEL ROTATION
  onLabelRotationChange = (itemInfo, rotation) => {
    this.setState(
      {
        items: this.state.items.map(item => (item.id === itemInfo.id ? Object.assign({}, item, { labelRotation: rotation }) : item))
      },
      () => {
        const item = this.state.items.filter(item => {
          return item.id === itemInfo.id;
        })[0];

        myMapsHelpers.setFeatureLabel(item);
        this.saveStateToStorage();
      }
    );
  };

  // DELETE CLICK
  onItemDelete = id => {
    this.setState(
      {
        items: this.state.items.filter(function(item) {
          return item.id !== id;
        })
      },
      () => {
        // UPDATE STORAGE
        this.saveStateToStorage();

        // REMOVE ITEM FROM SOURCE
        this.removeItemFromVectorSource(id);
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
    if (this.popupRef !== undefined) {
      const item = this.state.items.filter(item => {
        return item.id === itemId;
      })[0];
      this.popupRef.parentLabelVisibleChanged(item, visible);
    }

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
        this.importGeometries();
      }
    );
  };

  // IMPORT SAVED ITEMS FROM STORAGE
  importGeometries = () => {
    this.vectorLayer.getSource().clear();
    this.state.items.forEach(item => {
      const style = myMapsHelpers.getStyleFromJSON(item.style, item.pointType);
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
    const drawStyle = myMapsHelpers.getDefaultDrawStyle(this.state.drawColor);
    this.setState({ drawStyle: drawStyle }, () => {
      // UPDATE THE DRAW TO PICK UP NEW STYLE
      this.setDrawControl();

      // SAVE STATE TO STORAGE
      this.saveStateToStorage();
    });
  };

  setStyleById = (itemId, style, pointType, strokeType) => {
    this.vectorSource.getFeatures().forEach(feature => {
      const id = feature.getProperties().id;
      if (id === itemId) {
        feature.setStyle(style);

        let itemUpdate = null;
        if (pointType !== undefined) itemUpdate = { style: style, pointType: pointType };
        else if (strokeType !== undefined) itemUpdate = { style: style, strokeType: strokeType };
        else itemUpdate = { style: style };

        this.setState(
          {
            // UPDATE LABEL
            items: this.state.items.map(item => (item.id === itemId ? Object.assign({}, item, itemUpdate) : item))
          },
          () => {
            // SAVE STATE TO STORAGE
            this.saveStateToStorage();

            const item = this.state.items.filter(item => {
              return item.id === itemId;
            })[0];

            myMapsHelpers.setFeatureLabel(item);
          }
        );

        return;
      }
    });
  };

  onRadiusSliderChange = (itemId, style) => {
    this.setStyleById(itemId, style);
  };

  onRotationSliderChange = (itemId, style) => {
    this.setStyleById(itemId, style);
  };

  onFillOpacitySliderChange = (itemId, style) => {
    this.setStyleById(itemId, style);
  };

  onStrokeOpacitySliderChange = (itemId, style) => {
    this.setStyleById(itemId, style);
  };

  onPointStyleDropDown = (itemId, style, pointType) => {
    this.setStyleById(itemId, style, pointType);
  };

  onFillColorPickerChange = (itemId, style) => {
    this.setStyleById(itemId, style);
  };

  onStrokeColorPickerChange = (itemId, style) => {
    this.setStyleById(itemId, style);
  };

  onStrokeWidthSliderChange = (itemId, style) => {
    this.setStyleById(itemId, style);
  };

  onStrokeTypeDropDown = (itemId, style, strokeType) => {
    this.setStyleById(itemId, style, undefined, strokeType);
  };

  showDrawingOptionsPopup = (feature, evt = null, activeTool = "none") => {
    // GET FEATURE AND CENTER
    var featureId = feature.getProperties().id;
    var item = this.state.items.filter(item => {
      return item.id === featureId;
    })[0];

    let center = null;
    if (evt === null) {
      let geom = feature.getGeometry();
      if (geom === undefined) return;
      helpers.getGeometryCenter(geom, featureCenter => {
        // SHOW POPUP
        window.popup.show(
          featureCenter.flatCoordinates ,
          <MyMapsPopup
            key={helpers.getUID()}
            activeTool={activeTool}
            onRef={ref => (this.popupRef = ref)}
            item={item}
            onLabelChange={this.onLabelChange}
            onLabelVisibilityChange={this.onLabelVisibilityChange}
            onLabelRotationChange={this.onLabelRotationChange}
            onFooterToolsButtonClick={this.onFooterToolsButtonClick}
            onDeleteButtonClick={this.onItemDelete}
            onPointStyleDropDown={this.onPointStyleDropDown}
            onRadiusSliderChange={this.onRadiusSliderChange}
            onFillOpacitySliderChange={this.onFillOpacitySliderChange}
            onFillColorPickerChange={this.onFillColorPickerChange}
            onAngleSliderChange={this.onAngleSliderChange}
            onRotationSliderChange={this.onRotationSliderChange}
            onStrokeOpacitySliderChange={this.onStrokeOpacitySliderChange}
            onStrokeColorPickerChange={this.onStrokeColorPickerChange}
            onStrokeWidthSliderChange={this.onStrokeWidthSliderChange}
            onStrokeTypeDropDown={this.onStrokeTypeDropDown}
            onMyMapItemToolsButtonClick={this.onMyMapItemToolsButtonClick}
          />,
          "Drawing Options",
          () => {
            //this.popupRef = undefined;
          }
        );
      });
    } else {
      center = evt.coordinate;
      // SHOW POPUP
      window.popup.show(
        center,
        <MyMapsPopup
          key={helpers.getUID()}
          activeTool={activeTool}
          onRef={ref => (this.popupRef = ref)}
          item={item}
          onLabelChange={this.onLabelChange}
          onLabelVisibilityChange={this.onLabelVisibilityChange}
          onLabelRotationChange={this.onLabelRotationChange}
          onFooterToolsButtonClick={this.onFooterToolsButtonClick}
          onDeleteButtonClick={this.onItemDelete}
          onPointStyleDropDown={this.onPointStyleDropDown}
          onRadiusSliderChange={this.onRadiusSliderChange}
          onFillOpacitySliderChange={this.onFillOpacitySliderChange}
          onFillColorPickerChange={this.onFillColorPickerChange}
          onAngleSliderChange={this.onAngleSliderChange}
          onRotationSliderChange={this.onRotationSliderChange}
          onStrokeOpacitySliderChange={this.onStrokeOpacitySliderChange}
          onStrokeColorPickerChange={this.onStrokeColorPickerChange}
          onStrokeWidthSliderChange={this.onStrokeWidthSliderChange}
          onStrokeTypeDropDown={this.onStrokeTypeDropDown}
          onMyMapItemToolsButtonClick={this.onMyMapItemToolsButtonClick}
        />,
        "Drawing Options",
        () => {
          //this.popupRef = undefined;
        }
      );
    }
  };

  onFooterToolsButtonClick = (evt, item) => {
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
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onMenuItemClick = (action, item) => {
    if (action === "sc-floating-menu-show-all") {
      this.toggleAllVisibility(true);
    } else if (action === "sc-floating-menu-hide-all") {
      this.toggleAllVisibility(false);
    } else if (action === "sc-floating-menu-delete-selected") {
      this.deleteSelected(true);
    } else if (action === "sc-floating-menu-delete-unselected") {
      this.deleteSelected(false);
    } else if (action === "sc-floating-menu-buffer") {
      const feature = myMapsHelpers.getFeatureById(item.id);
      this.showDrawingOptionsPopup(feature, null, "buffer");
    } else if (action === "sc-floating-menu-symbolizer") {
      const feature = myMapsHelpers.getFeatureById(item.id);
      this.showDrawingOptionsPopup(feature, null, "symbolizer");
    } else if (action === "sc-floating-menu-zoomto") {
      const feature = myMapsHelpers.getFeatureById(item.id);
      helpers.zoomToFeature(feature);
    } else if (action === "sc-floating-menu-delete") {
      this.onItemDelete(item.id);
    } else if (action === "sc-floating-menu-edit-vertices") {
      this.editVertices(item.id);
    } else if (action === "sc-floating-menu-report-problem") {
      this.onReportProblem(item.id);
    } else if (action === "sc-floating-menu-identify") {
      this.onIdentify(item.id);
    }
    // } else if (action === "sc-floating-menu-export-to-shapefile") {
    //   this.onExportToShapeFile();
    // }
  };

  // TODO:  CHANGE PROJECTION TO WEB MERCATOR IN OUTPUT.
  //https://github.com/mapbox/shp-write/pull/54
  onExportToShapeFile = () => {
    const geoJson = new GeoJSON({ dataProjection: "EPSG:3857", featureProjection: "EPSG:3857" }).writeFeatures(this.vectorSource.getFeatures(), {
      dataProjection: "EPSG:3857",
      featureProjection: "EPSG:3857"
    });
    // (optional) set names for feature types and zipped folder
    var options = {
      folder: "myshapes",
      types: {
        point: "mypoints",
        polygon: "mypolygons",
        line: "mylines"
      },
      prj:
        'PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]'
    };
    // a GeoJSON bridge for features
    shpWrite.download(JSON.parse(geoJson), options);

    console.log(JSON.parse(geoJson));
  };

  onIdentify = id => {
    const feature = myMapsHelpers.getFeatureById(id);
    window.emitter.emit("loadReport", <Identify geometry={feature.getGeometry()}></Identify>);
  };

  onReportProblem = id => {
    myMapsHelpers.exportMyMaps(result => {
      // APP STATS
      helpers.addAppStat("Report Problem", "My Maps Toolbox");

      const scale = helpers.getMapScale();
      const extent = window.map.getView().calculateExtent(window.map.getSize());
      const xmin = extent[0];
      const xmax = extent[1];
      const ymin = extent[2];
      const ymax = extent[3];
      const center = window.map.getView().getCenter();

      const feedbackUrl = feedbackTemplate(xmin, xmax, ymin, ymax, center[0], center[1], scale, result.id, id);

      console.log(feedbackUrl);
      helpers.showURLWindow(feedbackUrl, false, "full");
    }, id);
  };

  onMyMapItemToolsButtonClick = (evt, item) => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          classNamesToIgnore={["sc-mymaps-popup-footer-button", "sc-mymaps-footer-buttons-img"]}
          onMenuItemClick={action => {
            this.onMenuItemClick(action, item);
          }}
        >
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-buffer">
            <FloatingMenuItem imageName={"buffer.png"} label="Buffer" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-symbolizer">
            <FloatingMenuItem imageName={"color-picker.png"} label="Symbolize" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoomto">
            <FloatingMenuItem imageName={"zoom.png"} label="Zoom To" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-delete">
            <FloatingMenuItem imageName={"eraser.png"} label="Delete" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-report-problem">
            <FloatingMenuItem imageName={"error.png"} label="Report a Problem" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-identify">
            <FloatingMenuItem imageName={"identify.png"} label="Identify" />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  deleteSelected = selected => {
    this.state.items.forEach(item => {
      setTimeout(() => {
        if (selected && item.visible) this.onItemDelete(item.id);
        else if (!selected && !item.visible) this.onItemDelete(item.id);
      }, 200);
    });
  };

  toggleAllVisibility = visible => {
    this.setState(
      {
        items: this.state.items.map(item => Object.assign({}, item, { visible: visible }))
      },
      () => {
        this.saveStateToStorage();
        this.vectorSource.getFeatures().forEach(feature => {
          const item = this.state.items.filter(item => {
            return item.id === feature.get("id");
          })[0];

          if (visible) feature.setStyle(myMapsHelpers.getStyleFromJSON(item.style, item.pointType));
          else feature.setStyle(new Style({}));

          myMapsHelpers.setFeatureLabel(item);
          this.updateItemVisibility(item, visible);
        });
      }
    );
  };

  saveStateToStorage = () => {
    const stateClone = Object.assign({}, this.state);
    delete stateClone["isEditing"];
    helpers.saveToStorage(this.storageKey, stateClone);
  };

  setDrawControl = () => {
    // REMOVE THE LAST DRAW

    if (this.draw !== null){
      window.emitter.emit("changeCursor","standard");
      window.map.removeInteraction(this.draw);
    } 

    // DO NOTHING IF ITS CANCEL
    if (this.state.drawType === "Cancel") {
      return;
    }

    // GET DRAW TYPE
    let drawType = this.state.drawType;

    // DELETE/REMOVE TOOL
    if (drawType === "Eraser") return;

    if (drawType === "Rectangle") drawType = "Circle";
    else if (drawType === "Arrow" || drawType === "Bearing"|| drawType === "Measure") drawType = "LineString";
    else if (drawType === "Text") drawType = "Point";

    // ACTIVE TOOLTIP
    if (this.state.drawType === "Bearing" || this.state.drawType === "Measure") this.activateToolTip();

    // CREATE A NEW DRAW
    this.draw = new Draw({
      features: new Collection([]),
      type: drawType,
      geometryFunction: this.state.drawType === "Rectangle" ? createBox() : undefined,
      style: this.state.drawStyle,
      maxPoints: this.state.drawType === "Bearing" ||this.state.drawType === "Measure" ? 2 : undefined
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
    window.emitter.emit("changeCursor","draw");
    window.map.addInteraction(this.draw);
  };

  activateToolTip = () => {
    this.tooltipElement = document.getElementById(this.state.toolTipId);
    this.tooltip = new Overlay({
      element: this.tooltipElement,
      offset: [0, -15],
      positioning: "bottom-center"
    });
    window.map.addOverlay(this.tooltip);

    this.setState({ toolTipClass: "sc-mymaps-tooltip" });
    this.pointerMoveEvent = window.map.on("pointermove", this.pointerMoveHandler);
    this.mouseOutEvent = window.map.getViewport().addEventListener("mouseout", () => this.onMouseOutEvent);
  };

  // POINTER MOVE HANDLER
  pointerMoveHandler = evt => {
    if (!window.isDrawingOrEditing) {
      this.setState({ tooltipClass: "sc-hidden" });
      this.tooltipElement.innerHTML = "";
      return;
    }

    this.tooltip.setPosition(evt.coordinate);
    //this.setState({ toolTipClass: "sc-mymaps-tooltip", measureToolTipClass: "sc-measure-tooltip" });
  };

  onMouseOutEvent = () => {
    this.setState({ toolTipClass: "sc-hidden" });
  };
  removeItemFromVectorSource = idParam => {
    this.vectorSource.getFeatures().forEach(feature => {
      const id = feature.getProperties().id;
      if (id === idParam) this.vectorSource.removeFeature(feature);
      return;
    });
  };

  updateItemVisibility = (itemInfo, visible) => {
    this.vectorSource.getFeatures().forEach(feature => {
      const id = feature.getProperties().id;
      if (id === itemInfo.id) {
        if (visible) {
          feature.setStyle(myMapsHelpers.getStyleFromJSON(itemInfo.style, itemInfo.pointType));
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
        if (visible) feature.setStyle(myMapsHelpers.getStyleFromJSON(itemInfo.style, itemInfo.pointType));
        else feature.setStyle(new Style({}));

        return;
      }
    });
  };

  onDeleteAllClick = () => {
    this.setState({ items: [] }, () => {
      this.saveStateToStorage();
    });
    this.vectorLayer.getSource().clear();
  };

  onEditFeatures = (editOn, option) => {
    this.setState({ isEditing: editOn });

    // CREATE INTERACTIONS
    this.initializeEditor();

    if (!editOn) {
      this.modify.setActive(false);
      this.translate.setActive(false);
    } else if (option === "vertices") {
      this.modify.setActive(true);
      this.translate.setActive(false);
    } else if (option === "translate") {
      this.translate.setActive(true);
      this.modify.setActive(false);
    }
    this.props.onMyMapsEditing(editOn);
  };

  initializeEditor = () => {
    if (this.modify === null) {
      window.emitter.emit("changeCursor","draw");
      // VERTEX
      this.modify = new Modify({ source: this.vectorSource });
      this.modify.on("modifyend", e => {
        this.updateFeatureGeometries(e.features.getArray());
      });
      window.map.addInteraction(this.modify);

      // MOVE
      this.translate = new Translate({ source: this.vectorSource });
      this.translate.on("translateend", e => {
        this.updateFeatureGeometries(e.features.getArray());
      });
 
      window.map.addInteraction(this.translate);
    }
  };

  updateFeatureGeometries = features => {
    features.forEach(feature => {
      this.updateFeatureGeoJSON(feature, () => {
        // SAVE TO STORAGE
        this.saveStateToStorage();
      });
    });
  };

  onMyMapsImport = savedState => {
    const items = JSON.parse(savedState.json).items;

    let itemsToAdd = [];
    items.forEach(item => {
      const searchItem = this.state.items.filter(stateItem => {
        return stateItem.id === item.id;
      })[0];

      if (searchItem === undefined) {
        itemsToAdd.push(item);
      }
    });

    if (itemsToAdd.length > 0) {
      // ADD NEW FEATURE TO STATE
      this.setState(
        prevState => ({
          items: [...items, ...prevState.items],
          drawType: "Cancel"
        }),
        () => {
          // UPDATE STORAGE
          this.saveStateToStorage();
          this.importGeometries();
        }
      );
    }
  };

  render() {
    return (
      <div id={"sc-mymaps-container"} className="sc-mymaps-container">
        <ButtonBar onClick={this.onButtonBarClick} activeButton={this.state.drawType} isEditing={this.state.isEditing} />
        <ColorBar onClick={this.onColorBarClick} activeColor={this.state.drawColor} isEditing={this.state.isEditing} />
        <MyMapsItems isEditing={this.state.isEditing}>
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
                  showDrawingOptionsPopup={this.showDrawingOptionsPopup}
                  onFooterToolsButtonClick={this.onFooterToolsButtonClick}
                  onMyMapItemToolsButtonClick={this.onMyMapItemToolsButtonClick}
                />
              </CSSTransition>
            ))}
          </TransitionGroup>
        </MyMapsItems>
        <MyMapsAdvanced onEditFeatures={this.onEditFeatures} onMenuItemClick={this.onMenuItemClick} onDeleteAllClick={this.onDeleteAllClick} onMyMapsImport={this.onMyMapsImport} />
        <div id={this.state.toolTipId} className={window.isDrawingOrEditing && (this.state.drawType === "Bearing" || this.state.drawType === "Measure") ? this.state.toolTipClass : "sc-hidden"}></div>
      </div>
    );
  }
}

export default MyMaps;
