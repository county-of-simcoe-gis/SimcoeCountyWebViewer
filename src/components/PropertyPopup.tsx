"use client";

import { useState } from "react";
import { Feature } from "ol";
import config from "@/config.json";
import "@/components/PropertyPopup.css";

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

// Compact info row matching legacy sc-info-window pattern
function InfoRow({ label, value, children }: { label: string; value?: string | number | boolean | null; children?: React.ReactNode }) {
  if (!children && (value === undefined || value === null || value === "")) return null;

  let displayValue: React.ReactNode;
  if (typeof value === "boolean") {
    displayValue = value ? "Yes" : "No";
  } else {
    displayValue = value != null ? String(value) : null;
  }

  return (
    <div className="sc-info-window-row">
      <div className="sc-info-window-label">{label}</div>
      <div className="sc-info-window-value">
        {displayValue}
        {children}
      </div>
    </div>
  );
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
    <div className="sc-property-popup">
      <div className="sc-property-report-top-container">
        {/* Address */}
        {address && <InfoRow label="Address" value={address} />}

        {/* Roll Number (ARN) with copy button */}
        {arn && (
          <InfoRow label="Roll Number">
            {arn}
            <button className="sc-copy-button" onClick={handleCopyARN} title="Copy to Clipboard" aria-label="Copy ARN to clipboard">
              📋
            </button>
            {copied && <span className="sc-copied-message">Copied!</span>}
          </InfoRow>
        )}

        {/* Has Zoning */}
        {hasZoning !== undefined && <InfoRow label="Has Zoning" value={hasZoning} />}

        {/* Assessed Value - rendered as image matching legacy */}
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
            <span className="sc-fakeLink" onClick={handleAddToMyMaps}>
              [Add to My Maps]
            </span>
            <span className="sc-fakeLink" onClick={handleShare}>
              [Share]
            </span>
            <span
              className="sc-fakeLink"
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
      <div className="sc-property-actions">
        <button className="sc-button sc-property-report-click-more-info" onClick={handleMoreInfo}>
          More Information
        </button>
        <button className="sc-button sc-property-report-click-close" onClick={handleCloseClick}>
          Close
        </button>
      </div>
    </div>
  );
}
