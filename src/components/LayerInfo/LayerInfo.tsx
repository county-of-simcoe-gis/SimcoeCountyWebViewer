"use client";

import React, { useState, useEffect } from "react";
import { FaPrint, FaExternalLinkAlt } from "react-icons/fa";
import type { LayerInfoProps, LayerInfoData, LayerInfoAttribute } from "@/types/layerInfo";
import { fetchLayerInfo, getFormattedProjection, getDownloadUrl, getServerUrl, downloadLayerFile } from "@/lib/layerInfo";
import { useConfig } from "@/hooks/useConfig";
import { useToast } from "@/hooks/useToast";

/**
 * LayerInfo Component
 * Displays layer metadata and provides download functionality
 */
export default function LayerInfo({ layerURL, showDownload = false, secure = false, hideNewWindow = false, hidePrint = false, params = {} }: LayerInfoProps) {
  const [layerInfo, setLayerInfo] = useState<LayerInfoData | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { config } = useConfig();
  const toast = useToast();

  // Store params as a JSON string to avoid infinite re-renders
  const paramsRef = React.useRef(JSON.stringify(params));
  const currentParamsString = JSON.stringify(params);

  // Fetch layer info when layerURL changes
  useEffect(() => {
    if (!layerURL || layerURL === "null" || layerURL === "") {
      setError("No layer URL provided");
      setLoading(false);
      return;
    }

    // Fetch layer info
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const isGeoServerLayer = !!config?.geoserverUrl && layerURL.includes(config.geoserverUrl);
        const useBearerToken = secure && isGeoServerLayer && !layerURL.includes("token=");

        const data = await fetchLayerInfo(layerURL, params, useBearerToken);

        if (!data) {
          setError("Failed to fetch layer information");
          return;
        }

        setLayerInfo(data);
      } catch (err) {
        console.error("Error fetching layer info:", err);
        setError("Error loading layer information");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    paramsRef.current = currentParamsString;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerURL, secure, currentParamsString]);

  const handlePrintClick = () => {
    window.print();
  };

  const handleNewWindowClick = () => {
    window.open(window.location.href, "_blank");
  };

  const handleDownloadClick = async () => {
    if (!layerInfo || !termsAccepted) return;

    try {
      const workspace = layerInfo.namespace?.name || "simcoe";
      const layerName = layerInfo.name;
      const serverUrl = getServerUrl(layerURL || "");
      const downloadUrl = getDownloadUrl(serverUrl, workspace, layerName);

      // Check if it's the internal geoserver
      if (layerURL && layerURL.indexOf(config?.geoserverUrl || "") !== -1) {
        await downloadLayerFile(downloadUrl, layerName, secure);
      } else {
        // Open in new window for external sources
        window.open(downloadUrl, "_blank");
      }
    } catch (err) {
      console.error("Error downloading layer:", err);
      toast.error("Failed to download layer. Please try again.");
    }
  };

  const formatDate = (): string => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const date = new Date();
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();

    return `${monthNames[monthIndex]} ${day}, ${year}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-5">
        <div className="flex justify-center items-center min-h-[300px] text-xl text-gray-600">Loading layer information...</div>
      </div>
    );
  }

  // Error state
  if (error || !layerInfo) {
    return (
      <div className="max-w-7xl mx-auto p-5">
        <h3 className="text-red-700 text-center py-10 px-5 text-xl">{error || "Error: Layer Not Found or no URL Parameter provided."}</h3>
      </div>
    );
  }

  // Get projection and fields
  const projection = getFormattedProjection(layerInfo);
  let fields: LayerInfoAttribute[] = [];
  if (layerInfo.attributes) {
    const attr = layerInfo.attributes.attribute;
    fields = Array.isArray(attr) ? attr : [attr];
  }

  const shouldShowDownload = showDownload && layerInfo.name !== "Assessment Parcel" && layerInfo.namespace;

  const getDisplaySourceUrl = (url: string): string => {
    const isArcGISUrl = url.includes("/arcgis/rest/services") || url.includes("/MapServer") || url.includes("/FeatureServer");
    if (!secure || !isArcGISUrl) {
      return url;
    }

    try {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.delete("token");
      return parsedUrl.toString();
    } catch {
      return url;
    }
  };

  const displayLayerUrl = layerURL ? getDisplaySourceUrl(layerURL) : "";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gray-700 text-white p-5 rounded-t-lg shadow-md print:bg-white print:text-black print:border-b-2 print:border-black print:rounded-none print:shadow-none">
        <div className="flex justify-between items-start gap-5">
          <h1 className="text-3xl font-semibold flex-1 print:text-2xl print:text-black pr-12">{layerInfo.title}</h1>
          <div className="flex gap-2.5 print:hidden shrink-0 mt-1 mr-6">
            {!hidePrint && (
              <button
                onClick={handlePrintClick}
                title="Print this page"
                className="bg-white/20 border border-white/30 text-white w-10 h-10 rounded-md flex items-center justify-center text-lg cursor-pointer transition-all duration-200 hover:bg-white/30 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                aria-label="Print page"
              >
                <FaPrint />
              </button>
            )}
            {!hideNewWindow && (
              <button
                onClick={handleNewWindowClick}
                title="Open this page in a new window"
                className="bg-white/20 border border-white/30 text-white w-10 h-10 rounded-md flex items-center justify-center text-lg cursor-pointer transition-all duration-200 hover:bg-white/30 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                aria-label="Open in new window"
              >
                <FaExternalLinkAlt />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg shadow-md print:border-none print:shadow-none">
        {/* Download Section */}
        {shouldShowDownload && (
          <div className="p-5 border-b border-gray-200 print:hidden">
            <fieldset className="border border-gray-300 rounded-md p-0">
              <legend className="text-lg font-semibold text-gray-800 px-2.5 print:text-black print:font-bold">Download</legend>
              <div className="p-4 bg-gray-50 rounded-md">
                <button
                  className={`${
                    !termsAccepted ? "bg-gray-300 cursor-not-allowed opacity-60" : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-px"
                  } text-white border-none py-3 px-8 text-base font-semibold rounded-md cursor-pointer transition-all duration-200 mb-4`}
                  onClick={handleDownloadClick}
                  disabled={!termsAccepted}
                >
                  Download
                </button>
                <div className="flex items-start gap-2.5 mb-2.5">
                  <input type="checkbox" className="mt-1 cursor-pointer" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} id="terms-checkbox" />
                  <label htmlFor="terms-checkbox" className="flex-1 text-gray-600 leading-relaxed">
                    By downloading this information you accept the terms of the Open Government License - Simcoe County.{" "}
                    <a
                      href={config?.openLicenseUrl || "http://maps.simcoe.ca/openlicense.html"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 no-underline font-medium transition-colors duration-200 hover:text-blue-800 hover:underline"
                    >
                      View License
                    </a>
                  </label>
                </div>
              </div>
            </fieldset>
          </div>
        )}

        {/* Abstract Section */}
        {layerInfo.abstract && (
          <div className="p-5 border-b border-gray-200 print:py-2.5 print:px-0 print:border-b print:border-gray-300 print:break-inside-avoid">
            <fieldset className="border border-gray-300 rounded-md p-0 print:border-black print:rounded-none print:break-inside-avoid">
              <legend className="text-lg font-semibold text-gray-800 px-2.5 print:text-black print:font-bold">Abstract</legend>
              <div className="p-4 text-gray-600 leading-relaxed print:py-2.5 print:px-2.5 print:text-black">{layerInfo.abstract}</div>
            </fieldset>
          </div>
        )}

        {/* Projection Section */}
        <div className="p-5 border-b border-gray-200 print:py-2.5 print:px-0 print:border-b print:border-gray-300 print:break-inside-avoid">
          <fieldset className="border border-gray-300 rounded-md p-0 print:border-black print:rounded-none print:break-inside-avoid">
            <legend className="text-lg font-semibold text-gray-800 px-2.5 print:text-black print:font-bold">Projection</legend>
            <div className="p-4 text-gray-600 leading-relaxed print:py-2.5 print:px-2.5 print:text-black">{projection}</div>
          </fieldset>
        </div>

        {/* URL Source Section */}
        {layerURL && (
          <div className="p-5 border-b border-gray-200 print:py-2.5 print:px-0 print:border-b print:border-gray-300 print:break-inside-avoid">
            <fieldset className="border border-gray-300 rounded-md p-0 print:border-black print:rounded-none print:break-inside-avoid">
              <legend className="text-lg font-semibold text-gray-800 px-2.5 print:text-black print:font-bold">URL Source</legend>
              <div className="p-4 text-gray-600 leading-relaxed break-all print:py-2.5 print:px-2.5 print:text-black">
                <a
                  href={layerURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 no-underline transition-colors duration-200 hover:text-blue-800 hover:underline print:text-black print:underline"
                >
                  {displayLayerUrl}
                </a>
              </div>
            </fieldset>
          </div>
        )}

        {/* Attribute Fields Section */}
        {fields.length > 0 && (
          <div className="p-5 border-b border-gray-200 print:py-2.5 print:px-0 print:border-b print:border-gray-300 print:break-inside-avoid">
            <fieldset className="border border-gray-300 rounded-md p-0 print:border-black print:rounded-none print:break-inside-avoid">
              <legend className="text-lg font-semibold text-gray-800 px-2.5 print:text-black print:font-bold">Attribute Fields</legend>
              <div className="p-4 print:py-2.5 print:px-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 print:block">
                  {fields.map((field, index) => (
                    <FieldItem key={`${field.name}-${index}`} fieldInfo={field} />
                  ))}
                </div>
              </div>
            </fieldset>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-between items-end flex-wrap gap-5 text-sm text-gray-600 print:bg-white print:border-t-2 print:border-black print:py-2.5 print:px-0 print:text-black">
        <div className="flex-1">
          <div>
            <a
              href={(config && config.openLicenseUrl) || "http://maps.simcoe.ca/openlicense.html"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 no-underline transition-colors duration-200 hover:text-blue-800 hover:underline print:text-black print:underline"
            >
              View Terms of Use
            </a>
          </div>
          <br />
          <div>
            Layer info page generated using{" "}
            <a
              href={(config && config.originUrl) || "https://opengis.simcoe.ca"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 no-underline transition-colors duration-200 hover:text-blue-800 hover:underline print:text-black print:underline"
            >
              {((config && config.originUrl) || "https://opengis.simcoe.ca").split("//")[1]}
            </a>{" "}
            interactive mapping.
          </div>
        </div>
        <div className="text-right print:text-left">Generated on: {formatDate()}</div>
      </div>
    </div>
  );
}

/**
 * Field Item Component
 * Displays individual attribute field information
 */
function FieldItem({ fieldInfo }: { fieldInfo: LayerInfoAttribute }) {
  const dataTypeArray = fieldInfo.binding.split(".");
  const dataType = dataTypeArray[dataTypeArray.length - 1];

  return (
    <div className="p-2.5 bg-gray-100 rounded border-l-4 border-gray-600 print:bg-white print:border-none print:border-l-2 print:border-black print:mb-1 print:break-inside-avoid">
      <span className="font-semibold text-gray-800 print:text-black">{fieldInfo.name}</span>
      <span className="text-gray-600 text-sm italic print:text-black"> ({dataType})</span>
    </div>
  );
}
