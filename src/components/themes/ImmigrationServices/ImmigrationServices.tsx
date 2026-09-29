"use client";

import { useState } from "react";
import PanelComponent from "@/components/PanelComponent";
import { FaPalette } from "react-icons/fa";
import ThemeLayers from "../shared/ThemeLayers";
import ThemeData from "../shared/ThemeData";
import config from "./config.json";

interface ImmigrationServicesProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

export default function ImmigrationServices({ name = "Immigration Services", helpLink, hideHeader = false, onClose, onSidebarVisibility }: ImmigrationServicesProps) {
  const [layerVisibilityStates, setLayerVisibilityStates] = useState<Record<string, boolean>>({});

  return (
    <PanelComponent icon={<FaPalette size={20} className="text-neutral/70" />} name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="p-4 space-y-6">
        {/* Introduction Card */}
        <div className="alert alert-info shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{config.introDescription}</span>
        </div>

        {/* Toggle Layers */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Services</h3>
          <ThemeLayers layers={config.toggleLayers} themeId="immigrationservices" onVisibilityChange={setLayerVisibilityStates} suppressParcelClick={config.disableParcelClick} />
        </div>

        <div className="divider my-2"></div>

        {/* Theme Data */}
        <ThemeData toggleLayers={config.toggleLayers} themeId="immigrationservices" layerVisibilityStates={layerVisibilityStates} />
      </div>
    </PanelComponent>
  );
}
