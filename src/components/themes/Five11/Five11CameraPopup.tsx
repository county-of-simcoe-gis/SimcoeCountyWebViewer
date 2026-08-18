"use client";

import { useState } from "react";
import type { MtoCameraProperties } from "./types";
import { FaExternalLinkAlt, FaSync } from "react-icons/fa";

interface Five11CameraPopupProps {
  properties: MtoCameraProperties;
}

export default function Five11CameraPopup({ properties }: Five11CameraPopupProps) {
  const [imageKey, setImageKey] = useState(Date.now());
  const imageUrl = properties.Url;

  const handleRefresh = () => {
    // Force image refresh by changing key
    setImageKey(Date.now());
  };

  if (!imageUrl) {
    return <div className="text-sm text-base-content/70">Camera feed unavailable</div>;
  }

  // Add cache-busting parameter to URL
  const cacheBustedUrl = `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}t=${imageKey}`;

  return (
    <div className="space-y-2">
      {properties.Description && <div className="text-sm font-medium mb-2">{properties.Description}</div>}

      <div className="relative">
        <a href={imageUrl} target="_blank" rel="noopener noreferrer" title="Open full size image">
          <img
            src={cacheBustedUrl}
            alt={properties.Description || "Traffic Camera"}
            className="max-w-[280px] rounded-lg border border-base-300 hover:opacity-90 transition-opacity"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </a>
      </div>

      <div className="flex gap-2 mt-2">
        <button className="btn btn-xs btn-ghost text-primary" onClick={handleRefresh} title="Refresh camera image">
          <FaSync className="mr-1" />
          Refresh
        </button>
        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-ghost text-primary">
          <FaExternalLinkAlt className="mr-1" />
          Open Full Size
        </a>
      </div>
    </div>
  );
}
