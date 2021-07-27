import React, { Component } from "react";
import * as helpers from "../helpers/helpers";
import "./SidebarItemList.css";
class SidebarItemList extends Component {
	constructor(props) {
		super(props);

		// BIND THIS TO THE CLICK FUNCTION
		this.buttonClick = this.buttonClick.bind(this);

		this.state = {
			components: [],
		};
	}

	buttonClick(name) {
		//PARENT HANDLES THE REST
		this.props.onTabClick(name);
	}
	componentDidMount() {
		helpers.waitForLoad("settings", Date.now(), 30, () => {
			let listItems = null;
			if (this.props.listtype === "tools") {
				let tools = window.config.sidebarToolComponents;
				listItems = tools.filter((item) => item.enabled === undefined || item.enabled);
			} else {
				// IMPORT THEMES FROM CONFIG
				let themes = window.config.sidebarThemeComponents;
				listItems = themes.filter((item) => item.enabled === undefined || item.enabled);
			}
			this.setState({ components: listItems });
		});
	}

	render() {
		// GET LIST OF COMPONENTS FROM CONFIG

		if (this.state.components.length === 0) return <div />;

		return (
			<div className="simcoe-sidebarlist-container">
				{
					// CREATE ITEMS FROM CONFIG
					this.state.components.map((listItem) => {
						// SKIP IF ITS DISABLED
						if (listItem.disable !== undefined && listItem.disable) return null;
						return (
							<ToolItem
								componentname={listItem.componentName}
								onClick={() => this.props.onClick(listItem.name, this.props.listtype)}
								key={helpers.getUID()}
								id={listItem.id}
								name={listItem.name}
								imageName={listItem.imageName}
								description={listItem.description}
							/>
						);
					})
				}
			</div>
		);
	}
}

export default SidebarItemList;

// ITEM
class ToolItem extends Component {
	state = {};

	render() {
		return (
			<div className="simcoe-sidebarlist-item" onClick={this.props.onClick}>
				<div className="simcoe-sidebarlist-item-iconbackground">
					<div className="simcoe-sidebarlist-item-icon" />
					<img src={images[this.props.imageName]} alt="Tool Item" />

					{/* THIS WORKS IN DEV BUT PRODUCTION (NPM RUN BUILD) WEBPACK DOES NOT LIKE IT!!!!  
                //IMAGE ICONS FOR THE TOOLS LIST ARE NOW STORED IN SIDEBAR IMAGES FOLDER */}
					{/* <img src={require(`${this.props.imageURL}`)} ></img> */}
				</div>
				<div className="simcoe-sidebarlist-item-text-container">
					<div className="simcoe-sidebarlist-item-text-title">{this.props.name}</div>
					<div className="simcoe-sidebarlist-item-text-description">{this.props.description}</div>
				</div>
			</div>
		);
	}
}

//IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
	let images = {};
	r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
	return images;
}
