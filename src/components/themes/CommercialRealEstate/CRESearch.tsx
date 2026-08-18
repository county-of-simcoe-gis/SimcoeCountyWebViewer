"use client";

import { useCREStore } from "./stores/creStore";
import { useMapStore } from "@/stores/mapStore";
import { updateAllLayerFilters, fetchAllResults } from "./creHelpers";
import CRESearchPropTypes from "./CRESearchPropTypes";
import CRESearchType from "./CRESearchType";
import CRESearchBuildingSpace from "./CRESearchBuildingSpace";
import CRESearchLandSize from "./CRESearchLandSize";
import CRESearchPrice from "./CRESearchPrice";
import CREResults from "./CREResults";
import { useEffect, useRef } from "react";
import { FaSearch, FaListUl } from "react-icons/fa";

export default function CRESearch() {
  const activeTab = useCREStore((s) => s.activeTab);
  const setActiveTab = useCREStore((s) => s.setActiveTab);
  const numRecords = useCREStore((s) => s.numRecords);
  const isLoading = useCREStore((s) => s.isLoading);
  const incentiveChecked = useCREStore((s) => s.incentiveChecked);
  const setIncentiveChecked = useCREStore((s) => s.setIncentiveChecked);
  const onlyInMapChecked = useCREStore((s) => s.onlyInMapChecked);
  const setOnlyInMapChecked = useCREStore((s) => s.setOnlyInMapChecked);

  // Track filter changes to update layer sources
  const selectedType = useCREStore((s) => s.selectedType);
  const searchMode = useCREStore((s) => s.searchMode);
  const buildingFrom = useCREStore((s) => s.selectedBuildingSpaceFrom);
  const buildingTo = useCREStore((s) => s.selectedBuildingSpaceTo);
  const landFrom = useCREStore((s) => s.selectedLandSizeFrom);
  const landTo = useCREStore((s) => s.selectedLandSizeTo);
  const priceFrom = useCREStore((s) => s.selectedPriceFrom);
  const priceTo = useCREStore((s) => s.selectedPriceTo);

  const isInitialMount = useRef(true);

  // Update WMS layers whenever any filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    updateAllLayerFilters();
    // Re-fetch record counts
    const map = useMapStore.getState().map;
    const extent = map ? (map.getView().calculateExtent() as [number, number, number, number]) : null;
    fetchAllResults(extent);
  }, [selectedType, incentiveChecked, onlyInMapChecked, searchMode, buildingFrom, buildingTo, landFrom, landTo, priceFrom, priceTo]);

  const handleViewProperties = () => {
    const map = useMapStore.getState().map;
    const extent = map ? (map.getView().calculateExtent() as [number, number, number, number]) : null;
    fetchAllResults(extent);
    setActiveTab(1);
  };

  return (
    <div className="rounded-lg border border-base-300 overflow-hidden">
      {/* Tab bar */}
      <div role="tablist" className="flex bg-base-200 border-b border-base-300">
        <button
          role="tab"
          className={`flex-1 py-2 text-xs font-medium transition-all border-b-2 ${activeTab === 0 ? "border-primary text-primary bg-base-100" : "border-transparent text-base-content/60 hover:text-base-content hover:bg-base-100/50"}`}
          onClick={() => setActiveTab(0)}
        >
          <span className="flex items-center justify-center gap-1.5">
            <FaSearch className="w-3 h-3" />
            Search
          </span>
        </button>
        <button
          role="tab"
          className={`flex-1 py-2 text-xs font-medium transition-all border-b-2 ${activeTab === 1 ? "border-primary text-primary bg-base-100" : "border-transparent text-base-content/60 hover:text-base-content hover:bg-base-100/50"}`}
          onClick={() => setActiveTab(1)}
        >
          <span className="flex items-center justify-center gap-1.5">
            <FaListUl className="w-3 h-3" />
            My Results
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 0 && (
        <div className="flex flex-col gap-0 px-2 pt-2 pb-1 bg-base-100">
          <CRESearchPropTypes />
          <CRESearchType />
          <CRESearchBuildingSpace />
          <CRESearchLandSize />
          <CRESearchPrice />

          {/* Checkboxes */}
          <div className="border-b border-base-300 py-2 flex flex-col gap-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" className="checkbox checkbox-xs" checked={incentiveChecked} onChange={(e) => setIncentiveChecked(e.target.checked)} />
              Only search properties with incentives
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" className="checkbox checkbox-xs" checked={onlyInMapChecked} onChange={(e) => setOnlyInMapChecked(e.target.checked)} />
              Only search properties visible in map
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between py-2">
            <button className="btn btn-sm btn-primary" onClick={handleViewProperties}>
              View Properties
            </button>
            <span className="text-xs text-base-content/60">{isLoading ? <span className="loading loading-spinner loading-xs"></span> : `${numRecords} results`}</span>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-base-100 px-1 pt-2 pb-1">
          <CREResults />
        </div>
      )}
    </div>
  );
}
