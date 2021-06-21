import React, { Component } from "react";
import "./LoadingScreen.css";
import * as mainConfig from "../config.json";

class LoadingScreen extends Component {
	constructor(props) {
		super(props);
		this.state = {
			isVisible: false,
			containerStyle: {
				background: "rgba(0,0,0,0.35)",
			},
			spinnerStyle: {
				height: "120px",
				width: "120px",
				border: "16px solid #f3f3f3",
				borderTop: "16px solid #3498db",
			},
			messageStyle: {
				fontSize: "26px",
				color: "#3498db",
			},
		};
	}
	componentDidMount() {
		this.setState({ isVisible: this.props.visible }, () => {
			this.getStyles((styles) => {
				this.setState({
					spinnerStyle: styles.spinnerStyle,
					messageStyle: styles.messageStyle,
					containerStyle: styles.containerStyle,
				});
			});
		});
	}
	//CONVERT hex to rgb
	hexToRgba(hex, alpha) {
		const hexRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
		const rgbaString = (r, g, b, a) => `rgba(${r},${g},${b},${a})`;
		var result = hexRegex.exec(hex);
		if (result) {
			const red = parseInt(result[1], 16);
			const green = parseInt(result[2], 16);
			const blue = parseInt(result[3], 16);
			return rgbaString(red, green, blue, alpha);
		} else {
			return "rgba(0,0,0,0.35)";
		}
	}
	getStyles = (callback) => {
		if (this.state === undefined || !this.state.isVisible)
			callback({
				containerStyle: { display: "none" },
				spinnerStyle: { display: "none" },
				messageStyle: { display: "none" },
			});
		let spinnerSize = 120;
		let spinnerBackColor = "#f3f3f3";
		let spinnerForeColor = "#3498db";
		let fontSize = "26px";
		let messageColor = "#3498db";
		let backgroundColor = "#ffffff";
		let backgroundOpacity = 0.35;

		if (this.props.spinnerSize !== undefined)
			spinnerSize = this.props.spinnerSize;
		if (this.props.spinnerBackColor !== undefined)
			spinnerBackColor = this.props.spinnerBackColor;
		if (this.props.spinnerForeColor !== undefined)
			spinnerForeColor = this.props.spinnerForeColor;
		if (this.props.fontSize !== undefined) fontSize = this.props.fontSize;
		if (this.props.messageColor !== undefined)
			messageColor = this.props.messageColor;
		if (this.props.backgroundColor !== undefined)
			backgroundColor = this.props.backgroundColor;
		if (this.props.backgroundOpacity !== undefined)
			backgroundOpacity = this.props.backgroundOpacity;

		let containerBackground = this.hexToRgba(
			backgroundColor,
			backgroundOpacity
		);
		const styles = {
			containerStyle: {
				background: containerBackground,
			},
			spinnerStyle: {
				height: spinnerSize + "px",
				width: spinnerSize + "px",
				marginTop: "-" + spinnerSize / 3 + "px",
				marginRight: "-" + spinnerSize / 2 + "px",
				border: "16px solid",
				borderColor: `${spinnerForeColor} ${spinnerBackColor} ${spinnerBackColor} ${spinnerBackColor}`,
			},
			messageStyle: {
				fontSize: fontSize,
				color: messageColor,
				marginTop: spinnerSize + 26 + "px",
			},
		};

		if (this.state.isVisible) callback(styles);
	};
	render() {
		if (!mainConfig.showLoadingScreens) return <div />;

		return (
			<div
				className={this.props.visible ? "sc-loading-screen" : "sc-hidden"}
				style={this.state.containerStyle}
			>
				<div className="spinner" style={this.state.spinnerStyle} />
				<div className="message" style={this.state.messageStyle}>
					{this.props.message}
				</div>
			</div>
		);
	}
}

export default LoadingScreen;
