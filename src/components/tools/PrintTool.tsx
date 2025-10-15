"use client";

import "@/components/tools/PrintTool.css";
import React, { useState } from "react";
import Image from "next/image";
import PanelComponent from "@/components/PanelComponent";

interface PrintToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

// Mock data to match original configuration
const printSizes = [
  { value: "8X11 Portrait", label: "8X11 Portrait (Letter)", size: [570, 639], layout: "letter portrait" },
  { value: "11X8 Landscape", label: "11X8 Landscape (Letter)", size: [750, 450], layout: "letter landscape" },
  { value: "8X11 Portrait Overview", label: "8X11 Portrait with Overview", size: [570, 450], layout: "letter portrait overview" },
  { value: "Map Only", label: "Map Only", size: [], layout: "map only" },
  { value: "Map Only Portrait", label: "Map Only Portrait", size: [570, 752], layout: "map only portrait" },
  { value: "Map Only Landscape", label: "Map Only Landscape", size: [750, 572], layout: "map only landscape" },
];

const printFormats = [
  { value: "pdf", label: "PDF" },
  { value: "png", label: "PNG" },
  { value: "tif", label: "TIF" },
];

export default function PrintTool({ name = "Print", helpLink, hideHeader = false, onClose, onSidebarVisibility }: PrintToolProps) {
  const [mapTitle, setMapTitle] = useState("County of Simcoe WebViewer");
  const [printSizeSelected, setPrintSizeSelected] = useState(printSizes[0]);
  const [printFormatSelected, setPrintFormatSelected] = useState(printFormats[0]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [forceScale, setForceScale] = useState("50000");
  const [mapScaleOption, setMapScaleOption] = useState("preserveMapScale");
  const [mapOnlyWidth, setMapOnlyWidth] = useState("800");
  const [mapOnlyHeight, setMapOnlyHeight] = useState("600");
  const [mapResolutionOption, setMapResolutionOption] = useState("120");
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);

  const handleScreenshot = () => {
    // Mock screenshot functionality
    console.log("Taking screenshot...");
  };

  const handlePrint = () => {
    console.log("Starting print...");
    setIsPrinting(true);
    // Mock print process
    setTimeout(() => {
      setIsPrinting(false);
      console.log("Print completed");
    }, 3000);
  };

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="sc-print-container">
        {/* TAKE SCREENSHOT */}
        <div className="sc-print-screenshot-container sc-border-bottom">
          <div className="sc-button sc-print-screenshot-button" onClick={handleScreenshot} title="Save a Screenshot" style={{ cursor: "pointer" }}>
            <div className="sc-print-screenshot-icon">&nbsp;</div>
          </div>
          Is your Print too grainy or low quality? <br /> Click here for a high resolution screenshot
        </div>

        {/* MAP TITLE */}
        <label style={{ fontWeight: "bold" }}>Map Title:</label>
        <input className="sc-print-map-title-input" onChange={(e) => setMapTitle(e.target.value)} value={mapTitle} />

        {/* PRINT SIZE */}
        <label style={{ fontWeight: "bold" }}>Select Paper Size:</label>
        <select
          className="sc-button"
          style={{ width: "100%", marginBottom: "5px", minHeight: "30px" }}
          value={printSizeSelected.value}
          onChange={(e) => {
            const selected = printSizes.find((size) => size.value === e.target.value);
            if (selected) setPrintSizeSelected(selected);
          }}
        >
          {printSizes.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        {/* FORMAT */}
        <label style={{ fontWeight: "bold" }}>Select Output Format:</label>
        <select
          className="sc-button"
          style={{ width: "100%", marginBottom: "5px", minHeight: "30px" }}
          value={printFormatSelected.value}
          onChange={(e) => {
            const selected = printFormats.find((format) => format.value === e.target.value);
            if (selected) setPrintFormatSelected(selected);
          }}
        >
          {printFormats.map((format) => (
            <option key={format.value} value={format.value}>
              {format.label}
            </option>
          ))}
        </select>

        <div style={{ width: "100%", fontSize: "12px", marginBottom: "10px" }}>** Note: Some basemap layers are currently unsupported by print</div>

        {/* PRINT BUTTON */}
        <button className="sc-button sc-print-button" onClick={handlePrint} disabled={isPrinting}>
          Print
        </button>

        <div className={isPrinting ? "sc-print-loading" : "sc-hidden"}>
          Printing...&nbsp;
          <Image src="/images/loading20.gif" alt="loading" width={20} height={20} />
        </div>

        {/* ADVANCED OPTIONS */}
        <div className={`sc-print-advanced-options-collapsible ${advancedOptionsOpen ? "open" : ""}`} onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}>
          Advanced Print Options
        </div>

        {advancedOptionsOpen && (
          <div className="sc-print-advanced-options-content-outer">
            <label style={{ fontSize: "10pt", fontWeight: "bold" }}>Map Scale/Extent:</label>
            <div style={{ fontSize: "10pt" }}>
              <div>
                <input
                  type="radio"
                  name="mapscale"
                  id="mapscale-preserveMapScale"
                  value="preserveMapScale"
                  checked={mapScaleOption === "preserveMapScale"}
                  onChange={(e) => setMapScaleOption(e.target.value)}
                />
                <label htmlFor="mapscale-preserveMapScale">Preserve Map Scale</label>
              </div>
              <div>
                <input
                  type="radio"
                  name="mapscale"
                  id="mapscale-preserveMapExtent"
                  value="preserveMapExtent"
                  checked={mapScaleOption === "preserveMapExtent"}
                  onChange={(e) => setMapScaleOption(e.target.value)}
                />
                <label htmlFor="mapscale-preserveMapExtent">Preserve Map Extent</label>
              </div>
              <div>
                <input type="radio" name="mapscale" id="mapscale-forceScale" value="forceScale" checked={mapScaleOption === "forceScale"} onChange={(e) => setMapScaleOption(e.target.value)} />
                <label htmlFor="mapscale-forceScale">Force Scale:</label>
                <input className="sc-print-advanced-options-force-scale-input" onChange={(e) => setForceScale(e.target.value)} value={forceScale} />
              </div>
            </div>

            <label style={{ fontSize: "10pt", fontWeight: "bold" }}>Map Only - Image Size:</label>
            <br />
            <label>Width (px):</label>
            <input className="sc-print-advanced-options-force-scale-input" onChange={(e) => setMapOnlyWidth(e.target.value)} value={mapOnlyWidth} />
            <br />
            <label>Height (px):</label>
            <input className="sc-print-advanced-options-force-scale-input" onChange={(e) => setMapOnlyHeight(e.target.value)} value={mapOnlyHeight} />
            <br />

            <label style={{ fontSize: "10pt", fontWeight: "bold" }}>Map Output Resolution:</label>
            <div style={{ fontSize: "10pt" }}>
              <div>
                <input type="radio" name="mapresolution" id="mapresolution-veryhigh" value="300" checked={mapResolutionOption === "300"} onChange={(e) => setMapResolutionOption(e.target.value)} />
                <label htmlFor="mapresolution-veryhigh">Very High - 300 dpi</label>
              </div>
              <div>
                <input type="radio" name="mapresolution" id="mapresolution-high" value="180" checked={mapResolutionOption === "180"} onChange={(e) => setMapResolutionOption(e.target.value)} />
                <label htmlFor="mapresolution-high">High - 180 dpi</label>
              </div>
              <div>
                <input type="radio" name="mapresolution" id="mapresolution-medium" value="120" checked={mapResolutionOption === "120"} onChange={(e) => setMapResolutionOption(e.target.value)} />
                <label htmlFor="mapresolution-medium">Medium - 120 dpi</label>
              </div>
              <div>
                <input type="radio" name="mapresolution" id="mapresolution-low" value="90" checked={mapResolutionOption === "90"} onChange={(e) => setMapResolutionOption(e.target.value)} />
                <label htmlFor="mapresolution-low">Low - 90 dpi</label>
              </div>
              <div>
                <input type="radio" name="mapresolution" id="mapresolution-verylow" value="60" checked={mapResolutionOption === "60"} onChange={(e) => setMapResolutionOption(e.target.value)} />
                <label htmlFor="mapresolution-verylow">Very Low - 60 dpi</label>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanelComponent>
  );
}
