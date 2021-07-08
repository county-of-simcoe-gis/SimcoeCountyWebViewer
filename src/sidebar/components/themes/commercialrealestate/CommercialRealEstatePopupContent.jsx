import React from "react";
import * as helpers from "../../../../helpers/helpers";
import "./CommercialRealEstatePopupContent.css";

const CommercialRealEstatePopupContent = (props) => {
	const { feature } = props;
	const entries = Object.entries(feature.getProperties());

	let urlThumb = "";
	entries.forEach((row) => {
		if (row[0] === "_thumburl") urlThumb = row[1];
	});

	let urlField = "";
	entries.forEach((row) => {
		if (row[0] === "URL") urlField = row[1];
	});

	const numberWithCommas = function numberWithCommas(x) {
		if (x === undefined || x === null) return 0;
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};

	// const onListingClick = () => {
	//   window.open(urlField, "_blank");

	//   // REALTOR.CA HAS UNSAFE SCRIPTS ;(
	//   // if (window.outerWidth < 1000) window.open(urlField, "_blank");
	//   // else helpers.showURLWindow(urlField, false);
	//   props.onViewed(feature);
	// };

	return (
		<div>
			<div
				className="sc-theme-commercial-real-estate-popup-image-container"
				style={{ textAlign: "center" }}
			>
				<img
					style={{ width: "130px", maxHeight: "120px" }}
					src={urlThumb === null ? images["noPhoto.png"] : urlThumb}
					alt="logo"
					onError={(e) => {
						e.target.onerror = null;
						e.target.src = images["noPhoto.png"];
					}}
				/>
				<label className="sc-theme-commercial-real-estate-popup-image-label">
					{feature.get("Address") + ", " + feature.get("Municipality")}
				</label>
			</div>
			<div className="sc-theme-commercial-real-estate-popup-details-container">
				<div className="sc-theme-commercial-real-estate-row-container">
					<label className="sc-theme-commercial-real-estate-popup-row-label">
						Price:
					</label>
					<label className="sc-theme-commercial-real-estate-popup-row-value">
						{"$" + numberWithCommas(feature.get("_listprice"))}
					</label>
				</div>
				<div className="sc-theme-commercial-real-estate-row-container">
					<label className="sc-theme-commercial-real-estate-popup-row-label">
						Sale Type:
					</label>
					<label className="sc-theme-commercial-real-estate-popup-row-value">
						{feature.get("_saletype")}
					</label>
				</div>
				<div className="sc-theme-commercial-real-estate-row-container">
					<label className="sc-theme-commercial-real-estate-popup-row-label">
						Size:
					</label>
					<label className="sc-theme-commercial-real-estate-popup-row-value">
						{feature.get("_squarefeet") === 0
							? "Not Available"
							: feature.get("_squarefeet")}
					</label>
				</div>
				<div className="sc-theme-commercial-real-estate-row-container">
					<label className="sc-theme-commercial-real-estate-popup-row-label">
						Brochure:
					</label>
					<label className="sc-theme-commercial-real-estate-popup-row-value">
						<a
							href={feature.get("_brochureurl")}
							target="_blank"
							rel="noopener noreferrer"
						>
							View PDF
						</a>
					</label>
				</div>
			</div>

			<div className="sc-theme-popup-content-button-container">
				<button
					className="sc-button sc-theme-commercial-real-estate-popup-button"
					onClick={() => {
						const mlsNumber = feature.get("MLS Number");
						const url =
							"https://maps.simcoe.ca/EconomicDevelopmentReport/?header=false&MLSNUMBER=" +
							mlsNumber;
						helpers.showURLWindow(url, false, undefined, undefined, false);
					}}
				>
					View Details
				</button>
				<button
					className="sc-button sc-theme-commercial-real-estate-popup-button"
					onClick={() => {
						const url = feature.get("Website");
						if (url === null)
							helpers.showMessage(
								"Listing",
								"Listing website not available",
								"yellow"
							);
						else window.open(url, "_blank");
					}}
				>
					Listing
				</button>
				<button
					className="sc-button sc-theme-commercial-real-estate-popup-button"
					onClick={() => {
						window.popup.hide();
					}}
				>
					Close
				</button>
			</div>
		</div>
	);
};

export default CommercialRealEstatePopupContent;

// IMPORT ALL IMAGES
const images = importAllImages(
	require.context("./images", false, /\.(png|jpe?g|svg|gif)$/)
);
function importAllImages(r) {
	let images = {};
	r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
	return images;
}
