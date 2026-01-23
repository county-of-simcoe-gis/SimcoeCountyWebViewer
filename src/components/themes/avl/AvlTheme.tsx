"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import PanelComponent from "@/components/PanelComponent";
import { useAvlStore } from "@/stores/avlStore";
import { useMapStore } from "@/stores/mapStore";
import AvlLive from "./AvlLive";
import AvlHistory from "./AvlHistory";
import AvlTrips from "./AvlTrips";
import type { AvlThemeProps, AvlSecurityGroup, AvlVehicle, AvlGroup } from "./types/avl.types";
import "./styles/Avl.css";

// Security groups mapping for access control
const SECURITY_GROUPS: AvlSecurityGroup[] = [
  { key: "avl_roads", label: "Roads" },
  { key: "avl_roads", label: "Roads GeoTab" },
  { key: "avl_solid_waste", label: "Solid Waste" },
  { key: "avl_solid_waste", label: "Solid Waste GeoTab" },
  { key: "avl_waste_contractor", label: "Waste Contractor" },
  { key: "avl_oro_roads", label: "Oro-Medonte Roads (Spreader)" },
  { key: "avl_severn_roads", label: "Severn", value: "Severn" },
  { key: "avl_innisfil_roads", label: "Innisfil", value: "Innisfil" },
];

export default function AvlTheme({
  name = "AVL",
  helpLink,
  hideHeader = false,
  onClose,
  onSidebarVisibility,
  config: propsConfig,
}: AvlThemeProps) {
  const { data: session } = useSession();
  const { areItemsLoaded } = useMapStore();

  // Get store values and actions
  const {
    activeTab,
    setActiveTab,
    config,
    setConfig,
    setAllowedGroups,
    showTripsTab,
    setShowTripsTab,
    plowGroups,
    setPlowGroups,
    loadFromStorage,
  } = useAvlStore();

  // Local state
  const [noAccess, setNoAccess] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState<AvlVehicle | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get user roles from session
  const userRoles = (session?.user as { roles?: string[] })?.roles || [];

  // Initialize the theme
  useEffect(() => {
    // Wait for required components to load
    const checkLoaded = () => {
      if (areItemsLoaded(["security", "sidebar", "toc", "settings"])) {
        initializeTheme();
        return true;
      }
      return false;
    };

    // Check immediately
    if (!checkLoaded()) {
      // If not loaded, set up an interval to check
      const interval = setInterval(() => {
        if (checkLoaded()) {
          clearInterval(interval);
        }
      }, 100);

      // Clean up after 30 seconds
      const timeout = setTimeout(() => {
        clearInterval(interval);
        // Initialize anyway after timeout
        initializeTheme();
      }, 30000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [areItemsLoaded]);

  // Initialize theme function
  const initializeTheme = useCallback(() => {
    if (isInitialized) return;

    // Merge props config with default config
    if (propsConfig) {
      setConfig({
        ...config,
        ...propsConfig,
      });
    }

    // Determine allowed groups based on user roles
    const allowedGroups: string[] = [];
    SECURITY_GROUPS.forEach((group) => {
      if (userRoles.includes(group.key)) {
        allowedGroups.push(group.label);
      }
    });

    setAllowedGroups(allowedGroups);
    setNoAccess(allowedGroups.length === 0);

    // Load saved state from storage
    loadFromStorage();

    // Check if live feed should be hidden
    if (config.hideLiveFeed) {
      setActiveTab(1);
    }

    // Check URL parameters for history
    const urlParams = new URLSearchParams(window.location.search);
    const group = urlParams.get("GROUP");
    if (group) {
      setActiveTab(1);
    }

    setIsInitialized(true);
  }, [
    isInitialized,
    propsConfig,
    config,
    setConfig,
    userRoles,
    setAllowedGroups,
    loadFromStorage,
    setActiveTab,
  ]);

  // Handle tab selection
  const handleTabSelect = (index: number) => {
    setActiveTab(index);
    // Add app stats here if needed
  };

  // Handle history popup button click from live view
  const handleHistoryPopupButtonClick = (vehicle: AvlVehicle) => {
    setActiveTab(1);
    setHistoryVehicle(vehicle);
  };

  // Clear history vehicle after it's consumed
  const clearHistoryVehicle = () => {
    setHistoryVehicle(null);
  };

  // Update trips tab visibility
  const updateTripsTabVisibility = (hasVisiblePlowVehicles: boolean) => {
    setShowTripsTab(hasVisiblePlowVehicles);
  };

  // Update plow groups for trips
  const updatePlowGroups = (groups: AvlGroup[]) => {
    setPlowGroups(groups);
  };

  // Handle close
  const handleClose = () => {
    // Add cleanup here if needed (map layers, popups, etc.)
    onClose();
  };

  return (
    <PanelComponent
      name={name}
      helpLink={helpLink}
      hideHeader={hideHeader}
      onClose={handleClose}
      onSidebarVisibility={onSidebarVisibility}
    >
      {/* No Access Message */}
      <div className={noAccess ? "" : "sc-hidden"}>
        You don&apos;t have access to any AVL groups.{" "}
        <div>
          <a href="mailto:<Simcoe County GIS>sim-gis@simcoe.ca?subject=Secure Access to AVL on opengis.simcoe.ca">
            Email us for Access
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className={noAccess ? "sc-hidden" : "sc-theme-avl-container"}>
        <Tabs
          forceRenderTabPanel={true}
          selectedIndex={activeTab}
          onSelect={handleTabSelect}
        >
          <TabList
            className={config.hideLiveFeed ? "sc-hidden" : "react-tabs__tab-list"}
          >
            <Tab id="tab-avl-live">Live Vehicles</Tab>
            <Tab id="tab-avl-history">Vehicle History</Tab>
            {showTripsTab && <Tab id="tab-avl-trips">Trips</Tab>}
          </TabList>

          {/* Live Tab */}
          <TabPanel
            id="tab-avl-live"
            className={config.hideLiveFeed ? "sc-hidden" : "react-tabs__tab-panel"}
          >
            <AvlLive
              config={config}
              securityGroups={SECURITY_GROUPS}
              onHistoryPopupButtonClick={handleHistoryPopupButtonClick}
              showVehicleList={true}
              mapVehiclesVisible={true}
              showFollowButton={true}
              showHistoryButton={true}
              useStorage={true}
              onPlowVehiclesUpdate={updateTripsTabVisibility}
              onPlowGroupsUpdate={updatePlowGroups}
            />
          </TabPanel>

          {/* History Tab */}
          <TabPanel id="tab-avl-history">
            <AvlHistory
              historyVehicle={historyVehicle}
              onHistoryVehicleConsumed={clearHistoryVehicle}
            />
          </TabPanel>

          {/* Trips Tab (conditionally rendered) */}
          {showTripsTab && (
            <TabPanel id="tab-avl-trips">
              <AvlTrips groups={plowGroups} />
            </TabPanel>
          )}
        </Tabs>
      </div>
    </PanelComponent>
  );
}
