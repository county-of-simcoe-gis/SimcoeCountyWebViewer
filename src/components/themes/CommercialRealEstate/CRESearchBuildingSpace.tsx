"use client";

import { useCREStore } from "./stores/creStore";
import { getBuildingSpaceFromItems, getBuildingSpaceToItems } from "./creObjects";

const fromItems = getBuildingSpaceFromItems();
const toItems = getBuildingSpaceToItems();

export default function CRESearchBuildingSpace() {
  const searchMode = useCREStore((s) => s.searchMode);
  const selectedFrom = useCREStore((s) => s.selectedBuildingSpaceFrom);
  const selectedTo = useCREStore((s) => s.selectedBuildingSpaceTo);
  const setFrom = useCREStore((s) => s.setBuildingSpaceFrom);
  const setTo = useCREStore((s) => s.setBuildingSpaceTo);
  const setSearchMode = useCREStore((s) => s.setSearchMode);

  if (searchMode !== "BuildingSize") return null;

  return (
    <div className="border-b border-base-300 mt-2 pb-2">
      <div className="flex justify-between items-center">
        <label className="font-bold text-sm">Building Space</label>
        <button className="text-xs link link-primary" onClick={() => setSearchMode("LandSize")}>
          [Search By Land Size]
        </button>
      </div>
      <div className="flex items-center gap-1 pt-1">
        <select
          className="select select-bordered select-sm flex-1"
          value={selectedFrom.value}
          onChange={(e) => {
            const match = fromItems.find((i) => i.value === Number(e.target.value));
            if (match) setFrom(match);
          }}
        >
          {fromItems.map((i) => (
            <option key={`from-${i.value}`} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
        <span className="text-xs px-1">to</span>
        <select
          className="select select-bordered select-sm flex-1"
          value={selectedTo.value}
          onChange={(e) => {
            const match = toItems.find((i) => i.value === Number(e.target.value));
            if (match) setTo(match);
          }}
        >
          {toItems.map((i) => (
            <option key={`to-${i.value}`} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
