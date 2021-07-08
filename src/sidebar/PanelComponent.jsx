import React, { Component } from "react";
import "./PanelComponent.css";
import { unByKey } from "ol/Observable.js";
import * as helpers from "../helpers/helpers";
import { FaQuestion } from "react-icons/fa";

class PanelComponent extends Component {
	constructor(props) {
		super(props);
		this.state = {
			selectedFeature: undefined,
		};
	}

	componentDidMount() {
		if (this.props.allowClick) {
			this.onMapClickEvent = window.map.on("click", this.onMapClick);
		}
		// LISTEN FOR CLOSE FROM OTHER COMPONENTS (e.g. MENU BUTTON)
		window.emitter.addListener("closeToolsOrThemes", (type) => {
			if (type === this.props.type) this.props.onClose();
		});
	}
	componentWillUnmount() {
		// UNREGISTER EVENTS
		if (this.props.allowClick) {
			unByKey(this.onMapClickEvent);
		}
	}
	onMapClick = (evt) => {
		var feature = window.map.forEachFeatureAtPixel(
			evt.pixel,
			function (feature, layer) {
				if (feature === null) return;
				var isSelectable = feature.get("clickable");
				if (isSelectable !== undefined && isSelectable) return feature;
			}
		);
		if (feature !== undefined) {
			this.setState({ selectedFeature: feature }, () => {
				window.popup.show(
					evt.coordinate,
					<PopupContent
						key={helpers.getUID()}
						feature={feature}
						myMapsClick={() => {
							this.onMyMapsClick();
						}}
					/>,
					"Actions"
				);
			});
		}
	};

	onMyMapsClick = () => {
		let feature = this.state.selectedFeature;
		let label = feature.get("label");
		if (label === undefined) label = "added from " + this.props.name;
		// ADD MYMAPS
		window.emitter.emit("addMyMapsFeature", feature, label);
		this.cleanup();
	};

	cleanup() {
		// HIDE POPUP
		window.popup.hide();

		this.setState({ selectedFeature: undefined });
	}
	onSidebarVisibility = () => {
		// EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
		window.emitter.emit("setSidebarVisiblity", "CLOSE");

		if (this.props.onSidebarVisibility !== undefined)
			this.props.onSidebarVisibility();
	};

	render() {
		return (
			<React.Fragment>
				<div id="sc-panel-component-header">
					<div id="sc-panel-component-title">
						<div id="sc-panel-component-title-container">
							<div id="sc-panel-component-tool-icon">
								<img src={images["tools-icon.png"]} alt="Theme"></img>
							</div>
							<div
								id="sc-panel-component-tool-text"
								className={`sc-panel-component-tool-text${
									this.props.name.length < 25 ? "" : " small"
								}${this.props.helpLink ? " short" : ""}`}
								title={this.props.name}
								alt={this.props.name}
							>
								{this.props.name}
							</div>

							<div id="sc-panel-component-tool-controls">
								<div
									id="sc-panel-component-help"
									className={
										this.props.helpLink
											? "sc-panel-component-help"
											: "sc-hidden"
									}
									alt={`View Help for ${this.props.name}`}
									title={`View Help for ${this.props.name}`}
									onClick={() =>
										helpers.showURLWindow(this.props.helpLink, false)
									}
								>
									<FaQuestion />
								</div>
								<img
									id="sc-panel-component-tool-img"
									src={images["tab-close-24x24.png"]}
									alt="Minimize Panel"
									title="Minimize Panel"
									onClick={this.onSidebarVisibility}
								></img>
								<img
									id="sc-panel-component-tool-close"
									src={images["close-x-24x24.png"]}
									alt={`Close ${this.props.name}`}
									title={`Close ${this.props.name}`}
									onClick={this.props.onClose}
								></img>
							</div>
						</div>
					</div>
				</div>
				<div id="sc-panel-component-content">{this.props.children}</div>
			</React.Fragment>
		);
	}
}

export default PanelComponent;

class PopupContent extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		return (
			<div>
				<button
					className="sc-button sc-panel-component-tool-content-button"
					onClick={this.props.myMapsClick}
				>
					Add to My Drawing
				</button>
			</div>
		);
	}
}
// IMPORT ALL IMAGES
const images = importAllImages(
	require.context("./images", false, /\.(png|jpe?g|svg)$/)
);
function importAllImages(r) {
	let images = {};
	r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
	return images;
}
