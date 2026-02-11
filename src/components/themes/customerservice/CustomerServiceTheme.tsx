"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { FaSignInAlt, FaSpinner, FaLock } from "react-icons/fa";
import PanelComponent from "@/components/PanelComponent";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import CustomerServiceLayers from "./CustomerServiceLayers";
import CustomerServiceAvl from "./CustomerServiceAvl";
import type { CustomerServiceThemeProps } from "./types/customerservice.types";
import "./styles/CustomerService.css";

// Security key for Customer Service theme access
const SECURITY_KEY = "theme_customer_service";

export default function CustomerServiceTheme({ name = "Customer Service", helpLink, hideHeader = false, onClose, onSidebarVisibility }: CustomerServiceThemeProps) {
  // Use the require auth hook for authentication
  const {
    isLoading: authLoading,
    isAuthenticated,
    hasAccess,
    promptLogin,
  } = useRequireAuth({
    requiredRoles: [SECURITY_KEY],
  });

  // Local state
  const [activeTab, setActiveTab] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme function
  const initializeTheme = useCallback(() => {
    if (isInitialized) return;

    // Add app stats or other initialization logic here
    setIsInitialized(true);
  }, [isInitialized]);

  // Initialize the theme when auth is ready
  useEffect(() => {
    // Only initialize once auth is loaded
    if (authLoading) {
      return;
    }

    if (isAuthenticated && hasAccess) {
      initializeTheme();
    }
  }, [authLoading, isAuthenticated, hasAccess, initializeTheme]);

  // Handle tab selection
  const handleTabSelect = (index: number) => {
    setActiveTab(index);
    // Add app stats tracking if needed
    // if (index === 0) helpers.addAppStat("Tab", "Customer Service Cases");
    // else if (index === 1) helpers.addAppStat("Tab", "Customer Service Vehicle History");
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
          <p className="text-gray-600 mb-6">Please sign in to access Customer Service features.</p>
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
          <p className="text-gray-600 mb-4">You don&apos;t have access to the Customer Service Theme.</p>
          <p className="text-gray-500 text-sm mb-6">
            Contact your administrator or{" "}
            <a href="mailto:sim-gis@simcoe.ca?subject=Secure Access to Customer Service Theme on opengis.simcoe.ca" className="text-blue-500 hover:underline">
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
      {/* Main Content */}
      <div className="sc-theme-customer-service-main-container">
        <Tabs forceRenderTabPanel={true} selectedIndex={activeTab} onSelect={handleTabSelect}>
          <TabList>
            <Tab id="tab-cs-layers">Cases</Tab>
            <Tab id="tab-cs-avl">Vehicle History</Tab>
          </TabList>

          {/* Cases Tab */}
          <TabPanel id="tab-cs-layers">
            <CustomerServiceLayers visible={activeTab === 0} />
          </TabPanel>

          {/* Vehicle History Tab */}
          <TabPanel id="tab-cs-avl">
            <CustomerServiceAvl visible={activeTab === 1} />
          </TabPanel>
        </Tabs>
      </div>
    </PanelComponent>
  );
}
