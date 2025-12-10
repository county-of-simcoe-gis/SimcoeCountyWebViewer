import React from "react";
import * as helpers from "../../../../helpers/helpers";
import Select from "react-select";
import copyImg from "./images/copy16.png";

const inputMsg = "(listening for input)";
export const LiveCoordinates = (props) => {
	return (
		<div>
			<div className="sc-title">Live Coordinates</div>

			<div className="sc-description">Live coordinates of your current pointer/mouse position.</div>

			<div className="sc-container">
				<div className="sc-coordinates-row sc-arrow">
					<label>X Coordinate:</label>
					<span>{props.liveWebMercatorCoords === null ? inputMsg : props.liveWebMercatorCoords[0].toFixed(2)}</span>
				</div>

				<div className="sc-coordinates-row sc-arrow">
					<label>Y Coordinate:</label>
					<span>{props.liveWebMercatorCoords === null ? inputMsg : props.liveWebMercatorCoords[1].toFixed(2)}</span>
				</div>

				<div className="sc-coordinates-divider">&nbsp;</div>

				<div className="sc-coordinates-row sc-arrow">
					<label>Latitude:</label>
					<span>{props.liveLatLongCoords === null ? inputMsg : props.liveLatLongCoords[1].toFixed(7)}</span>
				</div>

				<div className="sc-coordinates-row sc-arrow">
					<label>Longitude:</label>
					<span>{props.liveLatLongCoords === null ? inputMsg : props.liveLatLongCoords[0].toFixed(7)}</span>
				</div>
			</div>
		</div>
	);
};
export const LatLong = (props) => {
	return (
		<div>
			<div className="sc-container">
				<div className="sc-coordinates-row sc-arrow">
					<label>Latitude:</label>
					<span>{props.coords === null ? inputMsg : props.coords[0].toFixed(7)}</span>
				</div>

				<div className="sc-coordinates-row sc-arrow">
					<label>Longitude:</label>
					<span>{props.coords === null ? inputMsg : props.coords[1].toFixed(7)}</span>
				</div>
			</div>
		</div>
	);
};

export const ProjectedCoordinates = (props) => {
	if (props.zone === undefined || props.zone.value === "auto") return <div></div>;
	return (
		<div className={props.coords !== null ? "sc-coordinates-live" : "sc-hidden"}>
			<div className="sc-coordinates-live-data">
				<div className="sc-coordinates-live-title">
					{props.coords !== null ? props.projection.label + (props.zone.value !== "auto" && props.zone.label.trim() !== "" ? " - Zone: " + props.zone.label : "") : ""}
				</div>
				<div className="sc-coordinates-live-content">
					{props.coords !== null ? props.zone.value + " : " + props.coords[0].toFixed(props.precision) + " / " + props.coords[1].toFixed(props.precision) : ""}
				</div>
			</div>
			<div className="sc-coordinates-live-badge">LIVE</div>
		</div>
	);
};

export const CopyCoordinates = (props) => {
	const placeholderText = "waiting for coordinates ...";
	const formatText = (coord, x, y, template) => {
		if (x === null) return "";
		let returnText = template;
		returnText = returnText.split("[x]").join(x);
		returnText = returnText.split("[y]").join(y);
		returnText = returnText.split("[coord]").join(coord);
		return returnText;
	};
	let output = "";
	if (props.copyFormat !== undefined) output = formatText(props.title, props.valueX, props.valueY, props.copyFormat.value);
	return (
		<div>
			<div className="sc-container sc-coordinates-copy-container">
				<div className="sc-coordinates-row sc-arrow">
					<label>Copy Format:</label>
					<span>
						<Select id="sc-copy-format-select" onChange={props.onFormatChange} options={props.copyFormats} value={props.copyFormat} menuPlacement="auto" menuPosition="fixed" />
					</span>
				</div>
				<div className="sc-coordinates-divider"></div>
				<div className="sc-coordinates-copy sc-arrow">
					<span>
						<input id={props.inputId} className="sc-input sc-coordinates-input" type="text" value={output} placeholder={placeholderText} readOnly />
						<img src={copyImg} alt="Copy Coordinates" onClick={props.onCopy} title="Copy Coordinates to Clip Board" />
					</span>
				</div>
			</div>
		</div>
	);
};

export const MapExtent = (props) => {
	return (
		<div className="sc-container">
			<div className="sc-coordinates-row sc-arrow">
				<label>Min X:</label>
				<span>{props.extentMinX === null ? inputMsg : props.extentMinX.toFixed(2)}</span>
			</div>

			<div className="sc-coordinates-row sc-arrow">
				<label>Max X:</label>
				<span>{props.extentMaxX === null ? inputMsg : props.extentMaxX.toFixed(2)}</span>
			</div>

			<div className="sc-coordinates-row sc-arrow">
				<label>Min Y:</label>
				<span>{props.extentMinY === null ? inputMsg : props.extentMinY.toFixed(2)}</span>
			</div>

			<div className="sc-coordinates-row sc-arrow">
				<label>Max Y:</label>
				<span>{props.extentMaxY === null ? inputMsg : props.extentMaxY.toFixed(2)}</span>
			</div>
		</div>
	);
};

export const CustomCoordinates = (props) => {
	return (
		<div>
			<div className="sc-coordinates-heading">
				<span>{props.title}</span>
			</div>
			<CoordinateRow label="X / Long" value={props.valueX} onChange={props.onChangeX} inputId={props.inputIdX} onEnterKey={props.onEnterKey} />
			<CoordinateRow label="Y / Lat" value={props.valueY} onChange={props.onChangeY} inputId={props.inputIdY} onEnterKey={props.onEnterKey} />
			<CoordinateActions onZoomClick={props.onZoomClick} onPanClick={props.onPanClick} onMyMapsClick={() => props.onMyMapsClick(props.valueX, props.valueY)} />
		</div>
	);
};

export const CoordinateActions = (props) => {
	return (
		<div className="sc-coordinates-row sc-float-right">
			[&nbsp;
			<span className="sc-fakeLink" onClick={props.onZoomClick}>
				zoom
			</span>
			&nbsp;] [&nbsp;
			<span className="sc-fakeLink" onClick={props.onPanClick}>
				pan to
			</span>
			&nbsp;] [&nbsp;
			<span className="sc-fakeLink" onClick={props.onMyMapsClick}>
				add to my Maps
			</span>
			&nbsp;]
		</div>
	);
};

export const CoordinateRow = (props) => {
	return (
		<div className="sc-coordinates-row sc-arrow">
			<label>{props.label}:</label>
			<span>
				<input
					id={props.inputId}
					value={props.value === null ? "" : props.value}
					className="sc-coordinates-input sc-editable"
					type="text"
					placeholder={inputMsg}
					onChange={props.onChange}
					onKeyDown={(evt) => {
						if (evt.key === "Enter") props.onEnterKey();
					}}
					onFocus={(evt) => {
						helpers.disableKeyboardEvents(true);
					}}
					onBlur={(evt) => {
						helpers.disableKeyboardEvents(false);
					}}
				/>
			</span>
		</div>
	);
};
