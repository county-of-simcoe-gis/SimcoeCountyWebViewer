import React, { Component } from "react";
import * as helpers from "./helpers";
import "./AttributeTable.css";
import { Resizable } from "re-resizable";
import AttributeTableTabs from "./AttributeTableTabs.jsx";

class AttrbuteTable extends Component {
  constructor(props) {
    super(props);
    this.state = { visible: true, items: [], mapWidth: 100, height: 0 };

    // LISTEN
    window.emitter.addListener("openAttributeTable", (geoJson) => this.onEmitter(geoJson));

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

  onEmitter = (item) => {
    console.log(item);
    // console.log(document.getElementById("map"));
    const mapWidth = document.getElementById("map").offsetWidth;
    this.resizable.updateSize({ width: mapWidth, height: 200 });
    this.setState({ mapWidth: mapWidth, height: 200 });

    this.setState(
      (prevState) => ({
        visible: true,
        items: [item, ...prevState.items],
      }),
      () => {
        // this.resizeFromMap();
      }
    );
  };

  onResize = (e, direction, ref, d) => {
    window.emitter.emit("attributeTableResize", ref.offsetHeight);
    this.setState({ height: ref.offsetHeight });
  };

  onResizeStart = (e, direction, ref, d) => {
    window.isAttributeTableResizing = true;
  };

  onResizeStop = (e, direction, ref, d) => {
    window.isAttributeTableResizing = false;
  };

  onTabClose = (item) => {
    console.log(item);
  };

  render() {
    console.log(this.state.visible);
    return (
      <div className={this.state.visible ? "sc-attribute-table-container" : "sc-hidden"} style={{ maxWidth: this.state.mapWidth }}>
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
          <AttributeTableTabs items={this.state.items} height={this.state.height} width={this.state.mapWidth} onTabClose={this.onTabClose} />
        </Resizable>
      </div>
    );
  }
}

export default AttrbuteTable;
