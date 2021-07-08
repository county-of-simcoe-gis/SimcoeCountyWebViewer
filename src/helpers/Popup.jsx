// THIS CODE WAS PULLED FROM https://github.com/walkermatt/ol-popup
import React from "react";
import ReactDOM from "react-dom";
import Overlay from "ol/Overlay";
import "./Popup.css";
import { getWidth } from "ol/extent.js";
import * as helpers from "../helpers/helpers";

/**
 * OpenLayers Popup Overlay.
 * See [the examples](./examples) for usage. Styling can be done via CSS.
 * @constructor
 * @extends {ol.Overlay}
 * @param {olx.OverlayOptions} opt_options options as defined by ol.Overlay. Defaults to
 * `{autoPan: true, autoPanAnimation: {duration: 250}}`
 */

var closeCallback = null;
var isMoving = false;
var isClosing = false;
window.popupActive = false;

export default class Popup extends Overlay {
	constructor(opt_options) {
		var options = opt_options || {};
		if (options.title === undefined) {
			options.title = "Info";
		}

		if (options.autoPan === undefined) {
			options.autoPan = true;
		}

		if (options.autoPanAnimation === undefined) {
			options.autoPanAnimation = {
				duration: 250,
			};
		}

		//options.stopEvent = false;

		var element = document.createElement("div");
		options.element = element;
		super(options);
		this.container = element;
		this.container.className = "ol-popup";
		this.container.id = "sc-window-popup";
		this.headerContainer = document.createElement("div");
		this.headerContainer.id = "sc-popup-header";
		this.headerContainer.className = "sc-popup-header sc-no-select";

		this.headerCloseContainer = document.createElement("div");
		this.headerCloseContainer.className = "sc-popup-header-close-button";

		this.headerTitle = document.createElement("div");
		this.headerTitle.innerHTML = options.title;
		this.headerContainer.appendChild(this.headerTitle);
		//this.headerTitle.className = 'sc-popup-header';

		// SET TITLE
		//this.headerContainer.innerHTML = options.title;

		this.closer = document.createElement("a");
		this.closer.className = "ol-popup-closer";
		this.closer.href = "#";

		this.headerCloseContainer.appendChild(this.closer);

		this.headerContainer.appendChild(this.headerCloseContainer);
		this.container.appendChild(this.headerContainer);

		this.closer.addEventListener(
			"click",
			(evt) => {
				this.hide();
				isClosing = true;
				if (closeCallback !== null) {
					closeCallback();
				}

				// that.container.style.display = 'none';
				// that.closer.blur();
				evt.preventDefault();
			},
			false
		);

		this.content = document.createElement("div");
		this.content.className = "ol-popup-content";
		this.container.appendChild(this.content);

		// Apply workaround to enable scrolling of content div on touch devices
		Popup.enableTouchScroll_(this.content);

		this.activeIds = [];
		this.container.onmouseover = () => {
			window.map.getInteractions().forEach((interaction) => {
				if (interaction.getActive()) this.activeIds.push(interaction.ol_uid);

				interaction.setActive(false);
			});
			window.popupActive = true;
		};
		this.container.onmouseout = () => {
			window.map.getInteractions().forEach((interaction) => {
				if (this.activeIds.includes(interaction.ol_uid))
					interaction.setActive(true);
			});
			window.popupActive = false;
		};
	}

	/**
	 * Show the popup.
	 * @param {ol.Coordinate} coord Where to anchor the popup.
	 * @param {String|HTMLElement} html String or element of HTML to display within the popup.
	 * @returns {Popup} The Popup instance
	 */
	show(coord, html, title = "Info", callback = null) {
		// WEIRD MOBILE STUFF PATCH WHERE CONTAINER STAYS OVER MAP
		// var x = document.getElementsByClassName("ol-selectable")[0];
		// x.classList.remove("sc-hidden");
		const containers = document.getElementsByClassName(
			"ol-overlay-container ol-selectable"
		);
		Array.prototype.forEach.call(containers, (el) => {
			if (el.childNodes[0].id === "sc-window-popup")
				el.classList.remove("sc-hidden");
		});

		// SET TITLE
		this.headerTitle.innerHTML = title;
		//ReactDOM.render(html, this.content);
		if (isDOMTypeElement(html)) {
			// REGULAR HTML
			this.content.innerHTML = "";
			this.content.appendChild(html);
		} else {
			// REACT COMPONENT
			ReactDOM.render(html, this.content);
		}

		this.container.style.display = "block";
		this.content.scrollTop = 0;
		this.setPosition(coord);

		var header = document.getElementById("sc-popup-header");
		// header.addEventListener('mousedown', function(evt) {
		//   dragPan.setActive(false);
		//   marker.set('dragging', true);
		//   console.info('start dragging');
		// });

		header.addEventListener("mousedown", (evt) => {
			// IGNORE CLOSE BUTTON OR MOBILE
			var isCloser = evt.target.classList.contains("ol-popup-closer");
			if (isClosing || isCloser || helpers.isMobile()) {
				isMoving = false;
				isClosing = false;
				return;
			}

			// THIS FOLLOWING IS TO SUPPORT MAKE POPUP MOVABLE.  NOT PERFECT YET.
			var that = this;
			function move(evt) {
				var coord = window.map.getEventCoordinate(evt);
				var pixel = window.map.getPixelFromCoordinate(coord);
				var width =
					getWidth(window.map.getView().getProjection().getExtent()) /
					window.map.getView().getResolution();
				var pixelX = ((pixel[0] % width) + width) % width;
				var pixelY = pixel[1];
				var popupElem = document.getElementsByClassName("ol-popup")[0];
				var popupHeight = popupElem.offsetHeight;
				var popupWidth = popupElem.offsetWidth;

				// THIS SNAPS TO CENTER OF POPUP X
				var calc = pixelX - popupWidth / 4;
				var pixel2 = [calc, pixelY + popupHeight];
				var point = window.map.getCoordinateFromPixel(pixel2);

				if (isMoving) {
					that.setPosition(point);
				} else {
					isMoving = true;
				}
			}
			function end(evt) {
				window.removeEventListener("mousemove", move);
				window.removeEventListener("mouseup", end);
				isMoving = false;
			}
			window.addEventListener("mousemove", move);
			window.addEventListener("mouseup", end);
		});

		if (callback !== undefined) {
			closeCallback = callback;
		}
		return this;
	}

	/**
	 * @private
	 * @desc Determine if the current browser supports touch events. Adapted from
	 * https://gist.github.com/chrismbarr/4107472
	 */
	static isTouchDevice_() {
		try {
			document.createEvent("TouchEvent");
			return true;
		} catch (e) {
			return false;
		}
	}

	/**
	 * @private
	 * @desc Apply workaround to enable scrolling of overflowing content within an
	 * element. Adapted from https://gist.github.com/chrismbarr/4107472
	 */
	static enableTouchScroll_(elm) {
		if (Popup.isTouchDevice_()) {
			var scrollStartPos = 0;
			elm.addEventListener(
				"touchstart",
				function (event) {
					scrollStartPos = this.scrollTop + event.touches[0].pageY;
				},
				false
			);
			elm.addEventListener(
				"touchmove",
				function (event) {
					this.scrollTop = scrollStartPos - event.touches[0].pageY;
				},
				false
			);
		}
	}

	/**
	 * Hide the popup.
	 * @returns {Popup} The Popup instance
	 */
	hide() {
		const containers = document.getElementsByClassName(
			"ol-overlay-container ol-selectable"
		);
		Array.prototype.forEach.call(containers, (el) => {
			if (el.childNodes[0].id === "sc-window-popup")
				el.classList.add("sc-hidden");
		});

		isMoving = false;

		window.emitter.emit("popupClosing", null);

		if (closeCallback !== null) {
			closeCallback();
		}

		// PATCH FOR MOBILE TO RE-ENABLE MAP INTERACTIONS
		if (helpers.isMobile()) {
			window.map.getInteractions().forEach((interaction) => {
				if (this.activeIds.includes(interaction.ol_uid))
					interaction.setActive(true);
			});
		}

		return this;
	}

	/**
	 * Indicates if the popup is in open state
	 * @returns {Boolean} Whether the popup instance is open
	 */
	isOpened() {
		return this.container.style.display === "block";
	}
}

// Expose Popup as ol.Overlay.Popup if using a full build of
// OpenLayers
if (window.ol && window.ol.Overlay) {
	window.ol.Overlay.Popup = Popup;
}

function isElement(element) {
	return React.isValidElement(element);
}

function isDOMTypeElement(element) {
	return isElement(element) && typeof element.type === "string";
}
