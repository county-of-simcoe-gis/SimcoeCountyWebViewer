"use client";

import { useState } from "react";
import PanelComponent from "@/components/PanelComponent";
import { FaPalette } from "react-icons/fa";
import ThemeBaseLayers from "../shared/ThemeBaseLayers";
import ThemeLayers from "../shared/ThemeLayers";
import ThemeData from "../shared/ThemeData";
import config from "./config.json";

interface ForestryProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

export default function Forestry({ name = "Forestry", helpLink, hideHeader = false, onClose, onSidebarVisibility }: ForestryProps) {
  const [layerVisibilityStates, setLayerVisibilityStates] = useState<Record<string, boolean>>({});

  return (
    <PanelComponent icon={<FaPalette size={20} className="text-neutral/70" />} name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Base Layers</h3>
          <ThemeBaseLayers config={config.baseLayers} themeId="forestry" popupLogoImage={config.popupLogoImage} />
        </div>

        <div className="divider my-2"></div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Toggle Layers</h3>
          <ThemeLayers
            layers={config.toggleLayers}
            themeId="forestry"
            popupLogoImage={config.popupLogoImage}
            onVisibilityChange={setLayerVisibilityStates}
            suppressParcelClick={config.disableParcelClick}
          />
        </div>

        <div className="divider my-2"></div>

        <ThemeData toggleLayers={config.toggleLayers} themeId="forestry" layerVisibilityStates={layerVisibilityStates} popupLogoImage={config.popupLogoImage} />
      </div>
    </PanelComponent>
  );
}
