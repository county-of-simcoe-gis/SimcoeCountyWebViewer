import React, { Component } from "react";
import * as helpers from "./helpers";
import "./AttributeTable.css";
import { Resizable } from "re-resizable";
import AttributeTableTabs from "./AttributeTableTabs.jsx";
import FloatingMenu, { FloatingMenuItem } from "../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../helpers/Portal.jsx";
import ReactDOM from "react-dom";

class AttrbuteTable extends Component {
  constructor(props) {
    super(props);

    this.numRecordsToPull = 20;
    this.state = { visible: false, items: [], mapWidth: 100, height: 0, isLoading: false };

    // LISTEN
    window.emitter.addListener("openAttributeTable", (serverUrl, layerName) => this.onEmitter(serverUrl, layerName));

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapParametersComplete", () => this.onMapLoad());

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapResize", () => this.onMapResize());

    window.isAttributeTableResizing = false;
  }

  onMapResize = () => {
    this.resizeFromMap();
  };

  onMapLoad = () => {
    this.resizeFromMap();
    window.emitter.emit("attributeTableResize", this.state.height);
  };

  resizeFromMap = () => {
    const mapWidth = document.getElementById("map").offsetWidth;
    this.resizable.updateSize({ width: mapWidth, height: this.resizable.resizable.offsetHeight });
    this.setState({ mapWidth: mapWidth, height: this.resizable.resizable.offsetHeight });
  };

  onEmitter = (serverUrl, layerName) => {
    let name = "";
    if (layerName.indexOf(":") !== -1) {
      name = layerName.split(":")[1];
    } else name = layerName;

    const item = { name: helpers.replaceAllInString(name, "_", " "), geoJson: [], serverUrl: serverUrl, layerName: layerName, maxRecords: this.numRecordsToPull, sortFields: "", scrollTop: 0 };
    this.getData(item, (item) => {});
  };

  getData = (item, callback) => {
    this.setState({ isLoading: true }, () => {
      helpers.getWFSGeoJSON(
        item.serverUrl,
        item.layerName,
        (result) => {
          if (result.length === 0) return;

          // ATTACH GEOJSON
          item.geoJson = result;

          // GET TOTAL NUM RECORDS
          helpers.getWFSLayerRecordCount(item.serverUrl, item.layerName, (count) => {
            item.total = count;
            let itemFound = this.getItemByname(item.name);
            const isVisible = this.state.visible;
            if (itemFound === undefined) {
              this.setState(
                (prevState) => ({
                  visible: true,
                  items: [item, ...prevState.items],
                  isLoading: false,
                }),
                () => {
                  if (!isVisible) {
                    this.updateSize();
                  }
                }
              );
            } else {
              this.setState(
                {
                  // UPDATE ITEMS
                  items: this.state.items.map((stateItem) => (stateItem.name === item.name ? Object.assign({}, stateItem, { geoJson: result }) : stateItem)),
                  isLoading: false,
                },
                () => {
                  if (!isVisible) {
                    this.updateSize();
                  }
                }
              );
            }
          });
        },
        item.sortFields,
        null,
        null,
        item.maxRecords
      );
    });
  };

  updateSize = () => {
    const mapWidth = document.getElementById("map").offsetWidth;
    this.resizable.updateSize({ width: mapWidth, height: 200 });
    this.setState({ mapWidth: mapWidth, height: 200 });
    window.emitter.emit("attributeTableResize", 200);
  };
  getItemByname = (name) => {
    let item = this.state.items.filter((item) => {
      return item.name === name;
    })[0];
    return item;
  };
  onResize = (e, direction, ref, d) => {
    // window.emitter.emit("attributeTableResize", ref.offsetHeight);
    this.setState({ height: ref.offsetHeight });
  };

  onResizeStart = (e, direction, ref, d) => {
    window.isAttributeTableResizing = true;
  };

  onResizeStop = (e, direction, ref, d) => {
    window.isAttributeTableResizing = false;
    window.emitter.emit("attributeTableResize", ref.offsetHeight);
  };

  onTabClose = (name) => {
    this.setState(
      {
        items: this.state.items.filter(function(item) {
          return name !== item.name;
        }),
      },
      () => {
        if (this.state.items.length === 0) {
          this.setState({ visible: false });
          window.emitter.emit("attributeTableResize", 0);
        }
      }
    );
  };

  onClose = () => {
    this.setState({ visible: false, items: [] });
    window.emitter.emit("attributeTableResize", 0);
  };

  onHeaderClick = (evt, layerName, column) => {
    const headerName = column.Header;
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          onMenuItemClick={(key) => {
            this.onHeaderMenuItemClick(key, layerName, headerName);
          }}
          autoY={true}
          autoX={true}
        >
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-asc">
            <FloatingMenuItem imageName={"sort_asc_az.png"} label="Sort Ascending" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-desc">
            <FloatingMenuItem imageName={"sort_desc_az.png"} label="Sort Descending" />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );
    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onRowClick = (evt, item, rowIndex) => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          onMenuItemClick={(key) => {
            this.onRowMenuItemClick(key, item, rowIndex);
          }}
          autoY={true}
          autoX={true}
        >
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoom">
            <FloatingMenuItem imageName={"zoom.png"} label="Zoom to Feature" />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );
    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onRowMenuItemClick = (key, item, rowIndex) => {
    if (key === "sc-floating-menu-zoom") {
      helpers.zoomToFeature(item.geoJson[rowIndex]);
    }
  };

  onHeaderMenuItemClick = (key, layerName, headerName) => {
    if (key === "sc-floating-menu-asc") {
      let newItem = this.state.items.filter((item) => {
        return item.name === layerName;
      })[0];
      newItem.sortFields = headerName + "+A";
      this.getData(newItem);
    } else if (key === "sc-floating-menu-desc") {
      let newItem = this.state.items.filter((item) => {
        return item.name === layerName;
      })[0];
      newItem.sortFields = headerName + "+D";
      this.getData(newItem);
    }
  };

  onLoadMoreClick = (item) => {
    if (item.maxRecords === item.total) return;

    const nextNumRecords = item.maxRecords + this.numRecordsToPull;
    if (nextNumRecords > item.total) item.maxRecords = item.total;
    else item.maxRecords = nextNumRecords;
    this.getData(item);
  };
  onLoadAllClick = (item) => {
    if (item.maxRecords === item.total) return;

    item.maxRecords = item.total;
    this.getData(item);
  };
  render() {
    return (
      <div className={this.state.visible ? "sc-attribute-table-container sc-noselect" : "sc-hidden"} style={{ maxWidth: this.state.mapWidth }}>
        <Resizable
          handleClasses={{
            right: "sc-hidden",
            left: "sc-hidden",
            bottom: "sc-hidden",
            bottomRight: "sc-hidden",
            topRight: "sc-hidden",
            bottomLeft: "sc-hidden",
            topLeft: "sc-hidden",
            top: "sc-attribute-handle",
          }}
          onResize={this.onResize}
          onResizeStart={this.onResizeStart}
          onResizeStop={this.onResizeStop}
          maxHeight={400}
          maxWidth={this.state.mapWidth}
          ref={(c) => {
            this.resizable = c;
          }}
          defaultSize={{
            // width: 320,
            height: 0,
          }}
        >
          <AttributeTableTabs
            items={this.state.items}
            height={this.state.height}
            width={this.state.mapWidth}
            onTabClose={this.onTabClose}
            onHeaderClick={this.onHeaderClick}
            onRowClick={this.onRowClick}
            onLoadMoreClick={this.onLoadMoreClick}
            onLoadAllClick={this.onLoadAllClick}
            isLoading={this.state.isLoading}
          />
          <div className="sc-attribute-table-closer" title="Close Attribute Table" onClick={this.onClose}>
            <img src={images["close.png"]} alt="close table" />
          </div>
        </Resizable>
      </div>
    );
  }
}

export default AttrbuteTable;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
