import React, { Component } from "react";
import "./BasemapSwitcher.css";
import * as helpers from "../helpers/helpers";
import { LayerHelpers, OL_DATA_TYPES } from "../helpers/OLHelpers";

import BasemapConfig from "./basemapSwitcherConfig.json";
import Slider from "rc-slider";
import { Group as LayerGroup } from "ol/layer.js";
import xml2js from "xml2js";

class BasemapSwitcher extends Component {
	constructor(props) {
		super(props);

		this.state = {
			imagerySliderMarks: this.getImagerySliderMarks(),
			imagerySliderMin: 0,
			imagerySliderMax: BasemapConfig.imageryServices.length - 1,
			imagerySliderDefaultValue: BasemapConfig.imageryServices.length - 1,
			imagerySliderValue: BasemapConfig.imageryServices.length - 1,
			imageryLayers: [],
			imageryPanelOpen: false,
			streetsLayer: null,
			streetsCheckbox: true,
			containerCollapsed: false,
			topoPanelOpen: false,
			topoLayers: [],
			topoActiveIndex: 0,
			topoCheckbox: true,
			topoOverlayLayers: [],
			showBaseMapSwitcher: true,
			activeButton: BasemapConfig.defaultButton,
		};

		// LISTEN FOR CONTROL VISIBILITY CHANGES
		window.emitter.addListener("mapControlsChanged", (control, visible) =>
			this.controlStateChange(control, visible)
		);
	}
	componentDidMount() {
		this.setState({ showBaseMapSwitcher: window.mapControls.basemap });
		helpers.waitForLoad("map", Date.now(), 30, () => this.onMapLoad());
	}
	// CREATE YEAR MARKS ON THE SLIDER
	getImagerySliderMarks() {
		const numServices = BasemapConfig.imageryServices.length;
		if (numServices < 2) return {};

		let marks = {};
		for (let index = 0; index < numServices; index++) {
			marks[index] = BasemapConfig.imageryServices[index].name;
		}
		return marks;
	}

	onMapLoad() {
		// LOAD IMAGERY LAYERS
		let layerList = [];
		let index = 0;

		BasemapConfig.imageryServices.forEach((service) => {
			// LayerHelpers.getCapabilities(service.url, "wmts", (layers) => {
			//   console.log(layers);
			// });
			const serviceLayerType =
				service.type !== undefined ? service.type : OL_DATA_TYPES.TileImage;

			LayerHelpers.getLayer(
				{
					sourceType: serviceLayerType,
					source: "WMS",
					projection: "EPSG:4326",
					layerName: service.name,
					url: service.url,
					tiled: true,
					extent: service.fullExtent,
					name: service.name,
				},
				(newLayer) => {
					// LAYER PROPS
					newLayer.setProperties({ index: index, name: service.name });
					newLayer.setZIndex(index + 1);
					newLayer.setVisible(false);

					// SET MAIN LAYER VISIBLE
					if (BasemapConfig.imageryServices.length - 1 === index) {
						newLayer.setVisible(true);
						this.setState({ imagerySliderValue: index });
					}

					// ADD THE LAYER
					window.map.addLayer(newLayer);
					layerList.push(newLayer);
					index++;
				}
			);
		});

		this.setState({ imageryLayers: layerList });

		// LOAD IMAGERY STREETS LAYER
		if (BasemapConfig.streetService.url !== undefined) {
			LayerHelpers.getLayer(
				{
					sourceType: OL_DATA_TYPES.TileImage,
					source: "WMS",
					layerName: "streetServiceBasemap",
					url: BasemapConfig.streetService.url,
					tiled: true,
					name: "streetServiceBasemap",
				},
				(newLayer) => {
					//var streetsLayer = helpers.getSimcoeTileXYZLayer(BasemapConfig.streetService);
					newLayer.setZIndex(BasemapConfig.imageryServices.length);
					if (BasemapConfig.streetService.fullExtent) {
						newLayer.setExtent(BasemapConfig.streetService.fullExtent);
					}
					window.map.addLayer(newLayer);
					this.setState({ streetsLayer: newLayer });
				}
			);
		}

		// LOAD BATHYMETRY LAYER
		if (BasemapConfig.bathymetryService.url !== undefined) {
			LayerHelpers.getLayer(
				{
					sourceType: OL_DATA_TYPES.TileImage,
					source: "WMS",
					layerName: "bathymetryServiceBasemap",
					url: BasemapConfig.bathymetryService.url,
					tiled: true,
					name: "bathymetryServiceBasemap",
				},
				(newLayer) => {
					//var bathymetryLayer = helpers.getSimcoeTileXYZLayer(BasemapConfig.bathymetryService.url);
					newLayer.setZIndex(0);
					if (BasemapConfig.bathymetryService.fullExtent) {
						newLayer.setExtent(BasemapConfig.bathymetryService.fullExtent);
					}

					window.map.addLayer(newLayer);
					this.setState({ bathymetryLayer: newLayer });
				}
			);
		}

		// LOAD WORLD LAYER
		if (BasemapConfig.worldImageryService !== undefined) {
			LayerHelpers.getLayer(
				{
					sourceType: OL_DATA_TYPES.XYZ,
					source: "WMS",
					layerName: "worldImageryServiceBasemap",
					url: BasemapConfig.worldImageryService,
					tiled: true,
					name: "worldImageryServiceBasemap",
				},
				(newLayer) => {
					//var worldImageryLayer = helpers.getESRITileXYZLayer(BasemapConfig.worldImageryService);
					newLayer.setZIndex(0);
					window.map.addLayer(newLayer);
					this.setState({ worldImageryLayer: newLayer });
				}
			);
		}

		// LOAD BASEMAP LAYERS
		let basemapList = [];
		//let basemapIndex = 0;
		BasemapConfig.topoServices.forEach((serviceGroup) => {
			index = 0;
			let serviceLayers = [];
			serviceGroup.layers.forEach((service) => {
				// CREATE THE LAYER
				//let layer = null;
				let layerName = service.name;
				if (layerName === undefined) layerName = helpers.getUID();
				if (service.type === "SIMCOE_TILED") {
					LayerHelpers.getLayer(
						{
							sourceType: OL_DATA_TYPES.TileImage,
							source: "WMS",
							layerName: layerName,
							url: service.url,
							extent: service.fullExtent,
							tiled: true,
							name: layerName,
						},
						(newLayer) => {
							//layer = helpers.getSimcoeTileXYZLayer(service.url);

							newLayer.setProperties({
								index: index,
								name: layerName,
								isOverlay: false,
							});
							serviceLayers.push(newLayer);
							index++;
						}
					);
				} else if (service.type === "OSM") {
					LayerHelpers.getLayer(
						{
							sourceType: OL_DATA_TYPES.OSM,
							source: "WMS",
							layerName: layerName,
							tiled: true,
							name: layerName,
						},
						(newLayer) => {
							//layer = helpers.getOSMLayer();
							//layer = helpers.getOSMTileXYZLayer("http://a.tile.openstreetmap.org");
							// LAYER PROPS
							newLayer.setProperties({
								index: index,
								name: layerName,
								isOverlay: false,
							});
							serviceLayers.push(newLayer);
							index++;
						}
					);
				} else if (service.type === "ESRI_TILED") {
					LayerHelpers.getLayer(
						{
							sourceType: OL_DATA_TYPES.XYZ,
							source: "WMS",
							layerName: layerName,
							url: service.url,
							tiled: true,
							name: layerName,
						},
						(newLayer) => {
							// layer = helpers.getArcGISTiledLayer(service.url);
							//layer = helpers.getESRITileXYZLayer(service.url);
							// LAYER PROPS
							newLayer.setProperties({
								index: index,
								name: layerName,
								isOverlay: false,
							});
							serviceLayers.push(newLayer);
							index++;
						}
					);
				}
			});
			const geoserverPath = window.config.geoserverPath;
			const groupUrl = serviceGroup.groupUrl;
			if (groupUrl !== undefined) {
				// GET XML
				helpers.httpGetText(groupUrl, (result) => {
					var parser = new xml2js.Parser();

					// PARSE TO JSON
					parser.parseString(result, (err, result) => {
						const groupLayerList =
							result.WMS_Capabilities.Capability[0].Layer[0].Layer[0].Layer;

						index = groupLayerList.length + index;
						let overlayIndex = index;
						//index++;

						groupLayerList.forEach((layerInfo) => {
							const keywords = layerInfo.KeywordList[0].Keyword;
							const opacity = this.getOpacity(keywords);
							const layerNameOnly = layerInfo.Name[0].split(":")[1];
							const serverUrl =
								groupUrl.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}`;

							let groupLayer = helpers.getImageWMSLayer(
								serverUrl + "/wms",
								layerInfo.Name[0]
							);
							groupLayer.setVisible(true);
							groupLayer.setOpacity(opacity);
							groupLayer.setZIndex(overlayIndex);
							groupLayer.setProperties({
								index: overlayIndex,
								name: layerNameOnly,
								isOverlay: true,
							});
							serviceLayers.push(groupLayer);
							overlayIndex--;
						});

						// USING LAYER GROUPS FOR TOPO
						let layerGroup = new LayerGroup({
							layers: serviceLayers,
							visible: false,
						});
						layerGroup.setProperties({
							index: serviceGroup.index,
							name: serviceGroup.name,
						});
						window.map.addLayer(layerGroup);
						basemapList.push(layerGroup);
					});
				});
			} else {
				// USING LAYER GROUPS FOR TOPO
				let layerGroup = new LayerGroup({
					layers: serviceLayers,
					visible: false,
				});
				layerGroup.setProperties({
					index: serviceGroup.index,
					name: serviceGroup.name,
				});
				window.map.addLayer(layerGroup);
				basemapList.push(layerGroup);
				//basemapIndex++;
			}
		});

		this.setState({ topoLayers: basemapList });
		this.setState({ topoActiveIndex: 0 });

		if (this.state.activeButton === "topo") {
			this.enableTopo();
		} else {
			this.enableImagery();
		}
		// NEED TO WAIT A TAD FOR LAYERS TO INIT
		setTimeout(() => {
			this.handleURLParameters();
		}, 100);
	}

	getOpacity(keywords) {
		if (keywords === undefined) return 1;
		const opacityKeyword = keywords.find(function (item) {
			return item.indexOf("OPACITY") !== -1;
		});
		if (opacityKeyword !== undefined) {
			const val = opacityKeyword.split("=")[1];
			return parseFloat(val);
		} else return 1;
	}

	// HANDLE URL PARAMETERS
	handleURLParameters = (value) => {
		const basemap =
			helpers.getURLParameter("BASEMAP") !== null
				? helpers.getURLParameter("BASEMAP").toUpperCase()
				: null;
		const name =
			helpers.getURLParameter("NAME") !== null
				? helpers.getURLParameter("NAME").toUpperCase()
				: null;
		const imagerySliderOpen =
			helpers.getURLParameter("SLIDER_OPEN") !== null
				? helpers.getURLParameter("SLIDER_OPEN").toUpperCase()
				: null;

		if (basemap === "IMAGERY") {
			this.enableImagery();

			if (imagerySliderOpen === "TRUE")
				this.setState({ imageryPanelOpen: true });

			if (name !== undefined) {
				for (let index = 0; index < this.state.imageryLayers.length; index++) {
					const layer = this.state.imageryLayers[index];
					const layerName = layer.getProperties().name.toUpperCase();
					if (layerName === name) {
						this.updateImageryLayers(index);
						this.setState({
							imagerySliderValue: index,
							imagerySliderDefaultValue: index,
						});
						return;
					}
				}
			}
		} else if (basemap === "TOPO") {
			this.disableImagery();
			this.enableTopo();

			for (let index = 0; index < this.state.topoLayers.length; index++) {
				let layer = this.state.topoLayers[index];
				const layerName = layer.getProperties().name;
				if (layerName.toUpperCase() === name) {
					this.setState({ topoActiveIndex: index });
					this.setTopoLayerVisiblity(index);
				}
			}
		}
	};

	// CALLED WHEN SLIDING OR TO RESET
	updateImageryLayers(value) {
		for (let index = 0; index < this.state.imageryLayers.length; index++) {
			let layer = this.state.imageryLayers[index];
			if (value === -1) layer.setVisible(false);
			else {
				const layerIndex = layer.getProperties().index;
				const indexRatio = 1 - Math.abs(layerIndex - value);
				if (layerIndex === value) {
					layer.setOpacity(1);
					layer.setVisible(true);
				} else if (indexRatio <= 0) {
					layer.setOpacity(0);
					layer.setVisible(false);
				} else {
					layer.setOpacity(indexRatio);
					layer.setVisible(true);
				}
			}
		}
	}

	// SLIDER CHANGE EVENT
	onSliderChange = (value) => {
		this.updateImageryLayers(value);
		this.setState({ imagerySliderValue: value });
	};

	// PANEL DROP DOWN BUTTON
	onImageryArrowClick = (value) => {
		// DISABLE TOPO
		this.disableTopo();

		// ENABLE IMAGERY
		this.setState({
			topoPanelOpen: false,
			activeButton: "imagery",
			imageryPanelOpen: !this.state.imageryPanelOpen,
		});
		this.updateImageryLayers(this.state.imagerySliderValue);
		this.state.streetsLayer.setVisible(this.state.streetsCheckbox);
		this.state.worldImageryLayer.setVisible(this.state.streetsCheckbox);

		// APP STATS
		helpers.addAppStat("Imagery", "Arrow");
	};

	onImageryButtonClick = (value) => {
		// DISABLE TOPO
		this.disableTopo();

		// CLOSE PANEL, ONLY IF ALREADY OPEN
		if (this.state.imageryPanelOpen)
			this.setState({ imageryPanelOpen: !this.state.imageryPanelOpen });

		this.enableImagery();

		// APP STATS
		helpers.addAppStat("Imagery", "Button");
	};

	enableImagery = (value) => {
		// ENABLE IMAGERY
		this.updateImageryLayers(this.state.imagerySliderValue);

		this.setState({ topoPanelOpen: false, activeButton: "imagery" });
		this.state.streetsLayer.setVisible(this.state.streetsCheckbox);
		this.state.worldImageryLayer.setVisible(this.state.streetsCheckbox);
		this.setTopoLayerVisiblity(-1);

		// EMIT A BASEMAP CHANGE
		window.emitter.emit("basemapChanged", "IMAGERY");
	};

	disableImagery = (value) => {
		// DISABLE IMAGERY
		this.state.streetsLayer.setVisible(false);
		this.state.worldImageryLayer.setVisible(false);
		this.setState({ imageryPanelOpen: false });
		this.updateImageryLayers(-1);
	};

	onStreetsCheckbox = (evt) => {
		this.state.streetsLayer.setVisible(evt.target.checked);
		this.setState({ streetsCheckbox: evt.target.checked });
	};

	onTopoCheckbox = (evt) => {
		//this.state.streetsLayer.setVisible(evt.target.checked);
		this.setState({ topoCheckbox: evt.target.checked }, () => {
			this.enableTopo();
		});
	};

	onCollapsedClick = (evt) => {
		// HIDE OPEN PANELS
		if (this.state.containerCollapsed === false) {
			this.setState({ imageryPanelOpen: false });
			this.setState({ topoPanelOpen: false });
		}

		this.setState({ containerCollapsed: !this.state.containerCollapsed });
	};

	enableTopo = (value) => {
		// DISABLE IMAGERY
		this.disableImagery();

		this.setState({ activeButton: "topo" });
		this.setTopoLayerVisiblity(this.state.topoActiveIndex);

		// EMIT A BASEMAP CHANGE
		window.emitter.emit("basemapChanged", "TOPO");
	};

	disableTopo = (value) => {
		this.setTopoLayerVisiblity(-1);
	};

	// TOPO BUTTON
	onTopoButtonClick = (evt) => {
		// CLOSE PANEL ONLY IF ALREADY OPEN
		if (this.state.topoPanelOpen)
			this.setState({ topoPanelOpen: !this.state.topoPanelOpen });

		this.enableTopo();

		// APP STATS
		helpers.addAppStat("Topo", "Button");
	};

	// PANEL DROP DOWN BUTTON
	onTopoArrowClick = (evt) => {
		this.enableTopo();
		this.setState({ topoPanelOpen: !this.state.topoPanelOpen });
		// APP STATS
		helpers.addAppStat("Topo", "Arrow");
	};

	// CLICK ON TOPO THUMBNAILS
	onTopoItemClick = (activeIndex, name) => {
		this.setState({ topoActiveIndex: activeIndex });
		this.setTopoLayerVisiblity(activeIndex);
		this.setState({ topoPanelOpen: false });
		helpers.addAppStat("Basemap", name);
	};

	// ADJUST VISIBILITY
	setTopoLayerVisiblity(activeIndex) {
		for (let index = 0; index < this.state.topoLayers.length; index++) {
			let layer = this.state.topoLayers[index];
			const layerIndex = layer.getProperties().index;
			if (layerIndex === activeIndex) {
				//let layers = layer.getLayers();

				layer.getLayers().forEach((layer) => {
					if (layer.get("isOverlay") && this.state.topoCheckbox)
						layer.setVisible(true);
					else if (layer.get("isOverlay") && !this.state.topoCheckbox)
						layer.setVisible(false);
				});

				layer.setVisible(true);
			} else {
				layer.setVisible(false);
			}
		}
	}
	controlStateChange(control, state) {
		switch (control) {
			case "basemap":
				this.setState({ showBaseMapSwitcher: state });
				break;
			default:
				break;
		}
	}
	render() {
		// STYLE USED BY SLIDER
		const sliderWrapperStyle = {
			width: 60,
			marginLeft: 13,
			height: 225,
			marginTop: 8,
			marginBottom: 15,
		};

		return (
			<div className={!this.state.showBaseMapSwitcher ? " sc-hidden" : ""}>
				<div id="sc-basemap-main-container">
					<div
						id="sc-basemap-collapse-button"
						className={
							this.state.containerCollapsed
								? "sc-basemap-collapse-button closed"
								: "sc-basemap-collapse-button"
						}
						onClick={this.onCollapsedClick}
					/>
					<div
						className={
							this.state.containerCollapsed ? "sc-hidden" : "sc-basemap-imagery"
						}
					>
						<button
							className={
								this.state.activeButton === "imagery"
									? "sc-button sc-basemap-imagery-button active"
									: "sc-button sc-basemap-imagery-button"
							}
							onClick={this.onImageryButtonClick}
						>
							Imagery
						</button>
						<button
							className="sc-button sc-basemap-arrow"
							onClick={this.onImageryArrowClick}
						/>
					</div>
					<div
						className={
							this.state.containerCollapsed ? "sc-hidden" : "sc-basemap-topo"
						}
					>
						<button
							className={
								this.state.activeButton === "topo"
									? "sc-button sc-basemap-topo-button active"
									: "sc-button sc-basemap-topo-button"
							}
							onClick={this.onTopoButtonClick}
						>
							Topo
						</button>
						<button
							className="sc-button sc-basemap-arrow"
							onClick={this.onTopoArrowClick}
						/>
					</div>
				</div>
				<div
					id="sc-basemap-imagery-slider-container"
					className={
						this.state.imageryPanelOpen
							? "sc-basemap-imagery-slider-container"
							: "sc-hidden"
					}
				>
					<label className="sc-basemap-streets-label">
						<input
							className="sc-basemap-streets-checkbox"
							id="sc-basemap-streets-checkbox"
							type="checkbox"
							onChange={this.onStreetsCheckbox}
							checked={this.state.streetsCheckbox}
						/>
						&nbsp;Streets
					</label>
					<Slider
						included={false}
						style={sliderWrapperStyle}
						marks={this.state.imagerySliderMarks}
						vertical={true}
						max={this.state.imagerySliderMax}
						min={this.state.imagerySliderMin}
						step={0.01}
						defaultValue={this.state.imagerySliderDefaultValue}
						onChange={this.onSliderChange}
						value={this.state.imagerySliderValue}
					/>
				</div>
				<div
					className={
						this.state.topoPanelOpen ? "sc-basemap-topo-container" : "sc-hidden"
					}
				>
					<label
						className={
							this.state.topoOverlayLayers.length === 0
								? "sc-hidden"
								: "sc-basemap-topo-label"
						}
					>
						<input
							className="sc-basemap-topo-checkbox"
							id="sc-basemap-topo-checkbox"
							type="checkbox"
							onChange={this.onTopoCheckbox}
							checked={this.state.topoCheckbox}
						/>
						&nbsp;Overlay
					</label>
					{BasemapConfig.topoServices.map((service, index) => (
						<BasemapItem
							key={helpers.getUID()}
							index={index}
							topoActiveIndex={this.state.topoActiveIndex}
							service={service}
							onTopoItemClick={this.onTopoItemClick}
						/>
					))}
				</div>
			</div>
		);
	}
}

export default BasemapSwitcher;

class BasemapItem extends Component {
	state = {};
	render() {
		return (
			<div
				className={
					this.props.topoActiveIndex === this.props.index
						? "sc-basemap-topo-item-container active"
						: "sc-basemap-topo-item-container"
				}
				onClick={() => {
					this.props.onTopoItemClick(this.props.index, this.props.service.name);
				}}
			>
				{this.props.service.name}
				<img
					className="sc-basemap-topo-image"
					src={images[this.props.service.image]}
					alt={this.props.service.image}
				/>
			</div>
		);
	}
}

// IMPORT ALL IMAGES
const images = importAllImages(
	require.context("./images", false, /\.(png|jpe?g|svg|gif)$/)
);
function importAllImages(r) {
	let images = {};
	r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
	return images;
}
