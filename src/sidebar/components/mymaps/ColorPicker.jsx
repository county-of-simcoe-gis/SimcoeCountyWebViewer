import React from "react";
import ReactDOM from "react-dom";
import Portal from "../../../helpers/Portal.jsx";

export default class ColorPicker {
	constructor(evt, elements, callerId) {
		this.evt = evt;
		this.elements = elements;
		this.callerId = callerId;

		this.documentClick = (evt) => {
			const e = document.elementFromPoint(evt.pageX, evt.pageY);
			if (
				evt.target.id !== this.callerId &&
				e.getAttribute("spellcheck") === null
			) {
				this.hide();
			}
		};

		this.clickHandler = this.documentClick.bind(this);

		// CLICK ANYWHERE ELSE WILL CLOSE MENU
		document.body.addEventListener("click", this.clickHandler);
	}

	show() {
		if (document.getElementById("sc-color-picker-container") !== null)
			document
				.getElementById("sc-color-picker-container")
				.classList.remove("sc-hidden");

		const portalStyle = {
			position: "absolute",
			zIndex: 10000,
			top: this.evt.pageY,
			left: this.evt.pageX,
		};

		const menu = (
			<Portal>
				<div id="sc-color-picker-container" style={portalStyle}>
					{this.elements}
				</div>
			</Portal>
		);

		ReactDOM.render(menu, document.getElementById("portal-root"));
	}

	hide() {
		if (document.getElementById("sc-color-picker-container") !== null)
			document
				.getElementById("sc-color-picker-container")
				.classList.add("sc-hidden");

		document.body.removeEventListener("click", this.clickHandler);
	}
}
