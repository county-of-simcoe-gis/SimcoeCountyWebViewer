"use client";

import { useState } from "react";
import { FaPalette } from "react-icons/fa";
import PanelComponent from "@/components/PanelComponent";
import ThemeBaseLayers from "@/components/themes/shared/ThemeBaseLayers";
import ThemeLayers from "@/components/themes/shared/ThemeLayers";
import ThemeData from "@/components/themes/shared/ThemeData";
import config from "./config.json";

interface CouchichingOHTProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

export default function CouchichingOHT({
  name = "Couchiching OHT",
  helpLink,
  hideHeader = false,
  onClose,
  onSidebarVisibility,
}: CouchichingOHTProps) {
  const [layerVisibilityStates, setLayerVisibilityStates] = useState<Record<string, boolean>>({});
  const hasBaseLayers = config.baseLayers.layers.length > 0;

  return (
    <PanelComponent icon={<FaPalette size={20} className="text-neutral/70" />} name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="p-4 space-y-6">
        {hasBaseLayers && (
          <>
            <div>
              <h3 className="text-sm font-semibold mb-3">Base Layers</h3>
              <ThemeBaseLayers config={config.baseLayers} themeId="couchichingoht" popupLogoImage={config.popupLogoImage} />
            </div>

            <div className="divider my-2"></div>
          </>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-3">Toggle Layers</h3>
          <ThemeLayers
            layers={config.toggleLayers}
            themeId="couchichingoht"
            popupLogoImage={config.popupLogoImage}
            onVisibilityChange={setLayerVisibilityStates}
            suppressParcelClick={config.disableParcelClick}
          />
        </div>

        <div className="divider my-2"></div>

        <ThemeData toggleLayers={config.toggleLayers} themeId="couchichingoht" layerVisibilityStates={layerVisibilityStates} popupLogoImage={config.popupLogoImage} />
      </div>
    </PanelComponent>
  );
}