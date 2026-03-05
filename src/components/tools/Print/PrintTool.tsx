"use client";

/**
 * Print Tool Component - Server-side printing via MapFish Print Server
 * Ported from SimcoeCountyWebViewer Print.jsx
 */

import "./PrintTool.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
import PanelComponent from "@/components/PanelComponent";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { getMapScale } from "@/utils/mapHelpers";
import { printConfig, PrintSize, PrintFormat } from "./printConfig";
import { buildPrintRequest, PrintState } from "./printRequest";
import { getBaseUrl } from "./printUtils";
import { Layer } from "ol/layer";

interface PrintToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: {
    originUrl?: string;
    printLogo?: string;
    printSizes?: PrintSize[];
    printFormats?: PrintFormat[];
    mapTitle?: string;
    termsOfUse?: string;
  };
  options?: {
    parameters?: Array<{ name: string; value: string }>;
  };
}

interface PrintStatusResponse {
  done: boolean;
  status: "running" | "waiting" | "finished" | "error";
  downloadURL?: string;
  error?: string;
}

export default function PrintTool({ name = "Print", helpLink, hideHeader = false, onClose, onSidebarVisibility, config = {}, options = {} }: PrintToolProps) {
  const { map } = useMapStore();
  const appConfig = useAppStore((state) => state.config);
  const printUrl = appConfig?.printUrl || "";

  // Configuration state
  const [originUrl, setOriginUrl] = useState<string>("");
  const [printLogo, setPrintLogo] = useState<string | undefined>();

  // Print options state
  const [printSizes, setPrintSizes] = useState<PrintSize[]>(printConfig.printSizes);
  const [printFormats, setPrintFormats] = useState<PrintFormat[]>(printConfig.printFormats);
  const [printSizeSelectedOption, setPrintSizeSelectedOption] = useState<PrintSize>(printConfig.printSizes[0]);
  const [printFormatSelectedOption, setPrintFormatSelectedOption] = useState<PrintFormat>(printConfig.printFormats[0]);
  const [mapTitle, setMapTitle] = useState<string>(printConfig.mapTitle);
  const [termsOfUse, setTermsOfUse] = useState<string>(printConfig.termsOfUse);

  // Advanced options state
  const [forceScale, setForceScale] = useState<string>("");
  const [mapScaleOption, setMapScaleOption] = useState<"preserveMapScale" | "preserveMapExtent" | "forceScale">("preserveMapScale");
  const [mapOnlyWidth, setMapOnlyWidth] = useState<string>("800");
  const [mapOnlyHeight, setMapOnlyHeight] = useState<string>("600");
  const [mapResolutionOption, setMapResolutionOption] = useState<string>("120");
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState<boolean>(false);

  // Print status
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printProgress, setPrintProgress] = useState<string>("");

  // Track if initial config has been applied
  const initializedRef = useRef(false);

  // Initialize map-related values
  useEffect(() => {
    if (map) {
      // Get initial scale
      const initialScale = getMapScale(map);
      setForceScale(String(initialScale));

      // Get map dimensions for "Map Only" option
      const mapSize = map.getSize();
      if (mapSize) {
        setMapOnlyWidth(String(mapSize[0]));
        setMapOnlyHeight(String(mapSize[1]));
      }
    }
  }, [map]);

  // Apply configuration overrides (only once on mount)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (config.originUrl) setOriginUrl(config.originUrl);
    if (config.printLogo) setPrintLogo(config.printLogo);
    if (config.printSizes) {
      setPrintSizes(config.printSizes);
      setPrintSizeSelectedOption(config.printSizes[0]);
    }
    if (config.printFormats) {
      setPrintFormats(config.printFormats);
      setPrintFormatSelectedOption(config.printFormats[0]);
    }
    if (config.mapTitle) setMapTitle(config.mapTitle);
    if (config.termsOfUse) setTermsOfUse(config.termsOfUse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Get layers for printing
   * Includes visible layers and layers with print: true (even if display: false)
   */
  const getPrintLayers = useCallback((): Layer[] => {
    if (!map) return [];

    const layers: Layer[] = [];
    map.getLayers().forEach((layer) => {
      const props = layer.getProperties();
      // Include layer if:
      // 1. It's visible (normal layers), OR
      // 2. It has print: true (print-only layers that may not be visible)
      // Exclude if print is explicitly false
      if (props.print === false) return;
      if (layer.getVisible() || props.print === true) {
        layers.push(layer as Layer);
      }
    });
    return layers;
  }, [map]);

  /**
   * Check print status and retrieve result
   */
  const checkPrintStatus = useCallback(
    async (statusURL: string, interval: number = 5000): Promise<void> => {
      const origin = originUrl || getBaseUrl(printUrl);

      try {
        const response = await fetch(`${origin}${statusURL}`);
        const data: PrintStatusResponse = await response.json();

        if (data.done === true && data.status === "finished") {
          setPrintProgress("Downloading print...");

          // Download the print
          if (data.downloadURL) {
            const link = document.createElement("a");
            link.href = `${origin}${data.downloadURL}`;
            link.download = "print.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }

          setIsPrinting(false);
          setPrintProgress("");
          alert("Your print has been downloaded successfully!");
        } else if (data.done === false && (data.status === "running" || data.status === "waiting")) {
          setPrintProgress(`Print ${data.status}...`);

          // Calculate next interval (increase gradually, max 30 seconds)
          const nextInterval = Math.min(interval + 2500, 30000);

          setTimeout(() => {
            checkPrintStatus(statusURL, nextInterval);
          }, interval);
        } else if (data.done === true && data.status === "error") {
          console.error("Print error:", data);
          setIsPrinting(false);
          setPrintProgress("");
          alert("Print failed. If this error persists, please contact the site administrator.");
        }
      } catch (error) {
        console.error("Error checking print status:", error);
        setIsPrinting(false);
        setPrintProgress("");
        alert("Failed to check print status. Please try again.");
      }
    },
    [originUrl, printUrl],
  );

  /**
   * Handle print button click
   */
  const handlePrint = useCallback(async () => {
    if (!printUrl) {
      alert("Print server not configured. Please contact the site administrator.");
      return;
    }

    if (!map) {
      alert("Map is not available");
      return;
    }

    try {
      setIsPrinting(true);
      setPrintProgress("Preparing print request...");

      // Get visible layers
      const printLayers = getPrintLayers();

      // Check for secured layers
      let useBearerToken = false;
      printLayers.forEach((layer) => {
        if (layer.get("secured")) {
          useBearerToken = true;
        }
      });

      // Build print state
      const printState: PrintState = {
        mapTitle,
        printSizeSelectedOption,
        printFormatSelectedOption,
        mapScaleOption,
        forceScale,
        mapOnlyWidth,
        mapOnlyHeight,
        mapResolutionOption,
        termsOfUse,
        options,
      };

      // Build print request
      const printData = await buildPrintRequest(printLayers, printState, map, printLogo);

      setPrintProgress("Sending print request...");

      // Prepare request
      const printAppId = printData.layout.replace(/ /g, "_");
      const outputFormat = printData.outputFormat;
      const url = `${printUrl}/print/${printAppId}/report.${outputFormat}`;

      // Encode print request
      const encodedPrintRequest = encodeURIComponent(JSON.stringify(printData));

      // Send request
      const requestOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: encodedPrintRequest,
      };

      if (useBearerToken) {
        // Add authorization header if needed
        // requestOptions.headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`Print request failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (typeof result === "string" && result.includes("ERROR")) {
        throw new Error(result);
      }

      setPrintProgress("Print submitted, waiting for completion...");

      // Check status
      if (result.statusURL) {
        checkPrintStatus(result.statusURL);
      } else {
        throw new Error("No status URL returned from print server");
      }
    } catch (error) {
      console.error("Print failed:", error);
      setIsPrinting(false);
      setPrintProgress("");
      alert(`Print failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [
    map,
    printUrl,
    printLogo,
    getPrintLayers,
    mapTitle,
    printSizeSelectedOption,
    printFormatSelectedOption,
    mapScaleOption,
    forceScale,
    mapOnlyWidth,
    mapOnlyHeight,
    mapResolutionOption,
    termsOfUse,
    options,
    checkPrintStatus,
  ]);

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="sc-print-container">
        {/* MAP TITLE */}
        <label className="sc-print-label">Map Title:</label>
        <input className="sc-print-map-title-input" onChange={(e) => setMapTitle(e.target.value)} value={mapTitle} placeholder="Enter map title" />

        {/* PRINT SIZE */}
        <label className="sc-print-label">Select Paper Size:</label>
        <select
          className="sc-print-select"
          value={printSizeSelectedOption.value}
          onChange={(e) => {
            const selected = printSizes.find((size) => size.value === e.target.value);
            if (selected) setPrintSizeSelectedOption(selected);
          }}
        >
          {printSizes.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        {/* FORMAT */}
        <label className="sc-print-label">Select Output Format:</label>
        <select
          className="sc-print-select"
          value={printFormatSelectedOption.value}
          onChange={(e) => {
            const selected = printFormats.find((format) => format.value === e.target.value);
            if (selected) setPrintFormatSelectedOption(selected);
          }}
        >
          {printFormats.map((format) => (
            <option key={format.value} value={format.value}>
              {format.label}
            </option>
          ))}
        </select>

        {/* PRINT BUTTON */}
        <button className="sc-button sc-print-button" onClick={handlePrint} disabled={isPrinting}>
          Print
        </button>

        {/* LOADING INDICATOR */}
        <div className={isPrinting ? "sc-print-loading" : "sc-hidden"}>
          {printProgress || "Processing..."}
          &nbsp;
          <Image src={`${basePath}/images/loading20.gif`} alt="loading" width={20} height={20} unoptimized />
        </div>

        {/* NO PRINT URL WARNING */}
        {!printUrl && <div className="sc-print-warning">Print server not configured. Please contact the site administrator.</div>}

        {/* ADVANCED OPTIONS */}
        <div className={`sc-print-advanced-options-collapsible ${advancedOptionsOpen ? "open" : ""}`} onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}>
          Advanced Print Options
        </div>

        {advancedOptionsOpen && (
          <div className="sc-print-advanced-options-content">
            {/* MAP SCALE OPTIONS */}
            <label className="sc-print-advanced-label">Map Scale/Extent:</label>
            <div className="sc-print-advanced-options-group">
              <div>
                <input
                  type="radio"
                  name="mapscale"
                  id="mapscale-preserveMapScale"
                  value="preserveMapScale"
                  checked={mapScaleOption === "preserveMapScale"}
                  onChange={(e) => setMapScaleOption(e.target.value as typeof mapScaleOption)}
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
                  onChange={(e) => setMapScaleOption(e.target.value as typeof mapScaleOption)}
                />
                <label htmlFor="mapscale-preserveMapExtent">Preserve Map Extent</label>
              </div>
              <div>
                <input
                  type="radio"
                  name="mapscale"
                  id="mapscale-forceScale"
                  value="forceScale"
                  checked={mapScaleOption === "forceScale"}
                  onChange={(e) => setMapScaleOption(e.target.value as typeof mapScaleOption)}
                />
                <label htmlFor="mapscale-forceScale">Force Scale:</label>
                <input className="sc-print-advanced-options-input" onChange={(e) => setForceScale(e.target.value)} value={forceScale} />
              </div>
            </div>

            {/* MAP ONLY SIZE */}
            <label className="sc-print-advanced-label">Map Only - Image Size:</label>
            <div className="sc-print-advanced-options-group">
              <div>
                <label>Width (px):</label>
                <input className="sc-print-advanced-options-input" onChange={(e) => setMapOnlyWidth(e.target.value)} value={mapOnlyWidth} />
              </div>
              <div>
                <label>Height (px):</label>
                <input className="sc-print-advanced-options-input" onChange={(e) => setMapOnlyHeight(e.target.value)} value={mapOnlyHeight} />
              </div>
            </div>

            {/* MAP RESOLUTION */}
            <label className="sc-print-advanced-label">Map Output Resolution:</label>
            <div className="sc-print-advanced-options-group">
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
