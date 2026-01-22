"use client";

import React from "react";
import PanelComponent from "@/components/PanelComponent";

interface WeatherToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export default function WeatherTool({ name = "Weather", helpLink, hideHeader = false, onClose, onSidebarVisibility }: WeatherToolProps) {
  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="sc-container">
        <div style={{ marginBottom: "15px" }}>
          <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
            <button className="sc-button active" style={{ flex: 1, fontSize: "11px" }}>
              Radar
            </button>
            <button className="sc-button" style={{ flex: 1, fontSize: "11px" }}>
              Forecast
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Weather Radar:</label>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "3px" }}>Radar Type:</label>
            <select className="sc-button" style={{ width: "100%", marginBottom: "8px" }}>
              <option>Precipitation</option>
              <option>Temperature</option>
              <option>Cloud Cover</option>
              <option>Wind Speed</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "3px" }}>Animation Speed:</label>
            <select className="sc-button" style={{ width: "100%", marginBottom: "8px" }}>
              <option>Slow</option>
              <option>Normal</option>
              <option>Fast</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
            <button className="sc-button" style={{ flex: 1, fontSize: "11px" }}>
              Play
            </button>
            <button className="sc-button" style={{ flex: 1, fontSize: "11px" }}>
              Pause
            </button>
            <button className="sc-button" style={{ flex: 1, fontSize: "11px" }}>
              Stop
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Radar Layers:</label>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" defaultChecked style={{ marginRight: "8px" }} />
              Current Conditions
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" style={{ marginRight: "8px" }} />
              24 Hour Forecast
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" style={{ marginRight: "8px" }} />
              Temperature Overlay
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "12px" }}>
              <input type="checkbox" style={{ marginRight: "8px" }} />
              Wind Direction
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Transparency:</label>
          <input type="range" min="0" max="100" defaultValue="70" style={{ width: "100%", marginBottom: "5px" }} />
          <div style={{ textAlign: "center", fontSize: "11px", color: "#666" }}>70%</div>
        </div>

        <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "3px", border: "1px solid #ddd" }}>
          <div style={{ fontWeight: "bold", marginBottom: "5px", fontSize: "12px" }}>Current Conditions:</div>
          <div style={{ fontSize: "11px" }}>
            <div>Location: Simcoe County</div>
            <div>Temperature: Loading...</div>
            <div>Conditions: Loading...</div>
            <div>Updated: Loading...</div>
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "#666", backgroundColor: "#f9f9f9", padding: "8px", borderRadius: "3px" }}>
          <strong>Data Source:</strong> Environment and Climate Change Canada. Radar images are updated every 10 minutes.
        </div>
      </div>
    </PanelComponent>
  );
}
