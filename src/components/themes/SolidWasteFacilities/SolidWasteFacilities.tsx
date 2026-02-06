"use client";

import { useState } from "react";
import PanelComponent from "@/components/PanelComponent";
import ThemeBaseLayers from "../shared/ThemeBaseLayers";
import ThemeLayers from "../shared/ThemeLayers";
import ThemeData from "../shared/ThemeData";
import config from "./config.json";

interface SolidWasteFacilitiesProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

export default function SolidWasteFacilities({
  name = "Solid Waste Facilities",
  helpLink,
  hideHeader = false,
  onClose,
  onSidebarVisibility,
}: SolidWasteFacilitiesProps) {
  const [layerVisibilityStates, setLayerVisibilityStates] = useState<Record<string, boolean>>({});

  return (
    <PanelComponent
      name={name}
      helpLink={helpLink}
      hideHeader={hideHeader}
      onClose={onClose}
      onSidebarVisibility={onSidebarVisibility}
    >
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Base Layers</h3>
          <ThemeBaseLayers config={config.baseLayers} themeId="solidwastefacilities" />
        </div>

        <div className="divider my-2"></div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Toggle Layers</h3>
          <ThemeLayers
            layers={config.toggleLayers}
            themeId="solidwastefacilities"
            onVisibilityChange={setLayerVisibilityStates}
          />
        </div>

        <div className="divider my-2"></div>

        <ThemeData
          toggleLayers={config.toggleLayers}
          themeId="solidwastefacilities"
          layerVisibilityStates={layerVisibilityStates}
        />
      </div>
    </PanelComponent>
  );
}
