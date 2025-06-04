"use client";

import React from "react";
import PanelComponent from "@/components/PanelComponent";

interface ForestryThemeProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export default function ForestryTheme({ name = "Forestry", helpLink, hideHeader = false, onClose, onSidebarVisibility }: ForestryThemeProps) {
  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="sc-container">
        <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "3px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "5px", fontSize: "12px" }}>Forestry Information</div>
          <div style={{ fontSize: "11px", lineHeight: "1.4" }}>View County Forests and Recreation features, conservation areas, provincial and municipal parks throughout Simcoe County.</div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Forestry Layers:</label>

          <div style={{ marginBottom: "8px", padding: "5px", border: "1px solid #ddd", borderRadius: "3px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold" }}>County Forests</div>
                <div style={{ fontSize: "10px", color: "#666" }}>Managed forest areas within Simcoe County</div>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: "8px", padding: "5px", border: "1px solid #ddd", borderRadius: "3px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" style={{ marginRight: "8px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold" }}>Provincial Parks</div>
                <div style={{ fontSize: "10px", color: "#666" }}>Ontario provincial parks and reserves</div>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: "8px", padding: "5px", border: "1px solid #ddd", borderRadius: "3px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" style={{ marginRight: "8px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold" }}>Conservation Areas</div>
                <div style={{ fontSize: "10px", color: "#666" }}>Protected conservation areas and wetlands</div>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: "8px", padding: "5px", border: "1px solid #ddd", borderRadius: "3px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" style={{ marginRight: "8px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold" }}>Recreation Trails</div>
                <div style={{ fontSize: "10px", color: "#666" }}>Hiking, biking, and nature trails</div>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: "8px", padding: "5px", border: "1px solid #ddd", borderRadius: "3px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" style={{ marginRight: "8px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold" }}>Municipal Parks</div>
                <div style={{ fontSize: "10px", color: "#666" }}>Local municipal parks and facilities</div>
              </div>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <div style={{ display: "flex", gap: "5px" }}>
            <button className="sc-button" style={{ flex: 1, fontSize: "11px" }}>
              Show All
            </button>
            <button className="sc-button" style={{ flex: 1, fontSize: "11px" }}>
              Hide All
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Layer Transparency:</label>
          <input type="range" min="0" max="100" defaultValue="100" style={{ width: "100%", marginBottom: "5px" }} />
          <div style={{ textAlign: "center", fontSize: "11px", color: "#666" }}>100% Opaque</div>
        </div>

        <div style={{ fontSize: "12px", color: "#666", backgroundColor: "#f9f9f9", padding: "8px", borderRadius: "3px" }}>
          <strong>Tips:</strong>
          <ul style={{ marginTop: "5px", paddingLeft: "20px", fontSize: "11px" }}>
            <li>Click on features for detailed information</li>
            <li>Use transparency slider to see underlying layers</li>
            <li>Toggle individual layers for custom views</li>
          </ul>
        </div>
      </div>
    </PanelComponent>
  );
}
