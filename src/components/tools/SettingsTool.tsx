"use client";

import React from "react";
import PanelComponent from "@/components/PanelComponent";

interface SettingsToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export default function SettingsTool({ name = "Settings", helpLink, hideHeader = false, onClose, onSidebarVisibility }: SettingsToolProps) {
  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="sc-container">
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold", fontSize: "14px" }}>Map Controls:</label>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              Show Zoom In/Out Controls
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              Show Full Screen Control
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              Show Current Location Control
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              Show Scale Control
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              Show Scale Line
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              Show Basemap Switcher
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold", fontSize: "14px" }}>Display Options:</label>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              Show Layer Opacity Controls
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" style={{ marginRight: "8px" }} />
              Show Layer Metadata
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              Show Search History
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold", fontSize: "14px" }}>Local Storage:</label>

          <div style={{ marginBottom: "10px" }}>
            <button className="sc-button" style={{ width: "100%", marginBottom: "5px" }}>
              Clear Search History
            </button>
            <button className="sc-button" style={{ width: "100%", marginBottom: "5px" }}>
              Clear My Maps Data
            </button>
            <button className="sc-button" style={{ width: "100%", marginBottom: "5px" }}>
              Clear All Local Data
            </button>
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "#666", backgroundColor: "#f9f9f9", padding: "8px", borderRadius: "3px" }}>
          <strong>Note:</strong> Changes to map controls will take effect immediately. Local storage options will clear saved data from your browser.
        </div>
      </div>
    </PanelComponent>
  );
}
