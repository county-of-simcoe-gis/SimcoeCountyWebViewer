"use client";

import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { usePopupStore } from "@/stores/popupStore";
import { showURLWindow, showMessage } from "@/utils/helpersUI";
import { numberWithCommas } from "./creHelpers";
import { getPublicPath } from "@/utils/getPublicPath";

const NO_PHOTO = getPublicPath("/images/commercialrealestate/noPhoto.png");

interface CREPopupContentProps {
  feature: Feature<Geometry>;
}

export default function CREPopupContent({ feature }: CREPopupContentProps) {
  const hide = usePopupStore((s) => s.hide);

  const urlThumb = feature.get("_thumburl") as string | null;
  const address = feature.get("Address") as string;
  const municipality = feature.get("Municipality") as string;
  const listPrice = feature.get("_listprice") as number;
  const saleType = feature.get("_saletype") as string;
  const squareFeet = feature.get("_squarefeet") as number;
  const brochureUrl = feature.get("_brochureurl") as string | null;
  const mlsNumber = feature.get("MLS Number") as string;
  const website = feature.get("Website") as string | null;

  return (
    <div className="flex flex-col gap-2 text-sm min-w-[280px]">
      {/* Thumbnail and address */}
      <div className="flex flex-col items-center gap-1">
        {}
        <img
          className="w-[130px] max-h-[120px] object-cover rounded"
          src={urlThumb ?? NO_PHOTO}
          alt="Property"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = NO_PHOTO;
          }}
        />
        <span className="font-semibold text-center">
          {address}, {municipality}
        </span>
      </div>

      {/* Detail rows */}
      <div className="flex flex-col gap-1 border-t border-base-300 pt-2">
        <div className="flex justify-between">
          <span className="font-medium text-base-content/70">Price:</span>
          <span>{listPrice <= 1 ? "Price Not Defined" : `$${numberWithCommas(listPrice)}`}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-base-content/70">Sale Type:</span>
          <span>{saleType}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-base-content/70">Size:</span>
          <span>{squareFeet == 0 ? "Not Available" : `${numberWithCommas(squareFeet)} sq ft`}</span>
        </div>
        {brochureUrl && (
          <div className="flex justify-between">
            <span className="font-medium text-base-content/70">Brochure:</span>
            <a href={brochureUrl} target="_blank" rel="noopener noreferrer" className="link link-primary">
              View PDF
            </a>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 border-t border-base-300 pt-2">
        <button
          className="btn btn-sm btn-primary flex-1"
          onClick={() => {
            const url = `https://opengis.simcoe.ca/EconomicDevelopmentReport/${mlsNumber}/?header=false`;
            showURLWindow(url);
          }}
        >
          View Details
        </button>
        <button
          className="btn btn-sm btn-outline flex-1"
          onClick={() => {
            if (!website) {
              showMessage("Listing", "Listing website not available", "warning");
            } else {
              window.open(website, "_blank");
            }
          }}
        >
          Listing
        </button>
        <button className="btn btn-sm btn-ghost flex-1" onClick={() => hide()}>
          Close
        </button>
      </div>
    </div>
  );
}
