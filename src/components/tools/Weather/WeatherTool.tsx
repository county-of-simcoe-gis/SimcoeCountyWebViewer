"use client";

import React, { useState } from "react";
import PanelComponent from "@/components/PanelComponent";
import WeatherRadar from "./WeatherRadar";
import WeatherForecast from "./WeatherForecast";

interface WeatherToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export default function WeatherTool({ name = "Weather", helpLink, hideHeader = false, onClose, onSidebarVisibility }: WeatherToolProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<number>(0);

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="w-full flex flex-col h-full">
        <div role="tablist" className="tabs tabs-box sticky top-0 z-50 mb-3">
          <button role="tab" className={`tab${activeTab === 0 ? " tab-active" : ""}`} onClick={() => setActiveTab(0)}>
            Radar
          </button>
          <button role="tab" className={`tab${activeTab === 1 ? " tab-active" : ""}`} onClick={() => setActiveTab(1)}>
            Forecast
          </button>
        </div>

        <div className="overflow-auto flex-1">
          {activeTab === 0 && <WeatherRadar />}
          {activeTab === 1 && <WeatherForecast />}
        </div>
      </div>
    </PanelComponent>
  );
}
