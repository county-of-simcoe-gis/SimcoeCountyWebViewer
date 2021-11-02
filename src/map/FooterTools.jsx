/*jshint loopfunc:true */
import React, { Component } from "react";
import "./FooterTools.css";
import * as helpers from "../helpers/helpers";

const feedbackTemplate = (url, xmin, xmax, ymin, ymax, centerx, centery, scale) => `${url}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}`;

class FooterTools extends Component {
	constructor(props) {
		super(props);

		this.state = {
			scale: "",
			basemapType: "IMAGERY",
		};
		this.mapScales = [
			{ label: "1:250", value: 250 },
			{ label: "1:500", value: 500 },
			{ label: "1:1,000", value: 1000 },
			{ label: "1:2,000", value: 2000 },
			{ label: "1:5,000", value: 5000 },
			{ label: "1:10,000", value: 10000 },
			{ label: "1:25,000", value: 25000 },
			{ label: "1:50,000", value: 50000 },
		];
		// LISTEN FOR MAP TO MOUNT
		window.emitter.addListener("basemapChanged", (type) => {
			this.setState({ basemapType: type });
		});
		// LISTEN FOR CONTROL VISIBILITY CHANGES
		window.emitter.addListener("mapControlsChanged", (control, visible) => this.controlStateChange(control, visible));
	}

	componentDidMount() {
		helpers.waitForLoad("map", Date.now(), 30, () => this.onMapLoad());

		this.setState({ showScale: window.mapControls.scale });
	}

	onMapLoad() {
		window.map.on("moveend", () => {
			const scale = helpers.getMapScale();

			this.setState({
				scale: scale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
				currentScale: scale,
			});
		});
	}

	onPrintClick = () => {
		helpers.showMessage("Print", "Coming Soon");

		// APP STATS
		helpers.addAppStat("Print", "Click (Footer)");
	};

	onLegendClick = () => {
		helpers.showMessage("Legend", "Coming Soon");
		// APP STATS
		helpers.addAppStat("Legend", "Click (Footer)");
	};

	onFeedbackClick = () => {
		helpers.waitForLoad("settings", Date.now(), 30, () => {
			// APP STATS
			helpers.addAppStat("Feedback", "Click (Footer)");

			const scale = helpers.getMapScale();
			const extent = window.map.getView().calculateExtent(window.map.getSize());
			const xmin = extent[0];
			const xmax = extent[1];
			const ymin = extent[2];
			const ymax = extent[3];
			const center = window.map.getView().getCenter();

			let feedbackUrl = feedbackTemplate(window.config.feedbackUrl, xmin, xmax, ymin, ymax, center[0], center[1], scale);
			if (window.config.mapId !== null && window.config.mapId !== undefined && window.config.mapId.trim() !== "") feedbackUrl += "&MAP_ID=" + window.config.mapId;

			helpers.showURLWindow(feedbackUrl, false, "full");
		});
	};

	onTermsClick = () => {
		helpers.waitForLoad("settings", Date.now(), 30, () => {
			helpers.showURLWindow(window.config.termsUrl, false, "full");
			// APP STATS
			helpers.addAppStat("Terms", "Click (Footer)");
		});
	};

	onScaleClick = (value) => {
		helpers.setMapScale(value);
	};

	controlStateChange(control, state) {
		switch (control) {
			case "scale":
				this.setState({ showScale: state });
				break;
			default:
				break;
		}
	}
	render() {
		setTimeout(function () {
			const col = document.getElementsByClassName("ol-scale-line-inner");
			if (col.length > 0) {
				const olScaleBar = col[0];
				let scScaleBar = document.getElementById("sc-scale-bar-text");
				scScaleBar.setAttribute("style", "width: " + olScaleBar.style.width);
			}
		}, 10);

		const scale = (window.mapControls.scaleSelector)?
		
					<div id="sc-scale-bar-text" className="sc-map-footer-scale-only selector">
					Scale:&nbsp;
					<select id="sc-scale-bar-select" onChange={(evt) => {this.onScaleClick(evt.target.value);}} value={this.state.currentScale}>
							<option key={helpers.getUID()} value={this.state.currentScale}>{"1:" + this.state.scale}</option>
							{
								this.mapScales.map(item => {
								return <option key={helpers.getUID()} value={item.value}>{item.label}</option>;
								})
							}
					</select>
					</div>
				:
				<div id="sc-scale-bar-text" className={this.state.basemapType === "IMAGERY" ? "sc-map-footer-scale-only imagery" : "sc-map-footer-scale-only topo"}>
					
					{"Scale: 1:" + this.state.scale}
				</div>

		return (
			<div className="map-theme">
    			{scale}
			</div>			
		);
	}
}

export default FooterTools;
