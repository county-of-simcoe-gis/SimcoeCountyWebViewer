import React, { Component } from "react";
import "./SolidWasteFacilities.css";
import PanelComponent from "../../../PanelComponent.jsx";
import * as config from "./config.json";
import ThemeContainer from "../themeComponents/ThemeContainer.jsx";

class SolidWasteFacilities extends Component {
	constructor(props) {
		super(props);

		this.state = {};
	}

	onClose() {
		// ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

		// CALL PARENT WITH CLOSE
		this.props.onClose();
	}

	render() {
		return (
			<PanelComponent onClose={this.props.onClose} name={this.props.name} helpLink={this.props.helpLink} type="themes">
				<ThemeContainer config={config.default}></ThemeContainer>
			</PanelComponent>
		);
	}
}

export default SolidWasteFacilities;
