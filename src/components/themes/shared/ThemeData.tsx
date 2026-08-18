"use client";

import { useState, useEffect } from "react";
import { usePopupStore } from "@/stores/popupStore";
import ThemeDataList from "./ThemeDataList";

interface ToggleLayerConfig {
  displayName: string;
  serverUrl: string;
  layerName: string;
  visible: boolean;
  displayFieldName?: string;
  legendStyleName?: string;
  secured?: boolean;
  expanded?: boolean;
  moreInfoUrlFieldName?: string;
}

interface ThemeDataProps {
  toggleLayers: ToggleLayerConfig[];
  themeId: string;
  layerVisibilityStates?: Record<string, boolean>;
  popupLogoImage?: string;
}

export default function ThemeData({ toggleLayers, themeId, layerVisibilityStates = {}, popupLogoImage }: ThemeDataProps) {
  const [onlyFeaturesWithinMap, setOnlyFeaturesWithinMap] = useState(false);
  const { hide: hidePopup } = usePopupStore();

  // Hide any open popups when the theme unmounts
  useEffect(() => {
    return () => {
      hidePopup();
    };
  }, [hidePopup]);

  // Determine visibility for each layer
  const getLayerVisibility = (layerName: string, defaultVisible: boolean) => {
    if (layerVisibilityStates[layerName] !== undefined) {
      return layerVisibilityStates[layerName];
    }
    return defaultVisible;
  };

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-3 border-b border-base-300 pb-2">THEME DATA</h3>

      {/* Filter checkbox */}
      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input type="checkbox" className="checkbox checkbox-sm" checked={onlyFeaturesWithinMap} onChange={(e) => setOnlyFeaturesWithinMap(e.target.checked)} />
        <span className="text-xs">Only show data visible in the map</span>
      </label>

      {/* Data lists for each toggle layer */}
      <div className="space-y-2">
        {toggleLayers.map((layerConfig) => (
          <ThemeDataList
            key={`${themeId}-${layerConfig.layerName}`}
            layerConfig={layerConfig}
            onlyFeaturesWithinMap={onlyFeaturesWithinMap}
            isVisible={getLayerVisibility(layerConfig.layerName, layerConfig.visible)}
            popupLogoImage={popupLogoImage}
          />
        ))}
      </div>
    </div>
  );
}
