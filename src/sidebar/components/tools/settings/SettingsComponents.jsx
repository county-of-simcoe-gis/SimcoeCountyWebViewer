import React from "react";

export const ClearLocalStorageButton = (props) => {
	if (props.storageKey === undefined) return <div />;
	return (
		<div className="sc-settings-row sc-arrow">
			<button
				name={"clear-" + props.storageKey}
				title={"Clear items for " + props.storageKey}
				className="sc-button"
				onClick={() => {
					props.clearLocalData(props.storageKey);
				}}
				style={{ maxWidth: "315px" }}
			>
				{"Clear items in " + props.storageKey}
			</button>
			<div className="sc-settings-divider" />
		</div>
	);
};
