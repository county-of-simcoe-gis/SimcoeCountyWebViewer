import React, { Component } from "react";
import "./CommercialRealEstateSearchPropTypes.css";

class CommercialRealEstateSearch extends Component {
	state = {};

	onClose = () => {
		// ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

		// CALL PARENT WITH CLOSE
		this.props.onClose();
	};

	render() {
		return (
			<div className="sc-border-bottom" style={{ paddingBottom: "5px" }}>
				<div className="sc-theme-commercial-real-estate-prop-type-title">Property Type</div>
				<div className="sc-theme-commercial-real-estate-prop-type-table">
					<div className="sc-theme-commercial-real-estate-prop-type-table-row">
						<PropType
							name="Commercial"
							colorClassName="sc-theme-commercial-real-estate-prop-type-commercial"
							onLayerCheckboxClick={this.props.onLayerCheckboxClick}
							layer={this.props.layers.Commercial}
						/>
						<PropType
							name="Vacant Land"
							colorClassName="sc-theme-commercial-real-estate-prop-type-vacant-land"
							onLayerCheckboxClick={this.props.onLayerCheckboxClick}
							layer={this.props.layers["Vacant Land"]}
						/>
						<PropType name="Farm" colorClassName="sc-theme-commercial-real-estate-prop-type-farm" onLayerCheckboxClick={this.props.onLayerCheckboxClick} layer={this.props.layers.Farm} />
					</div>
					<div className="sc-theme-commercial-real-estate-prop-type-table-row">
						<PropType
							name="Industrial"
							colorClassName="sc-theme-commercial-real-estate-prop-type-industrial"
							onLayerCheckboxClick={this.props.onLayerCheckboxClick}
							layer={this.props.layers.Industrial}
						/>
						<PropType
							name="Institutional"
							colorClassName="sc-theme-commercial-real-estate-prop-type-institutional"
							onLayerCheckboxClick={this.props.onLayerCheckboxClick}
							layer={this.props.layers.Institutional}
						/>
					</div>
				</div>
			</div>
		);
	}
}

export default CommercialRealEstateSearch;

const PropType = (props) => {
	if (props.layer === undefined) return <div />;
	return (
		<label>
			<input type="checkbox" onChange={(evt) => props.onLayerCheckboxClick(evt, props.name)} defaultChecked={true} />
			<span className={props.colorClassName}>{props.name}</span>
		</label>
	);
};
