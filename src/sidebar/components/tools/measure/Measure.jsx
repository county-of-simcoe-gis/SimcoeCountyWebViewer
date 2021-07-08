// REACT
import React, { Component } from "react";

// CUSTOM
import "./Measure.css";
import * as helpers from "../../../../helpers/helpers";
import * as drawingHelpers from "../../../../helpers/drawingHelpers";
import PanelComponent from "../../../PanelComponent.jsx";

// OPEN LAYERS
import Draw, { createBox } from "ol/interaction/Draw.js";
import { Vector as VectorSource } from "ol/source.js";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import { LineString, Polygon, Circle } from "ol/geom.js";
import { getArea, getLength } from "ol/sphere.js";
import { fromCircle } from "ol/geom/Polygon.js";
import { unByKey } from "ol/Observable.js";
import Overlay from "ol/Overlay.js";
import { Vector as VectorLayer } from "ol/layer.js";

class Measure extends Component {
	constructor(props) {
		super(props);

		this.state = {
			hideTooltips: false,
			geometryType: "",
			unitType: "distance",
			feature: null,
			unitList: [
				{
					name: "Kilometer",
					abbreviation: "km",
					type: "distance",
					convertFunction: (meters) => {
						return Math.round((meters / 1000) * 100) / 100;
					},
				},
				{
					name: "Miles",
					abbreviation: "mi",
					type: "distance",
					convertFunction: (meters) => {
						return Math.round((meters / 1609.344) * 100) / 100;
					},
				},
				{
					name: "Meter",
					abbreviation: "m",
					type: "distance",
					convertFunction: (meters) => {
						return Math.round(meters * 100) / 100;
					},
				},
				{
					name: "Feet",
					abbreviation: "ft",
					type: "distance",
					convertFunction: (meters) => {
						return Math.round(meters * 3.28084 * 100) / 100;
					},
				},
				{
					name: "Yard",
					abbreviation: "yd",
					type: "distance",
					convertFunction: (meters) => {
						return Math.round(meters * 1.09361 * 100) / 100;
					},
				},
				{
					name: "Inches",
					abbreviation: "in",
					type: "distance",
					convertFunction: (meters) => {
						return Math.round(meters * 39.3701 * 100) / 100;
					},
				},
				{
					name: "Square Meter",
					abbreviation: "sq m",
					type: "area",
					convertFunction: (meters) => {
						return Math.round(meters * 100) / 100;
					},
				},
				{
					name: "Hectare",
					abbreviation: "ha",
					type: "area",
					convertFunction: (meters) => {
						return Math.round((meters / 10000) * 100) / 100;
					},
				},
				{
					name: "Acre",
					abbreviation: "ac",
					type: "area",
					convertFunction: (meters) => {
						return Math.round((meters / 4046.856) * 100) / 100;
					},
				},
				{
					name: "Square Km",
					abbreviation: "sq km",
					type: "area",
					convertFunction: (meters) => {
						return Math.round((meters / 1000000) * 100) / 100;
					},
				},
				{
					name: "Square Feet",
					abbreviation: "sq ft",
					type: "area",
					convertFunction: (meters) => {
						return Math.round(meters * 10.764 * 100) / 100;
					},
				},
				{
					name: "Square Yard",
					abbreviation: "sq yard",
					type: "area",
					convertFunction: (meters) => {
						return Math.round(meters * 1.196 * 100) / 100;
					},
				},
				{
					name: "Square Inches",
					abbreviation: "sq in",
					type: "area",
					convertFunction: (meters) => {
						return Math.round(meters * 1550.003 * 100) / 100;
					},
				},
				{
					name: "Degrees",
					abbreviation: "deg",
					type: "bearing",
					convertFunction: (meters) => {
						return meters;
					},
				},
			],
			unitMeters: -1,
			measureToolTipClass: "sc-hidden",
			measureToolTipId: helpers.getUID(),
			helpToolTipClass: "sc-hidden",
			helpToolTipId: helpers.getUID(),
			activeTool: false,
		};

		this.initialize();
	}

	initialize = () => {
		this.vectorSource = new VectorSource();
		this.vectorLayer = new VectorLayer({
			source: this.vectorSource,
			zIndex: 500,
			style: new Style({
				fill: new Fill({
					color: "rgba(255, 255, 255, 0.2)",
				}),
				stroke: new Stroke({
					color: "#1346AD",
					width: 3,
				}),
				image: new CircleStyle({
					radius: 7,
					fill: new Fill({
						color: "#ffcc33",
					}),
				}),
			}),
		});

		this.sketch = null;
		this.helpTooltipElement = null;
		this.helpTooltip = null;
		this.measureTooltipElement = null;
		this.measureTooltip = null;
		this.continuePolygonMsg = "Click to continue drawing the polygon";
		this.continueLineMsg = "Click to continue drawing the line";
		this.continueCircleMsg = "Move pointer to size the circle";
		this.continueRectangleMsg = "Move pointer to size the rectangle";
		this.draw = null;
		this.listener = null;
		this.pointerMoveEvent = null;
	};

	componentDidMount() {
		window.map.addLayer(this.vectorLayer);
		this.createMeasureTooltip();
		this.createHelpTooltip();
	}

	//Creates a new help tooltip
	createHelpTooltip = () => {
		this.helpTooltipElement = document.getElementById(this.state.helpToolTipId);
		this.helpTooltip = new Overlay({
			element: this.helpTooltipElement,
			offset: [15, 0],
			positioning: "center-left",
			stopEvent: false,
		});
		window.map.addOverlay(this.helpTooltip);
	};

	// Creates a new measure tooltip
	createMeasureTooltip = () => {
		this.measureTooltipElement = document.getElementById(
			this.state.measureToolTipId
		);
		this.measureTooltip = new Overlay({
			element: this.measureTooltipElement,
			offset: [0, -15],
			positioning: "bottom-center",
			stopEvent: false,
		});
		window.map.addOverlay(this.measureTooltip);
	};

	// Format length output.
	formatLength = (line) => {
		var length = getLength(line);
		var output;
		if (length > 100) {
			output = Math.round((length / 1000) * 100) / 100 + " km";
		} else {
			output = Math.round(length * 100) / 100 + " m";
		}

		// SET TO METERS, SUB CLASS WILL CONVERT OTHER VALUES
		this.setState({ unitMeters: length });

		return output;
	};

	// Format area output.
	formatArea = (polygon) => {
		var area = getArea(polygon);
		var output;
		if (area > 10000) {
			output = Math.round((area / 1000000) * 100) / 100 + " km<sup>2</sup>";
		} else {
			output = Math.round(area * 100) / 100 + " m<sup>2</sup>";
		}

		// SET TO METERS, SUB CLASS WILL CONVERT OTHER VALUES
		this.setState({ unitMeters: area });

		return output;
	};

	// FORMAT CIRCEL AREA
	formatCircle = (circle) => {
		var polygon = fromCircle(circle);
		var area = getArea(polygon);
		var output;
		if (area > 10000) {
			output = Math.round((area / 1000000) * 100) / 100 + " km<sup>2</sup>";
		} else {
			output = Math.round(area * 100) / 100 + " m<sup>2</sup>";
		}

		// SET TO METERS, SUB CLASS WILL CONVERT OTHER VALUES
		this.setState({ unitMeters: area });

		return output;
	};

	onMouseOutEvent = () => {
		this.setState({ helpToolTipClass: "sc-hidden" });
	};

	addInteraction = () => {
		this.setState({ unitMeters: -1 });
		if (this.draw !== null) window.map.removeInteraction(this.draw);

		if (this.source !== undefined && this.source !== null) this.source.clear();

		// if (!this.state.activeTool)
		//   return;

		if (window.isDrawingOrEditing) {
			helpers.showMessage(
				"Measure",
				"Active MyMaps drawing in progress.  Please finish your MyMaps and try again.",
				undefined,
				3000
			);
			this.setState({ geometryType: "clear" });
			return;
		}
		// DISABLE PROPERTY CLICK
		window.disableParcelClick = true;

		this.setState({
			helpToolTipClass: "sc-measure-tooltip-help",
			activeTool: true,
		});

		this.pointerMoveEvent = window.map.on(
			"pointermove",
			this.pointerMoveHandler
		);

		this.mouseOutEvent = window.map
			.getViewport()
			.addEventListener("mouseout", () => this.onMouseOutEvent);

		// GET DRAW TYPE
		let drawType = this.state.geometryType;

		if (drawType === "Rectangle") drawType = "Circle";
		else if (drawType === "Arrow" || drawType === "Bearing")
			drawType = "LineString";
		else if (drawType === "Text") drawType = "Point";

		this.draw = new Draw({
			source: this.vectorSource,
			type: drawType,
			geometryFunction:
				this.state.geometryType === "Rectangle" ? createBox() : undefined,
			style: new Style({
				fill: new Fill({
					color: "rgba(255, 255, 255, 0.2)",
				}),
				stroke: new Stroke({
					color: "#1346AD",
					width: 3,
				}),
				image: new CircleStyle({
					radius: 5,
					stroke: new Stroke({
						color: "rgba(0, 0, 0, 0.7)",
					}),
					fill: new Fill({
						color: "rgba(255, 255, 255, 0.2)",
					}),
				}),
			}),
			maxPoints: this.state.geometryType === "Bearing" ? 2 : undefined,
		});

		// DRAW START
		this.draw.on(
			"drawstart",
			(evt) => {
				window.popup.hide();
				window.isMeasuring = true;
				this.vectorSource.clear();
				this.setState({ feature: evt.feature });
				// set sketch
				this.sketch = evt.feature;

				/** @type {module:ol/coordinate~Coordinate|undefined} */
				var tooltipCoord = evt.coordinate;

				this.listener = this.sketch.getGeometry().on("change", (evt) => {
					var geom = evt.target;
					var output;
					if (geom instanceof Polygon) {
						output = this.formatArea(geom);
						tooltipCoord = geom.getInteriorPoint().getCoordinates();
					} else if (geom instanceof LineString) {
						if (this.state.geometryType === "Bearing") {
							output = drawingHelpers.getBearing(
								geom.getFirstCoordinate(),
								geom.getLastCoordinate()
							);
							this.setState({ unitMeters: output });
						} else {
							output = this.formatLength(geom);
						}
						tooltipCoord = geom.getLastCoordinate();
					} else if (geom instanceof Circle) {
						output = this.formatCircle(geom);
						tooltipCoord = geom.getLastCoordinate();
					}
					this.measureTooltipElement.innerHTML = output;
					this.measureTooltip.setPosition(tooltipCoord);
					if (!this.state.hideTooltips)
						this.setState({ measureToolTipClass: "sc-measure-tooltip" });
					else this.setState({ measureToolTipClass: "sc-hidden" });
				});
			},
			this
		);

		// DRAW END
		this.draw.on(
			"drawend",
			() => {
				setTimeout(() => {
					window.isMeasuring = false;
				}, 100); //add a slight delay to stop measure to prevent click on underlying layer
				//RESET TOOLTIP
				this.measureTooltipElement.innerHTML = "";
				this.measureTooltip.setPosition([0, 0]);
				this.setState(
					{ measureToolTipClass: "sc-hidden", feature: this.sketch },
					() => {
						// unset sketch
						this.sketch = null;
					}
				);
				unByKey(this.listener);
			},
			this
		);

		window.map.addInteraction(this.draw);
	};

	// POINTER MOVE HANDLER
	pointerMoveHandler = (evt) => {
		if (evt.dragging || !this.state.activeTool) {
			this.setState({
				measureToolTipClass: "sc-hidden",
				helpToolTipClass: "sc-hidden",
			});
			return;
		}

		// GET MSG
		let helpMsg = "Click to start drawing";
		if (this.sketch) {
			if (this.state.geometryType === "Polygon") {
				helpMsg = this.continuePolygonMsg;
			} else if (this.state.geometryType === "LineString") {
				helpMsg = this.continueLineMsg;
			} else if (this.state.geometryType === "Circle") {
				helpMsg = this.continueCircleMsg;
			} else if (this.state.geometryType === "Rectangle") {
				helpMsg = this.continueRectangleMsg;
			} else if (this.state.geometryType === "Bearing") {
				helpMsg = this.continueLineMsg;
			}
		}

		this.helpTooltipElement.innerHTML = helpMsg;
		this.helpTooltip.setPosition(evt.coordinate);

		if (!this.state.hideTooltips)
			this.setState({
				helpToolTipClass: "sc-measure-tooltip-help",
				measureToolTipClass: "sc-measure-tooltip",
			});
		else
			this.setState({
				helpToolTipClass: "sc-hidden",
				measureToolTipClass: "sc-hidden",
			});
	};

	componentWillUnmount() {
		//this.setState({measureToolTipClass : "sc-hidden",helpToolTipClass : "sc-hidden"});
		window.map.removeOverlay(this.helpTooltip);
		window.map.removeOverlay(this.measureTooltip);

		// UNREGISTER EVENTS
		unByKey(this.listener);
		unByKey(this.pointerMoveEvent);
		unByKey(this.mouseOutEvent);

		// CLEAN UP
		window.map.removeInteraction(this.draw);
		if (this.source !== undefined) this.source.clear();

		window.map.removeLayer(this.vectorLayer);

		window.disableParcelClick = false;
		window.isMeasuring = false;
	}

	onClose = () => {
		// CALL PARENT WITH CLOSE
		this.props.onClose();
	};

	reset = () => {
		window.map.removeInteraction(this.draw);
		if (this.source !== undefined) this.source.clear();

		this.vectorLayer.getSource().clear();
		unByKey(this.listener);

		this.setState({
			measureToolTipClass: "sc-hidden",
			helpToolTipClass: "sc-hidden",
			activeTool: false,
			feature: null,
		});

		window.disableParcelClick = false;
		window.isMeasuring = false;
	};

	onGeometryButtonClick = (type, unitType) => {
		if (type === "Clear") {
			this.reset();
			this.setState({ geometryType: type, unitType: unitType });
			window.isMeasuring = false;
		} else {
			this.setState({ geometryType: type, unitType: unitType }, () => {
				this.addInteraction();
				window.isMeasuring = true;
			});
		}
	};

	onTooltipCheckboxChange = (evt) => {
		this.setState({ hideTooltips: evt.target.checked });
	};

	addToMyMaps = (feature, label) => {
		// ADD MYMAPS
		window.emitter.emit("addMyMapsFeature", feature, label);
		//Reset interaction if user is still measuring to prevent error after click
		if (window.isMeasuring) this.addInteraction();
	};

	render() {
		return (
			<PanelComponent
				onClose={this.onClose}
				name={this.props.name}
				helpLink={this.props.helpLink}
				type="tools"
			>
				<div className="simcoe-measure-container">
					<div style={{ padding: "10px", fontSize: "11pt" }}>
						Please select the type of measurements you wish to perform from the
						toolbar below. Use the line tools for distances and polygon tools
						for area.
					</div>

					{/* BUTTON BAR */}
					<div className="sc-measure-title">Measure Tools</div>
					<div className="sc-measure-tooltip-message-container">
						{"Hide Tooltips"}
						<input
							style={{ position: "relative", top: "2px" }}
							type="checkbox"
							onChange={this.onTooltipCheckboxChange}
							value={this.state.hideTooltips}
						/>
					</div>

					<div key={helpers.getUID()} className="sc-measure-button-bar">
						<div
							className={
								this.state.geometryType === "LineString"
									? "sc-measure-button-container active"
									: "sc-measure-button-container"
							}
						>
							<button
								className="sc-measure-button"
								title="Draw a single line on the map"
								onClick={() => {
									this.onGeometryButtonClick("LineString", "distance");
								}}
							>
								<img src={images["polyline.png"]} alt="line" />
							</button>
						</div>
						<div
							className={
								this.state.geometryType === "Polygon"
									? "sc-measure-button-container active"
									: "sc-measure-button-container"
							}
						>
							<button
								className="sc-measure-button"
								title="Draw a polygon on the map"
								onClick={() => {
									this.onGeometryButtonClick("Polygon", "area");
								}}
							>
								<img src={images["polygon.png"]} alt="polygon" />
							</button>
						</div>
						<div
							className={
								this.state.geometryType === "Circle"
									? "sc-measure-button-container active"
									: "sc-measure-button-container"
							}
						>
							<button
								className="sc-measure-button"
								title="Draw a circle on the map"
								onClick={() => {
									this.onGeometryButtonClick("Circle", "area");
								}}
							>
								<img src={images["circle.png"]} alt="circle" />
							</button>
						</div>
						<div
							className={
								this.state.geometryType === "Rectangle"
									? "sc-measure-button-container active"
									: "sc-measure-button-container"
							}
						>
							<button
								className="sc-measure-button"
								title="Draw a rectangle on the map"
								onClick={() => {
									this.onGeometryButtonClick("Rectangle", "area");
								}}
							>
								<img src={images["rectangle.png"]} alt="rectangle" />
							</button>
						</div>
						<div
							className={
								this.state.geometryType === "Bearing"
									? "sc-measure-button-container active"
									: "sc-measure-button-container"
							}
						>
							<button
								className="sc-measure-button"
								title="Draw a Bearing Line on the map"
								onClick={() => {
									this.onGeometryButtonClick("Bearing", "bearing");
								}}
							>
								<img src={images["compass.png"]} alt="compass" />
							</button>
						</div>

						<div
							className={
								this.state.geometryType === "Clear"
									? "sc-measure-button-container active"
									: "sc-measure-button-container"
							}
						>
							<button
								className="sc-measure-button"
								title="Clear Drawing"
								onClick={() => {
									this.onGeometryButtonClick("Clear");
								}}
							>
								<img src={images["none.png"]} alt="clear" />
							</button>
						</div>
					</div>

					<div className="sc-measure-title">Measure Results</div>

					{/* INTRO MESSAGE */}
					<div
						style={
							this.state.geometryType === "" ||
							this.state.geometryType === "Clear"
								? { padding: "10px", fontSize: "11pt" }
								: { display: "none" }
						}
					>
						There are currently no measurements to display. Please select a tool
						from above to start your measurements. Results will display in this
						area.
					</div>

					{/* RESULTS */}
					<div
						className={
							this.state.geometryType === "" ||
							this.state.geometryType === "Clear"
								? "sc-hidden"
								: "sc-measure-results-container"
						}
					>
						{this.state.unitList.map((unit) => {
							return (
								<MeasureResult
									key={helpers.getUID()}
									unitDetails={unit}
									unitType={this.state.unitType}
									unitMeters={this.state.unitMeters}
									feature={this.state.feature}
									addToMyMaps={this.addToMyMaps}
								/>
							);
						})}
					</div>

					<div
						id={this.state.helpToolTipId}
						className={this.state.helpToolTipClass}
					/>
					<div
						id={this.state.measureToolTipId}
						className={this.state.measureToolTipClass}
					/>
				</div>
			</PanelComponent>
		);
	}
}

export default Measure;

class MeasureResult extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		if (this.props.unitDetails.type !== this.props.unitType) return null;

		return (
			<div className="sc-measure-result">
				<div className="sc-measure-result-label">
					<span>{this.props.unitDetails.name}</span>
				</div>

				<div className="sc-measure-result-container">
					<div style={{ display: "table-cell" }}>
						<input
							readOnly
							className="sc-measure-result-input"
							placeholder="Waiting..."
							type="text"
							value={
								this.props.unitMeters === -1
									? ""
									: this.props.unitDetails.convertFunction(
											this.props.unitMeters
									  )
							}
						/>
					</div>
					<div className="sc-measure-result-abbreviation">
						{this.props.unitDetails.abbreviation}
					</div>
				</div>
				<span
					className={`sc-fakeLink ${
						this.props.feature === null || window.isMeasuring
							? " sc-hidden"
							: ""
					}`}
					onClick={() => {
						this.props.addToMyMaps(
							this.props.feature,
							`${
								this.props.unitMeters === -1
									? ""
									: this.props.unitDetails.convertFunction(
											this.props.unitMeters
									  )
							} ${this.props.unitDetails.abbreviation}`
						);
					}}
				>
					[Add to My Maps]
				</span>
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
