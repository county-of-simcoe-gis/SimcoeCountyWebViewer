// REACT
import React, { Component } from "react";
import { sortableElement } from "react-sortable-hoc";
import { List } from "react-virtualized";

// CUSTOM
import LayerItem from "./LayerItem.jsx";
import * as helpers from "../../../../helpers/helpers";
import "./VirtualLayers.css";

// LIST ITEM SORTABLE
const SortableItem = sortableElement(({ value, style, item,group, onLegendToggle, onCheckboxChange, onLayerChange, searchText, onLayerOptionsClick }) => {
  item.elementId = item.name + helpers.getUID();
  return (
    <li style={style} className="sc-toc-layer-list-item sc-noselect" id={item.elementId}>
      <LayerItem key={helpers.getUID()} 
          layerInfo={item} 
          onLegendToggle={onLegendToggle}
          group={group}
          onLayerChange={onLayerChange}
          onCheckboxChange={onCheckboxChange} 
          searchText={searchText} 
          onLayerOptionsClick={onLayerOptionsClick} />
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
        group={this.props.group}
        onLegendToggle={this.props.onLegendToggle}
        onCheckboxChange={this.props.onCheckboxChange}
        onLayerChange={this.props.onLayerChange}
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

    // MOBILE TWEEK
    let mobileAdjustment = -1;
    if (window.innerWidth <= 400) mobileAdjustment = 400 - window.innerWidth;
    return (
      <List
        id="sc-toc-virtual-layers"
        ref={getRef}
        rowHeight={this.getRowHeight}
        rowRenderer={this.renderRow}
        rowCount={items.length}
        width={mobileAdjustment !== -1 ? 360 - mobileAdjustment : 360}
        height={height}
        style={{ outline: "none" }}
        //scrollToIndex={50}
      />
    );
  }
}

export default VirtualLayers;
