"use client";

import { useState } from "react";
import PanelComponent from "@/components/PanelComponent";
import { FaPalette } from "react-icons/fa";
import ThemeLayers from "../shared/ThemeLayers";
import ThemeData from "../shared/ThemeData";
import config from "./config.json";

interface ChildCareFacilitiesProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

export default function ChildCareFacilities({ name = "Child Care Facilities", helpLink, hideHeader = false, onClose, onSidebarVisibility }: ChildCareFacilitiesProps) {
  const [layerVisibilityStates, setLayerVisibilityStates] = useState<Record<string, boolean>>({});

  return (
    <PanelComponent icon={<FaPalette size={20} className="text-neutral/70" />} name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="p-4">
        <p className="text-sm mb-4">View child care facilities across Simcoe County.</p>
        <ThemeLayers layers={config.toggleLayers} themeId="childcare" onVisibilityChange={setLayerVisibilityStates} suppressParcelClick={config.disableParcelClick} />

        <div className="divider my-2"></div>

        <ThemeData toggleLayers={config.toggleLayers} themeId="childcare" layerVisibilityStates={layerVisibilityStates} />
      </div>
    </PanelComponent>
  );
}
