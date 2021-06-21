// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as helpers from "../../../../helpers/helpers";
import "./LayerLegend.css";

class LayerLegend extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		return (
			<div className="sc-toc-item-layer-info-legend">
				<div className="sc-toc-item-layer-info-border" />
				<Legend legendObj={this.props.legend} legendImage={this.props.image} />
			</div>
		);
	}
}
export default LayerLegend;

const Legend = ({ legendImage, legendObj }) => {
	if (legendImage !== undefined && legendImage !== null) {
		return <img src={legendImage} alt="style" />;
	} else if (legendObj !== undefined) {
		if (legendObj.legend === undefined) return <div></div>;
		return (
			<ul className="sc-toc-item-layer-info-legend-list">
				{legendObj.legend.map((item) => {
					return <LegendItem key={helpers.getUID()} legend={item} />;
				})}
			</ul>
		);
	} else {
		return <div></div>;
	}
};
const LegendItem = ({ legend }) => {
	return (
		<li
			className="sc-toc-item-layer-info-legend-list-item sc-noselect"
			id={helpers.getUID()}
			style={{ height: `${legend.height}px` }}
			title={legend.label}
		>
			<img
				style={{ height: `${legend.height}px`, width: `${legend.width}px` }}
				src={`data:${legend.contentType};base64,${legend.imageData}`}
				alt="style"
			/>
			<div
				className="sc-legend-label"
				style={{
					height: `${legend.height}px`,
					width: `${220 - legend.width}px`,
				}}
			>
				{legend.label.trim()}
			</div>
		</li>
	);
};
