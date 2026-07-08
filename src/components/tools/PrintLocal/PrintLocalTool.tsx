"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";

import PanelComponent from "@/components/PanelComponent";
import { useMapStore } from "@/stores/mapStore";
import { captureMapCanvas, type DecorationPosition, type MapDecorations } from "@/utils/openlayers/SimpleCanvasCapture";
import { useToast } from "@/hooks/useToast";
import { jsPDF } from "jspdf";
import PrintPreviewModal from "./PrintPreviewModal";

interface PrintLocalToolProps {
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

export default function PrintLocalTool({ name = "Print Local", helpLink, hideHeader = false, onClose, onSidebarVisibility }: PrintLocalToolProps) {
  const { map } = useMapStore();
  const toast = useToast();
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
  const [printProgress, setPrintProgress] = useState<string>("");

  // Decoration options
  const [showScaleBar, setShowScaleBar] = useState(true);
  const [scaleBarPosition, setScaleBarPosition] = useState<DecorationPosition>("bottom-left");
  const [showNorthArrow, setShowNorthArrow] = useState(true);
  const [northArrowPosition, setNorthArrowPosition] = useState<DecorationPosition>("top-right");
  const [showAttributions, setShowAttributions] = useState(true);
  const [attributionsPosition, setAttributionsPosition] = useState<DecorationPosition>("bottom-right");

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewSettings, setPreviewSettings] = useState({
    format: "png",
    size: "",
    dpi: 120,
    supportedLayers: 0,
    unsupportedLayers: 0,
  });
  const [isDownloading, setIsDownloading] = useState(false);

  // Cleanup any stale overlays on mount
  React.useEffect(() => {
    return () => {
      // Remove any lingering overlay on unmount
      const overlay = document.getElementById("print-loading-overlay");
      if (overlay) {
        overlay.remove();
      }
    };
  }, []);

  /**
   * Get the current export dimensions based on settings
   */
  const getExportDimensions = useCallback(() => {
    let width: number;
    let height: number;

    if (printSizeSelected.value === "Map Only") {
      width = parseInt(mapOnlyWidth) || 800;
      height = parseInt(mapOnlyHeight) || 600;
    } else if (printSizeSelected.size && printSizeSelected.size.length === 2) {
      width = printSizeSelected.size[0];
      height = printSizeSelected.size[1];
    } else {
      width = 750;
      height = 450;
    }

    return { width, height };
  }, [printSizeSelected, mapOnlyWidth, mapOnlyHeight]);

  /**
   * Generate a preview of the map export
   */
  const handlePreview = async () => {
    if (!map) {
      toast.error("Map is not available");
      return;
    }

    setIsPrinting(true);
    setShowPreview(true);
    setPreviewBlob(null);

    const { width, height } = getExportDimensions();

    // Count visible layers
    const visibleLayers = map.getAllLayers().filter((l) => l.getVisible()).length;

    setPreviewSettings({
      format: printFormatSelected.value,
      size: `${width} x ${height}`,
      dpi: parseInt(mapResolutionOption),
      supportedLayers: visibleLayers,
      unsupportedLayers: 0,
    });

    try {
      // Build decorations object
      const decorations: MapDecorations = {
        title: mapTitle,
        titlePosition: "top-center",
        scaleBar: showScaleBar ? scaleBarPosition : "none",
        northArrow: showNorthArrow ? northArrowPosition : "none",
        attributions: showAttributions ? attributionsPosition : "none",
      };

      // Simple canvas capture - does not modify map state at all
      const blob = await captureMapCanvas(
        map,
        {
          width,
          height,
          format: "image/png",
          quality: 0.95,
          decorations,
        },
        (progress) => {
          setPrintProgress(progress.message);
        },
      );

      if (!blob || blob.size === 0) {
        throw new Error("Generated preview is empty.");
      }
      setPreviewBlob(blob);
    } catch (error) {
      console.error("[PrintLocal] Preview generation failed:", error);
      toast.error(`Failed to generate preview: ${error instanceof Error ? error.message : String(error)}`);
      setShowPreview(false);
    } finally {
      setPrintProgress("");
      setIsPrinting(false);
    }
  };

  /**
   * Download the preview blob
   */
  const handleDownloadPreview = async () => {
    if (!previewBlob) return;

    try {
      setIsDownloading(true);

      const format = printFormatSelected.value;
      const isPdf = format === "pdf";

      if (isPdf) {
        const dpi = parseInt(mapResolutionOption);
        const { width, height } = getExportDimensions();

        // Convert size from pixels to mm
        const mmPerPx = 25.4 / dpi;
        const mapWidthMm = width * mmPerPx;
        const mapHeightMm = height * mmPerPx;

        // Determine PDF orientation
        const isLandscape = width > height;
        const doc = new jsPDF({
          orientation: isLandscape ? "landscape" : "portrait",
          unit: "mm",
          format: "a4",
          putOnlyUsedFonts: true,
        });

        // Get page dimensions
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Add title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(mapTitle, pageWidth / 2, 15, { align: "center" });

        // Calculate map position to center it on the page
        const marginTop = 30;
        const availableWidth = pageWidth - 20;
        const availableHeight = pageHeight - marginTop - 30;

        // Scale the map to fit if needed
        let finalMapWidth = mapWidthMm;
        let finalMapHeight = mapHeightMm;

        if (finalMapWidth > availableWidth || finalMapHeight > availableHeight) {
          const widthRatio = availableWidth / finalMapWidth;
          const heightRatio = availableHeight / finalMapHeight;
          const scaleRatio = Math.min(widthRatio, heightRatio);
          finalMapWidth = finalMapWidth * scaleRatio;
          finalMapHeight = finalMapHeight * scaleRatio;
        }

        const marginLeft = (pageWidth - finalMapWidth) / 2;

        // Add the map image
        const imgUrl = URL.createObjectURL(previewBlob);
        doc.addImage(imgUrl, "JPEG", marginLeft, marginTop, finalMapWidth, finalMapHeight);
        URL.revokeObjectURL(imgUrl);

        // Add date
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Print date: ${new Date().toLocaleString()}`, 10, pageHeight - 10);

        // Save the PDF
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${mapTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.pdf`;
        doc.save(filename);
      } else {
        // For PNG/TIF, download the blob directly
        const url = URL.createObjectURL(previewBlob);
        const link = document.createElement("a");
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        link.download = `${mapTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setIsDownloading(false);
      setShowPreview(false);
      setPreviewBlob(null);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(`Failed to download: ${error instanceof Error ? error.message : String(error)}`);
      setIsDownloading(false);
    }
  };

  /**
   * Close the preview modal
   */
  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewBlob(null);
    setIsPrinting(false);
  };

  /**
   * Generates a print output based on selected options (direct, no preview)
   */
  const handlePrint = async () => {
    if (!map) {
      toast.error("Map is not available");
      return;
    }

    setIsPrinting(true);

    const dpi = parseInt(mapResolutionOption);
    const format = printFormatSelected.value;
    const isPdf = format === "pdf";
    const { width, height } = getExportDimensions();

    try {
      // Build decorations object
      const decorations: MapDecorations = {
        title: mapTitle,
        titlePosition: "top-center",
        scaleBar: showScaleBar ? scaleBarPosition : "none",
        northArrow: showNorthArrow ? northArrowPosition : "none",
        attributions: showAttributions ? attributionsPosition : "none",
      };

      // Simple canvas capture - does not modify map state at all
      const blob = await captureMapCanvas(
        map,
        {
          width,
          height,
          format: "image/png",
          quality: 0.95,
          decorations,
        },
        (progress) => {
          setPrintProgress(progress.message);
        },
      );

      if (!blob || blob.size === 0) {
        throw new Error("Generated image is empty.");
      }

      if (isPdf) {
        setPrintProgress("Creating PDF document...");

        // Convert size from pixels to mm
        const mmPerPx = 25.4 / dpi;
        const mapWidthMm = width * mmPerPx;
        const mapHeightMm = height * mmPerPx;

        // Determine PDF orientation
        const isLandscape = width > height;
        const doc = new jsPDF({
          orientation: isLandscape ? "landscape" : "portrait",
          unit: "mm",
          format: "a4",
          putOnlyUsedFonts: true,
        });

        // Get page dimensions
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Add title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(mapTitle, pageWidth / 2, 15, { align: "center" });

        // Calculate map position to center it on the page
        const marginTop = 30;
        const availableWidth = pageWidth - 20;
        const availableHeight = pageHeight - marginTop - 30;

        // Scale the map to fit if needed
        let finalMapWidth = mapWidthMm;
        let finalMapHeight = mapHeightMm;

        if (finalMapWidth > availableWidth || finalMapHeight > availableHeight) {
          const widthRatio = availableWidth / finalMapWidth;
          const heightRatio = availableHeight / finalMapHeight;
          const scaleRatio = Math.min(widthRatio, heightRatio);
          finalMapWidth = finalMapWidth * scaleRatio;
          finalMapHeight = finalMapHeight * scaleRatio;
        }

        const marginLeft = (pageWidth - finalMapWidth) / 2;

        // Add the map image
        const imgUrl = URL.createObjectURL(blob);
        doc.addImage(imgUrl, "JPEG", marginLeft, marginTop, finalMapWidth, finalMapHeight);
        URL.revokeObjectURL(imgUrl);

        // Add date
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Print date: ${new Date().toLocaleString()}`, 10, pageHeight - 10);

        setPrintProgress("Downloading...");

        // Save the PDF
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${mapTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.pdf`;
        doc.save(filename);
      } else {
        // For PNG/TIF, download the blob directly
        setPrintProgress("Downloading...");

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        link.download = `${mapTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("[PrintLocal] Print failed:", error);

      let errorMessage = "Failed to generate print.";
      if (error instanceof Error) {
        errorMessage += `\n\n${error.message}`;
      }

      toast.error(errorMessage);
    } finally {
      setPrintProgress("");
      setIsPrinting(false);
    }
  };

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="relative mb-0 overflow-y-auto p-[5px] w-full text-neutral">
        {/* MAP TITLE */}
        <label className="font-bold block">Map Title:</label>
        <input className="w-[97%] h-[30px] mb-[5px] p-[3px] border border-[#ccc] focus:border-warning focus:outline-none" onChange={(e) => setMapTitle(e.target.value)} value={mapTitle} />

        {/* PRINT SIZE */}
        <label className="font-bold block">Select Paper Size:</label>
        <select
          className="w-full mb-[5px] min-h-[30px] p-[5px] border border-[#ccc] rounded-[3px] text-sm bg-white cursor-pointer focus:outline-none focus:border-[#4a90d9]"
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
        <label className="font-bold block">Select Output Format:</label>
        <select
          className="w-full mb-[5px] min-h-[30px] p-[5px] border border-[#ccc] rounded-[3px] text-sm bg-white cursor-pointer focus:outline-none focus:border-[#4a90d9]"
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

        {/* PRINT BUTTONS */}
        <div className="flex justify-end gap-[10px] mt-[10px] mb-[5px]">
          <button
            className="w-[100px] text-[12pt] py-2 px-4 bg-[#6c757d] text-white border-none rounded-[3px] cursor-pointer transition-colors hover:not-disabled:bg-[#5a6268] disabled:bg-[#ccc] disabled:cursor-not-allowed"
            onClick={handlePreview}
            disabled={isPrinting}
          >
            Preview
          </button>
          <button
            className="w-[100px] text-[12pt] py-2 px-4 bg-[#4a90d9] text-white border-none rounded-[3px] cursor-pointer transition-colors hover:not-disabled:bg-[#3a7bc8] disabled:bg-[#ccc] disabled:cursor-not-allowed"
            onClick={handlePrint}
            disabled={isPrinting}
          >
            Print
          </button>
        </div>

        <div className={isPrinting && !showPreview ? "inline-flex items-center text-xs text-[#666] mt-[10px]" : "hidden"}>
          {printProgress || "Processing..."}
          &nbsp;
          <Image src="/images/loading20.gif" alt="loading" width={20} height={20} />
        </div>

        {/* ADVANCED OPTIONS */}
        <div
          className="h-[30px] w-[205px] bg-[#c9e7f9] border border-[#ddd] cursor-pointer select-none leading-[30px] pl-9 bg-[position:5px_center,185px_center] bg-no-repeat bg-[length:24px_24px,16px_16px] mt-[10px] text-[11px]"
          style={{ backgroundImage: `url('/images/settings.png'), url('${advancedOptionsOpen ? "/images/collapsed.png" : "/images/down.png"}')` }}
          onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
        >
          Advanced Print Options
        </div>

        {advancedOptionsOpen && (
          <div className="ml-0 bg-[#f9f9f9] border border-[#ddd] p-[10px] mt-[5px] rounded-[3px] w-full box-border [&_label]:text-[10pt] [&_label]:mb-[5px] [&_label]:block [&_input[type=radio]]:mr-[5px] [&_input[type=radio]]:mb-[3px] [&_input[type=text]]:ml-[5px]">
            <label className="font-bold">Map Scale/Extent:</label>
            <div className="text-[10pt]">
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
                <input className="w-[75px] h-5 mb-[5px] p-[3px] border border-[#ccc] focus:border-warning focus:outline-none" onChange={(e) => setForceScale(e.target.value)} value={forceScale} />
              </div>
            </div>

            <label className="font-bold">Map Only - Image Size:</label>
            <br />
            <label>Width (px):</label>
            <input className="w-[75px] h-5 mb-[5px] p-[3px] border border-[#ccc] focus:border-warning focus:outline-none" onChange={(e) => setMapOnlyWidth(e.target.value)} value={mapOnlyWidth} />
            <br />
            <label>Height (px):</label>
            <input className="w-[75px] h-5 mb-[5px] p-[3px] border border-[#ccc] focus:border-warning focus:outline-none" onChange={(e) => setMapOnlyHeight(e.target.value)} value={mapOnlyHeight} />
            <br />

            <label className="font-bold">Map Output Resolution:</label>
            <div className="text-[10pt]">
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

            {/* MAP DECORATIONS */}
            <label className="font-bold mt-[15px]">Map Decorations:</label>

            {/* Scale Bar */}
            <div className="text-[10pt] mt-[10px]">
              <div className="mb-[5px]">
                <input type="checkbox" id="decoration-scalebar" checked={showScaleBar} onChange={(e) => setShowScaleBar(e.target.checked)} />
                <label htmlFor="decoration-scalebar" className="font-bold ml-[5px] inline">
                  Scale Bar
                </label>
              </div>
              {showScaleBar && (
                <div className="ml-5 mb-[10px]">
                  <label className="inline">Position: </label>
                  <select value={scaleBarPosition} onChange={(e) => setScaleBarPosition(e.target.value as DecorationPosition)} className="text-[9pt]">
                    <option value="top-left">Top Left</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              )}
            </div>

            {/* North Arrow */}
            <div className="text-[10pt]">
              <div className="mb-[5px]">
                <input type="checkbox" id="decoration-northarrow" checked={showNorthArrow} onChange={(e) => setShowNorthArrow(e.target.checked)} />
                <label htmlFor="decoration-northarrow" className="font-bold ml-[5px] inline">
                  North Arrow
                </label>
              </div>
              {showNorthArrow && (
                <div className="ml-5 mb-[10px]">
                  <label className="inline">Position: </label>
                  <select value={northArrowPosition} onChange={(e) => setNorthArrowPosition(e.target.value as DecorationPosition)} className="text-[9pt]">
                    <option value="top-left">Top Left</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              )}
            </div>

            {/* Attributions */}
            <div className="text-[10pt]">
              <div className="mb-[5px]">
                <input type="checkbox" id="decoration-attributions" checked={showAttributions} onChange={(e) => setShowAttributions(e.target.checked)} />
                <label htmlFor="decoration-attributions" className="font-bold ml-[5px] inline">
                  Attributions
                </label>
              </div>
              {showAttributions && (
                <div className="ml-5 mb-[10px]">
                  <label className="inline">Position: </label>
                  <select value={attributionsPosition} onChange={(e) => setAttributionsPosition(e.target.value as DecorationPosition)} className="text-[9pt]">
                    <option value="top-left">Top Left</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        previewBlob={previewBlob}
        isOpen={showPreview}
        mapTitle={mapTitle}
        settings={previewSettings}
        onDownload={handleDownloadPreview}
        onClose={handleClosePreview}
        isDownloading={isDownloading}
        progressMessage={printProgress}
      />
    </PanelComponent>
  );
}
