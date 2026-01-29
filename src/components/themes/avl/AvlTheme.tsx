"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { FaSignInAlt, FaSpinner, FaLock } from "react-icons/fa";
import PanelComponent from "@/components/PanelComponent";
import { useAvlStore } from "@/stores/avlStore";
import { useRequireAuth } from "@/hooks/useRequireAuth";
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

// AVL roles required for access
const AVL_ROLES = ["avl_waste_contractor", "avl_roads", "avl_solid_waste", "avl_oro_roads", "avl_severn_roads", "avl_innisfil_roads"];

export default function AvlTheme({ name = "AVL", helpLink, hideHeader = false, onClose, onSidebarVisibility, config: propsConfig }: AvlThemeProps) {
  // Use the require auth hook for authentication
  const {
    isLoading: authLoading,
    isAuthenticated,
    hasAccess,
    roles: userRoles,
    promptLogin,
  } = useRequireAuth({
    requiredRoles: AVL_ROLES,
  });

  // Get store values and actions
  const { activeTab, setActiveTab, config, setConfig, setAllowedGroups, showTripsTab, setShowTripsTab, plowGroups, setPlowGroups, loadFromStorage } = useAvlStore();

  // Local state
  const [noAccess, setNoAccess] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState<AvlVehicle | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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

    // Determine allowed groups based on user roles (case-insensitive matching)
    const allowedGroups: string[] = [];
    const userRolesLower = userRoles.map((r) => r.toLowerCase());
    SECURITY_GROUPS.forEach((group) => {
      if (userRolesLower.includes(group.key.toLowerCase())) {
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
  }, [isInitialized, propsConfig, config, setConfig, userRoles, setAllowedGroups, loadFromStorage, setActiveTab]);

  // Initialize the theme when auth is ready
  useEffect(() => {
    // Only initialize once auth is loaded and we have roles info
    if (authLoading) {
      return;
    }
    initializeTheme();
  }, [authLoading, userRoles, initializeTheme]);

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

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
        <div className="flex flex-col items-center justify-center p-8 text-gray-600">
          <FaSpinner size={32} className="animate-spin mb-4" />
          <p>Checking authentication...</p>
        </div>
      </PanelComponent>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FaSignInAlt size={48} className="text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-6">Please sign in to access AVL vehicle tracking features.</p>
          <button onClick={promptLogin} className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2">
            <FaSignInAlt size={16} />
            Sign In with Azure AD
          </button>
        </div>
      </PanelComponent>
    );
  }

  // Show access denied if authenticated but lacking required roles
  if (!hasAccess) {
    return (
      <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FaLock size={48} className="text-orange-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don&apos;t have access to any AVL groups.</p>
          <p className="text-gray-500 text-sm mb-6">
            Contact your administrator or{" "}
            <a href="mailto:sim-gis@simcoe.ca?subject=Secure Access to AVL on opengis.simcoe.ca" className="text-blue-500 hover:underline">
              email us
            </a>{" "}
            for access.
          </p>
        </div>
      </PanelComponent>
    );
  }

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
      {/* No Access Message (legacy - shown when user has auth but no matching groups) */}
      <div className={noAccess ? "" : "sc-hidden"}>
        You don&apos;t have access to any AVL groups.{" "}
        <div>
          <a href="mailto:<Simcoe County GIS>sim-gis@simcoe.ca?subject=Secure Access to AVL on opengis.simcoe.ca">Email us for Access</a>
        </div>
      </div>

      {/* Main Content */}
      <div className={noAccess ? "sc-hidden" : "sc-theme-avl-container"}>
        <Tabs forceRenderTabPanel={true} selectedIndex={activeTab} onSelect={handleTabSelect}>
          <TabList className={config.hideLiveFeed ? "sc-hidden" : "react-tabs__tab-list"}>
            <Tab id="tab-avl-live">Live Vehicles</Tab>
            <Tab id="tab-avl-history">Vehicle History</Tab>
            {showTripsTab && <Tab id="tab-avl-trips">Trips</Tab>}
          </TabList>

          {/* Live Tab */}
          <TabPanel id="tab-avl-live" className={config.hideLiveFeed ? "sc-hidden" : "react-tabs__tab-panel"}>
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
            <AvlHistory historyVehicle={historyVehicle} onHistoryVehicleConsumed={clearHistoryVehicle} />
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
