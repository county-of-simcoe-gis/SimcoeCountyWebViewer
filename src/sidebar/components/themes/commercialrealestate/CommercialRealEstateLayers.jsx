import React from "react";
import CommercialRealEstateLayerToggler from "./CommercialRealEstateLayerToggler.jsx";
import * as helpers from "../../../../helpers/helpers";
import "./CommercialRealEstateLayers.css";
const CommercialRealEstateLayers = React.memo((props) => {
	return (
		<div className="sc-theme-commercial-real-estate-layers-container">
			<div className="sc-title">Layers</div>
			<div className="sc-border-top" style={{ paddingBottom: "5px" }}>
				{props.layers.map((layer) => {
					return <CommercialRealEstateLayerToggler key={helpers.getUID()} layer={layer} />;
				})}
			</div>
		</div>
	);
});

export default CommercialRealEstateLayers;
