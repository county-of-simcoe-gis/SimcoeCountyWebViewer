"use client";

import { useCREStore } from "./stores/creStore";
import { useMapStore } from "@/stores/mapStore";
import { showURLWindow } from "@/utils/helpersUI";
import { numberWithCommas } from "./creHelpers";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { FaArrowLeft, FaStar } from "react-icons/fa";
import { getPublicPath } from "@/utils/getPublicPath";

const NO_PHOTO = getPublicPath("/images/commercialrealestate/noPhoto.png");

export default function CREResults() {
  const allResults = useCREStore((s) => s.allResults);
  const setActiveTab = useCREStore((s) => s.setActiveTab);
  const isLoading = useCREStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-1">
      {/* Back link */}
      <div className="flex items-center gap-1 py-1">
        <FaArrowLeft className="w-3 h-3 text-primary" />
        <button className="link link-primary text-xs" onClick={() => setActiveTab(0)}>
          Back to Search
        </button>
      </div>

      {/* Results list */}
      <div className="flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {allResults.length === 0 ? (
          <div className="text-xs text-base-content/60 text-center py-4">No results found. Try adjusting your search filters.</div>
        ) : (
          allResults.map((feature, idx) => <CREResultItem key={`cre-result-${idx}`} feature={feature} />)
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-base-content/60 border-t border-base-300 pt-2 mt-1">
        {"Didn't find what you're looking for? Contact our "}
        <a href="https://edo.simcoe.ca/contact" target="_blank" rel="noopener noreferrer" className="link link-primary">
          economic development department
        </a>
        {" for a custom search."}
      </div>
    </div>
  );
}

function CREResultItem({ feature }: { feature: Feature<Geometry> }) {
  const map = useMapStore((s) => s.map);

  const imageUrl = feature.get("_imageurl") as string | null;
  const listPrice = feature.get("_listprice") as number;
  const address = feature.get("Address") as string;
  const propertyType = feature.get("Property Type") as string;
  const squareFeet = feature.get("_squarefeet") as number;
  const mlsNumber = feature.get("MLS Number") as string;
  const isIncentive = feature.get("Incentive") === "Yes";

  const handleZoom = () => {
    if (!map) return;
    const geometry = feature.getGeometry();
    if (geometry) {
      map.getView().fit(geometry.getExtent(), {
        duration: 500,
        maxZoom: 18,
        padding: [50, 50, 50, 50],
      });
    }
  };

  const handleViewDetails = () => {
    const url = `https://opengis.simcoe.ca/EconomicDevelopmentReport/${mlsNumber}/?header=false`;
    showURLWindow(url);
  };

  return (
    <div className="flex gap-2 p-2 border border-base-300 rounded-lg relative hover:bg-base-200 transition-colors">
      {isIncentive && <FaStar className="absolute top-1 right-1 w-4 h-4 text-warning" title="Incentive Property" />}

      {/* Thumbnail + price */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        {}
        <img
          className="w-[80px] h-[60px] object-cover rounded"
          src={imageUrl ?? NO_PHOTO}
          alt={address}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = NO_PHOTO;
          }}
        />
        <span className="text-[10px] font-semibold">{listPrice <= 1 ? "Price N/A" : `$${numberWithCommas(listPrice)}`}</span>
      </div>

      {/* Details */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div className="flex flex-col gap-0.5">
          <InfoRow label="Address" value={address} />
          <InfoRow label="Property Type" value={propertyType} />
          <InfoRow label="Square Feet" value={squareFeet === 0 ? "Unknown" : String(squareFeet)} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          <button className="link link-primary text-[11px]" onClick={handleViewDetails}>
            View Details
          </button>
          <button className="link link-primary text-[11px]" onClick={handleZoom}>
            Zoom
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-[11px] leading-tight">
      <span className="font-medium text-base-content/70 flex-shrink-0">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
