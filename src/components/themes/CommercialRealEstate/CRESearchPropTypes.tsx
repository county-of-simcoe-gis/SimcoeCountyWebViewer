"use client";

import { useCREStore } from "./stores/creStore";
import { useMapStore } from "@/stores/mapStore";
import { PROPERTY_TYPES, PROPERTY_TYPE_COLORS, type PropertyType } from "./creObjects";
import { fetchAllResults } from "./creHelpers";

export default function CRESearchPropTypes() {
  const propertyLayers = useCREStore((s) => s.propertyLayers);
  const setPropertyLayerVisible = useCREStore((s) => s.setPropertyLayerVisible);

  const handleToggle = (propType: PropertyType, checked: boolean) => {
    setPropertyLayerVisible(propType, checked);

    // Also toggle the actual OL layer visibility
    const layerState = useCREStore.getState().propertyLayers[propType];
    if (layerState?.pointLayer) {
      layerState.pointLayer.setVisible(checked);
    }

    // Re-fetch results to reflect the updated property type visibility
    const map = useMapStore.getState().map;
    const extent = map ? (map.getView().calculateExtent() as [number, number, number, number]) : null;
    fetchAllResults(extent);
  };

  return (
    <div className="border-b border-base-300 pb-2">
      <div className="font-bold text-sm mb-1">Property Type</div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-1">
        {PROPERTY_TYPES.map((pt) => {
          const layerState = propertyLayers[pt];
          return (
            <label key={pt} className="flex items-center gap-1 cursor-pointer text-xs">
              <input type="checkbox" className="checkbox checkbox-xs" checked={layerState?.visible ?? true} onChange={(e) => handleToggle(pt, e.target.checked)} />
              <span style={{ color: PROPERTY_TYPE_COLORS[pt] }} className="font-medium">
                {pt}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
