import React, { Component } from "react";
import Menu from "rc-menu";
import "rc-menu/assets/index.css";
import "./FloatingMenu.css";
import * as helpers from "./helpers";

// PROPER USE OF THIS COMPONENT IS TO USE A PORTAL.  HAVE A LOOK AT MyMapsItem FOR AN EXAMPLE.
class FloatingMenu extends Component {
	constructor(props) {
		super(props);
		this.state = {
			isVisible: true,
			//styleMode: this.props.styleMode === undefined ? "right" : this.props.styleMode,
			style: {
				position: "absolute",
				zIndex: 10000,
				top: this.props.buttonEvent.pageY,
				left: this.props.buttonEvent.pageX,
				backgroundColor: "white",
				width: "180px",
			},
		};
	}

	componentDidMount() {
		helpers.waitForLoad("settings", Date.now(), 30, () => {
			this.getStyle((style) => {
				this.setState({ style: style });
			});

			// CLICK ANYWHERE ELSE WILL CLOSE MENU
			this.clickEvent = document.body.addEventListener(
				"click",
				(evt) => {
					if (typeof evt.target.className === "string") {
						// IGNORE CLASSNAMES
						let found = false;
						if (this.props.classNamesToIgnore !== undefined) {
							evt.target.className.split(" ").forEach((className) => {
								if (this.props.classNamesToIgnore.includes(className)) {
									found = true;
									return;
								}
							});
						}

						if (
							evt.target.className.indexOf("rc-menu") > -1 ||
							evt.target.className.indexOf("sc-floating-menu-") > -1 ||
							found
						)
							return;
					}

					if (this.container !== null && !this.container.contains(evt.target)) {
						this.setState({ isVisible: false });
					}
				},
				true
			);
		});
	}

	isElementInViewport(el) {
		var rect = el.getBoundingClientRect();
		return (
			rect.top >= 0 &&
			rect.left >= 0 &&
			rect.bottom <=
				(window.innerHeight ||
					document.documentElement.clientHeight) /*or $(window).height() */ &&
			rect.right <=
				(window.innerWidth ||
					document.documentElement.clientWidth) /*or $(window).width() */
		);
	}

	getStyle = (callback) => {
		if (this.state === undefined || !this.state.isVisible)
			callback({ display: "none" });

		let yOffset = 0;
		let xOffset = 0;
		let style = null;
		window.requestAnimationFrame(() => {
			if (this.props.autoY) {
				if (this.container !== undefined && this.container !== null) {
					const isInViewport = this.isElementInViewport(this.container);
					if (!isInViewport) {
						yOffset = this.container.offsetHeight;
					}
				}
			}

			if (this.props.styleMode === "right") {
				xOffset = this.props.buttonEvent.pageX;
			} else if (this.props.styleMode === "left") {
				xOffset = this.props.buttonEvent.pageX - 180;
			} else if (this.props.autoX) {
				if (this.props.buttonEvent.pageX < 180) {
					xOffset = this.props.buttonEvent.pageX;
				} else {
					xOffset = this.props.buttonEvent.pageX - 180;
				}
			} else {
				xOffset = this.props.buttonEvent.pageX;
			}

			if (this.props.yOffset !== undefined) yOffset = this.props.yOffset;
			if (this.props.xOffset !== undefined) xOffset = this.props.xOffset;
			let width = this.props.width !== undefined ? this.props.width : "180px";
			style = {
				position: "absolute",
				zIndex: 1000,
				top: this.props.buttonEvent.pageY - yOffset,
				//left: this.state.styleMode === "right" ? this.props.buttonEvent.pageX : this.props.buttonEvent.pageX - 180,
				left: xOffset,
				backgroundColor: "white",
				width: width,
			};

			if (this.state.isVisible) callback(style);
		});
	};

	handleSelect = () => {
		this.setState({ isVisible: false });
	};

	handleClick = (info) => {
		this.props.onMenuItemClick(info.key);
		this.setState({ isVisible: false });
	};

	render() {
		if (!this.state.isVisible) {
			return null;
		}

		return (
			<div
				className="sc-floating-menu-toolbox-menu-container"
				style={this.state.style}
				ref={(container) => (this.container = container)}
			>
				<div
					className={
						window.config.showFloatingMenuHeader
							? "sc-floating-menu-toolbox-menu-header"
							: "sc-hidden"
					}
					title={this.props.title}
				>
					<div className="title">{this.props.title}</div>
					<div className="close" onClick={this.handleSelect} alt="Close Menu">
						&nbsp;
					</div>
				</div>
				<Menu
					onSelect={this.handleSelect}
					defaultActiveFirst
					onClick={this.handleClick}
					onTitleClick={this.editMove}
					className="sc-floating-menu-toolbox-menu"
				>
					{this.props.children}
				</Menu>
			</div>
		);
	}
}

export default FloatingMenu;

// IMPORT ALL IMAGES
const images = importAllImages(
	require.context("./images", false, /\.(png|jpe?g|svg)$/)
);
function importAllImages(r) {
	let images = {};
	r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
	return images;
}

export function FloatingMenuItem(props) {
	return (
		<div className="sc-floating-menu-toolbox-menu-icon-label-container">
			<img
				className="sc-floating-menu-toolbox-menu-icon"
				src={images[props.imageName]}
				alt={props.imageName}
			/>
			<label className="sc-floating-menu-toolbox-menu-label">
				{props.label}
			</label>
		</div>
	);
}
