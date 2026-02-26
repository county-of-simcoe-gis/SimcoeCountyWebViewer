"use client";

import { useState } from "react";
import { Feature } from "ol";
import config from "@/config.json";
import { InfoRow } from "@/components/common/InfoRow";
import { usePropertyPopupExtensionStore } from "@/stores/propertyPopupExtensionStore";

export interface PropertyInfo {
  ARN: string;
  Address?: string;
  AssessedValue?: string; // Base64 encoded PNG image (data:image/png;base64,...)
  HasZoning?: boolean;
  WasteCollection?: {
    GarbageDay?: string;
  };
  Other?: {
    BroadbandSpeed?: string;
  };
  pointCoordinates?: number[];
  pointerCoordinates?: number[];
  shareURL?: string;
  area?: number;
  [key: string]: unknown;
}

interface PropertyPopupProps {
  propInfo: PropertyInfo;
  feature: Feature;
  onClose: () => void;
  onClearParcelLayer?: () => void;
}

export default function PropertyPopup({ propInfo, feature, onClose, onClearParcelLayer }: PropertyPopupProps) {
  const [copied, setCopied] = useState(false);
  const extensionItems = usePropertyPopupExtensionStore((s) => s.getVisibleItems)();

  const { ARN: arn, Address: address, AssessedValue: assessedValue, HasZoning: hasZoning, WasteCollection: wasteCollection, Other: other, pointCoordinates, shareURL } = propInfo;
  const garbageDay = wasteCollection?.GarbageDay;
  const broadbandSpeed = other?.BroadbandSpeed;

  const handleCopyARN = () => {
    navigator.clipboard.writeText(arn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (shareURL) {
      navigator.clipboard.writeText(shareURL);
      alert("Link copied to clipboard!");
    }
  };

  const handleAddToMyMaps = () => {
    console.log("Add to MyMaps:", { arn, address, feature });
  };

  const handleZoom = () => {
    const geometry = feature.getGeometry();
    if (geometry && window.map) {
      window.map.getView().fit(geometry.getExtent(), {
        size: window.map.getSize(),
        duration: 1000,
        padding: [50, 50, 50, 50],
      });
    }
  };

  const handleMoreInfo = () => {
    console.log("Show more info for:", arn);
  };

  const handleCloseClick = () => {
    if (onClearParcelLayer) {
      onClearParcelLayer();
    }
    onClose();
  };

  return (
    <div className="bg-white">
      <div className="relative overflow-x-hidden overflow-y-auto">
        {/* Address */}
        {address && <InfoRow label="Address" value={address} />}

        {/* Roll Number (ARN) with copy button */}
        {arn && (
          <InfoRow label="Roll Number">
            {arn}
            <button
              className="bg-transparent border-none cursor-pointer ml-1.5 -mb-0.5 p-0 text-xs transition-transform hover:scale-125"
              onClick={handleCopyARN}
              title="Copy to Clipboard"
              aria-label="Copy ARN to clipboard"
            >
              📋
            </button>
            {copied && <span className="text-green-500 text-[10px] ml-1.5 animate-[fadeOut_2s_forwards]">Copied!</span>}
          </InfoRow>
        )}

        {/* Has Zoning */}
        {hasZoning !== undefined && <InfoRow label="Has Zoning" value={hasZoning} />}

        {/* Assessed Value - rendered as image matching legacy */}
        {assessedValue && (
          <InfoRow label="Assessed Value">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assessedValue} alt="Assessed Value" className="mb-0.5" />
            <div className="text-[9px] text-gray-600 pb-1">(may not reflect current market value)</div>
          </InfoRow>
        )}

        {/* Garbage Day */}
        {garbageDay && <InfoRow label="Waste Collection Day" value={garbageDay} />}

        {/* Broadband Speed */}
        {broadbandSpeed && <InfoRow label="Potential Broadband Coverage" value={broadbandSpeed} />}

        {/* Extension items (e.g. MPac/Teranet report links, owner names) */}
        {arn &&
          extensionItems.map((ext) => (
            <InfoRow key={ext.id} label={ext.label}>
              {ext.render(arn)}
            </InfoRow>
          ))}

        {/* Tools */}
        <InfoRow label="Tools">
          <div className="inline">
            <span className="text-[#337ab7] underline cursor-pointer select-none mr-1 hover:text-[#23527c]" onClick={handleAddToMyMaps}>
              [Add to My Maps]
            </span>
            <span className="text-[#337ab7] underline cursor-pointer select-none mr-1 hover:text-[#23527c]" onClick={handleShare}>
              [Share]
            </span>
            <span
              className="text-[#337ab7] underline cursor-pointer select-none mr-1 hover:text-[#23527c]"
              onClick={() => {
                const termsUrl = (config as { termsUrl?: string }).termsUrl;
                if (termsUrl) {
                  window.open(termsUrl, "_blank");
                }
              }}
            >
              [Terms]
            </span>
          </div>
        </InfoRow>

        {/* Coordinates */}
        {pointCoordinates && <InfoRow label="Pointer Coordinates" value={`Lat: ${Math.round(pointCoordinates[1] * 10000) / 10000}  Long: ${Math.round(pointCoordinates[0] * 10000) / 10000}`} />}
      </div>

      {/* Action Buttons */}
      <div className="flex mt-1.5 w-full">
        <button className="sc-button flex-[6] mr-1.5" onClick={handleMoreInfo}>
          More Information
        </button>
        <button className="sc-button flex-[4]" onClick={handleCloseClick}>
          Close
        </button>
      </div>
    </div>
  );
}
