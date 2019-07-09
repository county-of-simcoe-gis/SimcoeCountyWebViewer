// REACT
import React, { Component } from "react";
import { sortableElement } from "react-sortable-hoc";
import { List } from "react-virtualized";

// CUSTOM
import LayerItem from "./LayerItem.jsx";
import * as helpers from "../../../helpers/helpers";
import "./VirtualLayers.css";

// LIST ITEM SORTABLE
const SortableItem = sortableElement(({ value, style, item, onLegendToggle, onCheckboxChange, searchText, onLayerOptionsClick }) => {
  return (
    <li style={style} className="sc-toc-layer-list-item sc-noselect">
      <LayerItem
        key={helpers.getUID()}
        layerInfo={item}
        onLegendToggle={onLegendToggle}
        onCheckboxChange={onCheckboxChange}
        searchText={searchText}
        onLayerOptionsClick={onLayerOptionsClick}
      />
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

  renderRow = ({ index, key, style }) => {
    const { items } = this.props;
    const { value } = items[index];

    return (
      <SortableItem
        key={index}
        index={index}
        style={style}
        value={value}
        item={items[index]}
        onLegendToggle={this.props.onLegendToggle}
        onCheckboxChange={this.props.onCheckboxChange}
        searchText={this.props.searchText}
        disabled={this.props.searchText !== "" || this.props.sortAlpha ? true : false}
        onLayerOptionsClick={this.props.onLayerOptionsClick}
      />
    );
  };

  getRowHeight = ({ index }) => {
    const { items } = this.props;
    return items[index].height;
  };

  render() {
    const { items, getRef, height } = this.props;

    return (
      <List
        id="sc-toc-virtual-layers"
        ref={getRef}
        rowHeight={this.getRowHeight}
        rowRenderer={this.renderRow}
        rowCount={items.length}
        width={360}
        height={height}
        style={{ outline: "none" }}
      />
    );
  }
}

export default VirtualLayers;
