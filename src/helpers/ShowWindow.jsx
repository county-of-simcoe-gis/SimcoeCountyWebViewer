import React, { Component } from "react";
import "./ShowWindow.css";

class ShowWindow extends Component {
	constructor(props) {
		super(props);

		this.state = {
			hide: false,
			fullScreen: false,
		};
	}

	onCloseClick = (value) => {
		this.setState({ hide: true });
	};

	onPopoutClick = () => {
		this.setState({ fullScreen: !this.state.fullScreen });
	};

	componentWillUnmount() {
		this.sidebarEmitter.remove();
		document.removeEventListener("keydown", this.escFunction, false);
	}

	componentDidMount() {
		document.addEventListener("keydown", this.escFunction, false);

		// LISTEN FOR SIDEPANEL CHANGES
		this.sidebarEmitter = window.emitter.addListener(
			"sidebarChanged",
			(isSidebarOpen) => this.sidebarChanged(isSidebarOpen)
		);
	}

	sidebarChanged = (isSidebarOpen) => {
		this.forceUpdate();
	};

	escFunction = (event) => {
		if (event.keyCode === 27) {
			this.setState({ hide: true });
		}
	};

	// GET STORAGE
	getStorage() {
		const storage = localStorage.getItem(this.storageKey);
		if (storage === null) return [];

		const data = JSON.parse(storage);
		return data;
	}

	render() {
		let className = "";
		if (this.state.hide) className = "sc-hidden";
		else if (this.state.fullScreen) className = "overlay";
		else if (this.props.mode === "full") className = "full";
		else if (!window.sidebarOpen) className = "full";

		let hideScrollClassName = "";
		if (this.props.hideScroll && !this.state.fullScreen)
			hideScrollClassName = "sc-show-window-content-no-scroll";

		return (
			<div id="sc-show-window-container" className={className}>
				<div className="sc-show-window-header no-print">
					<div className="sc-show-window-header-title">Information</div>
					<div
						className="sc-show-window-header-popout-button"
						title={this.state.fullScreen ? "Restore Down" : "Full Screen"}
					>
						<button
							className="sc-button sc-button-blue sc-show-window-header-button"
							onClick={this.onPopoutClick}
						>
							<img src={images["new-window.png"]} alt="new window" />
						</button>
					</div>
					<div
						className="sc-show-window-header-close-button"
						title="Close Window"
					>
						<button
							style={{ fontWeight: "bolder" }}
							className="sc-button sc-button-blue sc-show-window-header-button"
							onClick={this.onCloseClick}
						>
							X
						</button>
					</div>
				</div>
				<div
					id="sc-show-window-content"
					className={
						this.props.showFooter
							? "sc-show-window-content with-footer " + hideScrollClassName
							: "sc-show-window-content " + hideScrollClassName
					}
				>
					{this.props.contents}
				</div>
				<div
					className={
						this.props.showFooter ? "sc-show-window-footer" : "sc-hidden"
					}
				>
					<button className="sc-button" onClick={this.onCloseClick}>
						Close Window
					</button>
				</div>
			</div>
		);
	}
}

export default ShowWindow;

// IMPORT ALL IMAGES
const images = importAllImages(
	require.context("./images", false, /\.(png|jpe?g|svg|gif)$/)
);
function importAllImages(r) {
	let images = {};
	r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
	return images;
}
