// REACT
import React, { Component } from "react";
import { sortableElement } from "react-sortable-hoc";
import { List } from "react-virtualized";

// CUSTOM
import LayerItem from "./LayerItem.jsx";
import * as helpers from "../../../helpers/helpers";
import "./VirtualLayers.css";

// LIST ITEM SORTABLE
const SortableItem = sortableElement(({ value, style, item, searchText,virtualId,onLayerChange }) => {
  item.elementId = item.name + helpers.getUID();
  return (
    <li style={style} className="sc-toc-layer-list-item sc-noselect" id={item.elementId}>
      <LayerItem key={helpers.getUID()} layerInfo={item} virtualId={virtualId} onLayerChange={onLayerChange} searchText={searchText}/>
    </li>
  );
});

class VirtualLayers extends Component {
  constructor(props) {
    super(props);

    this.state = {
      //msgIndex: 100
    };
  }

  renderRow = ({ index, style }) => {
    const { items } = this.props;
    const { value } = items[index];

    return (
      <SortableItem
        key={index}
        index={index}
        style={style}
        value={value}
        item={items[index]}
        onLayerChange={this.props.onLayerChange}
        virtualId={this.props.virtual_key}
        searchText={this.props.searchText}
        disabled={this.props.searchText !== "" || this.props.sortAlpha ? true : false}
        onLayerOptionsClick={this.props.onLayerOptionsClick}
      />
    );
  };

  getRowHeight = ({ index }) => {
    const { items } = this.props;
    const height = items[index].height
    return height;
  };

  render() {
    const { items, getRef } = this.props;
    let virtualId = this.props.virtual_key !== undefined? this.props.virtual_key : "sc-toc-virtual-layers";
    // MOBILE TWEEK
    //let mobileAdjustment = -1;
    //if (window.innerWidth <= 400) mobileAdjustment = 400 - window.innerWidth;
    return (
      <List
        id={virtualId}
        ref={getRef}
        rowHeight={this.getRowHeight}
        rowRenderer={this.renderRow}
        rowCount={items.length}
        width={335}
        height={30 * items.length }
        style={{ outline: "none" }}
        //scrollToIndex={50}
      />
    );
  }
}

export default VirtualLayers;
