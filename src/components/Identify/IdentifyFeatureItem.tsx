"use client";

import React, { useState, useCallback } from "react";
import { IdentifyFeature } from "./Identify";
import { useMapStore } from "@/stores/mapStore";
import { filterFeatureKeys, formatFieldName, formatFieldValue } from "@/utils/identifyHelpers";
import { resolveFieldAlias, resolveDomainName, type ArcgisLayerFieldMetadata } from "@/utils/arcgisFieldMetadata";
import { useFeatureHighlight } from "@/hooks/useFeatureHighlight";
import { useMyMapsStore, createMyMapsItem, type DrawType } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import { featureToGeoJSON } from "@/utils/myMapsHelpers";
import { useToastStore } from "@/hooks/useToast";
import { activateTab } from "@/utils/helpersUI";
import Attachments from "@/components/common/Attachments";
import Image from "next/image";

interface IdentifyFeatureItemProps {
  featureItem: IdentifyFeature;
  layerName: string;
  minScale?: number;
  /** ArcGIS field aliases + coded-value domains for the layer, when available. */
  fieldMetadata?: ArcgisLayerFieldMetadata;
}

const IdentifyFeatureItemComponent: React.FC<IdentifyFeatureItemProps> = ({ featureItem, layerName, minScale = 0, fieldMetadata }) => {
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

  const handleAddToMyMaps = useCallback(() => {
    const geom = feature.getGeometry();
    const geomType = geom?.getType() || "Point";
    const drawType: DrawType = geomType === "LineString" || geomType === "Polygon" || geomType === "Point" ? geomType : "Polygon";
    const rawLabel = displayName ? feature.get(displayName) : undefined;
    const label = rawLabel != null && typeof rawLabel !== "object" ? String(rawLabel) : layerName || "Identified Feature";
    const myMapsItem = createMyMapsItem(feature, drawType, label);
    myMapsItem.featureGeoJSON = featureToGeoJSON(feature);
    useMyMapsStore.getState().addItem(myMapsItem);
    useEventStore.getState().emit("mymap-item-created", { item: myMapsItem });
    activateTab("mymaps");
    useToastStore.getState().addToast("Feature added to MyMaps", "success");
  }, [feature, displayName, layerName]);

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
          .map((key) => {
            // ArcGIS layers: prefer the field alias for the label and the
            // coded-value domain name for the value, when available.
            const domainName = resolveDomainName(fieldMetadata, key, props[key]);
            const formattedValue = domainName ?? formatFieldValue(key, props[key]);
            const label = resolveFieldAlias(fieldMetadata, key) ?? formatFieldName(key);
            return (
              <div key={key} className="grid grid-cols-[140px_1fr] gap-2.5 py-[5px] border-b border-base-200 last:border-b-0 max-[768px]:grid-cols-1 max-[768px]:gap-1">
                <div className="font-semibold text-base-content/70 break-words max-[768px]:text-[11px]">{label}:</div>
                <div className="text-base-content break-words max-[768px]:text-[11px] max-[768px]:pl-2.5 [&_a]:text-primary [&_a]:no-underline [&_a:hover]:text-primary/80 [&_a:hover]:underline">
                  {formattedValue !== null ? formattedValue : "N/A"}
                </div>
              </div>
            );
          })}
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

  const rawName = displayName ? feature.get(displayName) : undefined;
  const featureName = rawName != null && typeof rawName !== "object" ? rawName : "N/A";
  const displayNameLabel = displayName ? (resolveFieldAlias(fieldMetadata, displayName) ?? formatFieldName(displayName)) : layerName;
  const hasGeom = feature.getGeometry() !== undefined && feature.getGeometry() !== null;

  return (
    <div className="mb-2.5 border border-base-300 rounded-[3px] overflow-hidden">
      <div className="bg-base-200 py-2 px-2.5 flex justify-between items-center border-b border-base-300" onMouseEnter={() => highlightFeature(feature)} onMouseLeave={clearHighlight}>
        <div className="flex-1 cursor-pointer font-medium text-xs hover:text-primary" onClick={() => setOpen(!open)}>
          {displayNameLabel}: {featureName}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-primary text-[10px] cursor-pointer no-underline hover:underline whitespace-nowrap select-none" onClick={handleAddToMyMaps} title="Add to My Maps">
            [Add to My Maps]
          </span>
          {hasGeom && (
            <Image
              src="/images/toc/zoom-in.png"
              width={16}
              height={16}
              alt="Zoom"
              className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
              onClick={onZoomClick}
              title="Zoom to feature"
            />
          )}
        </div>
      </div>
      <div className={open ? "p-2.5 bg-base-100" : "hidden"}>{renderFeatureContent()}</div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
const IdentifyFeatureItem = React.memo(IdentifyFeatureItemComponent);
export default IdentifyFeatureItem;
