"use client";

import React, { useState, useCallback } from "react";
import { IdentifyFeature } from "./Identify";
import { filterFeatureKeys } from "./IdentifyLayer";
import { useMapStore } from "@/stores/mapStore";
import { useFeatureHighlight } from "@/hooks/useFeatureHighlight";
import Attachments from "@/components/common/Attachments";
import Image from "next/image";

interface IdentifyFeatureItemProps {
  featureItem: IdentifyFeature;
  layerName: string;
  minScale?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IdentifyFeatureItemComponent: React.FC<IdentifyFeatureItemProps> = ({ featureItem, layerName, minScale = 0 }) => {
  const map = useMapStore((s) => s.map);
  const { highlightFeature, clearHighlight } = useFeatureHighlight();
  const [open, setOpen] = useState(false);
  const { feature, displayName } = featureItem;

  const onZoomClick = useCallback(() => {
    if (!map) return;

    const geom = feature.getGeometry();
    if (!geom) return;

    const extent = geom.getExtent();
    if (extent) {
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 500,
        maxZoom: minScale > 0 ? Math.log2(minScale) : 18,
      });
    }
  }, [map, feature, minScale]);

  const formatFieldName = (fieldName: string): string => {
    // Convert field name to title case and replace underscores with spaces
    return fieldName.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const renderFeatureContent = () => {
    const props = feature.getProperties();
    const keys = filterFeatureKeys(feature);
    const attachmentUrl = feature.get("attachmentUrl") as string | undefined;

    if (keys.length === 0 && !attachmentUrl) {
      return <div className="p-2.5 text-center text-base-content/70 italic">No attributes found</div>;
    }

    return (
      <div className="flex flex-col gap-2">
        {keys
          .filter((k) => k !== "attachmentUrl")
          .map((key) => (
            <div key={key} className="grid grid-cols-[140px_1fr] gap-2.5 py-[5px] border-b border-base-200 last:border-b-0 max-[768px]:grid-cols-1 max-[768px]:gap-1">
              <div className="font-semibold text-base-content/70 break-words max-[768px]:text-[11px]">{formatFieldName(key)}:</div>
              <div className="text-base-content break-words max-[768px]:text-[11px] max-[768px]:pl-2.5">{formatFieldValue(props[key])}</div>
            </div>
          ))}
        {attachmentUrl && (
          <div className="grid grid-cols-[140px_1fr] gap-2.5 py-[5px] border-b border-base-200 last:border-b-0 max-[768px]:grid-cols-1 max-[768px]:gap-1">
            <div className="font-semibold text-base-content/70 break-words max-[768px]:text-[11px]">Attachments:</div>
            <div className="text-base-content break-words max-[768px]:text-[11px] max-[768px]:pl-2.5">
              <Attachments attachmentUrl={attachmentUrl} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const featureName = feature.get(displayName) || "N/A";
  const hasGeom = feature.getGeometry() !== undefined && feature.getGeometry() !== null;

  return (
    <div className="mb-2.5 border border-base-300 rounded-[3px] overflow-hidden">
      <div className="bg-base-200 py-2 px-2.5 flex justify-between items-center border-b border-base-300" onMouseEnter={() => highlightFeature(feature)} onMouseLeave={clearHighlight}>
        <div className="flex-1 cursor-pointer font-medium text-xs hover:text-primary" onClick={() => setOpen(!open)}>
          {formatFieldName(displayName)}: {featureName}
        </div>
        {hasGeom && (
          <div className="flex gap-2 items-center">
            <Image
              src="/images/toc/zoom-in.png"
              width={16}
              height={16}
              alt="Zoom"
              className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
              onClick={onZoomClick}
              title="Zoom to feature"
            />
          </div>
        )}
      </div>
      <div className={open ? "p-2.5 bg-white" : "hidden"}>{renderFeatureContent()}</div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
const IdentifyFeatureItem = React.memo(IdentifyFeatureItemComponent);
export default IdentifyFeatureItem;
