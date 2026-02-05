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
      <Tabs selectedIndex={activeTab} onSelect={setActiveTab} className="w-full flex flex-col h-full" selectedTabClassName="border-b-2 border-primary text-primary">
        <TabList className="flex gap-1 border-b border-base-300 mb-0 sticky top-0 bg-base-100 z-50">
          <Tab className="py-2 px-4 text-sm font-medium cursor-pointer border-b-2 border-transparent hover:border-base-300 outline-none btn" selectedClassName="border-b-2 border-primary text-primary">
            Radar
          </Tab>
          <Tab className="py-2 px-4 text-sm font-medium cursor-pointer border-b-2 border-transparent hover:border-base-300 outline-none" selectedClassName="border-b-2 border-primary text-primary">
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
