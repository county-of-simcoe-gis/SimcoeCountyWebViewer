import React from "react";
import LegendItem from "./LegendItem";
import * as helpers from "../helpers/helpers";

function GroupItem(props) {
	const { group } = props;
	const layers = group.layers;

	return (
		<div className="my-masonry-grid_column">
			<fieldset>
				<legend>{helpers.replaceAllInString(group.label, "_", " ")}</legend>
				<div className="item-content">
					{layers.map((layer) => (
						<LegendItem key={helpers.getUID()} layer={layer} center={props.center}></LegendItem>
					))}
				</div>
			</fieldset>
		</div>
	);
}

export default GroupItem;
