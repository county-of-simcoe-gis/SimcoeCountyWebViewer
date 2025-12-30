import React from "react";
import "./MyMapsSymbolizer.css";

export const PointType = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-style-label" : "sc-hidden"}>Style:</label>
			<select className={props.visible ? "sc-mymaps-style-dropdown" : "sc-hidden"} name="pointSymbols" value={props.selectedPointStyleDropDown} onChange={props.onPointStyleDropDown}>
				<option value="circle">Circle</option>
				<option value="cross">Cross</option>
				<option value="square">Square</option>
				<option value="triangle">Triangle</option>
				<option value="star">Star</option>
				<option value="x">X</option>
			</select>
		</React.Fragment>
	);
};

export const PolygonType = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-style-label" : "sc-hidden"}>Style:</label>
			<select className={props.visible ? "sc-mymaps-style-dropdown" : "sc-hidden"} name="polygonSymbols" value={props.selectedPolygonStyleDropDown} onChange={props.onPolygonStyleDropDown}>
				<option value="none">None</option>
				<option value="solid">Solid</option>
				<option value="horizontal">Horizontal</option>
				<option value="vertical">Vertical</option>
				<option value="cross">Cross</option>
			</select>
		</React.Fragment>
	);
};

export const StyleSize = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-sub-label" : "sc-hidden"}>Size:</label>
			<div className={props.visible ? "sc-mymaps-symbolizer-slider size" : "sc-hidden"}>
				<input type="range" style={{ width: "169px" }} min={props.sliderRadiusMin} max={props.sliderRadiusMax} value={props.radius} step="1" onChange={props.onRadiusSliderChange} />
			</div>
		</React.Fragment>
	);
};

export const FillColor = (props) => {
	return (
		<React.Fragment>
			<label className={!props.visible ? "sc-hidden" : props.isPolygon ? "sc-mymaps-style-label" : "sc-mymaps-sub-label"}>Color:</label>
			<div className={props.visible ? "sc-mymaps-fill-color-button" : "sc-hidden"}>
				<button
					id={props.colorPickerButtonId}
					style={{
						backgroundColor: props.rgbFill,
						width: "30px",
						height: "15px",
						cursor: "pointer",
					}}
					onMouseUp={props.onFillColorPickerButton}
				/>
				<div className="sc-mymaps-symbolizer-slider opacity">
					<input
						key={"sc-mymaps-symbolizer-fill-opacity"}
						type="range"
						style={{ width: "138px" }}
						min={props.sliderFillOpacityMin}
						max={props.sliderFillOpacityMax}
						value={props.fillAlpha}
						step="0.05"
						onChange={props.onFillOpacitySliderChange}
					/>
				</div>
			</div>
		</React.Fragment>
	);
};

export const StrokeType = (props) => {
	return (
		<React.Fragment>
			<label className="sc-mymaps-style-label">Outline:</label>
			<select className="sc-mymaps-style-dropdown" name="pointOutline" value={props.selectedStrokeTypeDropDown} onChange={props.onStrokeTypeDropDown}>
				<option value="normal">Normal</option>
				<option value="dash">Dash</option>
				<option value="dot">Dot</option>
			</select>
		</React.Fragment>
	);
};

export const StrokeColor = (props) => {
	return (
		<React.Fragment>
			<label className="sc-mymaps-sub-label">Color:</label>
			<div className="sc-mymaps-fill-color-button">
				<button
					id={props.colorPickerButtonId}
					style={{
						backgroundColor: props.rgbStroke,
						width: "30px",
						height: "15px",
						cursor: "pointer",
					}}
					onMouseUp={props.onStrokeColorPickerButton}
				/>
				<div className="sc-mymaps-symbolizer-slider opacity">
					<input
						key={"sc-mymaps-symbolizer-stroke-opacity"}
						type="range"
						style={{ width: "138px" }}
						min={props.sliderStrokeOpacityMin}
						max={props.sliderStrokeOpacityMax}
						value={props.strokeAlpha}
						step="0.05"
						onChange={props.onStrokeOpacitySliderChange}
					/>
				</div>
			</div>
		</React.Fragment>
	);
};

export const StrokeWidth = (props) => {
	return (
		<React.Fragment>
			<label className="sc-mymaps-sub-label">Width:</label>
			<div className="sc-mymaps-symbolizer-slider size">
				<input
					type="range"
					style={{ width: "169px" }}
					min={props.sliderStrokeWidthMin}
					max={props.sliderStrokeWidthMax}
					value={props.strokeWidth}
					step="0.5"
					onChange={props.onStrokeWidthSliderChange}
				/>
			</div>
		</React.Fragment>
	);
};

export const Rotation = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-style-label" : "sc-hidden"}>Angle:</label>
			<div className={props.visible ? "sc-mymaps-angle-slider" : "sc-hidden"}>
				<div className="sc-mymaps-symbolizer-slider angle">
					<input type="range" min={props.sliderRotationMin} max={props.sliderRotationMax} value={props.rotation} step="0.1" onChange={props.onRotationSliderChange} />
				</div>
			</div>
		</React.Fragment>
	);
};

// LABEL STYLE COMPONENTS

export const LabelTextColor = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-sub-label" : "sc-hidden"}>Text Color:</label>
			<div className={props.visible ? "sc-mymaps-fill-color-button" : "sc-hidden"}>
				<button
					id={props.colorPickerButtonId}
					style={{
						backgroundColor: props.textColor,
						width: "30px",
						height: "15px",
						cursor: "pointer",
					}}
					onMouseUp={props.onTextColorPickerButton}
				/>
			</div>
		</React.Fragment>
	);
};

export const LabelFontSize = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-sub-label" : "sc-hidden"}>Font Size:</label>
			<select 
				className={props.visible ? "sc-mymaps-style-dropdown" : "sc-hidden"} 
				value={props.fontSize} 
				onChange={props.onFontSizeChange}
			>
				<option value="10px">10px</option>
				<option value="12px">12px</option>
				<option value="14px">14px</option>
				<option value="16px">16px</option>
				<option value="18px">18px</option>
				<option value="20px">20px</option>
				<option value="24px">24px</option>
			</select>
		</React.Fragment>
	);
};

export const LabelOutlineColor = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-sub-label" : "sc-hidden"}>Outline Color:</label>
			<div className={props.visible ? "sc-mymaps-fill-color-button" : "sc-hidden"}>
				<button
					id={props.colorPickerButtonId}
					style={{
						backgroundColor: props.outlineColor,
						width: "30px",
						height: "15px",
						cursor: "pointer",
					}}
					onMouseUp={props.onOutlineColorPickerButton}
				/>
			</div>
		</React.Fragment>
	);
};

export const LabelOutlineWidth = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-sub-label" : "sc-hidden"}>Outline Width:</label>
			<div className={props.visible ? "sc-mymaps-symbolizer-slider size" : "sc-hidden"}>
				<input
					type="range"
					style={{ width: "169px" }}
					min={0}
					max={4}
					value={props.outlineWidth}
					step="0.5"
					onChange={props.onOutlineWidthChange}
				/>
			</div>
		</React.Fragment>
	);
};

// CALLOUT-SPECIFIC COMPONENTS

export const CalloutBackgroundColor = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-sub-label" : "sc-hidden"}>Background:</label>
			<div className={props.visible ? "sc-mymaps-fill-color-button" : "sc-hidden"}>
				<button
					id={props.colorPickerButtonId}
					style={{
						backgroundColor: props.backgroundColor,
						width: "30px",
						height: "15px",
						cursor: "pointer",
					}}
					onMouseUp={props.onBackgroundColorPickerButton}
				/>
			</div>
		</React.Fragment>
	);
};

export const CalloutBorderColor = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-sub-label" : "sc-hidden"}>Border:</label>
			<div className={props.visible ? "sc-mymaps-fill-color-button" : "sc-hidden"}>
				<button
					id={props.colorPickerButtonId}
					style={{
						backgroundColor: props.borderColor,
						width: "30px",
						height: "15px",
						cursor: "pointer",
					}}
					onMouseUp={props.onBorderColorPickerButton}
				/>
			</div>
		</React.Fragment>
	);
};

export const CalloutLineColor = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-sub-label" : "sc-hidden"}>Line:</label>
			<div className={props.visible ? "sc-mymaps-fill-color-button" : "sc-hidden"}>
				<button
					id={props.colorPickerButtonId}
					style={{
						backgroundColor: props.lineColor,
						width: "30px",
						height: "15px",
						cursor: "pointer",
					}}
					onMouseUp={props.onLineColorPickerButton}
				/>
			</div>
		</React.Fragment>
	);
};

export const CalloutAnchorColor = (props) => {
	return (
		<React.Fragment>
			<label className={props.visible ? "sc-mymaps-sub-label" : "sc-hidden"}>Anchor:</label>
			<div className={props.visible ? "sc-mymaps-fill-color-button" : "sc-hidden"}>
				<button
					id={props.colorPickerButtonId}
					style={{
						backgroundColor: props.anchorColor,
						width: "30px",
						height: "15px",
						cursor: "pointer",
					}}
					onMouseUp={props.onAnchorColorPickerButton}
				/>
			</div>
		</React.Fragment>
	);
};