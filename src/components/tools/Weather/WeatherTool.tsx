"use client";

import React, { useState } from "react";
import PanelComponent from "@/components/PanelComponent";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
// react-tabs styles are imported globally in src/app/globals.css
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
      <Tabs selectedIndex={activeTab} onSelect={setActiveTab} className="w-full flex flex-col h-full">
        <TabList className="tabs tabs-bordered sticky top-0 bg-base-100 z-50">
          <Tab className="tab text-sm" selectedClassName="tab-active">
            Radar
          </Tab>
          <Tab className="tab text-sm" selectedClassName="tab-active">
            Forecast
          </Tab>
        </TabList>

        <TabPanel className=" overflow-auto pt-4">
          <WeatherRadar />
        </TabPanel>

        <TabPanel className=" overflow-auto pt-4">
          <WeatherForecast />
        </TabPanel>
      </Tabs>
    </PanelComponent>
  );
}
