"use client";

import { useState } from "react";
import { Feature } from "ol";
import config from "@/config.json";
import InfoRow from "@/components/common/InfoRow";
import "@/components/PropertyPopup.css";

interface PropertyInfo {
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
      // Show a message or toast notification
      alert("Link copied to clipboard!");
    }
  };

  const handleAddToMyMaps = () => {
    // Emit event to add to My Maps
    // This would integrate with your existing MyMaps functionality
    console.log("Add to MyMaps:", { arn, address, feature });
    // window.emitter.emit("addMyMapsFeature", feature, address || arn);
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
    // Open detailed property report
    console.log("Show more info for:", arn);
    // This would open a modal or sidebar with detailed information
  };

  const handleCloseClick = () => {
    // Clear parcel layer and hide popup
    if (onClearParcelLayer) {
      onClearParcelLayer();
    }
    onClose();
  };

  return (
    <div className="sc-property-popup">
      <div className="sc-property-popup-content">
        {/* Address */}
        {address && <InfoRow label="Address" value={address} />}

        {/* Roll Number (ARN) */}
        {arn && (
          <InfoRow label="Roll Number" value={arn}>
            <button className="sc-copy-button" onClick={handleCopyARN} title="Copy to Clipboard" aria-label="Copy ARN to clipboard">
              📋
            </button>
            {copied && <span className="sc-copied-message">Copied!</span>}
          </InfoRow>
        )}

        {/* Has Zoning */}
        {hasZoning !== undefined && <InfoRow label="Has Zoning" value={hasZoning ? "Yes" : "No"} />}

        {/* Assessed Value */}
        {assessedValue && (
          <InfoRow label="Assessed Value">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assessedValue} alt="Assessed Value" className="sc-assessed-value-img" />
            <div className="sc-property-note">(may not reflect current market value)</div>
          </InfoRow>
        )}

        {/* Garbage Day */}
        {garbageDay && <InfoRow label="Waste Collection Day" value={garbageDay} />}

        {/* Broadband Speed */}
        {broadbandSpeed && <InfoRow label="Potential Broadband Coverage" value={broadbandSpeed} />}

        {/* Tools */}
        <InfoRow label="Tools">
          <div className="sc-property-tools">
            <button className="sc-tool-link" onClick={handleAddToMyMaps}>
              [Add to My Maps]
            </button>
            <button className="sc-tool-link" onClick={handleShare}>
              [Share]
            </button>
            <button
              className="sc-tool-link"
              onClick={() => {
                // Open terms URL
                const termsUrl = (config as { termsUrl?: string }).termsUrl;
                if (termsUrl) {
                  window.open(termsUrl, "_blank");
                }
              }}
            >
              [Terms]
            </button>
          </div>
        </InfoRow>

        {/* Coordinates */}
        {pointCoordinates && <InfoRow label="Coordinates" value={`Lat: ${Math.round(pointCoordinates[1] * 10000) / 10000} Long: ${Math.round(pointCoordinates[0] * 10000) / 10000}`} />}

        {/* Action Buttons */}
        <div className="sc-property-actions">
          <button className="sc-property-button sc-property-button-primary" onClick={handleMoreInfo}>
            More Information
          </button>
          <button className="sc-property-button sc-property-button-secondary" onClick={handleZoom}>
            Zoom
          </button>
          <button className="sc-property-button sc-property-button-secondary" onClick={handleCloseClick}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
