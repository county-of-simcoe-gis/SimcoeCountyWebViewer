// REACT
import React, { Component } from "react";
import { sortableElement } from "react-sortable-hoc";
import { List } from "react-virtualized";

// CUSTOM
import LayerItem from "./LayerItem.jsx";
import "./VirtualLayers.css";

// LIST ITEM SORTABLE
const SortableItem = sortableElement(({ value, id, style, item, group, onLegendToggle, onCheckboxChange, onLayerChange, searchText, onLayerOptionsClick }) => {
	item.elementId = id + "-element";

	//console.log("Virtual Layer Item Render");
	return (
		<li style={style} className="sc-toc-layer-list-item sc-noselect" id={item.elementId}>
			<LayerItem
				key={id + "-layer-item"}
				id={id + "-layer-item"}
				layerInfo={item}
				onLegendToggle={onLegendToggle}
				group={group}
				onLayerChange={onLayerChange}
				onCheckboxChange={onCheckboxChange}
				searchText={searchText}
				onLayerOptionsClick={onLayerOptionsClick}
			/>
		</li>
	);
});

class VirtualLayers extends Component {
	_isMounted = false;
	constructor(props) {
		super(props);

		this.state = {
			//msgIndex: 100
		};
	}

	componentDidMount() {
		this._isMounted = true;
	}
	componentWillUnmount() {
		this._isMounted = false;
	}
	componentDidUpdate() {
		if (this._isMounted) {
			this.list.recomputeRowHeights();
		}
	}
	renderRow = ({ index, key, style }) => {
		const { items } = this.props;
		const item = items[index];

		return (
			<SortableItem
				key={this.props.id + "-sortable-item-" + item.name}
				id={this.props.id + "-sortable-item-" + item.name}
				//key={index}
				index={index}
				style={style}
				value={item.name}
				item={item}
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

	render() {
		const { items, height, id } = this.props;
		const listId = id + "-virtual-layers";
		// MOBILE TWEEK
		let mobileAdjustment = -1;
		if (window.innerWidth <= 400) mobileAdjustment = 400 - window.innerWidth;
		return (
			<List
				key={listId}
				id={listId}
				//key="sc-toc-virtual-layers-list"
				//id="sc-toc-virtual-layers"
				ref={(ref) => (this.list = ref)}
				rowHeight={({ index }) => items[index].height}
				rowRenderer={this.renderRow}
				rowCount={items.length}
				width={mobileAdjustment !== -1 ? 360 - mobileAdjustment : 360}
				height={height}
				style={{ outline: "none" }}
			/>
		);
	}
}

export default VirtualLayers;
