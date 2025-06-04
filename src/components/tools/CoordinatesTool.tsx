"use client";

import "./CoordinatesTool.css";
import React, { useState } from "react";
import PanelComponent from "@/components/PanelComponent";

interface CoordinatesToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

const inputMsg = "(listening for input)";

function LiveCoordinates() {
  return (
    <div>
      <div className="sc-title sc-coordinates-title">LIVE COORDINATES</div>
      <div className="sc-description">Live coordinates of your current pointer/mouse position.</div>
      <div className="sc-container">
        <div className="sc-coordinates-row sc-arrow">
          <label className="sc-coordinates-live-label">X Coordinate (meters):</label>
          <span>{inputMsg}</span>
        </div>
        <div className="sc-coordinates-row sc-arrow">
          <label className="sc-coordinates-live-label">Y Coordinate (meters):</label>
          <span>{inputMsg}</span>
        </div>
        <div className="sc-coordinates-divider">&nbsp;</div>
        <div className="sc-coordinates-row sc-arrow">
          <label className="sc-coordinates-live-label">Latitude (degrees):</label>
          <span>{inputMsg}</span>
        </div>
        <div className="sc-coordinates-row sc-arrow">
          <label className="sc-coordinates-live-label">Longitude (degrees):</label>
          <span>{inputMsg}</span>
        </div>
      </div>
    </div>
  );
}

function CustomCoordinates({ title }: { title: string }) {
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  return (
    <div>
      <div className="sc-coordinates-heading">{title}</div>
      <div className="sc-coordinates-row sc-arrow">
        <label>X Coordinate:</label>
        <span>
          <input className="sc-coordinates-input" type="text" value={x} placeholder={inputMsg} onChange={(e) => setX(e.target.value)} />
        </span>
      </div>
      <div className="sc-coordinates-row sc-arrow">
        <label>Y Coordinate:</label>
        <span>
          <input className="sc-coordinates-input" type="text" value={y} placeholder={inputMsg} onChange={(e) => setY(e.target.value)} />
        </span>
      </div>
      <div className="sc-coordinates-row">
        <label>&nbsp;</label>[ <span className="sc-fakeLink">Zoom</span> ] [ <span className="sc-fakeLink">Add to My Maps</span> ]
      </div>
    </div>
  );
}

function MapExtent() {
  return (
    <div className="sc-container">
      <div className="sc-coordinates-row sc-arrow">
        <label>Min X:</label>
        <span>{inputMsg}</span>
      </div>
      <div className="sc-coordinates-row sc-arrow">
        <label>Max X:</label>
        <span>{inputMsg}</span>
      </div>
      <div className="sc-coordinates-row sc-arrow">
        <label>Min Y:</label>
        <span>{inputMsg}</span>
      </div>
      <div className="sc-coordinates-row sc-arrow">
        <label>Max Y:</label>
        <span>{inputMsg}</span>
      </div>
    </div>
  );
}

export default function CoordinatesTool({ name = "Coordinates", helpLink, hideHeader = false, onClose, onSidebarVisibility }: CoordinatesToolProps) {
  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="sc-coordinates-container">
        <LiveCoordinates />
        <div className="sc-title sc-coordinates-title">SELECTED/CUSTOM COORDINATES</div>
        <div className="sc-description">
          Capture points in a variety of different coordinate systems or enter your own locations and zoom to its location. Simply click on the map to capture locations.
        </div>
        <div className="sc-container">
          <CustomCoordinates title="Map Coordinates (Web Mercator - Meters)" />
          <div className="sc-coordinates-divider">&nbsp;</div>
          <CustomCoordinates title="Latitude/Longitude (WGS84 - Degrees)" />
          <div className="sc-coordinates-divider">&nbsp;</div>
          <CustomCoordinates title="North American Datum (NAD) 83 - Zone 17 (meters)" />
          <div className="sc-coordinates-divider">&nbsp;</div>
          <CustomCoordinates title="North American Datum (NAD) 27 - Zone 17 (meters)" />
        </div>
        <div className="sc-title sc-coordinates-title">Map Extent</div>
        <MapExtent />
        <div className="sc-title sc-coordinates-title">Map Scale</div>
        <div className="sc-container">
          <div className="sc-coordinates-row sc-arrow">
            <label>Scale</label>
            <span>1:50000</span>
          </div>
        </div>
      </div>
    </PanelComponent>
  );
}
