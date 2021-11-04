import React from "react";
import ReactDOM from "react-dom";
import "./MyMapsFooter.css";
import * as helpers from "../../../helpers/helpers";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import Portal from "../../../helpers/Portal.jsx";
import { SubMenu, Item as MenuItem, Divider } from "rc-menu";

const MyMapsFooter = (props) => {
	// USE HOOKS
	//const [activeColor, setActiveColor] = useState("#e809e5");
	//const [activeColor, setActiveColor] = useState(props.activeColor);

	// PARENT CHANGES THE COLOR FROM STORAGE
	//useEffect(() => {});
	function onToolsClick(evt) {
		var evtClone = Object.assign({}, evt);
		const menu = (
			<Portal>
				<FloatingMenu
					autoY={true}
					key={helpers.getUID()}
					buttonEvent={evtClone}
					onMenuItemClick={props.onMenuItemClick}
					classNamesToIgnore={["sc-mymaps-footer-button", "sc-mymaps-footer-buttons-img"]}
				>
					<MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-show-all">
						<FloatingMenuItem imageName={"checkbox_on.png"} label="Show All" />
					</MenuItem>
					<MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-hide-all">
						<FloatingMenuItem imageName={"checkbox_off.png"} label="Hide All" />
					</MenuItem>
					<Divider />
					<MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-delete-selected">
						<FloatingMenuItem imageName={"eraser.png"} label="Delete Selected" />
					</MenuItem>
					<MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-delete-unselected">
						<FloatingMenuItem imageName={"eraser.png"} label="Delete UnSelected" />
					</MenuItem>
					<MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-merge-polygons">
						<FloatingMenuItem imageName={"merge_polygon.png"} label="Merge Polygons" />
					</MenuItem>
					<SubMenu title="Export to ...">
						<MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-export-all-to-kml">
							<FloatingMenuItem label="KML" />
						</MenuItem>
						<MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-export-all-to-esrijson">
							<FloatingMenuItem label="EsriJSON" />
						</MenuItem>
						<MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-export-all-to-geojson">
							<FloatingMenuItem label="GeoJSON" />
						</MenuItem>
					</SubMenu>
				</FloatingMenu>
			</Portal>
		);

		ReactDOM.render(menu, document.getElementById("portal-root"));
	}

	return (
		<div className="sc-mymaps-footer-buttons">
			<button className="sc-button sc-mymaps-footer-button delete" onClick={props.onDeleteAllClick}>
				Delete All
			</button>
			<button className="sc-button sc-mymaps-footer-button tools" onClick={onToolsClick}>
				Additional Tools
			</button>
		</div>
	);
};

export default MyMapsFooter;
