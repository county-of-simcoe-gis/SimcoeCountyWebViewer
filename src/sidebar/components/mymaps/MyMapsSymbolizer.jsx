import React, { Component } from "react";
import { CompactPicker } from "react-color";
import * as helpers from "../../../helpers/helpers";
import * as drawingHelpers from "../../../helpers/drawingHelpers";
import "./MyMapsSymbolizer.css";
import ColorPicker from "./ColorPicker";
import { PointType, StyleSize, FillColor, StrokeType, StrokeColor, StrokeWidth, Rotation } from "./MyMapsSymbolizerComponents";

class MyMapsSymbolizer extends Component {
	constructor(props) {
		super(props);

		this.pointStyleOptions = [
			{ value: "circle", label: "Circle" },
			{ value: "cross", label: "Cross" },
		];
		this.dropDown = React.createRef();
		this.colorPickerButtonId = "sc-mymaps-color-picker-button";

		// SIZE
		this.sliderRadiusMin = 1;
		this.sliderRadiusMax = 100;

		// FILL OPACITY
		this.sliderFillOpacityMin = 0;
		this.sliderFillOpacityMax = 1;

		// STROKE OPACITY
		this.sliderStrokeOpacityMin = 0;
		this.sliderStrokeOpacityMax = 1;

		// STROKE WIDTH
		this.sliderStrokeWidthMin = 1;
		this.sliderStrokeWidthMax = 10;

		// ANGLE
		this.sliderRotationMin = 0;
		this.sliderRotationMax = 6.28319;

		let fillColor = [0, 0, 0, 0.8];
		if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint")
			fillColor = this.props.item.style.image_.fill_ === null ? [0, 0, 0, 0.8] : this.props.item.style.image_.fill_.color_;
		else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon")
			fillColor = this.props.item.style.fill_ === null ? [0, 0, 0, 0] : this.props.item.style.fill_.color_;

		let strokeColor = [0, 0, 0, 0.8];
		let strokeWidth = 1;
		if (this.props.item.geometryType === "Point") {
			strokeColor = this.props.item.style.image_.stroke_.color_;
			strokeWidth = this.props.item.style.image_.stroke_.width_;
		} else {
			if (this.props.item.style !== null) {
				strokeColor = this.props.item.style.stroke_.color_;
				strokeWidth = this.props.item.style.stroke_.width_;
			}
		}

		const pointType = this.props.item.pointType !== undefined ? this.props.item.pointType : "circle";
		const strokeType = this.props.item.strokeType !== undefined ? this.props.item.strokeType : "normal";

		this.state = {
			fillColorPickerVisible: false,
			selectedPointStyleDropDown: pointType,
			selectedStrokeTypeDropDown: strokeType,
			selectedPolygonStyleDropDown: "circle",
			selectedPolygonStrokeDropDown: "normal",
			strokeColor: {
				r: strokeColor[0],
				g: strokeColor[1],
				b: strokeColor[2],
				a: strokeColor[3],
			},
			strokeWidth: strokeWidth,
			strokeAlpha: strokeColor[3],
			fillColor: {
				r: fillColor[0],
				g: fillColor[1],
				b: fillColor[2],
				a: fillColor[3],
			},
			fillAlpha: fillColor[3],
			radius: this.props.item.style !== null && this.props.item.style.image_ !== null ? this.props.item.style.image_.radius_ : 0,
			rotation: this.props.item.style !== null && this.props.item.style.image_ !== null ? this.props.item.style.image_.rotation_ : 0,
		};
	}

	// POINT TYPES
	onPointStyleDropDown = (evt) => {
		this.setState({ selectedPointStyleDropDown: evt.target.value });

		const style = drawingHelpers.getPointStyle(
			evt.target.value,
			this.state.radius,
			[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
			this.state.strokeWidth,
			[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
			this.state.rotation,
			this.state.selectedStrokeTypeDropDown
		);
		console.log(style);
		this.props.onPointStyleDropDown(this.props.item.id, style, evt.target.value);
	};

	// POINT OUTLINE TYPE
	//onStrokeTypeDropDown
	onStrokeTypeDropDown = (evt) => {
		this.setState({ selectedStrokeTypeDropDown: evt.target.value });

		let style = null;
		if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
			style = drawingHelpers.getPointStyle(
				this.state.selectedPointStyleDropDown,
				this.state.radius,
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
				this.state.strokeWidth,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
				this.state.rotation,
				evt.target.value
			);
		} else if (this.props.item.geometryType === "LineString" || this.props.item.geometryType === "MultiLineString") {
			style = drawingHelpers.getLineStringStyle([this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha], this.state.strokeWidth, evt.target.value);
		} else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
			style = drawingHelpers.getPolygonStyle(
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
				this.state.strokeWidth,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
				evt.target.value
			);
		}
		console.log(style);
		this.props.onStrokeTypeDropDown(this.props.item.id, style, evt.target.value);
		console.log(this.props.item);
	};

	// RADIUS/SIZE SLIDER
	onRadiusSliderChange = (evt) => {
		this.setState({ radius: evt.target.value });
		const style = drawingHelpers.getPointStyle(
			this.state.selectedPointStyleDropDown,
			evt.target.value,
			[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
			this.state.strokeWidth,
			[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
			this.state.rotation,
			this.state.selectedStrokeTypeDropDown
		);
		this.props.onRadiusSliderChange(this.props.item.id, style);
	};

	// STROKE WIDTH SLIDER
	onStrokeWidthSliderChange = (evt) => {
		this.setState({ strokeWidth: evt.target.value });
		let style = null;

		if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
			style = drawingHelpers.getPointStyle(
				this.state.selectedPointStyleDropDown,
				this.state.radius,
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
				evt.target.value,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
				this.state.rotation,
				this.state.selectedStrokeTypeDropDown
			);
		} else if (this.props.item.geometryType === "LineString" || this.props.item.geometryType === "MultiLineString") {
			style = drawingHelpers.getLineStringStyle(
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
				evt.target.value,
				this.state.selectedStrokeTypeDropDown
			);
		} else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
			style = drawingHelpers.getPolygonStyle(
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
				evt.target.value,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
				this.state.selectedStrokeTypeDropDown
			);
		}

		this.props.onStrokeWidthSliderChange(this.props.item.id, style);
	};

	// OPACITY FILL SLIDER
	onFillOpacitySliderChange = (evt) => {
		this.setState({ fillAlpha: evt.target.value });
		let style = null;

		if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
			style = drawingHelpers.getPointStyle(
				this.state.selectedPointStyleDropDown,
				this.state.radius,
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
				this.state.strokeWidth,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, evt.target.value],
				this.state.rotation,
				this.state.selectedStrokeTypeDropDown
			);
		} else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
			style = drawingHelpers.getPolygonStyle(
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
				this.state.strokeWidth,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, evt.target.value],
				this.state.selectedStrokeTypeDropDown
			);
		}

		this.props.onFillOpacitySliderChange(this.props.item.id, style);
	};

	// OPACITY STROKE SLIDER
	onStrokeOpacitySliderChange = (evt) => {
		this.setState({ strokeAlpha: evt.target.value });
		let style = null;

		if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
			style = drawingHelpers.getPointStyle(
				this.state.selectedPointStyleDropDown,
				this.state.radius,
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, evt.target.value],
				this.state.strokeWidth,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
				this.state.rotation,
				this.state.selectedStrokeTypeDropDown
			);
		} else if (this.props.item.geometryType === "LineString" || this.props.item.geometryType === "MultiLineString") {
			style = drawingHelpers.getLineStringStyle(
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, evt.target.value],
				this.state.strokeWidth,
				this.state.selectedStrokeTypeDropDown
			);
		} else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
			style = drawingHelpers.getPolygonStyle(
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, evt.target.value],
				this.state.strokeWidth,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
				this.state.selectedStrokeTypeDropDown
			);
		}

		this.props.onStrokeOpacitySliderChange(this.props.item.id, style);
	};

	// ROTATION SLIDER
	onRotationSliderChange = (evt) => {
		this.setState({ rotation: evt.target.value });
		const style = drawingHelpers.getPointStyle(
			this.state.selectedPointStyleDropDown,
			this.state.radius,
			[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
			this.state.strokeWidth,
			[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
			evt.target.value,
			this.state.selectedStrokeTypeDropDown
		);
		this.props.onRotationSliderChange(this.props.item.id, style);
	};

	// FILL COLOR PICKER
	onFillColorPickerChange = (color) => {
		this.setState({ fillColor: color.rgb });
		let style = null;
		if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
			style = drawingHelpers.getPointStyle(
				this.state.selectedPointStyleDropDown,
				this.state.radius,
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
				this.state.strokeWidth,
				[color.rgb.r, color.rgb.g, color.rgb.b, this.state.fillAlpha],
				this.state.rotation,
				this.state.selectedStrokeTypeDropDown
			);
		} else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
			style = drawingHelpers.getPolygonStyle(
				[this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
				this.state.strokeWidth,
				[color.rgb.r, color.rgb.g, color.rgb.b, this.state.fillAlpha],
				this.state.selectedStrokeTypeDropDown
			);
		}

		this.props.onFillColorPickerChange(this.props.item.id, style);
	};

	// STROKE COLOR PICKER
	onStrokeColorPickerChange = (color) => {
		this.setState({ strokeColor: color.rgb });

		let style = null;
		if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
			style = drawingHelpers.getPointStyle(
				this.state.selectedPointStyleDropDown,
				this.state.radius,
				[color.rgb.r, color.rgb.g, color.rgb.b, this.state.strokeAlpha],
				this.state.strokeWidth,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
				this.state.rotation,
				this.state.selectedStrokeTypeDropDown
			);
		} else if (this.props.item.geometryType === "LineString" || this.props.item.geometryType === "MultiLineString") {
			style = drawingHelpers.getLineStringStyle([color.rgb.r, color.rgb.g, color.rgb.b, this.state.strokeAlpha], this.state.strokeWidth, this.state.selectedStrokeTypeDropDown);
		} else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
			style = drawingHelpers.getPolygonStyle(
				[color.rgb.r, color.rgb.g, color.rgb.b, this.state.strokeAlpha],
				this.state.strokeWidth,
				[this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
				this.state.selectedStrokeTypeDropDown
			);
		}

		this.props.onStrokeColorPickerChange(this.props.item.id, style);
	};

	// FILL BUTTON COLOR PICKER
	onFillColorPickerButton = (evt) => {
		if (this.state.fillColorPickerVisible) this.setState({ fillColorPickerVisible: false });
		else this.setState({ fillColorPickerVisible: true });

		const compactPicker = <CompactPicker color={this.state.fillColor} onChangeComplete={this.onFillColorPickerChange} />;
		const colorPicker = new ColorPicker(evt, compactPicker, this.colorPickerButtonId);
		colorPicker.show();
	};

	// OUTLINE BUTTON COLOR PICKER
	onStrokeColorPickerButton = (evt) => {
		if (this.state.outlineColorPickerVisible) this.setState({ outlineColorPickerVisible: false });
		else this.setState({ outlineColorPickerVisible: true });

		const compactPicker = <CompactPicker color={this.state.strokeColor} onChangeComplete={this.onStrokeColorPickerChange} />;
		const colorPicker = new ColorPicker(evt, compactPicker, this.colorPickerButtonId);
		colorPicker.show();
	};

	render() {
		// ADJUST THE COLOR FOR HTML
		const rgbFill = "rgb(" + this.state.fillColor.r + "," + this.state.fillColor.g + "," + this.state.fillColor.b + ")";
		const rgbStroke = "rgb(" + this.state.strokeColor.r + "," + this.state.strokeColor.g + "," + this.state.strokeColor.b + ")";
		const geometryType = this.props.item.geometryType;

		return (
			<div className={this.props.visible ? "sc-fieldset" : "sc-hidden"}>
				<legend>
					<img src={images["symbolizer.png"]} alt="symbolizer" />
					Symbolizer
				</legend>
				<div className="sc-mymaps-symbolizer-container">
					{/* POINT TYPE */}
					<PointType
						key={helpers.getUID()}
						visible={geometryType === "Point" ? true : false}
						selectedPointStyleDropDown={this.state.selectedPointStyleDropDown}
						onPointStyleDropDown={this.onPointStyleDropDown}
					/>

					{/* PRINTING WILL NOT SUPPORT THIS??? */}
					{/* <PolygonType
            visible={geometryType === "Polygon" ? true : false}
            selectedPolygonStyleDropDown={this.state.selectedPolygonStyleDropDown}
            onPolygonStyleDropDown={this.onPolygonStyleDropDown}
          /> */}

					{/* STYLE SIZE */}
					<StyleSize
						visible={geometryType === "Point" ? true : false}
						sliderRadiusMin={this.sliderRadiusMin}
						sliderRadiusMax={this.sliderRadiusMax}
						radius={this.state.radius}
						onRadiusSliderChange={this.onRadiusSliderChange}
					/>

					{/* FILL COLOR */}
					<FillColor
						visible={geometryType === "Point" || geometryType === "Polygon" ? true : false}
						colorPickerButtonId={this.colorPickerButtonId}
						onFillColorPickerButton={this.onFillColorPickerButton}
						sliderFillOpacityMin={this.sliderFillOpacityMin}
						sliderFillOpacityMax={this.sliderFillOpacityMax}
						fillAlpha={this.state.fillAlpha}
						onFillOpacitySliderChange={this.onFillOpacitySliderChange}
						rgbFill={rgbFill}
						isPolygon={this.props.item.geometryType === "Polygon" ? true : false}
					/>

					{/* STROKE TYPE */}
					<StrokeType selectedStrokeTypeDropDown={this.state.selectedStrokeTypeDropDown} onStrokeTypeDropDown={this.onStrokeTypeDropDown} />

					{/* STROKE COLOR */}
					<StrokeColor
						colorPickerButtonId={this.colorPickerButtonId}
						rgbStroke={rgbStroke}
						onStrokeColorPickerButton={this.onStrokeColorPickerButton}
						sliderStrokeOpacityMin={this.sliderStrokeOpacityMin}
						sliderStrokeOpacityMax={this.sliderStrokeOpacityMax}
						strokeAlpha={this.state.strokeAlpha}
						onStrokeOpacitySliderChange={this.onStrokeOpacitySliderChange}
					/>

					{/* STROKE WIDTH */}
					<StrokeWidth
						sliderStrokeWidthMin={this.sliderStrokeWidthMin}
						sliderStrokeWidthMax={this.sliderStrokeWidthMax}
						strokeWidth={this.state.strokeWidth}
						onStrokeWidthSliderChange={this.onStrokeWidthSliderChange}
					/>

					{/* ROTATION */}
					<Rotation
						visible={geometryType === "Point" ? true : false}
						sliderRotationMin={this.sliderRotationMin}
						sliderRotationMax={this.sliderRotationMax}
						rotation={this.state.rotation}
						onRotationSliderChange={this.onRotationSliderChange}
					/>
				</div>
			</div>
		);
	}
}

export default MyMapsSymbolizer;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
	let images = {};
	r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
	return images;
}
