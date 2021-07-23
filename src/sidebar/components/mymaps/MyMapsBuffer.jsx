import React, { Component } from "react";
import "./MyMapsBuffer.css";
import ColorPicker from "./ColorPicker";
import { CompactPicker } from "react-color";
import * as helpers from "../../../helpers/helpers";
import Feature from "ol/Feature";
import { Stroke, Style, Fill } from "ol/style";
import VectorLayer from "ol/layer/Vector";
import { Vector as VectorSource } from "ol/source.js";
import Projection from "ol/proj/Projection.js";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";

class MyMapsBuffer extends Component {
	constructor(props) {
		super(props);

		this.colorPickerButtonId = "sc-mymaps-buffer-color-button-picker";
		this.bufferFeature = null;

		// REGISTER CUSTOM PROJECTIONS
		proj4.defs([["EPSG:26917", "+proj=utm +zone=17 +ellps=GRS80 +datum=NAD83 +units=m +no_defs "]]);
		register(proj4);

		// UTM NAD 83
		this.nad83Proj = new Projection({
			code: "EPSG:26917",
			extent: [194772.8107, 2657478.7094, 805227.1893, 9217519.4415],
		});
		this.state = {
			color: { r: 85, g: 243, b: 30, a: 1 },
			distance: 0,
			units: "meters",
			addMessageVisible: false,
		};
	}

	componentDidMount = () => {
		this.createLayer();

		// LISTEN FOR POPUP CLOSE TO CLEANUP
		window.emitter.addListener("popupClosing", () => this.cleanup());
	};

	cleanup = () => {
		window.map.removeLayer(this.vectorLayer);
		//this.setState({addMessageVisible: false});
	};

	componentWillUnmount = () => {
		this.cleanup();
	};

	getStyle = () => {
		return new Style({
			stroke: new Stroke({
				color: [this.state.color.r, this.state.color.g, this.state.color.b, 1],
				width: 3,
			}),
			fill: new Fill({
				color: [this.state.color.r, this.state.color.g, this.state.color.b, 0.7],
			}),
		});
	};

	createLayer = () => {
		this.vectorLayer = new VectorLayer({
			source: new VectorSource({
				features: [],
			}),
			zIndex: 999,
			style: this.getStyle(),
		});
		window.map.addLayer(this.vectorLayer);
	};

	onColorPickerButton = (evt) => {
		if (this.state.colorPickerVisible) this.setState({ colorPickerVisible: false });
		else this.setState({ colorPickerVisible: true });

		const compactPicker = <CompactPicker color={this.state.color} onChangeComplete={this.onColorPickerChange} />;
		const colorPicker = new ColorPicker(evt, compactPicker, this.colorPickerButtonId);
		colorPicker.show();
	};

	onColorPickerChange = (color) => {
		this.setState({ color: color.rgb }, () => {
			this.vectorLayer.setStyle(this.getStyle());
			if (!isNaN(this.state.distance)) this.onPreviewBufferClick();
		});
	};

	onPreviewBufferClick = (evt) => {
		// GET FEATURE
		const feature = helpers.getFeatureFromGeoJSON(this.props.item.featureGeoJSON);
		const distanceMeters = this.convertToMeters();
		helpers.bufferGeometry(feature.getGeometry(), distanceMeters, (bufferGeometry) => {
			this.bufferFeature = new Feature({
				geometry: bufferGeometry,
			});
			this.bufferFeature.setStyle(this.getStyle());
			this.vectorLayer.getSource().clear();
			if (distanceMeters > 0) this.vectorLayer.setZIndex(999);
			else this.vectorLayer.setZIndex(9999);
			this.vectorLayer.getSource().addFeature(this.bufferFeature);

			this.setState({ addMessageVisible: true });
		});
	};

	convertToMeters = () => {
		var value = parseFloat(this.state.distance);
		if (isNaN(value)) return 0;
		if (this.state.units === "meters") return value;
		else if (this.state.units === "kilometers") return value * 1000;
		else if (this.state.units === "miles") return value * 1609.34;
		else if (this.state.units === "feet") return value / 3.281;
		else if (this.state.units === "yards") return value * 0.9144;
		else if (this.state.units === "nauticalMiles") {
			return value * 1852;
		}
	};
	onDistanceChange = (evt) => {
		this.setState({ distance: evt.target.value }, () => {
			if (!isNaN(this.state.distance)) this.onPreviewBufferClick(evt);
		});
	};

	onUnitsChange = (evt) => {
		this.setState({ units: evt.target.value }, () => {
			if (!isNaN(this.state.distance)) this.onPreviewBufferClick(evt);
		});
	};

	onAddBufferToMyMaps = () => {
		// ADD MYMAPS
		window.emitter.emit("addMyMapsFeature", this.bufferFeature, "Buffer - " + this.state.distance + " " + this.state.units);
	};

	render() {
		const rgbColor = "rgb(" + this.state.color.r + "," + this.state.color.g + "," + this.state.color.b + ")";

		return (
			<div className={this.props.visible ? "sc-fieldset" : "sc-hidden"}>
				<legend>
					<img src={images["buffer.png"]} alt="buffer" />
					&nbsp; Buffer
				</legend>
				<div className="sc-mymaps-buffer-container">
					<label style={{ gridColumnStart: "1" }}>Distance:</label>
					<label style={{ gridColumnStart: "2" }}>Units:</label>
					<input style={{ gridColumnStart: "1", gridRowStart: "2" }} type="number" className="sc-editable" value={this.state.distance} onChange={this.onDistanceChange} />
					<select style={{ gridColumnStart: "2", gridRowStart: "2" }} name="pointOutline" value={this.state.units} onChange={this.onUnitsChange}>
						<option value="meters">Meters</option>
						<option value="kilometers">Kilometers</option>
						<option value="feet">Feet</option>
						<option value="miles">Miles</option>
						<option value="yards">Yards</option>
						<option value="nauticalMiles">Nautical Miles</option>
					</select>
					<button
						id={this.colorPickerButtonId}
						style={{
							gridColumnStart: "1",
							gridRowStart: "3",
							backgroundColor: rgbColor,
							cursor: "pointer",
							margin: "3px",
						}}
						title="Change Buffer Color"
						onMouseUp={this.onColorPickerButton}
					/>

					<label
						className={this.state.addMessageVisible ? "sc-fakeLink" : "sc-hidden"}
						style={{
							gridColumnStart: "1",
							gridColumnEnd: "3",
							gridRowStart: "4",
							textAlign: "-webkit-center",
							alignSelf: "center",
						}}
						onMouseUp={this.onAddBufferToMyMaps}
					>
						Add this buffer to MyMap Items
					</label>
				</div>
			</div>
		);
	}
}

export default MyMapsBuffer;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
	let images = {};
	r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
	return images;
}
