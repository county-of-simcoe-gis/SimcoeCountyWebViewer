import React, { Component } from "react";
import "./AddLayer.css";
import * as addLayerConfig from "./config.json";
import PanelComponent from "../../../PanelComponent";
import LoadingScreen from "../../../../helpers/LoadingScreen.jsx";
import * as helpers from "../../../../helpers/helpers";
import { LayerHelpers, OL_DATA_TYPES } from "../../../../helpers/OLHelpers";
import Select from "react-select";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { FaUpload } from "react-icons/fa";

class AddLayerForm extends Component {
	constructor(props) {
		super(props);
		this.defaultLayerName = "New Layer";
		this.inputId = "sc-add-layer-input";
		this.loadingMessage = "Discovering Layers...";
		this.state = {
			selectFormatOptions: [],
			selectFormatOption: undefined,
			serverUrl: "",
			selectLayerOptions: [],
			selectLayerOption: undefined,
			selectProjectionOptions: [],
			selectProjectionOption: undefined,
			selectServiceOptions: [],
			selectServiceOption: undefined,
			userEdit_displayName: false,
			layer_displayName: this.defaultLayerName,
			layer_source: undefined,
			layer_format: undefined,
			layer_type: undefined,
			layer_file: undefined,
			layer_name: "",
			layer_extent: undefined,
			selectedFormat: undefined,
			isFile: false,
			hasLayers: false,
			discovery_message: "",
			showExtent: false,
			errorRegister: [],
			file_formats: [],
			isRunning: false,
			tabIndex: 2,
			saveLayer: false,
		};
		this.defaultLayerOption = { label: "Not Found", value: "" };
	}
	componentDidMount() {
		this._setFormatTypes();
		this._setDefaultProjectionOptions();
		this._setLayerGroupOptions();
		this._setServiceSelectOptions();
	}

	_setFormatTypes = () => {
		const items = addLayerConfig.dataTypes;
		const selectedFormat = this.getSelectedFormat(items[0].options[0].value);
		let fileFormats = [];
		addLayerConfig.translations.forEach((item) => {
			if (item.extensions !== undefined)
				fileFormats.push(...item.extensions.split(","));
		});
		this.setState({
			selectFormatOptions: items[0].options,
			selectFormatOption: items[0].options[0],
			selectedFormat: selectedFormat,
			isFile: selectedFormat.source === "file",
			showExtent: selectedFormat.type === "static",
			file_formats: fileFormats,
		});
	};
	_setServiceSelectOptions = () => {
		const items = addLayerConfig.services;
		let options = [];
		items.forEach((item) => {
			options.push({ label: item.label, value: item.value });
		});
		options = options.concat([]);
		this.setState(
			{ selectServiceOptions: options, selectServiceOption: options[0] },
			() => {
				if (this.state.tabIndex === 0) this.onCheckServiceForLayers();
			}
		);
	};
	_setLayerGroupOptions = () => {
		window.emitter.emit("getLayerList", (groups) => {
			let options = [];
			groups.forEach((group) => {
				options.push({ label: group[0].groupName, value: group[0].group });
			});
			options = options.concat([]);
			this.setState({
				selectGroupOptions: options,
				selectGroupOption: options[0],
			});
		});
	};
	_setDefaultProjectionOptions = () => {
		const items = addLayerConfig.projections;
		this.setState({
			selectProjectionOptions: items,
			selectProjectionOption: items[0],
		});
	};
	getSelectedFormat = (value) => {
		const items = addLayerConfig.translations;
		return items.filter((item) => item.key === value)[0];
	};

	getSelectedService = (value) => {
		const items = addLayerConfig.services;
		return items.filter((item) => item.value === value)[0];
	};
	getFileFormat = (value) => {
		const items = addLayerConfig.translations.filter(
			(item) => item.extensions !== undefined
		);
		const returnItem = items.filter((item) => item.extensions === value)[0];
		return returnItem;
	};
	onClose = () => {
		this.props.onClose();
	};
	clearLayers = () => {
		this.setState(
			{
				selectLayerOptions: [],
				selectLayerOption: this.defaultLayerOption,
				hasLayers: false,
				discovery_message: "",
				layer_displayName: this.defaultLayerName,
				layer_file: undefined,
				selectedFormat: undefined,
				userEdit_displayName: false,
			},
			() => {
				this.onTabSelect(this.state.tabIndex);
				var fileInput = document.getElementById("sc-add-layer-file");
				if (fileInput !== null) fileInput.value = "";
				if (this.state.tabIndex === 0) this.onCheckServiceForLayers();
			}
		);
	};
	onLayerSourceChange = (isFile) => {
		let items = addLayerConfig.dataTypes;
		const filterLabel = isFile ? "File" : "URL";
		items = items.filter((item) => item.label === filterLabel)[0];
		let options = items.options;
		const selectedFormat = this.getSelectedFormat(options[0].value);
		let serverUrl = this.state.serverUrl;
		if (serverUrl === "") {
			if (
				options[0] !== undefined &&
				options[0].default !== undefined &&
				options[0].default !== null
			)
				serverUrl = options[0].default;
		}
		this.setState(
			{
				serverUrl: serverUrl,
				selectFormatOptions: options,
				selectFormatOption: options[0],
				selectedFormat: selectedFormat,
				isFile: selectedFormat.source === "file",
				showExtent: selectedFormat.type === "static",
			},
			() => {
				if (this.state.selectLayerOption !== this.defaultLayerOption)
					this.clearLayers();
			}
		);
	};
	onLayerFormatChange = (selection) => {
		const selectedFormat = this.getSelectedFormat(selection.value);
		let serverUrl = this.state.serverUrl;

		if (
			serverUrl === "" ||
			this.state.selectFormatOptions.some((item) => item.default === serverUrl)
		) {
			const currentFormatOption = this.state.selectFormatOptions.filter(
				(item) => {
					return item.value === selection.value;
				}
			)[0];
			if (
				currentFormatOption.default !== undefined &&
				currentFormatOption.default !== null
			)
				serverUrl = currentFormatOption.default;
		}
		this.setState(
			{
				selectFormatOption: selection,
				selectedFormat: selectedFormat,
				serverUrl: serverUrl,
			},
			() => {
				if (this.state.selectLayerOption !== this.defaultLayerOption)
					this.clearLayers();
			}
		);
	};

	onServiceLayerSelectChange = (selection) => {
		let displayName = this.state.layer_displayName;
		const selectedLayer = this.state.selectLayerOptions.filter(
			(item) => item.value === selection.value
		)[0];
		if (!this.state.userEdit_displayName) displayName = selection.label;
		this.setState({
			selectLayerOption: selection,
			layer_name: selectedLayer.layer_name,
			layer_displayName: displayName,
			serverUrl: selectedLayer.url,
		});
	};

	onLayerSelectChange = (selection) => {
		let displayName = this.state.layer_displayName;
		const selectedLayer = this.state.selectLayerOptions.filter(
			(item) => item.value === selection.value
		)[0];
		if (!this.state.userEdit_displayName) displayName = selectedLayer.label;
		this.setState({
			selectLayerOption: selection,
			layer_name: selectedLayer.layer_name,
			layer_displayName: displayName,
		});
	};
	onServiceChange = (selection) => {
		this.setState({ selectServiceOption: selection }, () => {
			this.onCheckServiceForLayers();
		});
	};
	onCheckForLayers = () => {
		let selectedLayer = this.defaultLayerOption;
		let selectLayers = [];
		//CLEAR LAYERS LIST AND ATTEMPT TO REPOPULATE
		this.setState(
			{
				selectLayerOptions: selectLayers,
				selectLayerOption: selectedLayer,
				isRunning: true,
			},
			() => {
				LayerHelpers.getCapabilities(
					this.state.serverUrl,
					this.state.selectedFormat.source,
					(layers) => {
						selectLayers = [];
						layers.forEach((layer) => {
							if (
								this.state.serverUrl.toLowerCase().indexOf("wmsserver") !== -1
							) {
								layer["INFO_FORMAT"] = addLayerConfig.arcgis.INFO_FORMAT;
								layer["XSL_TEMPLATE"] =
									helpers.getConfigValue("originUrl") +
									addLayerConfig.arcgis.XSL_TEMPLATE;
							}
							selectLayers.push(layer);
						});
						if (selectLayers !== undefined && selectLayers.length > 0)
							selectedLayer = selectLayers[0];
						else selectLayers = [];

						this.setState(
							{
								isRunning: false,
								selectLayerOptions: selectLayers,
								selectLayerOption: selectedLayer,
								hasLayers: selectLayers.length > 0,
								discovery_message:
									selectLayers.length > 0 ? "" : "NO LAYERS FOUND",
							},
							() => {
								if (this.state.hasLayers)
									this.onLayerSelectChange(selectedLayer);
							}
						);
					}
				);
			}
		);
	};
	onCheckServiceForLayers = () => {
		let selectedService = this.getSelectedService(
			this.state.selectServiceOption.value
		);
		let selectedFormat = this.getSelectedFormat(selectedService.serviceType);
		let selectedLayer = this.defaultLayerOption;

		const serviceUrl = (url, service, suffix) => `${url}/${service}${suffix}`;
		const discoveryUrl = (url, service, suffix) => `${url}/${service}${suffix}`;
		//CLEAR LAYERS LIST AND ATTEMPT TO REPOPULATE
		this.setState(
			{
				selectLayerOptions: [],
				selectLayerOption: selectedLayer,
				selectedFormat: selectedFormat,
				isRunning: true,
			},
			() => {
				let serviceLayers = [];
				var lookupServiceUrl = discoveryUrl(
					selectedService.discoveryUrl,
					selectedService.value,
					selectedService.discoverySuffix
				);
				helpers.getJSON(lookupServiceUrl, (results) => {
					var services = [];
					switch (selectedService.server_type) {
						case "esri":
							services = results.services;
							break;
						case "geoserver":
							services = results.layerGroup.publishables.published;
							break;
						default:
							services = results.services;
							break;
					}
					if (selectedService.filterServices !== undefined) {
						services = services.filter((item) =>
							selectedService.filterServices.includes(item.name)
						);
					}
					services.forEach((item) => {
						var currentIndex = services.indexOf(item) + 1;
						var currentUrl = serviceUrl(
							selectedService.serviceUrl,
							item.name.replace(":", "/"),
							selectedService.urlSuffix
						);
						LayerHelpers.getCapabilities(
							currentUrl,
							selectedFormat.source,
							(layers) => {
								var foundLayers = layers;
								if (
									foundLayers.length > 1 &&
									selectedService.server_type === "geoserver"
								)
									return;
								if (foundLayers !== undefined && foundLayers.length > 0) {
									foundLayers.forEach((layer) => {
										if (selectedService.INFO_FORMAT)
											layer["INFO_FORMAT"] = selectedService.INFO_FORMAT;
										if (selectedService.XSL_TEMPLATE)
											layer["XSL_TEMPLATE"] =
												helpers.getConfigValue("originUrl") +
												selectedService.XSL_TEMPLATE;
										serviceLayers.push(layer);
									});
								}
								if (services.length === currentIndex) {
									if (serviceLayers !== undefined && serviceLayers.length > 0) {
										serviceLayers = helpers.sortByKey(
											serviceLayers.concat([]),
											"label"
										);
										selectedLayer = serviceLayers[0];
									} else serviceLayers = [];

									this.setState(
										{
											isRunning: false,
											selectLayerOptions: serviceLayers,
											selectLayerOption: selectedLayer,
											hasLayers: serviceLayers.length > 0,
											discovery_message:
												serviceLayers.length > 0 ? "" : "NO LAYERS FOUND",
										},
										() => {
											if (this.state.hasLayers)
												this.onServiceLayerSelectChange(
													this.state.selectLayerOption
												);
										}
									);
								}
							}
						);
					});
				});
			}
		);
	};
	addLayer = (layer) => {
		let showLayer = true; // this.state.tabIndex !== 0;
		let styleUrl = "";
		let queryable = false;
		let opaque = false;
		let infoFormat = "";
		let xslTemplate = "";
		if (this.state.selectLayerOption !== this.defaultLayerOption) {
			const selectedLayer = this.state.selectLayerOptions.filter(
				(item) => item.value === this.state.selectLayerOption.value
			)[0];
			if (selectedLayer !== undefined) {
				if (selectedLayer.style !== undefined) styleUrl = selectedLayer.style;
				if (selectedLayer.queryable !== undefined)
					queryable = selectedLayer.queryable;
				if (selectedLayer.opaque !== undefined) opaque = selectedLayer.opaque;
				if (selectedLayer.INFO_FORMAT !== undefined)
					infoFormat = selectedLayer.INFO_FORMAT;
				if (selectedLayer.XSL_TEMPLATE !== undefined)
					xslTemplate = selectedLayer.XSL_TEMPLATE;
			}
		}

		layer.setVisible(true);
		layer.setOpacity(1);
		/*newLayer.setProperties({ name: layerNameOnly, 
                                    displayName: displayName,
                                    wfsUrl: wfsUrl, 
                                    rootInfoUrl: rootInfoUrl, 
                                    disableParcelClick: liveLayer,
                                    queryable:queryable,
                                    opaque:opaque  });*/

		layer.setProperties({
			name: this.state.layer_name,
			displayName: this.state.layer_displayName,
			tocDisplayName: this.state.layer_displayName,
			//disableParcelClick: queryable,
			userLayer: true,
			queryable: queryable,
			opaque: opaque,
			INFO_FORMAT: infoFormat,
			XSL_TEMPLATE: xslTemplate,
		});
		const newLayer = {
			name: this.state.layer_name, // FRIENDLY NAME
			tocDisplayName: this.state.layer_displayName,
			height: 30, // HEIGHT OF DOM ROW FOR AUTOSIZER
			drawIndex: undefined, // INDEX USED BY VIRTUAL LIST
			index: undefined, // INDEX USED BY VIRTUAL LIST
			styleUrl: styleUrl, // WMS URL TO LEGEND SWATCH IMAGE
			showLegend: false, // SHOW LEGEND USING PLUS-MINUS IN TOC
			legendHeight: -1, // HEIGHT OF IMAGE USED BY AUTOSIZER
			legendImage: null, // IMAGE DATA, STORED ONCE USER VIEWS LEGEND
			visible: true, // LAYER VISIBLE IN MAP, UPDATED BY CHECKBOX
			layer: layer, // OL LAYER OBJECT
			metadataUrl: null, // ROOT LAYER INFO FROM GROUP END POINT
			opacity: 1.0, // OPACITY OF LAYER
			minScale: undefined, //MinScaleDenominator from geoserver
			maxScale: undefined, //MaxScaleDenominator from geoserver
			liveLayer: styleUrl === "" ? false : true, // LIVE LAYER FLAG
			wfsUrl: "",
			userLayer: true,
			displayName: this.state.layer_displayName,
			canDownload: false,
			group: "",
			groupName: "",
			infoFormat: infoFormat,
			xslTemplate: xslTemplate,
		};
		window.emitter.emit(
			"addCustomLayer",
			newLayer,
			this.state.selectGroupOption.value,
			showLayer,
			this.state.saveLayer
		);
		setTimeout(() => {
			this.clearLayers();
		}, 500);
	};
	isValidLayer = (showError) => {
		let errors = this.state.errorRegister;
		let isValid = false;
		const isNotDefault =
			this.state.selectLayerOption !== this.defaultLayerOption;
		if (!isNotDefault && !this.state.isFile) {
			errors.push({
				message: "Invalid Layer Selected",
				field: "sc-input-layers",
			});
		}
		if (this.state.isFile) {
			var fileInput = document.getElementById("sc-add-layer-file");

			isValid = fileInput.files.length > 0;
		} else {
			isValid = isNotDefault;
		}

		if (showError && !isValid) {
			this.setState({ errorRegister: errors }, () => {
				return isValid;
			});
		} else {
			return isValid;
		}
	};
	isValid = (showErrors, callback) => {
		this.setState({ errorRegister: [] }, () => {
			let validLayer = this.isValidLayer(showErrors);
			if (showErrors && !validLayer)
				helpers.showMessage(
					this.state.errorRegister,
					"Error",
					helpers.messageColors.red,
					2500
				);
			callback(validLayer);
		});
	};
	onLayerFileChange = (file) => {
		let selectedFile = file.target.files[0];
		let displayName = this.state.layer_displayName;
		if (selectedFile === undefined) return;
		let file_extension = selectedFile.name.split(".").pop();
		const selectedFormat = this.getFileFormat(file_extension.toLowerCase());
		if (!this.state.userEdit_displayName)
			displayName = selectedFile.name.split(".").slice(0, -1).join(".");
		if (selectedFormat === undefined) {
			this.setState(
				{
					layer_file: selectedFile,
					layer_displayName: displayName,
					selectedFormat: selectedFormat,
				},
				() => {
					helpers.showMessage(
						"Error",
						"Unsupported file type.",
						helpers.messageColors.red
					);
				}
			);
		} else {
			this.setState({
				layer_file: selectedFile,
				layer_displayName: displayName,
				selectedFormat: selectedFormat,
			});
		}
	};

	onAddLayerClick = () => {
		const format = this.state.selectedFormat;
		this.isValid(true, (isValid) => {
			if (isValid) {
				var formatType = format.type;
				for (var dt in OL_DATA_TYPES) {
					if (dt.toLowerCase() === formatType.toLowerCase()) formatType = dt;
				}
				const selectedLayer = this.state.selectLayerOptions.filter(
					(item) => item.value === this.state.selectLayerOption.value
				)[0];

				LayerHelpers.getLayer(
					{
						sourceType: formatType,
						source: format.source,
						projection: this.state.selectProjectionOption.value,
						layerName: this.state.layer_name,
						url: this.state.serverUrl,
						tiled: false,
						file: this.state.layer_file,
						extent: this.state.layer_extent,
						name: this.state.layer_displayName,
						style: selectedLayer,
					},
					this.addLayer
				);
				if (this.state.layer_file !== undefined) {
					helpers.addAppStat(
						"Add Data",
						`${this.state.tabIndex}-${format.source}-${formatType}`
					);
				} else {
					helpers.addAppStat(
						"Add Data",
						`${this.state.tabIndex}-${format.source}-${formatType}`
					);
				}
			}
		});
	};
	onClose() {
		// CALL PARENT WITH CLOSE
		this.props.onClose();
	}
	onTabSelect = (tabIndex) => {
		this.setState({ tabIndex, serverUrl: "" }, () => {
			this.onLayerSourceChange(tabIndex === 2);
			if (this.state.tabIndex === 0) this.onCheckServiceForLayers();
		});
	};
	render() {
		return (
			<PanelComponent
				onClose={this.props.onClose}
				name={this.props.name}
				helpLink={this.props.helpLink}
				type="tools"
			>
				<div className="sc-add-layer-content">
					<LoadingScreen
						key={helpers.getUID()}
						visible={this.state.isRunning}
						message="Checking..."
						spinnerSize={60}
						spinnerBackColor={"#c3c3c3"}
						spinnerForeColor={"#3498db"}
						fontSize={"26px"}
						messageColor={"#3498db"}
						backgroundColor={"#ccffff"}
						backgroundOpacity={0.35}
					/>
					<div className="sc-title">Table of Contents</div>
					<div className="sc-container">
						<div className="sc-add-layer-row">
							<label htmlFor="sc-input-group">Add to Group:</label>
							<Select
								id="sc-input-group"
								onChange={(selection) => {
									this.setState({ selectGroupOption: selection });
								}}
								options={this.state.selectGroupOptions}
								value={this.state.selectGroupOption}
								className="sc-add-layer-select"
							/>
						</div>
						<div className="sc-add-layer-row">
							<label htmlFor="sc-add-layer-display-name">Layer Name:</label>
							<input
								id="sc-add-layer-display-name"
								type="text"
								className="sc-add-layer-input sc-editable"
								onChange={(evt) => {
									this.setState({
										layer_displayName: evt.target.value,
										userEdit_displayName: true,
									});
								}}
								onFocus={(evt) => {
									helpers.disableKeyboardEvents(true);
								}}
								onBlur={(evt) => {
									helpers.disableKeyboardEvents(false);
								}}
								value={this.state.layer_displayName}
							/>
						</div>
						<div className="sc-add-layer-row">
							<label htmlFor="sc-add-layer-save">Save layer:</label>
							<input
								id="sc-add-layer-save"
								type="checkbox"
								checked={this.state.saveLayer}
								onChange={(evt) => {
									this.setState({ saveLayer: evt.target.checked });
								}}
							/>
						</div>
					</div>
					<div className="sc-title">Source</div>
					<Tabs selectedIndex={this.state.tabIndex} onSelect={this.onTabSelect}>
						<TabList>
							<Tab id="tab-add-layer-services">Services</Tab>
							<Tab id="tab-add-layer-url">URL</Tab>
							<Tab id="tab-add-layer-file">FILE</Tab>
							{/*<Tab id="tab-add-layer-service">SERVICE</Tab>*/}
						</TabList>
						<TabPanel id="tab-add-layer-url-content">
							<div className="sc-container sc-add-layer-tab-panel">
								<div className="sc-title">Service</div>
								<div className="sc-add-layer-row">
									<Select
										id="sc-input-format"
										onChange={this.onServiceChange}
										options={this.state.selectServiceOptions}
										value={this.state.selectServiceOption}
										className="sc-add-service-select"
									/>
								</div>
								<div className="sc-coordinates-divider" />
								<div
									className={this.state.hasLayers ? "sc-title" : "sc-hidden"}
								>
									Available Layers
								</div>
								<div
									className={
										!this.state.hasLayers &&
										this.state.serverUrl !== "" &&
										this.state.discovery_message !== ""
											? "sc-add-layer-row center"
											: "sc-hidden"
									}
								>
									{this.state.discovery_message}
								</div>
								<div
									className={
										this.state.hasLayers ? "sc-add-layer-row" : "sc-hidden"
									}
								>
									<Select
										id="sc-input-service-layers"
										onChange={this.onServiceLayerSelectChange}
										options={this.state.selectLayerOptions}
										value={this.state.selectLayerOption}
										className="sc-add-layer-select"
									/>
								</div>
							</div>
						</TabPanel>
						<TabPanel id="tab-add-layer-url-content">
							<div className="sc-container sc-add-layer-tab-panel">
								<div className="sc-title">URL Type</div>
								<div className="sc-add-layer-row">
									<Select
										id="sc-input-format"
										onChange={this.onLayerFormatChange}
										options={this.state.selectFormatOptions}
										value={this.state.selectFormatOption}
										className="sc-add-layer-select"
									/>
								</div>
								<div className="sc-coordinates-divider" />
								<div className="sc-title">URL</div>
								<div className="sc-add-layer-row">
									<input
										id="sc-add-layer-server"
										type="text"
										autoComplete="on"
										placeholder="https://opengis.simcoe.ca/geoserver/simcoe/All_Layers/ows"
										className="sc-add-layer-input sc-editable"
										onChange={(evt) => {
											this.setState({ serverUrl: evt.target.value }, () => {
												if (
													this.state.selectLayerOption !==
													this.defaultLayerOption
												)
													this.clearLayers();
											});
										}}
										onFocus={(evt) => {
											helpers.disableKeyboardEvents(true);
											evt.target.select();
										}}
										onBlur={(evt) => {
											helpers.disableKeyboardEvents(false);
										}}
										value={this.state.serverUrl}
									/>
								</div>
								<div className="sc-add-layer-row">
									<button
										id="sc-add-layer-discover"
										type="button"
										name="check"
										className="sc-button"
										disabled={
											this.state.serverUrl === "" || this.state.isRunning
										}
										onClick={this.onCheckForLayers}
									>
										{this.state.isRunning
											? this.loadingMessage
											: "Check for layers"}
									</button>
								</div>
								<div className="sc-coordinates-divider" />
								<div
									className={this.state.hasLayers ? "sc-title" : "sc-hidden"}
								>
									Available Layers
								</div>
								<div
									className={
										!this.state.hasLayers &&
										this.state.serverUrl !== "" &&
										this.state.discovery_message !== ""
											? "sc-add-layer-row center"
											: "sc-hidden"
									}
								>
									{this.state.discovery_message}
								</div>
								<div
									className={
										this.state.hasLayers ? "sc-add-layer-row" : "sc-hidden"
									}
								>
									<Select
										id="sc-input-layers"
										onChange={this.onLayerSelectChange}
										options={this.state.selectLayerOptions}
										value={this.state.selectLayerOption}
										className="sc-add-layer-select"
									/>
								</div>
							</div>
						</TabPanel>
						<TabPanel id="tab-add-layer-file-content">
							<div className="sc-container sc-add-layer-tab-panel">
								<div className={"sc-title"}>Supported file types</div>
								<div className={"sc-add-layer-row file-extensions"}>
									{this.state.file_formats.join(", ")}
								</div>
								<div className={"sc-add-layer-row sc-add-layer-file-container"}>
									<label
										htmlFor="sc-add-layer-file"
										className="sc-add-layer-input label"
									>
										Drag and Drop or Click to Select File
										<br />
										<FaUpload size={35} />
									</label>
									<input
										id="sc-add-layer-file"
										className="sc-add-layer-input file"
										type="file"
										name="file"
										title="Drag and Drop or Select File"
										size="60"
										accept={`.${this.state.file_formats.join(", .")}`}
										onChange={this.onLayerFileChange}
									/>
								</div>
								<div
									className={
										this.state.showExtent ? "sc-add-layer-row" : "sc-hidden"
									}
								>
									<label htmlFor="sc-add-layer-extent">Extent:</label>
									<input
										id="sc-add-layer-extent"
										type="text"
										placeholder="TopX, TopY, BottomX, BottomY"
										className="sc-add-layer-input sc-editable"
										onChange={(evt) => {
											this.setState({ layer_extent: evt.target.value });
										}}
										onFocus={(evt) => {
											helpers.disableKeyboardEvents(true);
										}}
										onBlur={(evt) => {
											helpers.disableKeyboardEvents(false);
										}}
										value={this.state.layer_extent}
									/>
								</div>
								<div className="sc-add-layer-row sc-hidden">
									<label htmlFor="sc-input-projection">Projection:</label>
									<Select
										id="sc-input-projection"
										onChange={(selection) => {
											this.setState({ selectProjectionOption: selection });
										}}
										options={this.state.selectProjectionOptions}
										value={this.state.selectProjectionOption}
										className="sc-add-layer-select"
									/>
								</div>
							</div>
						</TabPanel>
						{/*<TabPanel id="tab-add-layer-service-content">
                        <div className="sc-container sc-add-layer-tab-panel">
                            <h2>Service</h2>
                        </div>
                    </TabPanel>*/}
					</Tabs>

					<div className="sc-add-layer-row right">
						<div>
							<button
								type="button"
								className="sc-button"
								disabled={this.state.selectedFormat === undefined}
								onClick={this.onAddLayerClick}
							>
								Add layer
							</button>
							<button
								type="button"
								className="sc-button"
								onClick={this.onClose}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			</PanelComponent>
		);
	}
}

export default AddLayerForm;
