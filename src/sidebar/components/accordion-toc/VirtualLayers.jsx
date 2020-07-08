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
    <li key={helpers.getUID()} style={style} className="sc-toc-layer-list-item sc-noselect" id={item.elementId}>
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
      />
    );
  };

  getRowHeight = ({ index }) => {
    const { items } = this.props;
    const height = items[index].height
    return height;
  };

  getTotalHeight = () =>{
    const { items } = this.props;
    return items.reduce((a, b) => a + (b["height"] || 0), 0);
  }

  render() {
    const { items, getRef,virtual_key } = this.props;
    if (getRef===undefined){
      console.log(this.props);
    }
    return (
      <div>
        <List
          key={helpers.getUID()}
          id={virtual_key}
          ref={getRef}
          rowHeight={this.getRowHeight}
          rowRenderer={this.renderRow}
          rowCount={items.length}
          width={330}
          height={items.reduce((a, b) => a + (b["height"] || 0), 0)}
          style={{ outline: "none" }}
        />
      </div>
    );
  }
}

export default VirtualLayers;
