"use client";

import "./MeasureTool.css";
import React, { useState } from "react";
import PanelComponent from "@/components/PanelComponent";

interface MeasureToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

const measureButtons = [
  { type: "LineString", unitType: "distance", icon: "/images/measure/polyline.png", title: "Draw a single line on the map", alt: "line" },
  { type: "Polygon", unitType: "area", icon: "/images/measure/polygon.png", title: "Draw a polygon on the map", alt: "polygon" },
  { type: "Circle", unitType: "area", icon: "/images/measure/circle.png", title: "Draw a circle on the map", alt: "circle" },
  { type: "Rectangle", unitType: "area", icon: "/images/measure/rectangle.png", title: "Draw a rectangle on the map", alt: "rectangle" },
  { type: "Bearing", unitType: "bearing", icon: "/images/measure/compass.png", title: "Draw a Bearing Line on the map", alt: "compass" },
  { type: "Clear", unitType: "clear", icon: "/images/measure/none.png", title: "Clear Drawing", alt: "clear" },
];

const unitList = [
  { name: "Kilometer", abbreviation: "km", type: "distance" },
  { name: "Miles", abbreviation: "mi", type: "distance" },
  { name: "Meter", abbreviation: "m", type: "distance" },
  { name: "Feet", abbreviation: "ft", type: "distance" },
  { name: "Yard", abbreviation: "yd", type: "distance" },
  { name: "Inches", abbreviation: "in", type: "distance" },
  { name: "Square Meter", abbreviation: "sq m", type: "area" },
  { name: "Hectare", abbreviation: "ha", type: "area" },
  { name: "Acre", abbreviation: "ac", type: "area" },
  { name: "Square Km", abbreviation: "sq km", type: "area" },
  { name: "Square Feet", abbreviation: "sq ft", type: "area" },
  { name: "Square Yard", abbreviation: "sq yard", type: "area" },
  { name: "Square Inches", abbreviation: "sq in", type: "area" },
  { name: "Degrees", abbreviation: "deg", type: "bearing" },
];

export default function MeasureTool({ name = "Measure", helpLink, hideHeader = false, onClose, onSidebarVisibility }: MeasureToolProps) {
  const [geometryType, setGeometryType] = useState("");
  const [unitType, setUnitType] = useState("distance");
  const [hideTooltips, setHideTooltips] = useState(false);

  // Placeholder for measurement value
  const unitMeters = -1;

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="simcoe-measure-container">
        <div style={{ padding: "10px", fontSize: "11pt" }}>
          Please select the type of measurements you wish to perform from the toolbar below. Use the line tools for distances and polygon tools for area.
        </div>

        {/* BUTTON BAR */}
        <div style={{ display: "flex", alignItems: "center", position: "relative", marginBottom: 0 }}>
          <div className="sc-measure-title" style={{ margin: 0, flex: 1 }}>
            Measure Tools
          </div>
          <div className="sc-measure-tooltip-message-container" style={{ position: "static", top: "unset", right: "unset", marginRight: 10 }}>
            Hide Tooltips
            <input style={{ position: "relative", top: "2px", marginLeft: 4 }} type="checkbox" checked={hideTooltips} onChange={(e) => setHideTooltips(e.target.checked)} />
          </div>
        </div>
        <div className="sc-measure-button-bar">
          {measureButtons.map((btn) => (
            <div key={btn.type} className={geometryType === btn.type ? "sc-measure-button-container active" : "sc-measure-button-container"}>
              <button
                className="sc-measure-button"
                title={btn.title}
                onClick={() => {
                  setGeometryType(btn.type);
                  setUnitType(btn.unitType);
                }}
              >
                <img src={btn.icon} alt={btn.alt} />
              </button>
            </div>
          ))}
        </div>

        <div className="sc-measure-title">Measure Results</div>
        {/* INTRO MESSAGE */}
        <div style={geometryType === "" || geometryType === "Clear" ? { padding: "10px", fontSize: "11pt" } : { display: "none" }}>
          There are currently no measurements to display. Please select a tool from above to start your measurements. Results will display in this area.
        </div>
        {/* RESULTS */}
        <div className={geometryType === "" || geometryType === "Clear" ? "sc-hidden" : "sc-measure-results-container"}>
          {unitList
            .filter((u) => u.type === unitType)
            .map((unit) => (
              <div className="sc-measure-result" key={unit.abbreviation}>
                <div className="sc-measure-result-label">
                  <span>{unit.name}</span>
                </div>
                <div className="sc-measure-result-container">
                  <div style={{ display: "table-cell" }}>
                    <input readOnly className="sc-measure-result-input" placeholder="Waiting..." type="text" value={unitMeters === -1 ? "" : "123.45"} />
                  </div>
                  <div className="sc-measure-result-abbreviation">{unit.abbreviation}</div>
                </div>
                <span className="sc-fakeLink sc-hidden">[Add to My Maps]</span>
              </div>
            ))}
        </div>
        {/* Tooltips (not implemented) */}
        <div style={{ display: "none" }} />
        <div style={{ display: "none" }} />
      </div>
    </PanelComponent>
  );
}
