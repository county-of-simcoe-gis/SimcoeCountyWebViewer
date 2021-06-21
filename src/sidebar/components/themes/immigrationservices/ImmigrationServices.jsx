import React, { Component } from "react";
import "./ImmigrationServices.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import * as config from "./config.json";
import ImmigrationServicesLayerToggler from "./ImmigrationServicesLayerToggler.jsx";

class ImmigrationServices extends Component {
	state = {};

	onClose = () => {
		// CALL PARENT WITH CLOSE
		this.props.onClose();
	};

	render() {
		return (
			<PanelComponent
				onClose={this.onClose}
				name={this.props.name}
				helpLink={this.props.helpLink}
				type="themes"
			>
				<div className="sc-immigration-main-container">
					<div className="sc-immigration-header-text">
						Explore resources to help newcomers: housing support services,
						settlement services, Employment Ontario services, libraries, an
						Ontario Early Years centres, Service Ontario and Service Canada.
					</div>
					<h2 className="sc-immigration-services-title">Support Services</h2>
					<div className="sc-immigration-layers-container">
						{config.default.toggleLayers.map((layer) => {
							return (
								<ImmigrationServicesLayerToggler
									key={helpers.getUID()}
									layer={layer}
								/>
							);
						})}
					</div>
				</div>
			</PanelComponent>
		);
	}
}

export default ImmigrationServices;
