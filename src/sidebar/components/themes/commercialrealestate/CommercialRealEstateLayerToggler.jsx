import React, { Component } from "react";
import * as helpers from "../../../../helpers/helpers";
import Collapsible from "react-collapsible";
import information from "./images/information.png";
import url from "url";
import ThemePopupContent from "../themeComponents/ThemePopupContent.jsx";
import GeoJSON from "ol/format/GeoJSON.js";
import { unByKey } from "ol/Observable.js";

class CommercialRealEstateLayerToggler extends Component {
	constructor(props) {
		super(props);
		this.state = {
			layerVisible: true,
			panelOpen: false,
			layer: null,
			styleUrl: "",
			recordCount: 0,
			metadata: "Retreiving info....",
		};
	}

	componentDidMount() {
		this.initLayer(() => {
			// LEGEND
			const styleUrlTemplate = (serverURL, layerName, styleName) =>
				`${serverURL}wms?REQUEST=GetLegendGraphic&VERSION=1.1&FORMAT=image/png&WIDTH=30&HEIGHT=30&TRANSPARENT=true&LAYER=${layerName}`;
			const styleUrl = styleUrlTemplate(
				this.props.layer.serverUrl,
				this.props.layer.layerName
			);

			// RECORD COUNT
			helpers.getWFSLayerRecordCount(
				this.props.layer.serverUrl,
				this.props.layer.layerName,
				(count) => {
					this.setState({ recordCount: count, styleUrl: styleUrl });
					// this.setState({ styleUrl: styleUrl });
				}
			);

			const rootInfoUrl = this.state.layer.get("rootInfoUrl");
			helpers.getJSON(rootInfoUrl, (rootResult) => {
				helpers.getJSON(rootResult.layer.resource.href, (result) => {
					const abstract = result.featureType.abstract;
					if (
						abstract !== undefined &&
						this.state.metadata === "Retreiving info...."
					)
						this.setState({ metadata: abstract });
				});
			});

			// MAP CLICK FOR POPUP INFO
			// this.mapClickEvent = window.map.on("click", (evt) => {
			//   if (window.isDrawingOrEditing) return;
			//   var viewResolution = window.map.getView().getResolution();
			//   var url = this.state.layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
			//     INFO_FORMAT: "application/json",
			//   });
			//   if (url) {
			//     helpers.getJSON(url, (result) => {
			//       const features = result.features;
			//       if (features.length === 0) {
			//         return;
			//       }
			//       const geoJSON = new GeoJSON().readFeatures(result);
			//       const feature = geoJSON[0];
			//       const entries = Object.entries(feature.getProperties());
			//       window.popup.show(evt.coordinate, <ThemePopupContent key={helpers.getUID()} values={entries} layerConfig={this.props.layer} />, this.props.layer.displayName);
			//     });
			//   }
			// });
		});
	}

	componentWillUnmount() {
		// CLEAN UP
		window.map.removeLayer(this.state.layer);
		unByKey(this.mapClickEvent);
	}

	// GET LAYER
	initLayer = (callback) => {
		if (this.state.layer !== null) return;

		const layer = helpers.getImageWMSLayer(
			url.resolve(this.props.layer.serverUrl, "wms"),
			this.props.layer.layerName,
			"geoserver",
			null,
			50
		);

		layer.setVisible(this.props.layer.visible);
		layer.setZIndex(this.props.layer.zIndex);
		layer.setProperties({
			name: this.props.layer.layerName,
			tocDisplayName: this.props.layer.displayName,
			queryable: true,
			disableParcelClick: false,
		});
		window.map.addLayer(layer);
		this.setState(
			{ layer: layer, layerVisible: this.props.layer.visible },
			(layer) => {
				callback();
			}
		);
	};

	onCheckboxClick = () => {
		this.setState(
			(prevState) => ({
				layerVisible: !prevState.layerVisible,
			}),
			() => {
				this.state.layer.setVisible(this.state.layerVisible);
			}
		);
	};

	onPanelTrigger = (evt) => {
		this.setState((prevState) => ({
			panelOpen: !prevState.panelOpen,
		}));
	};

	render() {
		return (
			<div>
				<Collapsible
					trigger={Header(
						this.props.layer,
						this.onCheckboxClick,
						this.onPanelTrigger,
						this.state.layerVisible,
						this.state.styleUrl,
						this.state.recordCount
					)}
					open={this.state.panelOpen}
					triggerDisabled={true}
				>
					<div className="sc-theme-commercial-real-estate-layers-layer-content">
						{this.state.metadata}
					</div>
				</Collapsible>
			</div>
		);
	}
}

export default CommercialRealEstateLayerToggler;

// HEADER TRIGGER
const Header = (
	layer,
	onCheckboxClick,
	onPanelTrigger,
	layerVisible,
	styleUrl,
	recordCount
) => {
	return (
		<div className="sc-theme-commercial-real-estate-layers-layer-header">
			<div className="sc-theme-commercial-real-estate-layers-center">
				<img style={{ width: "20px" }} src={styleUrl} alt="legend" />
				<input
					className="sc-theme-commercial-real-estate-layers-checkbox"
					type="checkbox"
					onClick={onCheckboxClick}
					checked={layerVisible}
					readOnly
				/>
				<label
					className="sc-theme-commercial-real-estate-layers-layer-label"
					onClick={onCheckboxClick}
				>
					{layer.displayName}
				</label>
				<label className="sc-theme-commercial-real-estate-layers-layer-count">
					{"(" + recordCount + ")"}
				</label>
				<img
					className="sc-theme-commercial-real-estate-layers-information-icon"
					src={information}
					alt="show info"
					onClick={onPanelTrigger}
					title="Show Details"
				/>
			</div>
		</div>
	);
};
