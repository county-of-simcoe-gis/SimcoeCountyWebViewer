import React from "react";
import "./DrawButton.css";

const DrawButton = (props) => {
	if (props.visible !== undefined && !props.visible) return <div />;

	return (
		<div className={props.isActive ? "sc-mymaps-button-container active" : "sc-mymaps-button-container"}>
			<button
				className={props.disabled === undefined || !props.disabled ? "sc-mymaps-button" : "sc-mymaps-button disabled"}
				title={props.title}
				onClick={props.onClick}
				disabled={props.disabled === undefined || !props.disabled ? false : true}
			>
				<img src={images[props.imageName]} alt={props.imageName} />
			</button>
		</div>
	);
};

export default DrawButton;

// IMPORT ALL IMAGES
import { createImagesObject } from "../../../helpers/imageHelper";
const images = createImagesObject(
  import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
);
